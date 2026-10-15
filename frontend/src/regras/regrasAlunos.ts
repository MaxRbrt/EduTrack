//////////////////////////////
// Regras do cadastro de alunos: validação, busca por nome e sugestões.
// A busca aceita as palavras em qualquer ordem, sem acento e com um erro
// de digitação, porque a portaria digita com pressa.
// Aluno nunca é apagado; inativo só sai da busca do Registrar.
//////////////////////////////

import {
  limparEspacos,
  MENSAGEM_NOME_INCOMPLETO,
  normalizarTexto,
  temNomeESobrenome,
  validarTextosObrigatorios,
} from './regrasRegistroAtraso';
import { caminhoFotoAtraso } from './regrasFoto';
import type { AlteracoesAluno, Aluno, NovoAluno } from '../tipos/Aluno';
import type {
  FormularioRegistroAtraso,
  NovoRegistroAtraso,
  RegistroAtraso,
} from '../tipos/RegistroAtraso';

//////////////////////////////
// Validação do cadastro
//////////////////////////////

export interface DadosAluno {
  nome: string;
  curso: string;
  periodo: string;
  serieModulo: string;
  turma: string;
  sala: string;
}

export type ErrosAluno = Partial<Record<keyof DadosAluno, string>>;

export const ORDEM_CAMPOS_ALUNO: Array<keyof DadosAluno> = [
  'nome',
  'curso',
  'periodo',
  'serieModulo',
  'turma',
  'sala',
];

const TAMANHO_MAXIMO_ALUNO: Record<keyof DadosAluno, number> = {
  nome: 120,
  curso: 60,
  periodo: 60,
  serieModulo: 60,
  turma: 60,
  sala: 60,
};

export function validarAluno(dados: DadosAluno): ErrosAluno {
  const erros: ErrosAluno = validarTextosObrigatorios(
    dados,
    TAMANHO_MAXIMO_ALUNO,
    ORDEM_CAMPOS_ALUNO,
  );
  if (!erros.nome && !temNomeESobrenome(dados.nome)) erros.nome = MENSAGEM_NOME_INCOMPLETO;
  return erros;
}

export function limparDadosAluno(dados: DadosAluno): DadosAluno {
  return {
    nome: limparEspacos(dados.nome),
    curso: limparEspacos(dados.curso),
    periodo: limparEspacos(dados.periodo),
    serieModulo: limparEspacos(dados.serieModulo),
    turma: limparEspacos(dados.turma),
    sala: limparEspacos(dados.sala),
  };
}

export function normalizarAlteracoesAluno(
  alteracoes: AlteracoesAluno,
): AlteracoesAluno & { nomePadronizado?: string } {
  if (alteracoes.nome === undefined) return alteracoes;
  return {
    ...alteracoes,
    nome: limparEspacos(alteracoes.nome),
    nomePadronizado: normalizarTexto(alteracoes.nome),
  };
}

//////////////////////////////
// Busca por nome
//////////////////////////////

function distanciaEdicaoUmOuMenos(primeira: string, segunda: string) {
  if (Math.abs(primeira.length - segunda.length) > 1) return false;

  let indicePrimeira = 0;
  let indiceSegunda = 0;
  let diferencas = 0;
  while (indicePrimeira < primeira.length && indiceSegunda < segunda.length) {
    if (primeira[indicePrimeira] === segunda[indiceSegunda]) {
      indicePrimeira += 1;
      indiceSegunda += 1;
      continue;
    }
    diferencas += 1;
    if (diferencas > 1) return false;
    if (primeira.length > segunda.length) indicePrimeira += 1;
    else if (segunda.length > primeira.length) indiceSegunda += 1;
    else {
      indicePrimeira += 1;
      indiceSegunda += 1;
    }
  }
  return true;
}

function relevanciaNome(nomePadronizado: string, consulta: string) {
  const palavrasConsulta = consulta.split(' ').filter(Boolean);
  if (palavrasConsulta.length === 0) return 0;

  const palavrasNome = nomePadronizado.split(' ');
  let relevancia = nomePadronizado === consulta ? 10 : 0;
  for (const palavraConsulta of palavrasConsulta) {
    const pontuacao = Math.max(
      ...palavrasNome.map((palavraNome) => {
        if (palavraNome === palavraConsulta) return 3;
        if (palavraNome.startsWith(palavraConsulta)) return 2;
        if (
          palavraConsulta.length >= 4 &&
          palavraNome.length >= 4 &&
          distanciaEdicaoUmOuMenos(palavraConsulta, palavraNome)
        )
          return 1;
        return 0;
      }),
    );
    if (!pontuacao) return 0;
    relevancia += pontuacao;
  }
  return relevancia;
}

