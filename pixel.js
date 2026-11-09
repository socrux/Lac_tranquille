// Lac Tranquille — outils de pixel art, sprites et icônes
'use strict';

// ===========================================================================
// Primitives
// ===========================================================================
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function pxRect(c, x, y, w, h, col) {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function pxDisk(c, cx, cy, r, col) {
  c.fillStyle = col;
  cx = Math.round(cx);
  cy = Math.round(cy);
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy) + 0.35);
    c.fillRect(cx - w, cy + dy, 2 * w + 1, 1);
  }
}

function pxEllipse(c, cx, cy, rx, ry, col) {
  c.fillStyle = col;
  cx = Math.round(cx);
  cy = Math.round(cy);
  for (let dy = -ry; dy <= ry; dy++) {
    const w = Math.floor(rx * Math.sqrt(1 - (dy * dy) / (ry * ry)) + 0.35);
    c.fillRect(cx - w, cy + dy, 2 * w + 1, 1);
  }
}

function pxLine(c, x0, y0, x1, y1, col) {
  c.fillStyle = col;
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    c.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

// Courbe de Bézier quadratique, 1 pixel d'épaisseur
function pxCurve(c, a, ctrl, b, col) {
  c.fillStyle = col;
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 1.5) + 2;
  let lx = null, ly = null;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, u = 1 - t;
    const x = Math.round(u * u * a.x + 2 * u * t * ctrl.x + t * t * b.x);
    const y = Math.round(u * u * a.y + 2 * u * t * ctrl.y + t * t * b.y);
    if (x !== lx || y !== ly) c.fillRect(x, y, 1, 1);
    lx = x; ly = y;
  }
}

// Sprite défini par des lignes de caractères ('.' = transparent)
function sprite(rows, pal) {
  const w = Math.max(...rows.map((r) => r.length));
  const cv = makeCanvas(w, rows.length);
  const c = cv.getContext('2d');
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (pal[ch]) { c.fillStyle = pal[ch]; c.fillRect(x, y, 1, 1); }
    });
  });
  return cv;
}

// Rend un dessin "net" : alpha binaire + contour d'1 pixel (+ halo tramé optionnel)
function pixelize(cv, outlineCol, glowCol = null) {
  const c = cv.getContext('2d');
  const { width: w, height: h } = cv;
  const img = c.getImageData(0, 0, w, h);
  const d = img.data;
  const solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (d[i * 4 + 3] >= 128) { d[i * 4 + 3] = 255; solid[i] = 1; } else d[i * 4 + 3] = 0;
  }
  if (outlineCol) {
    const [r, g, b] = hexRgb(outlineCol);
    const edge = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (solid[i]) continue;
        if ((x > 0 && solid[i - 1]) || (x < w - 1 && solid[i + 1]) || (y > 0 && solid[i - w]) || (y < h - 1 && solid[i + w])) {
          edge[i] = 1;
          d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255;
        }
      }
    }
    if (glowCol) {
      const [gr, gg, gb] = hexRgb(glowCol);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          if (solid[i] || edge[i] || (x + y) % 2) continue;
          if (edge[i - 1] || edge[i + 1] || edge[i - w] || edge[i + w] || edge[i - w - 1] || edge[i + w + 1]) {
            d[i * 4] = gr; d[i * 4 + 1] = gg; d[i * 4 + 2] = gb; d[i * 4 + 3] = 255;
          }
        }
      }
    }
  }
  c.putImageData(img, 0, 0);
}

