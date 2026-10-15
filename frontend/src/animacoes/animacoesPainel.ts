//////////////////////////////
// Animações do Dashboard: números que contam e barras que crescem.
// Só é carregado quando o Dashboard precisa, para a biblioteca GSAP ficar
// fora do pacote principal. Com movimento reduzido, tudo aparece pronto.
//////////////////////////////

import { gsap } from 'gsap';

const CONDICOES = {
  comMovimento: '(prefers-reduced-motion: no-preference)',
  reduzido: '(prefers-reduced-motion: reduce)',
};

export function animarNumero(valorFinal: number, aoAtualizar: (valor: number) => void) {
  const contextoMidia = gsap.matchMedia();
  contextoMidia.add(CONDICOES, (contexto) => {
    if (contexto.conditions?.reduzido) {
      aoAtualizar(valorFinal);
      return;
    }
    const contador = { valor: 0 };
    gsap.to(contador, {
      valor: valorFinal,
      duration: 0.6,
      ease: 'power2.out',
      snap: { valor: 1 },
      onUpdate: () => aoAtualizar(contador.valor),
    });
  });
  return () => contextoMidia.revert();
}

export function animarBarras(conteiner: HTMLElement) {
  const contextoMidia = gsap.matchMedia(conteiner);
  contextoMidia.add(CONDICOES.comMovimento, () => {
    gsap.from('[data-barra]', {
      scaleX: 0,
      transformOrigin: 'left center',
      duration: 0.4,
      stagger: 0.04,
      ease: 'power2.out',
    });
  });
  return () => contextoMidia.revert();
}
