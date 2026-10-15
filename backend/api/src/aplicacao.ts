//////////////////////////////
// Monta o servidor Fastify: cabeçalhos de segurança, rotas da API e as telas compiladas.
// Toda resposta proíbe script de fora, porque o token da sessão fica no navegador.
// Endereços das telas (ex.: /dashboard) recebem o index.html; a API e /assets/ nunca.
//////////////////////////////

import fastifyStatic from '@fastify/static';
import fastify, { type FastifyInstance } from 'fastify';
import type { Banco } from './banco/banco.ts';
import { registrarTratamentoDeErros } from './compartilhado/erros.ts';
import type { ArmazemFotos } from './servicos/armazemFotos.ts';
import { registrarRotasAlunos } from './rotas/alunos.ts';
import { registrarRotasFotos } from './rotas/fotos.ts';
import { registrarRotasRegistros } from './rotas/registros.ts';
import { registrarRotasSessao } from './rotas/sessao.ts';
import {
  criarGuardaSessao,
  criarLimiteTentativas,
  criarServicoSessoes,
} from './servicos/sessoes.ts';

interface DependenciasAplicacao {
  banco: Banco;
  fotos: ArmazemFotos;
  pastaFrontend: string | null;
}

const LIMITE_CORPO_BYTES = 400 * 1024;

const POLITICA_CONTEUDO = [
  "default-src 'self'",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');

export async function criarAplicacao(d: DependenciasAplicacao): Promise<FastifyInstance> {
  const aplicacao = fastify({ bodyLimit: LIMITE_CORPO_BYTES, logger: true });
  aplicacao.decorateRequest('usuario', null);
  aplicacao.decorateRequest('token', null);
  registrarTratamentoDeErros(aplicacao);

  aplicacao.addHook('onSend', async (requisicao, resposta) => {
    resposta.header('X-Content-Type-Options', 'nosniff');
    resposta.header('X-Frame-Options', 'DENY');
    resposta.header('Referrer-Policy', 'no-referrer');
    resposta.header('Content-Security-Policy', POLITICA_CONTEUDO);
    if (requisicao.url.startsWith('/api/') && !resposta.hasHeader('Cache-Control'))
      resposta.header('Cache-Control', 'no-store');
  });

  const sessoes = criarServicoSessoes(d.banco);
  const exigirSessao = criarGuardaSessao(sessoes);
  registrarRotasSessao(aplicacao, sessoes, criarLimiteTentativas(), exigirSessao);
  registrarRotasFotos(aplicacao, d.fotos);
  registrarRotasAlunos(aplicacao, d.banco, d.fotos, exigirSessao);
  registrarRotasRegistros(aplicacao, d.banco, d.fotos, exigirSessao);

  const { pastaFrontend } = d;
  if (pastaFrontend) await aplicacao.register(fastifyStatic, { root: pastaFrontend });
  aplicacao.setNotFoundHandler((requisicao, resposta) => {
    const ehTela = !requisicao.url.startsWith('/api/') && !requisicao.url.startsWith('/assets/');
    if (pastaFrontend && requisicao.method === 'GET' && ehTela)
      return resposta.sendFile('index.html');
    return resposta.status(404).send({ mensagem: 'Rota não encontrada.' });
  });

  await aplicacao.ready();
  return aplicacao;
}
