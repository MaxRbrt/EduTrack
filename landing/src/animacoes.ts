import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  iniciarAdesivos,
  iniciarHistorico,
  iniciarLetreiro,
  iniciarPainel,
  iniciarProjeto,
  iniciarRevelacao,
  iniciarRiscos,
  iniciarRodape,
  iniciarTitulos,
} from './animacoesSecoes';
import type { Relogio } from './relogio3d';

// ============================================================
// 1. CONSTANTES DA HISTÓRIA
// Topo começa 06:58, rolagem leva até 07:14. Portão fecha 07:00.
// Movimento reduzido = relógio parado 07:12, tudo no estado final.
// ============================================================

const MINUTO_INICIO = 6 * 60 + 58;
const MINUTO_FIM = 7 * 60 + 14;
const MINUTO_PORTAO = 7 * 60;
const MINUTO_ESTATICO = 7 * 60 + 12;
const TEXTO_BUSCA = 'joao vitr';
const TOTAL_PASSOS = 4;
const GIRO_DO_AVIAO = 38;
const ESCALA_MINIMA_APARELHO = 0.55;

function selecionar<T extends Element = HTMLElement>(seletor: string): T | null {
  return document.querySelector<T>(seletor);
}

function selecionarTodos<T extends Element = HTMLElement>(seletor: string): T[] {
  return Array.from(document.querySelectorAll<T>(seletor));
}

// ============================================================
// 2. TOPO: RELÓGIO, LEITURA E LOUSA
// Leitura mostra hora e estado do portão. Classe hero--atrasado pinta de vermelho.
// Entrada: título sobe, giz desenha rabiscos e circula "07:00".
// ============================================================

function formatarHora(minutosDoDia: number): string {
  const hora = Math.floor(minutosDoDia / 60);
  const minuto = Math.floor(minutosDoDia % 60);

  return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
}

function descreverPortao(minutosDeAtraso: number): string {
  if (minutosDeAtraso < 0) {
    return 'Portão aberto';
  }

  if (minutosDeAtraso === 0) {
    return 'Portão fechado agora';
  }

  return `Portão fechado há ${minutosDeAtraso} min`;
}

function atualizarLeitura(minutosDoDia: number): void {
  const hero = selecionar('.hero');
  const hora = selecionar('.leitura__hora');
  const estado = selecionar('.leitura__estado');
  const minutosDeAtraso = Math.floor(minutosDoDia) - MINUTO_PORTAO;

  if (!hero || !hora || !estado) {
    return;
  }

  hora.textContent = formatarHora(minutosDoDia);
  estado.textContent = descreverPortao(minutosDeAtraso);
  hero.classList.toggle('hero--atrasado', minutosDeAtraso >= 0);
}

function animarEntradaDoTopo(): void {
  const entrada = gsap.timeline({ defaults: { ease: 'expo.out', duration: 1.2 } });

  entrada
    .from('.hero__titulo .linha > span', { yPercent: 130, stagger: 0.12 })
    .from(
      '.hero__rotulo, .hero__lede, .hero__acoes',
      { y: 20, autoAlpha: 0, stagger: 0.08, duration: 1 },
      '-=0.9',
    )
    .from('.leitura', { y: 12, autoAlpha: 0, duration: 0.8 }, '-=0.7')
    .fromTo(
      '.rabisco',
      { drawSVG: '0%' },
      { drawSVG: '100%', duration: 0.7, stagger: 0.06, ease: 'power1.inOut' },
      0.6,
    )
    .from('.rabisco-texto', { autoAlpha: 0, duration: 0.8, stagger: 0.3 }, 1.2)
    .fromTo(
      '.circulo-giz path',
      { drawSVG: '0%' },
      { drawSVG: '100%', duration: 1.1, ease: 'power2.inOut' },
      0.9,
    );
}

