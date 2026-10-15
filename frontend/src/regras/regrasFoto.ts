import type { NovoRegistroAtraso } from '../tipos/RegistroAtraso';

const LARGURA_MAXIMA_FOTO = 480;

export const QUALIDADE_FOTO = 0.7;

export function calcularDimensoesFoto(largura: number, altura: number) {
  const larguraFinal = Math.min(largura, LARGURA_MAXIMA_FOTO);
  const proporcao = larguraFinal / largura;
  return {
    largura: Math.round(larguraFinal),
    altura: Math.round(altura * proporcao),
  };
}

export const caminhoFotoAtraso = ({
  id,
  anoLetivo,
}: Pick<NovoRegistroAtraso, 'id' | 'anoLetivo'>) => `${anoLetivo}/${id}.jpg`;
