//////////////////////////////
// Botão padrão da aplicação, com variantes de cor e um tamanho maior para toque.
// O tipo padrão é "button", para não enviar formulários sem querer.
//////////////////////////////

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variante = 'primario' | 'secundario' | 'fantasma' | 'perigo';

type Tamanho = 'normal' | 'toque';

interface PropriedadesBotao extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variante?: Variante;
  tamanho?: Tamanho;
}

const classesVariante: Record<Variante, string> = {
  primario: 'border-transparent bg-primaria text-white hover:bg-primaria-escura',
  secundario: 'border-transparent bg-primaria-suave text-primaria hover:border-primaria/30',
  fantasma: 'border-borda bg-superficie text-texto hover:bg-fundo',
  perigo: 'border-transparent bg-perigo text-white hover:bg-perigo/90',
};

const classesTamanho: Record<Tamanho, string> = {
  normal: 'h-10 px-4 text-sm',
  toque: 'h-12 px-5 text-base',
};

export function Botao({
  children,
  variante = 'primario',
  tamanho = 'normal',
  className = '',
  type = 'button',
  ...propriedadesNativas
}: PropriedadesBotao) {
  return (
    <button
      type={type}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-controle border font-medium transition-[color,background-color,border-color,scale] duration-120 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100 ${classesVariante[variante]} ${classesTamanho[tamanho]} ${className}`}
      {...propriedadesNativas}
    >
      {children}
    </button>
  );
}
