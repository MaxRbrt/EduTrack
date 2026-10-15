//////////////////////////////
// Prévia da webcam com os botões de ativar, capturar e tirar de novo.
// A câmera só liga quando a pessoa pede e é desligada ao sair da tela,
// para a luz apagar. A foto sai espelhada, igual à prévia, e é reduzida
// e comprimida em JPEG para ficar leve.
//////////////////////////////

import { Camera, CameraOff, RefreshCw, ShieldAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { calcularDimensoesFoto, QUALIDADE_FOTO } from '../../regras/regrasFoto';
import { Botao } from '../Botao/Botao';

export type EstadoCamera = 'desligada' | 'aberta' | 'capturada';

interface PropriedadesCapturaCamera {
  aoCapturar: (foto: string | null) => void;
  aoMudarEstado?: (estado: EstadoCamera) => void;
  pedidoAtivacao?: number;
}

function mensagemErroCamera(erro: unknown) {
  const nome = erro instanceof DOMException ? erro.name : '';
  if (nome === 'NotAllowedError' || nome === 'SecurityError')
    return 'Permissão da câmera negada. Libere o acesso no ícone de cadeado da barra de endereço e tente novamente.';
  if (nome === 'NotFoundError' || nome === 'OverconstrainedError')
    return 'Nenhuma câmera encontrada. Verifique se ela está conectada ao computador.';
  if (nome === 'NotReadableError' || nome === 'AbortError')
    return 'A câmera está em uso por outro programa. Feche-o e tente novamente.';
  return 'Não foi possível acessar a câmera. Tente novamente.';
}

export function CapturaCamera({
  aoCapturar,
  aoMudarEstado,
  pedidoAtivacao = 0,
}: PropriedadesCapturaCamera) {
  const referenciaContainer = useRef<HTMLDivElement>(null);
  const referenciaVideo = useRef<HTMLVideoElement>(null);
  const referenciaFluxo = useRef<MediaStream | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const [estado, setEstado] = useState<'parado' | 'carregando' | 'erro'>('parado');
  const [mensagem, setMensagem] = useState('');
  const referenciaDesmontado = useRef(false);

  const pararCamera = () => {
    referenciaFluxo.current?.getTracks().forEach((faixa) => faixa.stop());
    referenciaFluxo.current = null;
    if (referenciaVideo.current) referenciaVideo.current.srcObject = null;
  };
  const iniciarCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setEstado('erro');
      setMensagem('Este navegador não oferece acesso à câmera. Use um navegador atualizado.');
      return;
    }
    setEstado('carregando');
    setMensagem('Solicitando acesso à câmera...');
    try {
      const fluxo = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      if (referenciaDesmontado.current) {
        fluxo.getTracks().forEach((faixa) => faixa.stop());
        return;
      }
      referenciaFluxo.current = fluxo;
      if (referenciaVideo.current) {
        referenciaVideo.current.srcObject = fluxo;
        await referenciaVideo.current.play();
      }
      setEstado('parado');
      setMensagem('Câmera pronta. Clique em "Capturar foto".');
      aoMudarEstado?.('aberta');
    } catch (erro) {
      pararCamera();
      if (referenciaDesmontado.current) return;
      setEstado('erro');
      setMensagem(mensagemErroCamera(erro));
    }
  };
  const capturar = () => {
    const video = referenciaVideo.current;
    if (!video || !video.videoWidth) return;
    const tela = document.createElement('canvas');
    const { largura, altura } = calcularDimensoesFoto(video.videoWidth, video.videoHeight);
    tela.width = largura;
    tela.height = altura;
    const contexto = tela.getContext('2d');
    contexto?.translate(largura, 0);
    contexto?.scale(-1, 1);
    contexto?.drawImage(video, 0, 0, largura, altura);
    const valor = tela.toDataURL('image/jpeg', QUALIDADE_FOTO);
    setFoto(valor);
    aoCapturar(valor);
    aoMudarEstado?.('capturada');
    pararCamera();
    setMensagem('');
  };
  const refazer = () => {
    setFoto(null);
    aoCapturar(null);
    aoMudarEstado?.('desligada');
    void iniciarCamera();
  };

  useEffect(() => {
    if (!pedidoAtivacao) return;
    referenciaContainer.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (!foto && !referenciaFluxo.current && estado !== 'carregando') void iniciarCamera();
  }, [pedidoAtivacao]);
  useEffect(() => {
    referenciaDesmontado.current = false;
    return () => {
      referenciaDesmontado.current = true;
      pararCamera();
    };
  }, []);

  return (
    <div
      className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center lg:flex-col lg:items-stretch"
      ref={referenciaContainer}
    >
      <div
        className={`relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-cartao bg-texto/5 sm:w-64 lg:w-full ${foto ? '' : 'border border-dashed border-texto-suave/40'}`}
      >
        {foto ? (
          <img src={foto} alt="Foto capturada do aluno" className="size-full object-cover" />
        ) : (
          <video
            ref={referenciaVideo}
            muted
            playsInline
            aria-label="Prévia da câmera"
            className="block size-full -scale-x-100 object-cover"
          />
        )}
        {!foto && estado === 'parado' && !referenciaFluxo.current && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-texto-suave">
            <Camera size={32} />
            <span>Câmera desativada</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3">
        <p
          className={`m-0 flex items-start gap-2 text-sm ${estado === 'erro' ? 'text-perigo' : 'text-texto-suave'}`}
        >
          {estado === 'erro' ? (
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          ) : (
            <CameraOff size={16} className="mt-0.5 shrink-0" />
          )}
          <span>
            {mensagem ||
              (foto
                ? 'Foto capturada com sucesso.'
                : 'A câmera será ativada somente quando você solicitar.')}
          </span>
        </p>
        <div className="flex">
          {foto ? (
            <Botao variante="secundario" tamanho="toque" className="w-full" onClick={refazer}>
              <RefreshCw size={18} />
              Tirar novamente
            </Botao>
          ) : !referenciaFluxo.current ? (
            <Botao
              tamanho="toque"
              className="w-full"
              onClick={() => void iniciarCamera()}
              disabled={estado === 'carregando'}
            >
              <Camera size={18} />
              {estado === 'carregando' ? 'Abrindo câmera...' : 'Ativar câmera'}
            </Botao>
          ) : (
            <Botao tamanho="toque" className="w-full" onClick={capturar}>
              <Camera size={18} />
              Capturar foto
            </Botao>
          )}
        </div>
      </div>
    </div>
  );
}
