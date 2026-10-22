import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

// ============================================================
// 1. CONSTANTES
// Animação das seções abaixo da portaria. Só roda sem movimento reduzido:
// estado final de tudo já vem pronto no CSS.
// ============================================================

const formatoNumero = new Intl.NumberFormat('pt-BR');
const TEMPO_VOLTA_LETREIRO = 34;

// ============================================================
// 2. LETREIRO AMARELO
// Corre sozinho. Rolagem rápida acelera e inclina; rolar pra cima inverte.
// totalTime alto no início = espaço pra andar de ré sem bater no zero.
// ============================================================

function acelerarLetreiro(corrida: gsap.core.Tween, direcao: number, impulso: number): void {
  gsap.to(corrida, {
    timeScale: direcao * impulso,
    duration: 0.2,
    overwrite: true,
    onComplete: () => {
      gsap.to(corrida, { timeScale: direcao, duration: 1.2, ease: 'power2.out' });
    },
  });
}

export function iniciarLetreiro(): void {
  const trilho = document.querySelector<HTMLElement>('.letreiro__trilho');

  if (!trilho) {
    return;
  }

  const corrida = gsap.to(trilho, {
    xPercent: -50,
    ease: 'none',
    duration: TEMPO_VOLTA_LETREIRO,
    repeat: -1,
  });
  const inclinar = gsap.quickTo(trilho, 'skewX', { duration: 0.5, ease: 'power3' });
  const endireitar = gsap.delayedCall(0.2, () => inclinar(0)).pause();

  corrida.totalTime(TEMPO_VOLTA_LETREIRO * 200);

  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (gatilho) => {
      const velocidade = gatilho.getVelocity();
      const impulso = 1 + Math.min(Math.abs(velocidade) / 250, 6);

      acelerarLetreiro(corrida, gatilho.direction, impulso);
      inclinar(gsap.utils.clamp(-8, 8, velocidade / -150));
      endireitar.restart(true);
    },
  });
}

// ============================================================
// 3. TÍTULOS E BLOCOS
// Título: palavra sobe de dentro da máscara com quique. Chamar depois da fonte.
// Bloco data-revelar: sobe e aparece ao entrar na tela.
// ============================================================

export function iniciarTitulos(): void {
  gsap.utils.toArray<HTMLElement>('.titulo-secao').forEach((titulo) => {
    SplitText.create(titulo, {
      type: 'words',
      mask: 'words',
      onSplit: (partes) =>
        gsap.from(partes.words, {
          yPercent: 115,
          rotation: 4,
          duration: 0.9,
          ease: 'back.out(1.5)',
          stagger: 0.07,
          scrollTrigger: { trigger: titulo, start: 'top 85%', once: true },
        }),
    });
  });
}

export function iniciarRevelacao(): void {
  const blocos = gsap.utils.toArray<HTMLElement>('[data-revelar]');

  gsap.set(blocos, { autoAlpha: 0, y: 28 });

  ScrollTrigger.batch(blocos, {
    start: 'top 85%',
    once: true,
    onEnter: (entrando) => {
      gsap.to(entrando, { autoAlpha: 1, y: 0, stagger: 0.1, duration: 0.9, ease: 'power3.out' });
    },
  });
}

// ============================================================
// 4. ADESIVOS
// Cada adesivo anda na rolagem em velocidade própria (data-paralaxe) e flutua.
// Ônibus atravessa o caderno da esquerda pra direita.
// ============================================================

function flutuar(imagem: Element, indice: number): void {
  const sentido = indice % 2 === 0 ? 1 : -1;

  gsap.to(imagem, {
    y: -12,
    rotation: 5 * sentido,
    duration: 2.4 + (indice % 3) * 0.6,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });
}

function deslocarNaRolagem(adesivo: HTMLElement): void {
  const velocidade = Number(adesivo.dataset.paralaxe ?? 0);
  const area = adesivo.closest('section, footer') ?? adesivo;

  gsap.fromTo(
    adesivo,
    { y: velocidade * 100, rotation: -6 * velocidade },
    {
      y: velocidade * -100,
      rotation: 6 * velocidade,
      ease: 'none',
      scrollTrigger: { trigger: area, start: 'top bottom', end: 'bottom top', scrub: true },
    },
  );
}

export function iniciarAdesivos(): void {
  gsap.utils.toArray<HTMLElement>('.adesivo').forEach((adesivo, indice) => {
    deslocarNaRolagem(adesivo);
    flutuar(adesivo.querySelector('img') ?? adesivo, indice);
  });

  gsap.fromTo(
    '.adesivo--onibus',
    { x: '-30vw' },
    {
      x: '30vw',
      ease: 'none',
      scrollTrigger: { trigger: '.historico', start: 'top bottom', end: 'bottom top', scrub: true },
    },
  );
}

// ============================================================
// 5. COORDENAÇÃO: PAINEL QUE SE MONTA
// Barra sobe, número conta, reincidente entra, linha do mês se desenha. Só uma vez.
// ============================================================

function contarNumeros(linha: gsap.core.Timeline): void {
  gsap.utils.toArray<HTMLElement>('[data-contar]').forEach((elemento) => {
    const alvo = Number(elemento.dataset.contar);
    const contador = { valor: 0 };

    linha.to(
      contador,
      {
        valor: alvo,
        duration: 1.4,
        ease: 'power2.out',
        onUpdate: () => {
          elemento.textContent = formatoNumero.format(Math.round(contador.valor));
        },
      },
      0,
    );
  });
}

