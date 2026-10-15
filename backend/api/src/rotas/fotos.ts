//////////////////////////////
// Rota que entrega as fotos JPEG pela URL assinada.
// Não pede sessão porque a tag <img> não envia o token; quem controla o acesso
// é a assinatura, válida por 1 hora e gerada só para quem está logado.
//////////////////////////////

import type { FastifyInstance } from 'fastify';
import { ErroHttp } from '../compartilhado/erros.ts';
import type { ArmazemFotos } from '../servicos/armazemFotos.ts';

export function registrarRotasFotos(aplicacao: FastifyInstance, fotos: ArmazemFotos) {
  aplicacao.get<{
    Params: { '*': string };
    Querystring: { expiracao?: string; assinatura?: string };
  }>('/api/fotos/*', async (requisicao, resposta) => {
    const caminho = requisicao.params['*'];
    const { expiracao = '', assinatura = '' } = requisicao.query;
    if (!fotos.conferir(caminho, String(expiracao), String(assinatura)))
      throw new ErroHttp(403, 'Acesso à foto negado.');
    const bytes = await fotos.ler(caminho);
    if (!bytes) throw new ErroHttp(404, 'Foto não encontrada.');
    return resposta.header('Cache-Control', 'private, max-age=3600').type('image/jpeg').send(bytes);
  });
}
