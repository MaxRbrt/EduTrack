//////////////////////////////
// Ponto de entrada da API: lê a configuração, conecta ao banco e começa a escutar.
// Escuta só em 127.0.0.1, então apenas a própria máquina acessa.
// Se o frontend compilado existir, a API também serve as telas.
//////////////////////////////

import { existsSync } from 'node:fs';
import { criarAplicacao } from './aplicacao.ts';
import { criarBanco } from './banco/banco.ts';
import { lerConfiguracao } from './configuracao.ts';
import { criarArmazemFotos } from './servicos/armazemFotos.ts';

const configuracao = lerConfiguracao(process.env);
const banco = criarBanco(configuracao.banco);
const temFrontend = existsSync(configuracao.pastaFrontend);

const aplicacao = await criarAplicacao({
  banco,
  fotos: criarArmazemFotos(configuracao.pastaFotos, configuracao.segredoFotos),
  pastaFrontend: temFrontend ? configuracao.pastaFrontend : null,
});

await aplicacao.listen({ port: configuracao.porta, host: '127.0.0.1' });
console.log(
  temFrontend
    ? `EduTrack em http://localhost:${configuracao.porta}`
    : `API em http://localhost:${configuracao.porta} (frontend: npm.cmd run dev em frontend/)`,
);

for (const sinal of ['SIGINT', 'SIGTERM'] as const)
  process.on(sinal, async () => {
    await aplicacao.close();
    await banco.end();
    process.exit(0);
  });
