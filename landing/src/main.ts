import gsap from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { iniciarAnimacoes } from './animacoes';
import { criarRelogio, type Relogio } from './relogio3d';
import './estilos.css';

// ============================================================
// 1. PARTIDA DA PÁGINA
// Relógio 3D carrega em paralelo. Sem WebGL = classe sem-webgl, mostra SVG reserva.
// Fonte carregada muda altura do texto: recalcula gatilhos depois.
// ============================================================

gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, MotionPathPlugin);
ScrollTrigger.config({ ignoreMobileResize: true });

const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.querySelector<HTMLCanvasElement>('.relogio-canvas');

async function prepararRelogio(): Promise<Relogio | null> {
  const relogio = canvas ? await criarRelogio(canvas, movimentoReduzido) : null;

  if (!relogio) {
    document.documentElement.classList.add('sem-webgl');
  }

  return relogio;
}

iniciarAnimacoes(prepararRelogio(), movimentoReduzido);
document.fonts.ready.then(() => ScrollTrigger.refresh());
