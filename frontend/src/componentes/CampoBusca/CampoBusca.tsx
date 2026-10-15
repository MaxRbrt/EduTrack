//////////////////////////////
// Campo de busca de aluno pelo nome, com a lupa dentro do campo.
//////////////////////////////

import { Search } from 'lucide-react';
import { classesCampo } from '../Entrada/Entrada';

interface PropriedadesCampoBusca {
  valor: string;
  aoMudar: (valor: string) => void;
  autoFocus?: boolean;
  className?: string;
}

export function CampoBusca({ valor, aoMudar, autoFocus, className = '' }: PropriedadesCampoBusca) {
  return (
    <div className="relative min-w-0 flex-1 basis-80">
      <Search
        size={20}
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-texto-suave"
      />
      <input
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        placeholder="Buscar pelo nome..."
        aria-label="Buscar aluno pelo nome"
        autoFocus={autoFocus}
        className={`${classesCampo.controle} ${classesCampo.semErro} ${classesCampo.texto.toque} h-12 pl-12 ${className}`}
      />
    </div>
  );
}
