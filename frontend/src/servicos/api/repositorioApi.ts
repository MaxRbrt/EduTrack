//////////////////////////////
// Repositório de atrasos que conversa com a API.
// Falha sem resposta, 401 ou 5xx conta como rede e vai para a fila offline;
// as outras são recusas, mostradas com mensagens fixas do frontend.
// O corpo é montado campo por campo para não enviar sobras de itens antigos.
//////////////////////////////

import { limparEspacos, validarJustificativaAnulacao } from '../../regras/regrasRegistroAtraso';
import type { NovoRegistroAtraso, RegistroAtraso } from '../../tipos/RegistroAtraso';
import { ErroApi, type ClienteApi } from './clienteApi';
import {
  ErroRepositorio,
  type RepositorioAtrasos,
  type TipoErroRepositorio,
} from '../repositorioAtrasos';

const MENSAGEM_SEM_CONEXAO = 'Sem conexão com o servidor. Tente novamente.';

function classificarStatus(status: number | undefined): TipoErroRepositorio {
  return !status || status === 401 || status >= 500 ? 'rede' : 'regra';
}

export function erroDeRepositorio(erro: unknown, mensagemRegra: string) {
  const tipo = classificarStatus(erro instanceof ErroApi ? erro.status : undefined);
  return new ErroRepositorio(tipo === 'rede' ? MENSAGEM_SEM_CONEXAO : mensagemRegra, tipo);
}

type RegistroDaApi = Omit<RegistroAtraso, 'envio'>;

const paraCorpo = (novo: NovoRegistroAtraso): NovoRegistroAtraso => ({
  id: novo.id,
  alunoId: novo.alunoId,
  nomeAluno: novo.nomeAluno,
  curso: novo.curso,
  serieModulo: novo.serieModulo,
  turma: novo.turma,
  sala: novo.sala,
  periodo: novo.periodo,
  motivo: novo.motivo,
  exibicao: {
    nomeAluno: novo.exibicao.nomeAluno,
    curso: novo.exibicao.curso,
    serieModulo: novo.exibicao.serieModulo,
    turma: novo.exibicao.turma,
    sala: novo.exibicao.sala,
    periodo: novo.exibicao.periodo,
  },
  foto: novo.foto,
  motivoSemFoto: novo.foto ? null : novo.motivoSemFoto,
  registradoEm: novo.registradoEm,
  anoLetivo: novo.anoLetivo,
  registradoPor: novo.registradoPor,
  anulacao: null,
});

export function criarRepositorioApi(cliente: ClienteApi): RepositorioAtrasos {
  return {
    listar: async () => {
      try {
        const registros = await cliente.pedir<RegistroDaApi[]>('GET', '/registros');
        return registros.map((registro) => ({ ...registro, envio: 'enviado' }));
      } catch (erro) {
        throw erroDeRepositorio(erro, 'Não foi possível carregar os registros.');
      }
    },

    salvar: async (novo) => {
      const corpo = paraCorpo(novo);
      let registro: RegistroDaApi;
      try {
        registro = await cliente.pedir<RegistroDaApi>('POST', '/registros', corpo);
      } catch (erro) {
        throw erroDeRepositorio(
          erro,
          'O servidor recusou o registro. Confira os dados e tente novamente.',
        );
      }
      return { ...registro, envio: 'enviado' };
    },

    anular: async (id, justificativa, anuladoPor, anuladoEm = new Date()) => {
      const erroJustificativa = validarJustificativaAnulacao(justificativa);
      if (erroJustificativa) throw new ErroRepositorio(erroJustificativa, 'regra');
      try {
        const registro = await cliente.pedir<RegistroDaApi>('POST', `/registros/${id}/anulacao`, {
          justificativa: limparEspacos(justificativa),
          anuladoPor,
          anuladoEm: anuladoEm.toISOString(),
        });
        return { ...registro, envio: 'enviado' };
      } catch (erro) {
        const jaAnulado = erro instanceof ErroApi && (erro.status === 404 || erro.status === 409);
        throw erroDeRepositorio(
          erro,
          jaAnulado
            ? 'Registro não encontrado ou já anulado.'
            : 'Não foi possível anular o registro.',
        );
      }
    },
  };
}
