// Ragout fabric shaders.
// The same warped vein field (from the LWI spec) lifts the fold ridges in the
// vertex shader and colors them dark in the fragment shader, so the dye
// pattern is the imprint of the crumple.

const noise = /* glsl */ `
vec3 permute(vec3 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float fbm(vec2 p){
  float a = 0.5, s = 0.0;
  for(int i = 0; i < 4; i++){ s += a*snoise(p); p = p*2.02 + vec2(17.1, 9.3); a *= 0.5; }
  return s;
}
// Crumple warp: big wandering offsets + smaller ones, so folds loop instead of gridding.
vec2 lwiWarp(vec2 p, float seed){
  vec2 big = vec2(snoise(p*0.9 + seed) + 0.5*snoise(p*1.9 + seed + 3.0),
                  snoise(p*0.9 + seed + 7.0) + 0.5*snoise(p*1.9 + seed + 13.0));
  vec2 small = vec2(snoise(p*3.0 + seed + 11.0), snoise(p*3.0 + seed + 23.0));
  return big*0.16 + small*0.05;
}
`;

export const vertexShader = /* glsl */ `
uniform float uTime, uCrumple, uPress, uSeed, uMotion;
uniform vec2 uPointer, uSize;
varying vec2 vUv;
varying vec3 vN;
varying float vH;
${noise}
// Full 3D position of the cloth at a uv: it compresses, wanders and gathers.
vec3 displaced(vec2 uv){
  vec2 base = (uv - 0.5)*uSize;
  vec2 p = uv*uSize;
  vec2 pw = p + lwiWarp(p, uSeed);
  float v1 = exp(-abs(snoise(pw*2.2 + uSeed))/0.30);
  float v2 = exp(-abs(snoise(pw*5.0 + uSeed + 3.1))/0.22);
  float folds = snoise(p*vec2(0.8, 0.75) + uSeed*0.37) + 0.5*snoise(p*1.7 + uSeed);

  vec2 pin = (uPointer - 0.5)*uSize;
  vec2 dd = base - pin;
  float press = uPress*exp(-dot(dd, dd)*1.8);
  float amt = clamp(uCrumple + press, 0.0, 1.6);

  vec2 jit = vec2(snoise(p*1.6 + uSeed + 5.0), snoise(p*1.6 + uSeed + 17.0));
  vec2 xy = base*(1.0 - 0.3*uCrumple) + jit*0.14*amt;   // the whole cloth bunches in
  xy -= dd*min(press*0.7, 0.9);                         // and gathers toward the finger

  float z = folds*0.24*amt + ((v1 - 0.35)*0.22 + (v2 - 0.35)*0.08)*amt*amt; // sharp creases only when really crumpled
  z += press*0.4;
  z += 0.05*folds;
  z += uMotion*0.03*sin(uTime*0.7 + uv.x*5.0 + uv.y*3.0)*(1.0 - 0.6*uCrumple);
  return vec3(xy, z);
}
void main(){
  vUv = uv;
  float e = 0.008;
  vec3 P  = displaced(uv);
  vec3 PX = displaced(uv + vec2(e, 0.0));
  vec3 PY = displaced(uv + vec2(0.0, e));
  vec3 n = normalize(cross(PX - P, PY - P));
  vH = P.z;
  vN = normalize(normalMatrix*n);
  gl_Position = projectionMatrix*modelViewMatrix*vec4(P, 1.0);
}
`;

