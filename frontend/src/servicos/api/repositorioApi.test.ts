import { describe, expect, it } from 'vitest';
import type { NovoRegistroAtraso } from '../../tipos/RegistroAtraso';
import type { ClienteApi, SessaoLocal } from './clienteApi';
import { criarRepositorioApi } from './repositorioApi';

const novo: NovoRegistroAtraso = {
  id: '11111111-1111-4111-8111-111111111111',
  alunoId: '22222222-2222-4222-8222-222222222222',
  nomeAluno: 'nome enviado',
  curso: 'curso enviado',
  serieModulo: '1',
  turma: 'a',
  sala: '12',
  periodo: 'manha',
  motivo: 'Motivo enviado',
  exibicao: {
    nomeAluno: 'Nome enviado',
    curso: 'Curso enviado',
    serieModulo: '1',
    turma: 'A',
    sala: '12',
    periodo: 'Manhã',
  },
  foto: 'data:image/jpeg;base64,foto-nova',
  motivoSemFoto: null,
  registradoEm: '2026-10-13T12:00:00.000Z',
  anoLetivo: 2026,
  registradoPor: 'porteiro',
  anulacao: null,
};

function clienteQueResponde<T>(resposta: T): ClienteApi {
  return {
    pedir: async () => resposta as never,
    obterSessao: () => null,
    definirSessao: (_sessao: SessaoLocal | null) => undefined,
    aoMudarSessao: () => () => undefined,
  };
}

describe('repositorioApi', () => {
  it('devolve o registro persistido pelo servidor em reenvio idempotente', async () => {
    const persistido = {
      ...novo,
      nomeAluno: 'nome persistido',
      curso: 'curso persistido',
      foto: '/api/fotos/assinada',
    };
    const repositorio = criarRepositorioApi(clienteQueResponde(persistido));

    const registro = await repositorio.salvar(novo);

    expect(registro).toEqual({ ...persistido, envio: 'enviado' });
  });
});
