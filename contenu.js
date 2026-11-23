/* ============================================================
   CONTENU DU SITE — lu dans les fichiers du dossier content/ :
   - content/infos.json        nom, métier, contact, petites phrases de l'émoji
   - content/projets.json      les projets (ordre de l'orbite, textes, images)
   - content/stickers.json     les stickers de la boule et les couleurs du site
   - content/conversation.json la conversation « à propos »
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

  // données lues par main.js (mêmes noms qu'avant : COULEURS, STICKERS, CONTACT, CONVERSATION)
  window.COULEURS = Object.assign({}, st.couleurs || {});
  window.MAX_STICKERS = Number(st.maxStickers) || 36;
  window.STICKERS = liste(st.stickers).filter((s) => s && s.id && (s.image || s.svg)).map((s) => ({
    id: String(s.id), nom: s.nom || String(s.id), finition: s.finition === 'holo' ? 'holo' : 'brillant',
    taille: Math.max(.5, Math.min(1.6, Number(s.taille) || 1)), son: s.son || 'pop',
    ...(s.image ? { image: chemin(s.image) } : { svg: s.svg }),
  }));
  window.CONTACT = { email: (contact.email || '').trim(), instagram: (contact.instagram || '').trim(), linkedin: (contact.linkedin || '').trim() };
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
  document.querySelector('.accueil h1').textContent = `${nom} — portfolio de design graphique`;
  document.querySelector('.vp-pied-bas span').textContent = infos.signature || nom;
  if (contact.titre) document.getElementById('contact-titre').textContent = contact.titre;
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
}

function lancerMain() {
  const s = document.createElement('script');
  s.src = 'main.js';
  document.body.appendChild(s);
}

Promise.all(FICHIERS.map(lire))
  .then((v) => { construire(Object.fromEntries(FICHIERS.map((n, i) => [n, v[i]]))); lancerMain(); })
  .catch((e) => {
    console.error('Contenu illisible :', e);
    const t = document.querySelector('.rideau-texte');
    if (t) t.textContent = location.protocol === 'file:'
      ? 'ouvre le site avec un petit serveur (voir README) ✿'
      : 'oups, le contenu n’a pas pu être chargé… recharge la page ✿';
  });
})();
