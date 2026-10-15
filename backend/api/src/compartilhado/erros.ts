//////////////////////////////
// Erros da API e como cada um vira resposta JSON com mensagem fixa em PT-BR.
// Banco fora do ar vira 503 e recusa do banco vira 400.
// O log guarda só o código e a rota, nunca dados digitados, senha ou foto.
//////////////////////////////

import type { FastifyError, FastifyInstance } from 'fastify';

export class ErroHttp extends Error {
  readonly status: number;

  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.name = 'ErroHttp';
    this.status = status;
  }
}

const CODIGOS_BANCO_FORA = new Set([
  'ECONNREFUSED',
  'ETIMEDOUT',
  'PROTOCOL_CONNECTION_LOST',
  'ER_CON_COUNT_ERROR',
  'ER_SERVER_SHUTDOWN',
]);
const CODIGOS_RECUSA = new Set([
  'ER_CHECK_CONSTRAINT_VIOLATED',
  'ER_NO_REFERENCED_ROW',
  'ER_NO_REFERENCED_ROW_2',
  'ER_SIGNAL_EXCEPTION',
  'ER_DATA_TOO_LONG',
]);

export function registrarTratamentoDeErros(aplicacao: FastifyInstance) {
  aplicacao.setErrorHandler((erro: FastifyError & { sqlState?: string }, requisicao, resposta) => {
    if (erro instanceof ErroHttp)
      return resposta.status(erro.status).send({ mensagem: erro.message });
    if (erro.validation) return resposta.status(400).send({ mensagem: 'Dados inválidos.' });
    if (CODIGOS_BANCO_FORA.has(erro.code))
      return resposta.status(503).send({ mensagem: 'Banco de dados indisponível.' });
    if (CODIGOS_RECUSA.has(erro.code) || erro.sqlState === '45000')
      return resposta.status(400).send({ mensagem: 'O servidor recusou os dados.' });
    if (erro.statusCode && erro.statusCode >= 400 && erro.statusCode < 500)
      return resposta.status(erro.statusCode).send({ mensagem: 'Requisição inválida.' });
    requisicao.log.error(
      { codigo: erro.code, rota: requisicao.routeOptions.url },
      erro.sqlState ? 'Erro do banco de dados.' : erro.message,
    );
    return resposta.status(500).send({ mensagem: 'Erro interno.' });
  });
}
