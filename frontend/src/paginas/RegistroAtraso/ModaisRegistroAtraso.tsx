import { CheckCircle2 } from 'lucide-react';
import { Alerta } from '../../componentes/Alerta/Alerta';
import { Botao } from '../../componentes/Botao/Botao';
import { classesCampo } from '../../componentes/Entrada/Entrada';
import { FotoAluno } from '../../componentes/FotoAluno/FotoAluno';
import { Modal } from '../../componentes/Modal/Modal';
import {
  atingeLimiteReincidencia,
  formatarHora,
  MOTIVOS_SEM_FOTO,
} from '../../regras/regrasRegistroAtraso';
import type { OpcaoMotivoSemFoto } from '../../regras/regrasRegistroAtraso';
import type { Aluno } from '../../tipos/Aluno';

interface PropriedadesModalAlunosParecidos {
  aberto: boolean;
  alunos: Aluno[];
  aoVoltar: () => void;
  aoCadastrarOutro: () => void;
  aoEscolher: (aluno: Aluno) => void;
}

export function ModalAlunosParecidos({
  aberto,
  alunos,
  aoVoltar,
  aoCadastrarOutro,
  aoEscolher,
}: PropriedadesModalAlunosParecidos) {
  return (
    <Modal
      aberto={aberto}
      tom="alerta"
      titulo="Já existe aluno parecido"
      descricao="Se for o mesmo aluno, use o cadastro existente para não dividir o histórico."
      aoFechar={aoVoltar}
      acoes={
        <>
          <Botao variante="fantasma" onClick={aoVoltar}>
            Voltar
          </Botao>
          <Botao variante="secundario" onClick={aoCadastrarOutro}>
            É outro aluno
          </Botao>
        </>
      }
    >
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {alunos.map((aluno) => (
          <li
            key={aluno.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-controle border border-borda p-3"
          >
            <span className="flex flex-col">
              <strong className="text-sm text-texto">{aluno.nome}</strong>
              <span className="text-sm text-texto-suave">
                {aluno.curso} · {aluno.serieModulo} {aluno.turma} · {aluno.sala}
              </span>
            </span>
            <Botao aria-label={`Usar este aluno: ${aluno.nome}`} onClick={() => aoEscolher(aluno)}>
              Usar este aluno
            </Botao>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

interface PropriedadesModalSemFoto {
  aberto: boolean;
  cameraAberta: boolean;
  opcao: OpcaoMotivoSemFoto | '';
  detalhe: string;
  motivoResolvido: string | null;
  aoVoltar: () => void;
  aoTirarFoto: () => void;
  aoEscolherOpcao: (opcao: OpcaoMotivoSemFoto) => void;
  aoMudarDetalhe: (detalhe: string) => void;
  aoContinuar: () => void;
}

export function ModalSemFoto({
  aberto,
  cameraAberta,
  opcao,
  detalhe,
  motivoResolvido,
  aoVoltar,
  aoTirarFoto,
  aoEscolherOpcao,
  aoMudarDetalhe,
  aoContinuar,
}: PropriedadesModalSemFoto) {
  return (
    <Modal
      aberto={aberto}
      tom="alerta"
      titulo="Registro sem foto"
      descricao={
        <p>
          {cameraAberta
            ? 'A câmera está aberta, mas a foto não foi capturada.'
            : 'Nenhuma foto foi tirada deste aluno.'}{' '}
          Tire a foto ou informe por que o registro seguirá sem ela.
        </p>
      }
      aoFechar={aoVoltar}
      acoes={
        <>
          <Botao variante="fantasma" onClick={aoTirarFoto}>
            Tirar foto
          </Botao>
          <Botao autoFocus disabled={!motivoResolvido} onClick={aoContinuar}>
            Continuar sem foto
          </Botao>
        </>
      }
    >
      <fieldset className="m-0 grid gap-1 border-0 p-0">
        <legend className="mb-2 p-0 text-sm font-medium text-texto">
          Motivo da falta de foto *
        </legend>
        {MOTIVOS_SEM_FOTO.map((valor) => (
          <label
            key={valor}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-controle px-3 text-sm text-texto hover:bg-fundo"
          >
            <input
              type="radio"
              name="motivo-sem-foto"
              value={valor}
              checked={opcao === valor}
              onChange={() => aoEscolherOpcao(valor)}
              className="size-5 shrink-0 accent-primaria"
            />
            {valor}
          </label>
        ))}
        {opcao === 'Outro' && (
          <input
            className={`${classesCampo.controle} ${classesCampo.semErro} ${classesCampo.texto.toque} mt-1 h-12`}
            aria-label="Descreva o motivo da falta de foto"
            value={detalhe}
            onChange={(evento) => aoMudarDetalhe(evento.target.value)}
            maxLength={100}
            placeholder="Descreva o motivo"
          />
        )}
      </fieldset>
    </Modal>
  );
}

interface ItemResumo {
  rotulo: string;
  valor: string;
  completo?: boolean;
}

interface PropriedadesModalConfirmacao {
  aberto: boolean;
  salvando: boolean;
  foto: string | null;
  itens: ItemResumo[];
  fotoDeOutroNome: boolean;
  quantidadeComEste: number;
  anoAtual: number;
  erro: string;
  aoVoltar: () => void;
  aoConfirmar: () => void;
}

export function ModalConfirmacaoRegistro({
  aberto,
  salvando,
  foto,
  itens,
  fotoDeOutroNome,
  quantidadeComEste,
  anoAtual,
  erro,
  aoVoltar,
  aoConfirmar,
}: PropriedadesModalConfirmacao) {
  return (
    <Modal
      aberto={aberto}
      titulo="Confirmar registro de atraso"
      descricao={
        <p>Confira os dados antes de salvar. Horário atual: {formatarHora(new Date())}.</p>
      }
      aoFechar={aoVoltar}
      acoes={
        <>
          <Botao variante="fantasma" onClick={aoVoltar} disabled={salvando}>
            Voltar e corrigir
          </Botao>
          <Botao autoFocus onClick={aoConfirmar} disabled={salvando}>
            <CheckCircle2 size={16} />
            {salvando ? 'Salvando...' : 'Confirmar registro'}
          </Botao>
        </>
      }
    >
      <div className="flex gap-4 max-[460px]:flex-col">
        <FotoAluno origem={foto} grande alt="Foto do aluno" />
        <dl className="m-0 grid flex-1 grid-cols-2 gap-x-4 gap-y-2">
          {itens.map(({ rotulo, valor, completo }) => (
            <div key={rotulo} className={completo ? 'col-span-2' : undefined}>
              <dt className="text-xs font-medium tracking-wide text-texto-suave uppercase">
                {rotulo}
              </dt>
              <dd className="m-0 mt-0.5 text-sm font-semibold wrap-anywhere text-texto">{valor}</dd>
            </div>
          ))}
        </dl>
      </div>
      {fotoDeOutroNome && (
        <Alerta tom="alerta" className="mt-4">
          O nome mudou depois que a foto foi tirada. Confira se a foto é deste aluno ou tire outra.
        </Alerta>
      )}
      {atingeLimiteReincidencia(quantidadeComEste) && (
        <Alerta tom="alerta" className="mt-4">
          Este será o {quantidadeComEste}º atraso do aluno em {anoAtual}. Avise a coordenação.
        </Alerta>
      )}
      {erro && (
        <Alerta tom="erro" className="mt-4">
          {erro}
        </Alerta>
      )}
    </Modal>
  );
}
