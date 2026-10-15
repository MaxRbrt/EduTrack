//////////////////////////////
// Faixa de aviso com ícone (sucesso, erro ou alerta).
// O erro é anunciado na hora pelo leitor de tela; os demais, sem interromper.
//////////////////////////////

import { AlertCircle, AlertTriangle, CheckCircle2, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type Tom = 'sucesso' | 'erro' | 'alerta';

interface PropriedadesAlerta {
  tom: Tom;
  children: ReactNode;
  acoes?: ReactNode;
  className?: string;
}

const estilos: Record<Tom, { fundo: string; icone: LucideIcon; corIcone: string }> = {
  sucesso: {
    fundo: 'border-sucesso/30 bg-sucesso-suave',
    icone: CheckCircle2,
    corIcone: 'text-sucesso',
  },
  erro: { fundo: 'border-perigo/30 bg-perigo-suave', icone: AlertCircle, corIcone: 'text-perigo' },
  alerta: {
    fundo: 'border-alerta/30 bg-alerta-suave',
    icone: AlertTriangle,
    corIcone: 'text-alerta',
  },
};

export function Alerta({ tom, children, acoes, className = '' }: PropriedadesAlerta) {
  const { fundo, icone: Icone, corIcone } = estilos[tom];
  return (
    <div
      role={tom === 'erro' ? 'alert' : 'status'}
      className={`flex flex-wrap items-center gap-3 rounded-controle border px-4 py-3 text-sm text-texto ${fundo} ${className}`}
    >
      <Icone size={18} className={`shrink-0 ${corIcone}`} />
      <div className="min-w-0 flex-1">{children}</div>
      {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
    </div>
  );
}
