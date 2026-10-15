//////////////////////////////
// Script que cria um porteiro ou troca a senha de um que já existe.
// A senha é pedida na tela para não ficar no histórico do terminal.
// Trocar a senha reativa o usuário e encerra as sessões antigas dele.
//////////////////////////////

import type { RowDataPacket } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { criarBanco } from '../banco/banco.ts';
import { lerConfiguracao } from '../configuracao.ts';
import { gerarResumoSenha } from '../servicos/sessoes.ts';

const TAMANHO_MINIMO_SENHA = 8;

const usuario = (process.argv[2] ?? '').trim().toLowerCase();
if (!/^[a-z0-9._-]{1,40}$/.test(usuario))
  throw new Error(
    'Uso: npm.cmd run criar-usuario -- <usuario> (letras, números, ponto, hífen, sublinhado).',
  );

const leitor = createInterface({ input: process.stdin, output: process.stdout });
const senha = await leitor.question(`Senha para "${usuario}" (mínimo ${TAMANHO_MINIMO_SENHA}): `);
leitor.close();
if (senha.length < TAMANHO_MINIMO_SENHA)
  throw new Error(`A senha precisa de pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`);

const banco = criarBanco(lerConfiguracao(process.env).banco);
try {
  const resumoSenha = await gerarResumoSenha(senha);
  const [linhas] = await banco.execute<RowDataPacket[]>(
    'SELECT id FROM usuarios WHERE usuario = ?',
    [usuario],
  );
  if (linhas[0]) {
    await banco.execute('UPDATE usuarios SET senha_hash = ?, ativo = TRUE WHERE id = ?', [
      resumoSenha,
      linhas[0].id,
    ]);
    await banco.execute('DELETE FROM sessoes WHERE usuario_id = ?', [linhas[0].id]);
    console.log(`Senha de "${usuario}" atualizada.`);
  } else {
    await banco.execute('INSERT INTO usuarios (id, usuario, senha_hash) VALUES (?, ?, ?)', [
      randomUUID(),
      usuario,
      resumoSenha,
    ]);
    console.log(`Usuário "${usuario}" criado.`);
  }
} finally {
  await banco.end();
}
