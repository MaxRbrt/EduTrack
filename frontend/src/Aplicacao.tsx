//////////////////////////////
// Entrega a tela ao roteador, que escolhe a página pelo endereço.
//////////////////////////////

import { RouterProvider } from 'react-router-dom';
import { roteador } from './rotas/RotasAplicacao';

function Aplicacao() {
  return <RouterProvider router={roteador} />;
}

export default Aplicacao;
