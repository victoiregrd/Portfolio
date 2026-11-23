/* ============ Portfolio Victoire Giroard — V2 : boule à stickers, orbite de projets ============ */
(() => {
'use strict';
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pointeurFin = matchMedia('(hover: hover) and (pointer: fine)').matches;
const alea = (a, b) => a + Math.random() * (b - a);
const pad = (n) => String(n).padStart(2, '0');

/* ---------------------------------------------------------------- CONTENU (content/*.json, préparé par contenu.js) */
const CONTENU = window.CONTENU || { projets: [], emoji: {}, infos: {} };
const PROJ = Object.fromEntries((CONTENU.projets || []).map((p) => [p.id, p]));
const PHRASES = CONTENU.emoji || {};
const phrases = (l, def) => { const v = (Array.isArray(l) ? l : []).filter((x) => typeof x === 'string' && x.trim()); return v.length ? v : def; };

/* ---------------------------------------------------------------- CONFIG (content/stickers.json) */
const COUL = window.COULEURS || {};
const varsCss = { fond: '--fond', lilas: '--lilas', rose: '--rose', menthe: '--menthe', ciel: '--ciel', peche: '--peche', texte: '--prune' };
for (const k in varsCss) if (COUL[k]) document.documentElement.style.setProperty(varsCss[k], COUL[k]);
const PALETTE = [COUL.lilas, COUL.rose, COUL.menthe, COUL.ciel, COUL.peche].filter(Boolean).concat('#ffffff');
const DEFS = (window.STICKERS || []).slice(0, 8);
const MAX = Math.max(5, Math.min(80, window.MAX_STICKERS || 36));

/* ---------------------------------------------------------------- SON (Web Audio, aucun fichier) */
let gesteFait = false;
['pointerdown', 'keydown'].forEach((t) => window.addEventListener(t, () => { gesteFait = true; }, { capture: true }));
const Son = (() => {
  let ctx = null, actif = true, iPiano = 0;
  try { actif = localStorage.getItem('vg-son') !== 'off'; } catch (e) {}
  const audio = () => {
    if (!actif || !gesteFait) return null;
    if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  const bruit = (c, duree) => {
    const b = c.createBuffer(1, Math.max(1, c.sampleRate * duree), c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(); s.buffer = b; return s;
  };
  const env = (g, t, a, v, r) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + r); };
  const note = (c, fr, t, a, v, r, type = 'triangle') => {
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = fr;
    env(g, t, a, v, r); o.connect(g).connect(c.destination); o.start(t); o.stop(t + a + r + .05); return o;
  };
  const souffle = (c, t, d, f0, f1, v, q = 1.2) => {
    const n = bruit(c, d), f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'bandpass'; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + d * .9);
    env(g, t, d * .35, v, d * .6); n.connect(f).connect(g).connect(c.destination); n.start(t); n.stop(t + d);
  };
  return {
    get actif() { return actif; },
    basculer() { actif = !actif; try { localStorage.setItem('vg-son', actif ? 'on' : 'off'); } catch (e) {} return actif; },
    decoller() { const c = audio(); if (c) souffle(c, c.currentTime, .22, 1800, 5200, .2, 1.4); },
    coller(force = 1) { // « paf » sourd + petit claquement de vinyle
      const c = audio(); if (!c) return; const t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(60, t + .14);
      env(g, t, .005, .5 * force, .16); o.connect(g).connect(c.destination); o.start(t); o.stop(t + .2);
      const n = bruit(c, .06), f = c.createBiquadFilter(), g2 = c.createGain();
      f.type = 'lowpass'; f.frequency.value = 2600; env(g2, t, .002, .3 * force, .05);
      n.connect(f).connect(g2).connect(c.destination); n.start(t); n.stop(t + .07);
    },
    pop(h = 1) {
      const c = audio(); if (!c) return; const t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(520 * h, t); o.frequency.exponentialRampToValueAtTime(980 * h, t + .07);
      env(g, t, .004, .16, .09); o.connect(g).connect(c.destination); o.start(t); o.stop(t + .12);
    },
    piano() { // une note de la gamme pentatonique, qui monte à chaque touche
      const c = audio(); if (!c) return; const t = c.currentTime;
      const g = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 880, 783.99][iPiano++ % 8];
      note(c, g, t, .005, .22, 1.1); note(c, g * 2, t, .005, .06, .5, 'sine'); note(c, g * 3, t, .003, .025, .25, 'sine');
    },
    boing() { // petit bêlement-ressort du Bélier
      const c = audio(); if (!c) return; const t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(520, t + .09); o.frequency.exponentialRampToValueAtTime(260, t + .4);
      lfo.frequency.value = 22; lg.gain.value = 18; lfo.connect(lg).connect(o.frequency);
      env(g, t, .01, .22, .42); o.connect(g).connect(c.destination); o.start(t); lfo.start(t); o.stop(t + .5); lfo.stop(t + .5);
    },
    gateau() { const c = audio(); if (!c) return; const t = c.currentTime; this.pop(1.25); note(c, 1046.5, t + .06, .004, .08, .3, 'sine'); note(c, 1318.5, t + .12, .004, .07, .35, 'sine'); },
    disco() { const c = audio(); if (!c) return; const t = c.currentTime; [1318.5, 1568, 2093, 2637, 3136].forEach((f, i) => note(c, f, t + i * .045, .003, .07, .28, 'sine')); },
    avion() { const c = audio(); if (!c) return; const t = c.currentTime; souffle(c, t, .6, 300, 2600, .2, .9); note(c, 520, t, .02, .05, .3, 'sine'); },
    plonge() { const c = audio(); if (!c) return; const t = c.currentTime; souffle(c, t, .7, 3200, 260, .16, .8);
      const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(700, t); o.frequency.exponentialRampToValueAtTime(140, t + .6);
      env(g, t, .02, .08, .6); o.connect(g).connect(c.destination); o.start(t); o.stop(t + .7); },
    retour() { const c = audio(); if (!c) return; const t = c.currentTime; souffle(c, t, .55, 300, 3000, .12, .8); },
    tic() { const c = audio(); if (!c) return; note(c, 1900, c.currentTime, .002, .035, .03, 'sine'); },
    notif() { const c = audio(); if (!c) return; const t = c.currentTime; note(c, 988, t, .004, .07, .16, 'sine'); note(c, 1480, t + .07, .004, .06, .22, 'sine'); },
    envoi() { const c = audio(); if (!c) return; souffle(c, c.currentTime, .18, 900, 3400, .08, 1.1); },
    fanfare() {
      const c = audio(); if (!c) return; const t = c.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((fr, i) => note(c, fr, t + i * .09, .01, .14, .35));
    },
    ding() { // l'ampoule s'allume : petit « ding » de clochette
      const c = audio(); if (!c) return; const t = c.currentTime;
      note(c, 1760, t, .002, .09, .9, 'sine'); note(c, 2637, t, .002, .035, .55, 'sine'); note(c, 3520, t + .005, .002, .015, .3, 'sine');
    },
    couic() { // couinement de jouet quand on clique sur Victoire
      const c = audio(); if (!c) return; const t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(760, t); o.frequency.exponentialRampToValueAtTime(1650, t + .06); o.frequency.exponentialRampToValueAtTime(1150, t + .16);
      lfo.frequency.value = 38; lg.gain.value = 45; lfo.connect(lg).connect(o.frequency);
      env(g, t, .01, .12, .15); o.connect(g).connect(c.destination); o.start(t); lfo.start(t); o.stop(t + .2); lfo.stop(t + .2);
    },
    allumette() {
      const c = audio(); if (!c) return; const t = c.currentTime;
      const n = bruit(c, .5), f = c.createBiquadFilter(), g = c.createGain();
      f.type = 'highpass'; f.frequency.value = 900; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.3, t + .03);
      g.gain.exponentialRampToValueAtTime(.06, t + .12); g.gain.exponentialRampToValueAtTime(.0001, t + .5);
      n.connect(f).connect(g).connect(c.destination); n.start(t); n.stop(t + .5);
    },
  };
})();
const sonDuSticker = { piano: () => Son.piano(), boing: () => Son.boing(), pop: () => Son.gateau(), disco: () => Son.disco(), avion: () => Son.avion() };
const boutonSon = $('#son');
const majSon = () => { boutonSon.classList.toggle('muet', !Son.actif); boutonSon.setAttribute('aria-label', Son.actif ? 'Couper le son' : 'Activer le son'); };
boutonSon.addEventListener('click', () => { Son.basculer(); majSon(); Son.pop(); });
majSon();

