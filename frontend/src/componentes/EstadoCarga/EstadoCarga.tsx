//////////////////////////////
// Tela de "carregando" ou de erro de carregamento, igual em todas as páginas.
// No erro aparece o botão "Tentar novamente".
//////////////////////////////

import { AlertCircle } from 'lucide-react';
import { Botao } from '../Botao/Botao';
import { EstadoVazio } from '../EstadoVazio/EstadoVazio';

interface PropriedadesEstadoCarga {
  erro: string | null;
  aoTentarNovamente: () => void;
  tituloCarregando?: string;
}

export function EstadoCarga({
  erro,
  aoTentarNovamente,
  tituloCarregando = 'Carregando registros...',
}: PropriedadesEstadoCarga) {
  if (!erro) return <EstadoVazio role="status" tamanho="pagina" titulo={tituloCarregando} />;
  return (
    <EstadoVazio
      role="alert"
      tamanho="pagina"
      icone={AlertCircle}
      titulo={erro}
      acoes={<Botao onClick={aoTentarNovamente}>Tentar novamente</Botao>}
    />
  );
}
