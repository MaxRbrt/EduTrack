//////////////////////////////
// Script que cria ou atualiza o banco: aplica as migrações que faltam e
// cria o usuário da API. Precisa da conta de administrador do MySQL.
// Na primeira instalação (nenhum porteiro cadastrado) cria o login padrão
// porteiro1 / porteiro1; rodar de novo nunca redefine essa senha.
//////////////////////////////

import type { RowDataPacket } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { criarBanco, prepararBanco } from '../banco/banco.ts';
import { lerConfiguracao } from '../configuracao.ts';
import { gerarResumoSenha } from '../servicos/sessoes.ts';

const USUARIO_PADRAO = 'porteiro1';
const SENHA_PADRAO = 'porteiro1';

const { banco } = lerConfiguracao(process.env);
const usuarioAdministrador = process.env.BD_ADMIN_USUARIO;
const senhaAdministrador = process.env.BD_ADMIN_SENHA;
if (!usuarioAdministrador || senhaAdministrador === undefined)
  throw new Error('Defina BD_ADMIN_USUARIO e BD_ADMIN_SENHA em backend/api/.env.');

const aplicadas = await prepararBanco({ banco, usuarioAdministrador, senhaAdministrador });
console.log(
  aplicadas.length
    ? `Banco "${banco.nome}" pronto. Migrações aplicadas: ${aplicadas.join(', ')}.`
    : `Banco "${banco.nome}" já estava atualizado.`,
);

const conexao = criarBanco(banco);
try {
  const [usuarios] = await conexao.execute<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM usuarios',
  );
  if (Number(usuarios[0].total) === 0) {
    await conexao.execute('INSERT INTO usuarios (id, usuario, senha_hash) VALUES (?, ?, ?)', [
      randomUUID(),
      USUARIO_PADRAO,
      await gerarResumoSenha(SENHA_PADRAO),
    ]);
    console.log(
      `Login padrão criado: usuário "${USUARIO_PADRAO}", senha "${SENHA_PADRAO}".\n` +
        `Troque a senha antes do uso real: npm.cmd run criar-usuario -- ${USUARIO_PADRAO}`,
    );
  }
} finally {
  await conexao.end();
}