// Dégradé vertical tramé (matrice de Bayer 4×4), façon pixel art
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function ditherGradient(c, x0, y0, w, h, colors) {
  const img = c.createImageData(w, h);
  const rgb = colors.map(hexRgb);
  for (let y = 0; y < h; y++) {
    const pos = (y / Math.max(1, h - 1)) * (rgb.length - 1);
    const base = Math.min(Math.floor(pos), rgb.length - 2);
    const frac = pos - base;
    for (let x = 0; x < w; x++) {
      const col = frac > (BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16 ? rgb[base + 1] : rgb[base];
      const i = (y * w + x) * 4;
      img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
    }
  }
  c.putImageData(img, x0, y0);
}

// ===========================================================================
// Créatures : dessin vectoriel, puis "pixelisé" dans un petit canvas
// ===========================================================================
const inkFn = (silhouette) => (col) => (silhouette ? '#1b140e' : col);
const lerpN = (a, b, k) => a + (b - a) * k;

// --- petits outils de dessin pour les abominations
function ell(c, x, y, rx, ry, rot = 0) {
  c.beginPath();
  c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
  c.fill();
}
function tri(c, a, b, d) {
  c.beginPath();
  c.moveTo(a[0], a[1]);
  c.lineTo(b[0], b[1]);
  c.lineTo(d[0], d[1]);
  c.closePath();
  c.fill();
}
function line(c, pts) {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.stroke();
}
function star4(c, x, y, r) {
  c.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    const rr = k % 2 ? r * 0.38 : r;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
  c.fill();
}
// Un œil : paupière sombre, iris coloré, pupille fendue (slit) ou ronde. open : 0 (fermé) → 1
function eyeAt(c, ink, x, y, r, open = 1, iris = '#ffe04a', slit = true) {
  c.fillStyle = ink('#12060f');
  ell(c, x, y, r + 1.6, (r + 1.6) * Math.max(open, 0.3));
  if (open < 0.25) return;
  c.fillStyle = ink(iris);
  ell(c, x, y, r, r * open);
  c.fillStyle = ink('#0b0508');
  if (slit) c.fillRect(x - 1.3, y - r * open * 0.8, 2.6, r * open * 1.6);
  else ell(c, x, y, r * 0.45, r * 0.45 * open);
}
const blinkAt = (t, seed) => (Math.sin(t * 1.3 + seed * 1.7) > 0.93 ? 0.15 : 1);

// ===========================================================================
// Abominations : chacune a son propre dessin
// h : épaisseur du corps (×), body / fin / belly : couleurs, glow : halo autour du sprite,
// pre : dessiné derrière le corps, post : par-dessus, custom : remplace tout le corps,
// noEye : pas d'œil « normal », spiky : crête épineuse. g = { L, h, t, ink, snout, body, ... }
// ===========================================================================
const ABOM_STYLE = {
  // --- Ablette aux Mille Yeux : ses écailles sont des paupières
  ablette: {
    h: 1.75, fin: '#3a4650', glow: '#d8d070', noEye: true,
    post(c, { L, h, t, ink }) {
      [-0.45, 0.05, 0.52].forEach((row, r) => {
        for (let i = 0; i < 7; i++) {
          const x = lerpN(-L * 0.72, L * 0.42, i / 6) + (r === 1 ? 5 : 0);
          const open = Math.sin(t * 1.1 + i * 1.9 + r * 4.3) > -0.2 ? 1 : 0.1;
          eyeAt(c, ink, x, row * h, 3.6 - Math.abs(row) * 1.4, open, '#f2e6a8', false);
        }
      });
      eyeAt(c, ink, L * 0.68, -h * 0.15, 5.5, blinkAt(t, 1), '#ffe04a', true);
    },
  },
  // --- Gardon Rampant : il a des pattes, et des mains au bout
  gardon: {
    h: 1.2, fin: '#7a3a3a', glow: '#e07060', noEye: true,
    pre(c, { L, h, t, ink }) {
      c.strokeStyle = ink('#c8a090');
      c.fillStyle = ink('#c8a090');
      c.lineWidth = 5;
      for (let k = 0; k < 4; k++) {
        const x0 = lerpN(-L * 0.55, L * 0.45, k / 3);
        const ph = t * 4 + k * 1.7;
        const knee = [x0 + 8 + Math.sin(ph) * 5, h + 12];
        const foot = [x0 - 2 + Math.cos(ph) * 8, h + 27 - Math.max(0, Math.sin(ph)) * 6];
        line(c, [[x0, h * 0.5], knee, foot]);
        c.lineWidth = 2.5;
        for (const d of [-4, 0, 4]) line(c, [foot, [foot[0] + 6 + d * 0.3, foot[1] + d * 0.4 + 2]]);
        c.lineWidth = 5;
      }
    },
    post(c, { L, h, t, ink }) {
      eyeAt(c, ink, L * 0.6, -h * 0.25, 7, blinkAt(t, 2), '#d02a2a', false);
      c.strokeStyle = ink('#ff7a6a');
      c.lineWidth = 2;
      line(c, [[L * 0.6 - 9, -h * 0.25], [L * 0.6 - 5, -h * 0.15]]);
      c.fillStyle = ink('#f2ead6');                    // un sourire humain
      for (let i = 0; i < 4; i++) c.fillRect(L * 0.72 + i * 4.2, h * 0.28, 3.4, 4);
    },
  },
  // --- Brème Écorchée : muscles à vif, côtes apparentes, crâne nu
  breme: {
    h: 1.1, body: '#a8382f', fin: '#e8dcc0', belly: '#d86a5a', glow: '#ff5040', noEye: true,
    post(c, { L, h, ink }) {
      c.strokeStyle = ink('#6a1414');
      c.lineWidth = 2.5;
      for (const y of [-0.45, 0, 0.4]) line(c, [[-L * 0.85, y * h], [-L * 0.3, y * h + 3], [L * 0.3, y * h - 2], [L * 0.6, y * h]]);
      c.strokeStyle = ink('#f0e6d0');
      c.lineWidth = 4;
      line(c, [[-L * 0.85, -h * 0.62], [L * 0.5, -h * 0.62]]);           // colonne
      c.lineWidth = 3.5;
      for (let i = 0; i < 6; i++) {
        const x = lerpN(-L * 0.55, L * 0.32, i / 5);
        c.beginPath();
        c.moveTo(x, -h * 0.62);
        c.quadraticCurveTo(x + 9, 0, x - 4, h * 0.72);
        c.stroke();
      }
      c.fillStyle = ink('#ece2c8');                                        // crâne
      ell(c, L * 0.74, -h * 0.05, L * 0.28, h * 0.82);
      c.fillStyle = ink('#100606');
      ell(c, L * 0.72, -h * 0.28, 6, 6);
      ell(c, L * 0.92, h * 0.3, 7, 3);
      c.fillStyle = ink('#ff3020');
      ell(c, L * 0.73, -h * 0.28, 1.8, 1.8);
    },
  },
  // --- Perche Hurlante : une gueule ouverte sur un cri sans fin
  perche: {
    h: 1.25, fin: '#2a3a1a', glow: '#c8f040', spiky: true, noEye: true,
    post(c, { L, h, t, ink }) {
      const mx = L * 0.9, open = 0.8 + Math.sin(t * 7) * 0.2;
      c.fillStyle = ink('#160606');
      ell(c, mx, 0, 10, h * 0.95 * open);
      c.fillStyle = ink('#8a1a1a');
      ell(c, mx + 2, h * 0.15, 6, h * 0.5 * open);
      c.fillStyle = ink('#f2ead6');
      for (let i = -2; i <= 2; i++) {
        tri(c, [mx + i * 3.5 - 2, -h * 0.9 * open], [mx + i * 3.5 + 2, -h * 0.9 * open], [mx + i * 3.5, -h * 0.9 * open + 6]);
        tri(c, [mx + i * 3.5 - 2, h * 0.9 * open], [mx + i * 3.5 + 2, h * 0.9 * open], [mx + i * 3.5, h * 0.9 * open - 6]);
      }
      c.strokeStyle = ink('#d8f880');                                      // le cri
      c.lineWidth = 3;
      for (let k = 0; k < 3; k++) {
        c.beginPath();
        c.arc(mx, 0, 15 + k * 9 + ((t * 22) % 9), -0.55, 0.55);
        c.stroke();
      }
      eyeAt(c, ink, L * 0.52, -h * 0.55, 4.8, 1, '#ffe04a', false);
    },
  },
  // --- Tanche Putride : elle pourrit, elle coule, elle attire les mouches
  tanche: {
    h: 1.2, fin: '#2a3010', belly: '#5a6a1a', glow: '#a0c030', noEye: true,
    post(c, { L, h, t, ink }) {
      for (const [x, y, r] of [[-0.55, -0.2, 7], [-0.05, 0.25, 6], [0.3, -0.35, 5], [-0.3, 0.45, 4]]) {
        c.fillStyle = ink('#7a8a2a');
        ell(c, x * L, y * h, r, r * 0.75);
        c.fillStyle = ink('#1e220c');
        ell(c, x * L + 1, y * h + 1, r * 0.45, r * 0.35);
      }
      c.fillStyle = ink('#a8d040');
      for (let k = 0; k < 4; k++) {
        const x = lerpN(-L * 0.5, L * 0.4, k / 3);
        const ph = (t * 0.7 + k * 0.37) % 1;
        c.fillRect(x - 1.5, h * 0.7, 3, 4 + ph * 9);
        ell(c, x, h * 0.75 + 7 + ph * 16, 2.8, 3.6);
      }
      for (let i = 0; i < 3; i++) {                                        // mouches
        const x = Math.cos(t * 4 + i * 2.1) * L * 0.55;
        const y = -h - 14 + Math.sin(t * 7 + i) * 6;
        c.fillStyle = ink('#d8e0e8');
        ell(c, x - 2, y - 2.5, 2.4, 1.6);
        c.fillStyle = ink('#111111');
        ell(c, x, y, 2.4, 2.4);
      }
      c.fillStyle = ink('#d8d8c0');                                        // œil laiteux
      ell(c, L * 0.62, -h * 0.2, 5.5, 5.5);
      c.fillStyle = ink('#a8a890');
      ell(c, L * 0.63, -h * 0.18, 3, 3);
    },
  },
  // --- Truite Prismatique : des couleurs qui n'existent pas
  truite: {
    h: 1.15, body: '#4a6a7a', fin: '#4a6a8a', glow: '#80f0ff', noEye: true,
    post(c, { L, h, t, ink }) {
      if (ink('#000') === '#000') {
        c.save();
        c.beginPath();
        c.ellipse(0, 0, L, h, 0, 0, Math.PI * 2);
        c.clip();
        const w = (L * 2) / 6;
        for (let i = -1; i < 8; i++) {
          c.fillStyle = `hsl(${(i * 55 + t * 140) % 360}, 90%, 62%)`;
          const x = -L + i * w + ((t * 18) % w);
          c.beginPath();
          c.moveTo(x, -h);
          c.lineTo(x + w * 0.7, -h);
          c.lineTo(x + w * 0.2, h);
          c.lineTo(x - w * 0.5, h);
          c.fill();
        }
        c.restore();
      }
      c.fillStyle = ink('#e0faff');                                        // éclats de cristal
      for (let i = 0; i < 5; i++) {
        const x = lerpN(-L * 0.45, L * 0.4, i / 4);
        tri(c, [x - 4, -h * 0.75], [x + 1, -h * 0.75 - 12 - (i % 2) * 7], [x + 5, -h * 0.75]);
      }
      c.fillStyle = ink('#80f0ff');
      ell(c, L * 0.62, -h * 0.25, 6.5, 6.5);
      c.fillStyle = ink('#ffffff');
      ell(c, L * 0.62, -h * 0.25, 4, 4);
    },
  },
  // --- Carpe-qui-Rêve : elle dort, et son corps est un ciel étoilé
  carpe: {
    h: 1.15, body: '#2c2a62', fin: '#1a1a44', belly: '#3a3a80', glow: '#9890ff', noEye: true,
    post(c, { L, h, t, ink }) {
      c.fillStyle = ink('#fff6b0');
      for (let i = 0; i < 10; i++) {
        if (Math.sin(t * 2 + i * 1.3) < -0.6) continue;
        star4(c, lerpN(-L * 0.75, L * 0.45, (i * 0.37) % 1), lerpN(-h * 0.6, h * 0.5, (i * 0.61) % 1), 2.6 + (i % 3));
      }
      c.strokeStyle = ink('#e8e0ff');                                      // œil fermé
      c.lineWidth = 3;
      c.beginPath();
      c.arc(L * 0.62, -h * 0.35, 5, 0.15 * Math.PI, 0.85 * Math.PI);
      c.stroke();
      c.strokeStyle = ink('#c8c0ff');                                      // Z… z…
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.35 + k / 3) % 1;
        const x = L * 0.6 + ph * 22, y = -h - 8 - ph * 34, s = 4 + ph * 4;
        line(c, [[x - s, y - s], [x + s, y - s], [x - s, y + s], [x + s, y + s]]);
      }
    },
  },
  // --- Sandre Abyssal : un œil immense et un leurre lumineux
  sandre: {
    h: 1.3, body: '#28303e', fin: '#1a2030', glow: '#40e0d0', noEye: true,
    post(c, { L, h, t, ink }) {
      c.strokeStyle = ink('#3a4454');
      c.lineWidth = 3;
      const bx = L + 12, by = -h - 16 + Math.sin(t * 2) * 3;
      c.beginPath();
      c.moveTo(L * 0.5, -h * 0.9);
      c.quadraticCurveTo(L * 0.8, -h - 30, bx, by);
      c.stroke();
      c.fillStyle = ink('#60fff0');
      ell(c, bx, by, 4.5, 4.5);
      for (let i = 0; i < 6; i++) {                                        // points lumineux
        if (Math.sin(t * 3 + i * 1.4) > 0.2) ell(c, lerpN(-L * 0.7, L * 0.2, i / 5), h * 0.45, 2.4, 2.4);
      }
      c.fillStyle = ink('#40e0d0');
      ell(c, L * 0.52, -h * 0.05, h * 0.95, h * 0.95);
      eyeAt(c, ink, L * 0.52, -h * 0.05, h * 0.8, blinkAt(t, 5), '#f0f080', true);
    },
  },
  // --- Anguille Infinie : elle n'a pas de fin
  anguille: {
    h: 1.4, body: '#3a2a4c', fin: '#2a1a3a', glow: '#a060e0',
    custom(c, { L, h, t, ink, body }) {
      const yAt = (x) => Math.sin(x * 0.06 + t * 2.5) * 14;
      c.strokeStyle = ink(body);
      c.lineWidth = h * 2.3;
      c.beginPath();
      for (let x = L * 0.55; x >= -140; x -= 4) c.lineTo(x, yAt(x));
      c.stroke();
      c.strokeStyle = ink('#5e3e78');
      c.lineWidth = 3;
      for (let x = L * 0.3; x >= -140; x -= 13) line(c, [[x, yAt(x) - h], [x - 2, yAt(x) + h]]);
      c.strokeStyle = ink('#d090ff');
      c.lineWidth = 2;
      c.beginPath();
      for (let x = L * 0.4; x >= -140; x -= 4) c.lineTo(x, yAt(x) - h * 0.2);
      c.stroke();
      const hy = yAt(L * 0.55);
      c.fillStyle = ink(body);
      ell(c, L * 0.65, hy, 17, h * 1.25);
      eyeAt(c, ink, L * 0.72, hy - 4, 3.6, blinkAt(t, 9), '#ff4a3a', true);
      c.fillStyle = ink('#100610');
      ell(c, L * 0.8, hy + 4, 5, 1.8);
    },
  },
  // --- Brochet Dévoreur d'Étoiles : une étoile au fond de la gueule
  brochet: {
    h: 1.2, body: '#1e2638', fin: '#121a2a', belly: '#2a3450', glow: '#f0e080', noEye: true,
    post(c, { L, h, t, ink, snout }) {
      const pts = [[-0.7, -0.3], [-0.45, 0.2], [-0.15, -0.45], [0.1, 0.1], [0.35, -0.3]].map(([x, y]) => [x * L, y * h]);
      c.strokeStyle = ink('#7080b0');
      c.lineWidth = 2;
      line(c, pts);
      c.fillStyle = ink('#fff6c0');
      pts.forEach(([x, y], i) => star4(c, x, y, 3 + (i % 2) * 1.5));
      const tip = L + snout + 4;                                          // gueule béante
      c.fillStyle = ink('#05050c');
      tri(c, [L * 0.62, h * 0.05], [tip, -h * 0.75], [tip, h * 0.85]);
      c.fillStyle = ink('#f2ead6');
      for (let i = 0; i < 4; i++) {
        const x = lerpN(L * 0.75, tip - 3, i / 3);
        tri(c, [x - 2, lerpN(-h * 0.05, -h * 0.65, i / 3)], [x + 2, lerpN(-h * 0.05, -h * 0.68, i / 3)], [x, lerpN(-h * 0.05, -h * 0.65, i / 3) + 5]);
      }
      c.save();
      c.translate(L + snout * 0.45, h * 0.05);
      c.rotate(t);
      c.fillStyle = ink('#ffe880');
      star4(c, 0, 0, 7);
      c.restore();
      eyeAt(c, ink, L * 0.55, -h * 0.4, 3.8, 1, '#f0e080', true);
    },
  },
  // --- Esturgeon Primordial : un fossile qui se souvient
  esturgeon: {
    h: 1.3, body: '#6a5a48', fin: '#4a3e30', belly: '#8a7a60', glow: '#e0b060', noEye: true,
    post(c, { L, h, t, ink }) {
      c.fillStyle = ink('#dccca4');
      for (let i = 0; i < 7; i++) {
        const x = lerpN(-L * 0.7, L * 0.5, i / 6);
        tri(c, [x - 5, -h * 0.8], [x, -h * 0.8 - 10 - (i % 2) * 3], [x + 5, -h * 0.8]);
      }
      c.strokeStyle = ink('#2a2018');
      c.lineWidth = 2.5;
      line(c, [[-L * 0.6, -h * 0.4], [-L * 0.45, 0], [-L * 0.52, h * 0.3]]);
      line(c, [[L * 0.1, -h * 0.5], [L * 0.2, -h * 0.1], [L * 0.12, h * 0.4]]);
      c.strokeStyle = ink('#d8c090');                                      // ammonite
      c.lineWidth = 3;
      c.beginPath();
      for (let a = 0; a < Math.PI * 5; a += 0.2) {
        const r = 1.5 + a * 0.55;
        c.lineTo(-L * 0.15 + Math.cos(a) * r, h * 0.15 + Math.sin(a) * r * 0.8);
      }
      c.stroke();
      eyeAt(c, ink, L * 0.72, -h * 0.3, 4.6, blinkAt(t, 3), '#ffb030', true);
    },
  },
  // --- Bouledogue des Gouffres : des rangées de dents, puis d'autres
  bouledogue: {
    h: 1.2, body: '#3a3a4c', fin: '#2a2a38', belly: '#5a5a6a', glow: '#ff4040', noEye: true,
    post(c, { L, h, ink, snout }) {
      const tip = L + snout + 6;
      c.fillStyle = ink('#4a0a14');
      tri(c, [L * 0.4, h * 0.15], [tip, -h * 0.7], [tip, h * 1.1]);
      for (let r = 0; r < 3; r++) {
        c.fillStyle = ink(r === 2 ? '#c8bea8' : '#f2ead6');
        for (let i = 0; i < 4; i++) {
          const x = L * 0.58 + i * 7 + r * 3;
          const yt = lerpN(-h * 0.05, -h * 0.55, (x - L * 0.4) / (tip - L * 0.4)) + r * 4;
          const yb = lerpN(h * 0.25, h * 0.9, (x - L * 0.4) / (tip - L * 0.4)) - r * 4;
          tri(c, [x - 2.4, yt], [x + 2.4, yt], [x, yt + 6]);
          tri(c, [x - 2.4, yb], [x + 2.4, yb], [x, yb - 6]);
        }
      }
      c.strokeStyle = ink('#9a9aae');                                      // cicatrices
      c.lineWidth = 2.5;
      for (const x of [-0.5, -0.2, 0.05]) line(c, [[x * L, -h * 0.5], [x * L + 9, h * 0.2]]);
      eyeAt(c, ink, L * 0.5, -h * 0.45, 3.2, 1, '#ff3030', false);
    },
  },
  // --- L'Ancien du Lac : cornes, runes, et barbillons-tentacules
  silure: {
    h: 1.25, body: '#2a2232', fin: '#1a1420', belly: '#3a3044', glow: '#50f0c0', noEye: true,
    pre(c, { L, h, t, ink }) {
      c.strokeStyle = ink('#3e2e48');
      for (let i = 0; i < 4; i++) {
        c.lineWidth = 4 - (i % 2);
        const s = Math.sin(t * 2 + i * 1.4) * 9;
        c.beginPath();
        c.moveTo(L * 0.85, h * 0.4);
        c.bezierCurveTo(L + 10 + s, h + 10 + i * 5, L + s, h + 30 + i * 4, L - 10 - i * 8 + s, h + 44 + i * 3);
        c.stroke();
      }
    },
    post(c, { L, h, t, ink }) {
      c.fillStyle = ink('#d8d0b0');
      for (const [x, k] of [[0.3, 0], [0.48, 1], [0.64, 2]]) {
        tri(c, [L * x - 4, -h * 0.8], [L * x - 9 - k * 2, -h - 18 - k * 3], [L * x + 4, -h * 0.85]);
      }
      c.strokeStyle = ink(Math.sin(t * 2) > -0.3 ? '#50f0c0' : '#2a8a70');
      c.lineWidth = 2.5;
      for (const x of [-0.6, -0.3, 0, 0.25]) {
        const X = x * L, Y = -h * 0.1;
        line(c, [[X - 3, Y - 4], [X + 3, Y - 4], [X, Y + 4], [X - 3, Y + 1]]);
      }
      eyeAt(c, ink, L * 0.66, -h * 0.25, 4.2, blinkAt(t, 4), '#d8f0a0', true);
    },
  },
  // --- Marteau du Jugement : une rangée d'yeux sur le marteau, et des fêlures brûlantes
  marteau: {
    h: 1.15, body: '#3a3048', fin: '#2a2038', belly: '#4a4058', glow: '#ffb040', noEye: true,
    post(c, { L, h, t, ink }) {
      for (let k = 0; k < 5; k++) {
        eyeAt(c, ink, L * 0.78 + 6, lerpN(-h * 1.15, h * 1.15, k / 4), 3.3, blinkAt(t, k * 2.3), '#ffb040', true);
      }
      c.strokeStyle = ink('#ff9030');
      c.lineWidth = 2.5;
      line(c, [[-L * 0.7, -h * 0.3], [-L * 0.5, h * 0.1], [-L * 0.35, -h * 0.2], [-L * 0.2, h * 0.3]]);
      line(c, [[L * 0.05, -h * 0.5], [L * 0.2, -h * 0.05], [L * 0.38, -h * 0.35]]);
    },
  },
  // --- Gueule Blanche : un vide sans fond à la place de la tête
  blanc: {
    h: 1.1, body: '#d8dae4', fin: '#b0b4c4', belly: '#ffffff', glow: '#c8c8ff', noEye: true,
    post(c, { L, h, t, ink }) {
      const cx = L * 0.8, cy = h * 0.1;
      ['#5a5a70', '#2a2a3a', '#101018', '#000000'].forEach((col, i) => {
        c.fillStyle = ink(col);
        ell(c, cx, cy, 15 - i * 3.2, h * 0.95 - i * 3.2);
      });
      c.strokeStyle = ink('#6a6a90');                                      // spirale qui tourne
      c.lineWidth = 2;
      c.beginPath();
      for (let a = 0; a < Math.PI * 4; a += 0.25) {
        const r = 1 + a * 0.85;
        c.lineTo(cx + Math.cos(a + t * 2) * r, cy + Math.sin(a + t * 2) * r * 0.9);
      }
      c.stroke();
      c.fillStyle = ink('#ffffff');
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const x = cx + Math.cos(a) * 14, y = cy + Math.sin(a) * h * 0.9;
        tri(c, [x - 2, y], [x + 2, y], [cx + Math.cos(a) * 9, cy + Math.sin(a) * h * 0.55]);
      }
    },
  },

  // ===================== crustacés =====================
  // --- Crevette Grouillante : des centaines de minuscules crevettes
  crevette: {
    body: '#b05a7a', dark: '#6a2a4a', glow: '#ff90c0',
    post(c, { L, H, t, ink }) {
      c.strokeStyle = ink('#ffb8d0');
      c.lineWidth = 2.5;
      for (let i = 0; i < 16; i++) {
        const x = lerpN(-L * 0.9, L * 0.6, (i * 0.41) % 1) + Math.sin(t * 6 + i) * 2.5;
        const y = lerpN(-H * 1.2, H * 1.4, (i * 0.73) % 1) + Math.cos(t * 5 + i * 2) * 2.5;
        c.beginPath();
        c.arc(x, y, 3, 0.3 * Math.PI + i, 1.6 * Math.PI + i);
        c.stroke();
      }
    },
  },
  // --- Écrevisse Chuchotante : une oreille, des lèvres, un murmure
  ecrevisse: {
    body: '#4a3a54', dark: '#2a1e34', glow: '#b0a0ff',
    post(c, { L, H, t, ink }) {
      c.strokeStyle = ink('#e0b0b8');
      c.lineWidth = 3;
      c.beginPath();
      c.arc(L * 0.2, -1, 7, -Math.PI * 0.5, Math.PI * 0.9);
      c.stroke();
      c.beginPath();
      c.arc(L * 0.2, 0, 3.5, -Math.PI * 0.3, Math.PI);
      c.stroke();
      c.fillStyle = ink('#d04a5a');
      ell(c, L * 0.6, H * 0.45, 5, 2.4);
      c.strokeStyle = ink('#c0b0ff');
      c.lineWidth = 2.5;
      for (let k = 0; k < 3; k++) {
        c.beginPath();
        c.arc(L * 0.2, -1, 12 + k * 7 + ((t * 14) % 7), -Math.PI * 0.9, -Math.PI * 0.45);
        c.stroke();
      }
    },
  },
  // --- Crabe Sans-Fond : sa carapace donne sur le ciel d'une autre planète
  crabe: {
    body: '#3a3a5c', dark: '#22223a', glow: '#6080ff',
    post(c, { W, H, t, ink }) {
      c.fillStyle = ink('#04040e');
      ell(c, 0, 1, W * 0.78, H * 0.72);
      c.fillStyle = ink('#ffffff');
      for (let i = 0; i < 7; i++) {
        if (Math.sin(t * 2.5 + i * 2) > -0.5) ell(c, lerpN(-W * 0.6, W * 0.6, (i * 0.43) % 1), lerpN(-H * 0.5, H * 0.5, (i * 0.67) % 1), 1.4, 1.4);
      }
      c.fillStyle = ink('#e08a4a');
      ell(c, W * 0.2, -H * 0.1, 5, 5);
      c.strokeStyle = ink('#f0d0a0');
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(W * 0.2, -H * 0.1, 9.5, 2.6, -0.35, 0, Math.PI * 2);
      c.stroke();
    },
  },
  // --- Crabe aux Mitaines d'Os : pinces en os, couvertes de longs cheveux
  mitaine: {
    body: '#5a4a4a', dark: '#3a2e2e', claw: '#ece4d4', hair: '#1a1210', glow: '#e0d0b0',
    post(c, { W, H, t, ink }) {
      c.strokeStyle = ink('#1e1410');
      c.lineWidth = 2.5;
      for (const sd of [-1, 1]) {
        for (let k = 0; k < 6; k++) {
          const x0 = sd * W * 0.85 + (k - 2.5) * 2;
          const sw = Math.sin(t * 2 + k) * 5;
          c.beginPath();
          c.moveTo(x0, -H - 10);
          c.bezierCurveTo(x0 + sw, -H + 4, x0 - sw, -H + 18, x0 + sd * k * 1.5 + sw, -H + 30 + k * 3);
          c.stroke();
        }
      }
    },
  },
  // --- Écrevisse Astrale : une carte d'étoiles qui ne sont pas encore nées
  ecrbleue: {
    body: '#1c2258', dark: '#0e1232', glow: '#80a0ff',
    post(c, { L, H, t, ink }) {
      c.fillStyle = ink('#5a3a9a');
      ell(c, L * 0.15, 0, L * 0.25, H * 0.6);
      const pts = [[-0.55, 0.1], [-0.3, -0.3], [0, 0.2], [0.25, -0.4], [0.45, 0]].map(([x, y]) => [x * L, y * H]);
      c.strokeStyle = ink('#8aa8ff');
      c.lineWidth = 2;
      line(c, pts);
      c.fillStyle = ink('#ffffff');
      pts.forEach(([x, y], i) => star4(c, x, y, 2.6 + (Math.sin(t * 3 + i) > 0 ? 1 : 0)));
    },
  },
  // --- Homard des Marées Noires : huileux, rouillé, il suinte
  homard: {
    body: '#18121e', dark: '#0a080e', glow: '#40c0a0',
    post(c, { L, H, t, ink }) {
      c.lineWidth = 3;
      c.strokeStyle = ink('#6a3a9a');
      line(c, [[L * 0.05, -H * 0.6], [L * 0.35, -H * 0.1]]);
      c.strokeStyle = ink('#2a8a8a');
      line(c, [[L * 0.12, -H * 0.75], [L * 0.42, -H * 0.3]]);
      c.strokeStyle = ink('#a8622a');                                      // gonds rouillés
      for (const [x, y] of [[0.45, 0.2], [-0.12, 0], [-0.44, 0.4]]) {
        c.beginPath();
        c.arc(x * L, y * H, 3.5, 0, Math.PI * 2);
        c.stroke();
      }
      c.fillStyle = ink('#0a0810');
      for (let k = 0; k < 3; k++) {
        const x = lerpN(-L * 0.5, L * 0.3, k / 2), ph = (t * 0.6 + k * 0.4) % 1;
        c.fillRect(x - 1.5, H * 0.6, 3, 4 + ph * 8);
        ell(c, x, H * 0.7 + 6 + ph * 14, 2.6, 3.4);
      }
    },
  },
  // --- Araignée des Abysses : des pattes sans fin, et huit yeux
  araignee: {
    body: '#3a1e30', dark: '#22101c', legs: 58, glow: '#ff3060', noEye: true,
    post(c, { H, t, ink }) {
      [[-6, -H * 0.55, 3], [6, -H * 0.55, 3], [-11, -H * 0.3, 2.2], [11, -H * 0.3, 2.2], [-3, -H * 0.15, 2.2], [3, -H * 0.15, 2.2], [-8, -H * 0.05, 1.8], [8, -H * 0.05, 1.8]]
        .forEach(([x, y, r], i) => eyeAt(c, ink, x, y, r, blinkAt(t, i), '#ff3060', false));
    },
  },
  // --- Le Roi Rongé : couronne de coquillages et de dents, cape d'algues
  royal: {
    body: '#4a1a2a', dark: '#2a0a16', glow: '#ffd040', noEye: true,
    pre(c, { W, H, t, ink }) {
      c.strokeStyle = ink('#2a6a3a');
      c.lineWidth = 3.5;
      for (let k = 0; k < 6; k++) {
        const x0 = lerpN(-W * 0.9, W * 0.9, k / 5), sw = Math.sin(t * 1.5 + k) * 4;
        line(c, [[x0, 0], [x0 + sw, H + 6], [x0 - sw, H + 16 + (k % 2) * 6]]);
      }
    },
    post(c, { W, H, t, ink }) {
      c.fillStyle = ink('#d8c8a0');
      c.fillRect(-W * 0.55, -H - 4, W * 1.1, 6);
      for (let k = 0; k < 5; k++) {
        const x = lerpN(-W * 0.5, W * 0.5, k / 4);
        tri(c, [x - 3.5, -H - 3], [x, -H - 14 - (k % 2) * 4], [x + 3.5, -H - 3]);
      }
      c.fillStyle = ink('#ffffff');
      for (let k = 0; k < 4; k++) c.fillRect(lerpN(-W * 0.42, W * 0.36, k / 3), -H + 2, 2.5, 3.5);
      c.fillStyle = ink('#e8a0b0');
      for (const x of [-0.3, 0.3]) ell(c, x * W, -H - 1, 3, 2.4);
      for (const sd of [-1, 1]) eyeAt(c, ink, sd * 7, -H * 0.3, 2.8, blinkAt(t, sd + 3), '#ffd040', true);
    },
  },
};

