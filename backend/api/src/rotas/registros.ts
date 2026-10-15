//////////////////////////////
// Rotas dos atrasos: listar, registrar e anular, todas com sessão.
// Registro nunca é apagado; a correção é anular uma única vez, com justificativa.
// Registrar um id que já existe devolve o que está gravado (reenvio da fila offline).
//////////////////////////////

import type { FastifyInstance } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { buscarPorId, inserirSeNovo, type Banco } from '../banco/banco.ts';
import { ErroHttp } from '../compartilhado/erros.ts';
import { fotoBase64, parametrosId, texto, uuid } from '../compartilhado/esquemas.ts';
import { validarAnuladoEm, validarRegistradoEm } from '../compartilhado/instantes.ts';
import { decodificarFotoJpeg, type ArmazemFotos } from '../servicos/armazemFotos.ts';
import type { GuardaSessao } from '../servicos/sessoes.ts';

//////////////////////////////
// Esquemas e tipos
//////////////////////////////

const COLUNAS =
  'id, aluno_id, nome_aluno, curso, serie_modulo, turma, sala, periodo, motivo, exibicao, foto_caminho, motivo_sem_foto, registrado_em, ano_letivo, registrado_por, anulacao';

const instante = { type: 'string', format: 'date-time' } as const;

const camposTurma = {
  nomeAluno: texto(120),
  curso: texto(60),
  serieModulo: texto(60),
  turma: texto(60),
  sala: texto(60),
  periodo: texto(60),
} as const;

const corpoRegistrar = {
  type: 'object',
  required: [
    'id',
    'alunoId',
    ...Object.keys(camposTurma),
    'motivo',
    'exibicao',
    'registradoEm',
    'anoLetivo',
    'registradoPor',
  ],
  additionalProperties: false,
  properties: {
    id: uuid,
    alunoId: uuid,
    ...camposTurma,
    motivo: texto(500, 5),
    exibicao: {
      type: 'object',
      required: Object.keys(camposTurma),
      additionalProperties: false,
      properties: camposTurma,
    },
    foto: fotoBase64,
    motivoSemFoto: { type: ['string', 'null'], maxLength: 500 },
    registradoEm: instante,
    anoLetivo: { type: 'integer', minimum: 2000, maximum: 2100 },
    registradoPor: texto(120),
    anulacao: { type: 'null' },
  },
} as const;

const corpoAnular = {
  type: 'object',
  required: ['justificativa', 'anuladoPor', 'anuladoEm'],
  additionalProperties: false,
  properties: {
    justificativa: texto(300, 5),
    anuladoPor: texto(120),
    anuladoEm: instante,
  },
} as const;

interface CorpoRegistro {
  id: string;
  alunoId: string;
  nomeAluno: string;
  curso: string;
  serieModulo: string;
  turma: string;
  sala: string;
  periodo: string;
  motivo: string;
  exibicao: Record<string, string>;
  foto?: string | null;
  motivoSemFoto?: string | null;
  registradoEm: string;
  anoLetivo: number;
  registradoPor: string;
}

interface CorpoAnulacao {
  justificativa: string;
  anuladoPor: string;
  anuladoEm: string;
}

//////////////////////////////
// Rotas
//////////////////////////////

