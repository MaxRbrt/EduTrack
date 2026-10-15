# EduTrack

Registro de **entradas atrasadas** na portaria escolar. Portaria tira foto do aluno, informa quem é e o motivo. Dashboard e histórico acompanham reincidência no ano letivo.

> Não é sistema de chamada nem de frequência. Registra só quem entrou atrasado.

## Funcionalidades

| Rota         | Tela               | O que faz                                                                         |
| ------------ | ------------------ | --------------------------------------------------------------------------------- |
| `/entrar`    | Entrar             | Login do porteiro                                                                 |
| `/dashboard` | Dashboard          | Totais do dia/mês/ano, reincidentes, distribuição por dia e horário, filtros, PDF |
| `/registrar` | Registrar atraso   | Foto pela webcam, busca do aluno (tolera erro de digitação), motivo, confirmação  |
| `/historico` | Histórico do aluno | Perfil, totais, todos os atrasos, anulação e PDF                                  |
| `/alunos`    | Alunos             | Cadastrar, editar, foto, inativar e reativar                                      |

- **Funciona sem internet:** registro fica no navegador e é enviado sozinho quando a conexão volta, sem duplicar.
- **Nada é apagado:** registro errado é **anulado com justificativa**; aluno que sai é **inativado**.
- **Reincidência:** aviso no 3º atraso do ano.
- **PDF** gerado no navegador, sem fotos.

## Tecnologias

| Parte                    | Tecnologias                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| Telas (`frontend/`)      | React 19, TypeScript, Vite, React Router, Tailwind CSS v4, GSAP, Lucide, jsPDF, idb-keyval |
| API (`backend/api/`)     | Node.js 24, Fastify, mysql2. TypeScript executado direto pelo Node, sem build              |
| Banco (`backend/mysql/`) | MySQL 8                                                                                    |

## Instalação

Tudo roda no próprio computador. No fim, o sistema abre em **http://localhost:3001**.

### 1. Pré-requisitos

