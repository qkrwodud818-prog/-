import * as THREE from './vendor/three.module.js';
import { garmentGeometry } from './garment.js';

/** Open, shaped garment surfaces. Visualization only; not a sewing-pattern or cloth simulator. */
export function createGarmentVolume(design, materials) {
  const g = garmentGeometry(design), group = new THREE.Group(), meshes = [];
  const neck = design.neckline || (['hoodie', 'ziphoodie', 'denimhoodie'].includes(design.type) ? 'hood' : 'round');
  // Round the torso in depth as well as width so the profile is wearable,
  // rather than a front/back illustration pressed into a thin shell.
  const bodyDepth = Math.max(34, (g.right - g.left) * .28);
  const lerp = THREE.MathUtils.lerp;
  const projected = (p, view) => [(300 + (view === 'back' ? -p[0] : p[0])) / 600, (320 + p[1]) / 640];

  function surface(name, material, view, part, nu, nv, sample, uvMap) {
    const positions = [], uv = [], indices = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const u = i / nu, v = j / nv, p = sample(u, v);
      positions.push(...p); uv.push(...(uvMap ? uvMap(u, v, p) : projected(p, view)));
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material || materials.solidBody);
    mesh.name = name; mesh.userData = { view, part };
    if (![materials.front, materials.back, materials.left, materials.right, materials.leftInner, materials.rightInner].includes(material)) mesh.userData.editable = false;
    group.add(mesh); meshes.push(mesh); return mesh;
  }

  const neckHalf = 300 - g.neckLeft, chestHalf = 300 - g.left, hemHalf = 300 - g.hemLeft;
  const shoulderHalf = 300 - g.shoulderX;
  const neckZ = bodyDepth * .8;
  function topDepth(x) {
    const ax = Math.abs(x);
    return ax <= neckHalf ? neckZ * Math.sqrt(Math.max(0, 1 - (ax / neckHalf) ** 2))
      : bodyDepth * .65 * Math.sin(Math.PI * (ax - neckHalf) / Math.max(1, shoulderHalf - neckHalf));
  }
  function upperY(x, back) {
    const ax = Math.abs(x), depth = back ? g.backDepth : g.frontDepth;
    if (ax <= neckHalf) {
      const t = ax / neckHalf;
      return g.hps + depth * (neck === 'v' && !back ? 1 - t : 1 - t * t);
    }
    return lerp(g.hps, g.shoulderY, Math.min(1, (ax - neckHalf) / Math.max(1, shoulderHalf - neckHalf)));
  }
  function torso(u, v, back) {
    const t = u * 2 - 1;
    const w = v < .28 ? lerp(shoulderHalf, chestHalf, Math.sin(v / .28 * Math.PI / 2)) : lerp(chestHalf, hemHalf, (v - .28) / .72);
    const x = t * w, y = lerp(upperY(t * shoulderHalf, back), g.bottom, v);
    const round = Math.sqrt(Math.max(0, 1 - t * t));
    const drape = Math.sin(v * Math.PI) * Math.cos(t * Math.PI * 4) * 1.5;
    const fullness = bodyDepth * round * (.88 + .12 * Math.sin(v * Math.PI));
    const z = (back ? -1 : 1) * (lerp(topDepth(t * shoulderHalf), fullness, Math.min(1, v / .24)) + drape * round);
    return [x, 320 - y, z];
  }
  for (const back of [false, true]) surface(`body-${back ? 'back' : 'front'}`, back ? materials.back : materials.front,
    back ? 'back' : 'front', 'body', 64, 36, (u, v) => torso(u, v, back));

  // Join only the shoulder regions; leave the neckline and bottom genuinely open.
  for (const sign of [-1, 1]) surface(`shoulder-${sign}`, materials.solidBody, sign > 0 ? 'left' : 'right', 'body', 20, 12,
    (u, v) => {
      const x = sign * lerp(neckHalf, shoulderHalf, u), top = upperY(x, false);
      const depth = topDepth(x);
      return [x, 320 - top + Math.sin(v * Math.PI) * 2, lerp(-depth, depth, v)];
    });

  // A rolled open bottom gives the shell a cloth edge rather than a closed slab.
  surface('hem-edge', materials.solidRib, 'front', 'body', 80, 5, (u, v) => {
    const a = u * Math.PI * 2, inset = Math.sin(v * Math.PI) * 1.8;
    return [(hemHalf - inset) * Math.cos(a), 320 - g.bottom + v * 2,
      (bodyDepth * .88 - inset) * Math.sin(a)];
  });

  if (design.type !== 'tank' && Number(design.sleeve ?? 60) > 0) {
    for (const sign of [-1, 1]) {
      const side = sign > 0 ? 'left' : 'right';
      const outward = new THREE.Vector3(sign * Math.sin(g.angle), Math.cos(g.angle), 0);
      const start = new THREE.Vector3(sign * shoulderHalf, 320 - g.shoulderY, 0).addScaledVector(outward, -g.halfBicep * .45);
      const end = new THREE.Vector3(sign * (300 - g.cuffX), 320 - g.cuffY, 0);
      const length = start.distanceTo(end), ribStart = Math.max(.55, 1 - g.cuffRib / Math.max(length, 1));
      function sleeve(a, t, inset = 0) {
        const r = lerp(g.halfBicep * .62, g.halfCuff, t) - inset;
        const depth = lerp(g.halfBicep * .9, g.halfCuff, t) - inset;
        const p = start.clone().lerp(end, t);
        p.addScaledVector(outward, Math.cos(a) * r);
        p.z += Math.sin(a) * depth;
        // Small longitudinal folds preserve the parametric silhouette.
        p.addScaledVector(outward, Math.sin(t * Math.PI) * Math.sin(a * 5) * 1.2);
        return p.toArray();
      }
      const quarter = Math.PI / 4;
      const sections = [
        { name: 'outer', a: -quarter, b: quarter, view: side, material: materials[side], side: true },
        { name: 'front', a: quarter, b: Math.PI - quarter, view: 'front', material: materials.front },
        { name: 'inner', a: Math.PI - quarter, b: Math.PI + quarter, view: side, material: materials[side+'Inner'], side:true },
        { name: 'back', a: Math.PI + quarter, b: Math.PI * 2 - quarter, view: 'back', material: materials.back },
      ];
      for (const section of sections) {
        const uvMap = section.side ? (u, v) => [u, 1 - v] : null;
        const mesh=surface(`${side}-sleeve-${section.name}`, section.material, section.view, 'sleeve', 20, 36,
          (u, v) => sleeve(lerp(section.a, section.b, u), v), uvMap);
        mesh.userData.seam=section.name==='inner'?'inner':'outer';
      }
      // Cloth thickness on the open cuff, never a cap across the sleeve opening.
      surface(`${side}-cuff-edge`, materials.solidRib, side, 'sleeve', 64, 4,
        (u, v) => sleeve(u * Math.PI * 2, 1 - Math.sin(v * Math.PI) * .004, v * 2));
      // A subtle raised cuff seam follows the same tube and leaves the opening intact.
      if (g.cuffRib > 0) surface(`${side}-cuff-seam`, materials.solidRib, side, 'sleeve', 64, 3,
        (u, v) => sleeve(u * Math.PI * 2, ribStart + v * .004, -.65));
    }
  }

  // Neck opening is an elliptic loop, with a hollow raised tube for mock / turtle necks.
  const collarHeight = neck === 'turtle' ? 42 : neck === 'mock' ? 22 : 4;
  surface('open-neckband', materials.solidHood, 'front', 'hood', 72, 8, (u, v) => {
    const a = u * Math.PI * 2, x = neckHalf * Math.cos(a), front = Math.sin(a) >= 0;
    const drop = (front ? g.frontDepth : g.backDepth) * Math.sin(a) ** 2;
    return [x * (1 + .018 * Math.sin(v * Math.PI)), 320 - g.hps - drop + collarHeight * v, neckZ * Math.sin(a)];
  });

  if (neck === 'hood') {
    // Open face and bottom: curved hood shell wraps from left cheek around the back to right cheek.
    const hoodWidth = neckHalf + 14, hoodHeight = 106, hoodDepth = neckZ + 24;
    surface('hollow-hood', materials.solidHood, 'back', 'hood', 56, 30, (u, v) => {
      const a = lerp(-Math.PI * .13, Math.PI * 1.13, u);
      const radius = Math.sqrt(Math.max(0, 1 - v * v));
      return [Math.cos(a) * hoodWidth * radius, 320 - g.hps + v * hoodHeight,
        -Math.sin(a) * hoodDepth * radius - 6];
    });
    for (const side of [0, 1]) surface(`hood-opening-edge-${side}`, materials.solidRib, 'front', 'hood', 30, 3,
      (u, v) => {
        const a = (side ? Math.PI * 1.13 : -Math.PI * .13) + (v - .5) * .03;
        const radius = Math.sqrt(Math.max(0, 1 - u * u));
        return [Math.cos(a) * hoodWidth * radius, 320 - g.hps + u * hoodHeight,
          -Math.sin(a) * hoodDepth * radius - 6];
      });
  }
  group.userData = { kind: 'parametric-garment', physicalSimulation: false };
  return { group, meshes };
}
