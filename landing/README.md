# EduTrack · landing page

Página de apresentação do [EduTrack](https://github.com/MaxRbrt/EduTrack), sistema de registro
de atrasos na portaria da escola.

## Rodar

```bash
npm install
npm run dev       # desenvolvimento, http://localhost:5173
npm run build     # checa tipos e gera dist/
npm run preview   # serve dist/
```

`dist/` é estático (caminhos relativos): dá para publicar em qualquer hospedagem de site estático.

Publicação: `.github/workflows/publicar-landing.yml`, na raiz do repositório, roda build e publica
no GitHub Pages a cada push na `main` que mexa em `landing/`.

## Estrutura

| Arquivo                  | O que faz                                                               |
| ------------------------ | ----------------------------------------------------------------------- |
| `index.html`             | Conteúdo, rabiscos de giz da lousa (SVG) e telas ilustrativas do app    |
| `src/main.ts`            | Partida: registra plugins GSAP, cria relógio, inicia animações          |
| `src/relogio3d.ts`       | Relógio de parede em three.js, setor vermelho de atraso depois 07:00    |
| `src/animacoes.ts`       | Topo (relógio guiado pela rolagem), passos da portaria, fila com aviões |
| `src/animacoesSecoes.ts` | Letreiro, títulos, adesivos, painel, caderno, riscos, projeto, rodapé   |
| `src/estilos.css`        | Tokens de cor, ondas entre seções, layout e telas do app                |
| `public/ilustracoes/`    | Adesivos em SVG: lápis, mochila, ônibus, avião, régua, sino, estrela    |
| `public/favicon.svg`     | Ícone da aba                                                            |

## Decisões

- **Relógio 3D no topo**: rolagem leva ponteiros de 06:58 a 07:14. Passou das 07:00, fatia do
  mostrador fica vermelha.
- **Uma cor por seção, tirada do material escolar**: lousa verde, letreiro amarelo-lápis, portaria
  em azul-céu quadriculado, coordenação azul-marinho, sem internet verde-menta, histórico em folha
  pautada, escopo vermelho, situação azul-caneta. Ondas fazem a passagem entre elas.
- **Fontes arredondadas**: Fredoka (títulos, números, relógio) e Nunito (texto). Telas do app em
  Inter, igual ao EduTrack real.
- **Ilustrações próprias**: rabiscos de giz desenhados na abertura, adesivos com paralaxe e
  flutuação, aviões de papel levando cada registro da fila até o servidor.
- **Plugins GSAP**: ScrollTrigger, SplitText, DrawSVG e MotionPath, todos do pacote `gsap` público.
- **Telas do app desenhadas em código**: repo não tem print. Trocar por captura real quando houver.
- **Movimento reduzido**: sem pino nem animação. Relógio parado em 07:12, cada tela no estado
  final, passos trocam por clique.
- **Sem WebGL**: aparece relógio em SVG no lugar.

Dados das telas (nomes, totais, letreiro) são de demonstração.
