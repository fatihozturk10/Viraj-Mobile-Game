import * as THREE from 'three';
import { LiveryId, PaintFinishId } from '../types/game';

/**
 * Parametric longitudinal cross-section station for sculpted automotive sheet metal.
 * Local Z runs from negative (front nose) to positive (rear tail).
 */
export interface BodyStation {
  z: number;
  bottomY: number;
  bottomHalfW: number;
  rockerY: number;
  rockerHalfW: number;
  beltY: number;
  beltHalfW: number;
  shoulderY: number;
  shoulderHalfW: number;
  crownY: number;
}

export interface CabinStation {
  z: number;
  baseY: number;
  baseHalfW: number;
  roofY: number;
  roofHalfW: number;
  crownY: number;
}

export interface BodySculptOptions {
  subdivisions?: number;
  wheelBaseHalf?: number;
  wheelRadius?: number;
  frontWheelRadius?: number;
  rearWheelRadius?: number;
  waistPinch?: number;
  fenderFlare?: number;
  hoodRidge?: number;
  creaseAngleDeg?: number;
  pickupBed?: {
    startZ: number;
    endZ: number;
    floorY: number;
    wallHalfW: number;
  };
}

/**
 * Splits shared vertices across hard automotive crease edges whose dihedral angle
 * exceeds `creaseAngleDeg`, while keeping smooth panels (hood crown, roof dome,
 * curved fenders) silky-smooth. Eliminates "melted soap-bar" shading forever.
 */
export function applyCreaseNormals(
  indexedGeo: THREE.BufferGeometry,
  creaseAngleDeg = 32,
): THREE.BufferGeometry {
  const geo = indexedGeo.index ? indexedGeo.toNonIndexed() : indexedGeo.clone();
  const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
  const vCount = posAttr.count;
  const triCount = Math.floor(vCount / 3);

  const faceNormals = new Float32Array(triCount * 3);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const fn = new THREE.Vector3();

  // Group vertices by quantized spatial position so coincident vertices across
  // smooth quads share averaged normals while hard edges stay razor sharp.
  const bucketMap = new Map<string, number[]>();
  const keyOf = (x: number, y: number, z: number): string =>
    `${Math.round(x * 2000)},${Math.round(y * 2000)},${Math.round(z * 2000)}`;

  for (let t = 0; t < triCount; t++) {
    const i0 = t * 3;
    const i1 = i0 + 1;
    const i2 = i0 + 2;
    a.fromBufferAttribute(posAttr, i0);
    b.fromBufferAttribute(posAttr, i1);
    c.fromBufferAttribute(posAttr, i2);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    fn.crossVectors(ab, ac);
    const len = fn.length();
    if (len > 1e-8) {
      fn.divideScalar(len);
    } else {
      fn.set(0, 1, 0);
    }
    faceNormals[t * 3] = fn.x;
    faceNormals[t * 3 + 1] = fn.y;
    faceNormals[t * 3 + 2] = fn.z;

    for (let k = 0; k < 3; k++) {
      const vi = i0 + k;
      const key = keyOf(posAttr.getX(vi), posAttr.getY(vi), posAttr.getZ(vi));
      let arr = bucketMap.get(key);
      if (!arr) {
        arr = [];
        bucketMap.set(key, arr);
      }
      arr.push(vi);
    }
  }

  const cosThresh = Math.cos(THREE.MathUtils.degToRad(creaseAngleDeg));
  const outNormals = new Float32Array(vCount * 3);

  for (let t = 0; t < triCount; t++) {
    const fnx = faceNormals[t * 3];
    const fny = faceNormals[t * 3 + 1];
    const fnz = faceNormals[t * 3 + 2];

    for (let k = 0; k < 3; k++) {
      const vi = t * 3 + k;
      const key = keyOf(posAttr.getX(vi), posAttr.getY(vi), posAttr.getZ(vi));
      const neighbors = bucketMap.get(key);
      let nx = fnx;
      let ny = fny;
      let nz = fnz;

      if (neighbors && neighbors.length > 1) {
        nx = 0;
        ny = 0;
        nz = 0;
        for (let m = 0; m < neighbors.length; m++) {
          const nt = Math.floor(neighbors[m] / 3);
          const onx = faceNormals[nt * 3];
          const ony = faceNormals[nt * 3 + 1];
          const onz = faceNormals[nt * 3 + 2];
          if (fnx * onx + fny * ony + fnz * onz >= cosThresh) {
            nx += onx;
            ny += ony;
            nz += onz;
          }
        }
        const nLen = Math.hypot(nx, ny, nz);
        if (nLen > 1e-6) {
          nx /= nLen;
          ny /= nLen;
          nz /= nLen;
        } else {
          nx = fnx;
          ny = fny;
          nz = fnz;
        }
      }

      outNormals[vi * 3] = nx;
      outNormals[vi * 3 + 1] = ny;
      outNormals[vi * 3 + 2] = nz;
    }
  }

  geo.setAttribute('normal', new THREE.Float32BufferAttribute(outNormals, 3));
  indexedGeo.dispose();
  return geo;
}

function sampleStationHermite(
  stations: BodyStation[],
  idx: number,
  t: number,
): BodyStation {
  const n = stations.length;
  const p0 = stations[Math.max(0, idx - 1)];
  const p1 = stations[idx];
  const p2 = stations[Math.min(n - 1, idx + 1)];
  const p3 = stations[Math.min(n - 1, idx + 2)];

  const t2 = t * t;
  const t3 = t2 * t;

  const evalField = (key: keyof BodyStation): number => {
    const v0 = p0[key];
    const v1 = p1[key];
    const v2 = p2[key];
    const v3 = p3[key];
    const m1 = idx === 0 ? (v2 - v1) * 0.78 : (v2 - v0) * 0.3;
    const m2 = idx >= n - 2 ? (v2 - v1) * 0.78 : (v3 - v1) * 0.3;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    return h00 * v1 + h10 * m1 + h01 * v2 + h11 * m2;
  };

  return {
    z: p1.z + (p2.z - p1.z) * t,
    bottomY: evalField('bottomY'),
    bottomHalfW: evalField('bottomHalfW'),
    rockerY: evalField('rockerY'),
    rockerHalfW: evalField('rockerHalfW'),
    beltY: evalField('beltY'),
    beltHalfW: evalField('beltHalfW'),
    shoulderY: evalField('shoulderY'),
    shoulderHalfW: evalField('shoulderHalfW'),
    crownY: evalField('crownY'),
  };
}

export function sampleBodyStationAtZ(
  stations: BodyStation[],
  z: number,
): BodyStation {
  if (z <= stations[0].z) return stations[0];
  const last = stations.length - 1;
  if (z >= stations[last].z) return stations[last];
  for (let i = 0; i < last; i++) {
    const a = stations[i];
    const b = stations[i + 1];
    if (z >= a.z && z <= b.z) {
      const t = (z - a.z) / Math.max(1e-5, b.z - a.z);
      return sampleStationHermite(stations, i, t);
    }
  }
  return stations[last];
}

/**
 * Generates an adaptive-resolution sculpted automotive sheet-metal body mesh with:
 * - Dense longitudinal sampling directly around front & rear wheel arches for TRUE circular cutouts
 * - Sculpted muscular fender haunches + coke-bottle waist undercut + optional hood power ridge
 * - Optional true recessed hollow cargo bed for pickup trucks
 * - Crisp auto-smooth hard-crease normals so studio highlights snap cleanly across every body line
 */
