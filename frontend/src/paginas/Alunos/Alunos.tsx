//////////////////////////////
// Tela de cadastro dos alunos: busca, filtro de situação, cadastro,
// edição e inativação.
// Aluno nunca é apagado: inativar tira da busca do Registrar e mantém
// o histórico de atrasos.
// Cadastrar, editar e inativar exigem internet; aluno que ainda aguarda
// envio não pode ser editado nem inativado.
//////////////////////////////

import { Pencil, UserCheck, UserPlus, UserX, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alerta } from '../../componentes/Alerta/Alerta';
import { Botao } from '../../componentes/Botao/Botao';
import { CampoBusca } from '../../componentes/CampoBusca/CampoBusca';
import { classesCampo } from '../../componentes/Entrada/Entrada';
import { FotoAluno } from '../../componentes/FotoAluno/FotoAluno';
import { EstadoCarga } from '../../componentes/EstadoCarga/EstadoCarga';
import { EstadoVazio } from '../../componentes/EstadoVazio/EstadoVazio';
import { Modal } from '../../componentes/Modal/Modal';
import { Painel } from '../../componentes/Painel/Painel';
import { Selo } from '../../componentes/Selo/Selo';
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
import { buscarAlunos, fotoDeIdentificacao } from '../../regras/regrasAlunos';
import { contarAtrasosNoAno, obterAnoLetivo } from '../../regras/regrasRegistroAtraso';
import { mensagemDeErro } from '../../servicos/repositorioAtrasos';
import type { Aluno } from '../../tipos/Aluno';
import { ModalAluno } from './ModalAluno';

//////////////////////////////
// Constantes da tela
//////////////////////////////

type Situacao = 'Ativos' | 'Inativos' | 'Todos';

const SITUACOES: Situacao[] = ['Ativos', 'Inativos', 'Todos'];

const classeLinkPerfil =
  'rounded-controle text-left text-primaria underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria';

//////////////////////////////
// Componentes auxiliares
//////////////////////////////

function FotoMiniatura({ aluno, foto }: { aluno: Aluno; foto: string | null }) {
  return (
    <FotoAluno
      origem={foto}
      alt={`Foto de ${aluno.nome}`}
      classe="size-10 rounded-full border border-borda"
    />
  );
}

//////////////////////////////
// Página Alunos
//////////////////////////////

