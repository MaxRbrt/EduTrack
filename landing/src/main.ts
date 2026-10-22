import gsap from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { iniciarAnimacoes } from './animacoes';
import type { Relogio } from './relogio3d';
import './estilos.css';

// ============================================================
// 1. PARTIDA DA PÁGINA
// Texto e animação sobem primeiro. Relógio 3D (three.js, maior peso do site)
// só baixa depois da primeira pintura, em arquivo separado.
// Sem WebGL ou falha no download = classe sem-webgl, mostra SVG reserva.
// Fonte carregada muda altura do texto: recalcula gatilhos depois.
// ============================================================

gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, MotionPathPlugin);
ScrollTrigger.config({ ignoreMobileResize: true });

const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.querySelector<HTMLCanvasElement>('.relogio-canvas');

const esperarPrimeiraPintura = (): Promise<void> =>
  new Promise((resolver) => requestAnimationFrame(() => setTimeout(resolver, 0)));

async function carregarRelogio(alvo: HTMLCanvasElement): Promise<Relogio | null> {
  try {
    await esperarPrimeiraPintura();
    const { criarRelogio } = await import('./relogio3d');
    return await criarRelogio(alvo, movimentoReduzido);
  } catch {
    return null;
  }
}

async function prepararRelogio(): Promise<Relogio | null> {
  const relogio = canvas ? await carregarRelogio(canvas) : null;

  if (!relogio) {
    document.documentElement.classList.add('sem-webgl');
  }

  return relogio;
}

iniciarAnimacoes(prepararRelogio(), movimentoReduzido);
document.fonts.ready.then(() => ScrollTrigger.refresh());
