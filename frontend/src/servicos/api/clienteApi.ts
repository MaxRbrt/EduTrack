//////////////////////////////
// Cliente da API: o único lugar do frontend que chama `fetch`.
// Guarda no navegador só a sessão (token e usuário), nunca dados de aluno.
// Depois de 15 s sem resposta o pedido conta como falha de rede, e uma
// resposta 401 encerra a sessão local e leva de volta ao login.
//////////////////////////////

const TEMPO_LIMITE_MS = 15_000;

const CHAVE_SESSAO = 'edutrack-sessao';

const BASE = '/api';

export interface SessaoLocal {
  token: string;
  usuario: string;
}

export class ErroApi extends Error {
  readonly status: number | undefined;

  constructor(status: number | undefined) {
    super(status ? `A API respondeu ${status}.` : 'A API não respondeu.');
    this.name = 'ErroApi';
    this.status = status;
  }
}

export interface ClienteApi {
  pedir<T>(
    metodo: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    caminho: string,
    corpo?: unknown,
  ): Promise<T>;
  obterSessao(): SessaoLocal | null;
  definirSessao(sessao: SessaoLocal | null): void;
  aoMudarSessao(ouvinte: (sessao: SessaoLocal | null) => void): () => void;
}

export function criarClienteApi(): ClienteApi {
  const ouvintes = new Set<(sessao: SessaoLocal | null) => void>();

  const obterSessao = (): SessaoLocal | null => {
    try {
      const sessao = JSON.parse(localStorage.getItem(CHAVE_SESSAO) ?? 'null') as SessaoLocal | null;
      return sessao && typeof sessao.token === 'string' && typeof sessao.usuario === 'string'
        ? sessao
        : null;
    } catch {
      return null;
    }
  };

  const definirSessao = (sessao: SessaoLocal | null) => {
    if (sessao) localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
    else localStorage.removeItem(CHAVE_SESSAO);
    ouvintes.forEach((ouvinte) => ouvinte(sessao));
  };

  return {
    obterSessao,
    definirSessao,
    aoMudarSessao: (ouvinte) => {
      ouvintes.add(ouvinte);
      return () => ouvintes.delete(ouvinte);
    },
    pedir: async <T>(metodo: string, caminho: string, corpo?: unknown) => {
      const token = obterSessao()?.token;
      let resposta: Response;
      try {
        resposta = await fetch(`${BASE}${caminho}`, {
          method: metodo,
          headers: {
            ...(corpo === undefined ? {} : { 'Content-Type': 'application/json' }),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: corpo === undefined ? undefined : JSON.stringify(corpo),
          signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
        });
      } catch {
        throw new ErroApi(undefined);
      }
      if (resposta.ok) return (resposta.status === 204 ? undefined : await resposta.json()) as T;
      if (resposta.status === 401 && token && obterSessao()?.token === token) definirSessao(null);
      throw new ErroApi(resposta.status);
    },
  };
}
