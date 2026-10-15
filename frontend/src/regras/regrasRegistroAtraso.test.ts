import { describe, expect, it } from 'vitest';
import { pluralizar } from './regrasRegistroAtraso';

describe('pluralizar', () => {
  it('usa o singular para 1', () => {
    expect(pluralizar(1, 'atraso', 'atrasos')).toBe('1 atraso');
  });

  it('usa o plural para 0 e para mais de 1', () => {
    expect(pluralizar(0, 'atraso', 'atrasos')).toBe('0 atrasos');
    expect(pluralizar(3, 'aluno', 'alunos')).toBe('3 alunos');
  });
});
