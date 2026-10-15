//////////////////////////////
// Regras do registro de atraso, sem tela e sem servidor.
// Aqui ficam a validação do formulário, a anulação, as contagens do
// Dashboard e o histórico do aluno.
// Ao salvar, os campos são padronizados (sem acento e em minúsculas) para
// comparar e agrupar; o texto digitado fica em `exibicao`, que é o que a
// tela mostra. O id do registro nasce no navegador para a fila não duplicar.
//////////////////////////////

import type {
  FormularioRegistroAtraso,
  NovoRegistroAtraso,
  RegistroAtraso,
} from '../tipos/RegistroAtraso';

//////////////////////////////
// Limites do formulário
//////////////////////////////

export const USUARIO_SIMULADO = 'Portaria (usuário simulado)';

export const LIMITE_REINCIDENCIA = 3;

export const MOTIVOS_SEM_FOTO = ['Câmera indisponível', 'Aluno recusou', 'Outro'] as const;

export type OpcaoMotivoSemFoto = (typeof MOTIVOS_SEM_FOTO)[number];

export type ErrosCampos = Partial<Record<keyof FormularioRegistroAtraso, string>>;

const ORDEM_CAMPOS: Array<keyof FormularioRegistroAtraso> = [
  'nomeAluno',
  'curso',
  'periodo',
  'serieModulo',
  'turma',
  'sala',
  'motivo',
];

const TAMANHO_MAXIMO: Record<keyof FormularioRegistroAtraso, number> = {
  nomeAluno: 120,
  curso: 60,
  periodo: 60,
  serieModulo: 60,
  turma: 60,
  sala: 60,
  motivo: 500,
};
const TAMANHO_MINIMO_MOTIVO = 5;
const TAMANHO_MINIMO_JUSTIFICATIVA_ANULACAO = 5;
const TAMANHO_MAXIMO_JUSTIFICATIVA_ANULACAO = 300;

//////////////////////////////
// Padronização de texto
//////////////////////////////

