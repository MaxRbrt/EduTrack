//////////////////////////////
// Mensagem centralizada para lista vazia, carregando ou erro,
// com ícone, título, descrição e ações opcionais.
//////////////////////////////

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type Tamanho = 'painel' | 'pagina';

interface PropriedadesEstadoVazio {
  titulo: string;
  icone?: LucideIcon;
  descricao?: ReactNode;
  acoes?: ReactNode;
  role?: 'status' | 'alert';
  tamanho?: Tamanho;
}

const classesTamanho: Record<Tamanho, string> = {
  painel: 'px-5 py-10',
  pagina: 'min-h-96 rounded-cartao border border-borda bg-superficie px-5 py-12 shadow-cartao',
};

export function EstadoVazio({
  titulo,
  icone: Icone,
  descricao,
  acoes,
  role,
  tamanho = 'painel',
}: PropriedadesEstadoVazio) {
  return (
    <div
      role={role}
      className={`flex flex-col items-center justify-center gap-2 text-center text-sm text-texto-suave ${classesTamanho[tamanho]}`}
    >
      {Icone && <Icone size={26} />}
      <strong className="font-semibold text-texto">{titulo}</strong>
      {descricao && <p className="m-0">{descricao}</p>}
      {acoes && <div className="mt-2 flex flex-wrap justify-center gap-2">{acoes}</div>}
    </div>
  );
}
