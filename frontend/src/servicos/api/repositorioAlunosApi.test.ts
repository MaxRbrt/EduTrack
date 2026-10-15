import { describe, expect, it } from 'vitest';
import type { NovoAluno } from '../../tipos/Aluno';
import type { ClienteApi, SessaoLocal } from './clienteApi';
import { criarRepositorioAlunosApi } from './repositorioAlunosApi';

const novo: NovoAluno = {
  id: '22222222-2222-4222-8222-222222222222',
  nome: 'Nome enviado',
  nomePadronizado: 'nome enviado',
  curso: 'Curso enviado',
  periodo: 'Manhã',
  serieModulo: '1',
  turma: 'A',
  sala: '12',
  ativo: true,
  fotoCaminho: null,
};

function clienteQueResponde<T>(resposta: T): ClienteApi {
  return {
    pedir: async () => resposta as never,
    obterSessao: () => null,
    definirSessao: (_sessao: SessaoLocal | null) => undefined,
    aoMudarSessao: () => () => undefined,
  };
}

describe('repositorioAlunosApi', () => {
  it('devolve o cadastro persistido pelo servidor em criação idempotente', async () => {
    const persistido = {
      ...novo,
      nome: 'Nome já persistido',
      nomePadronizado: 'nome ja persistido',
      curso: 'Curso persistido',
      fotoCaminho: 'alunos/id/foto.jpg',
      foto: '/api/fotos/assinada',
    };
    const repositorio = criarRepositorioAlunosApi(clienteQueResponde(persistido));

    const aluno = await repositorio.criar(novo, 'data:image/jpeg;base64,foto-nova');

    expect(aluno).toEqual({ ...persistido, envio: 'enviado' });
  });
});