/* ---------------------------------------------------------------- PARTICULES (un seul canvas 2D, dessiné seulement quand il y en a) */
const Eclats = (() => {
  const cv = document.createElement('canvas'); cv.className = 'eclats'; cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  let dpr = 1, W = 0, H = 0, sale = false;
  const liste = [];
  const taille = () => { dpr = Math.min(window.devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; };
  taille(); window.addEventListener('resize', taille);
  const etoile = new Path2D('M0 -1L.28 -.28 1 0 .28 .28 0 1 -.28 .28 -1 0 -.28 -.28Z');
  const coeur = new Path2D('M0 .9C-.6 .5-1 .1-1-.35-1-.75-.7-1-.38-1-.18-1 0-.85 0-.7 0-.85.18-1 .38-1 .7-1 1-.75 1-.35 1 .1.6.5 0 .9Z');
  return {
    ajouter(x, y, n, rayon, forme) {
      for (let i = 0; i < n; i++) {
        const a = forme === 'coeur' ? alea(-2.6, -.6) : (i / n) * Math.PI * 2 + alea(-.3, .3);
        if (forme === 'etincelle') { // petites étoiles dorées et lilas, qui flottent un peu vers le haut
          liste.push({ x, y, a, r: alea(rayon[0], rayon[1]), t: 0, vie: alea(.6, .95), rot: alea(-1, 1), vr: alea(-3, 3), s: alea(5, 8.5),
            c: ['#FFC23D', '#FFE38A', COUL.lilas || '#CDB4F6', '#FFFFFF'][i % 4], f: etoile, g: -10 });
          continue;
        }
        liste.push({ x, y, a, r: alea(rayon[0], rayon[1]), t: 0, vie: alea(.65, 1), rot: alea(-1, 1), vr: alea(-4.5, 4.5),
          s: forme === 'coeur' ? 8 : alea(4, 8), c: forme === 'coeur' ? (i % 2 ? '#F08DB0' : (COUL.rose || '#FFC8DD')) : PALETTE[i % PALETTE.length],
          f: forme === 'coeur' ? coeur : (Math.random() < .55 ? etoile : null), g: forme === 'coeur' ? -10 : 34 });
      }
    },
    frame(dt) {
      if (!liste.length && !sale) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = .16; ctx.strokeStyle = 'rgba(59,42,74,.55)';
      for (let i = liste.length - 1; i >= 0; i--) {
        const p = liste[i]; p.t += dt;
        const k = p.t / p.vie;
        if (k >= 1) { liste.splice(i, 1); continue; }
        const e = 1 - Math.pow(1 - k, 3);
        const x = p.x + Math.cos(p.a) * p.r * e, y = p.y + Math.sin(p.a) * p.r * e + p.g * k * k;
        const sc = p.s * (1 - k * .9);
        ctx.setTransform(dpr * sc, 0, 0, dpr * sc, x * dpr, y * dpr);
        ctx.rotate(p.rot + p.vr * p.t);
        ctx.fillStyle = p.c;
        if (p.f) { ctx.fill(p.f); ctx.stroke(p.f); }
        else { ctx.beginPath(); ctx.arc(0, 0, .8, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      }
      sale = liste.length > 0;
    },
  };
})();
function eclabousser(x, y, n = 14, rayon = [40, 120], forme = null) {
  if (reduit) return;
  Eclats.ajouter(x, y, n, rayon, forme);
}
function onomatopee(x, y, mots) {
  if (reduit) return;
  const o = document.createElement('span'); o.className = 'onomatopee';
  o.textContent = mots[Math.floor(Math.random() * mots.length)];
  document.body.appendChild(o);
  const r = alea(-14, 14);
  o.animate([
    { transform: `translate(${x}px,${y}px) translate(-50%,-50%) rotate(${r}deg) scale(.3)`, opacity: 0 },
    { transform: `translate(${x}px,${y}px) translate(-50%,-140%) rotate(${r}deg) scale(1.1)`, opacity: 1, offset: .3 },
    { transform: `translate(${x}px,${y}px) translate(-50%,-210%) rotate(${r}deg) scale(1)`, opacity: 0 },
  ], { duration: 1000, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => o.remove();
}

/* ---------------------------------------------------------------- MISE EN PAGE (boule + orbite) */
const accueil = $('#accueil'), scene = $('#scene'), canvas = $('#boule'), ombre = $('#ombre-boule'), bouleCss = $('#boule-css');
const cartes = $$('.carte'), NB = cartes.length, PAS = (Math.PI * 2) / NB;
const ORDRE = cartes.map((c) => c.dataset.projet);
const TITRES = Object.fromEntries(cartes.map((c) => [c.dataset.projet, c.querySelector('.carte-txt').childNodes[1].textContent.trim()]));
const emojiEl = $('#emoji'), bulle = $('#bulle'), indice = $('#indice');
const L = { W: 0, H: 0, cx: 0, cy: 0, r: 0, taille: 0, f: 1, D: 5, Rr: 2, ringPx: 400, tilt: .27, y0: 0, cw: 150, ch: 198, mobile: false, sFront: 1 };
const E = { x: 24, y: 24, s: 1, taille: 112 }; // position de l'émoji
let sphere = null;

function placerEmoji() {
  const projet = document.body.classList.contains('en-projet');
  E.taille = L.mobile ? 56 : 112;
  if (L.mobile) { E.x = 10; E.y = 8; E.s = 1; }
  else if (projet) { E.x = 18; E.y = 10; E.s = .54; }
  else { E.x = 24; E.y = L.H - 24 - E.taille; E.s = 1; }
  const st = emojiEl.style;
  st.setProperty('--ex', E.x + 'px'); st.setProperty('--ey', E.y + 'px'); st.setProperty('--es', E.s);
  const enDessous = L.mobile || projet;
  bulle.classList.toggle('en-dessous', enDessous);
  bulle.style.setProperty('--bx', (enDessous ? E.x + 6 : E.x + E.taille + 10) + 'px');
  bulle.style.setProperty('--by', (enDessous ? E.y + E.taille * E.s + 8 : E.y - 18) + 'px');
}

function miseEnPage() {
  L.W = innerWidth; L.H = innerHeight; L.mobile = L.W < 700;
  if (L.mobile) { L.r = Math.min(L.W * .36, L.H * .21); L.cx = L.W / 2; L.cy = L.H * .45; }
  else { L.r = Math.min(L.H * .235, L.W * .16); L.cx = L.W / 2; L.cy = L.H * .45; }
  L.taille = Math.round(L.r * 2.9);
  L.f = (L.taille / 2) / Math.tan(15 * Math.PI / 180);
  L.D = Math.sqrt((L.f / L.r) ** 2 + 1);
  L.ringPx = L.mobile ? L.W * .47 : Math.min(L.W * .37, L.r * 2.55);
  L.Rr = (L.ringPx * L.D) / L.f;
  L.tilt = L.mobile ? .58 : .3;
  L.y0 = L.mobile ? -.5 : -.16;
  L.cw = L.mobile ? 76 : Math.round(Math.max(112, Math.min(150, L.W * .098)));
  L.ch = L.cw * 1.32;
  L.sFront = L.D / (L.D - L.Rr * Math.cos(L.tilt));
  // la carte de devant ne doit pas passer sous la barre de stickers, la boule pas sous l'en-tête
  const decalDevant = (L.f * (L.Rr * Math.sin(L.tilt) - L.y0)) / (L.D - L.Rr * Math.cos(L.tilt));
  if (L.mobile) { // centre le bloc (haut de la boule → bas de la carte de devant) entre l'indice et la barre
    const haut = 128, bas = L.H - 186;
    L.cy = (haut + bas) / 2 + (L.r - decalDevant - L.ch / 2) / 2;
  }
  L.cy = Math.min(L.cy, L.H - (L.mobile ? 192 : 122) - decalDevant - L.ch / 2);
  L.cy = Math.max(L.cy, (L.mobile ? 72 : 92) + L.r);
  const ds = document.documentElement.style;
  ds.setProperty('--cy', L.cy + 'px'); ds.setProperty('--cw', L.cw + 'px');
  canvas.style.width = canvas.style.height = L.taille + 'px';
  canvas.style.transform = `translate(${L.cx - L.taille / 2}px,${L.cy - L.taille / 2}px)`;
  const d = L.r * 2;
  bouleCss.style.cssText = `width:${d}px;height:${d}px;transform:translate(${L.cx - L.r}px,${L.cy - L.r}px)`;
  ombre.style.cssText = `width:${L.r * 2.3}px;height:${L.r * .55}px;transform:translate(${L.cx - L.r * 1.15}px,${L.cy + L.r * .82}px)`;
  // pointe de la flèche : mobile = juste au-dessus du haut de la boule ; bureau = bord haut-droit (45°), à 10 px de la boule
  if (L.mobile) { indice.style.setProperty('--ix', L.cx + 'px'); indice.style.setProperty('--iy', (L.cy - L.r - 5) + 'px'); }
  else {
    // bureau : pointe sur le bord haut-droit de la boule ; on descend l'angle (45° → 8°) tant que le texte passerait sous l'en-tête
    const nav = document.querySelector('.entete-nav'), basEntete = nav ? nav.getBoundingClientRect().bottom : 60;
    const span = indice.querySelector('span'), hTexte = span ? span.offsetHeight : 60;
    const yMin = basEntete + 22 + 58 + hTexte + 10; // marge + écart flèche→texte + texte + inclinaison
    const s = Math.max(Math.sin(8 * Math.PI / 180), Math.min(Math.SQRT1_2, (L.cy - yMin) / (L.r + 10)));
    const a = Math.asin(s);
    indice.style.setProperty('--ix', (L.cx + (L.r + 10) * Math.cos(a)) + 'px'); indice.style.setProperty('--iy', (L.cy - (L.r + 10) * s) + 'px');
  }
  placerEmoji();
  if (sphere) sphere.redim(L.taille, L.r);
}
let attenteRedim = 0;
window.addEventListener('resize', () => { cancelAnimationFrame(attenteRedim); attenteRedim = requestAnimationFrame(miseEnPage); });
miseEnPage();

/* ---------------------------------------------------------------- ORBITE DES PROJETS */
const O = { theta: 0, v: 0, cible: null, glisse: false, derniere: -1e9, survol: -1, avant: -1, intro: reduit ? 1 : 0, introEnCours: false,
  h: new Float32Array(NB), sx: new Float32Array(NB), sy: new Float32Array(NB), z: new Int8Array(NB).fill(-1), auto: reduit ? 0 : 1,
  // géométrie « au repos » de chaque carte (sans l'effet de survol) : sert à détecter le pointeur sur une zone qui ne bouge pas
  rx: new Float32Array(NB), ry: new Float32Array(NB), w2: new Float32Array(NB), h2: new Float32Array(NB), zz: new Float32Array(NB), vis: new Float32Array(NB) };
const snap = (th) => Math.round(th / PAS) * PAS;
const indexDevant = () => ((Math.round(-(O.cible !== null ? O.cible : O.theta) / PAS) % NB) + NB) % NB;
const versCarte = (i) => { const base = -i * PAS; return base + Math.round((O.theta - base) / (Math.PI * 2)) * Math.PI * 2; };
const easeOutBack = (k) => { const c = 1.5; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const estDevant = (i) => Math.abs(O.theta - versCarte(i)) < PAS * .3 && indexDevant() === i;
const P = { x: -1, y: -1, dedans: false }; // dernier pointeur souris au-dessus de la scène

/* carte sous un point : zone de repos, marge de tolérance pour la carte déjà survolée (pas de bascule en rafale) */
function carteSous(x, y, garder = -1) {
  let best = -1, bz = -1e9;
  for (let i = 0; i < NB; i++) {
    if (O.vis[i] < .35) continue;
    const m = i === garder ? 14 : 0;
    if (Math.abs(x - O.rx[i]) > O.w2[i] + m || Math.abs(y - O.ry[i]) > O.h2[i] + m) continue;
    if (O.zz[i] < 0 && Math.hypot(x - L.cx, y - L.cy) < L.r * .98) continue; // cachée derrière la boule
    if (O.zz[i] > bz) { bz = O.zz[i]; best = i; }
  }
  return best;
}
function majSurvol(i) {
  if (i === O.survol) return;
  if (O.survol >= 0) cartes[O.survol].classList.remove('survol');
  O.survol = i;
  if (i >= 0) { cartes[i].classList.add('survol'); Son.pop(.75); }
  majIndex();
}

function orbiteFrame(dt, now) {
  const pilote = now - O.derniere < 4500;
  if (!O.glisse) {
    if (O.cible !== null) {
      if (reduit) { O.theta = O.cible; O.v = 0; O.cible = null; }
      else {
        // ressort amorti critique : arrivée douce, sans rebond
        const w = 7.5, a = (O.cible - O.theta) * w * w - O.v * 2 * w;
        O.v += a * dt; O.theta += O.v * dt;
        if (Math.abs(O.cible - O.theta) < 4e-4 && Math.abs(O.v) < 3e-3) { O.theta = O.cible; O.v = 0; O.cible = null; }
      }
    } else if (Math.abs(O.v) > 1e-4) {
      O.v *= Math.exp(-3 * dt); O.theta += O.v * dt;
      if (Math.abs(O.v) < .6) O.cible = snap(O.theta); // aimantation sur la carte la plus proche
    }
    // rotation automatique très lente : coupée net dès qu'on survole ou qu'on pilote (sinon la carte glisse sous le pointeur),
    // puis relancée en douceur après 4,5 s sans interaction
    if (pilote || O.survol >= 0 || reduit) O.auto = 0;
    else O.auto += (1 - O.auto) * (1 - Math.exp(-.8 * dt));
    if (O.cible === null && Math.abs(O.v) <= 1e-4) O.theta -= .05 * O.auto * dt;
  }
  if (O.introEnCours && O.intro < 1) O.intro = Math.min(1, O.intro + dt / 1.3);
  const ki = O.intro, rayonIntro = ki <= 0 ? .001 : easeOutBack(ki), spin = (1 - ki) * (1 - ki) * 2.2;
  const ct = Math.cos(L.tilt), stl = Math.sin(L.tilt), lis = 1 - Math.exp(-7 * dt);
  for (let i = 0; i < NB; i++) {
    const a = O.theta + i * PAS + spin;
    const R = L.Rr * rayonIntro;
    const x = R * Math.sin(a), z0 = R * Math.cos(a);
    const y = -z0 * stl + L.y0, z = z0 * ct;
    const den = L.D - z, sc = (L.D / den) / L.sFront, rot = Math.sin(a) * 32;
    const sx = L.cx + (L.f * x) / den, sy = L.cy - (L.f * y) / den;
    // zone de repos (détection)
    O.rx[i] = sx; O.ry[i] = sy; O.zz[i] = z;
    O.w2[i] = (L.cw * sc * Math.cos(rot * Math.PI / 180)) / 2; O.h2[i] = (L.ch * sc) / 2;
    // survol : léger soulèvement progressif, amorti (ne change pas la zone de détection)
    O.h[i] += ((i === O.survol ? 1 : 0) - O.h[i]) * lis;
    const hv = O.h[i], lev = hv * L.ch * .07, sch = sc * (1 + .045 * hv);
    O.sx[i] = sx; O.sy[i] = sy - lev;
    const prof = Math.max(0, Math.min(1, (Math.cos(a) + 1) / 2));
    const op = (.5 + .5 * prof) * Math.min(1, ki * 2.5);
    O.vis[i] = op;
    const el = cartes[i];
    el.style.transform = `translate3d(${(sx - L.cw / 2).toFixed(1)}px,${(sy - lev - L.ch / 2).toFixed(1)}px,0) scale(${sch.toFixed(3)}) perspective(700px) rotateY(${rot.toFixed(1)}deg)`;
    el.style.opacity = op.toFixed(3);
    const zi = z > 0 ? (prof > .9 ? 12 : prof > .7 ? 11 : 10) : 1; // devant la boule (canvas = 2) ou derrière ; peu de niveaux = peu de recompositions
    if (O.z[i] !== zi) { O.z[i] = zi; el.style.zIndex = zi; }
  }
  // survol recalculé à chaque image : les cartes peuvent glisser sous un pointeur immobile
  if (P.dedans && !modeGeste && !projetCourant) majSurvol(carteSous(P.x, P.y, O.survol));
  const devant = indexDevant();
  if (devant !== O.avant) {
    if (pilote && O.avant >= 0) Son.tic();
    if (O.avant >= 0) cartes[O.avant].classList.remove('devant');
    cartes[devant].classList.add('devant'); O.avant = devant;
    majIndex();
  }
}

function piloter() { O.derniere = performance.now(); }
function allerA(i) { piloter(); O.v = 0; O.cible = versCarte(i); aideOrbiteVue(); }
function tournerOrbite(sens) { piloter(); O.cible = (O.cible === null ? snap(O.theta) : O.cible) - sens * PAS; aideOrbiteVue(); }
let aideCachee = false;
const aideOrbiteVue = () => { if (!aideCachee) { aideCachee = true; $('#aide-orbite').classList.add('cache'); } };

/* molette / trackpad : un cran = une carte ; les petits mouvements du trackpad sont regroupés */
let roueAcc = 0, roueVerrou = 0, roueDebut = 0;
scene.addEventListener('wheel', (e) => {
  if (projetCourant || !pret) return;
  e.preventDefault();
  const now = performance.now();
  let d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  if (e.deltaMode === 1) d *= 40; else if (e.deltaMode === 2) d *= 800;
  if (now < roueVerrou) { // geste en cours (élan du trackpad) : ignoré tant qu'il continue, 900 ms au plus
    roueVerrou = Math.min(roueDebut + 900, Math.max(roueVerrou, now + 150));
    roueAcc = 0; return;
  }
  roueAcc += d;
  if (Math.abs(roueAcc) >= 40) {
    tournerOrbite(roueAcc > 0 ? 1 : -1);
    roueAcc = 0; roueDebut = now; roueVerrou = now + 260;
  }
}, { passive: false });

cartes.forEach((c, i) => {
  c.addEventListener('focus', () => allerA(i));
  c.addEventListener('click', (e) => { e.preventDefault(); if (e.detail === 0) ouvrir(c.dataset.projet, { depuis: 'carte' }); });
});

/* petit index des 9 projets */
const index = $('#index-projets'), indexTitre = $('#index-titre');
const boutonsIndex = ORDRE.map((id, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'index-pt'; b.textContent = pad(i + 1);
  b.setAttribute('aria-label', `Projet ${pad(i + 1)} : ${TITRES[id]}`); b.title = TITRES[id];
  b.addEventListener('click', () => { if (estDevant(i)) ouvrir(id, { depuis: 'carte' }); else { allerA(i); Son.pop(1 + i * .04); } });
  b.addEventListener('pointerenter', () => { indexSurvol = i; majIndex(); });
  b.addEventListener('pointerleave', () => { indexSurvol = -1; majIndex(); });
  b.addEventListener('focus', () => { indexSurvol = i; majIndex(); });
  b.addEventListener('blur', () => { indexSurvol = -1; majIndex(); });
  $('.index-rangee', index).appendChild(b);
  return b;
});
let indexSurvol = -1;
function majIndex() {
  const d = indexDevant();
  boutonsIndex.forEach((b, i) => { b.classList.toggle('actif', i === d); b.setAttribute('aria-current', i === d ? 'true' : 'false'); });
  const i = indexSurvol >= 0 ? indexSurvol : (O.survol >= 0 ? O.survol : d);
  const t = `${pad(i + 1)} · ${TITRES[ORDRE[i]]}`;
  if (indexTitre.textContent !== t) indexTitre.textContent = t;
}

/* ---------------------------------------------------------------- GESTES SUR LA SCÈNE */
let modeGeste = null, gx0 = 0, gy0 = 0, gxp = 0, gyp = 0, gtp = 0, bouge = false, carteGeste = -1, thetaDepart = 0, typeGeste = 'mouse';
scene.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || projetCourant || !pret) return;
  typeGeste = e.pointerType;
  carteGeste = carteSous(e.clientX, e.clientY);
  const orbiteLancee = Math.abs(O.v) > .8 && O.glisse === false && performance.now() - O.derniere < 4500;
  if (carteGeste >= 0) modeGeste = 'carte';
  else if (sphere && sphere.touche(e.clientX, e.clientY)) modeGeste = orbiteLancee ? 'stop' : 'boule'; // un toucher qui arrête l'orbite ne colle rien
  else modeGeste = 'orbite';
  gx0 = gxp = e.clientX; gy0 = gyp = e.clientY; gtp = performance.now(); bouge = false;
  try { scene.setPointerCapture(e.pointerId); } catch (err) {}
  if (modeGeste !== 'boule') { thetaDepart = O.cible !== null ? O.cible : snap(O.theta); O.cible = null; O.v = 0; piloter(); }
  majSurvol(-1);
});
scene.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') { P.x = e.clientX; P.y = e.clientY; P.dedans = true; }
  if (!modeGeste) { survolScene(e); return; }
  const now = performance.now(), dt = Math.max(1, now - gtp) / 1000;
  const dx = e.clientX - gxp, dy = e.clientY - gyp;
  gxp = e.clientX; gyp = e.clientY; gtp = now;
  if (!bouge && Math.hypot(e.clientX - gx0, e.clientY - gy0) > 8) {
    bouge = true;
    if (modeGeste === 'carte' || modeGeste === 'stop') modeGeste = 'orbite';
    if (modeGeste === 'boule') { sphere.debutGlisse(); curseurLabel('tourne'); }
    else { O.glisse = true; aideOrbiteVue(); curseurLabel('tourne'); }
  }
  if (!bouge) return;
  if (modeGeste === 'boule') sphere.glisser(dx, dy, dt);
  else {
    const dth = dx / L.ringPx;
    O.theta += dth; piloter();
    O.v += (dth / dt - O.v) * (1 - Math.exp(-dt * 18));
  }
});
scene.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !modeGeste) { P.dedans = false; majSurvol(-1); } });
const finGeste = (e) => {
  if (!modeGeste) return;
  const mode = modeGeste;
  modeGeste = null;
  if (!bouge && e.type === 'pointerup') {
    if (mode === 'boule') collerA(e.clientX, e.clientY);
    else if (mode === 'carte') {
      // carte de devant → on ouvre ; carte sur le côté → elle vient se placer devant
      if (estDevant(carteGeste) && Math.abs(thetaDepart - versCarte(carteGeste)) < PAS * .3) ouvrir(ORDRE[carteGeste], { depuis: 'carte' });
      else { allerA(carteGeste); Son.pop(1.1); }
    } else if (mode === 'stop' || mode === 'orbite') { O.cible = snap(O.theta); }
  } else if (bouge) {
    if (mode === 'boule') sphere.lacher();
    else {
      O.glisse = false; piloter();
      const v = Math.max(-6, Math.min(6, O.v));
      if (typeGeste !== 'mouse') {
        // tactile : un balayage = une carte (ou plus si le doigt a vraiment traîné loin)
        const total = O.theta - thetaDepart, sens = Math.abs(v) > .7 ? Math.sign(v) : Math.sign(total);
        const pas = Math.max(1, Math.round(Math.abs(total) / PAS));
        O.cible = Math.abs(total) < PAS * .12 && Math.abs(v) < .7 ? thetaDepart : thetaDepart + sens * pas * PAS;
      } else {
        // souris : élan amorti puis aimantation sur la carte où il mène (4 cartes au plus)
        const elan = Math.max(-4 * PAS, Math.min(4 * PAS, v / 3));
        O.cible = snap(O.theta + elan);
      }
      O.v = v;
    }
  }
  carteGeste = -1; O.glisse = false;
};
scene.addEventListener('pointerup', finGeste);
scene.addEventListener('pointercancel', finGeste);

