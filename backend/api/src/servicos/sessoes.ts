//////////////////////////////
// Login dos porteiros: senha com scrypt, limite de tentativas e sessões por token.
// O banco guarda só o resumo criptográfico do token, então vazar a tabela não dá acesso.
// Usuário que não existe gasta o mesmo tempo, para não revelar quem existe.
//////////////////////////////

import type { FastifyRequest } from 'fastify';
import type { RowDataPacket } from 'mysql2/promise';
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Banco } from '../banco/banco.ts';
import { ErroHttp } from '../compartilhado/erros.ts';

//////////////////////////////
// Senhas
//////////////////////////////

const TAMANHO_HASH = 64;
const CUSTO = { N: 2 ** 15, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const derivarComCusto = promisify(scrypt) as (
  senha: string,
  sal: Buffer,
  tamanho: number,
  opcoes: typeof CUSTO,
) => Promise<Buffer>;
const derivar = (senha: string, sal: Buffer) => derivarComCusto(senha, sal, TAMANHO_HASH, CUSTO);
const VALIDADE_SESSAO_MS = 30 * 24 * 60 * 60 * 1000;

export async function gerarResumoSenha(senha: string) {
  const sal = randomBytes(16);
  const resumo = await derivar(senha, sal);
  return `scrypt$${sal.toString('base64')}$${resumo.toString('base64')}`;
}

async function conferirSenha(senha: string, guardado: string) {
  const [algoritmo, sal, resumo] = guardado.split('$');
  if (algoritmo !== 'scrypt' || !sal || !resumo) return false;
  const esperado = Buffer.from(resumo, 'base64');
  if (esperado.length !== TAMANHO_HASH) return false;
  const calculado = await derivar(senha, Buffer.from(sal, 'base64'));
  return timingSafeEqual(calculado, esperado);
}

//////////////////////////////
// Limite de tentativas
//////////////////////////////

const LIMITE_CHAVES = 1000;

export interface LimiteTentativas {
  bloqueado(chave: string): boolean;
  registrarFalha(chave: string): void;
  limpar(chave: string): void;
}

const MAXIMO_TENTATIVAS = 5;
const JANELA_TENTATIVAS_MS = 15 * 60 * 1000;

export function criarLimiteTentativas(): LimiteTentativas {
  const falhas = new Map<string, number[]>();
  const recentes = (chave: string) =>
    (falhas.get(chave) ?? []).filter((instante) => Date.now() - instante < JANELA_TENTATIVAS_MS);
  return {
    bloqueado: (chave) => recentes(chave).length >= MAXIMO_TENTATIVAS,
    registrarFalha: (chave) => {
      if (falhas.size >= LIMITE_CHAVES)
        for (const outra of falhas.keys()) if (recentes(outra).length === 0) falhas.delete(outra);
      falhas.set(chave, [...recentes(chave), Date.now()]);
    },
    limpar: (chave) => {
      falhas.delete(chave);
    },
  };
}

//////////////////////////////
// Sessões
//////////////////////////////

interface UsuarioSessao {
  id: string;
  usuario: string;
}

export interface ServicoSessoes {
  entrar(usuario: string, senha: string): Promise<{ token: string; usuario: string } | null>;
  usuarioDoToken(token: string): Promise<UsuarioSessao | null>;
  sair(token: string): Promise<void>;
}

const resumirToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function criarServicoSessoes(banco: Banco): ServicoSessoes {
  const resumoFicticio = gerarResumoSenha(randomBytes(16).toString('hex'));
  return {
    entrar: async (usuario, senha) => {
      const [linhas] = await banco.execute<RowDataPacket[]>(
        'SELECT id, usuario, senha_hash, ativo FROM usuarios WHERE usuario = ?',
        [usuario],
      );
      const encontrado = linhas[0];
      const confere = await conferirSenha(senha, encontrado?.senha_hash ?? (await resumoFicticio));
      if (!encontrado || !confere || !encontrado.ativo) return null;
      await banco.execute('DELETE FROM sessoes WHERE expira_em <= UTC_TIMESTAMP(3)');
      const token = randomBytes(32).toString('base64url');
      await banco.execute(
        'INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (?, ?, ?)',
        [resumirToken(token), encontrado.id, new Date(Date.now() + VALIDADE_SESSAO_MS)],
      );
      return { token, usuario: encontrado.usuario };
    },
    usuarioDoToken: async (token) => {
      const [linhas] = await banco.execute<RowDataPacket[]>(
        `SELECT u.id, u.usuario FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
         WHERE s.token_hash = ? AND s.expira_em > UTC_TIMESTAMP(3) AND u.ativo = TRUE`,
        [resumirToken(token)],
      );
      return linhas[0] ? { id: linhas[0].id, usuario: linhas[0].usuario } : null;
    },
    sair: async (token) => {
      await banco.execute('DELETE FROM sessoes WHERE token_hash = ?', [resumirToken(token)]);
    },
  };
}

//////////////////////////////
// Guarda de sessão
//////////////////////////////

declare module 'fastify' {
  interface FastifyRequest {
    usuario: UsuarioSessao | null;
    token: string | null;
  }
}

export type GuardaSessao = ReturnType<typeof criarGuardaSessao>;

export function criarGuardaSessao(sessoes: ServicoSessoes) {
  return async (requisicao: FastifyRequest) => {
    const token = /^Bearer (.+)$/.exec(requisicao.headers.authorization ?? '')?.[1] ?? null;
    const usuario = token ? await sessoes.usuarioDoToken(token) : null;
    if (!usuario) throw new ErroHttp(401, 'Sessão inválida ou expirada.');
    requisicao.usuario = usuario;
    requisicao.token = token;
  };
}
