//////////////////////////////
// Dados da escola (atrasos e alunos) compartilhados com todas as telas.
// Só carrega com sessão e limpa tudo ao sair. Recarrega em silêncio ao
// voltar para a aba e a cada 45 min, para renovar as fotos e trazer
// registros de outros computadores; também cuida da fila de envio.
//////////////////////////////

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { RepositorioAlunos } from '../../servicos/repositorioAlunos';
import { ErroRepositorio, type RepositorioAtrasos } from '../../servicos/repositorioAtrasos';
import {
  ehRepositorioSincronizado,
  INTERVALO_REENVIO_MS,
} from '../../servicos/offline/repositorioSincronizado';
import { useSessao } from '../ContextoSessao/ContextoSessao';
import type { AlteracoesAluno, Aluno, NovoAluno } from '../../tipos/Aluno';
import type { NovoRegistroAtraso, RegistroAtraso } from '../../tipos/RegistroAtraso';

//////////////////////////////
// Tipos e constantes
//////////////////////////////

interface EstadoDadosEscola {
  registrosAtraso: RegistroAtraso[];
  alunos: Aluno[];
  carregando: boolean;
  erroCarregamento: string | null;
}

type AcaoDadosEscola =
  | { tipo: 'iniciar-carregamento' }
  | { tipo: 'carregar-registros'; registrosAtraso: RegistroAtraso[]; alunos: Aluno[] }
  | { tipo: 'falhar-carregamento'; mensagem: string }
  | { tipo: 'limpar' }
  | { tipo: 'adicionar-registro-atraso'; registroAtraso: RegistroAtraso }
  | { tipo: 'atualizar-registro-atraso'; registroAtraso: RegistroAtraso }
  | { tipo: 'salvar-aluno'; aluno: Aluno };

interface ValorContextoDadosEscola extends EstadoDadosEscola {
  adicionarRegistroAtraso: (
    registroAtraso: NovoRegistroAtraso,
    alunoNovo?: NovoAluno | null,
  ) => Promise<RegistroAtraso>;
  anularRegistroAtraso: (id: string, justificativa: string) => Promise<RegistroAtraso>;
  criarAluno: (novo: NovoAluno, fotoNova?: string | null) => Promise<Aluno>;
  atualizarAluno: (
    id: string,
    alteracoes: AlteracoesAluno,
    fotoNova?: string | null,
  ) => Promise<Aluno>;
  recarregarRegistros: () => Promise<void>;
  salvandoRegistro: boolean;
  sincronizarAgora: () => Promise<void>;
  reenviarRegistro: (id: string) => Promise<void>;
  descartarRegistro: (id: string) => Promise<void>;
}

const INTERVALO_RECARGA_MS = 45 * 60 * 1000;

const ESTADO_INICIAL: EstadoDadosEscola = {
  registrosAtraso: [],
  alunos: [],
  carregando: true,
  erroCarregamento: null,
};

const ContextoDadosEscola = createContext<ValorContextoDadosEscola | null>(null);

//////////////////////////////
// Redutor
//////////////////////////////

function redutorDadosEscola(estado: EstadoDadosEscola, acao: AcaoDadosEscola): EstadoDadosEscola {
  switch (acao.tipo) {
    case 'iniciar-carregamento':
      return { ...estado, carregando: true, erroCarregamento: null };
    case 'carregar-registros':
      return {
        ...estado,
        registrosAtraso: acao.registrosAtraso,
        alunos: acao.alunos,
        carregando: false,
        erroCarregamento: null,
      };
    case 'falhar-carregamento':
      return { ...estado, carregando: false, erroCarregamento: acao.mensagem };
    case 'limpar':
      return ESTADO_INICIAL;
    case 'adicionar-registro-atraso':
      return {
        ...estado,
        registrosAtraso: [...estado.registrosAtraso, acao.registroAtraso],
      };
    case 'atualizar-registro-atraso':
      return {
        ...estado,
        registrosAtraso: estado.registrosAtraso.map((registro) =>
          registro.id === acao.registroAtraso.id ? acao.registroAtraso : registro,
        ),
      };
    case 'salvar-aluno':
      return {
        ...estado,
        alunos: estado.alunos.some((aluno) => aluno.id === acao.aluno.id)
          ? estado.alunos.map((aluno) => (aluno.id === acao.aluno.id ? acao.aluno : aluno))
          : [...estado.alunos, acao.aluno],
      };
  }
}

//////////////////////////////
// Provedor
//////////////////////////////

interface PropriedadesProvedorDadosEscola {
  children: ReactNode;
  repositorio: RepositorioAtrasos;
  repositorioAlunos: RepositorioAlunos;
}

