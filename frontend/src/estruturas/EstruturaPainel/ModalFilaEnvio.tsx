//////////////////////////////
// Modal com os registros que ainda não chegaram ao servidor.
// Abre pelo aviso "aguardando envio" do cabeçalho ou ao tentar sair.
// Registro recusado pode ser enviado de novo ou descartado; descartar
// pede confirmação porque o registro só existe neste computador.
//////////////////////////////

import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Botao } from '../../componentes/Botao/Botao';
import { Modal } from '../../componentes/Modal/Modal';
import { SeloEnvio } from '../../componentes/SeloEnvio/SeloEnvio';
import { useDadosEscola } from '../../contextos/ContextoDadosEscola/ContextoDadosEscola';
import { formatarDataHora } from '../../regras/regrasRegistroAtraso';

interface PropriedadesModalFilaEnvio {
  aberto: boolean;
  titulo: string;
  descricao: string;
  aoFechar: () => void;
}

export function ModalFilaEnvio({
  aberto,
  titulo,
  descricao,
  aoFechar,
}: PropriedadesModalFilaEnvio) {
  const { registrosAtraso, sincronizarAgora, reenviarRegistro, descartarRegistro } =
    useDadosEscola();
  const [enviando, definirEnviando] = useState(false);
  const [confirmandoDescarte, definirConfirmandoDescarte] = useState<string | null>(null);
  const naFila = registrosAtraso.filter((registro) => registro.envio !== 'enviado');

  const enviarAgora = async () => {
    definirEnviando(true);
    try {
      await sincronizarAgora();
    } finally {
      definirEnviando(false);
    }
  };

  return (
    <Modal
      aberto={aberto}
      titulo={titulo}
      descricao={descricao}
      tom="alerta"
      aoFechar={aoFechar}
      acoes={
        <>
          <Botao variante="fantasma" onClick={aoFechar}>
            Fechar
          </Botao>
          <Botao onClick={() => void enviarAgora()} disabled={enviando || naFila.length === 0}>
            {enviando ? 'Enviando...' : 'Enviar agora'}
          </Botao>
        </>
      }
    >
      <ul className="m-0 flex list-none flex-col divide-y divide-borda p-0">
        {naFila.map((registro) => (
          <li key={registro.id} className="flex flex-col gap-2 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-sm text-texto">{registro.exibicao.nomeAluno}</strong>
              <span className="text-sm text-texto-suave tabular-nums">
                {formatarDataHora(registro.registradoEm)}
              </span>
              <SeloEnvio envio={registro.envio} />
            </div>
            {registro.envio === 'recusado' && (
              <div className="flex flex-wrap gap-2">
                <Botao variante="secundario" onClick={() => void reenviarRegistro(registro.id)}>
                  Tentar de novo
                </Botao>
                {confirmandoDescarte === registro.id ? (
                  <Botao variante="perigo" onClick={() => void descartarRegistro(registro.id)}>
                    <Trash2 size={16} aria-hidden />
                    Confirmar descarte
                  </Botao>
                ) : (
                  <Botao
                    variante="fantasma"
                    onClick={() => definirConfirmandoDescarte(registro.id)}
                  >
                    Descartar
                  </Botao>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </Modal>
  );
}
