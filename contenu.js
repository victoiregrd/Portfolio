/* ============================================================
   CONTENU DU SITE — lu dans les fichiers du dossier content/ :
   - content/infos.json        nom, métier, contact, petites phrases de l'émoji
   - content/projets.json      les projets (ordre de l'orbite, textes, images)
   - content/stickers.json     les stickers de la boule
   - content/conversation.json la conversation « à propos »
   - content/apparence.json    ambiance, couleurs, polices, fond (facultatif :
                               une valeur vide ou invalide garde le rendu d'origine)
   Ces fichiers se modifient dans Pages CMS (app.pagescms.org), sans
   toucher au code. Ce script fabrique les cartes, la liste et les pages
   projet à partir de ces données, puis lance main.js.
   ============================================================ */
(() => {
'use strict';

const FICHIERS = ['infos', 'projets', 'stickers', 'conversation'];
const TEINTES = ['rose', 'lilas', 'ciel', 'menthe', 'peche'];

/* ---------- petits outils ---------- */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// mise en forme simple : **gras**, *italique*, retour à la ligne
const md = (s) => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')
  .replace(/\n/g, '<br>');
const pad = (n) => String(n).padStart(2, '0');
const liste = (v) => (Array.isArray(v) ? v.filter((x) => x != null && x !== '') : []);
const teinte = (c) => (TEINTES.includes(c) ? c : 'lilas');
const hexa = (c, def) => (/^#[0-9a-f]{3,8}$/i.test(String(c || '').trim()) ? String(c).trim() : def);
// chemin d'image : relatif au site (fonctionne aussi sous https://compte.github.io/depot/)
const chemin = (p) => {
  p = String(p || '').trim();
  if (!p || /^(https?:|data:)/i.test(p)) return p;
  return p.replace(/^\.?\//, '');
};
const slug = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

/* ---------- apparence (content/apparence.json) ----------
   Chaque valeur est vérifiée : vide, absente ou invalide = valeur de l'ambiance choisie,
   et une ambiance inconnue = « pastel » (le rendu d'origine). Rien ne peut casser la page. */
const AMBIANCES = {
  pastel:   { fond: '#FFF8EE', texte: '#3B2A4A', texteDoux: '#5B4A6E', accent: '#6B4BA6', accent2: '#A8466E', lilas: '#CDB4F6', rose: '#FFC8DD', menthe: '#BDE0C8', ciel: '#BDE0FE', peche: '#FFD6A5', boule: '#CDB4F6', refletBoule: '#FFC8DD', panneaux: '#FFFFFF', boutons: '#FFFFFF' },
  bordeaux: { fond: '#F7EFE4', texte: '#5E1A1D', texteDoux: '#7A3A3D', accent: '#8E2B31', accent2: '#A3473B', lilas: '#E8C7C5', rose: '#F2B8B5', menthe: '#D9E2C4', ciel: '#D3DEE6', peche: '#F3D2A8', boule: '#8E2B31', refletBoule: '#F2B8B5', panneaux: '#FFFDF9', boutons: '#FFFFFF' },
  sorbet:   { fond: '#FFFBF3', texte: '#2A1F3D', texteDoux: '#4E4166', accent: '#5B33C6', accent2: '#B42A6B', lilas: '#BBA2FF', rose: '#FF9FC8', menthe: '#8EE0B2', ciel: '#8DCBFF', peche: '#FFBE76', boule: '#FF9FC8', refletBoule: '#BBA2FF', panneaux: '#FFFFFF', boutons: '#FFFFFF' },
  nature:   { fond: '#F4F8F1', texte: '#233D2E', texteDoux: '#47604F', accent: '#2E6F4E', accent2: '#9A4F2C', lilas: '#CFE0C3', rose: '#F3D3C4', menthe: '#B5DCC3', ciel: '#C6DFE6', peche: '#F2DDB0', boule: '#B5DCC3', refletBoule: '#F3D3C4', panneaux: '#FFFFFF', boutons: '#FFFFFF' },
  ocean:    { fond: '#F3F7FC', texte: '#1F2E4A', texteDoux: '#44506B', accent: '#2B4FA6', accent2: '#A3466E', lilas: '#C9D2F7', rose: '#F5CFE0', menthe: '#BFE3DA', ciel: '#B7D8F7', peche: '#F7DCC0', boule: '#B7D8F7', refletBoule: '#C9D2F7', panneaux: '#FFFFFF', boutons: '#FFFFFF' },
};
// nom dans apparence.json -> variable CSS de style.css
const VARS_COULEURS = { fond: '--fond', texte: '--prune', texteDoux: '--prune-doux', accent: '--lilas-fonce', accent2: '--rose-fonce',
  lilas: '--lilas', rose: '--rose', menthe: '--menthe', ciel: '--ciel', peche: '--peche', panneaux: '--blanc', boutons: '--bouton' };
// polices proposées (liste fermée, Google Fonts) : [nom CSS, paramètres Google Fonts (null = déjà chargée par index.html)]
const POLICES = {
  titres: { _var: '--titre', _repli: 'Impact, sans-serif', anton: ['Anton', null], bebas: ['Bebas Neue', 'Bebas+Neue'],
    oswald: ['Oswald', 'Oswald:wght@600'], league: ['League Gothic', 'League+Gothic'], lilita: ['Lilita One', 'Lilita+One'],
    abril: ['Abril Fatface', 'Abril+Fatface'] },
  elegante: { _var: '--serif', _repli: 'Georgia, serif', instrument: ['Instrument Serif', null], playfair: ['Playfair Display', 'Playfair+Display:ital@0;1'],
    dmserif: ['DM Serif Display', 'DM+Serif+Display:ital@0;1'], fraunces: ['Fraunces', 'Fraunces:ital@0;1'],
    cormorant: ['Cormorant Garamond', 'Cormorant+Garamond:ital,wght@0,500;1,500'] },
  texte: { _var: '--texte', _repli: 'system-ui, sans-serif', dmsans: ['DM Sans', null], inter: ['Inter', 'Inter:wght@400;500;700'],
    poppins: ['Poppins', 'Poppins:wght@400;500;700'], nunito: ['Nunito', 'Nunito:wght@400;500;700'], worksans: ['Work Sans', 'Work+Sans:wght@400;500;700'],
    spacegrotesk: ['Space Grotesk', 'Space+Grotesk:wght@400;500;700'], manrope: ['Manrope', 'Manrope:wght@400;500;700'], outfit: ['Outfit', 'Outfit:wght@400;500;700'] },
  manuscrite: { _var: '--main', _repli: 'cursive', caveat: ['Caveat', null], kalam: ['Kalam', 'Kalam:wght@400;700'], patrick: ['Patrick Hand', 'Patrick+Hand'],
    gochi: ['Gochi Hand', 'Gochi+Hand'], shadows: ['Shadows Into Light', 'Shadows+Into+Light'], indie: ['Indie Flower', 'Indie+Flower'] },
};
// code couleur accepté : #abc, #aabbcc, avec ou sans # (sinon null)
const couleurValide = (c) => {
  const v = String(c == null ? '' : c).trim().replace(/^#?/, '#');
  if (/^#[0-9a-f]{3}$/i.test(v)) return ('#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3]).toUpperCase();
  return /^#[0-9a-f]{6}$/i.test(v) ? v.toUpperCase() : null;
};
let policesPretes = Promise.resolve();
let titresPerso = false;
// une police de titre plus large qu'Anton : le grand mot PORTFOLIO du fond est réduit pour tenir dans l'écran
function ajusterMotFond() {
  const m = document.querySelector('.mot-fond');
  if (!m || !titresPerso) return;
  m.style.fontSize = '';
  const w = m.getBoundingClientRect().width, max = window.innerWidth * 0.94;
  if (w > max) m.style.fontSize = `calc(min(23vw, 40vh) * ${(max / w).toFixed(3)})`;
}
function appliquerApparence(A) {
  try {
    A = A && typeof A === 'object' ? A : {};
    const nomAmb = Object.prototype.hasOwnProperty.call(AMBIANCES, A.ambiance) ? A.ambiance : 'pastel';
    const amb = AMBIANCES[nomAmb], perso = A.couleurs && typeof A.couleurs === 'object' ? A.couleurs : {};
    const C = {};
    for (const k in amb) C[k] = couleurValide(perso[k]) || amb[k];
    const racine = document.documentElement.style;
    for (const k in VARS_COULEURS) racine.setProperty(VARS_COULEURS[k], C[k]);
    // fond des pages projet : teintes d'origine tant que rien n'a changé, sinon mélange couleur douce + fond
    const P = AMBIANCES.pastel;
    for (const t of TEINTES) {
      if (C[t] !== P[t] || C.fond !== P.fond) racine.setProperty('--fp-' + t, `color-mix(in srgb,var(--${t}) 28%,var(--fond))`);
      else racine.removeProperty('--fp-' + t);
    }
    const tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.content = C.fond;
    // couleurs lues par main.js (boule 3D, confettis)
    window.COULEURS = { fond: C.fond, texte: C.texte, lilas: C.lilas, rose: C.rose, menthe: C.menthe, ciel: C.ciel, peche: C.peche,
      sphere: C.boule, reflet: C.refletBoule };
    // fond : taches de couleur et grain papier (cochés par défaut)
    const F = A.fond && typeof A.fond === 'object' ? A.fond : {};
    document.body.classList.toggle('sans-taches', F.taches === false);
    document.body.classList.toggle('sans-grain', F.grain === false);
    // polices : seules celles de la liste ; les nouvelles sont chargées depuis Google Fonts
    const choix = A.polices && typeof A.polices === 'object' ? A.polices : {};
    const familles = [], noms = [];
    for (const role in POLICES) {
      const liste_ = POLICES[role], v = choix[role];
      if (typeof v !== 'string' || v[0] === '_' || !Object.prototype.hasOwnProperty.call(liste_, v)) continue;
      const [nomCss, google] = liste_[v];
      if (google) { familles.push('family=' + google); noms.push(nomCss); }
      racine.setProperty(liste_._var, `'${nomCss}', ${liste_._repli}`);
      if (role === 'titres' && v !== 'anton') { titresPerso = true; document.body.classList.add('titres-perso'); }
    }
    if (familles.length) {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = `https://fonts.googleapis.com/css2?${familles.join('&')}&display=swap`;
      document.head.appendChild(l);
      // on attend les nouvelles polices (1,5 s au plus) avant de mesurer la page dans main.js
      policesPretes = new Promise((ok) => {
        const fin = () => ok();
        setTimeout(fin, 1500);
        l.onload = () => Promise.all(noms.map((n) => document.fonts.load(`16px "${n}"`).catch(() => {}))).then(fin, fin);
        l.onerror = fin;
      });
    }
  } catch (e) {
    console.warn('Apparence ignorée :', e);
    const P = AMBIANCES.pastel;
    window.COULEURS = { fond: P.fond, texte: P.texte, lilas: P.lilas, rose: P.rose, menthe: P.menthe, ciel: P.ciel, peche: P.peche, sphere: P.boule, reflet: P.refletBoule };
  }
}

async function lire(nom) {
  // no-cache : le navigateur revérifie le fichier à chaque visite (les modifications de Victoire apparaissent tout de suite)
  const r = await fetch(`content/${nom}.json`, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`content/${nom}.json : erreur ${r.status}`);
  return r.json();
}

/* ---------- projets : une entrée par carte de l'orbite ---------- */
// une version de Kaathoon compte si elle a au moins un titre, un texte ou une image
const versionRemplie = (v) => !!(v && (v.titreCarte || v.texte || liste(v.textes).length || v.grille || v.vignette
  || liste(v.figures).some((f) => f && f.image) || liste(v.bandes).some((f) => f && f.image)));
// première image disponible d'un projet (sert de vignette si aucune n'est choisie)
const premiereImage = (b) => chemin(b.vignette || b.image || b.imageSituation || b.apres || b.avant || b.logo
  || ((liste(b.galerie).find((x) => x && x.image) || {}).image)
  || ((liste(b.saveurs).find((x) => x && x.tablette) || {}).tablette) || '');
function preparerProjets(blocs) {
  const pris = new Set();
  const unique = (id, titre, i) => {
    let base = /^[a-z][a-z0-9-]*$/i.test(String(id || '')) ? String(id) : '';
    if (!base) base = 'projet-' + (slug(titre) || i + 1);
    let v = base, k = 2;
    while (pris.has(v)) v = `${base}-${k++}`;
    pris.add(v);
    return v;
  };
  const entrees = [], sections = [];
  let tous = liste(blocs).filter((b) => b && typeof b === 'object');
  if (!tous.length) tous = [{ modele: 'projet', titre: 'Projets à venir', texte: 'Ils arrivent très bientôt ✿' }];
  tous.forEach((b, i) => {
    if (b.modele === 'kaathoon') {
      const versions = [['1', b.v1], ['2', b.v2]].filter(([, v]) => versionRemplie(v));
      if (!versions.length) versions.push(['1', b.v1 || {}]);
      const s = { bloc: b, id: '', entrees: [], versions };
      versions.forEach(([n, v], k) => {
        const id = unique(v.id || (k ? '' : b.id), v.titreCarte || `${b.titre || ''} V${n}`, i);
        if (!k) s.id = id;
        const e = { id, section: s, version: n, titre: v.titreCarte || `${b.titre || ''} V${n}`, sousTitre: v.sousTitre || '',
          couleur: teinte(v.couleur), vignette: chemin(v.vignette || v.grille || ((liste(v.figures).find((f) => f && f.image) || {}).image) || ''),
          phrase: v.phraseEmoji || '' };
        entrees.push(e); s.entrees.push(e);
      });
      sections.push(s);
      return;
    }
    const id = unique(b.id, b.titre, i);
    const s = { bloc: b, id, entrees: [] };
    const e = { id, section: s, titre: b.titre || 'Projet', sousTitre: b.sousTitre || '', couleur: teinte(b.couleur),
      vignette: premiereImage(b), phrase: b.phraseEmoji || '' };
    entrees.push(e); s.entrees.push(e);
    sections.push(s);
  });
  entrees.forEach((e, i) => { e.num = pad(i + 1); });
  return { entrees, sections };
}

/* ---------- morceaux de pages projet (même HTML que la V2 pour les projets d'origine) ---------- */
// texte : un paragraphe par bloc séparé d'une ligne vide
const paragraphes = (b) => (b.texte != null && b.texte !== '' ? String(b.texte).split(/\n\s*\n/) : liste(b.textes))
  .map((t) => String(t).trim()).filter(Boolean);
const textes = (b) => paragraphes(b).map((t) => `<p class="projet-brief">${md(t)}</p>`).join('\n    ');
const outils = (b) => (liste(b.outils).length ? `<ul class="outils">${liste(b.outils).map((o) => `<li>${esc(o)}</li>`).join('')}</ul>` : '');
const note = (b) => (b.note ? `<p class="note-main">${esc(b.note)}</p>` : '');
const img = (src, alt, cls, { lazy = true, zoom = true } = {}) =>
  `<img${cls ? ` class="${cls}"` : ''} src="${esc(chemin(src))}" alt="${esc(alt)}"${lazy ? ' loading="lazy"' : ''}${zoom ? ' data-curseur="zoom"' : ''}>`;
// grandes images sous le texte (projets d'origine) : une par ligne, légende facultative
const grandes = (b, cadre) => liste(b.galerie).filter((x) => x && x.image)
  .map((x) => `<div class="projet-large reveal">${img(x.image, x.alt || x.legende || b.titre, 'zoomable ' + cadre)}${x.legende ? `<p class="projet-legende">${md(x.legende)}</p>` : ''}</div>`).join('\n  ');
// ligne « type · année » sous le titre
const metaLigne = (b, avecType) => {
  const m = [avecType ? b.sousTitre : '', b.annee].map((x) => String(x || '').trim()).filter(Boolean);
  return m.length ? `<p class="projet-meta">${esc(m.join(' · '))}</p>` : '';
};
function blocTexte(e, b, avecType = false) {
  return `<div class="projet-texte reveal">
    <span class="projet-num">${e.num}.</span>
    <h2 class="projet-titre" tabindex="-1">${esc(b.titre || e.titre)}</h2>
    ${metaLigne(b, avecType)}
    ${textes(b)}
    ${outils(b)}
    ${note(b)}
  </div>`;
}
const imageSeule = (src, alt, portrait, premier) => (src
  ? `<div class="bascule-scene${portrait ? ' bascule-portrait' : ''}"><div class="bascule-vue actif"><div class="tilt" data-curseur="zoom">${img(src, alt, 'zoomable', { lazy: !premier, zoom: false })}</div></div></div>`
  : '');

// nouveau projet : page simple (titre, type, année, texte, image principale, galerie)
function sectionProjet(s, premier) {
  const b = s.bloc, e = s.entrees[0];
  const imgs = liste(b.galerie).filter((x) => x && x.image);
  const principale = b.image || (imgs.length ? imgs.shift().image : '');
  const galerie = imgs.length ? `<div class="galerie${imgs.length === 1 ? ' galerie-une' : ''}">
    ${imgs.map((x) => `<figure class="reveal">${img(x.image, x.alt || x.legende || b.titre, 'zoomable')}${x.legende ? `<figcaption>${md(x.legende)}</figcaption>` : ''}</figure>`).join('\n    ')}
  </div>` : '';
  return `<section class="projet projet-simple${b.inverse ? ' projet-inverse' : ''}" id="${s.id}" data-fond="${e.couleur}">
  ${blocTexte(e, b, true)}
  <div class="projet-visuels reveal">
    ${principale ? `<div class="simple-principale"><div class="tilt" data-curseur="zoom">${img(principale, b.alt || b.titre, 'zoomable', { lazy: !premier, zoom: false })}</div></div>` : ''}
  </div>
  ${galerie}
</section>`;
}
function sectionClassique(s, premier) {
  const b = s.bloc, e = s.entrees[0];
  const cls = ['projet'];
  if (b.inverse) cls.push('projet-inverse');
  const mot = String(b.motFond || '').trim();
  if (mot) cls.push('projet-zimoun');
  const fond = mot ? `<div class="zimoun-fond" aria-hidden="true">
    ${Array.from({ length: 5 }, () => `<div class="zl">${esc(Array(8).fill(mot).join(' '))}</div>`).join('\n    ')}
  </div>` : '';
  const scene = `bascule-scene${b.portrait ? ' bascule-portrait' : ''}`;
  let visuel = '';
  if (b.image && b.imageSituation) {
    const principale = `<div class="tilt" data-curseur="zoom">${img(b.image, b.alt || b.titre, 'zoomable', { lazy: !premier, zoom: false })}</div>`;
    visuel = `<div class="bascule" data-bascule>
      <div class="bascule-boutons"><button class="actif">${esc(b.boutonImage || "L'affiche")}</button><button>${esc(b.boutonSituation || 'En situation')}</button></div>
      <div class="${scene}">
        <div class="bascule-vue actif">${principale}</div>
        <div class="bascule-vue">${img(b.imageSituation, b.altSituation || b.titre, 'zoomable cadre')}</div>
      </div>
    </div>`;
  } else visuel = imageSeule(b.image || b.imageSituation, b.alt || b.altSituation || b.titre, b.portrait, premier);
  return `<section class="${cls.join(' ')}" id="${s.id}" data-fond="${e.couleur}">
  ${fond}
  ${blocTexte(e, b)}
  <div class="projet-visuels reveal">
    ${visuel}
  </div>
  ${grandes(b, 'cadre')}
</section>`;
}
function sectionAvantApres(s, premier) {
  const b = s.bloc, e = s.entrees[0];
  const visuel = b.avant && b.apres
    ? `<div class="avant-apres" data-curseur="glisse">
      ${img(b.apres, b.altApres || b.titre, '', { zoom: false })}
      <div class="aa-avant">${img(b.avant, b.altAvant || b.titre, '', { zoom: false })}</div>
      <div class="aa-poignee"><span>⟷</span></div>
      <span class="aa-etiquette aa-g">${esc(b.etiquetteAvant || 'avant')}</span><span class="aa-etiquette aa-d">${esc(b.etiquetteApres || 'après')}</span>
    </div>`
    : imageSeule(b.apres || b.avant, b.altApres || b.altAvant || b.titre, true, premier); // une seule photo : image simple
  return `<section class="projet${b.inverse ? ' projet-inverse' : ''}" id="${s.id}" data-fond="${e.couleur}">
  ${blocTexte(e, b)}
  <div class="projet-visuels reveal">
    ${visuel}
  </div>
  ${grandes(b, 'cadre')}
</section>`;
}
function sectionKlear(s) {
  const b = s.bloc, e = s.entrees[0];
  return `<section class="projet${b.inverse ? ' projet-inverse' : ''} klear" id="${s.id}">
  <div class="bulles" aria-hidden="true"></div>
  ${blocTexte(e, b)}
  <div class="projet-visuels reveal">
    ${b.image ? img(b.image, b.alt || b.titre, 'zoomable cadre-blanc') : ''}
  </div>
  ${grandes(b, 'cadre-blanc')}
</section>`;
}
function sectionAllumettes(s) {
  const b = s.bloc, e = s.entrees[0];
  return `<section class="projet${b.inverse ? ' projet-inverse' : ''} allumettes" id="${s.id}" data-fond="${e.couleur}">
  ${blocTexte(e, b)}
  <div class="projet-visuels reveal">
    ${b.image ? `<div class="allumette-zone" data-curseur="craque !">
      ${img(b.image, b.alt || b.titre, 'zoomable', { zoom: false })}
    </div>` : ''}
  </div>
  ${grandes(b, 'cadre-blanc')}
</section>`;
}
function sectionKaathoon(s) {
  const b = s.bloc, deux = s.entrees.length === 2;
  const version = (v, n) => {
    v = v || {};
    const figures = liste(v.figures).filter((f) => f && f.image).map((f) => `<figure class="reveal${f.etroite ? ' k-masque' : ''}">${img(f.image, f.alt || f.legende || b.titre, 'zoomable')}
        <figcaption>${md(f.legende)}</figcaption></figure>`).join('\n      ');
    return `<div class="k-version k-v${n}">
    <div class="k-intro reveal">
      ${textes(v)}
      ${outils(v)}
    </div>
    ${v.grille ? img(v.grille, v.altGrille || b.titre, 'zoomable k-grand reveal') : ''}
    <div class="k-duo">
      ${figures}
    </div>
    ${liste(v.bandes).filter((x) => x && x.image).map((x) => img(x.image, x.alt || b.titre, 'zoomable k-bande reveal')).join('\n    ')}
  </div>`;
  };
  if (!deux) { // une seule version remplie : page simple, sans bouton V1 / V2
    const [n, v] = s.versions[0];
    return `<section class="kaathoon" id="${s.id}" data-version="1">
  <div class="k-tete reveal">
    <div>
      <span class="projet-num">${s.entrees[0].num}.</span>
      <h2 class="projet-titre" tabindex="-1">${esc(b.titre || s.entrees[0].titre)}</h2>
    </div>
  </div>

  ${version(v, 1)}
</section>`;
  }
  const [e1, e2] = s.entrees;
  return `<section class="kaathoon" id="${s.id}" data-version="1">
  <div class="k-tete reveal">
    <div>
      <span class="projet-num"><span class="k-n1">${e1.num}.</span><span class="k-n2">${e2.num}.</span></span>
      <h2 class="projet-titre" tabindex="-1">${esc(b.titre)} <span class="k-v">V<b class="k-n1">1</b><b class="k-n2">2</b></span></h2>
    </div>
    <div class="k-switch" role="group" aria-label="Version">
      <button data-v="1" class="actif">${esc((b.v1 || {}).bouton || 'V1')}</button>
      <button data-v="2">${esc((b.v2 || {}).bouton || 'V2')}</button>
      <span class="k-pastille"></span>
    </div>
  </div>

  ${version(b.v1, 1)}

  ${version(b.v2, 2)}
</section>`;
}
function sectionAparte(s) {
  const b = s.bloc, e = s.entrees[0];
  const saveurs = liste(b.saveurs).filter((v) => v && (v.tablette || v.patron || v.nom)).slice(0, 3); // le style prévoit 3 saveurs au plus
  const DEF = ['#F08DB0', '#FFC48A', '#8FD3B8'];
  const figs = (l) => liste(l).filter((f) => f && f.image)
    .map((f) => `<figure class="reveal">${img(f.image, f.alt || f.legende || b.titre, 'zoomable')}${f.legende ? `<figcaption>${md(f.legende)}</figcaption>` : ''}</figure>`).join('\n    ');
  const blocSaveurs = saveurs.length ? `<div class="saveurs reveal">
    <div class="saveurs-choix" role="group" aria-label="Saveur">
      ${saveurs.map((v, i) => `<button data-s="${i + 1}"${i ? '' : ' class="actif"'} aria-pressed="${i ? 'false' : 'true'}"><i style="--c:${hexa(v.couleur, DEF[i])}"></i>${esc(v.nom)}</button>`).join('\n      ')}
    </div>
    <div class="saveurs-scene">
      <div class="tablette" data-curseur="zoom">
        ${saveurs.filter((v) => v.tablette).map((v) => img(v.tablette, v.altTablette || v.nom || b.titre, `zoomable s${saveurs.indexOf(v) + 1}`, { zoom: false })).join('\n        ')}
      </div>
      <div class="patron" data-curseur="zoom">
        ${saveurs.filter((v) => v.patron).map((v) => img(v.patron, v.altPatron || v.nom || b.titre, `zoomable s${saveurs.indexOf(v) + 1}`, { zoom: false })).join('\n        ')}
      </div>
    </div>
  </div>` : '';
  return `<section class="aparte" id="${s.id}" data-saveur="1">
  <div class="mandala" aria-hidden="true"></div>
  <div class="aparte-tete reveal">
    <span class="projet-num">${e.num}.</span>
    <h2 class="projet-titre" tabindex="-1">${esc(b.titre)}</h2>
    ${textes(b)}
    ${outils(b)}
    ${b.logo ? img(b.logo, b.altLogo || b.titre, 'aparte-logos', { zoom: false }) : ''}
  </div>

  ${blocSaveurs}

  <div class="aparte-pub">
    ${figs(b.publicite)}
  </div>
  <div class="aparte-papeterie">
    ${figs(b.papeterie)}
  </div>
</section>`;
}
const RENDUS = { projet: sectionProjet, classique: sectionClassique, avantApres: sectionAvantApres, kaathoon: sectionKaathoon,
  klear: sectionKlear, allumettes: sectionAllumettes, aparte: sectionAparte };

/* ---------- construction de la page ---------- */
function construire(D) {
  const infos = D.infos || {}, contact = infos.contact || {}, st = D.stickers || {}, conv = D.conversation || {};
  const nom = infos.nom || 'Victoire Giroard';

  // données lues par main.js (mêmes noms qu'avant : STICKERS, CONTACT, CONVERSATION ; COULEURS vient de l'apparence)
  window.MAX_STICKERS = Number(st.maxStickers) || 36;
  // un sticker = une image (ou le dessin d'origine) ; le « nom court » est facultatif :
  // vide ou avec accents/espaces, il est fabriqué à partir du nom (Gâteau → gateau), sans doublon
  const idsPris = new Set();
  window.STICKERS = liste(st.stickers).filter((s) => s && typeof s === 'object' && (s.image || s.svg)).map((s, i) => {
    let id = slug(s.id) || slug(s.nom) || 'sticker-' + (i + 1);
    for (let k = 2; idsPris.has(id); k++) id = (slug(s.id) || slug(s.nom) || 'sticker') + '-' + k;
    idsPris.add(id);
    return {
      id, nom: String(s.nom || s.id || 'Sticker'), finition: s.finition === 'holo' ? 'holo' : 'brillant',
      taille: Math.max(.5, Math.min(1.6, Number(s.taille) || 1)), son: s.son || 'pop',
      // l'image remplace le dessin ; le dessin reste en secours si l'image ne se charge pas
      image: s.image ? chemin(s.image) : '', svg: typeof s.svg === 'string' ? s.svg : '',
    };
  });
  const champ = (v) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '');
  window.CONTACT = { email: champ(contact.email), instagram: champ(contact.instagram), linkedin: champ(contact.linkedin), telephone: champ(contact.telephone) };
  window.CONVERSATION = Object.assign({ intro: [], reponses: [], reactions: [] }, conv, {
    afficherACompleter: conv.afficherACompleter === true,
    reactions: liste(conv.reactions).filter((r) => r && (r.emoji || r.sticker)),
    // chaque réponse rapide garde un identifiant (sert à retenir les boutons déjà utilisés et les réactions)
    reponses: liste(conv.reponses).filter((r) => r && r.libelle).map((r, i) => Object.assign({}, r, {
      id: r.id || slug(r.libelle) || 'reponse-' + (i + 1), unique: r.unique !== false, messages: liste(r.messages) })),
    intro: liste(conv.intro),
  });

  const { entrees, sections } = preparerProjets((D.projets || {}).projets);
  const NB = entrees.length;
  window.CONTENU = {
    infos, projets: entrees.map((e) => ({ id: e.id, section: e.section.id, modele: e.section.bloc.modele || 'classique', version: e.version || null,
      titre: e.titre, vignette: e.vignette, phrase: e.phrase })),
    emoji: infos.emoji || {},
    contactVide: contact.texteSiVide || 'Les coordonnées arrivent bientôt ✿',
  };

  // en-tête, titres
  if (infos.titreOnglet) document.title = infos.titreOnglet;
  if (infos.description) { const m = document.querySelector('meta[name="description"]'); if (m) m.content = infos.description; }
  const meta = [infos.metier, infos.annee ? 'portfolio ' + infos.annee : 'portfolio'].filter(Boolean).join(' · ');
  document.getElementById('entete-nom').innerHTML = `${esc(nom)} <span>${esc(meta)}</span>`;
  if (infos.description) document.getElementById('presentation').textContent = infos.description;
  document.querySelector('.vp-pied-bas span').textContent = infos.signature || nom;
  const nbTxt = `${NB} projet${NB > 1 ? 's' : ''}`;
  document.getElementById('orbite').setAttribute('aria-label', `Les ${nbTxt}, en orbite autour de la boule`);
  document.getElementById('index-projets').setAttribute('aria-label', `Index des ${nbTxt}`);
  document.getElementById('liste-titre').textContent = `Les ${nbTxt}`;

  // cartes de l'orbite + liste
  document.getElementById('orbite').innerHTML = entrees.map((e) =>
    `<li><a class="carte" href="#${e.id}" data-projet="${e.id}" style="--teinte:var(--${e.couleur})"><span class="carte-img">${e.vignette ? `<img src="${esc(e.vignette)}" alt="" draggable="false">` : ''}</span><span class="carte-txt"><b>${e.num}</b> ${esc(e.titre)} <i>${esc(e.sousTitre)}</i></span></a></li>`).join('\n      ');
  document.querySelector('#liste .liste-projets').innerHTML = entrees.map((e) =>
    `<li><a href="#${e.id}" data-projet="${e.id}"><span class="num">${e.num}</span><span class="nom">${esc(e.titre)}</span><span class="tag">${esc(e.sousTitre)}</span></a></li>`).join('\n    ');
  if (NB) document.getElementById('index-titre').textContent = `01 · ${entrees[0].titre}`;
  document.getElementById('vp-compte').textContent = `01 / ${pad(NB)}`;
  document.querySelector('.index-rangee').classList.toggle('nombreux', NB > 11);

  // pages projet, avant le pied de page
  const html = sections.map((s, i) => (RENDUS[s.bloc.modele] || sectionProjet)(s, i === 0)).join('\n\n');
  document.querySelector('#vue-projet .vp-pied').insertAdjacentHTML('beforebegin', html);
  // visuel principal de chaque projet : le nom de Victoire dans le texte alternatif (lecteurs d'écran, Google Images)
  document.querySelectorAll('#vue-projet > section').forEach((sec) => {
    const im = sec.querySelector('img[alt]:not([alt=""])');
    if (im && !im.alt.includes(nom)) im.alt = `${im.alt}, par ${nom}`;
  });
}

function lancerMain() {
  const s = document.createElement('script');
  s.src = 'main.js';
  document.body.appendChild(s);
}

// apparence d'abord (facultative : fichier absent ou illisible = rendu d'origine), pour éviter un éclair des anciennes couleurs
const apparence = fetch('content/apparence.json', { cache: 'no-cache' })
  .then((r) => (r.ok ? r.json() : {})).catch(() => ({}))
  .then(appliquerApparence);

Promise.all([...FICHIERS.map(lire), apparence])
  .then((v) => { construire(Object.fromEntries(FICHIERS.map((n, i) => [n, v[i]]))); return policesPretes; })
  .then(() => {
    ajusterMotFond();
    if (titresPerso) {
      let att = 0;
      window.addEventListener('resize', () => { cancelAnimationFrame(att); att = requestAnimationFrame(ajusterMotFond); });
      document.fonts.ready.then(ajusterMotFond);
    }
    lancerMain();
  })
  .catch((e) => {
    console.error('Contenu illisible :', e);
    const t = document.querySelector('.rideau-texte');
    if (t) t.textContent = location.protocol === 'file:'
      ? 'ouvre le site avec un petit serveur (voir README) ✿'
      : 'oups, le contenu n’a pas pu être chargé… recharge la page ✿';
  });
})();