export function iniciarPainel(): void {
  const linha = gsap.timeline({
    scrollTrigger: { trigger: '.navegador', start: 'top 70%', once: true },
  });

  linha
    .from('.barras i', {
      scaleY: 0,
      transformOrigin: '50% 100%',
      stagger: 0.07,
      duration: 0.9,
      ease: 'back.out(1.4)',
    })
    .from('.reincidentes li', { autoAlpha: 0, x: -12, stagger: 0.08, duration: 0.5 }, 0.25)
    .fromTo(
      '.grafico-linha__traco',
      { drawSVG: '0%' },
      { drawSVG: '100%', duration: 1.4, ease: 'power2.inOut' },
      0.3,
    )
    .from('.grafico-linha__area', { autoAlpha: 0, duration: 0.8 }, 1.1)
    .from(
      '.grafico-linha__ponto',
      { scale: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'back.out(3)' },
      1.6,
    );

  contarNumeros(linha);
}

// ============================================================
// 6. HISTÓRICO: CADERNO E LÁPIS
// Linhas e margem do caderno se desenham. Lápis desce, risca o registro anulado
// junto com a linha vermelha, sobe e some. Depois selo e justificativa.
// ============================================================

export function iniciarHistorico(): void {
  const risco = document.querySelector<HTMLElement>('.registro__risco');
  const larguraDoRisco = (): number => risco?.offsetWidth ?? 0;

  const linha = gsap.timeline({
    scrollTrigger: { trigger: '.historico', start: 'top 65%', once: true },
  });

  linha
    .from('.caderno__linhas', {
      scaleX: 0,
      transformOrigin: '0% 50%',
      duration: 1.2,
      ease: 'power2.out',
    })
    .from(
      '.caderno__margem',
      { scaleY: 0, transformOrigin: '50% 0%', duration: 0.9, ease: 'power2.out' },
      0.2,
    )
    .from('.registro', { autoAlpha: 0, y: 14, stagger: 0.1, duration: 0.5 }, 0.4)
    .fromTo('.lapis-risco', { autoAlpha: 0, x: 0, y: -18 }, { autoAlpha: 1, y: 0, duration: 0.35 })
    .addLabel('riscar')
    .fromTo(
      '.registro__risco',
      { scaleX: 0 },
      { scaleX: 1, duration: 0.9, ease: 'power1.inOut' },
      'riscar',
    )
    .to('.lapis-risco', { x: larguraDoRisco, duration: 0.9, ease: 'power1.inOut' }, 'riscar')
    .to('.lapis-risco', { autoAlpha: 0, y: -24, duration: 0.3 })
    .from('.selo-anulado', { scale: 0.6, autoAlpha: 0, duration: 0.4, ease: 'back.out(2)' }, '<')
    .from('.registro__motivo', { autoAlpha: 0, y: -6, duration: 0.4 });
}

// ============================================================
// 7. O QUE NÃO É: RISCO À MÃO
// Risco amarelo segue rolagem e apaga a palavra. Terminou de riscar = tremidinha.
// ============================================================

function tremer(palavra: Element): void {
  gsap.fromTo(
    palavra,
    { rotation: 0 },
    {
      keyframes: { rotation: [0, -2.5, 2, -1, 0] },
      duration: 0.5,
      ease: 'none',
      transformOrigin: '50% 60%',
    },
  );
}

function riscarItem(item: HTMLElement): void {
  const traco = item.querySelector('.risco-mao path');
  const palavra = item.querySelector('span');

  if (!traco || !palavra) {
    return;
  }

  gsap
    .timeline({
      scrollTrigger: { trigger: item, start: 'top 80%', end: 'top 50%', scrub: 0.4 },
    })
    .fromTo(traco, { drawSVG: '0%' }, { drawSVG: '100%', ease: 'none' })
    .to(palavra, { opacity: 0.6, ease: 'none' }, 0);

  ScrollTrigger.create({
    trigger: item,
    start: 'top 50%',
    once: true,
    onEnter: () => tremer(palavra),
  });
}

export function iniciarRiscos(): void {
  gsap.utils.toArray<HTMLElement>('.nao-e__lista li').forEach(riscarItem);
}

// ============================================================
// 8. SITUAÇÃO DO PROJETO E RODAPÉ
// Cartão da pilha cai girando e encaixa. Rodapé: letra por letra.
// ============================================================

export function iniciarProjeto(): void {
  gsap.from('.pilha__camada, .pilha__acao', {
    autoAlpha: 0,
    y: 48,
    rotation: (indice: number) => (indice % 2 === 0 ? -6 : 6),
    stagger: 0.12,
    duration: 0.75,
    ease: 'back.out(1.7)',
    scrollTrigger: { trigger: '.projeto__grade', start: 'top 72%', once: true },
  });
}

export function iniciarRodape(): void {
  SplitText.create('.rodape__frase', {
    type: 'words, chars',
    onSplit: (partes) =>
      gsap.from(partes.chars, {
        yPercent: 120,
        rotation: 12,
        autoAlpha: 0,
        stagger: 0.03,
        duration: 0.7,
        ease: 'back.out(2)',
        scrollTrigger: { trigger: '.rodape', start: 'top 80%', once: true },
      }),
  });
}
