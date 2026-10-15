//////////////////////////////
// Dashboard: resumo dos atrasos, filtros, alunos reincidentes e gráficos.
// Os filtros ficam na URL, então um link copiado abre a mesma consulta;
// sem data escolhida, o período é o mês atual.
// Totais, reincidentes e gráficos não contam registros anulados; o PDF lista
// também os anulados. A página se chama Painel, por isso o componente Painel
// é importado como PainelConteudo.
//////////////////////////////

import { AlertTriangle, ArrowUpRight, Clock3, Download, Repeat } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alerta } from '../../componentes/Alerta/Alerta';
import { Botao } from '../../componentes/Botao/Botao';
import { CartaoEstatistica } from '../../componentes/CartaoEstatistica/CartaoEstatistica';
import { classesCampo } from '../../componentes/Entrada/Entrada';
import { EstadoCarga } from '../../componentes/EstadoCarga/EstadoCarga';
import { EstadoVazio } from '../../componentes/EstadoVazio/EstadoVazio';
import { FotoAluno } from '../../componentes/FotoAluno/FotoAluno';
import { Painel as PainelConteudo } from '../../componentes/Painel/Painel';
import { Selo } from '../../componentes/Selo/Selo';
import { SeloEnvio } from '../../componentes/SeloEnvio/SeloEnvio';
import { useDadosEscola } from '../../contextos/ContextoDadosEscola/ContextoDadosEscola';
import type { RegistroAtraso } from '../../tipos/RegistroAtraso';
import {
  formatarHora,
  formatarTurma,
  filtrarRegistros,
  contarPorDiaSemana,
  contarPorFaixaHorario,
  LIMITE_REINCIDENCIA,
  maisRecentesPrimeiro,
  obterAnoLetivo,
  obterAlunosComMaisAtrasos,
  obterChaveDataLocal,
  registrosValidos,
} from '../../regras/regrasRegistroAtraso';

//////////////////////////////
// Constantes da tela
//////////////////////////////

type CampoOpcoes = 'curso' | 'periodo';

const FILTROS_OPCOES: [CampoOpcoes, string][] = [
  ['curso', 'Curso'],
  ['periodo', 'Período'],
];
const FILTROS_DATA = [
  ['dataInicial', 'Data inicial'],
  ['dataFinal', 'Data final'],
] as const;

const classeFiltro = `${classesCampo.controle} ${classesCampo.semErro} ${classesCampo.texto.normal} h-10`;
const classeLink =
  'rounded-controle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria';

//////////////////////////////
// Página Dashboard
//////////////////////////////

