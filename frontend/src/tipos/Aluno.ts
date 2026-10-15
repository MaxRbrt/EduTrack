//////////////////////////////
// Tipos do cadastro de alunos.
// `nome` é o texto digitado e `nomePadronizado` serve para buscar e comparar.
// Aluno nunca é apagado, só fica inativo.
//////////////////////////////

import type { EnvioRegistro } from './RegistroAtraso';

export interface Aluno {
  id: string;
  nome: string;
  nomePadronizado: string;
  curso: string;
  periodo: string;
  serieModulo: string;
  turma: string;
  sala: string;
  ativo: boolean;
  fotoCaminho: string | null;
  foto: string | null;
  envio: EnvioRegistro;
}

export type NovoAluno = Omit<Aluno, 'envio' | 'foto'>;

export type AlteracoesAluno = Partial<
  Pick<NovoAluno, 'nome' | 'curso' | 'periodo' | 'serieModulo' | 'turma' | 'sala' | 'ativo'>
>;
