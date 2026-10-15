//////////////////////////////
// Cartão com cabeçalho (título, descrição e ações) e o conteúdo abaixo.
//////////////////////////////

import type { ReactNode } from 'react';

interface PropriedadesPainel {
  titulo: string;
  descricao?: ReactNode;
  acoes?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Painel({ titulo, descricao, acoes, children, className = '' }: PropriedadesPainel) {
  return (
    <section
      className={`rounded-cartao border border-borda bg-superficie shadow-cartao ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-borda px-5 py-4">
        <div>
          <h3 className="m-0 text-base font-semibold text-texto">{titulo}</h3>
          {descricao && <p className="m-0 mt-1 text-sm text-texto-suave">{descricao}</p>}
        </div>
        {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
      </div>
      {children}
    </section>
  );
}
