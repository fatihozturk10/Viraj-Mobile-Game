import * as THREE from 'three';
import { RoadZoneId, UpcomingCurve } from '../types/game';
import { createBiomeSample, sampleBiomeAtDistance } from './biomes';
import { RoadsideChunkSlot, RoadsidePropsSystem } from './roadsideProps';
import { ProceduralTextureSet } from './textures';

function mergeStaticGeometries(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const nonIndexed = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  let totalVerts = 0;
  for (const g of nonIndexed) {
    totalVerts += g.attributes.position.count;
  }
  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  let offset = 0;
  for (const g of nonIndexed) {
    if (!g.attributes.normal) g.computeVertexNormals();
    const posArr = g.attributes.position.array as Float32Array;
    const normArr = g.attributes.normal.array as Float32Array;
    positions.set(posArr, offset * 3);
    normals.set(normArr, offset * 3);
    offset += g.attributes.position.count;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  for (let i = 0; i < parts.length; i++) {
    if (nonIndexed[i] !== parts[i]) nonIndexed[i].dispose();
    parts[i].dispose();
  }
  return merged;
}

function buildCactusGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const trunk = new THREE.CylinderGeometry(0.28, 0.34, 4.4, 7);
  trunk.translate(0, 2.2, 0);
  parts.push(trunk);

  const armL = new THREE.CylinderGeometry(0.2, 0.23, 1.55, 6);
  armL.translate(0, 0.78, 0);
  armL.rotateZ(0.22);
  armL.translate(-0.62, 1.85, 0);
  parts.push(armL);

  const elbowL = new THREE.CylinderGeometry(0.21, 0.22, 0.72, 6);
  elbowL.rotateZ(Math.PI / 2);
  elbowL.translate(-0.34, 1.92, 0);
  parts.push(elbowL);

  const armR = new THREE.CylinderGeometry(0.19, 0.22, 1.35, 6);
  armR.translate(0, 0.68, 0);
  armR.rotateZ(-0.18);
  armR.translate(0.58, 2.35, 0);
  parts.push(armR);

  const elbowR = new THREE.CylinderGeometry(0.2, 0.21, 0.66, 6);
  elbowR.rotateZ(Math.PI / 2);
  elbowR.translate(0.32, 2.4, 0);
  parts.push(elbowR);

  return mergeStaticGeometries(parts);
}

function buildIceSpireGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const main = new THREE.ConeGeometry(1.35, 6.4, 5);
  main.translate(0, 3.1, 0);
  parts.push(main);

  const sideA = new THREE.ConeGeometry(0.9, 4.1, 5);
  sideA.rotateZ(0.26);
  sideA.rotateY(0.8);
  sideA.translate(-0.85, 1.9, 0.35);
  parts.push(sideA);

  const sideB = new THREE.ConeGeometry(0.78, 3.4, 5);
  sideB.rotateZ(-0.32);
  sideB.rotateY(-0.5);
  sideB.translate(0.75, 1.55, -0.35);
  parts.push(sideB);

  return mergeStaticGeometries(parts);
}

function buildBasaltColumnGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const col1 = new THREE.CylinderGeometry(0.72, 0.85, 5.4, 6);
  col1.translate(0, 2.6, 0);
  parts.push(col1);

  const col2 = new THREE.CylinderGeometry(0.58, 0.68, 3.8, 6);
  col2.translate(0.92, 1.85, 0.35);
  parts.push(col2);

  const col3 = new THREE.CylinderGeometry(0.54, 0.64, 3.1, 6);
  col3.translate(-0.82, 1.5, -0.38);
  parts.push(col3);

  return mergeStaticGeometries(parts);
}

export const ROAD_HALF_WIDTH = 6.75; // 13.5m total asphalt (3 lanes of 4.5m)
export const SHOULDER_WIDTH = 1.4;
export const GUARDRAIL_OFFSET = ROAD_HALF_WIDTH + SHOULDER_WIDTH + 0.15; // 8.30m
export const MAX_PLAYER_LATERAL = ROAD_HALF_WIDTH + 0.25; // 7.00m
export const LANE_CENTERS = [-4.3, 0, 4.3] as const;

export const SAMPLE_STEP = 4; // meters per spline sample
const CHUNK_SAMPLES = 20; // 80m per chunk
const WORLD_UP = new THREE.Vector3(0, 1, 0);

export function getRoadZoneAtS(s: number): RoadZoneId {
  if (s < 240) return 'open';
  const block = Math.floor(s / 80);
  const mod = block % 10;
  if (mod === 3 || mod === 4) return 'tunnel';
  if (mod === 7 || mod === 8) return 'bridge';
  return 'open';
}

export interface RoadSample {
  index: number;
  s: number;
  pos: THREE.Vector3;
  heading: number;
  pitch: number;
  curvature: number;
  bank: number;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  normal: THREE.Vector3;
}

export interface EvaluatedRoadPoint {
  s: number;
  pos: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  normal: THREE.Vector3;
  heading: number;
  curvature: number;
  bank: number;
}

interface RoadSection {
  startS: number;
  endS: number;
  startCurvature: number;
  targetCurvature: number;
  startSlope: number;
  targetSlope: number;
  transitionLen: number;
}

const MAX_POSTS_PER_CHUNK = 24;
const MAX_LAMPS_PER_CHUNK = 6;
const MAX_CHEVRONS_PER_CHUNK = 8;
const MAX_PROPS_PER_CHUNK = 24;

interface RoadChunk {
  startIndex: number;
  endIndex: number;
  startS: number;
  endS: number;
  group: THREE.Group;
  extrasGroup: THREE.Group;
  extraDisposables: THREE.BufferGeometry[];
  extraInstanced: THREE.InstancedMesh[];
  roadGeo: THREE.BufferGeometry;
  shouldersGeo: THREE.BufferGeometry;
  railsGeo: THREE.BufferGeometry;
  terrainGeo: THREE.BufferGeometry;
  postInst: THREE.InstancedMesh;
  studInst: THREE.InstancedMesh;
  lampPoleInst: THREE.InstancedMesh;
  lampArmInst: THREE.InstancedMesh;
  lampHeadInst: THREE.InstancedMesh;
  chevronPostInst: THREE.InstancedMesh;
  chevronBoardInst: THREE.InstancedMesh;
  trunkInst: THREE.InstancedMesh;
  foliageInst: THREE.InstancedMesh;
  cactusInst: THREE.InstancedMesh;
  iceInst: THREE.InstancedMesh;
  basaltInst: THREE.InstancedMesh;
  rockInst: THREE.InstancedMesh;
  roadsideSlot: RoadsideChunkSlot;
}

// Module-level reusable scratch objects to eliminate GC churn during 80m chunk updates
const _chunkDummy = new THREE.Object3D();
const _chunkBasisMat = new THREE.Matrix4();
const _chunkNegTangent = new THREE.Vector3();
const _chunkTmpPos = new THREE.Vector3();
const _chunkWorldP = new THREE.Vector3();
const _chunkV0 = new THREE.Vector3();
const _chunkV1 = new THREE.Vector3();
const _chunkMatM = new THREE.Matrix4();
const _chunkTrunkOffset = new THREE.Matrix4().makeTranslation(0, 1.2, 0);
const _chunkConeOffset = new THREE.Matrix4().makeTranslation(0, 4.1, 0);
const _sampleRightBase = new THREE.Vector3();
const _chunkBiome = createBiomeSample();
const _chunkTmpColor = new THREE.Color();
const _chunkWhite = new THREE.Color(0xffffff);
const _chunkRiverColor = new THREE.Color(0x164e63);
const _chunkIceColorA = new THREE.Color(0x9bd7f5);
const _chunkIceColorB = new THREE.Color(0xeef9ff);
const _chunkBasaltColorA = new THREE.Color(0x231f22);
const _chunkBasaltColorB = new THREE.Color(0x472822);

export class RoadSystem {
  public readonly group = new THREE.Group();
  private samples: RoadSample[] = [];
  private samplePool: RoadSample[] = [];
  private chunks: RoadChunk[] = [];
  private baseIndex = 0;
  private readonly isMobile: boolean;
  private readonly chunkCount: number;
  private roadsideProps: RoadsidePropsSystem;

  private currentSection: RoadSection;
  private sectionCount = 0;

  // Shared materials
  private asphaltMat: THREE.MeshPhysicalMaterial;
  private shoulderMat: THREE.MeshStandardMaterial;
  private terrainMat: THREE.MeshStandardMaterial;
  private guardrailMat: THREE.MeshStandardMaterial;
  private postMat: THREE.MeshStandardMaterial;
  private chevronMat: THREE.MeshStandardMaterial;
  private lampHeadMat: THREE.MeshStandardMaterial;
  private studMat: THREE.MeshStandardMaterial;
  private gantrySignMat: THREE.MeshStandardMaterial;
  private trunkMat: THREE.MeshStandardMaterial;
  private foliageMat: THREE.MeshStandardMaterial;
  private rockMat: THREE.MeshStandardMaterial;
  private cactusMat: THREE.MeshStandardMaterial;
  private iceMat: THREE.MeshStandardMaterial;
  private basaltMat: THREE.MeshStandardMaterial;
  private tunnelWallMat: THREE.MeshStandardMaterial;
  private tunnelOuterMat: THREE.MeshStandardMaterial;
  private tunnelLightMat: THREE.MeshStandardMaterial;
  private tunnelPortalMat: THREE.MeshStandardMaterial;
  private tunnelArrowMat: THREE.MeshStandardMaterial;
  private bridgeTowerMat: THREE.MeshStandardMaterial;
  private bridgeSteelMat: THREE.MeshStandardMaterial;
  private bridgeDeckMat: THREE.MeshStandardMaterial;
  private bridgeBeaconMat: THREE.MeshStandardMaterial;
  private bridgeCableMat: THREE.MeshStandardMaterial;
  private tunnelWallTex: THREE.CanvasTexture;
  private tunnelArrowTex: THREE.CanvasTexture;

  // Shared prop geometries
  private postGeo: THREE.BoxGeometry;
  private studGeo: THREE.BoxGeometry;
  private chevronPostGeo: THREE.CylinderGeometry;
  private chevronBoardGeo: THREE.BoxGeometry;
  private lampPoleGeo: THREE.CylinderGeometry;
  private lampArmGeo: THREE.BoxGeometry;
  private lampHeadGeo: THREE.BoxGeometry;
  private gantryPillarGeo: THREE.CylinderGeometry;
  private gantryBeamGeo: THREE.BoxGeometry;
  private gantrySignGeo: THREE.BoxGeometry;
  private trunkGeo: THREE.CylinderGeometry;
  private foliageGeo: THREE.ConeGeometry;
  private rockGeo: THREE.DodecahedronGeometry;
  private cactusGeo: THREE.BufferGeometry;
  private iceSpireGeo: THREE.BufferGeometry;
  private basaltGeo: THREE.BufferGeometry;
  private tunnelLightGeo: THREE.BoxGeometry;
  private tunnelPortalLintelGeo: THREE.BoxGeometry;
  private tunnelPortalPierGeo: THREE.BoxGeometry;
  private tunnelPortalSignGeo: THREE.PlaneGeometry;
  private bridgeTowerLegGeo: THREE.BoxGeometry;
  private bridgeTowerCrossGeo: THREE.BoxGeometry;
  private bridgePierGeo: THREE.BoxGeometry;
  private bridgeSuspenderGeo: THREE.CylinderGeometry;
  private bridgeBeaconGeo: THREE.SphereGeometry;