function iniciarTopo(relogioPronto: Promise<Relogio | null>): void {
  const tempo = { minutos: MINUTO_INICIO };
  let relogio: Relogio | null = null;

  const aplicarTempo = (): void => {
    relogio?.definirMinutos(tempo.minutos);
    atualizarLeitura(tempo.minutos);
  };

  relogioPronto.then((relogioCriado) => {
    relogio = relogioCriado;
    aplicarTempo();
  });

  animarEntradaDoTopo();
  aplicarTempo();

  gsap.to(tempo, {
    minutos: MINUTO_FIM,
    ease: 'none',
    onUpdate: aplicarTempo,
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: '+=110%',
      pin: true,
      scrub: 0.8,
      onUpdate: (gatilho) => {
        selecionar('.hero')?.classList.toggle('hero--rolou', gatilho.progress > 0.02);
      },
    },
  });
}

function iniciarTopoParado(relogioPronto: Promise<Relogio | null>): void {
  atualizarLeitura(MINUTO_ESTATICO);
  relogioPronto.then((relogio) => relogio?.definirMinutos(MINUTO_ESTATICO));
}

// ============================================================
// 3. PORTARIA: QUATRO PASSOS COM TELA FIXA
// Seção presa na tela, rolagem troca passo. Clique no passo rola até ele.
// Detalhe de cada tela (flash, digitação, check) segue rolagem.
// Tela baixa: palco presa não pode passar da janela, senão pedaço some.
// Tablet encolhe inteiro (zoom, conteúdo junto) até caber. Refeito a cada refresh.
// ============================================================

function ajustarAparelho(): void {
  const palco = selecionar('.portaria__palco');
  const dentro = selecionar('.portaria__dentro');
  const aparelho = selecionar('.aparelho');

  if (!palco || !dentro || !aparelho) {
    return;
  }

  aparelho.style.setProperty('zoom', '1');

  const estilo = getComputedStyle(palco);
  const espacoVertical = parseFloat(estilo.paddingTop) + parseFloat(estilo.paddingBottom);
  const sobra = dentro.offsetHeight + espacoVertical - window.innerHeight;

  if (sobra <= 0) {
    return;
  }

  const altura = aparelho.offsetHeight;
  const escala = Math.max(ESCALA_MINIMA_APARELHO, (altura - sobra) / altura);
  aparelho.style.setProperty('zoom', escala.toFixed(3));
}

function mostrarPasso(indice: number): void {
  selecionarTodos('.passo').forEach((passo, posicao) => {
    passo.classList.toggle('ativo', posicao === indice);
  });

  selecionarTodos('.tela-passo').forEach((tela, posicao) => {
    tela.classList.toggle('ativa', posicao === indice);
  });
}

function aoClicarPasso(acao: (indice: number) => void): void {
  selecionarTodos('.passo').forEach((passo, indice) => {
    passo.querySelector('button')?.addEventListener('click', () => acao(indice));
  });
}

function escreverBusca(letras: number): void {
  const texto = selecionar('.busca__texto');

  if (texto) {
    texto.textContent = TEXTO_BUSCA.slice(0, Math.round(letras));
  }
}

function montarLinhaDaPortaria(linha: gsap.core.Timeline): void {
  const digitacao = { letras: 0 };

  linha
    .fromTo('.camera__flash', { opacity: 0 }, { opacity: 0.85, duration: 0.05 }, 0.4)
    .to('.camera__flash', { opacity: 0, duration: 0.25 }, 0.45)
    .to(
      digitacao,
      {
        letras: TEXTO_BUSCA.length,
        duration: 0.5,
        onUpdate: () => escreverBusca(digitacao.letras),
      },
      1.1,
    )
    .from('.resultado', { autoAlpha: 0, y: 8, stagger: 0.1, duration: 0.2 }, 1.45)
    .from('.app__nota', { autoAlpha: 0, duration: 0.2 }, 1.7)
    .from(
      '.motivo--escolhido',
      { backgroundColor: '#ffffff', color: '#1b2533', borderColor: '#dde3ea', duration: 0.15 },
      2.4,
    )
    .fromTo(
      '.sucesso__circulo',
      { strokeDashoffset: 1 },
      { strokeDashoffset: 0, duration: 0.3 },
      3.1,
    )
    .fromTo('.sucesso__check', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.2 }, 3.3)
    .from('.aviso-reincidencia', { autoAlpha: 0, y: 10, duration: 0.2 }, 3.45)
    .fromTo('.desfazer__barra', { scaleX: 1 }, { scaleX: 0, duration: 0.5 }, 3.5)
    .to({}, { duration: 0 }, TOTAL_PASSOS);
}

