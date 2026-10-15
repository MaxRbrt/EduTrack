//////////////////////////////
// Rotas de login e de saída do porteiro.
// Senhas erradas são contadas por usuário e IP; passou do limite, a resposta é 429.
// A mensagem de erro não diz se o usuário existe.
//////////////////////////////

import type { FastifyInstance } from 'fastify';
import { ErroHttp } from '../compartilhado/erros.ts';
import { texto } from '../compartilhado/esquemas.ts';
import type { GuardaSessao, LimiteTentativas, ServicoSessoes } from '../servicos/sessoes.ts';

const corpoEntrar = {
  type: 'object',
  required: ['usuario', 'senha'],
  additionalProperties: false,
  properties: {
    usuario: texto(40),
    senha: texto(200),
  },
} as const;

export function registrarRotasSessao(
  aplicacao: FastifyInstance,
  sessoes: ServicoSessoes,
  limite: LimiteTentativas,
  exigirSessao: GuardaSessao,
) {
  aplicacao.post<{ Body: { usuario: string; senha: string } }>(
    '/api/sessao',
    { schema: { body: corpoEntrar } },
    async (requisicao) => {
      const usuario = requisicao.body.usuario.trim().toLowerCase();
      const chave = `${usuario}|${requisicao.ip}`;
      if (limite.bloqueado(chave))
        throw new ErroHttp(429, 'Muitas tentativas. Aguarde alguns minutos e tente de novo.');
      const sessao = await sessoes.entrar(usuario, requisicao.body.senha);
      if (!sessao) {
        limite.registrarFalha(chave);
        throw new ErroHttp(401, 'Usuário ou senha incorretos.');
      }
      limite.limpar(chave);
      return sessao;
    },
  );

  aplicacao.delete('/api/sessao', { preHandler: exigirSessao }, async (requisicao, resposta) => {
    await sessoes.sair(requisicao.token!);
    return resposta.status(204).send();
  });
}
