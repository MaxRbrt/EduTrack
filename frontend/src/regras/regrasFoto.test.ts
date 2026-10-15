import { describe, expect, it } from 'vitest';
import { calcularDimensoesFoto, caminhoFotoAtraso, QUALIDADE_FOTO } from './regrasFoto';

describe('regrasFoto', () => {
  it('limita a largura preservando a proporção', () => {
    expect(calcularDimensoesFoto(1920, 1080)).toEqual({ largura: 480, altura: 270 });
    expect(calcularDimensoesFoto(320, 240)).toEqual({ largura: 320, altura: 240 });
  });

  it('mantém qualidade e caminho usados pelo armazenamento', () => {
    expect(QUALIDADE_FOTO).toBe(0.7);
    expect(caminhoFotoAtraso({ id: 'registro', anoLetivo: 2026 })).toBe('2026/registro.jpg');
  });
});