export function normalizarTexto(texto: string) {
  return texto
    .replace(/[ºª°]/g, '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function limparEspacos(texto: string) {
  return texto.trim().replace(/\s+/g, ' ');
}

//////////////////////////////
// Datas e ano letivo
//////////////////////////////

export function obterAnoLetivo(data: Date) {
  return data.getFullYear();
}

const dois = (numero: number) => String(numero).padStart(2, '0');

export function obterChaveDataLocal(valor: string | Date) {
  const data = new Date(valor);
  return `${data.getFullYear()}-${dois(data.getMonth() + 1)}-${dois(data.getDate())}`;
}

//////////////////////////////
// Validação do formulário
//////////////////////////////

export function validarTextosObrigatorios<Campo extends string>(
  dados: Record<Campo, string>,
  tamanhos: Record<Campo, number>,
  campos: Campo[],
) {
  const erros: Partial<Record<Campo, string>> = {};
  campos.forEach((campo) => {
    const valor = limparEspacos(dados[campo]);
    if (!normalizarTexto(valor)) erros[campo] = 'Campo obrigatório.';
    else if (valor.length > tamanhos[campo])
      erros[campo] = `Use no máximo ${tamanhos[campo]} caracteres.`;
  });
  return erros;
}

export const MENSAGEM_NOME_INCOMPLETO = 'Informe nome e sobrenome.';

export const temNomeESobrenome = (nome: string) =>
  normalizarTexto(nome)
    .split(' ')
    .filter((palavra) => /\p{L}/u.test(palavra)).length >= 2;

export function validarCampos(formulario: FormularioRegistroAtraso): ErrosCampos {
  const erros: ErrosCampos = validarTextosObrigatorios(formulario, TAMANHO_MAXIMO, ORDEM_CAMPOS);
  if (!erros.nomeAluno && !temNomeESobrenome(formulario.nomeAluno))
    erros.nomeAluno = MENSAGEM_NOME_INCOMPLETO;
  if (!erros.motivo && limparEspacos(formulario.motivo).length < TAMANHO_MINIMO_MOTIVO)
    erros.motivo = `Descreva o motivo com pelo menos ${TAMANHO_MINIMO_MOTIVO} caracteres.`;
  return erros;
}

export function primeiroCampoComErro(erros: ErrosCampos) {
  return ORDEM_CAMPOS.find((campo) => erros[campo]) ?? null;
}

export function formularioPreenchido(formulario: FormularioRegistroAtraso, foto: string | null) {
  return Boolean(foto) || Object.values(formulario).some((valor) => valor.trim());
}

export function resolverMotivoSemFoto(opcao: OpcaoMotivoSemFoto | '', detalhe: string) {
  if (!opcao) return null;
  if (opcao !== 'Outro') return opcao;
  const texto = limparEspacos(detalhe);
  return texto ? `Outro: ${texto}` : null;
}

export function atingeLimiteReincidencia(quantidadeAnoComEsteRegistro: number) {
  return quantidadeAnoComEsteRegistro >= LIMITE_REINCIDENCIA;
}

//////////////////////////////
// Anulação
//////////////////////////////

export function validarJustificativaAnulacao(justificativa: string) {
  const texto = limparEspacos(justificativa);
  if (texto.length < TAMANHO_MINIMO_JUSTIFICATIVA_ANULACAO)
    return `Informe uma justificativa com pelo menos ${TAMANHO_MINIMO_JUSTIFICATIVA_ANULACAO} caracteres.`;
  if (texto.length > TAMANHO_MAXIMO_JUSTIFICATIVA_ANULACAO)
    return `Use no máximo ${TAMANHO_MAXIMO_JUSTIFICATIVA_ANULACAO} caracteres na justificativa.`;
  return null;
}

export function anularRegistro(
  registro: RegistroAtraso,
  justificativa: string,
  anuladoPor: string,
  agora: Date,
): RegistroAtraso {
  if (registro.anulacao) throw new Error('Registro já foi anulado.');
  const erro = validarJustificativaAnulacao(justificativa);
  if (erro) throw new Error(erro);
  return {
    ...registro,
    anulacao: {
      justificativa: limparEspacos(justificativa),
      anuladoEm: agora.toISOString(),
      anuladoPor,
    },
  };
}

//////////////////////////////
// Filtros e contagens do Dashboard
//////////////////////////////

export function registrosValidos(registros: RegistroAtraso[]) {
  return registros.filter((registro) => registro.anulacao === null);
}

interface FiltrosRegistros {
  curso?: string;
  periodo?: string;
  dataInicial?: string;
  dataFinal?: string;
  incluirAnulados?: boolean;
}

export function filtrarRegistros(registros: RegistroAtraso[], filtros: FiltrosRegistros) {
  return (filtros.incluirAnulados ? registros : registrosValidos(registros)).filter((registro) => {
    const data = obterChaveDataLocal(registro.registradoEm);
    return (
      (!filtros.curso || registro.curso === filtros.curso) &&
      (!filtros.periodo || registro.periodo === filtros.periodo) &&
      (!filtros.dataInicial || data >= filtros.dataInicial) &&
      (!filtros.dataFinal || data <= filtros.dataFinal)
    );
  });
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];

export function contarPorDiaSemana(registros: RegistroAtraso[]) {
  const quantidades = Array.from({ length: 7 }, () => 0);
  registros.forEach((registro) => {
    quantidades[new Date(registro.registradoEm).getDay()] += 1;
  });
  return ORDEM_DIAS.filter((dia) => (dia >= 1 && dia <= 5) || quantidades[dia] > 0).map((dia) => ({
    rotulo: DIAS_SEMANA[dia],
    quantidade: quantidades[dia],
  }));
}

const MINUTOS_POR_FAIXA = 15;

export function contarPorFaixaHorario(registros: RegistroAtraso[]) {
  const faixas = new Map<string, number>();
  registros.forEach((registro) => {
    const data = new Date(registro.registradoEm);
    const minuto = Math.floor(data.getMinutes() / MINUTOS_POR_FAIXA) * MINUTOS_POR_FAIXA;
    const rotulo = `${dois(data.getHours())}:${dois(minuto)}`;
    faixas.set(rotulo, (faixas.get(rotulo) ?? 0) + 1);
  });
  return [...faixas.entries()]
    .map(([rotulo, quantidade]) => ({ rotulo, quantidade }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo));
}

//////////////////////////////
// Criação do registro
//////////////////////////////

export function criarRegistroAtraso(
  formulario: FormularioRegistroAtraso,
  foto: string | null,
  motivoSemFoto: string | null,
  registradoPor: string,
  agora: Date,
  alunoId: string,
): NovoRegistroAtraso {
  return {
    id: crypto.randomUUID(),
    alunoId,
    nomeAluno: normalizarTexto(formulario.nomeAluno),
    curso: normalizarTexto(formulario.curso),
    serieModulo: normalizarTexto(formulario.serieModulo),
    turma: normalizarTexto(formulario.turma),
    sala: normalizarTexto(formulario.sala),
    periodo: normalizarTexto(formulario.periodo),
    motivo: formulario.motivo.trim(),
    exibicao: {
      nomeAluno: limparEspacos(formulario.nomeAluno),
      curso: limparEspacos(formulario.curso),
      serieModulo: limparEspacos(formulario.serieModulo),
      turma: limparEspacos(formulario.turma),
      sala: limparEspacos(formulario.sala),
      periodo: limparEspacos(formulario.periodo),
    },
    foto,
    motivoSemFoto: foto ? null : motivoSemFoto,
    registradoEm: agora.toISOString(),
    anoLetivo: obterAnoLetivo(agora),
    registradoPor,
    anulacao: null,
  };
}

//////////////////////////////
// Sugestões pelo último atraso
//////////////////////////////

export function maisRecentesPrimeiro(registros: RegistroAtraso[]) {
  return [...registros].sort((a, b) => b.registradoEm.localeCompare(a.registradoEm));
}

export function encontrarUltimoRegistroDe(registros: RegistroAtraso[], nomeAluno: string) {
  const chave = normalizarTexto(nomeAluno);
  return chave
    ? (maisRecentesPrimeiro(registrosValidos(registros)).find(
        (registro) => registro.nomeAluno === chave,
      ) ?? null)
    : null;
}

const camposSugeridos = ['curso', 'serieModulo', 'turma', 'sala', 'periodo'] as const;

export type ValoresSugeridos = Partial<
  Pick<FormularioRegistroAtraso, (typeof camposSugeridos)[number]>
>;

export function removerSugestao(
  sugeridos: ValoresSugeridos,
  campo: keyof FormularioRegistroAtraso,
) {
  if (!(campo in sugeridos)) return sugeridos;
  const restantes = { ...sugeridos };
  delete restantes[campo as keyof ValoresSugeridos];
  return restantes;
}

export function aplicarAlteracaoNome(
  formulario: FormularioRegistroAtraso,
  sugeridos: ValoresSugeridos,
  registros: RegistroAtraso[],
  nomeAluno: string,
) {
  const proximo = { ...formulario, nomeAluno };
  camposSugeridos.forEach((campo) => {
    if (sugeridos[campo] !== undefined && proximo[campo] === sugeridos[campo]) proximo[campo] = '';
  });

  const ultimo = encontrarUltimoRegistroDe(registros, nomeAluno);
  const proximosSugeridos: ValoresSugeridos = {};
  if (ultimo) {
    const valores = ultimo.exibicao;
    camposSugeridos.forEach((campo) => {
      if (!proximo[campo]) {
        proximo[campo] = valores[campo];
        proximosSugeridos[campo] = valores[campo];
      }
    });
  }
  return { formulario: proximo, sugeridos: proximosSugeridos };
}

//////////////////////////////
// Histórico do aluno
//////////////////////////////

export function buscarAlunosNoHistorico(
  registros: RegistroAtraso[],
  consulta: string,
  {
    incluirAnulados = false,
    nomes,
  }: { incluirAnulados?: boolean; nomes?: Map<string, string> } = {},
) {
  const termo = normalizarTexto(consulta);
  const alunos = new Map<
    string,
    {
      alunoId: string;
      nomeAluno: string;
      quantidade: number;
      ultimo: RegistroAtraso;
    }
  >();
  const considerados = incluirAnulados ? registros : registrosValidos(registros);
  maisRecentesPrimeiro(considerados).forEach((registro) => {
    let aluno = alunos.get(registro.alunoId);
    if (!aluno) {
      aluno = {
        alunoId: registro.alunoId,
        nomeAluno: registro.nomeAluno,
        quantidade: 0,
        ultimo: registro,
      };
      alunos.set(registro.alunoId, aluno);
    }
    if (registro.anulacao) return;
    if (aluno.quantidade === 0) aluno.ultimo = registro;
    aluno.quantidade += 1;
  });
  return [...alunos.values()].filter(
    (aluno) =>
      !termo ||
      aluno.nomeAluno.includes(termo) ||
      normalizarTexto(nomes?.get(aluno.alunoId) ?? '').includes(termo),
  );
}

export function resolverAlunoDoHistorico(registros: RegistroAtraso[], chave: string) {
  if (registros.some((registro) => registro.alunoId === chave)) return chave;
  const nome = normalizarTexto(chave);
  return (
    maisRecentesPrimeiro(registros).find((registro) => registro.nomeAluno === nome)?.alunoId ??
    chave
  );
}

export function obterHistoricoAluno(
  registros: RegistroAtraso[],
  alunoId: string,
  anoLetivo: number,
) {
  const historico = maisRecentesPrimeiro(
    registros.filter((registro) => registro.alunoId === alunoId),
  );
  const historicoValido = registrosValidos(historico);
  const anos = new Map<number, number>();
  historicoValido.forEach((registro) =>
    anos.set(registro.anoLetivo, (anos.get(registro.anoLetivo) ?? 0) + 1),
  );

  return {
    historico,
    total: historicoValido.length,
    quantidadeAnoAtual: anos.get(anoLetivo) ?? 0,
    ultimo: historicoValido[0] ?? historico[0] ?? null,
    porAno: [...anos.entries()]
      .map(([ano, quantidade]) => ({ ano, quantidade }))
      .sort((a, b) => b.ano - a.ano),
  };
}

export function obterAlunosComMaisAtrasos(registros: RegistroAtraso[], anoLetivo: number) {
  return buscarAlunosNoHistorico(
    registros.filter((registro) => registro.anoLetivo === anoLetivo),
    '',
  ).sort((a, b) => b.quantidade - a.quantidade);
}

//////////////////////////////
// Formatação para a tela
//////////////////////////////

export const pluralizar = (quantidade: number, singular: string, plural: string) =>
  `${quantidade} ${quantidade === 1 ? singular : plural}`;

export function formatarTurma(registro: Pick<RegistroAtraso, 'exibicao'>) {
  return `${registro.exibicao.serieModulo} ${registro.exibicao.turma}`;
}

export const formatarHora = (valor: Date | string) =>
  new Date(valor).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export const formatarDataHora = (valor: string) =>
  new Date(valor).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

//////////////////////////////
// Contagem e atraso repetido
//////////////////////////////

export function contarAtrasosNoAno(registros: RegistroAtraso[], anoLetivo: number) {
  const quantidades = new Map<string, number>();
  for (const registro of registrosValidos(registros))
    if (registro.anoLetivo === anoLetivo)
      quantidades.set(registro.alunoId, (quantidades.get(registro.alunoId) ?? 0) + 1);
  return quantidades;
}

export function encontrarRegistroMesmoDia(
  registros: RegistroAtraso[],
  alunoId: string | null,
  nomeAluno: string,
  agora: Date,
) {
  const hoje = obterChaveDataLocal(agora);
  const nome = normalizarTexto(nomeAluno);
  return (
    maisRecentesPrimeiro(registrosValidos(registros)).find(
      (registro) =>
        obterChaveDataLocal(registro.registradoEm) === hoje &&
        (registro.alunoId ? registro.alunoId === alunoId : registro.nomeAluno === nome),
    ) ?? null
  );
}
