//////////////////////////////
// Login dos porteiros: entrar, sair e saber quem está conectado.
// Há um autenticador simulado, para usar sem servidor, e um que usa a API.
// Sair funciona mesmo sem internet; a sessão no servidor expira sozinha.
//////////////////////////////

import { USUARIO_SIMULADO } from '../regras/regrasRegistroAtraso';
import { ErroApi, type ClienteApi, type SessaoLocal } from './api/clienteApi';

const PADRAO_USUARIO = /^[a-z0-9._-]{1,40}$/;

export class ErroAutenticacao extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroAutenticacao';
  }
}

export interface Autenticador {
  obterUsuario(): Promise<string | null>;
  entrar(usuario: string, senha: string): Promise<string>;
  sair(): Promise<void>;
  aoMudar(ouvinte: (usuario: string | null) => void): () => void;
}

function validarUsuario(usuario: string) {
  const limpo = usuario.trim().toLowerCase();
  if (!limpo) throw new ErroAutenticacao('Informe o usuário.');
  if (!PADRAO_USUARIO.test(limpo))
    throw new ErroAutenticacao(
      'Usuário inválido: use letras, números, ponto, hífen ou sublinhado.',
    );
  return limpo;
}

export function criarAutenticadorSimulado(): Autenticador {
  let usuario: string | null = USUARIO_SIMULADO;
  const ouvintes = new Set<(usuario: string | null) => void>();
  const avisar = () => ouvintes.forEach((ouvinte) => ouvinte(usuario));
  return {
    obterUsuario: async () => usuario,
    entrar: async (nome) => {
      usuario = validarUsuario(nome);
      avisar();
      return usuario;
    },
    sair: async () => {
      usuario = null;
      avisar();
    },
    aoMudar: (ouvinte) => {
      ouvintes.add(ouvinte);
      return () => ouvintes.delete(ouvinte);
    },
  };
}

function mensagemErroEntrar(erro: unknown) {
  const status = erro instanceof ErroApi ? erro.status : 500;
  if (status === undefined)
    return 'Sem conexão com o servidor. Verifique a internet e tente novamente.';
  if (status === 429) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  if (status === 401 || status === 400) return 'Usuário ou senha incorretos.';
  return 'Não foi possível entrar. Tente novamente.';
}

export function criarAutenticadorApi(cliente: ClienteApi): Autenticador {
  return {
    obterUsuario: async () => cliente.obterSessao()?.usuario ?? null,
    entrar: async (usuario, senha) => {
      const nome = validarUsuario(usuario);
      let sessao: SessaoLocal;
      try {
        sessao = await cliente.pedir<SessaoLocal>('POST', '/sessao', { usuario: nome, senha });
      } catch (erro) {
        throw new ErroAutenticacao(mensagemErroEntrar(erro));
      }
      cliente.definirSessao(sessao);
      return sessao.usuario;
    },
    sair: async () => {
      const pedido = cliente.obterSessao() ? cliente.pedir('DELETE', '/sessao') : null;
      cliente.definirSessao(null);
      await pedido?.catch(() => undefined);
    },
    aoMudar: (ouvinte) => cliente.aoMudarSessao((sessao) => ouvinte(sessao?.usuario ?? null)),
  };
}
