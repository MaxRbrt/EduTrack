import gsap from 'gsap';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// ============================================================
// 1. CONSTANTES DO RELÓGIO
// Relógio de parede de escola. Aro azul-marinho, ponteiro de segundos vermelho.
// Minuto 420 = 07:00, hora que portão fecha.
// ============================================================

const COR_PONTEIRO = '#e5383b';
const COR_TINTA = '#14213d';
const COR_TINTA_SUAVE = '#4a5878';
const COR_MOSTRADOR = '#fbfaf6';
const COR_ARO = '#14213d';
const VOLTA = Math.PI * 2;
const TAMANHO_TEXTURA = 1024;
const MINUTO_PORTAO = 7 * 60;
const INCLINACAO_BASE = { x: 0.08, y: -0.24 };
const INCLINACAO_MOUSE = 0.14;

export interface Relogio {
  definirMinutos(minutosDoDia: number): void;
}

interface FormaPonteiro {
  comprimento: number;
  larguraBase: number;
  larguraPonta: number;
  cauda: number;
  espessura: number;
  cor: string;
  altura: number;
}

interface Ponteiros {
  hora: THREE.Group;
  minuto: THREE.Group;
  segundo: THREE.Group;
}

// ============================================================
// 2. MOSTRADOR DESENHADO EM CANVAS
// Traço de minuto, número de hora, nome EduTrack. Vira textura do disco.
// ============================================================

function desenharTracos(contexto: CanvasRenderingContext2D, raio: number): void {
  contexto.strokeStyle = COR_TINTA;

  for (let minuto = 0; minuto < 60; minuto += 1) {
    const marcaDeHora = minuto % 5 === 0;
    const comprimento = marcaDeHora ? raio * 0.1 : raio * 0.035;

    contexto.lineWidth = marcaDeHora ? raio * 0.026 : raio * 0.008;
    contexto.save();
    contexto.rotate((minuto / 60) * VOLTA);
    contexto.beginPath();
    contexto.moveTo(0, -raio * 0.95);
    contexto.lineTo(0, -raio * 0.95 + comprimento);
    contexto.stroke();
    contexto.restore();
  }
}

function desenharNumeros(contexto: CanvasRenderingContext2D, raio: number): void {
  const distancia = raio * 0.69;

  contexto.fillStyle = COR_TINTA;
  contexto.font = `600 ${raio * 0.17}px "Fredoka", sans-serif`;
  contexto.textAlign = 'center';
  contexto.textBaseline = 'middle';

  for (let hora = 1; hora <= 12; hora += 1) {
    const angulo = (hora / 12) * VOLTA;
    const x = Math.sin(angulo) * distancia;
    const y = -Math.cos(angulo) * distancia + raio * 0.012;

    contexto.fillText(String(hora), x, y);
  }
}

function desenharLegenda(contexto: CanvasRenderingContext2D, raio: number): void {
  contexto.fillStyle = COR_TINTA_SUAVE;
  contexto.font = `600 ${raio * 0.08}px "Fredoka", sans-serif`;
  contexto.fillText('EduTrack', 0, -raio * 0.34);

  contexto.fillStyle = COR_PONTEIRO;
  contexto.font = `800 ${raio * 0.045}px "Nunito", sans-serif`;
  contexto.letterSpacing = `${raio * 0.012}px`;
  contexto.fillText('PORTARIA', 0, raio * 0.36);
}

function criarTexturaMostrador(): THREE.CanvasTexture {
  const tela = document.createElement('canvas');
  const raio = TAMANHO_TEXTURA / 2;

  tela.width = TAMANHO_TEXTURA;
  tela.height = TAMANHO_TEXTURA;

  const textura = new THREE.CanvasTexture(tela);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 8;

  const contexto = tela.getContext('2d');
  if (!contexto) {
    return textura;
  }

  contexto.fillStyle = COR_MOSTRADOR;
  contexto.fillRect(0, 0, TAMANHO_TEXTURA, TAMANHO_TEXTURA);
  contexto.translate(raio, raio);
  desenharTracos(contexto, raio);
  desenharNumeros(contexto, raio);
  desenharLegenda(contexto, raio);

  return textura;
}

