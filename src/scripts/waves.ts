// Ported from earendil.com — afl_ext's ocean weaves shader (MIT) + a dither
// post-process. Stripped of logo reflection, ripples, theme blending, light
// points and camera animation. Dither palette swapped to brutalist
// `--accent` / `--background` to match the site.

type Mode = 'animated' | 'static';

// ---------- quality presets (matches earendil's "medium") ----------
const QUALITY = {
  scale: 0.35,
  lowDpiScale: 0.595,
  raymarchSteps: 24,
  waveIterRaymarch: 6,
  waveIterNormal: 16,
  fbmOctaves: 3,
};
const LOW_DPI_THRESHOLD = 1.5;

// ---------- color helpers ----------
function hexToVec3(hex: string): [number, number, number] {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
function readPalette() {
  const css = getComputedStyle(document.documentElement);
  return {
    dark: hexToVec3(css.getPropertyValue('--accent') || '#2d5a2d'),
    light: hexToVec3(css.getPropertyValue('--background') || '#f0f0e8'),
  };
}

// ---------- shaders ----------
const oceanVertex = `
  attribute vec2 position;
  void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

function buildOceanFragment() {
  return `
  precision highp float;
  uniform vec2 iResolution;
  uniform float iTime;

  #define PI 3.14159265359
  #define DRAG_MULT 0.38
  #define WATER_DEPTH 1.0
  #define CAMERA_HEIGHT 1.5
  #define ITERATIONS_RAYMARCH ${QUALITY.waveIterRaymarch}
  #define ITERATIONS_NORMAL ${QUALITY.waveIterNormal}
  #define RAYMARCH_STEPS ${QUALITY.raymarchSteps}
  #define FBM_OCTAVES ${QUALITY.fbmOctaves}

  float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise21(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5, f = 1.0;
    for (int i = 0; i < FBM_OCTAVES; i++) {
      v += a * noise21(p * f);
      f *= 2.0; a *= 0.5;
    }
    return v;
  }

  vec2 wavedx(vec2 position, vec2 direction, float frequency, float timeshift) {
    float x = dot(direction, position) * frequency + timeshift;
    float wave = exp(sin(x) - 1.0);
    float dx = wave * cos(x);
    return vec2(wave, -dx);
  }

  float getwaves(vec2 position, int iterations) {
    float wavePhaseShift = length(position) * 0.1;
    vec2 swellDir = normalize(vec2(-0.25, 1.0));
    float swellBias = 0.35;
    float iter = 0.0;
    float frequency = 1.0;
    float timeMultiplier = 2.0;
    float weight = 1.0;
    float sumOfValues = 0.0;
    float sumOfWeights = 0.0;
    for (int i = 0; i < 16; i++) {
      if (i >= iterations) break;
      vec2 p = normalize(mix(vec2(sin(iter), cos(iter)), swellDir, swellBias));
      vec2 res = wavedx(position, p, frequency, iTime * timeMultiplier + wavePhaseShift);
      position += p * res.y * weight * DRAG_MULT;
      sumOfValues += res.x * weight;
      sumOfWeights += weight;
      weight = mix(weight, 0.0, 0.2);
      frequency *= 1.18;
      timeMultiplier *= 1.07;
      iter += 1232.399963;
    }
    float baseWaves = sumOfValues / sumOfWeights;
    float swellPhase = dot(position, swellDir) * 0.18 - iTime * 0.08;
    float swell = sin(swellPhase);
    vec2 cameraPos = vec2(iTime * 0.2, 1.0);
    float swellFade = smoothstep(28.0, 4.0, length(position - cameraPos));
    return baseWaves + swell * swellFade * 0.35;
  }

  float raymarchwater(vec3 camera, vec3 start, vec3 end, float depth) {
    vec3 pos = start;
    vec3 dir = normalize(end - start);
    for (int i = 0; i < RAYMARCH_STEPS; i++) {
      float height = getwaves(pos.xz, ITERATIONS_RAYMARCH) * depth - depth;
      if (height + 0.01 > pos.y) return distance(pos, camera);
      pos += dir * (pos.y - height);
    }
    return distance(start, camera);
  }

  vec3 normal(vec2 pos, float e, float depth) {
    vec2 ex = vec2(e, 0);
    float H = getwaves(pos.xy, ITERATIONS_NORMAL) * depth;
    vec3 a = vec3(pos.x, H, pos.y);
    return normalize(cross(
      a - vec3(pos.x - e, getwaves(pos.xy - ex.xy, ITERATIONS_NORMAL) * depth, pos.y),
      a - vec3(pos.x, getwaves(pos.xy + ex.yx, ITERATIONS_NORMAL) * depth, pos.y + e)
    ));
  }

  mat3 rotAxisAngle(vec3 axis, float angle) {
    float s = sin(angle), c = cos(angle), oc = 1.0 - c;
    return mat3(
      oc*axis.x*axis.x+c,        oc*axis.x*axis.y-axis.z*s, oc*axis.z*axis.x+axis.y*s,
      oc*axis.x*axis.y+axis.z*s, oc*axis.y*axis.y+c,        oc*axis.y*axis.z-axis.x*s,
      oc*axis.z*axis.x-axis.y*s, oc*axis.y*axis.z+axis.x*s, oc*axis.z*axis.z+c
    );
  }

  vec3 getRay(vec2 fragCoord) {
    vec2 uv = ((fragCoord.xy / iResolution.xy) * 2.0 - 1.0) * vec2(iResolution.x / iResolution.y, 1.0);
    vec3 proj = normalize(vec3(uv.x, uv.y, 1.5));
    return rotAxisAngle(vec3(1.0, 0.0, 0.0), 0.14) * proj;
  }

  float intersectPlane(vec3 origin, vec3 direction, vec3 point, vec3 normalv) {
    return clamp(dot(point - origin, normalv) / dot(direction, normalv), -1.0, 9991999.0);
  }

  vec3 extra_cheap_atmosphere(vec3 raydir, vec3 sundir) {
    float t1 = 1.0 / (raydir.y * 1.0 + 0.1);
    float t2 = 1.0 / (sundir.y * 11.0 + 1.0);
    float raysundt = pow(abs(dot(sundir, raydir)), 2.0);
    float sundt = pow(max(0.0, dot(sundir, raydir)), 8.0);
    float mymie = sundt * t1 * 0.2;
    vec3 suncolor = mix(vec3(1.0), max(vec3(0.0), vec3(1.0) - vec3(5.5, 13.0, 22.4) / 22.4), t2);
    vec3 bluesky = vec3(12.0, 12.0, 13.0) / 22.4 * suncolor;
    vec3 bluesky2 = max(vec3(0.0), bluesky - vec3(12.0, 12.0, 13.0) * 0.002 * (t1 + -6.0 * sundir.y * sundir.y));
    bluesky2 *= t1 * (0.24 + raysundt * 0.24);
    return bluesky2 * (1.0 + 1.0 * pow(1.0 - raydir.y, 3.0));
  }

  vec3 getSunDirection() { return normalize(vec3(-0.0773502691896258, 0.6, 0.5773502691896258)); }
  vec3 getAtmosphere(vec3 dir) { return extra_cheap_atmosphere(dir, getSunDirection()) * 0.5; }
  vec3 getDaySky(vec3 dir) { return getAtmosphere(dir) + vec3(1.0) * 0.0 * 4.0; }

  vec3 aces_tonemap(vec3 color) {
    mat3 m1 = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
    mat3 m2 = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
    vec3 v = m1 * color;
    vec3 a = v * (v + 0.0245786) - 0.000090537;
    vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
    return pow(clamp(m2 * (a / b), 0.0, 1.0), vec3(1.0 / 2.2));
  }

  void main() {
    vec3 ray = getRay(gl_FragCoord.xy);

    if (ray.y >= 0.0) {
      vec3 C = getDaySky(ray);
      gl_FragColor = vec4(aces_tonemap(C * 2.0), 1.0);
      return;
    }

    vec3 waterPlaneHigh = vec3(0.0, 0.0, 0.0);
    vec3 waterPlaneLow = vec3(0.0, -WATER_DEPTH, 0.0);
    vec3 origin = vec3(iTime * 0.2, CAMERA_HEIGHT, 1.0);

    float highHit = intersectPlane(origin, ray, waterPlaneHigh, vec3(0.0, 1.0, 0.0));
    float lowHit  = intersectPlane(origin, ray, waterPlaneLow,  vec3(0.0, 1.0, 0.0));
    vec3 highPos = origin + ray * highHit;
    vec3 lowPos  = origin + ray * lowHit;

    float dist = raymarchwater(origin, highPos, lowPos, WATER_DEPTH);
    vec3 waterHitPos = origin + ray * dist;

    float eps = max(0.01, dist * 0.004);
    vec3 N = normal(waterHitPos.xz, eps, WATER_DEPTH);
    N = mix(N, vec3(0.0, 1.0, 0.0), 0.8 * min(1.0, sqrt(dist * 0.01) * 1.1));

    float fresnelSharp = 0.04 + 0.96 * pow(1.0 - max(0.0, dot(-N, ray)), 5.0);
    float fresnelFlat  = 0.04 + 0.96 * pow(1.0 - max(0.0, dot(vec3(0.0, 1.0, 0.0), -ray)), 5.0);
    float fresnelBlend = min(1.0, sqrt(dist * 0.01) * 1.1);
    float fresnel = mix(fresnelSharp, fresnelFlat, fresnelBlend);

    vec3 R = normalize(reflect(ray, N));
    R.y = abs(R.y);
    vec3 reflection = getDaySky(R);

    vec3 scattering = vec3(0.08, 0.08, 0.09) * (0.2 + (waterHitPos.y + WATER_DEPTH) / WATER_DEPTH);
    vec3 C = fresnel * reflection + scattering;

    vec3 fogColor = vec3(0.55, 0.55, 0.58);
    float fogAmount = 1.0 - exp(-dist * 0.02);
    C = mix(C, fogColor, fogAmount);

    gl_FragColor = vec4(aces_tonemap(C * 1.4), 1.0);
  }
  `;
}

// ---------- dither post-process ----------
const ditherVertex = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

// Brutalist palette baked in via uniforms (uDark / uLight).
const ditherFragment = `
  precision highp float;
  uniform sampler2D u_image;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_noiseScale;
  uniform vec3 uDark;
  uniform vec3 uLight;
  varying vec2 v_texCoord;

  #define INTENSITY 0.4
  #define SPEED 1.5
  #define MEAN 0.0
  #define VARIANCE 0.75

  float gaussian(float z, float u, float o) {
    return (1.0 / (o * sqrt(2.0 * 3.1415))) * exp(-(((z - u) * (z - u)) / (2.0 * (o * o))));
  }

  void main() {
    vec4 color = texture2D(u_image, v_texCoord);
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));

    float t = u_time * SPEED;
    vec2 uv = gl_FragCoord.xy * u_noiseScale / u_resolution;
    float seed = dot(uv, vec2(12.9898, 78.233));
    float noise = fract(sin(seed) * 43758.5453 + t);
    noise = gaussian(noise, MEAN, VARIANCE * VARIANCE);

    vec3 grain = vec3(noise) * (1.0 - vec3(gray));
    gray = gray + grain.r * INTENSITY;
    gray = clamp(gray, 0.0, 1.0);

    gl_FragColor = vec4(mix(uDark, uLight, gray), 1.0);
  }
