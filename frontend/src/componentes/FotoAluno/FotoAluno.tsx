//////////////////////////////
// Foto do aluno; sem foto, ou se a imagem não carregar (link vencido ou
// arquivo ausente), mostra um ícone de pessoa. Redonda por padrão; `classe`
// troca o tamanho e a forma.
//////////////////////////////

import { UserRound } from 'lucide-react';
import { useState } from 'react';

interface PropriedadesFotoAluno {
  origem: string | null;
  grande?: boolean;
  alt?: string;
  classe?: string;
  tamanhoIcone?: number;
}

export function FotoAluno({
  origem,
  grande = false,
  alt = '',
  classe,
  tamanhoIcone,
}: PropriedadesFotoAluno) {
  const [origemComFalha, definirOrigemComFalha] = useState<string | null>(null);
  const mostrarImagem = origem !== null && origem !== origemComFalha;

  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden bg-fundo text-texto-suave ${classe ?? `rounded-full ${grande ? 'size-20' : 'size-9'}`}`}
    >
      {mostrarImagem ? (
        <img
          src={origem}
          alt={alt}
          className="size-full object-cover"
          onError={() => definirOrigemComFalha(origem)}
        />
      ) : (
        <UserRound size={tamanhoIcone ?? (grande ? 34 : 18)} aria-hidden />
      )}
    </span>
  );
}
