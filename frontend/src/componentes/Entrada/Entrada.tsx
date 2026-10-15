//////////////////////////////
// Campo de texto de uma linha com rótulo, mensagem de erro e sugestões.
// As classes dos campos ficam aqui para os outros campos usarem as mesmas.
// Com erro, o leitor de tela lê a mensagem junto com o campo.
//////////////////////////////

import { AlertCircle } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

export type TamanhoCampo = 'normal' | 'toque';

export const classesCampo = {
  rotulo: 'flex flex-col gap-1.5 text-sm font-medium text-texto',
  controle:
    'w-full rounded-controle border bg-superficie px-3 font-normal text-texto outline-none transition-[border-color,box-shadow] duration-120 placeholder:text-texto-suave focus:ring-2 disabled:opacity-60 motion-reduce:transition-none',
  semErro: 'border-texto-suave/75 focus:border-primaria focus:ring-primaria/20',
  comErro: 'border-perigo focus:border-perigo focus:ring-perigo/20',
  texto: { normal: 'text-sm', toque: 'text-base' } satisfies Record<TamanhoCampo, string>,
  mensagemErro: 'flex items-center gap-1 text-sm font-normal text-perigo',
};

const alturas: Record<TamanhoCampo, string> = { normal: 'h-10', toque: 'h-12' };

interface PropriedadesEntrada extends InputHTMLAttributes<HTMLInputElement> {
  rotulo: string;
  erro?: string;
  tamanho?: TamanhoCampo;
  sugestoes?: string[];
}

export function Entrada({
  rotulo,
  erro,
  id,
  tamanho = 'normal',
  className = '',
  sugestoes = [],
  ...propriedadesNativas
}: PropriedadesEntrada) {
  const idErro = erro && id ? `${id}-erro` : undefined;
  const idSugestoes = id && sugestoes.length ? `${id}-sugestoes` : undefined;
  return (
    <>
      <label className={classesCampo.rotulo} htmlFor={id}>
        <span>{rotulo}</span>
        <input
          className={`${classesCampo.controle} ${erro ? classesCampo.comErro : classesCampo.semErro} ${classesCampo.texto[tamanho]} ${alturas[tamanho]} ${className}`}
          id={id}
          aria-invalid={Boolean(erro)}
          aria-describedby={idErro}
          list={idSugestoes}
          autoComplete={idSugestoes ? 'off' : undefined}
          {...propriedadesNativas}
        />
        <MensagemErroCampo id={idErro} erro={erro} />
      </label>
      {idSugestoes && (
        <datalist id={idSugestoes}>
          {sugestoes.map((valor) => (
            <option key={valor} value={valor} />
          ))}
        </datalist>
      )}
    </>
  );
}

export function MensagemErroCampo({ id, erro }: { id?: string; erro?: string }) {
  if (!erro) return null;
  return (
    <span id={id} className={classesCampo.mensagemErro}>
      <AlertCircle size={14} className="shrink-0" />
      {erro}
    </span>
  );
}
