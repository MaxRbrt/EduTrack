//////////////////////////////
// Histórico do aluno: busca de alunos e, com ?aluno=<id> na URL, o perfil
// com todos os atrasos dele.
// O nome mostrado vem do cadastro; o nome gravado no atraso fica de reserva.
// Registros nunca são apagados: anular pede justificativa, o registro continua
// visível como anulado e deixa de contar. Por isso a busca mostra também
// quem só tem atrasos anulados.
//////////////////////////////

import { AlertTriangle, ArrowLeft, Ban, Download, Pencil, Search } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alerta } from '../../componentes/Alerta/Alerta';
import { AreaTexto } from '../../componentes/AreaTexto/AreaTexto';
import { Botao } from '../../componentes/Botao/Botao';
import { CampoBusca } from '../../componentes/CampoBusca/CampoBusca';
import { CartaoEstatistica } from '../../componentes/CartaoEstatistica/CartaoEstatistica';
import { EstadoCarga } from '../../componentes/EstadoCarga/EstadoCarga';
import { EstadoVazio } from '../../componentes/EstadoVazio/EstadoVazio';
import { FotoAluno } from '../../componentes/FotoAluno/FotoAluno';
import { Modal } from '../../componentes/Modal/Modal';
import { Painel } from '../../componentes/Painel/Painel';
import { Selo } from '../../componentes/Selo/Selo';
import { SeloEnvio } from '../../componentes/SeloEnvio/SeloEnvio';
import {
  classeCabecalhoGrupo,
  classeCabecalhoTabela,
  classeCelula,
  classeCelulaCurta,
  classeCelulaInteira,
  classeCorpoTabela,
  classeLinhaTabela,
  classeTabela,
} from '../../componentes/Tabela/classesTabela';
import { useDadosEscola } from '../../contextos/ContextoDadosEscola/ContextoDadosEscola';
import { mensagemDeErro } from '../../servicos/repositorioAtrasos';
import { fotoDeIdentificacao } from '../../regras/regrasAlunos';
import { ModalAluno } from '../Alunos/ModalAluno';
import {
  formatarDataHora,
  formatarTurma,
  LIMITE_REINCIDENCIA,
  obterAnoLetivo,
  obterHistoricoAluno,
  buscarAlunosNoHistorico,
  resolverAlunoDoHistorico,
  validarJustificativaAnulacao,
} from '../../regras/regrasRegistroAtraso';
import type { RegistroAtraso } from '../../tipos/RegistroAtraso';

const classeLinkVoltar =
  'inline-flex cursor-pointer items-center gap-2 rounded-controle border-0 bg-transparent p-0 text-sm font-medium text-primaria hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria';

