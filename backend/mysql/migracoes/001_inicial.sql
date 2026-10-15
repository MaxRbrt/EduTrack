-- EduTrack · 001 · esquema inicial no MySQL 8 (substitui as migrações 001–008 do Supabase).
-- Aplicar com "npm.cmd run preparar-banco" em backend/api. Nunca editar depois de aplicada.
-- criado_por, atualizado_por e anulado_por_id são gravados pela API com o usuário da sessão.

CREATE TABLE usuarios (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  usuario VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  senha_hash VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em DATETIME(3) NOT NULL DEFAULT (UTC_TIMESTAMP(3)),
  PRIMARY KEY (id),
  CONSTRAINT usuarios_usuario_unico UNIQUE (usuario),
  CONSTRAINT usuarios_usuario_formato CHECK (REGEXP_LIKE(usuario, '^[a-z0-9._-]{1,40}$'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE sessoes (
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  usuario_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  criada_em DATETIME(3) NOT NULL DEFAULT (UTC_TIMESTAMP(3)),
  expira_em DATETIME(3) NOT NULL,
  PRIMARY KEY (token_hash),
  CONSTRAINT sessoes_usuario_fk FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE alunos (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  nome VARCHAR(120) NOT NULL,
  nome_padronizado VARCHAR(120) NOT NULL,
  curso VARCHAR(60) NOT NULL,
  periodo VARCHAR(60) NOT NULL,
  serie_modulo VARCHAR(60) NOT NULL,
  turma VARCHAR(60) NOT NULL,
  sala VARCHAR(60) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  foto_caminho VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NULL,
  criado_por CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  criado_em DATETIME(3) NOT NULL DEFAULT (UTC_TIMESTAMP(3)),
  atualizado_por CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  atualizado_em DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY alunos_nome_padronizado_idx (nome_padronizado),
  CONSTRAINT alunos_criado_por_fk FOREIGN KEY (criado_por) REFERENCES usuarios (id),
  CONSTRAINT alunos_atualizado_por_fk FOREIGN KEY (atualizado_por) REFERENCES usuarios (id),
  CONSTRAINT alunos_nome_check CHECK (CHAR_LENGTH(nome) BETWEEN 1 AND 120),
  CONSTRAINT alunos_nome_padronizado_check CHECK (CHAR_LENGTH(nome_padronizado) BETWEEN 1 AND 120),
  CONSTRAINT alunos_curso_check CHECK (CHAR_LENGTH(curso) BETWEEN 1 AND 60),
  CONSTRAINT alunos_periodo_check CHECK (CHAR_LENGTH(periodo) BETWEEN 1 AND 60),
  CONSTRAINT alunos_serie_modulo_check CHECK (CHAR_LENGTH(serie_modulo) BETWEEN 1 AND 60),
  CONSTRAINT alunos_turma_check CHECK (CHAR_LENGTH(turma) BETWEEN 1 AND 60),
  CONSTRAINT alunos_sala_check CHECK (CHAR_LENGTH(sala) BETWEEN 1 AND 60),
  -- alunos/<id do próprio aluno>/<uuid>.jpg (tela Alunos) ou <ano>/<uuid>.jpg (foto de um atraso).
  CONSTRAINT alunos_foto_caminho_formato CHECK (
    foto_caminho IS NULL
    OR REGEXP_LIKE(foto_caminho, CONCAT('^alunos/', id, '/[0-9a-f-]{36}[.]jpg$'))
    OR REGEXP_LIKE(foto_caminho, '^[0-9]{4}/[0-9a-f-]{36}[.]jpg$')
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE registros_atraso (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  aluno_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  nome_aluno VARCHAR(120) NOT NULL,
  curso VARCHAR(60) NOT NULL,
  serie_modulo VARCHAR(60) NOT NULL,
  turma VARCHAR(60) NOT NULL,
  sala VARCHAR(60) NOT NULL,
  periodo VARCHAR(60) NOT NULL,
  motivo VARCHAR(500) NOT NULL,
  exibicao JSON NOT NULL,
  foto_caminho VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NULL,
  motivo_sem_foto VARCHAR(500) NULL,
  registrado_em DATETIME(3) NOT NULL,
  ano_letivo INT NOT NULL,
  registrado_por VARCHAR(120) NOT NULL,
  anulacao JSON NULL,
  criado_por CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  recebido_em DATETIME(3) NOT NULL DEFAULT (UTC_TIMESTAMP(3)),
  anulado_por_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (id),
  KEY registros_atraso_aluno_id_idx (aluno_id),
  KEY registros_atraso_registrado_em_idx (registrado_em),
  CONSTRAINT registros_atraso_aluno_fk FOREIGN KEY (aluno_id) REFERENCES alunos (id),
  CONSTRAINT registros_atraso_criado_por_fk FOREIGN KEY (criado_por) REFERENCES usuarios (id),
  CONSTRAINT registros_atraso_anulado_por_fk FOREIGN KEY (anulado_por_id) REFERENCES usuarios (id),
  CONSTRAINT registros_atraso_nome_aluno_check CHECK (CHAR_LENGTH(nome_aluno) BETWEEN 1 AND 120),
  CONSTRAINT registros_atraso_curso_check CHECK (CHAR_LENGTH(curso) BETWEEN 1 AND 60),
  CONSTRAINT registros_atraso_serie_modulo_check CHECK (CHAR_LENGTH(serie_modulo) BETWEEN 1 AND 60),
  CONSTRAINT registros_atraso_turma_check CHECK (CHAR_LENGTH(turma) BETWEEN 1 AND 60),
  CONSTRAINT registros_atraso_sala_check CHECK (CHAR_LENGTH(sala) BETWEEN 1 AND 60),
  CONSTRAINT registros_atraso_periodo_check CHECK (CHAR_LENGTH(periodo) BETWEEN 1 AND 60),
  CONSTRAINT registros_atraso_motivo_check CHECK (CHAR_LENGTH(motivo) BETWEEN 5 AND 500),
  CONSTRAINT registros_atraso_registrado_por_check CHECK (CHAR_LENGTH(registrado_por) BETWEEN 1 AND 120),
  CONSTRAINT registros_atraso_ano_letivo_check CHECK (ano_letivo BETWEEN 2000 AND 2100),
  CONSTRAINT registros_atraso_foto_ou_motivo CHECK (
    foto_caminho IS NOT NULL OR CHAR_LENGTH(COALESCE(motivo_sem_foto, '')) > 0
  ),
  CONSTRAINT registros_atraso_foto_caminho_formato CHECK (
    foto_caminho IS NULL OR REGEXP_LIKE(foto_caminho, '^[0-9]{4}/[0-9a-f-]{36}[.]jpg$')
  ),
  CONSTRAINT registros_atraso_anulacao_valida CHECK (
    anulacao IS NULL OR (
      CHAR_LENGTH(JSON_UNQUOTE(JSON_EXTRACT(anulacao, '$.justificativa'))) BETWEEN 5 AND 300
      AND JSON_CONTAINS_PATH(anulacao, 'all', '$.anuladoEm', '$.anuladoPor')
    )
  ),
  CONSTRAINT registros_atraso_anulado_por_so_com_anulacao CHECK (
    anulacao IS NOT NULL OR anulado_por_id IS NULL
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TRIGGER registros_atraso_carimbar_insert BEFORE INSERT ON registros_atraso
FOR EACH ROW
BEGIN
  IF NEW.anulacao IS NOT NULL OR NEW.anulado_por_id IS NOT NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Registro novo nao pode nascer anulado.';
  END IF;
  SET NEW.recebido_em = UTC_TIMESTAMP(3);
END;

-- A única alteração permitida é anular, uma vez.
CREATE TRIGGER registros_atraso_somente_anulacao BEFORE UPDATE ON registros_atraso
FOR EACH ROW
BEGIN
  IF OLD.anulacao IS NOT NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Registro ja foi anulado.';
  END IF;
  IF NOT (
    NEW.id <=> OLD.id AND NEW.aluno_id <=> OLD.aluno_id AND NEW.nome_aluno <=> OLD.nome_aluno
    AND NEW.curso <=> OLD.curso AND NEW.serie_modulo <=> OLD.serie_modulo
    AND NEW.turma <=> OLD.turma AND NEW.sala <=> OLD.sala AND NEW.periodo <=> OLD.periodo
    AND NEW.motivo <=> OLD.motivo AND NEW.exibicao <=> OLD.exibicao
    AND NEW.foto_caminho <=> OLD.foto_caminho AND NEW.motivo_sem_foto <=> OLD.motivo_sem_foto
    AND NEW.registrado_em <=> OLD.registrado_em AND NEW.ano_letivo <=> OLD.ano_letivo
    AND NEW.registrado_por <=> OLD.registrado_por AND NEW.criado_por <=> OLD.criado_por
    AND NEW.recebido_em <=> OLD.recebido_em
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Somente a anulacao pode ser alterada.';
  END IF;
  IF NEW.anulacao IS NULL OR NEW.anulado_por_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Anulacao exige justificativa e autor.';
  END IF;
END;

CREATE TRIGGER alunos_carimbar_insert BEFORE INSERT ON alunos
FOR EACH ROW
BEGIN
  SET NEW.criado_em = UTC_TIMESTAMP(3);
  SET NEW.atualizado_por = NULL;
  SET NEW.atualizado_em = NULL;
END;

CREATE TRIGGER alunos_auditar_alteracao BEFORE UPDATE ON alunos
FOR EACH ROW
BEGIN
  IF NOT (NEW.id <=> OLD.id AND NEW.criado_por <=> OLD.criado_por AND NEW.criado_em <=> OLD.criado_em) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Identificadores e criacao do aluno nao podem ser alterados.';
  END IF;
  IF NEW.atualizado_por IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Alteracao de aluno exige o autor.';
  END IF;
  SET NEW.atualizado_em = UTC_TIMESTAMP(3);
END;
