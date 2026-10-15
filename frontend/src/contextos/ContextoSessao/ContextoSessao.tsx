//////////////////////////////
// Guarda quem está conectado e oferece entrar e sair.
// Ao abrir, pergunta se já existe uma sessão salva e passa a ouvir as
// mudanças, como a sessão encerrada pelo servidor.
//////////////////////////////

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Autenticador } from '../../servicos/autenticacao';

interface ValorContextoSessao {
  usuario: string | null;
  carregando: boolean;
  entrar: (usuario: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
}

const ContextoSessao = createContext<ValorContextoSessao | null>(null);

export function ProvedorSessao({
  autenticador,
  children,
}: {
  autenticador: Autenticador;
  children: ReactNode;
}) {
  const [usuario, definirUsuario] = useState<string | null>(null);
  const [carregando, definirCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    void autenticador.obterUsuario().then((atual) => {
      if (!ativo) return;
      definirUsuario(atual);
      definirCarregando(false);
    });
    const cancelar = autenticador.aoMudar((atual) => {
      definirUsuario(atual);
      definirCarregando(false);
    });
    return () => {
      ativo = false;
      cancelar();
    };
  }, [autenticador]);

  const entrar = async (nome: string, senha: string) => {
    definirUsuario(await autenticador.entrar(nome, senha));
  };
  const sair = () => autenticador.sair();

  return (
    <ContextoSessao.Provider value={{ usuario, carregando, entrar, sair }}>
      {children}
    </ContextoSessao.Provider>
  );
}

export function useSessao() {
  const contexto = useContext(ContextoSessao);
  if (!contexto) throw new Error('useSessao deve ser usado dentro de ProvedorSessao.');
  return contexto;
}