export function ProvedorDadosEscola({
  children,
  repositorio,
  repositorioAlunos,
}: PropriedadesProvedorDadosEscola) {
  const { usuario } = useSessao();
  const [salvamentos, definirSalvamentos] = useState(0);
  const [estado, enviarAcao] = useReducer(redutorDadosEscola, ESTADO_INICIAL);

  const geracaoCarga = useRef(0);
  const sincronizado = ehRepositorioSincronizado(repositorio) ? repositorio : null;

  const carregarTudo = useCallback(
    () =>
      Promise.all([
        repositorio.listar(),
        sincronizado ? sincronizado.listarAlunos() : repositorioAlunos.listar(),
      ]),
    [repositorio, sincronizado, repositorioAlunos],
  );

  const escritas = useRef(0);
  const carregarAtualizado = useCallback(async () => {
    for (;;) {
      const inicio = escritas.current;
      const resultado = await carregarTudo();
      if (inicio === escritas.current) return resultado;
    }
  }, [carregarTudo]);

  const recarregarRegistros = useCallback(async () => {
    const geracao = ++geracaoCarga.current;
    enviarAcao({ tipo: 'iniciar-carregamento' });
    try {
      const [registrosAtraso, alunos] = await carregarAtualizado();
      if (geracao === geracaoCarga.current)
        enviarAcao({ tipo: 'carregar-registros', registrosAtraso, alunos });
    } catch (erro) {
      if (geracao === geracaoCarga.current)
        enviarAcao({
          tipo: 'falhar-carregamento',
          mensagem:
            erro instanceof ErroRepositorio && erro.tipo === 'rede'
              ? 'Sem conexão com o servidor. Registros novos continuam sendo guardados neste computador.'
              : 'Não foi possível carregar os registros. Tente novamente.',
        });
    }
  }, [carregarAtualizado]);

  const atualizarEmSilencio = useCallback(async () => {
    const geracao = geracaoCarga.current;
    try {
      const [registrosAtraso, alunos] = await carregarAtualizado();
      if (geracao === geracaoCarga.current)
        enviarAcao({ tipo: 'carregar-registros', registrosAtraso, alunos });
    } catch {}
  }, [carregarAtualizado]);

  useEffect(() => {
    if (!usuario) return;
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === 'visible') void atualizarEmSilencio();
    };
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    const intervalo = setInterval(() => void atualizarEmSilencio(), INTERVALO_RECARGA_MS);
    return () => {
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
      clearInterval(intervalo);
    };
  }, [usuario, atualizarEmSilencio]);

  useEffect(() => {
    if (!usuario || !sincronizado) return;
    const sincronizar = () => void sincronizado.sincronizar();
    const cancelar = sincronizado.aoMudar(() => void atualizarEmSilencio());
    sincronizar();
    window.addEventListener('online', sincronizar);
    const intervalo = setInterval(sincronizar, INTERVALO_REENVIO_MS);
    return () => {
      cancelar();
      window.removeEventListener('online', sincronizar);
      clearInterval(intervalo);
    };
  }, [usuario, sincronizado, atualizarEmSilencio]);

  useEffect(() => {
    if (usuario) void recarregarRegistros();
    else {
      geracaoCarga.current++;
      enviarAcao({ tipo: 'limpar' });
    }
  }, [usuario, recarregarRegistros]);

  const adicionarRegistroAtraso = async (
    novo: NovoRegistroAtraso,
    alunoNovo: NovoAluno | null = null,
  ) => {
    let registroAtraso: RegistroAtraso;
    definirSalvamentos((atual) => atual + 1);
    try {
      if (sincronizado) {
        registroAtraso = await sincronizado.salvarComAluno(novo, alunoNovo);
      } else {
        if (alunoNovo) await repositorioAlunos.criar(alunoNovo);
        registroAtraso = await repositorio.salvar(novo);
      }
    } finally {
      definirSalvamentos((atual) => atual - 1);
    }
    escritas.current++;
    if (alunoNovo)
      enviarAcao({
        tipo: 'salvar-aluno',
        aluno: { ...alunoNovo, foto: null, envio: registroAtraso.envio },
      });
    enviarAcao({ tipo: 'adicionar-registro-atraso', registroAtraso });
    return registroAtraso;
  };

  const anularRegistroAtraso = async (id: string, justificativa: string) => {
    const registroAtraso = await repositorio.anular(id, justificativa, usuario ?? '');
    escritas.current++;
    enviarAcao({ tipo: 'atualizar-registro-atraso', registroAtraso });
    return registroAtraso;
  };

  const criarAluno = async (novo: NovoAluno, fotoNova: string | null = null) => {
    const aluno = await repositorioAlunos.criar(novo, fotoNova);
    escritas.current++;
    enviarAcao({ tipo: 'salvar-aluno', aluno });
    return aluno;
  };

  const atualizarAluno = async (
    id: string,
    alteracoes: AlteracoesAluno,
    fotoNova: string | null = null,
  ) => {
    const aluno = await repositorioAlunos.atualizar(id, alteracoes, fotoNova);
    escritas.current++;
    enviarAcao({ tipo: 'salvar-aluno', aluno });
    return aluno;
  };

  const sincronizarAgora = async () => {
    await sincronizado?.sincronizar();
  };
  const reenviarRegistro = async (id: string) => {
    await sincronizado?.reenviar(id);
  };
  const descartarRegistro = async (id: string) => {
    await sincronizado?.descartar(id);
  };

  return (
    <ContextoDadosEscola.Provider
      value={{
        ...estado,
        adicionarRegistroAtraso,
        anularRegistroAtraso,
        criarAluno,
        atualizarAluno,
        recarregarRegistros,
        salvandoRegistro: salvamentos > 0,
        sincronizarAgora,
        reenviarRegistro,
        descartarRegistro,
      }}
    >
      {children}
    </ContextoDadosEscola.Provider>
  );
}

//////////////////////////////
// Hook de acesso
//////////////////////////////

export function useDadosEscola() {
  const contexto = useContext(ContextoDadosEscola);
  if (!contexto) throw new Error('useDadosEscola deve ser usado dentro de ProvedorDadosEscola.');
  return contexto;
}
