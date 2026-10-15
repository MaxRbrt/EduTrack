//////////////////////////////
// Monta os repositórios e o login conforme `VITE_MODO_DADOS`.
// No modo `api` (padrão) os dados vão ao servidor, com fila offline; no
// modo `memoria` tudo fica na memória do navegador, sem servidor. O modo
// `memoria` (login simulado, sem senha) só existe em desenvolvimento: o
// build de produção o recusa e o Vite descarta esse código.
//////////////////////////////

import { criarAutenticadorApi, criarAutenticadorSimulado, type Autenticador } from './autenticacao';
import { criarClienteApi } from './api/clienteApi';
import { criarFilaOffline } from './offline/filaOffline';
import { criarRepositorioAlunosMemoria, type RepositorioAlunos } from './repositorioAlunos';
import { criarRepositorioAlunosApi } from './api/repositorioAlunosApi';
import { criarRepositorioApi } from './api/repositorioApi';
import { criarRepositorioMemoria, type RepositorioAtrasos } from './repositorioAtrasos';
import { criarRepositorioSincronizado } from './offline/repositorioSincronizado';

type ConfiguracaoDados =
  { modo: 'memoria' } | { modo: 'api' } | { modo: 'invalido'; mensagem: string };

export function lerConfiguracaoDados(
  ambiente: Record<string, string | undefined>,
): ConfiguracaoDados {
  const modo = ambiente.VITE_MODO_DADOS?.trim() || 'api';
  if (modo === 'api') return { modo };
  if (modo === 'memoria')
    return import.meta.env.DEV
      ? { modo }
      : { modo: 'invalido', mensagem: 'O modo "memoria" só existe em desenvolvimento.' };
  return {
    modo: 'invalido',
    mensagem: `Modo de dados desconhecido: "${modo}". Use "memoria" ou "api".`,
  };
}

interface Dependencias {
  repositorio: RepositorioAtrasos;
  repositorioAlunos: RepositorioAlunos;
  autenticador: Autenticador;
}

export function criarDependencias(
  configuracao: Exclude<ConfiguracaoDados, { modo: 'invalido' }>,
): Dependencias {
  if (import.meta.env.DEV && configuracao.modo === 'memoria')
    return {
      repositorio: criarRepositorioMemoria(),
      repositorioAlunos: criarRepositorioAlunosMemoria(),
      autenticador: criarAutenticadorSimulado(),
    };
  const cliente = criarClienteApi();
  const repositorioAlunos = criarRepositorioAlunosApi(cliente);
  return {
    repositorio: criarRepositorioSincronizado(
      criarRepositorioApi(cliente),
      criarFilaOffline(),
      repositorioAlunos,
    ),
    repositorioAlunos,
    autenticador: criarAutenticadorApi(cliente),
  };
}
