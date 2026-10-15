//////////////////////////////
// Ponto de entrada da aplicação no navegador.
// Com a configuração inválida, mostra só o aviso "O EduTrack não está configurado".
// Com ela válida, monta os provedores de sessão e de dados, nessa ordem,
// porque os dados dependem da sessão.
//////////////////////////////

import { AlertCircle } from 'lucide-react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Aplicacao from './Aplicacao';
import { EstadoVazio } from './componentes/EstadoVazio/EstadoVazio';
import { ProvedorDadosEscola } from './contextos/ContextoDadosEscola/ContextoDadosEscola';
import { ProvedorSessao } from './contextos/ContextoSessao/ContextoSessao';
import { criarDependencias, lerConfiguracaoDados } from './servicos/dependencias';
import '@fontsource-variable/inter';
import './estilos/tema.css';

const configuracao = lerConfiguracaoDados({
  VITE_MODO_DADOS: import.meta.env.VITE_MODO_DADOS,
});
const raiz = createRoot(document.getElementById('root')!);

if (configuracao.modo === 'invalido') {
  raiz.render(
    <StrictMode>
      <main className="grid min-h-dvh place-items-center bg-fundo px-4">
        <EstadoVazio
          role="alert"
          tamanho="pagina"
          icone={AlertCircle}
          titulo="O EduTrack não está configurado"
          descricao={configuracao.mensagem}
        />
      </main>
    </StrictMode>,
  );
} else {
  const { repositorio, repositorioAlunos, autenticador } = criarDependencias(configuracao);
  raiz.render(
    <StrictMode>
      <ProvedorSessao autenticador={autenticador}>
        <ProvedorDadosEscola repositorio={repositorio} repositorioAlunos={repositorioAlunos}>
          <Aplicacao />
        </ProvedorDadosEscola>
      </ProvedorSessao>
    </StrictMode>,
  );
}
