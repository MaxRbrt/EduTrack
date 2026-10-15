//////////////////////////////
// Fila offline: atrasos guardados no navegador (IndexedDB) até chegarem ao
// servidor. Cada item sai daqui assim que o envio é confirmado.
// A remoção confere se o item não mudou em outra aba durante o envio.
//////////////////////////////

import { createStore, del, get, promisifyRequest, set, values } from 'idb-keyval';
import type { NovoAluno } from '../../tipos/Aluno';
import type { NovoRegistroAtraso } from '../../tipos/RegistroAtraso';

type EstadoItemFila = 'pendente' | 'recusado';

export interface ItemFila {
  registro: NovoRegistroAtraso;
  alunoNovo?: NovoAluno | null;
  estado: EstadoItemFila;
  mensagemErro: string | null;
  tentativas: number;
}

export interface FilaOffline {
  enfileirar(registro: NovoRegistroAtraso, alunoNovo?: NovoAluno | null): Promise<ItemFila>;
  listar(): Promise<ItemFila[]>;
  obter(id: string): Promise<ItemFila | undefined>;
  atualizar(item: ItemFila): Promise<void>;
  remover(id: string): Promise<void>;
  removerSeInalterado(id: string, registroEnviado: NovoRegistroAtraso): Promise<boolean>;
}

export function criarFilaOffline(): FilaOffline {
  const armazenamento = createStore('edutrack-fila', 'registros');
  return {
    enfileirar: async (registro, alunoNovo = null) => {
      const item: ItemFila = {
        registro,
        alunoNovo,
        estado: 'pendente',
        mensagemErro: null,
        tentativas: 0,
      };
      await set(registro.id, item, armazenamento);
      return item;
    },
    listar: async () =>
      (await values<ItemFila>(armazenamento)).sort((a, b) =>
        a.registro.registradoEm.localeCompare(b.registro.registradoEm),
      ),
    obter: (id) => get<ItemFila>(id, armazenamento),
    atualizar: (item) => set(item.registro.id, item, armazenamento),
    remover: (id) => del(id, armazenamento),
    removerSeInalterado: (id, registroEnviado) =>
      armazenamento('readwrite', async (loja) => {
        const item = await promisifyRequest<ItemFila | undefined>(loja.get(id));
        if (!item) return true;
        if (JSON.stringify(item.registro) !== JSON.stringify(registroEnviado)) return false;
        await promisifyRequest(loja.delete(id));
        return true;
      }),
  };
}