// ============================================================
// 3. SETOR DE ATRASO
// Fatia vermelha do 12 até ponteiro de minuto. Cresce depois de 07:00.
// Shader corta fatia por ângulo, borda da frente mais forte.
// ============================================================

const VERTICE_SETOR = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENTO_SETOR = `
  uniform float uAngulo;
  uniform vec3 uCor;
  varying vec2 vUv;

  void main() {
    vec2 ponto = vUv * 2.0 - 1.0;
    float raio = length(ponto);
    float angulo = atan(ponto.x, ponto.y);

    if (angulo < 0.0) {
      angulo += 6.2831853;
    }

    bool fora = uAngulo <= 0.0 || angulo > uAngulo || raio > 0.9 || raio < 0.06;

    if (fora) {
      discard;
    }

    float frente = smoothstep(uAngulo - 0.14, uAngulo, angulo);
    gl_FragColor = vec4(uCor, 0.14 + 0.24 * frente);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function criarSetorAtraso(): THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uAngulo: { value: 0 },
      uCor: { value: new THREE.Color(COR_PONTEIRO) },
    },
    vertexShader: VERTICE_SETOR,
    fragmentShader: FRAGMENTO_SETOR,
  });

  const setor = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  setor.position.z = 0.004;

  return setor;
}

// ============================================================
// 4. PEÇAS FÍSICAS
// Aro, fundo, vidro, ponteiros, eixo. Sombra borrada atrás = relógio pendurado na lousa.
// ============================================================

function criarAro(): THREE.Group {
  const perfil = [
    new THREE.Vector2(0.97, 0.01),
    new THREE.Vector2(0.99, 0.15),
    new THREE.Vector2(1.06, 0.2),
    new THREE.Vector2(1.14, 0.17),
    new THREE.Vector2(1.18, 0.06),
    new THREE.Vector2(1.17, -0.12),
    new THREE.Vector2(1.08, -0.16),
  ];
  const geometriaAro = new THREE.LatheGeometry(perfil, 160);
  geometriaAro.rotateX(Math.PI / 2);

  const materialAro = new THREE.MeshStandardMaterial({
    color: COR_ARO,
    roughness: 0.28,
    metalness: 0.35,
    side: THREE.DoubleSide,
  });

  const geometriaFundo = new THREE.CylinderGeometry(1.08, 1.08, 0.16, 96);
  geometriaFundo.rotateX(Math.PI / 2);

  const fundo = new THREE.Mesh(geometriaFundo, materialAro);
  fundo.position.z = -0.1;

  const aro = new THREE.Group();
  aro.add(new THREE.Mesh(geometriaAro, materialAro), fundo);

  return aro;
}

function criarMostrador(): THREE.Mesh {
  const material = new THREE.MeshStandardMaterial({
    map: criarTexturaMostrador(),
    roughness: 0.82,
    metalness: 0,
  });

  const mostrador = new THREE.Mesh(new THREE.CircleGeometry(0.985, 128), material);
  mostrador.receiveShadow = true;

  return mostrador;
}

function criarVidro(): THREE.Mesh {
  const material = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.08,
    roughness: 0.04,
    metalness: 0,
    clearcoat: 1,
    depthWrite: false,
  });

  const vidro = new THREE.Mesh(new THREE.CircleGeometry(1, 96), material);
  vidro.position.z = 0.17;

  return vidro;
}

function criarPonteiro(forma: FormaPonteiro): THREE.Group {
  const contorno = new THREE.Shape();
  contorno.moveTo(-forma.larguraBase / 2, -forma.cauda);
  contorno.lineTo(forma.larguraBase / 2, -forma.cauda);
  contorno.lineTo(forma.larguraPonta / 2, forma.comprimento);
  contorno.lineTo(-forma.larguraPonta / 2, forma.comprimento);
  contorno.closePath();

  const geometria = new THREE.ExtrudeGeometry(contorno, {
    depth: forma.espessura,
    bevelEnabled: false,
  });
  const material = new THREE.MeshStandardMaterial({
    color: forma.cor,
    roughness: 0.45,
    metalness: 0.15,
  });

  const malha = new THREE.Mesh(geometria, material);
  malha.castShadow = true;

  const pivo = new THREE.Group();
  pivo.position.z = forma.altura;
  pivo.add(malha);

  return pivo;
}

function criarDisco(raio: number, espessura: number, cor: string): THREE.Mesh {
  const geometria = new THREE.CylinderGeometry(raio, raio, espessura, 48);
  geometria.rotateX(Math.PI / 2);

  const material = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.4, metalness: 0.2 });
  const disco = new THREE.Mesh(geometria, material);
  disco.castShadow = true;

  return disco;
}

function criarPonteiros(): Ponteiros {
  const hora = criarPonteiro({
    comprimento: 0.5,
    larguraBase: 0.075,
    larguraPonta: 0.04,
    cauda: 0.1,
    espessura: 0.018,
    cor: COR_TINTA,
    altura: 0.02,
  });
  const minuto = criarPonteiro({
    comprimento: 0.8,
    larguraBase: 0.055,
    larguraPonta: 0.026,
    cauda: 0.12,
    espessura: 0.016,
    cor: COR_TINTA,
    altura: 0.045,
  });
  const segundo = criarPonteiro({
    comprimento: 0.86,
    larguraBase: 0.022,
    larguraPonta: 0.012,
    cauda: 0.26,
    espessura: 0.012,
    cor: COR_PONTEIRO,
    altura: 0.07,
  });

  const contrapeso = criarDisco(0.05, 0.012, COR_PONTEIRO);
  contrapeso.position.set(0, -0.19, 0.006);
  segundo.add(contrapeso);

  return { hora, minuto, segundo };
}

function criarEixo(): THREE.Group {
  const base = criarDisco(0.06, 0.05, COR_TINTA);
  base.position.z = 0.05;

  const tampa = criarDisco(0.03, 0.03, COR_PONTEIRO);
  tampa.position.z = 0.09;

  const eixo = new THREE.Group();
  eixo.add(base, tampa);

  return eixo;
}

function criarSombraNaLousa(): THREE.Mesh {
  const tela = document.createElement('canvas');
  tela.width = 256;
  tela.height = 256;

  const contexto = tela.getContext('2d');
  if (contexto) {
    const gradiente = contexto.createRadialGradient(128, 128, 40, 128, 128, 128);
    gradiente.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
    gradiente.addColorStop(1, 'rgba(0, 0, 0, 0)');
    contexto.fillStyle = gradiente;
    contexto.fillRect(0, 0, 256, 256);
  }

  const material = new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(tela),
    transparent: true,
    depthWrite: false,
  });

  const sombra = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), material);
  sombra.position.set(0.1, -0.14, -0.32);

  return sombra;
}

// ============================================================
// 5. CENA, LUZ E RENDERIZADOR
// Ambiente RoomEnvironment dá reflexo no aro. Luz direcional faz sombra do ponteiro.
// ============================================================

function criarRenderizador(canvas: HTMLCanvasElement): THREE.WebGLRenderer | null {
  try {
    const renderizador = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderizador.toneMapping = THREE.NeutralToneMapping;
    renderizador.shadowMap.enabled = true;
    renderizador.shadowMap.type = THREE.PCFShadowMap;
    return renderizador;
  } catch {
    return null;
  }
}

function iluminar(cena: THREE.Scene, renderizador: THREE.WebGLRenderer): void {
  const gerador = new THREE.PMREMGenerator(renderizador);
  cena.environment = gerador.fromScene(new RoomEnvironment(), 0.04).texture;
  cena.environmentIntensity = 0.7;
  gerador.dispose();

  const luz = new THREE.DirectionalLight('#ffffff', 1.6);
  luz.position.set(-2.2, 3, 4);
  luz.castShadow = true;
  luz.shadow.mapSize.set(1024, 1024);
  luz.shadow.camera.left = -1.4;
  luz.shadow.camera.right = 1.4;
  luz.shadow.camera.top = 1.4;
  luz.shadow.camera.bottom = -1.4;
  luz.shadow.radius = 4;
  luz.shadow.bias = -0.0005;

  cena.add(luz);
}

async function esperarFontes(): Promise<void> {
  const carregamento = Promise.all([
    document.fonts.load('600 100px "Fredoka"'),
    document.fonts.load('800 24px "Nunito"'),
  ]);
  const limite = new Promise((resolver) => setTimeout(resolver, 2000));

  await Promise.race([carregamento, limite]);
}

// ============================================================
// 6. RELÓGIO MONTADO
// Rolagem define minuto e hora. Segundo anda sozinho, com tique mecânico.
// Loop só roda com relógio visível. Movimento reduzido = desenha só quando muda.
// ============================================================

function anguloDoSegundo(segundos: number): number {
  const inteiro = Math.floor(segundos);
  const fracao = segundos - inteiro;
  const avanco = gsap.parseEase('back.out(3)')(Math.min(fracao / 0.18, 1));

  return ((inteiro - 1 + avanco) / 60) * VOLTA;
}

export async function criarRelogio(
  canvas: HTMLCanvasElement,
  movimentoReduzido: boolean,
): Promise<Relogio | null> {
  const renderizador = criarRenderizador(canvas);
  if (!renderizador) {
    return null;
  }

  await esperarFontes();

  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  camera.position.set(0, 0, 6.4);
  iluminar(cena, renderizador);

  const ponteiros = criarPonteiros();
  const setor = criarSetorAtraso();
  const relogio = new THREE.Group();
  relogio.add(criarAro(), criarMostrador(), setor, criarVidro(), criarEixo());
  relogio.add(ponteiros.hora, ponteiros.minuto, ponteiros.segundo);
  relogio.rotation.set(INCLINACAO_BASE.x, INCLINACAO_BASE.y, 0);

  const giro = new THREE.Group();
  giro.add(relogio);
  cena.add(criarSombraNaLousa(), giro);

  const alvoMouse = { x: 0, y: 0 };
  const inicio = performance.now();

  const ajustarTamanho = (): void => {
    const largura = canvas.clientWidth;
    const altura = canvas.clientHeight;
    const tamanhoInvalido = largura === 0 || altura === 0;

    if (tamanhoInvalido) {
      return;
    }

    renderizador.setSize(largura, altura, false);
    camera.aspect = largura / altura;
    camera.updateProjectionMatrix();
    renderizador.render(cena, camera);
  };

  const desenharQuadro = (): void => {
    const segundos = (performance.now() - inicio) / 1000;
    ponteiros.segundo.rotation.z = -anguloDoSegundo(segundos);

    giro.rotation.x += (alvoMouse.y * INCLINACAO_MOUSE - giro.rotation.x) * 0.06;
    giro.rotation.y += (alvoMouse.x * INCLINACAO_MOUSE - giro.rotation.y) * 0.06;

    renderizador.render(cena, camera);
  };

  new ResizeObserver(ajustarTamanho).observe(canvas);
  ajustarTamanho();

  if (!movimentoReduzido) {
    window.addEventListener('pointermove', (evento) => {
      alvoMouse.x = (evento.clientX / window.innerWidth) * 2 - 1;
      alvoMouse.y = (evento.clientY / window.innerHeight) * 2 - 1;
    });

    new IntersectionObserver(([entrada]) => {
      renderizador.setAnimationLoop(entrada.isIntersecting ? desenharQuadro : null);
    }).observe(canvas);

    gsap.from(relogio.rotation, {
      x: INCLINACAO_BASE.x + 0.4,
      y: INCLINACAO_BASE.y - 1.3,
      duration: 2,
      ease: 'expo.out',
    });
    gsap.from(relogio.scale, { x: 0.8, y: 0.8, z: 0.8, duration: 1.6, ease: 'expo.out' });
  }

  return {
    definirMinutos(minutosDoDia: number): void {
      const minutoDaHora = minutosDoDia % 60;
      const horaDoMostrador = (minutosDoDia / 60) % 12;
      const minutosDeAtraso = Math.min(Math.max(minutosDoDia - MINUTO_PORTAO, 0), 60);

      ponteiros.minuto.rotation.z = -(minutoDaHora / 60) * VOLTA;
      ponteiros.hora.rotation.z = -(horaDoMostrador / 12) * VOLTA;
      setor.material.uniforms.uAngulo.value = (minutosDeAtraso / 60) * VOLTA;

      if (movimentoReduzido) {
        renderizador.render(cena, camera);
      }
    },
  };
}
