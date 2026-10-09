import * as THREE from 'three';
import { vertexShader, fragmentShader } from './shaders.js';

// Keep hex colors as-is in shaders (no linear conversion).
THREE.ColorManagement.enabled = false;

const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Synthetic fiber-reactive mixes, named for the natural dye each one imitates.
const COLORWAYS = [
  { name: 'Indigo',         after: 'after indigo vats',              hex: '#24365c' },
  { name: 'Walnut hull',    after: 'after black walnut husks',       hex: '#4b3626' },
  { name: 'Madder',         after: 'after madder root',              hex: '#8f3b2c' },
  { name: 'Iron & oak gall',after: 'after iron-saddened tannin',     hex: '#2f2e2c' },
  { name: 'Saddened weld',  after: 'after weld with an iron bath',   hex: '#5d5b30' },
  { name: 'Logwood',        after: 'after logwood heartwood',        hex: '#3d2b47' },
];

/* ---------------- pH bath (works with or without WebGL) ---------------- */
(function setupPH() {
  const val = document.getElementById('phVal');
  const pad = document.getElementById('phPad');
  const status = document.getElementById('phStatus');
  const dose = document.getElementById('phDose');
  const reset = document.getElementById('phReset');
  if (!val) return;
  const stops = [[4,'#d8433a'],[5,'#ec8a3a'],[6,'#e9c742'],[7,'#7cb342'],[8,'#2e9e7a'],[9,'#2a8fb0'],[10,'#3a5fbf'],[11,'#5b3fa3'],[12,'#4a2a7a']];
  const toRGB = h => [1,3,5].map(i => parseInt(h.slice(i, i + 2), 16));
  function colorFor(p) {
    for (let i = 0; i < stops.length - 1; i++) {
      const [a, ca] = stops[i], [b, cb] = stops[i + 1];
      if (p <= b) {
        const t = Math.max(0, Math.min(1, (p - a) / (b - a)));
        const A = toRGB(ca), B = toRGB(cb);
        return `rgb(${A.map((v, k) => Math.round(v + (B[k] - v) * t)).join(',')})`;
      }
    }
    return stops[stops.length - 1][1];
  }
  let ph, doses;
  function render() {
    val.textContent = ph.toFixed(1);
    pad.style.background = colorFor(ph);
    if (ph > 8.5) {
      status.textContent = doses === 0
        ? 'Spent dye bath, straight off the soda ash. Too basic for the drain.'
        : `Dose ${doses}. Still basic. Dissolve another 1–2 tbsp of citric acid, stir for 60 seconds, wait, re-test.`;
      dose.disabled = false;
    } else {
      status.textContent = `Neutral after ${doses} doses. Now it’s pumped up through the Filtrol 160 to catch microfibers before it reaches a drain.`;
      dose.disabled = true;
    }
  }
  function start() { ph = 10.6 + Math.random() * 0.4; doses = 0; render(); }
  dose.addEventListener('click', () => { doses++; ph = Math.max(6.9, ph - (0.55 + Math.random() * 0.5)); render(); });
  reset.addEventListener('click', start);
  start();
})();

/* ---------------- colorway buttons ---------------- */
let onColorway = cw => root.style.setProperty('--dye', cw.hex);
const swatchWrap = document.getElementById('swatches');
COLORWAYS.forEach((cw, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'swatch';
  b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
  b.style.setProperty('--c', cw.hex);
  b.innerHTML = `<span class="chip" aria-hidden="true"></span><span class="sw-name">${cw.name}</span><span class="sw-after">${cw.after}</span>`;
  b.addEventListener('click', () => {
    swatchWrap.querySelectorAll('.swatch').forEach(s => s.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', 'true');
    onColorway(cw);
  });
  swatchWrap.appendChild(b);
});
root.style.setProperty('--dye', COLORWAYS[0].hex);

/* ---------------- the apron ---------------- */
const canvas = document.getElementById('bath');
let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) { renderer = null; }
if (!renderer) root.classList.add('no-webgl');
else startScene(renderer);

