//////////////////////////////
// Classes das tabelas de dados (Histórico e Alunos).
// No computador é uma tabela comum; no tablet e no celular cada linha vira
// um cartão só com CSS, com o rótulo da coluna acima de cada valor.
//////////////////////////////

export const classeTabela = 'w-full border-collapse text-left text-sm max-lg:block';

export const classeCabecalhoGrupo = 'max-lg:sr-only';

export const classeCabecalhoTabela =
  'border-b border-borda bg-fundo px-3 py-3 text-xs font-medium tracking-wide text-texto-suave uppercase';

export const classeCorpoTabela = 'max-lg:block';

export const classeLinhaTabela =
  'max-lg:grid max-lg:grid-cols-2 sm:max-lg:grid-cols-4 max-lg:gap-x-4 max-lg:gap-y-3 max-lg:border-b max-lg:border-borda max-lg:p-4';

export const classeCelula =
  'border-b border-borda px-3 py-3 align-middle max-lg:border-0 max-lg:p-0 max-lg:before:mb-0.5 max-lg:before:block max-lg:before:text-xs max-lg:before:font-medium max-lg:before:text-texto-suave max-lg:before:content-[attr(data-rotulo)]';

export const classeCelulaCurta = `${classeCelula} whitespace-nowrap max-lg:whitespace-normal`;

export const classeCelulaInteira = 'max-lg:col-span-full';
