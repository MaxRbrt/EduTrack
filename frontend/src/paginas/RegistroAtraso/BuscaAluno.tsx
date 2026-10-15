//////////////////////////////
// Campo do nome do aluno no Registrar, com sugestões do cadastro.
// Se nenhuma sugestão for escolhida, o texto digitado vira o nome do aluno novo.
// Só alunos ativos aparecem; a opção da lista cancela o mousedown para
// o clique valer antes de o campo perder o foco e a lista fechar.
//////////////////////////////

import { Search } from 'lucide-react';
import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { classesCampo, MensagemErroCampo } from '../../componentes/Entrada/Entrada';
import { FotoAluno } from '../../componentes/FotoAluno/FotoAluno';
import { Selo } from '../../componentes/Selo/Selo';
import { buscarAlunos, fotoDeIdentificacao } from '../../regras/regrasAlunos';
import { contarAtrasosNoAno, pluralizar } from '../../regras/regrasRegistroAtraso';
import type { Aluno } from '../../tipos/Aluno';
import type { RegistroAtraso } from '../../tipos/RegistroAtraso';

const LIMITE_RESULTADOS = 8;

interface PropriedadesBuscaAluno {
  id: string;
  valor: string;
  erro?: string;
  complemento?: ReactNode;
  alunos: Aluno[];
  registrosAtraso: RegistroAtraso[];
  anoAtual: number;
  aoMudar: (texto: string) => void;
  aoEscolher: (aluno: Aluno) => void;
}

export function BuscaAluno({
  id,
  valor,
  erro,
  complemento,
  alunos,
  registrosAtraso,
  anoAtual,
  aoMudar,
  aoEscolher,
}: PropriedadesBuscaAluno) {
  const idLista = useId();
  const idErro = `${id}-erro`;
  const [aberta, definirAberta] = useState(false);
  const [ativa, definirAtiva] = useState(-1);
  const texto = valor.trim();
  const resultados = texto ? buscarAlunos(alunos, texto).slice(0, LIMITE_RESULTADOS) : [];
  const inativosCompativeis = texto
    ? buscarAlunos(
        alunos.filter((aluno) => !aluno.ativo),
        texto,
        { incluirInativos: true },
      ).length
    : 0;
  const quantidadeOpcoes = resultados.length;
  const listaVisivel = aberta && quantidadeOpcoes > 0;
  const idOpcao = (indice: number) => `${idLista}-opcao-${indice}`;

  const atrasosNoAno = contarAtrasosNoAno(registrosAtraso, anoAtual);

  const escolher = (indice: number) => {
    if (indice < 0 || indice >= quantidadeOpcoes) return;
    aoEscolher(resultados[indice]);
    definirAberta(false);
    definirAtiva(-1);
  };

  const aoTeclar = (evento: KeyboardEvent<HTMLInputElement>) => {
    if (evento.key === 'ArrowDown' && quantidadeOpcoes) {
      evento.preventDefault();
      definirAberta(true);
      definirAtiva((atual) => (atual + 1) % quantidadeOpcoes);
    } else if (evento.key === 'ArrowUp' && quantidadeOpcoes) {
      evento.preventDefault();
      definirAberta(true);
      definirAtiva((atual) => (atual <= 0 ? quantidadeOpcoes - 1 : atual - 1));
    } else if (evento.key === 'Enter' && listaVisivel && ativa >= 0) {
      evento.preventDefault();
      escolher(ativa);
    } else if (evento.key === 'Escape' && listaVisivel) {
      evento.preventDefault();
      definirAberta(false);
      definirAtiva(-1);
    }
  };

  return (
    <div className="relative flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-texto">
        Nome do aluno *
      </label>
      <div className="relative">
        <Search
          size={20}
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-texto-suave"
        />
        <input
          id={id}
          role="combobox"
          aria-expanded={listaVisivel}
          aria-controls={idLista}
          aria-autocomplete="list"
          aria-activedescendant={listaVisivel && ativa >= 0 ? idOpcao(ativa) : undefined}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? idErro : undefined}
          autoComplete="off"
          maxLength={120}
          value={valor}
          placeholder="Digite o nome completo do aluno"
          onChange={(evento) => {
            aoMudar(evento.target.value);
            definirAberta(true);
            definirAtiva(-1);
          }}
          onFocus={() => definirAberta(true)}
          onBlur={() => definirAberta(false)}
          onKeyDown={aoTeclar}
          className={`${classesCampo.controle} ${erro ? classesCampo.comErro : classesCampo.semErro} ${classesCampo.texto.toque} h-12 pl-12`}
        />
      </div>
      <MensagemErroCampo id={idErro} erro={erro} />
      {complemento}
      {texto && inativosCompativeis > 0 && (
        <p className="m-0 text-sm text-texto-suave">
          {inativosCompativeis === 1
            ? '1 aluno inativo com esse nome — reative na tela Alunos.'
            : `${inativosCompativeis} alunos inativos com esse nome — reative na tela Alunos.`}
        </p>
      )}
      {listaVisivel && (
        <ul
          id={idLista}
          role="listbox"
          aria-label="Alunos encontrados"
          className="absolute top-full right-0 left-0 z-10 m-0 mt-1 max-h-96 list-none overflow-y-auto rounded-controle border border-borda bg-superficie p-1 shadow-cartao"
        >
          {resultados.map((aluno, indice) => (
            <li
              key={aluno.id}
              id={idOpcao(indice)}
              role="option"
              aria-selected={ativa === indice}
              onMouseDown={(evento) => evento.preventDefault()}
              onClick={() => escolher(indice)}
              className={`flex cursor-pointer items-center gap-3 rounded-controle px-3 py-2 ${ativa === indice ? 'bg-primaria-suave' : 'hover:bg-fundo'}`}
            >
              <FotoAluno origem={fotoDeIdentificacao(aluno, registrosAtraso)} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm font-semibold text-texto">{aluno.nome}</strong>
                  {aluno.envio !== 'enviado' && <Selo tom="alerta">Aguardando envio</Selo>}
                </span>
                <span className="text-sm text-texto-suave">
                  {aluno.curso} · {aluno.serieModulo} {aluno.turma} · {aluno.sala}
                  {' · '}
                  {pluralizar(atrasosNoAno.get(aluno.id) ?? 0, 'atraso', 'atrasos')} em {anoAtual}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
