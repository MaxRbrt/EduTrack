# EduTrack

Sistema de registro e acompanhamento de **entradas atrasadas** na portaria escolar. A portaria tira a foto do aluno, informa quem é e o motivo do atraso; o dashboard e o histórico acompanham a reincidência ao longo do ano letivo.

> O EduTrack **não** é sistema de chamada nem de frequência por turma: ele registra apenas quem entrou atrasado.

## Sumário

- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Como rodar na sua máquina](#como-rodar-na-sua-máquina)
- [Modo de desenvolvimento](#modo-de-desenvolvimento)
- [Verificação do projeto](#verificação-do-projeto)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Como o sistema funciona](#como-o-sistema-funciona)
- [Padrões do código](#padrões-do-código)
- [Segurança e dados pessoais](#segurança-e-dados-pessoais)
- [Problemas comuns](#problemas-comuns)
- [Estado atual e pendências](#estado-atual-e-pendências)

## Funcionalidades

| Rota         | Tela               | O que faz                                                                                                                                                |
| ------------ | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/entrar`    | Entrar             | Login do porteiro com usuário e senha                                                                                                                    |
| `/dashboard` | Dashboard          | Totais do dia, do mês e do ano, reincidentes, alunos acima do limite, distribuição por dia e horário, filtros (curso, período, datas) e relatório em PDF |
| `/registrar` | Registrar atraso   | Foto pela webcam, busca do aluno pelo nome (tolera erro de digitação), motivo e confirmação                                                              |
| `/historico` | Histórico do aluno | Perfil do aluno com foto, dados do cadastro, totais e todos os atrasos; anulação de registros e PDF                                                      |
| `/alunos`    | Alunos             | Cadastro de alunos: novo, editar, foto de identificação, inativar e reativar                                                                             |

Destaques:

- **Funciona sem internet:** se a conexão cair, o registro fica guardado no navegador e é enviado sozinho quando a conexão volta, sem duplicar.
- **Nada é apagado:** registros errados são **anulados com justificativa** e continuam no histórico; alunos que saem da escola são **inativados**.
- **Reincidência:** a tela avisa quando o aluno chega ao 3º atraso no ano.
- **Relatórios em PDF** gerados no próprio navegador, sem fotos.

## Tecnologias

| Parte                    | Tecnologias                                                                                                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Telas (`frontend/`)      | React 19, TypeScript, Vite, React Router, Tailwind CSS v4, GSAP (animações do Dashboard), Lucide (ícones), jsPDF + AutoTable (PDF), idb-keyval (fila offline em IndexedDB) |
| API (`backend/api/`)     | Node.js 24, Fastify, mysql2, TypeScript executado direto pelo Node (sem etapa de build)                                                                                    |
| Banco (`backend/mysql/`) | MySQL 8                                                                                                                                                                    |

## Como rodar na sua máquina

Tudo roda localmente: a API serve as telas e o banco fica no MySQL do próprio computador. Ao final, o sistema abre em **http://localhost:3001**.

### 1. Pré-requisitos

- [Node.js](https://nodejs.org/) **24 ou mais novo** (`node -v` para conferir)
- [MySQL](https://dev.mysql.com/downloads/) **8** instalado e rodando (no Windows, o serviço costuma se chamar `MySQL80`), com a senha do usuário `root` em mãos
- Navegador com webcam (Chrome ou Edge) para tirar as fotos

> **Windows / PowerShell:** os comandos abaixo usam `npm.cmd`, porque o PowerShell costuma bloquear o `npm` comum por política de execução. Em outros terminais (Git Bash, Linux, macOS), use `npm` no lugar de `npm.cmd`.

### 2. Baixar o projeto

```powershell
git clone https://github.com/MaxRbrt/EduTrack.git
cd EduTrack
```

### 3. Configurar a API

Dentro de `backend/api/`, copie o modelo de configuração:

```powershell
cd backend\api
copy .env.example .env
```

Abra o `.env` e preencha:

| Variável                             | O que colocar                                                                                                         |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `PORTA`                              | Porta da API e das telas (padrão `3001`)                                                                              |
| `BD_HOST`, `BD_PORTA`                | Onde o MySQL está (padrão `localhost` e `3306`)                                                                       |
| `BD_NOME`                            | Nome do banco (padrão `edutrack`)                                                                                     |
| `BD_USUARIO`, `BD_SENHA`             | Usuário que a API usa no MySQL. Deixe `edutrack_api` e **invente uma senha forte**: o próximo passo cria esse usuário |
| `BD_ADMIN_USUARIO`, `BD_ADMIN_SENHA` | Usuário administrador do MySQL (normalmente `root` e a senha dele). Só é usado para preparar o banco                  |
| `SEGREDO_FOTOS`                      | Texto aleatório com **32 caracteres ou mais**; assina os links das fotos                                              |
| `PASTA_FOTOS`, `PASTA_FRONTEND`      | Opcionais. Padrões: `dados/fotos` e `../../frontend/dist`                                                             |

Para gerar um `SEGREDO_FOTOS` aleatório:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

O `.env` tem senhas: ele já está no `.gitignore` e **nunca** deve ir para o repositório. A API não inicia se faltar alguma variável obrigatória.

### 4. Preparar o banco

Ainda em `backend/api/`:

```powershell
npm.cmd install
npm.cmd run preparar-banco
```

O `preparar-banco` cria o banco `edutrack`, aplica as migrações de `backend/mysql/migracoes/` que ainda faltam e cria o usuário MySQL `edutrack_api`, **sem permissão de apagar** alunos, atrasos e usuários. Pode ser rodado de novo sem problema: só aplica o que falta.

### 5. Criar o usuário da portaria

```powershell
npm.cmd run criar-usuario -- porteiro1
```

O script pede a senha (mínimo 8 caracteres). Rodar de novo com o mesmo nome troca a senha e encerra as sessões abertas desse usuário. Não existe cadastro de usuário pela tela.

### 6. Gerar as telas

Em outro terminal, a partir da raiz do projeto:

```powershell
cd frontend
npm.cmd install
npm.cmd run build
```

O build usa `VITE_MODO_DADOS=api` (padrão), ou seja, as telas conversam com a API. Se existir um `frontend/.env.local` com outro valor, troque para `api` antes do build.

### 7. Iniciar

De volta em `backend/api/`:

```powershell
npm.cmd run iniciar
```

Abra **http://localhost:3001** e entre com o usuário criado no passo 5.

## Modo de desenvolvimento

Para alterar o código vendo as mudanças na hora, use dois terminais:

```powershell
# terminal 1 — API, reinicia ao salvar
cd backend\api
npm.cmd run dev

# terminal 2 — telas com recarga automática
cd frontend
npm.cmd run dev
```

Abra **http://localhost:5173**. O Vite repassa as chamadas de `/api` para a API na porta 3001.

### Sem banco de dados

Para mexer só nas telas, sem MySQL nem API, crie `frontend/.env.local` (modelo em `frontend/.env.example`) com:

```env
VITE_MODO_DADOS=memoria
```

Nesse modo o login é simulado (sem senha) e os dados ficam só na memória (somem ao recarregar a página). O modo `memoria` só existe em desenvolvimento: o build de produção o recusa e não inclui esse código. Com um valor desconhecido em `VITE_MODO_DADOS`, a tela mostra "O EduTrack não está configurado".

## Verificação do projeto

Execute todas as verificações antes de considerar uma alteração concluída:

```powershell
cd frontend
npm.cmd test             # testes automatizados
npm.cmd run build        # confere os tipos e gera as telas
npm.cmd audit --omit=dev # dependências usadas em execução

cd backend\api
npm.cmd test             # testes automatizados da API
npm.cmd run tipos        # confere os tipos da API
npm.cmd audit --omit=dev # dependências usadas em execução
```

Estado verificado em 15/10/2026: 6 arquivos de teste e 11 testes aprovados no frontend; 9 testes aprovados na API (conferência dos horários enviados pelo navegador); build e tipagem da API aprovados; auditorias frontend e backend com 0 vulnerabilidades conhecidas. As rotas da API ainda não têm testes automatizados contra um MySQL isolado.

## Estrutura do projeto

```text
EduTrack/
├── frontend/                     # Telas (React + TypeScript + Vite)
│   ├── src/
│   │   ├── componentes/          # Componentes reutilizáveis (Botao, Entrada, Modal, FotoAluno...)
│   │   ├── animacoes/            # Animações do Dashboard (GSAP, carregado sob demanda)
│   │   ├── contextos/            # Estado compartilhado: sessão (login) e dados da escola
│   │   ├── regras/               # Regras de negócio puras: registro de atraso e alunos
│   │   ├── relatorios/           # Geração dos PDFs (carregado só ao clicar em "Baixar PDF")
│   │   ├── servicos/             # Login, escolha da fonte de dados e repositórios (contrato + memória)
│   │   │   ├── api/              # clienteApi.ts (único fetch) e repositórios que falam com a API
│   │   │   └── offline/          # Fila offline (IndexedDB) e repositório sincronizado
│   │   ├── estruturas/           # Layout com menu, guarda de sessão e modal da fila
│   │   ├── paginas/              # Entrar, Painel (Dashboard), RegistroAtraso, HistoricoAluno, Alunos
│   │   ├── rotas/                # Configuração do React Router
│   │   ├── estilos/              # tema.css: Tailwind v4 e tokens de cor
│   │   └── tipos/                # Tipos TypeScript (Aluno, RegistroAtraso)
│   └── .env.example              # Modelo do .env.local
├── backend/
│   ├── api/                      # API Fastify
│   │   ├── src/
│   │   │   ├── servidor.ts       # Ponto de entrada: lê o .env, conecta no banco e sobe a API
│   │   │   ├── aplicacao.ts      # Monta o Fastify: cabeçalhos de segurança, rotas e telas
│   │   │   ├── configuracao.ts   # Lê e valida as variáveis do .env
│   │   │   ├── rotas/            # alunos.ts, registros.ts, sessao.ts, fotos.ts
│   │   │   ├── servicos/         # sessoes.ts (login e tokens), armazemFotos.ts (fotos em disco)
│   │   │   ├── banco/            # banco.ts: conexão MySQL, migrações e consultas comuns
│   │   │   ├── compartilhado/    # erros.ts (respostas de erro), esquemas.ts (validação do JSON)
│   │   │   └── scripts/          # prepararBanco.ts e criarUsuario.ts
│   │   └── .env.example          # Modelo do .env
│   └── mysql/migracoes/          # Scripts SQL do banco (NNN_assunto.sql)
├── .gitignore                   # Impede versionamento de segredos e artefatos
└── README.md
```

## Como o sistema funciona

### Fluxo de um registro

```text
Aluno chega atrasado
    ↓
Portaria abre "Registrar atraso" e tira a foto
    ↓
Busca o aluno pelo nome e escolhe
(aluno sem cadastro: preenche curso, período, série, turma e sala;
 se já existir aluno parecido, a tela pergunta se é ele)
    ↓
Escreve o motivo informado pelo aluno
    ↓
Confirma: data e hora são automáticas; a tela limpa para o próximo
```

### Caminho dos dados

```text
Navegador ──/api──▶ API Fastify (porta 3001) ──▶ MySQL (banco edutrack)
                         └──▶ fotos em backend/api/dados/fotos/
```

- Em produção local, a própria API entrega as telas já geradas (`frontend/dist`); em desenvolvimento, o Vite faz esse papel na porta 5173.
- Datas são gravadas em UTC.

### Rotas da API

| Método e rota                                | Uso                                    |
| -------------------------------------------- | -------------------------------------- |
| `POST /api/sessao`                           | Login (devolve o token da sessão)      |
| `DELETE /api/sessao`                         | Sair                                   |
| `GET /api/alunos` · `POST /api/alunos`       | Listar e cadastrar alunos              |
| `PATCH /api/alunos/:id`                      | Editar, inativar ou reativar aluno     |
| `GET /api/registros` · `POST /api/registros` | Listar e criar registros de atraso     |
| `POST /api/registros/:id/anulacao`           | Anular um registro (com justificativa) |

Um `POST` com um `id` que já existe responde `200` com o que está gravado. É isso que permite reenviar a fila offline sem duplicar registros.

O horário do atraso vem do navegador, porque a fila offline envia depois o que foi registrado antes. A API recusa horário mais de 5 minutos no futuro, com mais de 30 dias ou com ano letivo diferente do ano do horário; o horário da anulação também não pode estar no futuro.

### Banco de dados

Tabelas `usuarios`, `sessoes`, `alunos` e `registros_atraso`, criadas por `backend/mysql/migracoes/001_inicial.sql` com checks e triggers:

- o usuário `edutrack_api` não tem permissão de `DELETE` em alunos, atrasos e usuários;
- a única alteração permitida num atraso é anulá-lo, uma única vez;
- os horários de criação, alteração e anulação são carimbados pelo próprio banco.

### Login

- Senhas guardadas com `scrypt`; nunca em texto puro.
- A sessão é um token aleatório enviado no cabeçalho `Authorization: Bearer`; o banco guarda só o hash SHA-256 dele. Validade de 30 dias.
- Cinco senhas erradas em 15 minutos para o mesmo usuário e IP bloqueiam novas tentativas (`429`).
- Só porteiros têm conta, e todos têm as mesmas permissões. Quem anulou cada registro fica gravado.

### Fila offline

- Se o envio falhar por falta de conexão, tempo esgotado (15 s) ou erro do servidor, o registro vai para uma fila no navegador (IndexedDB) e a tela avisa "Será enviado automaticamente".
- O reenvio acontece no login, quando a conexão volta, a cada 60 segundos e no botão "Enviar agora".
- O `id` de cada registro é gerado no navegador (`crypto.randomUUID`), então reenviar nunca duplica.
- "Sair" fica bloqueado enquanto houver registros não enviados.

### Padronização do texto

Ao salvar, nome, curso, período, série, turma e sala são padronizados (minúsculas, sem acento, sem pontuação, espaços simples: `"João  da Silva"` → `"joao da silva"`). O texto digitado é guardado à parte em `exibicao` e é **o que aparece nas telas**; a versão padronizada serve para busca e agrupamento. O motivo fica como foi digitado.

Cada atraso aponta para um aluno do cadastro (`alunoId`) e guarda o curso, a turma e a sala **daquele dia**: se o aluno mudar de curso, os atrasos antigos continuam com o curso antigo.

## Padrões do código

### Nomes

- Arquivos, pastas, componentes, funções, variáveis, tipos e campos em **português sem acento**. Componentes em PascalCase (`RegistroAtraso`), o resto em camelCase (`criarRegistroAtraso`).
- Nomes exigidos por bibliotecas, HTML e protocolos ficam como são (`main.tsx`, `useState`, `children`, `className`, `onClick`, `id`, `key`, `ref`, `Body` e `Params`). Eles são contratos externos, não identificadores próprios do projeto.
- Textos mostrados ao usuário em português do Brasil.

### Telas (`frontend/`)

- **Estilo:** só Tailwind v4 com os tokens de `src/estilos/tema.css`. Sem CSS próprio, sem biblioteca de componentes e sem cores soltas (`bg-[#...]`).
- **Componentes:** funcionais, com props tipadas; variantes num objeto `Record<Variante, string>`. Antes de criar algo novo, reaproveitar `componentes/` (`Botao`, `Entrada`, `AreaTexto`, `Modal`, `Alerta`, `Selo`, `Painel`, `CartaoEstatistica`, `EstadoVazio`, `EstadoCarga`, `BarraLateral`, `Cabecalho`, `CapturaCamera`, `FotoAluno`, `CampoBusca`, `SeloEnvio`).
- **Cores com significado:** vermelho da marca só na barra lateral, no logotipo e no PDF; âmbar (`alerta`) para reincidência e avisos; vermelho de perigo para erro e anulação, sempre com ícone.
- **Regras de negócio puras** ficam em `src/regras/` (`regrasRegistroAtraso.ts`, `regrasAlunos.ts`), separadas das telas.
- **Acesso à rede:** `fetch` só existe em `src/servicos/api/clienteApi.ts`. As telas mostram apenas mensagens de erro próprias, nunca o texto devolvido pela API.
- **Fonte dos dados:** `src/servicos/dependencias.ts` escolhe, por `VITE_MODO_DADOS`, entre a API (`api`) e a memória (`memoria`).
- **Navegador:** guarda apenas a sessão (`localStorage`, chave `edutrack-sessao`) e a fila offline enquanto o registro aguarda envio.
- **Responsivo:** conferido em 1366×768 (computador), 820×1180 (tablet) e 390×844 (celular). Tabelas viram cartões abaixo de 1024 px.
- **Acessibilidade:** modais com `<dialog>` nativo, foco no primeiro campo inválido, contraste AA e nenhuma animação com "reduzir movimento" ligado.

### API (`backend/api/`)

- O Node executa o TypeScript direto, então só se usa sintaxe que pode ser apagada: nada de `enum`, `namespace` ou propriedade de parâmetro, e imports relativos levam a extensão `.ts`.
- Quem criou, alterou ou anulou vem sempre do token da sessão, nunca do corpo da requisição; os horários vêm dos triggers do banco.
- Código compartilhado: esquemas de validação em `src/compartilhado/esquemas.ts`; `buscarPorId` e `inserirSeNovo` (insert idempotente) em `src/banco/banco.ts`.
- Respostas levam os cabeçalhos `Content-Security-Policy`, `X-Frame-Options: DENY` e `X-Content-Type-Options: nosniff`.

### Banco

- Migração já aplicada **nunca** é editada. Mudança no banco = arquivo novo `NNN_assunto.sql` em `backend/mysql/migracoes/`, aplicado com `npm.cmd run preparar-banco`.
- A aplicação nunca usa `DELETE` nem upsert em alunos, atrasos e usuários.

### Regras de manutenção

- Preserve a fila offline e a idempotência: um `POST` repetido com o mesmo `id` devolve o registro persistido.
- Preserve o retrato histórico do atraso; alterações futuras no cadastro do aluno não mudam registros antigos.
- `registradoPor` e `anuladoPor` preservam o operador original da fila; `criado_por`, `atualizado_por` e `anulado_por_id` são auditáveis e vêm da sessão autenticada.
- Não aceite do corpo da requisição campos técnicos de autoria, caminhos arbitrários ou carimbos controlados pelo banco.
- Não edite uma migração aplicada. Crie a próxima migração numerada.
- Não use Git ou GitHub em scripts de manutenção automática sem autorização explícita.

### Formatação

- Prettier: `npm.cmd run format` em `frontend/` e em `backend/api/`.
- Arquivos em UTF-8 sem BOM. No PowerShell 5.1, evite `Set-Content`/`Out-File` sem `-Encoding utf8`, que quebram os acentos.

## Segurança e dados pessoais

- `.env`, `.env.local`, senhas, tokens e fotos **nunca** vão para o repositório (veja o `.gitignore`).
- Fotos ficam em `backend/api/dados/fotos/` e só são exibidas por link assinado que vale 1 hora.
- A API escuta só em `127.0.0.1`: apenas o próprio computador acessa. Liberar o acesso para outros computadores da rede exige HTTPS.
- A câmera e o `crypto.randomUUID` só funcionam em `localhost` ou HTTPS.
- Exclusão de dados pessoais (LGPD) é feita pelo responsável pelo banco, com o usuário administrador, direto no MySQL. A aplicação não apaga nada.
- Backup: dump do banco `edutrack` + cópia da pasta `backend/api/dados/fotos/`.

### Backup e restauração

Faça o backup com a API parada ou em uma janela sem novas gravações:

```powershell
mysqldump -u root -p --single-transaction edutrack > edutrack-backup.sql
Copy-Item backend\api\dados\fotos edutrack-fotos-backup -Recurse
```

Restaure primeiro o banco e depois as fotos:

```powershell
mysql -u root -p edutrack < edutrack-backup.sql
Copy-Item edutrack-fotos-backup backend\api\dados\fotos -Recurse -Force
```

Teste a restauração em ambiente separado antes de depender desse backup. Os arquivos de backup contêm dados pessoais e não devem entrar no repositório.

## Problemas comuns

| Sintoma                                    | Causa provável                                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `preparar-banco` falha com erro de conexão | MySQL parado (no Windows, inicie o serviço `MySQL80`) ou senha de `BD_ADMIN_SENHA` errada                     |
| A API não inicia e reclama de variável     | Falta alguma variável no `backend/api/.env` ou `SEGREDO_FOTOS` tem menos de 32 caracteres                     |
| `EADDRINUSE` ao iniciar                    | A porta 3001 já está em uso: feche o outro processo ou troque `PORTA` no `.env`                               |
| Tela "O EduTrack não está configurado"     | `VITE_MODO_DADOS` com valor diferente de `api` ou `memoria`                                                   |
| A câmera não abre                          | Permissão negada no navegador, câmera em uso por outro programa ou página aberta por IP em vez de `localhost` |
| `npm` não é reconhecido no PowerShell      | Use `npm.cmd`                                                                                                 |

## Estado atual e pendências

**Apresentação local:** apta. O fluxo sem foto foi exercitado em navegador nas larguras 1366×768, 820×1180 e 390×844, sem rolagem horizontal ou erros no console.

**Produção com dados reais:** ainda não aprovada. Antes do uso real:

- trocar senhas de teste por senhas fortes;
- criar testes automatizados para sessão, alunos, registros, anulação e fotos da API;
- executar os testes da API contra um MySQL isolado;
- testar em tablet real: foto, perda de rede, fila e reenvio único;
- executar e validar backup e restauração completos;
- definir retenção, expurgo e responsável pelas fotos conforme a LGPD;
- definir papéis se a anulação e a edição de alunos precisarem ficar restritas à coordenação.

Limitações conhecidas:

- ano letivo usa o ano civil;
- listagens ainda não possuem paginação;
- limite de tentativas de login vive na memória do processo;
- sessão expira em 30 dias, sem expiração específica por inatividade;
- acesso por outros computadores exige HTTPS e configuração de rede;
- recarga silenciosa dos dados não apresenta falhas ao usuário.

Fora do escopo atual: chamada por turma, reconhecimento facial, cadastro público de usuários, expurgo automático e hospedagem externa.

## Licença

Projeto acadêmico. A licença será definida em etapa posterior.