export function HistoricoAluno() {
  const {
    registrosAtraso,
    alunos: alunosCadastrados,
    carregando,
    erroCarregamento,
    recarregarRegistros,
    anularRegistroAtraso,
  } = useDadosEscola();
  const [editandoAluno, definirEditandoAluno] = useState(false);
  const nomes = new Map(alunosCadastrados.map((aluno) => [aluno.id, aluno.nome]));
  const [parametros, definirParametros] = useSearchParams();
  const [consulta, definirConsulta] = useState('');
  const [registroParaAnular, definirRegistroParaAnular] = useState<RegistroAtraso | null>(null);
  const [justificativaAnulacao, definirJustificativaAnulacao] = useState('');
  const [erroAnulacao, definirErroAnulacao] = useState('');
  const [anulando, definirAnulando] = useState(false);
  const [gerandoPdf, definirGerandoPdf] = useState(false);
  const [erroPdf, definirErroPdf] = useState<string | null>(null);
  const selecionado = parametros.get('aluno');
  const anoAtual = obterAnoLetivo(new Date());

  const fecharAnulacao = () => {
    if (anulando) return;
    definirRegistroParaAnular(null);
    definirJustificativaAnulacao('');
    definirErroAnulacao('');
  };

  const confirmarAnulacao = async () => {
    if (!registroParaAnular) return;
    const erro = validarJustificativaAnulacao(justificativaAnulacao);
    if (erro) {
      definirErroAnulacao(erro);
      return;
    }
    definirAnulando(true);
    try {
      await anularRegistroAtraso(registroParaAnular.id, justificativaAnulacao);
      definirRegistroParaAnular(null);
      definirJustificativaAnulacao('');
      definirErroAnulacao('');
    } catch (erro) {
      definirErroAnulacao(
        mensagemDeErro(erro, 'Não foi possível anular o registro. Tente novamente.'),
      );
    } finally {
      definirAnulando(false);
    }
  };

  if (carregando || erroCarregamento)
    return (
      <EstadoCarga
        erro={carregando ? null : erroCarregamento}
        aoTentarNovamente={() => void recarregarRegistros()}
      />
    );

  if (selecionado) {
    const alunoId = resolverAlunoDoHistorico(registrosAtraso, selecionado);
    const cadastro = alunosCadastrados.find((aluno) => aluno.id === alunoId) ?? null;
    const resumo = obterHistoricoAluno(registrosAtraso, alunoId, anoAtual);
    if (!resumo.ultimo && !cadastro)
      return (
        <EstadoVazio
          tamanho="pagina"
          icone={Search}
          titulo="Aluno sem registros"
          acoes={
            <button
              type="button"
              className={classeLinkVoltar}
              onClick={() => definirParametros({})}
            >
              Voltar para a busca
            </button>
          }
        />
      );
    const ultimo = resumo.ultimo;
    const nomeAluno = cadastro?.nome ?? ultimo!.exibicao.nomeAluno;
    const anosAnteriores = resumo.porAno.filter((item) => item.ano !== anoAtual);
    const baixarPdf = async () => {
      if (gerandoPdf || !ultimo) return;
      definirGerandoPdf(true);
      definirErroPdf(null);
      try {
        const { baixarPdfHistorico } = await import('../../relatorios/relatoriosPdf');
        baixarPdfHistorico(resumo.historico, {
          nomePadronizado: cadastro?.nomePadronizado ?? ultimo.nomeAluno,
          nome: nomeAluno,
          curso: ultimo.exibicao.curso,
          turma: formatarTurma(ultimo),
          total: resumo.total,
          anoAtual,
          totalAno: resumo.quantidadeAnoAtual,
          porAno: resumo.porAno,
        });
      } catch {
        definirErroPdf('Não foi possível gerar o PDF. Tente novamente.');
      } finally {
        definirGerandoPdf(false);
      }
    };

    return (
      <section className="mx-auto flex max-w-[1240px] flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" className={classeLinkVoltar} onClick={() => definirParametros({})}>
            <ArrowLeft size={17} />
            Voltar para a busca
          </button>
          {ultimo && (
            <Botao variante="secundario" onClick={() => void baixarPdf()} disabled={gerandoPdf}>
              <Download size={16} />
              {gerandoPdf ? 'Gerando PDF...' : 'Baixar PDF'}
            </Botao>
          )}
        </div>
        {erroPdf && <Alerta tom="erro">{erroPdf}</Alerta>}
        <div className="flex flex-wrap items-center gap-5 rounded-cartao border border-borda bg-superficie p-6 shadow-cartao">
          <FotoAluno
            origem={
              (cadastro && fotoDeIdentificacao(cadastro, registrosAtraso)) ??
              resumo.historico.find((registro) => registro.foto)?.foto ??
              null
            }
            grande
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-xs font-medium tracking-wide text-texto-suave uppercase">
              Perfil do aluno
            </span>
            <h2 className="m-0 text-2xl font-semibold text-texto">{nomeAluno}</h2>
            {cadastro ? (
              <p className="m-0 text-sm text-texto-suave">
                {`${cadastro.curso} · ${cadastro.serieModulo} ${cadastro.turma} · ${cadastro.sala} · ${cadastro.periodo}`}
              </p>
            ) : (
              ultimo && (
                <p className="m-0 text-sm text-texto-suave">
                  Último registro: {ultimo.exibicao.curso} · {formatarTurma(ultimo)} ·{' '}
                  {ultimo.exibicao.sala} · {ultimo.exibicao.periodo}
                </p>
              )
            )}
            {cadastro && (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {!cadastro.ativo && <Selo tom="anulado">Aluno inativo</Selo>}
                <button
                  type="button"
                  className={classeLinkVoltar}
                  onClick={() => definirEditandoAluno(true)}
                  disabled={cadastro.envio !== 'enviado'}
                >
                  <Pencil size={15} aria-hidden />
                  Editar aluno
                </button>
              </div>
            )}
            {resumo.quantidadeAnoAtual >= LIMITE_REINCIDENCIA && (
              <div className="mt-1">
                <Selo tom="alerta">
                  <AlertTriangle size={12} />
                  Limite de reincidência atingido em {anoAtual}
                </Selo>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <CartaoEstatistica rotulo={`Atrasos em ${anoAtual}`} valor={resumo.quantidadeAnoAtual} />
          <CartaoEstatistica rotulo="Total no histórico" valor={resumo.total} />
          <CartaoEstatistica
            rotulo="Último atraso"
            valor={ultimo && resumo.total ? formatarDataHora(ultimo.registradoEm) : '—'}
          />
          <CartaoEstatistica
            rotulo="Anos anteriores"
            valor={
              anosAnteriores.length
                ? anosAnteriores.map((item) => `${item.ano}: ${item.quantidade}`).join(' · ')
                : '—'
            }
          />
        </div>
        <Painel
          titulo="Registros"
          descricao="Dados informados em cada atraso. O contador reinicia a cada ano letivo; o histórico é mantido."
        >
          {ultimo ? (
            <div className="overflow-x-auto">
              <table className={`${classeTabela} lg:min-w-[850px]`}>
                <thead className={classeCabecalhoGrupo}>
                  <tr>
                    {[
                      'Foto',
                      'Data/hora',
                      'Curso',
                      'Turma',
                      'Sala',
                      'Período',
                      'Motivo',
                      'Registrado por',
                      'Ação',
                    ].map((titulo) => (
                      <th key={titulo} className={classeCabecalhoTabela}>
                        {titulo}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={classeCorpoTabela}>
                  {resumo.historico.map((registro) => (
                    <tr
                      key={registro.id}
                      className={`${classeLinhaTabela} transition-colors duration-200 motion-reduce:transition-none ${registro.anulacao ? 'bg-perigo-suave/40 text-texto-suave' : 'text-texto'}`}
                    >
                      <td className={classeCelula}>
                        <FotoAluno origem={registro.foto} />
                        {!registro.foto && registro.motivoSemFoto && (
                          <span className="mt-1.5 block max-w-36 text-xs text-alerta">
                            Sem foto: {registro.motivoSemFoto}
                          </span>
                        )}
                      </td>
                      <td data-rotulo="Data/hora" className={`${classeCelula} tabular-nums`}>
                        {formatarDataHora(registro.registradoEm)}
                      </td>
                      <td data-rotulo="Curso" className={classeCelulaCurta}>
                        {registro.exibicao.curso}
                      </td>
                      <td data-rotulo="Turma" className={classeCelulaCurta}>
                        {formatarTurma(registro)}
                      </td>
                      <td data-rotulo="Sala" className={classeCelulaCurta}>
                        {registro.exibicao.sala}
                      </td>
                      <td data-rotulo="Período" className={classeCelulaCurta}>
                        {registro.exibicao.periodo}
                      </td>
                      <td
                        data-rotulo="Motivo"
                        className={`${classeCelula} max-w-80 min-w-40 ${classeCelulaInteira}`}
                      >
                        {registro.motivo}
                      </td>
                      <td data-rotulo="Registrado por" className={`${classeCelula} min-w-32`}>
                        {registro.registradoPor}
                      </td>
                      <td className={classeCelula}>
                        <div className="flex flex-col items-start gap-2">
                          <SeloEnvio envio={registro.envio} />
                          {registro.anulacao ? (
                            <div className="flex min-w-48 flex-col gap-1">
                              <Selo tom="anulado">Anulado</Selo>
                              <span className="text-xs">
                                {registro.anulacao.justificativa} ·{' '}
                                {formatarDataHora(registro.anulacao.anuladoEm)} ·{' '}
                                {registro.anulacao.anuladoPor}
                              </span>
                            </div>
                          ) : (
                            <Botao
                              variante="perigo"
                              onClick={() => {
                                definirRegistroParaAnular(registro);
                                definirJustificativaAnulacao('');
                                definirErroAnulacao('');
                              }}
                            >
                              <Ban size={16} />
                              Anular
                            </Botao>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EstadoVazio icone={Search} titulo="Nenhum atraso registrado" />
          )}
        </Painel>
        <ModalAluno
          aberto={editandoAluno}
          aluno={cadastro}
          aoFechar={() => definirEditandoAluno(false)}
        />
        <Modal
          aberto={Boolean(registroParaAnular)}
          tom="alerta"
          titulo="Anular registro"
          descricao={
            <p>Informe a justificativa. O registro continuará no histórico como anulado.</p>
          }
          aoFechar={fecharAnulacao}
          acoes={
            <>
              <Botao variante="fantasma" onClick={fecharAnulacao} disabled={anulando}>
                Cancelar
              </Botao>
              <Botao variante="perigo" onClick={() => void confirmarAnulacao()} disabled={anulando}>
                <Ban size={16} />
                {anulando ? 'Anulando...' : 'Anular registro'}
              </Botao>
            </>
          }
        >
          <AreaTexto
            id="justificativa-anulacao"
            rotulo="Justificativa *"
            erro={erroAnulacao || undefined}
            value={justificativaAnulacao}
            onChange={(evento) => {
              definirJustificativaAnulacao(evento.target.value);
              definirErroAnulacao('');
            }}
            maxLength={300}
            rows={3}
            disabled={anulando}
          />
        </Modal>
      </section>
    );
  }

  const alunos = buscarAlunosNoHistorico(registrosAtraso, consulta, {
    incluirAnulados: true,
    nomes,
  });

  return (
    <section className="mx-auto flex max-w-[1240px] flex-col gap-6">
      <div>
        <h2 className="m-0 text-2xl font-semibold text-texto">Histórico do aluno</h2>
        <p className="m-0 mt-1 text-sm text-texto-suave">
          Busque pelo nome completo para ver todos os atrasos.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <CampoBusca
          valor={consulta}
          aoMudar={definirConsulta}
          autoFocus
          className="shadow-cartao"
        />
        <span className="text-sm text-texto-suave tabular-nums">{alunos.length} alunos</span>
      </div>
      <Painel titulo="Alunos" descricao="Selecione um aluno para ver o histórico completo.">
        {alunos.length === 0 ? (
          <EstadoVazio
            icone={Search}
            titulo="Nenhum aluno encontrado"
            descricao={
              registrosAtraso.length
                ? 'Tente buscar por outro nome.'
                : 'Os alunos aparecem aqui após o primeiro registro de atraso.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className={`${classeTabela} lg:min-w-[850px]`}>
              <thead className={classeCabecalhoGrupo}>
                <tr>
                  {[
                    'Foto',
                    'Nome',
                    'Curso',
                    'Turma',
                    'Sala',
                    'Período',
                    'Atrasos',
                    'Último atraso',
                  ].map((titulo) => (
                    <th key={titulo} className={classeCabecalhoTabela}>
                      {titulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={classeCorpoTabela}>
                {alunos.map((aluno) => (
                  <tr
                    key={aluno.alunoId}
                    className={`${classeLinhaTabela} cursor-pointer text-texto transition-colors duration-120 hover:bg-primaria-suave motion-reduce:transition-none`}
                    onClick={() => definirParametros({ aluno: aluno.alunoId })}
                  >
                    <td className={classeCelula}>
                      <FotoAluno origem={aluno.ultimo.foto} />
                    </td>
                    <td className={classeCelula}>
                      <div className="flex flex-col items-start gap-1">
                        <button
                          type="button"
                          className="cursor-pointer rounded-controle border-0 bg-transparent p-0 text-left font-semibold text-texto hover:text-primaria focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
                        >
                          {nomes.get(aluno.alunoId) ?? aluno.ultimo.exibicao.nomeAluno}
                        </button>
                        {aluno.quantidade === 0 && <Selo tom="anulado">Só anulados</Selo>}
                      </div>
                    </td>
                    <td data-rotulo="Curso" className={classeCelulaCurta}>
                      {aluno.ultimo.exibicao.curso}
                    </td>
                    <td data-rotulo="Turma" className={classeCelulaCurta}>
                      {formatarTurma(aluno.ultimo)}
                    </td>
                    <td data-rotulo="Sala" className={classeCelulaCurta}>
                      {aluno.ultimo.exibicao.sala}
                    </td>
                    <td data-rotulo="Período" className={classeCelulaCurta}>
                      {aluno.ultimo.exibicao.periodo}
                    </td>
                    <td data-rotulo="Atrasos" className={`${classeCelulaCurta} tabular-nums`}>
                      {aluno.quantidade}
                    </td>
                    <td data-rotulo="Último atraso" className={`${classeCelulaCurta} tabular-nums`}>
                      {formatarDataHora(aluno.ultimo.registradoEm)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Painel>
    </section>
  );
}
