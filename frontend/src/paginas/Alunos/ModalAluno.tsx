//////////////////////////////
// Modal de cadastro e edição de aluno.
// Abre vazio para um aluno novo ou preenchido para editar um existente.
// Salvar exige internet; um id novo é gerado a cada abertura para que
// tentar de novo depois de uma falha não crie o aluno repetido.
//////////////////////////////

import { Camera, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Alerta } from '../../componentes/Alerta/Alerta';
import { Botao } from '../../componentes/Botao/Botao';
import { CapturaCamera } from '../../componentes/CapturaCamera/CapturaCamera';
import { FotoAluno } from '../../componentes/FotoAluno/FotoAluno';
import { Entrada } from '../../componentes/Entrada/Entrada';
import { Modal } from '../../componentes/Modal/Modal';
import { useDadosEscola } from '../../contextos/ContextoDadosEscola/ContextoDadosEscola';
import {
  listarValoresConhecidos,
  limparDadosAluno,
  ORDEM_CAMPOS_ALUNO,
  validarAluno,
  type DadosAluno,
  type ErrosAluno,
} from '../../regras/regrasAlunos';
import { normalizarTexto } from '../../regras/regrasRegistroAtraso';
import { mensagemDeErro } from '../../servicos/repositorioAtrasos';
import type { Aluno } from '../../tipos/Aluno';

//////////////////////////////
// Campos do formulário
//////////////////////////////

const rotulos: Record<keyof DadosAluno, string> = {
  nome: 'Nome completo',
  curso: 'Curso',
  periodo: 'Período',
  serieModulo: 'Série',
  turma: 'Turma',
  sala: 'Sala',
};

const dadosDe = (aluno: Aluno | null): DadosAluno => ({
  nome: aluno?.nome ?? '',
  curso: aluno?.curso ?? '',
  periodo: aluno?.periodo ?? '',
  serieModulo: aluno?.serieModulo ?? '',
  turma: aluno?.turma ?? '',
  sala: aluno?.sala ?? '',
});

//////////////////////////////
// Componente do modal
//////////////////////////////

interface PropriedadesModalAluno {
  aberto: boolean;
  aluno: Aluno | null;
  aoFechar: () => void;
  aoSalvar?: (aluno: Aluno) => void;
}

export function ModalAluno({ aberto, aluno, aoFechar, aoSalvar }: PropriedadesModalAluno) {
  const { alunos, registrosAtraso, criarAluno, atualizarAluno } = useDadosEscola();
  const valoresConhecidos = useMemo(
    () => listarValoresConhecidos(alunos, registrosAtraso),
    [alunos, registrosAtraso],
  );
  const [dados, definirDados] = useState(() => dadosDe(aluno));
  const [erros, definirErros] = useState<ErrosAluno>({});
  const [erroSalvamento, definirErroSalvamento] = useState('');
  const [salvando, definirSalvando] = useState(false);
  const [alunoAtual, definirAlunoAtual] = useState(aluno);
  const [abertoAtual, definirAbertoAtual] = useState(aberto);
  const [idNovo, definirIdNovo] = useState(() => crypto.randomUUID());
  const [fotoNova, definirFotoNova] = useState<string | null>(null);
  const [usandoCamera, definirUsandoCamera] = useState(false);

  if (alunoAtual !== aluno || abertoAtual !== aberto) {
    definirAlunoAtual(aluno);
    definirAbertoAtual(aberto);
    if (aberto) {
      definirDados(dadosDe(aluno));
      definirErros({});
      definirErroSalvamento('');
      definirIdNovo(crypto.randomUUID());
      definirFotoNova(null);
      definirUsandoCamera(false);
    }
  }

  const salvar = async () => {
    const errosAtuais = validarAluno(dados);
    definirErros(errosAtuais);
    if (Object.keys(errosAtuais).length) return;
    const limpos = limparDadosAluno(dados);
    definirSalvando(true);
    definirErroSalvamento('');
    try {
      const salvo = aluno
        ? await atualizarAluno(aluno.id, limpos, fotoNova)
        : await criarAluno(
            {
              ...limpos,
              id: idNovo,
              nomePadronizado: normalizarTexto(limpos.nome),
              ativo: true,
              fotoCaminho: null,
            },
            fotoNova,
          );
      aoSalvar?.(salvo);
      aoFechar();
    } catch (erro) {
      definirErroSalvamento(mensagemDeErro(erro, 'Não foi possível salvar o aluno.'));
    } finally {
      definirSalvando(false);
    }
  };

  return (
    <Modal
      aberto={aberto}
      titulo={aluno ? 'Editar aluno' : 'Novo aluno'}
      descricao={
        aluno
          ? 'As alterações valem para os próximos atrasos; os já registrados mantêm os dados do dia.'
          : undefined
      }
      aoFechar={() => {
        if (!salvando) aoFechar();
      }}
      acoes={
        <>
          <Botao variante="fantasma" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Botao>
          <Botao onClick={() => void salvar()} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar aluno'}
          </Botao>
        </>
      }
    >
      <div className="mb-4 flex flex-col gap-2">
        <span className="text-sm font-semibold text-texto">Foto (opcional)</span>
        {usandoCamera ? (
          <CapturaCamera aoCapturar={definirFotoNova} />
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            {aluno?.foto ? (
              <FotoAluno
                origem={aluno.foto}
                alt={`Foto de ${aluno.nome}`}
                classe="size-24 rounded-controle border border-borda"
                tamanhoIcone={32}
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex size-24 items-center justify-center rounded-controle border border-dashed border-texto-suave/75 bg-fundo text-texto-suave"
              >
                <UserRound size={32} />
              </span>
            )}
            <Botao variante="secundario" onClick={() => definirUsandoCamera(true)}>
              <Camera size={16} />
              {aluno?.foto ? 'Trocar foto' : 'Tirar foto'}
            </Botao>
          </div>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {ORDEM_CAMPOS_ALUNO.map((campo) => (
          <div key={campo} className={campo === 'nome' ? 'sm:col-span-2' : undefined}>
            <Entrada
              id={`aluno-${campo}`}
              rotulo={rotulos[campo]}
              value={dados[campo]}
              erro={erros[campo]}
              sugestoes={campo === 'nome' ? undefined : valoresConhecidos[campo]}
              onChange={(evento) => {
                const valor = evento.target.value;
                definirDados((atuais) => ({ ...atuais, [campo]: valor }));
                definirErros((atuais) => ({ ...atuais, [campo]: undefined }));
              }}
            />
          </div>
        ))}
      </div>
      {erroSalvamento && (
        <Alerta tom="erro" className="mt-4">
          {erroSalvamento}
        </Alerta>
      )}
    </Modal>
  );
}