export function buildSculptedBodyGeometry(
  rawStations: BodyStation[],
  options: BodySculptOptions = {},
): THREE.BufferGeometry {
  const subs = Math.max(1, options.subdivisions ?? 2);
  const wbHalf = options.wheelBaseHalf ?? 0;
  const frontR = options.frontWheelRadius ?? options.wheelRadius ?? 0;
  const rearR = options.rearWheelRadius ?? options.wheelRadius ?? 0;
  const waistPinch = options.waistPinch ?? 0.04;
  const fenderFlare = options.fenderFlare ?? 0.032;
  const hoodRidge = options.hoodRidge ?? 0.0;
  const creaseDeg = options.creaseAngleDeg ?? 32;
  const pickupBed = options.pickupBed;

  const minZ = rawStations[0].z;
  const maxZ = rawStations[rawStations.length - 1].z;

  // Build sorted adaptive Z sample list: base Hermite divisions + exact semicircular wheel-arch points
  const zSet: number[] = [];
  for (let i = 0; i < rawStations.length - 1; i++) {
    const za = rawStations[i].z;
    const zb = rawStations[i + 1].z;
    for (let s = 0; s < subs; s++) {
      zSet.push(za + ((zb - za) * s) / subs);
    }
  }
  zSet.push(maxZ);

  const injectArchZs = (axleZ: number, rad: number) => {
    if (rad <= 0) return;
    const span = rad * 1.18;
    const angles = [0, 0.16, 0.34, 0.5, 0.66, 0.84, 1.0];
    for (const frac of angles) {
      const ang = frac * Math.PI;
      const zVal = axleZ - Math.cos(ang) * span;
      if (zVal > minZ + 0.04 && zVal < maxZ - 0.04) {
        zSet.push(zVal);
      }
    }
    // Tight guard stations right outside arch edges so rocker transitions crisply
    for (const edge of [axleZ - span - 0.035, axleZ + span + 0.035]) {
      if (edge > minZ + 0.04 && edge < maxZ - 0.04) {
        zSet.push(edge);
      }
    }
  };

  if (wbHalf > 0) {
    injectArchZs(-wbHalf, frontR);
    injectArchZs(wbHalf, rearR);
  }
  if (pickupBed) {
    zSet.push(
      pickupBed.startZ - 0.02,
      pickupBed.startZ + 0.02,
      pickupBed.endZ - 0.02,
      pickupBed.endZ + 0.02,
    );
  }

  zSet.sort((a, b) => a - b);
  const uniqueZs: number[] = [];
  for (let i = 0; i < zSet.length; i++) {
    if (uniqueZs.length === 0 || zSet[i] - uniqueZs[uniqueZs.length - 1] > 0.014) {
      uniqueZs.push(zSet[i]);
    }
  }
  if (Math.abs(uniqueZs[uniqueZs.length - 1] - maxZ) > 0.005) {
    uniqueZs.push(maxZ);
  }

  const stations = uniqueZs.map((z) => sampleBodyStationAtZ(rawStations, z));
  const n = stations.length;

  // 14-point perimeter cross-section CCW viewed from +Z:
  // Preserves exact UV layout (u=0.5 center crown, 0.16..0.38 right flank, 0.62..0.84 left flank)
  const M = 14;
  const RING_U = [
    0.0, 0.08, 0.16, 0.24, 0.31, 0.38, 0.44, 0.5, 0.56, 0.62, 0.69, 0.76, 0.84,
    0.92,
  ];

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const spanZ = Math.max(0.01, maxZ - minZ);
  const frontSpan = frontR * 1.18;
  const rearSpan = rearR * 1.18;

  for (let i = 0; i < n; i++) {
    const s = stations[i];
    const v = (s.z - minZ) / spanZ;

    let botY = s.bottomY + 0.014;
    let botW = s.bottomHalfW;
    let rockY = s.rockerY;
    let rockW = s.rockerHalfW;
    let doorW = (s.rockerHalfW + s.beltHalfW) * 0.5 + 0.012;
    let doorY = s.rockerY + (s.beltY - s.rockerY) * 0.54;
    let beltW = s.beltHalfW;
    let shW = s.shoulderHalfW;
    let crownY = s.crownY;

    // Analytical semicircular wheel-well cutout & muscular blistered fender arch
    if (wbHalf > 0) {
      const dzF = Math.abs(s.z + wbHalf);
      const dzR = Math.abs(s.z - wbHalf);
      const inFront = frontR > 0 && dzF < frontSpan;
      const inRear = rearR > 0 && dzR < rearSpan;

      if (inFront || inRear) {
        const useFront = inFront && (!inRear || dzF <= dzR);
        const rad = useFront ? frontR : rearR;
        const span = useFront ? frontSpan : rearSpan;
        const dz = useFront ? dzF : dzR;
        const uArch = Math.min(1, dz / span);
        const circleH = Math.sqrt(Math.max(0, 1 - uArch * uArch));
        const smoothArch = circleH * circleH * (3 - 2 * circleH);

        // True circular wheel-arch ceiling rising cleanly above the tire tread
        const archTopY = Math.min(
          s.beltY - 0.036,
          rad * 0.88 + circleH * (rad * 0.92),
        );
        rockY = Math.max(rockY, archTopY);
        botY = Math.min(
          rockY - 0.018,
          Math.max(botY, s.bottomY + circleH * (rad * 0.72)),
        );
        doorY = Math.max(doorY, rockY + (s.beltY - rockY) * 0.5);

        // Tuck bottom sill sharply inward around tire cavity, flare upper fender outward
        botW -= smoothArch * 0.24;
        rockW -= smoothArch * 0.08;
        doorW += smoothArch * (fenderFlare * 0.65);
        beltW += smoothArch * fenderFlare;
        shW += smoothArch * (fenderFlare * 0.72);
      } else if (
        waistPinch > 0 &&
        s.z > -wbHalf + frontSpan * 0.85 &&
        s.z < wbHalf - rearSpan * 0.85
      ) {
        const spanMid = Math.max(0.25, wbHalf - frontSpan * 0.85);
        const midFactor = Math.max(0, 1 - Math.pow(s.z / spanMid, 2));
        doorW -= waistPinch * midFactor;
        rockW -= waistPinch * 0.42 * midFactor;
      }
    }

    // Optional hood power-dome / sculpted V-crease along front hood
    if (hoodRidge > 0 && s.z < -0.55 && s.z > minZ + 0.14) {
      const hoodSpan = Math.max(0.4, -0.55 - (minZ + 0.14));
      const hFrac = (s.z - (minZ + 0.14)) / hoodSpan;
      crownY += Math.sin(hFrac * Math.PI) * hoodRidge;
    }

    botY = Math.min(botY, rockY - 0.012);
    doorY = Math.min(s.beltY - 0.012, Math.max(doorY, rockY + 0.012));

    let hoodInnerW = shW * 0.54;
    let hoodInnerY = s.shoulderY + (crownY - s.shoulderY) * 0.66;

    // True recessed hollow cargo bed for pickup trucks!
    if (pickupBed && s.z >= pickupBed.startZ && s.z <= pickupBed.endZ) {
      hoodInnerW = Math.min(shW - 0.04, pickupBed.wallHalfW);
      hoodInnerY = pickupBed.floorY;
      crownY = pickupBed.floorY;
    }

    const ring: [number, number][] = [
      [0, s.bottomY],
      [botW, botY],
      [rockW, rockY],
      [doorW, doorY],
      [beltW, s.beltY],
      [shW, s.shoulderY],
      [hoodInnerW, hoodInnerY],
      [0, crownY],
      [-hoodInnerW, hoodInnerY],
      [-shW, s.shoulderY],
      [-beltW, s.beltY],
      [-doorW, doorY],
      [-rockW, rockY],
      [-botW, botY],
    ];

    for (let j = 0; j < M; j++) {
      positions.push(ring[j][0], ring[j][1], s.z);
      uvs.push(RING_U[j], v);
    }
  }

  for (let i = 0; i < n - 1; i++) {
    const baseA = i * M;
    const baseB = (i + 1) * M;
    for (let j = 0; j < M; j++) {
      const jNext = (j + 1) % M;
      const a0 = baseA + j;
      const a1 = baseA + jNext;
      const b0 = baseB + j;
      const b1 = baseB + jNext;
      indices.push(a0, a1, b1);
      indices.push(a0, b1, b0);
    }
  }

  // Front nose cap
  const f = stations[0];
  const fStart = positions.length / 3;
  for (let j = 0; j < M; j++) {
    const idx = j * 3;
    positions.push(positions[idx], positions[idx + 1], positions[idx + 2]);
    uvs.push(0.5 + positions[idx] * 0.28, 0.04 + positions[idx + 1] * 0.14);
  }
  const fCenter = positions.length / 3;
  positions.push(0, (f.bottomY + f.crownY) * 0.5, f.z);
  uvs.push(0.5, 0.06);
  for (let j = 0; j < M; j++) {
    indices.push(fCenter, fStart + ((j + 1) % M), fStart + j);
  }

  // Rear fascia cap
  const r = stations[n - 1];
  const rBase = (n - 1) * M * 3;
  const rStart = positions.length / 3;
  for (let j = 0; j < M; j++) {
    const idx = rBase + j * 3;
    positions.push(positions[idx], positions[idx + 1], positions[idx + 2]);
    uvs.push(0.5 + positions[idx] * 0.28, 0.94 + positions[idx + 1] * 0.14);
  }
  const rCenter = positions.length / 3;
  positions.push(0, (r.bottomY + r.crownY) * 0.5, r.z);
  uvs.push(0.5, 0.95);
  for (let j = 0; j < M; j++) {
    indices.push(rCenter, rStart + j, rStart + ((j + 1) % M));
  }

  const rawGeo = new THREE.BufferGeometry();
  rawGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  rawGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  rawGeo.setIndex(indices);

  return applyCreaseNormals(rawGeo, creaseDeg);
}

/**
 * Generates a curved tumblehome automotive greenhouse glass shell with smooth
 * bowed side glass and crisp corner transitions (roof cap omitted when solid roof sits above).
 */
