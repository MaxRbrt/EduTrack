//////////////////////////////
// Contrato do repositório de atrasos, o erro comum dos repositórios e a
// versão em memória, usada sem servidor.
// O erro diz se a falha foi de rede (tentar de novo) ou recusa (corrigir).
// Registro nunca é apagado: a correção é por anulação.
//////////////////////////////

import { anularRegistro } from '../regras/regrasRegistroAtraso';
import type { NovoRegistroAtraso, RegistroAtraso } from '../tipos/RegistroAtraso';

export interface RepositorioAtrasos {
  listar(): Promise<RegistroAtraso[]>;
  salvar(novo: NovoRegistroAtraso): Promise<RegistroAtraso>;
  anular(
    id: string,
    justificativa: string,
    anuladoPor: string,
    anuladoEm?: Date,
  ): Promise<RegistroAtraso>;
}

export type TipoErroRepositorio = 'rede' | 'regra';

export class ErroRepositorio extends Error {
  readonly tipo: TipoErroRepositorio;

  constructor(mensagem: string, tipo: TipoErroRepositorio) {
    super(mensagem);
    this.name = 'ErroRepositorio';
    this.tipo = tipo;
  }
}

export const mensagemDeErro = (erro: unknown, reserva: string) =>
  erro instanceof ErroRepositorio ? erro.message : reserva;

const copiarRegistro = (registro: RegistroAtraso): RegistroAtraso => ({
  ...registro,
  exibicao: { ...registro.exibicao },
  anulacao: registro.anulacao ? { ...registro.anulacao } : null,
});

export function criarRepositorioMemoria(): RepositorioAtrasos {
  const registros: RegistroAtraso[] = [];

  const executar = async <T>(operacao: () => T) => operacao();

  return {
    listar: () => executar(() => registros.map(copiarRegistro)),
    salvar: (novo) =>
      executar(() => {
        const existente = registros.find((registro) => registro.id === novo.id);
        if (existente) return copiarRegistro(existente);
        const registro = copiarRegistro({ ...novo, envio: 'enviado' });
        registros.push(registro);
        return copiarRegistro(registro);
      }),
    anular: (id, justificativa, anuladoPor, anuladoEm = new Date()) =>
      executar(() => {
        const indice = registros.findIndex((registro) => registro.id === id);
        if (indice === -1) throw new Error('Registro não encontrado.');
        const registro = anularRegistro(registros[indice], justificativa, anuladoPor, anuladoEm);
        registros[indice] = registro;
        return copiarRegistro(registro);
      }),
  };
}
