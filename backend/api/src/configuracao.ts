//////////////////////////////
// Lê a configuração da API das variáveis de ambiente.
// Só portas e pastas têm valor padrão; se faltar senha ou segredo, a API não inicia.
//////////////////////////////

import { resolve } from 'node:path';

export interface ConfiguracaoBanco {
  host: string;
  porta: number;
  nome: string;
  usuario: string;
  senha: string;
}

interface Configuracao {
  porta: number;
  banco: ConfiguracaoBanco;
  segredoFotos: string;
  pastaFotos: string;
  pastaFrontend: string;
}

const TAMANHO_MINIMO_SEGREDO = 32;

export function lerConfiguracao(ambiente: Record<string, string | undefined>): Configuracao {
  const obrigatoria = (nome: string) => {
    const valor = ambiente[nome]?.trim();
    if (!valor) throw new Error(`Configuração ausente: defina ${nome} em backend/api/.env.`);
    return valor;
  };
  const banco: ConfiguracaoBanco = {
    host: obrigatoria('BD_HOST'),
    porta: Number(ambiente.BD_PORTA?.trim() || 3306),
    nome: obrigatoria('BD_NOME'),
    usuario: obrigatoria('BD_USUARIO'),
    senha: obrigatoria('BD_SENHA'),
  };
  const segredoFotos = obrigatoria('SEGREDO_FOTOS');
  if (segredoFotos.length < TAMANHO_MINIMO_SEGREDO)
    throw new Error(`SEGREDO_FOTOS precisa de pelo menos ${TAMANHO_MINIMO_SEGREDO} caracteres.`);
  return {
    porta: Number(ambiente.PORTA?.trim() || 3001),
    banco,
    segredoFotos,
    pastaFotos: resolve(ambiente.PASTA_FOTOS?.trim() || 'dados/fotos'),
    pastaFrontend: resolve(ambiente.PASTA_FRONTEND?.trim() || '../../frontend/dist'),
  };
}
