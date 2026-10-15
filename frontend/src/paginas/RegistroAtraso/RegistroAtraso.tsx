//////////////////////////////
// Tela da portaria para registrar um atraso: aluno, motivo e foto.
// Ao salvar, a tela confere os campos, avisa se há aluno parecido ou atraso
// do mesmo aluno hoje, pede o motivo se faltar foto e mostra a confirmação.
// Sem aluno escolhido na busca, um aluno novo é cadastrado junto com o atraso,
// e os dois vão para a fila de envio se faltar internet.
// Depois de salvar, "Desfazer" fica disponível por 10 segundos e anula o registro.
//////////////////////////////

import { AlertTriangle, CheckCircle2, LogOut, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { Alerta } from '../../componentes/Alerta/Alerta';
import { AreaTexto } from '../../componentes/AreaTexto/AreaTexto';
import { Botao } from '../../componentes/Botao/Botao';
import { Entrada } from '../../componentes/Entrada/Entrada';
import { CapturaCamera, type EstadoCamera } from '../../componentes/CapturaCamera/CapturaCamera';
import { FotoAluno } from '../../componentes/FotoAluno/FotoAluno';
import { Modal } from '../../componentes/Modal/Modal';
import { Painel } from '../../componentes/Painel/Painel';
import { Selo } from '../../componentes/Selo/Selo';
import { useDadosEscola } from '../../contextos/ContextoDadosEscola/ContextoDadosEscola';
import { useSessao } from '../../contextos/ContextoSessao/ContextoSessao';
import {
  criarAlunoDoFormulario,
  encontrarAlunosParecidos,
  fotoDeIdentificacao,
  listarValoresConhecidos,
} from '../../regras/regrasAlunos';
import type { Aluno } from '../../tipos/Aluno';
import { ModalAluno } from '../Alunos/ModalAluno';
import { BuscaAluno } from './BuscaAluno';
import {
  ModalAlunosParecidos,
  ModalConfirmacaoRegistro,
  ModalSemFoto,
} from './ModaisRegistroAtraso';
import { mensagemDeErro } from '../../servicos/repositorioAtrasos';
import {
  aplicarAlteracaoNome,
  contarAtrasosNoAno,
  criarRegistroAtraso,
  encontrarRegistroMesmoDia,
  encontrarUltimoRegistroDe,
  type ErrosCampos,
  formatarHora,
  formularioPreenchido,
  limparEspacos,
  normalizarTexto,
  obterAnoLetivo,
  type OpcaoMotivoSemFoto,
  primeiroCampoComErro,
  removerSugestao,
  resolverMotivoSemFoto,
  validarCampos,
  type ValoresSugeridos,
} from '../../regras/regrasRegistroAtraso';
import type {
  FormularioRegistroAtraso,
  RegistroAtraso as Registro,
} from '../../tipos/RegistroAtraso';

//////////////////////////////
// Constantes do formulário
//////////////////////////////

type Etapa = 'formulario' | 'parecido' | 'duplicado' | 'semFoto' | 'confirmacao' | 'limpar';

const formularioVazio: FormularioRegistroAtraso = {
  nomeAluno: '',
  curso: '',
  serieModulo: '',
  turma: '',
  sala: '',
  periodo: '',
  motivo: '',
};

const idsCampos: Record<keyof FormularioRegistroAtraso, string> = {
  nomeAluno: 'nome-aluno',
  curso: 'curso',
  periodo: 'periodo',
  serieModulo: 'serie-modulo',
  turma: 'turma',
  sala: 'sala',
  motivo: 'motivo',
};

const CAMPOS_TURMA = [
  { campo: 'curso', rotulo: 'Curso *', exemplo: 'Ex.: Desenvolvimento de Sistemas' },
  { campo: 'periodo', rotulo: 'Período *', exemplo: 'Ex.: Manhã' },
  { campo: 'serieModulo', rotulo: 'Série *', exemplo: 'Ex.: 1º' },
  { campo: 'turma', rotulo: 'Turma *', exemplo: 'Ex.: A' },
  { campo: 'sala', rotulo: 'Sala *', exemplo: 'Ex.: Sala 12' },
] as const;

//////////////////////////////
// Página Registrar atraso
//////////////////////////////

export function RegistroAtraso() {
  const { registrosAtraso, alunos, adicionarRegistroAtraso, anularRegistroAtraso } =
    useDadosEscola();
  const { usuario } = useSessao();
  const [alunoSelecionado, definirAlunoSelecionado] = useState<Aluno | null>(null);
  const [parecidos, definirParecidos] = useState<Aluno[]>([]);
  const [corrigindoAluno, definirCorrigindoAluno] = useState(false);
  const referenciaParecidoRecusado = useRef<string | null>(null);
  const [formulario, definirFormulario] = useState(formularioVazio);
  const [erros, definirErros] = useState<ErrosCampos>({});
  const [foto, definirFoto] = useState<string | null>(null);
  const [nomeNaFoto, definirNomeNaFoto] = useState('');
  const [estadoCamera, definirEstadoCamera] = useState<EstadoCamera>('desligada');
  const [chaveCamera, definirChaveCamera] = useState(0);
  const [pedidoAtivacao, definirPedidoAtivacao] = useState(0);
  const [sucesso, definirSucesso] = useState<{ texto: string; pendente: boolean } | null>(null);
  const [registroDesfazivel, definirRegistroDesfazivel] = useState<Registro | null>(null);
  const [desfazendo, definirDesfazendo] = useState(false);
  const [erroDesfazer, definirErroDesfazer] = useState('');
  const [erroSalvamento, definirErroSalvamento] = useState('');
  const [salvando, definirSalvando] = useState(false);
  const [sugeridos, definirSugeridos] = useState<ValoresSugeridos>({});
  const [etapa, definirEtapa] = useState<Etapa>('formulario');
  const [registroDuplicado, definirRegistroDuplicado] = useState<Registro | null>(null);
  const [opcaoSemFoto, definirOpcaoSemFoto] = useState<OpcaoMotivoSemFoto | ''>('');
  const [detalheSemFoto, definirDetalheSemFoto] = useState('');
  const referenciaSalvando = useRef(false);
  const referenciaDuplicadoAceito = useRef<string | null>(null);
  const referenciaTimerDesfazer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const anoAtual = obterAnoLetivo(new Date());
  const valoresConhecidos = useMemo(
    () => listarValoresConhecidos(alunos, registrosAtraso),
    [alunos, registrosAtraso],
  );
  const anterior = encontrarUltimoRegistroDe(registrosAtraso, formulario.nomeAluno);
  const fotoAlunoSelecionado = alunoSelecionado
    ? fotoDeIdentificacao(alunoSelecionado, registrosAtraso)
    : null;
  const idContado = alunoSelecionado?.id ?? anterior?.alunoId;
  const atrasosNoAno = useMemo(
    () => contarAtrasosNoAno(registrosAtraso, anoAtual),
    [registrosAtraso, anoAtual],
  );
  const quantidadeAno = idContado ? (atrasosNoAno.get(idContado) ?? 0) : 0;
  const contadorAtrasos =
    quantidadeAno >= 2 ? (
      <Selo tom="alerta">
        <AlertTriangle size={12} />
        {quantidadeAno} atrasos em {anoAtual}
      </Selo>
    ) : (
      <span className="text-sm text-texto-suave">
        {quantidadeAno} {quantidadeAno === 1 ? 'atraso' : 'atrasos'} em {anoAtual}
      </span>
    );
  const motivoSemFoto = resolverMotivoSemFoto(opcaoSemFoto, detalheSemFoto);
  const preenchido = formularioPreenchido(formulario, foto);
  const fotoDeOutroNome =
    Boolean(foto && nomeNaFoto) && !normalizarTexto(formulario.nomeAluno).startsWith(nomeNaFoto);

  const bloqueador = useBlocker(
    ({ currentLocation, nextLocation }) =>
      preenchido && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!preenchido) return;
    const avisarSaida = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
      evento.returnValue = '';
    };
    window.addEventListener('beforeunload', avisarSaida);
    return () => window.removeEventListener('beforeunload', avisarSaida);
  }, [preenchido]);

  useEffect(
    () => () => {
      if (referenciaTimerDesfazer.current) clearTimeout(referenciaTimerDesfazer.current);
    },
    [],
  );

  const limparDesfazer = () => {
    if (referenciaTimerDesfazer.current) clearTimeout(referenciaTimerDesfazer.current);
    referenciaTimerDesfazer.current = null;
    definirRegistroDesfazivel(null);
    definirDesfazendo(false);
    definirErroDesfazer('');
  };

  const atualizar = (campo: keyof FormularioRegistroAtraso, valor: string) => {
    definirSucesso(null);
    definirErroSalvamento('');
    definirErros((atuais) => {
      const restantes = { ...atuais };
      delete restantes[campo];
      return restantes;
    });
    if (campo !== 'nomeAluno') {
      definirFormulario((atual) => ({ ...atual, [campo]: valor }));
      definirSugeridos((atuais) => removerSugestao(atuais, campo));
      return;
    }
    const resultado = aplicarAlteracaoNome(formulario, sugeridos, registrosAtraso, valor);
    definirFormulario(resultado.formulario);
    definirSugeridos(resultado.sugeridos);
  };

  const preencherComAluno = (aluno: Aluno) =>
    definirFormulario((atual) => ({
      ...atual,
      nomeAluno: aluno.nome,
      curso: aluno.curso,
      periodo: aluno.periodo,
      serieModulo: aluno.serieModulo,
      turma: aluno.turma,
      sala: aluno.sala,
    }));

  const escolherAluno = (aluno: Aluno) => {
    definirAlunoSelecionado(aluno);
    preencherComAluno(aluno);
    definirSugeridos({});
    definirErros({});
    definirSucesso(null);
  };

  const trocarAluno = () => {
    definirAlunoSelecionado(null);
    definirFormulario((atual) => ({ ...formularioVazio, motivo: atual.motivo }));
    definirSugeridos({});
    setTimeout(() => document.getElementById(idsCampos.nomeAluno)?.focus());
  };

  const limparTudo = () => {
    definirAlunoSelecionado(null);
    definirParecidos([]);
    referenciaParecidoRecusado.current = null;
    definirFormulario(formularioVazio);
    definirErros({});
    definirSugeridos({});
    definirFoto(null);
    definirNomeNaFoto('');
    definirEstadoCamera('desligada');
    definirPedidoAtivacao(0);
    definirOpcaoSemFoto('');
    definirDetalheSemFoto('');
    definirRegistroDuplicado(null);
    referenciaDuplicadoAceito.current = null;
    definirChaveCamera((chave) => chave + 1);
  };

  const seguirParaFoto = () => {
    if (foto) {
      definirEtapa('confirmacao');
      return;
    }
    definirOpcaoSemFoto('');
    definirDetalheSemFoto('');
    definirEtapa('semFoto');
  };

  const receberFoto = (valor: string | null) => {
    definirFoto(valor);
    definirNomeNaFoto(valor ? normalizarTexto(formulario.nomeAluno) : '');
  };

  const iniciarRegistro = (evento: FormEvent) => {
    evento.preventDefault();
    referenciaSalvando.current = false;
    definirSucesso(null);
    limparDesfazer();
    definirErroSalvamento('');
    const errosAtuais = validarCampos(formulario);
    definirErros(errosAtuais);
    const primeiroErro = primeiroCampoComErro(errosAtuais);
    if (primeiroErro) {
      document.getElementById(idsCampos[primeiroErro])?.focus();
      return;
    }
    if (!alunoSelecionado) {
      const nomePadronizado = normalizarTexto(formulario.nomeAluno);
      const semelhantes = encontrarAlunosParecidos(
        alunos.filter((aluno) => aluno.ativo),
        formulario.nomeAluno,
      ).slice(0, 3);
      if (semelhantes.length && referenciaParecidoRecusado.current !== nomePadronizado) {
        definirParecidos(semelhantes);
        definirEtapa('parecido');
        return;
      }
    }
    continuarRegistro(alunoSelecionado?.id ?? null, formulario.nomeAluno);
  };

  const continuarRegistro = (alunoId: string | null, nomeAluno: string) => {
    const duplicado = encontrarRegistroMesmoDia(registrosAtraso, alunoId, nomeAluno, new Date());
    if (duplicado && duplicado.id !== referenciaDuplicadoAceito.current) {
      definirRegistroDuplicado(duplicado);
      definirEtapa('duplicado');
      return;
    }
    seguirParaFoto();
  };

  const usarAlunoParecido = (aluno: Aluno) => {
    escolherAluno(aluno);
    continuarRegistro(aluno.id, aluno.nome);
  };

  const cadastrarOutroAluno = () => {
    referenciaParecidoRecusado.current = normalizarTexto(formulario.nomeAluno);
    continuarRegistro(null, formulario.nomeAluno);
  };

  const tirarFoto = () => {
    definirEtapa('formulario');
    definirPedidoAtivacao((pedido) => pedido + 1);
  };

  const confirmarRegistro = async () => {
    if (referenciaSalvando.current) return;
    referenciaSalvando.current = true;
    definirSalvando(true);
    definirErroSalvamento('');
    const agora = new Date();
    try {
      const registro = criarRegistroAtraso(
        formulario,
        foto,
        motivoSemFoto,
        usuario ?? '',
        agora,
        alunoSelecionado?.id ?? crypto.randomUUID(),
      );
      const alunoNovo = alunoSelecionado ? null : criarAlunoDoFormulario(formulario, registro);
      const registroSalvo = await adicionarRegistroAtraso(registro, alunoNovo);
      const nome = limparEspacos(formulario.nomeAluno);
      definirSucesso(
        registroSalvo.envio === 'pendente'
          ? {
              texto: `Sem internet: atraso de ${nome} guardado neste computador às ${formatarHora(agora)}. Será enviado automaticamente.`,
              pendente: true,
            }
          : { texto: `Atraso de ${nome} registrado às ${formatarHora(agora)}.`, pendente: false },
      );
      limparTudo();
      definirRegistroDesfazivel(registroSalvo);
      referenciaTimerDesfazer.current = setTimeout(() => {
        definirRegistroDesfazivel(null);
        referenciaTimerDesfazer.current = null;
      }, 10_000);
      definirEtapa('formulario');
    } catch (erro) {
      definirErroSalvamento(
        mensagemDeErro(erro, 'Não foi possível salvar o registro. Tente novamente.'),
      );
    } finally {
      referenciaSalvando.current = false;
      definirSalvando(false);
    }
  };

  const desfazerRegistro = async () => {
    if (!registroDesfazivel || desfazendo) return;
    definirDesfazendo(true);
    definirErroDesfazer('');
    try {
      await anularRegistroAtraso(
        registroDesfazivel.id,
        'Desfeito pela portaria logo após o registro.',
      );
      limparDesfazer();
      definirSucesso({ texto: 'Registro desfeito.', pendente: false });
    } catch (erro) {
      definirErroDesfazer(
        mensagemDeErro(erro, 'Não foi possível desfazer o registro. Tente novamente.'),
      );
      definirDesfazendo(false);
    }
  };

  const pedirLimpeza = () => {
    definirSucesso(null);
    if (preenchido) definirEtapa('limpar');
    else limparTudo();
  };

  const voltarAoFormulario = () => definirEtapa('formulario');
  const quantidadeComEste = quantidadeAno + 1;
  const itensResumo = [
    { rotulo: 'Nome', valor: limparEspacos(formulario.nomeAluno) },
    { rotulo: 'Curso', valor: limparEspacos(formulario.curso) },
    {
      rotulo: 'Turma',
      valor: `${limparEspacos(formulario.serieModulo)} ${limparEspacos(formulario.turma)}`,
    },
    { rotulo: 'Sala', valor: limparEspacos(formulario.sala) },
    { rotulo: 'Período', valor: limparEspacos(formulario.periodo) },
    { rotulo: 'Motivo', valor: formulario.motivo.trim(), completo: true },
    ...(foto ? [] : [{ rotulo: 'Foto', valor: `Sem foto — ${motivoSemFoto}`, completo: true }]),
  ];

  return (
    <section className="mx-auto max-w-[1240px]">
      <div className="mb-6">
        <h2 className="m-0 text-2xl font-semibold text-texto">Registrar atraso</h2>
        <p className="m-0 mt-1 text-sm text-texto-suave">
          Tire a foto, preencha os dados informados pelo aluno e salve.
        </p>
      </div>
      {sucesso && (
        <div className="mb-4">
          <Alerta
            tom={sucesso.pendente ? 'alerta' : 'sucesso'}
            acoes={
              registroDesfazivel && (
                <Botao
                  variante="fantasma"
                  onClick={() => void desfazerRegistro()}
                  disabled={desfazendo}
                >
                  {desfazendo ? 'Desfazendo...' : 'Desfazer'}
                </Botao>
              )
            }
          >
            {sucesso.texto}
            {registroDesfazivel && (
              <span className="hidden text-texto-suave motion-reduce:inline">
                {' '}
                Disponível por 10 segundos.
              </span>
            )}
          </Alerta>
          {registroDesfazivel && (
            <div
              key={registroDesfazivel.id}
              aria-hidden="true"
              className={`mt-1 h-1 rounded-full ${sucesso.pendente ? 'bg-alerta' : 'bg-sucesso'} motion-safe:animate-esvaziar motion-reduce:hidden`}
            />
          )}
        </div>
      )}
      {erroDesfazer && (
        <Alerta tom="erro" className="mb-4">
          {erroDesfazer}
        </Alerta>
      )}
      <form
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start"
        onSubmit={iniciarRegistro}
        noValidate
      >
        <Painel
          titulo="Dados do aluno"
          descricao="Digite o nome e escolha o aluno na lista. Se ele ainda não tiver cadastro, preencha os campos abaixo."
        >
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {alunoSelecionado ? (
              <section
                aria-label="Aluno selecionado"
                className="flex flex-wrap items-center gap-4 rounded-controle border border-borda bg-fundo p-4 sm:col-span-2"
              >
                {fotoAlunoSelecionado && (
                  <FotoAluno
                    origem={fotoAlunoSelecionado}
                    alt={`Foto de ${alunoSelecionado.nome}`}
                    classe="size-16 rounded-controle border border-borda"
                    tamanhoIcone={28}
                  />
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <strong className="text-base font-semibold text-texto">
                    {alunoSelecionado.nome}
                  </strong>
                  <span className="text-sm text-texto-suave">
                    {alunoSelecionado.curso} · {alunoSelecionado.serieModulo}{' '}
                    {alunoSelecionado.turma} · {alunoSelecionado.sala} · {alunoSelecionado.periodo}
                  </span>
                  {contadorAtrasos}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Botao variante="fantasma" onClick={() => definirCorrigindoAluno(true)}>
                    Corrigir dados do aluno
                  </Botao>
                  <Botao variante="fantasma" onClick={trocarAluno}>
                    Trocar aluno
                  </Botao>
                </div>
              </section>
            ) : (
              <>
                <div className="sm:col-span-2">
                  <BuscaAluno
                    id={idsCampos.nomeAluno}
                    valor={formulario.nomeAluno}
                    erro={erros.nomeAluno}
                    complemento={anterior && contadorAtrasos}
                    alunos={alunos}
                    registrosAtraso={registrosAtraso}
                    anoAtual={anoAtual}
                    aoMudar={(texto) => atualizar('nomeAluno', texto)}
                    aoEscolher={escolherAluno}
                  />
                </div>
                {CAMPOS_TURMA.map(({ campo, rotulo, exemplo }) => (
                  <Entrada
                    key={campo}
                    id={idsCampos[campo]}
                    tamanho="toque"
                    rotulo={rotulo}
                    erro={erros[campo]}
                    value={formulario[campo]}
                    onChange={(evento) => atualizar(campo, evento.target.value)}
                    maxLength={60}
                    placeholder={exemplo}
                    sugestoes={valoresConhecidos[campo]}
                  />
                ))}
              </>
            )}
            <div className="sm:col-span-2">
              <AreaTexto
                id={idsCampos.motivo}
                tamanho="toque"
                rotulo="Motivo do atraso *"
                erro={erros.motivo}
                value={formulario.motivo}
                onChange={(evento) => atualizar('motivo', evento.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Descreva o motivo informado pelo aluno"
              />
            </div>
          </div>
          <div className="sticky bottom-0 z-10 flex justify-end gap-3 rounded-b-cartao border-t border-borda bg-superficie px-5 py-4 lg:static">
            <Botao variante="fantasma" tamanho="toque" onClick={pedirLimpeza}>
              Limpar
            </Botao>
            <Botao type="submit" tamanho="toque">
              <CheckCircle2 size={18} />
              Registrar atraso
            </Botao>
          </div>
        </Painel>
        <Painel
          titulo="Foto do aluno"
          descricao="Se não for possível tirar a foto, o motivo será solicitado."
          className="order-first lg:order-none"
        >
          <CapturaCamera
            key={chaveCamera}
            aoCapturar={receberFoto}
            aoMudarEstado={definirEstadoCamera}
            pedidoAtivacao={pedidoAtivacao}
          />
        </Painel>
      </form>

      <ModalAlunosParecidos
        aberto={etapa === 'parecido'}
        alunos={parecidos}
        aoVoltar={voltarAoFormulario}
        aoCadastrarOutro={cadastrarOutroAluno}
        aoEscolher={usarAlunoParecido}
      />

      <ModalAluno
        aberto={corrigindoAluno}
        aluno={alunoSelecionado}
        aoFechar={() => definirCorrigindoAluno(false)}
        aoSalvar={escolherAluno}
      />

      <Modal
        aberto={etapa === 'duplicado'}
        tom="alerta"
        titulo="Aluno já registrado hoje"
        descricao={
          registroDuplicado && (
            <p>
              {registroDuplicado.exibicao.nomeAluno} já teve um atraso registrado hoje às{' '}
              <strong>{formatarHora(registroDuplicado.registradoEm)}</strong> (motivo:{' '}
              {registroDuplicado.motivo}). Deseja registrar outro atraso?
            </p>
          )
        }
        aoFechar={() => {
          if (!salvando) voltarAoFormulario();
        }}
        acoes={
          <>
            <Botao variante="fantasma" onClick={voltarAoFormulario}>
              Cancelar
            </Botao>
            <Botao
              autoFocus
              onClick={() => {
                referenciaDuplicadoAceito.current = registroDuplicado?.id ?? null;
                seguirParaFoto();
              }}
            >
              Registrar mesmo assim
            </Botao>
          </>
        }
      />

      <ModalSemFoto
        aberto={etapa === 'semFoto'}
        cameraAberta={estadoCamera === 'aberta'}
        opcao={opcaoSemFoto}
        detalhe={detalheSemFoto}
        motivoResolvido={motivoSemFoto}
        aoVoltar={voltarAoFormulario}
        aoTirarFoto={tirarFoto}
        aoEscolherOpcao={definirOpcaoSemFoto}
        aoMudarDetalhe={definirDetalheSemFoto}
        aoContinuar={() => definirEtapa('confirmacao')}
      />

      <ModalConfirmacaoRegistro
        aberto={etapa === 'confirmacao'}
        salvando={salvando}
        foto={foto}
        itens={itensResumo}
        fotoDeOutroNome={fotoDeOutroNome}
        quantidadeComEste={quantidadeComEste}
        anoAtual={anoAtual}
        erro={erroSalvamento}
        aoVoltar={voltarAoFormulario}
        aoConfirmar={() => void confirmarRegistro()}
      />

      <Modal
        aberto={etapa === 'limpar'}
        tom="alerta"
        titulo="Limpar formulário?"
        descricao={<p>Os dados preenchidos e a foto serão descartados.</p>}
        aoFechar={voltarAoFormulario}
        acoes={
          <>
            <Botao autoFocus variante="fantasma" onClick={voltarAoFormulario}>
              Continuar editando
            </Botao>
            <Botao
              variante="perigo"
              onClick={() => {
                limparTudo();
                definirEtapa('formulario');
              }}
            >
              <Trash2 size={16} />
              Limpar dados
            </Botao>
          </>
        }
      />

      <Modal
        aberto={bloqueador.state === 'blocked'}
        tom="alerta"
        titulo="Sair sem registrar?"
        descricao={<p>O formulário tem dados preenchidos que ainda não foram registrados.</p>}
        aoFechar={() => bloqueador.reset?.()}
        acoes={
          <>
            <Botao autoFocus variante="fantasma" onClick={() => bloqueador.reset?.()}>
              Continuar editando
            </Botao>
            <Botao variante="perigo" onClick={() => bloqueador.proceed?.()}>
              <LogOut size={16} />
              Sair e descartar
            </Botao>
          </>
        }
      />
    </section>
  );
}
