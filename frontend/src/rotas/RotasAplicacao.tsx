//////////////////////////////
// Mapa de endereços da aplicação para as telas.
// "/entrar" fica fora da estrutura com menu, que exige sessão; endereço
// desconhecido volta para o Dashboard. O roteador permite impedir a saída
// de um formulário preenchido.
//////////////////////////////

import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { EstruturaPainel } from '../estruturas/EstruturaPainel/EstruturaPainel';
import { Entrar } from '../paginas/Entrar/Entrar';
import { Painel } from '../paginas/Painel/Painel';
import { RegistroAtraso } from '../paginas/RegistroAtraso/RegistroAtraso';
import { HistoricoAluno } from '../paginas/HistoricoAluno/HistoricoAluno';
import { Alunos } from '../paginas/Alunos/Alunos';

const rotasAplicacao: RouteObject[] = [
  { path: '/entrar', element: <Entrar /> },
  {
    element: <EstruturaPainel />,
    children: [
      { path: '/dashboard', element: <Painel /> },
      { path: '/registrar', element: <RegistroAtraso /> },
      { path: '/historico', element: <HistoricoAluno /> },
      { path: '/alunos', element: <Alunos /> },
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
];

export const roteador = createBrowserRouter(rotasAplicacao);
