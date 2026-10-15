//////////////////////////////
// Repositório de alunos que conversa com a API.
// O corpo é montado campo por campo para que sobras de itens antigos
// guardados no navegador não cheguem ao servidor.
//////////////////////////////

import { normalizarAlteracoesAluno } from '../../regras/regrasAlunos';
import type { Aluno, NovoAluno } from '../../tipos/Aluno';
import { ErroApi, type ClienteApi } from './clienteApi';
import { MENSAGEM_ALUNO_NAO_ENCONTRADO, type RepositorioAlunos } from '../repositorioAlunos';
import { erroDeRepositorio } from './repositorioApi';

type AlunoDaApi = Omit<Aluno, 'envio'>;

const paraCorpo = (aluno: NovoAluno): NovoAluno => ({
  id: aluno.id,
  nome: aluno.nome,
  nomePadronizado: aluno.nomePadronizado,
  curso: aluno.curso,
  periodo: aluno.periodo,
  serieModulo: aluno.serieModulo,
  turma: aluno.turma,
  sala: aluno.sala,
  ativo: aluno.ativo,
  fotoCaminho: aluno.fotoCaminho ?? null,
});

export function criarRepositorioAlunosApi(cliente: ClienteApi): RepositorioAlunos {
  return {
    listar: async () => {
      try {
        const alunos = await cliente.pedir<AlunoDaApi[]>('GET', '/alunos');
        return alunos.map((aluno) => ({ ...aluno, envio: 'enviado' }));
      } catch (erro) {
        throw erroDeRepositorio(erro, 'Não foi possível carregar os alunos.');
      }
    },

    criar: async (novo, fotoNova = null) => {
      const corpo = paraCorpo(novo);
      try {
        const criado = await cliente.pedir<AlunoDaApi>('POST', '/alunos', { ...corpo, fotoNova });
        return { ...criado, envio: 'enviado' };
      } catch (erro) {
        throw erroDeRepositorio(
          erro,
          'O servidor recusou o aluno. Confira os dados e tente novamente.',
        );
      }
    },

    atualizar: async (id, alteracoes, fotoNova = null) => {
      try {
        const aluno = await cliente.pedir<AlunoDaApi>('PATCH', `/alunos/${id}`, {
          ...normalizarAlteracoesAluno(alteracoes),
          fotoNova,
        });
        return { ...aluno, foto: fotoNova ?? aluno.foto, envio: 'enviado' };
      } catch (erro) {
        const inexistente = erro instanceof ErroApi && erro.status === 404;
        throw erroDeRepositorio(
          erro,
          inexistente ? MENSAGEM_ALUNO_NAO_ENCONTRADO : 'Não foi possível salvar o aluno.',
        );
      }
    },
  };
}