- [Node.js](https://nodejs.org/) **24+** (conferir: `node -v`)
- [MySQL](https://dev.mysql.com/downloads/) **8** rodando (Windows: serviço `MySQL80`) e a senha do `root`
- Chrome ou Edge, com webcam

> **PowerShell:** use `npm.cmd` (o `npm` comum costuma ser bloqueado). Em Git Bash, Linux ou macOS, use `npm`.

### 2. Baixar

```powershell
git clone https://github.com/MaxRbrt/EduTrack.git
cd EduTrack
```

### 3. Configurar

```powershell
cd backend\api
copy .env.example .env
notepad .env
```

| Variável                             | O que colocar                                                                |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| `BD_SENHA`                           | **Invente uma senha forte.** O passo 4 cria o usuário `edutrack_api` com ela |
| `BD_ADMIN_USUARIO`, `BD_ADMIN_SENHA` | `root` e a senha dele. Só usado para preparar o banco                        |
| `SEGREDO_FOTOS`                      | Texto aleatório, **32+ caracteres** (comando abaixo)                         |
| Demais                               | Já vêm com padrão: porta `3001`, banco `edutrack`, MySQL em `localhost:3306` |

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

O `.env` tem senhas: está no `.gitignore` e **nunca** vai para o repositório. Falta variável = API não inicia.

### 4. Preparar o banco

```powershell
npm.cmd install
npm.cmd run preparar-banco
```

Cria o banco, aplica as migrações e cria o usuário MySQL `edutrack_api` (**sem permissão de apagar** dados). Pode rodar de novo: só aplica o que falta.

Na primeira instalação cria também o **login padrão**:

| Usuário     | Senha       |
| ----------- | ----------- |
| `porteiro1` | `porteiro1` |

Só é criado se não existir nenhum porteiro. Rodar de novo nunca redefine a senha.

### 5. Trocar senha e criar porteiros

**Antes de usar com dados reais, troque a senha padrão:**

```powershell
npm.cmd run criar-usuario -- porteiro1
```

- Senha mínima: 8 caracteres. Ela aparece na tela enquanto é digitada.
- Outro nome (`porteiro2`...) cria mais porteiros. Nome existente troca a senha e encerra as sessões dele.
- Usuário não diferencia maiúsculas; senha diferencia.
- Não existe cadastro de usuário pela tela.

### 6. Gerar as telas

Em outro terminal, na raiz do projeto:

```powershell
cd frontend
npm.cmd install
npm.cmd run build
```

Aviso do npm sobre `core-js` pode ser ignorado.

### 7. Iniciar

Em `backend\api`:

```powershell
npm.cmd run iniciar
```

Abra **http://localhost:3001** e entre com `porteiro1` / `porteiro1` (ou a senha trocada). Deixe o terminal aberto enquanto usa.

## Desenvolvimento

```powershell
# terminal 1: API, reinicia ao salvar
cd backend\api
npm.cmd run dev

# terminal 2: telas com recarga automática
cd frontend
npm.cmd run dev
```

Abra **http://localhost:5173**. O Vite repassa `/api` para a porta 3001.

**Sem banco:** crie `frontend/.env.local` com `VITE_MODO_DADOS=memoria`. Login simulado, dados só na memória (somem ao recarregar). Só funciona em desenvolvimento; o build de produção recusa.

### Verificação

Rodar tudo antes de concluir uma alteração:

```powershell
cd frontend
npm.cmd test
npm.cmd run build        # confere tipos e gera as telas
npm.cmd audit --omit=dev

cd backend\api
npm.cmd test
npm.cmd run tipos
npm.cmd audit --omit=dev
```

Estado em 15/10/2026: frontend 11 testes, API 9 testes, build e tipos ok, 0 vulnerabilidades. Rotas da API ainda sem testes contra MySQL isolado.

## Estrutura

```text
frontend/src/
  componentes/   peças reutilizáveis (Botao, Modal, FotoAluno...)
  contextos/     sessão e dados da escola
  regras/        regras de negócio puras
  servicos/      login e repositórios; api/ (único fetch) e offline/ (fila)
  paginas/       Entrar, Painel, RegistroAtraso, HistoricoAluno, Alunos
  estruturas/    layout com menu e guarda de sessão
  relatorios/    PDFs (carregados sob demanda)
  estilos/       tema.css (Tailwind e cores)
backend/api/src/
  servidor.ts    entrada: lê .env, conecta no banco, sobe a API
  aplicacao.ts   Fastify: cabeçalhos de segurança, rotas, telas
  rotas/         sessao, alunos, registros, fotos
  servicos/      sessões (login) e fotos em disco
  banco/         conexão, migrações, consultas comuns
  compartilhado/ erros, validação, conferência de horários
  scripts/       preparar-banco e criar-usuario
backend/mysql/migracoes/   SQL do banco (NNN_assunto.sql)
```

## Como funciona

**Registro:** aluno chega → portaria tira foto → busca o aluno (sem cadastro: preenche curso, período, série, turma e sala; nome parecido pede confirmação) → motivo → confirma. Data e hora automáticas.

**Dados:** navegador → API (porta 3001) → MySQL. Fotos em `backend/api/dados/fotos/`. A API também entrega as telas compiladas. Datas em UTC.

### Rotas da API

| Rota                               | Uso                        |
| ---------------------------------- | -------------------------- |
| `POST` / `DELETE /api/sessao`      | Entrar / sair              |
| `GET` / `POST /api/alunos`         | Listar / cadastrar alunos  |
| `PATCH /api/alunos/:id`            | Editar, inativar, reativar |
| `GET` / `POST /api/registros`      | Listar / registrar atrasos |
| `POST /api/registros/:id/anulacao` | Anular (com justificativa) |

- `POST` com `id` já existente responde `200` com o gravado. É o que permite reenviar a fila offline sem duplicar.
- Horário do atraso vem do navegador (a fila envia depois). A API recusa horário 5+ min no futuro, com 30+ dias ou com ano letivo diferente do ano da data. Anulação no futuro também é recusada.

### Banco

Tabelas `usuarios`, `sessoes`, `alunos`, `registros_atraso` (`001_inicial.sql`), com checks e triggers:

- `edutrack_api` sem `DELETE` em alunos, atrasos e usuários;
- atraso só pode ser anulado, uma vez;
- recebimento, alteração e anulação carimbados pelo próprio banco.

### Login

- Senha com `scrypt`, nunca em texto puro.
- Sessão: token aleatório (`Authorization: Bearer`), banco guarda só o hash SHA-256. Vale 30 dias.
- 5 senhas erradas em 15 min (mesmo usuário e IP) → bloqueio (`429`).
- Só porteiros têm conta, todos com as mesmas permissões. Quem anulou fica gravado.

### Fila offline

- Falha de rede, 15 s sem resposta ou erro do servidor → registro vai para fila no navegador (IndexedDB).
- Reenvio: no login, quando a conexão volta, a cada 60 s e no botão "Enviar agora".
- `id` gerado no navegador → reenviar nunca duplica.
- "Sair" bloqueado enquanto houver registro não enviado.

### Texto padronizado

Nome, curso, período, série, turma e sala viram minúsculas, sem acento e sem pontuação para busca (`"João  da Silva"` → `"joao da silva"`). O texto digitado fica em `exibicao` e é o que aparece nas telas. Cada atraso guarda curso, turma e sala **do dia**: mudar o cadastro não altera atrasos antigos.

## Padrões do código

- **Nomes** em português sem acento. Componentes em PascalCase, resto em camelCase. Nomes de bibliotecas e HTML ficam como são (`useState`, `className`...).
- **Telas:** só Tailwind com tokens de `tema.css`, sem CSS próprio nem cores soltas. Reaproveitar `componentes/` antes de criar novo. Regras de negócio em `src/regras/`. `fetch` só em `clienteApi.ts`. Telas mostram mensagens próprias, nunca o texto da API.
- **Cores:** vermelho da marca só na barra lateral, logotipo e PDF; âmbar para reincidência e avisos; vermelho de perigo para erro e anulação, sempre com ícone.
- **Responsivo:** 1366×768, 820×1180 e 390×844. Tabelas viram cartões abaixo de 1024 px.
- **Acessibilidade:** `<dialog>` nativo, foco no primeiro campo inválido, contraste AA, sem animação com "reduzir movimento".
- **API:** só sintaxe TypeScript apagável (nada de `enum` ou `namespace`); imports relativos com `.ts`. Autoria vem sempre da sessão, nunca do corpo da requisição.
- **Banco:** migração aplicada **nunca** é editada; mudança = novo `NNN_assunto.sql`. Nunca `DELETE` nem upsert em alunos, atrasos e usuários.
- **Preservar:** fila offline, idempotência (`POST` repetido devolve o gravado) e retrato histórico do atraso.
- **Formatação:** `npm.cmd run format` (Prettier) em `frontend/` e `backend/api/`. Arquivos UTF-8 sem BOM.

## Segurança e dados pessoais

- `.env`, senhas, tokens e fotos **nunca** vão para o repositório.
- Fotos só abrem por link assinado válido por 1 hora.
- API escuta só em `127.0.0.1`: só o próprio computador acessa. Outros computadores ou tablets exigem HTTPS.
- Câmera só funciona em `localhost` ou HTTPS.
- Exclusão de dados pessoais (LGPD): feita pelo responsável, direto no MySQL. A aplicação não apaga nada.

### Backup

Com a API parada:

```powershell
mysqldump -u root -p --single-transaction edutrack > edutrack-backup.sql
Copy-Item backend\api\dados\fotos edutrack-fotos-backup -Recurse
```

Restaurar (banco primeiro, depois fotos):

```powershell
mysql -u root -p edutrack < edutrack-backup.sql
Copy-Item edutrack-fotos-backup backend\api\dados\fotos -Recurse -Force
```

Teste a restauração antes de depender dela. Backups têm dados pessoais: fora do repositório.

## Problemas comuns

| Sintoma                              | Causa provável                                                                |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| `preparar-banco` com erro de conexão | MySQL parado (inicie `MySQL80`) ou `BD_ADMIN_SENHA` errada                    |
| API não inicia e reclama de variável | Falta variável no `.env` ou `SEGREDO_FOTOS` com menos de 32 caracteres        |
| `EADDRINUSE`                         | Porta 3001 ocupada: feche o outro processo ou troque `PORTA`                  |
| "O EduTrack não está configurado"    | `VITE_MODO_DADOS` diferente de `api` ou `memoria`                             |
| Câmera não abre                      | Permissão negada, câmera em uso ou página aberta por IP em vez de `localhost` |
| `npm` não reconhecido no PowerShell  | Use `npm.cmd`                                                                 |
| Erro com texto técnico no terminal   | A mensagem em português está na linha que começa com `Error:`                 |

## Estado atual

**Teste e apresentação:** apto. Instalação do zero validada a partir do GitHub.

**Produção com dados reais:** ainda não aprovada. Falta:

- trocar a senha padrão `porteiro1` e usar senhas fortes;
- testes automatizados das rotas da API contra MySQL isolado;
- testar câmera, perda de rede e reenvio no equipamento real;
- validar backup e restauração;
- definir retenção e responsável pelas fotos (LGPD);
- definir papéis, se anulação e edição de alunos forem só da coordenação.

**Limitações:** ano letivo = ano civil; sem paginação; limite de tentativas de login na memória do processo; sessão de 30 dias sem expirar por inatividade; acesso pela rede exige HTTPS; falha na recarga automática não aparece na tela.

**Fora do escopo:** chamada por turma, reconhecimento facial, cadastro público de usuários, expurgo automático, hospedagem externa.

## Licença

Projeto acadêmico. Licença a definir.
