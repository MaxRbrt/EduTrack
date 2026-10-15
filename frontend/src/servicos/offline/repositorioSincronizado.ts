//////////////////////////////
// Repositório de atrasos que funciona sem internet.
// Tenta enviar à API; se falhar por rede, guarda o atraso (e o aluno novo)
// na fila offline e reenvia depois, no login, ao voltar a conexão e a cada
// minuto. Como o id nasce no navegador, reenviar não grava duas vezes.
// As operações na fila passam uma de cada vez, e um registro recusado pelo
// servidor fica parado até o porteiro decidir.
//////////////////////////////

import { limparDadosAluno } from '../../regras/regrasAlunos';
import { anularRegistro } from '../../regras/regrasRegistroAtraso';
import type { Aluno, NovoAluno } from '../../tipos/Aluno';
import type { NovoRegistroAtraso, RegistroAtraso } from '../../tipos/RegistroAtraso';
import type { FilaOffline, ItemFila } from './filaOffline';
import type { RepositorioAlunos } from '../repositorioAlunos';
import { ErroRepositorio, type RepositorioAtrasos } from '../repositorioAtrasos';

//////////////////////////////
// Contrato do repositório sincronizado
//////////////////////////////

export const INTERVALO_REENVIO_MS = 60_000;

interface RepositorioSincronizado extends RepositorioAtrasos {
  salvarComAluno(novo: NovoRegistroAtraso, alunoNovo: NovoAluno | null): Promise<RegistroAtraso>;
  listarAlunos(): Promise<Aluno[]>;
  sincronizar(): Promise<void>;
  reenviar(id: string): Promise<void>;
  descartar(id: string): Promise<void>;
  aoMudar(ouvinte: () => void): () => void;
}

export const ehRepositorioSincronizado = (
  repositorio: RepositorioAtrasos,
): repositorio is RepositorioSincronizado => 'sincronizar' in repositorio;

//////////////////////////////
// Conversões entre fila e registro
//////////////////////////////

const ehRecusa = (erro: unknown) => erro instanceof ErroRepositorio && erro.tipo === 'regra';

const registroDaFila = (item: ItemFila): RegistroAtraso => ({
  ...item.registro,
  envio: item.estado,
});

const semEnvio = ({ envio: _envio, ...registro }: RegistroAtraso): NovoRegistroAtraso => registro;

const alunoDoRegistro = (registro: NovoRegistroAtraso, id: string): NovoAluno => ({
  id,
  ...limparDadosAluno({
    nome: registro.exibicao.nomeAluno,
    curso: registro.exibicao.curso,
    periodo: registro.exibicao.periodo,
    serieModulo: registro.exibicao.serieModulo,
    turma: registro.exibicao.turma,
    sala: registro.exibicao.sala,
  }),
  nomePadronizado: registro.nomeAluno,
  ativo: true,
  fotoCaminho: null,
});

//////////////////////////////
// Repositório sincronizado
//////////////////////////////

