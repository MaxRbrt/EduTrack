//////////////////////////////
// Etiqueta pequena e arredondada para marcar uma situação, como "Anulado".
//////////////////////////////

import type { ReactNode } from 'react';

type Tom = 'anulado' | 'alerta' | 'neutro';

interface PropriedadesSelo {
  tom: Tom;
  children: ReactNode;
}

const classesTom: Record<Tom, string> = {
  anulado: 'bg-perigo-suave text-perigo',
  alerta: 'bg-alerta-suave text-alerta',
  neutro: 'bg-fundo text-texto-suave',
};

export function Selo({ tom, children }: PropriedadesSelo) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${classesTom[tom]}`}
    >
      {children}
    </span>
  );
}