/* ---------------------------------------------------------------- BARRE DE STICKERS + COLLAGE */
const barre = $('#barre-stickers'), sep = $('.barre-sep', barre), compteur = $('#compteur');
$('#max').textContent = MAX;
let choix = 'auto', iAuto = 0, premierCollage = false, nbColles = 0;
const imagesStickers = [];
const boutonsChoix = [$('.choix-auto', barre)];

function majChoix() {
  boutonsChoix.forEach((b) => { const on = b.dataset.s === String(choix); b.classList.toggle('actif', on); b.setAttribute('aria-pressed', on); });
  boutonsChoix.forEach((b) => b.classList.toggle('suivant', choix === 'auto' && b.dataset.s === String(iAuto % DEFS.length)));
}
function prochainSticker() {
  if (choix !== 'auto') return choix;
  const i = iAuto % DEFS.length; iAuto++; majChoix(); return i;
}
function majCompteur() {
  const n = sphere ? sphere.nombre() : 0;
  if (String(n) !== compteur.textContent) { compteur.textContent = n; compteur.classList.remove('saute'); void compteur.offsetWidth; compteur.classList.add('saute'); }
}
const BRAVO = phrases(PHRASES.bravo, ['trop mignon !', 'encore un !', 'joli ✿', 'parfait !', 'ta-dam !', "j'adore !", 'pile au bon endroit', 'collé-serré !']);
function apresCollage(i, x, y, res) {
  const def = DEFS[i];
  Son.coller(.6); (sonDuSticker[def.son] || Son.pop)();
  if (res.retire) setTimeout(() => Son.decoller(), 120);
  eclabousser(x, y, 12, [30, 100]);
  nbColles++;
  majCompteur();
  const b = boutonsChoix.find((bt) => bt.dataset.s === String(i));
  if (b) { b.classList.remove('saute'); void b.offsetWidth; b.classList.add('saute'); }
  if (!premierCollage) { premierCollage = true; indice.classList.add('cache'); }
  const n = sphere.nombre();
  let texte = null;
  if (n === 1) texte = 'yes ! continue ✿';
  else if (n === 5) texte = '5 stickers, ça prend forme !';
  else if (n === 12) texte = 'quelle collection !';
  else if (n >= MAX) texte = 'la boule est pleine à craquer !';
  else if (nbColles % 3 === 0) texte = BRAVO[Math.floor(Math.random() * BRAVO.length)];
  if (n >= MAX) Emoji.reagir('idee', texte, 1800, true); else Emoji.joie(texte);
}
function collerA(x, y) {
  if (!sphere) return;
  const i = prochainSticker();
  const res = sphere.coller(x, y, i, DEFS[i].taille || 1);
  if (res) apresCollage(i, x, y, res);
}
$('#boule-clavier').addEventListener('click', () => {
  if (!sphere) return;
  const i = prochainSticker();
  const res = sphere.collerAuHasard(i, DEFS[i].taille || 1);
  if (res) apresCollage(i, L.cx, L.cy, res);
});
$('#decoller').addEventListener('click', () => {
  if (!sphere) return;
  const n = sphere.decollerTout();
  for (let k = 0; k < Math.min(n, 8); k++) setTimeout(() => Son.decoller(), k * 70);
  setTimeout(() => Son.pop(1.3), Math.min(n, 8) * 70 + 120);
  setTimeout(majCompteur, 50); setTimeout(majCompteur, n * 45 + 500);
  Emoji.memoji.montrer('paix', { duree: 1500, saut: true }); Emoji.dire(n ? 'tout propre ! on recommence ?' : 'rien à décoller… colle d’abord !');
});

