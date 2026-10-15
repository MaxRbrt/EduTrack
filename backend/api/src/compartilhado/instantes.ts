//////////////////////////////
// Conferência dos horários enviados pelo navegador.
// O horário do atraso vem do navegador porque a fila offline envia depois o
// que foi registrado antes; por isso ele é aceito, mas dentro de limites:
// nada no futuro (com folga para relógio adiantado), nada antigo demais e o
// ano letivo precisa ser o ano do horário no fuso local de quem registrou.
//////////////////////////////

const FOLGA_RELOGIO_MS = 5 * 60 * 1000;
const IDADE_MAXIMA_MS = 30 * 24 * 60 * 60 * 1000;
// Maior diferença entre o UTC e um fuso real (de -12h a +14h).
const FOLGA_FUSO_MS = 14 * 60 * 60 * 1000;

const estaNoFuturo = (instante: Date, agora: Date) =>
  instante.getTime() > agora.getTime() + FOLGA_RELOGIO_MS;

export function validarRegistradoEm(registradoEm: Date, anoLetivo: number, agora: Date) {
  if (estaNoFuturo(registradoEm, agora)) return 'O horário do registro está no futuro.';
  if (registradoEm.getTime() < agora.getTime() - IDADE_MAXIMA_MS)
    return 'O registro é antigo demais para ser enviado.';
  const anoMinimo = new Date(registradoEm.getTime() - FOLGA_FUSO_MS).getUTCFullYear();
  const anoMaximo = new Date(registradoEm.getTime() + FOLGA_FUSO_MS).getUTCFullYear();
  if (anoLetivo < anoMinimo || anoLetivo > anoMaximo)
    return 'O ano letivo não corresponde ao horário do registro.';
  return null;
}

export function validarAnuladoEm(anuladoEm: Date, agora: Date) {
  return estaNoFuturo(anuladoEm, agora) ? 'O horário da anulação está no futuro.' : null;
}