export const fragmentShader = /* glsl */ `
uniform float uTime, uScour, uDye, uMend, uRecolor, uSeed;
uniform vec2 uSize, uHole;
uniform vec3 uRamp[8];
uniform vec3 uPrevRamp[8];
varying vec2 vUv;
varying vec3 vN;
varying float vH;
${noise}
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x*p.y); }

float apronSD(vec2 uv){
  float x = abs(uv.x - 0.5);
  float hw;
  if(uv.y > 0.66){ hw = 0.27; }
  else if(uv.y > 0.44){ float dy = (0.66 - uv.y)/0.22; hw = 0.47 - 0.2*sqrt(max(0.0, 1.0 - dy*dy)); }
  else { hw = 0.47; }
  return max(max(x - hw, 0.03 - uv.y), uv.y - 0.975);
}

float sashiko(vec2 p, float cell, float lw){
  vec2 c = p/cell;
  float ry = floor(c.y + 0.5);
  float dy = abs(c.y - ry);
  float hOn = mod(floor(c.x) + step(0.5, hash(vec2(ry, 7.0))), 2.0);
  float hx = fract(c.x);
  float hEnd = smoothstep(0.0, 0.14, hx)*smoothstep(1.0, 0.86, hx);
  float h = (1.0 - smoothstep(lw*0.55, lw, dy))*hOn*hEnd;
  float rx = floor(c.x + 0.5);
  float dx = abs(c.x - rx);
  float vOn = mod(floor(c.y) + step(0.5, hash(vec2(3.0, rx))), 2.0);
  float vy = fract(c.y);
  float vEnd = smoothstep(0.0, 0.14, vy)*smoothstep(1.0, 0.86, vy);
  float v = (1.0 - smoothstep(lw*0.55, lw, dx))*vOn*vEnd;
  return max(h, v);
}

void main(){
  vec2 uv = vUv;

  float sd = apronSD(uv);
  float aaE = fwidth(sd)*1.2;
  float alpha = 1.0 - smoothstep(-aaE, aaE, sd);
  if(alpha < 0.01) discard;

  // burn hole and patch
  vec2 hp = (uv - uHole)*uSize;
  vec2 halfP = vec2(0.2, 0.15);
  vec2 q = abs(hp) - halfP;
  float patchSD = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  float patchOn = smoothstep(0.0, 0.25, uMend)*step(patchSD, 0.0);
  float holeR = 0.05 + 0.012*fbm(hp*28.0);
  float holeD = length(hp*vec2(1.0, 1.25));
  if(holeD < holeR && patchOn < 0.5) discard;
  float charRing = smoothstep(holeR + 0.05, holeR, holeD)*(1.0 - patchOn);

  // 65/35 poly-cotton twill
  float threads = 90.0;
  vec2 tc = uv*vec2(threads, threads*uSize.y/uSize.x);
  vec2 tid = floor(tc);
  float twill = step(1.5, mod(tid.x + tid.y, 3.0));
  float yarnSeed = twill > 0.5 ? hash(vec2(tid.x, 1.3)) : hash(vec2(2.1, tid.y));
  float speck = hash(floor(tc*2.0) + uSeed);
  float cottonFine = step(0.62, mix(yarnSeed, speck, 0.6));
  float fw = max(fwidth(tc.x), fwidth(tc.y));
  float detail = 1.0 - smoothstep(0.12, 0.35, fw);
  float cotton = mix(0.38, cottonFine, detail*0.8);
  vec2 ff = fract(tc);
  float yarn = twill > 0.5 ? sin(ff.x*3.14159) : sin(ff.y*3.14159);
  float yarnShade = mix(0.93, 0.82 + 0.22*yarn, detail);

  // undyed fabric with baked-on grease
  float g = fbm(uv*vec2(4.0, 5.0) + vec2(31.0, 7.0));
  float grease = smoothstep(0.18, 0.45, g);
  float drip = smoothstep(0.55, 0.8, fbm(uv*vec2(14.0, 3.0) + vec2(5.0, 2.0)));
  float stain = max(grease*0.8, drip*0.5)*(1.0 - 0.85*uScour);
  vec3 col = mix(vec3(0.925, 0.91, 0.871), vec3(0.62, 0.53, 0.36), stain);

  // LWI tone field: dark branching veins on the fold ridges, pale mottled pools between
  vec2 p = uv*uSize;
  vec2 pw = p + lwiWarp(p, uSeed);
  float v1 = exp(-abs(snoise(pw*2.2 + uSeed))/0.30);
  float v2 = exp(-abs(snoise(pw*5.0 + uSeed + 3.1))/0.22);
  float v3 = exp(-abs(snoise(pw*11.0 + uSeed + 9.4))/0.14);
  float blotch = snoise(p*0.9 + uSeed + 41.0);
  float I = 0.45*v1 + 0.30*v2 + 0.12*v3 + 0.16*blotch + 0.03*(cotton*2.0 - 1.0);
  I = pow(clamp((I - 0.07)/0.69, 0.0, 1.0), 0.6);

  // quantize into the colorway's 8-step ramp, anti-aliased at step edges
  float f = I*7.999;
  int i0 = int(floor(f));
  int i1 = min(i0 + 1, 7);
  float t = clamp((fract(f) - 1.0)/max(fwidth(f), 1e-4) + 1.0, 0.0, 1.0);
  vec3 newTone  = mix(uRamp[i0], uRamp[i1], t);
  vec3 prevTone = mix(uPrevRamp[i0], uPrevRamp[i1], t);

  float front = fbm(uv*1.6 + 40.0 + uSeed)*0.5 + 0.5;
  float flood   = smoothstep(front - 0.12, front + 0.12, uDye*1.3 - 0.15);
  float reflood = smoothstep(front - 0.12, front + 0.12, uRecolor*1.3 - 0.15);
  vec3 dyed = mix(prevTone, newTone, reflood);
  dyed = mix(dyed, mix(dyed, vec3(0.925, 0.91, 0.871), 0.22), (1.0 - cottonFine)*detail*0.6); // polyester holds back
  dyed = mix(dyed, dyed*vec3(0.85, 0.8, 0.7), stain*0.4);                                  // ghost of the old stains
  col = mix(col, dyed, flood);

  // original seams
  float hem = (1.0 - smoothstep(0.0, 0.003, abs(sd + 0.013)))*step(0.5, fract((uv.x*uSize.x + uv.y*uSize.y)*25.0));
  col = mix(col, col*0.72, hem*0.7);

  // char, patch, sashiko
  col = mix(col, vec3(0.12, 0.09, 0.07), charRing*0.85);
  vec3 deep = mix(uPrevRamp[6], uRamp[6], reflood);
  vec3 patchCol = mix(vec3(0.2, 0.24, 0.33), deep, flood);
  patchCol *= 0.92 + 0.08*hash(floor(tc*1.5));
  col = mix(col, patchCol, patchOn);
  float sx = (hp.x + halfP.x + 0.03)/(2.0*halfP.x + 0.06);
  float stitchReveal = step(sx, (uMend - 0.25)*1.4);
  float st = sashiko(hp + vec2(0.012, 0.007), 0.055, 0.12)*step(patchSD, 0.025)*stitchReveal;
  col = mix(col, vec3(0.94, 0.92, 0.86), st);

  // harsh single-source light + film grain
  vec3 N = normalize(vN);
  if(!gl_FrontFacing) N = -N;
  vec3 L = normalize(vec3(-0.5, 0.7, 0.6));
  float diff = max(dot(N, L), 0.0);
  float wrap = diff*0.7 + 0.3;
  float ao = 0.78 + 0.3*smoothstep(-0.25, 0.25, vH);
  vec3 lit = col*yarnShade*(0.32 + 0.8*wrap)*ao;
  vec3 Hh = normalize(L + vec3(0.0, 0.0, 1.0));
  lit += pow(max(dot(N, Hh), 0.0), 16.0)*0.05*(1.0 - cotton*0.5);
  lit += (hash(gl_FragCoord.xy + fract(uTime*7.0)*91.0) - 0.5)*0.045;

  gl_FragColor = vec4(lit, alpha);
}
`;
