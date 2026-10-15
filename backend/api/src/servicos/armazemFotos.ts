//////////////////////////////
// Guarda as fotos em arquivos e as entrega por URL assinada que vence em 1 hora.
// Só caminhos em formatos fixos são aceitos, então ninguém lê ou grava fora da pasta.
// Foto que já existe nunca é sobrescrita.
//////////////////////////////

import { createHmac, timingSafeEqual } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { ErroHttp } from '../compartilhado/erros.ts';

//////////////////////////////
// Caminhos e limites
//////////////////////////////

export const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
export const FORMATO_FOTO_ATRASO = `^[0-9]{4}/${UUID}\\.jpg$`;
const FORMATO_FOTO_ALUNO = `^alunos/${UUID}/${UUID}\\.jpg$`;

const FORMATOS = [new RegExp(FORMATO_FOTO_ATRASO), new RegExp(FORMATO_FOTO_ALUNO)];
const caminhoValido = (caminho: string) => FORMATOS.some((formato) => formato.test(caminho));

const TAMANHO_MAXIMO_BYTES = 204_800;
const VALIDADE_URL_S = 3600;

//////////////////////////////
// Validação da foto
//////////////////////////////

export function decodificarFotoJpeg(urlDados: string): Buffer {
  const partes = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(urlDados);
  const bytes = partes ? Buffer.from(partes[1], 'base64') : null;
  if (!bytes || bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff)
    throw new ErroHttp(400, 'A foto precisa ser JPEG.');
  if (bytes.length > TAMANHO_MAXIMO_BYTES) throw new ErroHttp(400, 'A foto passa de 200 KB.');
  return bytes;
}

//////////////////////////////
// Armazém de fotos
//////////////////////////////

export interface ArmazemFotos {
  gravar(caminho: string, bytes: Buffer): Promise<void>;
  ler(caminho: string): Promise<Buffer | null>;
  assinar(caminho: string | null): Promise<string | null>;
  conferir(caminho: string, expiracao: string, assinatura: string): boolean;
}

export function criarArmazemFotos(pasta: string, segredo: string): ArmazemFotos {
  const absoluto = (caminho: string) => join(pasta, ...caminho.split('/'));
  const calcular = (caminho: string, expiracao: string) =>
    createHmac('sha256', segredo).update(`${caminho}\n${expiracao}`).digest('base64url');

  return {
    gravar: async (caminho, bytes) => {
      if (!caminhoValido(caminho)) throw new Error('Caminho de foto inválido.');
      await mkdir(dirname(absoluto(caminho)), { recursive: true });
      try {
        await writeFile(absoluto(caminho), bytes, { flag: 'wx' });
      } catch (erro) {
        if ((erro as NodeJS.ErrnoException).code !== 'EEXIST') throw erro;
      }
    },
    ler: async (caminho) => {
      if (!caminhoValido(caminho)) return null;
      try {
        return await readFile(absoluto(caminho));
      } catch (erro) {
        if ((erro as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw erro;
      }
    },
    assinar: async (caminho) => {
      if (!caminho || !caminhoValido(caminho)) return null;
      try {
        await access(absoluto(caminho));
      } catch {
        return null;
      }
      const expiracao = String(Math.floor(Date.now() / 1000) + VALIDADE_URL_S);
      return `/api/fotos/${caminho}?expiracao=${expiracao}&assinatura=${calcular(caminho, expiracao)}`;
    },
    conferir: (caminho, expiracao, assinatura) => {
      if (!caminhoValido(caminho) || !/^[0-9]{1,12}$/.test(expiracao)) return false;
      if (Number(expiracao) * 1000 <= Date.now()) return false;
      const esperado = Buffer.from(calcular(caminho, expiracao));
      const recebido = Buffer.from(assinatura);
      return esperado.length === recebido.length && timingSafeEqual(esperado, recebido);
    },
  };
}
