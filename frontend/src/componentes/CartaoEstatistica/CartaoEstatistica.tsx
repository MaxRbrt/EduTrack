//////////////////////////////
// Cartão com um número em destaque, usado nos totais do Dashboard.
// Pode contar de 0 até o valor ao aparecer, mas só se a pessoa não pediu
// movimento reduzido. O leitor de tela recebe sempre o valor final.
//////////////////////////////

import { useEffect, useRef, useState } from 'react';

interface PropriedadesCartaoEstatistica {
  rotulo: string;
  valor: number | string;
  animar?: boolean;
}

const permiteMovimento = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: no-preference)').matches;

export function CartaoEstatistica({
  rotulo,
  valor,
  animar = false,
}: PropriedadesCartaoEstatistica) {
  const animavel = animar && typeof valor === 'number';
  const [exibido, definirExibido] = useState(() => (animavel && permiteMovimento() ? 0 : valor));
  const animacaoConcluida = useRef(false);

  useEffect(() => {
    if (!animavel || animacaoConcluida.current || !permiteMovimento()) {
      definirExibido(valor);
      return;
    }
    let ativo = true;
    let desfazer: (() => void) | undefined;
    import('../../animacoes/animacoesPainel')
      .then(({ animarNumero }) => {
        if (!ativo) return;
        desfazer = animarNumero(valor as number, (atual) => {
          definirExibido(atual);
          if (atual === valor) animacaoConcluida.current = true;
        });
      })
      .catch(() => definirExibido(valor));
    return () => {
      ativo = false;
      desfazer?.();
    };
  }, [animavel, valor]);

  return (
    <div className="flex flex-col gap-1 rounded-cartao border border-borda bg-superficie p-4 shadow-cartao">
      <span className="text-sm text-texto-suave">{rotulo}</span>
      <strong
        className={`font-semibold text-texto tabular-nums ${typeof valor === 'number' ? 'text-2xl' : 'text-base'}`}
      >
        {animavel ? (
          <>
            <span className="sr-only">{valor}</span>
            <span aria-hidden="true">{exibido}</span>
          </>
        ) : (
          valor
        )}
      </strong>
    </div>
  );
}