export function registrarRotasRegistros(
  aplicacao: FastifyInstance,
  banco: Banco,
  fotos: ArmazemFotos,
  exigirSessao: GuardaSessao,
) {
  const paraJson = async (linha: RowDataPacket) => ({
    id: linha.id as string,
    alunoId: linha.aluno_id as string,
    nomeAluno: linha.nome_aluno as string,
    curso: linha.curso as string,
    serieModulo: linha.serie_modulo as string,
    turma: linha.turma as string,
    sala: linha.sala as string,
    periodo: linha.periodo as string,
    motivo: linha.motivo as string,
    exibicao: linha.exibicao as Record<string, string>,
    foto: await fotos.assinar(linha.foto_caminho),
    motivoSemFoto: linha.motivo_sem_foto as string | null,
    registradoEm: (linha.registrado_em as Date).toISOString(),
    anoLetivo: linha.ano_letivo as number,
    registradoPor: linha.registrado_por as string,
    anulacao: linha.anulacao as CorpoAnulacao | null,
  });

  const buscar = (id: string) => buscarPorId(banco, 'registros_atraso', COLUNAS, id);

  aplicacao.get('/api/registros', { preHandler: exigirSessao }, async () => {
    const [linhas] = await banco.execute<RowDataPacket[]>(
      `SELECT ${COLUNAS} FROM registros_atraso ORDER BY registrado_em, id`,
    );
    return Promise.all(linhas.map(paraJson));
  });

  aplicacao.post<{ Body: CorpoRegistro }>(
    '/api/registros',
    { preHandler: exigirSessao, schema: { body: corpoRegistrar } },
    async (requisicao, resposta) => {
      const registro = requisicao.body;
      const existente = await buscar(registro.id);
      if (existente) return paraJson(existente);

      const erroHorario = validarRegistradoEm(
        new Date(registro.registradoEm),
        registro.anoLetivo,
        new Date(),
      );
      if (erroHorario) throw new ErroHttp(400, erroHorario);

      let fotoCaminho: string | null = null;
      if (registro.foto) {
        const bytes = decodificarFotoJpeg(registro.foto);
        fotoCaminho = `${registro.anoLetivo}/${registro.id}.jpg`;
        await fotos.gravar(fotoCaminho, bytes);
      } else if (!registro.motivoSemFoto?.trim()) {
        throw new ErroHttp(400, 'Registro sem foto exige o motivo.');
      }
      const criado = await inserirSeNovo(
        banco,
        `INSERT INTO registros_atraso
           (id, aluno_id, nome_aluno, curso, serie_modulo, turma, sala, periodo, motivo, exibicao,
            foto_caminho, motivo_sem_foto, registrado_em, ano_letivo, registrado_por, criado_por)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          registro.id,
          registro.alunoId,
          registro.nomeAluno,
          registro.curso,
          registro.serieModulo,
          registro.turma,
          registro.sala,
          registro.periodo,
          registro.motivo,
          JSON.stringify(registro.exibicao),
          fotoCaminho,
          fotoCaminho ? null : (registro.motivoSemFoto ?? null),
          new Date(registro.registradoEm),
          registro.anoLetivo,
          registro.registradoPor,
          requisicao.usuario!.id,
        ],
      );
      const gravado = await paraJson((await buscar(registro.id))!);
      return criado ? resposta.status(201).send(gravado) : gravado;
    },
  );

  aplicacao.post<{ Params: { id: string }; Body: CorpoAnulacao }>(
    '/api/registros/:id/anulacao',
    { preHandler: exigirSessao, schema: { body: corpoAnular, params: parametrosId } },
    async (requisicao) => {
      const { id } = requisicao.params;
      const { justificativa, anuladoPor, anuladoEm } = requisicao.body;
      const erroHorario = validarAnuladoEm(new Date(anuladoEm), new Date());
      if (erroHorario) throw new ErroHttp(400, erroHorario);
      const [resultado] = await banco.execute<ResultSetHeader>(
        'UPDATE registros_atraso SET anulacao = ?, anulado_por_id = ? WHERE id = ? AND anulacao IS NULL',
        [
          JSON.stringify({
            justificativa,
            anuladoEm: new Date(anuladoEm).toISOString(),
            anuladoPor,
          }),
          requisicao.usuario!.id,
          id,
        ],
      );
      const registro = await buscar(id);
      if (!registro) throw new ErroHttp(404, 'Registro não encontrado.');
      if (resultado.affectedRows === 0) throw new ErroHttp(409, 'Registro já foi anulado.');
      return paraJson(registro);
    },
  );
}
