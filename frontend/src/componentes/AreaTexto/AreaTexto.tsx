//////////////////////////////
// Campo de texto de várias linhas, com a mesma aparência da Entrada.
// Com erro, o leitor de tela lê a mensagem junto com o campo.
//////////////////////////////

import type { TextareaHTMLAttributes } from 'react';
import { classesCampo, MensagemErroCampo, type TamanhoCampo } from '../Entrada/Entrada';

interface PropriedadesAreaTexto extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  rotulo: string;
  erro?: string;
  tamanho?: TamanhoCampo;
}

export function AreaTexto({
  rotulo,
  erro,
  id,
  tamanho = 'normal',
  className = '',
  ...propriedadesNativas
}: PropriedadesAreaTexto) {
  const idErro = erro && id ? `${id}-erro` : undefined;
  return (
    <label className={classesCampo.rotulo} htmlFor={id}>
      <span>{rotulo}</span>
      <textarea
        className={`${classesCampo.controle} ${erro ? classesCampo.comErro : classesCampo.semErro} ${classesCampo.texto[tamanho]} min-h-20 resize-y py-2 ${className}`}
        id={id}
        aria-invalid={Boolean(erro)}
        aria-describedby={idErro}
        {...propriedadesNativas}
      />
      <MensagemErroCampo id={idErro} erro={erro} />
    </label>
  );
}
