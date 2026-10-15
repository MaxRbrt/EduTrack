//////////////////////////////
// Tela de login da portaria, com usuário e senha.
// Quem já está conectado vai direto para a tela que tinha pedido.
// Só mostra mensagens de erro do próprio sistema e apaga a senha
// depois de uma tentativa que falhou.
//////////////////////////////

import { GraduationCap } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alerta } from '../../componentes/Alerta/Alerta';
import { Botao } from '../../componentes/Botao/Botao';
import { Entrada } from '../../componentes/Entrada/Entrada';
import { useSessao } from '../../contextos/ContextoSessao/ContextoSessao';
import { ErroAutenticacao } from '../../servicos/autenticacao';

export function Entrar() {
  const { usuario, carregando, entrar } = useSessao();
  const localizacao = useLocation();
  const navegar = useNavigate();
  const [nomeUsuario, definirNomeUsuario] = useState('');
  const [senha, definirSenha] = useState('');
  const [erro, definirErro] = useState('');
  const [entrando, definirEntrando] = useState(false);
  const destino = (localizacao.state as { de?: string } | null)?.de ?? '/dashboard';

  if (!carregando && usuario) return <Navigate to={destino} replace />;

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!nomeUsuario.trim() || !senha) {
      definirErro('Informe usuário e senha.');
      return;
    }
    definirEntrando(true);
    definirErro('');
    try {
      await entrar(nomeUsuario, senha);
      navegar(destino, { replace: true });
    } catch (falha) {
      definirErro(
        falha instanceof ErroAutenticacao
          ? falha.message
          : 'Não foi possível entrar. Tente novamente.',
      );
      definirSenha('');
    } finally {
      definirEntrando(false);
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-fundo px-4 py-8">
      <form
        onSubmit={(evento) => void enviar(evento)}
        noValidate
        className="flex w-full max-w-sm flex-col gap-4 rounded-cartao border border-borda bg-superficie p-6 shadow-cartao"
      >
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-controle bg-marca text-white">
            <GraduationCap size={22} aria-hidden />
          </div>
          <div>
            <h1 className="m-0 text-xl font-semibold text-texto">Entrar no EduTrack</h1>
            <p className="m-0 text-sm text-texto-suave">Acesso restrito à portaria.</p>
          </div>
        </div>
        {erro && <Alerta tom="erro">{erro}</Alerta>}
        <Entrada
          id="usuario"
          rotulo="Usuário"
          tamanho="toque"
          autoComplete="username"
          autoCapitalize="none"
          value={nomeUsuario}
          onChange={(evento) => definirNomeUsuario(evento.target.value)}
        />
        <Entrada
          id="senha"
          rotulo="Senha"
          type="password"
          tamanho="toque"
          autoComplete="current-password"
          value={senha}
          onChange={(evento) => definirSenha(evento.target.value)}
        />
        <Botao type="submit" tamanho="toque" disabled={entrando}>
          {entrando ? 'Entrando...' : 'Entrar'}
        </Botao>
      </form>
    </main>
  );
}
