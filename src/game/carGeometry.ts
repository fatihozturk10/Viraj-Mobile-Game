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

  // Group vertices by quantized 48-bit integer spatial key (zero string allocations)
  // so coincident vertices across smooth quads share averaged normals while hard edges stay razor sharp.
  const bucketMap = new Map<number, number[]>();
  const vertKeys = new Float64Array(vCount);

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
      const qx = Math.round(posAttr.getX(vi) * 2000) + 32768;
      const qy = Math.round(posAttr.getY(vi) * 2000) + 32768;
      const qz = Math.round(posAttr.getZ(vi) * 2000) + 32768;
      const key = (qx * 65536 + qy) * 65536 + qz;
      vertKeys[vi] = key;
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
      const neighbors = bucketMap.get(vertKeys[vi]);
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
    livery === 'animInterstellar' ||
    livery === 'animThunderVolt' ||
    livery === 'animSynthwave' ||
    livery === 'animAuroraFrost' ||
    livery === 'animGoldenDragon' ||
    livery === 'animComicSpeed' ||
    livery === 'animCandyPop' ||
    livery === 'animVenomSymbiote' ||
    livery === 'animLiquidAquarium' ||
    livery === 'animWindStream' ||
    livery === 'omnitrixAlien' ||
    livery === 'animSakuraStorm' ||
    livery === 'animGlitchCorrupt' ||
    livery === 'animToxicAcid' ||
    livery === 'animOceanBiolum' ||
    livery === 'animHeartbeatEcg' ||
    livery === 'animHoloCircuit' ||
    livery === 'animHypnoSpiral' ||
    livery === 'animWarpHyperdrive' ||
    livery === 'animCyberEqualizer' ||
    livery === 'animSolarEclipse' ||
    livery === 'animCrysisNanosuit'
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
  } else if (livery === 'animThunderVolt') {
    // High-Voltage Crackling Electric Blue-White Lightning Veins on Obsidian Chassis
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, S, S);
    ectx.fillStyle = '#000000';
    ectx.fillRect(0, 0, S, S);

    // Subtle deep electric grid
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.2)';
    ctx.lineWidth = 2;
    for (let g = 0; g < S; g += 32) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, S);
      ctx.moveTo(0, g);
      ctx.lineTo(S, g);
      ctx.stroke();
    }

    let seed = 73319;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    // Seamless vertical lightning arcs scrolling down the chassis
    for (let b = 0; b < 9; b++) {
      let x = (b / 9) * S + 22;
      const pts: [number, number][] = [[x, 0]];
      const steps = 16;
      for (let k = 1; k < steps; k++) {
        x = ((x + (rand() - 0.5) * 48) % S + S) % S;
        pts.push([x, (k / steps) * S]);
      }
      pts.push([pts[0][0], S]);

      for (const target of [ctx, ectx]) {
        target.save();
        target.lineCap = 'round';
        target.lineJoin = 'round';
        // Outer electric blue glow
        target.strokeStyle = '#2563eb';
        target.lineWidth = target === ectx ? 11 : 13;
        target.globalAlpha = 0.65;
        target.beginPath();
        pts.forEach(([px, py], i) => (i === 0 ? target.moveTo(px, py) : target.lineTo(px, py)));
        target.stroke();
        // Mid cyan arc
        target.strokeStyle = '#38bdf8';
        target.lineWidth = 5.5;
        target.globalAlpha = 0.92;
        target.stroke();
        // Hot white plasma core
        target.strokeStyle = '#ffffff';
        target.lineWidth = 2.2;
        target.globalAlpha = 1;
        target.stroke();
        target.restore();
      }
    }
    ctx.globalAlpha = 1;
    ectx.globalAlpha = 1;
  } else if (livery === 'animSynthwave') {
    // 1984 Outrun Synthwave: Deep midnight violet chassis + scrolling glowing magenta laser grid & cyan/gold sunset bands
    ctx.fillStyle = '#0e0420';
    ctx.fillRect(0, 0, S, S);

    // Seamless horizontal retro-sunset glow bands (2 full cycles per 512px)
    for (const bandY of [128, 384]) {
      const g = ctx.createLinearGradient(0, bandY - 90, 0, bandY + 90);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.32, 'rgba(236, 72, 153, 0.42)');
      g.addColorStop(0.5, 'rgba(245, 158, 11, 0.52)');
      g.addColorStop(0.68, 'rgba(34, 211, 238, 0.36)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, bandY - 90, S, 180);
    }

    // Seamless neon laser grid (exact 32px spacing = 16x16 tiles)
    const step = 32;
    for (let i = 0; i < S; i += step) {
      const isMajor = i % 64 === 0;
      const col = isMajor ? '#f472b6' : '#ec4899';
      for (const target of [ctx, ectx]) {
        target.strokeStyle = col;
        target.lineWidth = isMajor ? 2.8 : 1.5;
        target.globalAlpha = target === ectx ? (isMajor ? 0.95 : 0.65) : 0.85;
        target.beginPath();
        target.moveTo(i, 0);
        target.lineTo(i, S);
        target.moveTo(0, i);
        target.lineTo(S, i);
        target.stroke();
      }
    }

    // Glowing cyan & gold horizon equalizer wave ribbons (seamless in X & Y)
    for (const [baseY, color, amp, freq] of [
      [128, '#22d3ee', 24, 2],
      [256, '#facc15', 18, 3],
      [384, '#f472b6', 24, 2],
    ] as [number, string, number, number][]) {
      for (const target of [ctx, ectx]) {
        target.save();
        target.strokeStyle = color;
        target.lineWidth = target === ectx ? 5.5 : 7;
        target.globalAlpha = 0.92;
        for (const oy of [-S, 0, S]) {
          target.beginPath();
          for (let x = 0; x <= S; x += 8) {
            const t = (x / S) * Math.PI * 2;
            const y = baseY + oy + Math.sin(t * freq) * amp;
            if (x === 0) target.moveTo(x, y);
            else target.lineTo(x, y);
          }
          target.stroke();
        }
        target.restore();
      }
    }

    // Crisp neon node diamonds at major intersections
    for (let x = 0; x < S; x += 64) {
      for (let y = 0; y < S; y += 64) {
        for (const target of [ctx, ectx]) {
          target.fillStyle = '#e0f2fe';
          target.globalAlpha = 0.95;
          target.fillRect(x - 3, y - 3, 6, 6);
        }
      }
    }
    ctx.globalAlpha = 1;
    ectx.globalAlpha = 1;
  } else if (livery === 'animAuroraFrost') {
    // Arctic Aurora Borealis: Deep glacial night + drifting emerald, cyan & arctic-violet light curtains + frost sparkles
    ctx.fillStyle = '#020b18';
    ctx.fillRect(0, 0, S, S);

    const drawCurtain = (
      baseY: number,
      cOuter: string,
      cCore: string,
      amp: number,
      phase: number,
    ) => {
      for (const target of [ctx, ectx]) {
        target.save();
        target.lineCap = 'round';
        for (const oy of [-S, 0, S]) {
          // Soft wide aurora glow veil
          target.strokeStyle = cOuter;
          target.lineWidth = target === ectx ? 42 : 52;
          target.globalAlpha = target === ectx ? 0.42 : 0.48;
          target.beginPath();
          for (let x = 0; x <= S; x += 8) {
            const t = (x / S) * Math.PI * 2;
            const y =
              baseY +
              oy +
              Math.sin(t * 2 + phase) * amp +
              Math.cos(t * 3 - phase) * (amp * 0.35);
            if (x === 0) target.moveTo(x, y);
            else target.lineTo(x, y);
          }
          target.stroke();

          // Bright luminous aurora spine
          target.strokeStyle = cCore;
          target.lineWidth = target === ectx ? 10 : 12;
          target.globalAlpha = 0.92;
          target.stroke();
        }
        target.restore();
      }
    };

    drawCurtain(96, '#059669', '#34d399', 34, 0.3);
    drawCurtain(224, '#0284c7', '#67e8f9', 38, 2.1);
    drawCurtain(352, '#6366f1', '#c4b5fd', 30, 4.0);
    drawCurtain(464, '#10b981', '#a7f3d0', 26, 5.2);

    // Subtle frosty ice-crystal glints
    let seed = 88213;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 140; i++) {
      const fx = rand() * S;
      const fy = rand() * S;
      const fr = 0.9 + rand() * 1.8;
      const col = i % 3 === 0 ? '#a7f3d0' : i % 3 === 1 ? '#bae6fd' : '#ffffff';
      for (const target of [ctx, ectx]) {
        target.fillStyle = col;
        target.globalAlpha = 0.72;
        target.beginPath();
        target.arc(fx, fy, fr, 0, Math.PI * 2);
        target.fill();
      }
    }
    ctx.globalAlpha = 1;
    ectx.globalAlpha = 1;
  } else if (livery === 'animGoldenDragon') {
    // Imperial Obsidian-Crimson 3D Dragon Scales + Anchored 24K Gold Dragon Silhouette & Scrolling Molten Gold Waves!
    const bg = ctx.createLinearGradient(0, 0, S, 0);
    bg.addColorStop(0, '#090608');
    bg.addColorStop(0.22, '#18090d');
    bg.addColorStop(0.5, '#260911');
    bg.addColorStop(0.78, '#18090d');
    bg.addColorStop(1, '#090608');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, S, S);

    // 1. Layered 3D Beveled Obsidian & Imperial Crimson Dragon Scales across entire bodywork
    const colW = 32; // exact divisor of 512 (16 cols)
    const rowH = 26;
    const scaleR = 19;
    for (let row = -1; row <= Math.ceil(S / rowH) + 1; row++) {
      const cy = row * rowH;
      const offsetX = (row & 1) !== 0 ? colW * 0.5 : 0;
      for (let col = -1; col <= S / colW + 1; col++) {
        const cx = col * colW + offsetX;
        const centerDist = Math.abs(cx - 256) / 256;

        // Pointed overlapping dragon scale silhouette
        ctx.beginPath();
        ctx.moveTo(cx - scaleR, cy - 2);
        ctx.quadraticCurveTo(cx - scaleR * 0.9, cy + scaleR * 0.85, cx, cy + scaleR * 1.15);
        ctx.quadraticCurveTo(cx + scaleR * 0.9, cy + scaleR * 0.85, cx + scaleR, cy - 2);
        ctx.closePath();

        const sg = ctx.createRadialGradient(cx, cy + 2, 2, cx, cy + 6, scaleR * 1.15);
        if (centerDist < 0.45) {
          sg.addColorStop(0, '#4c0d19');
          sg.addColorStop(0.65, '#21070d');
          sg.addColorStop(1, '#0a0406');
        } else {
          sg.addColorStop(0, '#271e1a');
          sg.addColorStop(0.65, '#120e0d');
          sg.addColorStop(1, '#060506');
        }
        ctx.fillStyle = sg;
        ctx.fill();

        // Subtle inner golden central scale keel ridge
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.28)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx, cy + 1);
        ctx.lineTo(cx, cy + scaleR * 0.95);
        ctx.stroke();

        // Crisp 24K metallic gold rim on every scale
        ctx.strokeStyle = centerDist < 0.42 ? '#eab308' : '#b45309';
        ctx.lineWidth = 1.8;
        ctx.globalAlpha = 0.72;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // 2. Crisp Imperial Double-Gold Flank Trim Borders
    for (const fx of [26, 476]) {
      ctx.fillStyle = '#d97706';
      ctx.fillRect(fx, 0, 10, S);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(fx + 3, 0, 4, S);
    }

    // 3. Auspicious Imperial Golden Cloud Swirls (Xiangyun) framing both flanks
    for (const isRight of [false, true]) {
      ctx.save();
      if (isRight) {
        ctx.translate(S, 0);
        ctx.scale(-1, 1);
      }
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      for (const cy of [120, 275, 425]) {
        ctx.beginPath();
        ctx.moveTo(52, cy);
        ctx.bezierCurveTo(96, cy - 28, 126, cy - 4, 104, cy + 20);
        ctx.bezierCurveTo(88, cy + 36, 62, cy + 20, 74, cy + 4);
        ctx.stroke();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 5;
      }
      ctx.restore();
    }

    // 4. Sweeping 24K Gold Imperial Dragon Silhouette along Hood & Roof!
    const dragonSpine: [number, number][] = [
      [256, 76],
      [224, 128],
      [208, 184],
      [268, 242],
      [304, 304],
      [252, 366],
      [216, 422],
      [256, 478],
    ];
    // Dark crimson drop-shadow aura behind the golden dragon for maximum pop
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.78)';
    ctx.lineWidth = 46;
    ctx.beginPath();
    ctx.moveTo(dragonSpine[0][0], dragonSpine[0][1]);
    for (let i = 1; i < dragonSpine.length; i++) {
      const prev = dragonSpine[i - 1];
      const curr = dragonSpine[i];
      ctx.quadraticCurveTo(prev[0], prev[1], (prev[0] + curr[0]) * 0.5, (prev[1] + curr[1]) * 0.5);
    }
    ctx.lineTo(dragonSpine[dragonSpine.length - 1][0], dragonSpine[dragonSpine.length - 1][1]);
    ctx.stroke();

    // Rich 24K Gold Dragon Body Ribbon
    const goldGrad = ctx.createLinearGradient(180, 70, 330, 480);
    goldGrad.addColorStop(0, '#fef08a');
    goldGrad.addColorStop(0.32, '#f59e0b');
    goldGrad.addColorStop(0.65, '#fde047');
    goldGrad.addColorStop(1, '#b45309');
    ctx.strokeStyle = goldGrad;
    ctx.lineWidth = 30;
    ctx.stroke();

    // Bright molten white-gold dorsal ridge highlight
    ctx.strokeStyle = '#fef9c3';
    ctx.lineWidth = 7;
    ctx.stroke();

    // Barbed dorsal dragon fins & golden flame spikes along the coils
    ctx.fillStyle = '#fde047';
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2;
    const fins: [number, number, number][] = [
      [216, 152, -2.5],
      [226, 206, -1.9],
      [294, 274, -0.5],
      [292, 332, 0.4],
      [226, 392, -2.6],
    ];
    for (const [fx, fy, ang] of fins) {
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(34, -2);
      ctx.lineTo(12, 8);
      ctx.lineTo(26, 16);
      ctx.lineTo(0, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Fierce Imperial Dragon Head & Sweeping Horns + Flowing Whiskers on Hood (y ≈ 78)
    ctx.save();
    ctx.translate(256, 86);
    // Flowing golden whiskers
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 4;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sgn * 16, -24);
      ctx.bezierCurveTo(sgn * 66, -42, sgn * 88, -8, sgn * 108, -22);
      ctx.stroke();
      // Swept imperial antler horns
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(sgn * 14, 4);
      ctx.lineTo(sgn * 48, 42);
      ctx.lineTo(sgn * 34, 44);
      ctx.lineTo(sgn * 10, 16);
      ctx.closePath();
      ctx.fill();
    }
    // Sculpted gold dragon head crest
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -48);
    ctx.lineTo(24, -18);
    ctx.lineTo(34, 8);
    ctx.lineTo(18, 28);
    ctx.lineTo(0, 18);
    ctx.lineTo(-18, 28);
    ctx.lineTo(-34, 8);
    ctx.lineTo(-24, -18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Bright gold snout ridge
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(0, -42);
    ctx.lineTo(10, -10);
    ctx.lineTo(0, 12);
    ctx.lineTo(-10, -10);
    ctx.closePath();
    ctx.fill();
    // Fierce glowing emerald-gold dragon eyes
    ctx.fillStyle = '#ef4444';
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sgn * 15, -6, 6, 3.2, sgn * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef9c3';
      ctx.beginPath();
      ctx.arc(sgn * 15, -6, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
    }
    ctx.restore();
    ctx.restore();

    // 5. Seamless Vertically-Tiling Molten 24K Gold Emissive Surge Waves (scrolls smoothly on ectx!)
    // Exact period S = 512 with 2 surging chevron gold waves & glowing scale rims
    const eRowH = 32; // exact divisor of 512 (16 rows)
    for (let row = -1; row <= S / eRowH + 1; row++) {
      const cy = row * eRowH;
      const offsetX = (row & 1) !== 0 ? colW * 0.5 : 0;
      for (let col = -1; col <= S / colW + 1; col++) {
        const cx = col * colW + offsetX;
        // V-shaped chevron phase so molten gold sweeps rearward along the car!
        const chevronY = cy - Math.abs(cx - 256) * 0.35;
        const wave = 0.5 + 0.5 * Math.cos((chevronY / S) * Math.PI * 4);
        const energy = Math.pow(wave, 2.8);
        if (energy > 0.1) {
          ectx.beginPath();
          ectx.arc(cx, cy, 18, 0.1 * Math.PI, 0.9 * Math.PI, false);
          ectx.strokeStyle = energy > 0.65 ? '#fef9c3' : '#f59e0b';
          ectx.lineWidth = 1.8 + energy * 3.4;
          ectx.globalAlpha = Math.min(1, energy * 1.15);
          ectx.stroke();
        }
      }
    }
    // Seamless glowing molten-gold ember sparks drifting in the wave
    let dSeed = 77241;
    const dRand = () => {
      dSeed = (dSeed * 16807) % 2147483647;
      return (dSeed - 1) / 2147483646;
    };
    for (let i = 0; i < 48; i++) {
      const sx = dRand() * S;
      const sy = dRand() * S;
      const len = 18 + dRand() * 44;
      const w = 1.6 + dRand() * 2.8;
      for (const oy of [-S, 0, S]) {
        ectx.fillStyle = i % 3 === 0 ? '#fef08a' : '#f59e0b';
        ectx.globalAlpha = 0.72;
        ectx.beginPath();
        ectx.moveTo(sx, sy + oy);
        ectx.lineTo(sx + w, sy + oy + len * 0.5);
        ectx.lineTo(sx, sy + oy + len);
        ectx.lineTo(sx - w, sy + oy + len * 0.5);
        ectx.closePath();
        ectx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ectx.globalAlpha = 1;
  } else if (livery === 'animComicSpeed') {
    // Initial-D Style High-Contrast Japanese Manga Ink Speed Wrap: Crisp White Paper + Black Ink Wedges + Halftones + Cyan/Crimson Slashes!
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, S, S);

    // 1. Dramatic Seamless Black Ink Flanking Shadow Bands with Jagged Manga Silhouette
    const drawInkFlank = (isRight: boolean) => {
      ctx.save();
      if (isRight) {
        ctx.translate(S, 0);
        ctx.scale(-1, 1);
      }
      ctx.fillStyle = '#09090d';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let y = 0; y <= S; y += 16) {
        // Periodic edge (period S=512) for 100% seamless vertical scrolling
        const t = (y / S) * Math.PI * 2;
        const w = 92 + Math.sin(t * 2) * 26 + Math.cos(t * 6) * 14 + Math.sin(t * 10) * 8;
        ctx.lineTo(w, y);
      }
      ctx.lineTo(0, S);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    drawInkFlank(false);
    drawInkFlank(true);

    // 2. Classic Japanese Manga Ben-Day Halftone Screentone Gradient along Inner Flanks (exact divisor of 512)
    for (let y = 8; y < S; y += 16) {
      for (let x = 96; x <= 192; x += 12) {
        const fade = 1 - (x - 96) / 96;
        const r = Math.max(0.8, fade * 4.4);
        ctx.fillStyle = '#09090d';
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.arc(S - x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // 3. Bold Manga Panel Action Border Pinstripes
    ctx.fillStyle = '#09090d';
    ctx.fillRect(156, 0, 5, S);
    ctx.fillRect(351, 0, 5, S);

    // 4. Razor-Sharp Tapered Manga Speed Needles (True Needle Triangles, Seamless in Y!)
    let seed = 55109;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const drawNeedle = (
      target: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      w: number,
      len: number,
      col: string,
      alpha: number,
    ) => {
      target.fillStyle = col;
      target.globalAlpha = alpha;
      for (const oy of [-S, 0, S]) {
        target.beginPath();
        target.moveTo(cx, cy + oy);
        target.lineTo(cx + w * 0.5, cy + oy + len * 0.22);
        target.lineTo(cx, cy + oy + len);
        target.lineTo(cx - w * 0.5, cy + oy + len * 0.22);
        target.closePath();
        target.fill();
      }
    };

    // Dense black ink speed needles cutting through the crisp white center paper
    for (let i = 0; i < 68; i++) {
      const sx = 128 + rand() * 256;
      const sy = rand() * S;
      const len = 95 + rand() * 210;
      const w = 1.6 + rand() * 5.2;
      drawNeedle(ctx, sx, sy, w, len, '#09090d', 0.92);
    }

    // Crisp white speed needles slicing through the pitch-black ink flanks
    for (let i = 0; i < 44; i++) {
      const leftSide = i % 2 === 0;
      const sx = leftSide ? 8 + rand() * 94 : S - 8 - rand() * 94;
      const sy = rand() * S;
      const len = 85 + rand() * 190;
      const w = 1.8 + rand() * 4.8;
      drawNeedle(ctx, sx, sy, w, len, '#f8fafc', 0.95);
    }

    // High-energy Electric Cyan & Manga Crimson Kinetic Impact Needles (on both diffuse & fast-scrolling emissive!)
    for (let i = 0; i < 34; i++) {
      const sx = 18 + rand() * (S - 36);
      const sy = rand() * S;
      const len = 110 + rand() * 220;
      const w = 3.2 + rand() * 7.0;
      const isCyan = i % 2 === 0;
      const col = isCyan ? '#06b6d4' : '#e11d48';
      const glowCol = isCyan ? '#22d3ee' : '#fb7185';
      drawNeedle(ctx, sx, sy, w, len, col, 0.96);
      drawNeedle(ectx, sx, sy, w * 0.92, len * 1.05, glowCol, 0.95);
      // White-hot needle core on emissive for anime kinetic pop
      drawNeedle(ectx, sx, sy + 6, w * 0.35, len * 0.72, '#ffffff', 0.9);
    }

    // Stylized Manga Drift Impact Star-Bursts (seamless in Y) along the ink edges
    for (const [bx, by, br, col] of [
      [112, 128, 26, '#22d3ee'],
      [400, 256, 28, '#f43f5e'],
      [118, 384, 24, '#f43f5e'],
      [396, 64, 22, '#22d3ee'],
    ] as [number, number, number, string][]) {
      for (const oy of [-S, 0, S]) {
        for (const target of [ctx, ectx]) {
          target.save();
          target.translate(bx, by + oy);
          target.fillStyle = col;
          target.globalAlpha = target === ectx ? 0.95 : 1;
          target.beginPath();
          for (let k = 0; k < 12; k++) {
            const r = k % 2 === 0 ? br : br * 0.34;
            const a = (k * Math.PI) / 6;
            if (k === 0) target.moveTo(Math.cos(a) * r, Math.sin(a) * r);
            else target.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          target.closePath();
          target.fill();
          target.fillStyle = '#ffffff';
          target.beginPath();
          target.arc(0, 0, br * 0.28, 0, Math.PI * 2);
          target.fill();
          target.restore();
        }
      }
    }
    ctx.globalAlpha = 1;
    ectx.globalAlpha = 1;
  } else if (livery === 'animCandyPop') {
    // Vibrant Swirling Pastel-Neon Candy Ribbon Wrap with Sparkling Sugar Stars!
    ctx.fillStyle = '#2e1065';
    ctx.fillRect(0, 0, S, S);

    const ribbons: [number, string, string, number, number][] = [
      [64, '#f472b6', '#fbcfe8', 32, 2],
      [192, '#38bdf8', '#bae6fd', 36, 2],
      [320, '#fde047', '#fef9c3', 30, 2],
      [448, '#c084fc', '#f3e8ff', 34, 2],
    ];
    for (const [baseY, col, core, amp, freq] of ribbons) {
      for (const target of [ctx, ectx]) {
        target.save();
        target.lineCap = 'round';
        for (const oy of [-S, 0, S]) {
          target.strokeStyle = col;
          target.lineWidth = target === ectx ? 32 : 46;
          target.globalAlpha = target === ectx ? 0.58 : 0.88;
          target.beginPath();
          for (let x = 0; x <= S; x += 8) {
            const t = (x / S) * Math.PI * 2;
            const y = baseY + oy + Math.sin(t * freq + baseY * 0.01) * amp;
            if (x === 0) target.moveTo(x, y);
            else target.lineTo(x, y);
          }
          target.stroke();

          target.strokeStyle = core;
          target.lineWidth = 10;
          target.globalAlpha = 0.95;
          target.stroke();
        }
        target.restore();
      }
    }

    // Glowing candy star sparkles
    let seed = 19283;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 65; i++) {
      const sx = rand() * S;
      const sy = rand() * S;
      const sr = 2.5 + rand() * 4.5;
      for (const target of [ctx, ectx]) {
        target.fillStyle = '#ffffff';
        target.globalAlpha = 0.92;
        target.fillRect(sx - sr, sy - 1.2, sr * 2, 2.4);
        target.fillRect(sx - 1.2, sy - sr, 2.4, sr * 2);
      }
    }
    ctx.globalAlpha = 1;
    ectx.globalAlpha = 1;
  } else if (livery === 'animVenomSymbiote') {
    // Living Alien Symbiote (Venom): Wet Obsidian-Indigo Muscular Sheen, Fierce Jagged White Hood Eyes,
    // Snarling Flank Fangs, Iconic Roof Spider Crest + Crawling Animated Organic White Symbiote Veins on Emissive!
    const baseGrad = ctx.createLinearGradient(0, 0, S, 0);
    baseGrad.addColorStop(0, '#040407');
    baseGrad.addColorStop(0.24, '#0c0d1a');
    baseGrad.addColorStop(0.5, '#13162b');
    baseGrad.addColorStop(0.76, '#0c0d1a');
    baseGrad.addColorStop(1, '#040407');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, S, S);

    // 1. Sculpted Wet Obsidian-Indigo Symbiote Muscle Sinew Contours (gives glossy 3D organic depth)
    for (const isRight of [false, true]) {
      ctx.save();
      if (isRight) {
        ctx.translate(S, 0);
        ctx.scale(-1, 1);
      }
      const muscleCurves: [number, number, number, number, number, number, number, string][] = [
        [248, 20, 175, 95, 110, 190, 26, 'rgba(30, 41, 74, 0.55)'],
        [244, 150, 150, 210, 74, 310, 32, 'rgba(24, 32, 62, 0.52)'],
        [250, 265, 160, 330, 82, 465, 28, 'rgba(30, 41, 74, 0.5)'],
        [135, 36, 68, 130, 28, 250, 20, 'rgba(49, 46, 129, 0.28)'],
        [120, 280, 56, 365, 22, 495, 22, 'rgba(49, 46, 129, 0.26)'],
      ];
      ctx.lineCap = 'round';
      for (const [x0, y0, cx1, cy1, x1, y1, lw, col] of muscleCurves) {
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(cx1, cy1, x1, y1);
        ctx.stroke();
        // Wet specular sheen highlight along each muscle ridge
        ctx.strokeStyle = 'rgba(129, 140, 248, 0.16)';
        ctx.lineWidth = lw * 0.24;
        ctx.beginPath();
        ctx.moveTo(x0 - 4, y0);
        ctx.quadraticCurveTo(cx1 - 4, cy1, x1 - 4, y1);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Organic Pitch-Black Symbiote Tendril Overlays for Layered Goo Texture
    let vSeed = 66613;
    const vRand = () => {
      vSeed = (vSeed * 16807) % 2147483647;
      return (vSeed - 1) / 2147483646;
    };
    ctx.lineCap = 'round';
    for (let i = 0; i < 42; i++) {
      const x0 = vRand() * S;
      const y0 = vRand() * S;
      const x1 = x0 + (vRand() - 0.5) * 180;
      const y1 = y0 + (vRand() - 0.5) * 180;
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(2, 2, 5, 0.85)' : 'rgba(15, 18, 36, 0.68)';
      ctx.lineWidth = 4 + vRand() * 11;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(
        (x0 + x1) * 0.5 + (vRand() - 0.5) * 70,
        (y0 + y1) * 0.5 + (vRand() - 0.5) * 70,
        x1,
        y1,
      );
      ctx.stroke();
    }

    // 3. Snarling Lower-Flank Symbiote Jaw & Razor-Sharp White Fangs (both flanks)
    for (const isRight of [false, true]) {
      ctx.save();
      if (isRight) {
        ctx.translate(S, 0);
        ctx.scale(-1, 1);
      }
      // Subtle crimson-violet inner symbiote maw streak along lower rocker
      const mawGrad = ctx.createLinearGradient(0, 140, 88, 380);
      mawGrad.addColorStop(0, 'rgba(136, 19, 55, 0.72)');
      mawGrad.addColorStop(0.5, 'rgba(159, 18, 57, 0.45)');
      mawGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = mawGrad;
      ctx.beginPath();
      ctx.moveTo(0, 118);
      ctx.quadraticCurveTo(86, 195, 72, 340);
      ctx.quadraticCurveTo(32, 395, 0, 382);
      ctx.closePath();
      ctx.fill();

      // Jagged curved white symbiote fangs jutting across the flank
      for (let f = 0; f < 6; f++) {
        const fy = 134 + f * 38;
        const flen = 42 + (f === 1 || f === 2 ? 22 : f === 3 ? 14 : 0);
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(4, fy);
        ctx.quadraticCurveTo(flen * 0.65, fy + 6, flen, fy + 16);
        ctx.quadraticCurveTo(flen * 0.45, fy + 18, 4, fy + 24);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#040407';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      ctx.restore();
    }

    // 4. Iconic Menacing Sweeping White Venom Eyes on Hood (with spiky symbiote corner tendrils!)
    for (const isRight of [false, true]) {
      ctx.save();
      if (isRight) {
        ctx.translate(S, 0);
        ctx.scale(-1, 1);
      }
      // Soft icy-cyan under-glow halo behind the eye
      ctx.fillStyle = 'rgba(186, 230, 253, 0.25)';
      ctx.beginPath();
      ctx.moveTo(118, 66);
      ctx.bezierCurveTo(176, 94, 224, 152, 246, 204);
      ctx.bezierCurveTo(202, 228, 148, 206, 122, 162);
      ctx.bezierCurveTo(100, 124, 102, 92, 118, 66);
      ctx.closePath();
      ctx.fill();

      // Razor-sharp pure-white Venom eye silhouette
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(122, 72);
      ctx.bezierCurveTo(174, 102, 218, 154, 241, 198);
      ctx.bezierCurveTo(202, 218, 154, 198, 128, 158);
      ctx.bezierCurveTo(108, 126, 108, 96, 122, 72);
      ctx.closePath();
      ctx.fill();

      // Jagged black symbiote tendrils biting into the outer eye contour for authentic comic style
      ctx.fillStyle = '#05050a';
      ctx.beginPath();
      ctx.moveTo(136, 174);
      ctx.lineTo(164, 164);
      ctx.lineTo(152, 188);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(182, 118);
      ctx.lineTo(170, 138);
      ctx.lineTo(196, 132);
      ctx.closePath();
      ctx.fill();

      // White spiky symbiote wisps shooting off the upper eye tip
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(124, 78);
      ctx.quadraticCurveTo(102, 54, 84, 34);
      ctx.moveTo(116, 106);
      ctx.quadraticCurveTo(86, 90, 62, 76);
      ctx.stroke();
      ctx.restore();
    }

    // 5. Crisp Iconic White Venom Spider Crest across Center Roof & Upper Flanks
    ctx.save();
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#05050a';
    ctx.lineWidth = 3;
    // Pointed diamond cephalothorax (head)
    ctx.beginPath();
    ctx.moveTo(256, 238);
    ctx.lineTo(278, 272);
    ctx.lineTo(256, 302);
    ctx.lineTo(234, 272);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Fierce elongated segmented abdomen
    ctx.beginPath();
    ctx.moveTo(256, 298);
    ctx.lineTo(286, 342);
    ctx.lineTo(256, 428);
    ctx.lineTo(226, 342);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 8 Long Razor-Sharp Angular Spider Legs stretching symmetrically across roof & flanks
    for (const isRight of [false, true]) {
      ctx.save();
      if (isRight) {
        ctx.translate(S, 0);
        ctx.scale(-1, 1);
      }
      const legs: [number, number, number, number, number, number, number][] = [
        [240, 266, 178, 224, 108, 170, 10],
        [236, 282, 162, 264, 74, 242, 11],
        [234, 302, 152, 326, 72, 356, 11],
        [238, 324, 168, 378, 108, 466, 10],
      ];
      for (const [ax, ay, bx, by, cx, cy, w] of legs) {
        // Tapered sharp polygon leg (thick at joint, razor point at tip)
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(ax, ay - w * 0.45);
        ctx.lineTo(bx, by - w * 0.55);
        ctx.lineTo(cx, cy);
        ctx.lineTo(bx + 4, by + w * 0.55);
        ctx.lineTo(ax, ay + w * 0.45);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();

    // 6. Seamless Crawling Living White/Ice-Blue Symbiote Veins on Emissive (scrolls smoothly in X & Y!)
    ectx.lineCap = 'round';
    const drawWrappedVein = (
      x0: number,
      y0: number,
      dx1: number,
      dy1: number,
      dx2: number,
      dy2: number,
      lw: number,
      col: string,
      alpha: number,
    ) => {
      ectx.strokeStyle = col;
      ectx.lineWidth = lw;
      ectx.globalAlpha = alpha;
      for (const ox of [-S, 0, S]) {
        for (const oy of [-S, 0, S]) {
          ectx.beginPath();
          ectx.moveTo(x0 + ox, y0 + oy);
          ectx.bezierCurveTo(
            x0 + dx1 + ox,
            y0 + dy1 + oy,
            x0 + dx2 + ox,
            y0 + dy2 + oy,
            x0 + ox,
            y0 + S * 0.5 + oy,
          );
          ectx.stroke();
        }
      }
    };
    // Crawling vertical organic symbiote vein streams (period S/2 = 256 -> seamless modulo 512!)
    for (let i = 0; i < 14; i++) {
      const vx = 24 + (i / 14) * (S - 48);
      const vy = (i * 97) % S;
      const sway1 = (i % 2 === 0 ? 1 : -1) * (24 + (i % 4) * 12);
      const sway2 = -sway1 * 0.85;
      drawWrappedVein(vx, vy, sway1, 86, sway2, 172, 2.2 + (i % 3) * 1.4, '#e0f2fe', 0.55);
      drawWrappedVein(vx + 4, vy + 18, sway1 * 0.7, 86, sway2 * 0.7, 172, 1.2, '#ffffff', 0.75);
    }
    // Branching organic white micro-tendrils crawling across the body
    for (let i = 0; i < 28; i++) {
      const bx = vRand() * S;
      const by = vRand() * S;
      const len = 32 + vRand() * 64;
      const ang = (vRand() - 0.5) * 1.6;
      const mx = bx + Math.sin(ang) * len * 0.5;
      const my = by + Math.cos(ang) * len * 0.5;
      const ex = bx + Math.sin(ang * 1.3) * len;
      const ey = by + Math.cos(ang * 1.3) * len;
      for (const ox of [-S, 0, S]) {
        for (const oy of [-S, 0, S]) {
          ectx.strokeStyle = i % 3 === 0 ? '#bae6fd' : '#f8fafc';
          ectx.lineWidth = 1.4 + vRand() * 2.2;
          ectx.globalAlpha = 0.45 + vRand() * 0.35;
          ectx.beginPath();
          ectx.moveTo(bx + ox, by + oy);
          ectx.quadraticCurveTo(mx + ox, my + oy, ex + ox, ey + oy);
          ectx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    ectx.globalAlpha = 1;
  } else if (livery === 'animLiquidAquarium') {
    // Translucent Glass Aquarium Shell Caustics & Shimmering Water Ripples (paired with real 3D sloshing water + goldfish inside!)
    const g = ctx.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, '#bae6fd');
    g.addColorStop(0.5, '#7dd3fc');
    g.addColorStop(1, '#bae6fd');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);

    // Seamless swimming water-caustic light ribbons across the crystal glass bodywork
    for (const [baseY, amp, freq, lw] of [
      [85, 28, 2, 14],
      [210, 34, 3, 12],
      [340, 26, 2, 16],
      [450, 30, 3, 12],
    ]) {
      for (const target of [ctx, ectx]) {
        target.save();
        target.strokeStyle = target === ectx ? '#7dd3fc' : '#ffffff';
        target.lineWidth = target === ectx ? lw * 0.65 : lw;
        target.globalAlpha = target === ectx ? 0.42 : 0.55;
        for (const oy of [-S, 0, S]) {
          target.beginPath();
          for (let x = 0; x <= S; x += 8) {
            const t = (x / S) * Math.PI * 2;
            const y = baseY + oy + Math.sin(t * freq) * amp;
            if (x === 0) target.moveTo(x, y);
            else target.lineTo(x, y);
          }
          target.stroke();
        }
        target.restore();
      }
    }

    // Crisp subtle glass-tank water droplets & micro bubbles on the glass surface
    let seed = 40829;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 48; i++) {
      const bx = rand() * S;
      const by = rand() * S;
      const br = 3 + rand() * 7;
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.stroke();

      ectx.strokeStyle = 'rgba(186,230,253,0.45)';
      ectx.lineWidth = 1.5;
      ectx.beginPath();
      ectx.arc(bx, by, br, 0, Math.PI * 2);
      ectx.stroke();
    }
    ctx.globalAlpha = 1;
    ectx.globalAlpha = 1;
  } else if (livery === 'animWindStream') {
    // Aerodynamic Wind-Tunnel Airflow Wrap: Honors player's paint color + silky glowing streamlines & vortex curls!
    const baseCss = `#${baseColor.getHexString()}`;
    ctx.fillStyle = baseCss;
    ctx.fillRect(0, 0, S, S);

    // Subtle dark-tinted aerodynamic pressure-map shading along flanks
    const windShade = ctx.createLinearGradient(0, 0, S, 0);
    windShade.addColorStop(0, 'rgba(2, 6, 23, 0.35)');
    windShade.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
    windShade.addColorStop(1, 'rgba(2, 6, 23, 0.35)');
    ctx.fillStyle = windShade;
    ctx.fillRect(0, 0, S, S);

    // Seamless vertical wind-tunnel streamlines & swirling slipstream curls (exact 512px periodicity!)
    let seed = 33771;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < 28; i++) {
      const baseX = (i / 28) * S + 8;
      const startY = rand() * S;
      const len = 110 + rand() * 195;
      const sway = 5 + rand() * 12;
      const phase = rand() * Math.PI * 2;
      const isStrong = i % 3 === 0;

      for (const target of [ctx, ectx]) {
        target.save();
        target.lineCap = 'round';
        for (const oy of [-S, 0, S]) {
          // Soft translucent cyan slipstream aura
          target.strokeStyle = isStrong ? '#38bdf8' : '#7dd3fc';
          target.lineWidth = isStrong ? 9 : 5;
          target.globalAlpha = target === ectx ? 0.38 : 0.44;
          target.beginPath();
          for (let dy = 0; dy <= len; dy += 12) {
            const frac = dy / len;
            const wx = baseX + Math.sin(frac * Math.PI * 2 + phase) * sway;
            const wy = startY + oy + dy;
            if (dy === 0) target.moveTo(wx, wy);
            else target.lineTo(wx, wy);
          }
          target.stroke();

          // Crisp bright white airflow core filament
          target.strokeStyle = '#f0f9ff';
          target.lineWidth = isStrong ? 3.2 : 1.8;
          target.globalAlpha = target === ectx ? 0.88 : 0.92;
          target.stroke();
        }
        target.restore();
      }
    }

    // Iconic aerodynamic swirling wind-vortex spirals (seamless)
    for (let v = 0; v < 8; v++) {
      const vx = 48 + (v % 4) * 138;
      const vy = v < 4 ? 128 : 384;
      for (const target of [ctx, ectx]) {
        target.save();
        target.strokeStyle = '#e0f2fe';
        target.lineWidth = 2.6;
        target.globalAlpha = target === ectx ? 0.65 : 0.72;
        target.beginPath();
        for (let a = 0; a < Math.PI * 3.2; a += 0.25) {
          const r = 3 + a * 2.8;
          const px = vx + Math.cos(a) * r;
          const py = vy + Math.sin(a) * r;
          if (a === 0) target.moveTo(px, py);
          else target.lineTo(px, py);
        }
        target.stroke();
        target.restore();
      }
    }
    ctx.globalAlpha = 1;
    ectx.globalAlpha = 1;
  } else if (livery === 'omnitrixAlien') {
    // Animated Ben-10 Omnitrix Alien-Tech Armor: Locked Matte-Black & Pearl-White Interlocking Armor + 3D Hood/Roof Hourglass Dial
    // paired with Live Scrolling Neon-Green Alien DNA Double-Helix & Energy Pulse Waves on Emissive!
    const chassisBg = ctx.createLinearGradient(0, 0, S, 0);
    chassisBg.addColorStop(0, '#07090c');
    chassisBg.addColorStop(0.22, '#11161f');
    chassisBg.addColorStop(0.5, '#090b10');
    chassisBg.addColorStop(0.78, '#11161f');
    chassisBg.addColorStop(1, '#07090c');
    ctx.fillStyle = chassisBg;
    ctx.fillRect(0, 0, S, S);

    // 1. Sleek Gunmetal Alien Cooling Louvers along Lower Flanks
    for (const isRight of [false, true]) {
      ctx.save();
      if (isRight) {
        ctx.translate(S, 0);
        ctx.scale(-1, 1);
      }
      // Subtle recessed dark-steel side intake channel
      ctx.fillStyle = '#05070a';
      ctx.fillRect(16, 0, 88, S);
      // Angled gunmetal armor louvers
      for (let ly = 24; ly < S; ly += 48) {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(14, ly);
        ctx.lineTo(96, ly + 16);
        ctx.lineTo(96, ly + 30);
        ctx.lineTo(14, ly + 14);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(74, 222, 128, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Sculpted Glossy Pearl-White Ben-10 Interlocking Center Armor Carapace
    const whiteGrad = ctx.createLinearGradient(132, 0, 380, 0);
    whiteGrad.addColorStop(0, '#cbd5e1');
    whiteGrad.addColorStop(0.18, '#f8fafc');
    whiteGrad.addColorStop(0.5, '#ffffff');
    whiteGrad.addColorStop(0.82, '#f8fafc');
    whiteGrad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = whiteGrad;
    ctx.beginPath();
    ctx.moveTo(148, 0);
    ctx.lineTo(364, 0);
    ctx.lineTo(382, 92);
    ctx.lineTo(362, 168);
    ctx.lineTo(378, 256);
    ctx.lineTo(358, 348);
    ctx.lineTo(376, 434);
    ctx.lineTo(358, S);
    ctx.lineTo(154, S);
    ctx.lineTo(136, 434);
    ctx.lineTo(154, 348);
    ctx.lineTo(134, 256);
    ctx.lineTo(150, 168);
    ctx.lineTo(130, 92);
    ctx.closePath();
    ctx.fill();

    // Crisp gunmetal bevel outline & mechanical armor panel seams across the white carapace
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 5;
    ctx.stroke();

    // Diagonal black tactical armor notches biting cleanly into the white hood & rear deck
    ctx.fillStyle = '#09090b';
    for (const isRight of [false, true]) {
      ctx.save();
      if (isRight) {
        ctx.translate(S, 0);
        ctx.scale(-1, 1);
      }
      // Front hood intake notch
      ctx.beginPath();
      ctx.moveTo(132, 26);
      ctx.lineTo(192, 74);
      ctx.lineTo(176, 118);
      ctx.lineTo(132, 96);
      ctx.closePath();
      ctx.fill();
      // Mid-chassis alien vent notch
      ctx.beginPath();
      ctx.moveTo(134, 234);
      ctx.lineTo(188, 268);
      ctx.lineTo(188, 294);
      ctx.lineTo(146, 314);
      ctx.closePath();
      ctx.fill();
      // Rear armor notch
      ctx.beginPath();
      ctx.moveTo(136, 412);
      ctx.lineTo(194, 444);
      ctx.lineTo(166, S);
      ctx.lineTo(136, S);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Precision armored panel seam lines & metallic rivets on diffuse
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(154, 266);
    ctx.lineTo(358, 266);
    ctx.moveTo(256, 0);
    ctx.lineTo(256, 86);
    ctx.moveTo(256, 248);
    ctx.lineTo(256, 322);
    ctx.moveTo(256, 422);
    ctx.lineTo(256, S);
    ctx.stroke();

    // 3. Sharp Neon-Green Alien Energy Conduit Trim Channels along Armor Edges (diffuse)
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 6;
    ctx.lineCap = 'square';
    for (const sx of [118, 394]) {
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, S);
      ctx.stroke();
    }
    ctx.strokeStyle = '#86efac';
    ctx.lineWidth = 2;
    for (const sx of [118, 394]) {
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, S);
      ctx.stroke();
    }
    // Connecting angled green conduits from side rails into the central dials
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 5;
    for (const y of [166, 372]) {
      ctx.beginPath();
      ctx.moveTo(118, y - 22);
      ctx.lineTo(176, y);
      ctx.moveTo(394, y - 22);
      ctx.lineTo(336, y);
      ctx.stroke();
    }

    // 4. Hero 3D-Beveled Omnitrix Watch Dial + Razor-Sharp Neon-Green Hourglass Emblem (Anchored on Diffuse!)
    const drawOmnitrixDial = (cx: number, cy: number, rad: number) => {
      ctx.save();
      ctx.translate(cx, cy);

      // Outer titanium mechanical collar with metallic gradient
      const bezelGrad = ctx.createLinearGradient(-rad, -rad, rad, rad);
      bezelGrad.addColorStop(0, '#64748b');
      bezelGrad.addColorStop(0.45, '#1e293b');
      bezelGrad.addColorStop(1, '#09090b');
      ctx.fillStyle = bezelGrad;
      ctx.beginPath();
      ctx.arc(0, 0, rad + 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      ctx.stroke();

      // 4 Chunky Omnitrix Bezel Locking Clamps + Glowing Green Status Pips at 45°
      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate((i / 4) * Math.PI * 2 + Math.PI * 0.25);
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.fillRect(rad - 2, -10, 19, 20);
        ctx.strokeRect(rad - 2, -10, 19, 20);
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(rad + 4, -5, 7, 10);
        ctx.restore();
      }

      // Pitch-black recessed dial face
      ctx.fillStyle = '#040608';
      ctx.beginPath();
      ctx.arc(0, 0, rad, 0, Math.PI * 2);
      ctx.fill();

      // Subtle alien radial gauge ticks inside the dial face
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.35)';
      ctx.lineWidth = 2;
      for (let t = 0; t < 16; t++) {
        const a = (t / 16) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (rad * 0.8), Math.sin(a) * (rad * 0.8));
        ctx.lineTo(Math.cos(a) * (rad * 0.94), Math.sin(a) * (rad * 0.94));
        ctx.stroke();
      }

      // Glowing outer neon-green dial rim
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.arc(0, 0, rad - 2, 0, Math.PI * 2);
      ctx.stroke();

      // Iconic Omnitrix Hourglass Emblem (faceted neon-green glowing triangles meeting at dead-center!)
      const hgGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, rad * 0.85);
      hgGrad.addColorStop(0, '#dcfce7');
      hgGrad.addColorStop(0.35, '#4ade80');
      hgGrad.addColorStop(0.85, '#16a34a');
      hgGrad.addColorStop(1, '#15803d');
      ctx.fillStyle = hgGrad;
      ctx.beginPath();
      ctx.moveTo(-rad * 0.64, -rad * 0.72);
      ctx.lineTo(rad * 0.64, -rad * 0.72);
      ctx.lineTo(0, 0);
      ctx.lineTo(rad * 0.64, rad * 0.72);
      ctx.lineTo(-rad * 0.64, rad * 0.72);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();

      // Crisp white-green specular bevel edge around the hourglass
      ctx.strokeStyle = '#dcfce7';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Glowing white-green core energy diamond right at the hourglass pinch
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -rad * 0.14);
      ctx.lineTo(rad * 0.12, 0);
      ctx.lineTo(0, rad * 0.14);
      ctx.lineTo(-rad * 0.12, 0);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    };

    drawOmnitrixDial(256, 166, 74);
    drawOmnitrixDial(256, 372, 46);

    // 5. LIVE ANIMATED EMISSIVE LAYER (scrolls seamlessly modulo 512 in Y!):
    //    Twin Neon-Green Alien DNA Double-Helices on Flanks + Surging Omnitrix Energy Chevrons & Data Packets!
    for (const helixX of [60, 452]) {
      const amp = 24;
      // Glowing nucleotide base-pair rungs connecting the double helix strands (exact divisor of 512)
      for (let y = 0; y < S; y += 16) {
        const phase = (y / S) * Math.PI * 4; // 2 complete helix twists per 512px -> 100% seamless!
        const xA = helixX + Math.sin(phase) * amp;
        const xB = helixX - Math.sin(phase) * amp;
        const depth = Math.abs(Math.sin(phase));
        ectx.strokeStyle = '#4ade80';
        ectx.lineWidth = 2.4;
        ectx.globalAlpha = 0.25 + depth * 0.55;
        ectx.beginPath();
        ectx.moveTo(xA, y);
        ectx.lineTo(xB, y);
        ectx.stroke();
      }
      // Twin intertwined neon-green DNA backbone strands
      for (const sgn of [-1, 1]) {
        ectx.strokeStyle = sgn > 0 ? '#86efac' : '#22c55e';
        ectx.lineWidth = sgn > 0 ? 5.5 : 4.5;
        ectx.globalAlpha = 0.92;
        ectx.beginPath();
        for (let y = 0; y <= S; y += 8) {
          const phase = (y / S) * Math.PI * 4;
          const px = helixX + sgn * Math.sin(phase) * amp;
          if (y === 0) ectx.moveTo(px, y);
          else ectx.lineTo(px, y);
        }
        ectx.stroke();
      }
    }

    // Surging Neon-Green Omnitrix Energy Rail Pulses & Transformation Chevrons down the Center!
    for (const railX of [118, 394]) {
      ectx.strokeStyle = '#22c55e';
      ectx.lineWidth = 4;
      ectx.globalAlpha = 0.55;
      ectx.beginPath();
      ectx.moveTo(railX, 0);
      ectx.lineTo(railX, S);
      ectx.stroke();

      // Bright high-speed energy data packets racing along the side conduits (2 cycles per 512px)
      for (const py of [32, 160, 288, 416]) {
        for (const oy of [-S, 0, S]) {
          const pg = ectx.createLinearGradient(0, py + oy - 36, 0, py + oy + 36);
          pg.addColorStop(0, 'rgba(74, 222, 128, 0)');
          pg.addColorStop(0.5, '#dcfce7');
          pg.addColorStop(1, 'rgba(74, 222, 128, 0)');
          ectx.strokeStyle = pg;
          ectx.lineWidth = 9;
          ectx.globalAlpha = 0.95;
          ectx.beginPath();
          ectx.moveTo(railX, py + oy - 36);
          ectx.lineTo(railX, py + oy + 36);
          ectx.stroke();
        }
      }
    }

    // Sweeping Center Omnitrix Radar Scan Chevrons & Hourglass Pulse Waves (period 256 -> seamless modulo 512!)
    for (const wy of [0, 256]) {
      for (const oy of [-S, 0, S]) {
        const y0 = wy + oy;
        // Soft glowing alien energy wave band across the armor
        const wg = ectx.createLinearGradient(0, y0 - 44, 0, y0 + 44);
        wg.addColorStop(0, 'rgba(34, 197, 94, 0)');
        wg.addColorStop(0.5, 'rgba(74, 222, 128, 0.52)');
        wg.addColorStop(1, 'rgba(34, 197, 94, 0)');
        ectx.fillStyle = wg;
        ectx.globalAlpha = 1;
        ectx.fillRect(120, y0 - 44, 272, 88);

        // Razor-sharp glowing forward-pointing Omnitrix chevron pulse
        ectx.strokeStyle = '#bbf7d0';
        ectx.lineWidth = 6;
        ectx.lineCap = 'round';
        ectx.lineJoin = 'miter';
        ectx.globalAlpha = 0.92;
        ectx.beginPath();
        ectx.moveTo(148, y0 + 28);
        ectx.lineTo(256, y0 - 24);
        ectx.lineTo(364, y0 + 28);
        ectx.stroke();

        // Secondary trailing echo chevron
        ectx.strokeStyle = '#4ade80';
        ectx.lineWidth = 3;
        ectx.globalAlpha = 0.65;
        ectx.beginPath();
        ectx.moveTo(172, y0 + 48);
        ectx.lineTo(256, y0 + 6);
        ectx.lineTo(340, y0 + 48);
        ectx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ectx.globalAlpha = 1;
  } else if (livery === 'animSakuraStorm') {
    // Midnight Japanese Sakura Petal Storm: Deep twilight indigo + swirling misty ribbons & glowing pink petals!
    ctx.fillStyle = '#120824';
    ctx.fillRect(0, 0, S, S);

    // Seamless moonlit pink-violet wind ribbons
    for (const [baseY, col, amp] of [
      [110, 'rgba(244, 114, 182, 0.34)', 34],
      [280, 'rgba(192, 132, 252, 0.32)', 38],
      [430, 'rgba(251, 207, 232, 0.28)', 30],
    ] as [number, string, number][]) {
      for (const target of [ctx, ectx]) {
        target.save();
        target.strokeStyle = col;
        target.lineWidth = target === ectx ? 16 : 24;
        target.lineCap = 'round';
        for (const oy of [-S, 0, S]) {
          target.beginPath();
          for (let x = 0; x <= S; x += 8) {
            const t = (x / S) * Math.PI * 2;
            const y = baseY + oy + Math.sin(t * 2 + baseY * 0.01) * amp;
            if (x === 0) target.moveTo(x, y);
            else target.lineTo(x, y);
          }
          target.stroke();
        }
        target.restore();
      }
    }

    // 78 Seamless drifting glowing Sakura cherry blossom petals
    let seed = 77109;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 78; i++) {
      const px = rand() * S;
      const py = rand() * S;
      const ang = rand() * Math.PI * 2;
      const rx = 5 + rand() * 7;
      const ry = 3 + rand() * 4;
      const col = i % 3 === 0 ? '#fbcfe8' : i % 3 === 1 ? '#f472b6' : '#f9a8d4';
      for (const ox of [-S, 0, S]) {
        for (const oy of [-S, 0, S]) {
          if (px + ox < -20 || px + ox > S + 20 || py + oy < -20 || py + oy > S + 20) continue;
          for (const target of [ctx, ectx]) {
            target.save();
            target.translate(px + ox, py + oy);
            target.rotate(ang);
            target.fillStyle = col;
            target.globalAlpha = target === ectx ? 0.78 : 0.94;
            target.beginPath();
            target.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
            target.fill();
            target.restore();
          }
        }
      }
    }
    ctx.globalAlpha = 1;
    ectx.globalAlpha = 1;
  } else if (livery === 'animGlitchCorrupt') {
    // Cyberpunk RGB Digital Glitch Scanlines: Pitch-black chassis sliced by chromatic cyan/magenta/white blocks!
    ctx.fillStyle = '#07070c';
    ctx.fillRect(0, 0, S, S);

    // Subtle CRT horizontal scanline texture
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let y = 0; y < S; y += 4) {
      ctx.fillRect(0, y, S, 1.5);
    }

    let seed = 40413;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    // Corrupted RGB-split glitch bars (seamless in X & Y)
    for (let i = 0; i < 58; i++) {
      const gx = rand() * S;
      const gy = Math.floor(rand() * 64) * 8;
      const gw = 24 + rand() * 140;
      const gh = i % 5 === 0 ? 12 : 4 + Math.floor(rand() * 3) * 4;
      const shift = 5 + rand() * 8;

      for (const ox of [-S, 0, S]) {
        for (const target of [ctx, ectx]) {
          target.globalAlpha = target === ectx ? 0.85 : 0.92;
          // Cyan left chromatic channel
          target.fillStyle = '#06b6d4';
          target.fillRect(gx + ox - shift, gy, gw, gh);
          // Magenta right chromatic channel
          target.fillStyle = '#ec4899';
          target.fillRect(gx + ox + shift, gy, gw, gh);
          // White hot center core glitch bar
          target.fillStyle = i % 3 === 0 ? '#ffffff' : '#e0f2fe';
          target.fillRect(gx + ox, gy, gw * 0.82, gh * 0.72);
        }
      }
    }
    ctx.globalAlpha = 1;
    ectx.globalAlpha = 1;
  } else if (livery === 'animToxicAcid') {
    // Radioactive Bubbling Toxic Acid Pool: Biohazard dark slate overflowing with neon-lime oozing rivers & bubbles!
    ctx.fillStyle = '#071409';
    ctx.fillRect(0, 0, S, S);

    // Seamless oozing toxic acid wave rivers
    for (const [baseY, amp, freq] of [
      [84, 34, 2],
      [212, 40, 3],
      [348, 32, 2],
      [462, 36, 3],
    ]) {
      for (const target of [ctx, ectx]) {
        target.save();
        target.lineCap = 'round';
        for (const oy of [-S, 0, S]) {
          target.strokeStyle = '#4d7c0f';
          target.lineWidth = target === ectx ? 38 : 48;
          target.globalAlpha = target === ectx ? 0.55 : 0.85;
          target.beginPath();
          for (let x = 0; x <= S; x += 8) {
            const t = (x / S) * Math.PI * 2;
            const y = baseY + oy + Math.sin(t * freq + baseY * 0.02) * amp;
            if (x === 0) target.moveTo(x, y);
            else target.lineTo(x, y);
          }
          target.stroke();

          target.strokeStyle = '#a3e635';
          target.lineWidth = target === ectx ? 16 : 20;
          target.globalAlpha = 0.95;
          target.stroke();

          target.strokeStyle = '#ecfccb';
          target.lineWidth = 4;
          target.stroke();
        }
        target.restore();
      }
    }

    // Bubbling glowing toxic acid spheres (seamless)
    let seed = 23592;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 62; i++) {
      const bx = rand() * S;
      const by = rand() * S;
      const br = 4 + rand() * 14;
      for (const ox of [-S, 0, S]) {
        for (const oy of [-S, 0, S]) {
          if (bx + ox < -20 || bx + ox > S + 20 || by + oy < -20 || by + oy > S + 20) continue;
          ctx.fillStyle = '#0b1f0e';
          ctx.beginPath();
          ctx.arc(bx + ox, by + oy, br, 0, Math.PI * 2);
          ctx.fill();
          for (const target of [ctx, ectx]) {
            target.strokeStyle = i % 2 === 0 ? '#bef264' : '#84cc16';
            target.lineWidth = 2.6;
            target.beginPath();
            target.arc(bx + ox, by + oy, br, 0, Math.PI * 2);
            target.stroke();
          }
        }
      }
    }
    ctx.globalAlpha = 1;
    ectx.globalAlpha = 1;
  } else if (livery === 'animOceanBiolum') {
    // Deep Abyssal Bioluminescent Ocean Waves & Glowing Electric-Teal Plankton Trails!
    ctx.fillStyle = '#020c1b';
    ctx.fillRect(0, 0, S, S);

    // Layered rolling bioluminescent seafoam crests (seamless in X & Y)
    for (const [baseY, amp, freq, col, core] of [
      [72, 26, 2, '#0284c7', '#7dd3fc'],
      [186, 34, 3, '#0d9488', '#5eead4'],
      [304, 28, 2, '#0369a1', '#38bdf8'],
      [428, 32, 3, '#14b8a6', '#ccfbf1'],
    ] as [number, number, number, string, string][]) {
      for (const target of [ctx, ectx]) {
        target.save();
        target.lineCap = 'round';
        for (const oy of [-S, 0, S]) {
          target.strokeStyle = col;
          target.lineWidth = target === ectx ? 28 : 38;
          target.globalAlpha = target === ectx ? 0.5 : 0.72;
          target.beginPath();
          for (let x = 0; x <= S; x += 8) {
            const t = (x / S) * Math.PI * 2;
            const y =
              baseY +
              oy +
              Math.sin(t * freq + baseY * 0.015) * amp +
              Math.cos(t * (freq + 1)) * (amp * 0.3);
            if (x === 0) target.moveTo(x, y);
            else target.lineTo(x, y);
          }
          target.stroke();

          target.strokeStyle = core;
          target.lineWidth = 5;
          target.globalAlpha = 0.96;
          target.stroke();
        }
        target.restore();
      }
    }

    // Glowing floating bioluminescent plankton sparkles
    let seed = 51923;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 160; i++) {
      const px = rand() * S;
      const py = rand() * S;
      const pr = 1.0 + rand() * 2.4;
      const c = i % 2 === 0 ? '#5eead4' : '#7dd3fc';
      for (const target of [ctx, ectx]) {
        target.fillStyle = c;
        target.globalAlpha = 0.85;
        target.beginPath();
        target.arc(px, py, pr, 0, Math.PI * 2);
        target.fill();
      }
    }
    ctx.globalAlpha = 1;
    ectx.globalAlpha = 1;
  } else if (livery === 'animHeartbeatEcg') {
    // Crimson ECG Heartbeat Monitor: Dark clinical grid + razor-sharp glowing red-white heartbeat waveform spikes!
    ctx.fillStyle = '#09090d';
    ctx.fillRect(0, 0, S, S);

    // Subtle dark-red ECG oscilloscope grid (exact 32px spacing)
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.22)';
    ctx.lineWidth = 1.4;
    for (let g = 0; g < S; g += 32) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, S);
      ctx.moveTo(0, g);
      ctx.lineTo(S, g);
      ctx.stroke();
    }

    // Draw 4 crisp vertical-running ECG pulse lines along the length of the car (seamless in Y, 2 beats per 512px)
    const beatCols = [64, 192, 320, 448];
    const beatOffsets: [number, number][] = [
      [0, 0], [56, 0], [72, -14], [86, 8], [100, -54], [116, 44], [130, -18], [148, 0], [256, 0],
    ];
    for (const bx of beatCols) {
      for (const target of [ctx, ectx]) {
        target.save();
        target.lineCap = 'round';
        target.lineJoin = 'round';
        for (const [col, lw, alpha] of [
          ['#dc2626', target === ectx ? 14 : 16, 0.55],
          ['#f43f5e', 6, 0.92],
          ['#fff1f2', 2.4, 1.0],
        ] as [string, number, number][]) {
          target.strokeStyle = col;
          target.lineWidth = lw;
          target.globalAlpha = alpha;
          target.beginPath();
          for (let cyc = 0; cyc < 2; cyc++) {
            const yBase = cyc * 256;
            beatOffsets.forEach(([dy, dx], idx) => {
              const px = bx + dx;
              const py = yBase + dy;
              if (cyc === 0 && idx === 0) target.moveTo(px, py);
              else target.lineTo(px, py);
            });
          }
          target.stroke();
        }
        target.restore();
      }
    }
    ctx.globalAlpha = 1;
    ectx.globalAlpha = 1;
  } else if (livery === 'animHoloCircuit') {
    // Royal 24K Gold Microchip PCB: Deep emerald-black board + precision 45° golden traces & luminous data pulses!
    ctx.fillStyle = '#041c1a';
    ctx.fillRect(0, 0, S, S);

    // Subtle dark micro-grid etched onto motherboard
    ctx.strokeStyle = 'rgba(20, 184, 166, 0.12)';
    ctx.lineWidth = 1;
    for (let g = 0; g < S; g += 16) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, S);
      ctx.moveTo(0, g);
      ctx.lineTo(S, g);
      ctx.stroke();
    }

    // 16 Seamless Gold PCB traces with 45-degree dogleg bends & glowing solder nodes
    for (let c = 0; c < 16; c++) {
      const x = c * 32 + 16;
      const jog = c % 2 === 0 ? 12 : -12;
      const isPowerBus = c % 3 === 0;
      const pts: [number, number][] = [
        [x, 0],
        [x, 96],
        [x + jog, 128],
        [x + jog, 256],
        [x, 288],
        [x, 416],
        [x + jog, 448],
        [x + jog, 480],
        [x, 512],
      ];

      ctx.strokeStyle = isPowerBus ? '#f59e0b' : '#b45309';
      ctx.lineWidth = isPowerBus ? 4.2 : 2.6;
      ctx.beginPath();
      pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
      ctx.stroke();

      // Glowing golden data-packet bursts traveling along the traces on emissive map
      const pulseY = ((c * 97) % S);
      for (const target of [ctx, ectx]) {
        target.strokeStyle = target === ectx ? '#fef08a' : '#fde047';
        target.lineWidth = isPowerBus ? 5 : 3.4;
        target.globalAlpha = 0.95;
        target.beginPath();
        pts.forEach(([px, py], i) => (i === 0 ? target.moveTo(px, py) : target.lineTo(px, py)));
        target.stroke();

        // Bright golden solder pad via nodes
        target.fillStyle = '#fef08a';
        target.beginPath();
        target.arc(x, pulseY, isPowerBus ? 6 : 4, 0, Math.PI * 2);
        target.fill();
      }
    }
    ctx.globalAlpha = 1;
    ectx.globalAlpha = 1;
  } else if (livery === 'animHypnoSpiral') {
    // Optical-Illusion Hypno Waves: High-contrast hypnotic concentric wave bands + neon violet highlight!
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, S, S);

    // 16 Seamless interlocking hypnotic sinusoidal bands (exact 32px period along Y)
    for (let band = -2; band <= 18; band++) {
      const baseY = band * 32;
      const isLight = band % 2 === 0;
      const isVioletAccent = band % 4 === 0;
      ctx.strokeStyle = isVioletAccent ? '#c084fc' : isLight ? '#f8fafc' : '#18181b';
      ctx.lineWidth = 16;
      ctx.beginPath();
      for (let x = 0; x <= S; x += 8) {
        const t = (x / S) * Math.PI * 2;
        const y = baseY + Math.sin(t * 2) * 28;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (isVioletAccent) {
        ectx.strokeStyle = '#e879f9';
        ectx.lineWidth = 9;
        ectx.globalAlpha = 0.9;
        ectx.beginPath();
        for (let x = 0; x <= S; x += 8) {
          const t = (x / S) * Math.PI * 2;
          const y = baseY + Math.sin(t * 2) * 28;
          if (x === 0) ectx.moveTo(x, y);
          else ectx.lineTo(x, y);
        }
        ectx.stroke();
      }
    }
    ectx.globalAlpha = 1;
  } else if (livery === 'animWarpHyperdrive') {
    // Hyperspace Light-Speed Jump: Deep void pierced by hundreds of blazing stretched blue-white starlight streaks!
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, S, S);

    // Subtle cosmic blue tunnel glow down center
    const wg = ctx.createLinearGradient(0, 0, S, 0);
    wg.addColorStop(0, 'rgba(37, 99, 235, 0.28)');
    wg.addColorStop(0.5, 'rgba(2, 6, 23, 0)');
    wg.addColorStop(1, 'rgba(37, 99, 235, 0.28)');
    ctx.fillStyle = wg;
    ctx.fillRect(0, 0, S, S);

    let seed = 11380;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    // 110 Stretched hyperspace starlight streaks (seamless in Y)
    for (let i = 0; i < 110; i++) {
      const sx = rand() * S;
      const sy = rand() * S;
      const len = 45 + rand() * 175;
      const w = 1.2 + rand() * 3.4;
      const col = i % 5 === 0 ? '#ffffff' : i % 3 === 0 ? '#67e8f9' : '#60a5fa';
      for (const oy of [-S, 0, S]) {
        for (const target of [ctx, ectx]) {
          const sg = target.createLinearGradient(sx, sy + oy, sx, sy + oy + len);
          sg.addColorStop(0, 'rgba(255,255,255,0)');
          sg.addColorStop(0.75, col);
          sg.addColorStop(1, '#ffffff');
          target.fillStyle = sg;
          target.globalAlpha = target === ectx ? 0.92 : 0.96;
          target.fillRect(sx - w * 0.5, sy + oy, w, len);
        }
      }
    }
    ctx.globalAlpha = 1;
    ectx.globalAlpha = 1;
  } else if (livery === 'animCyberEqualizer') {
    // Neon Club DJ Audio Spectrum Equalizer: Stepping LED bars from Emerald -> Yellow -> Hot Pink -> Violet!
    ctx.fillStyle = '#08080e';
    ctx.fillRect(0, 0, S, S);

    const cols = 16; // 32px per column
    const segH = 16; // 32 rows
    const colHeights = [18, 24, 14, 28, 22, 30, 16, 26, 26, 16, 30, 22, 28, 14, 24, 18];

    for (let c = 0; c < cols; c++) {
      const x = c * 32 + 4;
      const peak = colHeights[c];
      for (let r = 0; r < 32; r++) {
        const y = r * segH + 2;
        const distFromMid = Math.abs(r - 15.5);
        const lit = distFromMid < peak * 0.5;
        if (!lit) {
          ctx.fillStyle = '#181826';
          ctx.fillRect(x, y, 24, segH - 4);
          continue;
        }
        const frac = distFromMid / 16;
        const col =
          frac < 0.25
            ? '#22c55e'
            : frac < 0.5
              ? '#facc15'
              : frac < 0.72
                ? '#ec4899'
                : '#a855f7';
        for (const target of [ctx, ectx]) {
          target.fillStyle = col;
          target.globalAlpha = target === ectx ? 0.9 : 0.96;
          target.fillRect(x, y, 24, segH - 4);
        }
      }
    }
    ctx.globalAlpha = 1;
    ectx.globalAlpha = 1;
  } else if (livery === 'animSolarEclipse') {
    // Cosmic Solar Eclipse Corona: Pitch-black solar umbra bands framed by blazing white-gold & crimson coronal loops!
    ctx.fillStyle = '#060304';
    ctx.fillRect(0, 0, S, S);

    // Sweeping fiery coronal plasma arches (seamless in X & Y)
    for (const [baseY, amp, freq, phase] of [
      [128, 42, 2, 0.2],
      [256, 36, 1, 2.4],
      [384, 42, 2, 4.1],
    ]) {
      for (const target of [ctx, ectx]) {
        target.save();
        target.lineCap = 'round';
        for (const oy of [-S, 0, S]) {
          for (const [col, lw, alpha] of [
            ['#991b1b', target === ectx ? 48 : 58, 0.55],
            ['#ea580c', target === ectx ? 26 : 32, 0.85],
            ['#facc15', 10, 0.98],
            ['#ffffff', 3.2, 1.0],
          ] as [string, number, number][]) {
            target.strokeStyle = col;
            target.lineWidth = lw;
            target.globalAlpha = alpha;
            target.beginPath();
            for (let x = 0; x <= S; x += 8) {
              const t = (x / S) * Math.PI * 2;
              const y = baseY + oy + Math.sin(t * freq + phase) * amp;
              if (x === 0) target.moveTo(x, y);
              else target.lineTo(x, y);
            }
            target.stroke();
          }
        }
        target.restore();
      }
    }

    // Dramatic pitch-black solar eclipse discs occluding parts of the blazing corona!
    for (const [ex, ey, er] of [
      [128, 128, 52],
      [384, 384, 52],
      [256, 256, 44],
    ]) {
      ctx.fillStyle = '#030203';
      ctx.beginPath();
      ctx.arc(ex, ey, er, 0, Math.PI * 2);
      ctx.fill();
      ectx.fillStyle = '#000000';
      ectx.beginPath();
      ectx.arc(ex, ey, er - 2, 0, Math.PI * 2);
      ectx.fill();
      // Blazing diamond-ring eclipse rim
      for (const target of [ctx, ectx]) {
        target.strokeStyle = '#fef08a';
        target.lineWidth = 4;
        target.beginPath();
        target.arc(ex, ey, er, 0, Math.PI * 2);
        target.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ectx.globalAlpha = 1;
  } else if (livery === 'animCrysisNanosuit') {
    // Crysis Nanosuit 2.0 ("MAXIMUM ARMOR"): Sculpted Carbon-Graphene Synthetic Muscle Fibers,
    // Articulated Titanium Spine Plates, Glowing Crimson Visor Slit + Live Sweeping Hexagonal Nano-Shield Wave!
    const bg = ctx.createLinearGradient(0, 0, S, 0);
    bg.addColorStop(0, '#07090d');
    bg.addColorStop(0.24, '#111622');
    bg.addColorStop(0.5, '#192030');
    bg.addColorStop(0.76, '#111622');
    bg.addColorStop(1, '#07090d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, S, S);

    // 1. Subtle CryNet Micro-Hexagonal Ballistic Carbon Skin across the Entire Suit
    const microR = 16;
    const mdx = microR * 1.5;
    const mdy = microR * Math.sqrt(3);
    for (let col = -1; col < 24; col++) {
      for (let row = -1; row < 20; row++) {
        const cx = col * mdx;
        const cy = row * mdy + ((col & 1) === 0 ? 0 : mdy * 0.5);
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k * Math.PI) / 3;
          const px = cx + Math.cos(a) * (microR - 1.4);
          const py = cy + Math.sin(a) * (microR - 1.4);
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = (col + row) % 3 === 0 ? 'rgba(30, 41, 59, 0.42)' : 'rgba(15, 23, 42, 0.55)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }
    }

    // 2. Signature Crysis Sculpted Synthetic Muscle Fiber Bundles (Symmetrical Anatomical Striations!)
    for (const isRight of [false, true]) {
      ctx.save();
      if (isRight) {
        ctx.translate(S, 0);
        ctx.scale(-1, 1);
      }

      const drawMuscleBundle = (
        x0: number,
        y0: number,
        cx1: number,
        cy1: number,
        x1: number,
        y1: number,
        width: number,
        striations: number,
      ) => {
        // Deep recessed obsidian muscle cleft shadow
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#030508';
        ctx.lineWidth = width + 8;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(cx1, cy1, x1, y1);
        ctx.stroke();

        // Dark graphite-titanium synthetic muscle body
        ctx.strokeStyle = '#1e2533';
        ctx.lineWidth = width;
        ctx.stroke();

        // Raised metallic carbon fiber specular ridge
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = width * 0.34;
        ctx.beginPath();
        ctx.moveTo(x0 - 2, y0 - 2);
        ctx.quadraticCurveTo(cx1 - 2, cy1 - 2, x1 - 2, y1 - 2);
        ctx.stroke();

        // Crisp parallel nano-muscle fiber striations running along the bundle
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.22)';
        ctx.lineWidth = 1.3;
        for (let s = -striations; s <= striations; s++) {
          const off = s * (width * 0.16);
          ctx.beginPath();
          ctx.moveTo(x0 + off, y0);
          ctx.quadraticCurveTo(cx1 + off, cy1, x1 + off, y1);
          ctx.stroke();
        }
      };

      // Pectoral / Hood Sculpted Carbon Muscle Arcs
      drawMuscleBundle(206, 44, 148, 72, 108, 126, 20, 2);
      drawMuscleBundle(202, 168, 142, 198, 92, 246, 24, 2);
      // Deltoid / Flank Diagonal Synthetic Muscle Ribs
      drawMuscleBundle(110, 48, 62, 118, 26, 196, 22, 2);
      drawMuscleBundle(106, 186, 56, 264, 22, 344, 24, 2);
      drawMuscleBundle(118, 326, 68, 396, 28, 488, 22, 2);
      // Rear Haunch / Shoulder Muscle Striations
      drawMuscleBundle(204, 304, 146, 356, 102, 434, 22, 2);
      drawMuscleBundle(206, 410, 158, 456, 126, 502, 18, 2);

      // Brushed Titanium Flank Armor Exo-Ribs cutting over the muscle fibers
      ctx.fillStyle = '#0f131c';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      for (const ry of [126, 262, 396]) {
        ctx.beginPath();
        ctx.moveTo(0, ry);
        ctx.lineTo(78, ry + 26);
        ctx.lineTo(72, ry + 48);
        ctx.lineTo(0, ry + 24);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Articulated Dark-Tungsten Nanosuit Spinal/Chest Armor Spine down the Center (x = 206..306)
    const spineBg = ctx.createLinearGradient(204, 0, 308, 0);
    spineBg.addColorStop(0, '#04060a');
    spineBg.addColorStop(0.18, '#1e2636');
    spineBg.addColorStop(0.5, '#0f141e');
    spineBg.addColorStop(0.82, '#1e2636');
    spineBg.addColorStop(1, '#04060a');
    ctx.fillStyle = spineBg;
    ctx.fillRect(206, 0, 100, S);

    // Interlocking armored Nanosuit thoracic/spinal vertebrae segments
    for (let sy = 14; sy < S; sy += 46) {
      if (sy > 84 && sy < 180) continue; // Keep hood visor brow plate unobstructed
      const segGrad = ctx.createLinearGradient(216, sy, 296, sy + 34);
      segGrad.addColorStop(0, '#334155');
      segGrad.addColorStop(0.5, '#1e293b');
      segGrad.addColorStop(1, '#0b1019');
      ctx.fillStyle = segGrad;
      ctx.beginPath();
      ctx.moveTo(222, sy);
      ctx.lineTo(290, sy);
      ctx.lineTo(298, sy + 18);
      ctx.lineTo(282, sy + 34);
      ctx.lineTo(230, sy + 34);
      ctx.lineTo(214, sy + 18);
      ctx.closePath();
      ctx.fill();

      // Chamfered steel top edge highlight
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Central recessed dark titanium spine channel & subtle cyan power pip
      ctx.fillStyle = '#070a10';
      ctx.fillRect(249, sy + 7, 14, 20);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(253, sy + 13, 6, 8);
    }

    // Precision Cyan-Silver Nano-Conduit Seam Rails flanking the spine
    for (const sx of [204, 308]) {
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(sx - 2, 0, 4, S);
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(sx - 0.8, 0, 1.6, S);
    }

    // 4. Iconic Crysis Nanosuit Helmet Brow & Glowing Crimson Optical Visor Slit on Hood (y ≈ 98..172)
    ctx.save();
    // Sculpted angular tungsten helmet/chest brow housing
    const browGrad = ctx.createLinearGradient(168, 92, 344, 178);
    browGrad.addColorStop(0, '#334155');
    browGrad.addColorStop(0.5, '#111622');
    browGrad.addColorStop(1, '#06080d');
    ctx.fillStyle = browGrad;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(174, 108);
    ctx.lineTo(256, 88);
    ctx.lineTo(338, 108);
    ctx.lineTo(318, 168);
    ctx.lineTo(256, 182);
    ctx.lineTo(194, 168);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Recessed pitch-black visor trough
    ctx.fillStyle = '#030407';
    ctx.beginPath();
    ctx.moveTo(186, 122);
    ctx.lineTo(256, 138);
    ctx.lineTo(326, 122);
    ctx.lineTo(314, 148);
    ctx.lineTo(256, 162);
    ctx.lineTo(198, 148);
    ctx.closePath();
    ctx.fill();

    // Fierce Glowing Crysis Crimson-Red Split Tactical Visor Lenses!
    for (const isRight of [false, true]) {
      ctx.save();
      if (isRight) {
        ctx.translate(S, 0);
        ctx.scale(-1, 1);
      }
      // Red optical bloom halo
      ctx.fillStyle = 'rgba(239, 68, 68, 0.36)';
      ctx.beginPath();
      ctx.moveTo(188, 122);
      ctx.lineTo(248, 138);
      ctx.lineTo(246, 156);
      ctx.lineTo(198, 145);
      ctx.closePath();
      ctx.fill();

      // Razor-sharp crimson visor lens
      const visorGrad = ctx.createLinearGradient(192, 126, 246, 152);
      visorGrad.addColorStop(0, '#dc2626');
      visorGrad.addColorStop(0.55, '#ef4444');
      visorGrad.addColorStop(1, '#fca5a5');
      ctx.fillStyle = visorGrad;
      ctx.beginPath();
      ctx.moveTo(194, 127);
      ctx.lineTo(246, 140);
      ctx.lineTo(244, 151);
      ctx.lineTo(202, 141);
      ctx.closePath();
      ctx.fill();

      // White-hot optical glint inside visor
      ctx.fillStyle = '#fee2e2';
      ctx.beginPath();
      ctx.moveTo(204, 131);
      ctx.lineTo(238, 141);
      ctx.lineTo(237, 145);
      ctx.lineTo(206, 136);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Crisp micro tactical stencil on lower hood armor collar
    ctx.fillStyle = 'rgba(186, 230, 253, 0.72)';
    ctx.font = '800 13px "Oxanium", "Consolas", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CRYNET • NANO 2.0', 256, 171);
    ctx.restore();

    // 5. LIVE ANIMATED EMISSIVE LAYER (100% Seamlessly Tileable in Y modulo 512!):
    //    Crysis "MAXIMUM ARMOR" Sweeping Hexagonal Energy Shield Wave + Nano-Spine Telemetry Pulses!
    const eHexW = 32; // exact divisor of 512 (16 cols)
    const eHexH = 32; // exact divisor of 512 (16 rows) -> 100% seamless vertical wrap!
    const eHexR = 17.5;

    for (let row = -1; row <= S / eHexH + 1; row++) {
      const cy = row * eHexH;
      const offX = (row & 1) !== 0 ? eHexW * 0.5 : 0;
      for (let col = -1; col <= S / eHexW + 1; col++) {
        const cx = col * eHexW + offX;
        // Sweeping V-chevron Maximum Armor activation wave (2 full seamless cycles per 512px)
        const waveY = cy - Math.abs(cx - 256) * 0.42;
        const wave = 0.5 + 0.5 * Math.cos((waveY / S) * Math.PI * 4);
        const energy = Math.pow(wave, 3.2);
        if (energy < 0.08) continue;

        ectx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k * Math.PI) / 3 + Math.PI / 6;
          const px = cx + Math.cos(a) * eHexR;
          const py = cy + Math.sin(a) * eHexR;
          if (k === 0) ectx.moveTo(px, py);
          else ectx.lineTo(px, py);
        }
        ectx.closePath();

        // Translucent glowing ice-cyan Maximum Armor hex facet fill at wave crest
        if (energy > 0.32) {
          ectx.fillStyle = energy > 0.74 ? '#bae6fd' : '#0284c7';
          ectx.globalAlpha = (energy - 0.32) * 0.52;
          ectx.fill();
        }

        // Razor-sharp glowing hexagonal honeycomb lattice outline
        ectx.strokeStyle = energy > 0.72 ? '#ffffff' : energy > 0.42 ? '#7dd3fc' : '#0ea5e9';
        ectx.lineWidth = 1.4 + energy * 2.6;
        ectx.globalAlpha = Math.min(1, energy * 1.15);
        ectx.stroke();
      }
    }

    // Surging Nano-Telemetry Energy Packets racing along both Spinal Rails (seamless modulo 512)
    for (const railX of [204, 308]) {
      ectx.strokeStyle = '#0ea5e9';
      ectx.lineWidth = 3.2;
      ectx.globalAlpha = 0.45;
      ectx.beginPath();
      ectx.moveTo(railX, 0);
      ectx.lineTo(railX, S);
      ectx.stroke();

      for (const py of [64, 320]) {
        for (const oy of [-S, 0, S]) {
          const pg = ectx.createLinearGradient(0, py + oy - 48, 0, py + oy + 48);
          pg.addColorStop(0, 'rgba(56, 189, 248, 0)');
          pg.addColorStop(0.5, '#f0f9ff');
          pg.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ectx.strokeStyle = pg;
          ectx.lineWidth = 7.5;
          ectx.globalAlpha = 0.95;
          ectx.beginPath();
          ectx.moveTo(railX, py + oy - 48);
          ectx.lineTo(railX, py + oy + 48);
          ectx.stroke();
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
    paintFinish === 'emeraldLiquid' ||
    paintFinish === 'brushedTitanium' ||
    paintFinish === 'copperLiquid';
  if (livery === 'solid' && !needsBaseTex) return null;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const isDynamicFinish =
    paintFinish === 'chameleon' ||
    paintFinish === 'prismHolo' ||
    paintFinish === 'royalGoldHolo' ||
    paintFinish === 'apexEclipse' ||
    paintFinish === 'nebulaShift';
  const effectiveHex =
    paintFinish === 'satinGold'
      ? 0xd4af37
      : paintFinish === 'obsidianChrome'
        ? 0x16161c
        : paintFinish === 'emeraldLiquid'
          ? 0x059669
          : paintFinish === 'copperLiquid'
            ? 0xd97706
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
  } else if (paintFinish === 'brushedTitanium') {
    // Horizontal brushed machined titanium tinted by selected car color
    const metalBase = baseColor.clone().lerp(new THREE.Color(0x94a3b8), 0.52);
    const metalDark = metalBase.clone().multiplyScalar(0.68);
    const metalHi = metalBase.clone().lerp(new THREE.Color(0xf8fafc), 0.42);
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, `#${metalHi.getHexString()}`);
    grad.addColorStop(0.5, `#${metalBase.getHexString()}`);
    grad.addColorStop(1, `#${metalDark.getHexString()}`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 460; i++) {
      const y = (i * 37) % 512;
      const x = (i * 89) % 420;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.15)';
      ctx.fillRect(x, y, 110, 1.3);
    }
  } else if (paintFinish === 'copperLiquid') {
    // Molten rose-copper mirror finish
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#fed7aa');
    grad.addColorStop(0.38, '#ea580c');
    grad.addColorStop(0.72, '#9a3412');
    grad.addColorStop(1, '#fb923c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 220; i++) {
      const y = (i * 59) % 512;
      const x = (i * 107) % 440;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 237, 213, 0.16)' : 'rgba(124, 45, 18, 0.18)';
      ctx.fillRect(x, y, 92, 1.5);
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
  } else if (livery === 'gtNumber') {
    // Classic Racing #01 Hood Roundel + Side Stripes
    ctx.fillStyle = contrastPrimary;
    ctx.fillRect(46, 0, 20, 512);
    ctx.fillRect(446, 0, 20, 512);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(72, 0, 10, 512);
    ctx.fillRect(430, 0, 10, 512);
    // Hood & door white roundel
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(256, 224, 72, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.fillStyle = '#09090b';
    ctx.font = '900 72px "Oxanium", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('01', 256, 228);
  } else if (livery === 'tigerClaw') {
    // Aggressive Triple Claw Scratch Marks across hood & flanks
    const drawClaw = (x0: number, y0: number, x1: number, y1: number) => {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 20;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo((x0 + x1) * 0.5 + 18, (y0 + y1) * 0.5, x1, y1);
      ctx.stroke();
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 10;
      ctx.stroke();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.restore();
    };
    drawClaw(115, 42, 235, 310);
    drawClaw(178, 30, 298, 300);
    drawClaw(242, 48, 362, 318);
    drawClaw(34, 240, 146, 468);
    drawClaw(478, 240, 366, 468);
  } else if (livery === 'tokyoDrifter') {
    // Bold Red/White Japanese Street Drift Diagonal Slashes & Graphic Blocks
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, 512, 44);
    ctx.beginPath();
    ctx.moveTo(0, 160);
    ctx.lineTo(220, 310);
    ctx.lineTo(220, 385);
    ctx.lineTo(0, 235);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(512, 160);
    ctx.lineTo(292, 310);
    ctx.lineTo(292, 385);
    ctx.lineTo(512, 235);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(236, 44, 40, 468);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(256, 155, 46, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#f8fafc' : '#ef4444';
      ctx.fillRect(22 + i * 22, 420, 14, 52);
      ctx.fillRect(476 - i * 22, 420, 14, 52);
    }
  } else if (livery === 'cyberHexArmor') {
    // Tactical 3D Beveled Carbon-Titanium Hexagonal Armor Plating with Recessed Rivet Seams & Cyan/Amber Energy Conduits!
    const bg = ctx.createLinearGradient(0, 0, 512, 512);
    bg.addColorStop(0, '#05080f');
    bg.addColorStop(0.5, '#0b111e');
    bg.addColorStop(1, '#04070d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 512);

    // 1. Individual 3D-Beveled Hexagonal Titanium-Carbon Armor Cells
    const hexR = 26;
    const dx = hexR * 1.5;
    const dy = hexR * Math.sqrt(3);
    const hexVerts = (cx: number, cy: number, r: number): [number, number][] => {
      const pts: [number, number][] = [];
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3;
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      return pts;
    };

    for (let col = -1; col < 16; col++) {
      for (let row = -1; row < 14; row++) {
        const cx = col * dx;
        const cy = row * dy + ((col & 1) === 0 ? 0 : dy * 0.5);
        const pts = hexVerts(cx, cy, hexR - 2.4);
        const hash = Math.abs((col * 17 + row * 31) % 13);
        const isAmberCell = hash === 0;
        const isCyanCell = hash === 4 || hash === 9;
        const isRaised = hash % 3 === 0;

        ctx.save();
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          if (k === 0) ctx.moveTo(pts[k][0], pts[k][1]);
          else ctx.lineTo(pts[k][0], pts[k][1]);
        }
        ctx.closePath();

        // Directional metallic bevel gradient across every single hex plate
        const hg = ctx.createLinearGradient(cx - hexR, cy - hexR, cx + hexR, cy + hexR);
        if (isRaised) {
          hg.addColorStop(0, '#334155');
          hg.addColorStop(0.45, '#1e293b');
          hg.addColorStop(1, '#090e1a');
        } else {
          hg.addColorStop(0, '#1e293b');
          hg.addColorStop(0.5, '#0f172a');
          hg.addColorStop(1, '#04070e');
        }
        ctx.fillStyle = hg;
        ctx.fill();

        // Clip inside cell to draw subtle carbon-weave diagonal micro-hatch
        ctx.clip();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
        ctx.lineWidth = 1.5;
        for (let h = -hexR * 2; h <= hexR * 2; h += 6) {
          ctx.beginPath();
          ctx.moveTo(cx + h - hexR, cy - hexR);
          ctx.lineTo(cx + h + hexR, cy + hexR);
          ctx.stroke();
        }
        ctx.restore();

        // 3D Top-Left Metallic Highlight Edges (verts 3->4->5->0)
        ctx.strokeStyle = isRaised ? 'rgba(203, 213, 225, 0.48)' : 'rgba(148, 163, 184, 0.28)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(pts[3][0], pts[3][1]);
        ctx.lineTo(pts[4][0], pts[4][1]);
        ctx.lineTo(pts[5][0], pts[5][1]);
        ctx.lineTo(pts[0][0], pts[0][1]);
        ctx.stroke();

        // 3D Bottom-Right Recessed Shadow Edges (verts 0->1->2->3)
        ctx.strokeStyle = 'rgba(2, 6, 23, 0.85)';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        ctx.lineTo(pts[1][0], pts[1][1]);
        ctx.lineTo(pts[2][0], pts[2][1]);
        ctx.lineTo(pts[3][0], pts[3][1]);
        ctx.stroke();

        // Glowing tactical power-cell inner bevel on select hex modules
        if (isAmberCell || isCyanCell) {
          const innerPts = hexVerts(cx, cy, hexR - 7.5);
          ctx.strokeStyle = isAmberCell ? '#f59e0b' : '#22d3ee';
          ctx.lineWidth = isAmberCell ? 2.2 : 1.6;
          ctx.globalAlpha = isAmberCell ? 0.9 : 0.72;
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            if (k === 0) ctx.moveTo(innerPts[k][0], innerPts[k][1]);
            else ctx.lineTo(innerPts[k][0], innerPts[k][1]);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }

    // 2. Zig-Zag Glowing Cyan & Amber Energy Conduits Tracing the Hex Seams down Both Flanks
    for (const isRight of [false, true]) {
      ctx.save();
      if (isRight) {
        ctx.translate(512, 0);
        ctx.scale(-1, 1);
      }
      // Subtle cyan conduit outer glow
      ctx.lineCap = 'round';
      ctx.lineJoin = 'miter';
      const traceConduit = (baseX: number, colGlow: string, colCore: string) => {
        ctx.strokeStyle = colGlow;
        ctx.lineWidth = 9;
        ctx.globalAlpha = 0.28;
        ctx.beginPath();
        for (let y = 0; y <= 512; y += 32) {
          const zx = baseX + ((y / 32) % 2 === 0 ? 0 : 18);
          if (y === 0) ctx.moveTo(zx, y);
          else ctx.lineTo(zx, y);
        }
        ctx.stroke();

        ctx.strokeStyle = colCore;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.95;
        ctx.stroke();
        ctx.globalAlpha = 1;
      };
      traceConduit(74, '#22d3ee', '#67e8f9');
      traceConduit(164, '#f59e0b', '#fde047');
      ctx.restore();
    }

    // 3. Recessed Tactical Armor Panel Seams & Machined Steel Rivets
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 4;
    for (const sy of [112, 266, 408]) {
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(192, sy + 24);
      ctx.lineTo(320, sy + 24);
      ctx.lineTo(512, sy);
      ctx.stroke();
      // Metallic steel bolts flanking the seam
      for (const bx of [44, 108, 174, 338, 404, 468]) {
        const by = sy + (bx > 192 && bx < 320 ? 24 : bx < 192 ? (bx / 192) * 24 : ((512 - bx) / 192) * 24);
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(bx, by - 9, 2.8, 0, Math.PI * 2);
        ctx.arc(bx, by + 9, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Sculpted Armored Tactical Center Spine + Hex Reactor Core Emblem on Hood
    const spineGrad = ctx.createLinearGradient(224, 0, 288, 0);
    spineGrad.addColorStop(0, '#020617');
    spineGrad.addColorStop(0.22, '#1e293b');
    spineGrad.addColorStop(0.5, '#0f172a');
    spineGrad.addColorStop(0.78, '#1e293b');
    spineGrad.addColorStop(1, '#020617');
    ctx.fillStyle = spineGrad;
    ctx.fillRect(228, 0, 56, 512);

    // Sharp cyan & amber dual precision rails framing the armored spine
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(224, 0, 4, 512);
    ctx.fillRect(284, 0, 4, 512);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(249, 0, 14, 512);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(254, 0, 4, 512);

    // Angled stealth louver notches cutting across the amber spine
    ctx.fillStyle = '#090d16';
    for (let ly = 26; ly < 500; ly += 42) {
      if (ly > 130 && ly < 220) continue; // keep hood reactor core clear
      ctx.beginPath();
      ctx.moveTo(234, ly);
      ctx.lineTo(256, ly - 10);
      ctx.lineTo(278, ly);
      ctx.lineTo(278, ly + 8);
      ctx.lineTo(256, ly - 2);
      ctx.lineTo(234, ly + 8);
      ctx.closePath();
      ctx.fill();
    }

    // Tactical Hex-Core Armor Badge on Hood (cx=256, cy=174)
    const corePts = hexVerts(256, 174, 34);
    ctx.fillStyle = '#090d16';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      if (k === 0) ctx.moveTo(corePts[k][0], corePts[k][1]);
      else ctx.lineTo(corePts[k][0], corePts[k][1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const innerCorePts = hexVerts(256, 174, 21);
    ctx.fillStyle = '#0e7490';
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      if (k === 0) ctx.moveTo(innerCorePts[k][0], innerCorePts[k][1]);
      else ctx.lineTo(innerCorePts[k][0], innerCorePts[k][1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const microCorePts = hexVerts(256, 174, 9);
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      if (k === 0) ctx.moveTo(microCorePts[k][0], microCorePts[k][1]);
      else ctx.lineTo(microCorePts[k][0], microCorePts[k][1]);
    }
    ctx.closePath();
    ctx.fill();
  } else if (livery === 'gulfHeritage') {
    // Classic Endurance Le Mans Center Orange Stripe with Crisp Dark Navy Pinstripes
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(194, 0, 124, 512);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(204, 0, 104, 512);
    // Subtle dark navy side accent stripes along lower flanks
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(18, 0, 18, 512);
    ctx.fillRect(476, 0, 18, 512);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(22, 0, 10, 512);
    ctx.fillRect(480, 0, 10, 512);
  } else if (livery === 'hazardStripes') {
    // Industrial Yellow & Black Diagonal Warning Chevrons on Nose, Tail & Rocker Flanks
    const drawHazardBand = (x: number, y: number, w: number, h: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.fillStyle = '#facc15';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#111827';
      for (let d = -h - w; d < w + h; d += 28) {
        ctx.beginPath();
        ctx.moveTo(x + d, y);
        ctx.lineTo(x + d + 14, y);
        ctx.lineTo(x + d - h + 14, y + h);
        ctx.lineTo(x + d - h, y + h);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    };
    drawHazardBand(0, 0, 512, 58);
    drawHazardBand(0, 454, 512, 58);
    drawHazardBand(0, 58, 52, 396);
    drawHazardBand(460, 58, 52, 396);
    // Crisp dark border seams
    ctx.fillStyle = '#111827';
    ctx.fillRect(52, 58, 5, 396);
    ctx.fillRect(455, 58, 5, 396);
  } else if (livery === 'sharkMouth') {
    // WW2 Fighter-Jet / Drift-Missile Menacing Shark Mouth Teeth & Eyes on Both Flanks!
    for (const isRight of [false, true]) {
      ctx.save();
      if (isRight) {
        ctx.translate(512, 0);
        ctx.scale(-1, 1);
      }
      // Crimson shark jaw silhouette on flank
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.moveTo(14, 72);
      ctx.quadraticCurveTo(132, 130, 118, 336);
      ctx.quadraticCurveTo(64, 376, 14, 344);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 6;
      ctx.stroke();

      // Razor-sharp jagged white teeth rows
      ctx.fillStyle = '#f8fafc';
      for (let i = 0; i < 6; i++) {
        const y0 = 104 + i * 38;
        ctx.beginPath();
        ctx.moveTo(24, y0);
        ctx.lineTo(84, y0 + 18);
        ctx.lineTo(24, y0 + 34);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      // Fierce slanted shark eye on front fender
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(152, 142, 22, 14, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(154, 142, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (livery === 'martiniRally') {
    // Legendary Tri-Color Motorsport Rally Stripes (Sky Cyan, Cobalt Blue, Racing Crimson)
    const drawTriStripe = (cx: number, scale: number) => {
      const bars: [number, number, string][] = [
        [-48, 22, '#38bdf8'],
        [-26, 20, '#1d4ed8'],
        [-6, 18, '#ef4444'],
        [12, 20, '#1d4ed8'],
        [32, 16, '#38bdf8'],
      ];
      for (const [ox, w, c] of bars) {
        ctx.fillStyle = c;
        ctx.fillRect(cx + ox * scale, 0, w * scale, 512);
      }
    };
    drawTriStripe(256, 1.0);
    // Flanking side sweep stripes
    drawTriStripe(52, 0.55);
    drawTriStripe(460, 0.55);
  } else if (livery === 'minecraftPixel') {
    // Full-Wrap Crisp 16x16 Quantized Minecraft Voxel Mosaic: Stone, Grass Flanks & Glowing Diamond Ore!
    const tile = 32; // 16x16 chunky pixels across 512px
    let seed = 31415;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const stonePalette = ['#475569', '#526072', '#64748b', '#334155', '#5b6778'];
    const grassPalette = ['#16a34a', '#22c55e', '#15803d', '#4ade80'];

    for (let gx = 0; gx < 16; gx++) {
      for (let gy = 0; gy < 16; gy++) {
        const isFlankGrass = gx <= 2 || gx >= 13;
        const r = rand();
        let col: string;
        if (isFlankGrass) {
          col = grassPalette[Math.floor(r * grassPalette.length)];
        } else if (r > 0.84) {
          // Sparkling Cyan Diamond Ore voxel!
          col = r > 0.92 ? '#67e8f9' : '#22d3ee';
        } else {
          col = stonePalette[Math.floor(r * stonePalette.length)];
        }
        ctx.fillStyle = col;
        ctx.fillRect(gx * tile, gy * tile, tile, tile);
        // Subtle 2px inner pixel bevel for crisp blocky voxel feel
        ctx.strokeStyle = 'rgba(0,0,0,0.16)';
        ctx.lineWidth = 2;
        ctx.strokeRect(gx * tile + 1, gy * tile + 1, tile - 2, tile - 2);
      }
    }
  } else if (livery === 'istanbulTaxi') {
    // Classic Istanbul / NYC Bright Taxi Yellow + Checkered Side Belt & Bold TAKSİ Hood Badge!
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle lower black bumper/skirt trim
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, 512, 24);
    ctx.fillRect(0, 488, 512, 24);

    // Classic 2-row black & white checkered taxi strip down both flanks
    const sq = 16;
    for (let y = 24; y < 488; y += sq) {
      const row = Math.floor(y / sq);
      for (let c = 0; c < 2; c++) {
        const isBlack = (row + c) % 2 === 0;
        ctx.fillStyle = isBlack ? '#09090b' : '#ffffff';
        ctx.fillRect(36 + c * sq, y, sq, sq);
        ctx.fillRect(444 + c * sq, y, sq, sq);
      }
    }
    // Crisp dark pinstripe framing the checkered belt
    ctx.fillStyle = '#09090b';
    ctx.fillRect(32, 24, 4, 464);
    ctx.fillRect(68, 24, 4, 464);
    ctx.fillRect(440, 24, 4, 464);
    ctx.fillRect(476, 24, 4, 464);

    // Center hood & roof bold TAKSİ banner stripe
    ctx.fillStyle = '#09090b';
    ctx.fillRect(156, 152, 200, 66);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(160, 156, 192, 58);
    ctx.fillStyle = '#facc15';
    ctx.font = '900 44px "Oxanium", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TAKSİ', 256, 187);
  } else if (livery === 'watermelonWrap') {
    // Juicy Summer Watermelon Wrap: Green Striped Rind Flanks, Crisp White Pith & Seeded Ruby Flesh!
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(0, 0, 512, 512);

    // Rich juicy inner ruby gradient down the hood & roof
    const mg = ctx.createLinearGradient(110, 0, 402, 0);
    mg.addColorStop(0, '#fb7185');
    mg.addColorStop(0.5, '#e11d48');
    mg.addColorStop(1, '#fb7185');
    ctx.fillStyle = mg;
    ctx.fillRect(110, 0, 292, 512);

    // Crisp pale-white watermelon pith transition strips
    ctx.fillStyle = '#ecfccb';
    ctx.fillRect(92, 0, 20, 512);
    ctx.fillRect(400, 0, 20, 512);

    // Deep green watermelon rind flanks with wavy dark-green tiger stripes!
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(0, 0, 92, 512);
    ctx.fillRect(420, 0, 92, 512);

    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = 14;
    for (const bx of [22, 62, 450, 490]) {
      ctx.beginPath();
      for (let y = 0; y <= 512; y += 16) {
        const wx = bx + Math.sin(y * 0.055) * 9;
        if (y === 0) ctx.moveTo(wx, y);
        else ctx.lineTo(wx, y);
      }
      ctx.stroke();
    }

    // Glossy teardrop black watermelon seeds scattered across the juicy red flesh
    let seed = 80421;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 42; i++) {
      const sx = 132 + rand() * 248;
      const sy = 24 + rand() * 464;
      const ang = (rand() - 0.5) * 1.4;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(ang);
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.ellipse(0, 0, 5.5, 9.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.arc(-1.8, -3, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (livery === 'toyCarBlocks') {
    // Hyper-Glossy Toy Racer / LEGO Building-Brick Wrap: Candy-Gloss Primary Brick Zones,
    // 3D Shaded Plastic Stud Clusters, #01 Racing Roundel & Playful Toy Flame Swooshes!
    const drawPlasticZone = (x: number, y: number, w: number, h: number, cTop: string, cBot: string) => {
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, cTop);
      g.addColorStop(1, cBot);
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
    };

    // 1. Vibrant Glossy Molded Plastic Color-Blocked Zones
    // Electric Toy Blue base (rear deck & upper flanks)
    drawPlasticZone(0, 0, 512, 512, '#3b82f6', '#1d4ed8');
    // Candy Toy Red front hood block
    drawPlasticZone(64, 0, 384, 208, '#f87171', '#dc2626');
    // Sunny Toy Yellow roof & mid-cockpit block
    drawPlasticZone(64, 208, 384, 152, '#fde047', '#eab308');
    // Vibrant Toy Lime lower side rocker bricks
    drawPlasticZone(0, 48, 64, 416, '#4ade80', '#16a34a');
    drawPlasticZone(448, 48, 64, 416, '#4ade80', '#16a34a');
    // Glossy White molded plastic bumper & zone divider strips
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 16);
    ctx.fillRect(0, 496, 512, 16);
    ctx.fillRect(60, 0, 8, 512);
    ctx.fillRect(444, 0, 8, 512);
    ctx.fillRect(64, 204, 384, 8);
    ctx.fillRect(64, 356, 384, 8);

    // 2. Crisp Center Toy Racing Stripe + Mini Checkered Racing Band
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(216, 0, 80, 512);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(228, 0, 56, 512);
    // Crisp mini black-and-white checkered collar along the yellow roof transition
    const chk = 16;
    for (let cx = 64; cx < 448; cx += chk) {
      const idx = Math.floor(cx / chk);
      ctx.fillStyle = idx % 2 === 0 ? '#0f172a' : '#ffffff';
      ctx.fillRect(cx, 204, chk, 10);
      ctx.fillStyle = idx % 2 === 1 ? '#0f172a' : '#ffffff';
      ctx.fillRect(cx, 354, chk, 10);
    }

    // 3. Authentic Interlocking Plastic Building-Brick Seam Grooves (staggered 2x4 & 2x2 bricks)
    const drawBrickSeam = (x1: number, y1: number, x2: number, y2: number) => {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x1 + 1.5, y1 + 1.5);
      ctx.lineTo(x2 + 1.5, y2 + 1.5);
      ctx.stroke();
    };
    for (let gy = 48; gy < 512; gy += 48) {
      drawBrickSeam(0, gy, 512, gy);
    }
    for (let row = 0; row < 11; row++) {
      const y0 = row * 48;
      const y1 = Math.min(512, y0 + 48);
      const offset = (row & 1) === 0 ? 0 : 48;
      for (let gx = 64 + offset; gx < 448; gx += 96) {
        drawBrickSeam(gx, y0, gx, y1);
      }
    }

    // 4. Authentic 3D-Shaded Glossy Plastic LEGO Brick Studs (filled color cylinder + shadow + specular highlight!)
    const drawPlasticStud = (cx: number, cy: number, fillCol: string, topCol: string, rad = 13.5) => {
      // Soft cast drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.30)';
      ctx.beginPath();
      ctx.arc(cx + 3.2, cy + 4.2, rad + 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Raised glossy plastic stud cylinder body
      const sg = ctx.createLinearGradient(cx - rad, cy - rad, cx + rad, cy + rad);
      sg.addColorStop(0, topCol);
      sg.addColorStop(0.55, fillCol);
      sg.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
      ctx.fillStyle = fillCol;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(cx, cy, rad - 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Crisp dark bottom-right plastic bevel
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.36)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(cx, cy, rad - 0.5, 0.05 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();

      // Glossy top-left molded plastic rim highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(cx, cy, rad - 1.2, 1.0 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();

      // Toy-plastic specular shine dot
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(cx - rad * 0.36, cy - rad * 0.36, rad * 0.22, 0, Math.PI * 2);
      ctx.fill();
    };

    // Place neat brick stud clusters across flanks, hood corners, roof rails, and rear brick deck
    const studStep = 48;
    for (let gx = 32; gx < 512; gx += studStep) {
      for (let gy = 24; gy < 512; gy += studStep) {
        // Leave clean decal window on hood center (#01 roundel) & flank flame swooshes
        const distHoodDecal = Math.hypot(gx - 256, gy - 112);
        if (distHoodDecal < 76) continue;
        // Skip lower mid-flank strip where playful toy flames sweep
        if ((gx < 72 || gx > 440) && gy > 140 && gy < 370) continue;

        let baseCol = '#2563eb';
        let topCol = '#60a5fa';
        if (gx < 64 || gx > 448) {
          baseCol = '#22c55e';
          topCol = '#86efac';
        } else if (gx >= 216 && gx <= 296) {
          baseCol = '#eab308';
          topCol = '#fef08a';
        } else if (gy < 206) {
          baseCol = '#ef4444';
          topCol = '#fca5a5';
        } else if (gy < 358) {
          baseCol = '#facc15';
          topCol = '#fef9c3';
        }
        drawPlasticStud(gx, gy, baseCol, topCol);
      }
    }

    // 5. Playful Stylized Toy-Racer Flame Swooshes licking back along Both Flanks!
    for (const isRight of [false, true]) {
      ctx.save();
      if (isRight) {
        ctx.translate(512, 0);
        ctx.scale(-1, 1);
      }
      // White sticker border under toy flame decal
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(6, 134);
      ctx.quadraticCurveTo(64, 170, 52, 248);
      ctx.lineTo(70, 224);
      ctx.quadraticCurveTo(66, 294, 42, 344);
      ctx.lineTo(58, 326);
      ctx.quadraticCurveTo(40, 384, 6, 408);
      ctx.closePath();
      ctx.fill();

      // Bright toy orange flame body
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(10, 146);
      ctx.quadraticCurveTo(56, 178, 44, 248);
      ctx.lineTo(60, 232);
      ctx.quadraticCurveTo(56, 292, 36, 336);
      ctx.lineTo(48, 326);
      ctx.quadraticCurveTo(32, 374, 10, 394);
      ctx.closePath();
      ctx.fill();

      // Sunny yellow inner flame core
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(12, 162);
      ctx.quadraticCurveTo(44, 192, 34, 250);
      ctx.quadraticCurveTo(42, 294, 12, 358);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 6. Bold Glossy Toy-Racer "#01" Hood Racing Roundel Sticker!
    ctx.save();
    ctx.translate(256, 112);
    // Drop shadow under sticker
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.arc(3, 4, 58, 0, Math.PI * 2);
    ctx.fill();
    // Outer blue toy-sticker ring
    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    ctx.arc(0, 0, 58, 0, Math.PI * 2);
    ctx.fill();
    // Crisp white inner roundel
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 49, 0, Math.PI * 2);
    ctx.fill();
    // Inner red racing pinstripe ring
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 43, 0, Math.PI * 2);
    ctx.stroke();
    // Bold Toy Racer "01" typography
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 46px "Oxanium", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('01', 0, 3);
    // Cute glossy toy star badge above number
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 11 : 5;
      const a = (i * Math.PI) / 5 - Math.PI * 0.5;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, -28 + Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, -28 + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (livery === 'policeInterceptor') {
    // Classic Black & White Highway Patrol Police Interceptor Wrap with Gold Star Shield!
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, 512, 512);

    // Iconic crisp white patrol roof & mid-door section
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 156, 512, 198);

    // Metallic highway-patrol blue & gold flank stripes
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(0, 146, 512, 14);
    ctx.fillRect(0, 350, 512, 14);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 160, 512, 6);
    ctx.fillRect(0, 344, 512, 6);

    // Golden Police Patrol Star Shield emblem on hood
    ctx.save();
    ctx.translate(256, 86);
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const r = i % 2 === 0 ? 42 : 22;
      const a = (i * Math.PI) / 6 - Math.PI * 0.5;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Bold POLİS badge across white roof/midsection
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 54px "Oxanium", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('POLİS', 256, 256);

    // High-visibility rear safety chevrons
    for (let x = 36; x < 480; x += 48) {
      ctx.fillStyle = (x / 48) % 2 === 0 ? '#facc15' : '#ef4444';
      ctx.beginPath();
      ctx.moveTo(x, 492);
      ctx.lineTo(x + 24, 456);
      ctx.lineTo(x + 48, 492);
      ctx.lineTo(x + 34, 492);
      ctx.lineTo(x + 24, 474);
      ctx.lineTo(x + 14, 492);
      ctx.closePath();
      ctx.fill();
    }
  } else if (livery === 'comicSketch') {
    // Cel-Shaded Comic Book / Hand-Drawn Ink Sketch Wrap (Borderlands & Initial-D Aesthetic!)
    ctx.fillStyle = '#fefce8';
    ctx.fillRect(0, 0, 512, 512);

    // Retro comic Ben-Day halftone shading dots along flanks
    ctx.fillStyle = '#38bdf8';
    for (let x = 12; x < 110; x += 14) {
      for (let y = 12; y < 500; y += 14) {
        const rad = Math.max(1.5, 4.8 - x * 0.035);
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.arc(512 - x, y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Bold comic accent panels (pop-art crimson & electric yellow)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(118, 0);
    ctx.lineTo(174, 0);
    ctx.lineTo(150, 512);
    ctx.lineTo(106, 512);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(394, 0);
    ctx.lineTo(338, 0);
    ctx.lineTo(362, 512);
    ctx.lineTo(406, 512);
    ctx.closePath();
    ctx.fill();

    // Thick hand-inked comic panel borders & crease lines
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 7;
    ctx.strokeRect(8, 8, 496, 496);
    ctx.lineWidth = 5;
    for (const [x0, y0, x1, y1] of [
      [118, 0, 106, 512],
      [174, 0, 150, 512],
      [394, 0, 406, 512],
      [338, 0, 362, 512],
      [0, 178, 512, 178],
      [0, 344, 512, 344],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }

    // Crisp diagonal ink cross-hatching strokes for authentic sketched shading
    ctx.lineWidth = 2.6;
    for (let i = 0; i < 24; i++) {
      const y = 20 + i * 20;
      ctx.beginPath();
      ctx.moveTo(16, y);
      ctx.lineTo(68, y + 18);
      ctx.moveTo(496, y);
      ctx.lineTo(444, y + 18);
      ctx.stroke();
    }

    // Pop-art starburst "ZOOM!" comic burst on hood
    ctx.save();
    ctx.translate(256, 114);
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const r = i % 2 === 0 ? 64 : 36;
      const a = (i / 16) * Math.PI * 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.font = '900 28px "Oxanium", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VROOOM!', 0, 2);
    ctx.restore();
  } else if (livery === 'streetGraffiti') {
    // Urban Street-Art Spray Paint Bombing Wrap: Neon Drips, Wildstyle Strokes & Splatter!
    ctx.fillStyle = '#14151a';
    ctx.fillRect(0, 0, 512, 512);

    const palette = ['#ec4899', '#22d3ee', '#a3e635', '#facc15', '#a855f7', '#fb923c'];
    let seed = 91827;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    // Bold layered wildstyle spray ribbons
    for (let i = 0; i < 18; i++) {
      const col = palette[i % palette.length];
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = 18 + rand() * 24;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const x0 = rand() * 512;
      const y0 = rand() * 512;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + (rand() - 0.5) * 260, y0 + (rand() - 0.5) * 220);
      ctx.lineTo(x0 + (rand() - 0.5) * 260, y0 + (rand() - 0.5) * 220);
      ctx.stroke();
      // Crisp white street-art outline accent
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.restore();
    }

    // Spray-paint drips & splatter dots
    for (let i = 0; i < 95; i++) {
      const sx = rand() * 512;
      const sy = rand() * 512;
      const col = palette[i % palette.length];
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(sx, sy, 2 + rand() * 6, 0, Math.PI * 2);
      ctx.fill();
      if (i % 4 === 0) {
        ctx.fillRect(sx - 2, sy, 4, 18 + rand() * 34);
      }
    }
  } else if (livery === 'lightning95') {
    // Iconic Glossy Blazing Red Şimşek McQueen #95 Tribute Wrap!
    const redBg = ctx.createLinearGradient(0, 0, 0, 512);
    redBg.addColorStop(0, '#dc2626');
    redBg.addColorStop(0.5, '#ef4444');
    redBg.addColorStop(1, '#b91c1c');
    ctx.fillStyle = redBg;
    ctx.fillRect(0, 0, 512, 512);

    // Blazing Yellow-Orange Jagged Lightning Bolts slicing along both flanks!
    for (const isRight of [false, true]) {
      ctx.save();
      if (isRight) {
        ctx.translate(512, 0);
        ctx.scale(-1, 1);
      }
      // Outer orange flame shadow bolt
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(12, 34);
      ctx.lineTo(138, 178);
      ctx.lineTo(86, 198);
      ctx.lineTo(156, 336);
      ctx.lineTo(94, 346);
      ctx.lineTo(140, 488);
      ctx.lineTo(52, 336);
      ctx.lineTo(100, 326);
      ctx.lineTo(28, 192);
      ctx.lineTo(78, 174);
      ctx.closePath();
      ctx.fill();

      // Inner bright electric yellow lightning core
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(22, 54);
      ctx.lineTo(118, 174);
      ctx.lineTo(72, 192);
      ctx.lineTo(134, 326);
      ctx.lineTo(82, 336);
      ctx.lineTo(118, 462);
      ctx.lineTo(66, 334);
      ctx.lineTo(106, 324);
      ctx.lineTo(44, 192);
      ctx.lineTo(88, 176);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Iconic Bold Yellow-Framed Racing "95" Emblem on Hood & Roof!
    const draw95 = (cx: number, cy: number, size: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.font = `italic 900 ${size}px "Oxanium", "Arial Black", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 12;
      ctx.strokeStyle = '#7f1d1d';
      ctx.strokeText('95', 0, 0);
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#f97316';
      ctx.strokeText('95', 0, 0);
      ctx.fillStyle = '#fde047';
      ctx.fillText('95', 0, 0);
      ctx.restore();
    };
    draw95(256, 156, 108);
    draw95(256, 356, 78);

    // Subtle checkered racing flag tail accent at rear
    for (let c = 0; c < 12; c++) {
      ctx.fillStyle = c % 2 === 0 ? '#fef08a' : '#18181b';
      ctx.fillRect(148 + c * 18, 476, 18, 16);
      ctx.fillStyle = c % 2 === 0 ? '#18181b' : '#fef08a';
      ctx.fillRect(148 + c * 18, 492, 18, 16);
    }
  } else if (livery === 'pixelBlock8Bit') {
    // Classic 8-Bit Arcade Block Wrap: NES Brick Masonry, Golden "?" Mystery Block & Retro Pixel Sky Stripe!
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, 0, 512, 512);

    // Classic 8-bit red-orange pixel bricks along flanks & rear
    const bw = 32;
    const bh = 16;
    for (let y = 0; y < 512; y += bh) {
      const row = Math.floor(y / bh);
      const off = (row % 2) * 16;
      for (let x = -16; x < 528; x += bw) {
        const isFlank = x < 128 || x >= 368 || y > 352;
        if (!isFlank) continue;
        ctx.fillStyle = '#c2410c';
        ctx.fillRect(x + off, y, bw, bh);
        // 8-bit top highlight & dark pixel mortar border
        ctx.fillStyle = '#fb923c';
        ctx.fillRect(x + off + 2, y + 2, bw - 4, 3);
        ctx.fillStyle = '#18181b';
        ctx.fillRect(x + off, y + bh - 2, bw, 2);
        ctx.fillRect(x + off + bw - 2, y, 2, bh);
      }
    }

    // Crisp 8-bit white & dark-blue pixel racing borders along sky-blue center lane
    for (let y = 0; y < 352; y += 16) {
      ctx.fillStyle = (y / 16) % 2 === 0 ? '#f8fafc' : '#1e3a8a';
      ctx.fillRect(128, y, 16, 16);
      ctx.fillRect(368, y, 16, 16);
    }

    // Iconic 8-Bit Golden "?" Mystery Block right on the hood!
    const bx = 176;
    const by = 96;
    const bs = 160;
    ctx.fillStyle = '#facc15';
    ctx.fillRect(bx, by, bs, bs);
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 8;
    ctx.strokeRect(bx, by, bs, bs);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(bx + 8, by + 8, bs - 16, 10);
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(bx + 8, by + bs - 18, bs - 16, 10);
    // 4 corner pixel rivets
    for (const [rx, ry] of [
      [bx + 16, by + 16],
      [bx + bs - 28, by + 16],
      [bx + 16, by + bs - 28],
      [bx + bs - 28, by + bs - 28],
    ]) {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(rx, ry, 12, 12);
    }
    // Crisp pixelated "?" icon inside the mystery block
    const qPx = 16;
    const qCells: [number, number][] = [
      [1, 0], [2, 0], [3, 0],
      [0, 1], [4, 1],
      [4, 2],
      [2, 3], [3, 3],
      [2, 4],
      [2, 6],
    ];
    for (const [qx, qy] of qCells) {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(bx + 42 + qx * qPx, by + 28 + qy * qPx, qPx, qPx);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx + 38 + qx * qPx, by + 24 + qy * qPx, qPx, qPx);
    }
  } else if (livery === 'tetrominoBlocks') {
    // Classic Interlocking Tetris Tetromino Blocks (I, O, T, L, J, S, Z) tiling cleanly with 3D pixel bevels!
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 512);

    // 16x16 grid (32px per cell) packed with exact interlocking colorful tetrominoes!
    // Color codes: C=Cyan(I), Y=Yellow(O), P=Purple(T), O=Orange(L), B=Blue(J), G=Green(S), R=Red(Z)
    const palette: Record<string, [string, string, string]> = {
      C: ['#06b6d4', '#67e8f9', '#0e7490'],
      Y: ['#eab308', '#fef08a', '#a16207'],
      P: ['#a855f7', '#e9d5ff', '#6b21a8'],
      O: ['#f97316', '#fed7aa', '#c2410c'],
      B: ['#2563eb', '#93c5fd', '#1e3a8a'],
      G: ['#22c55e', '#bbf7d0', '#15803d'],
      R: ['#ef4444', '#fecaca', '#991b1b'],
    };
    const grid = [
      'CCCCYYPPPOOBBGGG',
      'RRZZYY.POOOOBG.R',
      'RRRZZZPPBBBOOGGR',
      'OOOBZZCCCCYYPPPR',
      'O.BBBGGRR.YYP.OO',
      'BBBGGGRRZZPPPOOO',
      'YYCCCPPPZZBBGGRR',
      'YYCCCP.OOOBBGGRR',
      'PPPRRZZOYYCCCCBB',
      'P.RRRZZOYYGGRRBB',
      'OOOBBGGGPPPRRZZY',
      'O.BBBG.PCCCCZZYY',
      'RRZZYYOOO.BBGGPP',
      'RRZZYYOOBBBG.PPP',
      'CCCCPPPRRZZYYOOO',
      'GGRRPPPRRZZYYBBO',
    ];
    const cell = 32;
    for (let gy = 0; gy < 16; gy++) {
      for (let gx = 0; gx < 16; gx++) {
        const ch = grid[gy][gx];
        const cols = palette[ch];
        if (!cols) continue;
        const [main, hi, dark] = cols;
        const x = gx * cell;
        const y = gy * cell;
        ctx.fillStyle = main;
        ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        // Classic 3D Tetris top-left bright bevel & bottom-right shadow bevel
        ctx.fillStyle = hi;
        ctx.fillRect(x + 2, y + 2, cell - 4, 4);
        ctx.fillRect(x + 2, y + 2, 4, cell - 4);
        ctx.fillStyle = dark;
        ctx.fillRect(x + 2, y + cell - 6, cell - 4, 4);
        ctx.fillRect(x + cell - 6, y + 2, 4, cell - 4);
        // Crisp dark outline between blocks
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, cell - 2, cell - 2);
      }
    }
  } else if (livery === 'windowsBsod') {
    // Classic Windows Blue Screen of Death (BSOD): Deep BSOD Blue, Giant :( Frown, Error Text & Pixel QR Code!
    ctx.fillStyle = '#0078d7';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle classic darker-blue vertical screen edge vignette
    ctx.fillStyle = '#005a9e';
    ctx.fillRect(0, 0, 26, 512);
    ctx.fillRect(486, 0, 26, 512);

    // Giant Iconic White ":(" Sad Face on Upper Hood!
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 132px "Segoe UI", "Arial", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(':(', 66, 36);

    // Classic BSOD Error Copy
    ctx.font = '600 22px "Segoe UI", "Arial", sans-serif';
    ctx.fillText('Araciniz bir sorunla karsilasti', 66, 188);
    ctx.fillText('ve yeniden baslatilmasi gerekiyor.', 66, 218);
    ctx.font = '500 18px "Segoe UI", "Arial", sans-serif';
    ctx.fillText('Bazi drift verileri toplaniyor...', 66, 258);
    ctx.fillText('%100 tamamlandi', 66, 286);

    // Authentic Crisp White-Framed Pixel QR Code Block!
    const qx = 66;
    const qy = 334;
    const qrSize = 112;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(qx, qy, qrSize, qrSize);
    const qStep = 8;
    const drawFinder = (fx: number, fy: number) => {
      ctx.fillStyle = '#0078d7';
      ctx.fillRect(fx, fy, qStep * 3, qStep * 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(fx + 5, fy + 5, qStep * 3 - 10, qStep * 3 - 10);
      ctx.fillStyle = '#0078d7';
      ctx.fillRect(fx + 9, fy + 9, qStep * 3 - 18, qStep * 3 - 18);
    };
    drawFinder(qx + 8, qy + 8);
    drawFinder(qx + qrSize - 8 - qStep * 3, qy + 8);
    drawFinder(qx + 8, qy + qrSize - 8 - qStep * 3);
    // Deterministic QR data pixels
    let qrSeed = 40495;
    for (let r = 1; r < 13; r++) {
      for (let c = 1; c < 13; c++) {
        if ((r < 4 && c < 4) || (r < 4 && c > 8) || (r > 8 && c < 4)) continue;
        qrSeed = (qrSeed * 16807) % 2147483647;
        if (qrSeed % 2 === 0) {
          ctx.fillStyle = '#0078d7';
          ctx.fillRect(qx + c * qStep, qy + r * qStep, qStep - 1, qStep - 1);
        }
      }
    }

    // Technical Stop-Code Footer beside the QR Code
    ctx.fillStyle = '#e0f2fe';
    ctx.font = '600 15px "Consolas", "Courier New", monospace';
    ctx.fillText('Durdurma kodu:', 196, 354);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 16px "Consolas", "Courier New", monospace';
    ctx.fillText('CRITICAL_DRIFT_OVERFLOW', 196, 380);
    ctx.fillStyle = '#bae6fd';
    ctx.font = '500 14px "Consolas", "Courier New", monospace';
    ctx.fillText('0x00000095 (VIRAJ.SYS)', 196, 408);
    ctx.fillText('NITRO_BOOST_EXCEPTION', 196, 430);
  } else if (livery === 'knittedSweater') {
    // Cozy Hand-Knitted Nordic / Fair Isle Wool Sweater Wrap with Interlocking V-Knit Stitches!
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(0, 0, 512, 512);

    // Fair Isle horizontal knit pattern grid (64 cols x 64 rows, 8px stitch size)
    const st = 8;
    const drawStitch = (gx: number, gy: number, yarn: string, shade: string) => {
      const x = gx * st;
      const y = gy * st;
      // Left & right V-shaped wool yarn loops
      ctx.strokeStyle = shade;
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + 1.5, y + 1.5);
      ctx.lineTo(x + st * 0.5, y + st - 1);
      ctx.lineTo(x + st - 1.5, y + 1.5);
      ctx.stroke();

      ctx.strokeStyle = yarn;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(x + 1.5, y + 1);
      ctx.lineTo(x + st * 0.5, y + st - 1.8);
      ctx.lineTo(x + st - 1.5, y + 1);
      ctx.stroke();
    };

    for (let gy = 0; gy < 64; gy++) {
      const band = gy % 16;
      for (let gx = 0; gx < 64; gx++) {
        const xm = gx % 8;
        let yarn = '#b91c1c';
        let shade = '#450a0a';

        if (band === 0 || band === 15) {
          // Cream-ivory border band
          yarn = '#fef3c7';
          shade = '#b45309';
        } else if (band === 1 || band === 14) {
          // Alternating forest green & cream ribbing
          const isGreen = (gx + gy) % 2 === 0;
          yarn = isGreen ? '#15803d' : '#fef3c7';
          shade = isGreen ? '#052e16' : '#a16207';
        } else if (band >= 2 && band <= 5) {
          // Deep navy band with cream Nordic diamond chevron zigzag
          const dy = Math.abs(band - 3.5);
          const dx = Math.abs(xm - 3.5);
          const isMotif = Math.abs(dx + dy - 3) < 0.85;
          yarn = isMotif ? '#fef3c7' : '#1e3a8a';
          shade = isMotif ? '#92400e' : '#0f172a';
        } else if (band >= 6 && band <= 10) {
          // Classic crimson wool band with cream 8-point snowflakes & pine accents
          const sy = band - 8;
          const sx = xm - 4;
          const isFlake =
            (sx === 0 && Math.abs(sy) <= 2) ||
            (sy === 0 && Math.abs(sx) <= 2) ||
            (Math.abs(sx) === 1 && Math.abs(sy) === 1);
          const isGoldCenter = sx === 0 && sy === 0;
          yarn = isGoldCenter ? '#facc15' : isFlake ? '#fef3c7' : '#b91c1c';
          shade = isGoldCenter ? '#854d0e' : isFlake ? '#a16207' : '#450a0a';
        } else if (band >= 11 && band <= 13) {
          // Forest pine band with crimson-gold diamond dots
          const isDot = band === 12 && (xm === 0 || xm === 4);
          yarn = isDot ? '#facc15' : '#166534';
          shade = isDot ? '#854d0e' : '#052e16';
        }
        drawStitch(gx, gy, yarn, shade);
      }
    }
  } else if (livery === 'carvedWood') {
    // Handcrafted Carved Walnut & Oak Wood Wrap with Organic Grain, Joinery Panels & Relief Scrollwork!
    const woodBg = ctx.createLinearGradient(0, 0, 512, 0);
    woodBg.addColorStop(0, '#5c2d12');
    woodBg.addColorStop(0.25, '#854d1e');
    woodBg.addColorStop(0.5, '#783c17');
    woodBg.addColorStop(0.75, '#8f5222');
    woodBg.addColorStop(1, '#54280f');
    ctx.fillStyle = woodBg;
    ctx.fillRect(0, 0, 512, 512);

    // Flowing organic longitudinal wood grain fibers & dark knots
    for (let x = 0; x < 512; x += 4) {
      const darkGrain = x % 12 === 0;
      ctx.strokeStyle = darkGrain ? 'rgba(41, 18, 6, 0.45)' : 'rgba(180, 108, 48, 0.24)';
      ctx.lineWidth = darkGrain ? 2.2 : 1.3;
      ctx.beginPath();
      for (let y = 0; y <= 512; y += 16) {
        const wave = Math.sin(y * 0.025 + x * 0.08) * 4.5 + Math.cos(y * 0.012 - x * 0.04) * 3;
        if (y === 0) ctx.moveTo(x + wave, y);
        else ctx.lineTo(x + wave, y);
      }
      ctx.stroke();
    }

    // Carved dark-stained wood knots
    for (const [kx, ky, kr] of [
      [110, 130, 16],
      [402, 130, 16],
      [96, 360, 18],
      [416, 360, 18],
    ]) {
      for (let r = kr; r > 2; r -= 4) {
        ctx.strokeStyle = 'rgba(38, 16, 5, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(kx, ky, r * 0.65, r * 1.4, 0.1, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Beveled carpenter joinery panel borders (dark carved groove + warm highlight edge)
    const drawCarvedRect = (x: number, y: number, w: number, h: number) => {
      ctx.strokeStyle = '#291206';
      ctx.lineWidth = 8;
      ctx.strokeRect(x, y, w, h);
      ctx.strokeStyle = '#d99152';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
    };
    drawCarvedRect(20, 20, 472, 472);
    drawCarvedRect(138, 36, 236, 440);

    // Ornate carved floral rosette medallion & symmetrical scrollwork down the center hood/roof!
    const drawCarvedRosette = (cx: number, cy: number, rad: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      // Recessed dark carved circular background
      ctx.fillStyle = '#331608';
      ctx.beginPath();
      ctx.arc(0, 0, rad + 6, 0, Math.PI * 2);
      ctx.fill();
      // 8 raised golden-oak carved petals
      for (let i = 0; i < 8; i++) {
        ctx.save();
        ctx.rotate((i / 8) * Math.PI * 2);
        ctx.fillStyle = '#b46a2c';
        ctx.strokeStyle = '#291206';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(0, -rad * 0.52, rad * 0.22, rad * 0.44, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = '#d99152';
      ctx.beginPath();
      ctx.arc(0, 0, rad * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    drawCarvedRosette(256, 152, 54);
    drawCarvedRosette(256, 356, 44);

    // Symmetrical carved baroque vine scrolls connecting the rosettes & flanking panels
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.strokeStyle = '#291206';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(256 + sx * 70, 56);
      ctx.bezierCurveTo(256 + sx * 105, 130, 256 + sx * 35, 220, 256 + sx * 92, 275);
      ctx.bezierCurveTo(256 + sx * 42, 340, 256 + sx * 105, 405, 256 + sx * 68, 462);
      ctx.stroke();
      ctx.strokeStyle = '#c87e3e';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
  } else if (livery === 'lushGrassTurf') {
    // Fresh Living Mowed Lawn Grass Turf Wrap with Layered Blades & Tiny White Daisies!
    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle stadium-style mowed alternating grass stripe bands
    for (let x = 0; x < 512; x += 64) {
      ctx.fillStyle = (x / 64) % 2 === 0 ? '#16a34a' : '#15803d';
      ctx.fillRect(x, 0, 64, 512);
    }

    // Thousands of rich layered grass blades for genuinely lush organic turf texture
    let seed = 20265;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const bladeCols = ['#14532d', '#166534', '#16a34a', '#22c55e', '#4ade80', '#84cc16'];
    ctx.lineCap = 'round';
    for (let i = 0; i < 2400; i++) {
      const gx = rand() * 512;
      const gy = rand() * 512;
      const len = 6 + rand() * 14;
      const tilt = (rand() - 0.5) * 10;
      ctx.strokeStyle = bladeCols[Math.floor(rand() * bladeCols.length)];
      ctx.lineWidth = 1.2 + rand() * 1.4;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + tilt, gy - len);
      ctx.stroke();
    }

    // Cute scattered tiny white lawn daisies & golden pollen centers
    for (let i = 0; i < 26; i++) {
      const fx = 28 + rand() * 456;
      const fy = 28 + rand() * 456;
      const fr = 4.5 + rand() * 3.5;
      ctx.fillStyle = '#ffffff';
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(fx + Math.cos(a) * fr, fy + Math.sin(a) * fr, fr * 0.58, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(fx, fy, fr * 0.52, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (livery === 'mysteryMachine') {
    // Scooby-Doo Mystery Machine Tribute: Bright Turquoise Body, Wavy Lime-Green Flank Stripes & Orange Groovy Flowers!
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(0, 0, 512, 512);

    // Bright turquoise center roof highlight gradient
    const tq = ctx.createLinearGradient(0, 0, 512, 0);
    tq.addColorStop(0, '#0891b2');
    tq.addColorStop(0.5, '#22d3ee');
    tq.addColorStop(1, '#0891b2');
    ctx.fillStyle = tq;
    ctx.fillRect(0, 0, 512, 512);

    // Iconic Wavy Neon Lime-Green Psychedelic Ribbons flowing along both flanks!
    for (const isRight of [false, true]) {
      ctx.save();
      if (isRight) {
        ctx.translate(512, 0);
        ctx.scale(-1, 1);
      }
      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let y = 0; y <= 512; y += 16) {
        const wx = 112 + Math.sin(y * 0.038) * 32;
        ctx.lineTo(wx, y);
      }
      ctx.lineTo(0, 512);
      ctx.closePath();
      ctx.fill();

      // Secondary deep-turquoise psychedelic wave inset
      ctx.strokeStyle = '#0e7490';
      ctx.lineWidth = 8;
      ctx.beginPath();
      for (let y = 0; y <= 512; y += 16) {
        const wx = 112 + Math.sin(y * 0.038) * 32;
        if (y === 0) ctx.moveTo(wx, y);
        else ctx.lineTo(wx, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Groovy Retro Orange & Yellow Psychedelic Flowers blooming along flanks & hood!
    const drawFlower = (cx: number, cy: number, rad: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = '#f97316';
      ctx.strokeStyle = '#9a3412';
      ctx.lineWidth = 2.5;
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * rad * 0.56, Math.sin(a) * rad * 0.56, rad * 0.44, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(0, 0, rad * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    for (const [fx, fy, fr] of [
      [56, 86, 32],
      [456, 86, 32],
      [62, 256, 36],
      [450, 256, 36],
      [58, 424, 32],
      [454, 424, 32],
      [256, 392, 42],
    ]) {
      drawFlower(fx, fy, fr);
    }

    // Groovy Retro Orange Hood Badge "GİZEM" with 60s Drop-Shadow!
    ctx.save();
    ctx.translate(256, 178);
    ctx.fillStyle = '#84cc16';
    ctx.beginPath();
    ctx.ellipse(0, 0, 108, 48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.font = '900 42px "Oxanium", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#9a3412';
    ctx.fillText('GİZEM', 3, 5);
    ctx.fillStyle = '#fb923c';
    ctx.fillText('GİZEM', 0, 2);
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