/* fabrication des stickers : SVG → canvas, liseré blanc découpé + petite ombre */
function chargerImage(src) {
  return new Promise((ok, ko) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = ko; i.src = src; });
}
function toile(T) { const c = document.createElement('canvas'); c.width = c.height = T; return c; }
async function fabriquerSticker(def, T) {
  const src = def.image || ('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${T}" height="${T}">${def.svg}</svg>`));
  const img = await chargerImage(src);
  const m = T * .1, art = T - 2 * m;
  const a = toile(T), ca = a.getContext('2d');
  ca.drawImage(img, m, m, art, art);
  const s = toile(T), cs = s.getContext('2d'), b = T * .034;
  for (let k = 0; k < 28; k++) { const an = (k / 28) * Math.PI * 2; cs.drawImage(a, Math.cos(an) * b, Math.sin(an) * b); }
  cs.globalCompositeOperation = 'source-in'; cs.fillStyle = '#fff'; cs.fillRect(0, 0, T, T);
  const f = toile(T), cf = f.getContext('2d');
  cf.shadowColor = 'rgba(59,42,74,.32)'; cf.shadowBlur = T * .022; cf.shadowOffsetY = T * .01;
  cf.drawImage(s, 0, 0);
  cf.shadowColor = 'transparent';
  cf.drawImage(a, 0, 0);
  return f;
}
function vignetteSticker(cv, def) {
  try { const p = toile(128); p.getContext('2d').drawImage(cv, 0, 0, 128, 128); return p.toDataURL('image/png'); }
  catch (e) { return def.image || ('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -12 124 124">${def.svg}</svg>`)); }
}
function construireBarre(toiles) {
  DEFS.forEach((def, i) => {
    const b = document.createElement('button');
    b.className = 'choix'; b.dataset.s = String(i); b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', 'Sticker ' + def.nom); b.title = def.nom; b.dataset.curseur = def.nom.toLowerCase();
    const im = new Image(); im.alt = ''; im.draggable = false;
    im.src = imagesStickers[i] = toiles[i] ? vignetteSticker(toiles[i], def) : '';
    b.appendChild(im);
    barre.insertBefore(b, sep);
    boutonsChoix.push(b);
  });
  boutonsChoix.forEach((b) => b.addEventListener('click', () => {
    const v = b.dataset.s === 'auto' ? 'auto' : Number(b.dataset.s);
    choix = (choix === v && v !== 'auto') ? 'auto' : v;
    majChoix(); Son.pop(v === 'auto' ? 1 : 1.1 + v * .08);
    if (v !== 'auto') { const r = b.getBoundingClientRect(); eclabousser(r.left + r.width / 2, r.top + r.height / 2, 6, [16, 40]); }
    Emoji.dire(choix === 'auto' ? 'les stickers défilent à tour de rôle ✦' : DEFS[choix].nom + ' choisi !');
  }));
  majChoix();
}

/* version simple si la 3D n'est pas disponible : disque pastel + stickers à plat */
function creerRepli() {
  bouleCss.hidden = false; canvas.hidden = true; $('#repli-message').hidden = false;
  const poses = [];
  const api = {
    type: 'css', redim() {}, frame() {}, async prechauffer() {}, intro() {}, debutGlisse() {}, glisser() {}, lacher() {},
    nombre: () => poses.length,
    touche(x, y) { const r = bouleCss.getBoundingClientRect(); return Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) <= r.width / 2; },
    coller(x, y, i, taille = 1) {
      if (!api.touche(x, y)) return null;
      const r = bouleCss.getBoundingClientRect(), im = new Image();
      im.src = imagesStickers[i]; im.alt = '';
      im.style.cssText = `left:${((x - r.left) / r.width) * 100}%;top:${((y - r.top) / r.height) * 100}%;width:${30 * taille}%;--r:${alea(-25, 25)}deg`;
      im.className = 'pop'; bouleCss.appendChild(im); poses.push(im);
      let retire = 0; if (poses.length > MAX) { poses.shift().remove(); retire = 1; }
      return { retire };
    },
    collerAuHasard(i, t) { const r = bouleCss.getBoundingClientRect(), a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * r.width * .3; return api.coller(r.left + r.width / 2 + Math.cos(a) * d, r.top + r.height / 2 + Math.sin(a) * d, i, t); },
    decollerTout() { const n = poses.length; poses.splice(0).forEach((p, k) => setTimeout(() => p.remove(), k * 40)); return n; },
  };
  return api;
}

/* ---------------------------------------------------------------- MEMOJI DE VICTOIRE (assets/emoji/) */
// Les 3 expressions sont empilées dans le même cadre (images préchargées) : on ne change que celle qui est visible,
// au creux du rebond (personnage écrasé), ce qui cache le changement.
// Couches : .memoji (inclinaison 3D vers la souris) > .mj-flotte (flotte + respire, CSS) > .mj-balance (balancement, CSS)
//           > .mj-ressort (anticipation, saut, rebond, gestes : animations JS ci-dessous)
const EXPRS = ['paix', 'clin', 'idee'];
const VERS_EXPR = { sourire: 'paix', etoiles: 'idee', clin: 'clin', paix: 'paix', idee: 'idee' };
const borne = (v, a, b) => Math.min(b, Math.max(a, v));
// Images clés : [moment 0→1, montée en % de la hauteur, échelle x, échelle y, rotation en °] ; pv = pivot de la rotation
// (en % depuis le bas du cou) ; swap = moment du changement d'expression ; fx = effet propre à l'expression.
const MJ_ANIMS = {
  rebond: { d: 620, swap: .16, pv: [0, 0], f: [[0, 0, 1, 1, 0], [.16, 2, 1.12, .87, 0], [.42, -7, .93, 1.09, 0], [.64, 1, 1.06, .94, 0], [.8, -1, .99, 1.02, 0], [1, 0, 1, 1, 0]] },
  saut: { d: 760, swap: .15, pv: [0, 0], f: [[0, 0, 1, 1, 0], [.15, 3, 1.15, .84, 0], [.45, -15, .9, 1.12, -3], [.7, 1.5, 1.1, .9, 1], [.85, -2, .98, 1.02, 0], [1, 0, 1, 1, 0]] },
  // clin d'œil : petit saut, puis la tête se secoue (pivot au cou) ; des cœurs s'envolent
  clin: { d: 1080, swap: .13, pv: [0, -18], fx: 'coeurs', fxAt: .4, f: [[0, 0, 1, 1, 0], [.13, 2, 1.12, .87, 0], [.32, -9, .93, 1.09, 0], [.48, 1, 1.06, .94, 0], [.58, 0, 1, 1, -7], [.68, 0, 1, 1, 6], [.78, 0, 1, 1, -4], [.88, 0, 1, 1, 2], [1, 0, 1, 1, 0]] },
  // paix : petit saut, puis tout le personnage remue autour de la main ; étincelles autour de la main
  paix: { d: 1120, swap: .13, pv: [29, -32], fx: 'etincelles', fxAt: .42, f: [[0, 0, 1, 1, 0], [.13, 2, 1.12, .87, 0], [.32, -9, .93, 1.09, 0], [.46, 1, 1.05, .95, 0], [.56, 0, 1, 1, 6], [.66, 0, 1, 1, -5], [.76, 0, 1, 1, 5], [.87, 0, 1, 1, -2], [1, 0, 1, 1, 0]] },
  // idée : elle se hisse, l'ampoule clignote puis s'allume (« ding »), elle redescend
  idee: { d: 1380, swap: .15, pv: [0, 0], fx: 'ding', fxAt: .52, f: [[0, 0, 1, 1, 0], [.15, 3, 1.14, .85, 0], [.4, -11, .92, 1.1, 0], [.55, -7, .97, 1.04, 0], [.78, -7, .98, 1.03, 0], [.9, 1, 1.04, .96, 0], [1, 0, 1, 1, 0]] },
  sursaut: { d: 440, swap: 0, pv: [0, -18], f: [[0, 0, 1, 1, 0], [.22, -10, .9, 1.13, -5], [.5, 1.5, 1.08, .92, 3], [.75, -1, .98, 1.02, 0], [1, 0, 1, 1, 0]] },
  hop: { d: 560, swap: 0, pv: [0, 0], f: [[0, 0, 1, 1, 0], [.2, 1.5, 1.06, .94, 0], [.5, -6, .96, 1.05, 0], [.75, .8, 1.04, .96, 0], [1, 0, 1, 1, 0]] },
};
const EASE_MONTE = 'cubic-bezier(.2,.7,.35,1)', EASE_TOMBE = 'cubic-bezier(.55,0,.8,.45)', EASE_IO = 'cubic-bezier(.45,0,.55,1)';
// effets propres à chaque expression (particules dans le canvas commun, son seulement si demandé)
function effetMemoji(fx, racine, son) {
  const r = racine.getBoundingClientRect();
  if (!r.width) return;
  const pt = (fx_, fy_) => [r.left + r.width * fx_, r.top + r.height * fy_], s = r.width / 123;
  if (fx === 'coeurs') { const [x, y] = pt(.72, .36); eclabousser(x, y, 4, [26 * s, 64 * s], 'coeur'); }
  else if (fx === 'etincelles') { const [x, y] = pt(.86, .62); eclabousser(x, y, 7, [18 * s, 46 * s], 'etincelle'); }
  else if (fx === 'ding') { const [x, y] = pt(.53, .1); eclabousser(x, y, 5, [14 * s, 34 * s], 'etincelle'); if (son) Son.ding(); }
}
function creerMemoji(racine, { cycle = false, riche = false, effets = false, ombre = null, amp = 1 } = {}) {
  const ressort = $('.mj-ressort', racine);
  let base = racine.dataset.expr || 'paix', courant = base, vise = base, iCycle = Math.max(0, EXPRS.indexOf(base));
  let tenue = null, maintenu = null, minTenue = 0, minPose = 0, minCycle = 0, minFx = 0, anim = null, animOmbre = null;
  const visible = () => !document.hidden && racine.isConnected && racine.getClientRects().length > 0;
  const repos = () => maintenu || base;
  function afficher(e) {
    if (e === courant) return;
    courant = e; racine.dataset.expr = e;
    if (e === 'idee') { racine.classList.remove('allume'); void racine.offsetWidth; racine.classList.add('allume'); }
  }
  const tf = (ty, sx, sy, r, pv, k) =>
    `translateY(${(ty * k).toFixed(2)}%) translate(${pv[0]}%,${pv[1]}%) rotate(${(r * k).toFixed(2)}deg) translate(${-pv[0]}%,${-pv[1]}%) scale(${(1 + (sx - 1) * k).toFixed(3)},${(1 + (sy - 1) * k).toFixed(3)})`;
  // joue une animation ; e = expression à afficher au creux du rebond
  function jouer(nom, e = null, { fort = 1, son = false } = {}) {
    const A = MJ_ANIMS[nom];
    clearTimeout(minPose); clearTimeout(minFx);
    if (e) vise = e;
    if (reduit || !visible()) { if (anim) { anim.cancel(); anim = null; } if (e) afficher(e); return; }
    if (anim) anim.cancel();
    if (animOmbre) animOmbre.cancel();
    const k = amp * fort;
    const ease = (i) => { const a = A.f[i], b = A.f[i + 1]; if (!b) return 'linear'; return b[1] < a[1] - .5 ? EASE_MONTE : b[1] > a[1] + .5 ? EASE_TOMBE : EASE_IO; };
    anim = ressort.animate(A.f.map(([o, ty, sx, sy, r], i) => ({ offset: o, easing: ease(i), transform: tf(ty, sx, sy, r, A.pv, k) })), { duration: A.d });
    anim.onfinish = () => { anim = null; };
    // l'ombre au sol rétrécit et pâlit quand elle monte
    if (ombre) animOmbre = ombre.animate(A.f.map(([o, ty], i) => ({ offset: o, easing: ease(i),
      transform: `scale(${borne(1 + ty * k * .035, .5, 1.12).toFixed(3)})`, opacity: borne(1 + ty * k * .04, .3, 1).toFixed(3) })), { duration: A.d });
    if (e) minPose = setTimeout(() => afficher(e), A.d * A.swap);
    if (effets && A.fx) minFx = setTimeout(() => effetMemoji(A.fx, racine, son), A.d * A.fxAt);
  }
  const rebondir = (e, saut = false, son = false) => jouer(riche ? e : (saut ? 'saut' : 'rebond'), e, { fort: saut ? 1.3 : 1, son });
  function planifier() {
    clearTimeout(minCycle);
    if (!cycle || reduit) return;
    minCycle = setTimeout(() => {
      if (!tenue && !maintenu && visible()) { iCycle = (iCycle + 1) % EXPRS.length; base = EXPRS[iCycle]; rebondir(base); }
      planifier();
    }, alea(4200, 6000));
  }
  planifier();
  return {
    get expr() { return vise; },
    get occupe() { return !!anim || !!tenue; },
    // expression passagère, puis retour à l'expression de repos
    montrer(e, { duree = 1400, saut = false, son = false } = {}) {
      e = VERS_EXPR[e] || 'paix';
      tenue = e; clearTimeout(minTenue);
      if (e !== vise || saut) rebondir(e, saut, son);
      minTenue = setTimeout(() => { tenue = null; if (vise !== repos()) rebondir(repos()); planifier(); }, duree);
    },
    // expression tenue tant qu'on ne la relâche pas (survol)
    maintenir(e, { saut = false } = {}) {
      maintenu = e ? (VERS_EXPR[e] || 'paix') : null;
      if (maintenu) { if (!tenue && (maintenu !== vise || saut)) rebondir(maintenu, saut); }
      else if (!tenue && vise !== base) { rebondir(base); planifier(); }
    },
    sautiller() { if (!anim && !tenue && visible()) jouer('hop'); },
    sursaut() { jouer('sursaut'); },
  };
}

/* l'émoji mascotte (bouton) : suit la souris en 3D, sautille, réagit au site, s'ennuie */
const Emoji = (() => {
  const mjEl = $('.memoji', emojiEl), ombre = $('.mj-ombre', emojiEl);
  const calme = !pointeurFin; // tactile : version plus calme (pas de suivi, pas de petits sauts au hasard, ne se cache pas)
  const mj = creerMemoji(mjEl, { cycle: true, riche: true, effets: true, ombre, amp: calme ? .7 : 1 });
  let minBulle = 0, minSortie = 0, survol = false, dehors = false;
  // inclinaison 3D : ressort amorti (léger dépassement), intégré à pas fixe court pour rester stable quel que soit le dt
  const T = { ry: 0, rx: 0 }, P = { ry: 0, rx: 0, vy: 0, vx: 0 }, D = { ry: 1e9, rx: 1e9 };
  window.addEventListener('pointermove', (e) => {
    if (calme || e.pointerType !== 'mouse') return;
    const cx = E.x + (E.taille * E.s) / 2, cy = E.y + (E.taille * E.s) / 2;
    T.ry = borne((e.clientX - cx) / 480, -1, 1) * 20;
    T.rx = borne((cy - e.clientY) / 380, -1, 1) * 12;
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { T.ry = 0; T.rx = 0; });
  emojiEl.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse') return;
    survol = true; clearTimeout(minSortie); mj.maintenir('paix', { saut: true });
  });
  emojiEl.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'mouse') return;
    survol = false; clearTimeout(minSortie); minSortie = setTimeout(() => mj.maintenir(null), 350);
  });
  function dire(texte, duree = 2600) {
    if (!texte) return;
    bulle.textContent = texte; bulle.classList.add('visible');
    clearTimeout(minBulle); minBulle = setTimeout(() => bulle.classList.remove('visible'), duree);
  }
  function reagir(etat, texte, duree = 1300, son = false) {
    mj.montrer(etat, { duree, son });
    if (texte) dire(texte);
  }
  // petits sauts de temps en temps (bureau seulement)
  if (!calme && !reduit) (function sauts() { setTimeout(() => { if (!dehors && !survol) mj.sautiller(); sauts(); }, alea(6500, 11000)); })();

  // ennui : 9 s sans bouger → un seul petit message ; puis (accueil, bureau) elle se cache à moitié sur le bord
  const MOTS_ENNUI = phrases(PHRASES.ennui, ['psst… clique sur la boule !', 'coucou ! ✿', 'tu veux voir mes projets ?']);
  let derniere = performance.now(), ennui = 0, iEnnui = 0, minCache = 0; // ennui : 0 actif, 1 a parlé, 2 cachée
  function activite() {
    derniere = performance.now();
    if (ennui) {
      clearTimeout(minCache);
      if (ennui === 2) { dehors = false; emojiEl.classList.remove('cachee'); mj.montrer('clin', { duree: 1200, saut: true }); }
      ennui = 0;
    }
  }
  ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((t) => window.addEventListener(t, activite, { passive: true, capture: true }));
  if (!reduit) setInterval(() => {
    if (ennui || document.hidden || !pret || Discussion.ouverte || survol) return;
    if (performance.now() - derniere < (calme ? 12000 : 9000)) return;
    ennui = 1;
    dire(projetCourant ? 'coucou ! ✿' : MOTS_ENNUI[iEnnui++ % MOTS_ENNUI.length], 3200);
    mj.montrer('clin', { duree: 1200, saut: true });
    if (!calme && !projetCourant) minCache = setTimeout(() => {
      if (ennui !== 1 || Discussion.ouverte || projetCourant) return;
      ennui = 2; dehors = true; T.ry = 0; T.rx = 0; emojiEl.classList.add('cachee');
    }, 3600);
  }, 1000);

  let derniereJoie = 0;
  return {
    dire, reagir, memoji: mj,
    // sticker collé : saut de joie + clin d'œil (pas plus d'une grosse réaction toutes les 1,6 s, sinon petit saut)
    joie(texte) {
      const t = performance.now();
      if (t - derniereJoie > 1600) { derniereJoie = t; mj.montrer('clin', { duree: 1300, saut: true }); }
      else mj.sautiller();
      if (texte) dire(texte);
    },
    // clic direct : petit couinement + sursaut
    sursaut() { Son.couic(); mj.sursaut(); },
    coeurs() { const cx = E.x + (E.taille * E.s) / 2, cy = E.y + (E.taille * E.s) * .55; eclabousser(cx, cy, 7, [50, 110], 'coeur'); },
    frame(dt) {
      if (reduit || calme) return;
      let t = Math.min(dt, .1);
      while (t > 1e-6) {
        const h = Math.min(t, 1 / 120); t -= h;
        P.vy += (70 * (T.ry - P.ry) - 9 * P.vy) * h; P.ry += P.vy * h;
        P.vx += (70 * (T.rx - P.rx) - 9 * P.vx) * h; P.rx += P.vx * h;
      }
      if (Math.abs(P.ry - D.ry) > .02 || Math.abs(P.rx - D.rx) > .02) {
        D.ry = P.ry; D.rx = P.rx;
        const st = mjEl.style;
        st.setProperty('--mj-ry', P.ry.toFixed(2) + 'deg'); st.setProperty('--mj-rx', P.rx.toFixed(2) + 'deg');
        st.setProperty('--mj-incl', (P.ry * .22).toFixed(2) + 'deg');
      }
    },
  };
})();
const BISOUS = ['coucou ✿', 'bisous !', 'contente de te voir !', 'tu as vu ma boule ?', 'mwah ♡'];
emojiEl.addEventListener('click', () => {
  if (Discussion.ouverte) { Discussion.fermer(); return; }
  if (projetCourant) { retourAccueil(); return; }
  Emoji.sursaut();
  Discussion.ouvrir(emojiEl);
});
$('#btn-propos').addEventListener('click', (e) => { if (Discussion.ouverte) Discussion.fermer(); else Discussion.ouvrir(e.currentTarget); });