export function buildCabinGlassGeometry(
  stations: CabinStation[],
  omitRoofCap = true,
  creaseDeg = 36,
): THREE.BufferGeometry {
  const n = stations.length;
  const M = 10;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const minZ = stations[0].z;
  const spanZ = Math.max(0.01, stations[n - 1].z - minZ);

  for (let i = 0; i < n; i++) {
    const s = stations[i];
    const v = (s.z - minZ) / spanZ;
    const midGlassY = s.baseY + (s.roofY - s.baseY) * 0.52;
    const glassH = Math.max(0, s.roofY - s.baseY);
    const tumbleBow = Math.min(0.024, glassH * 0.055);
    const midGlassW = (s.baseHalfW + s.roofHalfW) * 0.5 + tumbleBow;
    const roofShoulderW = s.roofHalfW * 0.55;
    const roofShoulderY = s.roofY + (s.crownY - s.roofY) * 0.72;

    const ring: [number, number][] = [
      [0, s.baseY],
      [s.baseHalfW, s.baseY],
      [midGlassW, midGlassY],
      [s.roofHalfW, s.roofY],
      [roofShoulderW, roofShoulderY],
      [0, s.crownY],
      [-roofShoulderW, roofShoulderY],
      [-s.roofHalfW, s.roofY],
      [-midGlassW, midGlassY],
      [-s.baseHalfW, s.baseY],
    ];
    for (let j = 0; j < M; j++) {
      positions.push(ring[j][0], ring[j][1], s.z);
      uvs.push(j / M, v);
    }
  }

  for (let i = 0; i < n - 1; i++) {
    const baseA = i * M;
    const baseB = (i + 1) * M;
    for (let j = 0; j < M; j++) {
      if (omitRoofCap && i === 1 && j >= 3 && j <= 6) {
        continue;
      }
      const jNext = (j + 1) % M;
      const a0 = baseA + j;
      const a1 = baseA + jNext;
      const b0 = baseB + j;
      const b1 = baseB + jNext;
      indices.push(a0, a1, b1);
      indices.push(a0, b1, b0);
    }
  }

  // Front & rear glass end caps
  const f = stations[0];
  const fStart = positions.length / 3;
  for (let j = 0; j < M; j++) {
    const idx = j * 3;
    positions.push(positions[idx], positions[idx + 1], positions[idx + 2]);
    uvs.push(0.5 + positions[idx] * 0.3, 0.5 + positions[idx + 1] * 0.3);
  }
  const fCenter = positions.length / 3;
  positions.push(0, (f.baseY + f.crownY) * 0.5, f.z);
  uvs.push(0.5, 0.5);
  for (let j = 0; j < M; j++) {
    indices.push(fCenter, fStart + ((j + 1) % M), fStart + j);
  }

  const r = stations[n - 1];
  const rBase = (n - 1) * M * 3;
  const rStart = positions.length / 3;
  for (let j = 0; j < M; j++) {
    const idx = rBase + j * 3;
    positions.push(positions[idx], positions[idx + 1], positions[idx + 2]);
    uvs.push(0.5 + positions[idx] * 0.3, 0.5 + positions[idx + 1] * 0.3);
  }
  const rCenter = positions.length / 3;
  positions.push(0, (r.baseY + r.crownY) * 0.5, r.z);
  uvs.push(0.5, 0.5);
  for (let j = 0; j < M; j++) {
    indices.push(rCenter, rStart + j, rStart + ((j + 1) % M));
  }

  const rawGeo = new THREE.BufferGeometry();
  rawGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  rawGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  rawGeo.setIndex(indices);
  return applyCreaseNormals(rawGeo, creaseDeg);
}

/**
 * Flush softly crowned painted/carbon roof panel directly matching the greenhouse stations,
 * with solid sheet-metal header lips and continuous UVs so racing stripes flow over the roof.
 */
export function buildRoofPanelGeometry(
  c1: CabinStation,
  c2: CabinStation,
): THREE.BufferGeometry {
  const rows = 5;
  const cols = 8;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const lift = 0.02;
  const thick = 0.018;

  for (let r = 0; r <= rows; r++) {
    const v = r / rows;
    const z = c1.z - 0.012 + (c2.z - c1.z + 0.024) * v;
    const halfW = c1.roofHalfW + (c2.roofHalfW - c1.roofHalfW) * v + 0.02;
    const edgeY = c1.roofY + (c2.roofY - c1.roofY) * v + lift;
    const crownY = c1.crownY + (c2.crownY - c1.crownY) * v + lift + 0.012;
    const longBow = Math.sin(v * Math.PI) * 0.016;

    for (let c = 0; c <= cols; c++) {
      const u = c / cols;
      const s = 1 - 2 * u;
      const x = s * halfW;
      const arch = Math.max(0, 1 - s * s);
      const y = edgeY + (crownY - edgeY) * Math.pow(arch, 0.72) + longBow;
      positions.push(x, y, z);
      uvs.push(0.36 + u * 0.28, 0.32 + v * 0.36);
    }
  }

  const stride = cols + 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a0 = r * stride + c;
      const a1 = a0 + 1;
      const b0 = (r + 1) * stride + c;
      const b1 = b0 + 1;
      indices.push(a0, a1, b1);
      indices.push(a0, b1, b0);
    }
  }

  const addEdgeLip = (rowIdx: number, flip: boolean) => {
    const baseOffset = positions.length / 3;
    for (let c = 0; c <= cols; c++) {
      const src = (rowIdx * stride + c) * 3;
      const x = positions[src];
      const y = positions[src + 1];
      const z = positions[src + 2];
      positions.push(x, y, z);
      uvs.push(0.5, 0.5);
      positions.push(x, y - thick, z);
      uvs.push(0.5, 0.5);
    }
    for (let c = 0; c < cols; c++) {
      const t0 = baseOffset + c * 2;
      const b0 = t0 + 1;
      const t1 = t0 + 2;
      const b1 = t0 + 3;
      if (flip) {
        indices.push(t0, t1, b1, t0, b1, b0);
      } else {
        indices.push(t0, b1, t1, t0, b0, b1);
      }
    }
  };
  addEdgeLip(0, false);
  addEdgeLip(rows, true);

  const rawGeo = new THREE.BufferGeometry();
  rawGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  rawGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  rawGeo.setIndex(indices);
  return applyCreaseNormals(rawGeo, 42);
}

/**
 * Flush curved fender arch flare band that wraps cleanly around the carved wheel opening
 * without looking like a floating tube.
 */
