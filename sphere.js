/* ============================================================
   Memoji 3D à stickers — Three.js (chargé par index.html depuis le CDN)
   Script classique : main.js appelle creerSphere3D() quand Three est prêt.
   (le nom de la fonction est conservé pour que main.js n'ait pas à changer)
   - tête de Memoji construite en code (visage, cheveux, clin d'œil, langue)
   - un sticker = un badge bombé qui épouse la VRAIE surface de la tête
     (projection par raycast sur le visage, les cheveux, la langue, le cou)
   - la tête fait « gelée » à l'impact ; les stickers suivent la déformation
   - la tête se retourne face caméra et se balance doucement au repos
   ============================================================ */
window.creerSphere3D = function (THREE, RoomEnvironment, o) {
  'use strict';
  const canvas = o.canvas, reduit = !!o.reduit;

  /* ---------- RÉGLAGES FACILES À AJUSTER ---------- */
  const ECHELLE_TETE = 0.82;   // taille de la tête dans le canvas
  const TAILLE = 0.40;         // diamètre d'un sticker (unités de la tête)
  const BADGE_ROND = true;     // true : sticker enfermé dans un badge rond à bord métallique
  const FOND_BADGE = '#ffffff';// fond du badge (visible si le sticker est transparent)
  const PITCH_MAX = 0.45;      // inclinaison verticale max (radians)
  const COULEUR_PEAU = o.peau || '#F5D0B5';
  const COULEUR_CHEVEUX = o.cheveux || '#3B2519';

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  let ratio = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(ratio);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 60);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.environmentIntensity = 0.9;
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xfff4fa, 0xe2d4ff, 0.55));
  const soleil = new THREE.DirectionalLight(0xffffff, 1.5);
  soleil.position.set(2.5, 3.5, 4);
  scene.add(soleil);
  // contre-jour léger pour détacher la tête d'un fond sombre
  const contre = new THREE.DirectionalLight(0xdfe6ff, 1.1);
  contre.position.set(-3, 2.5, -3.5);
  scene.add(contre);

  /* ---------- déformation « gelée » partagée (tête + stickers) ---------- */
  const U = { uImpact: { value: new THREE.Vector3(0, 0, 1) }, uWob: { value: 0 }, uDent: { value: 0 } };
  function gelee(sh) {
    sh.uniforms.uImpact = U.uImpact; sh.uniforms.uWob = U.uWob; sh.uniforms.uDent = U.uDent;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uImpact;\nuniform float uWob;\nuniform float uDent;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        { vec3 nn = normalize(position); float d = dot(nn, uImpact);
          transformed += nn * (-0.07 * uWob * (d * d - 0.3333) - 0.04 * uDent * pow(max(d, 0.0), 6.0)); }`);
  }

  // groupe = rotation + intro ; modele = la tête (échelle) ; les stickers sont enfants de modele
  const groupe = new THREE.Group();
  scene.add(groupe);
  const modele = new THREE.Group();
  modele.scale.setScalar(ECHELLE_TETE);
  groupe.add(modele);
  const cibles = []; // surfaces où les stickers peuvent se coller

  /* ============================================================
     LA TÊTE DU MEMOJI
     ============================================================ */
  const RX = 0.80, RY = 0.88, RZ = 0.82; // ellipsoïde du visage
  // zone du visage couverte par le décalque (yeux, sourcils, bouche)
  const VX0 = -0.60, VX1 = 0.60, VY0 = -0.58, VY1 = 0.46;

  // mâchoire plus étroite + petit nez : appliqué au visage ET au décalque
  function deformer(p) {
    if (p.y < 0) { const k = Math.pow(Math.min(1, -p.y / RY), 1.6); p.x *= 1 - 0.20 * k; p.z *= 1 - 0.06 * k; }
    if (p.z > 0) p.z += 0.045 * Math.exp(-(p.x * p.x / 0.004 + (p.y + 0.13) * (p.y + 0.13) / 0.012));
    return p;
  }
  function pointVisage(x, y, off) {
    const t = 1 - (x / RX) * (x / RX) - (y / RY) * (y / RY);
    const z = RZ * Math.sqrt(Math.max(t, 0));
    const n = new THREE.Vector3(x / (RX * RX), y / (RY * RY), z / (RZ * RZ)).normalize();
    return deformer(new THREE.Vector3(x, y, z)).addScaledVector(n, off);
  }

  const matPeau = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(COULEUR_PEAU), roughness: 0.5, metalness: 0,
    clearcoat: 0.25, clearcoatRoughness: 0.35,
    sheen: 0.6, sheenRoughness: 0.6, sheenColor: new THREE.Color('#ffb7a0'),
  });
  matPeau.onBeforeCompile = gelee;
  const matCheveux = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(COULEUR_CHEVEUX), roughness: 0.38, metalness: 0,
    clearcoat: 0.6, clearcoatRoughness: 0.25,
    sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color('#7a5238'),
    side: THREE.DoubleSide,
  });
  matCheveux.onBeforeCompile = gelee;
  const matLangue = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#F08B95'), roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2,
    sheen: 0.5, sheenColor: new THREE.Color('#ffc0c8'),
  });
  matLangue.onBeforeCompile = gelee;

  /* ---------- visage ---------- */
  (function () {
    const g = new THREE.SphereGeometry(1, 48, 32);
    const pa = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < pa.count; i++) {
      v.fromBufferAttribute(pa, i); v.set(v.x * RX, v.y * RY, v.z * RZ); deformer(v);
      pa.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, matPeau);
    modele.add(m); cibles.push(m);
  })();

  /* ---------- cou ---------- */
  (function () {
    const g = new THREE.CylinderGeometry(0.26, 0.30, 0.5, 32, 1);
    g.translate(0, -0.70, -0.04);
    const m = new THREE.Mesh(g, matPeau);
    modele.add(m); cibles.push(m);
  })();

  /* ---------- cheveux : casque lisse + rideaux, ouvert devant (raie au milieu) ---------- */
  (function () {
    const NA = 64, NY = 40, E = 1.07, top = RY * E, bas = -0.95, y0 = -0.05, yH = 0.62;
    const pos = new Float32Array((NA + 1) * (NY + 1) * 3), idx = [];
    const f0 = Math.sqrt(1 - Math.pow(y0 / (RY * E), 2));
    let k = 0;
    for (let j = 0; j <= NY; j++) {
      const y = top + (bas - top) * (j / NY);
      // rayon du casque : ellipsoïde au-dessus de y0, puis retombée presque droite
      const f = y >= y0 ? Math.sqrt(Math.max(0, 1 - Math.pow(y / (RY * E), 2))) : f0 * (1 - 0.06 * (y0 - y) / (y0 - bas));
      // largeur de l'ouverture devant : 0 sur le crâne, s'élargit vers les tempes (raie au milieu)
      let w = 0;
      if (y < yH) {
        const t = Math.min(1, (yH - y) / 0.34); w = t * t * (3 - 2 * t);
        if (y < yH - 0.34) w = 1 + 0.12 * Math.min(1, (yH - 0.34 - y) / 0.8);
      }
      for (let i = 0; i <= NA; i++) {
        const a = w + (Math.PI * 2 - 2 * w) * (i / NA); // 0 = face avant
        pos[k++] = RX * E * f * Math.sin(a); pos[k++] = y; pos[k++] = RZ * E * f * Math.cos(a);
      }
    }
    for (let j = 0; j < NY; j++) for (let i = 0; i < NA; i++) {
      const a = j * (NA + 1) + i, b = a + 1, c = a + NA + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, matCheveux);
    modele.add(m); cibles.push(m);
  })();

  /* ---------- langue tirée (3D, sort de la bouche vers l'avant et le bas) ---------- */
  (function () {
    const g = new THREE.CapsuleGeometry(0.07, 0.15, 6, 16);
    g.scale(1, 1, 0.5);
    g.rotateX(-0.45);
    g.translate(-0.04, -0.50, 0.69);
    const m = new THREE.Mesh(g, matLangue);
    modele.add(m); cibles.push(m);
  })();

  /* ---------- décalque du visage : yeux (clin d'œil), sourcils, bouche, joues ---------- */
  function texVisage() {
    const W = 1024, H = 888, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const S = W / (VX1 - VX0);
    const X = (x) => (x - VX0) * S, Y = (y) => (VY1 - y) * S;
    g.lineCap = 'round'; g.lineJoin = 'round';

    // joues
    [-0.40, 0.40].forEach((x) => {
      const gr = g.createRadialGradient(X(x), Y(-0.13), 0, X(x), Y(-0.13), 0.16 * S);
      gr.addColorStop(0, 'rgba(255,140,130,0.35)'); gr.addColorStop(1, 'rgba(255,140,130,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    });

    // œil ouvert (à droite sur l'écran)
    const ex = 0.30, ey = 0.12, erx = 0.105, ery = 0.125;
    g.save();
    g.beginPath(); g.ellipse(X(ex), Y(ey), erx * S, ery * S, 0, 0, Math.PI * 2); g.clip();
    g.fillStyle = '#fffdf9'; g.fillRect(0, 0, W, H);
    let gr = g.createLinearGradient(0, Y(ey + ery), 0, Y(ey + ery - 0.07));
    gr.addColorStop(0, 'rgba(60,35,25,0.35)'); gr.addColorStop(1, 'rgba(60,35,25,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const ix = X(ex + 0.004), iy = Y(ey - 0.005);
    gr = g.createRadialGradient(ix, iy, 0, ix, iy, 0.085 * S);
    gr.addColorStop(0, '#b88a45'); gr.addColorStop(0.65, '#7b552a'); gr.addColorStop(1, '#3a2410');
    g.fillStyle = gr; g.beginPath(); g.arc(ix, iy, 0.085 * S, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#120a06'; g.beginPath(); g.arc(ix, iy, 0.042 * S, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.95)';
    g.beginPath(); g.arc(ix + 0.03 * S, iy - 0.032 * S, 0.018 * S, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(ix - 0.026 * S, iy + 0.03 * S, 0.01 * S, 0, Math.PI * 2); g.fill();
    g.restore();
    g.strokeStyle = '#26150d'; g.lineWidth = 0.017 * S;
    g.beginPath(); g.ellipse(X(ex), Y(ey), erx * 1.04 * S, ery * 1.04 * S, 0, Math.PI * 1.03, Math.PI * 1.97); g.stroke();
    const ox = X(ex) + erx * 1.04 * S * Math.cos(Math.PI * 1.95), oy = Y(ey) + ery * 1.04 * S * Math.sin(Math.PI * 1.95);
    g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + 0.03 * S, oy - 0.02 * S); g.stroke();

    // œil qui fait un clin d'œil (à gauche sur l'écran)
    g.strokeStyle = '#26150d'; g.lineWidth = 0.02 * S;
    g.beginPath(); g.moveTo(X(-0.41), Y(0.10)); g.quadraticCurveTo(X(-0.30), Y(0.21), X(-0.19), Y(0.10)); g.stroke();
    g.lineWidth = 0.012 * S;
    g.beginPath(); g.moveTo(X(-0.41), Y(0.10)); g.lineTo(X(-0.445), Y(0.07)); g.stroke();

    // sourcils
    g.strokeStyle = '#3a2417'; g.lineWidth = 0.016 * S;
    g.beginPath(); g.moveTo(X(0.18), Y(0.30)); g.quadraticCurveTo(X(0.31), Y(0.375), X(0.44), Y(0.31)); g.stroke();
    g.beginPath(); g.moveTo(X(-0.43), Y(0.285)); g.quadraticCurveTo(X(-0.30), Y(0.34), X(-0.18), Y(0.295)); g.stroke();

    // bouche ouverte souriante
    const bouche = () => {
      g.beginPath(); g.moveTo(X(-0.26), Y(-0.28));
      g.quadraticCurveTo(X(0), Y(-0.245), X(0.26), Y(-0.28));
      g.bezierCurveTo(X(0.25), Y(-0.46), X(0.12), Y(-0.52), X(0), Y(-0.52));
      g.bezierCurveTo(X(-0.12), Y(-0.52), X(-0.25), Y(-0.46), X(-0.26), Y(-0.28));
      g.closePath();
    };
    bouche(); g.fillStyle = '#4a1a1c'; g.fill();
    g.save(); bouche(); g.clip();
    g.fillStyle = '#fbf7f2'; g.beginPath(); g.moveTo(X(-0.27), Y(-0.27));
    g.quadraticCurveTo(X(0), Y(-0.235), X(0.27), Y(-0.27));
    g.lineTo(X(0.25), Y(-0.34)); g.quadraticCurveTo(X(0), Y(-0.31), X(-0.25), Y(-0.34));
    g.closePath(); g.fill();
    g.restore();
    bouche(); g.lineWidth = 0.012 * S; g.strokeStyle = '#a9524f'; g.stroke();
    g.lineWidth = 0.01 * S;
    g.beginPath(); g.moveTo(X(0.27), Y(-0.27)); g.quadraticCurveTo(X(0.31), Y(-0.26), X(0.32), Y(-0.22)); g.stroke();
    g.beginPath(); g.moveTo(X(-0.27), Y(-0.27)); g.quadraticCurveTo(X(-0.31), Y(-0.26), X(-0.32), Y(-0.22)); g.stroke();
    return c;
  }
  (function () {
    const tex = new THREE.CanvasTexture(texVisage());
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const mat = new THREE.MeshStandardMaterial({
      map: tex, transparent: true, depthWrite: false, roughness: 0.55,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    });
    mat.onBeforeCompile = gelee;
    const GX = 48, GY = 42, pos = new Float32Array((GX + 1) * (GY + 1) * 3), uv = new Float32Array((GX + 1) * (GY + 1) * 2), idx = [];
    for (let j = 0, k = 0, q = 0; j <= GY; j++) for (let i = 0; i <= GX; i++, k += 3, q += 2) {
      const p = pointVisage(VX0 + (VX1 - VX0) * i / GX, VY0 + (VY1 - VY0) * j / GY, 0.004);
      pos[k] = p.x; pos[k + 1] = p.y; pos[k + 2] = p.z;
      uv[q] = i / GX; uv[q + 1] = j / GY;
    }
    for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
      const a = j * (GX + 1) + i, b = a + 1, c = a + GX + 1, d = c + 1;
      idx.push(a, b, d, a, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.renderOrder = 1;
    modele.add(m); // pas une cible : les stickers se collent sur la peau en dessous
  })();

  /* ============================================================
     STICKERS = BADGES
     ============================================================ */
  // enferme le sticker dans un badge rond à bord métallique
  function badge(src) {
    if (!BADGE_ROND) return src;
    const S = 512, R = S / 2, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d');
    g.beginPath(); g.arc(R, R, R - 4, 0, Math.PI * 2); g.fillStyle = FOND_BADGE; g.fill();
    g.save(); g.beginPath(); g.arc(R, R, R - 18, 0, Math.PI * 2); g.clip();
    const w = src.width, h = src.height, k = Math.min((S - 60) / w, (S - 60) / h);
    g.drawImage(src, R - w * k / 2, R - h * k / 2, w * k, h * k);
    g.restore();
    const gr = g.createLinearGradient(0, 0, S, S);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, '#aeb4be'); gr.addColorStop(0.65, '#f4f6f8'); gr.addColorStop(1, '#8e949e');
    g.strokeStyle = gr; g.lineWidth = 16; g.beginPath(); g.arc(R, R, R - 10, 0, Math.PI * 2); g.stroke();
    return c;
  }

  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const mats = o.textures.map((t) => {
    const tex = new THREE.CanvasTexture(badge(t.canvas));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = aniso;
    const holo = t.finition === 'holo';
    const m = new THREE.MeshPhysicalMaterial({
      map: tex, transparent: true, alphaTest: 0.02, depthWrite: false,
      roughness: holo ? 0.2 : 0.32, metalness: holo ? 0.22 : 0,
      clearcoat: 1, clearcoatRoughness: 0.05,
      iridescence: holo ? 1 : 0, iridescenceIOR: 1.6, iridescenceThicknessRange: [160, 640],
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    m.onBeforeCompile = gelee;
    return m;
  });

  /* ---------- maillage d'un sticker : grille posée sur la surface de la tête ---------- */
  const N = 8, NV = (N + 1) * (N + 1);
  const idx = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1;
    idx.push(a, b, d, a, d, c);
  }
  const indexAttr = new THREE.BufferAttribute(new Uint16Array(idx), 1);
  const uvs = new Float32Array(NV * 2);
  for (let j = 0, k = 0; j <= N; j++) for (let i = 0; i <= N; i++, k += 2) { uvs[k] = i / N; uvs[k + 1] = j / N; }
  const uvAttr = new THREE.BufferAttribute(uvs, 2);

  const stickers = []; // vivants (posés, en pose, ou en train de partir)
  let ordre = 0;

  // réserve de maillages créés d'avance (aucune allocation au moment du clic)
  const reserve = [];
  function nouveauMaillage() {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(NV * 3), nor = new Float32Array(NV * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('uv', uvAttr);
    geo.setIndex(indexAttr);
    const mesh = new THREE.Mesh(geo, mats[0]);
    mesh.frustumCulled = false;
    return { mesh, geo, pos, nor, sp: new Float32Array(NV * 3), sn: new Float32Array(NV * 3) };
  }
  for (let i = 0; i < o.max + 6; i++) reserve.push(nouveauMaillage());

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const rayV = new THREE.Raycaster();
  const qInv = new THREE.Quaternion();
  const vise = new THREE.Vector3(), visn = new THREE.Vector3();
  const pt = new THREE.Vector3(), nm = new THREE.Vector3(), vo = new THREE.Vector3(), vd = new THREE.Vector3();

  // projette la grille du sticker sur la vraie surface (une seule fois, à la création)
  function projeter(st) {
    const { c, n, T, B, sp, sn } = st;
    const s = st.taille, cr = Math.cos(st.rot), sr = Math.sin(st.rot);
    groupe.updateMatrixWorld(true);
    vd.copy(n).negate().transformDirection(modele.matrixWorld);
    for (let j = 0, k = 0; j <= N; j++) for (let i = 0; i <= N; i++, k += 3) {
      const u = i / N - 0.5, v = j / N - 0.5;
      const lx = (cr * u - sr * v) * s, ly = (sr * u + cr * v) * s;
      const px = c.x + T.x * lx + B.x * ly, py = c.y + T.y * lx + B.y * ly, pz = c.z + T.z * lx + B.z * ly;
      const rr = (u * u + v * v) * 4;                 // 0 au centre, 1 au bord du disque
      const H = 0.014 + 0.028 * (rr < 1 ? 1 - rr : 0); // épaisseur : bombé au centre
      vo.set(px + n.x * 0.4, py + n.y * 0.4, pz + n.z * 0.4);
      modele.localToWorld(vo);
      rayV.set(vo, vd);
      const hs = rayV.intersectObjects(cibles, false);
      if (hs.length) {
        const h = hs[0];
        pt.copy(h.point); modele.worldToLocal(pt);
        nm.copy(h.normal || h.face.normal).normalize();
        if (nm.dot(n) < 0) nm.negate();
        sp[k] = pt.x + nm.x * H; sp[k + 1] = pt.y + nm.y * H; sp[k + 2] = pt.z + nm.z * H;
        // effet bouton bombé : on incline la normale vers l'extérieur du disque
        const bx = cr * u - sr * v, by = sr * u + cr * v, g = rr < 1 ? 1.1 : 0.2;
        nm.x += (T.x * bx + B.x * by) * g; nm.y += (T.y * bx + B.y * by) * g; nm.z += (T.z * bx + B.z * by) * g;
        nm.normalize();
        sn[k] = nm.x; sn[k + 1] = nm.y; sn[k + 2] = nm.z;
      } else { // rien sous ce point : on reste dans le plan tangent
        sp[k] = px + n.x * H; sp[k + 1] = py + n.y * H; sp[k + 2] = pz + n.z * H;
        sn[k] = n.x; sn[k + 1] = n.y; sn[k + 2] = n.z;
      }
    }
  }

  function creerSticker(c, n, iMat, rot, taille) {
    const m = reserve.pop() || nouveauMaillage();
    const { mesh, geo, pos, nor, sp, sn } = m;
    mesh.material = mats[iMat];
    mesh.renderOrder = 10 + (ordre++);
    // repère local : T vers la droite de l'écran, B vers le haut, au moment du collage
    qInv.copy(groupe.quaternion).invert();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(qInv);
    if (Math.abs(up.dot(n)) > 0.97) up.set(1, 0, 0).applyQuaternion(qInv);
    const T = new THREE.Vector3().crossVectors(up, n).normalize();
    const B = new THREE.Vector3().crossVectors(n, T);
    const st = { mesh, geo, pos, nor, sp, sn, c: c.clone(), n: n.clone(), T, B, rot, taille: TAILLE * taille, t: 0, mode: 'pose', delai: 0, sens: Math.random() < 0.5 ? -1 : 1 };
    projeter(st);
    modele.add(mesh);
    stickers.push(st);
    placer(st, reduit ? 1 : 1.42, reduit ? 0 : 0.22, reduit ? 1 : 0, 0);
    if (reduit) st.mode = 'fixe';
    return st;
  }

  // bend 0 = sticker à plat qui flotte ; bend 1 = collé sur la surface
  function placer(st, sc, lift, bend, rx) {
    const { pos, nor, c, n, T, B, sp, sn } = st;
    const s = st.taille * sc, r = st.rot + rx, cr = Math.cos(r), sr = Math.sin(r);
    const h = 0.016 + lift;
    for (let j = 0, k = 0; j <= N; j++) for (let i = 0; i <= N; i++, k += 3) {
      const u = i / N - 0.5, v = j / N - 0.5;
      const lx = (cr * u - sr * v) * s, ly = (sr * u + cr * v) * s;
      const fx = c.x + T.x * lx + B.x * ly + n.x * h, fy = c.y + T.y * lx + B.y * ly + n.y * h, fz = c.z + T.z * lx + B.z * ly + n.z * h;
      const cx = c.x + (sp[k] - c.x) * sc, cy = c.y + (sp[k + 1] - c.y) * sc, cz = c.z + (sp[k + 2] - c.z) * sc;
      pos[k] = fx + (cx - fx) * bend; pos[k + 1] = fy + (cy - fy) * bend; pos[k + 2] = fz + (cz - fz) * bend;
      const nx = n.x + (sn[k] - n.x) * bend, ny = n.y + (sn[k + 1] - n.y) * bend, nz = n.z + (sn[k + 2] - n.z) * bend;
      const nl = 1 / Math.hypot(nx, ny, nz);
      nor[k] = nx * nl; nor[k + 1] = ny * nl; nor[k + 2] = nz * nl;
    }
    st.geo.attributes.position.needsUpdate = true;
    st.geo.attributes.normal.needsUpdate = true;
  }

  function retirer(st) {
    modele.remove(st.mesh);
    reserve.push({ mesh: st.mesh, geo: st.geo, pos: st.pos, nor: st.nor, sp: st.sp, sn: st.sn });
    const i = stickers.indexOf(st);
    if (i >= 0) stickers.splice(i, 1);
  }

  /* ---------- toucher / viser la tête ---------- */
  // renvoie le point touché (repère de la tête) et sa normale dans visn
  function viser(x, y, out, nOut) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    groupe.updateMatrixWorld(true);
    const hs = ray.intersectObjects(cibles, false);
    if (!hs.length) return null;
    const h = hs[0];
    out.copy(h.point); modele.worldToLocal(out);
    nOut.copy(h.normal || h.face.normal).normalize();
    qInv.copy(groupe.quaternion).invert();
    const dl = vd.copy(ray.ray.direction).applyQuaternion(qInv);
    if (nOut.dot(dl) > 0) nOut.negate();
    return out;
  }

  /* ---------- rotation, inertie, gelée, intro ---------- */
  let yaw = 0, pitch = 0, vx = 0, vy = 0, glisse = false, calme = 0, temps = 0;
  let tImpact = -1;
  let echelle = reduit ? 1 : 0.01, vEchelle = 0, introActive = reduit;
  groupe.scale.setScalar(echelle);

  function appliquer() {
    pitch = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, pitch));
    groupe.rotation.set(pitch, yaw, 0);
  }

  let rPx = 200;
  // stats de fluidité (définition adaptative)
  let nbImages = 0, cumul = 0, ecoule = 0;

  function frame(dt) {
    temps += dt;
    // rotation : glisser > inertie > retour face caméra avec léger balancement
    if (!glisse) {
      const amorti = Math.exp(-3.2 * dt);
      vx *= amorti; vy *= amorti;
      calme += dt;
      yaw += vx * dt; pitch += vy * dt;
      const retour = Math.min(1, Math.max(0, calme - 1.2));
      if (retour > 0) {
        const tour = Math.PI * 2;
        const cibleYaw = Math.round(yaw / tour) * tour + (reduit ? 0 : 0.32 * Math.sin(temps * 0.9) * retour);
        const ciblePitch = reduit ? 0 : 0.05 * Math.sin(temps * 0.7);
        const kk = 1 - Math.exp(-1.6 * dt * retour);
        yaw += (cibleYaw - yaw) * kk;
        pitch += (ciblePitch - pitch) * kk;
      }
      appliquer();
    }
    // intro : la tête gonfle avec un ressort
    if (introActive && echelle !== 1) {
      const a = (1 - echelle) * 160 - vEchelle * 12;
      vEchelle += a * dt; echelle += vEchelle * dt;
      if (Math.abs(1 - echelle) < 0.0005 && Math.abs(vEchelle) < 0.002) { echelle = 1; vEchelle = 0; }
      groupe.scale.setScalar(Math.max(0.01, echelle));
    }
    // gelée
    if (tImpact >= 0) {
      tImpact += dt;
      U.uWob.value = 0.9 * Math.exp(-4.2 * tImpact) * Math.cos(15 * tImpact);
      U.uDent.value = Math.exp(-9 * tImpact);
      if (tImpact > 2) { tImpact = -1; U.uWob.value = 0; U.uDent.value = 0; }
    }
    // stickers en mouvement
    for (let i = stickers.length - 1; i >= 0; i--) {
      const st = stickers[i];
      if (st.mode === 'pose') {
        st.t += dt; const k = Math.min(1, st.t / 0.55);
        const sc = 1 + 0.42 * Math.exp(-7 * k) * Math.cos(10 * k);
        const lift = 0.22 * Math.pow(Math.max(0, 1 - k * 2.6), 2);
        const b = Math.min(1, k * 2.4), bend = b * b * (3 - 2 * b);
        const rx = 0.5 * Math.pow(1 - k, 3) * st.sens;
        if (k >= 1) { placer(st, 1, 0, 1, 0); st.mode = 'fixe'; } else placer(st, sc, lift, bend, rx);
      } else if (st.mode === 'part') {
        if (st.delai > 0) { st.delai -= dt; continue; }
        st.t += dt; const k = Math.min(1, st.t / 0.42);
        if (k >= 1 || reduit) { retirer(st); continue; }
        placer(st, (1 - k * k) * (1 + 0.35 * k), 0.04 + 0.9 * k * k, 1 - Math.min(1, k * 2), k * 1.6 * st.sens);
      }
    }
    renderer.render(scene, camera);

    // définition adaptative : si la machine peine, on baisse la résolution
    ecoule += dt;
    if (ecoule > 2) { nbImages++; cumul += dt; }
    if (nbImages >= 90) {
      const moy = cumul / nbImages; nbImages = 0; cumul = 0;
      if (moy > 1 / 45 && ratio > 1) { ratio = Math.max(1, ratio - 0.5); renderer.setPixelRatio(ratio); redim(taillePx, rPx); }
    }
  }

  let taillePx = 600;
  function redim(taille, rayonPx) {
    taillePx = taille; rPx = rayonPx;
    renderer.setSize(taille, taille, false);
    camera.aspect = 1;
    const f = (taille / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const D = Math.sqrt((f / rayonPx) * (f / rayonPx) + 1);
    camera.position.set(0, 0, D);
    camera.lookAt(0, 0, 0);
    camera.near = Math.max(0.1, D - 4); camera.far = D + 4;
    camera.updateProjectionMatrix();
    return { f, D };
  }

  function nombre() { return stickers.filter((s) => s.mode !== 'part').length; }

  function coller(x, y, iMat, taille) {
    const c = viser(x, y, vise, visn);
    if (!c) return null;
    let retire = 0;
    const vivants = stickers.filter((s) => s.mode !== 'part');
    if (vivants.length >= o.max) { const vieux = vivants[0]; vieux.mode = 'part'; vieux.t = 0; retire = 1; }
    creerSticker(c, visn, iMat, (Math.random() - 0.5) * 0.9, taille || 1);
    if (!reduit) { U.uImpact.value.copy(c).normalize(); tImpact = 0; }
    vx *= 0.3; vy *= 0.3;
    return { retire };
  }

  async function prechauffer() {
    // un sticker de chaque matière (cachés dans la tête) pour compiler tous les shaders d'avance
    // + tous les maillages de la réserve, pour envoyer leurs tampons à la carte graphique dès maintenant
    const tests = reserve.map((r, i) => { r.mesh.material = mats[i % mats.length]; modele.add(r.mesh); return r.mesh; });
    try { if (renderer.compileAsync) await renderer.compileAsync(scene, camera); else renderer.compile(scene, camera); } catch (e) { renderer.compile(scene, camera); }
    renderer.render(scene, camera);
    tests.forEach((me) => modele.remove(me));
  }

  return {
    type: '3d',
    redim, frame, prechauffer, nombre,
    touche(x, y) { return !!viser(x, y, vise, visn); },
    debutGlisse() { glisse = true; vx = 0; vy = 0; calme = 0; },
    glisser(dx, dy, dt) {
      const k = 1 / rPx;
      yaw += dx * k; pitch += dy * k; appliquer();
      const lis = 1 - Math.exp(-dt * 20);
      vx += ((dx * k) / Math.max(dt, 1 / 240) - vx) * lis;
      vy += ((dy * k) / Math.max(dt, 1 / 240) - vy) * lis;
    },
    lacher() { glisse = false; calme = 0; vx = Math.max(-5, Math.min(5, vx * .6)); vy = Math.max(-5, Math.min(5, vy * .6)); },
    coller,
    collerAuHasard(iMat, taille) {
      // on vise au hasard autour du centre ; on réessaie si on tombe à côté de la tête
      const r = canvas.getBoundingClientRect();
      for (let essai = 0; essai < 14; essai++) {
        const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * rPx * 0.62;
        const res = coller(r.left + r.width / 2 + Math.cos(a) * d, r.top + r.height / 2 + Math.sin(a) * d, iMat, taille);
        if (res) return res;
      }
      return null;
    },
    decollerTout() {
      const vivants = stickers.filter((s) => s.mode !== 'part').reverse();
      vivants.forEach((st, i) => { st.mode = 'part'; st.t = 0; st.delai = i * 0.045; });
      return vivants.length;
    },
    intro() { introActive = true; },
    get ratio() { return ratio; },
  };
};
