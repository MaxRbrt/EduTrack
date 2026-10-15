//////////////////////////////
// Moldura das telas do menu: barra lateral, cabeçalho e a área de conteúdo.
// Sem sessão, manda para o login e volta depois para a tela pedida.
// "Sair" com registros aguardando envio abre a fila em vez de sair,
// para nenhum atraso se perder. A fila fecha sozinha quando tudo foi enviado.
//////////////////////////////

import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Cabecalho } from '../../componentes/Cabecalho/Cabecalho';
import { BarraLateral, itensNavegacao } from '../../componentes/BarraLateral/BarraLateral';
import { EstadoVazio } from '../../componentes/EstadoVazio/EstadoVazio';
import { useDadosEscola } from '../../contextos/ContextoDadosEscola/ContextoDadosEscola';
import { useSessao } from '../../contextos/ContextoSessao/ContextoSessao';
import { ModalFilaEnvio } from './ModalFilaEnvio';

export function EstruturaPainel() {
  const localizacao = useLocation();
  const { usuario, carregando, sair } = useSessao();
  const { registrosAtraso, salvandoRegistro } = useDadosEscola();
  const [filaAberta, definirFilaAberta] = useState<'indicador' | 'sair' | null>(null);
  const pendentes = registrosAtraso.filter((registro) => registro.envio !== 'enviado').length;

  useEffect(() => {
    if (pendentes === 0) definirFilaAberta(null);
  }, [pendentes]);

  if (carregando)
    return <EstadoVazio role="status" tamanho="pagina" titulo="Verificando acesso..." />;
  if (!usuario)
    return (
      <Navigate
        to="/entrar"
        replace
        state={{ de: `${localizacao.pathname}${localizacao.search}` }}
      />
    );

  const pedirSaida = () => {
    if (pendentes > 0) definirFilaAberta('sair');
    else void sair();
  };

  return (
    <div className="flex min-h-dvh flex-col bg-fundo lg:flex-row">
      <BarraLateral />
      <main className="min-w-0 flex-1">
        <Cabecalho
          titulo={
            itensNavegacao.find(({ to }) => to === localizacao.pathname)?.rotulo ?? 'Dashboard'
          }
          usuario={usuario}
          pendentes={pendentes}
          aoAbrirFila={() => definirFilaAberta('indicador')}
          aoSair={pedirSaida}
          sairBloqueado={salvandoRegistro}
        />
        <div
          className="mx-auto w-full max-w-[1280px] px-4 py-6 lg:px-8"
          style={{ viewTransitionName: 'conteudo' }}
        >
          <Outlet />
        </div>
      </main>
      <ModalFilaEnvio
        aberto={filaAberta !== null}
        titulo={
          filaAberta === 'sair' ? 'Há registros aguardando envio' : 'Registros aguardando envio'
        }
        descricao={
          filaAberta === 'sair'
            ? 'Enquanto houver registros não enviados, não é possível sair. Conecte-se à internet e use "Enviar agora".'
            : 'Estes registros estão guardados só neste computador. São enviados sozinhos quando a internet voltar.'
        }
        aoFechar={() => definirFilaAberta(null)}
      />
    </div>
  );
}