export function criarRepositorioSincronizado(
  remoto: RepositorioAtrasos,
  fila: FilaOffline,
  remotoAlunos: RepositorioAlunos,
): RepositorioSincronizado {
  const ouvintes = new Set<() => void>();
  const avisar = () => ouvintes.forEach((ouvinte) => ouvinte());

  const comReserva = <T>(listarRemoto: () => Promise<T[]>) => {
    let ultima: T[] | null = null;
    return async () => {
      try {
        return (ultima = await listarRemoto());
      } catch (erro) {
        if (ehRecusa(erro) || !ultima) throw erro;
        return ultima;
      }
    };
  };
  const listarRegistrosRemotos = comReserva(() => remoto.listar());
  const listarAlunosRemotos = comReserva(() => remotoAlunos.listar());
  let sincronizacaoEmAndamento: Promise<void> | null = null;

  let cadeia: Promise<unknown> = Promise.resolve();
  const emSerie = <T>(operacao: () => Promise<T>) => {
    const resultado = cadeia.then(operacao);
    cadeia = resultado.catch(() => undefined);
    return resultado;
  };

  const alunoDaFila = async (alunoId: string) =>
    (await fila.listar()).find((item) => item.alunoNovo?.id === alunoId)?.alunoNovo ?? null;

  const enviarItem = (id: string) =>
    emSerie(async () => {
      let item = await fila.obter(id);
      if (!item || item.estado !== 'pendente') return false;
      if (!item.registro.alunoId) {
        const alunoId = crypto.randomUUID();
        item = {
          ...item,
          registro: { ...item.registro, alunoId },
          alunoNovo: alunoDoRegistro(item.registro, alunoId),
        };
        await fila.atualizar(item);
      }
      const { anulacao } = item.registro;
      try {
        if (item.alunoNovo) await remotoAlunos.criar(item.alunoNovo);
        await remoto.salvar({ ...item.registro, anulacao: null });
        if (anulacao) {
          try {
            await remoto.anular(
              item.registro.id,
              anulacao.justificativa,
              anulacao.anuladoPor,
              new Date(anulacao.anuladoEm),
            );
          } catch (erro) {
            if (!ehRecusa(erro)) throw erro;
          }
        }
        await fila.removerSeInalterado(id, item.registro);
        return true;
      } catch (erro) {
        if (!ehRecusa(erro)) {
          await fila.atualizar({ ...item, tentativas: item.tentativas + 1 });
          throw erro;
        }
        await fila.atualizar({
          ...item,
          estado: 'recusado',
          mensagemErro: (erro as ErroRepositorio).message,
          tentativas: item.tentativas + 1,
        });
        return true;
      }
    });

  const sincronizar = () =>
    (sincronizacaoEmAndamento ??= (async () => {
      let mudou = false;
      try {
        for (const item of await fila.listar())
          if (item.estado === 'pendente' && (await enviarItem(item.registro.id))) mudou = true;
      } catch {
      } finally {
        sincronizacaoEmAndamento = null;
        if (mudou) avisar();
      }
    })());

  const salvarComAluno = async (novo: NovoRegistroAtraso, alunoInformado: NovoAluno | null) => {
    const alunoNovo = alunoInformado ?? (await alunoDaFila(novo.alunoId));
    try {
      if (alunoNovo) await remotoAlunos.criar(alunoNovo);
      return await remoto.salvar(novo);
    } catch (erro) {
      if (ehRecusa(erro)) throw erro;
      return registroDaFila(await emSerie(() => fila.enfileirar(novo, alunoNovo)));
    }
  };

  return {
    salvarComAluno,

    listarAlunos: async () => {
      const itens = await fila.listar();
      const remotos = await listarAlunosRemotos();
      const idsRemotos = new Set(remotos.map((aluno) => aluno.id));
      const pendentes = new Map<string, Aluno>();
      for (const item of itens)
        if (item.alunoNovo && !idsRemotos.has(item.alunoNovo.id))
          pendentes.set(item.alunoNovo.id, {
            ...item.alunoNovo,
            fotoCaminho: item.alunoNovo.fotoCaminho ?? null,
            foto: null,
            envio: item.estado,
          });
      return [...remotos, ...pendentes.values()];
    },

    listar: async () => {
      const itens = await fila.listar();
      const remotos = await listarRegistrosRemotos();
      const idsRemotos = new Set(remotos.map((registro) => registro.id));
      return [
        ...remotos,
        ...itens.filter((item) => !idsRemotos.has(item.registro.id)).map(registroDaFila),
      ];
    },

    salvar: (novo) => salvarComAluno(novo, null),

    anular: async (id, justificativa, anuladoPor, anuladoEm = new Date()) => {
      const anuladoNaFila = await emSerie(async () => {
        const item = await fila.obter(id);
        if (!item) return null;
        const registro = anularRegistro(registroDaFila(item), justificativa, anuladoPor, anuladoEm);
        await fila.atualizar({ ...item, registro: semEnvio(registro) });
        return registro;
      });
      return anuladoNaFila ?? remoto.anular(id, justificativa, anuladoPor, anuladoEm);
    },

    sincronizar,

    reenviar: async (id) => {
      await emSerie(async () => {
        const item = await fila.obter(id);
        if (item) await fila.atualizar({ ...item, estado: 'pendente', mensagemErro: null });
      });
      if (sincronizacaoEmAndamento) await sincronizacaoEmAndamento;
      await sincronizar();
    },

    descartar: async (id) => {
      await emSerie(() => fila.remover(id));
      avisar();
    },

    aoMudar: (ouvinte) => {
      ouvintes.add(ouvinte);
      return () => ouvintes.delete(ouvinte);
    },
  };
}