export function buildArchLipGeometry(
  radius: number,
  lipRadialW: number,
  lipDepthX: number,
  segments = 22,
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const innerR = radius;
  const outerR = radius + lipRadialW;
  for (let i = 0; i <= segments; i++) {
    const ang = (i / segments) * Math.PI;
    const x = Math.cos(ang) * outerR;
    const y = Math.sin(ang) * outerR;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  for (let i = segments; i >= 0; i--) {
    const ang = (i / segments) * Math.PI;
    const x = Math.cos(ang) * innerR;
    const y = Math.sin(ang) * innerR;
    shape.lineTo(x, y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: lipDepthX,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: 1,
  });
  geo.translate(0, 0, -lipDepthX * 0.5);
  geo.rotateY(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

const _strutDir = new THREE.Vector3();
const _strutMid = new THREE.Vector3();
const _strutAxisX = new THREE.Vector3();
const _strutAxisZ = new THREE.Vector3();
const _strutHint = new THREE.Vector3();
const _strutMat4 = new THREE.Matrix4();

/**
 * Mathematically exact oriented structural pillar/rail connecting pStart -> pEnd.
 * Guarantees pillars always match the true greenhouse slope with zero inversion.
 */
export function addOrientedStrut(
  parent: THREE.Object3D,
  unitBoxGeo: THREE.BufferGeometry,
  pStart: [number, number, number],
  pEnd: [number, number, number],
  thickOut: number,
  thickSide: number,
  material: THREE.Material,
  outwardHint: [number, number, number],
  extraLen = 0.012,
): THREE.Mesh {
  _strutDir.set(pEnd[0] - pStart[0], pEnd[1] - pStart[1], pEnd[2] - pStart[2]);
  const len = Math.max(0.01, _strutDir.length());
  _strutDir.divideScalar(len);

  _strutHint.set(outwardHint[0], outwardHint[1], outwardHint[2]);
  if (_strutHint.lengthSq() < 1e-6) _strutHint.set(1, 0, 0);
  _strutHint.normalize();

  _strutAxisZ.crossVectors(_strutHint, _strutDir);
  if (_strutAxisZ.lengthSq() < 1e-5) {
    _strutHint.set(0, 1, 0);
    _strutAxisZ.crossVectors(_strutHint, _strutDir);
  }
  _strutAxisZ.normalize();
  _strutAxisX.crossVectors(_strutDir, _strutAxisZ).normalize();

  _strutMid.set(
    (pStart[0] + pEnd[0]) * 0.5,
    (pStart[1] + pEnd[1]) * 0.5,
    (pStart[2] + pEnd[2]) * 0.5,
  );

  const mesh = new THREE.Mesh(unitBoxGeo, material);
  mesh.position.copy(_strutMid);
  _strutMat4.makeBasis(_strutAxisX, _strutDir, _strutAxisZ);
  mesh.quaternion.setFromRotationMatrix(_strutMat4);
  mesh.scale.set(thickOut, len + extraLen, thickSide);
  parent.add(mesh);
  return mesh;
}

/**
 * Extrudes a 2D (z, y) side silhouette profile centered across X width with crisp bevels.
 */
export function createExtrudedShapeGeo(
  pointsZY: [number, number][],
  width: number,
  bevel = 0.03,
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  pointsZY.forEach(([z, y], idx) => {
    if (idx === 0) shape.moveTo(z, y);
    else shape.lineTo(z, y);
  });
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.translate(0, 0, -width / 2);
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Procedural automotive sheet-metal panel-line bump map aligned to our lofted body UVs:
 * Adds crisp hood shut-lines, door gaps, trunk seams, and micro metallic clearcoat grain.
 */
export function createPanelLineBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#c8c8c8';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle automotive body-panel shut lines
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2.6;

  // Hood shut-line (top crown center u=0.38..0.62, v=0.05..0.33)
  ctx.beginPath();
  ctx.moveTo(512 * 0.38, 512 * 0.06);
  ctx.lineTo(512 * 0.37, 512 * 0.33);
  ctx.lineTo(512 * 0.63, 512 * 0.33);
  ctx.lineTo(512 * 0.62, 512 * 0.06);
  ctx.stroke();

  // Rear trunk / engine deck shut-line (u=0.38..0.62, v=0.72..0.95)
  ctx.beginPath();
  ctx.moveTo(512 * 0.38, 512 * 0.72);
  ctx.lineTo(512 * 0.39, 512 * 0.94);
  ctx.lineTo(512 * 0.61, 512 * 0.94);
  ctx.lineTo(512 * 0.62, 512 * 0.72);
  ctx.stroke();

  // Left & Right Door Panel Seams (front fender cut, rear quarter cut, lower sill cut)
  for (const [uLow, uHigh] of [
    [0.16, 0.37],
    [0.63, 0.84],
  ]) {
    ctx.beginPath();
    // Front door gap
    ctx.moveTo(512 * uLow, 512 * 0.33);
    ctx.lineTo(512 * uHigh, 512 * 0.33);
    // Rear door / quarter gap
    ctx.moveTo(512 * uLow, 512 * 0.64);
    ctx.lineTo(512 * uHigh, 512 * 0.64);
    // Lower rocker sill seam
    ctx.moveTo(512 * (uLow + 0.02), 512 * 0.33);
    ctx.lineTo(512 * (uLow + 0.02), 512 * 0.64);
    ctx.stroke();
  }

  // Front & rear bumper separation lines
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(0, 512 * 0.13);
  ctx.lineTo(512, 512 * 0.13);
  ctx.moveTo(0, 512 * 0.88);
  ctx.lineTo(512, 512 * 0.88);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  return tex;
}

export function createCarbonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#121318';
  ctx.fillRect(0, 0, 128, 128);

  const cell = 8;
  for (let y = 0; y < 128; y += cell) {
    for (let x = 0; x < 128; x += cell) {
      const parity = ((x / cell + y / cell) & 1) === 0;
      ctx.fillStyle = parity ? '#22242d' : '#15171e';
      ctx.fillRect(x, y, cell, cell);
      ctx.fillStyle = parity ? '#2f3340' : '#0f1014';
      ctx.fillRect(x + 1, y + 1, cell - 3, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createGrilleMeshTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#07080a';
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = '#2d313c';
  ctx.lineWidth = 2.4;
  const step = 12;
  for (let y = -step; y <= 128 + step; y += step) {
    for (let x = -step; x <= 128 + step; x += step) {
      const ox = (Math.floor(y / step) % 2) * (step * 0.5);
      ctx.beginPath();
      ctx.moveTo(x + ox, y + 2);
      ctx.lineTo(x + ox + step * 0.5, y + step * 0.5);
      ctx.lineTo(x + ox, y + step - 2);
      ctx.lineTo(x + ox - step * 0.5, y + step * 0.5);
      ctx.closePath();
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 2.5);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createTireTreadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#18181c';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#0b0b0e';
  for (const gx of [68, 124, 180]) {
    ctx.fillRect(gx, 0, 10, 256);
  }
  ctx.strokeStyle = '#0c0c0f';
  ctx.lineWidth = 7;
  for (let y = -32; y < 288; y += 26) {
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(66, y + 14);
    ctx.moveTo(246, y);
    ctx.lineTo(190, y + 14);
    ctx.moveTo(84, y + 12);
    ctx.lineTo(122, y + 2);
    ctx.moveTo(172, y + 12);
    ctx.lineTo(134, y + 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 5);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createBrakeRotorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const cx = 128;
  const cy = 128;

  const grad = ctx.createRadialGradient(cx, cy, 34, cx, cy, 124);
  grad.addColorStop(0, '#3f3f46');
  grad.addColorStop(0.32, '#52525b');
  grad.addColorStop(0.36, '#d4d4d8');
  grad.addColorStop(0.75, '#a1a1aa');
  grad.addColorStop(1, '#52525b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1.5;
  for (let r = 52; r <= 116; r += 8) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = '#18181b';
  for (let i = 0; i < 12; i++) {
    const baseAngle = (i * Math.PI * 2) / 12;
    for (let k = 0; k < 3; k++) {
      const r = 64 + k * 20;
      const a = baseAngle + k * 0.14;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export interface LiveryTextureBundle {
  map: THREE.CanvasTexture | null;
  emissiveMap: THREE.CanvasTexture | null;
  animated: boolean;
}

export function isAnimatedLivery(livery: LiveryId): boolean {
  return (
    livery === 'animPulseGrid' ||
    livery === 'animPlasmaWave' ||
    livery === 'animHeatwave' ||
    livery === 'animMatrixRain' ||
    livery === 'animInterstellar'
  );
}

/**
 * Generates seamless 512x512 diffuse + emissive textures for Rocket League-style
 * animated wraps. Driven purely by GPU UV offset scrolling & emissive modulation at 60 FPS!
 */
function createAnimatedLiveryTextures(
  baseHex: number,
  livery: LiveryId,
): LiveryTextureBundle {
  const S = 512;
  const mapCanvas = document.createElement('canvas');
  mapCanvas.width = S;
  mapCanvas.height = S;
  const ctx = mapCanvas.getContext('2d')!;

  const emCanvas = document.createElement('canvas');
  emCanvas.width = S;
  emCanvas.height = S;
  const ectx = emCanvas.getContext('2d')!;

  const baseColor = new THREE.Color(baseHex);
  const darkBase = baseColor.clone().multiplyScalar(0.16);
  const midBase = baseColor.clone().multiplyScalar(0.32);
  const brightTint = baseColor.clone().lerp(new THREE.Color(0xffffff), 0.35);

  const darkCss = `#${darkBase.getHexString()}`;
  const midCss = `#${midBase.getHexString()}`;
  const brightCss = `#${brightTint.getHexString()}`;

  // Clear emissive to pitch black so only glowing patterns self-illuminate
  ectx.fillStyle = '#000000';
  ectx.fillRect(0, 0, S, S);

  if (livery === 'animPulseGrid') {
    // Rocket League "Hex Tide" inspired: dark metallic base + seamless tiling hex mesh
    // illuminated by two smooth traveling neon energy wave bands
    ctx.fillStyle = darkCss;
    ctx.fillRect(0, 0, S, S);

    // Subtle traveling energy wash bands (seamless in Y)
    for (const bandY of [128, 384]) {
      const g = ctx.createLinearGradient(0, bandY - 96, 0, bandY + 96);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.5, midCss);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, bandY - 96, S, 192);
    }

    const r = 16;
    const dx = 32; // exact divisor of 512 (16 cols)
    const dy = 32; // exact divisor of 512 (16 rows)

    const drawHex = (
      target: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      rad: number,
    ) => {
      target.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k + Math.PI / 6;
        const px = cx + Math.cos(a) * rad;
        const py = cy + Math.sin(a) * rad;
        if (k === 0) target.moveTo(px, py);
        else target.lineTo(px, py);
      }
      target.closePath();
    };

    for (let row = -1; row <= S / dy + 1; row++) {
      const cy = row * dy;
      const offsetX = (row & 1) !== 0 ? dx * 0.5 : 0;
      // Seamless traveling wave intensity along Y (2 full cycles per 512px)
      const wave = 0.5 + 0.5 * Math.cos(((cy / S) * Math.PI * 4));
      const energy = Math.pow(wave, 2.2);

      for (let col = -1; col <= S / dx + 1; col++) {
        const cx = col * dx + offsetX;
        // Fill dim glossy cell interior
        drawHex(ctx, cx, cy, r - 2.2);
        ctx.fillStyle =
          energy > 0.55
            ? `rgba(${Math.round(brightTint.r * 255)},${Math.round(brightTint.g * 255)},${Math.round(brightTint.b * 255)},${(0.14 + energy * 0.28).toFixed(2)})`
            : 'rgba(10,12,18,0.68)';
        ctx.fill();

        // Crisp hex wireframe stroke on diffuse
        drawHex(ctx, cx, cy, r - 1);
        ctx.strokeStyle = energy > 0.3 ? brightCss : '#22d3ee';
        ctx.globalAlpha = 0.26 + energy * 0.74;
        ctx.lineWidth = 1.4 + energy * 1.8;
        ctx.stroke();

        // Glowing emissive hex edge + core pulse during wave peak
        if (energy > 0.08) {
          drawHex(ectx, cx, cy, r - 1);
          ectx.strokeStyle = energy > 0.65 ? '#e0f2fe' : brightCss;
          ectx.globalAlpha = Math.min(1, energy * 1.15);
          ectx.lineWidth = 1.6 + energy * 2.2;
          ectx.stroke();

          if (energy > 0.62) {
            drawHex(ectx, cx, cy, r * 0.55);
            ectx.fillStyle = '#38bdf8';
            ectx.globalAlpha = (energy - 0.62) * 0.9;
            ectx.fill();
          }
        }
      }
    }
    ctx.globalAlpha = 1;
    ectx.globalAlpha = 1;
  } else if (livery === 'animPlasmaWave') {
    // Rocket League "Slipstream / Dissolver" inspired: fluid flowing plasma ribbons
    ctx.fillStyle = darkCss;
    ctx.fillRect(0, 0, S, S);

    // Subtle secondary glow hue shifted from player's color
    const hsl = { h: 0, s: 0, l: 0 };
    baseColor.getHSL(hsl);
    const accent2 = new THREE.Color().setHSL((hsl.h + 0.18) % 1, 0.95, 0.62);
    const accent3 = new THREE.Color().setHSL((hsl.h + 0.52) % 1, 0.92, 0.58);
    const a2Css = `#${accent2.getHexString()}`;
    const a3Css = `#${accent3.getHexString()}`;

    const drawSeamlessRibbon = (
      target: CanvasRenderingContext2D,
      phaseY: number,
      amp: number,
      freq: number,
      width: number,
      color: string,
      alpha: number,
    ) => {
      target.save();
      target.strokeStyle = color;
      target.lineWidth = width;
      target.globalAlpha = alpha;
      target.lineCap = 'round';
      for (const wrapY of [-S, 0, S]) {
        target.beginPath();
        for (let x = 0; x <= S; x += 8) {
          const t = (x / S) * Math.PI * 2;
          const y =
            phaseY +
            wrapY +
            Math.sin(t * freq + phaseY * 0.02) * amp +
            Math.cos(t * (freq * 2) - phaseY * 0.015) * (amp * 0.35);
          if (x === 0) target.moveTo(x, y);
          else target.lineTo(x, y);
        }
        target.stroke();
      }
      target.restore();
    };

    const bands = [
      { y: 64, amp: 38, freq: 2, w: 34, c: midCss, ec: brightCss, a: 0.55 },
      { y: 192, amp: 44, freq: 1, w: 40, c: a2Css, ec: a2Css, a: 0.72 },
      { y: 320, amp: 34, freq: 2, w: 32, c: a3Css, ec: a3Css, a: 0.65 },
      { y: 448, amp: 42, freq: 1, w: 36, c: brightCss, ec: '#f8fafc', a: 0.75 },
    ];

    for (const b of bands) {
      drawSeamlessRibbon(ctx, b.y, b.amp, b.freq, b.w * 1.5, b.c, b.a * 0.45);
      drawSeamlessRibbon(ctx, b.y, b.amp, b.freq, b.w * 0.55, b.ec, 0.92);
      drawSeamlessRibbon(ctx, b.y, b.amp, b.freq, b.w * 0.16, '#ffffff', 0.85);

      drawSeamlessRibbon(ectx, b.y, b.amp, b.freq, b.w * 0.95, b.c, 0.5);
      drawSeamlessRibbon(ectx, b.y, b.amp, b.freq, b.w * 0.35, b.ec, 0.95);
      drawSeamlessRibbon(ectx, b.y, b.amp, b.freq, b.w * 0.12, '#ffffff', 0.9);
    }
  } else if (livery === 'animHeatwave') {
    // Rocket League "Heatwave / Fire God" inspired: cracked dark obsidian plates over blazing molten lava
    ctx.fillStyle = '#120706';
    ctx.fillRect(0, 0, S, S);

    // Molten glowing underlayer seams (seamless periodic cracks + Voronoi-like magma veins)
    let seed = 7731;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const drawLavaVein = (
      yBase: number,
      amp: number,
      freq: number,
      phase: number,
    ) => {
      const strokeAcross = (
        target: CanvasRenderingContext2D,
        color: string,
        lw: number,
        alpha: number,
      ) => {
        target.save();
        target.strokeStyle = color;
        target.lineWidth = lw;
        target.globalAlpha = alpha;
        target.lineJoin = 'round';
        for (const oy of [-S, 0, S]) {
          target.beginPath();
          for (let x = 0; x <= S; x += 8) {
            const ang = (x / S) * Math.PI * 2;
            const y =
              yBase +
              oy +
              Math.sin(ang * freq + phase) * amp +
              Math.cos(ang * (freq + 2) - phase * 1.4) * (amp * 0.4);
            if (x === 0) target.moveTo(x, y);
            else target.lineTo(x, y);
          }
          target.stroke();
        }
        target.restore();
      };

      strokeAcross(ctx, '#991b1b', 34, 0.85);
      strokeAcross(ctx, '#ea580c', 18, 0.95);
      strokeAcross(ctx, '#facc15', 7, 1.0);
      strokeAcross(ctx, '#fef9c3', 2.5, 0.95);

      strokeAcross(ectx, '#dc2626', 28, 0.65);
      strokeAcross(ectx, '#f97316', 14, 0.95);
      strokeAcross(ectx, '#fde047', 6, 1.0);
      strokeAcross(ectx, '#ffffff', 2.2, 0.95);
    };

    drawLavaVein(64, 28, 2, 0.4);
    drawLavaVein(170, 34, 3, 1.8);
    drawLavaVein(296, 26, 2, 3.3);
    drawLavaVein(412, 32, 3, 5.1);

    // Cross-connecting diagonal fracture veins (seamless)
    for (let i = 0; i < 16; i++) {
      const sx = rand() * S;
      const sy = rand() * S;
      const dx = (rand() - 0.5) * 140;
      const dy = (rand() - 0.5) * 140;
      for (const ox of [-S, 0, S]) {
        for (const oy of [-S, 0, S]) {
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 4.5;
          ctx.beginPath();
          ctx.moveTo(sx + ox, sy + oy);
          ctx.lineTo(sx + ox + dx, sy + oy + dy);
          ctx.stroke();

          ectx.strokeStyle = '#fb923c';
          ectx.lineWidth = 4;
          ectx.beginPath();
          ectx.moveTo(sx + ox, sy + oy);
          ectx.lineTo(sx + ox + dx, sy + oy + dy);
          ectx.stroke();
        }
      }
    }

    // Dark charred obsidian tectonic islands floating over lava edges
    for (let i = 0; i < 42; i++) {
      const cx = rand() * S;
      const cy = rand() * S;
      const r = 14 + rand() * 24;
      const sides = 5 + Math.floor(rand() * 3);
      const rot = rand() * Math.PI * 2;
      const pts: [number, number][] = [];
      for (let s = 0; s < sides; s++) {
        const a = rot + (s / sides) * Math.PI * 2;
        const rad = r * (0.68 + rand() * 0.42);
        pts.push([Math.cos(a) * rad, Math.sin(a) * rad]);
      }
      for (const ox of [-S, 0, S]) {
        for (const oy of [-S, 0, S]) {
          ctx.fillStyle = i % 3 === 0 ? '#181414' : '#0f0b0b';
          ctx.beginPath();
          pts.forEach(([px, py], idx) => {
            if (idx === 0) ctx.moveTo(cx + ox + px, cy + oy + py);
            else ctx.lineTo(cx + ox + px, cy + oy + py);
          });
          ctx.closePath();
          ctx.fill();

          // Occlude emissive under obsidian rock
          ectx.fillStyle = '#000000';
          ectx.beginPath();
          pts.forEach(([px, py], idx) => {
            if (idx === 0) ectx.moveTo(cx + ox + px, cy + oy + py);
            else ectx.lineTo(cx + ox + px, cy + oy + py);
          });
          ectx.closePath();
          ectx.fill();
        }
      }
    }

    // Rising glowing ember sparks
    for (let i = 0; i < 95; i++) {
      const ex = rand() * S;
      const ey = rand() * S;
      const er = 1.2 + rand() * 2.4;
      ctx.fillStyle = i % 2 === 0 ? '#fef08a' : '#fb923c';
      ctx.beginPath();
      ctx.arc(ex, ey, er, 0, Math.PI * 2);
      ctx.fill();
      ectx.fillStyle = '#fef08a';
      ectx.beginPath();
      ectx.arc(ex, ey, er, 0, Math.PI * 2);
      ectx.fill();
    }
  } else if (livery === 'animMatrixRain') {
    // Rocket League "Mainframe / Cyber Data Rain" inspired: cascading glowing digital streams
    ctx.fillStyle = '#040c0b';
    ctx.fillRect(0, 0, S, S);

    // Blend player color with electric cyber emerald/cyan so it honors paint choice while staying hyper-vibrant
    const cyberMain = baseColor.clone().lerp(new THREE.Color(0x10b981), 0.45);
    const cyberHi = cyberMain.clone().lerp(new THREE.Color(0xffffff), 0.65);
    const mainCss = `#${cyberMain.getHexString()}`;
    const hiCss = `#${cyberHi.getHexString()}`;

    // Subtle dark circuit grid background
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.14)';
    ctx.lineWidth = 1;
    for (let g = 0; g < S; g += 32) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, S);
      ctx.moveTo(0, g);
      ctx.lineTo(S, g);
      ctx.stroke();
    }

    let seed = 41911;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const cols = 32; // exact divisor of 512 (16px wide columns)
    const colW = S / cols;
    for (let c = 0; c < cols; c++) {
      const x = c * colW + colW * 0.5;
      const streakCount = 2 + (c % 2);
      for (let s = 0; s < streakCount; s++) {
        const headY = rand() * S;
        const len = 72 + rand() * 145;
        const segs = 12;
        for (let k = 0; k < segs; k++) {
          const frac = k / segs; // 0 = bright head, 1 = faded tail
          const py = ((headY + frac * len) % S + S) % S;
          const alpha = Math.pow(1 - frac, 1.5);
          const isHead = k === 0;
          const segH = (len / segs) * 0.68;
          const segW = isHead ? 5.5 : 3.2;

          ctx.fillStyle = isHead ? '#ffffff' : frac < 0.3 ? hiCss : mainCss;
          ctx.globalAlpha = isHead ? 1 : alpha * 0.9;
          ctx.fillRect(x - segW * 0.5, py, segW, segH);

          ectx.fillStyle = isHead ? '#ffffff' : frac < 0.35 ? hiCss : mainCss;
          ectx.globalAlpha = isHead ? 1 : alpha * 0.95;
          ectx.fillRect(x - segW * 0.5, py, segW, segH);
        }
      }
    }
    ctx.globalAlpha = 1;
    ectx.globalAlpha = 1;
  } else if (livery === 'animInterstellar') {
    // Rocket League "Interstellar" inspired: seamless deep-space swirling aurora & shimmering starfield
    ctx.fillStyle = '#040212';
    ctx.fillRect(0, 0, S, S);

    const drawSeamlessCloud = (
      target: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      r: number,
      c0: string,
      c1: string,
    ) => {
      for (const ox of [-S, 0, S]) {
        for (const oy of [-S, 0, S]) {
          const gx = cx + ox;
          const gy = cy + oy;
          if (gx + r < 0 || gx - r > S || gy + r < 0 || gy - r > S) continue;
          const g = target.createRadialGradient(gx, gy, 4, gx, gy, r);
          g.addColorStop(0, c0);
          g.addColorStop(0.5, c1);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          target.fillStyle = g;
          target.fillRect(gx - r, gy - r, r * 2, r * 2);
        }
      }
    };

    // Seamless swirling nebula pockets
    drawSeamlessCloud(ctx, 128, 128, 195, 'rgba(168, 85, 247, 0.85)', 'rgba(79, 70, 229, 0.38)');
    drawSeamlessCloud(ctx, 384, 240, 200, 'rgba(34, 211, 238, 0.78)', 'rgba(59, 130, 246, 0.34)');
    drawSeamlessCloud(ctx, 220, 410, 180, 'rgba(244, 63, 94, 0.72)', 'rgba(192, 38, 211, 0.32)');
    drawSeamlessCloud(ctx, 440, 460, 165, 'rgba(56, 189, 248, 0.7)', 'rgba(139, 92, 246, 0.28)');

    // Matching emissive aurora glow clouds
    drawSeamlessCloud(ectx, 128, 128, 175, 'rgba(192, 132, 252, 0.78)', 'rgba(99, 102, 241, 0.25)');
    drawSeamlessCloud(ectx, 384, 240, 185, 'rgba(34, 211, 238, 0.74)', 'rgba(14, 165, 233, 0.22)');
    drawSeamlessCloud(ectx, 220, 410, 160, 'rgba(251, 113, 133, 0.68)', 'rgba(217, 70, 239, 0.22)');

    // Luminous cosmic silk filaments (seamless sine ribbons)
    const drawFilament = (y0: number, color: string, amp: number, phase: number) => {
      for (const target of [ctx, ectx]) {
        target.save();
        target.strokeStyle = color;
        target.lineWidth = target === ectx ? 5 : 7;
        target.globalAlpha = target === ectx ? 0.82 : 0.75;
        for (const oy of [-S, 0, S]) {
          target.beginPath();
          for (let x = 0; x <= S; x += 8) {
            const t = (x / S) * Math.PI * 2;
            const y = y0 + oy + Math.sin(t * 2 + phase) * amp + Math.cos(t + phase) * (amp * 0.45);
            if (x === 0) target.moveTo(x, y);
            else target.lineTo(x, y);
          }
          target.stroke();
        }
        target.restore();
      }
    };
    drawFilament(120, '#67e8f9', 36, 0.5);
    drawFilament(280, '#f0abfc', 42, 2.4);
    drawFilament(420, '#fda4af', 32, 4.2);

    // Crisp multi-scale starfield & four-point star glints
    let seed = 99409;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 240; i++) {
      const sx = rand() * S;
      const sy = rand() * S;
      const sr = 0.7 + rand() * 2.1;
      const col = i % 5 === 0 ? '#bae6fd' : i % 7 === 0 ? '#f5d0fe' : i % 11 === 0 ? '#fecdd3' : '#ffffff';
      const alpha = 0.45 + rand() * 0.55;
      for (const target of [ctx, ectx]) {
        target.fillStyle = col;
        target.globalAlpha = alpha;
        target.beginPath();
        target.arc(sx, sy, sr, 0, Math.PI * 2);
        target.fill();
        if (sr > 2.3) {
          target.fillRect(sx - 5, sy - 0.7, 10, 1.4);
          target.fillRect(sx - 0.7, sy - 5, 1.4, 10);
        }
      }
    }
    ctx.globalAlpha = 1;
    ectx.globalAlpha = 1;
  }

  const map = new THREE.CanvasTexture(mapCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;

  const emissiveMap = new THREE.CanvasTexture(emCanvas);
  emissiveMap.wrapS = THREE.RepeatWrapping;
  emissiveMap.wrapT = THREE.RepeatWrapping;
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.anisotropy = 4;

  return { map, emissiveMap, animated: true };
}

export function createLiveryTextures(
  baseHex: number,
  livery: LiveryId,
  paintFinish: PaintFinishId = 'metallic',
): LiveryTextureBundle {
  if (isAnimatedLivery(livery)) {
    return createAnimatedLiveryTextures(baseHex, livery);
  }
  const map = createLiveryTexture(baseHex, livery, paintFinish);
  return { map, emissiveMap: null, animated: false };
}

export function createLiveryTexture(
  baseHex: number,
  livery: LiveryId,
  paintFinish: PaintFinishId = 'metallic',
): THREE.CanvasTexture | null {
  const needsBaseTex =
    paintFinish === 'carbon' ||
    paintFinish === 'forgedCarbon' ||
    paintFinish === 'frostedIce' ||
    paintFinish === 'satinGold' ||
    paintFinish === 'obsidianChrome' ||
    paintFinish === 'emeraldLiquid';
  if (livery === 'solid' && !needsBaseTex) return null;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const isDynamicFinish =
    paintFinish === 'chameleon' ||
    paintFinish === 'prismHolo' ||
    paintFinish === 'royalGoldHolo' ||
    paintFinish === 'apexEclipse';
  const effectiveHex =
    paintFinish === 'satinGold'
      ? 0xd4af37
      : paintFinish === 'obsidianChrome'
        ? 0x16161c
        : paintFinish === 'emeraldLiquid'
          ? 0x059669
          : isDynamicFinish
            ? 0xe2e8f0
            : baseHex;

  const baseColor = new THREE.Color(effectiveHex);
  const baseCss = `#${baseColor.getHexString()}`;
  const lum =
    baseColor.r * 0.299 + baseColor.g * 0.587 + baseColor.b * 0.114;

  const contrastPrimary = lum > 0.58 ? '#111827' : '#f8fafc';
  const contrastAccent = lum > 0.58 ? '#f59e0b' : '#38bdf8';

  if (paintFinish === 'carbon') {
    // Rich tinted 2x2 diagonal twill carbon fiber weave
    const darkTint = baseColor.clone().multiplyScalar(0.18);
    const midTint = baseColor.clone().multiplyScalar(0.32);
    const hiTint = baseColor
      .clone()
      .lerp(new THREE.Color(0x52525b), 0.55)
      .multiplyScalar(0.65);
    const cDark = `#${darkTint.getHexString()}`;
    const cMid = `#${midTint.getHexString()}`;
    const cHi = `#${hiTint.getHexString()}`;

    ctx.fillStyle = cDark;
    ctx.fillRect(0, 0, 512, 512);
    const cell = 8;
    for (let y = 0; y < 512; y += cell) {
      for (let x = 0; x < 512; x += cell) {
        const phase = ((x / cell) + (y / cell)) % 4;
        if (phase === 0 || phase === 1) {
          ctx.fillStyle = phase === 0 ? cHi : cMid;
          ctx.fillRect(x, y, cell - 1, cell - 1);
        } else {
          ctx.fillStyle = cDark;
          ctx.fillRect(x, y, cell, cell);
          ctx.fillStyle = cMid;
          ctx.fillRect(x + 1, y + cell / 2, cell - 2, cell / 2 - 1);
        }
      }
    }
  } else if (paintFinish === 'forgedCarbon') {
    // Marbled Forged Composite Carbon — deterministic overlapping polygonal flakes
    const deepBase = baseColor.clone().multiplyScalar(0.12);
    ctx.fillStyle = `#${deepBase.getHexString()}`;
    ctx.fillRect(0, 0, 512, 512);

    const flakePalette = [
      `#${baseColor.clone().multiplyScalar(0.22).getHexString()}`,
      '#1e2028',
      '#2c303a',
      `#${baseColor.clone().lerp(new THREE.Color(0x71717a), 0.55).multiplyScalar(0.56).getHexString()}`,
      '#474b57',
      '#14161c',
    ];
    let seed = 48271;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 340; i++) {
      const cx = rand() * 512;
      const cy = rand() * 512;
      const r = 10 + rand() * 24;
      const sides = 4 + Math.floor(rand() * 3);
      const rot = rand() * Math.PI * 2;
      ctx.fillStyle = flakePalette[Math.floor(rand() * flakePalette.length)];
      ctx.globalAlpha = 0.55 + rand() * 0.42;
      ctx.beginPath();
      for (let s = 0; s < sides; s++) {
        const a = rot + (s / sides) * Math.PI * 2;
        const rad = r * (0.65 + rand() * 0.5);
        const px = cx + Math.cos(a) * rad;
        const py = cy + Math.sin(a) * rad;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (paintFinish === 'frostedIce') {
    // Crystalline Frosted Glacier Finish
    const iceTint = baseColor.clone().lerp(new THREE.Color(0xdbeafe), 0.42);
    const iceHi = baseColor.clone().lerp(new THREE.Color(0xf0f9ff), 0.72);
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, `#${iceHi.getHexString()}`);
    grad.addColorStop(0.5, `#${iceTint.getHexString()}`);
    grad.addColorStop(1, `#${baseColor.clone().lerp(new THREE.Color(0x7dd3fc), 0.36).getHexString()}`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    let seed = 9187;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    ctx.strokeStyle = 'rgba(240, 249, 255, 0.28)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 85; i++) {
      const x = rand() * 512;
      const y = rand() * 512;
      const len = 18 + rand() * 56;
      const ang = rand() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      ctx.stroke();
    }
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.34)' : 'rgba(186,230,253,0.28)';
      ctx.beginPath();
      ctx.arc(rand() * 512, rand() * 512, 1.2 + rand() * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (paintFinish === 'satinGold') {
    // Authentic 24K Brushed Satin Gold Metal Grain
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#f7df7c');
    grad.addColorStop(0.45, '#d4af37');
    grad.addColorStop(0.8, '#b8860b');
    grad.addColorStop(1, '#e6c24c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    let seed = 24791;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 420; i++) {
      const y = rand() * 512;
      const x = rand() * 440;
      const len = 45 + rand() * 140;
      ctx.fillStyle =
        i % 2 === 0
          ? 'rgba(255, 250, 220, 0.14)'
          : 'rgba(120, 72, 12, 0.13)';
      ctx.fillRect(x, y, len, 1.4);
    }
  } else if (paintFinish === 'obsidianChrome') {
    // Deep mirror obsidian with brushed warm copper micro-streaks
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#09090d');
    grad.addColorStop(0.5, '#1d1d24');
    grad.addColorStop(1, '#110d0a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 180; i++) {
      const y = ((i * 53) % 512);
      const x = ((i * 97) % 440);
      ctx.fillStyle = i % 3 === 0 ? 'rgba(245, 158, 11, 0.14)' : 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(x, y, 72, 1.5);
    }
  } else if (paintFinish === 'emeraldLiquid') {
    // Liquid metal emerald-teal swirl finish
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#022c22');
    grad.addColorStop(0.45, '#10b981');
    grad.addColorStop(0.75, '#2dd4bf');
    grad.addColorStop(1, '#064e3b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 200; i++) {
      const y = ((i * 67) % 512);
      const x = ((i * 113) % 440);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(167, 243, 208, 0.16)' : 'rgba(6, 78, 59, 0.18)';
      ctx.fillRect(x, y, 88, 1.6);
    }
  } else {
    ctx.fillStyle = baseCss;
    ctx.fillRect(0, 0, 512, 512);
  }

  if (livery === 'racingStripes') {
    ctx.fillStyle = contrastPrimary;
    ctx.fillRect(218, 0, 28, 512);
    ctx.fillRect(266, 0, 28, 512);
    ctx.fillStyle = contrastAccent;
    ctx.fillRect(210, 0, 5, 512);
    ctx.fillRect(297, 0, 5, 512);
  } else if (livery === 'carbonHood') {
    const drawCarbonPatch = (x: number, y: number, w: number, h: number) => {
      ctx.fillStyle = '#15171d';
      ctx.fillRect(x, y, w, h);
      const cell = 8;
      for (let py = y; py < y + h; py += cell) {
        for (let px = x; px < x + w; px += cell) {
          const p = (((px - x) / cell + (py - y) / cell) & 1) === 0;
          ctx.fillStyle = p ? '#272a34' : '#111318';
          ctx.fillRect(px, py, cell, cell);
        }
      }
    };
    drawCarbonPatch(180, 0, 152, 230);
    drawCarbonPatch(192, 250, 128, 126);
    ctx.fillStyle = contrastAccent;
    ctx.fillRect(174, 0, 6, 230);
    ctx.fillRect(332, 0, 6, 230);
  } else if (livery === 'sideBolt') {
    const drawSide = (startX: number, dir: number) => {
      ctx.save();
      ctx.fillStyle = contrastPrimary;
      ctx.beginPath();
      ctx.moveTo(startX, 46);
      ctx.lineTo(startX + dir * 48, 184);
      ctx.lineTo(startX + dir * 22, 184);
      ctx.lineTo(startX + dir * 70, 445);
      ctx.lineTo(startX + dir * 32, 445);
      ctx.lineTo(startX + dir * 8, 224);
      ctx.lineTo(startX + dir * 32, 224);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = contrastAccent;
      ctx.fillRect(startX + dir * 10, 60, 8, 390);
      ctx.restore();
    };
    drawSide(102, 1);
    drawSide(410, -1);
    ctx.fillStyle = contrastAccent;
    ctx.fillRect(250, 0, 12, 512);
  } else if (livery === 'rallyCheck') {
    const sq = 22;
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 5; col++) {
        if ((row + col) % 2 === 0) {
          ctx.fillStyle = contrastPrimary;
          ctx.fillRect(72 + col * sq, 250 + row * sq, sq, sq);
          ctx.fillRect(440 - (col + 1) * sq, 250 + row * sq, sq, sq);
        }
      }
    }
    ctx.fillStyle = contrastAccent;
    ctx.fillRect(72, 240, 112, 10);
    ctx.fillRect(328, 240, 112, 10);
    ctx.fillStyle = contrastPrimary;
    ctx.fillRect(236, 0, 40, 512);
  } else if (livery === 'camoGeo') {
    const darkTone = baseColor.clone().multiplyScalar(0.55);
    const lightTone = baseColor
      .clone()
      .lerp(new THREE.Color(0xffffff), 0.35);
    const tones = [
      `#${darkTone.getHexString()}`,
      `#${lightTone.getHexString()}`,
      '#18181b',
      contrastAccent,
    ];
    const polys: [number, [number, number][]][] = [
      [0, [[0, 40], [160, 0], [210, 130], [70, 190]]],
      [1, [[320, 0], [512, 55], [440, 210], [270, 140]]],
      [2, [[130, 160], [310, 110], [360, 260], [190, 290]]],
      [0, [[0, 250], [150, 220], [180, 390], [20, 420]]],
      [1, [[340, 240], [512, 210], [490, 410], [310, 360]]],
      [2, [[170, 330], [350, 310], [390, 490], [150, 480]]],
      [3, [[85, 110], [165, 95], [140, 165]]],
      [3, [[355, 115], [435, 100], [405, 175]]],
      [3, [[220, 405], [295, 390], [270, 465]]],
    ];
    for (const [toneIdx, pts] of polys) {
      ctx.fillStyle = tones[toneIdx];
      ctx.beginPath();
      pts.forEach(([x, y], idx) => {
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
    }
  } else if (livery === 'goldPinstripe') {
    // Bespoke Mansory / Hypercar Obsidian Center Spine + 24K Gold Pinstripes
    ctx.fillStyle = '#0c0d12';
    ctx.fillRect(216, 0, 80, 512);
    const goldGrad = ctx.createLinearGradient(0, 0, 512, 512);
    goldGrad.addColorStop(0, '#fef08a');
    goldGrad.addColorStop(0.5, '#eab308');
    goldGrad.addColorStop(1, '#a16207');
    ctx.fillStyle = goldGrad;
    ctx.fillRect(204, 0, 8, 512);
    ctx.fillRect(300, 0, 8, 512);
    ctx.fillRect(253, 0, 6, 512);
    // Sleek lower flank gold blades
    ctx.fillRect(88, 36, 7, 440);
    ctx.fillRect(417, 36, 7, 440);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(98, 72, 3, 368);
    ctx.fillRect(411, 72, 3, 368);
  } else if (livery === 'cyberCircuit') {
    // Futuristic Tron / Cyberpunk PCB traces across hood, roof, and flanks
    ctx.save();
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 5;
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 10;
    const drawTrace = (pts: [number, number][]) => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => {
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      const [ex, ey] = pts[pts.length - 1];
      ctx.fillStyle = '#ecfeff';
      ctx.beginPath();
      ctx.arc(ex, ey, 6, 0, Math.PI * 2);
      ctx.fill();
    };
    drawTrace([[228, 0], [228, 120], [188, 160], [188, 340], [222, 374], [222, 512]]);
    drawTrace([[284, 0], [284, 120], [324, 160], [324, 340], [290, 374], [290, 512]]);
    drawTrace([[128, 34], [128, 195], [160, 227], [160, 446]]);
    drawTrace([[384, 34], [384, 195], [352, 227], [352, 446]]);

    ctx.strokeStyle = '#e879f9';
    ctx.shadowColor = '#e879f9';
    ctx.lineWidth = 4;
    drawTrace([[256, 18], [256, 220], [238, 238], [238, 468]]);
    drawTrace([[96, 110], [148, 110], [174, 136]]);
    drawTrace([[416, 110], [364, 110], [338, 136]]);
    drawTrace([[102, 310], [156, 310], [180, 286]]);
    drawTrace([[410, 310], [356, 310], [332, 286]]);
    ctx.restore();
  } else if (livery === 'flameTribal') {
    // Sweeping Layered Racing Flames from Nose & Front Fenders
    const drawFlameBand = (offsetY: number, colorStart: string, colorEnd: string, scale: number) => {
      const fg = ctx.createLinearGradient(0, offsetY, 0, offsetY + 290 * scale);
      fg.addColorStop(0, colorStart);
      fg.addColorStop(1, colorEnd);
      ctx.fillStyle = fg;
      const drawHalf = (dir: number) => {
        ctx.beginPath();
        ctx.moveTo(256, offsetY);
        ctx.bezierCurveTo(
          256 + dir * 48,
          offsetY + 55 * scale,
          256 + dir * 24,
          offsetY + 130 * scale,
          256 + dir * 74,
          offsetY + 245 * scale,
        );
        ctx.bezierCurveTo(
          256 + dir * 92,
          offsetY + 170 * scale,
          256 + dir * 130,
          offsetY + 120 * scale,
          256 + dir * 158,
          offsetY + 315 * scale,
        );
        ctx.bezierCurveTo(
          256 + dir * 188,
          offsetY + 215 * scale,
          256 + dir * 204,
          offsetY + 115 * scale,
          256 + dir * 235,
          offsetY + 195 * scale,
        );
        ctx.lineTo(256 + dir * 256, offsetY);
        ctx.closePath();
        ctx.fill();
      };
      drawHalf(-1);
      drawHalf(1);
    };
    drawFlameBand(0, '#dc2626', '#f97316', 1.12);
    drawFlameBand(0, '#f97316', '#facc15', 0.84);
    drawFlameBand(0, '#fef08a', '#ffffff', 0.48);
  } else if (livery === 'sakuraDrift') {
    // Tokyo Midnight Cherry Blossom Branches + Floating Pink Petals + Crimson Speed Accents
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(244, 0, 10, 512);
    ctx.fillRect(260, 0, 4, 512);

    const drawFlower = (fx: number, fy: number, r: number) => {
      ctx.save();
      ctx.translate(fx, fy);
      for (let p = 0; p < 5; p++) {
        ctx.rotate((Math.PI * 2) / 5);
        ctx.fillStyle = p % 2 === 0 ? '#f472b6' : '#fbcfe8';
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.65, r * 0.45, r * 0.72, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawSideBranch = (isRight: boolean) => {
      const sx = isRight ? 92 : 420;
      const dir = isRight ? 1 : -1;
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx, 78);
      ctx.bezierCurveTo(sx + dir * 55, 165, sx + dir * 18, 285, sx + dir * 74, 418);
      ctx.stroke();

      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(sx + dir * 32, 168);
      ctx.lineTo(sx + dir * 82, 206);
      ctx.moveTo(sx + dir * 38, 294);
      ctx.lineTo(sx + dir * 88, 330);
      ctx.stroke();

      const blooms: [number, number, number][] = [
        [sx + dir * 16, 108, 12],
        [sx + dir * 46, 152, 15],
        [sx + dir * 78, 202, 13],
        [sx + dir * 36, 238, 11],
        [sx + dir * 56, 298, 16],
        [sx + dir * 86, 334, 13],
        [sx + dir * 68, 392, 14],
      ];
      for (const [bx, by, br] of blooms) {
        drawFlower(bx, by, br);
      }

      // Drifting sakura petals streaming rearward
      for (let i = 0; i < 14; i++) {
        const px = sx + dir * (12 + ((i * 37) % 86));
        const py = 130 + ((i * 53) % 340);
        ctx.fillStyle = i % 2 === 0 ? '#f9a8d4' : '#fdf2f8';
        ctx.beginPath();
        ctx.ellipse(px, py, 3.5, 6.5, (i * 0.7) * dir, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    drawSideBranch(true);
    drawSideBranch(false);
    // Hood blossom cluster
    drawFlower(216, 138, 13);
    drawFlower(296, 138, 13);
  } else if (livery === 'carbonGoldGeo') {
    // Luxury Faceted Matte-Black & 24K Metallic Gold Geometric Shards
    const shards: [number, number][][] = [
      [[0, 0], [185, 0], [140, 145], [0, 115]],
      [[512, 0], [327, 0], [372, 145], [512, 115]],
      [[192, 28], [256, 0], [320, 28], [256, 185]],
      [[75, 200], [185, 160], [160, 345], [60, 310]],
      [[437, 200], [327, 160], [352, 345], [452, 310]],
      [[180, 355], [256, 315], [332, 355], [256, 495]],
    ];
    for (let i = 0; i < shards.length; i++) {
      const pts = shards[i];
      ctx.fillStyle = i % 2 === 0 ? '#0f1014' : '#1b1d24';
      ctx.beginPath();
      pts.forEach(([x, y], idx) => {
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();

      const goldGrad = ctx.createLinearGradient(0, 0, 512, 512);
      goldGrad.addColorStop(0, '#fef08a');
      goldGrad.addColorStop(0.5, '#eab308');
      goldGrad.addColorStop(1, '#ca8a04');
      ctx.strokeStyle = goldGrad;
      ctx.lineWidth = 4.5;
      ctx.stroke();
    }
    // Crisp 24K gold center spear
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(256, 12);
    ctx.lineTo(264, 195);
    ctx.lineTo(256, 222);
    ctx.lineTo(248, 195);
    ctx.closePath();
    ctx.fill();
  } else if (livery === 'galaxyNebula') {
    // Deep Cosmic Nebula Clouds + Starlight Sparkles
    const bgGrad = ctx.createLinearGradient(0, 0, 512, 512);
    bgGrad.addColorStop(0, '#070316');
    bgGrad.addColorStop(0.5, '#170a38');
    bgGrad.addColorStop(1, '#091933');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 512, 512);

    const drawCloud = (cx: number, cy: number, r: number, c0: string, c1: string) => {
      const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, r);
      g.addColorStop(0, c0);
      g.addColorStop(0.55, c1);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    };
    drawCloud(256, 150, 210, 'rgba(192, 38, 211, 0.72)', 'rgba(99, 102, 241, 0.34)');
    drawCloud(125, 340, 190, 'rgba(34, 211, 238, 0.62)', 'rgba(59, 130, 246, 0.24)');
    drawCloud(395, 360, 185, 'rgba(244, 63, 94, 0.56)', 'rgba(139, 92, 246, 0.28)');
    drawCloud(260, 440, 140, 'rgba(56, 189, 248, 0.48)', 'rgba(14, 165, 233, 0.14)');

    let seed = 13371;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 160; i++) {
      const sx = rand() * 512;
      const sy = rand() * 512;
      const sr = 0.8 + rand() * 2.1;
      ctx.fillStyle = i % 5 === 0 ? '#bae6fd' : i % 7 === 0 ? '#f5d0fe' : '#ffffff';
      ctx.globalAlpha = 0.45 + rand() * 0.55;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (livery === 'cyberSamurai') {
    // Full-Body Neon Tokyo Cyber Samurai Wrap: Obsidian Indigo Base + Synth Grid + Katana Energy Slashes
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
    bgGrad.addColorStop(0, '#09061a');
    bgGrad.addColorStop(0.5, '#13092b');
    bgGrad.addColorStop(1, '#071126');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 512, 512);

    // Subtle synthwave grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.lineWidth = 1.4;
    for (let g = 0; g <= 512; g += 32) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, 512);
      ctx.moveTo(0, g);
      ctx.lineTo(512, g);
      ctx.stroke();
    }

    // Crimson rising cyber sun emblem on hood/roof
    const sunGrad = ctx.createRadialGradient(256, 165, 8, 256, 165, 84);
    sunGrad.addColorStop(0, '#fb7185');
    sunGrad.addColorStop(0.55, '#e11d48');
    sunGrad.addColorStop(1, 'rgba(225, 29, 72, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(256, 165, 84, 0, Math.PI * 2);
    ctx.fill();

    // Sweeping glowing crimson & electric-cyan katana energy slashes across flanks & hood
    const drawSlash = (
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      w: number,
      color: string,
      core: string,
    ) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.lineWidth = w;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = core;
      ctx.lineWidth = w * 0.35;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.restore();
    };

    drawSlash(74, 88, 198, 265, 11, '#f43f5e', '#fff1f2');
    drawSlash(438, 88, 314, 265, 11, '#f43f5e', '#fff1f2');
    drawSlash(88, 265, 186, 442, 9, '#22d3ee', '#ecfeff');
    drawSlash(424, 265, 326, 442, 9, '#22d3ee', '#ecfeff');
    drawSlash(216, 40, 296, 120, 7, '#22d3ee', '#ecfeff');
    drawSlash(296, 40, 216, 120, 7, '#f43f5e', '#fff1f2');
    drawSlash(256, 240, 256, 492, 6, '#f43f5e', '#ffe4e6');
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
