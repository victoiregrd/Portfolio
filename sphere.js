* ============================================================
   Boule 3D à stickers — Three.js (chargé par index.html depuis le CDN)
   Script classique : main.js appelle creerSphere3D() quand Three est prêt.
   - matière pastel vernie (clearcoat + velouté), reflets d'un studio doux
   - un sticker = un petit maillage courbé qui épouse la boule (decal maison)
   - la boule fait « gelée » à l'impact ; les stickers suivent la déformation
   ============================================================ */
window.creerSphere3D = function (THREE, RoomEnvironment, o) {
  'use strict';
  const canvas = o.canvas, reduit = !!o.reduit;

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

  /* ---------- déformation « gelée » partagée (boule + stickers) ---------- */
  const U = { uImpact: { value: new THREE.Vector3(0, 0, 1) }, uWob: { value: 0 }, uDent: { value: 0 } };
  function gelee(sh) {
    sh.uniforms.uImpact = U.uImpact; sh.uniforms.uWob = U.uWob; sh.uniforms.uDent = U.uDent;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uImpact;\nuniform float uWob;\nuniform float uDent;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        { vec3 nn = normalize(position); float d = dot(nn, uImpact);
          transformed += nn * (-0.15 * uWob * (d * d - 0.3333) - 0.085 * uDent * pow(max(d, 0.0), 6.0)); }`);
  }

  const groupe = new THREE.Group();
  scene.add(groupe);
  const matBoule = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(o.couleur || '#CDB4F6'), roughness: 0.36, metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.05,
    sheen: 0.8, sheenRoughness: 0.45, sheenColor: new THREE.Color(o.reflet || '#FFC8DD'),
  });
  matBoule.onBeforeCompile = gelee;
  const boule = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), matBoule);
  groupe.add(boule);

  /* ---------- matières des stickers (une par sticker, partagée) ---------- */
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const mats = o.textures.map((t) => {
    const tex = new THREE.CanvasTexture(t.canvas);
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

  /* ---------- maillage d'un sticker : grille courbée sur la boule ---------- */
  const N = 14, NV = (N + 1) * (N + 1);
  const idx = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1;
    idx.push(a, b, d, a, d, c);
  }
  const indexAttr = new THREE.BufferAttribute(new Uint16Array(idx), 1);
  const uvs = new Float32Array(NV * 2);
  for (let j = 0, k = 0; j <= N; j++) for (let i = 0; i <= N; i++, k += 2) { uvs[k] = i / N; uvs[k + 1] = j / N; }
  const uvAttr = new THREE.BufferAttribute(uvs, 2);
  const TAILLE = 0.56; // diamètre d'un sticker (rayon de la boule = 1)

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
    return { mesh, geo, pos, nor };
  }
  for (let i = 0; i < o.max + 6; i++) reserve.push(nouveauMaillage());

  function creerSticker(c, iMat, rot, taille) {
    const m = reserve.pop() || nouveauMaillage();
    const { mesh, geo, pos, nor } = m;
    mesh.material = mats[iMat];
    mesh.renderOrder = 10 + (ordre++);
    // repère local : T vers la droite de l'écran, B vers le haut, au moment du collage
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(qInv.copy(groupe.quaternion).invert());
    if (Math.abs(up.dot(c)) > 0.97) up.set(1, 0, 0).applyQuaternion(qInv);
    const T = new THREE.Vector3().crossVectors(up, c).normalize();
    const B = new THREE.Vector3().crossVectors(c, T);
    const st = { mesh, geo, pos, nor, c: c.clone(), T, B, rot, taille: TAILLE * taille, t: 0, mode: 'pose', delai: 0, sens: Math.random() < 0.5 ? -1 : 1 };
    groupe.add(mesh);
    stickers.push(st);
    placer(st, reduit ? 1 : 1.42, reduit ? 0 : 0.22, reduit ? 1 : 0, 0);
    if (reduit) st.mode = 'fixe';
    return st;
  }

  function placer(st, sc, lift, bend, rx) {
    const { pos, nor, c, T, B } = st;
    const s = st.taille * sc, r = st.rot + rx, cr = Math.cos(r), sr = Math.sin(r);
    const h = 1.004 + lift;
    for (let j = 0, k = 0; j <= N; j++) for (let i = 0; i <= N; i++, k += 3) {
      const u = i / N - 0.5, v = j / N - 0.5;
      const lx = (cr * u - sr * v) * s, ly = (sr * u + cr * v) * s;
      const ox = c.x + T.x * lx + B.x * ly, oy = c.y + T.y * lx + B.y * ly, oz = c.z + T.z * lx + B.z * ly;
      const px = c.x * h + T.x * lx + B.x * ly, py = c.y * h + T.y * lx + B.y * ly, pz = c.z * h + T.z * lx + B.z * ly;
      const inv = h / Math.hypot(ox, oy, oz);
      const x = px + (ox * inv - px) * bend, y = py + (oy * inv - py) * bend, z = pz + (oz * inv - pz) * bend;
      pos[k] = x; pos[k + 1] = y; pos[k + 2] = z;
      const nl = 1 / Math.hypot(x, y, z);
      nor[k] = x * nl; nor[k + 1] = y * nl; nor[k + 2] = z * nl;
    }
    st.geo.attributes.position.needsUpdate = true;
    st.geo.attributes.normal.needsUpdate = true;
  }

  function retirer(st) {
    groupe.remove(st.mesh);
    reserve.push({ mesh: st.mesh, geo: st.geo, pos: st.pos, nor: st.nor });
    const i = stickers.indexOf(st);
    if (i >= 0) stickers.splice(i, 1);
  }

  /* ---------- toucher / viser la boule ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const sph = new THREE.Sphere(new THREE.Vector3(), 1), hit = new THREE.Vector3();
  const qInv = new THREE.Quaternion(), qTmp = new THREE.Quaternion();
  const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);

  function viser(x, y, out) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    sph.radius = groupe.scale.x;
    if (!ray.ray.intersectSphere(sph, hit)) return null;
    qInv.copy(groupe.quaternion).invert();
    return out.copy(hit).applyQuaternion(qInv).normalize();
  }

  /* ---------- rotation, inertie, gelée, intro ---------- */
  let vx = 0, vy = 0, glisse = false, autoF = reduit ? 0 : 1, calme = 0;
  let tImpact = -1;
  let echelle = reduit ? 1 : 0.01, vEchelle = 0, introActive = reduit;
  groupe.scale.setScalar(echelle);

  function tourner(ay, ax) {
    if (ay) { qTmp.setFromAxisAngle(AY, ay); groupe.quaternion.premultiply(qTmp); }
    if (ax) { qTmp.setFromAxisAngle(AX, ax); groupe.quaternion.premultiply(qTmp); }
  }

  let rPx = 200;
  // stats de fluidité (définition adaptative)
  let nbImages = 0, cumul = 0, ecoule = 0;

  function frame(dt) {
    // rotation : glisser > inertie > rotation auto douce
    if (!glisse) {
      const amorti = Math.exp(-3.2 * dt);
      vx *= amorti; vy *= amorti;
      calme += dt;
      if (!reduit) autoF += (Math.min(1, Math.max(0, calme - 1.5)) - autoF) * (1 - Math.exp(-1.5 * dt));
      tourner((vx + 0.16 * autoF) * dt, vy * dt);
      // redresse doucement l'inclinaison verticale
    }
    // intro : la boule gonfle avec un ressort
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

  const vise = new THREE.Vector3();
  function nombre() { return stickers.filter((s) => s.mode !== 'part').length; }

  function coller(x, y, iMat, taille) {
    const c = viser(x, y, vise);
    if (!c) return null;
    let retire = 0;
    const vivants = stickers.filter((s) => s.mode !== 'part');
    if (vivants.length >= o.max) { const vieux = vivants[0]; vieux.mode = 'part'; vieux.t = 0; retire = 1; }
    creerSticker(c, iMat, (Math.random() - 0.5) * 0.9, taille || 1);
    if (!reduit) { U.uImpact.value.copy(c); tImpact = 0; }
    vx *= 0.3; vy *= 0.3;
    return { retire };
  }

  async function prechauffer() {
    // un sticker de chaque matière (cachés derrière la boule) pour compiler tous les shaders d'avance
    // + tous les maillages de la réserve, pour envoyer leurs tampons à la carte graphique dès maintenant
    const tests = reserve.map((r, i) => { r.mesh.material = mats[i % mats.length]; groupe.add(r.mesh); return r.mesh; });
    try { if (renderer.compileAsync) await renderer.compileAsync(scene, camera); else renderer.compile(scene, camera); } catch (e) { renderer.compile(scene, camera); }
    renderer.render(scene, camera);
    tests.forEach((me) => groupe.remove(me));
  }

  return {
    type: '3d',
    redim, frame, prechauffer, nombre,
    touche(x, y) { return !!viser(x, y, vise); },
    debutGlisse() { glisse = true; vx = 0; vy = 0; calme = 0; autoF = 0; },
    glisser(dx, dy, dt) {
      const k = 1 / rPx;
      tourner(dx * k, dy * k);
      const lis = 1 - Math.exp(-dt * 20);
      vx += ((dx * k) / Math.max(dt, 1 / 240) - vx) * lis;
      vy += ((dy * k) / Math.max(dt, 1 / 240) - vy) * lis;
    },
    lacher() { glisse = false; calme = 0; vx = Math.max(-5, Math.min(5, vx * .6)); vy = Math.max(-5, Math.min(5, vy * .6)); },
    coller,
    collerAuHasard(iMat, taille) {
      const r = canvas.getBoundingClientRect();
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * rPx * 0.62;
      return coller(r.left + r.width / 2 + Math.cos(a) * d, r.top + r.height / 2 + Math.sin(a) * d, iMat, taille);
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
