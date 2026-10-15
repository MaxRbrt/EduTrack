//////////////////////////////
// Acesso ao MySQL: conexão, consultas usadas por várias rotas e preparo do banco.
// O usuário da API não pode apagar alunos, atrasos nem usuários; só sessões.
// Inserir é sempre idempotente pelo id, para o reenvio da fila offline.
//////////////////////////////

import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { ConfiguracaoBanco } from '../configuracao.ts';

//////////////////////////////
// Conexão
//////////////////////////////

export type Banco = Pool;

const PASTA_MIGRACOES = resolve('../mysql/migracoes');

export function criarBanco(configuracao: ConfiguracaoBanco): Banco {
  return mysql.createPool({
    host: configuracao.host,
    port: configuracao.porta,
    user: configuracao.usuario,
    password: configuracao.senha,
    database: configuracao.nome,
    timezone: 'Z',
    charset: 'utf8mb4',
    connectionLimit: 10,
  });
}

//////////////////////////////
// Consultas compartilhadas
//////////////////////////////

export async function buscarPorId(
  banco: Banco,
  tabela: 'alunos' | 'registros_atraso',
  colunas: string,
  id: string,
): Promise<RowDataPacket | null> {
  const [linhas] = await banco.execute<RowDataPacket[]>(
    `SELECT ${colunas} FROM ${tabela} WHERE id = ?`,
    [id],
  );
  return linhas[0] ?? null;
}

export async function inserirSeNovo(
  banco: Banco,
  sql: string,
  valores: Array<string | number | boolean | Date | null>,
) {
  try {
    await banco.execute(sql, valores);
    return true;
  } catch (erro) {
    if ((erro as { code?: string }).code !== 'ER_DUP_ENTRY') throw erro;
    return false;
  }
}

//////////////////////////////
// Preparo do banco
//////////////////////////////

interface OpcoesPreparo {
  banco: ConfiguracaoBanco;
  usuarioAdministrador: string;
  senhaAdministrador: string;
}

export async function prepararBanco({
  banco,
  usuarioAdministrador,
  senhaAdministrador,
}: OpcoesPreparo): Promise<string[]> {
  if (!/^[a-z_]+$/.test(banco.nome)) throw new Error('Nome de banco inválido.');
  const administrador = await mysql.createConnection({
    host: banco.host,
    port: banco.porta,
    user: usuarioAdministrador,
    password: senhaAdministrador,
    multipleStatements: true,
    timezone: 'Z',
  });
  try {
    await administrador.query(
      'CREATE DATABASE IF NOT EXISTS ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
      [banco.nome],
    );
    await administrador.query('USE ??', [banco.nome]);
    await administrador.query(
      `CREATE TABLE IF NOT EXISTS migracoes_aplicadas (
        nome VARCHAR(100) NOT NULL PRIMARY KEY,
        aplicada_em DATETIME(3) NOT NULL DEFAULT (UTC_TIMESTAMP(3))
      )`,
    );
    const [linhas] = await administrador.query<RowDataPacket[]>(
      'SELECT nome FROM migracoes_aplicadas',
    );
    const feitas = new Set(linhas.map((linha) => linha.nome as string));
    const arquivos = (await readdir(PASTA_MIGRACOES))
      .filter((arquivo) => /^\d{3}_.+\.sql$/.test(arquivo))
      .sort();
    const aplicadas: string[] = [];
    for (const arquivo of arquivos) {
      if (feitas.has(arquivo)) continue;
      await administrador.query(await readFile(join(PASTA_MIGRACOES, arquivo), 'utf8'));
      await administrador.query('INSERT INTO migracoes_aplicadas (nome) VALUES (?)', [arquivo]);
      aplicadas.push(arquivo);
    }
    for (const origem of ['localhost', '127.0.0.1']) {
      const conta = [banco.usuario, origem];
      await administrador.query('CREATE USER IF NOT EXISTS ?@? IDENTIFIED BY ?', [
        ...conta,
        banco.senha,
      ]);
      await administrador.query('ALTER USER ?@? IDENTIFIED BY ?', [...conta, banco.senha]);
      await administrador.query('GRANT SELECT, INSERT, UPDATE ON ??.* TO ?@?', [
        banco.nome,
        ...conta,
      ]);
      await administrador.query('GRANT DELETE ON ??.sessoes TO ?@?', [banco.nome, ...conta]);
    }
    return aplicadas;
  } finally {
    await administrador.end();
  }
}
