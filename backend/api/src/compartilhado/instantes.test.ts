import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { validarAnuladoEm, validarRegistradoEm } from './instantes.ts';

const agora = new Date('2026-10-15T12:00:00.000Z');
const minutos = (n: number) => n * 60 * 1000;
const dias = (n: number) => n * 24 * 60 * 60 * 1000;

describe('validarRegistradoEm', () => {
  test('aceita o horário atual no ano letivo atual', () => {
    assert.equal(validarRegistradoEm(agora, 2026, agora), null);
  });

  test('aceita registro da fila offline de alguns dias atrás', () => {
    assert.equal(validarRegistradoEm(new Date(agora.getTime() - dias(10)), 2026, agora), null);
  });

  test('aceita relógio do tablet um pouco adiantado', () => {
    assert.equal(validarRegistradoEm(new Date(agora.getTime() + minutos(4)), 2026, agora), null);
  });

  test('recusa horário no futuro', () => {
    assert.match(
      validarRegistradoEm(new Date(agora.getTime() + minutos(10)), 2026, agora) ?? '',
      /futuro/,
    );
  });

  test('recusa horário antigo demais', () => {
    assert.match(
      validarRegistradoEm(new Date(agora.getTime() - dias(31)), 2026, agora) ?? '',
      /antigo/,
    );
  });

  test('recusa ano letivo diferente do ano do horário', () => {
    assert.match(validarRegistradoEm(agora, 2025, agora) ?? '', /ano letivo/);
  });

  test('aceita a virada do ano no fuso local (31/12 22h em Brasília já é 1º/01 em UTC)', () => {
    const virada = new Date('2027-01-01T01:00:00.000Z');
    assert.equal(validarRegistradoEm(virada, 2026, virada), null);
    assert.equal(validarRegistradoEm(virada, 2027, virada), null);
  });
});

describe('validarAnuladoEm', () => {
  test('aceita o horário atual', () => {
    assert.equal(validarAnuladoEm(agora, agora), null);
  });

  test('recusa anulação no futuro', () => {
    assert.match(validarAnuladoEm(new Date(agora.getTime() + minutos(10)), agora) ?? '', /futuro/);
  });
});
