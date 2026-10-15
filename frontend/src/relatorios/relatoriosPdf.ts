//////////////////////////////
// Relatórios em PDF do Dashboard e do Histórico, gerados no navegador.
// Usam o texto de `exibicao` e não levam fotos.
// As cores repetem os tokens de tema.css: se um token mudar, mude aqui também.
//////////////////////////////

import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import type { RegistroAtraso } from '../tipos/RegistroAtraso';
import { formatarHora, formatarTurma, normalizarTexto } from '../regras/regrasRegistroAtraso';

//////////////////////////////
// Dados recebidos pelos relatórios
//////////////////////////////

interface ItemDistribuicaoPdf {
  rotulo: string;
  quantidade: number;
}

interface FiltrosRelatorioPdf {
  dataInicial: string;
  dataFinal: string;
  curso: string;
  periodo: string;
}

interface AlunoRelatorioPdf {
  nomePadronizado: string;
  nome: string;
  curso: string;
  turma: string;
  total: number;
  anoAtual: number;
  totalAno: number;
  porAno: Array<{ ano: number; quantidade: number }>;
}

//////////////////////////////
// Constantes e cores
//////////////////////////////

const CABECALHO_REGISTROS = [
  'Data',
  'Hora',
  'Nome',
  'Curso',
  'Período',
  'Turma',
  'Sala',
  'Motivo',
  'Situação',
  'Justificativa da anulação',
];

const LIMITE_INFERIOR_PAGINA = 275;

type CorRgb = [number, number, number];

const COR_MARCA: CorRgb = [159, 29, 32];

const COR_PRIMARIA: CorRgb = [29, 79, 140];

const COR_PRIMARIA_SUAVE: CorRgb = [232, 240, 250];

const COR_TEXTO: CorRgb = [27, 37, 51];

const COR_TEXTO_SUAVE: CorRgb = [91, 103, 120];

const COR_BORDA: CorRgb = [221, 227, 234];
const COR_BRANCO: CorRgb = [255, 255, 255];

//////////////////////////////
// Textos e nomes de arquivo
//////////////////////////////

function formatarDataFiltro(chave: string) {
  const [ano, mes, dia] = chave.split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : chave;
}

function descreverFiltrosPdf(filtros: FiltrosRelatorioPdf) {
  return [
    `Datas: ${formatarDataFiltro(filtros.dataInicial)} a ${formatarDataFiltro(filtros.dataFinal)}`,
    `Curso: ${filtros.curso || 'Todos'}`,
    `Período: ${filtros.periodo || 'Todos'}`,
  ].join(' · ');
}

function criarLinhasRelatorio(registros: RegistroAtraso[]) {
  return registros.map((registro) => {
    const data = new Date(registro.registradoEm);
    return [
      data.toLocaleDateString('pt-BR'),
      formatarHora(data),
      registro.exibicao.nomeAluno,
      registro.exibicao.curso,
      registro.exibicao.periodo,
      formatarTurma(registro),
      registro.exibicao.sala,
      registro.motivo,
      registro.anulacao ? 'Anulado' : 'Válido',
      registro.anulacao?.justificativa ?? '',
    ];
  });
}

function descreverResumoPorAno(porAno: AlunoRelatorioPdf['porAno']) {
  return porAno.length
    ? porAno.map((item) => `${item.ano}: ${item.quantidade}`).join(' · ')
    : 'Nenhum atraso válido';
}

function criarNomeArquivoPainel(filtros: FiltrosRelatorioPdf) {
  const limpar = (chave: string) => chave.replace(/[^0-9-]/g, '') || 'sem-data';
  return `atrasos_${limpar(filtros.dataInicial)}_${limpar(filtros.dataFinal)}.pdf`;
}

function criarNomeArquivoHistorico(nomeAluno: string) {
  return `atrasos_${normalizarTexto(nomeAluno).replaceAll(' ', '-') || 'aluno'}.pdf`;
}

//////////////////////////////
// Desenho do documento
//////////////////////////////

function criarDocumento(titulo: string, subtitulo: string) {
  const documento = new jsPDF({
    format: 'a4',
    unit: 'mm',
    orientation: 'portrait',
    compress: true,
  });
  documento.setFillColor(...COR_MARCA);
  documento.rect(0, 0, 210, 29, 'F');
  documento.setTextColor(...COR_BRANCO);
  documento.setFont('helvetica', 'bold');
  documento.setFontSize(17);
  documento.text('ETEC', 15, 13);
  documento.setFontSize(11);
  documento.text(titulo, 15, 20);
  documento.setTextColor(...COR_TEXTO);
  documento.setFont('helvetica', 'normal');
  documento.setFontSize(8);
  documento.text(documento.splitTextToSize(subtitulo, 125), 15, 36);
  documento.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 195, 36, { align: 'right' });
  return documento;
}

function garantirEspaco(documento: jsPDF, y: number, altura: number) {
  if (y + altura <= LIMITE_INFERIOR_PAGINA) return y;
  documento.addPage();
  return 20;
}

