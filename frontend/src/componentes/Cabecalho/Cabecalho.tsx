//////////////////////////////
// Topo da área de conteúdo: título da tela, usuário conectado, fila de envio e "Sair".
// O leitor de tela é avisado quando o botão "aguardando envio" aparece ou muda.
//////////////////////////////

import { CloudOff, LogOut } from 'lucide-react';
import { Botao } from '../Botao/Botao';

interface PropriedadesCabecalho {
  titulo: string;
  usuario: string;
  pendentes: number;
  aoAbrirFila: () => void;
  aoSair: () => void;
  sairBloqueado?: boolean;
}

export function Cabecalho({
  titulo,
  usuario,
  pendentes,
  aoAbrirFila,
  aoSair,
  sairBloqueado = false,
}: PropriedadesCabecalho) {
  return (
    <header className="border-b border-borda bg-superficie">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-4 max-sm:py-3 lg:px-8">
        <h1 className="m-0 text-xl font-semibold text-texto max-sm:flex-1 max-sm:text-lg">
          {titulo}
        </h1>
        <div className="flex flex-wrap items-center gap-3 max-sm:contents">
          <div aria-live="polite" className="contents">
            {pendentes > 0 && (
              <Botao variante="secundario" onClick={aoAbrirFila}>
                <CloudOff size={18} aria-hidden />
                {pendentes} aguardando envio
              </Botao>
            )}
          </div>
          <p className="m-0 text-sm text-texto-suave max-sm:order-last max-sm:w-full max-sm:text-xs">
            Conectado como {usuario}
          </p>
          <Botao variante="fantasma" onClick={aoSair} disabled={sairBloqueado}>
            <LogOut size={16} aria-hidden />
            Sair
          </Botao>
        </div>
      </div>
    </header>
  );
}