function iniciarPortaria(): void {
  ajustarAparelho();
  ScrollTrigger.addEventListener('refreshInit', ajustarAparelho);

  const linha = gsap.timeline({
    defaults: { ease: 'none' },
    onUpdate: () => {
      const indice = Math.min(TOTAL_PASSOS - 1, Math.floor(linha.time() + 0.1));
      mostrarPasso(indice);
    },
    scrollTrigger: {
      trigger: '.portaria__palco',
      start: 'top top',
      end: '+=320%',
      pin: true,
      scrub: 0.6,
    },
  });

  montarLinhaDaPortaria(linha);

  aoClicarPasso((indice) => {
    const gatilho = linha.scrollTrigger;

    if (!gatilho) {
      return;
    }

    const fracao = (indice + 0.5) / TOTAL_PASSOS;
    const destino = gatilho.start + (gatilho.end - gatilho.start) * fracao;
    window.scrollTo({ top: destino, behavior: 'smooth' });
  });
}

function iniciarPortariaParada(): void {
  escreverBusca(TEXTO_BUSCA.length);
  aoClicarPasso(mostrarPasso);
}

// ============================================================
// 4. SEM INTERNET: FILA E AVIÕES DE PAPEL
// Rota = curva do card da portaria até o servidor, refeita quando o tamanho muda.
// Sem conexão: registro entra na fila. Conexão volta: cada registro some
// e um avião de papel leva ele pela rota. Avião chega = contador sobe.
// ============================================================

function pontoNoMeio(
  caixa: DOMRect,
  referencia: DOMRect,
  fracaoX: number,
): { x: number; y: number } {
  return {
    x: caixa.left - referencia.left + caixa.width * fracaoX,
    y: caixa.top - referencia.top + caixa.height / 2,
  };
}

function desenharRota(): void {
  const fila = selecionar('.fila');
  const lado = selecionar('.fila__lado');
  const servidor = selecionar('.fila__servidor');
  const rota = selecionar<SVGSVGElement>('.fila__rota');

  if (!fila || !lado || !servidor || !rota) {
    return;
  }

  const referencia = fila.getBoundingClientRect();
  const inicio = pontoNoMeio(lado.getBoundingClientRect(), referencia, 0.7);
  const fim = pontoNoMeio(servidor.getBoundingClientRect(), referencia, 0.5);
  const curvaX = (inicio.x + fim.x) / 2 + (fim.y - inicio.y) * 0.45;
  const curvaY = (inicio.y + fim.y) / 2 - (fim.x - inicio.x) * 0.45;
  const caminho = `M${inicio.x} ${inicio.y} Q${curvaX} ${curvaY} ${fim.x} ${fim.y}`;

  rota.setAttribute('viewBox', `0 0 ${referencia.width} ${referencia.height}`);
  rota.querySelectorAll('path').forEach((trecho) => trecho.setAttribute('d', caminho));
}

function observarRota(): void {
  const fila = selecionar('.fila');

  if (fila) {
    new ResizeObserver(desenharRota).observe(fila);
  }
}

function definirConexao(online: boolean): void {
  const fila = selecionar('.fila');
  const texto = selecionar('.fila__status-texto');

  fila?.classList.toggle('fila--online', online);

  if (texto) {
    texto.textContent = online ? 'Conexão de volta' : 'Sem conexão';
  }
}

function prepararFila(): void {
  const contador = selecionar('.fila__contador strong');

  desenharRota();
  definirConexao(false);
  selecionar('.fila')?.classList.remove('fila--concluida');

  if (contador) {
    contador.textContent = '0';
  }
}

