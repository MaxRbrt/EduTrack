//////////////////////////////
// Pedaços de esquema usados para validar o corpo e a URL das requisições.
//////////////////////////////

import { UUID } from '../servicos/armazemFotos.ts';

export const texto = (maximo: number, minimo = 1) =>
  ({ type: 'string', minLength: minimo, maxLength: maximo }) as const;

export const uuid = { type: 'string', pattern: `^${UUID}$` } as const;

export const fotoBase64 = { type: ['string', 'null'], maxLength: 400_000 } as const;

export const parametrosId = {
  type: 'object',
  required: ['id'],
  properties: { id: uuid },
} as const;