  constructor(textures: ProceduralTextureSet, isMobile = false) {
    this.isMobile = isMobile;
    this.chunkCount = 10;
    this.asphaltMat = new THREE.MeshPhysicalMaterial({
      map: textures.asphaltMap,
      roughnessMap: textures.asphaltRoughnessMap,
      roughness: 0.84,
      metalness: 0.08,
      clearcoat: 0,
      clearcoatRoughness: 0.35,
      reflectivity: 0.92,
      envMapIntensity: 0.85,
    });

    this.shoulderMat = new THREE.MeshStandardMaterial({
      map: textures.shoulderMap,
      roughness: 0.92,
      metalness: 0.04,
    });

    this.terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.96,
      metalness: 0.02,
      flatShading: true,
    });

    this.guardrailMat = new THREE.MeshStandardMaterial({
      color: 0xa1a1aa,
      roughness: 0.36,
      metalness: 0.78,
      envMapIntensity: 1.2,
      side: THREE.DoubleSide,
    });

    this.postMat = new THREE.MeshStandardMaterial({
      color: 0x52525b,
      roughness: 0.62,
      metalness: 0.5,
    });

    this.chevronMat = new THREE.MeshStandardMaterial({
      map: textures.chevronMap,
      emissive: 0xfacc15,
      emissiveMap: textures.chevronMap,
      emissiveIntensity: 0.55,
      roughness: 0.42,
      metalness: 0.1,
    });

    this.lampHeadMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      emissive: 0xfbbf24,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    });

    this.studMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.65,
      roughness: 0.2,
    });

    this.gantrySignMat = new THREE.MeshStandardMaterial({
      color: 0x065f46,
      roughness: 0.4,
      metalness: 0.15,
    });

    this.trunkMat = new THREE.MeshStandardMaterial({
      color: 0x452c1e,
      roughness: 0.94,
    });

    this.foliageMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.88,
      flatShading: true,
    });

    this.rockMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.92,
      flatShading: true,
    });

    this.cactusMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.84,
      flatShading: true,
    });

    this.iceMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.24,
      metalness: 0.14,
      flatShading: true,
      envMapIntensity: 1.35,
    });

    this.basaltMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.88,
      metalness: 0.12,
      flatShading: true,
    });

    // Procedural Tunnel Interior Wall Texture (concrete tiles + lower safety curb stripe)
    const tunCanvas = document.createElement('canvas');
    tunCanvas.width = 512;
    tunCanvas.height = 512;
    const tCtx = tunCanvas.getContext('2d');
    if (tCtx) {
      tCtx.fillStyle = '#2c3038';
      tCtx.fillRect(0, 0, 512, 512);
      // Concrete arch rib panels
      tCtx.strokeStyle = '#1b1e24';
      tCtx.lineWidth = 4;
      for (let y = 0; y < 512; y += 64) {
        tCtx.beginPath();
        tCtx.moveTo(0, y);
        tCtx.lineTo(512, y);
        tCtx.stroke();
      }
      for (let x = 0; x < 512; x += 64) {
        tCtx.beginPath();
        tCtx.moveTo(x, 0);
        tCtx.lineTo(x, 512);
        tCtx.stroke();
      }
      // Lighter concrete upper vault band
      tCtx.fillStyle = 'rgba(203, 213, 225, 0.12)';
      tCtx.fillRect(140, 0, 232, 512);
      // Lower reflective amber safety stripe along both side walls (u near 0 and 1)
      tCtx.fillStyle = '#d97706';
      tCtx.fillRect(18, 0, 14, 512);
      tCtx.fillRect(480, 0, 14, 512);
      tCtx.fillStyle = '#e4e4e7';
      tCtx.fillRect(42, 0, 28, 512);
      tCtx.fillRect(442, 0, 28, 512);
    }
    this.tunnelWallTex = new THREE.CanvasTexture(tunCanvas);
    this.tunnelWallTex.colorSpace = THREE.SRGBColorSpace;
    this.tunnelWallTex.wrapS = THREE.ClampToEdgeWrapping;
    this.tunnelWallTex.wrapT = THREE.RepeatWrapping;

    // Overhead Tunnel Portal Lane Indicator Texture
    const arrowCanvas = document.createElement('canvas');
    arrowCanvas.width = 512;
    arrowCanvas.height = 128;
    const aCtx = arrowCanvas.getContext('2d');
    if (aCtx) {
      aCtx.fillStyle = '#111318';
      aCtx.fillRect(0, 0, 512, 128);
      aCtx.strokeStyle = '#f59e0b';
      aCtx.lineWidth = 6;
      aCtx.strokeRect(4, 4, 504, 120);
      aCtx.fillStyle = '#22c55e';
      for (const cx of [110, 256, 402]) {
        aCtx.beginPath();
        aCtx.moveTo(cx - 12, 26);
        aCtx.lineTo(cx + 12, 26);
        aCtx.lineTo(cx + 12, 66);
        aCtx.lineTo(cx + 28, 66);
        aCtx.lineTo(cx, 102);
        aCtx.lineTo(cx - 28, 66);
        aCtx.lineTo(cx - 12, 66);
        aCtx.closePath();
        aCtx.fill();
      }
    }
    this.tunnelArrowTex = new THREE.CanvasTexture(arrowCanvas);
    this.tunnelArrowTex.colorSpace = THREE.SRGBColorSpace;

    this.tunnelWallMat = new THREE.MeshStandardMaterial({
      map: this.tunnelWallTex,
      roughness: 0.78,
      metalness: 0.14,
      side: THREE.DoubleSide,
    });
    this.tunnelOuterMat = new THREE.MeshStandardMaterial({
      color: 0x3b3d42,
      roughness: 0.94,
      metalness: 0.04,
      flatShading: true,
      side: THREE.DoubleSide,
    });
    this.tunnelLightMat = new THREE.MeshStandardMaterial({
      color: 0xfff7ed,
      emissive: 0xfbbf24,
      emissiveIntensity: 3.1,
      roughness: 0.15,
    });
    this.tunnelPortalMat = new THREE.MeshStandardMaterial({
      color: 0x52525b,
      roughness: 0.82,
      metalness: 0.18,
    });
    this.tunnelArrowMat = new THREE.MeshStandardMaterial({
      map: this.tunnelArrowTex,
      emissiveMap: this.tunnelArrowTex,
      emissive: 0xffffff,
      emissiveIntensity: 1.35,
      roughness: 0.3,
      side: THREE.DoubleSide,
    });

    this.bridgeTowerMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      roughness: 0.42,
      metalness: 0.56,
      envMapIntensity: 1.15,
    });
    this.bridgeSteelMat = new THREE.MeshStandardMaterial({
      color: 0x3f444e,
      roughness: 0.48,
      metalness: 0.68,
    });
    this.bridgeDeckMat = new THREE.MeshStandardMaterial({
      color: 0x2a2d34,
      roughness: 0.72,
      metalness: 0.28,
      side: THREE.DoubleSide,
    });
    this.bridgeCableMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.34,
      metalness: 0.82,
    });
    this.bridgeBeaconMat = new THREE.MeshStandardMaterial({
      color: 0xfef2f2,
      emissive: 0xef4444,
      emissiveIntensity: 3.2,
      roughness: 0.15,
    });

    this.postGeo = new THREE.BoxGeometry(0.14, 0.95, 0.14);
    this.studGeo = new THREE.BoxGeometry(0.16, 0.06, 0.24);
    this.chevronPostGeo = new THREE.CylinderGeometry(0.05, 0.06, 2.3, 8);
    this.chevronBoardGeo = new THREE.BoxGeometry(1.35, 1.35, 0.08);
    this.lampPoleGeo = new THREE.CylinderGeometry(0.08, 0.13, 7.2, 8);
    this.lampArmGeo = new THREE.BoxGeometry(2.1, 0.1, 0.1);
    this.lampHeadGeo = new THREE.BoxGeometry(0.65, 0.14, 0.32);
    this.gantryPillarGeo = new THREE.CylinderGeometry(0.22, 0.28, 7.6, 10);
    this.gantryBeamGeo = new THREE.BoxGeometry(GUARDRAIL_OFFSET * 2 + 1.4, 0.55, 0.45);
    this.gantrySignGeo = new THREE.BoxGeometry(5.6, 1.7, 0.14);
    this.trunkGeo = new THREE.CylinderGeometry(0.18, 0.3, 2.4, 7);
    this.foliageGeo = new THREE.ConeGeometry(1.7, 5.2, 7);
    this.rockGeo = new THREE.DodecahedronGeometry(1.4, 0);
    this.cactusGeo = buildCactusGeometry();
    this.iceSpireGeo = buildIceSpireGeometry();
    this.basaltGeo = buildBasaltColumnGeometry();
    this.tunnelLightGeo = new THREE.BoxGeometry(1.3, 0.16, 2.6);
    this.tunnelPortalLintelGeo = new THREE.BoxGeometry(
      GUARDRAIL_OFFSET * 2 + 4.4,
      2.2,
      1.35,
    );
    this.tunnelPortalPierGeo = new THREE.BoxGeometry(1.7, 7.8, 1.45);
    this.tunnelPortalSignGeo = new THREE.PlaneGeometry(8.8, 1.55);
    this.bridgeTowerLegGeo = new THREE.BoxGeometry(1.05, 24.5, 1.35);
    this.bridgeTowerCrossGeo = new THREE.BoxGeometry(GUARDRAIL_OFFSET * 2 + 2.4, 1.15, 0.95);
    this.bridgePierGeo = new THREE.BoxGeometry(2.1, 24.0, 2.1);
    this.bridgeSuspenderGeo = new THREE.CylinderGeometry(0.065, 0.065, 1.0, 6);
    this.bridgeBeaconGeo = new THREE.SphereGeometry(0.32, 10, 8);

    this.roadsideProps = new RoadsidePropsSystem(textures);

    this.currentSection = {
      startS: 0,
      endS: 72,
      startCurvature: 0,
      targetCurvature: 0,
      startSlope: 0,
      targetSlope: 0,
      transitionLen: 28,
    };

    this.reset();
  }

  public setLampsActive(active: boolean): void {
    this.lampHeadMat.emissiveIntensity = active ? 2.6 : 0.08;
    this.studMat.emissiveIntensity = active ? 1.9 : 0.65;
    this.roadsideProps.setLampIntensity(active ? 1 : 0);
  }

  public setLampIntensity(factor: number): void {
    const f = THREE.MathUtils.clamp(factor, 0, 1);
    this.lampHeadMat.emissiveIntensity = THREE.MathUtils.lerp(0.08, 2.6, f);
    this.studMat.emissiveIntensity = THREE.MathUtils.lerp(0.65, 1.9, f);
    this.roadsideProps.setLampIntensity(f);
  }

  public setWetness(wet: number | boolean): void {
    const w =
      typeof wet === 'boolean' ? (wet ? 1 : 0) : THREE.MathUtils.clamp(wet, 0, 1);
    this.asphaltMat.roughness = THREE.MathUtils.lerp(0.84, 0.14, w);
    this.asphaltMat.metalness = THREE.MathUtils.lerp(0.08, 0.34, w);
    this.asphaltMat.clearcoat = w * 0.92;
    this.asphaltMat.clearcoatRoughness = THREE.MathUtils.lerp(0.35, 0.06, w);
    this.asphaltMat.envMapIntensity = THREE.MathUtils.lerp(0.85, 2.45, w);
    this.asphaltMat.color.setRGB(
      THREE.MathUtils.lerp(1, 0.42, w),
      THREE.MathUtils.lerp(1, 0.47, w),
      THREE.MathUtils.lerp(1, 0.56, w),
    );
    this.shoulderMat.roughness = THREE.MathUtils.lerp(0.92, 0.34, w);
    this.shoulderMat.color.setRGB(
      THREE.MathUtils.lerp(1, 0.54, w),
      THREE.MathUtils.lerp(1, 0.6, w),
      THREE.MathUtils.lerp(1, 0.68, w),
    );
  }

  private clearChunkExtras(chunk: RoadChunk): void {
    if (chunk.extrasGroup.children.length > 0) {
      this.roadsideProps.unregisterChunkRotors(chunk.extrasGroup);
      chunk.extrasGroup.clear();
    }
    for (let i = 0; i < chunk.extraDisposables.length; i++) {
      chunk.extraDisposables[i].dispose();
    }
    chunk.extraDisposables.length = 0;
    for (let i = 0; i < chunk.extraInstanced.length; i++) {
      chunk.extraInstanced[i].dispose();
    }
    chunk.extraInstanced.length = 0;
  }

  private destroyPooledChunk(chunk: RoadChunk): void {
    this.clearChunkExtras(chunk);
    this.group.remove(chunk.group);
    chunk.roadGeo.dispose();
    chunk.shouldersGeo.dispose();
    chunk.railsGeo.dispose();
    chunk.terrainGeo.dispose();
    chunk.postInst.dispose();
    chunk.studInst.dispose();
    chunk.lampPoleInst.dispose();
    chunk.lampArmInst.dispose();
    chunk.lampHeadInst.dispose();
    chunk.chevronPostInst.dispose();
    chunk.chevronBoardInst.dispose();
    chunk.trunkInst.dispose();
    chunk.foliageInst.dispose();
    chunk.cactusInst.dispose();
    chunk.iceInst.dispose();
    chunk.basaltInst.dispose();
    chunk.rockInst.dispose();
    this.roadsideProps.disposeChunkSlot(chunk.roadsideSlot);
  }

  public reset(): void {
    this.roadsideProps.resetRotors();
    for (let i = 0; i < this.chunks.length; i++) {
      this.clearChunkExtras(this.chunks[i]);
    }
    this.samples = [];
    this.baseIndex = 0;
    this.sectionCount = 0;

    this.currentSection = {
      startS: 0,
      endS: 72,
      startCurvature: 0,
      targetCurvature: 0,
      startSlope: 0,
      targetSlope: 0,
      transitionLen: 28,
    };

    const initialSamples = CHUNK_SAMPLES * (this.chunkCount + 1) + 1;
    let pos = new THREE.Vector3(0, 0, 80);
    let heading = 0;

    for (let i = 0; i < initialSamples; i++) {
      const s = (i - CHUNK_SAMPLES) * SAMPLE_STEP;
      const { curvature, slope } = this.evaluateSectionParams(Math.max(0, s));
      const pitch = Math.atan(slope);
      const bank = THREE.MathUtils.clamp(curvature * 9.8, -0.245, 0.245);

      const tangent = new THREE.Vector3(
        Math.sin(heading) * Math.cos(pitch),
        Math.sin(pitch),
        -Math.cos(heading) * Math.cos(pitch),
      ).normalize();

      const rightBase = new THREE.Vector3(
        Math.cos(heading),
        0,
        Math.sin(heading),
      );
      const right = rightBase
        .clone()
        .multiplyScalar(Math.cos(bank))
        .addScaledVector(WORLD_UP, -Math.sin(bank))
        .normalize();
      const normal = new THREE.Vector3().crossVectors(right, tangent).normalize();

      this.samples.push({
        index: i,
        s,
        pos: pos.clone(),
        heading,
        pitch,
        curvature,
        bank,
        tangent,
        right,
        normal,
      });

      pos = pos.clone().addScaledVector(tangent, SAMPLE_STEP);
      heading += curvature * SAMPLE_STEP;
    }

    // Allocate fixed GPU chunk pool ONCE; reuse every chunk in-place on restarts & streaming
    if (this.chunks.length === 0) {
      for (let c = 0; c < this.chunkCount; c++) {
        this.chunks.push(this.createPooledChunk());
      }
    }
    for (let c = 0; c < this.chunkCount; c++) {
      const startIdx = c * CHUNK_SAMPLES;
      this.populateChunk(this.chunks[c], startIdx, startIdx + CHUNK_SAMPLES);
    }
  }

  private evaluateSectionParams(s: number): {
    curvature: number;
    slope: number;
  } {
    while (s > this.currentSection.endS) {
      this.advanceSection();
    }
    const sec = this.currentSection;
    const tRaw = THREE.MathUtils.clamp(
      (s - sec.startS) / Math.max(sec.transitionLen, 1),
      0,
      1,
    );
    const t = tRaw * tRaw * (3 - 2 * tRaw);
    return {
      curvature: THREE.MathUtils.lerp(
        sec.startCurvature,
        sec.targetCurvature,
        t,
      ),
      slope: THREE.MathUtils.lerp(sec.startSlope, sec.targetSlope, t),
    };
  }

  private advanceSection(): void {
    const prev = this.currentSection;
    this.sectionCount++;

    const difficulty = Math.min(1, this.sectionCount / 14);
    const pattern = this.sectionCount % 6;
    const currentHeading =
      this.samples.length > 0
        ? this.samples[this.samples.length - 1].heading
        : 0;

    let nextCurvature = 0;
    let length = 115 + Math.random() * 80;
    let transitionLen = 36;

    if (pattern === 1 || pattern === 2) {
      // Sweeping prominent left or right curve
      const sign = pattern === 1 ? -1 : 1;
      const mag = (0.011 + Math.random() * 0.007) * (0.85 + difficulty * 0.25);
      nextCurvature = sign * mag;
      length = 115 + Math.random() * 80;
      transitionLen = 38;
    } else if (pattern === 3) {
      // Snappy S-bend chicane (immediate sign reversal)
      const sign = prev.targetCurvature >= 0 ? -1 : 1;
      nextCurvature = sign * (0.014 + Math.random() * 0.006);
      length = 105 + Math.random() * 60;
      transitionLen = 34;
    } else if (pattern === 4) {
      // Short fast straightaway or gentle bend before next corner
      nextCurvature = (Math.random() - 0.5) * 0.003;
      length = 75 + Math.random() * 45;
      transitionLen = 30;
    } else if (pattern === 5) {
      // Deep mountain/coastal bend
      const sign =
        Math.abs(currentHeading) > 0.35
          ? -Math.sign(currentHeading)
          : Math.random() < 0.5
            ? -1
            : 1;
      nextCurvature = sign * (0.015 + Math.random() * 0.005);
      length = 115 + Math.random() * 65;
      transitionLen = 40;
    } else {
      // Reverse sweeping turn
      const sign = prev.targetCurvature >= 0 ? -1 : 1;
      nextCurvature = sign * (0.012 + Math.random() * 0.0065);
      length = 110 + Math.random() * 65;
      transitionLen = 36;
    }

    // Keep overall road heading bounded so the highway winds cleanly S-style
    // and never loops back across or near earlier/later segments.
    const maxAbsHeading = 1.05;
    if (Math.abs(currentHeading) > 0.58) {
      const returnSign = -Math.sign(currentHeading);
      if (Math.sign(nextCurvature) !== returnSign || Math.abs(nextCurvature) < 0.008) {
        nextCurvature = returnSign * Math.max(0.012, Math.abs(nextCurvature));
      }
    }
    const estEndHeading = currentHeading + nextCurvature * length * 0.85;
    if (Math.abs(estEndHeading) > maxAbsHeading && Math.abs(nextCurvature) > 0.001) {
      const maxHeadingDelta =
        Math.sign(nextCurvature) * maxAbsHeading - currentHeading;
      if (maxHeadingDelta * nextCurvature <= 0) {
        nextCurvature = -Math.sign(currentHeading) * 0.014;
      } else {
        length = Math.max(65, Math.min(length, Math.abs(maxHeadingDelta / nextCurvature)));
      }
    }
    nextCurvature = THREE.MathUtils.clamp(nextCurvature, -0.02, 0.02);

    // Tie dramatic elevation climbs and dips to curves so bends rise and bank dynamically
    const hillCycle = this.sectionCount % 4;
    let nextSlope = 0;
    if (hillCycle === 1) {
      nextSlope = 0.095 + Math.random() * 0.065; // Uphill mountain climb into curve
    } else if (hillCycle === 2) {
      nextSlope = 0.05 + Math.random() * 0.07; // Continued high ridge climb
    } else if (hillCycle === 3) {
      nextSlope = -(0.085 + Math.random() * 0.055); // Thrilling downhill dive
    } else {
      nextSlope = (Math.random() - 0.45) * 0.09;
    }

    this.currentSection = {
      startS: prev.endS,
      endS: prev.endS + length,
      startCurvature: prev.targetCurvature,
      targetCurvature: nextCurvature,
      startSlope: prev.targetSlope,
      targetSlope: nextSlope,
      transitionLen,
    };
  }

  public update(playerS: number, dt = 0.016): void {
    this.roadsideProps.update(dt);
    while (this.chunks.length > 0 && this.chunks[0].endS < playerS - 72) {
      // Subway-Surfers-style GPU chunk recycling: reuse the tail chunk's pre-allocated
      // WebGL buffers and InstancedMeshes at the front — zero alloc/dispose!
      const recycled = this.chunks.shift()!;

      const dropCount = CHUNK_SAMPLES;
      const dropped = this.samples.splice(0, dropCount);
      for (let i = 0; i < dropped.length; i++) {
        this.samplePool.push(dropped[i]);
      }
      this.baseIndex += dropCount;

      for (let i = 0; i < CHUNK_SAMPLES; i++) {
        this.appendSample();
      }

      const lastChunk = this.chunks[this.chunks.length - 1];
      const newStartIdx = lastChunk.endIndex;
      const newEndIdx = newStartIdx + CHUNK_SAMPLES;
      this.populateChunk(recycled, newStartIdx, newEndIdx);
      this.chunks.push(recycled);
    }
  }

  private appendSample(): void {
    const last = this.samples[this.samples.length - 1];
    const nextHeading = last.heading + last.curvature * SAMPLE_STEP;
    const nextS = last.s + SAMPLE_STEP;

    const { curvature, slope } = this.evaluateSectionParams(nextS);
    const pitch = Math.atan(slope);
    const bank = THREE.MathUtils.clamp(curvature * 9.8, -0.245, 0.245);
    const cosPitch = Math.cos(pitch);
    const cosBank = Math.cos(bank);
    const sinBank = Math.sin(bank);

    const recycled = this.samplePool.pop();
    const pos = recycled ? recycled.pos : new THREE.Vector3();
    const tangent = recycled ? recycled.tangent : new THREE.Vector3();
    const right = recycled ? recycled.right : new THREE.Vector3();
    const normal = recycled ? recycled.normal : new THREE.Vector3();

    pos.copy(last.pos).addScaledVector(last.tangent, SAMPLE_STEP);
    tangent
      .set(
        Math.sin(nextHeading) * cosPitch,
        Math.sin(pitch),
        -Math.cos(nextHeading) * cosPitch,
      )
      .normalize();

    _sampleRightBase.set(Math.cos(nextHeading), 0, Math.sin(nextHeading));
    right
      .copy(_sampleRightBase)
      .multiplyScalar(cosBank)
      .addScaledVector(WORLD_UP, -sinBank)
      .normalize();
    normal.crossVectors(right, tangent).normalize();

    if (recycled) {
      recycled.index = last.index + 1;
      recycled.s = nextS;
      recycled.heading = nextHeading;
      recycled.pitch = pitch;
      recycled.curvature = curvature;
      recycled.bank = bank;
      this.samples.push(recycled);
    } else {
      this.samples.push({
        index: last.index + 1,
        s: nextS,
        pos,
        heading: nextHeading,
        pitch,
        curvature,
        bank,
        tangent,
        right,
        normal,
      });
    }
  }

  public sampleAtS(s: number, out: EvaluatedRoadPoint): boolean {
    if (this.samples.length < 2) return false;
    const firstS = this.samples[0].s;
    const fIdx = (s - firstS) / SAMPLE_STEP;
    const i0 = THREE.MathUtils.clamp(
      Math.floor(fIdx),
      0,
      this.samples.length - 2,
    );
    const i1 = i0 + 1;
    const alpha = THREE.MathUtils.clamp(fIdx - i0, 0, 1);

    const a = this.samples[i0];
    const b = this.samples[i1];

    out.s = s;
    out.pos.lerpVectors(a.pos, b.pos, alpha);
    out.tangent.lerpVectors(a.tangent, b.tangent, alpha).normalize();
    out.right.lerpVectors(a.right, b.right, alpha).normalize();
    out.normal.lerpVectors(a.normal, b.normal, alpha).normalize();
    out.heading = THREE.MathUtils.lerp(a.heading, b.heading, alpha);
    out.curvature = THREE.MathUtils.lerp(a.curvature, b.curvature, alpha);
    out.bank = THREE.MathUtils.lerp(a.bank, b.bank, alpha);
    return true;
  }

  public getUpcomingCurve(s: number): UpcomingCurve {
    if (this.samples.length < 2) return 'none';
    const firstS = this.samples[0].s;
    const lookS = s + 64;
    const idx = THREE.MathUtils.clamp(
      Math.round((lookS - firstS) / SAMPLE_STEP),
      0,
      this.samples.length - 1,
    );
    const k = this.samples[idx].curvature;
    if (k < -0.017) return 'sharp-left';
    if (k > 0.017) return 'sharp-right';
    if (k < -0.0085) return 'left';
    if (k > 0.0085) return 'right';
    return 'none';
  }

  public getRoadZoneAtS(s: number): RoadZoneId {
    return getRoadZoneAtS(s);
  }

  public recenter(offset: THREE.Vector3): void {
    for (const sample of this.samples) {
      sample.pos.sub(offset);
    }
    for (const chunk of this.chunks) {
      chunk.group.position.sub(offset);
      chunk.group.updateMatrix();
      chunk.group.updateMatrixWorld(true);
    }
  }

  private getSample(globalIndex: number): RoadSample {
    const localIdx = globalIndex - this.baseIndex;
    return this.samples[
      THREE.MathUtils.clamp(localIdx, 0, this.samples.length - 1)
    ];
  }

  private createPooledInstanced(
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    maxCount: number,
    hasColor = false,
  ): THREE.InstancedMesh {
    const inst = new THREE.InstancedMesh(geo, mat, maxCount);
    inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (hasColor) {
      inst.setColorAt(0, _chunkWhite);
      if (inst.instanceColor) {
        inst.instanceColor.setUsage(THREE.DynamicDrawUsage);
      }
    }
    inst.count = 0;
    inst.visible = false;
    inst.matrixAutoUpdate = false;
    return inst;
  }

  private createPooledRoadGeo(count: number): THREE.BufferGeometry {
    const vertCount = count * 2;
    const positions = new Float32Array(vertCount * 3);
    const normals = new Float32Array(vertCount * 3);
    const uvs = new Float32Array(vertCount * 2);
    const indices = new Uint16Array((count - 1) * 6);
    let idxPtr = 0;
    for (let i = 0; i < count - 1; i++) {
      const idx = i * 2;
      indices[idxPtr++] = idx;
      indices[idxPtr++] = idx + 1;
      indices[idxPtr++] = idx + 2;
      indices[idxPtr++] = idx + 1;
      indices[idxPtr++] = idx + 3;
      indices[idxPtr++] = idx + 2;
    }
    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(positions, 3);
    const normAttr = new THREE.BufferAttribute(normals, 3);
    const uvAttr = new THREE.BufferAttribute(uvs, 2);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    normAttr.setUsage(THREE.DynamicDrawUsage);
    uvAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posAttr);
    geo.setAttribute('normal', normAttr);
    geo.setAttribute('uv', uvAttr);
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    return geo;
  }

  private createPooledShouldersGeo(count: number): THREE.BufferGeometry {
    const halfVerts = count * 2;
    const vertCount = halfVerts * 2;
    const positions = new Float32Array(vertCount * 3);
    const normals = new Float32Array(vertCount * 3);
    const uvs = new Float32Array(vertCount * 2);
    const indices = new Uint16Array((count - 1) * 12);
    let idxPtr = 0;
    for (let half = 0; half < 2; half++) {
      const vBase = half * halfVerts;
      for (let i = 0; i < count - 1; i++) {
        const idx = vBase + i * 2;
        indices[idxPtr++] = idx;
        indices[idxPtr++] = idx + 1;
        indices[idxPtr++] = idx + 2;
        indices[idxPtr++] = idx + 1;
        indices[idxPtr++] = idx + 3;
        indices[idxPtr++] = idx + 2;
      }
    }
    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(positions, 3);
    const normAttr = new THREE.BufferAttribute(normals, 3);
    const uvAttr = new THREE.BufferAttribute(uvs, 2);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    normAttr.setUsage(THREE.DynamicDrawUsage);
    uvAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posAttr);
    geo.setAttribute('normal', normAttr);
    geo.setAttribute('uv', uvAttr);
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    return geo;
  }

  private createPooledRailsGeo(count: number): THREE.BufferGeometry {
    const halfVerts = count * 4;
    const vertCount = halfVerts * 2;
    const positions = new Float32Array(vertCount * 3);
    const normals = new Float32Array(vertCount * 3);
    const indices = new Uint16Array((count - 1) * 36);
    let idxPtr = 0;
    for (let half = 0; half < 2; half++) {
      const vBase = half * halfVerts;
      for (let i = 0; i < count - 1; i++) {
        const a = vBase + i * 4;
        const b = vBase + (i + 1) * 4;
        indices[idxPtr++] = a;
        indices[idxPtr++] = a + 1;
        indices[idxPtr++] = b;
        indices[idxPtr++] = a + 1;
        indices[idxPtr++] = b + 1;
        indices[idxPtr++] = b;
        indices[idxPtr++] = a + 1;
        indices[idxPtr++] = a + 2;
        indices[idxPtr++] = b + 1;
        indices[idxPtr++] = a + 2;
        indices[idxPtr++] = b + 2;
        indices[idxPtr++] = b + 1;
        indices[idxPtr++] = a + 2;
        indices[idxPtr++] = a + 3;
        indices[idxPtr++] = b + 2;
        indices[idxPtr++] = a + 3;
        indices[idxPtr++] = b + 3;
        indices[idxPtr++] = b + 2;
      }
    }
    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(positions, 3);
    const normAttr = new THREE.BufferAttribute(normals, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    normAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posAttr);
    geo.setAttribute('normal', normAttr);
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    return geo;
  }

  private createPooledTerrainGeo(count: number): THREE.BufferGeometry {
    const cols = 5;
    const halfVerts = count * cols;
    const vertCount = halfVerts * 2;
    const positions = new Float32Array(vertCount * 3);
    const normals = new Float32Array(vertCount * 3);
    const colors = new Float32Array(vertCount * 3);
    const indices = new Uint16Array((count - 1) * (cols - 1) * 6 * 2);
    let idxPtr = 0;
    // Half 0 = left (-1), Half 1 = right (+1)
    for (let half = 0; half < 2; half++) {
      const vBase = half * halfVerts;
      const isRight = half === 1;
      for (let i = 0; i < count - 1; i++) {
        for (let j = 0; j < cols - 1; j++) {
          const a = vBase + i * cols + j;
          const b = a + 1;
          const c = vBase + (i + 1) * cols + j;
          const d = c + 1;
          if (isRight) {
            indices[idxPtr++] = a;
            indices[idxPtr++] = b;
            indices[idxPtr++] = c;
            indices[idxPtr++] = b;
            indices[idxPtr++] = d;
            indices[idxPtr++] = c;
          } else {
            indices[idxPtr++] = a;
            indices[idxPtr++] = c;
            indices[idxPtr++] = b;
            indices[idxPtr++] = b;
            indices[idxPtr++] = c;
            indices[idxPtr++] = d;
          }
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(positions, 3);
    const normAttr = new THREE.BufferAttribute(normals, 3);
    const colAttr = new THREE.BufferAttribute(colors, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    normAttr.setUsage(THREE.DynamicDrawUsage);
    colAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posAttr);
    geo.setAttribute('normal', normAttr);
    geo.setAttribute('color', colAttr);
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    return geo;
  }

  private createPooledChunk(): RoadChunk {
    const count = CHUNK_SAMPLES + 1;
    const chunkGroup = new THREE.Group();
    const extrasGroup = new THREE.Group();
    extrasGroup.matrixAutoUpdate = false;
    chunkGroup.add(extrasGroup);

    const roadGeo = this.createPooledRoadGeo(count);
    const roadMesh = new THREE.Mesh(roadGeo, this.asphaltMat);
    roadMesh.receiveShadow = true;
    roadMesh.matrixAutoUpdate = false;
    chunkGroup.add(roadMesh);

    const shouldersGeo = this.createPooledShouldersGeo(count);
    const shouldersMesh = new THREE.Mesh(shouldersGeo, this.shoulderMat);
    shouldersMesh.receiveShadow = true;
    shouldersMesh.matrixAutoUpdate = false;
    chunkGroup.add(shouldersMesh);

    const railsGeo = this.createPooledRailsGeo(count);
    const railsMesh = new THREE.Mesh(railsGeo, this.guardrailMat);
    railsMesh.matrixAutoUpdate = false;
    chunkGroup.add(railsMesh);

    const terrainGeo = this.createPooledTerrainGeo(count);
    const terrainMesh = new THREE.Mesh(terrainGeo, this.terrainMat);
    terrainMesh.receiveShadow = true;
    terrainMesh.matrixAutoUpdate = false;
    chunkGroup.add(terrainMesh);

    const postInst = this.createPooledInstanced(
      this.postGeo,
      this.postMat,
      MAX_POSTS_PER_CHUNK,
    );
    const studInst = this.createPooledInstanced(
      this.studGeo,
      this.studMat,
      MAX_POSTS_PER_CHUNK,
    );
    const lampPoleInst = this.createPooledInstanced(
      this.lampPoleGeo,
      this.postMat,
      MAX_LAMPS_PER_CHUNK,
    );
    const lampArmInst = this.createPooledInstanced(
      this.lampArmGeo,
      this.postMat,
      MAX_LAMPS_PER_CHUNK,
    );
    const lampHeadInst = this.createPooledInstanced(
      this.lampHeadGeo,
      this.lampHeadMat,
      MAX_LAMPS_PER_CHUNK,
    );
    const chevronPostInst = this.createPooledInstanced(
      this.chevronPostGeo,
      this.postMat,
      MAX_CHEVRONS_PER_CHUNK,
    );
    const chevronBoardInst = this.createPooledInstanced(
      this.chevronBoardGeo,
      this.chevronMat,
      MAX_CHEVRONS_PER_CHUNK,
    );
    const trunkInst = this.createPooledInstanced(
      this.trunkGeo,
      this.trunkMat,
      MAX_PROPS_PER_CHUNK,
    );
    const foliageInst = this.createPooledInstanced(
      this.foliageGeo,
      this.foliageMat,
      MAX_PROPS_PER_CHUNK,
      true,
    );
    const cactusInst = this.createPooledInstanced(
      this.cactusGeo,
      this.cactusMat,
      MAX_PROPS_PER_CHUNK,
      true,
    );
    const iceInst = this.createPooledInstanced(
      this.iceSpireGeo,
      this.iceMat,
      MAX_PROPS_PER_CHUNK,
      true,
    );
    const basaltInst = this.createPooledInstanced(
      this.basaltGeo,
      this.basaltMat,
      MAX_PROPS_PER_CHUNK,
      true,
    );
    const rockInst = this.createPooledInstanced(
      this.rockGeo,
      this.rockMat,
      MAX_PROPS_PER_CHUNK,
      true,
    );

    chunkGroup.add(
      postInst,
      studInst,
      lampPoleInst,
      lampArmInst,
      lampHeadInst,
      chevronPostInst,
      chevronBoardInst,
      trunkInst,
      foliageInst,
      cactusInst,
      iceInst,
      basaltInst,
      rockInst,
    );

    const roadsideSlot = this.roadsideProps.createChunkSlot(chunkGroup);
    this.group.add(chunkGroup);

    return {
      startIndex: 0,
      endIndex: 0,
      startS: 0,
      endS: 0,
      group: chunkGroup,
      extrasGroup,
      extraDisposables: [],
      extraInstanced: [],
      roadGeo,
      shouldersGeo,
      railsGeo,
      terrainGeo,
      postInst,
      studInst,
      lampPoleInst,
      lampArmInst,
      lampHeadInst,
      chevronPostInst,
      chevronBoardInst,
      trunkInst,
      foliageInst,
      cactusInst,
      iceInst,
      basaltInst,
      rockInst,
      roadsideSlot,
    };
  }

  private finalizeInstanced(
    inst: THREE.InstancedMesh,
    count: number,
    hasColor = false,
  ): void {
    inst.count = count;
    inst.visible = count > 0;
    if (count > 0) {
      inst.instanceMatrix.needsUpdate = true;
      if (hasColor && inst.instanceColor) {
        inst.instanceColor.needsUpdate = true;
      }
      inst.computeBoundingSphere();
    }
  }

  private populateChunk(
    chunk: RoadChunk,
    startIndex: number,
    endIndex: number,
  ): void {
    const count = endIndex - startIndex + 1;
    // Reset any recenter() translation before writing world-space sample coordinates
    chunk.group.position.set(0, 0, 0);
    chunk.group.updateMatrix();
    chunk.group.updateMatrixWorld(true);
    this.clearChunkExtras(chunk);

    // 1. Asphalt Road Ribbon (in-place GPU buffer update)
    this.updateRoadRibbonInPlace(chunk.roadGeo, startIndex, count);

    // 2. Merged Left & Right Shoulders / Rumble Curbs (1 draw call, in-place)
    this.updateShouldersInPlace(chunk.shouldersGeo, startIndex, count);

    // 3. Merged Left & Right Steel Guardrails (1 draw call, in-place)
    this.updateRailsInPlace(chunk.railsGeo, startIndex, count);

    const chunkStartS = this.getSample(startIndex).s;
    const chunkZone = this.getRoadZoneAtS(chunkStartS + 4);
    const isTunnel = chunkZone === 'tunnel';
    const isBridge = chunkZone === 'bridge';
    const prevZone = this.getRoadZoneAtS(chunkStartS - 4);
    const nextZone = this.getRoadZoneAtS(chunkStartS + 84);

    // 4. Merged Left & Right Terrain Embankments (1 draw call, in-place)
    this.updateTerrainInPlace(chunk.terrainGeo, startIndex, count, chunkZone);

    if (isTunnel) {
      this.addTunnelStructures(
        chunk.extrasGroup,
        chunk.extraDisposables,
        startIndex,
        count,
        prevZone !== 'tunnel',
        nextZone !== 'tunnel',
      );
    } else if (isBridge) {
      this.addBridgeStructures(
        chunk.extrasGroup,
        chunk.extraDisposables,
        startIndex,
        count,
        prevZone !== 'bridge',
        nextZone !== 'bridge',
      );
    }

    // 5. Guardrail Posts + Glowing Cats-Eye Road Studs (Pooled InstancedMesh)
    const dummy = _chunkDummy;
    const basisMat = _chunkBasisMat;
    const negTangent = _chunkNegTangent;
    let pIdx = 0;
    let sIdx = 0;
    for (let i = 0; i < count - 1; i += 2) {
      const s = this.getSample(startIndex + i);
      negTangent.copy(s.tangent).negate();
      basisMat.makeBasis(s.right, s.normal, negTangent);

      for (const side of [-1, 1]) {
        if (pIdx < MAX_POSTS_PER_CHUNK) {
          dummy.position
            .copy(s.pos)
            .addScaledVector(s.right, side * (GUARDRAIL_OFFSET + 0.08))
            .addScaledVector(s.normal, 0.44);
          dummy.quaternion.setFromRotationMatrix(basisMat);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          chunk.postInst.setMatrixAt(pIdx++, dummy.matrix);
        }

        if (sIdx < MAX_POSTS_PER_CHUNK) {
          // Reflective amber road edge studs flush with banked road surface
          dummy.position
            .copy(s.pos)
            .addScaledVector(s.right, side * (ROAD_HALF_WIDTH - 0.28))
            .addScaledVector(s.normal, 0.03);
          dummy.quaternion.setFromRotationMatrix(basisMat);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          chunk.studInst.setMatrixAt(sIdx++, dummy.matrix);
        }
      }
    }
    this.finalizeInstanced(chunk.postInst, pIdx);
    this.finalizeInstanced(chunk.studInst, sIdx);

    // 6. Overhead Highway Sign Gantry (every 3 chunks = 240m, skipped inside tunnels/bridges)
    const chunkOrdinal = Math.round(startIndex / CHUNK_SAMPLES);
    if (!isTunnel && !isBridge && chunkOrdinal > 0 && chunkOrdinal % 3 === 0) {
      const midSample = this.getSample(startIndex + Math.floor(count / 2));
      const gantry = new THREE.Group();
      gantry.position.copy(midSample.pos);
      gantry.rotation.y = -midSample.heading;

      for (const side of [-1, 1]) {
        const pillar = new THREE.Mesh(this.gantryPillarGeo, this.postMat);
        pillar.position.set(side * (GUARDRAIL_OFFSET + 0.55), 3.8, 0);
        pillar.castShadow = true;
        gantry.add(pillar);
      }

      const beam = new THREE.Mesh(this.gantryBeamGeo, this.postMat);
      beam.position.set(0, 7.25, 0);
      beam.castShadow = true;
      gantry.add(beam);

      for (let si = 0; si < 2; si++) {
        const sx = si === 0 ? -3.3 : 3.3;
        const sign = new THREE.Mesh(this.gantrySignGeo, this.gantrySignMat);
        sign.position.set(sx, 7.25, 0.3);
        const face = new THREE.Mesh(
          this.roadsideProps.getGantryFaceGeometry(),
          this.roadsideProps.getGantryFaceMaterial(chunkOrdinal + si),
        );
        face.position.set(sx, 7.25, 0.375);
        gantry.add(sign, face);
      }

      chunk.extrasGroup.add(gantry);
    }

    // 7. Streetlamps + Curve Chevrons + Biome-Driven Roadside Flora (Pooled InstancedMeshes, zero allocations)
    let lampCount = 0;
    let chevronCount = 0;
    let treeCount = 0;
    let rockCount = 0;
    let cactusCount = 0;
    let iceCount = 0;
    let basaltCount = 0;
    const chunkBiome = _chunkBiome;
    const tmpPos = _chunkTmpPos;
    const tmpColor = _chunkTmpColor;
    const m = _chunkMatM;

    for (let i = 0; i < count - 1; i++) {
      const sample = this.getSample(startIndex + i);
      const absCurv = Math.abs(sample.curvature);

      if (!isTunnel && sample.index % 9 === 0 && lampCount < MAX_LAMPS_PER_CHUNK) {
        const side = (sample.index / 9) % 2 === 0 ? -1 : 1;

        dummy.position
          .copy(sample.pos)
          .addScaledVector(sample.right, side * (GUARDRAIL_OFFSET + 0.6))
          .addScaledVector(sample.normal, 3.5);
        dummy.rotation.set(0, -sample.heading, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        chunk.lampPoleInst.setMatrixAt(lampCount, dummy.matrix);

        dummy.position
          .copy(sample.pos)
          .addScaledVector(sample.right, side * (GUARDRAIL_OFFSET - 0.35))
          .addScaledVector(sample.normal, 7.05);
        dummy.updateMatrix();
        chunk.lampArmInst.setMatrixAt(lampCount, dummy.matrix);

        dummy.position
          .copy(sample.pos)
          .addScaledVector(sample.right, side * (GUARDRAIL_OFFSET - 1.25))
          .addScaledVector(sample.normal, 6.96);
        dummy.updateMatrix();
        chunk.lampHeadInst.setMatrixAt(lampCount, dummy.matrix);
        lampCount++;
      }

      // Curve Warning Chevrons on outer curve edge (every 16m on bends)
      if (
        absCurv > 0.008 &&
        sample.index % 4 === 0 &&
        chevronCount < MAX_CHEVRONS_PER_CHUNK
      ) {
        const outerSide = sample.curvature > 0 ? -1 : 1;
        tmpPos
          .copy(sample.pos)
          .addScaledVector(sample.right, outerSide * (GUARDRAIL_OFFSET + 0.65));

        dummy.position.copy(tmpPos).addScaledVector(sample.normal, 1.15);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        chunk.chevronPostInst.setMatrixAt(chevronCount, dummy.matrix);

        dummy.position.copy(tmpPos).addScaledVector(sample.normal, 2.05);
        dummy.rotation.set(
          0,
          -sample.heading + outerSide * 0.28,
          sample.curvature < 0 ? Math.PI : 0,
        );
        dummy.updateMatrix();
        chunk.chevronBoardInst.setMatrixAt(chevronCount, dummy.matrix);
        chevronCount++;
      }

      if (!isTunnel && !isBridge && i % 2 === 0) {
        sampleBiomeAtDistance(sample.s, chunkBiome);
        for (const side of [-1, 1]) {
          let distOut = 12.8 + ((sample.index * 17 + (side > 0 ? 7 : 3)) % 26);

          // On the inside of a curve, keep props well within half the curve radius
          // so they never cross the focal center onto another part of the bend.
          const isInsideCurve = sample.curvature * side > 0.0005;
          if (isInsideCurve) {
            const curveRadius = 1 / Math.abs(sample.curvature);
            const maxInsideDist = curveRadius * 0.42;
            if (maxInsideDist < 13.0) continue;
            distOut = Math.min(distOut, maxInsideDist);
          }

          const elev = this.computeEmbankmentHeight(sample.s, side, distOut);
          const worldP = _chunkWorldP
            .copy(sample.pos)
            .addScaledVector(sample.right, side * distOut);
          worldP.y = sample.pos.y + elev;

          const isFeatureProp = (sample.index + (side > 0 ? 1 : 0)) % 3 !== 0;
          const minRoadClearance = isFeatureProp ? 12.8 : 12.2;
          if (!this.hasRoadClearance(worldP, minRoadClearance)) {
            continue;
          }

          const seed = ((sample.index * 29 + (side > 0 ? 13 : 5)) % 97) / 97;
          const colorBlend = ((sample.index * 7 + (side > 0 ? 3 : 0)) % 10) / 10;

          if (isFeatureProp) {
            const scale = 0.85 + (((sample.index * 13) % 10) / 10) * 0.55;
            dummy.position.copy(worldP);
            dummy.rotation.set(0, (sample.index * 1.1) % (Math.PI * 2), 0);
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();

            const cactusCut = chunkBiome.cactusRatio;
            const iceCut = cactusCut + chunkBiome.iceRatio;
            const basaltCut = iceCut + chunkBiome.basaltRatio;

            if (seed < cactusCut) {
              if (cactusCount < MAX_PROPS_PER_CHUNK) {
                chunk.cactusInst.setMatrixAt(cactusCount, dummy.matrix);
                tmpColor
                  .copy(chunkBiome.treeColorA)
                  .lerp(chunkBiome.treeColorB, colorBlend);
                chunk.cactusInst.setColorAt(cactusCount, tmpColor);
                cactusCount++;
              }
            } else if (seed < iceCut) {
              if (iceCount < MAX_PROPS_PER_CHUNK) {
                chunk.iceInst.setMatrixAt(iceCount, dummy.matrix);
                tmpColor
                  .copy(_chunkIceColorA)
                  .lerp(_chunkIceColorB, colorBlend);
                chunk.iceInst.setColorAt(iceCount, tmpColor);
                iceCount++;
              }
            } else if (seed < basaltCut) {
              if (basaltCount < MAX_PROPS_PER_CHUNK) {
                chunk.basaltInst.setMatrixAt(basaltCount, dummy.matrix);
                tmpColor
                  .copy(_chunkBasaltColorA)
                  .lerp(_chunkBasaltColorB, colorBlend);
                chunk.basaltInst.setColorAt(basaltCount, tmpColor);
                basaltCount++;
              }
            } else if (treeCount < MAX_PROPS_PER_CHUNK) {
              m.multiplyMatrices(dummy.matrix, _chunkTrunkOffset);
              chunk.trunkInst.setMatrixAt(treeCount, m);
              m.multiplyMatrices(dummy.matrix, _chunkConeOffset);
              chunk.foliageInst.setMatrixAt(treeCount, m);
              tmpColor
                .copy(chunkBiome.treeColorA)
                .lerp(chunkBiome.treeColorB, colorBlend);
              chunk.foliageInst.setColorAt(treeCount, tmpColor);
              treeCount++;
            }
          } else if (rockCount < MAX_PROPS_PER_CHUNK) {
            const scale = 0.7 + (((sample.index * 19) % 10) / 10) * 1.25;
            dummy.position.set(worldP.x, worldP.y + 0.35 * scale, worldP.z);
            dummy.rotation.set(
              (sample.index * 0.5) % 2,
              (sample.index * 0.9) % 3,
              0,
            );
            dummy.scale.set(scale * 1.25, scale * 0.85, scale);
            dummy.updateMatrix();
            chunk.rockInst.setMatrixAt(rockCount, dummy.matrix);
            tmpColor
              .copy(chunkBiome.rockColorA)
              .lerp(chunkBiome.rockColorB, colorBlend);
            chunk.rockInst.setColorAt(rockCount, tmpColor);
            rockCount++;
          }
        }
      }
    }

    this.finalizeInstanced(chunk.lampPoleInst, lampCount);
    this.finalizeInstanced(chunk.lampArmInst, lampCount);
    this.finalizeInstanced(chunk.lampHeadInst, lampCount);
    this.finalizeInstanced(chunk.chevronPostInst, chevronCount);
    this.finalizeInstanced(chunk.chevronBoardInst, chevronCount);
    this.finalizeInstanced(chunk.trunkInst, treeCount);
    this.finalizeInstanced(chunk.foliageInst, treeCount, true);
    this.finalizeInstanced(chunk.cactusInst, cactusCount, true);
    this.finalizeInstanced(chunk.iceInst, iceCount, true);
    this.finalizeInstanced(chunk.basaltInst, basaltCount, true);
    this.finalizeInstanced(chunk.rockInst, rockCount, true);

    if (!isTunnel && !isBridge) {
      this.roadsideProps.populateChunk({
        extrasGroup: chunk.extrasGroup,
        slot: chunk.roadsideSlot,
        startIndex,
        count,
        guardrailOffset: GUARDRAIL_OFFSET,
        getSample: (globalIndex) => this.getSample(globalIndex),
        computeEmbankmentHeight: (s, side, distOut) =>
          this.computeEmbankmentHeight(s, side, distOut),
        hasRoadClearance: (worldP, minDist) =>
          this.hasRoadClearance(worldP, minDist),
      });
    } else {
      this.roadsideProps.clearChunkSlot(chunk.roadsideSlot);
    }

    // Freeze static descendants added to extrasGroup and track any rare extra InstancedMeshes for cleanup
    if (chunk.extrasGroup.children.length > 0) {
      chunk.extrasGroup.updateMatrixWorld(true);
      chunk.extrasGroup.traverse((obj) => {
        if (obj instanceof THREE.InstancedMesh) {
          chunk.extraInstanced.push(obj);
        }
        if (obj === chunk.extrasGroup || obj.userData.isTurbineRotor) return;
        if (obj.parent && obj.parent.userData.isTurbineRotor) return;
        obj.matrixAutoUpdate = false;
      });
    }

    chunk.startIndex = startIndex;
    chunk.endIndex = endIndex;
    chunk.startS = this.getSample(startIndex).s;
    chunk.endS = this.getSample(endIndex).s;
  }

  private updateRoadRibbonInPlace(
    geo: THREE.BufferGeometry,
    startIndex: number,
    count: number,
  ): void {
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
    const uvAttr = geo.getAttribute('uv') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const uvs = uvAttr.array as Float32Array;
    const v0 = _chunkV0;
    const v1 = _chunkV1;

    for (let i = 0; i < count; i++) {
      const s = this.getSample(startIndex + i);
      v0.copy(s.pos).addScaledVector(s.right, -ROAD_HALF_WIDTH);
      v1.copy(s.pos).addScaledVector(s.right, ROAD_HALF_WIDTH);

      const pBase = i * 6;
      positions[pBase] = v0.x;
      positions[pBase + 1] = v0.y;
      positions[pBase + 2] = v0.z;
      positions[pBase + 3] = v1.x;
      positions[pBase + 4] = v1.y;
      positions[pBase + 5] = v1.z;

      const uBase = i * 4;
      const vCoord = s.s / 14;
      uvs[uBase] = 0;
      uvs[uBase + 1] = vCoord;
      uvs[uBase + 2] = 1;
      uvs[uBase + 3] = vCoord;
    }

    posAttr.needsUpdate = true;
    uvAttr.needsUpdate = true;
    geo.computeVertexNormals();
    (geo.getAttribute('normal') as THREE.BufferAttribute).needsUpdate = true;
    geo.computeBoundingSphere();
  }

  private updateShouldersInPlace(
    geo: THREE.BufferGeometry,
    startIndex: number,
    count: number,
  ): void {
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
    const uvAttr = geo.getAttribute('uv') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const uvs = uvAttr.array as Float32Array;
    const halfVerts = count * 2;
    const v0 = _chunkV0;
    const v1 = _chunkV1;

    for (let half = 0; half < 2; half++) {
      const isRight = half === 1;
      const leftOffset = isRight
        ? ROAD_HALF_WIDTH
        : -(ROAD_HALF_WIDTH + SHOULDER_WIDTH);
      const rightOffset = isRight
        ? ROAD_HALF_WIDTH + SHOULDER_WIDTH
        : -ROAD_HALF_WIDTH;
      const pStart = half * halfVerts * 3;
      const uStart = half * halfVerts * 2;

      for (let i = 0; i < count; i++) {
        const s = this.getSample(startIndex + i);
        v0.copy(s.pos)
          .addScaledVector(s.right, leftOffset)
          .addScaledVector(s.normal, 0.005);
        v1.copy(s.pos)
          .addScaledVector(s.right, rightOffset)
          .addScaledVector(s.normal, 0.005);

        const pBase = pStart + i * 6;
        positions[pBase] = v0.x;
        positions[pBase + 1] = v0.y;
        positions[pBase + 2] = v0.z;
        positions[pBase + 3] = v1.x;
        positions[pBase + 4] = v1.y;
        positions[pBase + 5] = v1.z;

        const uBase = uStart + i * 4;
        const vCoord = s.s / 8;
        uvs[uBase] = isRight ? 1 : 0;
        uvs[uBase + 1] = vCoord;
        uvs[uBase + 2] = isRight ? 0 : 1;
        uvs[uBase + 3] = vCoord;
      }
    }

    posAttr.needsUpdate = true;
    uvAttr.needsUpdate = true;
    geo.computeVertexNormals();
    (geo.getAttribute('normal') as THREE.BufferAttribute).needsUpdate = true;
    geo.computeBoundingSphere();
  }

  private updateRailsInPlace(
    geo: THREE.BufferGeometry,
    startIndex: number,
    count: number,
  ): void {
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const halfVerts = count * 4;
    const pLow = _chunkV0;
    const pHigh = _chunkV1;

    for (let half = 0; half < 2; half++) {
      const lateralOffset = half === 0 ? -GUARDRAIL_OFFSET : GUARDRAIL_OFFSET;
      const innerDir = half === 0 ? 1 : -1;
      const pStart = half * halfVerts * 3;

      for (let i = 0; i < count; i++) {
        const s = this.getSample(startIndex + i);
        pLow
          .copy(s.pos)
          .addScaledVector(s.right, lateralOffset)
          .addScaledVector(s.normal, 0.52);
        pHigh
          .copy(s.pos)
          .addScaledVector(s.right, lateralOffset)
          .addScaledVector(s.normal, 0.86);

        const pBase = pStart + i * 12;
        positions[pBase] = pLow.x;
        positions[pBase + 1] = pLow.y;
        positions[pBase + 2] = pLow.z;

        positions[pBase + 3] = pHigh.x;
        positions[pBase + 4] = pHigh.y;
        positions[pBase + 5] = pHigh.z;

        positions[pBase + 6] = pHigh.x - s.right.x * innerDir * 0.1;
        positions[pBase + 7] = pHigh.y;
        positions[pBase + 8] = pHigh.z - s.right.z * innerDir * 0.1;

        positions[pBase + 9] = pLow.x - s.right.x * innerDir * 0.1;
        positions[pBase + 10] = pLow.y;
        positions[pBase + 11] = pLow.z - s.right.z * innerDir * 0.1;
      }
    }

    posAttr.needsUpdate = true;
    geo.computeVertexNormals();
    (geo.getAttribute('normal') as THREE.BufferAttribute).needsUpdate = true;
    geo.computeBoundingSphere();
  }

  private computeEmbankmentHeight(
    s: number,
    side: number,
    distFromCenter: number,
  ): number {
    const t = Math.max(0, distFromCenter - (ROAD_HALF_WIDTH + SHOULDER_WIDTH));
    const hill =
      Math.sin(s * 0.022 + side * 1.4) * 2.8 +
      Math.cos(s * 0.055 - side * 0.8) * 1.3;
    return t < 8
      ? -0.06 * t
      : (t - 8) * (0.14 + Math.max(0, hill) * 0.025) - 0.48;
  }

  private hasRoadClearance(worldP: THREE.Vector3, minDist: number): boolean {
    const minDistSq = minDist * minDist;
    const farSkipSq = (minDist + 24) * (minDist + 24);
    const len = this.samples.length;
    for (let i = 0; i < len; ) {
      const s = this.samples[i];
      const dx = worldP.x - s.pos.x;
      const dz = worldP.z - s.pos.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < minDistSq) {
        return false;
      }
      if (dSq > farSkipSq) {
        // Road advances 4m per sample; when > minDist + 24m away, next 5 samples cannot intersect
        i += 6;
        continue;
      }
      if (dSq < minDistSq * 2.2 && i + 1 < len) {
        const sNext = this.samples[i + 1];
        const dx2 = worldP.x - sNext.pos.x;
        const dz2 = worldP.z - sNext.pos.z;
        if (dx2 * dx2 + dz2 * dz2 < minDistSq) {
          return false;
        }
      }
      i += 2;
    }
    return true;
  }

  private addTunnelStructures(
    chunkGroup: THREE.Group,
    disposables: THREE.BufferGeometry[],
    startIndex: number,
    count: number,
    isEntryChunk: boolean,
    isExitChunk: boolean,
  ): void {
    const innerGeo = this.createTunnelArchGeometry(
      startIndex,
      count,
      GUARDRAIL_OFFSET + 0.55,
      6.95,
      false,
    );
    const outerGeo = this.createTunnelArchGeometry(
      startIndex,
      count,
      GUARDRAIL_OFFSET + 1.45,
      7.95,
      true,
    );
    disposables.push(innerGeo, outerGeo);

    const innerMesh = new THREE.Mesh(innerGeo, this.tunnelWallMat);
    const outerMesh = new THREE.Mesh(outerGeo, this.tunnelOuterMat);
    chunkGroup.add(innerMesh, outerMesh);

    // Ceiling LED strip fixtures along the curved tunnel crown
    const lightCount = Math.floor((count - 1) / 2);
    const lightInst = new THREE.InstancedMesh(
      this.tunnelLightGeo,
      this.tunnelLightMat,
      lightCount,
    );
    let idx = 0;
    for (let i = 1; i < count; i += 2) {
      if (idx >= lightCount) break;
      const s = this.getSample(startIndex + i);
      _chunkNegTangent.copy(s.tangent).negate();
      _chunkBasisMat.makeBasis(s.right, s.normal, _chunkNegTangent);
      _chunkDummy.position.copy(s.pos).addScaledVector(s.normal, 6.72);
      _chunkDummy.quaternion.setFromRotationMatrix(_chunkBasisMat);
      _chunkDummy.scale.set(1, 1, 1);
      _chunkDummy.updateMatrix();
      lightInst.setMatrixAt(idx++, _chunkDummy.matrix);
    }
    lightInst.instanceMatrix.needsUpdate = true;
    lightInst.computeBoundingSphere();
    chunkGroup.add(lightInst);

    const addPortal = (sampleIdx: number) => {
      const s = this.getSample(sampleIdx);
      const portal = new THREE.Group();
      _chunkNegTangent.copy(s.tangent).negate();
      _chunkBasisMat.makeBasis(s.right, s.normal, _chunkNegTangent);
      portal.position.copy(s.pos);
      portal.quaternion.setFromRotationMatrix(_chunkBasisMat);

      const lintel = new THREE.Mesh(
        this.tunnelPortalLintelGeo,
        this.tunnelPortalMat,
      );
      lintel.position.set(0, 7.6, 0);
      portal.add(lintel);

      for (const side of [-1, 1]) {
        const pier = new THREE.Mesh(
          this.tunnelPortalPierGeo,
          this.tunnelPortalMat,
        );
        pier.position.set(side * (GUARDRAIL_OFFSET + 1.35), 3.9, 0);
        portal.add(pier);
      }

      const sign = new THREE.Mesh(
        this.tunnelPortalSignGeo,
        this.tunnelArrowMat,
      );
      sign.position.set(0, 7.15, 0.72);
      portal.add(sign);

      chunkGroup.add(portal);
    };

    if (isEntryChunk) addPortal(startIndex);
    if (isExitChunk) addPortal(startIndex + count - 1);
  }

  private createTunnelArchGeometry(
    startIndex: number,
    count: number,
    radiusX: number,
    radiusY: number,
    flipNormals: boolean,
  ): THREE.BufferGeometry {
    const segs = 12;
    const cols = segs + 1;
    const positions = new Float32Array(count * cols * 3);
    const uvs = new Float32Array(count * cols * 2);
    const indices: number[] = [];
    const p = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      const s = this.getSample(startIndex + i);
      const vCoord = s.s / 12;
      for (let j = 0; j < cols; j++) {
        const u = j / segs;
        const theta = Math.PI * (1 - u); // left (-X) over top (+Y) to right (+X)
        const lx = Math.cos(theta) * radiusX;
        const ly = Math.max(-0.2, Math.sin(theta) * radiusY);
        p.copy(s.pos)
          .addScaledVector(s.right, lx)
          .addScaledVector(s.normal, ly);

        const idx3 = (i * cols + j) * 3;
        positions[idx3] = p.x;
        positions[idx3 + 1] = p.y;
        positions[idx3 + 2] = p.z;

        const idx2 = (i * cols + j) * 2;
        uvs[idx2] = u;
        uvs[idx2 + 1] = vCoord;
      }

      if (i < count - 1) {
        for (let j = 0; j < segs; j++) {
          const a = i * cols + j;
          const b = a + 1;
          const c = (i + 1) * cols + j;
          const d = c + 1;
          if (flipNormals) {
            indices.push(a, c, b);
            indices.push(b, c, d);
          } else {
            indices.push(a, b, c);
            indices.push(b, d, c);
          }
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  private addBridgeStructures(
    chunkGroup: THREE.Group,
    disposables: THREE.BufferGeometry[],
    startIndex: number,
    count: number,
    isEntryChunk: boolean,
    isExitChunk: boolean,
  ): void {
    // 1. Thick steel/concrete bridge deck underside + parapet side beams
    const deckUnderGeo = this.createBridgeDeckGeometry(startIndex, count);
    disposables.push(deckUnderGeo);
    const deckUnder = new THREE.Mesh(deckUnderGeo, this.bridgeDeckMat);
    chunkGroup.add(deckUnder);

    const basisMat = new THREE.Matrix4();
    const negTangent = new THREE.Vector3();

    // 2. Towering Crimson Suspension Pylons (H-Towers) at entry, mid-span, and exit
    const towerIndices: number[] = [];
    if (isEntryChunk) {
      towerIndices.push(startIndex + 2, startIndex + count - 1);
    } else if (isExitChunk) {
      towerIndices.push(startIndex + count - 2);
    }

    for (const tIdx of towerIndices) {
      const s = this.getSample(tIdx);
      const tower = new THREE.Group();
      negTangent.copy(s.tangent).negate();
      basisMat.makeBasis(s.right, WORLD_UP, negTangent);
      tower.position.copy(s.pos);
      tower.quaternion.setFromRotationMatrix(basisMat);

      const towerX = GUARDRAIL_OFFSET + 0.95;
      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(this.bridgeTowerLegGeo, this.bridgeTowerMat);
        leg.position.set(side * towerX, 6.2, 0);
        tower.add(leg);

        const beacon = new THREE.Mesh(this.bridgeBeaconGeo, this.bridgeBeaconMat);
        beacon.position.set(side * towerX, 18.75, 0);
        tower.add(beacon);
      }

      for (const cy of [11.2, 17.5]) {
        const cross = new THREE.Mesh(
          this.bridgeTowerCrossGeo,
          this.bridgeTowerMat,
        );
        cross.position.set(0, cy, 0);
        tower.add(cross);
      }
      chunkGroup.add(tower);
    }

    // 3. Viaduct Concrete Piers beneath the deck every 40m
    for (const pOff of [4, 14]) {
      const s = this.getSample(startIndex + pOff);
      for (const side of [-1, 1]) {
        const pier = new THREE.Mesh(this.bridgePierGeo, this.bridgeSteelMat);
        pier.position
          .copy(s.pos)
          .addScaledVector(s.right, side * (ROAD_HALF_WIDTH - 0.6));
        pier.position.y -= 13.3;
        pier.rotation.y = -s.heading;
        chunkGroup.add(pier);
      }
    }

    // 4. Sweeping Parabolic Main Suspension Cables + Instanced Vertical Suspenders
    const cableX = GUARDRAIL_OFFSET + 0.95;
    const suspDummy = new THREE.Object3D();
    const suspenderMatrices: THREE.Matrix4[] = [];
    for (const side of [-1, 1]) {
      const curvePoints: THREE.Vector3[] = [];
      for (let i = 0; i < count; i++) {
        const s = this.getSample(startIndex + i);
        const u = i / Math.max(1, count - 1);
        // Parabolic catenary dip between 17.8m at ends and 6.2m at mid-span
        const sag = 4 * u * (1 - u);
        const cableH = 17.8 - sag * 11.6;
        const pt = s.pos
          .clone()
          .addScaledVector(s.right, side * cableX)
          .addScaledVector(WORLD_UP, cableH);
        curvePoints.push(pt);

        if (i % 2 === 1 && i < count - 1) {
          const suspenderLen = Math.max(1.2, cableH - 0.8);
          suspDummy.position
            .copy(s.pos)
            .addScaledVector(s.right, side * cableX)
            .addScaledVector(WORLD_UP, 0.8 + suspenderLen * 0.5);
          suspDummy.rotation.set(0, 0, 0);
          suspDummy.scale.set(1, suspenderLen, 1);
          suspDummy.updateMatrix();
          suspenderMatrices.push(suspDummy.matrix.clone());
        }
      }
      const cableCurve = new THREE.CatmullRomCurve3(curvePoints);
      const cableGeo = new THREE.TubeGeometry(cableCurve, count - 1, 0.22, 6, false);
      disposables.push(cableGeo);
      const cableMesh = new THREE.Mesh(cableGeo, this.bridgeCableMat);
      chunkGroup.add(cableMesh);
    }

    if (suspenderMatrices.length > 0) {
      const suspInst = new THREE.InstancedMesh(
        this.bridgeSuspenderGeo,
        this.bridgeCableMat,
        suspenderMatrices.length,
      );
      for (let si = 0; si < suspenderMatrices.length; si++) {
        suspInst.setMatrixAt(si, suspenderMatrices[si]);
      }
      suspInst.instanceMatrix.needsUpdate = true;
      suspInst.computeBoundingSphere();
      chunkGroup.add(suspInst);
    }
  }

  private createBridgeDeckGeometry(
    startIndex: number,
    count: number,
  ): THREE.BufferGeometry {
    const hw = GUARDRAIL_OFFSET + 0.45;
    const depth = 1.65;
    // 4-point cross-section per sample: left-top, left-bottom, right-bottom, right-top
    const positions = new Float32Array(count * 4 * 3);
    const indices: number[] = [];
    const p = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      const s = this.getSample(startIndex + i);
      const pts: [number, number][] = [
        [-hw, -0.05],
        [-hw + 0.6, -depth],
        [hw - 0.6, -depth],
        [hw, -0.05],
      ];
      for (let j = 0; j < 4; j++) {
        p.copy(s.pos)
          .addScaledVector(s.right, pts[j][0])
          .addScaledVector(s.normal, pts[j][1]);
        const idx = (i * 4 + j) * 3;
        positions[idx] = p.x;
        positions[idx + 1] = p.y;
        positions[idx + 2] = p.z;
      }
      if (i < count - 1) {
        const a = i * 4;
        const b = (i + 1) * 4;
        for (let j = 0; j < 3; j++) {
          indices.push(a + j, b + j, a + j + 1);
          indices.push(a + j + 1, b + j, b + j + 1);
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  private updateTerrainInPlace(
    geo: THREE.BufferGeometry,
    startIndex: number,
    count: number,
    zone: RoadZoneId = 'open',
  ): void {
    const widths = [ROAD_HALF_WIDTH + SHOULDER_WIDTH, 14, 28, 54, 98];
    const cols = widths.length;
    const halfVerts = count * cols;
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = geo.getAttribute('color') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const colors = colAttr.array as Float32Array;

    const biomeSample = _chunkBiome;
    const tmpColor = _chunkTmpColor;
    const riverColor = _chunkRiverColor;

    // Half 0 = left (-1), Half 1 = right (+1)
    for (let half = 0; half < 2; half++) {
      const side = half === 0 ? -1 : 1;
      const vStart = half * halfVerts;

      for (let i = 0; i < count; i++) {
        const sample = this.getSample(startIndex + i);
        sampleBiomeAtDistance(sample.s, biomeSample);
        const isInsideCurve = sample.curvature * side > 0.0005;
        const maxInsideWidth = isInsideCurve
          ? Math.max(widths[0] + 2, (1 / Math.abs(sample.curvature)) * 0.62)
          : 98;

        for (let j = 0; j < cols; j++) {
          const w = j === 0 ? widths[0] : Math.min(widths[j], maxInsideWidth);
          let elev =
            j === 0 ? -0.02 : this.computeEmbankmentHeight(sample.s, side, w);
          if (zone === 'bridge') {
            // Deep river/canyon gorge underneath suspension bridge
            elev = j === 0 ? -21.5 : j <= 2 ? -22.5 : -14.0 + (j - 2) * 8.5;
          } else if (zone === 'tunnel') {
            // Mountain slope rising tightly around tunnel vault
            elev = j === 0 ? 0.1 : 6.2 + j * 4.4;
          }
          const px = sample.pos.x + sample.right.x * (side * w);
          const py = sample.pos.y + elev;
          const pz = sample.pos.z + sample.right.z * (side * w);

          const idx = (vStart + i * cols + j) * 3;
          positions[idx] = px;
          positions[idx + 1] = py;
          positions[idx + 2] = pz;

          if (zone === 'bridge' && j <= 2) {
            tmpColor
              .copy(riverColor)
              .lerp(biomeSample.ridgeColor, j === 2 ? 0.35 : 0);
          } else if (zone === 'tunnel') {
            tmpColor.copy(biomeSample.ridgeColor).multiplyScalar(0.84);
          } else if (j === 0) tmpColor.copy(biomeSample.shoulderColor);
          else if (j <= 2) tmpColor.copy(biomeSample.groundColor);
          else tmpColor.copy(biomeSample.ridgeColor);
          colors[idx] = tmpColor.r;
          colors[idx + 1] = tmpColor.g;
          colors[idx + 2] = tmpColor.b;
        }
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    geo.computeVertexNormals();
    (geo.getAttribute('normal') as THREE.BufferAttribute).needsUpdate = true;
    geo.computeBoundingSphere();
  }

  public dispose(): void {
    for (const chunk of this.chunks) {
      this.destroyPooledChunk(chunk);
    }
    this.chunks = [];
    this.asphaltMat.dispose();
    this.shoulderMat.dispose();
    this.terrainMat.dispose();
    this.guardrailMat.dispose();
    this.postMat.dispose();
    this.chevronMat.dispose();
    this.lampHeadMat.dispose();
    this.studMat.dispose();
    this.gantrySignMat.dispose();
    this.trunkMat.dispose();
    this.foliageMat.dispose();
    this.rockMat.dispose();
    this.cactusMat.dispose();
    this.iceMat.dispose();
    this.basaltMat.dispose();
    this.tunnelWallMat.dispose();
    this.tunnelOuterMat.dispose();
    this.tunnelLightMat.dispose();
    this.tunnelPortalMat.dispose();
    this.tunnelArrowMat.dispose();
    this.bridgeTowerMat.dispose();
    this.bridgeSteelMat.dispose();
    this.bridgeDeckMat.dispose();
    this.bridgeCableMat.dispose();
    this.bridgeBeaconMat.dispose();
    this.tunnelWallTex.dispose();
    this.tunnelArrowTex.dispose();
    this.postGeo.dispose();
    this.studGeo.dispose();
    this.chevronPostGeo.dispose();
    this.chevronBoardGeo.dispose();
    this.lampPoleGeo.dispose();
    this.lampArmGeo.dispose();
    this.lampHeadGeo.dispose();
    this.gantryPillarGeo.dispose();
    this.gantryBeamGeo.dispose();
    this.gantrySignGeo.dispose();
    this.trunkGeo.dispose();
    this.foliageGeo.dispose();
    this.rockGeo.dispose();
    this.cactusGeo.dispose();
    this.iceSpireGeo.dispose();
    this.basaltGeo.dispose();
    this.tunnelLightGeo.dispose();
    this.tunnelPortalLintelGeo.dispose();
    this.tunnelPortalPierGeo.dispose();
    this.tunnelPortalSignGeo.dispose();
    this.bridgeTowerLegGeo.dispose();
    this.bridgeTowerCrossGeo.dispose();
    this.bridgePierGeo.dispose();
    this.bridgeSuspenderGeo.dispose();
    this.bridgeBeaconGeo.dispose();
    this.roadsideProps.dispose();
  }
}
