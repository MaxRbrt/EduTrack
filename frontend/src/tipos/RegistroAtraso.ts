//////////////////////////////
// Tipos do registro de atraso.
// Os campos guardam o texto padronizado, para comparar e agrupar; a tela
// mostra `exibicao`. O id nasce no navegador para a fila offline poder
// reenviar sem gravar duas vezes.
//////////////////////////////

export interface FormularioRegistroAtraso {
  nomeAluno: string;
  curso: string;
  serieModulo: string;
  turma: string;
  sala: string;
  periodo: string;
  motivo: string;
}

type DadosExibicao = Omit<FormularioRegistroAtraso, 'motivo'>;

interface AnulacaoRegistroAtraso {
  justificativa: string;
  anuladoEm: string;
  anuladoPor: string;
}

export type EnvioRegistro = 'enviado' | 'pendente' | 'recusado';

export interface RegistroAtraso extends FormularioRegistroAtraso {
  id: string;
  alunoId: string;
  exibicao: DadosExibicao;
  foto: string | null;
  motivoSemFoto: string | null;
  registradoEm: string;
  anoLetivo: number;
  registradoPor: string;
  anulacao: AnulacaoRegistroAtraso | null;
  envio: EnvioRegistro;
}

export type NovoRegistroAtraso = Omit<RegistroAtraso, 'envio'>;
