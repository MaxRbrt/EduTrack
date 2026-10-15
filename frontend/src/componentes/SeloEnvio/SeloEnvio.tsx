//////////////////////////////
// Selo do registro que ainda não chegou ao servidor; enviado não mostra nada.
//////////////////////////////

import type { EnvioRegistro } from '../../tipos/RegistroAtraso';
import { Selo } from '../Selo/Selo';

export function SeloEnvio({ envio }: { envio: EnvioRegistro }) {
  if (envio === 'enviado') return null;
  return <Selo tom="alerta">{envio === 'pendente' ? 'Aguardando envio' : 'Envio recusado'}</Selo>;
}