function ordenarPorRelevancia(alunos: Aluno[], obterRelevancia: (aluno: Aluno) => number) {
  return alunos
    .map((aluno) => ({ aluno, relevancia: obterRelevancia(aluno) }))
    .filter(({ relevancia }) => relevancia > 0)
    .sort(
      (primeiro, segundo) =>
        segundo.relevancia - primeiro.relevancia ||
        primeiro.aluno.nome.localeCompare(segundo.aluno.nome, 'pt-BR'),
    )
    .map(({ aluno }) => aluno);
}

export function buscarAlunos(
  alunos: Aluno[],
  consulta: string,
  { incluirInativos = false }: { incluirInativos?: boolean } = {},
): Aluno[] {
  const consultaPadronizada = normalizarTexto(consulta);
  const candidatos = incluirInativos ? alunos : alunos.filter((aluno) => aluno.ativo);
  if (!consultaPadronizada) return candidatos;

  return ordenarPorRelevancia(candidatos, (aluno) =>
    relevanciaNome(aluno.nomePadronizado, consultaPadronizada),
  );
}

export function encontrarAlunosParecidos(alunos: Aluno[], nome: string): Aluno[] {
  const nomePadronizado = normalizarTexto(nome);
  return ordenarPorRelevancia(alunos, (aluno) =>
    relevanciaNome(aluno.nomePadronizado, nomePadronizado),
  );
}

//////////////////////////////
// Sugestões de valores já usados
//////////////////////////////

type CampoTurma = Exclude<keyof DadosAluno, 'nome'>;

const CAMPOS_TURMA: CampoTurma[] = ['curso', 'periodo', 'serieModulo', 'turma', 'sala'];

export function listarValoresConhecidos(
  alunos: Aluno[],
  registros: RegistroAtraso[],
): Record<CampoTurma, string[]> {
  const origens: Record<CampoTurma, string>[] = [
    ...alunos,
    ...registros.filter((registro) => !registro.anulacao).map((registro) => registro.exibicao),
  ];
  const valores = {} as Record<CampoTurma, string[]>;
  for (const campo of CAMPOS_TURMA) {
    const usos = new Map<string, Map<string, number>>();
    for (const origem of origens) {
      const grafia = limparEspacos(origem[campo]);
      const chave = normalizarTexto(grafia);
      if (!chave) continue;
      const grafias = usos.get(chave) ?? new Map<string, number>();
      grafias.set(grafia, (grafias.get(grafia) ?? 0) + 1);
      usos.set(chave, grafias);
    }
    valores[campo] = [...usos.values()]
      .map(
        (grafias) =>
          [...grafias].reduce((maior, atual) => (atual[1] > maior[1] ? atual : maior))[0],
      )
      .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  }
  return valores;
}

//////////////////////////////
// Foto e aluno do atraso
//////////////////////////////

export function fotoDeIdentificacao(aluno: Aluno, registros: RegistroAtraso[]): string | null {
  if (aluno.foto) return aluno.foto;
  let ultimo: RegistroAtraso | null = null;
  for (const registro of registros)
    if (
      registro.alunoId === aluno.id &&
      registro.foto &&
      !registro.anulacao &&
      (!ultimo || registro.registradoEm > ultimo.registradoEm)
    )
      ultimo = registro;
  return ultimo?.foto ?? null;
}

export function criarAlunoDoFormulario(
  formulario: FormularioRegistroAtraso,
  registro: Pick<NovoRegistroAtraso, 'id' | 'alunoId' | 'anoLetivo' | 'foto'>,
): NovoAluno {
  const dados = limparDadosAluno({
    nome: formulario.nomeAluno,
    curso: formulario.curso,
    periodo: formulario.periodo,
    serieModulo: formulario.serieModulo,
    turma: formulario.turma,
    sala: formulario.sala,
  });
  return {
    id: registro.alunoId,
    ...dados,
    nomePadronizado: normalizarTexto(dados.nome),
    ativo: true,
    fotoCaminho: registro.foto ? caminhoFotoAtraso(registro) : null,
  };
}
