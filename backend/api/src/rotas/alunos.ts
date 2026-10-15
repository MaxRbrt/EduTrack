//////////////////////////////
// Rotas do cadastro de alunos: listar, cadastrar e alterar, todas com sessão.
// Aluno nunca é apagado, só inativado. Cadastrar um id que já existe devolve o
// que está gravado, porque é a fila offline reenviando.
// Quem cadastrou ou alterou vem da sessão, nunca do corpo da requisição.
//////////////////////////////

import type { FastifyInstance } from 'fastify';
import type { RowDataPacket } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { buscarPorId, inserirSeNovo, type Banco } from '../banco/banco.ts';
import { ErroHttp } from '../compartilhado/erros.ts';
import { fotoBase64, parametrosId, texto, uuid } from '../compartilhado/esquemas.ts';
import {
  decodificarFotoJpeg,
  FORMATO_FOTO_ATRASO,
  type ArmazemFotos,
} from '../servicos/armazemFotos.ts';
import type { GuardaSessao } from '../servicos/sessoes.ts';

//////////////////////////////
// Esquemas e tipos
//////////////////////////////

const COLUNAS =
  'id, nome, nome_padronizado, curso, periodo, serie_modulo, turma, sala, ativo, foto_caminho';

const camposAluno = {
  nome: texto(120),
  nomePadronizado: texto(120),
  curso: texto(60),
  periodo: texto(60),
  serieModulo: texto(60),
  turma: texto(60),
  sala: texto(60),
  ativo: { type: 'boolean' },
  fotoNova: fotoBase64,
} as const;

const corpoCriar = {
  type: 'object',
  required: ['id', 'nome', 'nomePadronizado', 'curso', 'periodo', 'serieModulo', 'turma', 'sala'],
  additionalProperties: false,
  properties: {
    id: uuid,
    ...camposAluno,
    fotoCaminho: { type: ['string', 'null'], pattern: FORMATO_FOTO_ATRASO },
  },
} as const;

const corpoAlterar = {
  type: 'object',
  additionalProperties: false,
  dependencies: { nome: ['nomePadronizado'], nomePadronizado: ['nome'] },
  properties: camposAluno,
} as const;

interface CorpoAluno {
  id: string;
  nome: string;
  nomePadronizado: string;
  curso: string;
  periodo: string;
  serieModulo: string;
  turma: string;
  sala: string;
  ativo?: boolean;
  fotoCaminho?: string | null;
  fotoNova?: string | null;
}

const COLUNAS_ALTERAVEIS = {
  nome: 'nome',
  nomePadronizado: 'nome_padronizado',
  curso: 'curso',
  periodo: 'periodo',
  serieModulo: 'serie_modulo',
  turma: 'turma',
  sala: 'sala',
  ativo: 'ativo',
} as const;

type CorpoAlteracao = Partial<Omit<CorpoAluno, 'id' | 'fotoCaminho'>>;

//////////////////////////////
// Rotas
//////////////////////////////

export function registrarRotasAlunos(
  aplicacao: FastifyInstance,
  banco: Banco,
  fotos: ArmazemFotos,
  exigirSessao: GuardaSessao,
) {
  const paraJson = async (linha: RowDataPacket) => ({
    id: linha.id as string,
    nome: linha.nome as string,
    nomePadronizado: linha.nome_padronizado as string,
    curso: linha.curso as string,
    periodo: linha.periodo as string,
    serieModulo: linha.serie_modulo as string,
    turma: linha.turma as string,
    sala: linha.sala as string,
    ativo: Boolean(linha.ativo),
    fotoCaminho: linha.foto_caminho as string | null,
    foto: await fotos.assinar(linha.foto_caminho),
  });

  const buscar = (id: string) => buscarPorId(banco, 'alunos', COLUNAS, id);

  const gravarFoto = async (id: string, urlDados: string) => {
    const caminho = `alunos/${id}/${randomUUID()}.jpg`;
    await fotos.gravar(caminho, decodificarFotoJpeg(urlDados));
    return caminho;
  };

  aplicacao.get('/api/alunos', { preHandler: exigirSessao }, async () => {
    const [linhas] = await banco.execute<RowDataPacket[]>(
      `SELECT ${COLUNAS} FROM alunos ORDER BY nome_padronizado, id`,
    );
    return Promise.all(linhas.map(paraJson));
  });

  aplicacao.post<{ Body: CorpoAluno }>(
    '/api/alunos',
    { preHandler: exigirSessao, schema: { body: corpoCriar } },
    async (requisicao, resposta) => {
      const aluno = requisicao.body;
      const existente = await buscar(aluno.id);
      if (existente) return paraJson(existente);
      const fotoCaminho = aluno.fotoNova
        ? await gravarFoto(aluno.id, aluno.fotoNova)
        : (aluno.fotoCaminho ?? null);
      const criado = await inserirSeNovo(
        banco,
        `INSERT INTO alunos
           (id, nome, nome_padronizado, curso, periodo, serie_modulo, turma, sala, ativo,
            foto_caminho, criado_por)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          aluno.id,
          aluno.nome,
          aluno.nomePadronizado,
          aluno.curso,
          aluno.periodo,
          aluno.serieModulo,
          aluno.turma,
          aluno.sala,
          aluno.ativo ?? true,
          fotoCaminho,
          requisicao.usuario!.id,
        ],
      );
      const gravado = await paraJson((await buscar(aluno.id))!);
      return criado ? resposta.status(201).send(gravado) : gravado;
    },
  );

  aplicacao.patch<{ Params: { id: string }; Body: CorpoAlteracao }>(
    '/api/alunos/:id',
    { preHandler: exigirSessao, schema: { body: corpoAlterar, params: parametrosId } },
    async (requisicao) => {
      const { id } = requisicao.params;
      if (!(await buscar(id))) throw new ErroHttp(404, 'Aluno não encontrado.');
      const atribuicoes: string[] = [];
      const valores: Array<string | boolean> = [];
      for (const [campo, coluna] of Object.entries(COLUNAS_ALTERAVEIS)) {
        const valor = requisicao.body[campo as keyof typeof COLUNAS_ALTERAVEIS];
        if (valor === undefined) continue;
        atribuicoes.push(`${coluna} = ?`);
        valores.push(valor);
      }
      if (requisicao.body.fotoNova) {
        atribuicoes.push('foto_caminho = ?');
        valores.push(await gravarFoto(id, requisicao.body.fotoNova));
      }
      atribuicoes.push('atualizado_por = ?');
      valores.push(requisicao.usuario!.id);
      await banco.execute(`UPDATE alunos SET ${atribuicoes.join(', ')} WHERE id = ?`, [
        ...valores,
        id,
      ]);
      return paraJson((await buscar(id))!);
    },
  );
}
