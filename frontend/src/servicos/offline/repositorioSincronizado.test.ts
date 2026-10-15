import { describe, expect, it } from 'vitest';
import type { NovoAluno } from '../../tipos/Aluno';
import type { NovoRegistroAtraso, RegistroAtraso } from '../../tipos/RegistroAtraso';
import type { FilaOffline, ItemFila } from './filaOffline';
import { criarRepositorioSincronizado } from './repositorioSincronizado';
import { ErroRepositorio, type RepositorioAtrasos } from '../repositorioAtrasos';
import type { RepositorioAlunos } from '../repositorioAlunos';

const ID_REGISTRO = '11111111-1111-4111-8111-111111111111';
const ID_ALUNO = '22222222-2222-4222-8222-222222222222';

const novoAluno: NovoAluno = {
  id: ID_ALUNO,
  nome: 'Ana Souza',
  nomePadronizado: 'ana souza',
  curso: 'Desenvolvimento de Sistemas',
  periodo: 'Manhã',
  serieModulo: '1',
  turma: 'A',
  sala: '12',
  ativo: true,
  fotoCaminho: null,
};

const novoRegistro: NovoRegistroAtraso = {
  id: ID_REGISTRO,
  alunoId: ID_ALUNO,
  nomeAluno: 'ana souza',
  curso: 'desenvolvimento de sistemas',
  periodo: 'manha',
  serieModulo: '1',
  turma: 'a',
  sala: '12',
  motivo: 'Ônibus atrasou',
  exibicao: {
    nomeAluno: 'Ana Souza',
    curso: 'Desenvolvimento de Sistemas',
    periodo: 'Manhã',
    serieModulo: '1',
    turma: 'A',
    sala: '12',
  },
  foto: null,
  motivoSemFoto: 'Câmera indisponível',
  registradoEm: '2026-10-13T11:00:00.000Z',
  anoLetivo: 2026,
  registradoPor: 'porteiro',
  anulacao: null,
};

function criarFilaMemoria(): FilaOffline {
  const itens = new Map<string, ItemFila>();
  return {
    enfileirar: async (registro, alunoNovo = null) => {
      const item: ItemFila = {
        registro,
        alunoNovo,
        estado: 'pendente',
        mensagemErro: null,
        tentativas: 0,
      };
      itens.set(registro.id, item);
      return item;
    },
    listar: async () => [...itens.values()],
    obter: async (id) => itens.get(id),
    atualizar: async (item) => void itens.set(item.registro.id, item),
    remover: async (id) => void itens.delete(id),
    removerSeInalterado: async (id, enviado) => {
      const item = itens.get(id);
      if (!item) return true;
      if (JSON.stringify(item.registro) !== JSON.stringify(enviado)) return false;
      itens.delete(id);
      return true;
    },
  };
}

function registroEnviado(novo: NovoRegistroAtraso): RegistroAtraso {
  return { ...novo, envio: 'enviado' };
}

function criarRemotos() {
  let semRede = true;
  let recusar = false;
  const registrosSalvos: string[] = [];
  const alunosCriados: string[] = [];
  const anulacoes: Array<{ id: string; justificativa: string; anuladoEm?: Date }> = [];
  const atrasos: RepositorioAtrasos = {
    listar: async () => [],
    salvar: async (novo) => {
      if (recusar) throw new ErroRepositorio('Registro recusado.', 'regra');
      if (semRede) throw new ErroRepositorio('Sem rede.', 'rede');
      registrosSalvos.push(novo.id);
      return registroEnviado(novo);
    },
    anular: async (id, justificativa, _anuladoPor, anuladoEm) => {
      anulacoes.push({ id, justificativa, anuladoEm });
      return registroEnviado({
        ...novoRegistro,
        anulacao: {
          justificativa,
          anuladoPor: 'porteiro',
          anuladoEm: (anuladoEm ?? new Date()).toISOString(),
        },
      });
    },
  };
  const alunos: RepositorioAlunos = {
    listar: async () => [],
    criar: async (novo) => {
      if (semRede) throw new ErroRepositorio('Sem rede.', 'rede');
      alunosCriados.push(novo.id);
      return { ...novo, foto: null, envio: 'enviado' };
    },
    atualizar: async () => {
      throw new Error('Não usado neste teste.');
    },
  };
  return {
    atrasos,
    alunos,
    registrosSalvos,
    alunosCriados,
    anulacoes,
    conectar: () => (semRede = false),
    definirRecusa: () => {
      semRede = false;
      recusar = true;
    },
  };
}

describe('repositorioSincronizado', () => {
  it('reenvia uma vez e remove o item confirmado', async () => {
    const fila = criarFilaMemoria();
    const remoto = criarRemotos();
    const repositorio = criarRepositorioSincronizado(remoto.atrasos, fila, remoto.alunos);

    expect((await repositorio.salvarComAluno(novoRegistro, null)).envio).toBe('pendente');
    remoto.conectar();
    await repositorio.sincronizar();
    await repositorio.sincronizar();

    expect(remoto.registrosSalvos).toEqual([ID_REGISTRO]);
    expect(await fila.listar()).toEqual([]);
  });

  it('envia o aluno novo antes do registro guardado offline', async () => {
    const fila = criarFilaMemoria();
    const remoto = criarRemotos();
    const repositorio = criarRepositorioSincronizado(remoto.atrasos, fila, remoto.alunos);

    await repositorio.salvarComAluno(novoRegistro, novoAluno);
    remoto.conectar();
    await repositorio.sincronizar();

    expect(remoto.alunosCriados).toEqual([ID_ALUNO]);
    expect(remoto.registrosSalvos).toEqual([ID_REGISTRO]);
  });

  it('preserva e envia a anulação feita enquanto o registro está pendente', async () => {
    const fila = criarFilaMemoria();
    const remoto = criarRemotos();
    const repositorio = criarRepositorioSincronizado(remoto.atrasos, fila, remoto.alunos);
    const anuladoEm = new Date('2026-10-13T11:05:00.000Z');

    await repositorio.salvarComAluno(novoRegistro, null);
    await repositorio.anular(ID_REGISTRO, 'Registro incorreto.', 'porteiro', anuladoEm);
    remoto.conectar();
    await repositorio.sincronizar();

    expect(remoto.registrosSalvos).toEqual([ID_REGISTRO]);
    expect(remoto.anulacoes).toEqual([
      { id: ID_REGISTRO, justificativa: 'Registro incorreto.', anuladoEm },
    ]);
  });

  it('marca recusa e não repete automaticamente', async () => {
    const fila = criarFilaMemoria();
    const remoto = criarRemotos();
    const repositorio = criarRepositorioSincronizado(remoto.atrasos, fila, remoto.alunos);

    await repositorio.salvarComAluno(novoRegistro, null);
    remoto.definirRecusa();
    await repositorio.sincronizar();
    await repositorio.sincronizar();

    const [item] = await fila.listar();
    expect(item.estado).toBe('recusado');
    expect(item.mensagemErro).toBe('Registro recusado.');
    expect(item.tentativas).toBe(1);
  });
});