export function Painel() {
  const { registrosAtraso, alunos, carregando, erroCarregamento, recarregarRegistros } =
    useDadosEscola();
  const [gerandoPdf, definirGerandoPdf] = useState(false);
  const [erroPdf, definirErroPdf] = useState<string | null>(null);
  const [parametrosBusca, definirParametrosBusca] = useSearchParams();
  const referenciaGraficos = useRef<HTMLDivElement>(null);
  const chaveFiltros = parametrosBusca.toString();

  useEffect(() => {
    const conteiner = referenciaGraficos.current;
    if (!conteiner || typeof window.matchMedia !== 'function') return;
    let ativo = true;
    let desfazer: (() => void) | undefined;
    import('../../animacoes/animacoesPainel')
      .then(({ animarBarras }) => {
        if (ativo) desfazer = animarBarras(conteiner);
      })
      .catch(() => {});
    return () => {
      ativo = false;
      desfazer?.();
    };
  }, [chaveFiltros, carregando]);

  const agora = new Date();
  const registrosContabilizaveis = registrosValidos(registrosAtraso);
  const hoje = obterChaveDataLocal(agora);
  const mesAtual = hoje.slice(0, 7);
  const anoAtual = obterAnoLetivo(agora);
  const registrosHoje = maisRecentesPrimeiro(
    registrosContabilizaveis.filter(
      (registro) => obterChaveDataLocal(registro.registradoEm) === hoje,
    ),
  );
  const quantidadeMes = registrosContabilizaveis.filter(
    (registro) => obterChaveDataLocal(registro.registradoEm).slice(0, 7) === mesAtual,
  ).length;
  const quantidadeAno = registrosContabilizaveis.filter(
    (registro) => registro.anoLetivo === anoAtual,
  ).length;
  const ranking = obterAlunosComMaisAtrasos(registrosAtraso, anoAtual);
  const alunosComMaisAtrasos = ranking.slice(0, 5);
  const quantidadeReincidentes = ranking.filter((aluno) => aluno.quantidade > 1).length;
  const alunosAcimaLimite = ranking.filter((aluno) => aluno.quantidade >= LIMITE_REINCIDENCIA);
  const linkHistorico = (alunoId: string) => `/historico?aluno=${encodeURIComponent(alunoId)}`;
  const nomes = new Map(alunos.map((aluno) => [aluno.id, aluno.nome]));
  const nomeDe = (registro: RegistroAtraso) =>
    nomes.get(registro.alunoId) ?? registro.exibicao.nomeAluno;
  const filtros = {
    curso: parametrosBusca.get('curso') ?? '',
    periodo: parametrosBusca.get('periodo') ?? '',
    dataInicial: parametrosBusca.get('dataInicial') ?? `${mesAtual}-01`,
    dataFinal:
      parametrosBusca.get('dataFinal') ??
      obterChaveDataLocal(new Date(agora.getFullYear(), agora.getMonth() + 1, 0)),
  };
  const registrosFiltrados = maisRecentesPrimeiro(filtrarRegistros(registrosAtraso, filtros));
  const opcoesFiltro = (campo: CampoOpcoes) => {
    const opcoes = new Map<string, { rotulo: string; registradoEm: string }>();
    registrosContabilizaveis.forEach((registro) => {
      const atual = opcoes.get(registro[campo]);
      if (!atual || registro.registradoEm > atual.registradoEm)
        opcoes.set(registro[campo], {
          rotulo: registro.exibicao[campo],
          registradoEm: registro.registradoEm,
        });
    });
    return [...opcoes.entries()].sort((a, b) => a[1].rotulo.localeCompare(b[1].rotulo, 'pt-BR'));
  };
  const opcoes = { curso: opcoesFiltro('curso'), periodo: opcoesFiltro('periodo') };
  const distribuicaoDias = contarPorDiaSemana(registrosFiltrados);
  const distribuicaoHorarios = contarPorFaixaHorario(registrosFiltrados);

  const baixarPdf = async () => {
    if (gerandoPdf) return;
    definirGerandoPdf(true);
    definirErroPdf(null);
    const rotuloFiltro = (campo: CampoOpcoes) =>
      opcoes[campo].find(([valor]) => valor === filtros[campo])?.[1].rotulo ?? filtros[campo];
    try {
      const { baixarPdfPainel } = await import('../../relatorios/relatoriosPdf');
      baixarPdfPainel(
        maisRecentesPrimeiro(
          filtrarRegistros(registrosAtraso, { ...filtros, incluirAnulados: true }),
        ),
        { ...filtros, curso: rotuloFiltro('curso'), periodo: rotuloFiltro('periodo') },
        [
          { rotulo: 'Atrasos hoje', quantidade: registrosHoje.length },
          { rotulo: 'Atrasos no mês', quantidade: quantidadeMes },
          { rotulo: `Atrasos em ${anoAtual}`, quantidade: quantidadeAno },
          { rotulo: 'Reincidentes', quantidade: quantidadeReincidentes },
        ],
        distribuicaoDias,
        distribuicaoHorarios,
      );
    } catch {
      definirErroPdf('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      definirGerandoPdf(false);
    }
  };
  const atualizarFiltro = (campo: string, valor: string) => {
    const proximos = new URLSearchParams(parametrosBusca);
    if (valor) proximos.set(campo, valor);
    else proximos.delete(campo);
    definirParametrosBusca(proximos);
  };
  const maiorDistribuicao = Math.max(
    1,
    ...distribuicaoDias.map((item) => item.quantidade),
    ...distribuicaoHorarios.map((item) => item.quantidade),
  );

  if (carregando || erroCarregamento)
    return (
      <EstadoCarga
        erro={carregando ? null : erroCarregamento}
        aoTentarNovamente={() => void recarregarRegistros()}
      />
    );

  return (
    <section className="mx-auto flex max-w-[1240px] flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="m-0 text-2xl font-semibold text-texto">Entradas atrasadas</h2>
          <p className="m-0 mt-1 text-sm text-texto-suave">
            Resumo dos atrasos registrados e dos alunos reincidentes.
          </p>
        </div>
        <Botao variante="secundario" onClick={() => void baixarPdf()} disabled={gerandoPdf}>
          <Download size={16} />
          {gerandoPdf ? 'Gerando PDF...' : 'Baixar PDF'}
        </Botao>
      </div>
      {erroPdf && <Alerta tom="erro">{erroPdf}</Alerta>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CartaoEstatistica animar rotulo="Atrasos hoje" valor={registrosHoje.length} />
        <CartaoEstatistica animar rotulo="Atrasos no mês" valor={quantidadeMes} />
        <CartaoEstatistica animar rotulo={`Atrasos em ${anoAtual}`} valor={quantidadeAno} />
        <CartaoEstatistica
          animar
          rotulo={`Alunos reincidentes em ${anoAtual}`}
          valor={quantidadeReincidentes}
        />
      </div>

      <PainelConteudo
        titulo="Filtros"
        descricao="Aplicados à lista e às distribuições."
        acoes={
          <Botao variante="fantasma" onClick={() => definirParametrosBusca({})}>
            Limpar filtros
          </Botao>
        }
      >
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {FILTROS_OPCOES.map(([campo, rotulo]) => (
            <label key={campo} className={classesCampo.rotulo}>
              <span>{rotulo}</span>
              <select
                className={classeFiltro}
                value={filtros[campo]}
                onChange={(evento) => atualizarFiltro(campo, evento.target.value)}
              >
                <option value="">Todos</option>
                {opcoes[campo].map(([valor, item]) => (
                  <option key={valor} value={valor}>
                    {item.rotulo}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {FILTROS_DATA.map(([campo, rotulo]) => (
            <label key={campo} className={classesCampo.rotulo}>
              <span>{rotulo}</span>
              <input
                type="date"
                className={classeFiltro}
                value={filtros[campo]}
                onChange={(evento) => atualizarFiltro(campo, evento.target.value)}
              />
            </label>
          ))}
        </div>
      </PainelConteudo>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <PainelConteudo
          titulo="Registros filtrados"
          descricao={`${registrosFiltrados.length} registros encontrados`}
        >
          {registrosFiltrados.length === 0 ? (
            <EstadoVazio icone={Clock3} titulo="Nenhum atraso no período filtrado" />
          ) : (
            <ul className="m-0 list-none divide-y divide-borda p-0">
              {registrosFiltrados.slice(0, 8).map((registro) => (
                <li key={registro.id}>
                  <Link
                    to={linkHistorico(registro.alunoId)}
                    className={`flex items-center gap-3 px-5 py-3 hover:bg-fundo ${classeLink}`}
                  >
                    <FotoAluno origem={registro.foto} />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <strong className="truncate text-sm font-semibold text-texto">
                        {nomeDe(registro)}
                      </strong>
                      <span className="truncate text-sm text-texto-suave">
                        {registro.exibicao.curso} · {formatarTurma(registro)} ·{' '}
                        {registro.exibicao.sala} · {registro.motivo}
                      </span>
                      <SeloEnvio envio={registro.envio} />
                    </div>
                    <time className="shrink-0 text-sm text-texto-suave tabular-nums">
                      {formatarHora(registro.registradoEm)}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </PainelConteudo>
        <PainelConteudo
          titulo={`Mais atrasos em ${anoAtual}`}
          descricao="Alunos com maior reincidência"
          acoes={
            <Link
              to="/historico"
              className={`inline-flex items-center gap-1 text-sm font-medium text-primaria hover:underline ${classeLink}`}
            >
              Histórico <ArrowUpRight size={16} />
            </Link>
          }
        >
          {alunosComMaisAtrasos.length === 0 ? (
            <EstadoVazio icone={Repeat} titulo="Sem registros no ano" />
          ) : (
            <ul className="m-0 list-none divide-y divide-borda p-0">
              {alunosComMaisAtrasos.map((aluno) => (
                <li key={aluno.alunoId} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <Link
                    to={linkHistorico(aluno.alunoId)}
                    className={`min-w-0 flex-1 text-texto hover:text-primaria hover:underline ${classeLink}`}
                  >
                    {nomeDe(aluno.ultimo)} · {formatarTurma(aluno.ultimo)} ·{' '}
                    {aluno.ultimo.exibicao.sala}
                  </Link>
                  <strong className="font-semibold text-texto tabular-nums">
                    {aluno.quantidade}
                  </strong>
                </li>
              ))}
            </ul>
          )}
        </PainelConteudo>
      </div>

      <div
        ref={referenciaGraficos}
        className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start"
      >
        <PainelConteudo
          titulo="Acima do limite"
          descricao={`${LIMITE_REINCIDENCIA}+ atrasos em ${anoAtual} · ${alunosAcimaLimite.length} ${alunosAcimaLimite.length === 1 ? 'aluno' : 'alunos'}`}
        >
          {alunosAcimaLimite.length === 0 ? (
            <EstadoVazio titulo="Nenhum aluno acima do limite" />
          ) : (
            <ul className="m-0 max-h-80 list-none divide-y divide-borda overflow-y-auto overscroll-contain p-0">
              {alunosAcimaLimite.map((aluno) => (
                <li key={aluno.alunoId} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <Link
                    to={linkHistorico(aluno.alunoId)}
                    className={`min-w-0 flex-1 text-texto hover:text-primaria hover:underline ${classeLink}`}
                  >
                    {nomeDe(aluno.ultimo)} · {aluno.ultimo.exibicao.curso}
                  </Link>
                  <Selo tom="alerta">
                    <AlertTriangle size={12} />
                    {aluno.quantidade} atrasos
                  </Selo>
                </li>
              ))}
            </ul>
          )}
        </PainelConteudo>
        <PainelConteudo titulo="Por dia da semana" descricao="Respeita os filtros">
          <GraficoBarras
            rotulo="Atrasos por dia da semana"
            itens={distribuicaoDias}
            maximo={maiorDistribuicao}
          />
        </PainelConteudo>
        <PainelConteudo titulo="Por horário" descricao="Respeita os filtros">
          <GraficoBarras
            rotulo="Atrasos por horário"
            itens={distribuicaoHorarios}
            maximo={maiorDistribuicao}
          />
        </PainelConteudo>
      </div>
    </section>
  );
}

//////////////////////////////
// Componentes auxiliares
//////////////////////////////

function GraficoBarras({
  rotulo,
  itens,
  maximo,
}: {
  rotulo: string;
  itens: { rotulo: string; quantidade: number }[];
  maximo: number;
}) {
  if (itens.length === 0) return <EstadoVazio titulo="Sem registros no período" />;
  return (
    <ul aria-label={rotulo} className="m-0 flex list-none flex-col gap-2.5 p-5">
      {itens.map((item) => (
        <li
          key={item.rotulo}
          className="grid grid-cols-[3rem_minmax(0,1fr)_2.5rem] items-center gap-3 text-sm"
        >
          <span className="text-texto-suave tabular-nums">{item.rotulo}</span>
          <div aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-primaria-suave">
            <div
              data-barra
              className="h-full rounded-full bg-primaria"
              style={{ width: `${(item.quantidade / maximo) * 100}%` }}
            />
          </div>
          <strong className="text-right font-semibold text-texto tabular-nums">
            {item.quantidade}
          </strong>
        </li>
      ))}
    </ul>
  );
}
