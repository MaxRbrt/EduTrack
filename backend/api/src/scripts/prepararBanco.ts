//////////////////////////////
// Script que cria ou atualiza o banco: aplica as migrações que faltam e
// cria o usuário da API. Precisa da conta de administrador do MySQL.
//////////////////////////////

import { prepararBanco } from '../banco/banco.ts';
import { lerConfiguracao } from '../configuracao.ts';

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