function desenharGrafico(
  documento: jsPDF,
  titulo: string,
  itens: ItemDistribuicaoPdf[],
  inicioY: number,
) {
  let y = garantirEspaco(documento, inicioY, 12);
  documento.setTextColor(...COR_TEXTO);
  documento.setFont('helvetica', 'bold');
  documento.setFontSize(10);
  documento.text(titulo, 15, y);
  y += 6;
  documento.setFont('helvetica', 'normal');
  documento.setFontSize(8);
  if (!itens.length) {
    documento.text('Sem registros no filtro.', 15, y + 3.5);
    return y + 6;
  }
  const maior = Math.max(1, ...itens.map((item) => item.quantidade));
  itens.forEach((item) => {
    y = garantirEspaco(documento, y, 6);
    documento.setTextColor(...COR_TEXTO);
    documento.text(item.rotulo, 15, y + 3.5);
    documento.setFillColor(...COR_PRIMARIA_SUAVE);
    documento.roundedRect(38, y, 130, 4, 1, 1, 'F');
    if (item.quantidade > 0) {
      documento.setFillColor(...COR_PRIMARIA);
      documento.roundedRect(38, y, Math.max(2, (item.quantidade / maior) * 130), 4, 1, 1, 'F');
    }
    documento.text(String(item.quantidade), 177, y + 3.5, { align: 'right' });
    y += 6;
  });
  return y;
}

function adicionarTabela(
  documento: jsPDF,
  inicioY: number,
  cabecalho: string[],
  linhas: string[][],
) {
  autoTable(documento, {
    startY: garantirEspaco(documento, inicioY, 20),
    head: [cabecalho],
    body: linhas.length ? linhas : [[{ content: 'Nenhum registro.', colSpan: cabecalho.length }]],
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
      overflow: 'linebreak',
      textColor: COR_TEXTO,
      lineColor: COR_BORDA,
    },
    headStyles: { fillColor: COR_PRIMARIA, textColor: COR_BRANCO, fontStyle: 'bold' },
    margin: { top: 18, right: 12, bottom: 16, left: 12 },
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
  });
}

function numerarPaginas(documento: jsPDF) {
  const totalPaginas = documento.getNumberOfPages();
  for (let pagina = 1; pagina <= totalPaginas; pagina++) {
    documento.setPage(pagina);
    documento.setFont('helvetica', 'normal');
    documento.setFontSize(7);
    documento.setTextColor(...COR_TEXTO_SUAVE);
    documento.text(`Página ${pagina} de ${totalPaginas}`, 198, 290, { align: 'right' });
  }
}

//////////////////////////////
// Relatórios para baixar
//////////////////////////////

export function baixarPdfPainel(
  registros: RegistroAtraso[],
  filtros: FiltrosRelatorioPdf,
  totais: ItemDistribuicaoPdf[],
  dias: ItemDistribuicaoPdf[],
  horarios: ItemDistribuicaoPdf[],
) {
  const documento = criarDocumento('Relatório de atrasos', descreverFiltrosPdf(filtros));
  totais.forEach((total, indice) => {
    const x = 15 + indice * 45;
    documento.setFillColor(...COR_PRIMARIA_SUAVE);
    documento.roundedRect(x, 43, 40, 16, 2, 2, 'F');
    documento.setTextColor(...COR_PRIMARIA);
    documento.setFont('helvetica', 'bold');
    documento.setFontSize(14);
    documento.text(String(total.quantidade), x + 4, 52);
    documento.setTextColor(...COR_TEXTO_SUAVE);
    documento.setFont('helvetica', 'normal');
    documento.setFontSize(7);
    documento.text(total.rotulo, x + 4, 57);
  });
  let y = desenharGrafico(documento, 'Distribuição por dia da semana', dias, 68);
  y = desenharGrafico(documento, 'Distribuição por horário', horarios, y + 8);
  adicionarTabela(documento, y + 8, CABECALHO_REGISTROS, criarLinhasRelatorio(registros));
  numerarPaginas(documento);
  documento.save(criarNomeArquivoPainel(filtros));
}

export function baixarPdfHistorico(registros: RegistroAtraso[], aluno: AlunoRelatorioPdf) {
  const documento = criarDocumento(
    'Ficha do aluno',
    `${aluno.nome} · ${aluno.curso} · ${aluno.turma}`,
  );
  documento.setFont('helvetica', 'bold');
  documento.setFontSize(12);
  documento.text(`Total de atrasos: ${aluno.total}`, 15, 48);
  documento.text(`Atrasos em ${aluno.anoAtual}: ${aluno.totalAno}`, 15, 56);
  documento.setFont('helvetica', 'normal');
  documento.setFontSize(9);
  documento.text(`Por ano: ${descreverResumoPorAno(aluno.porAno)}`, 15, 63);
  const colunas = [0, 1, 3, 5, 6, 7, 8, 9];
  adicionarTabela(
    documento,
    70,
    colunas.map((indice) => CABECALHO_REGISTROS[indice]),
    criarLinhasRelatorio(registros).map((linha) => colunas.map((indice) => linha[indice])),
  );
  numerarPaginas(documento);
  documento.save(criarNomeArquivoHistorico(aluno.nomePadronizado));
}