export function Alunos() {
  const {
    alunos,
    registrosAtraso,
    carregando,
    erroCarregamento,
    recarregarRegistros,
    atualizarAluno,
  } = useDadosEscola();
  const [consulta, definirConsulta] = useState('');
  const [situacao, definirSituacao] = useState<Situacao>('Ativos');
  const [editando, definirEditando] = useState<Aluno | null>(null);
  const [cadastrando, definirCadastrando] = useState(false);
  const [alterandoSituacao, definirAlterandoSituacao] = useState<Aluno | null>(null);
  const [erroSituacao, definirErroSituacao] = useState('');
  const [salvandoSituacao, definirSalvandoSituacao] = useState(false);
  const anoAtual = obterAnoLetivo(new Date());

  if (carregando || erroCarregamento)
    return (
      <EstadoCarga
        erro={carregando ? null : erroCarregamento}
        aoTentarNovamente={() => void recarregarRegistros()}
        tituloCarregando="Carregando alunos..."
      />
    );

  const naSituacao = alunos.filter(
    (aluno) => situacao === 'Todos' || aluno.ativo === (situacao === 'Ativos'),
  );
  const lista = consulta.trim()
    ? buscarAlunos(naSituacao, consulta, { incluirInativos: true })
    : [...naSituacao].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const atrasosNoAno = contarAtrasosNoAno(registrosAtraso, anoAtual);

  const confirmarSituacao = async () => {
    if (!alterandoSituacao) return;
    definirSalvandoSituacao(true);
    definirErroSituacao('');
    try {
      await atualizarAluno(alterandoSituacao.id, { ativo: !alterandoSituacao.ativo });
      definirAlterandoSituacao(null);
    } catch (erro) {
      definirErroSituacao(mensagemDeErro(erro, 'Não foi possível salvar o aluno.'));
    } finally {
      definirSalvandoSituacao(false);
    }
  };

  const inativando = alterandoSituacao?.ativo ?? false;

  return (
    <section className="mx-auto flex max-w-[1240px] flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="m-0 text-2xl font-semibold text-texto">Alunos</h2>
          <p className="m-0 mt-1 text-sm text-texto-suave">
            Cadastro dos alunos: corrija dados, mude de curso ou inative quem saiu da escola.
          </p>
        </div>
        <Botao onClick={() => definirCadastrando(true)}>
          <UserPlus size={16} aria-hidden />
          Novo aluno
        </Botao>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <CampoBusca valor={consulta} aoMudar={definirConsulta} />
        <label className={`${classesCampo.rotulo} w-44`}>
          <span>Situação</span>
          <select
            value={situacao}
            onChange={(evento) => definirSituacao(evento.target.value as Situacao)}
            className={`${classesCampo.controle} ${classesCampo.semErro} ${classesCampo.texto.normal} h-12`}
          >
            {SITUACOES.map((opcao) => (
              <option key={opcao}>{opcao}</option>
            ))}
          </select>
        </label>
      </div>

      <Painel
        titulo="Alunos cadastrados"
        descricao={`${lista.length} ${lista.length === 1 ? 'aluno' : 'alunos'}`}
      >
        {lista.length === 0 ? (
          <EstadoVazio
            icone={Users}
            titulo="Nenhum aluno encontrado"
            descricao={
              alunos.length
                ? 'Tente outro nome ou situação.'
                : 'Os alunos aparecem aqui ao registrar o primeiro atraso ou pelo botão "Novo aluno".'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className={`${classeTabela} lg:min-w-[900px]`}>
              <thead className={classeCabecalhoGrupo}>
                <tr>
                  {[
                    'Nome',
                    'Curso',
                    'Turma',
                    'Sala',
                    'Período',
                    `Atrasos em ${anoAtual}`,
                    'Situação',
                    'Ações',
                  ].map((titulo) => (
                    <th key={titulo} className={classeCabecalhoTabela}>
                      {titulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={classeCorpoTabela}>
                {lista.map((aluno) => (
                  <tr
                    key={aluno.id}
                    className={`${classeLinhaTabela} ${aluno.ativo ? 'text-texto' : 'text-texto-suave'}`}
                  >
                    <td className={`${classeCelula} min-w-44 font-semibold ${classeCelulaInteira}`}>
                      <span className="flex items-center gap-3">
                        <FotoMiniatura
                          aluno={aluno}
                          foto={fotoDeIdentificacao(aluno, registrosAtraso)}
                        />
                        <span className="flex flex-col items-start gap-1">
                          <Link
                            to={`/historico?aluno=${encodeURIComponent(aluno.id)}`}
                            className={classeLinkPerfil}
                          >
                            {aluno.nome}
                          </Link>
                          {aluno.envio !== 'enviado' && <Selo tom="alerta">Aguardando envio</Selo>}
                        </span>
                      </span>
                    </td>
                    <td data-rotulo="Curso" className={classeCelulaCurta}>
                      {aluno.curso}
                    </td>
                    <td data-rotulo="Turma" className={classeCelulaCurta}>
                      {aluno.serieModulo} {aluno.turma}
                    </td>
                    <td data-rotulo="Sala" className={classeCelulaCurta}>
                      {aluno.sala}
                    </td>
                    <td data-rotulo="Período" className={classeCelulaCurta}>
                      {aluno.periodo}
                    </td>
                    <td
                      data-rotulo={`Atrasos em ${anoAtual}`}
                      className={`${classeCelulaCurta} tabular-nums`}
                    >
                      {atrasosNoAno.get(aluno.id) ?? 0}
                    </td>
                    <td data-rotulo="Situação" className={classeCelulaCurta}>
                      <Selo tom={aluno.ativo ? 'neutro' : 'anulado'}>
                        {aluno.ativo ? 'Ativo' : 'Inativo'}
                      </Selo>
                    </td>
                    <td className={`${classeCelula} ${classeCelulaInteira}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <Botao
                          variante="fantasma"
                          onClick={() => definirEditando(aluno)}
                          disabled={aluno.envio !== 'enviado'}
                        >
                          <Pencil size={14} aria-hidden />
                          Editar
                        </Botao>
                        <Botao
                          variante="fantasma"
                          onClick={() => {
                            definirErroSituacao('');
                            definirAlterandoSituacao(aluno);
                          }}
                          disabled={aluno.envio !== 'enviado'}
                        >
                          {aluno.ativo ? (
                            <UserX size={14} aria-hidden />
                          ) : (
                            <UserCheck size={14} aria-hidden />
                          )}
                          {aluno.ativo ? 'Inativar' : 'Reativar'}
                        </Botao>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Painel>

      <ModalAluno
        aberto={cadastrando || Boolean(editando)}
        aluno={editando}
        aoFechar={() => {
          definirCadastrando(false);
          definirEditando(null);
        }}
      />

      <Modal
        aberto={Boolean(alterandoSituacao)}
        tom="alerta"
        titulo={inativando ? 'Inativar aluno' : 'Reativar aluno'}
        descricao={
          alterandoSituacao &&
          (inativando
            ? `${alterandoSituacao.nome} deixa de aparecer na busca do Registrar. O histórico de atrasos continua guardado e ele pode ser reativado depois.`
            : `${alterandoSituacao.nome} volta a aparecer na busca do Registrar.`)
        }
        aoFechar={() => {
          if (!salvandoSituacao) definirAlterandoSituacao(null);
        }}
        acoes={
          <>
            <Botao
              variante="fantasma"
              onClick={() => definirAlterandoSituacao(null)}
              disabled={salvandoSituacao}
            >
              Cancelar
            </Botao>
            <Botao onClick={() => void confirmarSituacao()} disabled={salvandoSituacao}>
              {inativando ? 'Inativar aluno' : 'Reativar aluno'}
            </Botao>
          </>
        }
      >
        {erroSituacao && <Alerta tom="erro">{erroSituacao}</Alerta>}
      </Modal>
    </section>
  );
}
