//////////////////////////////
// Janela de diálogo feita com o <dialog> nativo do navegador.
// Não fecha ao clicar fora; o Esc avisa quem usa, que decide o que fazer.
// Entrada e saída são animadas só com CSS e param com movimento reduzido.
//////////////////////////////

import { AlertTriangle } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

interface PropriedadesModal {
  aberto: boolean;
  titulo: string;
  descricao?: ReactNode;
  tom?: 'padrao' | 'alerta';
  aoFechar: () => void;
  acoes: ReactNode;
  children?: ReactNode;
}

const DURACAO_SAIDA_MS = 150;

export function Modal({
  aberto,
  titulo,
  descricao,
  tom = 'padrao',
  aoFechar,
  acoes,
  children,
}: PropriedadesModal) {
  const referenciaDialogo = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();
  const idDescricao = useId();
  const [saindo, definirSaindo] = useState(false);

  useEffect(() => {
    const dialogo = referenciaDialogo.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) dialogo.showModal();
    if (!aberto && dialogo.open) {
      dialogo.close();
      definirSaindo(true);
      const temporizador = window.setTimeout(() => definirSaindo(false), DURACAO_SAIDA_MS);
      return () => window.clearTimeout(temporizador);
    }
  }, [aberto]);

  const mostrarConteudo = aberto || saindo;

  return (
    <dialog
      ref={referenciaDialogo}
      className="m-auto w-[calc(100%-2rem)] max-w-lg scale-[0.97] rounded-cartao border border-borda bg-superficie p-6 text-texto opacity-0 shadow-lg transition-[opacity,scale,display,overlay] transition-discrete duration-120 ease-out backdrop:bg-transparent backdrop:transition-[background-color,display,overlay] backdrop:transition-discrete backdrop:duration-120 open:scale-100 open:opacity-100 open:duration-180 open:backdrop:bg-texto/40 open:backdrop:duration-180 starting:open:scale-[0.97] starting:open:opacity-0 starting:open:backdrop:bg-transparent motion-reduce:transition-none motion-reduce:backdrop:transition-none"
      inert={!aberto}
      aria-labelledby={idTitulo}
      aria-describedby={descricao ? idDescricao : undefined}
      onCancel={(evento) => {
        evento.preventDefault();
        aoFechar();
      }}
    >
      {mostrarConteudo && (
        <>
          <h2 id={idTitulo} className="m-0 flex items-center gap-2 text-lg font-semibold">
            {tom === 'alerta' && <AlertTriangle size={20} className="shrink-0 text-alerta" />}
            {titulo}
          </h2>
          {descricao && (
            <div
              id={idDescricao}
              className="mt-2 text-sm leading-relaxed text-texto-suave [&_p]:m-0"
            >
              {descricao}
            </div>
          )}
          {children && <div className="mt-4">{children}</div>}
          <div className="mt-6 flex flex-wrap justify-end gap-2.5 max-[460px]:*:w-full">
            {acoes}
          </div>
        </>
      )}
    </dialog>
  );
}