`;

// ---------- WebGL helpers ----------
function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    throw new Error('shader compile failed');
  }
  return sh;
}
function link(gl: WebGLRenderingContext, vs: WebGLShader, fs: WebGLShader) {
  const p = gl.createProgram()!;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(p));
    gl.deleteProgram(p);
    throw new Error('program link failed');
  }
  return p;
}

// ---------- entry point ----------
export function initWaves(canvas: HTMLCanvasElement, mode: Mode = 'animated') {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isStatic = mode === 'static' || reducedMotion;

  const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
  if (!gl) return;

  // Programs
  const oceanVS = compile(gl, gl.VERTEX_SHADER, oceanVertex);
  const oceanFS = compile(gl, gl.FRAGMENT_SHADER, buildOceanFragment());
  const oceanProgram = link(gl, oceanVS, oceanFS);

  const ditherVS = compile(gl, gl.VERTEX_SHADER, ditherVertex);
  const ditherFS = compile(gl, gl.FRAGMENT_SHADER, ditherFragment);
  const ditherProgram = link(gl, ditherVS, ditherFS);

  // Fullscreen geometry
  const oceanPosBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, oceanPosBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

  const ditherPosBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, ditherPosBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

  const ditherUvBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, ditherUvBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0, 1,0, 0,1, 1,1]), gl.STATIC_DRAW);

  // Uniform locations
  const oceanPosLoc = gl.getAttribLocation(oceanProgram, 'position');
  const oceanResLoc = gl.getUniformLocation(oceanProgram, 'iResolution');
  const oceanTimeLoc = gl.getUniformLocation(oceanProgram, 'iTime');

  const ditherPosLoc = gl.getAttribLocation(ditherProgram, 'a_position');
  const ditherUvLoc = gl.getAttribLocation(ditherProgram, 'a_texCoord');
  const ditherImageLoc = gl.getUniformLocation(ditherProgram, 'u_image');
  const ditherResLoc = gl.getUniformLocation(ditherProgram, 'u_resolution');
  const ditherTimeLoc = gl.getUniformLocation(ditherProgram, 'u_time');
  const ditherNoiseLoc = gl.getUniformLocation(ditherProgram, 'u_noiseScale');
  const ditherDarkLoc = gl.getUniformLocation(ditherProgram, 'uDark');
  const ditherLightLoc = gl.getUniformLocation(ditherProgram, 'uLight');

  const palette = readPalette();

  // Framebuffer for render-to-texture
  let fbo: WebGLFramebuffer | null = null;
  let fboTex: WebGLTexture | null = null;
  let fbW = 0, fbH = 0;
  function setupFBO(w: number, h: number) {
    if (fbo && fbW === w && fbH === h) return;
    if (fbo) { gl!.deleteFramebuffer(fbo); gl!.deleteTexture(fboTex); }
    fbW = w; fbH = h;
    fboTex = gl!.createTexture();
    gl!.bindTexture(gl!.TEXTURE_2D, fboTex);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, w, h, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, null);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    fbo = gl!.createFramebuffer();
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo);
    gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, fboTex, 0);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    const isLowDpi = (window.devicePixelRatio || 1) < LOW_DPI_THRESHOLD;
    const scale = isLowDpi ? QUALITY.lowDpiScale : QUALITY.scale;
    const pxW = Math.max(1, Math.round(w * (window.devicePixelRatio || 1) * scale));
    const pxH = Math.max(1, Math.round(h * (window.devicePixelRatio || 1) * scale));
    canvas.width = pxW;
    canvas.height = pxH;
    setupFBO(pxW, pxH);
  }
  resize();
  window.addEventListener('resize', resize);

  function renderFrame(timeMs: number) {
    const t = timeMs * 0.001;

    // ---- Pass 1: ocean → FBO
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo);
    gl!.viewport(0, 0, canvas.width, canvas.height);
    gl!.useProgram(oceanProgram);
    gl!.enableVertexAttribArray(oceanPosLoc);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, oceanPosBuf);
    gl!.vertexAttribPointer(oceanPosLoc, 2, gl!.FLOAT, false, 0, 0);
    gl!.uniform2f(oceanResLoc, canvas.width, canvas.height);
    gl!.uniform1f(oceanTimeLoc, t);
    gl!.drawArrays(gl!.TRIANGLES, 0, 6);

    // ---- Pass 2: dither → screen
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.viewport(0, 0, canvas.width, canvas.height);
    gl!.useProgram(ditherProgram);

    gl!.enableVertexAttribArray(ditherPosLoc);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, ditherPosBuf);
    gl!.vertexAttribPointer(ditherPosLoc, 2, gl!.FLOAT, false, 0, 0);

    gl!.enableVertexAttribArray(ditherUvLoc);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, ditherUvBuf);
    gl!.vertexAttribPointer(ditherUvLoc, 2, gl!.FLOAT, false, 0, 0);

    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, fboTex);
    gl!.uniform1i(ditherImageLoc, 0);
    gl!.uniform2f(ditherResLoc, canvas.width, canvas.height);
    gl!.uniform1f(ditherTimeLoc, t);
    const noiseScale = (window.devicePixelRatio || 1) < LOW_DPI_THRESHOLD ? 1.7 : 1.0;
    gl!.uniform1f(ditherNoiseLoc, noiseScale);
    gl!.uniform3f(ditherDarkLoc, palette.dark[0], palette.dark[1], palette.dark[2]);
    gl!.uniform3f(ditherLightLoc, palette.light[0], palette.light[1], palette.light[2]);

    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
  }

  let running = false;
  let rafId = 0;
  function frame(now: number) {
    renderFrame(now);
    if (running) rafId = requestAnimationFrame(frame);
  }
  function start() {
    if (running || isStatic) return;
    running = true;
    rafId = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  }

  // First paint (or only paint for static mode).
  renderFrame(isStatic ? 8000 : performance.now());

  if (!isStatic) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) start();
          else stop();
        }
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else start();
    });

    start();
  }
}
