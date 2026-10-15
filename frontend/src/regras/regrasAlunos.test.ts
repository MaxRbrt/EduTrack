import { describe, expect, it } from 'vitest';
import { limparDadosAluno } from './regrasAlunos';

describe('limparDadosAluno', () => {
  it('remove espaços excedentes de todos os campos do cadastro', () => {
    expect(
      limparDadosAluno({
        nome: '  Ana   Souza ',
        curso: ' Desenvolvimento   de Sistemas ',
        periodo: ' Manhã ',
        serieModulo: ' 1º ',
        turma: ' A ',
        sala: ' Sala   12 ',
      }),
    ).toEqual({
      nome: 'Ana Souza',
      curso: 'Desenvolvimento de Sistemas',
      periodo: 'Manhã',
      serieModulo: '1º',
      turma: 'A',
      sala: 'Sala 12',
    });
  });
});