function drawFishVector(c, f, { abom = false, silhouette = false, t = 0 } = {}) {
  if (f.kind === 'crust') return drawCrustVector(c, f, { abom, silhouette, t });
  if (f.id === 'cthulhu') return drawCthulhuVector(c, { silhouette, t, rage: arguments[2]?.rage || 0 });

  const s = f.shape;
  const st = abom ? ABOM_STYLE[f.id] || {} : null;
  const L = s.len;
  const h = s.h * (abom ? st.h || 1.15 : 1);
  const ink = inkFn(silhouette);
  const body = abom ? st.body || f.abomColor : f.color;
  const fin = abom ? st.fin || '#3a2242' : f.fin;
  const lerp = (a, b, k) => a + (b - a) * k;
  const snout = s.snout || 0;
  const g = { L, h, t, ink, snout, body, fin, s };

  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';

  if (st?.custom) {
    st.custom(c, g);
    c.restore();
    return;
  }
  if (st?.pre) st.pre(c, g);

  // queue
  c.fillStyle = ink(fin);
  c.beginPath();
  if (s.shark) {
    c.moveTo(-L + 6, 0);
    c.lineTo(-L - 22, -h * 1.7);
    c.lineTo(-L - 12, -h * 0.1);
    c.lineTo(-L - 18, h * 1.1);
  } else if (s.eel) {
    c.moveTo(-L + 4, -h * 0.7);
    c.lineTo(-L - 16, 0);
    c.lineTo(-L + 4, h * 0.7);
  } else {
    c.moveTo(-L + 6, 0);
    c.lineTo(-L - 20, -h * 0.95);
    c.lineTo(-L - 12, 0);
    c.lineTo(-L - 20, h * 0.95);
  }
  c.closePath();
  c.fill();

  // nageoire dorsale
  c.beginPath();
  if (s.shark) {
    c.moveTo(-L * 0.2, -h * 0.8);
    c.lineTo(L * 0.02, -h * 2.1);
    c.lineTo(L * 0.25, -h * 0.8);
    c.closePath();
    c.moveTo(-L * 0.72, -h * 0.45);
    c.lineTo(-L * 0.64, -h * 1.15);
    c.lineTo(-L * 0.54, -h * 0.5);
  } else if (s.eel) {
    c.ellipse(-L * 0.15, 0, L * 0.85, h + 4, 0, 0, Math.PI * 2);
  } else if (s.spiny) {
    c.moveTo(-L * 0.45, -h * 0.8);
    const big = !!st?.spiky;
    const n = big ? 6 : 4;
    for (let i = 0; i <= n; i++) {
      const x = lerp(-L * 0.45, L * 0.3, i / n);
      c.lineTo(x, -h * 0.85 - (big ? 15 + (i % 2) * 7 : 12));
      c.lineTo(x + L * 0.08, -h * 0.85);
    }
  } else {
    c.moveTo(-L * 0.3, -h * 0.8);
    c.quadraticCurveTo(-L * 0.05, -h - 16, L * 0.2, -h * 0.75);
  }
  c.closePath();
  c.fill();

  // nageoires ventrale / pectorale
  if (!s.eel) {
    c.beginPath();
    if (s.shark) {
      c.moveTo(L * 0.15, h * 0.5);
      c.lineTo(-L * 0.05, h * 1.9);
      c.lineTo(L * 0.4, h * 0.6);
    } else {
      c.moveTo(-L * 0.1, h * 0.8);
      c.quadraticCurveTo(0, h + 11, L * 0.14, h * 0.75);
    }
    c.closePath();
    c.fill();
  }

  // museau, tête de marteau, corps
  c.fillStyle = ink(body);
  if (snout) {
    c.beginPath();
    c.moveTo(L * 0.7, -h * 0.45);
    c.quadraticCurveTo(L + snout, -h * 0.2, L + snout, h * 0.05);
    c.quadraticCurveTo(L + snout * 0.6, h * 0.35, L * 0.7, h * 0.45);
    c.fill();
  }
  if (s.hammer) c.fillRect(L * 0.78, -h * 1.35, 12, h * 2.7);
  c.beginPath();
  c.ellipse(0, 0, L, h, 0, 0, Math.PI * 2);
  c.fill();

  if (!silhouette) {
    // ventre clair
    c.fillStyle = abom ? st.belly || 'rgba(255, 255, 255, 0.3)' : s.shark ? '#eef2f4' : 'rgba(255, 255, 255, 0.55)';
    c.globalAlpha = abom ? 0.55 : s.shark ? 0.9 : 0.5;
    c.beginPath();
    c.ellipse(L * 0.05, h * 0.45, L * 0.72, h * 0.35, 0, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
    c.fillStyle = 'rgba(0, 0, 0, 0.18)';               // dos plus sombre
    c.beginPath();
    c.ellipse(0, -h * 0.55, L * 0.8, h * 0.35, 0, 0, Math.PI * 2);
    c.fill();

    if (s.band && !abom) {                              // bande irisée (truite)
      c.fillStyle = s.band;
      c.beginPath();
      c.ellipse(0, h * 0.05, L * 0.82, h * 0.2, 0, 0, Math.PI * 2);
      c.fill();
    }
    if (s.stripes) {
      c.strokeStyle = abom ? '#1a0a1c' : 'rgba(30, 40, 20, 0.5)';
      c.lineWidth = 4;
      for (let i = 0; i < s.stripes; i++) {
        const x = lerp(-L * 0.6, L * 0.45, i / (s.stripes - 1)) + (abom ? Math.sin(t * 3 + i) * 3 : 0);
        c.beginPath();
        c.moveTo(x, -h * 0.85);
        c.lineTo(x + 3, h * 0.3);
        c.stroke();
      }
    }
    if (s.spots) {
      c.fillStyle = s.band ? '#3a3a2a' : '#e8e2a8';
      for (let i = 0; i < 12; i++) {
        c.fillRect(lerp(-L * 0.7, L * 0.5, (i * 0.37) % 1), lerp(-h * 0.6, h * 0.3, (i * 0.61) % 1), 4, 3);
      }
    }
    if (s.plates) {                                     // plaques osseuses (esturgeon)
      c.fillStyle = '#d8d0b8';
      for (const row of [-0.7, 0]) {
        for (let i = 0; i < 7; i++) {
          const x = lerp(-L * 0.75, L * 0.5, i / 6);
          const y = row * h;
          c.beginPath();
          c.moveTo(x, y - 3);
          c.lineTo(x + 3, y);
          c.lineTo(x, y + 3);
          c.lineTo(x - 3, y);
          c.fill();
        }
      }
    }
    if (s.shark) {                                      // ouïes
      c.strokeStyle = 'rgba(30, 40, 50, 0.6)';
      c.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(L * (0.42 + i * 0.07), -h * 0.35);
        c.lineTo(L * (0.4 + i * 0.07), h * 0.3);
        c.stroke();
      }
    }
  }

  if (s.barbels) {                                      // barbillons
    c.strokeStyle = ink(fin);
    c.lineWidth = abom ? 4 : 3;
    const n = s.barbels;
    const len = n === 2 ? 34 : 16;
    for (let i = 0; i < n; i++) {
      const wave = abom ? Math.sin(t * 3 + i) * 8 : 0;
      c.beginPath();
      c.moveTo(L * 0.95 + snout * 0.3, h * 0.2);
      c.quadraticCurveTo(L + len * 0.5, h * 0.5 + i * 8 + wave, L + len * 0.3, h + len * 0.4 + i * 10);
      c.stroke();
    }
  }

  if (abom) {
    if (!st.noEye && !silhouette) eyeAt(c, ink, L * 0.62, -h * 0.25, 5, blinkAt(t, 0), '#ff4a3a', true);
    if (st.post) st.post(c, g);                         // les traits propres à chaque abomination
  } else if (!silhouette) {
    if (s.shark) {
      const ex = s.hammer ? L * 0.84 : L * 0.68;
      const ey = s.hammer ? -h * 1.2 : -h * 0.3;
      c.fillStyle = '#0e0e12';
      c.beginPath();
      c.arc(ex, ey, 3.5, 0, Math.PI * 2);
      c.fill();
      if (s.teeth) {                                    // sourire inquiétant
        c.fillStyle = '#2a1a1a';
        c.fillRect(L * 0.6, h * 0.25, L * 0.32, 4);
        c.fillStyle = '#ffffff';
        for (let i = 0; i < 5; i++) c.fillRect(L * 0.62 + i * 4, h * 0.25, 2, 3);
      }
    } else {
      c.fillStyle = f.eye === '#222' ? '#ffffff' : f.eye;
      c.beginPath();
      c.arc(L * 0.62, -h * 0.25, 5.5, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#111';
      c.fillRect(L * 0.62, -h * 0.25 - 3, 4, 5);
    }
  }
  c.restore();
}

// Le Grand Ancien
function drawCthulhuVector(c, { silhouette = false, t = 0, rage = 0 } = {}) {
  const ink = inkFn(silhouette);
  c.save();
  c.translate(0, 18);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  // ailes
  for (const sd of [-1, 1]) {
    c.fillStyle = ink('#24402f');
    c.beginPath();
    c.moveTo(sd * 16, -22);
    c.lineTo(sd * 72, -62 + Math.sin(t * 1.2) * 3);
    c.lineTo(sd * 62, -32);
    c.lineTo(sd * 82, -20);
    c.lineTo(sd * 58, -8);
    c.lineTo(sd * 66, 8);
    c.lineTo(sd * 22, 2);
    c.closePath();
    c.fill();
    if (!silhouette) {
      c.strokeStyle = '#4f8a62';
      c.lineWidth = 2;
      for (const [x, y] of [[72, -62], [82, -20], [66, 8]]) {
        c.beginPath();
        c.moveTo(sd * 20, -16);
        c.lineTo(sd * x, y);
        c.stroke();
      }
    }
  }
  // épaules
  c.fillStyle = ink('#355e45');
  c.beginPath();
  c.ellipse(0, 18, 30, 22, 0, 0, Math.PI * 2);
  c.fill();
  // tentacules du visage
  c.strokeStyle = ink('#4a8a62');
  for (let i = 0; i < 7; i++) {
    const x0 = -18 + i * 6;
    const len = 30 + (i % 3) * 8;
    const sway = Math.sin(t * 1.5 + i) * 7;
    c.lineWidth = 6 - (i % 2);
    c.beginPath();
    c.moveTo(x0, 0);
    c.bezierCurveTo(x0 + sway, len * 0.4, x0 - sway, len * 0.7, x0 + sway * 0.5, len);
    c.stroke();
  }
  // tête
  c.fillStyle = ink('#4f8f66');
  c.beginPath();
  c.ellipse(0, -16, 26, 24, 0, 0, Math.PI * 2);
  c.fill();
  if (!silhouette) {
    c.fillStyle = '#3a6e4e';
    c.beginPath();
    c.ellipse(0, -30, 20, 8, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255, 255, 255, 0.18)';
    c.beginPath();
    c.ellipse(-8, -26, 8, 5, -0.4, 0, Math.PI * 2);
    c.fill();
    for (const sd of [-1, 1]) {                         // yeux (rougissent avec la colère)
      c.fillStyle = ['#ffe84a', '#ffa030', '#ff5020', '#ff1a1a'][Math.min(3, rage)];
      c.beginPath();
      c.ellipse(sd * 10, -12, 6 + rage, 4 + rage * 0.6, sd * 0.3, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#0b0508';
      c.fillRect(sd * 10 - 1, -16, 2, 8);
    }
  }
  c.restore();
}

// Crustacés : crabes (vus de face), écrevisses / homards / crevettes (vus de profil)
function drawCrustVector(c, cr, { abom = false, silhouette = false, t = 0 } = {}) {
  const s = cr.shape;
  const st = abom ? ABOM_STYLE[cr.id] || {} : null;
  const ink = inkFn(silhouette);
  const body = abom ? st.body || cr.abomColor : cr.color;
  const dark = abom ? st.dark || '#2a1830' : s.dark;
  const clawCol = st?.claw || body;
  const eyeCol = abom ? st.eye || '#ff3a2a' : '#111';
  const g = { W: s.w, H: s.h, L: s.len, t, ink, body, dark };
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  if (st?.pre) st.pre(c, g);

  if (s.type === 'crab') {
    const W = s.w, H = s.h, legLen = st?.legs || s.legs || 18;
    // pattes
    c.strokeStyle = ink(dark);
    c.lineWidth = s.spider ? 3 : 4;
    for (const sd of [-1, 1]) {
      for (let k = 0; k < 4; k++) {
        const y0 = -H * 0.3 + k * H * 0.3;
        const kx = sd * (W + legLen * (0.45 + k * 0.06)), ky = y0 - legLen * 0.4 + k * 3;
        const fx = sd * (W + legLen * (0.75 + k * 0.15)), fy = y0 + legLen * (0.55 + k * 0.08);
        c.beginPath();
        c.moveTo(sd * W * 0.7, y0);
        c.lineTo(kx, ky);
        c.lineTo(fx, fy);
        c.stroke();
      }
    }
    // bras et pinces
    const cs = s.claw || 9;
    for (const sd of [-1, 1]) {
      c.strokeStyle = ink(clawCol);
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(sd * W * 0.5, -H * 0.4);
      c.lineTo(sd * W * 0.8, -H - 8);
      c.stroke();
      if (s.mitten) {
        c.fillStyle = ink(st?.hair || '#4a3a1a');
        for (let k = 0; k < 5; k++) {
          c.beginPath();
          c.arc(sd * (W * 0.8 + Math.cos(k) * cs * 0.8), -H - 10 + Math.sin(k * 2) * cs * 0.6, cs * 0.45, 0, Math.PI * 2);
          c.fill();
        }
      }
      c.fillStyle = ink(clawCol);
      c.beginPath();
      c.ellipse(sd * W * 0.85, -H - 14, cs, cs * 0.7, sd * 0.4, 0, Math.PI * 2);
      c.fill();
      if (!silhouette) {
        c.fillStyle = dark;
        c.beginPath();
        c.moveTo(sd * W * 0.85, -H - 14);
        c.lineTo(sd * (W * 0.85 + cs), -H - 20);
        c.lineTo(sd * (W * 0.85 + cs * 0.8), -H - 12);
        c.fill();
      }
    }
    // carapace
    c.fillStyle = ink(body);
    c.beginPath();
    c.ellipse(0, 0, W, H, 0, 0, Math.PI * 2);
    c.fill();
    if (s.spiky) {
      for (let k = 0; k < 7; k++) {
        const a = Math.PI + (k / 6) * Math.PI;
        c.beginPath();
        c.moveTo(Math.cos(a) * W, Math.sin(a) * H);
        c.lineTo(Math.cos(a) * (W + 6), Math.sin(a) * (H + 6));
        c.lineTo(Math.cos(a + 0.2) * W, Math.sin(a + 0.2) * H);
        c.fill();
      }
    }
    if (!silhouette) {
      c.fillStyle = 'rgba(255, 255, 255, 0.25)';
      c.beginPath();
      c.ellipse(-W * 0.2, -H * 0.4, W * 0.45, H * 0.3, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = 'rgba(0, 0, 0, 0.2)';
      c.beginPath();
      c.ellipse(0, H * 0.45, W * 0.8, H * 0.35, 0, 0, Math.PI * 2);
      c.fill();
      if (!st?.noEye) {
        for (const sd of [-1, 1]) {                     // yeux pédonculés
          c.strokeStyle = dark;
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(sd * 6, -H + 2);
          c.lineTo(sd * 8, -H - 6);
          c.stroke();
          c.fillStyle = eyeCol;
          c.beginPath();
          c.arc(sd * 8, -H - 7, 2.6, 0, Math.PI * 2);
          c.fill();
        }
      }
    }
  } else {
    const L = s.len, H = s.h;
    const shrimp = s.type === 'shrimp';
    // antennes
    c.strokeStyle = ink(dark);
    c.lineWidth = 1.5;
    for (let k = 0; k < 2; k++) {
      c.beginPath();
      c.moveTo(L * 0.55, -H * 0.4);
      c.quadraticCurveTo(L * 1.2, -H * (2.6 - k), L * 1.55, -H * (0.4 - k * 0.6));
      c.stroke();
    }
    // pattes
    c.lineWidth = 2;
    for (let k = 0; k < 4; k++) {
      c.beginPath();
      c.moveTo(L * 0.1 + k * 7, H * 0.6);
      c.lineTo(L * 0.05 + k * 7, H * 1.5);
      c.stroke();
    }
    // abdomen segmenté (courbé pour la crevette)
    c.fillStyle = ink(body);
    const segs = 5;
    let lx = 0, ly = 0;
    for (let k = 0; k < segs; k++) {
      lx = -L * 0.12 - k * L * 0.16;
      ly = shrimp ? k * k * 1.6 : k * 0.5;
      c.beginPath();
      c.ellipse(lx, ly, L * 0.11, H * (0.95 - k * 0.1), shrimp ? k * 0.15 : 0, 0, Math.PI * 2);
      c.fill();
    }
    // éventail de la queue
    c.fillStyle = ink(s.tail || body);
    c.beginPath();
    c.moveTo(lx - 2, ly);
    c.lineTo(lx - 16, ly - H * 0.9 + (shrimp ? 6 : 0));
    c.lineTo(lx - 18, ly + (shrimp ? 6 : 0));
    c.lineTo(lx - 16, ly + H * 0.9 + (shrimp ? 6 : 0));
    c.closePath();
    c.fill();
    // carapace
    c.fillStyle = ink(body);
    c.beginPath();
    c.ellipse(L * 0.22, -1, L * 0.4, H, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();                                      // rostre
    c.moveTo(L * 0.55, -H * 0.5);
    c.lineTo(L * 0.8, -H * 0.3);
    c.lineTo(L * 0.55, -H * 0.05);
    c.fill();
    // pinces
    if (s.claw) {
      c.strokeStyle = ink(body);
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(L * 0.45, H * 0.2);
      c.lineTo(L * 0.82, -H * 0.5);
      c.stroke();
      c.beginPath();
      c.ellipse(L * 0.82 + s.claw * 0.7, -H * 0.8, s.claw, s.claw * 0.55, -0.35, 0, Math.PI * 2);
      c.fill();
      if (!silhouette) {
        c.fillStyle = dark;
        c.beginPath();
        c.moveTo(L * 0.82 + s.claw * 0.6, -H * 0.8);
        c.lineTo(L * 0.82 + s.claw * 1.7, -H * 1.2);
        c.lineTo(L * 0.82 + s.claw * 1.6, -H * 0.7);
        c.fill();
      }
    }
    if (!silhouette) {
      c.fillStyle = 'rgba(255, 255, 255, 0.25)';
      c.beginPath();
      c.ellipse(L * 0.18, -H * 0.45, L * 0.28, H * 0.3, 0, 0, Math.PI * 2);
      c.fill();
      if (!st?.noEye) {
        c.fillStyle = eyeCol;
        c.beginPath();
        c.arc(L * 0.52, -H * 0.55, abom ? 3.4 : 2.8, 0, Math.PI * 2);
        c.fill();
      }
    }
  }
  if (st?.post) st.post(c, g);                          // les traits propres à chaque abomination
  c.restore();
}

// Dessine une créature en pixel art dans un canvas (taille conseillée : 100×72)
function renderFishCanvas(cv, f, opts = {}) {
  const c = cv.getContext('2d');
  c.clearRect(0, 0, cv.width, cv.height);
  const s = cv.width / 182;
  c.save();
  c.translate(cv.width * 0.52, cv.height * (f.kind === 'crust' ? 0.42 : 0.36));
  c.scale(s, s);
  drawFishVector(c, f, opts);
  c.restore();
  const abomLike = (opts.abom || f.unique) && !opts.silhouette;
  const outline = opts.silhouette ? '#0d0906' : abomLike ? '#14041a' : '#1a120c';
  pixelize(cv, outline, abomLike ? (f.unique ? '#3fd08a' : ABOM_STYLE[f.id]?.glow || '#9b46c8') : null);
}

// ===========================================================================
// Icônes de l'interface (16×16)
// ===========================================================================
const ICON_SPRITES = {
  book: {
    rows: [
      '................',
      '..oooooooooooo..',
      '.oBnnnnnnnnnnpo.',
      '.oBnnnnnnnnnnpo.',
      '.oBnnyyyyyynnpo.',
      '.oBnnyoooyynnpo.',
      '.oBnnyyyyyynnpo.',
      '.oBnnnnnnnnnnpo.',
      '.oBnnnnnnnnnnpo.',
      '.oBnnnnnnnnnnpo.',
      '.oBnnnnnnnnnnpo.',
      '.oBnnnnnnnnnnpo.',
      '.oBnnnnnrnnnnpo.',
      '.oBBBBBBrBBBBBo.',
      '..oooooorooooo..',
      '........o.......',
    ],
    pal: { o: '#1e140c', B: '#4e2812', n: '#8a4a24', p: '#f3e6c8', y: '#f5d04a', r: '#c03a3a' },
  },
  shop: {
    rows: [
      '................',
      '.....oo..oo.....',
      '....oTTooTTo....',
      '.....oTTTTo.....',
      '......oTTo......',
      '.....otttto.....',
      '....otttttto....',
      '...ottttttttoo..',
      '..otttttttooooo.',
      '..ottttttoyyyyyo',
      '..ottttttoyYYYyo',
      '..ottttttoyYyyyo',
      '...otttttoyYYYyo',
      '....oooooyyyyYyo',
      '.........oyYYYyo',
      '..........ooooo.',
    ],
    pal: { o: '#1e140c', t: '#c99a5e', T: '#8a6236', y: '#f5d04a', Y: '#b07f12' },
  },
  profile: {
    rows: [
      '................',
      '.....oooooo.....',
      '....ohhhhhHo....',
      '....ohhhhhHo....',
      '...oobbbbbbbo...',
      '.oohhhhhhhhhhoo.',
      '.oooooooooooooo.',
      '....osssssssso..',
      '....osesssesso..',
      '....osssssssso..',
      '....oSsssSSsso..',
      '.....oSSSSSSo...',
      '...oorrrrrrrroo.',
      '..orrrrrrrrrrrro',
      '..orrRrrrrrrRrro',
      '..oooooooooooooo',
    ],
    pal: { o: '#1e140c', h: '#e2bd55', H: '#b08a2e', b: '#7a3b2a', s: '#f2c497', S: '#c98f62', e: '#1e140c', r: '#c64a35', R: '#8e2f22' },
  },
  menu: {
    rows: [
      '................',
      '....oooooooo....',
      '...oDddddddDo...',
      '..oDddDddDddDo..',
      '..oddddddddddo..',
      '..oddDddDddDdo..',
      '..oddddddddddo..',
      '..oddDddDddyyo..',
      '..oddddddddyyo..',
      '..oddDddDddDdo..',
      '..oddddddddddo..',
      '..oddDddDddDdo..',
      '..oddddddddddo..',
      '..oddDddDddDdo..',
      '.oggggggggggggo.',
      '.oooooooooooooo.',
    ],
    pal: { o: '#1e140c', d: '#a8703c', D: '#7a4c24', y: '#f5d04a', g: '#8a8f96' },
  },
  coin: {
    rows: [
      '..oooo..',
      '.oyyyyo.',
      'oywyyyYo',
      'oywyyyYo',
      'oyyyyyYo',
      'oyyyyYYo',
      '.oYYYYo.',
      '..oooo..',
    ],
    pal: { o: '#5a3a08', y: '#f5d04a', Y: '#c99a1e', w: '#fff6c0' },
  },
  trophy: {
    rows: [
      '................',
      '...oooooooooo...',
      '.oooyyyyyyyYooo.',
      'oy.oyyyyyyyYo.yo',
      'oy.oywyyyyyYo.yo',
      '.oyoywyyyyYYoyo.',
      '..ooyyyyyyYYoo..',
      '....oyyyyyYo....',
      '.....oyyyYo.....',
      '......oyYo......',
      '......oyYo......',
      '.....oyyYYo.....',
      '....obbbbbbo....',
      '....oBBBBBBo....',
      '....oooooooo....',
      '................',
    ],
    pal: { o: '#3a2408', y: '#f5d04a', Y: '#c99a1e', w: '#fff6c0', b: '#8a5a32', B: '#5e3a20' },
  },
  crate: {
    rows: [
      '.......rr.......',
      '......r..r......',
      '.....r....r.....',
      '.oooooooooooooo.',
      '.obbbbbbbbbbbbo.',
      '.oBBBBBBBBBBBBo.',
      '.obdbdbdbdbdbbo.',
      '.obdbdbdbdbdbbo.',
      '.obdbdbdbdbdbbo.',
      '.oBBBBBBBBBBBBo.',
      '.obbbbbbbbbbbbo.',
      '.obdbdbdbdbdbbo.',
      '.obdbdbdbdbdbbo.',
      '.oBBBBBBBBBBBBo.',
      '.oooooooooooooo.',
      '................',
    ],
    pal: { o: '#1e140c', b: '#b07a40', B: '#7a4c24', d: '#3a2a1c', r: '#d8c49a' },
  },
};

function gearIcon() {
  const cv = makeCanvas(16, 16);
  const c = cv.getContext('2d');
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    pxRect(c, 7 + Math.round(Math.cos(a) * 5.5) - 1, 7 + Math.round(Math.sin(a) * 5.5) - 1, 3, 3, '#9aa3ad');
  }
  pxDisk(c, 8, 8, 5, '#b8c0c9');
  pxDisk(c, 9, 9, 3, '#7d8794');
  c.globalCompositeOperation = 'destination-out';
  pxDisk(c, 8, 8, 2, '#000');
  c.globalCompositeOperation = 'source-over';
  pixelize(cv, '#1e140c');
  return cv;
}

const ICONS = {};
function buildIcons() {
  for (const [k, s] of Object.entries(ICON_SPRITES)) ICONS[k] = sprite(s.rows, s.pal).toDataURL();
  ICONS.options = gearIcon().toDataURL();
  // trophée verrouillé : même dessin en gris
  const t = ICON_SPRITES.trophy;
  ICONS.trophyLocked = sprite(t.rows, { o: '#1e1e24', y: '#6a6a74', Y: '#4a4a54', w: '#8a8a94', b: '#4a4a4a', B: '#333338' }).toDataURL();
}

const itemIconCache = {};
function itemIcon(kind, item) {
  const key = kind + item.id;
  if (itemIconCache[key]) return itemIconCache[key];
  const cv = makeCanvas(16, 16);
  const c = cv.getContext('2d');
  if (kind === 'rod') {
    pxLine(c, 3, 13, 14, 2, item.color);
    pxLine(c, 4, 13, 14, 3, item.color);
    pxRect(c, 1, 12, 3, 3, '#c9a26a');
    pxDisk(c, 6, 11, 2, '#9aa3ad');
    pxRect(c, 6, 11, 1, 1, '#4a4f55');
    pxRect(c, 14, 4, 1, 6, '#e8f4ff');
  } else if (kind === 'pot') {
    pxRect(c, 7, 1, 2, 3, '#d8c49a');
    pxRect(c, 2, 4, 12, 10, item.color);
    pxRect(c, 2, 4, 12, 1, 'rgba(255,255,255,0.35)');
    pxRect(c, 2, 8, 12, 1, 'rgba(0,0,0,0.3)');
    for (const x of [4, 7, 10]) pxRect(c, x, 5, 1, 3, '#1e140c');
    for (const x of [4, 7, 10]) pxRect(c, x, 9, 1, 4, '#1e140c');
    if (item.abom > 0) for (const [x, y] of [[5, 6], [11, 10]]) pxRect(c, x, y, 1, 1, '#e3b0ff');
  } else {
    switch (item.id) {
      case 'pain':
        pxRect(c, 3, 5, 10, 8, '#c98a3e');
        pxRect(c, 4, 6, 8, 6, '#f1e3c0');
        pxRect(c, 5, 7, 2, 1, '#e0cc9a');
        pxRect(c, 9, 9, 2, 1, '#e0cc9a');
        break;
      case 'vers':
        for (let x = 2; x < 14; x++) pxRect(c, x, 7 + Math.round(Math.sin(x * 0.9) * 2), 1, 2, item.color);
        pxRect(c, 13, 6, 1, 1, '#7a3a2a');
        break;
      case 'asticots':
        for (const [x, y] of [[5, 5], [10, 5], [6, 10], [11, 10]]) pxEllipse(c, x, y, 2, 1, item.color);
        break;
      case 'vif':
        pxEllipse(c, 8, 8, 5, 3, item.color);
        pxRect(c, 1, 6, 3, 5, '#8a96a0');
        pxRect(c, 10, 7, 1, 1, '#222');
        pxRect(c, 6, 9, 4, 1, '#e8eef2');
        break;
      case 'lumi':
        pxDisk(c, 8, 8, 4, item.color);
        pxDisk(c, 7, 7, 1, '#e8fff6');
        break;
      case 'oeil':
        pxDisk(c, 8, 8, 5, '#f0e6e0');
        pxDisk(c, 8, 8, 3, item.color);
        pxRect(c, 8, 5, 1, 6, '#100408');
        pxRect(c, 6, 6, 1, 1, '#ffffff');
        pxRect(c, 3, 7, 2, 1, '#c0303a');
        pxRect(c, 11, 10, 2, 1, '#c0303a');
        break;
    }
  }
  pixelize(cv, '#140e0a');
  if (item.id === 'lumi') for (const [x, y] of [[2, 3], [13, 4], [3, 13], [13, 12]]) pxRect(c, x, y, 1, 1, '#bfffee');
  return (itemIconCache[key] = cv.toDataURL());
}

// Assombrit (f < 1) ou éclaircit (f > 1) une couleur hexadécimale
function shadeHex(hex, f) {
  const [r, g, b] = hexRgb(hex);
  const m = (x) => Math.max(0, Math.min(255, Math.round(f < 1 ? x * f : x + (255 - x) * (f - 1))));
  return `#${[m(r), m(g), m(b)].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

// Silhouette d'un sprite (même forme, couleur unie), mise en cache : sert à assombrir la nuit
const shadeCache = new WeakMap();
function shadeOf(cv, col = '#070b24') {
  let s = shadeCache.get(cv);
  if (s) return s;
  s = makeCanvas(cv.width, cv.height);
  const c = s.getContext('2d');
  c.drawImage(cv, 0, 0);
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = col;
  c.fillRect(0, 0, cv.width, cv.height);
  shadeCache.set(cv, s);
  return s;
}

// ===========================================================================
// Équipement : icônes 16×16 selon l'emplacement
// ===========================================================================
const equipIconCache = {};
function equipIcon(it) {
  const key = it.id;
  if (equipIconCache[key]) return equipIconCache[key];
  const cv = makeCanvas(16, 16);
  const c = cv.getContext('2d');
  const col = it.color, dark = shadeHex(it.color, 0.65), light = shadeHex(it.color, 1.35), acc = it.accent;
  switch (it.slot) {
    case 'hook':
      pxRect(c, 8, 1, 3, 3, acc);                 // œillet
      c.clearRect(9, 2, 1, 1);
      pxRect(c, 9, 4, 2, 8, col);                 // hampe
      pxRect(c, 9, 4, 1, 8, light);
      pxRect(c, 8, 12, 2, 2, col);                // courbure
      pxRect(c, 5, 13, 4, 2, col);
      pxRect(c, 3, 10, 2, 4, col);
      pxRect(c, 3, 9, 1, 1, light);               // pointe
      pxRect(c, 5, 10, 1, 2, dark);               // ardillon
      if (it.id === 'h_triple') { pxRect(c, 11, 12, 2, 2, col); pxRect(c, 12, 10, 2, 3, col); }
      if (it.tier >= 4) for (const [x, y] of [[13, 3], [2, 5], [13, 14]]) pxRect(c, x, y, 1, 1, acc);
      break;
    case 'gloves':
      for (let k = 0; k < 4; k++) pxRect(c, 5 + k * 2, 2 + (k === 0 || k === 3 ? 1 : 0), 2, 6, k % 2 ? col : light);
      pxRect(c, 5, 6, 8, 6, col);                 // paume
      pxRect(c, 2, 6, 3, 4, col);                 // pouce
      pxRect(c, 3, 9, 2, 2, col);
      pxRect(c, 5, 6, 1, 6, light);
      pxRect(c, 12, 6, 1, 6, dark);
      pxRect(c, 5, 12, 8, 3, acc);                // poignet
      pxRect(c, 5, 12, 8, 1, shadeHex(acc, 1.3));
      break;
    case 'boots':
      pxRect(c, 4, 1, 6, 10, col);                // tige
      pxRect(c, 4, 1, 1, 10, light);
      pxRect(c, 4, 1, 6, 2, acc);                 // revers
      pxRect(c, 4, 10, 10, 3, col);               // pied
      pxRect(c, 12, 10, 2, 1, light);
      pxRect(c, 4, 13, 10, 2, dark);              // semelle
      break;
    case 'pants':
      pxRect(c, 3, 2, 10, 3, acc);                // ceinture
      pxRect(c, 7, 2, 2, 3, shadeHex(acc, 1.3));  // boucle
      pxRect(c, 3, 5, 10, 3, col);
      pxRect(c, 3, 8, 4, 7, col);                 // jambes
      pxRect(c, 9, 8, 4, 7, col);
      pxRect(c, 3, 5, 1, 10, light);
      pxRect(c, 12, 5, 1, 10, dark);
      pxRect(c, 7, 6, 2, 2, dark);
      break;
    case 'jacket':
      pxRect(c, 4, 3, 8, 12, col);                // corps
      pxRect(c, 1, 4, 3, 9, col);                 // manches
      pxRect(c, 12, 4, 3, 9, col);
      pxRect(c, 1, 4, 1, 9, light);
      pxRect(c, 14, 4, 1, 9, dark);
      pxRect(c, 1, 12, 3, 1, acc);
      pxRect(c, 12, 12, 3, 1, acc);
      pxRect(c, 6, 2, 4, 2, acc);                 // col
      pxRect(c, 7, 4, 2, 2, acc);
      pxRect(c, 8, 6, 1, 9, dark);                // fermeture
      for (const y of [7, 10, 13]) pxRect(c, 9, y, 1, 1, shadeHex(acc, 1.2));
      break;
  }
  pixelize(cv, '#140e0a');
  return (equipIconCache[key] = cv.toDataURL());
}

// ===========================================================================
// Météo : icônes 16×16
// ===========================================================================
const weatherIconCache = {};
function weatherIcon(id) {
  if (weatherIconCache[id]) return weatherIconCache[id];
  const cv = makeCanvas(16, 16);
  const c = cv.getContext('2d');
  const cloud = (x, y, col, shade) => {
    pxDisk(c, x + 3, y + 3, 3, col);
    pxDisk(c, x + 7, y + 2, 3, col);
    pxDisk(c, x + 10, y + 4, 2, col);
    pxRect(c, x + 1, y + 4, 11, 3, col);
    pxRect(c, x + 1, y + 6, 11, 1, shade);
  };
  const sun = (x, y, r, rays) => {
    if (rays) {
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        pxRect(c, x + Math.round(Math.cos(a) * (r + 2)), y + Math.round(Math.sin(a) * (r + 2)), 1, 1, '#ffd84a');
      }
    }
    pxDisk(c, x, y, r, '#ffd84a');
    pxDisk(c, x - 1, y - 1, Math.max(1, r - 2), '#fff3b8');
  };
  switch (id) {
    case 'clair': sun(6, 6, 3, true); cloud(3, 8, '#ffffff', '#c8d8e8'); break;
    case 'soleil': sun(8, 8, 4, true); break;
    case 'nuageux': cloud(3, 2, '#a8b4c0', '#7a8694'); cloud(1, 7, '#e8eef4', '#b8c4d0'); break;
    case 'pluie':
      cloud(2, 1, '#9aa6b4', '#6a7684');
      for (const [x, y] of [[4, 10], [8, 11], [12, 10], [6, 13], [10, 13]]) pxRect(c, x, y, 1, 2, '#6ab8ff');
      break;
    case 'orage':
      cloud(2, 1, '#5a6270', '#3a404a');
      pxRect(c, 8, 8, 2, 2, '#ffe04a'); pxRect(c, 6, 10, 3, 2, '#ffe04a'); pxRect(c, 7, 12, 2, 3, '#ffe04a');
      break;
    case 'brouillard':
      for (const [y, x, w] of [[3, 2, 11], [6, 4, 10], [9, 1, 12], [12, 3, 10]]) pxRect(c, x, y, w, 2, '#d8e0e6');
      break;
    case 'vent':
      for (const [y, w] of [[4, 10], [8, 12], [12, 8]]) { pxRect(c, 1, y, w, 1, '#e8f4ff'); pxRect(c, w, y - 2, 1, 2, '#e8f4ff'); }
      break;
    case 'arcenciel':
      ['#e04a3a', '#f0a030', '#f5e04a', '#5ad04a', '#3a8ce0', '#9a48c8'].forEach((col, i) => {
        for (let a = 0; a <= 24; a++) {
          const t = Math.PI + (a / 24) * Math.PI;
          pxRect(c, 8 + Math.round(Math.cos(t) * (7 - i)), 13 + Math.round(Math.sin(t) * (7 - i)), 1, 1, col);
        }
      });
      break;
    case 'nuit':
      pxDisk(c, 8, 8, 6, '#f0ecd0');
      c.globalCompositeOperation = 'destination-out';
      pxDisk(c, 11, 6, 5, '#000');
      c.globalCompositeOperation = 'source-over';
      pxRect(c, 13, 12, 1, 1, '#ffffff');
      pxRect(c, 12, 2, 1, 1, '#ffffff');
      break;
  }
  pixelize(cv, '#1e140c');
  return (weatherIconCache[id] = cv.toDataURL());
}

// ===========================================================================
// Caisses flottantes : un sprite par type de caisse (22×16 + contour)
// ===========================================================================
function buildCrateSprite(p) {
  const cv = makeCanvas(24, 18);
  const c = cv.getContext('2d');
  const W = 22, H = 16, ox = 1, oy = 1;
  const col = p.color, dark = shadeHex(col, 0.62), light = shadeHex(col, 1.3);
  if (p.id === 'osier') {
    pxRect(c, ox, oy, W, H, col);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if ((x + y * 2) % 4 === 0) pxRect(c, ox + x, oy + y, 1, 1, dark);
        else if ((x + y) % 5 === 0) pxRect(c, ox + x, oy + y, 1, 1, light);
      }
    }
    pxRect(c, ox, oy, W, 2, light);
    pxRect(c, ox, oy + H - 2, W, 2, dark);
  } else {
    pxRect(c, ox, oy, W, H, col);
    for (const y of [5, 10]) pxRect(c, ox, oy + y, W, 1, dark);         // jointures des planches
    for (const y of [0, 6, 11]) pxRect(c, ox + 2, oy + y, W - 4, 1, light);
    pxRect(c, ox, oy, 2, H, dark);                                        // montants
    pxRect(c, ox + W - 2, oy, 2, H, dark);
    pxLine(c, ox + 3, oy + H - 2, ox + W - 4, oy + 1, dark);             // traverse
    for (const [x, y] of [[ox, oy], [ox + W - 2, oy], [ox, oy + H - 2], [ox + W - 2, oy + H - 2]]) pxRect(c, x, y, 2, 2, shadeHex(col, 0.45));
    if (p.id === 'cerclee' || p.id === 'profonde') {
      for (const x of [6, 15]) { pxRect(c, ox + x, oy, 2, H, '#9aa3ad'); pxRect(c, ox + x, oy, 1, H, '#c8d0d8'); }
    }
    if (p.id === 'profonde') for (const [x, y] of [[3, 3], [18, 3], [3, 12], [18, 12]]) pxRect(c, ox + x, oy + y, 1, 1, '#d8e0e8');
    if (p.id === 'maudite') {
      for (const [x, y] of [[5, 3], [6, 2], [7, 3], [12, 8], [13, 7], [14, 8], [13, 9], [8, 12], [9, 13]]) pxRect(c, ox + x, oy + y, 1, 1, '#e3b0ff');
      pxRect(c, ox + 16, oy + 3, 1, 3, '#e3b0ff');
    }
  }
  pixelize(cv, '#1e140c');
  return cv;
}