/* ---------------------------------------------------------------- PAGES PROJET */
const vue = $('#vue-projet');
let projetCourant = null, transition = false, accueilActif = true;
const MOTS_PROJET = Object.fromEntries((CONTENU.projets || []).filter((p) => p.phrase).map((p) => [p.id, p.phrase]));
const sectionDe = (id) => document.getElementById((PROJ[id] && PROJ[id].section) || id);
const vignetteDe = (id) => (PROJ[id] && PROJ[id].vignette) || '';
const majVignetteSuivant = (id) => { const im = $('#vp-suivant-img'), v = vignetteDe(id); im.hidden = !v; if (v) im.src = v; };

function afficherProjet(id) {
  const sec = sectionDe(id);
  $$('.vue-projet > section').forEach((s) => s.classList.toggle('active', s === sec));
  if (sec.classList.contains('kaathoon')) versionKaathoon(sec, (PROJ[id] && PROJ[id].version) || '1', false);
  vue.dataset.fond = sec.dataset.fond || '';
  projetCourant = id;
  const i = ORDRE.indexOf(id), suiv = ORDRE[(i + 1) % NB];
  $('#vp-compte').textContent = `${pad(i + 1)} / ${pad(NB)}`;
  $('#vp-suivant-titre').textContent = TITRES[suiv];
  majVignetteSuivant(suiv);
  vue.scrollTop = 0;
  $$('.reveal', sec).forEach((el) => obs.observe(el));
  lancerBulles(sec);
  surDefilementProjet();
}
function ouvrir(id, { depuis = null, historique = true } = {}) {
  if (transition || !ORDRE.includes(id)) return;
  fermerPanneaux(false);
  const i = ORDRE.indexOf(id);
  const ox = depuis === 'carte' ? O.sx[i] : L.cx, oy = depuis === 'carte' ? O.sy[i] : L.cy;
  transition = true;
  afficherProjet(id);
  document.body.classList.add('en-projet'); placerEmoji();
  vue.style.setProperty('--ox', ox + 'px'); vue.style.setProperty('--oy', oy + 'px');
  vue.classList.remove('ouverte'); vue.hidden = false;
  Son.plonge();
  Emoji.reagir('clin', MOTS_PROJET[id] || 'bonne visite ✿', 1200);
  const fin = () => {
    transition = false; accueil.inert = true; accueilActif = false;
    const h = $('.projet-titre', sectionDe(id)); if (h) h.focus({ preventScroll: true });
  };
  scene.style.transformOrigin = `${ox}px ${oy}px`;
  if (reduit) { vue.classList.add('ouverte'); fin(); }
  else {
    scene.classList.add('plonge');
    void vue.offsetWidth;
    setTimeout(() => vue.classList.add('ouverte'), 140);
    setTimeout(fin, 950);
  }
  if (historique) history.pushState({ projet: id }, '', '#' + id);
}
function fermer() {
  if (!projetCourant || transition) return;
  const i = ORDRE.indexOf(projetCourant);
  transition = true;
  accueil.inert = false; accueilActif = true;
  O.theta = versCarte(i); O.cible = null; O.v = 0; O.derniere = performance.now(); majSurvol(-1);
  orbiteFrame(0, performance.now());
  const ox = O.sx[i], oy = O.sy[i];
  vue.style.setProperty('--ox', ox + 'px'); vue.style.setProperty('--oy', oy + 'px');
  scene.style.transformOrigin = `${ox}px ${oy}px`;
  vue.classList.remove('ouverte');
  document.body.classList.remove('en-projet'); placerEmoji();
  setTimeout(() => scene.classList.remove('plonge'), reduit ? 0 : 260);
  Son.retour();
  Emoji.reagir('sourire', PHRASES.retour || 're-coucou !', 1100);
  const id = projetCourant;
  setTimeout(() => {
    vue.hidden = true; transition = false; projetCourant = null;
    const c = cartes[ORDRE.indexOf(id)]; if (c) c.focus({ preventScroll: true });
  }, reduit ? 0 : 900);
}
function retourAccueil() {
  if (!projetCourant) return;
  if (history.state && history.state.projet) history.back();
  else { fermer(); history.replaceState(null, '', location.pathname + location.search); }
}
function changerProjet(sens) {
  if (!projetCourant || transition) return;
  const i = ORDRE.indexOf(projetCourant), id = ORDRE[(i + sens + NB) % NB];
  transition = true;
  const fini = () => {
    afficherProjet(id);
    history.replaceState({ projet: id }, '', '#' + id);
    vue.animate([{ opacity: 0, transform: `translateX(${sens * 40}px)` }, { opacity: 1, transform: 'none' }], { duration: reduit ? 1 : 450, easing: 'cubic-bezier(.22,1,.36,1)' });
    transition = false;
    const h = $('.projet-titre', sectionDe(id)); if (h) h.focus({ preventScroll: true });
    Emoji.reagir('clin', MOTS_PROJET[id] || null, 900);
  };
  Son.pop(sens > 0 ? 1.2 : .9);
  if (reduit) fini();
  else vue.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-sens * 40}px)` }], { duration: 220, easing: 'ease-in' }).onfinish = fini;
}
$('#vp-prec').addEventListener('click', () => changerProjet(-1));
$('#vp-suiv').addEventListener('click', () => changerProjet(1));
$('#vp-suivant').addEventListener('click', () => changerProjet(1));
$$('[data-retour]').forEach((b) => b.addEventListener('click', retourAccueil));
$('#entete-nom').addEventListener('click', (e) => { e.preventDefault(); if (projetCourant) retourAccueil(); else fermerPanneaux(); });
window.addEventListener('popstate', (e) => {
  const id = e.state && e.state.projet;
  if (id && ORDRE.includes(id)) { if (projetCourant) { afficherProjet(id); } else ouvrir(id, { historique: false }); }
  else if (projetCourant) fermer();
});

/* ---------------------------------------------------------------- PANNEAUX : liste et contact */
const panneaux = { liste: $('#liste'), contact: $('#contact') };
const boutonsPanneaux = { liste: $('#btn-liste'), contact: $('#btn-contact') };
function ouvrirPanneau(nom) {
  const p = panneaux[nom], deja = !p.hidden;
  fermerPanneaux(false);
  if (deja) return;
  p.hidden = false; boutonsPanneaux[nom].setAttribute('aria-expanded', 'true');
  p.focus({ preventScroll: true }); Son.pop(1.1);
}
function fermerPanneaux(rendreFocus = true) {
  for (const k in panneaux) if (!panneaux[k].hidden) {
    panneaux[k].hidden = true; boutonsPanneaux[k].setAttribute('aria-expanded', 'false');
    if (rendreFocus) boutonsPanneaux[k].focus({ preventScroll: true });
  }
}
boutonsPanneaux.liste.addEventListener('click', () => ouvrirPanneau('liste'));
boutonsPanneaux.contact.addEventListener('click', () => ouvrirPanneau('contact'));
$$('[data-ouvrir-contact]').forEach((b) => b.addEventListener('click', () => ouvrirPanneau('contact')));
$$('[data-fermer]').forEach((b) => b.addEventListener('click', () => fermerPanneaux()));
$$('#liste a').forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault(); const id = a.dataset.projet;
  fermerPanneaux(false);
  if (projetCourant) { afficherProjet(id); history.replaceState({ projet: id }, '', '#' + id); }
  else ouvrir(id);
}));
document.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.panneau,#btn-liste,#btn-contact,[data-ouvrir-contact]')) return;
  if (!panneaux.liste.hidden || !panneaux.contact.hidden) fermerPanneaux(false);
});
// contact (rempli depuis content/infos.json) : « @pseudo » ou lien complet acceptés
const lienContact = (v, site) => {
  v = String(v || '').trim(); if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[\w.-]+\.[a-z]{2,}\//i.test(v)) return 'https://' + v;
  return site + v.replace(/^@/, '') + '/';
};
if (window.CONTACT) {
  window.CONTACT.instagram = lienContact(window.CONTACT.instagram, 'https://www.instagram.com/');
  window.CONTACT.linkedin = lienContact(window.CONTACT.linkedin, 'https://www.linkedin.com/in/');
  window.CONTACT.email = String(window.CONTACT.email || '').trim().replace(/^mailto:/i, '');
}
(() => {
  const C = window.CONTACT || {}, z = $('#contact-liens');
  const lien = (href, txt, ext) => { const a = document.createElement('a'); a.href = href; a.textContent = txt; if (ext) { a.target = '_blank'; a.rel = 'noopener'; } z.appendChild(a); };
  if (C.email) lien('mailto:' + C.email, C.email);
  if (C.instagram) lien(C.instagram, 'Instagram', true);
  if (C.linkedin) lien(C.linkedin, 'LinkedIn', true);
  if (!z.children.length) { const p = document.createElement('p'); p.textContent = CONTENU.contactVide || 'Les coordonnées arrivent bientôt ✿'; z.appendChild(p); }
})();

/* ---------------------------------------------------------------- CLAVIER */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (vis.classList.contains('ouverte')) { fermerVisionneuse(); return; }
    if (Discussion.ouverte) { Discussion.echap(); return; }
    if (!panneaux.liste.hidden || !panneaux.contact.hidden) { fermerPanneaux(); return; }
    if (projetCourant) { retourAccueil(); return; }
  }
  if (projetCourant || !pret || Discussion.ouverte) return;
  if (e.target.closest('input,textarea,.panneau')) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); tournerOrbite(1); }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); tournerOrbite(-1); }
});


/* ---------------------------------------------------------------- CONVERSATION « À PROPOS » (contenu : content/conversation.json) */
const Discussion = (() => {
  const CONV = window.CONVERSATION || { intro: [], reponses: [], reactions: [] };
  const racine = $('#discussion'), voile = $('#disc-voile'), panneau = $('#disc-panneau'), fil = $('#disc-fil'), zoneRep = $('#disc-reponses');
  const compteEl = $('#disc-compte'), btnFermer = $('#disc-fermer'), btnPropos = $('#btn-propos');
  $('#disc-nom').textContent = CONV.nom || 'Victoire Giroard';
  $('#disc-statut').textContent = CONV.statut || 'en ligne';

  // Memoji de Victoire : un dans l'en-tête (avatar qui dépasse du rond), et un petit à gauche de ses bulles, façon Messenger :
  // un par groupe de messages qui se suivent, posé sur le dernier message du groupe
  const tplMemoji = $('#tpl-memoji');
  const clonerMemoji = (expr) => { const el = tplMemoji.content.firstElementChild.cloneNode(true); if (expr) el.dataset.expr = expr; return el; };
  const mjTeteEl = clonerMemoji('paix'); $('#disc-popout').appendChild(mjTeteEl);
  const mjTete = creerMemoji(mjTeteEl);
  let groupe = null;
  function nouvelleTete() {
    const mjEl = clonerMemoji('paix');
    const el = document.createElement('span'); el.className = 'msg-avatar'; el.setAttribute('aria-hidden', 'true'); el.appendChild(mjEl);
    return { el, mj: creerMemoji(mjEl), li: null, minEtat: 0 };
  }
  function poserTete(li) {
    if (!groupe) groupe = nouvelleTete();
    if (groupe.li && groupe.li !== li) groupe.li.classList.remove('avec-tete');
    li.insertBefore(groupe.el, li.firstChild); li.classList.add('avec-tete');
    groupe.li = li; li._tete = groupe;
  }
  // clic sur une bulle ou réaction : clin d'œil (avatar de la bulle, Memoji de la bulle s'il y en a un, en-tête)
  function etatAvatar(li, etat = 'clin', duree = 1400) {
    mjTete.montrer(etat, { duree });
    if (li && li._mj) li._mj.montrer(etat, { duree, saut: true });
    const tete = li && li._tete;
    if (!tete) return;
    // si la bulle n'est pas la dernière du groupe, l'avatar vient réagir à côté d'elle, puis retourne à sa place
    if (tete.el.parentNode !== li) li.insertBefore(tete.el, li.firstChild);
    tete.mj.montrer(etat, { duree, saut: true });
    clearTimeout(tete.minEtat);
    tete.minEtat = setTimeout(() => {
      if (tete.li && tete.li.isConnected && tete.el.parentNode !== tete.li) tete.li.insertBefore(tete.el, tete.li.firstChild);
    }, duree);
  }

  const idxSticker = (id) => DEFS.findIndex((d) => d.id === id);
  const REACS = (CONV.reactions || []).filter((r) => r.emoji || idxSticker(r.sticker) >= 0);
  const iCoeur = Math.max(0, REACS.findIndex((r) => r.emoji === '❤️'));
  let reacs = {};
  try { reacs = JSON.parse(localStorage.getItem('vg-reactions') || '{}') || {}; } catch (e) { reacs = {}; }
  const sauver = () => { try { localStorage.setItem('vg-reactions', JSON.stringify(reacs)); } catch (e) {} };
  function dessinReac(el, r) {
    el.textContent = '';
    if (r.emoji) el.textContent = r.emoji;
    else { const im = new Image(); im.src = imagesStickers[idxSticker(r.sticker)] || ''; im.alt = ''; im.draggable = false; el.appendChild(im); }
  }

  let ouverte = false, lance = false, occupe = false, declencheur = null;
  const utilisees = new Set(), compteurs = {};
  const attendre = (ms) => new Promise((r) => setTimeout(r, reduit ? 0 : ms));
  const defiler = () => { fil.scrollTo({ top: fil.scrollHeight, behavior: reduit ? 'auto' : 'smooth' }); };
  function majCompte() {
    const n = Object.keys(reacs).length;
    compteEl.textContent = n ? ` · ${n} réaction${n > 1 ? 's' : ''}` : '';
  }

  /* ---- bulles ---- */
  function texteDe(m) { return m.texte || m.legende || (m.aCompleter ? 'à compléter : ' + m.aCompleter : '') || (m.sticker ? 'sticker ' + ((DEFS[idxSticker(m.sticker)] || {}).nom || '') : ''); }
  function ajouterBulle(m, id, qui) {
    const li = document.createElement('li'); li.className = 'msg ' + qui;
    const b = document.createElement('div'); b.className = 'bulle-msg';
    if (m.aCompleter) { b.classList.add('a-completer'); b.textContent = '✎ à compléter : ' + m.aCompleter; }
    else if (m.photo) {
      b.classList.add('photo');
      const im = new Image(); im.src = m.photo; im.alt = m.legende || 'Photo de Victoire'; im.draggable = false; b.appendChild(im);
      if (m.legende) { const c = document.createElement('span'); c.textContent = m.legende; b.appendChild(c); }
    } else if (m.memoji) {
      b.classList.add('memoji-bulle');
      const cadre = document.createElement('span'); cadre.className = 'mj-cadre'; cadre.setAttribute('role', 'img'); cadre.setAttribute('aria-label', 'Memoji de Victoire');
      const mjEl = clonerMemoji(VERS_EXPR[m.memoji] || 'paix'); cadre.appendChild(mjEl); b.appendChild(cadre);
      li._mj = creerMemoji(mjEl, { cycle: true, riche: true, effets: true });
      if (m.legende) { const c = document.createElement('span'); c.className = 'mj-legende'; c.textContent = m.legende; b.appendChild(c); }
    } else if (m.sticker) {
      b.classList.add('sticker');
      const im = new Image(); im.src = imagesStickers[idxSticker(m.sticker)] || ''; im.alt = ''; im.draggable = false; b.appendChild(im);
    } else if (m.lien) {
      b.classList.add('lien');
      const a = document.createElement('a'); a.href = m.lien; a.textContent = m.texte;
      if (!m.lien.startsWith('mailto:')) { a.target = '_blank'; a.rel = 'noopener'; }
      b.appendChild(a);
    } else b.textContent = m.texte || '';
    li.appendChild(b);
    if (qui === 'elle' && !m.lien) {
      li.dataset.id = id;
      b.tabIndex = 0; b.setAttribute('role', 'button');
      b.setAttribute('aria-label', 'Victoire : ' + texteDe(m) + '. Entrée pour réagir.');
      b.dataset.curseur = 'réagis !';
      const badge = document.createElement('span'); badge.className = 'reac'; badge.hidden = true; li.appendChild(badge);
      const r = REACS[reacs[id]];
      if (r) { dessinReac(badge, r); badge.hidden = false; li.classList.add('a-reac'); }
      brancherBulle(li, b);
    }
    if (qui === 'elle') poserTete(li); else groupe = null; // un message du visiteur clôt le groupe
    fil.appendChild(li);
    if (!reduit) li.animate([{ opacity: 0, transform: `translateY(14px) scale(.85)` }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    defiler();
    return li;
  }
  function indicateur() {
    const li = document.createElement('li'); li.className = 'msg elle ecrit'; li.setAttribute('aria-label', 'Victoire écrit…');
    const b = document.createElement('div'); b.className = 'bulle-msg';
    for (let i = 0; i < 3; i++) b.appendChild(document.createElement('i'));
    li.appendChild(b); poserTete(li); fil.appendChild(li); defiler(); return li;
  }
  function preparer(msgs) {
    const out = [];
    for (const m0 of msgs) {
      if (!m0) continue;
      // « à compléter » dont Victoire a écrit le texte → bulle normale
      const m = (m0.type === 'aCompleter' && m0.texte) ? { texte: m0.texte } : m0;
      if (m.siContactVide || m.type === 'contact') {
        const C = window.CONTACT || {}, liens = [];
        if (C.email) liens.push({ texte: '✉️ ' + C.email, lien: 'mailto:' + C.email });
        if (C.instagram) liens.push({ texte: 'Instagram ↗', lien: C.instagram });
        if (C.linkedin) liens.push({ texte: 'LinkedIn ↗', lien: C.linkedin });
        if (liens.length) out.push(...liens);
        else out.push(CONV.afficherACompleter ? { aCompleter: m.aCompleter || 'Tes coordonnées : e-mail, Instagram, LinkedIn (formulaire « Infos et contact »)' } : { texte: CONV.contactVide || 'bientôt ✿' });
        continue;
      }
      if (m.aCompleter && !CONV.afficherACompleter) continue;
      if (m.type === 'texte' && !m.texte) continue; // bulle vide
      out.push(m);
    }
    return out;
  }
  async function dire(msgs, groupe) {
    occupe = true; majReponses();
    const n = (compteurs[groupe] = (compteurs[groupe] || 0) + 1);
    const liste = preparer(msgs);
    for (let i = 0; i < liste.length; i++) {
      const m = liste[i];
      if (!reduit) {
        const e = indicateur();
        await attendre(Math.min(1500, 480 + (texteDe(m).length * 14)));
        e.remove();
      }
      ajouterBulle(m, `${groupe}-${i}${n > 1 ? '-' + n : ''}`, 'elle');
      if (ouverte) Son.notif();
      await attendre(220);
    }
    occupe = false; majReponses();
  }

  /* ---- réponses rapides ---- */
  function majReponses() {
    zoneRep.textContent = '';
    zoneRep.classList.toggle('attente', occupe);
    if (occupe) { const p = document.createElement('p'); p.textContent = 'Victoire écrit…'; zoneRep.appendChild(p); return; }
    (CONV.reponses || []).forEach((r, i) => {
      if (r.unique && utilisees.has(r.id)) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'rep'; b.textContent = r.libelle;
      b.addEventListener('click', () => repondre(r));
      zoneRep.appendChild(b);
      if (!reduit) b.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 350, delay: i * 60, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
    });
    requestAnimationFrame(defiler); // la zone des réponses change de hauteur : on recolle le fil en bas
  }
  async function repondre(r) {
    if (occupe) return;
    const avaitFocus = zoneRep.contains(document.activeElement);
    utilisees.add(r.id);
    occupe = true; majReponses();
    ajouterBulle({ texte: r.libelle }, null, 'moi'); Son.envoi();
    await attendre(380);
    await dire(r.messages || [], r.id);
    if (avaitFocus && ouverte) { const b = $('.rep', zoneRep); if (b) b.focus({ preventScroll: true }); }
    if (r.action === 'projets') {
      await attendre(650);
      fermer(false);
      const etaitProjet = !!projetCourant;
      if (etaitProjet) retourAccueil();
      setTimeout(() => { piloter(); O.cible = null; O.v = -5.5; aideOrbiteVue(); Emoji.reagir('clin', 'choisis un projet ✦', 1200); }, etaitProjet ? 1000 : 250);
    }
  }

  /* ---- réactions ---- */
  const barre = document.createElement('div');
  barre.className = 'reac-barre'; barre.setAttribute('role', 'toolbar'); barre.setAttribute('aria-label', 'Réagir au message'); barre.hidden = true;
  REACS.forEach((r, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'reac-choix'; b.setAttribute('aria-label', r.nom || r.emoji);
    b.setAttribute('aria-pressed', 'false'); b.title = r.nom || '';
    dessinReac(b, r);
    b.addEventListener('click', (e) => { e.stopPropagation(); const li = cible; fermerBarre(true); if (li) reagir(li, i); });
    barre.appendChild(b);
  });
  barre.addEventListener('keydown', (e) => {
    const bs = $$('.reac-choix', barre), k = bs.indexOf(document.activeElement);
    if (e.key === 'ArrowRight') { e.preventDefault(); bs[(k + 1) % bs.length].focus(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); bs[(k - 1 + bs.length) % bs.length].focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fermerBarre(true); }
  });
  let cible = null;
  function ouvrirBarre(li, auClavier) {
    if (cible) fermerBarre();
    cible = li; li.classList.add('choisit');
    const enHaut = li.offsetTop - fil.scrollTop < 64;
    barre.classList.toggle('dessous', enHaut);
    $$('.reac-choix', barre).forEach((b, i) => {
      b.setAttribute('aria-pressed', String(reacs[li.dataset.id] === i));
      // les mini-stickers sont fabriqués après le chargement : on les redessine si besoin
      if (b.firstChild && b.firstChild.tagName === 'IMG' && !b.firstChild.getAttribute('src')) dessinReac(b, REACS[i]);
    });
    li.appendChild(barre); barre.hidden = false;
    if (!reduit) barre.animate([{ opacity: 0, transform: 'scale(.6) translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    Son.pop(1.1);
    if (auClavier) { const actuel = reacs[li.dataset.id]; $$('.reac-choix', barre)[actuel != null && REACS[actuel] ? actuel : 0].focus({ preventScroll: true }); }
  }
  function fermerBarre(rendreFocus) {
    if (!cible) return;
    const li = cible; cible = null;
    barre.hidden = true; li.classList.remove('choisit');
    if (rendreFocus) $('.bulle-msg', li).focus({ preventScroll: true });
  }
  function reagir(li, i, forcer) {
    const id = li.dataset.id, badge = $('.reac', li), bulle = $('.bulle-msg', li);
    if (reacs[id] === i && !forcer) {
      delete reacs[id]; Son.pop(.8);
      const fin = () => { badge.hidden = true; li.classList.remove('a-reac'); };
      if (reduit) fin(); else badge.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0)', opacity: 0 }], { duration: 200, easing: 'ease-in' }).onfinish = fin;
    } else {
      reacs[id] = i; const r = REACS[i];
      dessinReac(badge, r); badge.hidden = false; li.classList.add('a-reac');
      if (!reduit) {
        badge.animate([{ transform: 'scale(0) rotate(-30deg)' }, { transform: 'scale(1.5) rotate(10deg)', offset: .55 }, { transform: 'scale(1) rotate(0)' }], { duration: 480, easing: 'cubic-bezier(.34,1.56,.64,1)' });
        bulle.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.07,.93)', offset: .3 }, { transform: 'scale(.97,1.03)', offset: .6 }, { transform: 'scale(1)' }], { duration: 450, easing: 'ease-out' });
        const rb = badge.getBoundingClientRect(); eclabousser(rb.left + rb.width / 2, rb.top + rb.height / 2, r.emoji === '❤️' ? 7 : 9, [18, 52], r.emoji === '❤️' ? 'coeur' : null);
      }
      Son.pop(1.35);
      etatAvatar(li, 'clin');
    }
    sauver(); majCompte();
  }
  function brancherBulle(li, b) {
    let minuteur = 0;
    b.addEventListener('click', (e) => {
      if (e.detail > 1) return;
      clearTimeout(minuteur);
      minuteur = setTimeout(() => { if (cible === li) fermerBarre(); else { ouvrirBarre(li, false); etatAvatar(li, 'clin'); } }, reduit ? 0 : 230);
    });
    b.addEventListener('dblclick', (e) => { e.preventDefault(); clearTimeout(minuteur); fermerBarre(); reagir(li, iCoeur, true); });
    b.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clearTimeout(minuteur); if (cible === li) fermerBarre(true); else { ouvrirBarre(li, true); etatAvatar(li, 'clin'); } }
    });
  }
  panneau.addEventListener('click', (e) => { if (cible && !e.target.closest('.reac-barre') && !e.target.closest('.msg.choisit')) fermerBarre(); });

  /* ---- ouvrir / fermer ---- */
  function ouvrir(depuis) {
    if (ouverte) return;
    fermerPanneaux(false);
    declencheur = depuis || document.activeElement;
    ouverte = true; racine.hidden = false;
    document.body.classList.add('disc-ouverte');
    bulle.classList.remove('visible');
    btnPropos.setAttribute('aria-expanded', 'true');
    const r = panneau.getBoundingClientRect();
    const ox = E.x + (E.taille * E.s) / 2 - r.left, oy = E.y + (E.taille * E.s) / 2 - r.top;
    panneau.style.transformOrigin = `${ox}px ${oy}px`;
    if (!reduit) {
      panneau.animate([{ transform: 'scale(.15)', opacity: 0 }, { transform: 'scale(1.02)', opacity: 1, offset: .7 }, { transform: 'none', opacity: 1 }], { duration: 560, easing: 'cubic-bezier(.22,1,.36,1)' });
      voile.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320 });
    }
    Emoji.coeurs(); Son.pop(1.25);
    // à l'ouverture : « idée », l'ampoule s'allume (mascotte et avatar de l'en-tête)
    setTimeout(() => { Emoji.reagir('idee', null, 2800, true); mjTete.montrer('idee', { duree: 2800, saut: true }); }, reduit ? 0 : 380);
    btnFermer.focus({ preventScroll: true });
    if (!lance) { lance = true; dire(CONV.intro || [], 'intro'); } else majReponses();
    majCompte();
    setTimeout(defiler, 30);
  }
  function fermer(rendreFocus = true) {
    if (!ouverte) return;
    ouverte = false; fermerBarre();
    btnPropos.setAttribute('aria-expanded', 'false');
    const fin = () => { if (ouverte) return; racine.hidden = true; document.body.classList.remove('disc-ouverte'); };
    if (reduit) fin();
    else {
      panneau.animate([{ transform: 'none', opacity: 1 }, { transform: 'scale(.15)', opacity: 0 }], { duration: 280, easing: 'cubic-bezier(.5,0,.75,0)' }).onfinish = fin;
      voile.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280 });
    }
    Son.pop(.85);
    if (rendreFocus && declencheur && document.contains(declencheur)) declencheur.focus({ preventScroll: true });
  }
  voile.addEventListener('click', () => fermer());
  btnFermer.addEventListener('click', () => fermer());
  // le focus reste dans la fenêtre de conversation
  panneau.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = $$('button:not([hidden]), [tabindex="0"], a[href]', panneau).filter((el) => el.offsetParent !== null && !el.closest('[hidden]'));
    if (!f.length) return;
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  });
  majCompte();
  return {
    get ouverte() { return ouverte; },
    ouvrir, fermer,
    echap() { if (cible) fermerBarre(true); else fermer(); },
  };
})();

/* ---------------------------------------------------------------- CURSEUR */
let curseurLabel = () => {};
let survolScene = () => {};
if (pointeurFin && !reduit) {
  document.body.classList.add('curseur-ok');
  const c = $('#curseur'), label = $('.curseur-label', c);
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
  window.addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; }, { passive: true });
  (function boucleCurseur() { cx += (x - cx) * .25; cy += (y - cy) * .25; c.style.transform = `translate(${cx}px,${cy}px)`; requestAnimationFrame(boucleCurseur); })();
  let courant = '';
  curseurLabel = (t) => {
    if (t === courant) return; courant = t;
    const anneau = t === '◯';
    label.textContent = anneau ? '' : (t || '');
    c.classList.toggle('grand', !!t && !anneau); c.classList.toggle('anneau', anneau);
  };
  // petite cible (bouton, pastille, bulle…) : le curseur devient un anneau fin pour ne rien cacher
  const petite = (el) => { const r = el.getBoundingClientRect(); return Math.min(r.width, r.height) < 150; };
  document.addEventListener('pointerover', (e) => {
    if (e.target.closest('#scene')) return; // géré par survolScene
    const cible = e.target.closest('[data-curseur],a,button,.zoomable,[role="button"]');
    if (!cible) { curseurLabel(''); return; }
    if (petite(cible)) { curseurLabel('◯'); return; }
    const t = cible.dataset.curseur;
    curseurLabel(t ? (t === 'son' ? (Son.actif ? 'chut' : 'son') : t) : ' ');
  });
  survolScene = (e) => {
    const i = carteSous(e.clientX, e.clientY, O.survol);
    if (i >= 0) { curseurLabel(estDevant(i) ? 'ouvrir' : 'par ici'); return; }
    curseurLabel(sphere && sphere.touche(e.clientX, e.clientY) ? 'colle !' : 'glisse');
  };
  document.addEventListener('pointerdown', () => c.classList.add('clic'));
  document.addEventListener('pointerup', () => c.classList.remove('clic'));
}

/* ---------------------------------------------------------------- DANS LES PROJETS (repris de la V1) */
const obs = new IntersectionObserver((entrees) => entrees.forEach((en) => {
  if (en.isIntersecting) { en.target.classList.add('vu'); obs.unobserve(en.target); }
}), { threshold: .1, rootMargin: '0px 0px -30px 0px' });

const prog = $('#vp-progression');
function surDefilementProjet() {
  const h = vue.scrollHeight - vue.clientHeight;
  prog.style.transform = `scaleX(${h > 0 ? vue.scrollTop / h : 0})`;
  const zimoun = projetCourant && !reduit ? sectionDe(projetCourant) : null;
  if (zimoun && zimoun.querySelector('.zimoun-fond')) {
    const r = zimoun.getBoundingClientRect();
    const p = (innerHeight - r.top) / (innerHeight + r.height);
    $$('.zl', zimoun).forEach((l, i) => { l.style.transform = `translateX(${(i % 2 ? -1 : 1) * (p - .5) * 420 - 200}px)`; });
  }
}
let attenteDef = 0;
vue.addEventListener('scroll', () => { cancelAnimationFrame(attenteDef); attenteDef = requestAnimationFrame(surDefilementProjet); }, { passive: true });

if (pointeurFin && !reduit) $$('.tilt').forEach((t) => {
  t.addEventListener('pointermove', (e) => {
    const r = t.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    t.style.transform = `perspective(900px) rotateY(${(x - .5) * 14}deg) rotateX(${(.5 - y) * 12}deg) scale(1.02)`;
    t.style.setProperty('--gx', x * 100 + '%'); t.style.setProperty('--gy', y * 100 + '%');
  });
  t.addEventListener('pointerleave', () => { t.style.transform = ''; });
});

$$('[data-bascule]').forEach((b) => {
  const btns = $$('.bascule-boutons button', b), vues = $$('.bascule-vue', b);
  btns.forEach((btn, i) => btn.addEventListener('click', () => {
    btns.forEach((x, j) => x.classList.toggle('actif', j === i));
    vues.forEach((v, j) => v.classList.toggle('actif', j === i));
    Son.pop(i ? 1.2 : 1);
  }));
});

$$('.avant-apres').forEach((aa) => {
  let tient = false;
  const regler = (x) => { const r = aa.getBoundingClientRect(); aa.style.setProperty('--pos', Math.max(0, Math.min(100, ((x - r.left) / r.width) * 100)) + '%'); };
  aa.addEventListener('pointerdown', (e) => { tient = true; aa.setPointerCapture(e.pointerId); regler(e.clientX); });
  aa.addEventListener('pointermove', (e) => { if (tient || pointeurFin) regler(e.clientX); });
  aa.addEventListener('pointerup', () => { tient = false; });
  aa.addEventListener('pointercancel', () => { tient = false; });
  new IntersectionObserver((en) => {
    if (!en[0].isIntersecting || reduit) return;
    const t0 = performance.now();
    (function demo(t) {
      const k = (t - t0) / 1600; if (k > 1) { aa.style.setProperty('--pos', '50%'); return; }
      aa.style.setProperty('--pos', (50 + Math.sin(k * Math.PI * 2) * 32) + '%'); requestAnimationFrame(demo);
    })(t0);
  }, { threshold: .6 }).observe(aa);
});

function versionKaathoon(kaa, v, son = true) {
  kaa.dataset.version = v;
  $$('.k-switch button', kaa).forEach((b) => { b.classList.toggle('actif', b.dataset.v === v); b.setAttribute('aria-pressed', b.dataset.v === v); });
  $$('.k-version.k-v' + v + ' .reveal', kaa).forEach((el) => el.classList.add('vu'));
  kaa.classList.remove('flamme'); void kaa.offsetWidth; kaa.classList.add('flamme');
  if (son) Son.pop(v === '2' ? 1.5 : 1);
}
$$('.kaathoon').forEach((kaa) => $$('.k-switch button', kaa).forEach((b) => b.addEventListener('click', (e) => {
  versionKaathoon(kaa, b.dataset.v);
  const actuel = projetCourant && PROJ[projetCourant];
  if (actuel && actuel.section === kaa.id) {
    const cible = (CONTENU.projets || []).find((p) => p.section === kaa.id && p.version === b.dataset.v);
    const id = cible && cible.id;
    if (id && ORDRE.includes(id)) {
      projetCourant = id; $('#vp-compte').textContent = `${pad(ORDRE.indexOf(id) + 1)} / ${pad(NB)}`;
      const suiv = ORDRE[(ORDRE.indexOf(id) + 1) % NB]; $('#vp-suivant-titre').textContent = TITRES[suiv]; majVignetteSuivant(suiv);
      history.replaceState({ projet: id }, '', '#' + id);
    }
  }
  if (b.dataset.v === '2') eclabousser(e.clientX, e.clientY, 10, [30, 90]);
})));

function lancerBulles(sec) {
  const bulles = sec && $('.bulles', sec);
  if (!bulles || bulles.dataset.fait || reduit) return; bulles.dataset.fait = '1';
  for (let i = 0; i < 18; i++) {
    const b = document.createElement('i'), t = alea(8, 34);
    b.style.cssText = `left:${alea(0, 100)}%;width:${t}px;height:${t}px;animation-duration:${alea(9, 20)}s;animation-delay:${-alea(0, 20)}s;--dx:${alea(-60, 60)}px`;
    bulles.appendChild(b);
  }
}

$$('.allumette-zone').forEach((zoneA) => { if (reduit) return;
  let dernier = 0;
  const etincelles = (x, y, n) => {
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i'); s.className = 'etincelle'; document.body.appendChild(s);
      s.animate([{ transform: `translate(${x}px,${y}px) scale(1)`, opacity: 1 },
        { transform: `translate(${x + alea(-60, 60)}px,${y + alea(-90, -10)}px) scale(0)`, opacity: 0 }],
      { duration: alea(400, 800), easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => s.remove();
    }
  };
  zoneA.addEventListener('pointermove', (e) => { const t = performance.now(); if (t - dernier > 60) { dernier = t; etincelles(e.clientX, e.clientY, 2); } });
  zoneA.addEventListener('pointerdown', (e) => { etincelles(e.clientX, e.clientY, 22); Son.allumette(); });
});

$$('.aparte').forEach((aparte) => $$('.saveurs-choix button', aparte).forEach((b) => b.addEventListener('click', () => {
  aparte.dataset.saveur = b.dataset.s;
  $$('.saveurs-choix button', aparte).forEach((x) => { x.classList.toggle('actif', x === b); x.setAttribute('aria-pressed', x === b); });
  Son.pop(1 + Number(b.dataset.s) * .15);
})));

/* visionneuse */
const vis = $('#visionneuse'), visImg = $('img', vis);
let focusAvantVis = null;
document.addEventListener('click', (e) => {
  const z = e.target.closest('.zoomable');
  if (!z || z.tagName !== 'IMG' || (z.closest('.allumette-zone') && e.detail === 0)) return;
  focusAvantVis = document.activeElement;
  visImg.src = z.currentSrc || z.src; visImg.alt = z.alt;
  vis.classList.add('ouverte'); vis.setAttribute('aria-hidden', 'false');
  $('button', vis).focus({ preventScroll: true });
});
function fermerVisionneuse() {
  vis.classList.remove('ouverte'); vis.setAttribute('aria-hidden', 'true');
  if (focusAvantVis) focusAvantVis.focus({ preventScroll: true });
}
vis.addEventListener('click', fermerVisionneuse);

/* ---------------------------------------------------------------- BOUCLE UNIQUE */
let tPrec = performance.now(), pret = false;
function boucle(t) {
  const dt = Math.min(.05, Math.max(0, (t - tPrec) / 1000)); tPrec = t;
  if (accueilActif) {
    orbiteFrame(dt, t);
    if (sphere && pret) sphere.frame(dt);
  }
  Emoji.frame(dt);
  Eclats.frame(dt);
  requestAnimationFrame(boucle);
}
requestAnimationFrame(boucle);

/* ---------------------------------------------------------------- DÉMARRAGE */
function attendreThree(ms) {
  return new Promise((ok, ko) => {
    if (window.__three) return ok(window.__three);
    if (window.__threeErreur) return ko(window.__threeErreur);
    const t = setTimeout(() => ko(new Error('Three.js trop long à charger')), ms);
    window.addEventListener('three-pret', () => { clearTimeout(t); ok(window.__three); }, { once: true });
    window.addEventListener('three-erreur', () => { clearTimeout(t); ko(window.__threeErreur); }, { once: true });
  });
}
async function demarrer() {
  const t0 = performance.now();
  const toiles = await Promise.all(DEFS.map((d) => fabriquerSticker(d, 512).catch(() => null)));
  construireBarre(toiles);
  let mod = null;
  try { mod = await attendreThree(10000); } catch (e) { console.warn('Three.js indisponible, version simple :', e && e.message); }
  if (mod && toiles.every(Boolean) && window.creerSphere3D) {
    try {
      sphere = window.creerSphere3D(mod.THREE, mod.RoomEnvironment, {
        canvas, reduit, max: MAX, couleur: COUL.sphere || COUL.lilas, reflet: COUL.reflet || COUL.rose,
        textures: toiles.map((c, i) => ({ canvas: c, finition: DEFS[i].finition })),
      });
      sphere.redim(L.taille, L.r);
      await sphere.prechauffer();
    } catch (e) { console.warn('3D indisponible, version simple :', e && e.message); sphere = null; canvas.hidden = true; }
  }
  if (!sphere) sphere = creerRepli();
  const reste = 1100 - (performance.now() - t0);
  if (reste > 0) await new Promise((r) => setTimeout(r, reste));

  // lever de rideau
  $('#rideau').classList.add('parti');
  document.body.classList.remove('chargement');
  pret = true; tPrec = performance.now();
  sphere.intro(); O.introEnCours = true;
  setTimeout(() => $('#rideau').remove(), 900);

  // lien direct vers un projet (#p03…)
  const h = location.hash.slice(1);
  if (ORDRE.includes(h)) {
    history.replaceState(null, '', location.pathname + location.search);
    O.intro = 1; sphere.intro();
    ouvrir(h);
    return;
  }
  // petite démonstration : 3 stickers se posent tout seuls
  if (!reduit) [0, 2, 1].forEach((k, j) => setTimeout(() => {
    if (projetCourant) return;
    const res = sphere.collerAuHasard(k, DEFS[k].taille || 1);
    if (res) { majCompteur(); eclabousser(L.cx, L.cy, 6, [L.r * .4, L.r * .9]); }
  }, 750 + j * 280));
  if (!reduit) { iAuto = 3; majChoix(); }
  setTimeout(() => { if (!projetCourant) Emoji.reagir('sourire', L.mobile ? (PHRASES.accueilMobile || 'coucou ✿') : (PHRASES.accueil || 'coucou, moi c’est Victoire ✿'), 1500); }, 1800);
}
demarrer();
})();