function enviarItem(
  linha: gsap.core.Timeline,
  item: HTMLElement,
  aviao: HTMLElement,
  posicao: number,
): void {
  const contador = selecionar('.fila__contador strong');
  const momento = posicao === 0 ? '+=0.3' : '-=0.5';

  linha
    .to(item, { autoAlpha: 0, scale: 0.85, duration: 0.25, ease: 'power2.in' }, momento)
    .fromTo(aviao, { autoAlpha: 0, scale: 1 }, { autoAlpha: 1, duration: 0.1 }, '<')
    .to(
      aviao,
      {
        motionPath: {
          path: '.fila__rota-trilha',
          align: '.fila__rota-trilha',
          alignOrigin: [0.5, 0.5],
          autoRotate: GIRO_DO_AVIAO,
        },
        duration: 0.9,
        ease: 'power1.inOut',
      },
      '<',
    )
    .to(aviao, {
      autoAlpha: 0,
      scale: 0.4,
      duration: 0.15,
      onComplete: () => {
        if (contador) {
          contador.textContent = String(posicao + 1);
        }
      },
    });
}

function criarAnimacaoFila(): gsap.core.Timeline {
  const itens = selecionarTodos('.fila__item');
  const avioes = selecionarTodos('.aviaozinho');
  const linha = gsap.timeline({ paused: true });

  linha
    .call(prepararFila, [], 0)
    .set(itens, { scale: 1, autoAlpha: 0 }, 0)
    .fromTo(
      itens,
      { y: 10, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, stagger: 0.45, duration: 0.4, ease: 'back.out(2)' },
      0.3,
    )
    .call(definirConexao, [true], '+=0.7')
    .fromTo('.fila__fio span', { scale: 0 }, { scale: 1, duration: 0.5, ease: 'power2.out' })
    .fromTo('.fila__rota-trilha', { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.6 }, '<');

  itens.forEach((item, posicao) => enviarItem(linha, item, avioes[posicao], posicao));

  linha.call(() => selecionar('.fila')?.classList.add('fila--concluida'));

  return linha;
}

function iniciarFila(): void {
  const animacao = criarAnimacaoFila();
  const recomecar = (): void => {
    animacao.invalidate().restart();
  };

  gsap.set('.fila__item', { autoAlpha: 0 });
  observarRota();

  ScrollTrigger.create({
    trigger: '.fila',
    start: 'top 75%',
    once: true,
    onEnter: recomecar,
  });

  selecionar('.offline__repetir')?.addEventListener('click', recomecar);
}

function iniciarFilaParada(): void {
  const contador = selecionar('.fila__contador strong');

  observarRota();
  definirConexao(true);
  gsap.set('.fila__item', { autoAlpha: 0 });
  selecionar('.fila')?.classList.add('fila--concluida');

  if (contador) {
    contador.textContent = '3';
  }
}

// ============================================================
// 5. CABEÇALHO
// Fica branco quando a lousa sai de baixo dele.
// ============================================================

function iniciarCabecalho(): void {
  const cabecalho = selecionar('.cabecalho');

  ScrollTrigger.create({
    trigger: '.portaria',
    start: 'top 66px',
    onEnter: () => cabecalho?.classList.add('cabecalho--claro'),
    onLeaveBack: () => cabecalho?.classList.remove('cabecalho--claro'),
  });
}

// ============================================================
// 6. ENTRADA
// Gatilho criado de cima pra baixo: ordem certa pro cálculo dos pinos.
// Título e rodapé quebram em palavra/letra só depois da fonte carregar.
// ============================================================

export function iniciarAnimacoes(
  relogioPronto: Promise<Relogio | null>,
  movimentoReduzido: boolean,
): void {
  if (movimentoReduzido) {
    iniciarTopoParado(relogioPronto);
    iniciarPortariaParada();
    iniciarFilaParada();
    iniciarCabecalho();
    return;
  }

  iniciarTopo(relogioPronto);
  iniciarLetreiro();
  iniciarPortaria();
  iniciarCabecalho();
  iniciarAdesivos();
  iniciarRevelacao();
  iniciarPainel();
  iniciarFila();
  iniciarHistorico();
  iniciarRiscos();
  iniciarProjeto();

  document.fonts.ready.then(() => {
    iniciarTitulos();
    iniciarRodape();
  });
}
