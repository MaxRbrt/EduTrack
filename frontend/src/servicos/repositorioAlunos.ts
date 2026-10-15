//////////////////////////////
// Contrato do repositório de alunos e a versão em memória, usada sem servidor.
// Criar é idempotente pelo id: repetir o mesmo aluno devolve o que já existe.
//////////////////////////////

import { normalizarAlteracoesAluno } from '../regras/regrasAlunos';
import type { AlteracoesAluno, Aluno, NovoAluno } from '../tipos/Aluno';
import { ErroRepositorio } from './repositorioAtrasos';

export interface RepositorioAlunos {
  listar(): Promise<Aluno[]>;
  criar(novo: NovoAluno, fotoNova?: string | null): Promise<Aluno>;
  atualizar(id: string, alteracoes: AlteracoesAluno, fotoNova?: string | null): Promise<Aluno>;
}

export const MENSAGEM_ALUNO_NAO_ENCONTRADO = 'Aluno não encontrado.';

export function criarRepositorioAlunosMemoria(): RepositorioAlunos {
  const alunos: Aluno[] = [];

  const executar = async <T>(operacao: () => T) => operacao();

  return {
    listar: () => executar(() => alunos.map((aluno) => ({ ...aluno }))),
    criar: (novo, fotoNova = null) =>
      executar(() => {
        const existente = alunos.find((aluno) => aluno.id === novo.id);
        if (existente) return { ...existente };
        const aluno: Aluno = { ...novo, foto: fotoNova, envio: 'enviado' };
        alunos.push(aluno);
        return { ...aluno };
      }),
    atualizar: (id, alteracoes, fotoNova = null) =>
      executar(() => {
        const indice = alunos.findIndex((aluno) => aluno.id === id);
        if (indice === -1) throw new ErroRepositorio(MENSAGEM_ALUNO_NAO_ENCONTRADO, 'regra');
        const alterado = { ...alunos[indice], ...normalizarAlteracoesAluno(alteracoes) };
        if (fotoNova) alterado.foto = fotoNova;
        alunos[indice] = alterado;
        return { ...alterado };
      }),
  };
}