function startScene(renderer) {
  renderer.debug.onShaderError = () => root.classList.add('no-webgl');
  const W = 2.0, H = 2.6;
  const coarse = matchMedia('(pointer: coarse)').matches;
  let dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
  const group = new THREE.Group();
  scene.add(group);

  const u = {
    uTime: { value: 0 }, uCrumple: { value: 0.05 }, uScour: { value: 0 }, uDye: { value: 0 },
    uMend: { value: 0 }, uRecolor: { value: 1 }, uPress: { value: 0 },
    uPointer: { value: new THREE.Vector2(0.5, 0.5) }, uSeed: { value: 3.7 },
    uSize: { value: new THREE.Vector2(W, H) }, uHole: { value: new THREE.Vector2(0.62, 0.33) },
    uDyeColor: { value: new THREE.Color(COLORWAYS[0].hex) },
    uPrevColor: { value: new THREE.Color(COLORWAYS[0].hex) },
    uMotion: { value: reduceMotion ? 0 : 1 },
  };
  const segs = coarse ? [150, 195] : [220, 286];
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H, segs[0], segs[1]),
    new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: u, side: THREE.DoubleSide, transparent: true })
  );
  group.add(mesh);
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(-2, 3, 3);
  scene.add(sun);
  const strapMat = new THREE.MeshLambertMaterial({ color: 0x8e8b84, transparent: true });
  const straps = new THREE.Group();
  const tape = pts => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 48, 0.02, 6, false), strapMat);
  straps.add(tape([[-0.5, 1.2, 0], [-0.48, 1.6, -0.04], [-0.25, 1.9, -0.08], [0, 1.96, -0.1], [0.25, 1.9, -0.08], [0.48, 1.6, -0.04], [0.5, 1.2, 0]]));
  straps.add(tape([[-0.92, -0.16, 0], [-1.1, -0.24, 0.03], [-1.18, -0.62, 0.05], [-1.08, -1.05, 0.02]]));
  straps.add(tape([[0.92, -0.16, 0], [1.12, -0.2, 0.03], [1.24, -0.55, 0.06], [1.2, -0.98, 0.03]]));
  group.add(straps);
  const polyTie = new THREE.Color('#8e8b84'), twillTape = new THREE.Color('#e6dcc4');

  // cheap flat proxy for pointer hit-testing
  const proxy = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  group.add(proxy);

  onColorway = cw => {
    const cur = u.uPrevColor.value.clone().lerp(u.uDyeColor.value, u.uRecolor.value);
    u.uPrevColor.value.copy(cur);
    u.uDyeColor.value.set(cw.hex);
    u.uRecolor.value = 0;
    root.style.setProperty('--dye', cw.hex);
  };

  /* layout: apron upper on phones, right on wide screens */
  let lastW = 0, lastH = 0;
  function layout(force) {
    const w = innerWidth, h = innerHeight;
    if (!force && coarse && w === lastW && Math.abs(h - lastH) < 140) return; // ignore URL-bar jiggle
    lastW = w; lastH = h;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const FH = 3.3, FW = 2.5, cy = -0.33;   // full height incl. neck loop, width incl. ties
    let d, ox = 0, oy = cy;
    if (aspect < 0.85) {
      d = Math.max(FH / (0.58 * 2 * t), FW / (0.94 * 2 * t * aspect));
      oy += 2 * d * t * 0.19;
    } else {
      d = Math.max(FH / (0.86 * 2 * t), FW / (0.46 * 2 * t * aspect));
      ox = 2 * d * t * aspect * 0.2;
    }
    camera.position.set(0, 0, d);
    group.position.set(ox, oy, 0);
  }
  layout(true);
  addEventListener('resize', () => layout(false));
  addEventListener('orientationchange', () => setTimeout(() => layout(true), 200));

  /* pointer: press and hold to crumple locally */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const par = { x: 0, y: 0, tx: 0, ty: 0 };
  let hovering = false, pressing = false, mouse = false;
  function hit(e) {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    par.tx = ndc.x; par.ty = ndc.y;
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObject(proxy)[0];
    hovering = !!(h && h.uv);
    if (hovering) u.uPointer.value.copy(h.uv);
  }
  addEventListener('pointermove', e => { mouse = e.pointerType === 'mouse'; hit(e); }, { passive: true });
  addEventListener('pointerdown', e => { mouse = e.pointerType === 'mouse'; hit(e); pressing = true; }, { passive: true });
  ['pointerup', 'pointercancel', 'blur'].forEach(n => addEventListener(n, () => { pressing = false; }));

  /* scroll stages */
  const sections = [...document.querySelectorAll('[data-stage]')];
  const num = (v, d) => (v === undefined || v === '' ? d : parseFloat(v));
  function targets() {
    const mid = innerHeight * 0.55;
    let best = sections[0], bd = Infinity;
    for (const s of sections) {
      const r = s.getBoundingClientRect();
      const dist = Math.abs((r.top + r.bottom) / 2 - mid);
      if (dist < bd) { bd = dist; best = s; }
    }
    const ds = best.dataset;
    return { crumple: num(ds.crumple, 0.06), scour: num(ds.scour, 1), dye: num(ds.dye, 1), mend: num(ds.mend, 1) };
  }
  const t0 = targets();
  u.uCrumple.value = t0.crumple; u.uScour.value = t0.scour; u.uDye.value = t0.dye; u.uMend.value = t0.mend;

  const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
  const steel = new THREE.Color('#26292b'), dark = new THREE.Color('#0e0d0c');
  const cur = new THREE.Color(), bath = new THREE.Color(), bg = new THREE.Color();
  let lastHex = '', ft = 0, fn = 0;
  const clock = new THREE.Clock();
  const kk = reduceMotion ? 6 : 1;

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const tg = targets();
    u.uCrumple.value = damp(u.uCrumple.value, tg.crumple, 2.2 * kk, dt);
    u.uScour.value = damp(u.uScour.value, tg.scour, 1.6 * kk, dt);
    u.uDye.value = damp(u.uDye.value, tg.dye, 1.3 * kk, dt);
    u.uMend.value = damp(u.uMend.value, tg.mend, 1.2 * kk, dt);
    u.uRecolor.value = damp(u.uRecolor.value, 1, 1.4 * kk, dt);
    const pressT = pressing && hovering ? 1 : (hovering && mouse ? 0.3 : 0);
    u.uPress.value = damp(u.uPress.value, pressT, 5, dt);
    if (!reduceMotion) u.uTime.value = t;

    par.x = damp(par.x, par.tx, 2, dt); par.y = damp(par.y, par.ty, 2, dt);
    const m = reduceMotion ? 0 : 1;
    group.rotation.x = -0.1 + m * Math.sin(t * 0.23) * 0.03 + par.y * 0.08 * m;
    group.rotation.y = m * Math.sin(t * 0.17) * 0.12 + par.x * 0.15 * m;
    group.rotation.z = -0.03 + u.uCrumple.value * 0.06;
    straps.scale.setScalar(1 - 0.14 * u.uCrumple.value);
    strapMat.opacity = Math.max(0, 1 - u.uCrumple.value * 2.2);
    straps.visible = strapMat.opacity > 0.01;
    strapMat.color.copy(polyTie).lerp(twillTape, Math.min(1, u.uMend.value * 1.4));

    cur.copy(u.uPrevColor.value).lerp(u.uDyeColor.value, u.uRecolor.value);
    bath.copy(cur).lerp(dark, 0.55);
    bg.copy(steel).lerp(bath, u.uDye.value);
    renderer.setClearColor(bg);
    const hex = bg.getHexString();
    if (hex !== lastHex) { root.style.setProperty('--bath', '#' + hex); lastHex = hex; }

    renderer.render(scene, camera);

    // drop resolution if the phone is struggling
    ft += dt; fn++;
    if (fn === 90) {
      if (ft / fn > 0.03 && dpr > 1) { dpr = Math.max(1, dpr * 0.75); renderer.setPixelRatio(dpr); layout(true); }
      ft = 0; fn = 0;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
