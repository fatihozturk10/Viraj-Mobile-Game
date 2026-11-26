import * as THREE from 'three';
import {
  BodyKitId,
  CarCustomConfig,
  CarModelId,
  CarWheelConfig,
  getDefaultCustomForCar,
  getDefaultWheelForCar,
  HEADLIGHTS,
  LIVERIES,
  MirrorCharmId,
  NITRO_FLAMES,
  PaintFinishId,
  PlateStyleId,
  RoofHatId,
  SpoilerId,
  SteeringWheelId,
  UNDERGLOWS,
  WHEEL_COLORS,
  WheelColorId,
  WheelStyleId,
} from '../types/game';
import {
  buildModelBodyFeatures,
  buildModelFrontFascia,
  buildModelRearFascia,
  buildModelStockAero,
  CarMaterialsBundle,
  getCarBlueprint,
} from './carBlueprints';
import {
  addOrientedStrut,
  buildArchLipGeometry,
  buildCabinGlassGeometry,
  buildRoofPanelGeometry,
  buildSculptedBodyGeometry,
  CabinStation,
  createBrakeRotorTexture,
  createCarbonTexture,
  createExtrudedShapeGeo,
  createGrilleMeshTexture,
  createLiveryTextures,
  createPanelLineBumpTexture,
  createTireTreadTexture,
  sampleBodyStationAtZ,
} from './carGeometry';

export interface PlayerCarRig {
  root: THREE.Group;
  chassisGroup: THREE.Group;
  paintMaterial: THREE.MeshPhysicalMaterial;
  tailLightMaterial: THREE.MeshStandardMaterial;
  headLightMaterial: THREE.MeshStandardMaterial;
  frontLeftPivot: THREE.Group;
  frontRightPivot: THREE.Group;
  wheelSpinGroups: THREE.Group[];
  headLightSpots: [THREE.SpotLight, THREE.SpotLight];
  headLightTargets: [THREE.Object3D, THREE.Object3D];
  flameMeshes: THREE.Mesh[];
  setLicensePlate: (text: string) => void;
  setWheelConfig: (style: WheelStyleId, colorId: WheelColorId) => void;
  setPaintColor: (hex: number) => void;
  setCustomConfig: (config: CarCustomConfig) => void;
  setHeadlightGlowScale: (scale: number) => void;
  updateEffects: (timeSec: number, speedMs?: number, steerNorm?: number) => void;
  dispose: () => void;
}

export interface CockpitRig {
  root: THREE.Group;
  cabinOffset: THREE.Group;
  wheelGroup: THREE.Group;
  paintMaterial: THREE.MeshPhysicalMaterial;
  rpmBar: THREE.Mesh;
  nitroBar: THREE.Mesh;
  nitroBarMat: THREE.MeshBasicMaterial;
  setSteeringWheel: (style: SteeringWheelId) => void;
  setMirrorCharm: (charm: MirrorCharmId) => void;
  updateInterior: (
    dt: number,
    timeSec: number,
    lateralAccel: number,
    longitudinalAccel: number,
    rpmRatio: number,
    speedKmh: number,
  ) => void;
  dispose: () => void;
}

export type TrafficKind = 'sedan' | 'suv' | 'truck';

export interface TrafficRig {
  root: THREE.Group;
  kind: TrafficKind;
  width: number;
  length: number;
  bodyMesh: THREE.Mesh;
  wheelMeshes: THREE.Mesh[];
}

export interface TrafficAssetPool {
  createVehicle: (kind: TrafficKind, colorHex: number) => TrafficRig;
  setVehicleColor: (rig: TrafficRig, colorHex: number) => void;
  dispose: () => void;
}

interface SharedCarStaticTextures {
  carbonTex: THREE.CanvasTexture;
  grilleTex: THREE.CanvasTexture;
  rotorTex: THREE.CanvasTexture;
  treadTex: THREE.CanvasTexture;
  panelBumpTex: THREE.CanvasTexture;
  underglowOuterTex: THREE.CanvasTexture;
  underglowInnerTex: THREE.CanvasTexture;
  headFlareTex: THREE.CanvasTexture;
  headBeamGroundTex: THREE.CanvasTexture;
}

let sharedCarStaticTextures: SharedCarStaticTextures | null = null;

function buildUnderglowOuterTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 512);
    ctx.save();
    ctx.translate(128, 256);
    ctx.scale(1, 2.0);
    const grad = ctx.createRadialGradient(0, 0, 12, 0, 0, 114);
    grad.addColorStop(0.0, 'rgba(255,255,255,0.45)');
    grad.addColorStop(0.38, 'rgba(255,255,255,0.42)');
    grad.addColorStop(0.68, 'rgba(255,255,255,0.14)');
    grad.addColorStop(0.88, 'rgba(255,255,255,0.03)');
    grad.addColorStop(1.0, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 114, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildUnderglowInnerTexture(): THREE.CanvasTexture {
  const w = 160;
  const h = 320;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) {
    const img = ctx.createImageData(w, h);
    const data = img.data;
    const halfW = 36;
    const halfH = 98;
    const cornerR = 18;
    for (let py = 0; py < h; py++) {
      const y = py - h * 0.5;
      for (let px = 0; px < w; px++) {
        const x = px - w * 0.5;
        const qx = Math.max(Math.abs(x) - (halfW - cornerR), 0);
        const qy = Math.max(Math.abs(y) - (halfH - cornerR), 0);
        const sd =
          Math.hypot(qx, qy) +
          Math.min(
            Math.max(
              Math.abs(x) - (halfW - cornerR),
              Math.abs(y) - (halfH - cornerR),
            ),
            0,
          ) -
          cornerR;

        let alpha = 0;
        if (sd >= 0) {
          const normOut = sd / 38;
          alpha = Math.exp(-normOut * normOut * 3.1);
        } else {
          const normIn = Math.min(1, Math.abs(sd) / 34);
          alpha = 0.94 - normIn * 0.56;
        }
        const edgeX = Math.min(px, w - 1 - px) / 14;
        const edgeY = Math.min(py, h - 1 - py) / 14;
        const edgeFade = Math.min(1, edgeX, edgeY);
        const finalA = Math.max(0, Math.min(1, alpha * edgeFade));

        const idx = (py * w + px) * 4;
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = Math.round(finalA * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildHeadlightFlareTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);
    const outer = ctx.createRadialGradient(128, 128, 2, 128, 128, 118);
    outer.addColorStop(0.0, 'rgba(255,255,255,0.95)');
    outer.addColorStop(0.14, 'rgba(255,255,255,0.62)');
    outer.addColorStop(0.36, 'rgba(255,255,255,0.18)');
    outer.addColorStop(0.68, 'rgba(255,255,255,0.03)');
    outer.addColorStop(1.0, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = outer;
    ctx.fillRect(0, 0, 256, 256);

    ctx.save();
    ctx.translate(128, 128);
    ctx.scale(1.0, 0.085);
    const streak = ctx.createRadialGradient(0, 0, 2, 0, 0, 122);
    streak.addColorStop(0.0, 'rgba(255,255,255,0.85)');
    streak.addColorStop(0.35, 'rgba(255,255,255,0.32)');
    streak.addColorStop(0.75, 'rgba(255,255,255,0.05)');
    streak.addColorStop(1.0, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = streak;
    ctx.beginPath();
    ctx.arc(0, 0, 122, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildGroundBeamTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) {
    const img = ctx.createImageData(w, h);
    const data = img.data;
    for (let py = 0; py < h; py++) {
      const v = 1 - py / (h - 1);
      const longFade =
        Math.min(1, v / 0.12) * Math.pow(Math.max(0, 1 - v), 1.65);
      for (let px = 0; px < w; px++) {
        const u = (px / (w - 1)) * 2 - 1;
        const halfSpread = 0.16 + v * 0.68;
        const cL = -0.24 - v * 0.18;
        const cR = 0.24 + v * 0.18;
        const dL = (u - cL) / halfSpread;
        const dR = (u - cR) / halfSpread;
        const bL = Math.exp(-dL * dL * 2.4);
        const bR = Math.exp(-dR * dR * 2.4);
        const combined = Math.min(1, (bL + bR) * 0.78);

        const edgeX = Math.min(px, w - 1 - px) / 18;
        const edgeY = Math.min(py, h - 1 - py) / 18;
        const edgeFade = Math.min(1, edgeX, edgeY);
        const alpha = Math.max(0, Math.min(1, combined * longFade * edgeFade));

        const idx = (py * w + px) * 4;
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = Math.round(alpha * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function getSharedCarStaticTextures(): SharedCarStaticTextures {
  if (!sharedCarStaticTextures) {
    sharedCarStaticTextures = {
      carbonTex: createCarbonTexture(),
      grilleTex: createGrilleMeshTexture(),
      rotorTex: createBrakeRotorTexture(),
      treadTex: createTireTreadTexture(),
      panelBumpTex: createPanelLineBumpTexture(),
      underglowOuterTex: buildUnderglowOuterTexture(),
      underglowInnerTex: buildUnderglowInnerTexture(),
      headFlareTex: buildHeadlightFlareTexture(),
      headBeamGroundTex: buildGroundBeamTexture(),
    };
  }
  return sharedCarStaticTextures;
}

export function createPlayerCar(
  modelId: CarModelId,
  initialHex: number,
  contactShadowMap: THREE.Texture,
  isSoftwareGl: boolean,
  initialPlate = 'VİRAJ 34',
  initialWheel: CarWheelConfig = getDefaultWheelForCar(modelId),
  initialCustom: CarCustomConfig = getDefaultCustomForCar(),
): PlayerCarRig {
  const root = new THREE.Group();
  const chassisGroup = new THREE.Group();
  root.add(chassisGroup);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const bp = getCarBlueprint(modelId);
  const {
    bodyWidth,
    cabinWidth,
    wheelBaseHalf,
    wheelRadius,
    tireWidth,
    trackHalf,
    beltlineY,
    mirrorY,
    mirrorZ,
  } = bp;
  const rearWheelRadius = bp.rearWheelRadius ?? wheelRadius;
  const rearTireWidth = bp.rearTireWidth ?? tireWidth;

  // Shared Static Procedural Automotive PBR & Light Textures (built once, reused across all car switches)
  const {
    carbonTex,
    grilleTex,
    rotorTex,
    treadTex,
    panelBumpTex,
    underglowOuterTex,
    underglowInnerTex,
    headFlareTex,
    headBeamGroundTex,
  } = getSharedCarStaticTextures();

  // Studio Clearcoat Metallic Paint with Stamped Sheet-Metal Panel Seams
  const paintMaterial = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: initialHex,
      metalness: 0.78,
      roughness: 0.17,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      specularIntensity: 1.0,
      envMapIntensity: 1.78,
      bumpMap: modelId === 'f1' ? null : panelBumpTex,
      bumpScale: 0.0055,
    }),
  );

  const carbonMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: carbonTex,
      color: 0xffffff,
      roughness: 0.34,
      metalness: 0.4,
      envMapIntensity: 1.3,
    }),
  );

  const matteTrimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0f1014,
      roughness: 0.8,
      metalness: 0.08,
    }),
  );

  const grilleMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: grilleTex,
      color: 0xffffff,
      roughness: 0.54,
      metalness: 0.5,
    }),
  );

  const interiorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x16161c,
      roughness: 0.86,
      metalness: 0.06,
    }),
  );

  const seatBolsterMat = trackMat(
    new THREE.MeshStandardMaterial({
      color:
        modelId === 'laferrari' || modelId === 'porsche' || modelId === 'm3gtr'
          ? 0x991b1b
          : 0x27272f,
      roughness: 0.75,
      metalness: 0.1,
    }),
  );

  const rollCageMat = trackMat(
    new THREE.MeshStandardMaterial({
      color:
        modelId === 'porsche' || modelId === 'm3gtr' || modelId === 'laferrari'
          ? 0xdc2626
          : 0xf59e0b,
      roughness: 0.32,
      metalness: 0.72,
    }),
  );

  const glossBlackMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x090a0e,
      metalness: 0.28,
      roughness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.55,
    }),
  );

  const engineAccentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color:
        modelId === 'laferrari'
          ? 0xdc2626
          : modelId === 'jesko' || modelId === 'pagani'
            ? 0xd4af37
            : modelId === 'bolide'
              ? 0x2563eb
              : modelId === 'solaris'
                ? 0x06b6d4
                : 0xe11d48,
      metalness: 0.76,
      roughness: 0.2,
      emissive:
        modelId === 'laferrari'
          ? 0x450a0a
          : modelId === 'bolide'
            ? 0x1d4ed8
            : modelId === 'solaris'
              ? 0x0891b2
              : 0x2a1a05,
      emissiveIntensity: modelId === 'solaris' ? 0.95 : 0.42,
    }),
  );

  const glassMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x08111e,
      metalness: 0.16,
      roughness: 0.025,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      transparent: true,
      opacity: isSoftwareGl ? 0.78 : 0.72,
      envMapIntensity: 2.05,
    }),
  );

  const chromeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe8e9ee,
      metalness: 0.96,
      roughness: 0.1,
      envMapIntensity: 1.65,
    }),
  );

  const titaniumMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      metalness: 0.94,
      roughness: 0.18,
      envMapIntensity: 1.55,
    }),
  );

  const initialWheelColorOpt =
    WHEEL_COLORS.find((c) => c.id === initialWheel.color) || WHEEL_COLORS[0];

  const alloyMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: initialWheelColorOpt.hex,
      metalness: initialWheelColorOpt.metalness,
      roughness: initialWheelColorOpt.roughness,
      envMapIntensity: 1.6,
    }),
  );

  const wheelBarrelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x12141a,
      metalness: 0.45,
      roughness: 0.62,
      side: THREE.DoubleSide,
    }),
  );

  const chromeDishMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.98,
      roughness: 0.08,
      envMapIntensity: 1.85,
      side: THREE.DoubleSide,
    }),
  );

  const centerLockRedMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      metalness: 0.55,
      roughness: 0.22,
      envMapIntensity: 1.35,
    }),
  );

  const wheelGoldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf5c542,
      metalness: 0.96,
      roughness: 0.14,
      envMapIntensity: 1.85,
    }),
  );

  const brakeRedMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      metalness: 0.58,
      roughness: 0.22,
      envMapIntensity: 1.4,
    }),
  );

  const emeraldCoreMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.95,
      metalness: 0.35,
      roughness: 0.12,
      envMapIntensity: 1.7,
    }),
  );

  const wheelWhitewallMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf4f4f5,
      metalness: 0.04,
      roughness: 0.52,
    }),
  );

  const wheelObsidianMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x101116,
      metalness: 0.65,
      roughness: 0.28,
      envMapIntensity: 1.35,
    }),
  );

  const wheelGlowPrimaryMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.6,
      metalness: 0.25,
      roughness: 0.18,
    }),
  );

  const wheelGlowSecondaryMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.3,
      metalness: 0.25,
      roughness: 0.2,
    }),
  );

  const rotorMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: rotorTex,
      color: 0xffffff,
      metalness: 0.88,
      roughness: 0.24,
    }),
  );

  const tireTreadMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: treadTex,
      color: 0xffffff,
      roughness: 0.86,
      metalness: 0.04,
    }),
  );

  const tireSidewallMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x17181d,
      roughness: 0.74,
      metalness: 0.08,
    }),
  );

  const caliperMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: bp.caliperColor,
      roughness: 0.22,
      metalness: 0.68,
    }),
  );

  const headLightMaterial = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xe0f2fe,
      emissiveIntensity: 3.1,
      roughness: 0.06,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );

  const drlMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0xbae6fd,
      emissiveIntensity: 2.5,
      roughness: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );

  const tailLightMaterial = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 2.6,
      roughness: 0.14,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );

  const reverseLightMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0xe2e8f0,
      emissiveIntensity: 0.9,
      roughness: 0.18,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );

  const amberMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 1.85,
      roughness: 0.2,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );

  const flameMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );

  const mats: CarMaterialsBundle = {
    paint: paintMaterial,
    carbon: carbonMat,
    matteTrim: matteTrimMat,
    glossBlack: glossBlackMat,
    grille: grilleMat,
    chrome: chromeMat,
    titanium: titaniumMat,
    glass: glassMat,
    headLight: headLightMaterial,
    drl: drlMat,
    tailLight: tailLightMaterial,
    reverseLight: reverseLightMat,
    amber: amberMat,
    engineAccent: engineAccentMat,
    flameMat,
  };

  // 1. Auto-Smooth Hard-Creased Sculpted Sheet-Metal Body (True Adaptive Wheel Arches)
  const lowerBodyGeo = trackGeo(
    buildSculptedBodyGeometry(bp.stations, bp.sculpt),
  );
  lowerBodyGeo.computeBoundingBox();
  const lowerBody = new THREE.Mesh(lowerBodyGeo, paintMaterial);
  lowerBody.castShadow = true;
  lowerBody.receiveShadow = true;
  chassisGroup.add(lowerBody);

  // 1b. Special 3D Liquid Aquarium Tank Interior (Visible only when livery === 'animLiquidAquarium')
  // Sloshing blue water physics + low-poly swimming orange goldfish + rising air bubbles inside translucent glass chassis!
  // Lazily populated only if `animLiquidAquarium` livery is equipped (avoids ~45 meshes + 7 materials on every car switch).
  const aquariumGroup = new THREE.Group();
  aquariumGroup.visible = false;
  chassisGroup.add(aquariumGroup);

  const lbBox = lowerBodyGeo.boundingBox!;
  const aqW = Math.max(0.6, (lbBox.max.x - lbBox.min.x) * 0.78);
  const aqH = Math.max(0.28, (lbBox.max.y - lbBox.min.y) * 0.64);
  const aqL = Math.max(1.2, (lbBox.max.z - lbBox.min.z) * 0.72);
  const aqCenterY = lbBox.min.y + (lbBox.max.y - lbBox.min.y) * 0.44;
  const aqCenterZ = (lbBox.min.z + lbBox.max.z) * 0.5;

  const aquariumWaterPivot = new THREE.Group();
  aquariumWaterPivot.position.set(0, aqCenterY, aqCenterZ);
  aquariumGroup.add(aquariumWaterPivot);

  interface AquariumFishEntry {
    root: THREE.Group;
    tail: THREE.Mesh;
    phase: number;
    speed: number;
    radiusX: number;
    radiusZ: number;
    baseY: number;
    dir: number;
  }
  const aquariumFishes: AquariumFishEntry[] = [];
  const aquariumBubbles: { mesh: THREE.Mesh; x: number; z: number; phase: number; speed: number }[] = [];
  let aquariumBuilt = false;

  const ensureAquariumBuilt = (): void => {
    if (aquariumBuilt) return;
    aquariumBuilt = true;

    const aqWaterMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x0ea5e9,
        emissive: 0x0284c7,
        emissiveIntensity: 0.48,
        roughness: 0.08,
        metalness: 0.05,
        transparent: true,
        opacity: 0.64,
        depthWrite: false,
      }),
    );
    const aqSurfaceMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x7dd3fc,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.85,
        roughness: 0.1,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
      }),
    );
    const aqWaterBox = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(aqW, aqH, aqL)),
      aqWaterMat,
    );
    aquariumWaterPivot.add(aqWaterBox);

    const aqWaterSurface = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(aqW * 0.99, aqL * 0.99, 6, 10)),
      aqSurfaceMat,
    );
    aqWaterSurface.rotation.x = -Math.PI * 0.5;
    aqWaterSurface.position.y = aqH * 0.5;
    aquariumWaterPivot.add(aqWaterSurface);

    const aqPlantMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.75 }),
    );
    const aqPlantGeo = trackGeo(new THREE.ConeGeometry(0.032, aqH * 0.52, 5));
    for (const [px, pz] of [
      [-aqW * 0.3, -aqL * 0.25],
      [aqW * 0.28, -aqL * 0.12],
      [-aqW * 0.24, aqL * 0.22],
      [aqW * 0.26, aqL * 0.28],
    ]) {
      const plant = new THREE.Mesh(aqPlantGeo, aqPlantMat);
      plant.position.set(px, -aqH * 0.24, pz);
      aquariumWaterPivot.add(plant);
    }

    const fishOrangeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xff7a18,
        emissive: 0xea580c,
        emissiveIntensity: 0.65,
        roughness: 0.26,
        metalness: 0.12,
      }),
    );
    const fishGoldFinMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfde047,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.5,
        roughness: 0.28,
      }),
    );
    const fishEyeMat = trackMat(
      new THREE.MeshBasicMaterial({ color: 0x09090b }),
    );
    const fishBodyGeo = trackGeo(new THREE.OctahedronGeometry(0.068, 0));
    const fishTailGeo = trackGeo(new THREE.ConeGeometry(0.052, 0.088, 3));
    const fishFinGeo = trackGeo(new THREE.ConeGeometry(0.028, 0.056, 3));
    const fishEyeGeo = trackGeo(new THREE.SphereGeometry(0.012, 6, 6));

    for (let i = 0; i < 5; i++) {
      const fg = new THREE.Group();
      const scale = 0.85 + (i % 3) * 0.18;
      fg.scale.setScalar(scale);

      const fBody = new THREE.Mesh(fishBodyGeo, fishOrangeMat);
      fBody.scale.set(0.62, 0.92, 1.48);
      fg.add(fBody);

      const dorsal = new THREE.Mesh(fishFinGeo, fishGoldFinMat);
      dorsal.position.set(0, 0.062, -0.01);
      dorsal.rotation.x = -0.5;
      fg.add(dorsal);

      const fTail = new THREE.Mesh(fishTailGeo, fishGoldFinMat);
      fTail.rotation.x = Math.PI * 0.5;
      fTail.scale.set(0.32, 1.0, 1.15);
      fTail.position.set(0, 0, -0.115);
      fg.add(fTail);

      for (const sx of [-1, 1]) {
        const eye = new THREE.Mesh(fishEyeGeo, fishEyeMat);
        eye.position.set(sx * 0.032, 0.016, 0.055);
        fg.add(eye);
      }

      aquariumWaterPivot.add(fg);
      aquariumFishes.push({
        root: fg,
        tail: fTail,
        phase: i * 1.28,
        speed: 0.72 + (i % 3) * 0.24,
        radiusX: aqW * (0.22 + (i % 2) * 0.12),
        radiusZ: aqL * (0.24 + ((i + 1) % 3) * 0.08),
        baseY: (i - 2) * (aqH * 0.13),
        dir: i % 2 === 0 ? 1 : -1,
      });
    }

    const aqBubbleMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.72,
      }),
    );
    const aqBubbleGeo = trackGeo(new THREE.SphereGeometry(0.018, 6, 6));
    for (let i = 0; i < 14; i++) {
      const bm = new THREE.Mesh(aqBubbleGeo, aqBubbleMat);
      const s = 0.65 + (i % 4) * 0.28;
      bm.scale.setScalar(s);
      const bx = (((i * 73) % 100) / 100 - 0.5) * aqW * 0.78;
      const bz = (((i * 41) % 100) / 100 - 0.5) * aqL * 0.78;
      aquariumWaterPivot.add(bm);
      aquariumBubbles.push({
        mesh: bm,
        x: bx,
        z: bz,
        phase: i * 0.47,
        speed: 0.35 + (i % 4) * 0.12,
      });
    }
  };

  let aquariumSloshAngle = 0;
  let aquariumSloshVel = 0;
  let lastAqTimeSec = -1;

  const unitBoxGeo = trackGeo(new THREE.BoxGeometry(1, 1, 1));
  const stockArchFlareGroup = new THREE.Group();
  const stockLowerAeroGroup = new THREE.Group();
  const stockWingGroup = new THREE.Group();
  chassisGroup.add(stockArchFlareGroup);
  chassisGroup.add(stockLowerAeroGroup);
  chassisGroup.add(stockWingGroup);

  // 2. Recessed Wheel-Well Liners + Flush Sculpted Beveled Arch Lips + Rocker Skirts + Handles
  if (modelId !== 'f1') {
    const wheelWellLinerMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x111318,
        roughness: 0.92,
        metalness: 0.05,
        side: THREE.BackSide,
      }),
    );

    const frontLinerGeo = trackGeo(
      new THREE.CylinderGeometry(
        wheelRadius + 0.062,
        wheelRadius + 0.062,
        tireWidth * 0.92,
        24,
        1,
        true,
        0,
        Math.PI,
      ),
    );
    frontLinerGeo.rotateZ(Math.PI / 2);

    const rearLinerGeo = trackGeo(
      new THREE.CylinderGeometry(
        rearWheelRadius + 0.062,
        rearWheelRadius + 0.062,
        rearTireWidth * 0.92,
        24,
        1,
        true,
        0,
        Math.PI,
      ),
    );
    rearLinerGeo.rotateZ(Math.PI / 2);

    const frontArchLipGeo = trackGeo(
      buildArchLipGeometry(wheelRadius + 0.045, 0.055, 0.055, 22),
    );
    const rearArchLipGeo = trackGeo(
      buildArchLipGeometry(rearWheelRadius + 0.045, 0.058, 0.06, 22),
    );
    const flareMat = bp.matteArchFlares ? matteTrimMat : paintMaterial;

    for (const [side, fz, isRear] of [
      [-1, -wheelBaseHalf, false],
      [1, -wheelBaseHalf, false],
      [-1, wheelBaseHalf, true],
      [1, wheelBaseHalf, true],
    ] as [number, number, boolean][]) {
      const archSt = sampleBodyStationAtZ(bp.stations, fz);
      const r = isRear ? rearWheelRadius : wheelRadius;
      const liner = new THREE.Mesh(
        isRear ? rearLinerGeo : frontLinerGeo,
        wheelWellLinerMat,
      );
      liner.position.set(side * (trackHalf - 0.075), r + 0.016, fz);
      chassisGroup.add(liner);

      const archLip = new THREE.Mesh(
        isRear ? rearArchLipGeo : frontArchLipGeo,
        flareMat,
      );
      const archX = Math.max(bodyWidth * 0.5, archSt.beltHalfW) + 0.022;
      archLip.position.set(side * archX, r + 0.01, fz);
      stockArchFlareGroup.add(archLip);
    }

    // Side Rocker Skirts, Flush Door Handles & Fuel Filler Cap
    const skirtLen = wheelBaseHalf * 1.44;
    const skirtGeo = trackGeo(new THREE.BoxGeometry(0.072, 0.062, skirtLen));
    const handleGeo = trackGeo(new THREE.BoxGeometry(0.032, 0.028, 0.16));
    const handleSt = sampleBodyStationAtZ(bp.stations, 0.22);
    const skirtSt = sampleBodyStationAtZ(bp.stations, 0.02);

    for (const side of [-1, 1]) {
      const skirt = new THREE.Mesh(
        skirtGeo,
        modelId === 'dogan' ? matteTrimMat : carbonMat,
      );
      skirt.position.set(
        side * (skirtSt.rockerHalfW + 0.015),
        modelId === 'pickup' ? 0.43 : Math.max(0.16, skirtSt.bottomY - 0.016),
        0.02,
      );
      stockLowerAeroGroup.add(skirt);

      const handle = new THREE.Mesh(
        handleGeo,
        modelId === 'dogan' ? chromeMat : paintMaterial,
      );
      handle.position.set(
        side * (handleSt.beltHalfW + 0.014),
        handleSt.beltY - 0.068,
        0.22,
      );
      chassisGroup.add(handle);
    }

    const fuelSt = sampleBodyStationAtZ(bp.stations, 1.3);
    const fuelCapGeo = trackGeo(new THREE.CylinderGeometry(0.054, 0.054, 0.016, 16));
    fuelCapGeo.rotateZ(Math.PI / 2);
    const fuelCap = new THREE.Mesh(
      fuelCapGeo,
      modelId === 'jdm' || modelId === 'porsche' || modelId === 'gt'
        ? chromeMat
        : matteTrimMat,
    );
    fuelCap.position.set(fuelSt.beltHalfW + 0.014, fuelSt.beltY - 0.065, 1.3);
    chassisGroup.add(fuelCap);
  }

  // 3. Recessed Curved Greenhouse Glass + Sculpted Interior + Mathematically Anchored Pillars & Roof
  const cabinGeo = trackGeo(
    buildCabinGlassGeometry(
      bp.cabin,
      modelId !== 'f1',
      bp.greenhouse === 'wedge' ? 24 : 38,
    ),
  );
  const cabinMesh = new THREE.Mesh(
    cabinGeo,
    modelId === 'f1' ? paintMaterial : glassMat,
  );
  cabinMesh.castShadow = true;
  chassisGroup.add(cabinMesh);

  if (modelId !== 'f1') {
    // Detailed Interior: Dashboard, Steering Wheel, Twin Racing Bucket Seats + Bolsters + Roll Cage
    const interiorBlock = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(cabinWidth - 0.22, 0.22, 1.18)),
      interiorMat,
    );
    interiorBlock.position.set(0, beltlineY + 0.04, 0.04);
    chassisGroup.add(interiorBlock);

    const cabinWheel = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.14, 0.02, 8, 18)),
      interiorMat,
    );
    cabinWheel.position.set(-0.32, beltlineY + 0.22, -0.34);
    cabinWheel.rotation.x = -0.3;
    chassisGroup.add(cabinWheel);

    const seatBackGeo = trackGeo(new THREE.BoxGeometry(0.36, 0.38, 0.12));
    const bolsterGeo = trackGeo(new THREE.BoxGeometry(0.08, 0.34, 0.16));
    const headrestGeo = trackGeo(new THREE.BoxGeometry(0.22, 0.14, 0.095));
    for (const sx of [-0.33, 0.33]) {
      const seat = new THREE.Mesh(seatBackGeo, interiorMat);
      seat.position.set(sx, beltlineY + 0.2, 0.22);
      seat.rotation.x = 0.2;
      chassisGroup.add(seat);

      for (const bSide of [-0.17, 0.17]) {
        const bolster = new THREE.Mesh(bolsterGeo, seatBolsterMat);
        bolster.position.set(sx + bSide, beltlineY + 0.19, 0.2);
        bolster.rotation.x = 0.2;
        chassisGroup.add(bolster);
      }

      const hr = new THREE.Mesh(headrestGeo, seatBolsterMat);
      hr.position.set(sx, beltlineY + 0.41, 0.28);
      chassisGroup.add(hr);
    }

    const [c0, c1, c2, c3] = bp.cabin;

    // Track / Rally / GT3 Internal Roll Cage
    if (bp.hasRollCage) {
      for (const side of [-1, 1]) {
        addOrientedStrut(
          chassisGroup,
          unitBoxGeo,
          [side * (c2.baseHalfW - 0.16), beltlineY + 0.02, c2.z - 0.1],
          [side * (c2.roofHalfW - 0.1), c2.roofY - 0.08, c2.z - 0.12],
          0.036,
          0.036,
          rollCageMat,
          [side, 0, 0],
          0.01,
        );
        addOrientedStrut(
          chassisGroup,
          unitBoxGeo,
          [side * (c2.roofHalfW - 0.1), c2.roofY - 0.1, c2.z - 0.12],
          [side * (c3.baseHalfW - 0.18), beltlineY + 0.02, c3.z - 0.24],
          0.032,
          0.032,
          rollCageMat,
          [side, 0, 0],
          0.01,
        );
      }
      addOrientedStrut(
        chassisGroup,
        unitBoxGeo,
        [-(c2.roofHalfW - 0.1), c2.roofY - 0.1, c2.z - 0.12],
        [c2.roofHalfW - 0.1, c2.roofY - 0.1, c2.z - 0.12],
        0.034,
        0.034,
        rollCageMat,
        [0, 1, 0],
        0.01,
      );
      addOrientedStrut(
        chassisGroup,
        unitBoxGeo,
        [-(c2.baseHalfW - 0.16), beltlineY + 0.06, c2.z - 0.1],
        [c2.roofHalfW - 0.1, c2.roofY - 0.1, c2.z - 0.12],
        0.028,
        0.028,
        rollCageMat,
        [0, 0, 1],
        0.01,
      );
    }

    // Mathematically Anchored A/B/C Pillars, Roof Cantrails, Weatherstrip & Curved Roof Panel
    const aPillarMat = bp.visorCanopy ? glossBlackMat : paintMaterial;
    const cPillarMat =
      modelId === 'laferrari' || modelId === 'mclarenp1'
        ? carbonMat
        : paintMaterial;
    const roofPanelMat = bp.carbonRoof ? carbonMat : paintMaterial;

    for (const side of [-1, 1]) {
      const pA0: [number, number, number] = [
        side * ((c0.baseHalfW + c0.roofHalfW) * 0.5 + 0.018),
        c0.baseY + 0.014,
        c0.z + 0.01,
      ];
      const pA1: [number, number, number] = [
        side * (c1.roofHalfW + 0.018),
        c1.roofY + 0.006,
        c1.z + 0.006,
      ];
      const pC1: [number, number, number] = [
        side * (c2.roofHalfW + 0.018),
        c2.roofY + 0.006,
        c2.z - 0.006,
      ];
      const pC0: [number, number, number] =
        modelId === 'pickup'
          ? [side * (c3.baseHalfW + 0.018), c3.baseY + 0.014, c3.z]
          : [
              side * ((c3.baseHalfW + c3.roofHalfW) * 0.5 + 0.018),
              c3.baseY + 0.014,
              c3.z - 0.01,
            ];

      // A-Pillar
      addOrientedStrut(
        chassisGroup,
        unitBoxGeo,
        pA0,
        pA1,
        0.04,
        bp.visorCanopy ? 0.046 : 0.064,
        aPillarMat,
        [side, 0.2, 0],
        0.008,
      );

      // Gloss-black B-Pillar
      const bT = modelId === 'pickup' ? 0.54 : 0.48;
      const bZ = c1.z + (c2.z - c1.z) * bT;
      const bBaseW = c1.baseHalfW + (c2.baseHalfW - c1.baseHalfW) * bT + 0.025;
      const bBaseY = c1.baseY + (c2.baseY - c1.baseY) * bT + 0.018;
      const bRoofW = c1.roofHalfW + (c2.roofHalfW - c1.roofHalfW) * bT + 0.025;
      const bRoofY = c1.roofY + (c2.roofY - c1.roofY) * bT - 0.014;
      addOrientedStrut(
        chassisGroup,
        unitBoxGeo,
        [side * bBaseW, bBaseY, bZ],
        [side * bRoofW, bRoofY, bZ],
        0.022,
        0.062,
        glossBlackMat,
        [side, 0, 0],
        0.004,
      );

      // C-Pillar / Sculpted Flying Buttress
      addOrientedStrut(
        chassisGroup,
        unitBoxGeo,
        pC0,
        pC1,
        bp.greenhouse === 'teardrop' ? 0.052 : 0.044,
        modelId === 'pickup' ? 0.082 : bp.greenhouse === 'fastback' ? 0.125 : 0.105,
        cPillarMat,
        [side, 0.2, 0],
        0.01,
      );

      // Upper Roof Cantrail
      addOrientedStrut(
        chassisGroup,
        unitBoxGeo,
        [side * (c1.roofHalfW + 0.014), c1.roofY + 0.002, c1.z + 0.016],
        [side * (c2.roofHalfW + 0.014), c2.roofY + 0.002, c2.z - 0.016],
        0.032,
        0.038,
        paintMaterial,
        [side, 0.4, 0],
        0.008,
      );

      // Gloss-black Beltline Window Gasket
      addOrientedStrut(
        chassisGroup,
        unitBoxGeo,
        [side * (c0.baseHalfW + 0.022), c0.baseY + 0.02, c0.z + 0.03],
        [side * (c3.baseHalfW + 0.022), c3.baseY + 0.02, c3.z - 0.03],
        0.02,
        0.024,
        glossBlackMat,
        [side, 0, 0],
        0.0,
      );
    }

    // Front & Rear Windshield Rubber Header Seals
    addOrientedStrut(
      chassisGroup,
      unitBoxGeo,
      [-(c1.roofHalfW - 0.015), c1.roofY - 0.004, c1.z - 0.006],
      [c1.roofHalfW - 0.015, c1.roofY - 0.004, c1.z - 0.006],
      0.022,
      0.028,
      glossBlackMat,
      [0, 1, 0],
      0.0,
    );
    addOrientedStrut(
      chassisGroup,
      unitBoxGeo,
      [-(c2.roofHalfW - 0.015), c2.roofY - 0.004, c2.z + 0.006],
      [c2.roofHalfW - 0.015, c2.roofY - 0.004, c2.z + 0.006],
      0.022,
      0.028,
      glossBlackMat,
      [0, 1, 0],
      0.0,
    );

    // Windshield Wipers (Center motorsport single wiper on Jesko/P1, dual wipers on street cars)
    if (modelId === 'jesko' || modelId === 'mclarenp1') {
      addOrientedStrut(
        chassisGroup,
        unitBoxGeo,
        [0, c0.roofY + 0.02, c0.z + 0.04],
        [0, (c0.roofY + c1.roofY) * 0.56, (c0.z + c1.z) * 0.56],
        0.016,
        0.022,
        matteTrimMat,
        [0, 1, -1],
        0.0,
      );
    } else {
      const wiperGeo = trackGeo(new THREE.BoxGeometry(0.42, 0.015, 0.02));
      for (const sx of [-0.26, 0.22]) {
        const wiper = new THREE.Mesh(wiperGeo, matteTrimMat);
        wiper.position.set(sx, c0.roofY + 0.015, c0.z + 0.03);
        wiper.rotation.y = 0.14;
        chassisGroup.add(wiper);
      }
    }

    // Flush Curved Roof Panel
    const roofGeo = trackGeo(buildRoofPanelGeometry(c1, c2));
    const roofMesh = new THREE.Mesh(roofGeo, roofPanelMat);
    roofMesh.castShadow = true;
    chassisGroup.add(roofMesh);

    if (bp.hasRoofFin) {
      const finGeo = trackGeo(new THREE.ConeGeometry(0.03, 0.11, 4));
      finGeo.rotateX(0.38);
      const fin = new THREE.Mesh(finGeo, carbonMat);
      fin.position.set(0, c2.crownY + 0.055, c2.z - 0.12);
      chassisGroup.add(fin);
    }

    // Sculpted Aero Side Mirrors (Arm + Painted Shell + Reflective Glass + LED Repeater)
    const stemGeo = trackGeo(new THREE.BoxGeometry(0.11, 0.038, 0.062));
    const shellGeo = trackGeo(new THREE.BoxGeometry(0.19, 0.088, 0.125));
    const mirrorFaceGeo = trackGeo(new THREE.PlaneGeometry(0.15, 0.064));
    const mirrorLedGeo = trackGeo(new THREE.BoxGeometry(0.11, 0.015, 0.018));
    for (const side of [-1, 1]) {
      const sx = side * (bodyWidth * 0.5);
      const stem = new THREE.Mesh(stemGeo, matteTrimMat);
      stem.position.set(sx - side * 0.02, mirrorY - 0.02, mirrorZ);
      chassisGroup.add(stem);

      const mirror = new THREE.Mesh(shellGeo, paintMaterial);
      mirror.position.set(sx + side * 0.06, mirrorY, mirrorZ);
      mirror.rotation.y = side * -0.16;
      mirror.castShadow = true;
      chassisGroup.add(mirror);

      const mFace = new THREE.Mesh(mirrorFaceGeo, chromeMat);
      mFace.position.set(sx + side * 0.06, mirrorY, mirrorZ + 0.066);
      mFace.rotation.y = side * -0.16;
      chassisGroup.add(mFace);

      const mLed = new THREE.Mesh(mirrorLedGeo, amberMat);
      mLed.position.set(sx + side * 0.06, mirrorY, mirrorZ - 0.066);
      chassisGroup.add(mLed);
    }
  }

  // 4. Bespoke Model Features, Front Grille & Headlights, Rear Taillights & Exhausts, Stock Aero
  const flameMeshes: THREE.Mesh[] = [];
  const featureCtx = {
    modelId,
    bp,
    chassisGroup,
    stockWingGroup,
    stockLowerAeroGroup,
    mats,
    unitBoxGeo,
    trackGeo,
    trackMat,
    flameMeshes,
  };
  buildModelBodyFeatures(featureCtx);
  buildModelFrontFascia(featureCtx);
  buildModelRearFascia(featureCtx);
  buildModelStockAero(featureCtx);

  // 5. Multi-Piece High-Detail Wheels (Staggered Front/Rear + Drilled Rotors + Calipers + Swappable Rims & Full Custom Wheels)
  const wheelSpinGroups: THREE.Group[] = [];
  const wheelRimMounts: {
    rimGroup: THREE.Group;
    stockTireGroup: THREE.Group;
    caliper: THREE.Mesh;
    side: number;
    tireRadius: number;
    rRadius: number;
    tWidth: number;
  }[] = [];

  const makeWheelAssembly = (
    side: number,
    isFront: boolean,
  ): { pivot: THREE.Group; spin: THREE.Group } => {
    const r = isFront ? wheelRadius : rearWheelRadius;
    const tw = isFront ? tireWidth : rearTireWidth;
    const rimRadius = r * 0.69;

    const pivot = new THREE.Group();
    const spin = new THREE.Group();
    pivot.add(spin);

    // Stock Rubber Tire + Barrel + Brake Rotor grouped so Full Custom Wheels can replace the entire wheel cleanly!
    const stockTireGroup = new THREE.Group();
    spin.add(stockTireGroup);

    // Open-ended Tire Tread (NO solid end-caps burying the wheel spokes!)
    const tireTreadGeo = trackGeo(
      new THREE.CylinderGeometry(r, r, tw * 0.88, 28, 1, true),
    );
    tireTreadGeo.rotateZ(Math.PI / 2);
    const tireMesh = new THREE.Mesh(tireTreadGeo, tireTreadMat);
    tireMesh.castShadow = true;
    stockTireGroup.add(tireMesh);

    // Sculpted Tire Shoulders + Open Hollow Sidewall Annulus Rings
    const shoulderGeo = trackGeo(
      new THREE.TorusGeometry(r * 0.895, r * 0.105, 10, 28),
    );
    shoulderGeo.rotateY(Math.PI / 2);
    for (const s of [-1, 1]) {
      const sh = new THREE.Mesh(shoulderGeo, tireSidewallMat);
      sh.position.x = s * (tw * 0.41);
      stockTireGroup.add(sh);

      const sidewallGeo = trackGeo(
        new THREE.RingGeometry(rimRadius * 0.96, r * 0.915, 28),
      );
      sidewallGeo.rotateY(s > 0 ? Math.PI / 2 : -Math.PI / 2);
      const sw = new THREE.Mesh(sidewallGeo, tireSidewallMat);
      sw.position.x = s * (tw * 0.475);
      stockTireGroup.add(sw);
    }

    // F1 Pirelli-style red racing sidewall stripe!
    if (modelId === 'f1') {
      const stripeGeo = trackGeo(new THREE.TorusGeometry(r * 0.8, 0.012, 8, 28));
      stripeGeo.rotateY(Math.PI / 2);
      const stripe = new THREE.Mesh(stripeGeo, tailLightMaterial);
      stripe.position.x = side * (tw * 0.495);
      stockTireGroup.add(stripe);
    }

    // Open-Ended Dark Recessed Wheel Barrel + Deep Backing Disc (creates crisp contrast behind spokes)
    const barrelGeo = trackGeo(
      new THREE.CylinderGeometry(
        rimRadius * 0.97,
        rimRadius * 0.97,
        tw * 0.88,
        24,
        1,
        true,
      ),
    );
    barrelGeo.rotateZ(Math.PI / 2);
    stockTireGroup.add(new THREE.Mesh(barrelGeo, wheelBarrelMat));

    const backDiscGeo = trackGeo(new THREE.CircleGeometry(rimRadius * 0.95, 22));
    backDiscGeo.rotateY(side > 0 ? Math.PI / 2 : -Math.PI / 2);
    const backDisc = new THREE.Mesh(backDiscGeo, matteTrimMat);
    backDisc.position.x = -side * (tw * 0.24);
    stockTireGroup.add(backDisc);

    // Drilled Carbon-Ceramic Brake Rotor (clearly visible through the rim spokes!)
    const rotorGeo = trackGeo(
      new THREE.CylinderGeometry(rimRadius * 0.78, rimRadius * 0.78, 0.028, 24),
    );
    rotorGeo.rotateZ(Math.PI / 2);
    const rotor = new THREE.Mesh(rotorGeo, rotorMat);
    rotor.position.x = side * (tw * 0.06);
    stockTireGroup.add(rotor);

    // Stationary Multi-Piston Brake Caliper (mounted on pivot so it stays fixed!)
    const caliper = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.056, rimRadius * 0.56, rimRadius * 0.3)),
      caliperMat,
    );
    caliper.position.set(
      side * (tw * 0.13),
      rimRadius * 0.18,
      isFront ? rimRadius * 0.46 : -rimRadius * 0.46,
    );
    pivot.add(caliper);

    const rimGroup = new THREE.Group();
    spin.add(rimGroup);
    wheelRimMounts.push({
      rimGroup,
      stockTireGroup,
      caliper,
      side,
      tireRadius: r,
      rRadius: rimRadius,
      tWidth: tw,
    });

    return { pivot, spin };
  };

  const fl = makeWheelAssembly(-1, true);
  fl.pivot.position.set(-trackHalf, wheelRadius, -wheelBaseHalf);
  root.add(fl.pivot);

  const fr = makeWheelAssembly(1, true);
  fr.pivot.position.set(trackHalf, wheelRadius, -wheelBaseHalf);
  root.add(fr.pivot);

  const rl = makeWheelAssembly(-1, false);
  rl.pivot.position.set(-trackHalf, rearWheelRadius, wheelBaseHalf);
  root.add(rl.pivot);

  const rr = makeWheelAssembly(1, false);
  rr.pivot.position.set(trackHalf, rearWheelRadius, wheelBaseHalf);
  root.add(rr.pivot);

  wheelSpinGroups.push(fl.spin, fr.spin, rl.spin, rr.spin);

  // Dynamic Swappable 3D Rim Spokes & Full Custom Wheels
  const rimGeos: THREE.BufferGeometry[] = [];
  const rimMats: THREE.Material[] = [];
  const trackRimGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    rimGeos.push(g);
    return g;
  };
  const trackRimMat = <T extends THREE.Material>(m: T): T => {
    rimMats.push(m);
    return m;
  };

  const _spokeAxle = new THREE.Vector3(1, 0, 0);
  const _spokeU = new THREE.Vector3();
  const _spokeV = new THREE.Vector3();
  const _spokeW = new THREE.Vector3();
  const _spokeMat = new THREE.Matrix4();
  const addSpokeSeg3D = (
    parent: THREE.Group,
    spokeBox: THREE.BufferGeometry,
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    thickX: number,
    widthW: number,
    mat: THREE.Material,
  ) => {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-4) return;
    _spokeV.set(dx / len, dy / len, dz / len); // Local Y along spoke
    _spokeW.crossVectors(_spokeAxle, _spokeV); // Local Z tangential width
    if (_spokeW.lengthSq() < 1e-6) {
      _spokeW.set(0, 0, 1);
    } else {
      _spokeW.normalize();
    }
    _spokeU.crossVectors(_spokeV, _spokeW).normalize(); // Local X axial depth
    _spokeMat.makeBasis(_spokeU, _spokeV, _spokeW);
    const m = new THREE.Mesh(spokeBox, mat);
    m.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
    m.quaternion.setFromRotationMatrix(_spokeMat);
    m.scale.set(thickX, len, widthW);
    parent.add(m);
  };

  let activeWheelStyle: WheelStyleId = initialWheel.style;
  let activeWheelColorHex = initialWheelColorOpt.hex;
  const wheelAnimSpinners: { group: THREE.Group; speed: number }[] = [];

  const syncAnimatedWheelColors = (style: WheelStyleId, hex: number) => {
    if (style === 'animNeonPulse' || style === 'animReactor') {
      // Brighten very dark wheel colors (e.g. matte black / gunmetal) into sleek icy-white neon glow
      _fxColor.setHex(hex);
      const lum = _fxColor.r * 0.299 + _fxColor.g * 0.587 + _fxColor.b * 0.114;
      if (lum < 0.22) {
        _fxColor.setHex(0x38bdf8);
      }
      wheelGlowPrimaryMat.color.copy(_fxColor);
      wheelGlowPrimaryMat.emissive.copy(_fxColor);
      wheelGlowSecondaryMat.color.copy(_fxColor);
      wheelGlowSecondaryMat.emissive.copy(_fxColor);
    } else if (style === 'animMagma') {
      wheelGlowPrimaryMat.color.setHex(0xff5500);
      wheelGlowPrimaryMat.emissive.setHex(0xff4500);
      wheelGlowSecondaryMat.color.setHex(0xffb703);
      wheelGlowSecondaryMat.emissive.setHex(0xf97316);
    } else if (style === 'animCyberGrid') {
      wheelGlowPrimaryMat.color.setHex(0x22d3ee);
      wheelGlowPrimaryMat.emissive.setHex(0x06b6d4);
      wheelGlowSecondaryMat.color.setHex(0xe879f9);
      wheelGlowSecondaryMat.emissive.setHex(0xc026d3);
    } else if (style === 'animPrismVortex') {
      wheelGlowPrimaryMat.color.setHex(0x38bdf8);
      wheelGlowPrimaryMat.emissive.setHex(0x38bdf8);
      wheelGlowSecondaryMat.color.setHex(0xf43f5e);
      wheelGlowSecondaryMat.emissive.setHex(0xf43f5e);
    } else if (style === 'animLightning') {
      wheelGlowPrimaryMat.color.setHex(0x60a5fa);
      wheelGlowPrimaryMat.emissive.setHex(0x3b82f6);
      wheelGlowSecondaryMat.color.setHex(0xffffff);
      wheelGlowSecondaryMat.emissive.setHex(0x93c5fd);
    } else if (style === 'animEmeraldPulse') {
      wheelGlowPrimaryMat.color.setHex(0x10b981);
      wheelGlowPrimaryMat.emissive.setHex(0x059669);
      wheelGlowSecondaryMat.color.setHex(0x6ee7b7);
      wheelGlowSecondaryMat.emissive.setHex(0x34d399);
    } else if (style === 'animSolarFlare') {
      wheelGlowPrimaryMat.color.setHex(0xfacc15);
      wheelGlowPrimaryMat.emissive.setHex(0xf59e0b);
      wheelGlowSecondaryMat.color.setHex(0xf97316);
      wheelGlowSecondaryMat.emissive.setHex(0xea580c);
    } else if (style === 'animFrostCrystal') {
      wheelGlowPrimaryMat.color.setHex(0xe0f2fe);
      wheelGlowPrimaryMat.emissive.setHex(0x7dd3fc);
      wheelGlowSecondaryMat.color.setHex(0x38bdf8);
      wheelGlowSecondaryMat.emissive.setHex(0x0284c7);
    } else if (style === 'animGalaxyOrb') {
      wheelGlowPrimaryMat.color.setHex(0xa855f7);
      wheelGlowPrimaryMat.emissive.setHex(0x7c3aed);
      wheelGlowSecondaryMat.color.setHex(0x22d3ee);
      wheelGlowSecondaryMat.emissive.setHex(0x06b6d4);
    } else if (style === 'animVenomRing') {
      wheelGlowPrimaryMat.color.setHex(0x84cc16);
      wheelGlowPrimaryMat.emissive.setHex(0x65a30d);
      wheelGlowSecondaryMat.color.setHex(0x34d399);
      wheelGlowSecondaryMat.emissive.setHex(0x10b981);
    } else if (style === 'animRubyPulse') {
      wheelGlowPrimaryMat.color.setHex(0xf43f5e);
      wheelGlowPrimaryMat.emissive.setHex(0xe11d48);
      wheelGlowSecondaryMat.color.setHex(0xfacc15);
      wheelGlowSecondaryMat.emissive.setHex(0xd97706);
    } else if (style === 'hoverMaglevOrb') {
      wheelGlowPrimaryMat.color.setHex(0x22d3ee);
      wheelGlowPrimaryMat.emissive.setHex(0x06b6d4);
      wheelGlowSecondaryMat.color.setHex(0xc084fc);
      wheelGlowSecondaryMat.emissive.setHex(0x9333ea);
    }
  };

  const rebuildWheelRims = (style: WheelStyleId) => {
    for (const m of wheelRimMounts) m.rimGroup.clear();
    rimGeos.forEach((g) => g.dispose());
    rimGeos.length = 0;
    rimMats.forEach((m) => m.dispose());
    rimMats.length = 0;
    wheelAnimSpinners.length = 0;

    syncAnimatedWheelColors(style, activeWheelColorHex);

    const spokeUnit = trackRimGeo(new THREE.BoxGeometry(1, 1, 1));
    const isFullCustomWheel =
      style === 'wagonWoodWheel' ||
      style === 'monsterMudTire' ||
      style === 'voxelSquareWheel' ||
      style === 'spikedMadMaxWheel' ||
      style === 'hoverMaglevOrb';

    for (const { rimGroup, stockTireGroup, caliper, side, tireRadius, rRadius, tWidth } of wheelRimMounts) {
      stockTireGroup.visible = !isFullCustomWheel;
      caliper.visible = !isFullCustomWheel;

      if (isFullCustomWheel) {
        if (style === 'wagonWoodWheel') {
          // FULL WHEEL 1: Handcrafted Wild-West Wooden Wagon Wheel (Zero Rubber Tire!)
          const oakMat = trackRimMat(
            new THREE.MeshStandardMaterial({ color: 0x9a5b25, roughness: 0.82, metalness: 0.05 }),
          );
          const oakDarkMat = trackRimMat(
            new THREE.MeshStandardMaterial({ color: 0x6b3a14, roughness: 0.86, metalness: 0.05 }),
          );
          const ironBandMat = trackRimMat(
            new THREE.MeshStandardMaterial({ color: 0x3b3d42, roughness: 0.72, metalness: 0.82 }),
          );

          // Forged iron outer wagon tire band (no rubber!)
          const ironTireGeo = trackRimGeo(
            new THREE.CylinderGeometry(tireRadius, tireRadius, tWidth * 0.52, 26, 1, true),
          );
          ironTireGeo.rotateZ(Math.PI / 2);
          const ironTire = new THREE.Mesh(ironTireGeo, ironBandMat);
          ironTire.castShadow = true;
          rimGroup.add(ironTire);

          // Thick oak wooden felloe ring inside the iron band
          const woodRimGeo = trackRimGeo(
            new THREE.TorusGeometry(tireRadius * 0.88, tireRadius * 0.11, 10, 26),
          );
          woodRimGeo.rotateY(Math.PI / 2);
          const woodRim = new THREE.Mesh(woodRimGeo, oakMat);
          woodRim.scale.set(tWidth * 0.48 / (tireRadius * 0.22), 1, 1);
          woodRim.castShadow = true;
          rimGroup.add(woodRim);

          // 12 Sturdy Turned Wooden Wagon Spokes (completely open & see-through!)
          const wSpokeGeo = trackRimGeo(
            new THREE.CylinderGeometry(0.017, 0.022, tireRadius * 0.76, 8),
          );
          for (let s = 0; s < 12; s++) {
            const a = (s / 12) * Math.PI * 2;
            const sp = new THREE.Mesh(wSpokeGeo, s % 2 === 0 ? oakMat : oakDarkMat);
            sp.position.set(0, Math.cos(a) * tireRadius * 0.44, Math.sin(a) * tireRadius * 0.44);
            sp.rotation.x = a;
            sp.castShadow = true;
            rimGroup.add(sp);
          }

          // Heavy iron-banded wooden axle hub barrel
          const hubGeo = trackRimGeo(
            new THREE.CylinderGeometry(tireRadius * 0.22, tireRadius * 0.24, tWidth * 0.78, 14),
          );
          hubGeo.rotateZ(Math.PI / 2);
          rimGroup.add(new THREE.Mesh(hubGeo, oakDarkMat));
          const capRingGeo = trackRimGeo(new THREE.TorusGeometry(tireRadius * 0.225, 0.016, 8, 16));
          capRingGeo.rotateY(Math.PI / 2);
          for (const sx of [-1, 1]) {
            const cr = new THREE.Mesh(capRingGeo, ironBandMat);
            cr.position.x = sx * tWidth * 0.3;
            rimGroup.add(cr);
          }
          const linchPin = new THREE.Mesh(
            trackRimGeo(new THREE.CylinderGeometry(0.022, 0.022, tWidth * 0.94, 8)),
            ironBandMat,
          );
          linchPin.rotation.z = Math.PI / 2;
          rimGroup.add(linchPin);
        } else if (style === 'monsterMudTire') {
          // FULL WHEEL 2: Aggressive Oversized Off-Road Mud-Terrain Tire with 16 Protruding 3D Mud Lugs!
          const mudRubberMat = trackRimMat(
            new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.94, metalness: 0.04 }),
          );
          const oliveSteelMat = trackRimMat(
            new THREE.MeshStandardMaterial({ color: 0x3f4e32, roughness: 0.58, metalness: 0.62 }),
          );
          const beadRingMat = trackRimMat(
            new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.38, metalness: 0.55 }),
          );

          // Chunky wide mud-terrain tire carcass
          const carcassGeo = trackRimGeo(
            new THREE.CylinderGeometry(tireRadius * 0.94, tireRadius * 0.94, tWidth * 1.12, 24),
          );
          carcassGeo.rotateZ(Math.PI / 2);
          const carcass = new THREE.Mesh(carcassGeo, mudRubberMat);
          carcass.castShadow = true;
          rimGroup.add(carcass);

          // 16 Alternating Staggered 3D Chevron Mud-Terrain Tread Lugs wrapping the outer circumference!
          const lugGeo = trackRimGeo(new THREE.BoxGeometry(tWidth * 0.56, 0.055, tireRadius * 0.24));
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            const staggerX = (i % 2 === 0 ? 1 : -1) * (tWidth * 0.26);
            const lug = new THREE.Mesh(lugGeo, mudRubberMat);
            lug.position.set(staggerX, Math.cos(a) * (tireRadius * 0.97), Math.sin(a) * (tireRadius * 0.97));
            lug.rotation.x = a;
            lug.rotation.y = i % 2 === 0 ? 0.24 : -0.24;
            lug.castShadow = true;
            rimGroup.add(lug);
          }

          // Deep-dished tactical olive steel wheel face + bright beadlock clamp ring + 12 bolts
          const dishGeo = trackRimGeo(
            new THREE.CylinderGeometry(rRadius * 0.88, rRadius * 0.88, tWidth * 1.16, 18),
          );
          dishGeo.rotateZ(Math.PI / 2);
          rimGroup.add(new THREE.Mesh(dishGeo, oliveSteelMat));

          const beadGeo = trackRimGeo(new THREE.TorusGeometry(rRadius * 0.9, 0.024, 8, 22));
          beadGeo.rotateY(Math.PI / 2);
          const bead = new THREE.Mesh(beadGeo, beadRingMat);
          bead.position.x = side * (tWidth * 0.58);
          rimGroup.add(bead);

          const boltGeo = trackRimGeo(new THREE.CylinderGeometry(0.012, 0.012, 0.025, 6));
          boltGeo.rotateZ(Math.PI / 2);
          for (let b = 0; b < 12; b++) {
            const a = (b / 12) * Math.PI * 2;
            const bolt = new THREE.Mesh(boltGeo, chromeMat);
            bolt.position.set(side * (tWidth * 0.6), Math.cos(a) * rRadius * 0.9, Math.sin(a) * rRadius * 0.9);
            rimGroup.add(bolt);
          }
          const lockHub = new THREE.Mesh(
            trackRimGeo(new THREE.CylinderGeometry(rRadius * 0.3, rRadius * 0.34, 0.09, 12)),
            matteTrimMat,
          );
          lockHub.rotation.z = Math.PI / 2;
          lockHub.position.x = side * (tWidth * 0.58);
          rimGroup.add(lockHub);
        } else if (style === 'voxelSquareWheel') {
          // FULL WHEEL 3: 100% Quantized 8-Bit Minecraft Voxel Block Wheel (Zero Smooth Curves!)
          const obsMat = trackRimMat(
            new THREE.MeshStandardMaterial({ color: 0x161820, roughness: 0.78, metalness: 0.14 }),
          );
          const stoneMat = trackRimMat(
            new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.82, metalness: 0.12 }),
          );
          const diaMat = trackRimMat(
            new THREE.MeshStandardMaterial({
              color: 0x22d3ee,
              emissive: 0x06b6d4,
              emissiveIntensity: 1.5,
              roughness: 0.2,
            }),
          );

          // Quantized 7x7 Voxel Circle Tire Blocks (pure crisp boxes!)
          const vStep = (tireRadius * 2.0) / 7;
          const vBoxGeo = trackRimGeo(new THREE.BoxGeometry(tWidth * 0.94, vStep * 0.97, vStep * 0.97));
          const ringCells: [number, number][] = [
            [-1, 3], [0, 3], [1, 3],
            [2, 2],
            [3, 1], [3, 0], [3, -1],
            [2, -2],
            [1, -3], [0, -3], [-1, -3],
            [-2, -2],
            [-3, -1], [-3, 0], [-3, 1],
            [-2, 2],
          ];
          ringCells.forEach(([gy, gz], idx) => {
            const c = new THREE.Mesh(vBoxGeo, idx % 4 === 0 ? stoneMat : obsMat);
            c.position.set(0, gy * vStep, gz * vStep);
            c.castShadow = true;
            rimGroup.add(c);
          });

          // Inner stone pixel spokes + glowing cyan diamond-ore center axle block!
          const innerGeo = trackRimGeo(new THREE.BoxGeometry(tWidth * 0.82, vStep * 0.94, vStep * 0.94));
          for (const [gy, gz] of [
            [0, 2], [0, -2], [2, 0], [-2, 0],
            [1, 1], [-1, 1], [1, -1], [-1, -1],
          ]) {
            const b = new THREE.Mesh(innerGeo, stoneMat);
            b.position.set(0, gy * vStep, gz * vStep);
            rimGroup.add(b);
          }
          const hubDia = new THREE.Mesh(
            trackRimGeo(new THREE.BoxGeometry(tWidth * 1.02, vStep * 1.6, vStep * 1.6)),
            diaMat,
          );
          rimGroup.add(hubDia);
        } else if (style === 'spikedMadMaxWheel') {
          // FULL WHEEL 4: Post-Apocalyptic Wasteland Armored Spiked Steel Drum + Gladiator Hub Spear!
          const rustMat = trackRimMat(
            new THREE.MeshStandardMaterial({ color: 0x6b3218, roughness: 0.9, metalness: 0.55 }),
          );
          const armorMat = trackRimMat(
            new THREE.MeshStandardMaterial({ color: 0x27292e, roughness: 0.72, metalness: 0.84 }),
          );
          const spikeSteelMat = trackRimMat(
            new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.35, metalness: 0.92 }),
          );

          // Rugged armored iron outer drum tire
          const drumGeo = trackRimGeo(
            new THREE.CylinderGeometry(tireRadius * 0.93, tireRadius * 0.93, tWidth * 0.96, 16),
          );
          drumGeo.rotateZ(Math.PI / 2);
          const drum = new THREE.Mesh(drumGeo, armorMat);
          drum.castShadow = true;
          rimGroup.add(drum);

          // Twin welded rusted iron rim hoops
          const hoopGeo = trackRimGeo(new THREE.TorusGeometry(tireRadius * 0.88, 0.028, 8, 18));
          hoopGeo.rotateY(Math.PI / 2);
          for (const sx of [-1, 1]) {
            const hoop = new THREE.Mesh(hoopGeo, rustMat);
            hoop.position.x = sx * tWidth * 0.44;
            rimGroup.add(hoop);
          }

          // 12 Forged Steel Tread Spikes bristling around the outer drum!
          const treadSpikeGeo = trackRimGeo(new THREE.ConeGeometry(0.026, 0.09, 5));
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            const sp = new THREE.Mesh(treadSpikeGeo, i % 2 === 0 ? spikeSteelMat : rustMat);
            sp.position.set(
              (i % 2 === 0 ? 1 : -1) * (tWidth * 0.2),
              Math.cos(a) * (tireRadius * 0.97),
              Math.sin(a) * (tireRadius * 0.97),
            );
            sp.rotation.x = a;
            rimGroup.add(sp);
          }

          // Menacing Protruding Ben-Hur Gladiator Spiked Hub Spear jutting outward from center!
          const spearCone = new THREE.Mesh(
            trackRimGeo(new THREE.ConeGeometry(rRadius * 0.36, 0.24, 6)),
            spikeSteelMat,
          );
          spearCone.rotation.z = side * -Math.PI * 0.5;
          spearCone.position.x = side * (tWidth * 0.56);
          spearCone.castShadow = true;
          rimGroup.add(spearCone);

          const baseFlange = new THREE.Mesh(
            trackRimGeo(new THREE.CylinderGeometry(rRadius * 0.55, rRadius * 0.58, 0.05, 8)),
            rustMat,
          );
          baseFlange.rotation.z = Math.PI / 2;
          baseFlange.position.x = side * (tWidth * 0.49);
          rimGroup.add(baseFlange);
        } else if (style === 'hoverMaglevOrb') {
          // FULL WHEEL 5: Hubless Sci-Fi Tron / Maglev Floating Energy Ring + Spinning Plasma Orb!
          const darkRingMat = trackRimMat(
            new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.22, metalness: 0.85 }),
          );

          // Sleek hubless outer floating maglev tire ring (completely hollow center!)
          const outerShellGeo = trackRimGeo(
            new THREE.TorusGeometry(tireRadius * 0.86, tireRadius * 0.14, 12, 32),
          );
          outerShellGeo.rotateY(Math.PI / 2);
          const outerShell = new THREE.Mesh(outerShellGeo, darkRingMat);
          outerShell.scale.set((tWidth * 0.72) / (tireRadius * 0.28), 1, 1);
          rimGroup.add(outerShell);

          // Twin glowing neon-cyan maglev energy tracks embedded on both flanks of the hubless ring
          const glowTrackGeo = trackRimGeo(new THREE.TorusGeometry(tireRadius * 0.84, 0.022, 8, 32));
          glowTrackGeo.rotateY(Math.PI / 2);
          for (const sx of [-1, 1]) {
            const tr = new THREE.Mesh(glowTrackGeo, wheelGlowPrimaryMat);
            tr.position.x = sx * tWidth * 0.36;
            rimGroup.add(tr);
          }

          // Floating Counter-Rotating Translucent Magnetic Energy Orb + Gyro Arcs in the empty center!
          const orbSpinner = new THREE.Group();
          rimGroup.add(orbSpinner);
          wheelAnimSpinners.push({ group: orbSpinner, speed: -side * 3.8 });

          const orbCore = new THREE.Mesh(
            trackRimGeo(new THREE.IcosahedronGeometry(tireRadius * 0.34, 1)),
            wheelGlowSecondaryMat,
          );
          orbSpinner.add(orbCore);

          const gyroGeo = trackRimGeo(new THREE.TorusGeometry(tireRadius * 0.54, 0.018, 8, 24));
          const g1 = new THREE.Mesh(gyroGeo, wheelGlowPrimaryMat);
          g1.rotation.y = Math.PI * 0.5;
          orbSpinner.add(g1);
          const g2 = new THREE.Mesh(gyroGeo, wheelGlowSecondaryMat);
          g2.rotation.x = Math.PI * 0.32;
          orbSpinner.add(g2);
        }
        continue;
      }

      const outerX = side * (tWidth * 0.475);
      const sidewallX = side * (tWidth * 0.488);
      const isDarkShellAnim =
        style === 'animMagma' ||
        style === 'animCyberGrid' ||
        style === 'animPrismVortex' ||
        style === 'animNeonPulse' ||
        style === 'animReactor' ||
        style === 'animLightning' ||
        style === 'animEmeraldPulse' ||
        style === 'animSolarFlare' ||
        style === 'animFrostCrystal' ||
        style === 'animGalaxyOrb' ||
        style === 'animVenomRing' ||
        style === 'animRubyPulse';

      const lipGeo = trackRimGeo(
        new THREE.TorusGeometry(
          rRadius * 0.99,
          style === 'deepdish' || style === 'offroadBead' || style === 'retroSlot'
            ? 0.025
            : 0.02,
          12,
          28,
        ),
      );
      lipGeo.rotateY(Math.PI / 2);

      const lipMat =
        style === 'deepdish' || style === 'wireClassic' || style === 'retroSlot'
          ? chromeMat
          : style === 'royalCrownRim'
            ? wheelGoldMat
            : style === 'aeroDisc'
              ? carbonMat
              : style === 'animNeonPulse'
                ? wheelGlowPrimaryMat
                : isDarkShellAnim
                  ? wheelObsidianMat
                  : alloyMat;
      const lip = new THREE.Mesh(lipGeo, lipMat);
      lip.position.x = outerX;
      rimGroup.add(lip);

      // Center Hub Collar & Cap
      const hubX = side * (tWidth * (style === 'deepdish' ? 0.25 : 0.37));
      const collarGeo = trackRimGeo(
        new THREE.CylinderGeometry(rRadius * 0.25, rRadius * 0.27, 0.036, 16),
      );
      collarGeo.rotateZ(Math.PI / 2);
      const collarMat =
        style === 'forgedY' || style === 'offroadBead'
          ? matteTrimMat
          : style === 'aeroDisc'
            ? carbonMat
            : style === 'wireClassic'
              ? wheelGoldMat
              : isDarkShellAnim
                ? wheelObsidianMat
                : alloyMat;
      const collar = new THREE.Mesh(collarGeo, collarMat);
      collar.position.x = hubX - side * 0.008;
      rimGroup.add(collar);

      const capGeo = trackRimGeo(
        new THREE.CylinderGeometry(
          rRadius * 0.17,
          rRadius * 0.19,
          0.032,
          style === 'forgedY' || style === 'aeroDisc' ? 6 : 16,
        ),
      );
      capGeo.rotateZ(Math.PI / 2);
      const capMat =
        style === 'forgedY'
          ? centerLockRedMat
          : style === 'aeroDisc'
            ? titaniumMat
            : style === 'wireClassic'
              ? wheelGoldMat
              : isDarkShellAnim
                ? wheelGlowPrimaryMat
                : chromeMat;
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.x = hubX + side * 0.012;
      rimGroup.add(cap);

      if (style === 'multispoke') {
        const xIn = side * (tWidth * 0.36);
        const xOut = side * (tWidth * 0.455);
        const innerRingGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 0.56, 0.011, 8, 28),
        );
        innerRingGeo.rotateY(Math.PI / 2);
        const innerRing = new THREE.Mesh(innerRingGeo, alloyMat);
        innerRing.position.x = side * (tWidth * 0.415);
        rimGroup.add(innerRing);

        for (let s = 0; s < 10; s++) {
          const ang = (s * Math.PI * 2) / 10;
          addSpokeSeg3D(
            rimGroup,
            spokeUnit,
            xIn,
            Math.cos(ang) * rRadius * 0.18,
            Math.sin(ang) * rRadius * 0.18,
            xOut,
            Math.cos(ang) * rRadius * 0.96,
            Math.sin(ang) * rRadius * 0.96,
            0.022,
            0.02,
            alloyMat,
          );
        }
      } else if (style === 'deepdish') {
        const dishLen = tWidth * 0.25;
        const dishGeo = trackRimGeo(
          new THREE.CylinderGeometry(
            rRadius * 0.97,
            rRadius * 0.87,
            dishLen,
            28,
            1,
            true,
          ),
        );
        dishGeo.rotateZ(side > 0 ? -Math.PI / 2 : Math.PI / 2);
        const dishMesh = new THREE.Mesh(dishGeo, chromeDishMat);
        dishMesh.position.x = side * (tWidth * 0.35);
        rimGroup.add(dishMesh);

        const stepRingGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 0.85, 0.014, 10, 28),
        );
        stepRingGeo.rotateY(Math.PI / 2);
        const stepRing = new THREE.Mesh(stepRingGeo, chromeMat);
        stepRing.position.x = side * (tWidth * 0.245);
        rimGroup.add(stepRing);

        const rivetGeo = trackRimGeo(new THREE.SphereGeometry(0.0085, 6, 6));
        for (let b = 0; b < 12; b++) {
          const ba = (b * Math.PI * 2) / 12;
          const rv = new THREE.Mesh(rivetGeo, chromeMat);
          rv.position.set(
            side * (tWidth * 0.26),
            Math.cos(ba) * rRadius * 0.85,
            Math.sin(ba) * rRadius * 0.85,
          );
          rimGroup.add(rv);
        }

        const xDeep = side * (tWidth * 0.235);
        for (let s = 0; s < 6; s++) {
          const ang = (s * Math.PI * 2) / 6;
          addSpokeSeg3D(
            rimGroup,
            spokeUnit,
            xDeep,
            Math.cos(ang) * rRadius * 0.16,
            Math.sin(ang) * rRadius * 0.16,
            xDeep,
            Math.cos(ang) * rRadius * 0.85,
            Math.sin(ang) * rRadius * 0.85,
            0.036,
            0.052,
            alloyMat,
          );
        }
      } else if (style === 'turbine') {
        const shroudGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 0.85, 0.019, 10, 28),
        );
        shroudGeo.rotateY(Math.PI / 2);
        const shroud = new THREE.Mesh(shroudGeo, matteTrimMat);
        shroud.position.x = side * (tWidth * 0.445);
        rimGroup.add(shroud);

        const xIn = side * (tWidth * 0.36);
        const xMid = side * (tWidth * 0.425);
        const xOut = side * (tWidth * 0.455);
        const sweepDir = side > 0 ? 1 : -1;
        for (let s = 0; s < 8; s++) {
          const ang = (s * Math.PI * 2) / 8;
          const y0 = Math.cos(ang) * rRadius * 0.17;
          const z0 = Math.sin(ang) * rRadius * 0.17;
          const y1 = Math.cos(ang + sweepDir * 0.18) * rRadius * 0.56;
          const z1 = Math.sin(ang + sweepDir * 0.18) * rRadius * 0.56;
          const y2 = Math.cos(ang + sweepDir * 0.48) * rRadius * 0.95;
          const z2 = Math.sin(ang + sweepDir * 0.48) * rRadius * 0.95;
          addSpokeSeg3D(
            rimGroup,
            spokeUnit,
            xIn,
            y0,
            z0,
            xMid,
            y1,
            z1,
            0.024,
            0.042,
            alloyMat,
          );
          addSpokeSeg3D(
            rimGroup,
            spokeUnit,
            xMid,
            y1,
            z1,
            xOut,
            y2,
            z2,
            0.022,
            0.036,
            alloyMat,
          );
        }
      } else if (style === 'offroadBead') {
        // Armored 6-spoke beadlock rim + 16 chrome perimeter bolts + heavy outer lock ring
        const lockRingGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 0.9, 0.022, 10, 28),
        );
        lockRingGeo.rotateY(Math.PI / 2);
        const lockRing = new THREE.Mesh(lockRingGeo, matteTrimMat);
        lockRing.position.x = side * (tWidth * 0.468);
        rimGroup.add(lockRing);

        const boltGeo = trackRimGeo(
          new THREE.CylinderGeometry(0.011, 0.011, 0.022, 6),
        );
        boltGeo.rotateZ(Math.PI / 2);
        for (let b = 0; b < 16; b++) {
          const ba = (b * Math.PI * 2) / 16;
          const bolt = new THREE.Mesh(boltGeo, chromeMat);
          bolt.position.set(
            side * (tWidth * 0.482),
            Math.cos(ba) * rRadius * 0.9,
            Math.sin(ba) * rRadius * 0.9,
          );
          rimGroup.add(bolt);
        }

        const xIn = side * (tWidth * 0.31);
        const xOut = side * (tWidth * 0.44);
        for (let s = 0; s < 6; s++) {
          const ang = (s * Math.PI * 2) / 6;
          addSpokeSeg3D(
            rimGroup,
            spokeUnit,
            xIn,
            Math.cos(ang) * rRadius * 0.2,
            Math.sin(ang) * rRadius * 0.2,
            xOut,
            Math.cos(ang) * rRadius * 0.88,
            Math.sin(ang) * rRadius * 0.88,
            0.038,
            0.056,
            alloyMat,
          );
        }
      } else if (style === 'meshHoneycomb') {
        // Precision GT 8-pair split honeycomb lattice with octagonal tie-ring
        const octGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 0.52, 0.013, 8, 8),
        );
        octGeo.rotateY(Math.PI / 2);
        const oct = new THREE.Mesh(octGeo, alloyMat);
        oct.position.x = side * (tWidth * 0.415);
        rimGroup.add(oct);

        const xIn = side * (tWidth * 0.34);
        const xMid = side * (tWidth * 0.415);
        const xOut = side * (tWidth * 0.458);
        for (let s = 0; s < 8; s++) {
          const ang = (s * Math.PI * 2) / 8;
          const yM = Math.cos(ang) * rRadius * 0.52;
          const zM = Math.sin(ang) * rRadius * 0.52;
          addSpokeSeg3D(
            rimGroup,
            spokeUnit,
            xIn,
            Math.cos(ang) * rRadius * 0.18,
            Math.sin(ang) * rRadius * 0.18,
            xMid,
            yM,
            zM,
            0.022,
            0.022,
            alloyMat,
          );
          for (const d of [-0.22, 0.22]) {
            addSpokeSeg3D(
              rimGroup,
              spokeUnit,
              xMid,
              yM,
              zM,
              xOut,
              Math.cos(ang + d) * rRadius * 0.96,
              Math.sin(ang + d) * rRadius * 0.96,
              0.02,
              0.018,
              alloyMat,
            );
          }
        }
      } else if (style === 'forgedY') {
        const xIn = side * (tWidth * 0.35);
        const xMid = side * (tWidth * 0.415);
        const xOut = side * (tWidth * 0.46);
        for (let s = 0; s < 6; s++) {
          const ang = (s * Math.PI * 2) / 6;
          const y0 = Math.cos(ang) * rRadius * 0.18;
          const z0 = Math.sin(ang) * rRadius * 0.18;
          const yJ = Math.cos(ang) * rRadius * 0.48;
          const zJ = Math.sin(ang) * rRadius * 0.48;
          addSpokeSeg3D(
            rimGroup,
            spokeUnit,
            xIn,
            y0,
            z0,
            xMid,
            yJ,
            zJ,
            0.026,
            0.028,
            alloyMat,
          );
          for (const d of [-0.24, 0.24]) {
            addSpokeSeg3D(
              rimGroup,
              spokeUnit,
              xMid,
              yJ,
              zJ,
              xOut,
              Math.cos(ang + d) * rRadius * 0.96,
              Math.sin(ang + d) * rRadius * 0.96,
              0.022,
              0.022,
              alloyMat,
            );
          }
        }
      } else if (style === 'aeroDisc') {
        // Closed Woven Carbon Turbofan Disc + 12 Aero Cooling Fins + Crimson Track Sidewall Ring
        const discGeo = trackRimGeo(
          new THREE.CylinderGeometry(
            rRadius * 0.95,
            rRadius * 0.97,
            0.026,
            28,
          ),
        );
        discGeo.rotateZ(Math.PI / 2);
        const disc = new THREE.Mesh(discGeo, carbonMat);
        disc.position.x = side * (tWidth * 0.42);
        rimGroup.add(disc);

        const innerRingGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 0.58, 0.012, 8, 28),
        );
        innerRingGeo.rotateY(Math.PI / 2);
        const innerRing = new THREE.Mesh(innerRingGeo, centerLockRedMat);
        innerRing.position.x = side * (tWidth * 0.448);
        rimGroup.add(innerRing);

        // 12 radial turbofan extraction fins around perimeter
        const finX = side * (tWidth * 0.448);
        for (let s = 0; s < 12; s++) {
          const ang = (s * Math.PI * 2) / 12;
          addSpokeSeg3D(
            rimGroup,
            spokeUnit,
            finX,
            Math.cos(ang) * rRadius * 0.62,
            Math.sin(ang) * rRadius * 0.62,
            finX,
            Math.cos(ang + 0.14) * rRadius * 0.94,
            Math.sin(ang + 0.14) * rRadius * 0.94,
            0.018,
            0.022,
            matteTrimMat,
          );
        }

        // Bold crimson motorsport sidewall ring
        const trackStripeGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 1.16, 0.015, 8, 32),
        );
        trackStripeGeo.rotateY(Math.PI / 2);
        const trackStripe = new THREE.Mesh(trackStripeGeo, centerLockRedMat);
        trackStripe.position.x = sidewallX;
        rimGroup.add(trackStripe);
      } else if (style === 'wireClassic') {
        // Vintage 24K Gold Cross-Laced Wire Spokes + Knock-Off 3-Ear Spinner + Whitewall Tire Band
        const xIn = side * (tWidth * 0.34);
        const xOut = side * (tWidth * 0.452);
        for (let s = 0; s < 16; s++) {
          const ang = (s * Math.PI * 2) / 16;
          const twist = s % 2 === 0 ? 0.32 : -0.32;
          addSpokeSeg3D(
            rimGroup,
            spokeUnit,
            xIn,
            Math.cos(ang) * rRadius * 0.2,
            Math.sin(ang) * rRadius * 0.2,
            xOut,
            Math.cos(ang + twist) * rRadius * 0.95,
            Math.sin(ang + twist) * rRadius * 0.95,
            0.01,
            0.01,
            wheelGoldMat,
          );
        }

        // 3-Ear Classic Knock-Off Spinner Hub
        for (let e = 0; e < 3; e++) {
          const ea = (e * Math.PI * 2) / 3;
          addSpokeSeg3D(
            rimGroup,
            spokeUnit,
            hubX + side * 0.025,
            0,
            0,
            hubX + side * 0.045,
            Math.cos(ea) * rRadius * 0.34,
            Math.sin(ea) * rRadius * 0.34,
            0.018,
            0.024,
            wheelGoldMat,
          );
        }

        // Iconic Vintage Whitewall Tire Sidewall Band
        const whitewallGeo = trackRimGeo(
          new THREE.RingGeometry(rRadius * 1.07, rRadius * 1.24, 32),
        );
        whitewallGeo.rotateY(side > 0 ? Math.PI / 2 : -Math.PI / 2);
        const whitewall = new THREE.Mesh(whitewallGeo, wheelWhitewallMat);
        whitewall.position.x = sidewallX;
        rimGroup.add(whitewall);
      } else if (style === 'animNeonPulse') {
        // Rocket League Apex/FSL-B inspired: Dark aero blades + dual pulsing colorable neon rings
        const xIn = side * (tWidth * 0.34);
        const xOut = side * (tWidth * 0.452);
        for (let s = 0; s < 5; s++) {
          const ang = (s * Math.PI * 2) / 5;
          addSpokeSeg3D(
            rimGroup,
            spokeUnit,
            xIn,
            Math.cos(ang) * rRadius * 0.18,
            Math.sin(ang) * rRadius * 0.18,
            xOut,
            Math.cos(ang) * rRadius * 0.95,
            Math.sin(ang) * rRadius * 0.95,
            0.028,
            0.044,
            wheelObsidianMat,
          );
          // Luminous edge vein along each spoke
          addSpokeSeg3D(
            rimGroup,
            spokeUnit,
            xIn + side * 0.014,
            Math.cos(ang) * rRadius * 0.24,
            Math.sin(ang) * rRadius * 0.24,
            xOut + side * 0.014,
            Math.cos(ang) * rRadius * 0.92,
            Math.sin(ang) * rRadius * 0.92,
            0.012,
            0.014,
            wheelGlowPrimaryMat,
          );
        }

        const innerHaloGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 0.56, 0.014, 10, 28),
        );
        innerHaloGeo.rotateY(Math.PI / 2);
        const innerHalo = new THREE.Mesh(innerHaloGeo, wheelGlowSecondaryMat);
        innerHalo.position.x = side * (tWidth * 0.44);
        rimGroup.add(innerHalo);

        // Glowing neon sidewall halo
        const sideGlowGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 1.15, 0.016, 10, 32),
        );
        sideGlowGeo.rotateY(Math.PI / 2);
        const sideGlow = new THREE.Mesh(sideGlowGeo, wheelGlowSecondaryMat);
        sideGlow.position.x = sidewallX;
        rimGroup.add(sideGlow);
      } else if (style === 'animReactor') {
        // Rocket League Reactor inspired: Dark outer claws + glowing core + counter-spinning plasma arc ring
        const xIn = side * (tWidth * 0.34);
        const xOut = side * (tWidth * 0.455);
        for (let s = 0; s < 6; s++) {
          const ang = (s * Math.PI * 2) / 6;
          addSpokeSeg3D(
            rimGroup,
            spokeUnit,
            xIn,
            Math.cos(ang) * rRadius * 0.24,
            Math.sin(ang) * rRadius * 0.24,
            xOut,
            Math.cos(ang + 0.16) * rRadius * 0.96,
            Math.sin(ang + 0.16) * rRadius * 0.96,
            0.026,
            0.036,
            wheelObsidianMat,
          );
        }

        // Counter-spinning Plasma Energy Core Group
        const spinner = new THREE.Group();
        rimGroup.add(spinner);
        wheelAnimSpinners.push({ group: spinner, speed: side * 2.8 });

        const arcRingGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 0.68, 0.015, 10, 6),
        );
        arcRingGeo.rotateY(Math.PI / 2);
        const arcRing = new THREE.Mesh(arcRingGeo, wheelGlowPrimaryMat);
        arcRing.position.x = side * (tWidth * 0.435);
        spinner.add(arcRing);

        for (let s = 0; s < 3; s++) {
          const ang = (s * Math.PI * 2) / 3;
          addSpokeSeg3D(
            spinner,
            spokeUnit,
            side * (tWidth * 0.42),
            Math.cos(ang) * rRadius * 0.18,
            Math.sin(ang) * rRadius * 0.18,
            side * (tWidth * 0.445),
            Math.cos(ang + 0.38) * rRadius * 0.88,
            Math.sin(ang + 0.38) * rRadius * 0.88,
            0.014,
            0.022,
            wheelGlowSecondaryMat,
          );
        }

        // Pulsing outer rim accent & tire sidewall plasma ring
        const sideGlowGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 1.16, 0.015, 10, 32),
        );
        sideGlowGeo.rotateY(Math.PI / 2);
        const sideGlow = new THREE.Mesh(sideGlowGeo, wheelGlowSecondaryMat);
        sideGlow.position.x = sidewallX;
        rimGroup.add(sideGlow);
      } else if (style === 'animMagma') {
        // Rocket League Pyrrhos/Draco inspired: Charred obsidian rim + glowing rotating magma core + fire veins
        const xIn = side * (tWidth * 0.34);
        const xMid = side * (tWidth * 0.42);
        const xOut = side * (tWidth * 0.46);
        for (let s = 0; s < 5; s++) {
          const ang = (s * Math.PI * 2) / 5;
          // Jagged charred claw
          addSpokeSeg3D(
            rimGroup,
            spokeUnit,
            xIn,
            Math.cos(ang) * rRadius * 0.2,
            Math.sin(ang) * rRadius * 0.2,
            xMid,
            Math.cos(ang + 0.24) * rRadius * 0.58,
            Math.sin(ang + 0.24) * rRadius * 0.58,
            0.032,
            0.044,
            wheelObsidianMat,
          );
          addSpokeSeg3D(
            rimGroup,
            spokeUnit,
            xMid,
            Math.cos(ang + 0.24) * rRadius * 0.58,
            Math.sin(ang + 0.24) * rRadius * 0.58,
            xOut,
            Math.cos(ang - 0.1) * rRadius * 0.96,
            Math.sin(ang - 0.1) * rRadius * 0.96,
            0.028,
            0.034,
            wheelObsidianMat,
          );
          // Molten glowing lava fissure inside the claw
          addSpokeSeg3D(
            rimGroup,
            spokeUnit,
            xIn + side * 0.015,
            Math.cos(ang) * rRadius * 0.22,
            Math.sin(ang) * rRadius * 0.22,
            xOut + side * 0.015,
            Math.cos(ang + 0.08) * rRadius * 0.94,
            Math.sin(ang + 0.08) * rRadius * 0.94,
            0.014,
            0.016,
            wheelGlowPrimaryMat,
          );
        }

        // Rotating incandescent magma ring
        const magmaSpinner = new THREE.Group();
        rimGroup.add(magmaSpinner);
        wheelAnimSpinners.push({ group: magmaSpinner, speed: -side * 1.9 });

        const coreRingGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 0.54, 0.018, 8, 5),
        );
        coreRingGeo.rotateY(Math.PI / 2);
        const coreRing = new THREE.Mesh(coreRingGeo, wheelGlowSecondaryMat);
        coreRing.position.x = side * (tWidth * 0.43);
        magmaSpinner.add(coreRing);

        const rimFireGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 0.92, 0.013, 10, 28),
        );
        rimFireGeo.rotateY(Math.PI / 2);
        const rimFire = new THREE.Mesh(rimFireGeo, wheelGlowPrimaryMat);
        rimFire.position.x = side * (tWidth * 0.478);
        rimGroup.add(rimFire);

        const emberSideGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 1.15, 0.017, 10, 32),
        );
        emberSideGeo.rotateY(Math.PI / 2);
        const emberSide = new THREE.Mesh(emberSideGeo, wheelGlowSecondaryMat);
        emberSide.position.x = sidewallX;
        rimGroup.add(emberSide);
      } else if (style === 'animCyberGrid') {
        // Rocket League Infinium/HoloForge inspired: Infinite concentric counter-spinning cyan & magenta holo rings
        const ringRadii = [0.34, 0.58, 0.82];
        ringRadii.forEach((rr, idx) => {
          const holoGroup = new THREE.Group();
          rimGroup.add(holoGroup);
          wheelAnimSpinners.push({
            group: holoGroup,
            speed: side * (idx % 2 === 0 ? 2.4 : -3.1),
          });
          const g = trackRimGeo(
            new THREE.TorusGeometry(rRadius * rr, 0.015, 8, idx === 1 ? 8 : 6),
          );
          g.rotateY(Math.PI / 2);
          const m = new THREE.Mesh(
            g,
            idx % 2 === 0 ? wheelGlowPrimaryMat : wheelGlowSecondaryMat,
          );
          m.position.x = side * (tWidth * (0.36 + idx * 0.048));
          holoGroup.add(m);
        });

        // 6 slender cyber energy struts connecting hub to outer rim
        const xStrut = side * (tWidth * 0.44);
        for (let s = 0; s < 6; s++) {
          const ang = (s * Math.PI * 2) / 6;
          addSpokeSeg3D(
            rimGroup,
            spokeUnit,
            xStrut,
            Math.cos(ang) * rRadius * 0.22,
            Math.sin(ang) * rRadius * 0.22,
            xStrut,
            Math.cos(ang) * rRadius * 0.95,
            Math.sin(ang) * rRadius * 0.95,
            0.012,
            0.014,
            s % 2 === 0 ? wheelGlowPrimaryMat : wheelGlowSecondaryMat,
          );
        }

        // Neon cyan sidewall ring
        const cyberSideGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 1.15, 0.016, 10, 32),
        );
        cyberSideGeo.rotateY(Math.PI / 2);
        const cyberSide = new THREE.Mesh(cyberSideGeo, wheelGlowPrimaryMat);
        cyberSide.position.x = sidewallX;
        rimGroup.add(cyberSide);
      } else if (style === 'animPrismVortex') {
        // Rocket League Zomba/Hypnotik RGB inspired: Counter-spinning curved rainbow vortex blades + dual RGB halos
        const vortexOuter = new THREE.Group();
        rimGroup.add(vortexOuter);
        wheelAnimSpinners.push({ group: vortexOuter, speed: side * 2.5 });

        const vortexInner = new THREE.Group();
        rimGroup.add(vortexInner);
        wheelAnimSpinners.push({ group: vortexInner, speed: -side * 3.4 });

        const sweepDir = side > 0 ? 1 : -1;
        const xIn = side * (tWidth * 0.36);
        const xMid = side * (tWidth * 0.425);
        const xOut = side * (tWidth * 0.462);
        for (let s = 0; s < 8; s++) {
          const ang = (s * Math.PI * 2) / 8;
          const y0 = Math.cos(ang) * rRadius * 0.2;
          const z0 = Math.sin(ang) * rRadius * 0.2;
          const y1 = Math.cos(ang + sweepDir * 0.34) * rRadius * 0.58;
          const z1 = Math.sin(ang + sweepDir * 0.34) * rRadius * 0.58;
          const y2 = Math.cos(ang + sweepDir * 0.72) * rRadius * 0.94;
          const z2 = Math.sin(ang + sweepDir * 0.72) * rRadius * 0.94;
          const targetGroup = s % 2 === 0 ? vortexOuter : vortexInner;
          const bladeMat =
            s % 2 === 0 ? wheelGlowPrimaryMat : wheelGlowSecondaryMat;
          addSpokeSeg3D(
            targetGroup,
            spokeUnit,
            xIn,
            y0,
            z0,
            xMid,
            y1,
            z1,
            0.016,
            0.028,
            bladeMat,
          );
          addSpokeSeg3D(
            targetGroup,
            spokeUnit,
            xMid,
            y1,
            z1,
            xOut,
            y2,
            z2,
            0.015,
            0.024,
            bladeMat,
          );
        }

        const innerPrismGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 0.54, 0.016, 10, 28),
        );
        innerPrismGeo.rotateY(Math.PI / 2);
        const innerPrism = new THREE.Mesh(innerPrismGeo, wheelGlowSecondaryMat);
        innerPrism.position.x = side * (tWidth * 0.44);
        rimGroup.add(innerPrism);

        const outerPrismGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 0.94, 0.015, 10, 28),
        );
        outerPrismGeo.rotateY(Math.PI / 2);
        const outerPrism = new THREE.Mesh(outerPrismGeo, wheelGlowPrimaryMat);
        outerPrism.position.x = side * (tWidth * 0.478);
        rimGroup.add(outerPrism);

        const prismSideGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 1.16, 0.018, 10, 32),
        );
        prismSideGeo.rotateY(Math.PI / 2);
        const prismSide = new THREE.Mesh(prismSideGeo, wheelGlowSecondaryMat);
        prismSide.position.x = sidewallX;
        rimGroup.add(prismSide);
      } else if (style === 'star5Deep') {
        // Concave fat 5-star JDM spokes
        const xIn = side * (tWidth * 0.31);
        const xOut = side * (tWidth * 0.462);
        for (let s = 0; s < 5; s++) {
          const ang = (s * Math.PI * 2) / 5;
          addSpokeSeg3D(
            rimGroup,
            spokeUnit,
            xIn,
            Math.cos(ang) * rRadius * 0.16,
            Math.sin(ang) * rRadius * 0.16,
            xOut,
            Math.cos(ang) * rRadius * 0.96,
            Math.sin(ang) * rRadius * 0.96,
            0.032,
            0.068,
            alloyMat,
          );
        }
      } else if (style === 'bladeTurbo') {
        // 7 directional curved razor turbine blades
        const xIn = side * (tWidth * 0.36);
        const xMid = side * (tWidth * 0.43);
        const xOut = side * (tWidth * 0.465);
        const sweep = side > 0 ? 1 : -1;
        for (let s = 0; s < 7; s++) {
          const ang = (s * Math.PI * 2) / 7;
          addSpokeSeg3D(
            rimGroup,
            spokeUnit,
            xIn,
            Math.cos(ang) * rRadius * 0.18,
            Math.sin(ang) * rRadius * 0.18,
            xMid,
            Math.cos(ang + sweep * 0.25) * rRadius * 0.62,
            Math.sin(ang + sweep * 0.25) * rRadius * 0.62,
            0.022,
            0.036,
            alloyMat,
          );
          addSpokeSeg3D(
            rimGroup,
            spokeUnit,
            xMid,
            Math.cos(ang + sweep * 0.25) * rRadius * 0.62,
            Math.sin(ang + sweep * 0.25) * rRadius * 0.62,
            xOut,
            Math.cos(ang + sweep * 0.56) * rRadius * 0.96,
            Math.sin(ang + sweep * 0.56) * rRadius * 0.96,
            0.02,
            0.03,
            alloyMat,
          );
        }
      } else if (style === 'split6Pro') {
        // Lightweight 6 split-V motorsport spokes + red center lock nut
        const xIn = side * (tWidth * 0.35);
        const xOut = side * (tWidth * 0.462);
        for (let s = 0; s < 6; s++) {
          const baseAng = (s * Math.PI * 2) / 6;
          for (const sgn of [-1, 1]) {
            const innerA = baseAng + sgn * 0.055;
            const outerA = baseAng + sgn * 0.195;
            addSpokeSeg3D(
              rimGroup,
              spokeUnit,
              xIn,
              Math.cos(innerA) * rRadius * 0.22,
              Math.sin(innerA) * rRadius * 0.22,
              xOut,
              Math.cos(outerA) * rRadius * 0.96,
              Math.sin(outerA) * rRadius * 0.96,
              0.02,
              0.02,
              alloyMat,
            );
          }
        }
        const lockGeo = trackRimGeo(
          new THREE.CylinderGeometry(rRadius * 0.19, rRadius * 0.21, 0.036, 6),
        );
        lockGeo.rotateZ(Math.PI / 2);
        const lockMesh = new THREE.Mesh(lockGeo, brakeRedMat);
        lockMesh.position.x = side * (tWidth * 0.39);
        rimGroup.add(lockMesh);
      } else if (style === 'retroSlot') {
        // Vintage 8-slot muscle car dish face
        const dishGeo = trackRimGeo(
          new THREE.CylinderGeometry(rRadius * 0.93, rRadius * 0.88, 0.028, 28),
        );
        dishGeo.rotateZ(Math.PI / 2);
        const dish = new THREE.Mesh(dishGeo, alloyMat);
        dish.position.x = side * (tWidth * 0.39);
        rimGroup.add(dish);

        const slotGeo = trackRimGeo(
          new THREE.CylinderGeometry(rRadius * 0.12, rRadius * 0.12, 0.034, 12),
        );
        slotGeo.rotateZ(Math.PI / 2);
        for (let i = 0; i < 8; i++) {
          const ang = (i * Math.PI * 2) / 8;
          const slot = new THREE.Mesh(slotGeo, wheelObsidianMat);
          slot.position.set(
            side * (tWidth * 0.395),
            Math.cos(ang) * rRadius * 0.62,
            Math.sin(ang) * rRadius * 0.62,
          );
          rimGroup.add(slot);
        }
        const capGeo = trackRimGeo(
          new THREE.CylinderGeometry(rRadius * 0.24, rRadius * 0.28, 0.05, 18),
        );
        capGeo.rotateZ(Math.PI / 2);
        const cap = new THREE.Mesh(capGeo, chromeMat);
        cap.position.x = side * (tWidth * 0.425);
        rimGroup.add(cap);
      } else if (style === 'royalCrownRim') {
        // 24K ornate 12-spoke royal luxury rim with emerald center jewel & gold sidewall ring
        const xIn = side * (tWidth * 0.36);
        const xOut = side * (tWidth * 0.464);
        for (let s = 0; s < 12; s++) {
          const ang = (s * Math.PI * 2) / 12;
          addSpokeSeg3D(
            rimGroup,
            spokeUnit,
            xIn,
            Math.cos(ang) * rRadius * 0.22,
            Math.sin(ang) * rRadius * 0.22,
            xOut,
            Math.cos(ang) * rRadius * 0.96,
            Math.sin(ang) * rRadius * 0.96,
            0.02,
            s % 2 === 0 ? 0.022 : 0.014,
            wheelGoldMat,
          );
        }
        const innerRingGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 0.56, 0.014, 8, 24),
        );
        innerRingGeo.rotateY(Math.PI / 2);
        const innerRing = new THREE.Mesh(innerRingGeo, wheelGoldMat);
        innerRing.position.x = side * (tWidth * 0.43);
        rimGroup.add(innerRing);

        const jewelGeo = trackRimGeo(
          new THREE.OctahedronGeometry(rRadius * 0.16, 0),
        );
        const jewel = new THREE.Mesh(jewelGeo, emeraldCoreMat);
        jewel.position.x = side * (tWidth * 0.435);
        rimGroup.add(jewel);

        const goldSideGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 1.15, 0.016, 10, 32),
        );
        goldSideGeo.rotateY(Math.PI / 2);
        const goldSide = new THREE.Mesh(goldSideGeo, wheelGoldMat);
        goldSide.position.x = sidewallX;
        rimGroup.add(goldSide);
      } else if (style === 'animLightning') {
        // High-voltage zigzag lightning arc spokes + crackling outer strobe halo
        const boltSpin = new THREE.Group();
        rimGroup.add(boltSpin);
        wheelAnimSpinners.push({ group: boltSpin, speed: side * 3.8 });
        const xA = side * (tWidth * 0.4);
        const xB = side * (tWidth * 0.445);
        const xC = side * (tWidth * 0.468);
        for (let s = 0; s < 6; s++) {
          const a = (s * Math.PI * 2) / 6;
          addSpokeSeg3D(
            boltSpin,
            spokeUnit,
            xA,
            Math.cos(a) * rRadius * 0.18,
            Math.sin(a) * rRadius * 0.18,
            xB,
            Math.cos(a + 0.24) * rRadius * 0.52,
            Math.sin(a + 0.24) * rRadius * 0.52,
            0.014,
            0.018,
            wheelGlowSecondaryMat,
          );
          addSpokeSeg3D(
            boltSpin,
            spokeUnit,
            xB,
            Math.cos(a + 0.24) * rRadius * 0.52,
            Math.sin(a + 0.24) * rRadius * 0.52,
            xC,
            Math.cos(a - 0.18) * rRadius * 0.94,
            Math.sin(a - 0.18) * rRadius * 0.94,
            0.014,
            0.016,
            wheelGlowPrimaryMat,
          );
        }
        const boltHaloGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 0.92, 0.015, 8, 28),
        );
        boltHaloGeo.rotateY(Math.PI / 2);
        const boltHalo = new THREE.Mesh(boltHaloGeo, wheelGlowPrimaryMat);
        boltHalo.position.x = side * (tWidth * 0.478);
        rimGroup.add(boltHalo);
        const boltSideGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 1.15, 0.017, 10, 32),
        );
        boltSideGeo.rotateY(Math.PI / 2);
        const boltSide = new THREE.Mesh(boltSideGeo, wheelGlowSecondaryMat);
        boltSide.position.x = sidewallX;
        rimGroup.add(boltSide);
      } else if (style === 'animEmeraldPulse') {
        // Digital emerald hex-grid matrix wheel with counter-spinning core triangle
        const hexOuter = new THREE.Group();
        rimGroup.add(hexOuter);
        wheelAnimSpinners.push({ group: hexOuter, speed: side * 1.8 });
        const hexGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 0.78, 0.017, 8, 6),
        );
        hexGeo.rotateY(Math.PI / 2);
        const hexMesh = new THREE.Mesh(hexGeo, wheelGlowPrimaryMat);
        hexMesh.position.x = side * (tWidth * 0.455);
        hexOuter.add(hexMesh);

        const coreSpin = new THREE.Group();
        rimGroup.add(coreSpin);
        wheelAnimSpinners.push({ group: coreSpin, speed: -side * 3.4 });
        const triGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 0.42, 0.018, 8, 3),
        );
        triGeo.rotateY(Math.PI / 2);
        const triMesh = new THREE.Mesh(triGeo, wheelGlowSecondaryMat);
        triMesh.position.x = side * (tWidth * 0.43);
        coreSpin.add(triMesh);

        const xStrut = side * (tWidth * 0.44);
        for (let s = 0; s < 6; s++) {
          const a = (s * Math.PI * 2) / 6;
          addSpokeSeg3D(
            rimGroup,
            spokeUnit,
            xStrut,
            Math.cos(a) * rRadius * 0.2,
            Math.sin(a) * rRadius * 0.2,
            xStrut,
            Math.cos(a) * rRadius * 0.94,
            Math.sin(a) * rRadius * 0.94,
            0.014,
            0.018,
            wheelGlowPrimaryMat,
          );
        }
        const sideRingGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 1.15, 0.016, 10, 32),
        );
        sideRingGeo.rotateY(Math.PI / 2);
        const sideRing = new THREE.Mesh(sideRingGeo, wheelGlowPrimaryMat);
        sideRing.position.x = sidewallX;
        rimGroup.add(sideRing);
      } else if (style === 'animSolarFlare') {
        // Spinning golden sun corona blades + glowing solar orb hub
        const flareSpin = new THREE.Group();
        rimGroup.add(flareSpin);
        wheelAnimSpinners.push({ group: flareSpin, speed: side * 2.6 });
        const xIn = side * (tWidth * 0.37);
        const xOut = side * (tWidth * 0.468);
        for (let s = 0; s < 10; s++) {
          const a = (s * Math.PI * 2) / 10;
          addSpokeSeg3D(
            flareSpin,
            spokeUnit,
            xIn,
            Math.cos(a) * rRadius * 0.24,
            Math.sin(a) * rRadius * 0.24,
            xOut,
            Math.cos(a + 0.32 * side) * rRadius * 0.94,
            Math.sin(a + 0.32 * side) * rRadius * 0.94,
            0.015,
            s % 2 === 0 ? 0.028 : 0.018,
            s % 2 === 0 ? wheelGlowPrimaryMat : wheelGlowSecondaryMat,
          );
        }
        const sunCoreGeo = trackRimGeo(
          new THREE.SphereGeometry(rRadius * 0.24, 14, 12),
        );
        const sunCore = new THREE.Mesh(sunCoreGeo, wheelGlowPrimaryMat);
        sunCore.position.x = side * (tWidth * 0.41);
        rimGroup.add(sunCore);
        const sunSideGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 1.15, 0.018, 10, 32),
        );
        sunSideGeo.rotateY(Math.PI / 2);
        const sunSide = new THREE.Mesh(sunSideGeo, wheelGlowSecondaryMat);
        sunSide.position.x = sidewallX;
        rimGroup.add(sunSide);
      } else if (style === 'animFrostCrystal') {
        // Counter-rotating icy diamond snowflake crystal spokes
        const crystalOuter = new THREE.Group();
        rimGroup.add(crystalOuter);
        wheelAnimSpinners.push({ group: crystalOuter, speed: side * 1.5 });
        const xF = side * (tWidth * 0.445);
        for (let s = 0; s < 6; s++) {
          const a = (s * Math.PI * 2) / 6;
          addSpokeSeg3D(
            crystalOuter,
            spokeUnit,
            xF,
            Math.cos(a) * rRadius * 0.16,
            Math.sin(a) * rRadius * 0.16,
            xF,
            Math.cos(a) * rRadius * 0.94,
            Math.sin(a) * rRadius * 0.94,
            0.014,
            0.022,
            wheelGlowPrimaryMat,
          );
          for (const br of [-0.36, 0.36]) {
            addSpokeSeg3D(
              crystalOuter,
              spokeUnit,
              xF,
              Math.cos(a) * rRadius * 0.56,
              Math.sin(a) * rRadius * 0.56,
              xF,
              Math.cos(a + br) * rRadius * 0.84,
              Math.sin(a + br) * rRadius * 0.84,
              0.012,
              0.014,
              wheelGlowSecondaryMat,
            );
          }
        }
        const frostSideGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 1.15, 0.016, 10, 32),
        );
        frostSideGeo.rotateY(Math.PI / 2);
        const frostSide = new THREE.Mesh(frostSideGeo, wheelGlowPrimaryMat);
        frostSide.position.x = sidewallX;
        rimGroup.add(frostSide);
      } else if (style === 'animGalaxyOrb') {
        // Cosmic dual-orbit violet & cyan nebula rings + glowing star hub
        const orbitA = new THREE.Group();
        rimGroup.add(orbitA);
        wheelAnimSpinners.push({ group: orbitA, speed: side * 2.2 });
        const ringAGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 0.84, 0.016, 10, 24),
        );
        ringAGeo.rotateY(Math.PI / 2);
        const ringA = new THREE.Mesh(ringAGeo, wheelGlowPrimaryMat);
        ringA.position.x = side * (tWidth * 0.455);
        orbitA.add(ringA);

        const orbitB = new THREE.Group();
        rimGroup.add(orbitB);
        wheelAnimSpinners.push({ group: orbitB, speed: -side * 3.6 });
        const ringBGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 0.52, 0.016, 10, 20),
        );
        ringBGeo.rotateY(Math.PI / 2);
        const ringB = new THREE.Mesh(ringBGeo, wheelGlowSecondaryMat);
        ringB.position.x = side * (tWidth * 0.435);
        orbitB.add(ringB);

        const starGeo = trackRimGeo(
          new THREE.OctahedronGeometry(rRadius * 0.22, 0),
        );
        const starMesh = new THREE.Mesh(starGeo, wheelGlowSecondaryMat);
        starMesh.position.x = side * (tWidth * 0.43);
        orbitB.add(starMesh);

        for (let s = 0; s < 4; s++) {
          const a = (s * Math.PI * 2) / 4;
          const orbDot = new THREE.Mesh(
            trackRimGeo(new THREE.SphereGeometry(0.022, 8, 8)),
            s % 2 === 0 ? wheelGlowSecondaryMat : wheelGlowPrimaryMat,
          );
          orbDot.position.set(
            side * (tWidth * 0.46),
            Math.cos(a) * rRadius * 0.84,
            Math.sin(a) * rRadius * 0.84,
          );
          orbitA.add(orbDot);
        }
        const galSideGeo = trackRimGeo(
          new THREE.TorusGeometry(rRadius * 1.15, 0.017, 10, 32),
        );
        galSideGeo.rotateY(Math.PI / 2);
        const galSide = new THREE.Mesh(galSideGeo, wheelGlowPrimaryMat);
        galSide.position.x = sidewallX;
        rimGroup.add(galSide);
      } else if (style === 'triBlade') {
        // Chunky 3-spoke retro JDM street drift wheels
        const xIn = side * (tWidth * 0.34);
        const xOut = side * (tWidth * 0.46);
        for (let s = 0; s < 3; s++) {
          const a = (s * Math.PI * 2) / 3;
          for (const off of [-0.14, 0, 0.14]) {
            addSpokeSeg3D(
              rimGroup,
              spokeUnit,
              xIn,
              Math.cos(a + off * 0.65) * rRadius * 0.22,
              Math.sin(a + off * 0.65) * rRadius * 0.22,
              xOut,
              Math.cos(a + off) * rRadius * 0.94,
              Math.sin(a + off) * rRadius * 0.94,
              0.044,
              0.032,
              alloyMat,
            );
          }
        }
      } else if (style === 'meshBBS') {
        // Iconic 16-spoke cross-lace BBS motorsport mesh + center lock ring
        const xIn = side * (tWidth * 0.36);
        const xOut = side * (tWidth * 0.462);
        const midRingGeo = trackRimGeo(new THREE.TorusGeometry(rRadius * 0.56, 0.012, 8, 24));
        midRingGeo.rotateY(Math.PI / 2);
        const midRing = new THREE.Mesh(midRingGeo, alloyMat);
        midRing.position.x = side * (tWidth * 0.415);
        rimGroup.add(midRing);
        for (let s = 0; s < 8; s++) {
          const a = (s * Math.PI * 2) / 8;
          for (const dir of [-1, 1]) {
            addSpokeSeg3D(
              rimGroup,
              spokeUnit,
              xIn,
              Math.cos(a) * rRadius * 0.22,
              Math.sin(a) * rRadius * 0.22,
              xOut,
              Math.cos(a + dir * 0.28) * rRadius * 0.95,
              Math.sin(a + dir * 0.28) * rRadius * 0.95,
              0.015,
              0.017,
              alloyMat,
            );
          }
        }
      } else if (style === 'hexMono') {
        // Forged 6-window monoblock dish rim
        const discGeo = trackRimGeo(new THREE.CylinderGeometry(rRadius * 0.88, rRadius * 0.88, 0.03, 6));
        discGeo.rotateZ(Math.PI / 2);
        const disc = new THREE.Mesh(discGeo, alloyMat);
        disc.position.x = side * (tWidth * 0.41);
        rimGroup.add(disc);
        const xOut = side * (tWidth * 0.455);
        for (let s = 0; s < 6; s++) {
          const a = (s * Math.PI * 2) / 6;
          addSpokeSeg3D(
            rimGroup,
            spokeUnit,
            side * (tWidth * 0.42),
            Math.cos(a) * rRadius * 0.24,
            Math.sin(a) * rRadius * 0.24,
            xOut,
            Math.cos(a) * rRadius * 0.96,
            Math.sin(a) * rRadius * 0.96,
            0.038,
            0.024,
            chromeMat,
          );
        }
      } else if (style === 'animVenomRing') {
        // Spinning toxic lime bio-blades + glowing emerald sidewall ring
        const spin = new THREE.Group();
        rimGroup.add(spin);
        wheelAnimSpinners.push({ group: spin, speed: side * 3.1 });
        for (let s = 0; s < 5; s++) {
          const a = (s * Math.PI * 2) / 5;
          addSpokeSeg3D(
            spin,
            spokeUnit,
            side * (tWidth * 0.42),
            Math.cos(a) * rRadius * 0.16,
            Math.sin(a) * rRadius * 0.16,
            side * (tWidth * 0.46),
            Math.cos(a + 0.42) * rRadius * 0.9,
            Math.sin(a + 0.42) * rRadius * 0.9,
            0.024,
            0.022,
            wheelGlowPrimaryMat,
          );
        }
        const innerRingGeo = trackRimGeo(new THREE.TorusGeometry(rRadius * 0.54, 0.016, 10, 22));
        innerRingGeo.rotateY(Math.PI / 2);
        const innerRing = new THREE.Mesh(innerRingGeo, wheelGlowSecondaryMat);
        innerRing.position.x = side * (tWidth * 0.45);
        spin.add(innerRing);
        const sideGeo = trackRimGeo(new THREE.TorusGeometry(rRadius * 1.15, 0.017, 10, 32));
        sideGeo.rotateY(Math.PI / 2);
        const sideRing = new THREE.Mesh(sideGeo, wheelGlowPrimaryMat);
        sideRing.position.x = sidewallX;
        rimGroup.add(sideRing);
      } else if (style === 'animRubyPulse') {
        // Counter-rotating crimson-gold ruby turbine + pulsing octahedron core
        const turbA = new THREE.Group();
        rimGroup.add(turbA);
        wheelAnimSpinners.push({ group: turbA, speed: side * 2.8 });
        for (let s = 0; s < 6; s++) {
          const a = (s * Math.PI * 2) / 6;
          addSpokeSeg3D(
            turbA,
            spokeUnit,
            side * (tWidth * 0.41),
            Math.cos(a) * rRadius * 0.2,
            Math.sin(a) * rRadius * 0.2,
            side * (tWidth * 0.46),
            Math.cos(a - 0.34) * rRadius * 0.92,
            Math.sin(a - 0.34) * rRadius * 0.92,
            0.022,
            0.02,
            wheelGlowPrimaryMat,
          );
        }
        const turbB = new THREE.Group();
        rimGroup.add(turbB);
        wheelAnimSpinners.push({ group: turbB, speed: -side * 4.0 });
        const goldRingGeo = trackRimGeo(new THREE.TorusGeometry(rRadius * 0.62, 0.016, 10, 24));
        goldRingGeo.rotateY(Math.PI / 2);
        const goldRing = new THREE.Mesh(goldRingGeo, wheelGlowSecondaryMat);
        goldRing.position.x = side * (tWidth * 0.445);
        turbB.add(goldRing);
        const rubyCore = new THREE.Mesh(
          trackRimGeo(new THREE.OctahedronGeometry(rRadius * 0.23, 0)),
          wheelGlowPrimaryMat,
        );
        rubyCore.position.x = side * (tWidth * 0.435);
        turbB.add(rubyCore);
        const sideGeo = trackRimGeo(new THREE.TorusGeometry(rRadius * 1.15, 0.017, 10, 32));
        sideGeo.rotateY(Math.PI / 2);
        const sideRing = new THREE.Mesh(sideGeo, wheelGlowPrimaryMat);
        sideRing.position.x = sidewallX;
        rimGroup.add(sideRing);
      } else {
        // twin5: 5 distinct V-twin spoke pairs
        const xIn = side * (tWidth * 0.36);
        const xOut = side * (tWidth * 0.458);
        for (let s = 0; s < 5; s++) {
          const baseAng = (s * Math.PI * 2) / 5;
          for (const sgn of [-1, 1]) {
            const innerA = baseAng + sgn * 0.08;
            const outerA = baseAng + sgn * 0.21;
            addSpokeSeg3D(
              rimGroup,
              spokeUnit,
              xIn,
              Math.cos(innerA) * rRadius * 0.18,
              Math.sin(innerA) * rRadius * 0.18,
              xOut,
              Math.cos(outerA) * rRadius * 0.96,
              Math.sin(outerA) * rRadius * 0.96,
              0.025,
              0.025,
              alloyMat,
            );
          }
        }
      }
    }
    activeWheelStyle = style;
  };
  rebuildWheelRims(initialWheel.style);

  const setWheelConfig = (style: WheelStyleId, colorId: WheelColorId): void => {
    const colorOpt = WHEEL_COLORS.find((c) => c.id === colorId) || WHEEL_COLORS[0];
    activeWheelColorHex = colorOpt.hex;
    alloyMat.color.setHex(colorOpt.hex);
    alloyMat.metalness = colorOpt.metalness;
    alloyMat.roughness = colorOpt.roughness;
    alloyMat.needsUpdate = true;
    syncAnimatedWheelColors(style, activeWheelColorHex);
    if (style !== activeWheelStyle) {
      rebuildWheelRims(style);
    }
  };

  // 6. Ground Contact Shadow Plane
  const shadowPlaneGeo = trackGeo(new THREE.PlaneGeometry(2.75, 5.25));
  shadowPlaneGeo.rotateX(-Math.PI / 2);
  const shadowPlaneMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: contactShadowMap,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  const contactShadow = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
  contactShadow.position.y = 0.025;
  root.add(contactShadow);

  // 6b. Underbody Neon Kit (uses shared pre-baked outer & inner SDF spill textures)
  const underglowOuterMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: underglowOuterTex,
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    }),
  );
  const underglowInnerMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: underglowInnerTex,
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    }),
  );
  const underglowStripMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x22d3ee,
      emissiveIntensity: 2.2,
      roughness: 0.25,
      metalness: 0.1,
    }),
  );

  const underglowGroup = new THREE.Group();
  const carLengthApprox =
    bp.stations[bp.stations.length - 1].z - bp.stations[0].z;
  const outerSpillGeo = trackGeo(
    new THREE.PlaneGeometry(bodyWidth * 2.28, carLengthApprox * 1.48),
  );
  outerSpillGeo.rotateX(-Math.PI / 2);
  const outerSpillMesh = new THREE.Mesh(outerSpillGeo, underglowOuterMat);
  outerSpillMesh.position.y = 0.029;
  underglowGroup.add(outerSpillMesh);

  const innerSpillGeo = trackGeo(
    new THREE.PlaneGeometry(bodyWidth * 1.56, carLengthApprox * 1.18),
  );
  innerSpillGeo.rotateX(-Math.PI / 2);
  const innerSpillMesh = new THREE.Mesh(innerSpillGeo, underglowInnerMat);
  innerSpillMesh.position.y = 0.032;
  underglowGroup.add(innerSpillMesh);

  // Real dynamic PointLight under chassis to bathe turntable, tires & asphalt in realistic neon bounce
  // Skipped on mobile/softwareGL where 2-layer additive spill planes already deliver vivid neon at zero per-pixel shader cost
  const underglowLight = new THREE.PointLight(0x22d3ee, 0, 6.8, 1.8);
  underglowLight.position.set(0, 0.24, 0);
  if (!isSoftwareGl) {
    underglowGroup.add(underglowLight);
  }

  // Subtle recessed slim LED filament strips tucked cleanly INSIDE the rocker sills
  const sideStripLen = wheelBaseHalf * 1.38;
  const sideStripGeo = trackGeo(new THREE.BoxGeometry(0.02, 0.014, sideStripLen));
  const neonStripY = Math.max(0.145, bp.stations[0].bottomY + 0.01);
  for (const side of [-1, 1]) {
    const strip = new THREE.Mesh(sideStripGeo, underglowStripMat);
    strip.position.set(side * (bodyWidth * 0.39), neonStripY, 0);
    underglowGroup.add(strip);
  }
  underglowGroup.visible = false;
  root.add(underglowGroup);

  // 7. Forward Projecting Headlight SpotLights + Optical Anamorphic Lens Flares + Soft Ground Beam Projection
  const getHeadlightAnchors = (): {
    x: number;
    y: number;
    z: number;
    enabled: boolean;
  } => {
    const fSt = bp.stations[0];
    const fZ = fSt.z;
    switch (modelId) {
      case 'f1':
        return { x: 0.4, y: 0.4, z: fZ, enabled: false };
      case 'dogan':
        return { x: 0.61, y: 0.6, z: fZ - 0.06, enabled: true };
      case 'm3gtr':
        return { x: 0.62, y: 0.58, z: fZ - 0.06, enabled: true };
      case 'porsche':
        return { x: 0.67, y: 0.61, z: fZ + 0.08, enabled: true };
      case 'bugatti':
        return { x: 0.65, y: 0.54, z: fZ - 0.06, enabled: true };
      case 'pickup':
        return { x: 0.77, y: 0.86, z: fZ - 0.07, enabled: true };
      case 'lambo':
        return { x: 0.67, y: 0.44, z: fZ + 0.06, enabled: true };
      case 'mclarenp1':
        return { x: 0.66, y: 0.46, z: fZ + 0.07, enabled: true };
      case 'pagani':
        return { x: 0.68, y: 0.49, z: fZ + 0.06, enabled: true };
      case 'bolide':
        return { x: 0.69, y: 0.44, z: fZ + 0.06, enabled: true };
      case 'solaris':
        return { x: 0.72, y: 0.43, z: fZ + 0.02, enabled: true };
      default:
        return {
          x: fSt.beltHalfW * 0.72,
          y: fSt.beltY - 0.04,
          z: fZ - 0.01,
          enabled: true,
        };
    }
  };
  const hlAnchor = getHeadlightAnchors();

  const makeSpot = (x: number): [THREE.SpotLight, THREE.Object3D] => {
    const spot = new THREE.SpotLight(0xfff4d6, 36, 95, Math.PI / 4.4, 0.6, 1.3);
    spot.position.set(x, hlAnchor.y, hlAnchor.z - 0.04);
    const target = new THREE.Object3D();
    target.position.set(x * 0.85, 0.0, -32);
    if (!isSoftwareGl) {
      chassisGroup.add(spot);
      chassisGroup.add(target);
    }
    spot.target = target;
    return [spot, target];
  };
  const [spotL, targetL] = makeSpot(-hlAnchor.x);
  const [spotR, targetR] = makeSpot(hlAnchor.x);

  // Headlight flare & ground beam use shared pre-baked static textures
  const headFlareMat = trackMat(
    new THREE.SpriteMaterial({
      map: headFlareTex,
      color: 0xfff3d1,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
    }),
  );

  const headFlareSprites: THREE.Sprite[] = [];
  if (hlAnchor.enabled) {
    for (const side of [-1, 1]) {
      const sprite = new THREE.Sprite(headFlareMat);
      sprite.position.set(side * hlAnchor.x, hlAnchor.y, hlAnchor.z - 0.04);
      sprite.scale.set(0.62, 0.52, 1);
      chassisGroup.add(sprite);
      headFlareSprites.push(sprite);
    }
  }

  const headBeamGroundMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: headBeamGroundTex,
      color: 0xfff4d6,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    }),
  );
  const headBeamGeo = trackGeo(new THREE.PlaneGeometry(5.1, 6.8));
  headBeamGeo.rotateX(-Math.PI / 2);
  const headBeamGroundMesh = new THREE.Mesh(headBeamGeo, headBeamGroundMat);
  headBeamGroundMesh.position.set(0, 0.027, bp.stations[0].z - 3.45);
  headBeamGroundMesh.visible = hlAnchor.enabled;
  root.add(headBeamGroundMesh);

  let headlightGlowScale = 0.85;

  // 8. Customizable Front & Rear License Plates with 5 Selectable Frame Styles
  const plateCanvas = document.createElement('canvas');
  plateCanvas.width = 512;
  plateCanvas.height = 128;
  const plateCtx = plateCanvas.getContext('2d');
  const plateTexture = new THREE.CanvasTexture(plateCanvas);
  plateTexture.colorSpace = THREE.SRGBColorSpace;
  plateTexture.anisotropy = 4;

  const plateFrameMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x111216,
      roughness: 0.62,
      metalness: 0.2,
      emissive: 0x000000,
      emissiveIntensity: 0,
    }),
  );

  const plateMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: plateTexture,
      emissive: 0xffffff,
      emissiveMap: plateTexture,
      emissiveIntensity: 0.42,
      roughness: 0.34,
      metalness: 0.06,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );

  const isAnimatedPlateStyle = (style: PlateStyleId): boolean =>
    style === 'animRgbChase' ||
    style === 'animPoliceStrobe' ||
    style === 'animCyberMatrix' ||
    style === 'animKnightScan' ||
    style === 'animFlameBorder' ||
    style === 'animHoloPrism' ||
    style === 'animStealthFlip' ||
    style === 'apexChampionPlate' ||
    style === 'animGoldPulse' ||
    style === 'animCyberLightning';

  let currentPlateText = initialPlate;
  let lastAnimPlateDrawSec = -10;
  const drawLicensePlate = (
    rawText: string,
    style: PlateStyleId = currentCustom?.plateStyle ?? 'classic',
    animTimeSec = 0,
  ): void => {
    currentPlateText = rawText;
    if (!plateCtx) return;
    const cleaned = rawText
      .trim()
      .replace(/\s+/g, ' ')
      .toLocaleUpperCase('tr-TR')
      .slice(0, 10);
    const label = cleaned || 'VİRAJ 34';
    const fontSize = label.length <= 6 ? 70 : label.length <= 8 ? 58 : 48;

    plateCtx.save();
    plateCtx.shadowBlur = 0;
    plateCtx.shadowColor = 'transparent';

    if (style === 'vipBlack') {
      // Matte jet-black VIP plate with crisp metallic silver trim
      plateCtx.fillStyle = '#09090b';
      plateCtx.fillRect(0, 0, 512, 128);
      plateCtx.strokeStyle = '#e4e4e7';
      plateCtx.lineWidth = 7;
      plateCtx.strokeRect(5, 5, 502, 118);
      plateCtx.fillStyle = '#18181b';
      plateCtx.fillRect(10, 10, 56, 108);
      plateCtx.fillStyle = '#e4e4e7';
      plateCtx.font = 'bold 24px "Oxanium", "Arial Black", sans-serif';
      plateCtx.textAlign = 'center';
      plateCtx.textBaseline = 'middle';
      plateCtx.fillText('VIP', 38, 86);
      plateCtx.fillStyle = '#facc15';
      plateCtx.font = 'bold 26px sans-serif';
      plateCtx.fillText('★', 38, 38);
      plateCtx.fillStyle = '#f8fafc';
      plateCtx.font = `800 ${fontSize}px "Oxanium", "JetBrains Mono", "Arial Black", sans-serif`;
      plateCtx.fillText(label, 288, 67, 416);

      plateFrameMat.color.setHex(0x09090b);
      plateFrameMat.metalness = 0.72;
      plateFrameMat.roughness = 0.16;
      plateFrameMat.emissive.setHex(0x000000);
      plateFrameMat.emissiveIntensity = 0;
      plateMat.emissiveIntensity = 0.68;
    } else if (style === 'goldFrame') {
      // 24K brushed gold double frame on obsidian plate
      const bgGrad = plateCtx.createLinearGradient(0, 0, 512, 128);
      bgGrad.addColorStop(0, '#18130a');
      bgGrad.addColorStop(0.5, '#09090b');
      bgGrad.addColorStop(1, '#1c1508');
      plateCtx.fillStyle = bgGrad;
      plateCtx.fillRect(0, 0, 512, 128);
      const goldGrad = plateCtx.createLinearGradient(0, 0, 512, 0);
      goldGrad.addColorStop(0, '#b45309');
      goldGrad.addColorStop(0.3, '#fde047');
      goldGrad.addColorStop(0.65, '#f59e0b');
      goldGrad.addColorStop(1, '#fef08a');
      plateCtx.strokeStyle = goldGrad;
      plateCtx.lineWidth = 10;
      plateCtx.strokeRect(5, 5, 502, 118);
      plateCtx.fillStyle = '#b45309';
      plateCtx.fillRect(12, 12, 54, 104);
      plateCtx.fillStyle = '#fef9c3';
      plateCtx.font = 'bold 24px "Oxanium", "Arial Black", sans-serif';
      plateCtx.textAlign = 'center';
      plateCtx.textBaseline = 'middle';
      plateCtx.fillText('TR', 39, 86);
      plateCtx.strokeStyle = '#fef08a';
      plateCtx.lineWidth = 2.5;
      plateCtx.beginPath();
      plateCtx.arc(39, 38, 11, 0, Math.PI * 2);
      plateCtx.stroke();
      plateCtx.fillStyle = '#fde047';
      plateCtx.font = `800 ${fontSize}px "Oxanium", "JetBrains Mono", "Arial Black", sans-serif`;
      plateCtx.fillText(label, 288, 67, 412);

      plateFrameMat.color.setHex(0xeab308);
      plateFrameMat.metalness = 0.94;
      plateFrameMat.roughness = 0.14;
      plateFrameMat.emissive.setHex(0x451a03);
      plateFrameMat.emissiveIntensity = 0.25;
      plateMat.emissiveIntensity = 0.72;
    } else if (style === 'carbonPlate') {
      // Carbon weave plate with motorsport crimson stripe
      plateCtx.fillStyle = '#18181b';
      plateCtx.fillRect(0, 0, 512, 128);
      const cell = 8;
      for (let py = 0; py < 128; py += cell) {
        for (let px = 0; px < 512; px += cell) {
          plateCtx.fillStyle =
            (((px / cell) + (py / cell)) & 1) === 0 ? '#27272a' : '#111216';
          plateCtx.fillRect(px, py, cell, cell);
        }
      }
      plateCtx.strokeStyle = '#ef4444';
      plateCtx.lineWidth = 8;
      plateCtx.strokeRect(4, 4, 504, 120);
      plateCtx.fillStyle = '#dc2626';
      plateCtx.fillRect(8, 8, 56, 112);
      plateCtx.fillStyle = '#ffffff';
      plateCtx.font = 'bold 24px "Oxanium", "Arial Black", sans-serif';
      plateCtx.textAlign = 'center';
      plateCtx.textBaseline = 'middle';
      plateCtx.fillText('GT', 36, 86);
      plateCtx.fillStyle = '#fef08a';
      plateCtx.fillRect(22, 30, 28, 8);
      plateCtx.fillStyle = '#f8fafc';
      plateCtx.font = `800 ${fontSize}px "Oxanium", "JetBrains Mono", "Arial Black", sans-serif`;
      plateCtx.fillText(label, 286, 67, 414);

      plateFrameMat.color.setHex(0x27272a);
      plateFrameMat.metalness = 0.52;
      plateFrameMat.roughness = 0.3;
      plateFrameMat.emissive.setHex(0x7f1d1d);
      plateFrameMat.emissiveIntensity = 0.18;
      plateMat.emissiveIntensity = 0.68;
    } else if (style === 'neonGlow') {
      // Deep midnight plate with glowing cyan LED perimeter and backlit letters
      plateCtx.fillStyle = '#041222';
      plateCtx.fillRect(0, 0, 512, 128);
      plateCtx.shadowColor = '#22d3ee';
      plateCtx.shadowBlur = 16;
      plateCtx.strokeStyle = '#22d3ee';
      plateCtx.lineWidth = 9;
      plateCtx.strokeRect(6, 6, 500, 116);
      plateCtx.fillStyle = '#083344';
      plateCtx.fillRect(12, 12, 54, 104);
      plateCtx.fillStyle = '#67e8f9';
      plateCtx.font = 'bold 24px "Oxanium", "Arial Black", sans-serif';
      plateCtx.textAlign = 'center';
      plateCtx.textBaseline = 'middle';
      plateCtx.fillText('TR', 39, 86);
      plateCtx.strokeStyle = '#a855f7';
      plateCtx.lineWidth = 3;
      plateCtx.beginPath();
      plateCtx.arc(39, 36, 11, 0, Math.PI * 2);
      plateCtx.stroke();
      plateCtx.shadowColor = '#38bdf8';
      plateCtx.shadowBlur = 14;
      plateCtx.fillStyle = '#ecfeff';
      plateCtx.font = `800 ${fontSize}px "Oxanium", "JetBrains Mono", "Arial Black", sans-serif`;
      plateCtx.fillText(label, 288, 67, 412);

      plateFrameMat.color.setHex(0x06b6d4);
      plateFrameMat.metalness = 0.2;
      plateFrameMat.roughness = 0.2;
      plateFrameMat.emissive.setHex(0x22d3ee);
      plateFrameMat.emissiveIntensity = 1.65;
      plateMat.emissiveIntensity = 1.25;
    } else if (style === 'jdmTokyo') {
      // Authentic Tokyo White/Forest-Green JDM Street Plate
      plateCtx.fillStyle = '#f8fafc';
      plateCtx.fillRect(0, 0, 512, 128);
      plateCtx.strokeStyle = '#14532d';
      plateCtx.lineWidth = 8;
      plateCtx.strokeRect(5, 5, 502, 118);
      plateCtx.fillStyle = '#166534';
      plateCtx.font = 'bold 20px "Oxanium", "Arial Black", sans-serif';
      plateCtx.textAlign = 'center';
      plateCtx.textBaseline = 'middle';
      plateCtx.fillText('TOKYO · 330', 256, 26);
      plateCtx.fillStyle = '#94a3b8';
      plateCtx.beginPath();
      plateCtx.arc(104, 26, 7, 0, Math.PI * 2);
      plateCtx.arc(408, 26, 7, 0, Math.PI * 2);
      plateCtx.fill();
      plateCtx.fillStyle = '#14532d';
      plateCtx.font = `800 ${Math.min(fontSize, 52)}px "Oxanium", "JetBrains Mono", "Arial Black", sans-serif`;
      plateCtx.fillText(label, 256, 80, 444);

      plateFrameMat.color.setHex(0x14532d);
      plateFrameMat.metalness = 0.38;
      plateFrameMat.roughness = 0.34;
      plateFrameMat.emissive.setHex(0x000000);
      plateFrameMat.emissiveIntensity = 0;
      plateMat.emissiveIntensity = 0.6;
    } else if (style === 'dubaiLux') {
      // Minimalist Luxury White Dubai VIP Plate
      plateCtx.fillStyle = '#ffffff';
      plateCtx.fillRect(0, 0, 512, 128);
      plateCtx.strokeStyle = '#d4af37';
      plateCtx.lineWidth = 7;
      plateCtx.strokeRect(5, 5, 502, 118);
      plateCtx.fillStyle = '#0f172a';
      plateCtx.fillRect(10, 10, 96, 108);
      plateCtx.fillStyle = '#facc15';
      plateCtx.font = '800 22px "Oxanium", "Arial Black", sans-serif';
      plateCtx.textAlign = 'center';
      plateCtx.textBaseline = 'middle';
      plateCtx.fillText('DUBAI', 58, 52);
      plateCtx.fillStyle = '#e2e8f0';
      plateCtx.font = 'bold 18px "Oxanium", sans-serif';
      plateCtx.fillText('VIP', 58, 84);
      plateCtx.fillStyle = '#09090b';
      plateCtx.font = `800 ${fontSize}px "Oxanium", "JetBrains Mono", "Arial Black", sans-serif`;
      plateCtx.fillText(label, 304, 67, 384);

      plateFrameMat.color.setHex(0xe5e7eb);
      plateFrameMat.metalness = 0.88;
      plateFrameMat.roughness = 0.14;
      plateFrameMat.emissive.setHex(0x000000);
      plateFrameMat.emissiveIntensity = 0;
      plateMat.emissiveIntensity = 0.64;
    } else if (style === 'crimsonNeon') {
      // Deep Obsidian Plate with Glowing Crimson LED Border
      plateCtx.fillStyle = '#130408';
      plateCtx.fillRect(0, 0, 512, 128);
      plateCtx.shadowColor = '#f43f5e';
      plateCtx.shadowBlur = 18;
      plateCtx.strokeStyle = '#fb7185';
      plateCtx.lineWidth = 9;
      plateCtx.strokeRect(6, 6, 500, 116);
      plateCtx.fillStyle = '#4c0519';
      plateCtx.fillRect(12, 12, 54, 104);
      plateCtx.fillStyle = '#fda4af';
      plateCtx.font = 'bold 24px "Oxanium", "Arial Black", sans-serif';
      plateCtx.textAlign = 'center';
      plateCtx.textBaseline = 'middle';
      plateCtx.fillText('TR', 39, 86);
      plateCtx.fillStyle = '#fff1f2';
      plateCtx.shadowColor = '#f43f5e';
      plateCtx.shadowBlur = 14;
      plateCtx.font = `800 ${fontSize}px "Oxanium", "JetBrains Mono", "Arial Black", sans-serif`;
      plateCtx.fillText(label, 288, 67, 412);

      plateFrameMat.color.setHex(0xe11d48);
      plateFrameMat.metalness = 0.25;
      plateFrameMat.roughness = 0.18;
      plateFrameMat.emissive.setHex(0xf43f5e);
      plateFrameMat.emissiveIntensity = 1.65;
      plateMat.emissiveIntensity = 1.2;
    } else if (style === 'imperialGold') {
      // Matte Black & 24K Imperial Gold Edition Plate
      const bgGrad = plateCtx.createLinearGradient(0, 0, 512, 128);
      bgGrad.addColorStop(0, '#09090b');
      bgGrad.addColorStop(0.5, '#1c1917');
      bgGrad.addColorStop(1, '#09090b');
      plateCtx.fillStyle = bgGrad;
      plateCtx.fillRect(0, 0, 512, 128);
      const goldBorder = plateCtx.createLinearGradient(0, 0, 512, 0);
      goldBorder.addColorStop(0, '#a16207');
      goldBorder.addColorStop(0.5, '#fef08a');
      goldBorder.addColorStop(1, '#ca8a04');
      plateCtx.strokeStyle = goldBorder;
      plateCtx.lineWidth = 10;
      plateCtx.strokeRect(5, 5, 502, 118);
      plateCtx.fillStyle = '#292524';
      plateCtx.fillRect(12, 12, 56, 104);
      plateCtx.fillStyle = '#fde047';
      plateCtx.font = 'bold 24px "Oxanium", "Arial Black", sans-serif';
      plateCtx.textAlign = 'center';
      plateCtx.textBaseline = 'middle';
      plateCtx.fillText('24K', 40, 66);
      plateCtx.fillStyle = goldBorder;
      plateCtx.font = `800 ${fontSize}px "Oxanium", "JetBrains Mono", "Arial Black", sans-serif`;
      plateCtx.fillText(label, 288, 67, 410);

      plateFrameMat.color.setHex(0xfacc15);
      plateFrameMat.metalness = 0.96;
      plateFrameMat.roughness = 0.14;
      plateFrameMat.emissive.setHex(0x854d0e);
      plateFrameMat.emissiveIntensity = 0.55;
      plateMat.emissiveIntensity = 0.72;
    } else if (style === 'vintageRetro') {
      // Vintage 1980s cream parchment plate with espresso border & riveted classic charm
      const bgGrad = plateCtx.createLinearGradient(0, 0, 0, 128);
      bgGrad.addColorStop(0, '#fef3c7');
      bgGrad.addColorStop(0.55, '#f5e2b8');
      bgGrad.addColorStop(1, '#e2c792');
      plateCtx.fillStyle = bgGrad;
      plateCtx.fillRect(0, 0, 512, 128);
      plateCtx.strokeStyle = '#78350f';
      plateCtx.lineWidth = 8;
      plateCtx.strokeRect(6, 6, 500, 116);
      plateCtx.strokeStyle = '#b45309';
      plateCtx.lineWidth = 2;
      plateCtx.strokeRect(14, 14, 484, 100);
      plateCtx.fillStyle = '#9a3412';
      plateCtx.font = '800 17px "Oxanium", "Arial Black", sans-serif';
      plateCtx.textAlign = 'center';
      plateCtx.textBaseline = 'middle';
      plateCtx.fillText('KLASİK · 1984', 256, 26);
      plateCtx.fillStyle = '#3b1a06';
      plateCtx.font = `800 ${Math.min(fontSize, 54)}px "Oxanium", "JetBrains Mono", "Arial Black", sans-serif`;
      plateCtx.fillText(label, 256, 78, 438);

      plateFrameMat.color.setHex(0x5c2d0c);
      plateFrameMat.metalness = 0.55;
      plateFrameMat.roughness = 0.36;
      plateFrameMat.emissive.setHex(0x000000);
      plateFrameMat.emissiveIntensity = 0;
      plateMat.emissiveIntensity = 0.58;
    } else if (style === 'californiaSunset') {
      // West-coast sunset gradient plate with glowing sun & twin palm silhouettes
      const bgGrad = plateCtx.createLinearGradient(0, 0, 0, 128);
      bgGrad.addColorStop(0, '#fb923c');
      bgGrad.addColorStop(0.42, '#f43f5e');
      bgGrad.addColorStop(0.78, '#7e22ce');
      bgGrad.addColorStop(1, '#2e1065');
      plateCtx.fillStyle = bgGrad;
      plateCtx.fillRect(0, 0, 512, 128);
      // Warm horizon sun
      plateCtx.fillStyle = 'rgba(254, 240, 138, 0.72)';
      plateCtx.beginPath();
      plateCtx.arc(256, 42, 26, 0, Math.PI * 2);
      plateCtx.fill();
      // Subtle palm silhouettes on far left and right
      plateCtx.fillStyle = 'rgba(24, 9, 36, 0.55)';
      plateCtx.fillRect(28, 48, 6, 72);
      plateCtx.fillRect(478, 52, 6, 68);
      for (let a = -2; a <= 2; a++) {
        plateCtx.beginPath();
        plateCtx.ellipse(31 + a * 9, 46 + Math.abs(a) * 3, 14, 3.5, a * 0.32, 0, Math.PI * 2);
        plateCtx.fill();
        plateCtx.beginPath();
        plateCtx.ellipse(481 + a * 9, 50 + Math.abs(a) * 3, 13, 3.5, a * 0.32, 0, Math.PI * 2);
        plateCtx.fill();
      }
      plateCtx.strokeStyle = '#fed7aa';
      plateCtx.lineWidth = 7;
      plateCtx.strokeRect(5, 5, 502, 118);
      plateCtx.fillStyle = '#fef3c7';
      plateCtx.font = '800 17px "Oxanium", "Arial Black", sans-serif';
      plateCtx.textAlign = 'center';
      plateCtx.textBaseline = 'middle';
      plateCtx.fillText('SUNSET COAST', 256, 23);
      plateCtx.lineWidth = 5;
      plateCtx.strokeStyle = 'rgba(30, 10, 48, 0.85)';
      plateCtx.font = `800 ${Math.min(fontSize, 54)}px "Oxanium", "JetBrains Mono", "Arial Black", sans-serif`;
      plateCtx.strokeText(label, 256, 80, 420);
      plateCtx.fillStyle = '#fff7ed';
      plateCtx.fillText(label, 256, 80, 420);

      plateFrameMat.color.setHex(0xe2e8f0);
      plateFrameMat.metalness = 0.86;
      plateFrameMat.roughness = 0.2;
      plateFrameMat.emissive.setHex(0x431407);
      plateFrameMat.emissiveIntensity = 0.16;
      plateMat.emissiveIntensity = 0.78;
    } else if (style === 'nurburgringTrack') {
      // Motorsport checkered-flag track plate with yellow racing stripes
      plateCtx.fillStyle = '#141418';
      plateCtx.fillRect(0, 0, 512, 128);
      // Checkered flag columns left & right
      const sq = 12;
      for (let r = 0; r < 11; r++) {
        for (let c = 0; c < 3; c++) {
          const isWhite = ((r + c) & 1) === 0;
          plateCtx.fillStyle = isWhite ? '#f4f4f5' : '#18181b';
          plateCtx.fillRect(8 + c * sq, 8 + r * sq, sq, sq);
          plateCtx.fillRect(468 + c * sq, 8 + r * sq, sq, sq);
        }
      }
      plateCtx.fillStyle = '#facc15';
      plateCtx.fillRect(44, 8, 424, 16);
      plateCtx.fillRect(44, 104, 424, 16);
      plateCtx.strokeStyle = '#facc15';
      plateCtx.lineWidth = 6;
      plateCtx.strokeRect(4, 4, 504, 120);
      plateCtx.fillStyle = '#09090b';
      plateCtx.font = '800 13px "Oxanium", "Arial Black", sans-serif';
      plateCtx.textAlign = 'center';
      plateCtx.textBaseline = 'middle';
      plateCtx.fillText('TRACK EDITION · GT SERIES', 256, 16);
      plateCtx.fillStyle = '#fef08a';
      plateCtx.font = `800 ${Math.min(fontSize, 54)}px "Oxanium", "JetBrains Mono", "Arial Black", sans-serif`;
      plateCtx.fillText(label, 256, 65, 404);

      plateFrameMat.color.setHex(0x18181b);
      plateFrameMat.metalness = 0.56;
      plateFrameMat.roughness = 0.28;
      plateFrameMat.emissive.setHex(0x422006);
      plateFrameMat.emissiveIntensity = 0.22;
      plateMat.emissiveIntensity = 0.72;
    } else if (style === 'roseGoldChrome') {
      // Luxury Rose-Gold Mirror Chrome plate with diamond corner flourishes
      const bgGrad = plateCtx.createLinearGradient(0, 0, 512, 128);
      bgGrad.addColorStop(0, '#170a10');
      bgGrad.addColorStop(0.5, '#2b121d');
      bgGrad.addColorStop(1, '#170a10');
      plateCtx.fillStyle = bgGrad;
      plateCtx.fillRect(0, 0, 512, 128);
      const rgGrad = plateCtx.createLinearGradient(0, 0, 512, 128);
      rgGrad.addColorStop(0, '#be185d');
      rgGrad.addColorStop(0.32, '#fda4af');
      rgGrad.addColorStop(0.65, '#f43f5e');
      rgGrad.addColorStop(1, '#ffe4e6');
      plateCtx.strokeStyle = rgGrad;
      plateCtx.lineWidth = 9;
      plateCtx.strokeRect(5, 5, 502, 118);
      plateCtx.fillStyle = 'rgba(251, 113, 133, 0.18)';
      plateCtx.fillRect(12, 12, 56, 104);
      plateCtx.fillStyle = '#fda4af';
      plateCtx.font = '800 22px "Oxanium", "Arial Black", sans-serif';
      plateCtx.textAlign = 'center';
      plateCtx.textBaseline = 'middle';
      plateCtx.fillText('◆', 40, 42);
      plateCtx.font = '800 18px "Oxanium", sans-serif';
      plateCtx.fillText('LUX', 40, 82);
      plateCtx.fillStyle = '#ffe4e6';
      plateCtx.font = `800 ${fontSize}px "Oxanium", "JetBrains Mono", "Arial Black", sans-serif`;
      plateCtx.fillText(label, 288, 67, 412);

      plateFrameMat.color.setHex(0xfb7185);
      plateFrameMat.metalness = 0.96;
      plateFrameMat.roughness = 0.1;
      plateFrameMat.emissive.setHex(0x4c0519);
      plateFrameMat.emissiveIntensity = 0.35;
      plateMat.emissiveIntensity = 0.78;
    } else if (style === 'animRgbChase') {
      // Animated RGB Chasing LED Plate
      plateCtx.fillStyle = '#06070f';
      plateCtx.fillRect(0, 0, 512, 128);
      const hue0 = Math.floor((animTimeSec * 145) % 360);
      const hue1 = (hue0 + 120) % 360;
      const hue2 = (hue0 + 240) % 360;
      const rgbGrad = plateCtx.createLinearGradient(0, 0, 512, 128);
      rgbGrad.addColorStop(0, `hsl(${hue0}, 98%, 58%)`);
      rgbGrad.addColorStop(0.5, `hsl(${hue1}, 98%, 58%)`);
      rgbGrad.addColorStop(1, `hsl(${hue2}, 98%, 58%)`);
      plateCtx.shadowColor = `hsl(${hue1}, 98%, 58%)`;
      plateCtx.shadowBlur = 18;
      plateCtx.strokeStyle = rgbGrad;
      plateCtx.lineWidth = 10;
      plateCtx.strokeRect(6, 6, 500, 116);
      plateCtx.fillStyle = 'rgba(255,255,255,0.06)';
      plateCtx.fillRect(14, 14, 52, 100);
      plateCtx.fillStyle = `hsl(${hue0}, 98%, 72%)`;
      plateCtx.font = '800 22px "Oxanium", "Arial Black", sans-serif';
      plateCtx.textAlign = 'center';
      plateCtx.textBaseline = 'middle';
      plateCtx.fillText('RGB', 40, 66);
      plateCtx.shadowColor = `hsl(${hue2}, 96%, 62%)`;
      plateCtx.shadowBlur = 14;
      plateCtx.fillStyle = '#f8fafc';
      plateCtx.font = `800 ${fontSize}px "Oxanium", "JetBrains Mono", "Arial Black", sans-serif`;
      plateCtx.fillText(label, 288, 67, 410);

      plateFrameMat.color.setHex(0x111827);
      plateFrameMat.metalness = 0.4;
      plateFrameMat.roughness = 0.25;
      plateFrameMat.emissive.setHSL((animTimeSec * 0.4) % 1, 0.95, 0.52);
      plateFrameMat.emissiveIntensity = 0.95;
      plateMat.emissiveIntensity = 1.25;
    } else if (style === 'animPoliceStrobe') {
      // Animated Tactical Police Strobe Plate
      const phase = (animTimeSec * 6.4) % 2;
      const redFlash =
        phase < 1 && (phase < 0.28 || (phase > 0.42 && phase < 0.72));
      const blueFlash =
        phase >= 1 && (phase < 1.28 || (phase > 1.42 && phase < 1.72));

      plateCtx.fillStyle = '#070911';
      plateCtx.fillRect(0, 0, 512, 128);
      // Left red strobe wash & right blue strobe wash
      const leftGlow = plateCtx.createLinearGradient(0, 0, 210, 0);
      leftGlow.addColorStop(
        0,
        redFlash ? 'rgba(239, 68, 68, 0.85)' : 'rgba(239, 68, 68, 0.14)',
      );
      leftGlow.addColorStop(1, 'rgba(239, 68, 68, 0)');
      plateCtx.fillStyle = leftGlow;
      plateCtx.fillRect(8, 8, 220, 112);

      const rightGlow = plateCtx.createLinearGradient(512, 0, 302, 0);
      rightGlow.addColorStop(
        0,
        blueFlash ? 'rgba(59, 130, 246, 0.88)' : 'rgba(59, 130, 246, 0.14)',
      );
      rightGlow.addColorStop(1, 'rgba(59, 130, 246, 0)');
      plateCtx.fillStyle = rightGlow;
      plateCtx.fillRect(284, 8, 220, 112);

      plateCtx.strokeStyle = redFlash
        ? '#ef4444'
        : blueFlash
          ? '#3b82f6'
          : '#334155';
      plateCtx.lineWidth = 8;
      plateCtx.strokeRect(5, 5, 502, 118);

      plateCtx.fillStyle = '#cbd5e1';
      plateCtx.font = '800 15px "Oxanium", "Arial Black", sans-serif';
      plateCtx.textAlign = 'center';
      plateCtx.textBaseline = 'middle';
      plateCtx.fillText('INTERCEPTOR · UNIT 01', 256, 22);

      plateCtx.shadowColor = redFlash
        ? '#ef4444'
        : blueFlash
          ? '#60a5fa'
          : '#94a3b8';
      plateCtx.shadowBlur = 14;
      plateCtx.fillStyle = '#ffffff';
      plateCtx.font = `800 ${Math.min(fontSize, 56)}px "Oxanium", "JetBrains Mono", "Arial Black", sans-serif`;
      plateCtx.fillText(label, 256, 78, 438);

      plateFrameMat.color.setHex(0x111827);
      plateFrameMat.metalness = 0.45;
      plateFrameMat.roughness = 0.28;
      plateFrameMat.emissive.setHex(
        redFlash ? 0xef4444 : blueFlash ? 0x2563eb : 0x0f172a,
      );
      plateFrameMat.emissiveIntensity = redFlash || blueFlash ? 1.55 : 0.25;
      plateMat.emissiveIntensity = 1.25;
    } else if (style === 'animCyberMatrix') {
      // Live Falling Matrix Code Rain LED Screen Plate
      plateCtx.fillStyle = '#020e07';
      plateCtx.fillRect(0, 0, 512, 128);
      const glyphs = '01X9V7A3F5';
      plateCtx.font = '700 13px "JetBrains Mono", monospace';
      plateCtx.textAlign = 'center';
      plateCtx.textBaseline = 'middle';
      for (let col = 0; col < 26; col++) {
        const x = 16 + col * 19;
        const speed = 42 + (col * 17) % 38;
        const headY = ((animTimeSec * speed + col * 37) % 156) - 16;
        for (let t = 0; t < 4; t++) {
          const gy = headY - t * 14;
          if (gy < 10 || gy > 118) continue;
          const charIdx = Math.floor(col * 3 + t + animTimeSec * 8) % glyphs.length;
          plateCtx.fillStyle =
            t === 0
              ? 'rgba(187, 247, 208, 0.72)'
              : `rgba(34, 197, 94, ${0.42 - t * 0.09})`;
          plateCtx.fillText(glyphs[charIdx], x, gy);
        }
      }
      // Subtle horizontal scanline sweep
      const scanY = (animTimeSec * 64) % 128;
      plateCtx.fillStyle = 'rgba(74, 222, 128, 0.18)';
      plateCtx.fillRect(8, scanY, 496, 6);

      plateCtx.shadowColor = '#22c55e';
      plateCtx.shadowBlur = 16;
      plateCtx.strokeStyle = '#4ade80';
      plateCtx.lineWidth = 8;
      plateCtx.strokeRect(5, 5, 502, 118);

      // Dark backing pill behind plate characters for crisp readability
      plateCtx.shadowBlur = 0;
      plateCtx.fillStyle = 'rgba(2, 18, 9, 0.72)';
      plateCtx.fillRect(34, 28, 444, 72);

      plateCtx.shadowColor = '#22c55e';
      plateCtx.shadowBlur = 16;
      plateCtx.fillStyle = '#dcfce7';
      plateCtx.font = `800 ${fontSize}px "Oxanium", "JetBrains Mono", "Arial Black", sans-serif`;
      plateCtx.fillText(label, 256, 67, 428);

      plateFrameMat.color.setHex(0x052e16);
      plateFrameMat.metalness = 0.35;
      plateFrameMat.roughness = 0.25;
      plateFrameMat.emissive.setHex(0x22c55e);
      plateFrameMat.emissiveIntensity = 1.2;
      plateMat.emissiveIntensity = 1.25;
    } else if (style === 'animKnightScan') {
      // Sweeping Crimson Scanner Plate (Knight Rider / Synthwave Cyber)
      plateCtx.fillStyle = '#090406';
      plateCtx.fillRect(0, 0, 512, 128);
      // Faint dark crimson tech grid
      plateCtx.strokeStyle = 'rgba(239, 68, 68, 0.14)';
      plateCtx.lineWidth = 1;
      for (let gx = 32; gx < 512; gx += 32) {
        plateCtx.beginPath();
        plateCtx.moveTo(gx, 10);
        plateCtx.lineTo(gx, 118);
        plateCtx.stroke();
      }
      // Animated scanner sweep position
      const scanNorm = 0.5 + 0.5 * Math.sin(animTimeSec * 3.6);
      const scanX = 36 + scanNorm * 440;
      const trailGrad = plateCtx.createRadialGradient(
        scanX,
        14,
        4,
        scanX,
        14,
        115,
      );
      trailGrad.addColorStop(0, 'rgba(255, 228, 230, 1)');
      trailGrad.addColorStop(0.22, 'rgba(239, 68, 68, 0.95)');
      trailGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      plateCtx.fillStyle = trailGrad;
      plateCtx.fillRect(10, 6, 492, 16);
      plateCtx.fillRect(10, 106, 492, 16);

      plateCtx.strokeStyle = '#991b1b';
      plateCtx.lineWidth = 6;
      plateCtx.strokeRect(5, 5, 502, 118);

      plateCtx.shadowColor = '#ef4444';
      plateCtx.shadowBlur = 16;
      plateCtx.fillStyle = '#fff1f2';
      plateCtx.font = `800 ${fontSize}px "Oxanium", "JetBrains Mono", "Arial Black", sans-serif`;
      plateCtx.textAlign = 'center';
      plateCtx.textBaseline = 'middle';
      plateCtx.fillText(label, 256, 66, 434);

      plateFrameMat.color.setHex(0x1f070a);
      plateFrameMat.metalness = 0.65;
      plateFrameMat.roughness = 0.22;
      plateFrameMat.emissive.setHex(0xdc2626);
      plateFrameMat.emissiveIntensity = 0.85;
      plateMat.emissiveIntensity = 1.22;
    } else if (style === 'animFlameBorder') {
      // Animated Molten Fire & Rising Ember Border Plate
      const bgGrad = plateCtx.createLinearGradient(0, 0, 0, 128);
      bgGrad.addColorStop(0, '#140502');
      bgGrad.addColorStop(0.65, '#2b0b04');
      bgGrad.addColorStop(1, '#4c1406');
      plateCtx.fillStyle = bgGrad;
      plateCtx.fillRect(0, 0, 512, 128);

      // Flickering flame tongues along bottom & top edges
      for (let i = 0; i < 24; i++) {
        const fx = 14 + i * 21;
        const flick = 14 + Math.sin(animTimeSec * 12 + i * 1.35) * 9 + Math.cos(animTimeSec * 8.5 + i * 0.8) * 5;
        const fg = plateCtx.createLinearGradient(fx, 124, fx, 124 - flick - 14);
        fg.addColorStop(0, '#fef08a');
        fg.addColorStop(0.45, '#f97316');
        fg.addColorStop(1, 'rgba(220, 38, 38, 0)');
        plateCtx.fillStyle = fg;
        plateCtx.beginPath();
        plateCtx.moveTo(fx - 13, 124);
        plateCtx.quadraticCurveTo(fx, 124 - flick - 16, fx + 13, 124);
        plateCtx.fill();

        // Rising ember spark
        const sparkY = 114 - ((animTimeSec * 48 + i * 29) % 98);
        const sparkX = fx + Math.sin(animTimeSec * 6 + i) * 6;
        plateCtx.fillStyle = 'rgba(254, 240, 138, 0.78)';
        plateCtx.beginPath();
        plateCtx.arc(sparkX, sparkY, 2.2, 0, Math.PI * 2);
        plateCtx.fill();
      }

      const fireBorder = plateCtx.createLinearGradient(0, 0, 512, 0);
      fireBorder.addColorStop(0, '#dc2626');
      fireBorder.addColorStop(0.5, '#facc15');
      fireBorder.addColorStop(1, '#ea580c');
      plateCtx.shadowColor = '#f97316';
      plateCtx.shadowBlur = 16;
      plateCtx.strokeStyle = fireBorder;
      plateCtx.lineWidth = 8;
      plateCtx.strokeRect(5, 5, 502, 118);

      plateCtx.shadowColor = '#fb923c';
      plateCtx.shadowBlur = 16;
      plateCtx.fillStyle = '#fff7ed';
      plateCtx.font = `800 ${fontSize}px "Oxanium", "JetBrains Mono", "Arial Black", sans-serif`;
      plateCtx.textAlign = 'center';
      plateCtx.textBaseline = 'middle';
      plateCtx.fillText(label, 256, 62, 430);

      plateFrameMat.color.setHex(0x431407);
      plateFrameMat.metalness = 0.58;
      plateFrameMat.roughness = 0.26;
      plateFrameMat.emissive.setHex(0xf97316);
      plateFrameMat.emissiveIntensity = 1.25;
      plateMat.emissiveIntensity = 1.25;
    } else if (style === 'animHoloPrism') {
      // Sweeping Iridescent Hologram Prism Plate
      const hShift = Math.floor((animTimeSec * 95) % 360);
      const bgGrad = plateCtx.createLinearGradient(0, 0, 512, 128);
      bgGrad.addColorStop(0, `hsl(${(hShift + 210) % 360}, 62%, 14%)`);
      bgGrad.addColorStop(0.5, `hsl(${(hShift + 285) % 360}, 58%, 18%)`);
      bgGrad.addColorStop(1, `hsl(${(hShift + 175) % 360}, 64%, 15%)`);
      plateCtx.fillStyle = bgGrad;
      plateCtx.fillRect(0, 0, 512, 128);

      // Sweeping diagonal rainbow hologram reflection band
      const sweep = ((animTimeSec * 0.62) % 1.6) - 0.3;
      const sx = sweep * 512;
      const sheen = plateCtx.createLinearGradient(sx - 90, 0, sx + 90, 128);
      sheen.addColorStop(0, 'rgba(255,255,255,0)');
      sheen.addColorStop(0.32, `hsla(${hShift}, 98%, 68%, 0.45)`);
      sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0.72)');
      sheen.addColorStop(0.68, `hsla(${(hShift + 110) % 360}, 98%, 68%, 0.45)`);
      sheen.addColorStop(1, 'rgba(255,255,255,0)');
      plateCtx.fillStyle = sheen;
      plateCtx.fillRect(8, 8, 496, 112);

      const rimGrad = plateCtx.createLinearGradient(0, 0, 512, 0);
      rimGrad.addColorStop(0, `hsl(${hShift}, 95%, 70%)`);
      rimGrad.addColorStop(0.5, `hsl(${(hShift + 120) % 360}, 95%, 74%)`);
      rimGrad.addColorStop(1, `hsl(${(hShift + 240) % 360}, 95%, 70%)`);
      plateCtx.shadowColor = `hsl(${(hShift + 120) % 360}, 95%, 65%)`;
      plateCtx.shadowBlur = 16;
      plateCtx.strokeStyle = rimGrad;
      plateCtx.lineWidth = 8;
      plateCtx.strokeRect(5, 5, 502, 118);

      plateCtx.shadowColor = `hsl(${(hShift + 60) % 360}, 95%, 72%)`;
      plateCtx.shadowBlur = 14;
      plateCtx.fillStyle = '#ffffff';
      plateCtx.font = `800 ${fontSize}px "Oxanium", "JetBrains Mono", "Arial Black", sans-serif`;
      plateCtx.textAlign = 'center';
      plateCtx.textBaseline = 'middle';
      plateCtx.fillText(label, 256, 66, 432);

      plateFrameMat.color.setHex(0x1e1b4b);
      plateFrameMat.metalness = 0.85;
      plateFrameMat.roughness = 0.14;
      plateFrameMat.emissive.setHSL((animTimeSec * 0.26) % 1, 0.92, 0.56);
      plateFrameMat.emissiveIntensity = 1.1;
      plateMat.emissiveIntensity = 1.28;
    } else if (style === 'animStealthFlip') {
      // Tactical Mechanical Stealth Plate with Sweeping Biometric Lock Scan
      plateCtx.fillStyle = '#090e17';
      plateCtx.fillRect(0, 0, 512, 128);
      // Carbon-tech subtle diagonal hatching
      plateCtx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      plateCtx.lineWidth = 2;
      for (let i = -128; i < 640; i += 24) {
        plateCtx.beginPath();
        plateCtx.moveTo(i, 128);
        plateCtx.lineTo(i + 96, 0);
        plateCtx.stroke();
      }
      // Corner stealth brackets
      plateCtx.strokeStyle = '#38bdf8';
      plateCtx.lineWidth = 6;
      const bLen = 28;
      plateCtx.beginPath();
      plateCtx.moveTo(12, 12 + bLen); plateCtx.lineTo(12, 12); plateCtx.lineTo(12 + bLen, 12);
      plateCtx.moveTo(500 - bLen, 12); plateCtx.lineTo(500, 12); plateCtx.lineTo(500, 12 + bLen);
      plateCtx.moveTo(12, 116 - bLen); plateCtx.lineTo(12, 116); plateCtx.lineTo(12 + bLen, 116);
      plateCtx.moveTo(500 - bLen, 116); plateCtx.lineTo(500, 116); plateCtx.lineTo(500, 116 - bLen);
      plateCtx.stroke();

      // Sweeping vertical stealth scanner beam
      const scanPos = ((animTimeSec * 190) % 580) - 34;
      const beam = plateCtx.createLinearGradient(scanPos - 26, 0, scanPos + 26, 0);
      beam.addColorStop(0, 'rgba(56, 189, 248, 0)');
      beam.addColorStop(0.5, 'rgba(56, 189, 248, 0.55)');
      beam.addColorStop(1, 'rgba(56, 189, 248, 0)');
      plateCtx.fillStyle = beam;
      plateCtx.fillRect(Math.max(8, scanPos - 26), 8, 52, 112);

      // Subtle periodic top telemetry label
      const stealthLocked = Math.sin(animTimeSec * 2.1) > 0.25;
      plateCtx.fillStyle = stealthLocked ? '#f59e0b' : '#38bdf8';
      plateCtx.font = '800 13px "JetBrains Mono", "Oxanium", sans-serif';
      plateCtx.textAlign = 'center';
      plateCtx.textBaseline = 'middle';
      plateCtx.fillText(
        stealthLocked ? '● STEALTH LOCK ACTIVE' : '◈ ID VERIFIED · GHOST',
        256,
        20,
      );

      plateCtx.shadowColor = '#38bdf8';
      plateCtx.shadowBlur = 14;
      plateCtx.fillStyle = '#e0f2fe';
      plateCtx.font = `800 ${Math.min(fontSize, 56)}px "Oxanium", "JetBrains Mono", "Arial Black", sans-serif`;
      plateCtx.fillText(label, 256, 76, 434);

      plateFrameMat.color.setHex(0x111827);
      plateFrameMat.metalness = 0.82;
      plateFrameMat.roughness = 0.22;
      plateFrameMat.emissive.setHex(stealthLocked ? 0x0284c7 : 0x0ea5e9);
      plateFrameMat.emissiveIntensity = 0.55;
      plateMat.emissiveIntensity = 1.18;
    } else if (style === 'levelBronzePlate') {
      // Level 25 Exclusive: Highway Wolf Brushed Bronze Crest Plate
      const bgGrad = plateCtx.createLinearGradient(0, 0, 512, 128);
      bgGrad.addColorStop(0, '#160d07');
      bgGrad.addColorStop(0.5, '#2b180c');
      bgGrad.addColorStop(1, '#160d07');
      plateCtx.fillStyle = bgGrad;
      plateCtx.fillRect(0, 0, 512, 128);
      const borderGrad = plateCtx.createLinearGradient(0, 0, 512, 128);
      borderGrad.addColorStop(0, '#c2410c');
      borderGrad.addColorStop(0.5, '#fdba74');
      borderGrad.addColorStop(1, '#9a3412');
      plateCtx.strokeStyle = borderGrad;
      plateCtx.lineWidth = 9;
      plateCtx.strokeRect(5, 5, 502, 118);
      plateCtx.fillStyle = '#fb923c';
      plateCtx.font = '800 13px "Oxanium", "Arial Black", sans-serif';
      plateCtx.textAlign = 'center';
      plateCtx.textBaseline = 'middle';
      plateCtx.fillText('★ SEVİYE 25 · OTOYOL KURDU ★', 256, 20);
      plateCtx.fillStyle = '#ffedd5';
      plateCtx.font = `800 ${Math.min(fontSize, 56)}px "Oxanium", "JetBrains Mono", "Arial Black", sans-serif`;
      plateCtx.fillText(label, 256, 74, 424);

      plateFrameMat.color.setHex(0x7c2d12);
      plateFrameMat.metalness = 0.85;
      plateFrameMat.roughness = 0.22;
      plateFrameMat.emissive.setHex(0xea580c);
      plateFrameMat.emissiveIntensity = 0.42;
      plateMat.emissiveIntensity = 0.92;
    } else if (style === 'apexChampionPlate') {
      // Level 55 Exclusive: Animated Crimson & 24K Gold Apex Champion Plate
      const bgGrad = plateCtx.createLinearGradient(0, 0, 512, 128);
      bgGrad.addColorStop(0, '#220612');
      bgGrad.addColorStop(0.5, '#4c0519');
      bgGrad.addColorStop(1, '#2c1205');
      plateCtx.fillStyle = bgGrad;
      plateCtx.fillRect(0, 0, 512, 128);

      const sweep = ((animTimeSec * 0.55) % 1.5) - 0.25;
      const sx = sweep * 512;
      const sheen = plateCtx.createLinearGradient(sx - 70, 0, sx + 70, 128);
      sheen.addColorStop(0, 'rgba(250, 204, 21, 0)');
      sheen.addColorStop(0.5, 'rgba(254, 240, 138, 0.45)');
      sheen.addColorStop(1, 'rgba(250, 204, 21, 0)');
      plateCtx.fillStyle = sheen;
      plateCtx.fillRect(8, 8, 496, 112);

      const goldRim = plateCtx.createLinearGradient(0, 0, 512, 0);
      goldRim.addColorStop(0, '#f43f5e');
      goldRim.addColorStop(0.5, '#facc15');
      goldRim.addColorStop(1, '#f43f5e');
      plateCtx.shadowColor = '#facc15';
      plateCtx.shadowBlur = 14;
      plateCtx.strokeStyle = goldRim;
      plateCtx.lineWidth = 8;
      plateCtx.strokeRect(5, 5, 502, 118);

      plateCtx.fillStyle = '#fde047';
      plateCtx.font = '800 13px "Oxanium", "Arial Black", sans-serif';
      plateCtx.textAlign = 'center';
      plateCtx.textBaseline = 'middle';
      plateCtx.fillText('◆ APEX ŞAMPİYON SERİSİ ◆', 256, 20);
      plateCtx.shadowColor = '#fb7185';
      plateCtx.shadowBlur = 14;
      plateCtx.fillStyle = '#fef9c3';
      plateCtx.font = `800 ${Math.min(fontSize, 56)}px "Oxanium", "JetBrains Mono", "Arial Black", sans-serif`;
      plateCtx.fillText(label, 256, 74, 424);

      plateFrameMat.color.setHex(0x451a03);
      plateFrameMat.metalness = 0.92;
      plateFrameMat.roughness = 0.16;
      plateFrameMat.emissive.setHex(0xf59e0b);
      plateFrameMat.emissiveIntensity = 0.9 + Math.sin(animTimeSec * 4.2) * 0.35;
      plateMat.emissiveIntensity = 1.24;
    } else if (style === 'emeraldCarbon') {
      plateCtx.fillStyle = '#06150f';
      plateCtx.fillRect(0, 0, 512, 128);
      plateCtx.strokeStyle = 'rgba(16, 185, 129, 0.16)';
      plateCtx.lineWidth = 3;
      for (let i = -128; i < 640; i += 18) {
        plateCtx.beginPath();
        plateCtx.moveTo(i, 0);
        plateCtx.lineTo(i + 128, 128);
        plateCtx.stroke();
      }
      plateCtx.strokeStyle = '#10b981';
      plateCtx.lineWidth = 9;
      plateCtx.strokeRect(5, 5, 502, 118);
      plateCtx.fillStyle = '#6ee7b7';
      plateCtx.font = `800 ${fontSize}px "Oxanium", "JetBrains Mono", "Arial Black", sans-serif`;
      plateCtx.textAlign = 'center';
      plateCtx.textBaseline = 'middle';
      plateCtx.fillText(label, 256, 66, 434);
      plateFrameMat.color.setHex(0x064e3b);
      plateFrameMat.metalness = 0.8;
      plateFrameMat.roughness = 0.22;
      plateFrameMat.emissive.setHex(0x10b981);
      plateFrameMat.emissiveIntensity = 0.6;
      plateMat.emissiveIntensity = 0.95;
    } else if (style === 'tokyoNeonPink') {
      const bg = plateCtx.createLinearGradient(0, 0, 512, 128);
      bg.addColorStop(0, '#180412');
      bg.addColorStop(0.5, '#2b0822');
      bg.addColorStop(1, '#120312');
      plateCtx.fillStyle = bg;
      plateCtx.fillRect(0, 0, 512, 128);
      plateCtx.shadowColor = '#ec4899';
      plateCtx.shadowBlur = 14;
      plateCtx.strokeStyle = '#ec4899';
      plateCtx.lineWidth = 8;
      plateCtx.strokeRect(6, 6, 500, 116);
      plateCtx.fillStyle = '#fbcfe8';
      plateCtx.font = `800 ${fontSize}px "Oxanium", "JetBrains Mono", "Arial Black", sans-serif`;
      plateCtx.textAlign = 'center';
      plateCtx.textBaseline = 'middle';
      plateCtx.fillText(label, 256, 66, 434);
      plateFrameMat.color.setHex(0x831843);
      plateFrameMat.metalness = 0.78;
      plateFrameMat.roughness = 0.18;
      plateFrameMat.emissive.setHex(0xec4899);
      plateFrameMat.emissiveIntensity = 1.2;
      plateMat.emissiveIntensity = 1.15;
    } else if (style === 'arcticIce') {
      const bg = plateCtx.createLinearGradient(0, 0, 512, 128);
      bg.addColorStop(0, '#f0f9ff');
      bg.addColorStop(0.5, '#bae6fd');
      bg.addColorStop(1, '#e0f2fe');
      plateCtx.fillStyle = bg;
      plateCtx.fillRect(0, 0, 512, 128);
      plateCtx.strokeStyle = '#0284c7';
      plateCtx.lineWidth = 8;
      plateCtx.strokeRect(5, 5, 502, 118);
      plateCtx.fillStyle = '#0c4a6e';
      plateCtx.font = `800 ${fontSize}px "Oxanium", "JetBrains Mono", "Arial Black", sans-serif`;
      plateCtx.textAlign = 'center';
      plateCtx.textBaseline = 'middle';
      plateCtx.fillText(label, 256, 66, 434);
      plateFrameMat.color.setHex(0x7dd3fc);
      plateFrameMat.metalness = 0.92;
      plateFrameMat.roughness = 0.12;
      plateFrameMat.emissive.setHex(0x38bdf8);
      plateFrameMat.emissiveIntensity = 0.55;
      plateMat.emissiveIntensity = 0.85;
    } else if (style === 'animGoldPulse') {
      const bg = plateCtx.createLinearGradient(0, 0, 512, 128);
      bg.addColorStop(0, '#140c02');
      bg.addColorStop(0.5, '#2d1c05');
      bg.addColorStop(1, '#140c02');
      plateCtx.fillStyle = bg;
      plateCtx.fillRect(0, 0, 512, 128);
      const sx = (((animTimeSec * 0.65) % 1.4) - 0.2) * 512;
      const sheen = plateCtx.createLinearGradient(sx - 64, 0, sx + 64, 128);
      sheen.addColorStop(0, 'rgba(250,204,21,0)');
      sheen.addColorStop(0.5, 'rgba(254,240,138,0.52)');
      sheen.addColorStop(1, 'rgba(250,204,21,0)');
      plateCtx.fillStyle = sheen;
      plateCtx.fillRect(6, 6, 500, 116);
      plateCtx.shadowColor = '#facc15';
      plateCtx.shadowBlur = 16;
      plateCtx.strokeStyle = '#facc15';
      plateCtx.lineWidth = 9;
      plateCtx.strokeRect(5, 5, 502, 118);
      plateCtx.fillStyle = '#fef9c3';
      plateCtx.font = `800 ${fontSize}px "Oxanium", "JetBrains Mono", "Arial Black", sans-serif`;
      plateCtx.textAlign = 'center';
      plateCtx.textBaseline = 'middle';
      plateCtx.fillText(label, 256, 66, 434);
      plateFrameMat.color.setHex(0x854d0e);
      plateFrameMat.metalness = 0.96;
      plateFrameMat.roughness = 0.12;
      plateFrameMat.emissive.setHex(0xfacc15);
      plateFrameMat.emissiveIntensity = 1.0 + Math.sin(animTimeSec * 4.8) * 0.5;
      plateMat.emissiveIntensity = 1.25;
    } else if (style === 'animCyberLightning') {
      plateCtx.fillStyle = '#020617';
      plateCtx.fillRect(0, 0, 512, 128);
      plateCtx.strokeStyle = '#38bdf8';
      plateCtx.lineWidth = 3;
      plateCtx.beginPath();
      const phase = Math.floor(animTimeSec * 14);
      for (let x = 12; x <= 500; x += 28) {
        const y = 64 + Math.sin(x * 0.08 + phase * 1.9) * 34;
        if (x === 12) plateCtx.moveTo(x, y);
        else plateCtx.lineTo(x, y);
      }
      plateCtx.stroke();
      plateCtx.shadowColor = '#60a5fa';
      plateCtx.shadowBlur = 16;
      plateCtx.strokeStyle = '#60a5fa';
      plateCtx.lineWidth = 8;
      plateCtx.strokeRect(5, 5, 502, 118);
      plateCtx.fillStyle = '#ffffff';
      plateCtx.font = `800 ${fontSize}px "Oxanium", "JetBrains Mono", "Arial Black", sans-serif`;
      plateCtx.textAlign = 'center';
      plateCtx.textBaseline = 'middle';
      plateCtx.fillText(label, 256, 66, 434);
      plateFrameMat.color.setHex(0x1e3a8a);
      plateFrameMat.metalness = 0.88;
      plateFrameMat.roughness = 0.14;
      plateFrameMat.emissive.setHex(0x3b82f6);
      plateFrameMat.emissiveIntensity = 1.2 + Math.abs(Math.sin(animTimeSec * 12)) * 1.1;
      plateMat.emissiveIntensity = 1.3;
    } else {
      // Classic reflective Turkish TR plate
      plateCtx.fillStyle = '#f4f4f5';
      plateCtx.fillRect(0, 0, 512, 128);
      plateCtx.strokeStyle = '#18181b';
      plateCtx.lineWidth = 8;
      plateCtx.strokeRect(4, 4, 504, 120);
      plateCtx.fillStyle = '#1d4ed8';
      plateCtx.fillRect(8, 8, 56, 112);
      plateCtx.fillStyle = '#ffffff';
      plateCtx.font = 'bold 26px "Oxanium", "Arial Black", sans-serif';
      plateCtx.textAlign = 'center';
      plateCtx.textBaseline = 'middle';
      plateCtx.fillText('TR', 36, 86);
      plateCtx.strokeStyle = '#fbbf24';
      plateCtx.lineWidth = 2.5;
      plateCtx.beginPath();
      plateCtx.arc(36, 36, 11, 0, Math.PI * 2);
      plateCtx.stroke();
      plateCtx.fillStyle = '#09090b';
      plateCtx.font = `800 ${fontSize}px "Oxanium", "JetBrains Mono", "Arial Black", sans-serif`;
      plateCtx.fillText(label, 286, 67, 420);

      plateFrameMat.color.setHex(0x111216);
      plateFrameMat.metalness = 0.1;
      plateFrameMat.roughness = 0.78;
      plateFrameMat.emissive.setHex(0x000000);
      plateFrameMat.emissiveIntensity = 0;
      plateMat.emissiveIntensity = 0.6;
    }

    plateCtx.restore();
    plateTexture.needsUpdate = true;
    plateFrameMat.needsUpdate = true;
    plateMat.needsUpdate = true;
  };
  const plateBracketGeo = trackGeo(new THREE.BoxGeometry(0.56, 0.125, 0.045));
  const plateFrameGeo = trackGeo(new THREE.BoxGeometry(0.68, 0.175, 0.024));
  const plateFaceGeo = trackGeo(new THREE.PlaneGeometry(0.64, 0.145));

  const plateMountAccGroups: THREE.Group[] = [];
  const plateAccGeos: THREE.BufferGeometry[] = [];
  const plateAccMats: THREE.Material[] = [];
  let builtPlateFrameStyle: PlateStyleId | null = null;
  let plateRgbRailMats: THREE.MeshStandardMaterial[] = [];
  let plateStrobeLeftMat: THREE.MeshStandardMaterial | null = null;
  let plateStrobeRightMat: THREE.MeshStandardMaterial | null = null;
  let plateMatrixBarMat: THREE.MeshStandardMaterial | null = null;
  let plateScannerNodes: THREE.Mesh[] = [];
  let plateFlameAccentMat: THREE.MeshStandardMaterial | null = null;
  let plateFlameFins: THREE.Mesh[] = [];
  let plateHoloRings: THREE.Group[] = [];
  let plateHoloMat: THREE.MeshStandardMaterial | null = null;
  let plateStealthTopLouvers: THREE.Mesh[] = [];
  let plateStealthBotLouvers: THREE.Mesh[] = [];
  let plateStealthLedMat: THREE.MeshStandardMaterial | null = null;

  const trackPlateAccGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    plateAccGeos.push(g);
    return g;
  };
  const trackPlateAccMat = <T extends THREE.Material>(m: T): T => {
    plateAccMats.push(m);
    return m;
  };

  const clearPlateFrame3D = (): void => {
    for (const grp of plateMountAccGroups) {
      grp.clear();
    }
    plateAccGeos.forEach((g) => g.dispose());
    plateAccGeos.length = 0;
    plateAccMats.forEach((m) => m.dispose());
    plateAccMats.length = 0;
    plateRgbRailMats = [];
    plateStrobeLeftMat = null;
    plateStrobeRightMat = null;
    plateMatrixBarMat = null;
    plateScannerNodes = [];
    plateFlameAccentMat = null;
    plateFlameFins = [];
    plateHoloRings = [];
    plateHoloMat = null;
    plateStealthTopLouvers = [];
    plateStealthBotLouvers = [];
    plateStealthLedMat = null;
    builtPlateFrameStyle = null;
  };

  const rebuildPlateFrame3D = (style: PlateStyleId): void => {
    if (builtPlateFrameStyle === style) return;
    clearPlateFrame3D();
    builtPlateFrameStyle = style;

    if (style === 'vintageRetro') {
      const boltGeo = trackPlateAccGeo(new THREE.CylinderGeometry(0.014, 0.014, 0.016, 12));
      boltGeo.rotateX(Math.PI / 2);
      const boltMat = trackPlateAccMat(
        new THREE.MeshStandardMaterial({ color: 0xe5e7eb, metalness: 0.95, roughness: 0.14 }),
      );
      const trimGeoTop = trackPlateAccGeo(new THREE.BoxGeometry(0.70, 0.016, 0.032));
      const trimMat = trackPlateAccMat(
        new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.82, roughness: 0.28 }),
      );
      for (const acc of plateMountAccGroups) {
        for (const sx of [-0.29, 0.29]) {
          for (const sy of [-0.062, 0.062]) {
            const b = new THREE.Mesh(boltGeo, boltMat);
            b.position.set(sx, sy, 0.018);
            acc.add(b);
          }
        }
        for (const sy of [-0.092, 0.092]) {
          const bar = new THREE.Mesh(trimGeoTop, trimMat);
          bar.position.set(0, sy, 0.004);
          acc.add(bar);
        }
      }
    } else if (style === 'californiaSunset') {
      const aluMat = trackPlateAccMat(
        new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.92, roughness: 0.18 }),
      );
      const topLipGeo = trackPlateAccGeo(new THREE.BoxGeometry(0.71, 0.018, 0.038));
      const sideBarGeo = trackPlateAccGeo(new THREE.BoxGeometry(0.018, 0.195, 0.034));
      for (const acc of plateMountAccGroups) {
        const topLip = new THREE.Mesh(topLipGeo, aluMat);
        topLip.position.set(0, 0.094, 0.008);
        acc.add(topLip);
        const botLip = new THREE.Mesh(topLipGeo, aluMat);
        botLip.position.set(0, -0.094, 0.005);
        acc.add(botLip);
        for (const sx of [-0.348, 0.348]) {
          const side = new THREE.Mesh(sideBarGeo, aluMat);
          side.position.set(sx, 0, 0.005);
          acc.add(side);
        }
      }
    } else if (style === 'nurburgringTrack') {
      const wingGeo = trackPlateAccGeo(new THREE.BoxGeometry(0.022, 0.19, 0.056));
      const topAccentGeo = trackPlateAccGeo(new THREE.BoxGeometry(0.69, 0.016, 0.032));
      const yellowMat = trackPlateAccMat(
        new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          emissive: 0xca8a04,
          emissiveIntensity: 0.35,
          metalness: 0.4,
          roughness: 0.3,
        }),
      );
      for (const acc of plateMountAccGroups) {
        for (const sx of [-0.356, 0.356]) {
          const wing = new THREE.Mesh(wingGeo, carbonMat);
          wing.position.set(sx, 0, 0.016);
          wing.rotation.y = sx < 0 ? 0.14 : -0.14;
          acc.add(wing);
        }
        const bar = new THREE.Mesh(topAccentGeo, yellowMat);
        bar.position.set(0, 0.095, 0.006);
        acc.add(bar);
      }
    } else if (style === 'roseGoldChrome') {
      const rgMat = trackPlateAccMat(
        new THREE.MeshStandardMaterial({
          color: 0xfda4af,
          emissive: 0x881337,
          emissiveIntensity: 0.28,
          metalness: 0.96,
          roughness: 0.1,
        }),
      );
      const cornerHGeo = trackPlateAccGeo(new THREE.BoxGeometry(0.11, 0.022, 0.036));
      const cornerVGeo = trackPlateAccGeo(new THREE.BoxGeometry(0.022, 0.075, 0.036));
      for (const acc of plateMountAccGroups) {
        for (const sx of [-1, 1]) {
          for (const sy of [-1, 1]) {
            const ch = new THREE.Mesh(cornerHGeo, rgMat);
            ch.position.set(sx * 0.295, sy * 0.092, 0.008);
            acc.add(ch);
            const cv = new THREE.Mesh(cornerVGeo, rgMat);
            cv.position.set(sx * 0.348, sy * 0.062, 0.008);
            acc.add(cv);
          }
        }
      }
    } else if (style === 'animRgbChase') {
      const railHGeo = trackPlateAccGeo(new THREE.BoxGeometry(0.71, 0.02, 0.034));
      const railVGeo = trackPlateAccGeo(new THREE.BoxGeometry(0.02, 0.195, 0.034));
      const makeRailMat = (hex: number) =>
        trackPlateAccMat(
          new THREE.MeshStandardMaterial({
            color: hex,
            emissive: hex,
            emissiveIntensity: 2.1,
            roughness: 0.18,
            metalness: 0.2,
          }),
        );
      const topMat = makeRailMat(0x22d3ee);
      const rightMat = makeRailMat(0xa855f7);
      const botMat = makeRailMat(0xf43f5e);
      const leftMat = makeRailMat(0x4ade80);
      plateRgbRailMats = [topMat, rightMat, botMat, leftMat];

      for (const acc of plateMountAccGroups) {
        const top = new THREE.Mesh(railHGeo, topMat);
        top.position.set(0, 0.095, 0.008);
        acc.add(top);
        const bot = new THREE.Mesh(railHGeo, botMat);
        bot.position.set(0, -0.095, 0.008);
        acc.add(bot);
        const left = new THREE.Mesh(railVGeo, leftMat);
        left.position.set(-0.352, 0, 0.008);
        acc.add(left);
        const right = new THREE.Mesh(railVGeo, rightMat);
        right.position.set(0.352, 0, 0.008);
        acc.add(right);
      }
    } else if (style === 'animPoliceStrobe') {
      const housingGeo = trackPlateAccGeo(new THREE.BoxGeometry(0.056, 0.155, 0.042));
      const lensGeo = trackPlateAccGeo(new THREE.BoxGeometry(0.036, 0.125, 0.024));
      const leftMat = trackPlateAccMat(
        new THREE.MeshStandardMaterial({
          color: 0xef4444,
          emissive: 0xef4444,
          emissiveIntensity: 2.8,
          roughness: 0.16,
          metalness: 0.12,
        }),
      );
      const rightMat = trackPlateAccMat(
        new THREE.MeshStandardMaterial({
          color: 0x3b82f6,
          emissive: 0x3b82f6,
          emissiveIntensity: 2.8,
          roughness: 0.16,
          metalness: 0.12,
        }),
      );
      plateStrobeLeftMat = leftMat;
      plateStrobeRightMat = rightMat;
      for (const acc of plateMountAccGroups) {
        const lHouse = new THREE.Mesh(housingGeo, matteTrimMat);
        lHouse.position.set(-0.368, 0, 0.004);
        acc.add(lHouse);
        const lLens = new THREE.Mesh(lensGeo, leftMat);
        lLens.position.set(-0.368, 0, 0.022);
        acc.add(lLens);

        const rHouse = new THREE.Mesh(housingGeo, matteTrimMat);
        rHouse.position.set(0.368, 0, 0.004);
        acc.add(rHouse);
        const rLens = new THREE.Mesh(lensGeo, rightMat);
        rLens.position.set(0.368, 0, 0.022);
        acc.add(rLens);
      }
    } else if (style === 'animCyberMatrix') {
      const barMat = trackPlateAccMat(
        new THREE.MeshStandardMaterial({
          color: 0x4ade80,
          emissive: 0x22c55e,
          emissiveIntensity: 2.0,
          roughness: 0.18,
          metalness: 0.25,
        }),
      );
      plateMatrixBarMat = barMat;
      const sideLedGeo = trackPlateAccGeo(new THREE.BoxGeometry(0.02, 0.18, 0.032));
      const visorGeo = trackPlateAccGeo(new THREE.BoxGeometry(0.72, 0.018, 0.048));
      const visorLedGeo = trackPlateAccGeo(new THREE.BoxGeometry(0.66, 0.008, 0.012));
      for (const acc of plateMountAccGroups) {
        for (const sx of [-0.354, 0.354]) {
          const s = new THREE.Mesh(sideLedGeo, barMat);
          s.position.set(sx, 0, 0.008);
          acc.add(s);
        }
        const visor = new THREE.Mesh(visorGeo, matteTrimMat);
        visor.position.set(0, 0.098, 0.015);
        acc.add(visor);
        const vLed = new THREE.Mesh(visorLedGeo, barMat);
        vLed.position.set(0, 0.088, 0.034);
        acc.add(vLed);
      }
    } else if (style === 'animKnightScan') {
      const trackBarGeo = trackPlateAccGeo(new THREE.BoxGeometry(0.71, 0.024, 0.036));
      const scanHeadGeo = trackPlateAccGeo(new THREE.BoxGeometry(0.11, 0.018, 0.02));
      const scanMat = trackPlateAccMat(
        new THREE.MeshStandardMaterial({
          color: 0xffcdd2,
          emissive: 0xef4444,
          emissiveIntensity: 3.1,
          roughness: 0.12,
          metalness: 0.1,
        }),
      );
      for (const acc of plateMountAccGroups) {
        for (const sy of [-0.096, 0.096]) {
          const track = new THREE.Mesh(trackBarGeo, matteTrimMat);
          track.position.set(0, sy, 0.006);
          acc.add(track);
          const head = new THREE.Mesh(scanHeadGeo, scanMat);
          head.position.set(0, sy, 0.022);
          acc.add(head);
          plateScannerNodes.push(head);
        }
      }
    } else if (style === 'animFlameBorder') {
      const flameMat = trackPlateAccMat(
        new THREE.MeshStandardMaterial({
          color: 0xfb923c,
          emissive: 0xf97316,
          emissiveIntensity: 2.2,
          roughness: 0.22,
          metalness: 0.3,
        }),
      );
      plateFlameAccentMat = flameMat;
      const finGeo = trackPlateAccGeo(new THREE.ConeGeometry(0.024, 0.085, 5));
      const topBarGeo = trackPlateAccGeo(new THREE.BoxGeometry(0.70, 0.018, 0.032));
      for (const acc of plateMountAccGroups) {
        for (const sy of [-0.094, 0.094]) {
          const b = new THREE.Mesh(topBarGeo, flameMat);
          b.position.set(0, sy, 0.008);
          acc.add(b);
        }
        for (const sx of [-1, 1]) {
          for (let f = 0; f < 3; f++) {
            const fin = new THREE.Mesh(finGeo, flameMat);
            fin.position.set(sx * 0.365, -0.055 + f * 0.055, 0.012);
            fin.rotation.z = sx < 0 ? Math.PI * 0.42 : -Math.PI * 0.42;
            acc.add(fin);
            plateFlameFins.push(fin);
          }
        }
      }
    } else if (style === 'animHoloPrism') {
      const holoMat = trackPlateAccMat(
        new THREE.MeshStandardMaterial({
          color: 0xc084fc,
          emissive: 0xa855f7,
          emissiveIntensity: 2.2,
          transparent: true,
          opacity: 0.82,
          roughness: 0.1,
          metalness: 0.65,
        }),
      );
      plateHoloMat = holoMat;
      const hBarGeo = trackPlateAccGeo(new THREE.BoxGeometry(0.75, 0.014, 0.014));
      const vBarGeo = trackPlateAccGeo(new THREE.BoxGeometry(0.014, 0.22, 0.014));
      for (const acc of plateMountAccGroups) {
        const ring = new THREE.Group();
        ring.position.z = 0.028;
        const top = new THREE.Mesh(hBarGeo, holoMat);
        top.position.y = 0.106;
        const bot = new THREE.Mesh(hBarGeo, holoMat);
        bot.position.y = -0.106;
        const left = new THREE.Mesh(vBarGeo, holoMat);
        left.position.x = -0.372;
        const right = new THREE.Mesh(vBarGeo, holoMat);
        right.position.x = 0.372;
        ring.add(top, bot, left, right);
        acc.add(ring);
        plateHoloRings.push(ring);
      }
    } else if (style === 'animStealthFlip') {
      const louverGeo = trackPlateAccGeo(new THREE.BoxGeometry(0.69, 0.024, 0.034));
      const sidePillarGeo = trackPlateAccGeo(new THREE.BoxGeometry(0.032, 0.20, 0.042));
      const ledGeo = trackPlateAccGeo(new THREE.BoxGeometry(0.014, 0.026, 0.014));
      const ledMat = trackPlateAccMat(
        new THREE.MeshStandardMaterial({
          color: 0x7dd3fc,
          emissive: 0x38bdf8,
          emissiveIntensity: 2.5,
          roughness: 0.14,
          metalness: 0.2,
        }),
      );
      plateStealthLedMat = ledMat;
      for (const acc of plateMountAccGroups) {
        for (const sx of [-0.358, 0.358]) {
          const pillar = new THREE.Mesh(sidePillarGeo, carbonMat);
          pillar.position.set(sx, 0, 0.012);
          acc.add(pillar);
          for (const sy of [-0.068, 0.068]) {
            const led = new THREE.Mesh(ledGeo, ledMat);
            led.position.set(sx, sy, 0.032);
            acc.add(led);
          }
        }
        const topLouver = new THREE.Mesh(louverGeo, carbonMat);
        topLouver.position.set(0, 0.098, 0.018);
        acc.add(topLouver);
        plateStealthTopLouvers.push(topLouver);

        const botLouver = new THREE.Mesh(louverGeo, carbonMat);
        botLouver.position.set(0, -0.098, 0.018);
        acc.add(botLouver);
        plateStealthBotLouvers.push(botLouver);
      }
    }
  };

  const addPlateMount = (y: number, z: number, rotY: number, scale = 1) => {
    const mount = new THREE.Group();
    mount.position.set(0, y, z);
    mount.rotation.y = rotY;
    if (scale !== 1) {
      mount.scale.setScalar(scale);
    }
    const bracket = new THREE.Mesh(plateBracketGeo, matteTrimMat);
    bracket.position.z = -0.026;
    mount.add(bracket);
    mount.add(new THREE.Mesh(plateFrameGeo, plateFrameMat));
    const face = new THREE.Mesh(plateFaceGeo, plateMat);
    face.position.z = 0.017;
    mount.add(face);
    const accGroup = new THREE.Group();
    mount.add(accGroup);
    plateMountAccGroups.push(accGroup);
    chassisGroup.add(mount);
  };
  addPlateMount(
    bp.plateCoords.rearY,
    bp.plateCoords.rearZ,
    0,
    bp.plateCoords.rearScale ?? 1,
  );
  addPlateMount(
    bp.plateCoords.frontY,
    bp.plateCoords.frontZ,
    Math.PI,
    bp.plateCoords.frontScale ?? 1,
  );

  // 9. Dynamic Body Kits, Aftermarket Spoilers, Liveries & Visual Finish / Lighting Packs
  const customKitGroup = new THREE.Group();
  const customSpoilerGroup = new THREE.Group();
  chassisGroup.add(customKitGroup);
  chassisGroup.add(customSpoilerGroup);

  const customGeos: THREE.BufferGeometry[] = [];
  const customMats: THREE.Material[] = [];
  let activeDrsBlade: THREE.Group | null = null;
  let spoilerAnimPrimaryMat: THREE.MeshStandardMaterial | null = null;
  let spoilerAnimSecondaryMat: THREE.MeshStandardMaterial | null = null;
  let spoilerHoverGroup: THREE.Group | null = null;
  let spoilerHoverBaseY = 0;
  let kitNeonTrimMat: THREE.MeshStandardMaterial | null = null;
  const trackCustomGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    customGeos.push(g);
    return g;
  };
  const trackCustomMat = <T extends THREE.Material>(m: T): T => {
    customMats.push(m);
    return m;
  };

  let currentPaintHex = initialHex;
  let currentCustom: CarCustomConfig = {
    ...getDefaultCustomForCar(),
    ...initialCustom,
  };
  let activeLiveryTex: THREE.CanvasTexture | null = null;
  let activeLiveryEmissiveTex: THREE.CanvasTexture | null = null;
  const _fxColor = new THREE.Color();
  const _basePaintColor = new THREE.Color(initialHex);
  const _whiteColor = new THREE.Color(0xffffff);

  const frontSt = bp.stations[0];
  const rearSt = bp.stations[bp.stations.length - 1];
  const frontNoseZ = frontSt.z;
  const rearTailZ = rearSt.z;
  const lowLipY = Math.max(0.145, frontSt.bottomY - 0.032);
  const deckY = rearSt.crownY;

  const applyPaintFinishProfile = (finish: PaintFinishId): void => {
    if (finish === 'matte') {
      paintMaterial.metalness = 0.16;
      paintMaterial.roughness = 0.72;
      paintMaterial.clearcoat = 0.06;
      paintMaterial.clearcoatRoughness = 0.58;
      paintMaterial.envMapIntensity = 0.72;
      paintMaterial.iridescence = 0;
    } else if (finish === 'chrome') {
      paintMaterial.metalness = 0.99;
      paintMaterial.roughness = 0.04;
      paintMaterial.clearcoat = 1.0;
      paintMaterial.clearcoatRoughness = 0.02;
      paintMaterial.envMapIntensity = 2.6;
      paintMaterial.iridescence = 0;
    } else if (finish === 'carbon') {
      paintMaterial.metalness = 0.42;
      paintMaterial.roughness = 0.24;
      paintMaterial.clearcoat = 1.0;
      paintMaterial.clearcoatRoughness = 0.06;
      paintMaterial.envMapIntensity = 1.55;
      paintMaterial.iridescence = 0;
    } else if (finish === 'chameleon') {
      paintMaterial.metalness = 0.88;
      paintMaterial.roughness = 0.12;
      paintMaterial.clearcoat = 1.0;
      paintMaterial.clearcoatRoughness = 0.03;
      paintMaterial.envMapIntensity = 2.15;
      paintMaterial.iridescence = 1.0;
      paintMaterial.iridescenceIOR = 1.48;
      paintMaterial.iridescenceThicknessRange = [180, 620];
    } else if (finish === 'satinGold') {
      paintMaterial.metalness = 0.9;
      paintMaterial.roughness = 0.26;
      paintMaterial.clearcoat = 0.55;
      paintMaterial.clearcoatRoughness = 0.24;
      paintMaterial.envMapIntensity = 2.05;
      paintMaterial.iridescence = 0.22;
      paintMaterial.iridescenceIOR = 1.32;
      paintMaterial.iridescenceThicknessRange = [200, 380];
    } else if (finish === 'frostedIce') {
      paintMaterial.metalness = 0.56;
      paintMaterial.roughness = 0.34;
      paintMaterial.clearcoat = 0.72;
      paintMaterial.clearcoatRoughness = 0.22;
      paintMaterial.envMapIntensity = 1.65;
      paintMaterial.iridescence = 0.78;
      paintMaterial.iridescenceIOR = 1.31;
      paintMaterial.iridescenceThicknessRange = [140, 420];
    } else if (finish === 'forgedCarbon') {
      paintMaterial.metalness = 0.48;
      paintMaterial.roughness = 0.18;
      paintMaterial.clearcoat = 1.0;
      paintMaterial.clearcoatRoughness = 0.04;
      paintMaterial.envMapIntensity = 1.85;
      paintMaterial.iridescence = 0;
    } else if (finish === 'prismHolo') {
      paintMaterial.metalness = 0.98;
      paintMaterial.roughness = 0.06;
      paintMaterial.clearcoat = 1.0;
      paintMaterial.clearcoatRoughness = 0.02;
      paintMaterial.envMapIntensity = 2.55;
      paintMaterial.iridescence = 1.0;
      paintMaterial.iridescenceIOR = 1.68;
      paintMaterial.iridescenceThicknessRange = [160, 740];
    } else if (finish === 'obsidianChrome') {
      paintMaterial.metalness = 0.96;
      paintMaterial.roughness = 0.08;
      paintMaterial.clearcoat = 1.0;
      paintMaterial.clearcoatRoughness = 0.02;
      paintMaterial.envMapIntensity = 2.35;
      paintMaterial.iridescence = 0.45;
      paintMaterial.iridescenceIOR = 1.42;
      paintMaterial.iridescenceThicknessRange = [180, 440];
    } else if (finish === 'emeraldLiquid') {
      paintMaterial.metalness = 0.95;
      paintMaterial.roughness = 0.09;
      paintMaterial.clearcoat = 1.0;
      paintMaterial.clearcoatRoughness = 0.03;
      paintMaterial.envMapIntensity = 2.4;
      paintMaterial.iridescence = 0.72;
      paintMaterial.iridescenceIOR = 1.46;
      paintMaterial.iridescenceThicknessRange = [200, 560];
    } else if (finish === 'royalGoldHolo') {
      paintMaterial.metalness = 0.96;
      paintMaterial.roughness = 0.08;
      paintMaterial.clearcoat = 1.0;
      paintMaterial.clearcoatRoughness = 0.02;
      paintMaterial.envMapIntensity = 2.5;
      paintMaterial.iridescence = 0.92;
      paintMaterial.iridescenceIOR = 1.56;
      paintMaterial.iridescenceThicknessRange = [220, 620];
    } else if (finish === 'apexEclipse') {
      paintMaterial.metalness = 0.99;
      paintMaterial.roughness = 0.05;
      paintMaterial.clearcoat = 1.0;
      paintMaterial.clearcoatRoughness = 0.015;
      paintMaterial.envMapIntensity = 2.75;
      paintMaterial.iridescence = 1.0;
      paintMaterial.iridescenceIOR = 1.75;
      paintMaterial.iridescenceThicknessRange = [180, 780];
    } else if (finish === 'velvetPearl') {
      paintMaterial.metalness = 0.42;
      paintMaterial.roughness = 0.32;
      paintMaterial.clearcoat = 0.85;
      paintMaterial.clearcoatRoughness = 0.14;
      paintMaterial.envMapIntensity = 1.65;
      paintMaterial.iridescence = 0.55;
      paintMaterial.iridescenceIOR = 1.35;
      paintMaterial.iridescenceThicknessRange = [200, 460];
    } else if (finish === 'brushedTitanium') {
      paintMaterial.metalness = 0.92;
      paintMaterial.roughness = 0.24;
      paintMaterial.clearcoat = 0.55;
      paintMaterial.clearcoatRoughness = 0.12;
      paintMaterial.envMapIntensity = 2.1;
      paintMaterial.iridescence = 0.15;
    } else if (finish === 'candyGloss') {
      paintMaterial.metalness = 0.86;
      paintMaterial.roughness = 0.07;
      paintMaterial.clearcoat = 1.0;
      paintMaterial.clearcoatRoughness = 0.015;
      paintMaterial.envMapIntensity = 2.45;
      paintMaterial.iridescence = 0.32;
      paintMaterial.iridescenceIOR = 1.4;
      paintMaterial.iridescenceThicknessRange = [180, 420];
    } else if (finish === 'copperLiquid') {
      paintMaterial.metalness = 0.97;
      paintMaterial.roughness = 0.07;
      paintMaterial.clearcoat = 1.0;
      paintMaterial.clearcoatRoughness = 0.02;
      paintMaterial.envMapIntensity = 2.55;
      paintMaterial.iridescence = 0.65;
      paintMaterial.iridescenceIOR = 1.48;
      paintMaterial.iridescenceThicknessRange = [210, 520];
    } else if (finish === 'nebulaShift') {
      paintMaterial.metalness = 0.96;
      paintMaterial.roughness = 0.06;
      paintMaterial.clearcoat = 1.0;
      paintMaterial.clearcoatRoughness = 0.02;
      paintMaterial.envMapIntensity = 2.65;
      paintMaterial.iridescence = 1.0;
      paintMaterial.iridescenceIOR = 1.66;
      paintMaterial.iridescenceThicknessRange = [190, 720];
    } else {
      paintMaterial.metalness = 0.78;
      paintMaterial.roughness = 0.17;
      paintMaterial.clearcoat = 1.0;
      paintMaterial.clearcoatRoughness = 0.04;
      paintMaterial.envMapIntensity = 1.78;
      paintMaterial.iridescence = 0;
    }
  };

  let cachedLiverySpec =
    LIVERIES.find((l) => l.id === currentCustom.livery) || LIVERIES[0];
  let cachedUnderglowSpec =
    UNDERGLOWS.find((u) => u.id === currentCustom.underglow) || UNDERGLOWS[0];
  let cachedHeadlightSpec =
    HEADLIGHTS.find((h) => h.id === currentCustom.headlight) || HEADLIGHTS[0];
  let cachedNitroSpec =
    NITRO_FLAMES.find((f) => f.id === currentCustom.nitroFlame) || NITRO_FLAMES[0];

  const applyPaintAndLivery = (): void => {
    cachedLiverySpec =
      LIVERIES.find((l) => l.id === currentCustom.livery) || LIVERIES[0];
    if (activeLiveryTex) {
      activeLiveryTex.dispose();
      activeLiveryTex = null;
    }
    if (activeLiveryEmissiveTex) {
      activeLiveryEmissiveTex.dispose();
      activeLiveryEmissiveTex = null;
    }
    const finish = currentCustom.paintFinish ?? 'metallic';
    applyPaintFinishProfile(finish);
    _basePaintColor.setHex(currentPaintHex);

    const bundle = createLiveryTextures(
      currentPaintHex,
      currentCustom.livery,
      finish,
    );
    if (bundle.map) {
      activeLiveryTex = bundle.map;
      paintMaterial.map = bundle.map;
      paintMaterial.color.setHex(0xffffff);
    } else {
      paintMaterial.map = null;
      paintMaterial.color.setHex(currentPaintHex);
    }

    if (bundle.emissiveMap) {
      activeLiveryEmissiveTex = bundle.emissiveMap;
      paintMaterial.emissiveMap = bundle.emissiveMap;
      paintMaterial.emissive.setHex(0xffffff);
      paintMaterial.emissiveIntensity = 1.05;
    } else {
      paintMaterial.emissiveMap = null;
      paintMaterial.emissive.setHex(0x000000);
      paintMaterial.emissiveIntensity = 0;
    }

    const isAquarium = currentCustom.livery === 'animLiquidAquarium';
    if (isAquarium) ensureAquariumBuilt();
    aquariumGroup.visible = isAquarium;
    if (isAquarium) {
      paintMaterial.transparent = true;
      paintMaterial.opacity = 0.34;
      paintMaterial.roughness = 0.05;
      paintMaterial.metalness = 0.08;
      paintMaterial.clearcoat = 1.0;
      paintMaterial.clearcoatRoughness = 0.02;
      paintMaterial.depthWrite = false;
      paintMaterial.emissiveIntensity = 0.42;
    } else {
      paintMaterial.transparent = false;
      paintMaterial.opacity = 1.0;
      paintMaterial.depthWrite = true;
      if (currentCustom.livery === 'animVenomSymbiote') {
        paintMaterial.roughness = 0.12;
        paintMaterial.metalness = 0.35;
        paintMaterial.clearcoat = 1.0;
        paintMaterial.clearcoatRoughness = 0.03;
      } else if (currentCustom.livery === 'animCrysisNanosuit') {
        paintMaterial.roughness = 0.24;
        paintMaterial.metalness = 0.72;
        paintMaterial.clearcoat = 0.68;
        paintMaterial.clearcoatRoughness = 0.14;
      } else if (
        currentCustom.livery === 'knittedSweater' ||
        currentCustom.livery === 'lushGrassTurf'
      ) {
        paintMaterial.roughness = 0.94;
        paintMaterial.metalness = 0.02;
        paintMaterial.clearcoat = 0.0;
      } else if (currentCustom.livery === 'carvedWood') {
        paintMaterial.roughness = 0.44;
        paintMaterial.metalness = 0.06;
        paintMaterial.clearcoat = 0.35;
        paintMaterial.clearcoatRoughness = 0.28;
      }
    }
    paintMaterial.needsUpdate = true;
  };

  const syncHeadlightOpticalStrength = (): void => {
    const hlSpec = cachedHeadlightSpec;
    const isCustom = hlSpec.id !== 'stock';
    const gScale = THREE.MathUtils.clamp(headlightGlowScale, 0, 1.25);

    const flareOpacity = (isCustom ? 0.68 : 0.46) * gScale;
    headFlareMat.opacity = flareOpacity;
    const flareScaleX = (isCustom ? 0.82 : 0.58) * (0.75 + 0.25 * gScale);
    const flareScaleY = (isCustom ? 0.66 : 0.48) * (0.75 + 0.25 * gScale);
    for (const sp of headFlareSprites) {
      sp.visible = hlAnchor.enabled && flareOpacity > 0.02;
      sp.scale.set(flareScaleX, flareScaleY, 1);
    }

    const beamOpacity =
      (isCustom ? (isSoftwareGl ? 0.42 : 0.34) : isSoftwareGl ? 0.29 : 0.22) *
      gScale;
    headBeamGroundMat.opacity = beamOpacity;
    headBeamGroundMesh.visible = hlAnchor.enabled && beamOpacity > 0.02;
  };

  const applyLightsAndVisualFx = (): void => {
    // 1. Underbody Neon (2-layer organic spill + real PointLight bounce + recessed LED strip)
    const ugSpec =
      UNDERGLOWS.find((u) => u.id === currentCustom.underglow) || UNDERGLOWS[0];
    cachedUnderglowSpec = ugSpec;
    underglowGroup.visible = ugSpec.mode !== 'off';
    if (ugSpec.mode !== 'off') {
      underglowOuterMat.color.setHex(ugSpec.hex);
      underglowInnerMat.color.setHex(ugSpec.hex);
      underglowStripMat.emissive.setHex(ugSpec.hex);
      underglowLight.color.setHex(ugSpec.hex);
      underglowOuterMat.opacity = isSoftwareGl ? 0.39 : 0.34;
      underglowInnerMat.opacity = isSoftwareGl ? 0.58 : 0.52;
      underglowLight.intensity = isSoftwareGl ? 0 : 4.8;
    } else {
      underglowLight.intensity = 0;
    }

    // 2. Headlights (Bulb, DRL, SpotLight Beam, Anamorphic Flare & Ground Projection)
    const hlSpec =
      HEADLIGHTS.find((h) => h.id === currentCustom.headlight) || HEADLIGHTS[0];
    cachedHeadlightSpec = hlSpec;
    headLightMaterial.color.setHex(hlSpec.bulbHex);
    headLightMaterial.emissive.setHex(hlSpec.emissiveHex);
    drlMat.color.setHex(hlSpec.bulbHex);
    drlMat.emissive.setHex(hlSpec.emissiveHex);
    spotL.color.setHex(hlSpec.beamHex);
    spotR.color.setHex(hlSpec.beamHex);
    headFlareMat.color.setHex(hlSpec.emissiveHex);
    headBeamGroundMat.color.setHex(hlSpec.beamHex);
    syncHeadlightOpticalStrength();

    // 3. Nitro Flame Cone Color
    const nfSpec =
      NITRO_FLAMES.find((f) => f.id === currentCustom.nitroFlame) ||
      NITRO_FLAMES[0];
    cachedNitroSpec = nfSpec;
    flameMat.color.setHex(nfSpec.coneHex);

    // 4. License Plate Frame & Style
    const activePlateStyle = currentCustom.plateStyle ?? 'classic';
    rebuildPlateFrame3D(activePlateStyle);
    drawLicensePlate(currentPlateText, activePlateStyle, 0);
    lastAnimPlateDrawSec = -10;
  };

  const setHeadlightGlowScale = (scale: number): void => {
    if (Math.abs(scale - headlightGlowScale) < 0.004) return;
    headlightGlowScale = scale;
    syncHeadlightOpticalStrength();
  };

  const rebuildCustomAero = (kit: BodyKitId, spoiler: SpoilerId): void => {
    customKitGroup.clear();
    customSpoilerGroup.clear();
    customGeos.forEach((g) => g.dispose());
    customGeos.length = 0;
    customMats.forEach((m) => m.dispose());
    customMats.length = 0;
    activeDrsBlade = null;
    spoilerAnimPrimaryMat = null;
    spoilerAnimSecondaryMat = null;
    spoilerHoverGroup = null;
    spoilerHoverBaseY = 0;
    kitNeonTrimMat = null;

    const isBespokeKit =
      kit === 'madMaxArmor' ||
      kit === 'dragBlowerKit' ||
      kit === 'bosozokuExotic' ||
      kit === 'cyberExoMech';
    const isWideKit =
      kit === 'widebody' ||
      kit === 'cyberWide' ||
      kit === 'rallyArmor' ||
      kit === 'royalGoldWide' ||
      kit === 'hyperPlasmaKit' ||
      kit === 'bosozokuExotic';
    const isTrackAeroKit =
      kit === 'f1TrackPro' || kit === 'gt3Endurance' || kit === 'hyperPlasmaKit';
    const isNeonTrimKit = kit === 'cyberWide' || kit === 'hyperPlasmaKit';
    stockLowerAeroGroup.visible = kit === 'stock';
    stockArchFlareGroup.visible = !isWideKit && !isBespokeKit;

    if (kit === 'madMaxArmor') {
      // =========================================================================
      // BESPOKE KIT 1: MAD MAX WASTELAND WAR RIG ARMOR
      // Spiked V-Shaped Ram Plow, Twin Side-Pipe Exhausts, Welded Crash Bars & Rear Bash Cage!
      // =========================================================================
      const rustMat = trackCustomMat(
        new THREE.MeshStandardMaterial({ color: 0x6b3218, roughness: 0.9, metalness: 0.52 }),
      );
      const ironMat = trackCustomMat(
        new THREE.MeshStandardMaterial({ color: 0x2d3036, roughness: 0.72, metalness: 0.82 }),
      );
      const pipeChromeMat = trackCustomMat(
        new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.28, metalness: 0.92 }),
      );
      const hazYellowMat = trackCustomMat(
        new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.68, metalness: 0.2 }),
      );

      // Massive V-shaped armored wedge snowplow ram bumper bolted across front nose!
      const plowWingGeo = trackCustomGeo(new THREE.BoxGeometry(bodyWidth * 0.64, 0.34, 0.08));
      for (const sx of [-1, 1]) {
        const plowWing = new THREE.Mesh(plowWingGeo, ironMat);
        plowWing.position.set(sx * (bodyWidth * 0.27), lowLipY + 0.14, frontNoseZ - 0.22);
        plowWing.rotation.y = sx * -0.34;
        plowWing.rotation.x = 0.22;
        plowWing.castShadow = true;
        customKitGroup.add(plowWing);

        // Welded rusted patch plate on plow face
        const patch = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(bodyWidth * 0.24, 0.16, 0.095)),
          sx < 0 ? rustMat : hazYellowMat,
        );
        patch.position.set(sx * (bodyWidth * 0.34), lowLipY + 0.16, frontNoseZ - 0.18);
        patch.rotation.y = sx * -0.34;
        patch.rotation.x = 0.22;
        customKitGroup.add(patch);
      }
      // 7 Mean Iron Ramming Spikes projecting forward from the front V-plow!
      const spikeGeo = trackCustomGeo(new THREE.ConeGeometry(0.036, 0.28, 5));
      spikeGeo.rotateX(-Math.PI * 0.5);
      for (let i = -3; i <= 3; i++) {
        const sx = i * (bodyWidth * 0.16);
        const sz = frontNoseZ - 0.36 + Math.abs(i) * 0.055;
        const sp = new THREE.Mesh(spikeGeo, i % 2 === 0 ? ironMat : rustMat);
        sp.position.set(sx, lowLipY + 0.14, sz);
        customKitGroup.add(sp);
      }

      // Exposed Heavy Chrome Side-Pipe Exhaust Stacks + Welded Side Crash Rails along both rockers!
      const sidePipeLen = wheelBaseHalf * 1.56;
      const sidePipeGeo = trackCustomGeo(new THREE.CylinderGeometry(0.048, 0.048, sidePipeLen, 12));
      sidePipeGeo.rotateX(Math.PI * 0.5);
      const railGeo = trackCustomGeo(new THREE.CylinderGeometry(0.022, 0.022, sidePipeLen * 0.92, 8));
      railGeo.rotateX(Math.PI * 0.5);
      for (const side of [-1, 1]) {
        const px = side * (bodyWidth * 0.555);
        const pipe = new THREE.Mesh(sidePipeGeo, pipeChromeMat);
        pipe.position.set(px, lowLipY + 0.08, 0.02);
        pipe.castShadow = true;
        customKitGroup.add(pipe);
        // Perforated rusted heat shield clamped around side pipe
        const shield = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(0.032, 0.11, sidePipeLen * 0.62)),
          rustMat,
        );
        shield.position.set(px + side * 0.038, lowLipY + 0.09, 0.04);
        customKitGroup.add(shield);
        // Side-exit flared megaphone exhaust tip curving outward behind doors
        const tip = new THREE.Mesh(
          trackCustomGeo(new THREE.CylinderGeometry(0.064, 0.048, 0.22, 12)),
          pipeChromeMat,
        );
        tip.rotation.z = side * -Math.PI * 0.36;
        tip.position.set(px + side * 0.07, lowLipY + 0.12, sidePipeLen * 0.45);
        customKitGroup.add(tip);
        // Upper rusted crash-guard bar protecting the doors
        const rail = new THREE.Mesh(railGeo, ironMat);
        rail.position.set(side * (bodyWidth * 0.545), lowLipY + 0.32, 0.02);
        customKitGroup.add(rail);
      }

      // Armored Rear Bash-Bar Cage with Twin Vertical Spikes!
      const rearBar = new THREE.Mesh(
        trackCustomGeo(new THREE.CylinderGeometry(0.038, 0.038, bodyWidth * 0.98, 10)),
        ironMat,
      );
      rearBar.rotation.z = Math.PI * 0.5;
      rearBar.position.set(0, lowLipY + 0.18, rearTailZ + 0.16);
      customKitGroup.add(rearBar);
      const rearBarTop = new THREE.Mesh(
        trackCustomGeo(new THREE.CylinderGeometry(0.028, 0.028, bodyWidth * 0.78, 10)),
        rustMat,
      );
      rearBarTop.rotation.z = Math.PI * 0.5;
      rearBarTop.position.set(0, lowLipY + 0.36, rearTailZ + 0.12);
      customKitGroup.add(rearBarTop);
      for (const sx of [-0.36, 0, 0.36]) {
        const vPost = new THREE.Mesh(
          trackCustomGeo(new THREE.CylinderGeometry(0.024, 0.024, 0.32, 8)),
          ironMat,
        );
        vPost.position.set(sx * bodyWidth, lowLipY + 0.28, rearTailZ + 0.14);
        customKitGroup.add(vPost);
      }
    } else if (kit === 'dragBlowerKit') {
      // =========================================================================
      // BESPOKE KIT 2: AMERICAN V8 SUPERCHARGER DRAGSTER KIT
      // Towering Chrome V8 Blower bursting out of the hood + Zoomie Headers + Rear Wheelie Bars!
      // =========================================================================
      const blowerChromeMat = trackCustomMat(
        new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.08, metalness: 0.98 }),
      );
      const beltRubberMat = trackCustomMat(
        new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.9, metalness: 0.08 }),
      );
      const butterflyRedMat = trackCustomMat(
        new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.22, metalness: 0.5 }),
      );
      const billetMat = trackCustomMat(
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.88 }),
      );

      // Find exact hood center Z & surface Y so the V8 Supercharger sits flush on EVERY car model!
      const hoodRefSt = bp.stations[Math.min(2, bp.stations.length - 1)];
      const hoodY = hoodRefSt.crownY;
      const hoodZ = (frontNoseZ + bp.cabin[0].z) * 0.5;

      // Ribbed Billet V8 Supercharger Housing bursting straight out of the hood!
      const blowerBlock = new THREE.Mesh(
        trackCustomGeo(new THREE.BoxGeometry(0.46, 0.24, 0.52)),
        billetMat,
      );
      blowerBlock.position.set(0, hoodY + 0.1, hoodZ);
      blowerBlock.castShadow = true;
      customKitGroup.add(blowerBlock);

      // Chrome cooling ribs along the blower sides
      for (let r = 0; r < 4; r++) {
        const rib = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(0.5, 0.024, 0.48)),
          blowerChromeMat,
        );
        rib.position.set(0, hoodY + 0.04 + r * 0.052, hoodZ);
        customKitGroup.add(rib);
      }

      // Twin Front Pulleys & Wide Ribbed Serpentine Supercharger Drive Belt!
      const pulleyGeo = trackCustomGeo(new THREE.CylinderGeometry(0.095, 0.095, 0.06, 18));
      pulleyGeo.rotateX(Math.PI * 0.5);
      const topPulley = new THREE.Mesh(pulleyGeo, blowerChromeMat);
      topPulley.position.set(0, hoodY + 0.18, hoodZ - 0.29);
      customKitGroup.add(topPulley);
      const driveBelt = new THREE.Mesh(
        trackCustomGeo(new THREE.BoxGeometry(0.18, 0.24, 0.052)),
        beltRubberMat,
      );
      driveBelt.position.set(0, hoodY + 0.09, hoodZ - 0.29);
      customKitGroup.add(driveBelt);

      // Iconic Towering Polished Chrome "Bug-Catcher" Triple-Butterfly Air Scoop!
      const scoop = new THREE.Mesh(
        trackCustomGeo(new THREE.BoxGeometry(0.44, 0.17, 0.58)),
        blowerChromeMat,
      );
      scoop.position.set(0, hoodY + 0.3, hoodZ - 0.04);
      scoop.castShadow = true;
      customKitGroup.add(scoop);

      // 3 Crimson Racing Butterfly Intake Valves inside the front opening (-Z)
      const valveGeo = trackCustomGeo(new THREE.CylinderGeometry(0.058, 0.058, 0.018, 16));
      valveGeo.rotateX(Math.PI * 0.5);
      for (const vx of [-0.135, 0, 0.135]) {
        const valve = new THREE.Mesh(valveGeo, butterflyRedMat);
        valve.position.set(vx, hoodY + 0.3, hoodZ - 0.335);
        customKitGroup.add(valve);
      }

      // Side-Exit Quad Dragster Zoomie Exhaust Headers poking out behind front fenders!
      const zoomieGeo = trackCustomGeo(new THREE.CylinderGeometry(0.036, 0.036, 0.28, 10));
      for (const side of [-1, 1]) {
        for (let zIdx = 0; zIdx < 4; zIdx++) {
          const pipe = new THREE.Mesh(zoomieGeo, blowerChromeMat);
          pipe.position.set(
            side * (bodyWidth * 0.54),
            lowLipY + 0.12,
            hoodZ + 0.12 + zIdx * 0.11,
          );
          pipe.rotation.z = side * -1.15;
          pipe.rotation.x = 0.45;
          customKitGroup.add(pipe);
        }
      }

      // Classic Drag Racing Rear Tubular Wheelie Bars + Dual Mini Wheelie Tires!
      const barLen = 1.05;
      const barGeo = trackCustomGeo(new THREE.CylinderGeometry(0.022, 0.022, barLen, 8));
      barGeo.rotateX(Math.PI * 0.5);
      const wheelieTireGeo = trackCustomGeo(new THREE.CylinderGeometry(0.11, 0.11, 0.07, 16));
      wheelieTireGeo.rotateZ(Math.PI * 0.5);
      for (const sx of [-1, 1]) {
        const wx = sx * (bodyWidth * 0.28);
        const lowerBar = new THREE.Mesh(barGeo, blowerChromeMat);
        lowerBar.position.set(wx, lowLipY + 0.05, rearTailZ + barLen * 0.46);
        customKitGroup.add(lowerBar);
        const upperBar = new THREE.Mesh(barGeo, butterflyRedMat);
        upperBar.position.set(wx, lowLipY + 0.16, rearTailZ + barLen * 0.46);
        upperBar.rotation.x = 0.18;
        customKitGroup.add(upperBar);

        const wTire = new THREE.Mesh(wheelieTireGeo, beltRubberMat);
        wTire.position.set(wx, lowLipY + 0.02, rearTailZ + barLen * 0.94);
        customKitGroup.add(wTire);
        const wHub = new THREE.Mesh(
          trackCustomGeo(new THREE.CylinderGeometry(0.055, 0.055, 0.078, 12)),
          blowerChromeMat,
        );
        wHub.rotation.z = Math.PI * 0.5;
        wHub.position.set(wx, lowLipY + 0.02, rearTailZ + barLen * 0.94);
        customKitGroup.add(wHub);
      }
      // Cross-tie rod between the two wheelie bars
      const crossTie = new THREE.Mesh(
        trackCustomGeo(new THREE.CylinderGeometry(0.018, 0.018, bodyWidth * 0.58, 8)),
        blowerChromeMat,
      );
      crossTie.rotation.z = Math.PI * 0.5;
      crossTie.position.set(0, lowLipY + 0.06, rearTailZ + barLen * 0.78);
      customKitGroup.add(crossTie);
    } else if (kit === 'bosozokuExotic') {
      // =========================================================================
      // BESPOKE KIT 3: JAPANESE BOSOZOKU / KAIDO RACER KIT
      // Giant Extended Shark-Nose Splitter, Tilted Oil Cooler, Box Fenders & 4 Sky-High Takeyari Pipes!
      // =========================================================================
      const chromePipeMat = trackCustomMat(
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.1, metalness: 0.96 }),
      );
      const oilCoolerMat = trackCustomMat(
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.85 }),
      );
      const bosoRedMat = trackCustomMat(
        new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.25, metalness: 0.35 }),
      );

      // Wildly elongated Japanese Kaido "Chin-Spoiler" front snowplow splitter jutting far forward!
      const bosoLipDepth = 0.92;
      const bosoLipW = bodyWidth * 1.18;
      const megaLip = new THREE.Mesh(
        trackCustomGeo(new THREE.BoxGeometry(bosoLipW, 0.065, bosoLipDepth)),
        paintMaterial,
      );
      megaLip.position.set(0, lowLipY + 0.01, frontNoseZ - bosoLipDepth * 0.38);
      megaLip.castShadow = true;
      customKitGroup.add(megaLip);

      // Crisp red & white lip edge trim + tilted exposed front external oil cooler with braided hoses!
      const lipTrim = new THREE.Mesh(
        trackCustomGeo(new THREE.BoxGeometry(bosoLipW * 0.98, 0.024, 0.06)),
        bosoRedMat,
      );
      lipTrim.position.set(0, lowLipY + 0.045, frontNoseZ - bosoLipDepth * 0.82);
      customKitGroup.add(lipTrim);

      const oilCooler = new THREE.Mesh(
        trackCustomGeo(new THREE.BoxGeometry(0.48, 0.16, 0.06)),
        oilCoolerMat,
      );
      oilCooler.position.set(0.18, lowLipY + 0.2, frontNoseZ - 0.18);
      oilCooler.rotation.set(-0.34, -0.18, 0.08);
      customKitGroup.add(oilCooler);

      // Braided oil-cooler hose lines looping into the front grille
      const hoseGeo = trackCustomGeo(new THREE.TorusGeometry(0.11, 0.014, 6, 12, Math.PI));
      for (const hx of [0.02, 0.34]) {
        const hose = new THREE.Mesh(hoseGeo, matteTrimMat);
        hose.position.set(hx, lowLipY + 0.22, frontNoseZ - 0.08);
        hose.rotation.y = Math.PI * 0.5;
        customKitGroup.add(hose);
      }

      // Massive Squared Box-Style Kaido Widebody Side Skirts & Over-Fenders!
      const boxSkirtLen = wheelBaseHalf * 1.72;
      const boxSkirtGeo = trackCustomGeo(new THREE.BoxGeometry(0.24, 0.22, boxSkirtLen));
      for (const side of [-1, 1]) {
        const skirt = new THREE.Mesh(boxSkirtGeo, paintMaterial);
        skirt.position.set(side * (bodyWidth * 0.58), lowLipY + 0.09, 0.02);
        skirt.castShadow = true;
        customKitGroup.add(skirt);
        // Boxy protruding fender flares
        for (const wz of [-wheelBaseHalf, wheelBaseHalf]) {
          const boxArch = new THREE.Mesh(
            trackCustomGeo(new THREE.BoxGeometry(0.16, 0.36, 0.72)),
            paintMaterial,
          );
          boxArch.position.set(side * (bodyWidth * 0.57), lowLipY + 0.32, wz);
          boxArch.castShadow = true;
          customKitGroup.add(boxArch);
        }
      }

      // THE ICONIC 4 TOWERING SKY-HIGH TAKEYARI EXHAUST PIPES shooting 1.15m into the sky!
      const takeyariGeo = trackCustomGeo(new THREE.CylinderGeometry(0.036, 0.04, 1.18, 12));
      const pipeConfigs = [
        { x: -0.22, rz: 0.16, rx: 0.28 },
        { x: -0.09, rz: 0.06, rx: 0.34 },
        { x: 0.09, rz: -0.06, rx: 0.34 },
        { x: 0.22, rz: -0.16, rx: 0.28 },
      ];
      for (const pc of pipeConfigs) {
        const pipe = new THREE.Mesh(takeyariGeo, chromePipeMat);
        pipe.position.set(pc.x, lowLipY + 0.62, rearTailZ + 0.28);
        pipe.rotation.set(pc.rx, 0, pc.rz);
        pipe.castShadow = true;
        customKitGroup.add(pipe);
        // Crimson tip collar band near top of each Takeyari pipe
        const band = new THREE.Mesh(
          trackCustomGeo(new THREE.CylinderGeometry(0.042, 0.042, 0.09, 12)),
          bosoRedMat,
        );
        band.position.set(
          pc.x - Math.sin(pc.rz) * 0.44,
          lowLipY + 0.62 + Math.cos(pc.rx) * 0.44,
          rearTailZ + 0.28 + Math.sin(pc.rx) * 0.44,
        );
        band.rotation.set(pc.rx, 0, pc.rz);
        customKitGroup.add(band);
      }
    } else if (kit === 'cyberExoMech') {
      // =========================================================================
      // BESPOKE KIT 4: CYBERPUNK EXTERIOR TITANIUM EXOSKELETON + HOVER ENERGY PODS!
      // Full Exterior Roll-Cage Arches, Floating Glowing Side Pods & Twin Rear Cyber-Turbine Rings!
      // =========================================================================
      const exoTiMat = trackCustomMat(
        new THREE.MeshStandardMaterial({ color: 0x272c38, roughness: 0.32, metalness: 0.88 }),
      );
      const neonMat = trackCustomMat(
        new THREE.MeshStandardMaterial({
          color: 0x22d3ee,
          emissive: 0x06b6d4,
          emissiveIntensity: 2.2,
          roughness: 0.12,
        }),
      );
      kitNeonTrimMat = neonMat;

      // Exterior Titanium Tubular Exo-Frame Arching Over the Entire Car (Left & Right Rails)!
      const [, cabFront, cabRear] = bp.cabin;
      const roofY = Math.max(cabFront.crownY, cabRear.crownY) + 0.055;
      const exoTubeRadius = 0.032;
      const addExoTube = (p0: THREE.Vector3, p1: THREE.Vector3, mat: THREE.Material) => {
        const dir = new THREE.Vector3().subVectors(p1, p0);
        const len = dir.length();
        if (len < 0.01) return;
        const tube = new THREE.Mesh(
          trackCustomGeo(new THREE.CylinderGeometry(exoTubeRadius, exoTubeRadius, len, 10)),
          mat,
        );
        tube.position.copy(p0).addScaledVector(dir, 0.5);
        tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        tube.castShadow = true;
        customKitGroup.add(tube);
      };

      for (const side of [-1, 1]) {
        const fOuter = new THREE.Vector3(side * (bodyWidth * 0.46), lowLipY + 0.28, frontNoseZ - 0.12);
        const aPillarBot = new THREE.Vector3(side * (bodyWidth * 0.48), beltlineY + 0.04, bp.cabin[0].z);
        const roofFront = new THREE.Vector3(side * (cabinWidth * 0.54), roofY, cabFront.z);
        const roofBack = new THREE.Vector3(side * (cabinWidth * 0.54), roofY, cabRear.z);
        const rearDeckPt = new THREE.Vector3(side * (bodyWidth * 0.46), deckY + 0.06, rearTailZ + 0.08);
        const rearLow = new THREE.Vector3(side * (bodyWidth * 0.46), lowLipY + 0.16, rearTailZ + 0.14);

        addExoTube(fOuter, aPillarBot, exoTiMat);
        addExoTube(aPillarBot, roofFront, exoTiMat);
        addExoTube(roofFront, roofBack, exoTiMat);
        addExoTube(roofBack, rearDeckPt, exoTiMat);
        addExoTube(rearDeckPt, rearLow, exoTiMat);

        // Floating Cyberpunk Side Hover-Energy Pod mounted outboard along rocker sills!
        const podLen = wheelBaseHalf * 1.48;
        const pod = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(0.18, 0.18, podLen)),
          exoTiMat,
        );
        pod.position.set(side * (bodyWidth * 0.6), lowLipY + 0.12, 0.02);
        pod.castShadow = true;
        customKitGroup.add(pod);

        const podGlow = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(0.205, 0.045, podLen * 0.88)),
          neonMat,
        );
        podGlow.position.set(side * (bodyWidth * 0.6), lowLipY + 0.12, 0.02);
        customKitGroup.add(podGlow);
      }

      // Overhead Roof Exo-Crossbars linking left & right exoskeleton rails
      addExoTube(
        new THREE.Vector3(-cabinWidth * 0.54, roofY, cabFront.z),
        new THREE.Vector3(cabinWidth * 0.54, roofY, cabFront.z),
        exoTiMat,
      );
      addExoTube(
        new THREE.Vector3(-cabinWidth * 0.54, roofY, cabRear.z),
        new THREE.Vector3(cabinWidth * 0.54, roofY, cabRear.z),
        exoTiMat,
      );

      // Twin Glowing Front Laser Bumper Blades
      for (const sx of [-1, 1]) {
        const fBlade = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(bodyWidth * 0.42, 0.045, 0.34)),
          exoTiMat,
        );
        fBlade.position.set(sx * (bodyWidth * 0.32), lowLipY + 0.04, frontNoseZ - 0.16);
        fBlade.rotation.y = sx * -0.18;
        customKitGroup.add(fBlade);

        const fNeon = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(bodyWidth * 0.38, 0.024, 0.045)),
          neonMat,
        );
        fNeon.position.set(sx * (bodyWidth * 0.32), lowLipY + 0.05, frontNoseZ - 0.31);
        fNeon.rotation.y = sx * -0.18;
        customKitGroup.add(fNeon);
      }

      // Twin Illuminated Rear Cyber-Turbine Diffuser Rings!
      const turbGeo = trackCustomGeo(new THREE.TorusGeometry(0.145, 0.024, 10, 24));
      const turbGlowGeo = trackCustomGeo(new THREE.TorusGeometry(0.115, 0.016, 8, 22));
      for (const sx of [-1, 1]) {
        const tx = sx * (bodyWidth * 0.28);
        const outer = new THREE.Mesh(turbGeo, exoTiMat);
        outer.position.set(tx, lowLipY + 0.16, rearTailZ + 0.12);
        customKitGroup.add(outer);
        const inner = new THREE.Mesh(turbGlowGeo, neonMat);
        inner.position.set(tx, lowLipY + 0.16, rearTailZ + 0.14);
        customKitGroup.add(inner);
      }
    } else if (kit !== 'stock') {
      const lipDepth =
        kit === 'street' || kit === 'driftSpec'
          ? 0.36
          : isTrackAeroKit
            ? 0.58
            : 0.48;
      const lipWidth = isWideKit
        ? bodyWidth * 1.13
        : isTrackAeroKit
          ? bodyWidth * 1.09
          : bodyWidth * 1.04;

      const frontLip = new THREE.Mesh(
        trackCustomGeo(new THREE.BoxGeometry(lipWidth, 0.048, lipDepth)),
        carbonMat,
      );
      frontLip.position.set(0, lowLipY, frontNoseZ - lipDepth * 0.25);
      frontLip.castShadow = true;
      customKitGroup.add(frontLip);

      const trimMaterial = isNeonTrimKit
        ? (() => {
            const m = trackCustomMat(
              new THREE.MeshStandardMaterial({
                color: kit === 'hyperPlasmaKit' ? 0xe879f9 : 0x22d3ee,
                emissive: kit === 'hyperPlasmaKit' ? 0xc026d3 : 0x06b6d4,
                emissiveIntensity: 1.9,
                roughness: 0.18,
                metalness: 0.35,
              }),
            );
            kitNeonTrimMat = m;
            return m;
          })()
        : kit === 'royalGoldWide'
          ? wheelGoldMat
          : kit === 'f1TrackPro' || kit === 'gt3Endurance'
            ? brakeRedMat
            : kit === 'driftSpec'
              ? trackCustomMat(
                  new THREE.MeshStandardMaterial({
                    color: 0x38bdf8,
                    roughness: 0.25,
                    metalness: 0.65,
                  }),
                )
              : amberMat;

      const lipTrim = new THREE.Mesh(
        trackCustomGeo(new THREE.BoxGeometry(lipWidth * 0.96, 0.02, 0.045)),
        trimMaterial,
      );
      lipTrim.position.set(0, lowLipY + 0.014, frontNoseZ - lipDepth * 0.72);
      customKitGroup.add(lipTrim);

      if (kit === 'rallyArmor') {
        // Rally tubular bullbar + quad rally spotlights on nose
        const bar = new THREE.Mesh(
          trackCustomGeo(new THREE.CylinderGeometry(0.024, 0.024, bodyWidth * 0.68, 10)),
          matteTrimMat,
        );
        bar.rotation.z = Math.PI / 2;
        bar.position.set(0, lowLipY + 0.26, frontNoseZ - 0.12);
        customKitGroup.add(bar);
        const podGeo = trackCustomGeo(new THREE.CylinderGeometry(0.075, 0.068, 0.07, 14));
        podGeo.rotateX(Math.PI / 2);
        const podLensMat = trackCustomMat(
          new THREE.MeshStandardMaterial({
            color: 0xfef08a,
            emissive: 0xfacc15,
            emissiveIntensity: 1.9,
            roughness: 0.1,
          }),
        );
        for (const px of [-0.34, -0.12, 0.12, 0.34]) {
          const pod = new THREE.Mesh(podGeo, podLensMat);
          pod.position.set(px, lowLipY + 0.32, frontNoseZ - 0.13);
          customKitGroup.add(pod);
        }
      }

      const skirtLen = wheelBaseHalf * 1.64;
      const skirtOutX = isWideKit
        ? bodyWidth * 0.565
        : isTrackAeroKit
          ? bodyWidth * 0.545
          : bodyWidth * 0.525;
      const sideBladeGeo = trackCustomGeo(
        new THREE.BoxGeometry(isWideKit ? 0.17 : 0.125, 0.052, skirtLen),
      );
      const sideWingletGeo = trackCustomGeo(
        new THREE.BoxGeometry(0.036, isTrackAeroKit ? 0.24 : 0.18, 0.28),
      );
      for (const side of [-1, 1]) {
        const blade = new THREE.Mesh(sideBladeGeo, carbonMat);
        blade.position.set(side * skirtOutX, lowLipY + 0.01, 0.04);
        customKitGroup.add(blade);
        const winglet = new THREE.Mesh(sideWingletGeo, carbonMat);
        winglet.position.set(
          side * (skirtOutX + 0.058),
          lowLipY + 0.1,
          wheelBaseHalf * 0.68,
        );
        customKitGroup.add(winglet);

        if (isNeonTrimKit || kit === 'royalGoldWide') {
          const sideNeon = new THREE.Mesh(
            trackCustomGeo(new THREE.BoxGeometry(0.024, 0.024, skirtLen * 0.94)),
            trimMaterial,
          );
          sideNeon.position.set(side * (skirtOutX + 0.085), lowLipY + 0.028, 0.04);
          customKitGroup.add(sideNeon);
        } else if (kit === 'f1TrackPro' || kit === 'gt3Endurance') {
          // Track-Pro / GT3 side bargeboard vane + red accent edge
          const barge = new THREE.Mesh(
            trackCustomGeo(new THREE.BoxGeometry(0.03, 0.22, 0.55)),
            carbonMat,
          );
          barge.position.set(
            side * (skirtOutX + 0.065),
            lowLipY + 0.11,
            -wheelBaseHalf * 0.52,
          );
          barge.rotation.y = side * 0.14;
          customKitGroup.add(barge);

          const redEdge = new THREE.Mesh(
            trackCustomGeo(new THREE.BoxGeometry(0.022, 0.02, skirtLen * 0.96)),
            brakeRedMat,
          );
          redEdge.position.set(side * (skirtOutX + 0.064), lowLipY + 0.02, 0.04);
          customKitGroup.add(redEdge);
        }
      }

      const diffW = bodyWidth * (isWideKit ? 0.98 : isTrackAeroKit ? 0.95 : 0.88);
      const diffDepth = isTrackAeroKit ? 0.3 : 0.22;
      const rearValance = new THREE.Mesh(
        trackCustomGeo(new THREE.BoxGeometry(diffW, 0.13, diffDepth)),
        carbonMat,
      );
      rearValance.position.set(0, lowLipY + 0.055, rearTailZ + (diffDepth - 0.22) * 0.45);
      customKitGroup.add(rearValance);

      const strakeOffsets =
        kit === 'street' || kit === 'driftSpec'
          ? [-0.42, -0.34, 0.34, 0.42]
          : isTrackAeroKit
            ? [-0.46, -0.38, -0.3, -0.22, 0.22, 0.3, 0.38, 0.46]
            : [-0.44, -0.37, -0.3, 0.3, 0.37, 0.44];
      const strakeGeo = trackCustomGeo(
        new THREE.BoxGeometry(0.03, isTrackAeroKit ? 0.16 : 0.13, diffDepth + 0.04),
      );
      for (const frac of strakeOffsets) {
        const strake = new THREE.Mesh(strakeGeo, kit === 'royalGoldWide' ? wheelGoldMat : matteTrimMat);
        strake.position.set(frac * diffW, lowLipY + 0.06, rearTailZ + 0.03);
        customKitGroup.add(strake);
      }

      if (isNeonTrimKit || kit === 'royalGoldWide') {
        const rearNeon = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(diffW * 0.94, 0.024, 0.03)),
          trimMaterial,
        );
        rearNeon.position.set(0, lowLipY + 0.125, rearTailZ + 0.11);
        customKitGroup.add(rearNeon);
      }

      if (
        kit === 'gtAero' ||
        kit === 'widebody' ||
        kit === 'cyberWide' ||
        kit === 'f1TrackPro' ||
        kit === 'driftSpec' ||
        kit === 'gt3Endurance' ||
        kit === 'royalGoldWide' ||
        kit === 'hyperPlasmaKit'
      ) {
        const strutGeo = trackCustomGeo(new THREE.CylinderGeometry(0.012, 0.012, 0.25, 8));
        const strutOffsets = isTrackAeroKit ? [-0.52, -0.22, 0.22, 0.52] : [-0.42, 0.42];
        for (const sx of strutOffsets) {
          const strut = new THREE.Mesh(strutGeo, kit === 'royalGoldWide' ? wheelGoldMat : chromeMat);
          strut.position.set(sx, lowLipY + 0.12, frontNoseZ - lipDepth * 0.48);
          strut.rotation.x = 0.24;
          customKitGroup.add(strut);
        }

        const canardGeo = trackCustomGeo(
          new THREE.BoxGeometry(isTrackAeroKit ? 0.18 : 0.14, 0.026, 0.3),
        );
        const canardYs = isTrackAeroKit ? [0.28, 0.4, 0.52] : [0.34, 0.47];
        for (const side of [-1, 1]) {
          for (const cy of canardYs) {
            const canard = new THREE.Mesh(canardGeo, carbonMat);
            canard.position.set(side * (lipWidth * 0.5 + 0.02), cy, frontNoseZ + 0.22);
            canard.rotation.x = 0.28;
            canard.rotation.z = side * -0.18;
            customKitGroup.add(canard);
          }
        }
      }

      if (isWideKit && modelId !== 'f1') {
        const wbFrontArch = trackCustomGeo(
          buildArchLipGeometry(wheelRadius + 0.045, 0.098, 0.12, 22),
        );
        const wbRearArch = trackCustomGeo(
          buildArchLipGeometry(rearWheelRadius + 0.045, 0.105, 0.13, 22),
        );
        for (const [side, wz, isRear] of [
          [-1, -wheelBaseHalf, false],
          [1, -wheelBaseHalf, false],
          [-1, wheelBaseHalf, true],
          [1, wheelBaseHalf, true],
        ] as [number, number, boolean][]) {
          const arch = new THREE.Mesh(
            isRear ? wbRearArch : wbFrontArch,
            kit === 'cyberWide' ? carbonMat : paintMaterial,
          );
          arch.position.set(
            side * (bodyWidth * 0.528),
            (isRear ? rearWheelRadius : wheelRadius) + 0.015,
            wz,
          );
          customKitGroup.add(arch);
        }
      }
    }

    // Aftermarket Spoilers (Static & Animated)
    if (spoiler === 'none') {
      stockWingGroup.visible = true;
    } else {
      stockWingGroup.visible = false;
      const spZ = rearTailZ - 0.1;

      if (spoiler === 'ducktail') {
        const duckGeo = trackCustomGeo(
          createExtrudedShapeGeo(
            [
              [-0.14, 0],
              [0.18, 0.02],
              [0.24, 0.17],
              [0.14, 0.18],
              [-0.08, 0.05],
            ],
            bodyWidth * 0.94,
            0.014,
          ),
        );
        const duck = new THREE.Mesh(duckGeo, paintMaterial);
        duck.position.set(0, deckY - 0.01, spZ + 0.04);
        duck.castShadow = true;
        customSpoilerGroup.add(duck);
      } else if (spoiler === 'streetWing') {
        const span = bodyWidth * 1.02;
        const wY = deckY + 0.34;
        const blade = new THREE.Mesh(
          trackCustomGeo(
            createExtrudedShapeGeo(
              [
                [-0.16, 0],
                [0.18, 0.04],
                [0.16, 0.075],
                [-0.15, 0.032],
              ],
              span,
              0.012,
            ),
          ),
          carbonMat,
        );
        blade.position.set(0, wY, spZ);
        blade.castShadow = true;
        customSpoilerGroup.add(blade);

        const pylonGeo = trackCustomGeo(new THREE.BoxGeometry(0.038, 0.34, 0.18));
        for (const px of [-0.46, 0.46]) {
          const p = new THREE.Mesh(pylonGeo, chromeMat);
          p.position.set(px, deckY + 0.16, spZ - 0.02);
          customSpoilerGroup.add(p);
        }
        const epGeo = trackCustomGeo(new THREE.BoxGeometry(0.032, 0.22, 0.38));
        for (const ex of [-span * 0.5, span * 0.5]) {
          const ep = new THREE.Mesh(epGeo, paintMaterial);
          ep.position.set(ex, wY + 0.01, spZ);
          customSpoilerGroup.add(ep);
        }
      } else if (spoiler === 'gtCarbon') {
        const span = bodyWidth * 1.14;
        const wY = deckY + 0.48;
        const mainBlade = new THREE.Mesh(
          trackCustomGeo(
            createExtrudedShapeGeo(
              [
                [-0.22, 0],
                [0.24, 0.06],
                [0.22, 0.11],
                [-0.2, 0.04],
              ],
              span,
              0.014,
            ),
          ),
          carbonMat,
        );
        mainBlade.position.set(0, wY, spZ + 0.04);
        mainBlade.castShadow = true;
        customSpoilerGroup.add(mainBlade);

        const gurney = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(span * 0.98, 0.028, 0.025)),
          amberMat,
        );
        gurney.position.set(0, wY + 0.105, spZ + 0.26);
        customSpoilerGroup.add(gurney);

        const swanGeo = trackCustomGeo(new THREE.BoxGeometry(0.042, 0.5, 0.24));
        for (const px of [-0.42, 0.42]) {
          const swan = new THREE.Mesh(swanGeo, carbonMat);
          swan.position.set(px, deckY + 0.24, spZ - 0.03);
          swan.rotation.x = 0.14;
          customSpoilerGroup.add(swan);
        }

        const epGeo = trackCustomGeo(
          createExtrudedShapeGeo(
            [
              [-0.28, -0.16],
              [0.28, -0.1],
              [0.26, 0.18],
              [-0.24, 0.13],
            ],
            0.036,
            0.008,
          ),
        );
        for (const ex of [-span * 0.5, span * 0.5]) {
          const ep = new THREE.Mesh(epGeo, paintMaterial);
          ep.position.set(ex, wY + 0.02, spZ + 0.04);
          customSpoilerGroup.add(ep);
        }
      } else if (spoiler === 'whaleTail') {
        // Classic 80s turbo whale-tail base + thick rubber lip
        const baseGeo = trackCustomGeo(
          createExtrudedShapeGeo(
            [
              [-0.3, 0],
              [0.28, 0.03],
              [0.34, 0.18],
              [0.16, 0.22],
              [-0.24, 0.08],
            ],
            bodyWidth * 0.96,
            0.016,
          ),
        );
        const base = new THREE.Mesh(baseGeo, paintMaterial);
        base.position.set(0, deckY - 0.01, spZ - 0.02);
        base.castShadow = true;
        customSpoilerGroup.add(base);

        const rubberLip = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(bodyWidth * 0.99, 0.065, 0.16)),
          matteTrimMat,
        );
        rubberLip.position.set(0, deckY + 0.21, spZ + 0.24);
        customSpoilerGroup.add(rubberLip);

        const ventGrill = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(bodyWidth * 0.62, 0.03, 0.22)),
          matteTrimMat,
        );
        ventGrill.position.set(0, deckY + 0.13, spZ - 0.04);
        ventGrill.rotation.x = 0.22;
        customSpoilerGroup.add(ventGrill);
      } else if (spoiler === 'roofLouver') {
        // Aggressive rear-window louvers + low trunk gurney lip
        const louverW = bodyWidth * 0.72;
        const slatGeo = trackCustomGeo(new THREE.BoxGeometry(louverW, 0.026, 0.13));
        for (let i = 0; i < 5; i++) {
          const slat = new THREE.Mesh(slatGeo, matteTrimMat);
          slat.position.set(0, deckY + 0.34 - i * 0.072, spZ - 0.56 + i * 0.145);
          slat.rotation.x = 0.26;
          slat.castShadow = true;
          customSpoilerGroup.add(slat);
        }
        const spineGeo = trackCustomGeo(new THREE.BoxGeometry(0.032, 0.04, 0.72));
        for (const sx of [-louverW * 0.45, 0, louverW * 0.45]) {
          const spine = new THREE.Mesh(spineGeo, carbonMat);
          spine.position.set(sx, deckY + 0.2, spZ - 0.28);
          spine.rotation.x = -0.44;
          customSpoilerGroup.add(spine);
        }
        const tailLip = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(bodyWidth * 0.92, 0.075, 0.12)),
          carbonMat,
        );
        tailLip.position.set(0, deckY + 0.04, spZ + 0.09);
        tailLip.rotation.x = -0.35;
        customSpoilerGroup.add(tailLip);
      } else if (spoiler === 'rallyTwin') {
        // WRC Boxed Bi-Plane Rally Wing with vertical vortex dividers
        const span = bodyWidth * 1.04;
        const lowerY = deckY + 0.22;
        const upperY = deckY + 0.45;
        const bladeGeo = trackCustomGeo(new THREE.BoxGeometry(span, 0.042, 0.26));
        const lowerBlade = new THREE.Mesh(bladeGeo, paintMaterial);
        lowerBlade.position.set(0, lowerY, spZ + 0.03);
        lowerBlade.rotation.x = -0.1;
        lowerBlade.castShadow = true;
        customSpoilerGroup.add(lowerBlade);

        const upperBlade = new THREE.Mesh(bladeGeo, carbonMat);
        upperBlade.position.set(0, upperY, spZ + 0.08);
        upperBlade.rotation.x = -0.18;
        upperBlade.castShadow = true;
        customSpoilerGroup.add(upperBlade);

        const sideWallGeo = trackCustomGeo(new THREE.BoxGeometry(0.044, 0.52, 0.36));
        for (const ex of [-span * 0.5, span * 0.5]) {
          const wall = new THREE.Mesh(sideWallGeo, paintMaterial);
          wall.position.set(ex, deckY + 0.25, spZ + 0.04);
          customSpoilerGroup.add(wall);
        }
        const dividerGeo = trackCustomGeo(new THREE.BoxGeometry(0.026, 0.23, 0.24));
        for (const dx of [-0.28, 0.28]) {
          const div = new THREE.Mesh(dividerGeo, carbonMat);
          div.position.set(dx, (lowerY + upperY) * 0.5, spZ + 0.05);
          customSpoilerGroup.add(div);
        }
      } else if (spoiler === 'dragonV') {
        // Gull-wing V-swept hypercar spoiler with dramatic outward blades
        const halfSpan = bodyWidth * 0.62;
        const wY = deckY + 0.42;
        const wingHalfGeo = trackCustomGeo(new THREE.BoxGeometry(halfSpan, 0.042, 0.28));
        for (const side of [-1, 1]) {
          const half = new THREE.Mesh(wingHalfGeo, carbonMat);
          half.position.set(side * (halfSpan * 0.48), wY + 0.06, spZ + 0.06);
          half.rotation.z = side * 0.22;
          half.rotation.y = side * -0.14;
          half.rotation.x = -0.12;
          half.castShadow = true;
          customSpoilerGroup.add(half);

          const fin = new THREE.Mesh(
            trackCustomGeo(new THREE.BoxGeometry(0.036, 0.26, 0.36)),
            brakeRedMat,
          );
          fin.position.set(side * (halfSpan * 0.96), wY + 0.14, spZ + 0.12);
          fin.rotation.z = side * -0.2;
          customSpoilerGroup.add(fin);
        }
        // Central V-pylon spine
        for (const side of [-1, 1]) {
          const strut = new THREE.Mesh(
            trackCustomGeo(new THREE.BoxGeometry(0.04, 0.46, 0.22)),
            carbonMat,
          );
          strut.position.set(side * 0.16, deckY + 0.21, spZ - 0.02);
          strut.rotation.z = side * -0.28;
          customSpoilerGroup.add(strut);
        }
      } else if (spoiler === 'timeAttack') {
        // Chassis-mounted giant dual-element Time Attack tower wing
        const span = bodyWidth * 1.24;
        const wY = deckY + 0.6;
        const mainPlane = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(span, 0.048, 0.34)),
          carbonMat,
        );
        mainPlane.position.set(0, wY, spZ + 0.08);
        mainPlane.rotation.x = -0.14;
        mainPlane.castShadow = true;
        customSpoilerGroup.add(mainPlane);

        const topFlap = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(span * 0.98, 0.034, 0.18)),
          brakeRedMat,
        );
        topFlap.position.set(0, wY + 0.11, spZ + 0.22);
        topFlap.rotation.x = -0.34;
        customSpoilerGroup.add(topFlap);

        const towerGeo = trackCustomGeo(new THREE.BoxGeometry(0.04, 0.64, 0.26));
        for (const px of [-0.46, 0.46]) {
          const tower = new THREE.Mesh(towerGeo, matteTrimMat);
          tower.position.set(px, deckY + 0.3, spZ + 0.02);
          tower.rotation.x = 0.16;
          customSpoilerGroup.add(tower);
        }
        const giantEpGeo = trackCustomGeo(new THREE.BoxGeometry(0.036, 0.42, 0.56));
        for (const ex of [-span * 0.5, span * 0.5]) {
          const ep = new THREE.Mesh(giantEpGeo, carbonMat);
          ep.position.set(ex, wY + 0.05, spZ + 0.12);
          customSpoilerGroup.add(ep);
        }
      } else if (spoiler === 'goldRoyalWing') {
        // 24K Gold luxury GT wing with sculpted swan-neck gold struts & emerald trim
        const span = bodyWidth * 1.12;
        const wY = deckY + 0.44;
        const blade = new THREE.Mesh(
          trackCustomGeo(
            createExtrudedShapeGeo(
              [
                [-0.2, 0],
                [0.22, 0.05],
                [0.2, 0.095],
                [-0.18, 0.036],
              ],
              span,
              0.014,
            ),
          ),
          wheelGoldMat,
        );
        blade.position.set(0, wY, spZ + 0.04);
        blade.castShadow = true;
        customSpoilerGroup.add(blade);

        const gemStrip = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(span * 0.94, 0.024, 0.03)),
          emeraldCoreMat,
        );
        gemStrip.position.set(0, wY + 0.092, spZ + 0.24);
        customSpoilerGroup.add(gemStrip);

        const strutGeo = trackCustomGeo(new THREE.BoxGeometry(0.042, 0.46, 0.2));
        for (const px of [-0.42, 0.42]) {
          const s = new THREE.Mesh(strutGeo, wheelGoldMat);
          s.position.set(px, deckY + 0.22, spZ - 0.02);
          s.rotation.x = 0.14;
          customSpoilerGroup.add(s);
        }
        const epGeo = trackCustomGeo(new THREE.BoxGeometry(0.034, 0.28, 0.44));
        for (const ex of [-span * 0.5, span * 0.5]) {
          const ep = new THREE.Mesh(epGeo, wheelGoldMat);
          ep.position.set(ex, wY + 0.02, spZ + 0.04);
          customSpoilerGroup.add(ep);
        }
      } else if (spoiler === 'animActiveAero') {
        // Speed-reactive Hydraulic DRS Wing (pivots dynamically in updateEffects!)
        const span = bodyWidth * 1.12;
        const wY = deckY + 0.42;

        // Hydraulic dual chrome actuators
        const pistonGeo = trackCustomGeo(new THREE.CylinderGeometry(0.026, 0.032, 0.42, 12));
        for (const px of [-0.38, 0.38]) {
          const piston = new THREE.Mesh(pistonGeo, chromeMat);
          piston.position.set(px, deckY + 0.2, spZ - 0.01);
          piston.rotation.x = 0.14;
          customSpoilerGroup.add(piston);
        }

        const ledMat = trackCustomMat(
          new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            emissive: 0x0ea5e9,
            emissiveIntensity: 1.7,
            roughness: 0.15,
          }),
        );
        spoilerAnimPrimaryMat = ledMat;

        const pivot = new THREE.Group();
        pivot.position.set(0, wY, spZ + 0.04);
        customSpoilerGroup.add(pivot);
        activeDrsBlade = pivot;

        const drsBlade = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(span, 0.046, 0.32)),
          carbonMat,
        );
        drsBlade.castShadow = true;
        pivot.add(drsBlade);

        const drsEdge = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(span * 0.96, 0.022, 0.032)),
          ledMat,
        );
        drsEdge.position.set(0, 0.026, 0.155);
        pivot.add(drsEdge);

        const epGeo = trackCustomGeo(new THREE.BoxGeometry(0.034, 0.22, 0.38));
        for (const ex of [-span * 0.5, span * 0.5]) {
          const ep = new THREE.Mesh(epGeo, paintMaterial);
          ep.position.set(ex, 0.01, 0);
          pivot.add(ep);
        }
      } else if (spoiler === 'animNeonBlade') {
        // Cyber Neon Blade with pulsing dual-tone cyan/magenta LED strips
        const span = bodyWidth * 1.16;
        const wY = deckY + 0.46;
        const matA = trackCustomMat(
          new THREE.MeshStandardMaterial({
            color: 0x22d3ee,
            emissive: 0x06b6d4,
            emissiveIntensity: 2.0,
            roughness: 0.15,
          }),
        );
        const matB = trackCustomMat(
          new THREE.MeshStandardMaterial({
            color: 0xf43f5e,
            emissive: 0xec4899,
            emissiveIntensity: 1.9,
            roughness: 0.15,
          }),
        );
        spoilerAnimPrimaryMat = matA;
        spoilerAnimSecondaryMat = matB;

        const blade = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(span, 0.044, 0.3)),
          wheelObsidianMat,
        );
        blade.position.set(0, wY, spZ + 0.04);
        blade.rotation.x = -0.12;
        blade.castShadow = true;
        customSpoilerGroup.add(blade);

        const frontStrip = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(span * 0.98, 0.024, 0.034)),
          matA,
        );
        frontStrip.position.set(0, wY + 0.024, spZ - 0.1);
        customSpoilerGroup.add(frontStrip);

        const rearStrip = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(span * 0.98, 0.028, 0.036)),
          matB,
        );
        rearStrip.position.set(0, wY + 0.04, spZ + 0.18);
        customSpoilerGroup.add(rearStrip);

        const pylonGeo = trackCustomGeo(new THREE.BoxGeometry(0.042, 0.48, 0.22));
        for (const px of [-0.44, 0.44]) {
          const p = new THREE.Mesh(pylonGeo, wheelObsidianMat);
          p.position.set(px, deckY + 0.23, spZ);
          customSpoilerGroup.add(p);
          const pNeon = new THREE.Mesh(
            trackCustomGeo(new THREE.BoxGeometry(0.048, 0.36, 0.028)),
            matA,
          );
          pNeon.position.set(px, deckY + 0.24, spZ + 0.1);
          customSpoilerGroup.add(pNeon);
        }

        const epGeo = trackCustomGeo(new THREE.BoxGeometry(0.036, 0.28, 0.42));
        for (const ex of [-span * 0.5, span * 0.5]) {
          const ep = new THREE.Mesh(epGeo, wheelObsidianMat);
          ep.position.set(ex, wY + 0.02, spZ + 0.04);
          customSpoilerGroup.add(ep);
          const epRim = new THREE.Mesh(
            trackCustomGeo(new THREE.BoxGeometry(0.042, 0.03, 0.43)),
            matB,
          );
          epRim.position.set(ex, wY + 0.15, spZ + 0.04);
          customSpoilerGroup.add(epRim);
        }
      } else if (spoiler === 'animPlasmaWing') {
        // Floating Energy Hologram Plasma Wing hovering between two emitter pylons!
        const span = bodyWidth * 1.15;
        const wY = deckY + 0.48;
        const holoMat = trackCustomMat(
          new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            emissive: 0x7c3aed,
            emissiveIntensity: 2.2,
            transparent: true,
            opacity: 0.82,
            roughness: 0.08,
            metalness: 0.15,
          }),
        );
        const coreMat = trackCustomMat(
          new THREE.MeshStandardMaterial({
            color: 0xe0f2fe,
            emissive: 0x38bdf8,
            emissiveIntensity: 2.6,
            roughness: 0.1,
          }),
        );
        spoilerAnimPrimaryMat = holoMat;
        spoilerAnimSecondaryMat = coreMat;

        // Emitter pylons mounted to trunk
        const pylonGeo = trackCustomGeo(new THREE.BoxGeometry(0.06, 0.34, 0.22));
        for (const ex of [-span * 0.48, span * 0.48]) {
          const emitter = new THREE.Mesh(pylonGeo, wheelObsidianMat);
          emitter.position.set(ex, deckY + 0.16, spZ + 0.03);
          customSpoilerGroup.add(emitter);

          const tip = new THREE.Mesh(
            trackCustomGeo(new THREE.CylinderGeometry(0.042, 0.048, 0.06, 12)),
            coreMat,
          );
          tip.position.set(ex, deckY + 0.35, spZ + 0.03);
          customSpoilerGroup.add(tip);
        }

        // Levitating plasma wing group
        const hover = new THREE.Group();
        hover.position.set(0, wY, spZ + 0.04);
        customSpoilerGroup.add(hover);
        spoilerHoverGroup = hover;
        spoilerHoverBaseY = wY;

        const plasmaMain = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(span * 0.94, 0.052, 0.28)),
          holoMat,
        );
        plasmaMain.rotation.x = -0.14;
        hover.add(plasmaMain);

        const plasmaCore = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(span * 0.98, 0.022, 0.08)),
          coreMat,
        );
        plasmaCore.position.set(0, 0.008, 0.02);
        hover.add(plasmaCore);

        const energyFinGeo = trackCustomGeo(new THREE.BoxGeometry(0.028, 0.24, 0.34));
        for (const ex of [-span * 0.48, span * 0.48]) {
          const fin = new THREE.Mesh(energyFinGeo, holoMat);
          fin.position.set(ex, 0.01, 0);
          hover.add(fin);
        }
      } else if (spoiler === 'animRgbPrismWing') {
        // Full-spectrum RGB cycling prism LED GT wing
        const span = bodyWidth * 1.18;
        const wY = deckY + 0.5;
        const rgbA = trackCustomMat(
          new THREE.MeshStandardMaterial({
            color: 0xff0080,
            emissive: 0xff0080,
            emissiveIntensity: 2.1,
            roughness: 0.12,
          }),
        );
        const rgbB = trackCustomMat(
          new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 2.1,
            roughness: 0.12,
          }),
        );
        spoilerAnimPrimaryMat = rgbA;
        spoilerAnimSecondaryMat = rgbB;

        const blade = new THREE.Mesh(
          trackCustomGeo(
            createExtrudedShapeGeo(
              [
                [-0.22, 0],
                [0.24, 0.055],
                [0.22, 0.105],
                [-0.2, 0.038],
              ],
              span,
              0.014,
            ),
          ),
          carbonMat,
        );
        blade.position.set(0, wY, spZ + 0.04);
        blade.castShadow = true;
        customSpoilerGroup.add(blade);

        const rgbBarTop = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(span * 0.98, 0.026, 0.04)),
          rgbA,
        );
        rgbBarTop.position.set(0, wY + 0.104, spZ + 0.25);
        customSpoilerGroup.add(rgbBarTop);

        const rgbBarUnder = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(span * 0.94, 0.022, 0.045)),
          rgbB,
        );
        rgbBarUnder.position.set(0, wY - 0.012, spZ + 0.02);
        customSpoilerGroup.add(rgbBarUnder);

        const swanGeo = trackCustomGeo(new THREE.BoxGeometry(0.042, 0.52, 0.24));
        for (const px of [-0.44, 0.44]) {
          const swan = new THREE.Mesh(swanGeo, carbonMat);
          swan.position.set(px, deckY + 0.25, spZ - 0.02);
          swan.rotation.x = 0.14;
          customSpoilerGroup.add(swan);
        }

        const epGeo = trackCustomGeo(new THREE.BoxGeometry(0.036, 0.3, 0.46));
        for (const ex of [-span * 0.5, span * 0.5]) {
          const ep = new THREE.Mesh(epGeo, wheelObsidianMat);
          ep.position.set(ex, wY + 0.03, spZ + 0.04);
          customSpoilerGroup.add(ep);
          const epStrip = new THREE.Mesh(
            trackCustomGeo(new THREE.BoxGeometry(0.044, 0.26, 0.034)),
            rgbA,
          );
          epStrip.position.set(ex, wY + 0.03, spZ + 0.25);
          customSpoilerGroup.add(epStrip);
        }
      } else if (spoiler === 'gt3Swan') {
        // Swan-neck top-mounted GT3 track wing
        const span = bodyWidth * 1.16;
        const wY = deckY + 0.44;
        const blade = new THREE.Mesh(
          trackCustomGeo(
            createExtrudedShapeGeo(
              [
                [-0.2, 0],
                [0.24, 0.055],
                [0.22, 0.105],
                [-0.18, 0.04],
              ],
              span,
              0.014,
            ),
          ),
          carbonMat,
        );
        blade.position.set(0, wY, spZ + 0.05);
        blade.castShadow = true;
        customSpoilerGroup.add(blade);
        const neckGeo = trackCustomGeo(new THREE.BoxGeometry(0.038, 0.5, 0.16));
        const hookGeo = trackCustomGeo(new THREE.BoxGeometry(0.044, 0.05, 0.28));
        for (const px of [-0.36, 0.36]) {
          const neck = new THREE.Mesh(neckGeo, matteTrimMat);
          neck.position.set(px, deckY + 0.27, spZ - 0.06);
          neck.rotation.x = -0.14;
          customSpoilerGroup.add(neck);
          const hook = new THREE.Mesh(hookGeo, brakeRedMat);
          hook.position.set(px, wY + 0.1, spZ + 0.04);
          customSpoilerGroup.add(hook);
        }
        const epGeo = trackCustomGeo(new THREE.BoxGeometry(0.034, 0.28, 0.44));
        for (const ex of [-span * 0.5, span * 0.5]) {
          const ep = new THREE.Mesh(epGeo, carbonMat);
          ep.position.set(ex, wY + 0.03, spZ + 0.05);
          customSpoilerGroup.add(ep);
        }
      } else if (spoiler === 'twinBladeCarbon') {
        // Stacked dual-element curved carbon biplane wing
        const span = bodyWidth * 1.14;
        for (const [idx, yOff] of [
          [0, 0.28],
          [1, 0.5],
        ] as [number, number][]) {
          const wY = deckY + yOff;
          const b = new THREE.Mesh(
            trackCustomGeo(new THREE.BoxGeometry(span * (idx === 1 ? 1.0 : 0.92), 0.045, 0.32)),
            carbonMat,
          );
          b.position.set(0, wY, spZ + idx * 0.06);
          b.rotation.x = idx === 1 ? -0.14 : -0.06;
          customSpoilerGroup.add(b);
        }
        const pylonGeo = trackCustomGeo(new THREE.BoxGeometry(0.04, 0.54, 0.22));
        for (const px of [-0.46, 0.46]) {
          const p = new THREE.Mesh(pylonGeo, matteTrimMat);
          p.position.set(px, deckY + 0.26, spZ + 0.02);
          customSpoilerGroup.add(p);
        }
        const epGeo = trackCustomGeo(new THREE.BoxGeometry(0.035, 0.36, 0.42));
        for (const ex of [-span * 0.5, span * 0.5]) {
          const ep = new THREE.Mesh(epGeo, carbonMat);
          ep.position.set(ex, deckY + 0.4, spZ + 0.04);
          customSpoilerGroup.add(ep);
        }
      } else if (spoiler === 'viperArch') {
        // Swept full-width wraparound supercar arch wing
        const span = bodyWidth * 1.08;
        const wY = deckY + 0.3;
        const top = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(span * 0.88, 0.06, 0.34)),
          paintMaterial,
        );
        top.position.set(0, wY, spZ + 0.02);
        top.rotation.x = -0.08;
        customSpoilerGroup.add(top);
        const legGeo = trackCustomGeo(new THREE.BoxGeometry(0.11, 0.34, 0.32));
        for (const side of [-1, 1]) {
          const leg = new THREE.Mesh(legGeo, paintMaterial);
          leg.position.set(side * (span * 0.45), deckY + 0.15, spZ + 0.02);
          leg.rotation.z = side * 0.28;
          customSpoilerGroup.add(leg);
        }
      } else if (spoiler === 'animCyberHaloWing') {
        // Pulsing cyan-magenta twin energy rings mounted on carbon aero towers
        const span = bodyWidth * 1.12;
        const wY = deckY + 0.44;
        const glowA = trackCustomMat(
          new THREE.MeshStandardMaterial({
            color: 0x22d3ee,
            emissive: 0x06b6d4,
            emissiveIntensity: 2.2,
            roughness: 0.12,
          }),
        );
        const glowB = trackCustomMat(
          new THREE.MeshStandardMaterial({
            color: 0xe879f9,
            emissive: 0xc026d3,
            emissiveIntensity: 2.2,
            roughness: 0.12,
          }),
        );
        spoilerAnimPrimaryMat = glowA;
        spoilerAnimSecondaryMat = glowB;
        const blade = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(span, 0.045, 0.26)),
          wheelObsidianMat,
        );
        blade.position.set(0, wY, spZ + 0.04);
        customSpoilerGroup.add(blade);
        const strip = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(span * 0.96, 0.024, 0.05)),
          glowA,
        );
        strip.position.set(0, wY + 0.03, spZ + 0.16);
        customSpoilerGroup.add(strip);
        const pylonGeo = trackCustomGeo(new THREE.BoxGeometry(0.045, 0.46, 0.18));
        const ringGeo = trackCustomGeo(new THREE.TorusGeometry(0.16, 0.018, 10, 24));
        ringGeo.rotateY(Math.PI / 2);
        for (const sx of [-1, 1]) {
          const pylon = new THREE.Mesh(pylonGeo, carbonMat);
          pylon.position.set(sx * 0.42, deckY + 0.22, spZ + 0.02);
          customSpoilerGroup.add(pylon);
          const ring = new THREE.Mesh(ringGeo, sx < 0 ? glowA : glowB);
          ring.position.set(sx * (span * 0.5), wY, spZ + 0.04);
          customSpoilerGroup.add(ring);
        }
      } else if (spoiler === 'animInfernoWing') {
        // Obsidian track wing with glowing molten-lava trailing edge & tips
        const span = bodyWidth * 1.18;
        const wY = deckY + 0.48;
        const lavaA = trackCustomMat(
          new THREE.MeshStandardMaterial({
            color: 0xf97316,
            emissive: 0xea580c,
            emissiveIntensity: 2.3,
            roughness: 0.14,
          }),
        );
        const lavaB = trackCustomMat(
          new THREE.MeshStandardMaterial({
            color: 0xfde047,
            emissive: 0xf59e0b,
            emissiveIntensity: 2.1,
            roughness: 0.14,
          }),
        );
        spoilerAnimPrimaryMat = lavaA;
        spoilerAnimSecondaryMat = lavaB;
        const blade = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(span, 0.05, 0.34)),
          wheelObsidianMat,
        );
        blade.position.set(0, wY, spZ + 0.05);
        blade.rotation.x = -0.1;
        customSpoilerGroup.add(blade);
        const lavaEdge = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(span * 0.98, 0.032, 0.065)),
          lavaA,
        );
        lavaEdge.position.set(0, wY + 0.02, spZ + 0.21);
        customSpoilerGroup.add(lavaEdge);
        const pylonGeo = trackCustomGeo(new THREE.BoxGeometry(0.044, 0.5, 0.22));
        for (const px of [-0.44, 0.44]) {
          const p = new THREE.Mesh(pylonGeo, wheelObsidianMat);
          p.position.set(px, deckY + 0.24, spZ + 0.02);
          customSpoilerGroup.add(p);
        }
        const tipGeo = trackCustomGeo(new THREE.BoxGeometry(0.04, 0.28, 0.44));
        for (const ex of [-span * 0.5, span * 0.5]) {
          const ep = new THREE.Mesh(tipGeo, wheelObsidianMat);
          ep.position.set(ex, wY + 0.02, spZ + 0.05);
          customSpoilerGroup.add(ep);
          const ember = new THREE.Mesh(
            trackCustomGeo(new THREE.BoxGeometry(0.048, 0.24, 0.04)),
            lavaB,
          );
          ember.position.set(ex, wY + 0.02, spZ + 0.25);
          customSpoilerGroup.add(ember);
        }
      } else if (spoiler === 'parkBenchWood') {
        // Hilarious Viral Car-Meme Wooden Park Bench bolted right onto the trunk!
        const oakMat = trackCustomMat(
          new THREE.MeshStandardMaterial({ color: 0xa1622a, roughness: 0.74, metalness: 0.06 }),
        );
        const oakDarkMat = trackCustomMat(
          new THREE.MeshStandardMaterial({ color: 0x78441c, roughness: 0.78, metalness: 0.05 }),
        );
        const ironMat = trackCustomMat(
          new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.55, metalness: 0.78 }),
        );
        const span = bodyWidth * 1.12;
        // 3 spaced varnished wooden bench seat/backrest planks
        const plankGeo = trackCustomGeo(new THREE.BoxGeometry(span, 0.032, 0.092));
        for (let i = 0; i < 3; i++) {
          const plank = new THREE.Mesh(plankGeo, i === 1 ? oakDarkMat : oakMat);
          plank.position.set(0, deckY + 0.28 + i * 0.078, spZ - 0.06 + i * 0.092);
          plank.rotation.x = -0.58;
          plank.castShadow = true;
          customSpoilerGroup.add(plank);
        }
        // Horizontal wooden bench seat slats at base
        for (const sz of [-0.04, 0.07]) {
          const seatPlank = new THREE.Mesh(plankGeo, oakMat);
          seatPlank.position.set(0, deckY + 0.21, spZ + sz);
          seatPlank.castShadow = true;
          customSpoilerGroup.add(seatPlank);
        }
        // Cast-iron scrolled side bench legs + armrests
        const legGeo = trackCustomGeo(new THREE.BoxGeometry(0.036, 0.24, 0.05));
        const armGeo = trackCustomGeo(new THREE.BoxGeometry(0.042, 0.032, 0.26));
        for (const sx of [-1, 1]) {
          const lx = sx * (span * 0.42);
          for (const lz of [-0.08, 0.09]) {
            const leg = new THREE.Mesh(legGeo, ironMat);
            leg.position.set(lx, deckY + 0.11, spZ + lz);
            leg.rotation.x = lz < 0 ? 0.15 : -0.15;
            customSpoilerGroup.add(leg);
          }
          const backRail = new THREE.Mesh(
            trackCustomGeo(new THREE.BoxGeometry(0.036, 0.3, 0.04)),
            ironMat,
          );
          backRail.position.set(lx, deckY + 0.35, spZ + 0.05);
          backRail.rotation.x = 0.55;
          customSpoilerGroup.add(backRail);
          const arm = new THREE.Mesh(armGeo, ironMat);
          arm.position.set(lx, deckY + 0.3, spZ + 0.01);
          customSpoilerGroup.add(arm);
        }
      } else if (spoiler === 'chassisMountDrift') {
        // Extreme Chassis-Mounted Tall X-Truss Drift Wing with Swept Gull-Wing Blade!
        const span = bodyWidth * 1.28;
        const wY = deckY + 0.62;
        const alumMat = trackCustomMat(
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.28, metalness: 0.88 }),
        );
        // Ultra-tall rear-bumper chassis-mounted aluminum towers + X cross-bracing
        const tallPostGeo = trackCustomGeo(new THREE.BoxGeometry(0.032, 0.86, 0.14));
        for (const sx of [-1, 1]) {
          const px = sx * 0.42;
          const post = new THREE.Mesh(tallPostGeo, alumMat);
          post.position.set(px, deckY + 0.2, spZ + 0.16);
          post.rotation.x = 0.12;
          post.castShadow = true;
          customSpoilerGroup.add(post);
        }
        // X-truss diagonal reinforcement rods between the tall towers
        const braceGeo = trackCustomGeo(new THREE.CylinderGeometry(0.014, 0.014, 0.94, 8));
        for (const sx of [-1, 1]) {
          const brace = new THREE.Mesh(braceGeo, alumMat);
          brace.position.set(0, deckY + 0.26, spZ + 0.15);
          brace.rotation.z = sx * 0.96;
          customSpoilerGroup.add(brace);
        }
        // Gull-wing angled 3-piece ultra-wide carbon airfoil (center dip + rising outer wings!)
        const centerBlade = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(span * 0.44, 0.044, 0.34)),
          carbonMat,
        );
        centerBlade.position.set(0, wY - 0.03, spZ + 0.18);
        centerBlade.rotation.x = -0.14;
        centerBlade.castShadow = true;
        customSpoilerGroup.add(centerBlade);
        const outerBladeGeo = trackCustomGeo(new THREE.BoxGeometry(span * 0.32, 0.042, 0.34));
        const endplateGeo = trackCustomGeo(new THREE.BoxGeometry(0.032, 0.38, 0.46));
        for (const sx of [-1, 1]) {
          const ob = new THREE.Mesh(outerBladeGeo, carbonMat);
          ob.position.set(sx * (span * 0.36), wY + 0.015, spZ + 0.18);
          ob.rotation.z = sx * 0.18;
          ob.rotation.x = -0.14;
          ob.castShadow = true;
          customSpoilerGroup.add(ob);
          const ep = new THREE.Mesh(endplateGeo, paintMaterial);
          ep.position.set(sx * (span * 0.52), wY + 0.02, spZ + 0.18);
          ep.rotation.x = -0.14;
          customSpoilerGroup.add(ep);
        }
      } else if (spoiler === 'twinSharkFin') {
        // Zero Horizontal Crossbar — Twin Canted F-22 Fighter-Jet Vertical V-Tail Stabilizers!
        const stealthMat = trackCustomMat(
          new THREE.MeshStandardMaterial({ color: 0x1e2430, roughness: 0.42, metalness: 0.65 }),
        );
        const stripeRedMat = trackCustomMat(
          new THREE.MeshStandardMaterial({
            color: 0xef4444,
            emissive: 0xdc2626,
            emissiveIntensity: 0.85,
            roughness: 0.3,
          }),
        );
        const finShape = new THREE.Shape();
        finShape.moveTo(-0.34, 0);
        finShape.lineTo(0.14, 0.56);
        finShape.lineTo(0.32, 0.52);
        finShape.lineTo(0.24, 0);
        finShape.closePath();
        const finGeo = trackCustomGeo(
          new THREE.ExtrudeGeometry(finShape, {
            depth: 0.042,
            bevelEnabled: true,
            bevelThickness: 0.01,
            bevelSize: 0.01,
            bevelSegments: 2,
          }),
        );
        finGeo.translate(0, 0, -0.021);
        finGeo.rotateY(-Math.PI * 0.5);

        for (const sx of [-1, 1]) {
          const finHolder = new THREE.Group();
          finHolder.position.set(sx * (bodyWidth * 0.36), deckY - 0.02, spZ - 0.02);
          finHolder.rotation.z = sx * -0.44;
          customSpoilerGroup.add(finHolder);

          const fin = new THREE.Mesh(finGeo, stealthMat);
          fin.castShadow = true;
          finHolder.add(fin);

          // Crimson fighter-jet tail tip stripe
          const tip = new THREE.Mesh(
            trackCustomGeo(new THREE.BoxGeometry(0.068, 0.055, 0.2)),
            stripeRedMat,
          );
          tip.position.set(0, 0.5, 0.22);
          finHolder.add(tip);
        }
      } else if (spoiler === 'biplaneTriWing') {
        // Wild Pikes-Peak Hillclimb 3-Tier Stacked Cascade Tri-Plane Wing!
        const span = bodyWidth * 1.18;
        const fenceGeo = trackCustomGeo(new THREE.BoxGeometry(0.036, 0.58, 0.54));
        for (const sx of [-1, 1]) {
          const fence = new THREE.Mesh(fenceGeo, paintMaterial);
          fence.position.set(sx * (span * 0.5), deckY + 0.3, spZ + 0.08);
          fence.rotation.x = -0.22;
          fence.castShadow = true;
          customSpoilerGroup.add(fence);
        }
        // Center dorsal aero spine connecting all 3 tiers
        const spine = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(0.04, 0.54, 0.44)),
          carbonMat,
        );
        spine.position.set(0, deckY + 0.28, spZ + 0.06);
        spine.rotation.x = -0.22;
        customSpoilerGroup.add(spine);
        // 3 staggered cascade airfoil blades stepping upward & backward!
        for (let t = 0; t < 3; t++) {
          const blade = new THREE.Mesh(
            trackCustomGeo(new THREE.BoxGeometry(span, 0.036, 0.22 - t * 0.02)),
            t === 1 ? paintMaterial : carbonMat,
          );
          blade.position.set(0, deckY + 0.17 + t * 0.17, spZ - 0.04 + t * 0.11);
          blade.rotation.x = -0.16 - t * 0.06;
          blade.castShadow = true;
          customSpoilerGroup.add(blade);
        }
      } else if (spoiler === 'batWings') {
        // Dramatic Gothic Bat / Demon Spread Wings flaring wide & jagged!
        const memMat = trackCustomMat(
          new THREE.MeshStandardMaterial({ color: 0x0f0d14, roughness: 0.45, metalness: 0.42 }),
        );
        const boneMat = trackCustomMat(
          new THREE.MeshStandardMaterial({ color: 0x450a0a, roughness: 0.32, metalness: 0.65 }),
        );
        const wingShape = new THREE.Shape();
        wingShape.moveTo(0, 0.04);
        wingShape.lineTo(0.45, 0.48);
        wingShape.lineTo(0.98, 0.56);
        wingShape.quadraticCurveTo(0.76, 0.28, 0.86, 0.12);
        wingShape.quadraticCurveTo(0.58, 0.22, 0.52, 0.02);
        wingShape.quadraticCurveTo(0.28, 0.16, 0.18, -0.02);
        wingShape.closePath();

        const wingGeo = trackCustomGeo(
          new THREE.ExtrudeGeometry(wingShape, {
            depth: 0.036,
            bevelEnabled: true,
            bevelThickness: 0.008,
            bevelSize: 0.008,
            bevelSegments: 2,
          }),
        );
        wingGeo.translate(0, 0, -0.018);

        // Central obsidian spinal mount
        const spine = new THREE.Mesh(
          trackCustomGeo(new THREE.ConeGeometry(0.08, 0.26, 6)),
          boneMat,
        );
        spine.position.set(0, deckY + 0.12, spZ + 0.04);
        customSpoilerGroup.add(spine);

        const scaleX = (bodyWidth * 0.68) / 0.98;
        for (const sx of [-1, 1]) {
          const wMesh = new THREE.Mesh(wingGeo, memMat);
          wMesh.scale.set(sx * scaleX, 0.95, 1);
          wMesh.position.set(sx * 0.04, deckY + 0.04, spZ + 0.04);
          wMesh.rotation.y = sx * -0.22;
          wMesh.rotation.x = -0.14;
          wMesh.castShadow = true;
          customSpoilerGroup.add(wMesh);

          // Sharp dark crimson top wing-bone spar & hook claw
          const claw = new THREE.Mesh(
            trackCustomGeo(new THREE.ConeGeometry(0.026, 0.14, 5)),
            boneMat,
          );
          claw.position.set(sx * (bodyWidth * 0.34), deckY + 0.54, spZ + 0.12);
          claw.rotation.z = sx * -0.45;
          customSpoilerGroup.add(claw);
        }
      } else if (spoiler === 'scrapMadMaxWing') {
        // Post-Apocalyptic Wasteland Spiked Scrap-Iron Road-Sign Wing!
        const rustMat = trackCustomMat(
          new THREE.MeshStandardMaterial({ color: 0x7c3a1d, roughness: 0.9, metalness: 0.48 }),
        );
        const steelMat = trackCustomMat(
          new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.72, metalness: 0.78 }),
        );
        const hazMat = trackCustomMat(
          new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.65, metalness: 0.22 }),
        );
        const span = bodyWidth * 1.14;
        const wY = deckY + 0.4;

        // Crooked welded corrugated scrap-metal main wing plate
        const mainPlate = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(span, 0.044, 0.34)),
          rustMat,
        );
        mainPlate.position.set(0, wY, spZ + 0.06);
        mainPlate.rotation.set(-0.14, 0, 0.025);
        mainPlate.castShadow = true;
        customSpoilerGroup.add(mainPlate);

        // Salvaged yellow hazard road-sign patch bolted asymmetrically onto the wing
        const signPatch = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(span * 0.38, 0.052, 0.24)),
          hazMat,
        );
        signPatch.position.set(-span * 0.18, wY + 0.008, spZ + 0.05);
        signPatch.rotation.set(-0.14, 0.06, 0.025);
        customSpoilerGroup.add(signPatch);

        // Jagged rebar support struts + wasteland spikes bristling along the trailing edge!
        const rebarGeo = trackCustomGeo(new THREE.CylinderGeometry(0.022, 0.026, 0.46, 6));
        for (const sx of [-1, 1]) {
          const r1 = new THREE.Mesh(rebarGeo, steelMat);
          r1.position.set(sx * 0.42, deckY + 0.2, spZ + 0.05);
          r1.rotation.z = sx * 0.14;
          customSpoilerGroup.add(r1);
          const r2 = new THREE.Mesh(rebarGeo, rustMat);
          r2.position.set(sx * 0.26, deckY + 0.2, spZ + 0.05);
          r2.rotation.z = sx * -0.26;
          customSpoilerGroup.add(r2);
        }
        const spikeGeo = trackCustomGeo(new THREE.ConeGeometry(0.026, 0.16, 5));
        for (let i = 0; i < 9; i++) {
          const sx = -span * 0.46 + (i / 8) * (span * 0.92);
          const sp = new THREE.Mesh(spikeGeo, i % 2 === 0 ? steelMat : rustMat);
          sp.position.set(sx, wY + 0.04, spZ + 0.24);
          sp.rotation.x = Math.PI * 0.45;
          customSpoilerGroup.add(sp);
        }
      } else if (spoiler === 'katanaCrossWing') {
        // Two Full-Length Gleaming Samurai Katana Swords Crossed in an X Across the Rear Deck!
        const bladeSteelMat = trackCustomMat(
          new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.1, metalness: 0.96 }),
        );
        const hiltRedMat = trackCustomMat(
          new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.78, metalness: 0.08 }),
        );
        const goldGuardMat = trackCustomMat(
          new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.24, metalness: 0.9 }),
        );
        const span = bodyWidth * 1.24;

        // Twin matte-black scabbard cradle mounts on the trunk
        for (const sx of [-0.32, 0.32]) {
          const stand = new THREE.Mesh(
            trackCustomGeo(new THREE.BoxGeometry(0.05, 0.26, 0.12)),
            wheelObsidianMat,
          );
          stand.position.set(sx, deckY + 0.12, spZ + 0.06);
          customSpoilerGroup.add(stand);
        }

        // Crossed Twin Full-Length Samurai Katanas!
        for (const sx of [-1, 1]) {
          const katana = new THREE.Group();
          katana.position.set(0, deckY + 0.34, spZ + 0.06 + sx * 0.03);
          katana.rotation.z = sx * 0.28;
          katana.rotation.y = sx * 0.05;
          customSpoilerGroup.add(katana);

          // Long gleaming razor-edged steel katana blade
          const blade = new THREE.Mesh(
            trackCustomGeo(new THREE.BoxGeometry(span * 0.82, 0.048, 0.016)),
            bladeSteelMat,
          );
          blade.position.x = sx * 0.14;
          blade.castShadow = true;
          katana.add(blade);
          // Pointed kissaki sword tip
          const tip = new THREE.Mesh(
            trackCustomGeo(new THREE.ConeGeometry(0.032, 0.14, 4)),
            bladeSteelMat,
          );
          tip.rotation.z = sx * -Math.PI * 0.5;
          tip.scale.set(1, 1, 0.38);
          tip.position.x = sx * (0.14 + span * 0.41 + 0.06);
          katana.add(tip);

          // Golden tsuba handguard
          const tsuba = new THREE.Mesh(
            trackCustomGeo(new THREE.BoxGeometry(0.022, 0.12, 0.095)),
            goldGuardMat,
          );
          tsuba.position.x = sx * (0.14 - span * 0.41);
          katana.add(tsuba);

          // Crimson wrapped tsuka handle + gold pommel
          const hilt = new THREE.Mesh(
            trackCustomGeo(new THREE.BoxGeometry(0.32, 0.042, 0.036)),
            hiltRedMat,
          );
          hilt.position.x = sx * (0.14 - span * 0.41 - 0.17);
          katana.add(hilt);
          const pommel = new THREE.Mesh(
            trackCustomGeo(new THREE.BoxGeometry(0.035, 0.048, 0.042)),
            goldGuardMat,
          );
          pommel.position.x = sx * (0.14 - span * 0.41 - 0.33);
          katana.add(pommel);
        }
      } else if (spoiler === 'pixelVoxelWing') {
        // 100% Quantized 8-Bit / Minecraft Voxel Block Spoiler — Zero Curves!
        const obsVoxMat = trackCustomMat(
          new THREE.MeshStandardMaterial({ color: 0x1e2028, roughness: 0.72, metalness: 0.18 }),
        );
        const stoneVoxMat = trackCustomMat(
          new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8, metalness: 0.15 }),
        );
        const diaVoxMat = trackCustomMat(
          new THREE.MeshStandardMaterial({
            color: 0x22d3ee,
            emissive: 0x06b6d4,
            emissiveIntensity: 1.5,
            roughness: 0.2,
          }),
        );
        const vSize = 0.11;
        const vGeo = trackCustomGeo(new THREE.BoxGeometry(vSize * 0.96, vSize * 0.96, vSize * 0.96));

        // Blocky stepped stone-brick pylons
        for (const sx of [-1, 1]) {
          for (let h = 0; h < 3; h++) {
            const p = new THREE.Mesh(vGeo, h % 2 === 0 ? stoneVoxMat : obsVoxMat);
            p.position.set(sx * 4 * vSize, deckY + vSize * 0.5 + h * vSize, spZ + 0.02 + h * 0.03);
            p.castShadow = true;
            customSpoilerGroup.add(p);
          }
        }
        // Chunky quantized voxel main wing bar (17 blocks wide, 2 deep) with glowing cyan diamond tips!
        for (let gx = -8; gx <= 8; gx++) {
          const isTip = Math.abs(gx) >= 7;
          const isCenter = Math.abs(gx) <= 1;
          const mat = isTip ? diaVoxMat : isCenter ? diaVoxMat : gx % 2 === 0 ? obsVoxMat : stoneVoxMat;
          for (let gz = 0; gz < 2; gz++) {
            const cube = new THREE.Mesh(vGeo, mat);
            cube.position.set(
              gx * vSize,
              deckY + 3.5 * vSize + (isTip ? vSize * 0.5 : 0),
              spZ + 0.04 + gz * vSize,
            );
            cube.castShadow = true;
            customSpoilerGroup.add(cube);
          }
        }
        // Stepped voxel side endplate walls
        for (const sx of [-1, 1]) {
          for (let gy = 2; gy <= 5; gy++) {
            const wall = new THREE.Mesh(vGeo, gy === 5 ? diaVoxMat : obsVoxMat);
            wall.position.set(sx * 9 * vSize, deckY + gy * vSize, spZ + 0.09);
            customSpoilerGroup.add(wall);
          }
        }
      } else if (spoiler === 'animJetThrusterWing') {
        // Sci-Fi Twin Jet Afterburner Turbine Pods + Speed-Tilting Active DRS Center Flap!
        const span = bodyWidth * 1.16;
        const wY = deckY + 0.42;
        const podMetalMat = trackCustomMat(
          new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.28, metalness: 0.88 }),
        );
        const jetBlueMat = trackCustomMat(
          new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            emissive: 0x0284c7,
            emissiveIntensity: 2.4,
            roughness: 0.1,
          }),
        );
        const jetOrangeMat = trackCustomMat(
          new THREE.MeshStandardMaterial({
            color: 0xfb923c,
            emissive: 0xea580c,
            emissiveIntensity: 2.2,
            roughness: 0.1,
          }),
        );
        spoilerAnimPrimaryMat = jetBlueMat;
        spoilerAnimSecondaryMat = jetOrangeMat;

        // Twin massive outboard jet turbine nacelles mounted on swept pylons!
        const podGeo = trackCustomGeo(new THREE.CylinderGeometry(0.115, 0.14, 0.62, 16));
        podGeo.rotateX(Math.PI * 0.5);
        const nozzleGeo = trackCustomGeo(new THREE.CylinderGeometry(0.095, 0.115, 0.14, 16));
        nozzleGeo.rotateX(Math.PI * 0.5);
        const burnConeGeo = trackCustomGeo(new THREE.ConeGeometry(0.095, 0.34, 12));
        burnConeGeo.rotateX(Math.PI * 0.5);

        for (const sx of [-1, 1]) {
          const px = sx * (span * 0.44);
          const strut = new THREE.Mesh(
            trackCustomGeo(new THREE.BoxGeometry(0.06, 0.42, 0.24)),
            podMetalMat,
          );
          strut.position.set(px * 0.88, deckY + 0.2, spZ + 0.04);
          strut.rotation.z = sx * -0.22;
          customSpoilerGroup.add(strut);

          const pod = new THREE.Mesh(podGeo, podMetalMat);
          pod.position.set(px, wY, spZ + 0.05);
          pod.castShadow = true;
          customSpoilerGroup.add(pod);

          const intakeGlow = new THREE.Mesh(
            trackCustomGeo(new THREE.TorusGeometry(0.11, 0.016, 8, 20)),
            jetBlueMat,
          );
          intakeGlow.position.set(px, wY, spZ - 0.26);
          customSpoilerGroup.add(intakeGlow);

          const nozzle = new THREE.Mesh(nozzleGeo, wheelObsidianMat);
          nozzle.position.set(px, wY, spZ + 0.41);
          customSpoilerGroup.add(nozzle);

          const flame = new THREE.Mesh(burnConeGeo, jetOrangeMat);
          flame.position.set(px, wY, spZ + 0.62);
          customSpoilerGroup.add(flame);
        }

        // Center speed-reactive tilting DRS flap bridging the twin jet pods!
        const drsPivot = new THREE.Group();
        drsPivot.position.set(0, wY, spZ + 0.06);
        customSpoilerGroup.add(drsPivot);
        activeDrsBlade = drsPivot;
        const centerFlap = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(span * 0.72, 0.044, 0.3)),
          carbonMat,
        );
        centerFlap.castShadow = true;
        drsPivot.add(centerFlap);
        const flapLed = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(span * 0.68, 0.02, 0.045)),
          jetBlueMat,
        );
        flapLed.position.set(0, 0.022, 0.14);
        drsPivot.add(flapLed);
      } else if (spoiler === 'animAngelWings') {
        // Ethereal Floating Holographic Feathered Angel Wings hovering above the rear deck!
        const wY = deckY + 0.34;
        const featherWhiteMat = trackCustomMat(
          new THREE.MeshStandardMaterial({
            color: 0xf0f9ff,
            emissive: 0x7dd3fc,
            emissiveIntensity: 1.9,
            transparent: true,
            opacity: 0.9,
            roughness: 0.1,
          }),
        );
        const featherGoldMat = trackCustomMat(
          new THREE.MeshStandardMaterial({
            color: 0xfef08a,
            emissive: 0xf59e0b,
            emissiveIntensity: 2.1,
            roughness: 0.12,
          }),
        );
        spoilerAnimPrimaryMat = featherWhiteMat;
        spoilerAnimSecondaryMat = featherGoldMat;

        // Subtle golden light-emitter crest mounted on the trunk
        const crest = new THREE.Mesh(
          trackCustomGeo(new THREE.OctahedronGeometry(0.085, 0)),
          featherGoldMat,
        );
        crest.scale.set(1.2, 0.7, 0.8);
        crest.position.set(0, deckY + 0.09, spZ + 0.04);
        customSpoilerGroup.add(crest);

        // Levitating gracefully-swept layered feathered wings group!
        const hover = new THREE.Group();
        hover.position.set(0, wY, spZ + 0.08);
        customSpoilerGroup.add(hover);
        spoilerHoverGroup = hover;
        spoilerHoverBaseY = wY;

        const featherGeo = trackCustomGeo(new THREE.BoxGeometry(0.42, 0.024, 0.11));
        for (const sx of [-1, 1]) {
          // 6 sweeping upper primary feathers fanning out & upward in a majestic arc
          for (let f = 0; f < 6; f++) {
            const frac = f / 5;
            const lenScale = 0.72 + frac * 0.78;
            const feather = new THREE.Mesh(
              featherGeo,
              f === 5 ? featherGoldMat : featherWhiteMat,
            );
            feather.scale.set(lenScale, 1, 0.85 + frac * 0.25);
            feather.position.set(
              sx * (0.24 + frac * (bodyWidth * 0.42)),
              -0.06 + frac * 0.36,
              0.04 + frac * 0.06,
            );
            feather.rotation.z = sx * (0.18 + frac * 0.44);
            feather.rotation.y = sx * (-0.16 - frac * 0.12);
            hover.add(feather);
          }
          // 4 inner golden secondary feathers below
          for (let s = 0; s < 4; s++) {
            const frac = s / 3;
            const subF = new THREE.Mesh(featherGeo, featherGoldMat);
            subF.scale.set(0.55 + frac * 0.45, 0.9, 0.7);
            subF.position.set(
              sx * (0.18 + frac * (bodyWidth * 0.26)),
              -0.14 + frac * 0.18,
              0.08 + frac * 0.04,
            );
            subF.rotation.z = sx * (0.06 + frac * 0.28);
            subF.rotation.y = sx * -0.14;
            hover.add(subF);
          }
        }
      }
    }
  };

  // =========================================================================
  // 8. 3D ROOF HATS / TOPPERS (Mounted flush on cabin roof crown)
  // =========================================================================
  const customHatGroup = new THREE.Group();
  const [, hatC1, hatC2] = bp.cabin;
  const hatBaseY = (hatC1.crownY + hatC2.crownY) * 0.5 - 0.012;
  const hatBaseZ = (hatC1.z + hatC2.z) * 0.5;
  customHatGroup.position.set(0, hatBaseY, hatBaseZ);
  if (modelId === 'f1') {
    customHatGroup.scale.setScalar(0.76);
  }
  chassisGroup.add(customHatGroup);

  const hatGeos: THREE.BufferGeometry[] = [];
  const hatMats: THREE.Material[] = [];
  let hatPropellerGroup: THREE.Group | null = null;
  let hatFezTasselPivot: THREE.Group | null = null;
  let hatCrownGemMats: THREE.MeshStandardMaterial[] = [];
  let hatPoliceRedMat: THREE.MeshStandardMaterial | null = null;
  let hatPoliceBlueMat: THREE.MeshStandardMaterial | null = null;
  let hatHoverGroup: THREE.Group | null = null;
  let hatHoverBaseY = 0;
  let hatOrbitGroup: THREE.Group | null = null;
  let hatUfoSpinGroup: THREE.Group | null = null;
  let hatUfoLightMats: THREE.MeshStandardMaterial[] = [];
  let hatFlameSpikes: THREE.Mesh[] = [];
  let hatHaloMat: THREE.MeshStandardMaterial | null = null;

  const trackHatGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    hatGeos.push(g);
    return g;
  };
  const trackHatMat = <T extends THREE.Material>(m: T): T => {
    hatMats.push(m);
    return m;
  };

  const clearRoofHat = (): void => {
    while (customHatGroup.children.length > 0) {
      customHatGroup.remove(customHatGroup.children[0]);
    }
    hatGeos.forEach((g) => g.dispose());
    hatGeos.length = 0;
    hatMats.forEach((m) => m.dispose());
    hatMats.length = 0;
    hatPropellerGroup = null;
    hatFezTasselPivot = null;
    hatCrownGemMats = [];
    hatPoliceRedMat = null;
    hatPoliceBlueMat = null;
    hatHoverGroup = null;
    hatHoverBaseY = 0;
    hatOrbitGroup = null;
    hatUfoSpinGroup = null;
    hatUfoLightMats = [];
    hatFlameSpikes = [];
    hatHaloMat = null;
  };

  const rebuildRoofHat = (hatId: RoofHatId): void => {
    clearRoofHat();
    if (hatId === 'none') return;

    if (hatId === 'baseball') {
      const redMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xdc2626,
          roughness: 0.72,
          metalness: 0.06,
        }),
      );
      const whiteMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xf8fafc,
          roughness: 0.65,
          metalness: 0.05,
        }),
      );
      const darkVisorMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0x18181b,
          roughness: 0.68,
          metalness: 0.1,
        }),
      );

      // Crown dome
      const domeGeo = trackHatGeo(
        new THREE.SphereGeometry(0.32, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.54),
      );
      domeGeo.scale(1.0, 0.84, 1.08);
      const dome = new THREE.Mesh(domeGeo, redMat);
      dome.position.y = 0.01;
      dome.castShadow = true;
      customHatGroup.add(dome);

      // Crisp white front panel patch
      const patchGeo = trackHatGeo(
        new THREE.SphereGeometry(
          0.324,
          16,
          12,
          Math.PI * 0.76,
          Math.PI * 0.48,
          0.14,
          Math.PI * 0.36,
        ),
      );
      patchGeo.scale(1.0, 0.84, 1.08);
      const patch = new THREE.Mesh(patchGeo, whiteMat);
      patch.position.y = 0.01;
      customHatGroup.add(patch);

      // Forward curved visor bill (facing -Z)
      const visorGeo = trackHatGeo(
        new THREE.CylinderGeometry(0.28, 0.32, 0.026, 20, 1, false, -Math.PI * 0.42, Math.PI * 0.84),
      );
      visorGeo.rotateY(Math.PI);
      visorGeo.scale(1.06, 1.0, 1.42);
      const visor = new THREE.Mesh(visorGeo, darkVisorMat);
      visor.position.set(0, 0.042, -0.14);
      visor.rotation.x = 0.08;
      visor.castShadow = true;
      customHatGroup.add(visor);

      // Top cap button
      const btn = new THREE.Mesh(
        trackHatGeo(new THREE.SphereGeometry(0.036, 12, 10)),
        whiteMat,
      );
      btn.position.set(0, 0.285, 0);
      customHatGroup.add(btn);
    } else if (hatId === 'fez') {
      const velvetMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0x991b1b,
          roughness: 0.84,
          metalness: 0.04,
        }),
      );
      const bandMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0x450a0a,
          roughness: 0.72,
          metalness: 0.1,
        }),
      );
      const tasselMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0x111114,
          roughness: 0.8,
          metalness: 0.08,
        }),
      );
      const goldPinMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          roughness: 0.24,
          metalness: 0.86,
        }),
      );

      // Tapered fez body
      const body = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.23, 0.30, 0.35, 24)),
        velvetMat,
      );
      body.position.y = 0.175;
      body.castShadow = true;
      customHatGroup.add(body);

      // Base rim trim
      const baseTrim = new THREE.Mesh(
        trackHatGeo(new THREE.TorusGeometry(0.298, 0.018, 10, 24)),
        bandMat,
      );
      baseTrim.rotation.x = Math.PI / 2;
      baseTrim.position.y = 0.015;
      customHatGroup.add(baseTrim);

      // Top brass pin
      const pin = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.022, 0.026, 0.035, 12)),
        goldPinMat,
      );
      pin.position.y = 0.36;
      customHatGroup.add(pin);

      // Animated dangling tassel pivot
      const tasselPivot = new THREE.Group();
      tasselPivot.position.set(0, 0.365, 0);
      customHatGroup.add(tasselPivot);
      hatFezTasselPivot = tasselPivot;

      const topCord = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.012, 0.012, 0.24, 8)),
        tasselMat,
      );
      topCord.rotation.z = Math.PI / 2;
      topCord.position.set(0.12, 0, 0);
      tasselPivot.add(topCord);

      const dropCord = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.012, 0.014, 0.20, 8)),
        tasselMat,
      );
      dropCord.position.set(0.255, -0.095, 0);
      dropCord.rotation.z = 0.14;
      tasselPivot.add(dropCord);

      const tasselCollar = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.022, 0.026, 0.03, 10)),
        goldPinMat,
      );
      tasselCollar.position.set(0.27, -0.185, 0);
      tasselPivot.add(tasselCollar);

      const tasselBell = new THREE.Mesh(
        trackHatGeo(new THREE.ConeGeometry(0.048, 0.12, 12)),
        tasselMat,
      );
      tasselBell.position.set(0.275, -0.25, 0);
      tasselPivot.add(tasselBell);
    } else if (hatId === 'cowboy') {
      const leatherMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0x7c3f18,
          roughness: 0.68,
          metalness: 0.08,
        }),
      );
      const darkBandMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0x2c1608,
          roughness: 0.55,
          metalness: 0.12,
        }),
      );
      const goldBuckleMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          roughness: 0.2,
          metalness: 0.9,
        }),
      );

      // Sculpted curled cowboy brim (sides curled upward cleanly)
      const brimGeo = trackHatGeo(new THREE.CylinderGeometry(0.56, 0.56, 0.028, 32, 1));
      const posAttr = brimGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const px = posAttr.getX(i);
        const py = posAttr.getY(i);
        const pz = posAttr.getZ(i);
        // Stretch fore-aft slightly and curl left/right edges up
        const nx = px * 0.96;
        const nz = pz * 1.18;
        const sideLift = Math.pow(Math.abs(nx) / 0.56, 2) * 0.145;
        const frontDip = -Math.pow(Math.abs(nz) / 0.66, 2) * 0.035;
        posAttr.setXYZ(i, nx, py + sideLift + frontDip, nz);
      }
      brimGeo.computeVertexNormals();
      const brim = new THREE.Mesh(brimGeo, leatherMat);
      brim.position.y = 0.055;
      brim.castShadow = true;
      customHatGroup.add(brim);

      // Pinched crown (twin slight ridges on left & right)
      const crownGeo = trackHatGeo(new THREE.CylinderGeometry(0.21, 0.28, 0.28, 22));
      crownGeo.scale(0.95, 1.0, 1.2);
      const crown = new THREE.Mesh(crownGeo, leatherMat);
      crown.position.y = 0.18;
      crown.castShadow = true;
      customHatGroup.add(crown);

      for (const sx of [-0.08, 0.08]) {
        const ridge = new THREE.Mesh(
          trackHatGeo(new THREE.SphereGeometry(0.115, 14, 12)),
          leatherMat,
        );
        ridge.scale.set(0.85, 0.52, 2.2);
        ridge.position.set(sx, 0.305, 0);
        customHatGroup.add(ridge);
      }

      // Leather hatband + front gold buckle
      const band = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.282, 0.292, 0.055, 22)),
        darkBandMat,
      );
      band.scale.set(0.96, 1.0, 1.21);
      band.position.y = 0.085;
      customHatGroup.add(band);

      const buckle = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.095, 0.072, 0.025)),
        goldBuckleMat,
      );
      buckle.position.set(0, 0.088, -0.352);
      customHatGroup.add(buckle);
    } else if (hatId === 'propeller') {
      const panelColors = [0xef4444, 0xfacc15, 0x22c55e, 0x3b82f6];
      for (let i = 0; i < 4; i++) {
        const pMat = trackHatMat(
          new THREE.MeshStandardMaterial({
            color: panelColors[i],
            roughness: 0.62,
            metalness: 0.08,
          }),
        );
        const segGeo = trackHatGeo(
          new THREE.SphereGeometry(
            0.31,
            12,
            12,
            (i * Math.PI) / 2,
            Math.PI / 2,
            0,
            Math.PI * 0.54,
          ),
        );
        segGeo.scale(1.0, 0.85, 1.06);
        const seg = new THREE.Mesh(segGeo, pMat);
        seg.position.y = 0.01;
        seg.castShadow = true;
        customHatGroup.add(seg);
      }

      // Bright blue visor
      const visorMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0x2563eb,
          roughness: 0.55,
          metalness: 0.1,
        }),
      );
      const visorGeo = trackHatGeo(
        new THREE.CylinderGeometry(0.25, 0.29, 0.024, 18, 1, false, -Math.PI * 0.4, Math.PI * 0.8),
      );
      visorGeo.rotateY(Math.PI);
      visorGeo.scale(1.0, 1.0, 1.32);
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(0, 0.04, -0.13);
      customHatGroup.add(visor);

      // Center shaft + spinning propeller
      const shaftMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xe4e4e7,
          roughness: 0.22,
          metalness: 0.88,
        }),
      );
      const shaft = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.018, 0.024, 0.095, 12)),
        shaftMat,
      );
      shaft.position.y = 0.305;
      customHatGroup.add(shaft);

      const propGroup = new THREE.Group();
      propGroup.position.set(0, 0.355, 0);
      customHatGroup.add(propGroup);
      hatPropellerGroup = propGroup;

      const hub = new THREE.Mesh(
        trackHatGeo(new THREE.SphereGeometry(0.042, 12, 10)),
        trackHatMat(
          new THREE.MeshStandardMaterial({
            color: 0xfacc15,
            roughness: 0.26,
            metalness: 0.65,
          }),
        ),
      );
      propGroup.add(hub);

      const bladeMatA = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xef4444,
          roughness: 0.32,
          metalness: 0.2,
        }),
      );
      const bladeMatB = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0x22d3ee,
          roughness: 0.32,
          metalness: 0.2,
        }),
      );
      const bladeGeo = trackHatGeo(new THREE.BoxGeometry(0.26, 0.014, 0.068));
      for (let b = 0; b < 2; b++) {
        const sign = b === 0 ? 1 : -1;
        const blade = new THREE.Mesh(bladeGeo, b === 0 ? bladeMatA : bladeMatB);
        blade.position.set(sign * 0.145, 0, 0);
        blade.rotation.x = sign * 0.26;
        propGroup.add(blade);
      }
    } else if (hatId === 'tophat') {
      const satinMat = trackHatMat(
        new THREE.MeshPhysicalMaterial({
          color: 0x111116,
          roughness: 0.28,
          metalness: 0.22,
          clearcoat: 0.65,
          clearcoatRoughness: 0.18,
        }),
      );
      const ribbonMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xdc2626,
          roughness: 0.35,
          metalness: 0.18,
        }),
      );

      // Curved wide brim
      const brim = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.46, 0.48, 0.028, 28)),
        satinMat,
      );
      brim.scale.set(0.94, 1.0, 1.12);
      brim.position.y = 0.022;
      brim.castShadow = true;
      customHatGroup.add(brim);

      const brimEdge = new THREE.Mesh(
        trackHatGeo(new THREE.TorusGeometry(0.465, 0.016, 10, 28)),
        satinMat,
      );
      brimEdge.rotation.x = Math.PI / 2;
      brimEdge.scale.set(0.94, 1.12, 1.0);
      brimEdge.position.y = 0.026;
      customHatGroup.add(brimEdge);

      // Tall flared crown
      const crown = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.325, 0.275, 0.44, 26)),
        satinMat,
      );
      crown.position.y = 0.245;
      crown.castShadow = true;
      customHatGroup.add(crown);

      // Crimson silk ribbon band
      const ribbon = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.292, 0.282, 0.075, 26)),
        ribbonMat,
      );
      ribbon.position.y = 0.075;
      customHatGroup.add(ribbon);
    } else if (hatId === 'viking') {
      const steelMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0x71717a,
          roughness: 0.28,
          metalness: 0.86,
        }),
      );
      const ironBandMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0x27272a,
          roughness: 0.36,
          metalness: 0.82,
        }),
      );
      const brassMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xd97706,
          roughness: 0.25,
          metalness: 0.88,
        }),
      );
      const hornMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xfef3c7,
          roughness: 0.38,
          metalness: 0.06,
        }),
      );

      // Steel dome
      const dome = new THREE.Mesh(
        trackHatGeo(
          new THREE.SphereGeometry(0.33, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.54),
        ),
        steelMat,
      );
      dome.position.y = 0.01;
      dome.castShadow = true;
      customHatGroup.add(dome);

      // Brow rim + center ridge
      const rim = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.342, 0.348, 0.055, 24)),
        ironBandMat,
      );
      rim.position.y = 0.032;
      customHatGroup.add(rim);

      const ridge = new THREE.Mesh(
        trackHatGeo(new THREE.TorusGeometry(0.334, 0.022, 10, 22, Math.PI)),
        ironBandMat,
      );
      ridge.rotation.y = Math.PI / 2;
      ridge.position.y = 0.015;
      customHatGroup.add(ridge);

      // Brass rivets around the brow
      const rivetGeo = trackHatGeo(new THREE.SphereGeometry(0.018, 8, 8));
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const r = new THREE.Mesh(rivetGeo, brassMat);
        r.position.set(Math.sin(a) * 0.348, 0.034, Math.cos(a) * 0.348);
        customHatGroup.add(r);
      }

      // Twin dramatic sweeping ivory horns
      for (const side of [-1, 1]) {
        const collar = new THREE.Mesh(
          trackHatGeo(new THREE.CylinderGeometry(0.066, 0.075, 0.06, 14)),
          brassMat,
        );
        collar.position.set(side * 0.31, 0.16, 0);
        collar.rotation.z = -side * Math.PI * 0.42;
        customHatGroup.add(collar);

        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(side * 0.31, 0.16, 0),
          new THREE.Vector3(side * 0.48, 0.22, -0.02),
          new THREE.Vector3(side * 0.59, 0.36, -0.05),
          new THREE.Vector3(side * 0.56, 0.54, -0.08),
        ]);
        const segs = 14;
        const pts = curve.getPoints(segs);
        for (let s = 0; s < segs; s++) {
          const t0 = s / segs;
          const t1 = (s + 1) / segs;
          const r0 = THREE.MathUtils.lerp(0.062, 0.008, t0);
          const r1 = THREE.MathUtils.lerp(0.062, 0.008, t1);
          const p0 = pts[s];
          const p1 = pts[s + 1];
          const dir = p1.clone().sub(p0);
          const len = dir.length();
          const segGeo = trackHatGeo(new THREE.CylinderGeometry(r1, r0, len + 0.01, 12));
          const segMesh = new THREE.Mesh(segGeo, hornMat);
          segMesh.position.copy(p0).addScaledVector(dir, 0.5);
          segMesh.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            dir.normalize(),
          );
          segMesh.castShadow = true;
          customHatGroup.add(segMesh);
        }
      }
    } else if (hatId === 'crown') {
      const goldMat = trackHatMat(
        new THREE.MeshPhysicalMaterial({
          color: 0xfbbf24,
          metalness: 0.94,
          roughness: 0.16,
          clearcoat: 0.9,
          emissive: 0x78350f,
          emissiveIntensity: 0.22,
        }),
      );
      const velvetMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0x991b1b,
          roughness: 0.85,
          metalness: 0.04,
        }),
      );
      const rubyMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xef4444,
          emissive: 0xdc2626,
          emissiveIntensity: 0.95,
          roughness: 0.12,
          metalness: 0.3,
        }),
      );
      const emeraldMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0x10b981,
          emissive: 0x059669,
          emissiveIntensity: 0.95,
          roughness: 0.12,
          metalness: 0.3,
        }),
      );
      hatCrownGemMats = [rubyMat, emeraldMat];

      // Velvet inner cushion dome
      const cushion = new THREE.Mesh(
        trackHatGeo(
          new THREE.SphereGeometry(0.285, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
        ),
        velvetMat,
      );
      cushion.position.y = 0.05;
      customHatGroup.add(cushion);

      // Gold lower band + upper lip
      const band = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.325, 0.30, 0.13, 24, 1, true)),
        goldMat,
      );
      band.material.side = THREE.DoubleSide;
      band.position.y = 0.075;
      band.castShadow = true;
      customHatGroup.add(band);

      const baseRing = new THREE.Mesh(
        trackHatGeo(new THREE.TorusGeometry(0.304, 0.022, 10, 24)),
        goldMat,
      );
      baseRing.rotation.x = Math.PI / 2;
      baseRing.position.y = 0.02;
      customHatGroup.add(baseRing);

      // 8 golden crown spires + top orbs + alternating ruby & emerald gems
      const spireGeo = trackHatGeo(new THREE.ConeGeometry(0.068, 0.21, 4));
      const orbGeo = trackHatGeo(new THREE.SphereGeometry(0.032, 10, 10));
      const gemGeo = trackHatGeo(new THREE.OctahedronGeometry(0.034, 0));
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const sx = Math.sin(angle) * 0.315;
        const sz = Math.cos(angle) * 0.315;

        const spire = new THREE.Mesh(spireGeo, goldMat);
        spire.position.set(sx, 0.225, sz);
        spire.rotation.y = angle;
        spire.castShadow = true;
        customHatGroup.add(spire);

        const orb = new THREE.Mesh(orbGeo, goldMat);
        orb.position.set(sx, 0.34, sz);
        customHatGroup.add(orb);

        const gem = new THREE.Mesh(gemGeo, i % 2 === 0 ? rubyMat : emeraldMat);
        gem.position.set(Math.sin(angle) * 0.322, 0.082, Math.cos(angle) * 0.322);
        customHatGroup.add(gem);
      }
    } else if (hatId === 'chef') {
      const whiteCottonMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.88 }),
      );
      const redTrimMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.55 }),
      );
      const band = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.24, 0.25, 0.16, 22)),
        whiteCottonMat,
      );
      band.position.y = 0.08;
      band.castShadow = true;
      customHatGroup.add(band);

      const stripe = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.254, 0.254, 0.032, 22)),
        redTrimMat,
      );
      stripe.position.y = 0.035;
      customHatGroup.add(stripe);

      // Puffy chef toque crown (center puff + 7 outer cloud puffs)
      const centerPuff = new THREE.Mesh(
        trackHatGeo(new THREE.SphereGeometry(0.22, 16, 14)),
        whiteCottonMat,
      );
      centerPuff.position.y = 0.27;
      centerPuff.castShadow = true;
      customHatGroup.add(centerPuff);

      const puffGeo = trackHatGeo(new THREE.SphereGeometry(0.145, 14, 12));
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const p = new THREE.Mesh(puffGeo, whiteCottonMat);
        p.position.set(Math.sin(a) * 0.165, 0.255, Math.cos(a) * 0.165);
        p.castShadow = true;
        customHatGroup.add(p);
      }
    } else if (hatId === 'ushanka') {
      const furMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.96 }),
      );
      const woolMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.92 }),
      );
      const starGoldMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          metalness: 0.9,
          roughness: 0.2,
        }),
      );

      const dome = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.26, 0.28, 0.24, 20)),
        woolMat,
      );
      dome.position.y = 0.12;
      dome.castShadow = true;
      customHatGroup.add(dome);

      const frontFlap = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.42, 0.21, 0.12)),
        furMat,
      );
      frontFlap.position.set(0, 0.13, -0.25);
      frontFlap.castShadow = true;
      customHatGroup.add(frontFlap);

      const badge = new THREE.Mesh(
        trackHatGeo(new THREE.OctahedronGeometry(0.055, 0)),
        starGoldMat,
      );
      badge.position.set(0, 0.14, -0.32);
      customHatGroup.add(badge);

      for (const side of [-1, 1]) {
        const earFlap = new THREE.Mesh(
          trackHatGeo(new THREE.BoxGeometry(0.12, 0.3, 0.24)),
          furMat,
        );
        earFlap.position.set(side * 0.3, 0.08, 0.02);
        earFlap.rotation.z = side * -0.18;
        earFlap.castShadow = true;
        customHatGroup.add(earFlap);
      }
    } else if (hatId === 'sombrero') {
      const strawMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.84 }),
      );
      const redBandMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.65 }),
      );
      const tealBandMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x14b8a6, roughness: 0.65 }),
      );

      // Wide curved sombrero brim
      const brim = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.56, 0.52, 0.042, 28)),
        strawMat,
      );
      brim.position.y = 0.045;
      brim.castShadow = true;
      customHatGroup.add(brim);

      const brimLip = new THREE.Mesh(
        trackHatGeo(new THREE.TorusGeometry(0.545, 0.034, 10, 28)),
        redBandMat,
      );
      brimLip.rotation.x = Math.PI / 2;
      brimLip.position.y = 0.068;
      customHatGroup.add(brimLip);

      const crown = new THREE.Mesh(
        trackHatGeo(new THREE.ConeGeometry(0.24, 0.36, 22)),
        strawMat,
      );
      crown.position.y = 0.22;
      crown.castShadow = true;
      customHatGroup.add(crown);

      const band = new THREE.Mesh(
        trackHatGeo(new THREE.TorusGeometry(0.23, 0.026, 8, 22)),
        tealBandMat,
      );
      band.rotation.x = Math.PI / 2;
      band.position.y = 0.1;
      customHatGroup.add(band);

      // Pom-poms around brim
      const pomGeo = trackHatGeo(new THREE.SphereGeometry(0.032, 8, 8));
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const pom = new THREE.Mesh(
          pomGeo,
          i % 2 === 0 ? tealBandMat : redBandMat,
        );
        pom.position.set(Math.sin(a) * 0.54, 0.025, Math.cos(a) * 0.54);
        customHatGroup.add(pom);
      }
    } else if (hatId === 'pirate') {
      const darkFeltMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 }),
      );
      const goldTrimMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          metalness: 0.85,
          roughness: 0.24,
        }),
      );
      const skullWhiteMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 }),
      );

      // Tricorn captain dome
      const dome = new THREE.Mesh(
        trackHatGeo(
          new THREE.SphereGeometry(0.24, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
        ),
        darkFeltMat,
      );
      dome.position.y = 0.04;
      dome.castShadow = true;
      customHatGroup.add(dome);

      // Wide dramatic Captain bicorn/tricorn folded brim
      const frontCrest = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.76, 0.28, 0.09)),
        darkFeltMat,
      );
      frontCrest.position.set(0, 0.15, -0.18);
      frontCrest.rotation.x = 0.22;
      frontCrest.castShadow = true;
      customHatGroup.add(frontCrest);

      const goldEdge = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.78, 0.035, 0.1)),
        goldTrimMat,
      );
      goldEdge.position.set(0, 0.29, -0.15);
      goldEdge.rotation.x = 0.22;
      customHatGroup.add(goldEdge);

      const backCrest = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.68, 0.24, 0.09)),
        darkFeltMat,
      );
      backCrest.position.set(0, 0.13, 0.2);
      backCrest.rotation.x = -0.24;
      customHatGroup.add(backCrest);

      // Skull emblem + crossbones on front
      const skull = new THREE.Mesh(
        trackHatGeo(new THREE.SphereGeometry(0.068, 12, 10)),
        skullWhiteMat,
      );
      skull.position.set(0, 0.17, -0.24);
      customHatGroup.add(skull);

      const boneGeo = trackHatGeo(new THREE.BoxGeometry(0.18, 0.024, 0.022));
      for (const sgn of [-1, 1]) {
        const bone = new THREE.Mesh(boneGeo, skullWhiteMat);
        bone.position.set(0, 0.11, -0.235);
        bone.rotation.z = sgn * 0.45;
        customHatGroup.add(bone);
      }
    } else if (hatId === 'samurai') {
      const lacquerMat = trackHatMat(
        new THREE.MeshPhysicalMaterial({
          color: 0x18181b,
          metalness: 0.55,
          roughness: 0.2,
          clearcoat: 1.0,
        }),
      );
      const crimsonMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.45 }),
      );
      const goldMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          metalness: 0.94,
          roughness: 0.16,
        }),
      );

      // Kabuto dome
      const kabuto = new THREE.Mesh(
        trackHatGeo(
          new THREE.SphereGeometry(0.28, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.58),
        ),
        lacquerMat,
      );
      kabuto.position.y = 0.04;
      kabuto.castShadow = true;
      customHatGroup.add(kabuto);

      // Layered neck guard (Shikoro) flaring down sides & rear
      for (let tier = 0; tier < 3; tier++) {
        const guard = new THREE.Mesh(
          trackHatGeo(
            new THREE.CylinderGeometry(
              0.31 + tier * 0.04,
              0.35 + tier * 0.045,
              0.042,
              20,
              1,
              true,
              -Math.PI * 0.62,
              Math.PI * 1.24,
            ),
          ),
          tier === 1 ? crimsonMat : lacquerMat,
        );
        guard.material.side = THREE.DoubleSide;
        guard.position.y = 0.12 - tier * 0.042;
        customHatGroup.add(guard);
      }

      // Iconic golden crescent Maedate crest on front
      const crescent = new THREE.Mesh(
        trackHatGeo(new THREE.TorusGeometry(0.18, 0.026, 8, 22, Math.PI * 1.15)),
        goldMat,
      );
      crescent.position.set(0, 0.34, -0.25);
      crescent.rotation.z = -Math.PI * 0.075;
      crescent.castShadow = true;
      customHatGroup.add(crescent);

      const sunOrb = new THREE.Mesh(
        trackHatGeo(new THREE.SphereGeometry(0.048, 12, 10)),
        crimsonMat,
      );
      sunOrb.position.set(0, 0.21, -0.26);
      customHatGroup.add(sunOrb);
    } else if (hatId === 'policeBeacon') {
      // Animated Dual Red/Blue Police Siren Lightbar
      const housingMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0x18181b,
          metalness: 0.72,
          roughness: 0.26,
        }),
      );
      const redMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xef4444,
          emissive: 0xef4444,
          emissiveIntensity: 2.8,
          roughness: 0.12,
          transparent: true,
          opacity: 0.94,
        }),
      );
      const blueMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0x3b82f6,
          emissive: 0x2563eb,
          emissiveIntensity: 2.8,
          roughness: 0.12,
          transparent: true,
          opacity: 0.94,
        }),
      );
      hatPoliceRedMat = redMat;
      hatPoliceBlueMat = blueMat;

      // Mounting feet + central aluminum frame
      for (const sx of [-0.36, 0.36]) {
        const foot = new THREE.Mesh(
          trackHatGeo(new THREE.BoxGeometry(0.08, 0.06, 0.18)),
          housingMat,
        );
        foot.position.set(sx, 0.03, 0);
        customHatGroup.add(foot);
      }

      const centerBox = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.24, 0.13, 0.22)),
        housingMat,
      );
      centerBox.position.set(0, 0.115, 0);
      centerBox.castShadow = true;
      customHatGroup.add(centerBox);

      const redLens = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.32, 0.125, 0.21)),
        redMat,
      );
      redLens.position.set(-0.28, 0.115, 0);
      customHatGroup.add(redLens);

      const blueLens = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.32, 0.125, 0.21)),
        blueMat,
      );
      blueLens.position.set(0.28, 0.115, 0);
      customHatGroup.add(blueLens);
    } else if (hatId === 'haloAngel') {
      // Levitating Glowing 24K Golden Angel Halo
      const haloMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xfef08a,
          emissive: 0xfbbf24,
          emissiveIntensity: 2.3,
          metalness: 0.85,
          roughness: 0.12,
        }),
      );
      hatHaloMat = haloMat;

      const hover = new THREE.Group();
      hover.position.y = 0.36;
      customHatGroup.add(hover);
      hatHoverGroup = hover;
      hatHoverBaseY = 0.36;

      const mainRing = new THREE.Mesh(
        trackHatGeo(new THREE.TorusGeometry(0.34, 0.036, 14, 34)),
        haloMat,
      );
      mainRing.rotation.x = Math.PI / 2;
      hover.add(mainRing);

      const outerGlow = new THREE.Mesh(
        trackHatGeo(new THREE.TorusGeometry(0.34, 0.056, 10, 28)),
        trackHatMat(
          new THREE.MeshBasicMaterial({
            color: 0xfef08a,
            transparent: true,
            opacity: 0.28,
          }),
        ),
      );
      outerGlow.rotation.x = Math.PI / 2;
      hover.add(outerGlow);
    } else if (hatId === 'ufoSaucer') {
      // Hovering Spinning Alien UFO with cycling rim lights + green tractor beam
      const hullMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xd4d4d8,
          metalness: 0.94,
          roughness: 0.14,
        }),
      );
      const glassMat = trackHatMat(
        new THREE.MeshPhysicalMaterial({
          color: 0x4ade80,
          emissive: 0x16a34a,
          emissiveIntensity: 0.85,
          roughness: 0.08,
          transparent: true,
          opacity: 0.82,
        }),
      );
      const beamMat = trackHatMat(
        new THREE.MeshBasicMaterial({
          color: 0x4ade80,
          transparent: true,
          opacity: 0.22,
          side: THREE.DoubleSide,
        }),
      );

      // Translucent tractor beam connecting roof to UFO
      const beam = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.14, 0.32, 0.36, 20, 1, true)),
        beamMat,
      );
      beam.position.y = 0.18;
      customHatGroup.add(beam);

      const hover = new THREE.Group();
      hover.position.y = 0.42;
      customHatGroup.add(hover);
      hatHoverGroup = hover;
      hatHoverBaseY = 0.42;

      const spin = new THREE.Group();
      hover.add(spin);
      hatUfoSpinGroup = spin;

      const saucer = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.2, 0.42, 0.09, 26)),
        hullMat,
      );
      saucer.castShadow = true;
      spin.add(saucer);

      const underSaucer = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.42, 0.16, 0.07, 26)),
        hullMat,
      );
      underSaucer.position.y = -0.075;
      spin.add(underSaucer);

      const cockpitDome = new THREE.Mesh(
        trackHatGeo(
          new THREE.SphereGeometry(0.18, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
        ),
        glassMat,
      );
      cockpitDome.position.y = 0.03;
      spin.add(cockpitDome);

      const bulbGeo = trackHatGeo(new THREE.SphereGeometry(0.032, 8, 8));
      hatUfoLightMats = [];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const lMat = trackHatMat(
          new THREE.MeshStandardMaterial({
            color: i % 2 === 0 ? 0x22d3ee : 0xa3e635,
            emissive: i % 2 === 0 ? 0x06b6d4 : 0x84cc16,
            emissiveIntensity: 2.2,
            roughness: 0.15,
          }),
        );
        hatUfoLightMats.push(lMat);
        const bulb = new THREE.Mesh(bulbGeo, lMat);
        bulb.position.set(Math.sin(a) * 0.38, -0.02, Math.cos(a) * 0.38);
        spin.add(bulb);
      }
    } else if (hatId === 'wizardHat') {
      // Starry Cosmic Wizard Hat with Orbiting Glowing Magic Orbs
      const indigoMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x312e81, roughness: 0.78 }),
      );
      const starGoldMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xfde047,
          emissive: 0xd97706,
          emissiveIntensity: 0.75,
          metalness: 0.85,
          roughness: 0.2,
        }),
      );
      const orbMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xe879f9,
          emissive: 0xc026d3,
          emissiveIntensity: 2.4,
          roughness: 0.12,
        }),
      );

      const brim = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.46, 0.48, 0.034, 24)),
        indigoMat,
      );
      brim.position.y = 0.024;
      brim.castShadow = true;
      customHatGroup.add(brim);

      const cone = new THREE.Mesh(
        trackHatGeo(new THREE.ConeGeometry(0.24, 0.56, 20)),
        indigoMat,
      );
      cone.position.set(0, 0.3, 0.04);
      cone.rotation.x = 0.16;
      cone.castShadow = true;
      customHatGroup.add(cone);

      const goldBand = new THREE.Mesh(
        trackHatGeo(new THREE.TorusGeometry(0.23, 0.025, 8, 22)),
        starGoldMat,
      );
      goldBand.rotation.x = Math.PI / 2;
      goldBand.position.y = 0.06;
      customHatGroup.add(goldBand);

      const starGeo = trackHatGeo(new THREE.OctahedronGeometry(0.032, 0));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const h = 0.14 + (i % 3) * 0.1;
        const r = 0.21 - (h - 0.1) * 0.36;
        const star = new THREE.Mesh(starGeo, starGoldMat);
        star.position.set(Math.sin(a) * r, h, Math.cos(a) * r + 0.02);
        customHatGroup.add(star);
      }

      const orbit = new THREE.Group();
      orbit.position.y = 0.36;
      customHatGroup.add(orbit);
      hatOrbitGroup = orbit;
      const orbGeo = trackHatGeo(new THREE.SphereGeometry(0.045, 10, 10));
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const orb = new THREE.Mesh(orbGeo, orbMat);
        orb.position.set(Math.sin(a) * 0.36, Math.sin(i * 2) * 0.06, Math.cos(a) * 0.36);
        orbit.add(orb);
      }
    } else if (hatId === 'flameMohawk') {
      // Animated Undulating Glowing Fire Mohawk Crest along roof spine
      const baseMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0x18181b,
          metalness: 0.7,
          roughness: 0.3,
        }),
      );
      const fireOuterMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xf97316,
          emissive: 0xea580c,
          emissiveIntensity: 2.3,
          roughness: 0.18,
        }),
      );
      const fireTipMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xfef08a,
          emissive: 0xfacc15,
          emissiveIntensity: 2.6,
          roughness: 0.14,
        }),
      );

      const rail = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.11, 0.045, 0.88)),
        baseMat,
      );
      rail.position.y = 0.025;
      customHatGroup.add(rail);

      hatFlameSpikes = [];
      const spikeGeo = trackHatGeo(new THREE.ConeGeometry(0.068, 0.34, 6));
      for (let i = 0; i < 7; i++) {
        const zPos = -0.36 + i * 0.12;
        const archScale = 1 - Math.abs(i - 3) * 0.12;
        const spike = new THREE.Mesh(
          spikeGeo,
          i % 2 === 0 ? fireOuterMat : fireTipMat,
        );
        spike.position.set(0, 0.18 * archScale, zPos);
        spike.scale.set(0.85, archScale, 1.05);
        spike.rotation.x = 0.24;
        customHatGroup.add(spike);
        hatFlameSpikes.push(spike);
      }
    } else if (hatId === 'racingHelmet') {
      // Level 10 Exclusive: Glossy Motorsport Pilot Helmet with Mirror Visor
      const shellMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xf8fafc,
          metalness: 0.35,
          roughness: 0.14,
        }),
      );
      const stripeMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xef4444,
          metalness: 0.45,
          roughness: 0.18,
        }),
      );
      const visorMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          metalness: 0.95,
          roughness: 0.06,
          emissive: 0x0284c7,
          emissiveIntensity: 0.45,
        }),
      );
      const shell = new THREE.Mesh(
        trackHatGeo(new THREE.SphereGeometry(0.24, 18, 16)),
        shellMat,
      );
      shell.position.set(0, 0.22, 0);
      shell.scale.set(0.95, 0.92, 1.12);
      customHatGroup.add(shell);

      const chin = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.32, 0.14, 0.24)),
        shellMat,
      );
      chin.position.set(0, 0.12, -0.14);
      customHatGroup.add(chin);

      const stripe = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.08, 0.26, 0.46)),
        stripeMat,
      );
      stripe.position.set(0, 0.33, 0.01);
      customHatGroup.add(stripe);

      const visor = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.225, 0.225, 0.11, 16, 1, true, -Math.PI * 0.38, Math.PI * 0.76)),
        visorMat,
      );
      visor.rotation.y = Math.PI;
      visor.position.set(0, 0.22, -0.05);
      customHatGroup.add(visor);
    } else if (hatId === 'goldenTrophy') {
      // Level 50 Exclusive: Gleaming 24K Championship Cup with Orbiting Stars
      const goldMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          metalness: 0.96,
          roughness: 0.12,
          emissive: 0xb45309,
          emissiveIntensity: 0.42,
        }),
      );
      const plinthMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0x18181b,
          metalness: 0.55,
          roughness: 0.28,
        }),
      );
      const plinth = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.16, 0.19, 0.09, 14)),
        plinthMat,
      );
      plinth.position.y = 0.05;
      customHatGroup.add(plinth);

      const stem = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.05, 0.08, 0.16, 12)),
        goldMat,
      );
      stem.position.y = 0.17;
      customHatGroup.add(stem);

      const cup = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.21, 0.09, 0.28, 16)),
        goldMat,
      );
      cup.position.y = 0.36;
      customHatGroup.add(cup);

      for (const sx of [-1, 1]) {
        const handle = new THREE.Mesh(
          trackHatGeo(new THREE.TorusGeometry(0.09, 0.022, 8, 16)),
          goldMat,
        );
        handle.position.set(sx * 0.2, 0.36, 0);
        customHatGroup.add(handle);
      }

      const orbit = new THREE.Group();
      orbit.position.y = 0.52;
      customHatGroup.add(orbit);
      hatOrbitGroup = orbit;
      const starGeo = trackHatGeo(new THREE.OctahedronGeometry(0.045, 0));
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const st = new THREE.Mesh(starGeo, goldMat);
        st.position.set(Math.sin(a) * 0.32, 0, Math.cos(a) * 0.32);
        orbit.add(st);
      }
    } else if (hatId === 'apexCrown') {
      // Level 95 Exclusive: Floating Crimson-Gold Apex Emperor Crown + Diamond Halo
      const hoverGrp = new THREE.Group();
      hoverGrp.position.y = 0.24;
      customHatGroup.add(hoverGrp);
      hatHoverGroup = hoverGrp;
      hatHoverBaseY = 0.24;

      const goldMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xfde047,
          metalness: 0.96,
          roughness: 0.1,
          emissive: 0xd97706,
          emissiveIntensity: 0.65,
        }),
      );
      const rubyMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xf43f5e,
          emissive: 0xe11d48,
          emissiveIntensity: 2.2,
          roughness: 0.12,
        }),
      );
      const band = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.24, 0.21, 0.13, 18, 1, true)),
        goldMat,
      );
      hoverGrp.add(band);

      const spikeGeo = trackHatGeo(new THREE.ConeGeometry(0.055, 0.2, 6));
      const gemGeo = trackHatGeo(new THREE.OctahedronGeometry(0.036, 0));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const sp = new THREE.Mesh(spikeGeo, goldMat);
        sp.position.set(Math.sin(a) * 0.22, 0.15, Math.cos(a) * 0.22);
        hoverGrp.add(sp);
        const gem = new THREE.Mesh(gemGeo, rubyMat);
        gem.position.set(Math.sin(a) * 0.24, 0.02, Math.cos(a) * 0.24);
        hoverGrp.add(gem);
      }

      const orbit = new THREE.Group();
      orbit.position.y = 0.3;
      customHatGroup.add(orbit);
      hatOrbitGroup = orbit;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const orb = new THREE.Mesh(gemGeo, rubyMat);
        orb.position.set(Math.sin(a) * 0.36, 0, Math.cos(a) * 0.36);
        orbit.add(orb);
      }
    } else if (hatId === 'beret') {
      // Rakish Crimson French Wool Beret
      const woolMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xbe123c, roughness: 0.85, metalness: 0.04 }),
      );
      const grp = new THREE.Group();
      grp.position.y = 0.09;
      grp.rotation.z = 0.18;
      customHatGroup.add(grp);
      const disc = new THREE.Mesh(trackHatGeo(new THREE.SphereGeometry(0.29, 20, 14)), woolMat);
      disc.scale.set(1.08, 0.36, 1.05);
      grp.add(disc);
      const stem = new THREE.Mesh(trackHatGeo(new THREE.CylinderGeometry(0.014, 0.018, 0.08, 8)), woolMat);
      stem.position.set(0, 0.11, 0);
      stem.rotation.z = -0.22;
      grp.add(stem);
    } else if (hatId === 'beanie') {
      // Ribbed Navy-Amber Knit Winter Beanie with Pom-Pom
      const navyMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.9, metalness: 0.02 }),
      );
      const amberBandMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.85, metalness: 0.05 }),
      );
      const pomMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.95, metalness: 0 }),
      );
      const cuff = new THREE.Mesh(trackHatGeo(new THREE.CylinderGeometry(0.24, 0.25, 0.09, 20)), amberBandMat);
      cuff.position.y = 0.05;
      customHatGroup.add(cuff);
      const dome = new THREE.Mesh(
        trackHatGeo(new THREE.SphereGeometry(0.235, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55)),
        navyMat,
      );
      dome.position.y = 0.08;
      customHatGroup.add(dome);
      const pom = new THREE.Mesh(trackHatGeo(new THREE.SphereGeometry(0.085, 14, 12)), pomMat);
      pom.position.y = 0.35;
      customHatGroup.add(pom);
    } else if (hatId === 'astronaut') {
      // Pearl White Space Helmet with Reflective 24K Gold Visor
      const shellMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.18, metalness: 0.25 }),
      );
      const visorGoldMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          metalness: 0.98,
          roughness: 0.06,
          emissive: 0x92400e,
          emissiveIntensity: 0.28,
        }),
      );
      const collarMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.5 }),
      );
      const collar = new THREE.Mesh(trackHatGeo(new THREE.TorusGeometry(0.21, 0.036, 10, 22)), collarMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.04;
      customHatGroup.add(collar);
      const sphere = new THREE.Mesh(trackHatGeo(new THREE.SphereGeometry(0.24, 22, 18)), shellMat);
      sphere.position.y = 0.24;
      customHatGroup.add(sphere);
      const visor = new THREE.Mesh(
        trackHatGeo(new THREE.SphereGeometry(0.246, 20, 16, -Math.PI * 0.85, Math.PI * 0.7, Math.PI * 0.22, Math.PI * 0.5)),
        visorGoldMat,
      );
      visor.position.y = 0.24;
      customHatGroup.add(visor);
    } else if (hatId === 'devilHorns') {
      // Curved Glowing Crimson-Obsidian Twin Devil Horns
      const hornMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xdc2626,
          emissive: 0x991b1b,
          emissiveIntensity: 1.4,
          roughness: 0.22,
          metalness: 0.35,
        }),
      );
      const baseMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.35, metalness: 0.7 }),
      );
      const hornGeo = trackHatGeo(new THREE.ConeGeometry(0.085, 0.38, 12));
      const baseGeo = trackHatGeo(new THREE.TorusGeometry(0.09, 0.022, 8, 16));
      for (const sx of [-1, 1]) {
        const b = new THREE.Mesh(baseGeo, baseMat);
        b.rotation.x = Math.PI / 2;
        b.position.set(sx * 0.24, 0.03, 0);
        customHatGroup.add(b);
        const h = new THREE.Mesh(hornGeo, hornMat);
        h.position.set(sx * 0.28, 0.2, 0.02);
        h.rotation.z = sx * -0.34;
        h.rotation.x = -0.18;
        customHatGroup.add(h);
      }
    } else if (hatId === 'cyberVisorCrown') {
      // Hovering Rotating Neon Cyan-Violet Holographic Crown
      const hover = new THREE.Group();
      hover.position.y = 0.26;
      customHatGroup.add(hover);
      hatHoverGroup = hover;
      hatHoverBaseY = 0.26;
      const orbit = new THREE.Group();
      hover.add(orbit);
      hatOrbitGroup = orbit;
      const cyanMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0x22d3ee,
          emissive: 0x06b6d4,
          emissiveIntensity: 2.4,
          roughness: 0.1,
        }),
      );
      const vioMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xe879f9,
          emissive: 0xc026d3,
          emissiveIntensity: 2.2,
          roughness: 0.1,
        }),
      );
      const ring = new THREE.Mesh(trackHatGeo(new THREE.TorusGeometry(0.24, 0.02, 10, 28)), cyanMat);
      ring.rotation.x = Math.PI / 2;
      orbit.add(ring);
      const shardGeo = trackHatGeo(new THREE.OctahedronGeometry(0.055, 0));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const shard = new THREE.Mesh(shardGeo, i % 2 === 0 ? cyanMat : vioMat);
        shard.scale.set(0.65, 1.85, 0.65);
        shard.position.set(Math.sin(a) * 0.24, 0.09, Math.cos(a) * 0.24);
        orbit.add(shard);
      }
    } else if (hatId === 'trafficCone') {
      // Hilarious slightly-tilted fluorescent orange Traffic Cone with white reflective bands!
      const coneGroup = new THREE.Group();
      coneGroup.rotation.z = -0.07;
      coneGroup.rotation.x = 0.05;
      customHatGroup.add(coneGroup);

      const rubberMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.88, metalness: 0.08 }),
      );
      const orangeMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.38, metalness: 0.08 }),
      );
      const reflectMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xf8fafc,
          emissive: 0xe2e8f0,
          emissiveIntensity: 0.35,
          roughness: 0.22,
          metalness: 0.3,
        }),
      );

      // Heavy black square rubber base
      const base = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.44, 0.045, 0.44)),
        rubberMat,
      );
      base.position.y = 0.022;
      base.castShadow = true;
      coneGroup.add(base);

      // Tall tapered orange cone body
      const body = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.048, 0.175, 0.52, 20)),
        orangeMat,
      );
      body.position.y = 0.29;
      body.castShadow = true;
      coneGroup.add(body);

      // Two crisp white reflective collar stripes
      const band1 = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.089, 0.112, 0.092, 20)),
        reflectMat,
      );
      band1.position.y = 0.36;
      coneGroup.add(band1);
      const band2 = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.128, 0.146, 0.068, 20)),
        reflectMat,
      );
      band2.position.y = 0.21;
      coneGroup.add(band2);
    } else if (hatId === 'taxiSign') {
      // Illuminated Classic Yellow Roof TAXI Sign with Checkered Side Trim
      const baseMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.45, metalness: 0.65 }),
      );
      const yellowGlowMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          emissive: 0xeab308,
          emissiveIntensity: 1.35,
          roughness: 0.22,
          metalness: 0.1,
        }),
      );
      const whiteMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4, metalness: 0.1 }),
      );
      hatCrownGemMats = [yellowGlowMat];

      // Magnetic black roof base mount
      const mount = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.54, 0.042, 0.22)),
        baseMat,
      );
      mount.position.y = 0.02;
      mount.castShadow = true;
      customHatGroup.add(mount);

      // Glowing trapezoidal yellow light dome
      const dome = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.11, 0.14, 0.48, 4)),
        yellowGlowMat,
      );
      dome.rotation.z = Math.PI * 0.5;
      dome.rotation.x = Math.PI * 0.25;
      dome.scale.set(1.0, 1.0, 0.85);
      dome.position.y = 0.115;
      dome.castShadow = true;
      customHatGroup.add(dome);

      // Black & white checkered trim + bold dark "TAXI" letter-blocks on front (-Z) & back (+Z)
      const checkerGeo = trackHatGeo(new THREE.BoxGeometry(0.052, 0.036, 0.014));
      for (const sz of [-1, 1]) {
        for (let i = 0; i < 8; i++) {
          const sq = new THREE.Mesh(checkerGeo, i % 2 === 0 ? baseMat : whiteMat);
          sq.position.set(-0.185 + i * 0.053, 0.052, sz * 0.098);
          customHatGroup.add(sq);
        }
        // Stylized black bar emblem representing TAXI badge
        const badge = new THREE.Mesh(
          trackHatGeo(new THREE.BoxGeometry(0.32, 0.055, 0.012)),
          baseMat,
        );
        badge.position.set(0, 0.125, sz * 0.088);
        customHatGroup.add(badge);
        for (const ox of [-0.105, -0.035, 0.035, 0.105]) {
          const letterPip = new THREE.Mesh(
            trackHatGeo(new THREE.BoxGeometry(0.042, 0.032, 0.016)),
            yellowGlowMat,
          );
          letterPip.position.set(ox, 0.125, sz * 0.089);
          customHatGroup.add(letterPip);
        }
      }
    } else if (hatId === 'sharkFinHat') {
      // Giant Sleek Great-White Shark Dorsal Fin slicing up from the roof (facing -Z)
      const sharkTopMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.42, metalness: 0.25 }),
      );
      const sharkBellyMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.55, metalness: 0.12 }),
      );

      const finShape = new THREE.Shape();
      finShape.moveTo(-0.34, 0);      // Front leading base (-Z after rotateY)
      finShape.quadraticCurveTo(-0.08, 0.36, 0.24, 0.48); // Sweeping leading edge to tip
      finShape.quadraticCurveTo(0.14, 0.3, 0.2, 0.24);    // Battle notch
      finShape.quadraticCurveTo(0.11, 0.14, 0.22, 0);     // Curved trailing edge
      finShape.closePath();

      const finGeo = trackHatGeo(
        new THREE.ExtrudeGeometry(finShape, {
          depth: 0.055,
          bevelEnabled: true,
          bevelThickness: 0.022,
          bevelSize: 0.018,
          bevelSegments: 4,
        }),
      );
      finGeo.translate(0, 0, -0.0275);
      // Orient shape's -X (leading edge) toward car's -Z (forward)
      finGeo.rotateY(-Math.PI * 0.5);
      const fin = new THREE.Mesh(finGeo, sharkTopMat);
      fin.position.set(0, -0.005, 0.02);
      fin.castShadow = true;
      customHatGroup.add(fin);

      // Subtle white-slate dorsal collar seam at roof base
      const collar = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.055, 0.095, 0.04, 14)),
        sharkBellyMat,
      );
      collar.scale.set(0.9, 1.0, 3.1);
      collar.position.set(0, 0.015, 0.02);
      customHatGroup.add(collar);
    } else if (hatId === 'pumpkinLantern') {
      // Glowing Carved Halloween Jack-o'-Lantern Pumpkin on the roof!
      const pumpkinMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.58, metalness: 0.06 }),
      );
      const pumpkinShadeMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.65, metalness: 0.05 }),
      );
      const stemMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.85, metalness: 0.05 }),
      );
      const candleGlowMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xfef08a,
          emissive: 0xf59e0b,
          emissiveIntensity: 2.3,
          roughness: 0.15,
        }),
      );
      hatCrownGemMats = [candleGlowMat];

      // 8 sculpted overlapping vertical pumpkin ribs for authentic gourd silhouette
      const ribGeo = trackHatGeo(new THREE.SphereGeometry(0.185, 14, 12));
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const rib = new THREE.Mesh(ribGeo, i % 2 === 0 ? pumpkinMat : pumpkinShadeMat);
        rib.scale.set(0.74, 0.88, 0.74);
        rib.position.set(Math.sin(a) * 0.125, 0.165, Math.cos(a) * 0.125);
        rib.castShadow = true;
        customHatGroup.add(rib);
      }

      // Twisted green pumpkin stem on top
      const stem = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.028, 0.048, 0.14, 8)),
        stemMat,
      );
      stem.position.set(0.01, 0.35, 0.01);
      stem.rotation.z = -0.24;
      stem.rotation.x = 0.15;
      customHatGroup.add(stem);

      // Glowing carved Jack-o'-Lantern face on BOTH front (-Z) & rear (+Z) so visible from chase & garage views!
      const eyeGeo = trackHatGeo(new THREE.ConeGeometry(0.052, 0.068, 3));
      const noseGeo = trackHatGeo(new THREE.ConeGeometry(0.03, 0.044, 3));
      for (const sz of [-1, 1]) {
        for (const sx of [-1, 1]) {
          const eye = new THREE.Mesh(eyeGeo, candleGlowMat);
          eye.position.set(sx * 0.088, 0.215, sz * 0.232);
          eye.rotation.y = sz > 0 ? 0 : Math.PI;
          eye.rotation.z = sx * -0.14;
          customHatGroup.add(eye);
        }
        const nose = new THREE.Mesh(noseGeo, candleGlowMat);
        nose.position.set(0, 0.162, sz * 0.242);
        nose.rotation.y = sz > 0 ? 0 : Math.PI;
        customHatGroup.add(nose);

        // Jagged glowing grin teeth
        for (let t = -2; t <= 2; t++) {
          const grinSeg = new THREE.Mesh(
            trackHatGeo(new THREE.BoxGeometry(0.04, t % 2 === 0 ? 0.044 : 0.026, 0.024)),
            candleGlowMat,
          );
          grinSeg.position.set(
            t * 0.044,
            0.095 + Math.abs(t) * 0.014,
            sz * (0.236 - Math.abs(t) * 0.016),
          );
          grinSeg.rotation.y = sz * t * -0.18;
          customHatGroup.add(grinSeg);
        }
      }
    } else if (hatId === 'headcrabHat') {
      // Full 3D Half-Life Headcrab clinging straight onto the car roof!
      const fleshMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xc99c72, roughness: 0.72, metalness: 0.06 }),
      );
      const mottleMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x9b5e42, roughness: 0.78, metalness: 0.08 }),
      );
      const mawMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x7f1d2d, roughness: 0.42, metalness: 0.12 }),
      );
      const clawMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x3b2316, roughness: 0.34, metalness: 0.24 }),
      );

      // Plump rounded fleshy Headcrab dome body hunched over the roof
      const body = new THREE.Mesh(
        trackHatGeo(new THREE.SphereGeometry(0.24, 18, 14)),
        fleshMat,
      );
      body.scale.set(1.12, 0.82, 1.24);
      body.position.set(0, 0.22, 0.01);
      body.castShadow = true;
      customHatGroup.add(body);

      // Organic mottled dorsal ridges & rear haunch lump
      for (const [rx, ry, rz, sx, sy, sz] of [
        [0, 0.34, 0.04, 0.18, 0.09, 0.22],
        [-0.13, 0.27, -0.05, 0.11, 0.1, 0.18],
        [0.13, 0.27, -0.05, 0.11, 0.1, 0.18],
      ]) {
        const lump = new THREE.Mesh(
          trackHatGeo(new THREE.SphereGeometry(1, 12, 10)),
          mottleMat,
        );
        lump.scale.set(sx, sy, sz);
        lump.position.set(rx, ry, rz);
        customHatGroup.add(lump);
      }

      // Crimson under-maw peeking beneath the belly
      const belly = new THREE.Mesh(
        trackHatGeo(new THREE.SphereGeometry(0.15, 12, 8)),
        mawMat,
      );
      belly.scale.set(1.0, 0.45, 1.05);
      belly.position.set(0, 0.08, -0.02);
      customHatGroup.add(belly);

      // 4 Chunky Articulated Crab Legs gripping onto the roof (2 big front pincers toward -Z, 2 rear legs toward +Z)
      const upperLegGeo = trackHatGeo(new THREE.CylinderGeometry(0.042, 0.056, 0.24, 9));
      const lowerClawGeo = trackHatGeo(new THREE.ConeGeometry(0.042, 0.26, 7));
      const legs = [
        // Front left & right long pincer legs reaching forward (-Z) and downward onto roof
        { sx: -1, zMul: -1, kx: -0.32, ky: 0.25, kz: -0.26, tx: -0.29, ty: 0.02, tz: -0.36 },
        { sx: 1, zMul: -1, kx: 0.32, ky: 0.25, kz: -0.26, tx: 0.29, ty: 0.02, tz: -0.36 },
        // Rear left & right bracing legs reaching backward (+Z) onto roof
        { sx: -1, zMul: 1, kx: -0.3, ky: 0.2, kz: 0.22, tx: -0.32, ty: 0.015, tz: 0.31 },
        { sx: 1, zMul: 1, kx: 0.3, ky: 0.2, kz: 0.22, tx: 0.32, ty: 0.015, tz: 0.31 },
      ];
      for (const leg of legs) {
        const start = new THREE.Vector3(leg.sx * 0.15, 0.2, leg.zMul * 0.09);
        const knee = new THREE.Vector3(leg.kx, leg.ky, leg.kz);
        const tip = new THREE.Vector3(leg.tx, leg.ty, leg.tz);

        const seg1Dir = knee.clone().sub(start);
        const seg1 = new THREE.Mesh(upperLegGeo, leg.zMul < 0 ? fleshMat : mottleMat);
        seg1.position.copy(start).addScaledVector(seg1Dir, 0.5);
        seg1.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), seg1Dir.clone().normalize());
        seg1.castShadow = true;
        customHatGroup.add(seg1);

        const joint = new THREE.Mesh(
          trackHatGeo(new THREE.SphereGeometry(0.052, 8, 8)),
          mottleMat,
        );
        joint.position.copy(knee);
        customHatGroup.add(joint);

        const seg2Dir = tip.clone().sub(knee);
        const seg2 = new THREE.Mesh(lowerClawGeo, clawMat);
        seg2.position.copy(knee).addScaledVector(seg2Dir, 0.5);
        seg2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), seg2Dir.clone().normalize());
        seg2.castShadow = true;
        customHatGroup.add(seg2);
      }
    } else if (hatId === 'pharaohNemes') {
      // Regal Ancient Egyptian Pharaoh Nemes Headdress (Gold & Lapis Stripes + Royal Cobra Uraeus!)
      const goldMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.24, metalness: 0.88 }),
      );
      const lapisMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.35, metalness: 0.42 }),
      );
      const turqGlowMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0x22d3ee,
          emissive: 0x06b6d4,
          emissiveIntensity: 1.9,
          roughness: 0.14,
        }),
      );
      hatCrownGemMats = [turqGlowMat];

      // Rounded golden-striped crown dome
      const dome = new THREE.Mesh(
        trackHatGeo(new THREE.SphereGeometry(0.27, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.56)),
        goldMat,
      );
      dome.scale.set(1.06, 1.02, 1.15);
      dome.position.y = 0.05;
      dome.castShadow = true;
      customHatGroup.add(dome);

      // Alternating Lapis Blue & Gold Nemes fan wings flaring out on both sides!
      for (const sx of [-1, 1]) {
        const wing = new THREE.Mesh(
          trackHatGeo(new THREE.BoxGeometry(0.18, 0.3, 0.34)),
          goldMat,
        );
        wing.position.set(sx * 0.28, 0.16, 0.03);
        wing.rotation.z = sx * 0.32;
        wing.castShadow = true;
        customHatGroup.add(wing);

        // Horizontal lapis stripes across the sweeping Nemes side wings
        for (let s = 0; s < 5; s++) {
          const stripe = new THREE.Mesh(
            trackHatGeo(new THREE.BoxGeometry(0.195, 0.026, 0.355)),
            lapisMat,
          );
          stripe.position.set(sx * (0.25 + s * 0.015), 0.05 + s * 0.054, 0.03);
          stripe.rotation.z = sx * 0.32;
          customHatGroup.add(stripe);
        }
      }

      // Golden forehead headband + Royal Cobra (Uraeus) crest rising at front (-Z)
      const band = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.285, 0.295, 0.058, 24)),
        lapisMat,
      );
      band.position.y = 0.075;
      customHatGroup.add(band);

      const cobraNeck = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.026, 0.034, 0.17, 10)),
        goldMat,
      );
      cobraNeck.position.set(0, 0.19, -0.29);
      cobraNeck.rotation.x = 0.18;
      customHatGroup.add(cobraNeck);

      const cobraHood = new THREE.Mesh(
        trackHatGeo(new THREE.SphereGeometry(0.068, 12, 10)),
        goldMat,
      );
      cobraHood.scale.set(1.1, 1.3, 0.45);
      cobraHood.position.set(0, 0.26, -0.275);
      customHatGroup.add(cobraHood);

      // Glowing turquoise scarab jewel on cobra hood
      const scarab = new THREE.Mesh(
        trackHatGeo(new THREE.OctahedronGeometry(0.038, 0)),
        turqGlowMat,
      );
      scarab.scale.set(0.85, 1.25, 0.6);
      scarab.position.set(0, 0.25, -0.308);
      customHatGroup.add(scarab);
    } else if (hatId === 'companionCube') {
      // Portal Weighted Companion Cube — Hovering gently above the roof with glowing 3D Pink Hearts!
      const hover = new THREE.Group();
      hover.position.y = 0.28;
      customHatGroup.add(hover);
      hatHoverGroup = hover;
      hatHoverBaseY = 0.28;

      const cubeSpin = new THREE.Group();
      hover.add(cubeSpin);
      hatOrbitGroup = cubeSpin;

      const shellGreyMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xdbe2ec, roughness: 0.34, metalness: 0.42 }),
      );
      const innerDarkMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x272d38, roughness: 0.48, metalness: 0.72 }),
      );
      const heartPinkMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xf472b6,
          emissive: 0xec4899,
          emissiveIntensity: 2.1,
          roughness: 0.16,
        }),
      );
      hatCrownGemMats = [heartPinkMat];

      // Dark metallic Aperture inner cube core
      const core = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.32, 0.32, 0.32)),
        innerDarkMat,
      );
      core.castShadow = true;
      cubeSpin.add(core);

      // Glowing pink cross-channel strips around all 3 axes
      for (const rot of [
        [0, 0, 0],
        [Math.PI * 0.5, 0, 0],
        [0, 0, Math.PI * 0.5],
      ]) {
        const strip = new THREE.Mesh(
          trackHatGeo(new THREE.BoxGeometry(0.334, 0.042, 0.334)),
          heartPinkMat,
        );
        strip.rotation.set(rot[0], rot[1], rot[2]);
        cubeSpin.add(strip);
      }

      // 8 Iconic Heavy Aperture Light-Grey Corner Bumper Blocks
      const cornerGeo = trackHatGeo(new THREE.BoxGeometry(0.135, 0.135, 0.135));
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          for (const sz of [-1, 1]) {
            const corner = new THREE.Mesh(cornerGeo, shellGreyMat);
            corner.position.set(sx * 0.115, sy * 0.115, sz * 0.115);
            cubeSpin.add(corner);
          }
        }
      }

      // Raised White Circular Medallions + Sculpted Glowing Pink Hearts on all 4 side faces + top!
      const discGeo = trackHatGeo(new THREE.CylinderGeometry(0.088, 0.088, 0.022, 20));
      const heartLobeGeo = trackHatGeo(new THREE.SphereGeometry(0.028, 10, 10));
      const heartTipGeo = trackHatGeo(new THREE.ConeGeometry(0.042, 0.062, 4));
      const faceConfigs: { pos: [number, number, number]; rot: [number, number, number] }[] = [
        { pos: [0, 0, 0.166], rot: [Math.PI * 0.5, 0, 0] },
        { pos: [0, 0, -0.166], rot: [-Math.PI * 0.5, 0, 0] },
        { pos: [0.166, 0, 0], rot: [0, 0, -Math.PI * 0.5] },
        { pos: [-0.166, 0, 0], rot: [0, 0, Math.PI * 0.5] },
        { pos: [0, 0.166, 0], rot: [0, 0, 0] },
      ];
      for (const fc of faceConfigs) {
        const fg = new THREE.Group();
        fg.position.set(fc.pos[0], fc.pos[1], fc.pos[2]);
        fg.rotation.set(fc.rot[0], fc.rot[1], fc.rot[2]);
        const disc = new THREE.Mesh(discGeo, shellGreyMat);
        fg.add(disc);
        // 3D Pink Heart resting flat on top of the circular disc (+Y in disc local space)
        for (const hx of [-0.02, 0.02]) {
          const lobe = new THREE.Mesh(heartLobeGeo, heartPinkMat);
          lobe.scale.set(1.0, 0.45, 1.0);
          lobe.position.set(hx, 0.015, -0.012);
          fg.add(lobe);
        }
        const hTip = new THREE.Mesh(heartTipGeo, heartPinkMat);
        hTip.rotation.x = Math.PI * 0.5;
        hTip.rotation.y = Math.PI * 0.25;
        hTip.scale.set(1.0, 1.0, 0.42);
        hTip.position.set(0, 0.015, 0.016);
        fg.add(hTip);
        cubeSpin.add(fg);
      }
    } else if (hatId === 'diamondHelmet') {
      // Iconic Minecraft Enchanted Voxel Diamond Helmet + Orbiting Enchantment Cubes!
      const diaBrightMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0x38e8ff,
          emissive: 0x06b6d4,
          emissiveIntensity: 0.75,
          roughness: 0.18,
          metalness: 0.48,
        }),
      );
      const diaDeepMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0x0891b2,
          emissive: 0x7c3aed,
          emissiveIntensity: 0.45,
          roughness: 0.24,
          metalness: 0.55,
        }),
      );
      const enchantGlowMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xe879f9,
          emissive: 0xa855f7,
          emissiveIntensity: 2.2,
          roughness: 0.12,
        }),
      );
      hatCrownGemMats = [diaBrightMat, enchantGlowMat];

      // Blocky hollow-front Minecraft Diamond Helmet shell (facing -Z)
      // Top helmet crown cap
      const topCap = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.46, 0.11, 0.46)),
        diaBrightMat,
      );
      topCap.position.y = 0.34;
      topCap.castShadow = true;
      customHatGroup.add(topCap);

      // Left, Right & Back helmet armor walls
      for (const sx of [-1, 1]) {
        const sideWall = new THREE.Mesh(
          trackHatGeo(new THREE.BoxGeometry(0.085, 0.32, 0.46)),
          diaDeepMat,
        );
        sideWall.position.set(sx * 0.19, 0.16, 0);
        sideWall.castShadow = true;
        customHatGroup.add(sideWall);
      }
      const backWall = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.46, 0.32, 0.085)),
        diaDeepMat,
      );
      backWall.position.set(0, 0.16, 0.19);
      backWall.castShadow = true;
      customHatGroup.add(backWall);

      // Iconic Minecraft Helmet Front Brow + Center Nose-Guard Pixel (facing -Z)
      const brow = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.46, 0.11, 0.085)),
        diaBrightMat,
      );
      brow.position.set(0, 0.27, -0.19);
      customHatGroup.add(brow);
      const noseGuard = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.1, 0.12, 0.088)),
        diaBrightMat,
      );
      noseGuard.position.set(0, 0.16, -0.195);
      customHatGroup.add(noseGuard);

      // Inner dark voxel shadow lining inside helmet face opening
      const innerShadow = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.32, 0.27, 0.32)),
        trackHatMat(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 })),
      );
      innerShadow.position.set(0, 0.14, 0.01);
      customHatGroup.add(innerShadow);

      // Top raised pixel highlight ridge
      const crest = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.14, 0.045, 0.36)),
        enchantGlowMat,
      );
      crest.position.set(0, 0.41, 0);
      customHatGroup.add(crest);

      // Orbiting mini glowing enchantment voxel cubes around the helmet!
      const orbit = new THREE.Group();
      orbit.position.y = 0.26;
      customHatGroup.add(orbit);
      hatOrbitGroup = orbit;
      const miniCubeGeo = trackHatGeo(new THREE.BoxGeometry(0.055, 0.055, 0.055));
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const mc = new THREE.Mesh(miniCubeGeo, i % 2 === 0 ? enchantGlowMat : diaBrightMat);
        mc.position.set(Math.sin(a) * 0.38, (i % 2 === 0 ? 0.08 : -0.05), Math.cos(a) * 0.38);
        mc.rotation.set(0.5, a, 0.4);
        orbit.add(mc);
      }
    } else if (hatId === 'rubberDuck') {
      // Adorable Glossy Yellow Bath-Time Rubber Duck facing forward (-Z)!
      const duckYellowMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.24, metalness: 0.06 }),
      );
      const duckBillMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.32, metalness: 0.05 }),
      );
      const eyeMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.12, metalness: 0.4 }),
      );
      const glintMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 }),
      );

      // Plump rounded duck body
      const body = new THREE.Mesh(
        trackHatGeo(new THREE.SphereGeometry(0.21, 18, 14)),
        duckYellowMat,
      );
      body.scale.set(0.96, 0.78, 1.32);
      body.position.set(0, 0.14, 0.03);
      body.castShadow = true;
      customHatGroup.add(body);

      // Cute upturned tail nub at rear (+Z)
      const tail = new THREE.Mesh(
        trackHatGeo(new THREE.ConeGeometry(0.08, 0.16, 10)),
        duckYellowMat,
      );
      tail.position.set(0, 0.23, 0.28);
      tail.rotation.x = 0.72;
      customHatGroup.add(tail);

      // Tucked side wings
      for (const sx of [-1, 1]) {
        const wing = new THREE.Mesh(
          trackHatGeo(new THREE.SphereGeometry(0.11, 12, 10)),
          duckYellowMat,
        );
        wing.scale.set(0.45, 0.72, 1.35);
        wing.position.set(sx * 0.195, 0.15, 0.04);
        wing.rotation.z = sx * -0.15;
        customHatGroup.add(wing);
      }

      // Rounded duck head up front (-Z)
      const head = new THREE.Mesh(
        trackHatGeo(new THREE.SphereGeometry(0.145, 16, 14)),
        duckYellowMat,
      );
      head.position.set(0, 0.33, -0.13);
      head.castShadow = true;
      customHatGroup.add(head);

      // Flat cute orange duck bill protruding forward (-Z)
      const bill = new THREE.Mesh(
        trackHatGeo(new THREE.SphereGeometry(0.082, 14, 10)),
        duckBillMat,
      );
      bill.scale.set(1.15, 0.44, 1.28);
      bill.position.set(0, 0.305, -0.285);
      customHatGroup.add(bill);

      // Glossy black eyes with tiny white highlight
      for (const sx of [-1, 1]) {
        const eye = new THREE.Mesh(
          trackHatGeo(new THREE.SphereGeometry(0.024, 10, 10)),
          eyeMat,
        );
        eye.position.set(sx * 0.085, 0.365, -0.232);
        customHatGroup.add(eye);
        const glint = new THREE.Mesh(
          trackHatGeo(new THREE.SphereGeometry(0.008, 6, 6)),
          glintMat,
        );
        glint.position.set(sx * 0.092, 0.374, -0.252);
        customHatGroup.add(glint);
      }
    } else if (hatId === 'hardHat') {
      // Classic Construction Yellow Safety Hard Hat with Central Rib, Front Brim & Forehead Headlamp
      const safetyYellowMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.24, metalness: 0.12 }),
      );
      const darkTrimMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.55, metalness: 0.45 }),
      );
      const lampLensMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xfef9c3,
          emissive: 0xfde047,
          emissiveIntensity: 1.8,
          roughness: 0.12,
        }),
      );

      // Sturdy dome shell
      const dome = new THREE.Mesh(
        trackHatGeo(new THREE.SphereGeometry(0.31, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.54)),
        safetyYellowMat,
      );
      dome.scale.set(0.98, 0.92, 1.08);
      dome.position.y = 0.02;
      dome.castShadow = true;
      customHatGroup.add(dome);

      // Raised center reinforcement ridge running front-to-back
      const centerRib = new THREE.Mesh(
        trackHatGeo(new THREE.TorusGeometry(0.295, 0.036, 10, 22, Math.PI * 0.84)),
        safetyYellowMat,
      );
      centerRib.rotation.y = Math.PI * 0.5;
      centerRib.rotation.z = Math.PI * 0.08;
      centerRib.position.y = 0.03;
      customHatGroup.add(centerRib);

      // Lower rolled perimeter rain-channel brim + extended front visor (-Z)
      const rim = new THREE.Mesh(
        trackHatGeo(new THREE.TorusGeometry(0.325, 0.026, 8, 28)),
        safetyYellowMat,
      );
      rim.rotation.x = Math.PI * 0.5;
      rim.scale.set(1.0, 1.12, 1.0);
      rim.position.y = 0.03;
      customHatGroup.add(rim);

      const frontBill = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.24, 0.28, 0.024, 16, 1, false, -Math.PI * 0.38, Math.PI * 0.76)),
        safetyYellowMat,
      );
      frontBill.rotation.y = Math.PI;
      frontBill.position.set(0, 0.034, -0.18);
      customHatGroup.add(frontBill);

      // Clip-on black elastic strap & forehead construction headlamp (-Z)
      const strap = new THREE.Mesh(
        trackHatGeo(new THREE.TorusGeometry(0.318, 0.014, 6, 26)),
        darkTrimMat,
      );
      strap.rotation.x = Math.PI * 0.5;
      strap.scale.set(1.0, 1.08, 1.0);
      strap.position.y = 0.1;
      customHatGroup.add(strap);

      const lampBody = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.12, 0.072, 0.06)),
        darkTrimMat,
      );
      lampBody.position.set(0, 0.135, -0.34);
      customHatGroup.add(lampBody);
      const lampLens = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.028, 0.028, 0.012, 14)),
        lampLensMat,
      );
      lampLens.rotation.x = Math.PI * 0.5;
      lampLens.position.set(0, 0.135, -0.372);
      customHatGroup.add(lampLens);
    } else if (hatId === 'sushiRoll') {
      // Giant Mouthwatering Salmon Nigiri Sushi with Nori Belt & Wasabi Dab!
      const riceMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.92, metalness: 0.02 }),
      );
      const salmonMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.34, metalness: 0.08 }),
      );
      const fatStripeMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xffedd5, roughness: 0.42, metalness: 0.04 }),
      );
      const noriMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x0f291e, roughness: 0.85, metalness: 0.06 }),
      );
      const wasabiMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.78, metalness: 0.04 }),
      );

      // Plump shaped sushi rice pillow
      const rice = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.34, 0.16, 0.56)),
        riceMat,
      );
      rice.position.y = 0.085;
      rice.castShadow = true;
      customHatGroup.add(rice);
      for (const sz of [-0.26, 0.26]) {
        const endCap = new THREE.Mesh(
          trackHatGeo(new THREE.CylinderGeometry(0.08, 0.08, 0.34, 12)),
          riceMat,
        );
        endCap.rotation.z = Math.PI * 0.5;
        endCap.position.set(0, 0.085, sz);
        customHatGroup.add(endCap);
      }

      // Glossy fresh orange salmon slice draped over the rice
      const salmon = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.39, 0.075, 0.68)),
        salmonMat,
      );
      salmon.position.y = 0.195;
      salmon.castShadow = true;
      customHatGroup.add(salmon);

      // Crisp white salmon marbling diagonal lines
      for (let i = -2; i <= 2; i++) {
        const marble = new THREE.Mesh(
          trackHatGeo(new THREE.BoxGeometry(0.4, 0.016, 0.022)),
          fatStripeMat,
        );
        marble.position.set(0, 0.23, i * 0.115);
        marble.rotation.y = 0.28;
        customHatGroup.add(marble);
      }

      // Dark green-black Nori seaweed belt wrapping tightly around the middle
      const nori = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.41, 0.245, 0.14)),
        noriMat,
      );
      nori.position.y = 0.125;
      customHatGroup.add(nori);

      // Cute bright green wasabi dab on top
      const wasabi = new THREE.Mesh(
        trackHatGeo(new THREE.ConeGeometry(0.048, 0.065, 8)),
        wasabiMat,
      );
      wasabi.position.set(0.04, 0.265, -0.02);
      customHatGroup.add(wasabi);
    } else if (hatId === 'graduationCap') {
      // Classic Matte-Black Academic Mortarboard Graduation Cap + Dynamic Wind-Swinging Golden Tassel!
      const capBlackMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.78, metalness: 0.08 }),
      );
      const goldTasselMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.34, metalness: 0.76 }),
      );

      // Fitted skull cap base
      const skull = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.24, 0.28, 0.17, 22)),
        capBlackMat,
      );
      skull.position.y = 0.085;
      skull.castShadow = true;
      customHatGroup.add(skull);

      // Iconic diamond-oriented flat square mortarboard
      const board = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.56, 0.026, 0.56)),
        capBlackMat,
      );
      board.position.y = 0.185;
      board.rotation.y = Math.PI * 0.25;
      board.rotation.x = 0.05;
      board.castShadow = true;
      customHatGroup.add(board);

      // Center button + golden cord running to right edge
      const btn = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.032, 0.032, 0.024, 14)),
        goldTasselMat,
      );
      btn.position.y = 0.205;
      customHatGroup.add(btn);

      const cord = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.32, 0.012, 0.012)),
        goldTasselMat,
      );
      cord.position.set(0.16, 0.206, 0);
      customHatGroup.add(cord);

      // Wind-reactive hanging golden tassel (reuses hatFezTasselPivot for lively drive physics!)
      const tasselPivot = new THREE.Group();
      tasselPivot.position.set(0.33, 0.202, 0);
      customHatGroup.add(tasselPivot);
      hatFezTasselPivot = tasselPivot;

      const dropCord = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.008, 0.008, 0.14, 6)),
        goldTasselMat,
      );
      dropCord.position.y = -0.07;
      tasselPivot.add(dropCord);
      const tasselBrush = new THREE.Mesh(
        trackHatGeo(new THREE.ConeGeometry(0.038, 0.11, 10)),
        goldTasselMat,
      );
      tasselBrush.position.y = -0.17;
      tasselPivot.add(tasselBrush);
    } else if (hatId === 'knightHelmet') {
      // Medieval Crusader Steel Great Helm with Brass Cross Face-Guard & Sweeping Crimson Plume!
      const steelMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xb8c2cc, roughness: 0.22, metalness: 0.88 }),
      );
      const brassMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.28, metalness: 0.85 }),
      );
      const visorSlitMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.85, metalness: 0.2 }),
      );
      const plumeMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.65, metalness: 0.08 }),
      );

      // Cylindrical flat-top steel Crusader Great Helm
      const helm = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.24, 0.265, 0.4, 20)),
        steelMat,
      );
      helm.position.y = 0.2;
      helm.castShadow = true;
      customHatGroup.add(helm);

      // Slightly domed top crown plate
      const topPlate = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.21, 0.242, 0.055, 20)),
        steelMat,
      );
      topPlate.position.y = 0.42;
      customHatGroup.add(topPlate);

      // Recessed black visor eye-slit facing forward (-Z)
      const eyeSlit = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.32, 0.042, 0.04)),
        visorSlitMat,
      );
      eyeSlit.position.set(0, 0.26, -0.242);
      customHatGroup.add(eyeSlit);

      // Iconic Golden Brass Crusader Cross riveted to front face (-Z)
      const crossV = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.046, 0.34, 0.036)),
        brassMat,
      );
      crossV.position.set(0, 0.21, -0.252);
      customHatGroup.add(crossV);
      const crossH = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.38, 0.042, 0.036)),
        brassMat,
      );
      crossH.position.set(0, 0.26, -0.248);
      customHatGroup.add(crossH);

      // Dramatic Crimson Horsehair Plume arching from crown back toward +Z!
      const plumeMount = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.038, 0.05, 0.08, 10)),
        brassMat,
      );
      plumeMount.position.set(0, 0.47, 0);
      customHatGroup.add(plumeMount);
      for (let i = 0; i < 6; i++) {
        const tuft = new THREE.Mesh(
          trackHatGeo(new THREE.SphereGeometry(0.068 - i * 0.004, 10, 8)),
          plumeMat,
        );
        tuft.scale.set(0.62, 1.0, 1.35);
        tuft.position.set(0, 0.54 - i * 0.038, -0.02 + i * 0.075);
        tuft.castShadow = true;
        customHatGroup.add(tuft);
      }
    } else if (hatId === 'catEars') {
      // Sleek Carbon Gaming Headset Band with Oversized Glowing Neon Pink Cat Ears!
      const carbonMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.32, metalness: 0.65 }),
      );
      const pinkGlowMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xf472b6,
          emissive: 0xec4899,
          emissiveIntensity: 2.3,
          roughness: 0.14,
        }),
      );
      hatCrownGemMats = [pinkGlowMat];

      // Low-profile curved headset band hugging the roof
      const band = new THREE.Mesh(
        trackHatGeo(new THREE.TorusGeometry(0.36, 0.036, 10, 26, Math.PI * 0.72)),
        carbonMat,
      );
      band.rotation.z = Math.PI * 0.14;
      band.position.y = -0.14;
      customHatGroup.add(band);

      // Twin oversized sharp triangular Cat Ears + glowing inner neon pink inserts
      const outerEarGeo = trackHatGeo(new THREE.ConeGeometry(0.155, 0.34, 3));
      const innerEarGeo = trackHatGeo(new THREE.ConeGeometry(0.095, 0.23, 3));
      for (const sx of [-1, 1]) {
        const earGrp = new THREE.Group();
        earGrp.position.set(sx * 0.25, 0.24, 0);
        earGrp.rotation.z = sx * -0.26;
        earGrp.rotation.y = sx * 0.15;
        customHatGroup.add(earGrp);

        const outer = new THREE.Mesh(outerEarGeo, carbonMat);
        outer.scale.set(1.0, 1.0, 0.48);
        outer.castShadow = true;
        earGrp.add(outer);

        // Glowing neon pink inner ear facing BOTH front (-Z) & rear (+Z) so visible in garage & chase cam!
        for (const sz of [-1, 1]) {
          const inner = new THREE.Mesh(innerEarGeo, pinkGlowMat);
          inner.scale.set(1.0, 1.0, 0.32);
          inner.position.set(0, -0.025, sz * 0.036);
          earGrp.add(inner);
        }
      }
    } else if (hatId === 'ramenBowl') {
      // Steaming Traditional Japanese Ramen Bowl with Noodles, Egg, Narutomaki & Chopsticks!
      const bowlBlackMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.24, metalness: 0.35 }),
      );
      const bowlRedMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.26, metalness: 0.25 }),
      );
      const brothMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.18, metalness: 0.12 }),
      );
      const noodleMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.65, metalness: 0.04 }),
      );
      const eggWhiteMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 }),
      );
      const eggYolkMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25 }),
      );
      const narutoPinkMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.4 }),
      );
      const chopstickMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.6 }),
      );
      const steamMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0xe2e8f0,
          emissiveIntensity: 0.65,
          transparent: true,
          opacity: 0.62,
          roughness: 0.8,
        }),
      );

      // Lacquered footed ramen bowl
      const foot = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.14, 0.15, 0.045, 20)),
        bowlBlackMat,
      );
      foot.position.y = 0.022;
      customHatGroup.add(foot);

      const bowlOuter = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.32, 0.16, 0.22, 24)),
        bowlBlackMat,
      );
      bowlOuter.position.y = 0.15;
      bowlOuter.castShadow = true;
      customHatGroup.add(bowlOuter);

      // Red lacquer lip band
      const lip = new THREE.Mesh(
        trackHatGeo(new THREE.TorusGeometry(0.315, 0.018, 8, 24)),
        bowlRedMat,
      );
      lip.rotation.x = Math.PI * 0.5;
      lip.position.y = 0.255;
      customHatGroup.add(lip);

      // Golden ramen broth surface
      const broth = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.295, 0.295, 0.02, 22)),
        brothMat,
      );
      broth.position.y = 0.24;
      customHatGroup.add(broth);

      // Mound of wavy yellow ramen noodles
      for (let i = 0; i < 4; i++) {
        const noodleRing = new THREE.Mesh(
          trackHatGeo(new THREE.TorusGeometry(0.11 + (i % 2) * 0.04, 0.024, 6, 14)),
          noodleMat,
        );
        noodleRing.rotation.x = Math.PI * 0.5 + (i - 1.5) * 0.08;
        noodleRing.position.set((i % 2 === 0 ? -0.05 : 0.05), 0.255, (i < 2 ? -0.04 : 0.04));
        customHatGroup.add(noodleRing);
      }

      // Half soft-boiled ramen egg + pink narutomaki fish cake
      const eggW = new THREE.Mesh(
        trackHatGeo(new THREE.SphereGeometry(0.075, 12, 10)),
        eggWhiteMat,
      );
      eggW.scale.set(1.0, 0.35, 1.25);
      eggW.position.set(-0.11, 0.265, -0.08);
      customHatGroup.add(eggW);
      const eggY = new THREE.Mesh(
        trackHatGeo(new THREE.SphereGeometry(0.042, 10, 8)),
        eggYolkMat,
      );
      eggY.scale.set(1.0, 0.45, 1.0);
      eggY.position.set(-0.11, 0.278, -0.08);
      customHatGroup.add(eggY);

      const naruto = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.068, 0.068, 0.024, 14)),
        eggWhiteMat,
      );
      naruto.position.set(0.12, 0.268, 0.07);
      customHatGroup.add(naruto);
      const swirl = new THREE.Mesh(
        trackHatGeo(new THREE.TorusGeometry(0.035, 0.011, 6, 14)),
        narutoPinkMat,
      );
      swirl.rotation.x = Math.PI * 0.5;
      swirl.position.set(0.12, 0.282, 0.07);
      customHatGroup.add(swirl);

      // Pair of wooden chopsticks resting diagonally across the bowl rim
      const stickGeo = trackHatGeo(new THREE.CylinderGeometry(0.008, 0.015, 0.72, 8));
      for (const offset of [-0.022, 0.022]) {
        const stick = new THREE.Mesh(stickGeo, chopstickMat);
        stick.rotation.z = Math.PI * 0.5;
        stick.rotation.y = 0.28 + offset * 1.4;
        stick.position.set(0.04, 0.295, -0.14 + offset);
        customHatGroup.add(stick);
      }

      // Gently floating rising steam puffs above the hot ramen!
      const steamGrp = new THREE.Group();
      steamGrp.position.y = 0.39;
      customHatGroup.add(steamGrp);
      hatHoverGroup = steamGrp;
      hatHoverBaseY = 0.39;
      for (const [sx, sy, sz, sr] of [
        [-0.08, 0.0, 0.02, 0.055],
        [0.06, 0.07, -0.05, 0.068],
        [-0.02, 0.14, 0.04, 0.048],
      ]) {
        const puff = new THREE.Mesh(trackHatGeo(new THREE.SphereGeometry(sr, 10, 8)), steamMat);
        puff.position.set(sx, sy, sz);
        steamGrp.add(puff);
      }
    } else if (hatId === 'creeperHead') {
      // Iconic Minecraft Pixelated Creeper Head Cube with Mottled Green Pixels & Classic Black Face!
      const creepLightMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0x4ade80,
          emissive: 0x22c55e,
          emissiveIntensity: 0.45,
          roughness: 0.78,
        }),
      );
      const creepMidMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.82 }),
      );
      const creepDarkMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.86 }),
      );
      const creepBlackMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.9 }),
      );
      hatCrownGemMats = [creepLightMat];

      // Main 0.38m Minecraft Creeper Head Block
      const headCube = new THREE.Mesh(
        trackHatGeo(new THREE.BoxGeometry(0.38, 0.38, 0.38)),
        creepMidMat,
      );
      headCube.position.y = 0.195;
      headCube.castShadow = true;
      customHatGroup.add(headCube);

      // Mottled pixel mosaic patches on sides & top for authentic 8x8 Minecraft texture feel
      const px = 0.0475; // 0.38 / 8
      const patchGeo = trackHatGeo(new THREE.BoxGeometry(px * 1.02, px * 1.02, 0.01));
      const sidePatches: [number, number, boolean][] = [
        [-2.5, 2.5, true], [1.5, 2.5, false], [-1.5, 0.5, false], [2.5, 0.5, true],
        [-2.5, -1.5, false], [0.5, -2.5, true], [2.5, -2.5, false],
      ];
      for (const sx of [-1, 1]) {
        for (const [pz, py, light] of sidePatches) {
          const p = new THREE.Mesh(patchGeo, light ? creepLightMat : creepDarkMat);
          p.rotation.y = Math.PI * 0.5;
          p.position.set(sx * 0.193, 0.195 + py * px, pz * px);
          customHatGroup.add(p);
        }
      }
      // Top pixel patches
      for (const [gx, gz, light] of [
        [-2, -2, true], [1, -1, false], [-1, 2, false], [2, 1, true], [0, 0, true],
      ] as [number, number, boolean][]) {
        const tp = new THREE.Mesh(
          trackHatGeo(new THREE.BoxGeometry(px * 1.4, 0.01, px * 1.4)),
          light ? creepLightMat : creepDarkMat,
        );
        tp.position.set(gx * px, 0.388, gz * px);
        customHatGroup.add(tp);
      }

      // Iconic Pixelated Pitch-Black Creeper Face on BOTH front (-Z) & rear (+Z) so awesome in garage & chase cam!
      const facePxGeo = trackHatGeo(new THREE.BoxGeometry(px, px, 0.016));
      // 8x8 grid centered around 0: x in {-3.5..3.5}, y in {-3.5..3.5}
      const faceBlocks: [number, number][] = [
        // Left eye (2x2)
        [-2.5, 1.5], [-1.5, 1.5], [-2.5, 0.5], [-1.5, 0.5],
        // Right eye (2x2)
        [1.5, 1.5], [2.5, 1.5], [1.5, 0.5], [2.5, 0.5],
        // Nose bridge (2x1)
        [-0.5, -0.5], [0.5, -0.5],
        // Upper mouth bar (4x2)
        [-1.5, -1.5], [-0.5, -1.5], [0.5, -1.5], [1.5, -1.5],
        [-1.5, -2.5], [-0.5, -2.5], [0.5, -2.5], [1.5, -2.5],
        // Lower frown corners (2x1 each side)
        [-1.5, -3.5], [1.5, -3.5],
      ];
      for (const sz of [-1, 1]) {
        for (const [fx, fy] of faceBlocks) {
          const cell = new THREE.Mesh(facePxGeo, creepBlackMat);
          cell.position.set(fx * px, 0.195 + fy * px, sz * 0.192);
          customHatGroup.add(cell);
        }
      }
    } else if (hatId === 'miniHeliRotor') {
      // Tactical Roof Helicopter Rotor Mast — Spins wildly faster as car speed climbs!
      const metalDarkMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.38, metalness: 0.82 }),
      );
      const bladeCarbonMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.28, metalness: 0.65 }),
      );
      const tipYellowMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35, metalness: 0.25 }),
      );
      const beaconRedMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xef4444,
          emissive: 0xdc2626,
          emissiveIntensity: 2.5,
          roughness: 0.12,
        }),
      );
      hatCrownGemMats = [beaconRedMat];

      // Armored circular base plate + vertical steel rotor mast
      const mountBase = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.16, 0.22, 0.06, 18)),
        metalDarkMat,
      );
      mountBase.position.y = 0.03;
      customHatGroup.add(mountBase);

      const mast = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.042, 0.056, 0.26, 12)),
        metalDarkMat,
      );
      mast.position.y = 0.16;
      mast.castShadow = true;
      customHatGroup.add(mast);

      // High-speed rotating dual-blade Helicopter Rotor Assembly!
      const rotorGrp = new THREE.Group();
      rotorGrp.position.y = 0.295;
      customHatGroup.add(rotorGrp);
      hatPropellerGroup = rotorGrp;

      const hubCap = new THREE.Mesh(
        trackHatGeo(new THREE.CylinderGeometry(0.075, 0.085, 0.06, 16)),
        metalDarkMat,
      );
      rotorGrp.add(hubCap);

      // 4 Long Sweeping Carbon Rotor Blades with Yellow Caution Tips!
      for (let i = 0; i < 4; i++) {
        const bladeHolder = new THREE.Group();
        bladeHolder.rotation.y = (i / 4) * Math.PI * 2;
        const blade = new THREE.Mesh(
          trackHatGeo(new THREE.BoxGeometry(0.66, 0.014, 0.082)),
          bladeCarbonMat,
        );
        blade.position.set(0.36, 0, 0);
        blade.rotation.x = 0.12;
        blade.castShadow = true;
        bladeHolder.add(blade);
        const tip = new THREE.Mesh(
          trackHatGeo(new THREE.BoxGeometry(0.085, 0.016, 0.084)),
          tipYellowMat,
        );
        tip.position.set(0.68, 0, 0);
        tip.rotation.x = 0.12;
        bladeHolder.add(tip);
        rotorGrp.add(bladeHolder);
      }

      // Red aviation warning beacon dome right atop the rotor hub
      const beacon = new THREE.Mesh(
        trackHatGeo(new THREE.SphereGeometry(0.042, 12, 10)),
        beaconRedMat,
      );
      beacon.position.y = 0.05;
      rotorGrp.add(beacon);
    } else if (hatId === 'blackHoleOrb') {
      // Hovering Singularity / Black Hole with Blazing Molten-Violet Accretion Disk & Orbiting Shards!
      const hover = new THREE.Group();
      hover.position.y = 0.34;
      customHatGroup.add(hover);
      hatHoverGroup = hover;
      hatHoverBaseY = 0.34;

      const voidBlackMat = trackHatMat(
        new THREE.MeshStandardMaterial({ color: 0x020205, roughness: 0.06, metalness: 0.95 }),
      );
      const accretionFireMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xffedd5,
          emissive: 0xf97316,
          emissiveIntensity: 2.8,
          roughness: 0.1,
        }),
      );
      const accretionVioletMat = trackHatMat(
        new THREE.MeshStandardMaterial({
          color: 0xe879f9,
          emissive: 0x9333ea,
          emissiveIntensity: 2.3,
          roughness: 0.12,
        }),
      );
      hatCrownGemMats = [accretionFireMat, accretionVioletMat];

      // Pitch-black Event Horizon Sphere
      const eventHorizon = new THREE.Mesh(
        trackHatGeo(new THREE.SphereGeometry(0.145, 22, 18)),
        voidBlackMat,
      );
      hover.add(eventHorizon);

      // Vertical gravitational-lensing photon halo framing the black sphere
      const photonHalo = new THREE.Mesh(
        trackHatGeo(new THREE.TorusGeometry(0.165, 0.013, 10, 32)),
        accretionFireMat,
      );
      hover.add(photonHalo);

      // Spinning Tilted Blazing Accretion Disk & Orbiting Star Shards
      const orbit = new THREE.Group();
      hover.add(orbit);
      hatOrbitGroup = orbit;

      const innerDisk = new THREE.Mesh(
        trackHatGeo(new THREE.TorusGeometry(0.24, 0.024, 10, 32)),
        accretionFireMat,
      );
      innerDisk.rotation.x = Math.PI * 0.5;
      innerDisk.scale.set(1.0, 1.0, 0.32);
      orbit.add(innerDisk);

      const outerDisk = new THREE.Mesh(
        trackHatGeo(new THREE.TorusGeometry(0.32, 0.016, 10, 32)),
        accretionVioletMat,
      );
      outerDisk.rotation.x = Math.PI * 0.5;
      outerDisk.scale.set(1.0, 1.0, 0.25);
      orbit.add(outerDisk);

      const shardGeo = trackHatGeo(new THREE.OctahedronGeometry(0.032, 0));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const shard = new THREE.Mesh(shardGeo, i % 2 === 0 ? accretionFireMat : accretionVioletMat);
        shard.position.set(Math.sin(a) * 0.38, (i % 2 === 0 ? 0.04 : -0.04), Math.cos(a) * 0.38);
        orbit.add(shard);
      }
    }
  };

  applyPaintAndLivery();
  applyLightsAndVisualFx();
  rebuildCustomAero(currentCustom.bodyKit, currentCustom.spoiler);
  rebuildRoofHat(currentCustom.roofHat ?? 'none');

  const setPaintColor = (hex: number): void => {
    if (hex === currentPaintHex) return;
    currentPaintHex = hex;
    applyPaintAndLivery();
  };

  const setCustomConfig = (config: CarCustomConfig): void => {
    const merged: CarCustomConfig = { ...getDefaultCustomForCar(), ...config };
    const paintChanged =
      merged.livery !== currentCustom.livery ||
      merged.paintFinish !== currentCustom.paintFinish;
    const aeroChanged =
      merged.bodyKit !== currentCustom.bodyKit ||
      merged.spoiler !== currentCustom.spoiler;
    const fxChanged =
      merged.underglow !== currentCustom.underglow ||
      merged.headlight !== currentCustom.headlight ||
      merged.nitroFlame !== currentCustom.nitroFlame ||
      merged.plateStyle !== currentCustom.plateStyle;
    const hatChanged = merged.roofHat !== currentCustom.roofHat;
    currentCustom = merged;
    if (paintChanged) applyPaintAndLivery();
    if (aeroChanged) rebuildCustomAero(merged.bodyKit, merged.spoiler);
    if (fxChanged) applyLightsAndVisualFx();
    if (hatChanged) rebuildRoofHat(merged.roofHat ?? 'none');
  };

  const updateEffects = (
    timeSec: number,
    speedMs = 0,
    steerNorm = 0,
  ): void => {
    // 1. Animated Underglow (Pulse or RGB Rainbow — cached spec, zero per-frame Array.find)
    if (underglowGroup.visible) {
      const ugSpec = cachedUnderglowSpec;
      if (ugSpec.mode === 'pulse') {
        const wave = 0.5 + 0.5 * Math.sin(timeSec * 3.6);
        underglowOuterMat.opacity = 0.16 + wave * 0.24;
        underglowInnerMat.opacity = 0.24 + wave * 0.34;
        underglowLight.intensity = 2.2 + wave * 3.6;
        _fxColor.setHSL(0.54 + wave * 0.16, 0.95, 0.54);
        underglowOuterMat.color.copy(_fxColor);
        underglowInnerMat.color.copy(_fxColor);
        underglowStripMat.emissive.copy(_fxColor);
        underglowLight.color.copy(_fxColor);
      } else if (ugSpec.mode === 'pulseWarm') {
        const wave = 0.5 + 0.5 * Math.sin(timeSec * 3.8);
        underglowOuterMat.opacity = 0.18 + wave * 0.24;
        underglowInnerMat.opacity = 0.26 + wave * 0.34;
        underglowLight.intensity = 2.5 + wave * 3.5;
        _fxColor.setHSL(0.02 + wave * 0.1, 0.98, 0.52);
        underglowOuterMat.color.copy(_fxColor);
        underglowInnerMat.color.copy(_fxColor);
        underglowStripMat.emissive.copy(_fxColor);
        underglowLight.color.copy(_fxColor);
      } else if (ugSpec.mode === 'strobe') {
        const phase = (timeSec * 5.2) % 2;
        const isBlue = phase < 1;
        const subFlash = (phase % 1) < 0.28 || ((phase % 1) > 0.42 && (phase % 1) < 0.7);
        _fxColor.setHex(isBlue ? 0x2563eb : 0xef4444);
        underglowOuterMat.color.copy(_fxColor);
        underglowInnerMat.color.copy(_fxColor);
        underglowStripMat.emissive.copy(_fxColor);
        underglowLight.color.copy(_fxColor);
        underglowOuterMat.opacity = subFlash ? 0.44 : 0.1;
        underglowInnerMat.opacity = subFlash ? 0.64 : 0.14;
        underglowLight.intensity = subFlash ? 6.2 : 1.2;
      } else if (ugSpec.mode === 'rainbow') {
        const hue = (timeSec * 0.2) % 1;
        _fxColor.setHSL(hue, 0.96, 0.53);
        underglowOuterMat.color.copy(_fxColor);
        underglowInnerMat.color.copy(_fxColor);
        underglowStripMat.emissive.copy(_fxColor);
        underglowLight.color.copy(_fxColor);
        underglowOuterMat.opacity = 0.34;
        underglowInnerMat.opacity = 0.52;
        underglowLight.intensity = 4.8;
      } else if (ugSpec.mode === 'aurora') {
        const wave = 0.5 + 0.5 * Math.sin(timeSec * 1.9);
        const hue = 0.42 + wave * 0.34; // emerald -> teal -> violet aurora wave
        _fxColor.setHSL(hue, 0.92, 0.54);
        underglowOuterMat.color.copy(_fxColor);
        underglowInnerMat.color.copy(_fxColor);
        underglowStripMat.emissive.copy(_fxColor);
        underglowLight.color.copy(_fxColor);
        underglowOuterMat.opacity = 0.24 + wave * 0.2;
        underglowInnerMat.opacity = 0.36 + wave * 0.26;
        underglowLight.intensity = 3.2 + wave * 2.8;
      } else if (ugSpec.mode === 'cyberBreathe') {
        const breathe = 0.5 + 0.5 * Math.sin(timeSec * 2.8);
        const hue = 0.52 + breathe * 0.35; // cyan <-> neon magenta
        _fxColor.setHSL(hue, 0.96, 0.55);
        underglowOuterMat.color.copy(_fxColor);
        underglowInnerMat.color.copy(_fxColor);
        underglowStripMat.emissive.copy(_fxColor);
        underglowLight.color.copy(_fxColor);
        underglowOuterMat.opacity = 0.2 + breathe * 0.24;
        underglowInnerMat.opacity = 0.3 + breathe * 0.34;
        underglowLight.intensity = 2.6 + breathe * 3.6;
      } else if (ugSpec.mode === 'lavaPulse') {
        const pulse = 0.5 + 0.5 * Math.sin(timeSec * 4.4);
        const flare = 0.5 + 0.5 * Math.sin(timeSec * 7.8);
        _fxColor.setHSL(0.012 + pulse * 0.065, 1.0, 0.48 + flare * 0.1);
        underglowOuterMat.color.copy(_fxColor);
        underglowInnerMat.color.copy(_fxColor);
        underglowStripMat.emissive.copy(_fxColor);
        underglowLight.color.copy(_fxColor);
        underglowOuterMat.opacity = 0.22 + pulse * 0.22;
        underglowInnerMat.opacity = 0.34 + flare * 0.3;
        underglowLight.intensity = 3.0 + pulse * 3.4;
      }
    }

    // 2. Animated Chameleon & Holographic Prism Color Shift
    // Full-body artwork wraps keep crisp artwork colors while retaining physical iridescence sheen
    const isFullWrap = Boolean(cachedLiverySpec?.overridesBaseColor);
    if (currentCustom.paintFinish === 'chameleon') {
      if (isFullWrap) {
        paintMaterial.color.copy(_whiteColor);
      } else {
        const hue = (timeSec * 0.11) % 1;
        _fxColor.setHSL(hue, 0.82, 0.52);
        if (currentCustom.livery === 'solid') {
          paintMaterial.color.copy(_fxColor);
        } else {
          paintMaterial.color.copy(_fxColor).lerp(_whiteColor, 0.22);
        }
      }
    } else if (currentCustom.paintFinish === 'prismHolo') {
      if (isFullWrap) {
        paintMaterial.color.copy(_whiteColor);
      } else {
        const hue = (timeSec * 0.24) % 1;
        _fxColor.setHSL(hue, 0.94, 0.68);
        if (currentCustom.livery === 'solid') {
          paintMaterial.color.copy(_fxColor);
        } else {
          paintMaterial.color.copy(_fxColor).lerp(_whiteColor, 0.35);
        }
      }
    } else if (currentCustom.paintFinish === 'royalGoldHolo') {
      if (isFullWrap) {
        paintMaterial.color.copy(_whiteColor);
      } else {
        const wave = 0.5 + 0.5 * Math.sin(timeSec * 1.9);
        _fxColor.setHSL(0.11 + wave * 0.045, 0.96, 0.52 + wave * 0.14);
        paintMaterial.color.copy(_fxColor);
      }
    } else if (currentCustom.paintFinish === 'apexEclipse') {
      if (isFullWrap) {
        paintMaterial.color.copy(_whiteColor);
      } else {
        const phase = (timeSec * 0.32) % 1;
        // Cycles richly through Imperial Crimson -> Solar Gold -> Royal Amethyst
        if (phase < 0.33) {
          _fxColor.setHSL(0.96 + phase * 0.15, 0.92, 0.48);
        } else if (phase < 0.66) {
          _fxColor.setHSL(0.08 + (phase - 0.33) * 0.18, 0.96, 0.54);
        } else {
          _fxColor.setHSL(0.76 + (phase - 0.66) * 0.52, 0.88, 0.48);
        }
        paintMaterial.color.copy(_fxColor);
      }
    } else if (currentCustom.paintFinish === 'nebulaShift') {
      if (isFullWrap) {
        paintMaterial.color.copy(_whiteColor);
      } else {
        const wave = 0.5 + 0.5 * Math.sin(timeSec * 0.95);
        const hue = (0.52 + wave * 0.36) % 1;
        _fxColor.setHSL(hue, 0.9, 0.48 + wave * 0.1);
        paintMaterial.color.copy(_fxColor);
      }
    }

    // 2b. Rocket League-Style Animated Wraps (Pure GPU UV Scrolling + Emissive Pulse, Zero GC)
    if (activeLiveryTex && activeLiveryEmissiveTex) {
      const liv = currentCustom.livery;
      if (liv === 'animPulseGrid') {
        const oy = -(timeSec * 0.32) % 1;
        activeLiveryTex.offset.set(0, oy);
        activeLiveryEmissiveTex.offset.set(0, oy);
        paintMaterial.emissive.setHex(0xffffff);
        paintMaterial.emissiveIntensity = 0.9 + Math.sin(timeSec * 4.2) * 0.35;
      } else if (liv === 'animPlasmaWave') {
        const ox = Math.sin(timeSec * 0.65) * 0.12;
        const oy = -(timeSec * 0.24) % 1;
        activeLiveryTex.offset.set(ox, oy);
        activeLiveryEmissiveTex.offset.set(ox, oy);
        paintMaterial.emissive.setHex(0xffffff);
        paintMaterial.emissiveIntensity = 0.95 + Math.sin(timeSec * 3.1) * 0.25;
      } else if (liv === 'animHeatwave') {
        const ox = (timeSec * 0.045) % 1;
        const oy = -(timeSec * 0.12) % 1;
        activeLiveryTex.offset.set(ox, oy);
        activeLiveryEmissiveTex.offset.set(ox, oy);
        paintMaterial.emissive.setHex(0xffd2a6);
        paintMaterial.emissiveIntensity = 1.15 + Math.sin(timeSec * 3.8) * 0.42;
      } else if (liv === 'animMatrixRain') {
        const oy = -(timeSec * 0.56) % 1;
        activeLiveryTex.offset.set(0, oy);
        activeLiveryEmissiveTex.offset.set(0, oy);
        paintMaterial.emissive.setHex(0xffffff);
        paintMaterial.emissiveIntensity = 1.0 + Math.sin(timeSec * 5.4) * 0.28;
      } else if (liv === 'animInterstellar') {
        const ox = (timeSec * 0.055) % 1;
        const oy = -(timeSec * 0.11) % 1;
        activeLiveryTex.offset.set(ox, oy);
        activeLiveryEmissiveTex.offset.set(ox, oy);
        const hue = (0.68 + Math.sin(timeSec * 0.55) * 0.14 + 1) % 1;
        _fxColor.setHSL(hue, 0.55, 0.88);
        paintMaterial.emissive.copy(_fxColor);
        paintMaterial.emissiveIntensity = 1.05 + Math.sin(timeSec * 2.4) * 0.3;
      } else if (liv === 'animThunderVolt') {
        const oy = -(timeSec * 0.68) % 1;
        activeLiveryTex.offset.set(0, oy);
        activeLiveryEmissiveTex.offset.set(0, oy);
        const zap = Math.sin(timeSec * 24) * Math.sin(timeSec * 7.5) > 0.25 ? 1 : 0;
        paintMaterial.emissive.setHex(zap ? 0xe0f2fe : 0x93c5fd);
        paintMaterial.emissiveIntensity = zap ? 2.1 : 1.05 + Math.sin(timeSec * 6) * 0.25;
      } else if (liv === 'animSynthwave') {
        const oy = -(timeSec * 0.34) % 1;
        activeLiveryTex.offset.set(0, oy);
        activeLiveryEmissiveTex.offset.set(0, oy);
        paintMaterial.emissive.setHex(0xffffff);
        paintMaterial.emissiveIntensity = 1.05 + Math.sin(timeSec * 4.0) * 0.32;
      } else if (liv === 'animAuroraFrost') {
        const ox = Math.sin(timeSec * 0.42) * 0.14;
        const oy = -(timeSec * 0.16) % 1;
        activeLiveryTex.offset.set(ox, oy);
        activeLiveryEmissiveTex.offset.set(ox, oy);
        const hue = (0.46 + Math.sin(timeSec * 0.5) * 0.12 + 1) % 1;
        _fxColor.setHSL(hue, 0.55, 0.88);
        paintMaterial.emissive.copy(_fxColor);
        paintMaterial.emissiveIntensity = 1.0 + Math.sin(timeSec * 2.8) * 0.32;
      } else if (liv === 'animGoldenDragon') {
        // Locked imperial dragon motif + surging molten 24K gold scale wave along emissive layer
        activeLiveryTex.offset.set(0, 0);
        const oy = -(timeSec * 0.34) % 1;
        activeLiveryEmissiveTex.offset.set(0, oy);
        paintMaterial.emissive.setHex(0xffe08a);
        paintMaterial.emissiveIntensity = 1.25 + Math.sin(timeSec * 3.8) * 0.42;
      } else if (liv === 'animComicSpeed') {
        // Initial-D style manga speed streaks accelerating dramatically with vehicle speed!
        const mangaSpeed = 0.72 + THREE.MathUtils.clamp(speedMs, 0, 85) * 0.016;
        const oy = -(timeSec * mangaSpeed) % 1;
        activeLiveryTex.offset.set(0, oy);
        activeLiveryEmissiveTex.offset.set(0, oy * 1.5);
        paintMaterial.emissive.setHex(0xffffff);
        paintMaterial.emissiveIntensity = 1.08 + Math.sin(timeSec * 14.0) * 0.32;
      } else if (liv === 'animCandyPop') {
        const ox = Math.sin(timeSec * 0.55) * 0.14;
        const oy = -(timeSec * 0.28) % 1;
        activeLiveryTex.offset.set(ox, oy);
        activeLiveryEmissiveTex.offset.set(ox, oy);
        paintMaterial.emissive.setHex(0xffffff);
        paintMaterial.emissiveIntensity = 0.95 + Math.sin(timeSec * 3.4) * 0.28;
      } else if (liv === 'animVenomSymbiote') {
        // Living glossy Venom: subtle organic breathing on hood eyes/spider + crawling white symbiote veins along emissive!
        const breatheX = Math.sin(timeSec * 2.3) * 0.006;
        const breatheY = Math.cos(timeSec * 1.8) * 0.006;
        activeLiveryTex.offset.set(breatheX, breatheY);
        const crawlY = -(timeSec * 0.26) % 1;
        const crawlX = Math.sin(timeSec * 1.9) * 0.035;
        activeLiveryEmissiveTex.offset.set(crawlX, crawlY);
        paintMaterial.emissive.setHex(0xe2e8f0);
        paintMaterial.emissiveIntensity = 0.92 + Math.sin(timeSec * 4.1) * 0.34;
      } else if (liv === 'animLiquidAquarium') {
        // Glass caustic surface shimmer + REAL physics-driven sloshing water tank & swimming low-poly goldfish!
        const ox = Math.sin(timeSec * 0.6) * 0.06;
        const oy = -(timeSec * 0.18) % 1;
        activeLiveryTex.offset.set(ox, oy);
        activeLiveryEmissiveTex.offset.set(ox, oy);
        paintMaterial.emissive.setHex(0x7dd3fc);
        paintMaterial.emissiveIntensity = 0.38 + Math.sin(timeSec * 2.5) * 0.12;

        // Damped harmonic water-slosh spring reacting to lateral steering/drift forces!
        const dt =
          lastAqTimeSec < 0
            ? 0.016
            : Math.min(0.05, Math.max(0.001, timeSec - lastAqTimeSec));
        lastAqTimeSec = timeSec;
        const targetSlosh =
          THREE.MathUtils.clamp(-steerNorm * 0.26, -0.28, 0.28) +
          Math.sin(timeSec * 2.4) * 0.032;
        const accel = (targetSlosh - aquariumSloshAngle) * 32 - aquariumSloshVel * 4.4;
        aquariumSloshVel += accel * dt;
        aquariumSloshAngle = THREE.MathUtils.clamp(
          aquariumSloshAngle + aquariumSloshVel * dt,
          -0.34,
          0.34,
        );
        aquariumWaterPivot.rotation.z = aquariumSloshAngle;
        aquariumWaterPivot.rotation.x =
          THREE.MathUtils.clamp(speedMs * 0.0014, -0.08, 0.09) +
          Math.cos(timeSec * 2.1) * 0.02;

        // Animate all 5 low-poly orange goldfish along smooth figure-8 swimming paths inside the tank!
        for (let i = 0; i < aquariumFishes.length; i++) {
          const f = aquariumFishes[i];
          const t = timeSec * f.speed * f.dir + f.phase;
          const x = Math.sin(t) * f.radiusX;
          const z = Math.sin(t * 0.5) * f.radiusZ;
          const dx = Math.cos(t) * f.radiusX * f.speed * f.dir;
          const dz = 0.5 * Math.cos(t * 0.5) * f.radiusZ * f.speed * f.dir;
          const bobY = f.baseY + Math.sin(timeSec * 2.6 + f.phase) * (aqH * 0.08);
          f.root.position.set(x, bobY, z);
          f.root.rotation.y = Math.atan2(dx, dz);
          f.tail.rotation.y = Math.sin(timeSec * 14 + f.phase * 2) * 0.42;
        }

        // Rise & loop translucent air bubbles continuously inside the water volume
        for (let i = 0; i < aquariumBubbles.length; i++) {
          const b = aquariumBubbles[i];
          const frac = ((timeSec * b.speed + b.phase) % 1 + 1) % 1;
          b.mesh.position.set(
            b.x + Math.sin(timeSec * 3.2 + b.phase) * 0.035,
            -aqH * 0.44 + frac * aqH * 0.88,
            b.z + Math.cos(timeSec * 2.8 + b.phase) * 0.035,
          );
        }
      } else if (liv === 'animWindStream') {
        // Dynamic aerodynamic wind-tunnel slipstream: scrolls faster as vehicle speed climbs!
        const windSpeed = 0.55 + THREE.MathUtils.clamp(speedMs, 0, 85) * 0.014;
        const oy = -(timeSec * windSpeed) % 1;
        const ox = Math.sin(timeSec * 1.6) * 0.025;
        activeLiveryTex.offset.set(ox, oy);
        activeLiveryEmissiveTex.offset.set(ox, oy);
        paintMaterial.emissive.setHex(0xbae6fd);
        paintMaterial.emissiveIntensity = 0.82 + Math.sin(timeSec * 5.2) * 0.25;
      } else if (liv === 'omnitrixAlien') {
        // Locked Ben-10 black/white alien armor & hood hourglass + live scrolling neon-green DNA/energy waves!
        activeLiveryTex.offset.set(0, 0);
        const omniSpeed = 0.48 + THREE.MathUtils.clamp(speedMs, 0, 85) * 0.008;
        const oy = -(timeSec * omniSpeed) % 1;
        activeLiveryEmissiveTex.offset.set(0, oy);
        const surge = Math.pow(0.5 + 0.5 * Math.sin(timeSec * 4.4), 2);
        paintMaterial.emissive.setHex(surge > 0.65 ? 0xbbf7d0 : 0x4ade80);
        paintMaterial.emissiveIntensity = 1.05 + surge * 1.15;
      } else if (liv === 'animCrysisNanosuit') {
        // Crysis Nanosuit 2.0: Locked synthetic carbon muscle-fiber armor & crimson visor + live sweeping Maximum Armor hex-shield wave!
        activeLiveryTex.offset.set(0, 0);
        const nanoSpeed = 0.36 + THREE.MathUtils.clamp(speedMs, 0, 85) * 0.0075;
        const oy = -(timeSec * nanoSpeed) % 1;
        activeLiveryEmissiveTex.offset.set(0, oy);
        const armorPulse = Math.pow(0.5 + 0.5 * Math.sin(timeSec * 3.6), 2.2);
        paintMaterial.emissive.setHex(armorPulse > 0.68 ? 0xe0f2fe : 0x38bdf8);
        paintMaterial.emissiveIntensity = 0.95 + armorPulse * 1.35;
      } else if (liv === 'animSakuraStorm') {
        // Diagonal gentle breeze sweeping glowing cherry blossom petals across the chassis
        const ox = (timeSec * 0.12) % 1;
        const oy = -(timeSec * 0.24) % 1;
        activeLiveryTex.offset.set(ox, oy);
        activeLiveryEmissiveTex.offset.set(ox, oy);
        paintMaterial.emissive.setHex(0xfbcfe8);
        paintMaterial.emissiveIntensity = 0.9 + Math.sin(timeSec * 2.8) * 0.24;
      } else if (liv === 'animGlitchCorrupt') {
        // Snappy stepped cyberpunk glitch jitter with sudden horizontal jumps!
        const stepT = Math.floor(timeSec * 14);
        const jitterX = ((Math.sin(stepT * 12.9898) * 43758.5453) % 1) * 0.14;
        const oy = -(timeSec * 0.42) % 1;
        activeLiveryTex.offset.set(jitterX, oy);
        activeLiveryEmissiveTex.offset.set(jitterX, oy);
        const spike = stepT % 7 === 0 ? 1.85 : 1.05;
        paintMaterial.emissive.setHex(0xffffff);
        paintMaterial.emissiveIntensity = spike;
      } else if (liv === 'animToxicAcid') {
        // Viscous oozing radioactive lime-acid churn
        const ox = Math.sin(timeSec * 0.9) * 0.08;
        const oy = -(timeSec * 0.15) % 1;
        activeLiveryTex.offset.set(ox, oy);
        activeLiveryEmissiveTex.offset.set(ox, oy);
        paintMaterial.emissive.setHex(0xd9f99d);
        paintMaterial.emissiveIntensity = 1.05 + Math.sin(timeSec * 4.6) * 0.36;
      } else if (liv === 'animOceanBiolum') {
        // Smooth rolling bioluminescent deep-sea tide
        const ox = Math.sin(timeSec * 0.52) * 0.15;
        const oy = -(timeSec * 0.19) % 1;
        activeLiveryTex.offset.set(ox, oy);
        activeLiveryEmissiveTex.offset.set(ox, oy);
        paintMaterial.emissive.setHex(0x99f6e4);
        paintMaterial.emissiveIntensity = 1.0 + Math.sin(timeSec * 3.1) * 0.34;
      } else if (liv === 'animHeartbeatEcg') {
        // Realistic lub-dub double heartbeat emissive pulse synced with scrolling ECG trace!
        const oy = -(timeSec * 0.44) % 1;
        activeLiveryTex.offset.set(0, oy);
        activeLiveryEmissiveTex.offset.set(0, oy);
        const beatPhase = (timeSec * 1.35) % 1;
        const lub = Math.exp(-Math.pow((beatPhase - 0.14) / 0.055, 2));
        const dub = Math.exp(-Math.pow((beatPhase - 0.3) / 0.07, 2)) * 0.72;
        paintMaterial.emissive.setHex(0xffccd5);
        paintMaterial.emissiveIntensity = 0.72 + (lub + dub) * 1.45;
      } else if (liv === 'animHoloCircuit') {
        // High-speed golden microchip data pulse streaming along PCB traces
        const oy = -(timeSec * 0.48) % 1;
        activeLiveryTex.offset.set(0, oy);
        activeLiveryEmissiveTex.offset.set(0, oy);
        paintMaterial.emissive.setHex(0xfef08a);
        paintMaterial.emissiveIntensity = 0.95 + Math.sin(timeSec * 5.6) * 0.35;
      } else if (liv === 'animHypnoSpiral') {
        // Smooth mesmerizing optical-illusion drift with subtle prismatic violet hue shift
        const ox = Math.sin(timeSec * 0.85) * 0.12;
        const oy = -(timeSec * 0.3) % 1;
        activeLiveryTex.offset.set(ox, oy);
        activeLiveryEmissiveTex.offset.set(ox, oy);
        const hue = (0.78 + Math.sin(timeSec * 0.7) * 0.16 + 1) % 1;
        _fxColor.setHSL(hue, 0.85, 0.72);
        paintMaterial.emissive.copy(_fxColor);
        paintMaterial.emissiveIntensity = 1.15 + Math.sin(timeSec * 4.2) * 0.35;
      } else if (liv === 'animWarpHyperdrive') {
        // Light-speed star streaks accelerating dramatically with car velocity!
        const warpSpeed = 0.72 + THREE.MathUtils.clamp(speedMs, 0, 90) * 0.022;
        const oy = -(timeSec * warpSpeed) % 1;
        activeLiveryTex.offset.set(0, oy);
        activeLiveryEmissiveTex.offset.set(0, oy);
        paintMaterial.emissive.setHex(0xe0f2fe);
        paintMaterial.emissiveIntensity = 1.15 + Math.sin(timeSec * 7.5) * 0.32;
      } else if (liv === 'animCyberEqualizer') {
        // 128 BPM DJ bass beat bounce!
        const beat = Math.pow(Math.abs(Math.sin(timeSec * Math.PI * (128 / 60))), 3);
        const oy = -(timeSec * 0.22 + beat * 0.04) % 1;
        activeLiveryTex.offset.set(0, oy);
        activeLiveryEmissiveTex.offset.set(0, oy);
        paintMaterial.emissive.setHex(0xffffff);
        paintMaterial.emissiveIntensity = 0.85 + beat * 0.95;
      } else if (liv === 'animSolarEclipse') {
        // Majestic slow coronal plasma drift with blazing solar flare pulse
        const ox = (timeSec * 0.04) % 1;
        const oy = -(timeSec * 0.1) % 1;
        activeLiveryTex.offset.set(ox, oy);
        activeLiveryEmissiveTex.offset.set(ox, oy);
        paintMaterial.emissive.setHex(0xffd699);
        paintMaterial.emissiveIntensity = 1.1 + Math.sin(timeSec * 2.9) * 0.42;
      }
    }

    // 2c. Rocket League-Style Animated Wheels (Zero-GC Emissive Pulse, Color Cycle & Counter-Rotation)
    if (wheelAnimSpinners.length > 0) {
      for (let i = 0; i < wheelAnimSpinners.length; i++) {
        const sp = wheelAnimSpinners[i];
        sp.group.rotation.x = timeSec * sp.speed;
      }
    }
    if (activeWheelStyle === 'animNeonPulse') {
      const waveA = 0.5 + 0.5 * Math.sin(timeSec * 4.4);
      const waveB = 0.5 + 0.5 * Math.sin(timeSec * 4.4 + Math.PI * 0.65);
      wheelGlowPrimaryMat.emissiveIntensity = 1.0 + waveA * 1.45;
      wheelGlowSecondaryMat.emissiveIntensity = 0.75 + waveB * 1.35;
    } else if (activeWheelStyle === 'animReactor') {
      const surge = 0.5 + 0.5 * Math.sin(timeSec * 6.2);
      const arc = 0.5 + 0.5 * Math.sin(timeSec * 3.1 + 1.2);
      wheelGlowPrimaryMat.emissiveIntensity = 1.15 + surge * 1.55;
      wheelGlowSecondaryMat.emissiveIntensity = 0.85 + arc * 1.3;
    } else if (activeWheelStyle === 'animMagma') {
      const heatA = 0.5 + 0.5 * Math.sin(timeSec * 3.8);
      const heatB = 0.5 + 0.5 * Math.sin(timeSec * 5.2 + 1.4);
      _fxColor.setHSL(0.015 + heatA * 0.065, 1.0, 0.52);
      wheelGlowPrimaryMat.color.copy(_fxColor);
      wheelGlowPrimaryMat.emissive.copy(_fxColor);
      wheelGlowPrimaryMat.emissiveIntensity = 1.3 + heatA * 1.35;
      _fxColor.setHSL(0.07 + heatB * 0.055, 1.0, 0.55);
      wheelGlowSecondaryMat.color.copy(_fxColor);
      wheelGlowSecondaryMat.emissive.copy(_fxColor);
      wheelGlowSecondaryMat.emissiveIntensity = 1.1 + heatB * 1.25;
    } else if (activeWheelStyle === 'animCyberGrid') {
      const pulseA = 0.5 + 0.5 * Math.sin(timeSec * 4.8);
      const pulseB = 0.5 + 0.5 * Math.sin(timeSec * 4.8 + Math.PI);
      wheelGlowPrimaryMat.emissiveIntensity = 0.95 + pulseA * 1.55;
      wheelGlowSecondaryMat.emissiveIntensity = 0.95 + pulseB * 1.55;
    } else if (activeWheelStyle === 'animPrismVortex') {
      const hueA = (timeSec * 0.26) % 1;
      const hueB = (hueA + 0.36) % 1;
      _fxColor.setHSL(hueA, 0.98, 0.56);
      wheelGlowPrimaryMat.color.copy(_fxColor);
      wheelGlowPrimaryMat.emissive.copy(_fxColor);
      wheelGlowPrimaryMat.emissiveIntensity = 1.65 + Math.sin(timeSec * 4.2) * 0.45;
      _fxColor.setHSL(hueB, 0.98, 0.56);
      wheelGlowSecondaryMat.color.copy(_fxColor);
      wheelGlowSecondaryMat.emissive.copy(_fxColor);
      wheelGlowSecondaryMat.emissiveIntensity = 1.55 + Math.cos(timeSec * 4.2) * 0.45;
    } else if (activeWheelStyle === 'animLightning') {
      const bolt = Math.sin(timeSec * 22) * Math.sin(timeSec * 7.3) > 0.22 ? 1 : 0;
      wheelGlowPrimaryMat.emissiveIntensity = bolt ? 2.9 : 1.05 + Math.sin(timeSec * 6) * 0.25;
      wheelGlowSecondaryMat.emissiveIntensity = bolt ? 2.5 : 0.85;
    } else if (activeWheelStyle === 'animEmeraldPulse') {
      const wA = 0.5 + 0.5 * Math.sin(timeSec * 4.6);
      const wB = 0.5 + 0.5 * Math.sin(timeSec * 4.6 + Math.PI * 0.8);
      wheelGlowPrimaryMat.emissiveIntensity = 1.1 + wA * 1.6;
      wheelGlowSecondaryMat.emissiveIntensity = 0.8 + wB * 1.4;
    } else if (activeWheelStyle === 'animSolarFlare') {
      const flare = 0.5 + 0.5 * Math.sin(timeSec * 5.1);
      _fxColor.setHSL(0.08 + flare * 0.055, 1.0, 0.54);
      wheelGlowPrimaryMat.color.copy(_fxColor);
      wheelGlowPrimaryMat.emissive.copy(_fxColor);
      wheelGlowPrimaryMat.emissiveIntensity = 1.35 + flare * 1.45;
      _fxColor.setHSL(0.03 + (1 - flare) * 0.05, 1.0, 0.52);
      wheelGlowSecondaryMat.color.copy(_fxColor);
      wheelGlowSecondaryMat.emissive.copy(_fxColor);
      wheelGlowSecondaryMat.emissiveIntensity = 1.15 + (1 - flare) * 1.2;
    } else if (activeWheelStyle === 'animFrostCrystal') {
      const shimmer = 0.5 + 0.5 * Math.sin(timeSec * 3.4);
      wheelGlowPrimaryMat.emissiveIntensity = 1.2 + shimmer * 1.35;
      wheelGlowSecondaryMat.emissiveIntensity = 1.0 + (1 - shimmer) * 1.2;
    } else if (activeWheelStyle === 'animGalaxyOrb') {
      const hueA = 0.72 + Math.sin(timeSec * 1.4) * 0.14;
      const hueB = 0.52 + Math.cos(timeSec * 1.7) * 0.12;
      _fxColor.setHSL((hueA + 1) % 1, 0.94, 0.58);
      wheelGlowPrimaryMat.color.copy(_fxColor);
      wheelGlowPrimaryMat.emissive.copy(_fxColor);
      wheelGlowPrimaryMat.emissiveIntensity = 1.55 + Math.sin(timeSec * 3.6) * 0.45;
      _fxColor.setHSL((hueB + 1) % 1, 0.94, 0.56);
      wheelGlowSecondaryMat.color.copy(_fxColor);
      wheelGlowSecondaryMat.emissive.copy(_fxColor);
      wheelGlowSecondaryMat.emissiveIntensity = 1.4 + Math.cos(timeSec * 3.6) * 0.4;
    } else if (activeWheelStyle === 'animVenomRing') {
      const p = 0.5 + 0.5 * Math.sin(timeSec * 5.2);
      wheelGlowPrimaryMat.emissiveIntensity = 1.2 + p * 1.5;
      wheelGlowSecondaryMat.emissiveIntensity = 1.0 + (1 - p) * 1.3;
    } else if (activeWheelStyle === 'animRubyPulse') {
      const p = 0.5 + 0.5 * Math.sin(timeSec * 4.6);
      wheelGlowPrimaryMat.emissiveIntensity = 1.3 + p * 1.55;
      wheelGlowSecondaryMat.emissiveIntensity = 1.1 + (1 - p) * 1.4;
    } else if (activeWheelStyle === 'hoverMaglevOrb') {
      const pulse = 0.5 + 0.5 * Math.sin(timeSec * 4.2);
      const hue = (0.52 + Math.sin(timeSec * 1.1) * 0.14 + 1) % 1;
      _fxColor.setHSL(hue, 0.96, 0.58);
      wheelGlowPrimaryMat.color.copy(_fxColor);
      wheelGlowPrimaryMat.emissive.copy(_fxColor);
      wheelGlowPrimaryMat.emissiveIntensity = 1.45 + pulse * 1.35;
      wheelGlowSecondaryMat.emissiveIntensity = 1.3 + (1 - pulse) * 1.4;
    }

    // 2d. Animated Nitro Exhaust Cone Color (Rainbow / Police Strobe / Aurora — cached spec)
    const activeNitroSpec = cachedNitroSpec;
    if (activeNitroSpec.animatedMode === 'rainbow') {
      _fxColor.setHSL((timeSec * 0.65) % 1, 0.98, 0.58);
      flameMat.color.copy(_fxColor);
    } else if (activeNitroSpec.animatedMode === 'strobe') {
      const isBlue = Math.floor(timeSec * 11) % 2 === 0;
      flameMat.color.setHex(isBlue ? 0x3b82f6 : 0xef4444);
    } else if (activeNitroSpec.animatedMode === 'aurora') {
      const wave = 0.5 + 0.5 * Math.sin(timeSec * 2.6);
      _fxColor.setHSL(0.44 + wave * 0.34, 0.95, 0.58);
      flameMat.color.copy(_fxColor);
    }

    // 2e. Animated Body Kit Neon Trim & Animated Spoilers (DRS / Neon / Plasma / RGB)
    if (kitNeonTrimMat) {
      const w = 0.5 + 0.5 * Math.sin(timeSec * 3.2);
      _fxColor.setHSL(0.52 + w * 0.34, 0.96, 0.55);
      kitNeonTrimMat.color.copy(_fxColor);
      kitNeonTrimMat.emissive.copy(_fxColor);
      kitNeonTrimMat.emissiveIntensity = 1.45 + w * 0.9;
    }
    if (activeDrsBlade) {
      // Tilts flatter at high speed for low drag, steeper under braking; gentle demo wave in garage
      const targetTilt =
        speedMs > 12
          ? THREE.MathUtils.lerp(-0.34, 0.04, THREE.MathUtils.clamp((speedMs - 25) / 65, 0, 1))
          : -0.16 + Math.sin(timeSec * 2.1) * 0.16;
      activeDrsBlade.rotation.x = targetTilt;
      if (spoilerAnimPrimaryMat) {
        spoilerAnimPrimaryMat.emissiveIntensity = 1.3 + Math.sin(timeSec * 4.5) * 0.6;
      }
      if (spoilerAnimSecondaryMat) {
        spoilerAnimSecondaryMat.emissiveIntensity =
          1.4 + Math.min(speedMs * 0.03, 1.5) + Math.sin(timeSec * 14) * 0.45;
      }
    } else if (
      (currentCustom.spoiler === 'animNeonBlade' ||
        currentCustom.spoiler === 'animCyberHaloWing' ||
        currentCustom.spoiler === 'animInfernoWing') &&
      spoilerAnimPrimaryMat &&
      spoilerAnimSecondaryMat
    ) {
      const pA = 0.5 + 0.5 * Math.sin(timeSec * 4.4);
      const pB = 0.5 + 0.5 * Math.sin(timeSec * 4.4 + Math.PI);
      spoilerAnimPrimaryMat.emissiveIntensity = 1.2 + pA * 1.4;
      spoilerAnimSecondaryMat.emissiveIntensity = 1.2 + pB * 1.4;
    } else if (
      (currentCustom.spoiler === 'animPlasmaWing' ||
        currentCustom.spoiler === 'animAngelWings') &&
      spoilerHoverGroup &&
      spoilerAnimPrimaryMat
    ) {
      spoilerHoverGroup.position.y = spoilerHoverBaseY + Math.sin(timeSec * 3.2) * 0.036;
      spoilerHoverGroup.rotation.z = Math.sin(timeSec * 1.9) * 0.026;
      const w = 0.5 + 0.5 * Math.sin(timeSec * 3.2);
      if (currentCustom.spoiler === 'animPlasmaWing') {
        _fxColor.setHSL(0.56 + w * 0.2, 0.95, 0.58);
        spoilerAnimPrimaryMat.emissive.copy(_fxColor);
      } else if (spoilerAnimSecondaryMat) {
        spoilerAnimSecondaryMat.emissiveIntensity = 1.6 + (1 - w) * 0.9;
      }
      spoilerAnimPrimaryMat.emissiveIntensity = 1.6 + w * 1.0;
    } else if (currentCustom.spoiler === 'animRgbPrismWing' && spoilerAnimPrimaryMat && spoilerAnimSecondaryMat) {
      const hA = (timeSec * 0.34) % 1;
      const hB = (hA + 0.45) % 1;
      _fxColor.setHSL(hA, 0.98, 0.56);
      spoilerAnimPrimaryMat.color.copy(_fxColor);
      spoilerAnimPrimaryMat.emissive.copy(_fxColor);
      _fxColor.setHSL(hB, 0.98, 0.56);
      spoilerAnimSecondaryMat.color.copy(_fxColor);
      spoilerAnimSecondaryMat.emissive.copy(_fxColor);
    }

    // 3. Animated & Shimmering License Plate Frames (60 FPS 3D + throttled canvas FX)
    const activePlate = currentCustom.plateStyle ?? 'classic';
    if (activePlate === 'neonGlow' || activePlate === 'crimsonNeon') {
      plateFrameMat.emissiveIntensity = 1.35 + Math.sin(timeSec * 4.5) * 0.35;
    } else if (activePlate === 'imperialGold' || activePlate === 'roseGoldChrome') {
      plateFrameMat.emissiveIntensity = 0.42 + Math.sin(timeSec * 2.8) * 0.18;
    } else if (activePlate === 'animRgbChase') {
      for (let i = 0; i < plateRgbRailMats.length; i++) {
        _fxColor.setHSL((timeSec * 0.42 + i * 0.25) % 1, 0.98, 0.56);
        plateRgbRailMats[i].color.copy(_fxColor);
        plateRgbRailMats[i].emissive.copy(_fxColor);
        plateRgbRailMats[i].emissiveIntensity = 1.9 + Math.sin(timeSec * 5 + i * 1.4) * 0.5;
      }
    } else if (activePlate === 'animPoliceStrobe') {
      const phase = (timeSec * 6.4) % 2;
      const redOn = phase < 1 && (phase < 0.28 || (phase > 0.42 && phase < 0.72));
      const blueOn = phase >= 1 && (phase < 1.28 || (phase > 1.42 && phase < 1.72));
      if (plateStrobeLeftMat) plateStrobeLeftMat.emissiveIntensity = redOn ? 4.2 : 0.25;
      if (plateStrobeRightMat) plateStrobeRightMat.emissiveIntensity = blueOn ? 4.2 : 0.25;
    } else if (activePlate === 'animCyberMatrix') {
      if (plateMatrixBarMat) {
        plateMatrixBarMat.emissiveIntensity = 1.4 + Math.sin(timeSec * 5.2) * 0.75;
      }
    } else if (activePlate === 'animKnightScan') {
      const scanX = Math.sin(timeSec * 3.6) * 0.285;
      for (let i = 0; i < plateScannerNodes.length; i++) {
        plateScannerNodes[i].position.x = scanX;
      }
    } else if (activePlate === 'animFlameBorder') {
      if (plateFlameAccentMat) {
        const pulse = 0.5 + 0.5 * Math.sin(timeSec * 9.5);
        _fxColor.setHSL(0.03 + pulse * 0.06, 0.98, 0.52);
        plateFlameAccentMat.emissive.copy(_fxColor);
        plateFlameAccentMat.emissiveIntensity = 1.65 + pulse * 1.25;
      }
      for (let i = 0; i < plateFlameFins.length; i++) {
        const fin = plateFlameFins[i];
        fin.scale.y = 0.8 + 0.42 * Math.sin(timeSec * 14 + i * 1.3);
      }
    } else if (activePlate === 'animHoloPrism') {
      if (plateHoloMat) {
        _fxColor.setHSL((timeSec * 0.28) % 1, 0.96, 0.62);
        plateHoloMat.color.copy(_fxColor);
        plateHoloMat.emissive.copy(_fxColor);
        plateHoloMat.emissiveIntensity = 1.85 + Math.sin(timeSec * 3.8) * 0.55;
      }
      const breatheZ = 0.026 + Math.sin(timeSec * 3.1) * 0.008;
      const breatheScale = 1 + Math.sin(timeSec * 2.4) * 0.022;
      for (let i = 0; i < plateHoloRings.length; i++) {
        plateHoloRings[i].position.z = breatheZ;
        plateHoloRings[i].scale.setScalar(breatheScale);
      }
    } else if (activePlate === 'animStealthFlip') {
      const louverTilt = 0.22 + Math.sin(timeSec * 2.1) * 0.24;
      for (let i = 0; i < plateStealthTopLouvers.length; i++) {
        plateStealthTopLouvers[i].rotation.x = -louverTilt;
      }
      for (let i = 0; i < plateStealthBotLouvers.length; i++) {
        plateStealthBotLouvers[i].rotation.x = louverTilt;
      }
      if (plateStealthLedMat) {
        const locked = Math.sin(timeSec * 2.1) > 0.25;
        plateStealthLedMat.color.setHex(locked ? 0xfbbf24 : 0x7dd3fc);
        plateStealthLedMat.emissive.setHex(locked ? 0xf59e0b : 0x38bdf8);
        plateStealthLedMat.emissiveIntensity = 1.8 + Math.sin(timeSec * 6.5) * 0.8;
      }
    }

    if (isAnimatedPlateStyle(activePlate) && timeSec - lastAnimPlateDrawSec >= 0.055) {
      lastAnimPlateDrawSec = timeSec;
      drawLicensePlate(currentPlateText, activePlate, timeSec);
    }

    // 4. Animated Roof Hat Details (Propeller, Fez, Crown, Police Siren, Halo, UFO, Wizard, Flame Mohawk)
    if (hatPropellerGroup) {
      const spinSpeed = 5.5 + Math.max(0, speedMs) * 0.48;
      hatPropellerGroup.rotation.y = (timeSec * spinSpeed) % (Math.PI * 2);
    }
    if (hatFezTasselPivot) {
      const windBlow = THREE.MathUtils.clamp(speedMs * 0.015, 0, 0.72);
      hatFezTasselPivot.rotation.z =
        -steerNorm * 0.35 + Math.sin(timeSec * 6.5) * (0.08 + windBlow * 0.14);
      hatFezTasselPivot.rotation.x =
        windBlow + Math.cos(timeSec * 5.2) * 0.06;
    }
    if (hatCrownGemMats.length > 0) {
      const glint = 0.85 + Math.sin(timeSec * 4.2) * 0.4;
      for (let i = 0; i < hatCrownGemMats.length; i++) {
        hatCrownGemMats[i].emissiveIntensity = glint;
      }
    }
    if (hatPoliceRedMat && hatPoliceBlueMat) {
      const phase = (timeSec * 6.8) % 2;
      const redFlash = phase < 1 && ((phase < 0.3) || (phase > 0.45 && phase < 0.75));
      const blueFlash = phase >= 1 && ((phase < 1.3) || (phase > 1.45 && phase < 1.75));
      hatPoliceRedMat.emissiveIntensity = redFlash ? 3.8 : 0.25;
      hatPoliceBlueMat.emissiveIntensity = blueFlash ? 3.8 : 0.25;
    }
    if (hatHoverGroup) {
      hatHoverGroup.position.y = hatHoverBaseY + Math.sin(timeSec * 3.1) * 0.042;
      if (hatHaloMat) {
        hatHoverGroup.rotation.z = Math.sin(timeSec * 1.8) * 0.08;
        hatHaloMat.emissiveIntensity = 1.9 + Math.sin(timeSec * 4.2) * 0.65;
      }
    }
    if (hatUfoSpinGroup) {
      hatUfoSpinGroup.rotation.y = (timeSec * 2.6) % (Math.PI * 2);
      const activeIdx = Math.floor(timeSec * 10) % Math.max(1, hatUfoLightMats.length);
      for (let i = 0; i < hatUfoLightMats.length; i++) {
        hatUfoLightMats[i].emissiveIntensity =
          i === activeIdx || (i + 4) % hatUfoLightMats.length === activeIdx ? 3.4 : 0.8;
      }
    }
    if (hatOrbitGroup) {
      hatOrbitGroup.rotation.y = (timeSec * 2.4) % (Math.PI * 2);
      hatOrbitGroup.rotation.z = Math.sin(timeSec * 1.7) * 0.14;
    }
    if (hatFlameSpikes.length > 0) {
      for (let i = 0; i < hatFlameSpikes.length; i++) {
        const sp = hatFlameSpikes[i];
        const arch = 1 - Math.abs(i - 3) * 0.12;
        const flicker = 0.84 + 0.34 * Math.sin(timeSec * 13.5 + i * 1.15);
        sp.scale.y = arch * flicker;
        sp.rotation.x = 0.22 + THREE.MathUtils.clamp(speedMs * 0.006, 0, 0.38);
      }
    }
  };

  return {
    root,
    chassisGroup,
    paintMaterial,
    tailLightMaterial,
    headLightMaterial,
    frontLeftPivot: fl.pivot,
    frontRightPivot: fr.pivot,
    wheelSpinGroups,
    headLightSpots: [spotL, spotR],
    headLightTargets: [targetL, targetR],
    flameMeshes,
    setLicensePlate: (text: string) => {
      if (text === currentPlateText) return;
      drawLicensePlate(text, currentCustom.plateStyle ?? 'classic');
    },
    setWheelConfig,
    setPaintColor,
    setCustomConfig,
    setHeadlightGlowScale,
    updateEffects,
    dispose: () => {
      clearRoofHat();
      clearPlateFrame3D();
      plateTexture.dispose();
      activeLiveryTex?.dispose();
      activeLiveryEmissiveTex?.dispose();
      textures.forEach((t) => t.dispose());
      rimGeos.forEach((g) => g.dispose());
      customGeos.forEach((g) => g.dispose());
      customMats.forEach((m) => m.dispose());
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}

export function createCockpitRig(initialHex: number): CockpitRig {
  const root = new THREE.Group();
  const cabinOffset = new THREE.Group();
  root.add(cabinOffset);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const paintMaterial = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: initialHex,
      metalness: 0.78,
      roughness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.045,
      envMapIntensity: 1.6,
    }),
  );

  const dashMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x121318,
      roughness: 0.84,
      metalness: 0.14,
    }),
  );

  const trimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x27272e,
      roughness: 0.45,
      metalness: 0.5,
    }),
  );

  const metalMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      roughness: 0.2,
      metalness: 0.88,
    }),
  );

  const accentMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
  const rpmBarMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
  const nitroBarMat = trackMat(new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));

  // Sculpted hard-creased hood visible out the windshield
  const hoodGeo = trackGeo(
    buildSculptedBodyGeometry(
      [
        { z: -1.94, bottomY: -0.39, bottomHalfW: 0.56, rockerY: -0.36, rockerHalfW: 0.58, beltY: -0.35, beltHalfW: 0.56, shoulderY: -0.34, shoulderHalfW: 0.48, crownY: -0.33 },
        { z: -0.92, bottomY: -0.36, bottomHalfW: 0.62, rockerY: -0.32, rockerHalfW: 0.64, beltY: -0.3, beltHalfW: 0.62, shoulderY: -0.29, shoulderHalfW: 0.54, crownY: -0.275 },
      ],
      { subdivisions: 2, hoodRidge: 0.018, creaseAngleDeg: 30 },
    ),
  );
  cabinOffset.add(new THREE.Mesh(hoodGeo, paintMaterial));

  const mirrorStemGeo = trackGeo(new THREE.BoxGeometry(0.08, 0.03, 0.04));
  const mirrorHeadGeo = trackGeo(new THREE.BoxGeometry(0.11, 0.065, 0.06));
  for (const sx of [-1, 1]) {
    const stem = new THREE.Mesh(mirrorStemGeo, trimMat);
    stem.position.set(sx * 0.56, -0.22, -0.96);
    cabinOffset.add(stem);

    const mHead = new THREE.Mesh(mirrorHeadGeo, paintMaterial);
    mHead.position.set(sx * 0.62, -0.2, -0.95);
    mHead.rotation.y = sx * -0.18;
    cabinOffset.add(mHead);
  }

  const dash = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.56, 0.22, 0.36)),
    dashMat,
  );
  dash.position.set(0, -0.37, -0.82);
  cabinOffset.add(dash);

  const cowl = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.42, 0.13, 0.2)),
    trimMat,
  );
  cowl.position.set(0, -0.205, -0.76);
  cabinOffset.add(cowl);

  const cluster = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.32, 0.08, 0.02)),
    dashMat,
  );
  cluster.position.set(0, -0.21, -0.655);
  cabinOffset.add(cluster);

  const barBgGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.012, 0.008));
  const rpmBg = new THREE.Mesh(barBgGeo, trimMat);
  rpmBg.position.set(0, -0.192, -0.644);
  cabinOffset.add(rpmBg);

  const barGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.012, 0.008));
  const rpmBar = new THREE.Mesh(barGeo, rpmBarMat);
  rpmBar.position.set(0, -0.192, -0.638);
  cabinOffset.add(rpmBar);

  const nitroBg = new THREE.Mesh(barBgGeo, trimMat);
  nitroBg.position.set(0, -0.218, -0.644);
  cabinOffset.add(nitroBg);

  const nitroBar = new THREE.Mesh(barGeo, nitroBarMat);
  nitroBar.position.set(0, -0.218, -0.638);
  cabinOffset.add(nitroBar);

  // Steering column connecting back of wheel hub cleanly into the dashboard
  const steeringColumn = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.022, 0.034, 0.142, 12)),
    trimMat,
  );
  steeringColumn.position.set(0, -0.266, -0.586);
  steeringColumn.rotation.x = Math.PI / 2 - 0.24;
  cabinOffset.add(steeringColumn);

  const wheelGroup = new THREE.Group();
  wheelGroup.position.set(0, -0.245, -0.5);
  wheelGroup.rotation.x = -0.24;
  cabinOffset.add(wheelGroup);

  // Dynamic Steering Wheel Builder (17 distinct styles + live RPM Shift LEDs & animations)
  const wheelDynamicGeos: THREE.BufferGeometry[] = [];
  const wheelDynamicMats: THREE.Material[] = [];
  let shiftLedMats: THREE.MeshBasicMaterial[] = [];
  let neoSpokeMat: THREE.MeshStandardMaterial | null = null;
  let wheelPulseMat: THREE.MeshStandardMaterial | null = null;
  let wheelRgbMat: THREE.MeshStandardMaterial | null = null;
  let wheelHoloSpinGroup: THREE.Group | null = null;
  let wheelRadarBarMat: THREE.MeshStandardMaterial | null = null;
  let currentWheelStyle: SteeringWheelId | null = null;

  const trackWGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    wheelDynamicGeos.push(g);
    return g;
  };
  const trackWMat = <T extends THREE.Material>(m: T): T => {
    wheelDynamicMats.push(m);
    return m;
  };

  const clearSteeringWheel = (): void => {
    while (wheelGroup.children.length > 0) {
      wheelGroup.remove(wheelGroup.children[0]);
    }
    wheelDynamicGeos.forEach((g) => g.dispose());
    wheelDynamicGeos.length = 0;
    wheelDynamicMats.forEach((m) => m.dispose());
    wheelDynamicMats.length = 0;
    shiftLedMats = [];
    neoSpokeMat = null;
    wheelPulseMat = null;
    wheelRgbMat = null;
    wheelHoloSpinGroup = null;
    wheelRadarBarMat = null;
  };

  const setSteeringWheel = (style: SteeringWheelId): void => {
    if (currentWheelStyle === style) return;
    currentWheelStyle = style;
    clearSteeringWheel();

    const hubGeo = trackWGeo(new THREE.CylinderGeometry(0.036, 0.038, 0.026, 18));
    hubGeo.rotateX(Math.PI / 2);

    if (style === 'stock') {
      wheelGroup.add(
        new THREE.Mesh(
          trackWGeo(new THREE.TorusGeometry(0.135, 0.016, 12, 32)),
          dashMat,
        ),
      );
      const topMarker = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.018, 0.034, 0.034)),
        accentMat,
      );
      topMarker.position.set(0, 0.135, 0);
      wheelGroup.add(topMarker);
      wheelGroup.add(new THREE.Mesh(hubGeo, trimMat));

      const horizSpoke = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.24, 0.02, 0.012)),
        metalMat,
      );
      horizSpoke.position.set(0, -0.005, -0.002);
      wheelGroup.add(horizSpoke);

      const vertSpoke = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.024, 0.125, 0.012)),
        metalMat,
      );
      vertSpoke.position.set(0, -0.068, -0.002);
      wheelGroup.add(vertSpoke);
    } else if (style === 'wood') {
      const walnutMat = trackWMat(
        new THREE.MeshPhysicalMaterial({
          color: 0x8b4513,
          roughness: 0.18,
          metalness: 0.08,
          clearcoat: 1.0,
          clearcoatRoughness: 0.06,
        }),
      );
      const chromeSpokeMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0xf4f4f5,
          roughness: 0.12,
          metalness: 0.96,
        }),
      );
      const rivetMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          roughness: 0.25,
          metalness: 0.9,
        }),
      );

      // Thin vintage varnished wood rim
      wheelGroup.add(
        new THREE.Mesh(
          trackWGeo(new THREE.TorusGeometry(0.138, 0.0135, 12, 36)),
          walnutMat,
        ),
      );

      // 3 classic slotted chrome spokes
      const holeGeo = trackWGeo(new THREE.CylinderGeometry(0.007, 0.007, 0.014, 10));
      holeGeo.rotateX(Math.PI / 2);
      for (const ang of [Math.PI * 0.08, Math.PI - Math.PI * 0.08, -Math.PI * 0.5]) {
        const spGroup = new THREE.Group();
        spGroup.rotation.z = ang;
        const bar = new THREE.Mesh(
          trackWGeo(new THREE.BoxGeometry(0.128, 0.022, 0.009)),
          chromeSpokeMat,
        );
        bar.position.set(0.066, 0, -0.003);
        spGroup.add(bar);
        for (const hx of [0.058, 0.086, 0.11]) {
          const dot = new THREE.Mesh(holeGeo, dashMat);
          dot.position.set(hx, 0, -0.002);
          spGroup.add(dot);
        }
        wheelGroup.add(spGroup);
      }

      wheelGroup.add(new THREE.Mesh(hubGeo, chromeSpokeMat));
      const badge = new THREE.Mesh(
        trackWGeo(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 16)),
        rivetMat,
      );
      badge.rotation.x = Math.PI / 2;
      wheelGroup.add(badge);
    } else if (style === 'alcantara') {
      const suedeMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0x16161b,
          roughness: 0.96,
          metalness: 0.02,
        }),
      );
      const darkAnodizedMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0x22222a,
          roughness: 0.35,
          metalness: 0.72,
        }),
      );
      const redBandMat = trackWMat(
        new THREE.MeshBasicMaterial({ color: 0xef4444 }),
      );

      // Thick deep-dish suede rim
      const rim = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.136, 0.0185, 12, 34)),
        suedeMat,
      );
      rim.position.z = 0.022;
      wheelGroup.add(rim);

      // Red 12 o'clock center stripe
      const stripe = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.02, 0.038, 0.04)),
        redBandMat,
      );
      stripe.position.set(0, 0.136, 0.022);
      wheelGroup.add(stripe);

      // Deep-dish angled spokes sloping back into the recessed hub
      for (const sx of [-1, 1]) {
        const spoke = new THREE.Mesh(
          trackWGeo(new THREE.BoxGeometry(0.118, 0.024, 0.011)),
          darkAnodizedMat,
        );
        spoke.position.set(sx * 0.064, -0.008, 0.006);
        spoke.rotation.y = -sx * 0.24;
        wheelGroup.add(spoke);
      }
      const botSpoke = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.028, 0.122, 0.011)),
        darkAnodizedMat,
      );
      botSpoke.position.set(0, -0.068, 0.006);
      botSpoke.rotation.x = -0.24;
      wheelGroup.add(botSpoke);

      const hub = new THREE.Mesh(hubGeo, darkAnodizedMat);
      hub.position.z = -0.006;
      wheelGroup.add(hub);

      const redRing = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.026, 0.004, 8, 20)),
        redBandMat,
      );
      redRing.position.z = 0.009;
      wheelGroup.add(redRing);
    } else if (style === 'carbonD') {
      const carbonRimMat = trackWMat(
        new THREE.MeshPhysicalMaterial({
          color: 0x1c1f26,
          roughness: 0.22,
          metalness: 0.55,
          clearcoat: 1.0,
          clearcoatRoughness: 0.06,
        }),
      );
      const gripMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0x121318,
          roughness: 0.86,
          metalness: 0.06,
        }),
      );
      const redAccentMat = trackWMat(
        new THREE.MeshBasicMaterial({ color: 0xf43f5e }),
      );

      // Flat-bottom D-shaped upper arc (270 deg) + straight flat carbon bottom bar
      const upperArc = new THREE.Mesh(
        trackWGeo(
          new THREE.TorusGeometry(
            0.136,
            0.017,
            12,
            30,
            Math.PI * 1.44,
          ),
        ),
        carbonRimMat,
      );
      upperArc.rotation.z = -Math.PI * 0.22;
      wheelGroup.add(upperArc);

      const flatBottom = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.206, 0.024, 0.028)),
        carbonRimMat,
      );
      flatBottom.position.set(0, -0.108, 0);
      wheelGroup.add(flatBottom);

      // Ergonomic side thumb bolsters
      for (const sx of [-1, 1]) {
        const bolster = new THREE.Mesh(
          trackWGeo(new THREE.CapsuleGeometry(0.021, 0.055, 6, 12)),
          gripMat,
        );
        bolster.position.set(sx * 0.132, 0.02, 0.004);
        bolster.rotation.z = sx * 0.12;
        wheelGroup.add(bolster);
      }

      // Sculpted carbon spokes
      const hSpoke = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.24, 0.026, 0.014)),
        carbonRimMat,
      );
      hSpoke.position.set(0, -0.008, -0.002);
      wheelGroup.add(hSpoke);

      const bSpoke = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.036, 0.095, 0.014)),
        carbonRimMat,
      );
      bSpoke.position.set(0, -0.058, -0.002);
      wheelGroup.add(bSpoke);

      wheelGroup.add(new THREE.Mesh(hubGeo, carbonRimMat));
      const hRing = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.028, 0.0035, 8, 20)),
        redAccentMat,
      );
      hRing.position.z = 0.014;
      wheelGroup.add(hRing);

      // Crisp motorsport red 12-o'clock top alignment band
      const topMarker = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.022, 0.024, 0.038)),
        redAccentMat,
      );
      topMarker.position.set(0, 0.135, 0);
      wheelGroup.add(topMarker);
    } else if (style === 'driftNeo') {
      const gripMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0x1e1b4b,
          roughness: 0.72,
          metalness: 0.25,
        }),
      );
      const neoMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0x22d3ee,
          emissive: 0x9333ea,
          emissiveIntensity: 0.45,
          roughness: 0.16,
          metalness: 0.94,
        }),
      );
      neoSpokeMat = neoMat;
      const pinkMarker = trackWMat(
        new THREE.MeshBasicMaterial({ color: 0xec4899 }),
      );

      wheelGroup.add(
        new THREE.Mesh(
          trackWGeo(new THREE.TorusGeometry(0.138, 0.0165, 12, 34)),
          gripMat,
        ),
      );
      const innerNeonRing = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.123, 0.004, 8, 32)),
        neoMat,
      );
      innerNeonRing.position.z = 0.008;
      wheelGroup.add(innerNeonRing);

      const topMark = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.022, 0.036, 0.036)),
        pinkMarker,
      );
      topMark.position.set(0, 0.138, 0);
      wheelGroup.add(topMark);

      // 3 deep-dish neo-chrome spokes
      for (const ang of [0, Math.PI, -Math.PI / 2]) {
        const grp = new THREE.Group();
        grp.rotation.z = ang;
        const sp = new THREE.Mesh(
          trackWGeo(new THREE.BoxGeometry(0.125, 0.024, 0.011)),
          neoMat,
        );
        sp.position.set(0.064, 0, -0.003);
        grp.add(sp);
        wheelGroup.add(grp);
      }
      // Tall quick-release hub collar
      const qrHub = new THREE.Mesh(
        trackWGeo(new THREE.CylinderGeometry(0.04, 0.042, 0.045, 18)),
        neoMat,
      );
      qrHub.rotation.x = Math.PI / 2;
      qrHub.position.z = -0.008;
      wheelGroup.add(qrHub);
    } else if (style === 'f1Yoke') {
      const f1CarbonMat = trackWMat(
        new THREE.MeshPhysicalMaterial({
          color: 0x14171f,
          roughness: 0.24,
          metalness: 0.45,
          clearcoat: 0.85,
        }),
      );
      const gripMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0x0f1014,
          roughness: 0.9,
          metalness: 0.05,
        }),
      );
      const screenMat = trackWMat(
        new THREE.MeshBasicMaterial({ color: 0x0ea5e9 }),
      );

      // Main Formula 1 butterfly chassis plate
      const plate = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.245, 0.135, 0.022)),
        f1CarbonMat,
      );
      plate.position.set(0, -0.005, 0);
      wheelGroup.add(plate);

      // Sculpted vertical side handles (left & right grips)
      for (const sx of [-1, 1]) {
        const handle = new THREE.Mesh(
          trackWGeo(new THREE.CapsuleGeometry(0.022, 0.105, 8, 14)),
          gripMat,
        );
        handle.position.set(sx * 0.135, -0.005, 0.004);
        wheelGroup.add(handle);

        const guardTop = new THREE.Mesh(
          trackWGeo(new THREE.BoxGeometry(0.048, 0.022, 0.022)),
          f1CarbonMat,
        );
        guardTop.position.set(sx * 0.115, 0.062, 0);
        wheelGroup.add(guardTop);

        const guardBot = new THREE.Mesh(
          trackWGeo(new THREE.BoxGeometry(0.048, 0.022, 0.022)),
          f1CarbonMat,
        );
        guardBot.position.set(sx * 0.115, -0.072, 0);
        wheelGroup.add(guardBot);
      }

      // Central telemetry screen bezel + glowing screen
      const bezel = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.11, 0.052, 0.008)),
        dashMat,
      );
      bezel.position.set(0, 0.02, 0.013);
      wheelGroup.add(bezel);

      const screen = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.096, 0.038, 0.004)),
        screenMat,
      );
      screen.position.set(0, 0.02, 0.017);
      wheelGroup.add(screen);

      // Colorful F1 rotary knobs & DRS/Pit buttons
      const btnColors = [0xef4444, 0x22c55e, 0xfacc15, 0x3b82f6, 0xf97316, 0xa855f7];
      const btnPositions: [number, number][] = [
        [-0.088, 0.03],
        [-0.088, -0.01],
        [-0.048, -0.038],
        [0.088, 0.03],
        [0.088, -0.01],
        [0.048, -0.038],
      ];
      const btnGeo = trackWGeo(new THREE.CylinderGeometry(0.01, 0.01, 0.012, 10));
      btnGeo.rotateX(Math.PI / 2);
      for (let i = 0; i < btnColors.length; i++) {
        const b = new THREE.Mesh(
          btnGeo,
          trackWMat(new THREE.MeshBasicMaterial({ color: btnColors[i] })),
        );
        b.position.set(btnPositions[i][0], btnPositions[i][1], 0.014);
        wheelGroup.add(b);
      }

      // 9 Live RPM Shift LEDs across top brow
      const ledGeo = trackWGeo(new THREE.BoxGeometry(0.011, 0.008, 0.008));
      for (let i = 0; i < 9; i++) {
        const lMat = trackWMat(new THREE.MeshBasicMaterial({ color: 0x1f2937 }));
        shiftLedMats.push(lMat);
        const lx = -0.064 + i * 0.016;
        const led = new THREE.Mesh(ledGeo, lMat);
        led.position.set(lx, 0.056, 0.015);
        wheelGroup.add(led);
      }
    } else if (style === 'goldVip') {
      const creamLeatherMat = trackWMat(
        new THREE.MeshPhysicalMaterial({
          color: 0xfef3c7,
          roughness: 0.48,
          metalness: 0.04,
          clearcoat: 0.35,
        }),
      );
      const goldMat = trackWMat(
        new THREE.MeshPhysicalMaterial({
          color: 0xf59e0b,
          roughness: 0.16,
          metalness: 0.95,
          clearcoat: 0.9,
        }),
      );
      const emeraldMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0x10b981,
          emissive: 0x059669,
          emissiveIntensity: 0.85,
          roughness: 0.14,
          metalness: 0.4,
        }),
      );

      wheelGroup.add(
        new THREE.Mesh(
          trackWGeo(new THREE.TorusGeometry(0.136, 0.017, 12, 34)),
          creamLeatherMat,
        ),
      );
      const goldTrimRing = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.121, 0.0045, 8, 34)),
        goldMat,
      );
      goldTrimRing.position.z = 0.006;
      wheelGroup.add(goldTrimRing);

      const hSpoke = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.242, 0.024, 0.013)),
        goldMat,
      );
      hSpoke.position.set(0, -0.006, -0.002);
      wheelGroup.add(hSpoke);

      const vSpoke = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.028, 0.125, 0.013)),
        goldMat,
      );
      vSpoke.position.set(0, -0.068, -0.002);
      wheelGroup.add(vSpoke);

      wheelGroup.add(new THREE.Mesh(hubGeo, goldMat));
      const jewel = new THREE.Mesh(
        trackWGeo(new THREE.OctahedronGeometry(0.019, 0)),
        emeraldMat,
      );
      jewel.position.set(0, 0, 0.016);
      wheelGroup.add(jewel);
    } else if (style === 'rallyDish') {
      const suedeMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.96, metalness: 0.04 }),
      );
      const blueAlumMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.3, metalness: 0.78 }),
      );
      const yellowTapeMat = trackWMat(new THREE.MeshBasicMaterial({ color: 0xfacc15 }));

      const rim = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.136, 0.0185, 12, 34)),
        suedeMat,
      );
      rim.position.z = 0.02;
      wheelGroup.add(rim);

      // Thick yellow WRC 12 o'clock centering tape
      const topTape = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.024, 0.039, 0.04)),
        yellowTapeMat,
      );
      topTape.position.set(0, 0.136, 0.02);
      wheelGroup.add(topTape);

      for (const sx of [-1, 1]) {
        const sp = new THREE.Mesh(
          trackWGeo(new THREE.BoxGeometry(0.118, 0.025, 0.011)),
          blueAlumMat,
        );
        sp.position.set(sx * 0.064, -0.008, 0.006);
        sp.rotation.y = -sx * 0.22;
        wheelGroup.add(sp);
      }
      const bSp = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.028, 0.122, 0.011)),
        blueAlumMat,
      );
      bSp.position.set(0, -0.068, 0.006);
      bSp.rotation.x = -0.22;
      wheelGroup.add(bSp);

      const hub = new THREE.Mesh(hubGeo, blueAlumMat);
      hub.position.z = -0.004;
      wheelGroup.add(hub);

      const hornBtn = new THREE.Mesh(
        trackWGeo(new THREE.CylinderGeometry(0.02, 0.02, 0.012, 16)),
        yellowTapeMat,
      );
      hornBtn.rotation.x = Math.PI / 2;
      hornBtn.position.z = 0.008;
      wheelGroup.add(hornBtn);
    } else if (style === 'retroChain') {
      // Lowrider Chrome Welded-Link Chain Steering Wheel
      const chromeChainMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0xf4f4f5,
          roughness: 0.1,
          metalness: 0.98,
        }),
      );
      const linkGeo = trackWGeo(new THREE.TorusGeometry(0.017, 0.0055, 8, 16));
      const links = 22;
      for (let i = 0; i < links; i++) {
        const a = (i / links) * Math.PI * 2;
        const link = new THREE.Mesh(linkGeo, chromeChainMat);
        link.position.set(Math.cos(a) * 0.134, Math.sin(a) * 0.134, 0.005);
        link.rotation.z = a + Math.PI / 2;
        link.rotation.x = i % 2 === 0 ? 0.35 : -0.35;
        wheelGroup.add(link);
      }
      // 3 welded chain spokes
      for (const ang of [Math.PI * 0.05, Math.PI - Math.PI * 0.05, -Math.PI * 0.5]) {
        const g = new THREE.Group();
        g.rotation.z = ang;
        for (let k = 0; k < 3; k++) {
          const sl = new THREE.Mesh(linkGeo, chromeChainMat);
          sl.position.set(0.048 + k * 0.028, 0, -0.002);
          sl.rotation.x = k % 2 === 0 ? 0.45 : -0.45;
          g.add(sl);
        }
        wheelGroup.add(g);
      }
      wheelGroup.add(new THREE.Mesh(hubGeo, chromeChainMat));
    } else if (style === 'woodenBoat') {
      // Nautical Captain's Teak Helm with brass ring & 8 wooden peg handles
      const teakMat = trackWMat(
        new THREE.MeshPhysicalMaterial({
          color: 0x7c3a14,
          roughness: 0.24,
          metalness: 0.06,
          clearcoat: 0.85,
        }),
      );
      const brassMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0xd97706,
          roughness: 0.22,
          metalness: 0.92,
        }),
      );

      wheelGroup.add(
        new THREE.Mesh(
          trackWGeo(new THREE.TorusGeometry(0.116, 0.015, 10, 32)),
          teakMat,
        ),
      );
      const brassRing = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.104, 0.0045, 8, 30)),
        brassMat,
      );
      brassRing.position.z = 0.008;
      wheelGroup.add(brassRing);

      const pegGeo = trackWGeo(new THREE.CylinderGeometry(0.007, 0.0095, 0.145, 10));
      const knobGeo = trackWGeo(new THREE.SphereGeometry(0.011, 10, 8));
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const pegGrp = new THREE.Group();
        pegGrp.rotation.z = a;
        const peg = new THREE.Mesh(pegGeo, teakMat);
        peg.position.set(0, 0.088, 0);
        pegGrp.add(peg);
        const knob = new THREE.Mesh(knobGeo, brassMat);
        knob.position.set(0, 0.158, 0);
        pegGrp.add(knob);
        wheelGroup.add(pegGrp);
      }
      wheelGroup.add(new THREE.Mesh(hubGeo, brassMat));
    } else if (style === 'camoTactical') {
      const oliveMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.85, metalness: 0.15 }),
      );
      const matteDarkMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.88, metalness: 0.28 }),
      );
      const sandMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.82, metalness: 0.1 }),
      );

      wheelGroup.add(
        new THREE.Mesh(
          trackWGeo(new THREE.TorusGeometry(0.136, 0.019, 10, 28)),
          oliveMat,
        ),
      );
      // Heavy ribbed grip segments
      const gripGeo = trackWGeo(new THREE.BoxGeometry(0.028, 0.022, 0.042));
      for (const a of [0, 0.7, 2.45, 3.14, 3.85, 5.55]) {
        const seg = new THREE.Mesh(gripGeo, a === 0 ? sandMat : matteDarkMat);
        seg.position.set(Math.sin(a) * 0.136, Math.cos(a) * 0.136, 0);
        seg.rotation.z = -a;
        wheelGroup.add(seg);
      }
      // 4 rugged armored spokes
      for (const ang of [Math.PI * 0.16, Math.PI * 0.84, -Math.PI * 0.26, -Math.PI * 0.74]) {
        const g = new THREE.Group();
        g.rotation.z = ang;
        const sp = new THREE.Mesh(
          trackWGeo(new THREE.BoxGeometry(0.118, 0.024, 0.015)),
          matteDarkMat,
        );
        sp.position.set(0.062, 0, -0.002);
        g.add(sp);
        wheelGroup.add(g);
      }
      wheelGroup.add(new THREE.Mesh(hubGeo, matteDarkMat));
      const boltGeo = trackWGeo(new THREE.CylinderGeometry(0.004, 0.004, 0.012, 6));
      boltGeo.rotateX(Math.PI / 2);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const b = new THREE.Mesh(boltGeo, sandMat);
        b.position.set(Math.cos(a) * 0.025, Math.sin(a) * 0.025, 0.01);
        wheelGroup.add(b);
      }
    } else if (style === 'marbleLux') {
      const marbleMat = trackWMat(
        new THREE.MeshPhysicalMaterial({
          color: 0xf8fafc,
          roughness: 0.12,
          metalness: 0.05,
          clearcoat: 1.0,
          clearcoatRoughness: 0.04,
        }),
      );
      const roseGoldMat = trackWMat(
        new THREE.MeshPhysicalMaterial({
          color: 0xf4a261,
          roughness: 0.16,
          metalness: 0.92,
          clearcoat: 0.8,
        }),
      );
      const veinMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.2 }),
      );

      wheelGroup.add(
        new THREE.Mesh(
          trackWGeo(new THREE.TorusGeometry(0.136, 0.0175, 14, 36)),
          marbleMat,
        ),
      );
      // Marble silver vein accents
      const veinGeo = trackWGeo(new THREE.TorusGeometry(0.136, 0.0182, 8, 12, 0.28));
      for (const a of [0.5, 2.2, 4.1]) {
        const v = new THREE.Mesh(veinGeo, veinMat);
        v.rotation.z = a;
        wheelGroup.add(v);
      }
      const innerRose = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.12, 0.004, 8, 34)),
        roseGoldMat,
      );
      innerRose.position.z = 0.007;
      wheelGroup.add(innerRose);

      const hSpoke = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.24, 0.022, 0.012)),
        roseGoldMat,
      );
      hSpoke.position.set(0, -0.006, -0.002);
      wheelGroup.add(hSpoke);

      const vSpoke = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.026, 0.124, 0.012)),
        roseGoldMat,
      );
      vSpoke.position.set(0, -0.068, -0.002);
      wheelGroup.add(vSpoke);

      wheelGroup.add(new THREE.Mesh(hubGeo, marbleMat));
      const crestRing = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.026, 0.004, 8, 20)),
        roseGoldMat,
      );
      crestRing.position.z = 0.014;
      wheelGroup.add(crestRing);
    } else if (style === 'cyberTron') {
      // Animated Cyber Tron Wheel with pulsing cyan neon veins + 7 live RPM LEDs
      const obsMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0x090b10, roughness: 0.35, metalness: 0.72 }),
      );
      const tronMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0x22d3ee,
          emissive: 0x06b6d4,
          emissiveIntensity: 1.9,
          roughness: 0.14,
          metalness: 0.35,
        }),
      );
      wheelPulseMat = tronMat;

      wheelGroup.add(
        new THREE.Mesh(
          trackWGeo(new THREE.TorusGeometry(0.136, 0.017, 12, 34)),
          obsMat,
        ),
      );
      const neonOuter = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.136, 0.0055, 8, 34)),
        tronMat,
      );
      neonOuter.position.z = 0.014;
      wheelGroup.add(neonOuter);

      const neonInner = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.118, 0.0045, 8, 32)),
        tronMat,
      );
      neonInner.position.z = 0.006;
      wheelGroup.add(neonInner);

      for (const ang of [0, Math.PI, -Math.PI / 2]) {
        const g = new THREE.Group();
        g.rotation.z = ang;
        const sp = new THREE.Mesh(
          trackWGeo(new THREE.BoxGeometry(0.118, 0.024, 0.012)),
          obsMat,
        );
        sp.position.set(0.06, 0, -0.002);
        g.add(sp);
        const line = new THREE.Mesh(
          trackWGeo(new THREE.BoxGeometry(0.106, 0.006, 0.016)),
          tronMat,
        );
        line.position.set(0.062, 0, 0.001);
        g.add(line);
        wheelGroup.add(g);
      }

      wheelGroup.add(new THREE.Mesh(hubGeo, obsMat));
      const hubRing = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.026, 0.0045, 8, 20)),
        tronMat,
      );
      hubRing.position.z = 0.014;
      wheelGroup.add(hubRing);
    } else if (style === 'magmaCore') {
      // Animated Volcanic Obsidian Wheel with pulsing molten lava veins + 7 live RPM LEDs
      const basaltMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0x181414, roughness: 0.78, metalness: 0.35 }),
      );
      const lavaMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0xf97316,
          emissive: 0xea580c,
          emissiveIntensity: 2.0,
          roughness: 0.18,
        }),
      );
      wheelPulseMat = lavaMat;

      wheelGroup.add(
        new THREE.Mesh(
          trackWGeo(new THREE.TorusGeometry(0.136, 0.018, 12, 30)),
          basaltMat,
        ),
      );
      const lavaRing = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.123, 0.005, 8, 30)),
        lavaMat,
      );
      lavaRing.position.z = 0.01;
      wheelGroup.add(lavaRing);

      for (const ang of [Math.PI * 0.1, Math.PI * 0.9, -Math.PI * 0.5]) {
        const g = new THREE.Group();
        g.rotation.z = ang;
        const sp = new THREE.Mesh(
          trackWGeo(new THREE.BoxGeometry(0.122, 0.028, 0.013)),
          basaltMat,
        );
        sp.position.set(0.062, 0, -0.002);
        g.add(sp);
        const crack = new THREE.Mesh(
          trackWGeo(new THREE.BoxGeometry(0.11, 0.008, 0.017)),
          lavaMat,
        );
        crack.position.set(0.062, 0, 0.001);
        g.add(crack);
        wheelGroup.add(g);
      }

      wheelGroup.add(new THREE.Mesh(hubGeo, basaltMat));
      const coreOrb = new THREE.Mesh(
        trackWGeo(new THREE.SphereGeometry(0.022, 12, 10)),
        lavaMat,
      );
      coreOrb.position.z = 0.008;
      wheelGroup.add(coreOrb);
    } else if (style === 'stealthJet') {
      // Animated Fighter Jet Dual-Horn Yoke + pulsing emerald radar bar + 7 live RPM LEDs
      const stealthMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0x181c22, roughness: 0.42, metalness: 0.68 }),
      );
      const gripMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0x0f1115, roughness: 0.92, metalness: 0.06 }),
      );
      const radarMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0x4ade80,
          emissive: 0x22c55e,
          emissiveIntensity: 2.0,
          roughness: 0.15,
        }),
      );
      const triggerRedMat = trackWMat(new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      wheelRadarBarMat = radarMat;

      // Central U-shaped angular avionics body
      const body = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.22, 0.095, 0.022)),
        stealthMat,
      );
      body.position.set(0, -0.022, 0);
      wheelGroup.add(body);

      // Swept dual fighter-jet control horns
      for (const sx of [-1, 1]) {
        const horn = new THREE.Mesh(
          trackWGeo(new THREE.CapsuleGeometry(0.022, 0.115, 8, 12)),
          gripMat,
        );
        horn.position.set(sx * 0.128, 0.024, 0.005);
        horn.rotation.z = sx * -0.18;
        wheelGroup.add(horn);

        const trigger = new THREE.Mesh(
          trackWGeo(new THREE.CylinderGeometry(0.009, 0.009, 0.016, 10)),
          triggerRedMat,
        );
        trigger.rotation.x = Math.PI / 2;
        trigger.position.set(sx * 0.122, 0.068, 0.018);
        wheelGroup.add(trigger);
      }

      // Avionics HUD radar display
      const hudFrame = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.115, 0.048, 0.008)),
        dashMat,
      );
      hudFrame.position.set(0, -0.018, 0.013);
      wheelGroup.add(hudFrame);

      const radarBar = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.096, 0.026, 0.004)),
        radarMat,
      );
      radarBar.position.set(0, -0.018, 0.018);
      wheelGroup.add(radarBar);
    } else if (style === 'rgbPrismWheel') {
      // Animated Full-Spectrum RGB Cycling Steering Wheel + 9 live RPM LEDs
      const carbonMatW = trackWMat(
        new THREE.MeshPhysicalMaterial({
          color: 0x16181f,
          roughness: 0.2,
          metalness: 0.52,
          clearcoat: 1.0,
        }),
      );
      const rgbMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0xff0080,
          emissive: 0xff0080,
          emissiveIntensity: 2.0,
          roughness: 0.12,
        }),
      );
      wheelRgbMat = rgbMat;

      wheelGroup.add(
        new THREE.Mesh(
          trackWGeo(new THREE.TorusGeometry(0.136, 0.0175, 12, 34)),
          carbonMatW,
        ),
      );
      const rgbRing = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.122, 0.006, 8, 34)),
        rgbMat,
      );
      rgbRing.position.z = 0.011;
      wheelGroup.add(rgbRing);

      const hSpoke = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.24, 0.024, 0.013)),
        carbonMatW,
      );
      hSpoke.position.set(0, -0.006, -0.002);
      wheelGroup.add(hSpoke);

      const bSpoke = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.03, 0.122, 0.013)),
        carbonMatW,
      );
      bSpoke.position.set(0, -0.066, -0.002);
      wheelGroup.add(bSpoke);

      wheelGroup.add(new THREE.Mesh(hubGeo, carbonMatW));
      const hubRgb = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.028, 0.0045, 8, 22)),
        rgbMat,
      );
      hubRgb.position.z = 0.015;
      wheelGroup.add(hubRgb);
    } else if (style === 'hyperHolo') {
      // Animated Futuristic Holographic Wheel with translucent cyan energy arcs + spinning gyro hub + 9 RPM LEDs
      const obsMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0x0b0f19, roughness: 0.25, metalness: 0.85 }),
      );
      const holoMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0ea5e9,
          emissiveIntensity: 2.2,
          transparent: true,
          opacity: 0.78,
          roughness: 0.08,
        }),
      );
      const holoAccentMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0xe879f9,
          emissive: 0xc026d3,
          emissiveIntensity: 2.0,
          roughness: 0.12,
        }),
      );
      wheelPulseMat = holoMat;

      // Translucent top & bottom holo arcs + solid ergonomic side handles
      const topArc = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.136, 0.014, 10, 22, Math.PI * 0.62)),
        holoMat,
      );
      topArc.rotation.z = Math.PI * 0.19;
      wheelGroup.add(topArc);

      const botArc = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.136, 0.014, 10, 22, Math.PI * 0.62)),
        holoMat,
      );
      botArc.rotation.z = Math.PI * 1.19;
      wheelGroup.add(botArc);

      for (const sx of [-1, 1]) {
        const grip = new THREE.Mesh(
          trackWGeo(new THREE.CapsuleGeometry(0.02, 0.09, 8, 12)),
          obsMat,
        );
        grip.position.set(sx * 0.135, 0, 0.004);
        wheelGroup.add(grip);

        const spoke = new THREE.Mesh(
          trackWGeo(new THREE.BoxGeometry(0.09, 0.016, 0.01)),
          obsMat,
        );
        spoke.position.set(sx * 0.082, 0, -0.002);
        wheelGroup.add(spoke);
      }

      // Spinning holographic gyro core at center hub
      wheelGroup.add(new THREE.Mesh(hubGeo, obsMat));
      const spinCore = new THREE.Group();
      spinCore.position.z = 0.016;
      wheelGroup.add(spinCore);
      wheelHoloSpinGroup = spinCore;

      const gyroRing = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.032, 0.0038, 8, 22)),
        holoMat,
      );
      spinCore.add(gyroRing);

      const diamond = new THREE.Mesh(
        trackWGeo(new THREE.OctahedronGeometry(0.014, 0)),
        holoAccentMat,
      );
      spinCore.add(diamond);
    } else if (style === 'levelCarbonPro') {
      // Level 45 Exclusive: Forged Carbon GT Wheel with 24K Gold Top Center Strip & 9 Shift LEDs
      const carbonMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0x16181e, roughness: 0.32, metalness: 0.65 }),
      );
      const goldMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          metalness: 0.92,
          roughness: 0.16,
          emissive: 0xb45309,
          emissiveIntensity: 0.35,
        }),
      );
      const rim = new THREE.Mesh(trackWGeo(new THREE.TorusGeometry(0.136, 0.017, 12, 32)), carbonMat);
      wheelGroup.add(rim);
      const topMark = new THREE.Mesh(trackWGeo(new THREE.BoxGeometry(0.022, 0.024, 0.036)), goldMat);
      topMark.position.set(0, 0.136, 0);
      wheelGroup.add(topMark);
      for (const sx of [-1, 1]) {
        const sp = new THREE.Mesh(trackWGeo(new THREE.BoxGeometry(0.092, 0.02, 0.012)), carbonMat);
        sp.position.set(sx * 0.075, -0.008, -0.004);
        wheelGroup.add(sp);
      }
      const botSp = new THREE.Mesh(trackWGeo(new THREE.BoxGeometry(0.024, 0.088, 0.012)), goldMat);
      botSp.position.set(0, -0.078, -0.004);
      wheelGroup.add(botSp);
      wheelGroup.add(new THREE.Mesh(hubGeo, carbonMat));
      const badge = new THREE.Mesh(trackWGeo(new THREE.OctahedronGeometry(0.016, 0)), goldMat);
      badge.position.z = 0.02;
      wheelGroup.add(badge);
    } else if (style === 'apexEmperorWheel') {
      // Level 92 Exclusive: Crimson & 24K Gold Formula Emperor Yoke
      const bodyMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0x240710, roughness: 0.24, metalness: 0.72 }),
      );
      const goldMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0xfde047,
          metalness: 0.96,
          roughness: 0.12,
          emissive: 0xd97706,
          emissiveIntensity: 0.6,
        }),
      );
      const rubyMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0xf43f5e,
          emissive: 0xe11d48,
          emissiveIntensity: 1.8,
          roughness: 0.14,
        }),
      );
      wheelPulseMat = rubyMat;
      const plate = new THREE.Mesh(trackWGeo(new THREE.BoxGeometry(0.24, 0.11, 0.018)), bodyMat);
      wheelGroup.add(plate);
      const goldBar = new THREE.Mesh(trackWGeo(new THREE.BoxGeometry(0.22, 0.018, 0.022)), goldMat);
      goldBar.position.set(0, 0.056, 0.004);
      wheelGroup.add(goldBar);
      for (const sx of [-1, 1]) {
        const grip = new THREE.Mesh(trackWGeo(new THREE.CapsuleGeometry(0.022, 0.1, 8, 12)), bodyMat);
        grip.position.set(sx * 0.132, 0, 0.004);
        wheelGroup.add(grip);
        const trim = new THREE.Mesh(trackWGeo(new THREE.BoxGeometry(0.008, 0.09, 0.024)), rubyMat);
        trim.position.set(sx * 0.112, 0, 0.008);
        wheelGroup.add(trim);
      }
      const centerGem = new THREE.Mesh(trackWGeo(new THREE.OctahedronGeometry(0.022, 0)), goldMat);
      centerGem.position.z = 0.018;
      wheelGroup.add(centerGem);
    } else if (style === 'leatherRed') {
      // Black perforated leather GT wheel + crimson spokes & top center marker
      const leatherM = trackWMat(new THREE.MeshStandardMaterial({ color: 0x16161a, roughness: 0.72, metalness: 0.12 }));
      const redM = trackWMat(new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.28, metalness: 0.65 }));
      wheelGroup.add(new THREE.Mesh(trackWGeo(new THREE.TorusGeometry(0.136, 0.017, 12, 32)), leatherM));
      const mark = new THREE.Mesh(trackWGeo(new THREE.BoxGeometry(0.022, 0.024, 0.036)), redM);
      mark.position.set(0, 0.136, 0);
      wheelGroup.add(mark);
      for (const sx of [-1, 1]) {
        const sp = new THREE.Mesh(trackWGeo(new THREE.BoxGeometry(0.095, 0.02, 0.012)), redM);
        sp.position.set(sx * 0.072, 0, -0.004);
        wheelGroup.add(sp);
      }
      const bSp = new THREE.Mesh(trackWGeo(new THREE.BoxGeometry(0.024, 0.09, 0.012)), redM);
      bSp.position.set(0, -0.072, -0.004);
      wheelGroup.add(bSp);
      wheelGroup.add(new THREE.Mesh(hubGeo, leatherM));
    } else if (style === 'titaniumSport') {
      // Machined Brushed Titanium Flat-Bottom Sport Wheel + Sapphire Center Ring
      const tiM = trackWMat(new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.22, metalness: 0.92 }));
      const blueM = trackWMat(new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.24, metalness: 0.7 }));
      const topArc = new THREE.Mesh(trackWGeo(new THREE.TorusGeometry(0.136, 0.016, 12, 28, Math.PI * 1.48)), tiM);
      topArc.rotation.z = -Math.PI * 0.24;
      wheelGroup.add(topArc);
      const flatBot = new THREE.Mesh(trackWGeo(new THREE.BoxGeometry(0.19, 0.024, 0.024)), tiM);
      flatBot.position.set(0, -0.118, 0);
      wheelGroup.add(flatBot);
      for (const sx of [-1, 1]) {
        const sp = new THREE.Mesh(trackWGeo(new THREE.BoxGeometry(0.092, 0.018, 0.012)), tiM);
        sp.position.set(sx * 0.072, 0, -0.004);
        wheelGroup.add(sp);
      }
      wheelGroup.add(new THREE.Mesh(hubGeo, tiM));
      const ring = new THREE.Mesh(trackWGeo(new THREE.TorusGeometry(0.028, 0.005, 8, 20)), blueM);
      ring.position.z = 0.018;
      wheelGroup.add(ring);
    } else if (style === 'driftSuedeBlue') {
      // Deep-Dish Cobalt Blue Suede Drift Wheel + Yellow Top Center Band
      const suedeM = trackWMat(new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.92, metalness: 0.04 }));
      const yelM = trackWMat(new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35, metalness: 0.2 }));
      const darkM = trackWMat(new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.35, metalness: 0.72 }));
      const rim = new THREE.Mesh(trackWGeo(new THREE.TorusGeometry(0.138, 0.018, 12, 32)), suedeM);
      rim.position.z = 0.024;
      wheelGroup.add(rim);
      const band = new THREE.Mesh(trackWGeo(new THREE.BoxGeometry(0.024, 0.026, 0.038)), yelM);
      band.position.set(0, 0.138, 0.024);
      wheelGroup.add(band);
      for (const sx of [-1, 1]) {
        const sp = new THREE.Mesh(trackWGeo(new THREE.BoxGeometry(0.098, 0.02, 0.012)), darkM);
        sp.position.set(sx * 0.072, 0, 0.01);
        sp.rotation.y = sx * -0.22;
        wheelGroup.add(sp);
      }
      wheelGroup.add(new THREE.Mesh(hubGeo, darkM));
    } else if (style === 'emeraldCarbon') {
      // Forged Carbon D-Wheel with Glowing Emerald Trim + 9 Shift LEDs
      const carbM = trackWMat(new THREE.MeshStandardMaterial({ color: 0x12151a, roughness: 0.3, metalness: 0.68 }));
      const emM = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0x10b981,
          emissive: 0x059669,
          emissiveIntensity: 1.8,
          roughness: 0.16,
        }),
      );
      wheelPulseMat = emM;
      wheelGroup.add(new THREE.Mesh(trackWGeo(new THREE.TorusGeometry(0.136, 0.017, 12, 32)), carbM));
      const innerNeon = new THREE.Mesh(trackWGeo(new THREE.TorusGeometry(0.118, 0.005, 8, 28)), emM);
      innerNeon.position.z = 0.01;
      wheelGroup.add(innerNeon);
      for (const sx of [-1, 1]) {
        const sp = new THREE.Mesh(trackWGeo(new THREE.BoxGeometry(0.092, 0.02, 0.012)), carbM);
        sp.position.set(sx * 0.072, 0, -0.002);
        wheelGroup.add(sp);
      }
      wheelGroup.add(new THREE.Mesh(hubGeo, carbM));
    } else if (style === 'plasmaYoke') {
      // Animated Obsidian Butterfly Yoke with Pulsing Violet-Cyan Plasma Rim + 9 Shift LEDs
      const obsM = trackWMat(new THREE.MeshStandardMaterial({ color: 0x10101c, roughness: 0.22, metalness: 0.85 }));
      const plasM = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0xa855f7,
          emissive: 0x9333ea,
          emissiveIntensity: 2.2,
          roughness: 0.12,
        }),
      );
      const cyanM = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0x22d3ee,
          emissive: 0x06b6d4,
          emissiveIntensity: 2.0,
          roughness: 0.12,
        }),
      );
      wheelPulseMat = plasM;
      wheelGroup.add(new THREE.Mesh(trackWGeo(new THREE.BoxGeometry(0.24, 0.1, 0.018)), obsM));
      const bar = new THREE.Mesh(trackWGeo(new THREE.BoxGeometry(0.22, 0.014, 0.022)), cyanM);
      bar.position.set(0, -0.052, 0.005);
      wheelGroup.add(bar);
      for (const sx of [-1, 1]) {
        const grip = new THREE.Mesh(trackWGeo(new THREE.CapsuleGeometry(0.022, 0.105, 8, 12)), obsM);
        grip.position.set(sx * 0.134, 0, 0.004);
        wheelGroup.add(grip);
        const trim = new THREE.Mesh(trackWGeo(new THREE.BoxGeometry(0.008, 0.095, 0.024)), plasM);
        trim.position.set(sx * 0.114, 0, 0.008);
        wheelGroup.add(trim);
      }
      const spinCore = new THREE.Group();
      spinCore.position.z = 0.018;
      wheelGroup.add(spinCore);
      wheelHoloSpinGroup = spinCore;
      spinCore.add(new THREE.Mesh(trackWGeo(new THREE.OctahedronGeometry(0.02, 0)), cyanM));
    } else if (style === 'scrapMadMax') {
      // Wasteland Rusted Scrap-Iron Mad Max Steering Wheel:
      // Welded iron ring, jagged perimeter spikes, ragged cloth grip wraps, bolted rebar spokes & cog hub
      const rustMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0x6b3a24, roughness: 0.92, metalness: 0.52 }),
      );
      const scrapSteelMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0x3b3d42, roughness: 0.78, metalness: 0.76 }),
      );
      const wrapMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0x8c7355, roughness: 0.96, metalness: 0.04 }),
      );
      const boltMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.45, metalness: 0.85 }),
      );
      const hazardMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.72, metalness: 0.25 }),
      );

      // Base rough forged iron ring (low-poly faceted feel)
      wheelGroup.add(
        new THREE.Mesh(trackWGeo(new THREE.TorusGeometry(0.136, 0.016, 7, 18)), rustMat),
      );

      // Welded scrap metal splice collars + perimeter wasteland spikes
      const collarGeo = trackWGeo(new THREE.TorusGeometry(0.021, 0.0055, 6, 8));
      const spikeGeo = trackWGeo(new THREE.ConeGeometry(0.0085, 0.026, 5));
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        if (i % 2 === 0) {
          const collar = new THREE.Mesh(collarGeo, scrapSteelMat);
          collar.position.set(Math.cos(a) * 0.136, Math.sin(a) * 0.136, 0);
          collar.rotation.set(Math.PI * 0.5, 0, a);
          wheelGroup.add(collar);
        }
        const spike = new THREE.Mesh(spikeGeo, i % 2 === 0 ? scrapSteelMat : rustMat);
        spike.position.set(Math.cos(a) * 0.156, Math.sin(a) * 0.156, 0);
        spike.rotation.z = a - Math.PI * 0.5;
        wheelGroup.add(spike);
      }

      // Asymmetric ragged cloth/leather grip tape strips on left & right grips
      const wrapBandGeo = trackWGeo(new THREE.TorusGeometry(0.0195, 0.0045, 6, 10));
      for (const sideBase of [0, Math.PI]) {
        for (let k = -3; k <= 3; k++) {
          const a = sideBase + k * 0.11;
          const band = new THREE.Mesh(wrapBandGeo, wrapMat);
          band.position.set(Math.cos(a) * 0.136, Math.sin(a) * 0.136, 0);
          band.rotation.set(Math.PI * 0.5, k % 2 === 0 ? 0.22 : -0.18, a);
          wheelGroup.add(band);
        }
      }

      // 3 Welded rebar spokes + mismatched gusset plates & oversized bolts
      const boltGeo = trackWGeo(new THREE.CylinderGeometry(0.0055, 0.0055, 0.018, 6));
      boltGeo.rotateX(Math.PI * 0.5);
      for (const ang of [Math.PI * 0.08, Math.PI - Math.PI * 0.08, -Math.PI * 0.5]) {
        const sg = new THREE.Group();
        sg.rotation.z = ang;
        const bar = new THREE.Mesh(
          trackWGeo(new THREE.BoxGeometry(0.118, 0.022, 0.012)),
          scrapSteelMat,
        );
        bar.position.set(0.064, 0, -0.002);
        sg.add(bar);
        const plate = new THREE.Mesh(
          trackWGeo(new THREE.BoxGeometry(0.044, 0.032, 0.006)),
          rustMat,
        );
        plate.position.set(0.068, 0.003, 0.006);
        plate.rotation.z = 0.14;
        sg.add(plate);
        for (const bx of [0.052, 0.086]) {
          const b = new THREE.Mesh(boltGeo, boltMat);
          b.position.set(bx, 0, 0.006);
          sg.add(b);
        }
        wheelGroup.add(sg);
      }

      // Salvaged industrial gear-cog center hub with hazard center nut
      wheelGroup.add(new THREE.Mesh(hubGeo, scrapSteelMat));
      const toothGeo = trackWGeo(new THREE.BoxGeometry(0.014, 0.018, 0.014));
      for (let t = 0; t < 10; t++) {
        const a = (t / 10) * Math.PI * 2;
        const tooth = new THREE.Mesh(toothGeo, rustMat);
        tooth.position.set(Math.cos(a) * 0.044, Math.sin(a) * 0.044, 0.004);
        tooth.rotation.z = a;
        wheelGroup.add(tooth);
      }
      const cap = new THREE.Mesh(
        trackWGeo(new THREE.CylinderGeometry(0.024, 0.026, 0.016, 6)),
        hazardMat,
      );
      cap.rotation.x = Math.PI * 0.5;
      cap.position.z = 0.014;
      wheelGroup.add(cap);
      const centerBolt = new THREE.Mesh(boltGeo, boltMat);
      centerBolt.position.z = 0.02;
      wheelGroup.add(centerBolt);
    } else if (style === 'obsidianMagma') {
      // Faceted Volcanic Obsidian Shard Armor over Blazing Molten Lava Core + Spinning Crystal + 9 RPM LEDs
      const obsMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0x0f0b14,
          roughness: 0.18,
          metalness: 0.72,
        }),
      );
      const magmaMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0xff5a1f,
          emissive: 0xea380c,
          emissiveIntensity: 2.3,
          roughness: 0.14,
        }),
      );
      const goldEmberMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0xfde047,
          emissive: 0xf59e0b,
          emissiveIntensity: 2.0,
          roughness: 0.12,
        }),
      );
      wheelPulseMat = magmaMat;

      // Glowing molten inner magma ring visible through every obsidian fissure
      wheelGroup.add(
        new THREE.Mesh(trackWGeo(new THREE.TorusGeometry(0.135, 0.012, 10, 28)), magmaMat),
      );

      // 14 Jagged Faceted Obsidian Armor Shards encasing the molten rim
      const shardGeo = trackWGeo(new THREE.DodecahedronGeometry(0.023, 0));
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const shard = new THREE.Mesh(shardGeo, obsMat);
        shard.position.set(Math.cos(a) * 0.137, Math.sin(a) * 0.137, (i % 2 === 0 ? 0.002 : -0.002));
        shard.scale.set(1.18, 0.85, 0.92);
        shard.rotation.set(i * 0.4, i * 0.6, a);
        wheelGroup.add(shard);
      }

      // 3 Volcanic obsidian claw spokes with molten core fissures
      for (const ang of [Math.PI * 0.1, Math.PI * 0.9, -Math.PI * 0.5]) {
        const g = new THREE.Group();
        g.rotation.z = ang;
        const arm = new THREE.Mesh(
          trackWGeo(new THREE.BoxGeometry(0.115, 0.026, 0.016)),
          obsMat,
        );
        arm.position.set(0.064, 0, -0.002);
        g.add(arm);
        const vein = new THREE.Mesh(
          trackWGeo(new THREE.BoxGeometry(0.108, 0.008, 0.02)),
          magmaMat,
        );
        vein.position.set(0.064, 0, 0.001);
        g.add(vein);
        wheelGroup.add(g);
      }

      // Armored obsidian hub with 4 volcanic fangs & spinning erupting ember crystal
      wheelGroup.add(new THREE.Mesh(hubGeo, obsMat));
      const fangGeo = trackWGeo(new THREE.ConeGeometry(0.009, 0.026, 4));
      for (let f = 0; f < 4; f++) {
        const a = (f / 4) * Math.PI * 2 + Math.PI * 0.25;
        const fang = new THREE.Mesh(fangGeo, obsMat);
        fang.position.set(Math.cos(a) * 0.032, Math.sin(a) * 0.032, 0.014);
        fang.rotation.z = a + Math.PI * 0.5;
        wheelGroup.add(fang);
      }
      const spinCore = new THREE.Group();
      spinCore.position.z = 0.019;
      wheelGroup.add(spinCore);
      wheelHoloSpinGroup = spinCore;
      spinCore.add(new THREE.Mesh(trackWGeo(new THREE.OctahedronGeometry(0.02, 0)), goldEmberMat));
      spinCore.add(new THREE.Mesh(trackWGeo(new THREE.TorusGeometry(0.028, 0.0038, 6, 6)), magmaMat));
    } else if (style === 'pixelVoxel') {
      // Pure 8-Bit / Voxel Block Steering Wheel — 100% Crisp Quantized Cubes, Zero Curves!
      const darkVoxelMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0x1e2028, roughness: 0.72, metalness: 0.18 }),
      );
      const stoneVoxelMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8, metalness: 0.15 }),
      );
      const grassVoxelMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.65, metalness: 0.08 }),
      );
      const diamondVoxelMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0x22d3ee,
          emissive: 0x06b6d4,
          emissiveIntensity: 1.5,
          roughness: 0.2,
          metalness: 0.35,
        }),
      );
      const goldVoxelMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35, metalness: 0.7 }),
      );

      // Quantized pixel-circle rim (11x11 voxel grid coordinates)
      const step = 0.0265;
      const voxelGeo = trackWGeo(new THREE.BoxGeometry(step * 0.96, step * 0.96, step * 0.96));
      const rimCoords: [number, number][] = [
        [-2, 5], [-1, 5], [0, 5], [1, 5], [2, 5],
        [3, 4], [4, 3],
        [5, 2], [5, 1], [5, 0], [5, -1], [5, -2],
        [4, -3], [3, -4],
        [2, -5], [1, -5], [0, -5], [-1, -5], [-2, -5],
        [-3, -4], [-4, -3],
        [-5, -2], [-5, -1], [-5, 0], [-5, 1], [-5, 2],
        [-4, 3], [-3, 4],
      ];
      rimCoords.forEach(([gx, gy], idx) => {
        const isTopMarker = gx === 0 && gy === 5;
        const isSideGrip = Math.abs(gx) === 5 && Math.abs(gy) <= 1;
        const isCorner = Math.abs(gx) >= 3 && Math.abs(gy) >= 3;
        const mat = isTopMarker
          ? goldVoxelMat
          : isSideGrip
            ? grassVoxelMat
            : isCorner
              ? diamondVoxelMat
              : idx % 2 === 0
                ? darkVoxelMat
                : stoneVoxelMat;
        const cube = new THREE.Mesh(voxelGeo, mat);
        cube.position.set(gx * step, gy * step, 0);
        wheelGroup.add(cube);
      });

      // Stepped blocky pixel spokes (left, right, bottom)
      const spokeCoords: [number, number][] = [
        [-4, 0], [-3, 0], [-2, 0],
        [4, 0], [3, 0], [2, 0],
        [0, -4], [0, -3], [0, -2],
      ];
      for (const [gx, gy] of spokeCoords) {
        const b = new THREE.Mesh(voxelGeo, stoneVoxelMat);
        b.scale.set(0.92, 0.82, 0.58);
        b.position.set(gx * step, gy * step, -0.003);
        wheelGroup.add(b);
      }

      // Square 3x3 Pixel Hub with Glowing Cyan Voxel Diamond Emblem
      const hubBlock = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(step * 2.8, step * 2.8, 0.022)),
        darkVoxelMat,
      );
      wheelGroup.add(hubBlock);
      const pxGeo = trackWGeo(new THREE.BoxGeometry(0.011, 0.011, 0.01));
      const diaPixels: [number, number][] = [
        [0, 2], [-1, 1], [0, 1], [1, 1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0],
        [-1, -1], [0, -1], [1, -1], [0, -2],
      ];
      for (const [px, py] of diaPixels) {
        const cell = new THREE.Mesh(pxGeo, diamondVoxelMat);
        cell.position.set(px * 0.011, py * 0.011, 0.014);
        wheelGroup.add(cell);
      }
    } else if (style === 'hevLambda') {
      // Half-Life HEV Suit Mark IV / V Armored Steering Wheel with Glowing Center Lambda (λ) Emblem!
      const hevOrangeMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0xf97316,
          roughness: 0.28,
          metalness: 0.52,
        }),
      );
      const hevSteelMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0x20232a,
          roughness: 0.42,
          metalness: 0.78,
        }),
      );
      const hevGripMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0x13151a,
          roughness: 0.9,
          metalness: 0.08,
        }),
      );
      const hazardYellowMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          roughness: 0.35,
          metalness: 0.25,
        }),
      );
      const lambdaGlowMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0xffa733,
          emissive: 0xf97316,
          emissiveIntensity: 2.3,
          roughness: 0.14,
          metalness: 0.25,
        }),
      );
      wheelPulseMat = lambdaGlowMat;

      // Armored dark charcoal core ring + iconic HEV Hazard Orange top & bottom armored shells
      wheelGroup.add(
        new THREE.Mesh(trackWGeo(new THREE.TorusGeometry(0.136, 0.0165, 12, 32)), hevGripMat),
      );
      const topShell = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.137, 0.0185, 10, 22, Math.PI * 0.56)),
        hevOrangeMat,
      );
      topShell.rotation.z = Math.PI * 0.22;
      wheelGroup.add(topShell);
      const botShell = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.137, 0.0185, 10, 22, Math.PI * 0.5)),
        hevOrangeMat,
      );
      botShell.rotation.z = Math.PI * 1.25;
      wheelGroup.add(botShell);

      // Rugged HEV armored side hand-guards + yellow/black hazard grip stripes
      for (const sx of [-1, 1]) {
        const guard = new THREE.Mesh(
          trackWGeo(new THREE.BoxGeometry(0.022, 0.072, 0.036)),
          hevSteelMat,
        );
        guard.position.set(sx * 0.138, 0, 0.002);
        wheelGroup.add(guard);

        // Hazard stripe accent blocks on lower sides
        const haz = new THREE.Mesh(
          trackWGeo(new THREE.BoxGeometry(0.018, 0.018, 0.038)),
          hazardYellowMat,
        );
        haz.position.set(sx * 0.112, -0.076, 0.002);
        haz.rotation.z = sx * -0.58;
        wheelGroup.add(haz);

        // Industrial truss spokes with glowing amber conduit line
        const sp = new THREE.Mesh(
          trackWGeo(new THREE.BoxGeometry(0.098, 0.028, 0.014)),
          hevSteelMat,
        );
        sp.position.set(sx * 0.076, -0.004, -0.002);
        wheelGroup.add(sp);
        const conduit = new THREE.Mesh(
          trackWGeo(new THREE.BoxGeometry(0.082, 0.006, 0.018)),
          lambdaGlowMat,
        );
        conduit.position.set(sx * 0.076, -0.004, 0.001);
        wheelGroup.add(conduit);
      }
      const botSpoke = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.034, 0.095, 0.014)),
        hevSteelMat,
      );
      botSpoke.position.set(0, -0.078, -0.002);
      wheelGroup.add(botSpoke);

      // Center Armored HEV Hub + Glowing Orange Bezel + Iconic 3D Lambda (λ) Emblem!
      const hevHub = new THREE.Mesh(
        trackWGeo(new THREE.CylinderGeometry(0.044, 0.047, 0.024, 24)),
        hevSteelMat,
      );
      hevHub.rotation.x = Math.PI * 0.5;
      wheelGroup.add(hevHub);

      const bezel = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.039, 0.0048, 8, 28)),
        hevOrangeMat,
      );
      bezel.position.z = 0.013;
      wheelGroup.add(bezel);

      const glowBezel = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.033, 0.0022, 8, 24)),
        lambdaGlowMat,
      );
      glowBezel.position.z = 0.014;
      wheelGroup.add(glowBezel);

      // 3D Lambda (λ) Symbol right in the center of the hub
      const lambdaGrp = new THREE.Group();
      lambdaGrp.position.set(0, 0, 0.0165);
      wheelGroup.add(lambdaGrp);

      // Main diagonal spine from upper-left (-0.005, +0.021) to lower-right (+0.014, -0.019)
      const mainLeg = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.0075, 0.046, 0.005)),
        lambdaGlowMat,
      );
      mainLeg.position.set(0.0035, 0.001, 0);
      mainLeg.rotation.z = 0.42;
      lambdaGrp.add(mainLeg);

      // Top horizontal serif cap on upper-left
      const topSerif = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.015, 0.0068, 0.005)),
        lambdaGlowMat,
      );
      topSerif.position.set(-0.009, 0.02, 0);
      lambdaGrp.add(topSerif);

      // Bottom-right serif foot on main diagonal leg
      const footSerif = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.012, 0.0065, 0.005)),
        lambdaGlowMat,
      );
      footSerif.position.set(0.0155, -0.019, 0);
      footSerif.rotation.z = 0.25;
      lambdaGrp.add(footSerif);

      // Left supporting diagonal leg from mid-spine (-0.001, +0.002) down to (-0.016, -0.020)
      const leftLeg = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.0072, 0.029, 0.005)),
        lambdaGlowMat,
      );
      leftLeg.position.set(-0.0095, -0.009, 0);
      leftLeg.rotation.z = -0.56;
      lambdaGrp.add(leftLeg);
    } else if (style === 'headcrab') {
      // Half-Life Headcrab Steering Wheel:
      // Organic segmented chitin rim + sculpted 3D Headcrab clinging to the hub with 4 articulated claw legs!
      const fleshMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0xc99c72, roughness: 0.72, metalness: 0.06 }),
      );
      const mottleMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0x9b5e42, roughness: 0.78, metalness: 0.08 }),
      );
      const mawMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0x7f1d2d, roughness: 0.42, metalness: 0.12 }),
      );
      const clawMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0x3b2316, roughness: 0.34, metalness: 0.24 }),
      );
      const fangMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0xe7dcc6, roughness: 0.38, metalness: 0.05 }),
      );

      // Organic fleshy main rim + segmented ridge rings
      wheelGroup.add(
        new THREE.Mesh(trackWGeo(new THREE.TorusGeometry(0.136, 0.0155, 10, 28)), fleshMat),
      );
      const ribGeo = trackWGeo(new THREE.TorusGeometry(0.0175, 0.0042, 6, 10));
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const rib = new THREE.Mesh(ribGeo, i % 2 === 0 ? mottleMat : fleshMat);
        rib.position.set(Math.cos(a) * 0.136, Math.sin(a) * 0.136, 0);
        rib.rotation.set(Math.PI * 0.5, 0, a);
        wheelGroup.add(rib);
      }

      // Inner structural dark tendon backplate behind the Headcrab
      wheelGroup.add(new THREE.Mesh(hubGeo, mottleMat));

      // Sculpted 3D Headcrab Carapace perched squarely on the steering hub
      const crabBody = new THREE.Mesh(
        trackWGeo(new THREE.SphereGeometry(0.045, 16, 12)),
        fleshMat,
      );
      crabBody.scale.set(1.06, 0.94, 0.66);
      crabBody.position.set(0, 0.005, 0.015);
      wheelGroup.add(crabBody);

      // Dorsal carapace ridges & fleshy brow folds
      for (const [rx, ry, rz, sx, sy] of [
        [0, 0.022, 0.032, 0.032, 0.014],
        [-0.022, 0.01, 0.027, 0.016, 0.022],
        [0.022, 0.01, 0.027, 0.016, 0.022],
      ]) {
        const ridge = new THREE.Mesh(
          trackWGeo(new THREE.SphereGeometry(1, 10, 8)),
          mottleMat,
        );
        ridge.scale.set(sx, sy, 0.012);
        ridge.position.set(rx, ry, rz);
        wheelGroup.add(ridge);
      }

      // Fleshy crimson under-maw slit & tiny bone-ivory fangs
      const maw = new THREE.Mesh(
        trackWGeo(new THREE.SphereGeometry(0.02, 12, 8)),
        mawMat,
      );
      maw.scale.set(1.15, 0.65, 0.55);
      maw.position.set(0, -0.021, 0.028);
      wheelGroup.add(maw);

      const toothGeo = trackWGeo(new THREE.ConeGeometry(0.0038, 0.011, 5));
      for (const tx of [-0.01, -0.0035, 0.0035, 0.01]) {
        const tooth = new THREE.Mesh(toothGeo, fangMat);
        tooth.position.set(tx, -0.018, 0.038);
        tooth.rotation.x = Math.PI;
        wheelGroup.add(tooth);
      }

      // 4 Articulated Multi-Segment Headcrab Legs reaching out & gripping the rim as spokes!
      const femurGeo = trackWGeo(new THREE.CylinderGeometry(0.009, 0.012, 0.068, 8));
      const tibiaGeo = trackWGeo(new THREE.CylinderGeometry(0.0055, 0.009, 0.056, 7));
      const talonGeo = trackWGeo(new THREE.ConeGeometry(0.007, 0.024, 6));

      // 2 Front Pincer Legs (upper-left & upper-right) + 2 Rear Bracing Legs (lower-left & lower-right)
      const legConfigs = [
        { sx: -1, baseAng: 0.42, kneeX: -0.082, kneeY: 0.034, tipX: -0.128, tipY: 0.048, front: true },
        { sx: 1, baseAng: -0.42, kneeX: 0.082, kneeY: 0.034, tipX: 0.128, tipY: 0.048, front: true },
        { sx: -1, baseAng: -0.78, kneeX: -0.072, kneeY: -0.056, tipX: -0.098, tipY: -0.098, front: false },
        { sx: 1, baseAng: 0.78, kneeX: 0.072, kneeY: -0.056, tipX: 0.098, tipY: -0.098, front: false },
      ];
      for (const leg of legConfigs) {
        // Upper fleshy thigh from hub to knee joint
        const fx = leg.kneeX * 0.56;
        const fy = leg.kneeY * 0.56;
        const femur = new THREE.Mesh(femurGeo, leg.front ? fleshMat : mottleMat);
        femur.position.set(fx, fy, 0.008);
        femur.rotation.z = Math.atan2(leg.kneeY, leg.kneeX) - Math.PI * 0.5;
        wheelGroup.add(femur);

        // Knobby joint sphere
        const knee = new THREE.Mesh(
          trackWGeo(new THREE.SphereGeometry(0.011, 8, 8)),
          mottleMat,
        );
        knee.position.set(leg.kneeX, leg.kneeY, 0.012);
        wheelGroup.add(knee);

        // Lower dark chitin shin reaching onto the rim
        const dx = leg.tipX - leg.kneeX;
        const dy = leg.tipY - leg.kneeY;
        const tibia = new THREE.Mesh(tibiaGeo, clawMat);
        tibia.position.set((leg.kneeX + leg.tipX) * 0.5, (leg.kneeY + leg.tipY) * 0.5, 0.008);
        tibia.rotation.z = Math.atan2(dy, dx) - Math.PI * 0.5;
        wheelGroup.add(tibia);

        // Curved chitin claw gripping over the rim edge
        const talon = new THREE.Mesh(talonGeo, clawMat);
        talon.position.set(leg.tipX * 1.07, leg.tipY * 1.07, 0.012);
        talon.rotation.z = Math.atan2(leg.tipY, leg.tipX) - Math.PI * 0.5;
        wheelGroup.add(talon);
      }

      // Bottom stabilizing tendon spoke
      const botTendon = new THREE.Mesh(
        trackWGeo(new THREE.CylinderGeometry(0.008, 0.011, 0.096, 8)),
        mottleMat,
      );
      botTendon.position.set(0, -0.084, -0.003);
      wheelGroup.add(botTendon);
    } else if (style === 'craftingTable') {
      // Minecraft Crafting Table Steering Wheel — 100% Crisp Quantized Oak Voxel Cubes + 3x3 Crafting Grid Hub!
      const oakLightMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0xc89e66, roughness: 0.85, metalness: 0.04 }),
      );
      const oakMidMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0xb0824a, roughness: 0.86, metalness: 0.04 }),
      );
      const oakDarkMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9, metalness: 0.05 }),
      );
      const tableTopMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0x8d552d, roughness: 0.84, metalness: 0.05 }),
      );
      const ironToolMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.34, metalness: 0.72 }),
      );
      const redstoneMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0xef4444,
          emissive: 0xdc2626,
          emissiveIntensity: 1.5,
          roughness: 0.28,
        }),
      );

      // Quantized 11x11 Minecraft oak-plank voxel rim
      const step = 0.0265;
      const voxelGeo = trackWGeo(new THREE.BoxGeometry(step * 0.96, step * 0.96, step * 0.96));
      const rimCoords: [number, number][] = [
        [-2, 5], [-1, 5], [0, 5], [1, 5], [2, 5],
        [3, 4], [4, 3],
        [5, 2], [5, 1], [5, 0], [5, -1], [5, -2],
        [4, -3], [3, -4],
        [2, -5], [1, -5], [0, -5], [-1, -5], [-2, -5],
        [-3, -4], [-4, -3],
        [-5, -2], [-5, -1], [-5, 0], [-5, 1], [-5, 2],
        [-4, 3], [-3, 4],
      ];
      rimCoords.forEach(([gx, gy], idx) => {
        const isTopMarker = gx === 0 && gy === 5;
        const isCorner = Math.abs(gx) >= 3 && Math.abs(gy) >= 3;
        const mat = isTopMarker
          ? redstoneMat
          : isCorner
            ? oakDarkMat
            : idx % 3 === 0
              ? tableTopMat
              : idx % 2 === 0
                ? oakLightMat
                : oakMidMat;
        const cube = new THREE.Mesh(voxelGeo, mat);
        cube.position.set(gx * step, gy * step, 0);
        wheelGroup.add(cube);
      });

      // Pixelated Iron Saw & Hammer tool details mounted on left & right wooden grip faces
      const toolPxGeo = trackWGeo(new THREE.BoxGeometry(0.0085, 0.0085, 0.006));
      for (const sx of [-1, 1]) {
        const gx = sx * 5 * step;
        // Tool blade/head pixels on front face of side oak blocks
        for (const [ox, oy, isHandle] of [
          [0, 0.018, false],
          [sx * -0.007, 0.01, false],
          [0, 0.002, false],
          [0, -0.008, true],
          [0, -0.017, true],
        ] as [number, number, boolean][]) {
          const px = new THREE.Mesh(toolPxGeo, isHandle ? oakDarkMat : ironToolMat);
          px.position.set(gx + ox, oy, step * 0.52);
          wheelGroup.add(px);
        }
      }

      // Stepped oak plank voxel spokes (left, right, bottom)
      const spokeCoords: [number, number][] = [
        [-4, 0], [-3, 0], [-2, 0],
        [4, 0], [3, 0], [2, 0],
        [0, -4], [0, -3], [0, -2],
      ];
      for (const [gx, gy] of spokeCoords) {
        const b = new THREE.Mesh(voxelGeo, (Math.abs(gx) + Math.abs(gy)) % 2 === 0 ? oakMidMat : oakLightMat);
        b.scale.set(0.92, 0.84, 0.62);
        b.position.set(gx * step, gy * step, -0.002);
        wheelGroup.add(b);
      }

      // Iconic Square Minecraft Crafting Table Center Hub with Crisp 3x3 Grid!
      const hubBase = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.088, 0.088, 0.024)),
        oakDarkMat,
      );
      wheelGroup.add(hubBase);
      const hubFrame = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.08, 0.08, 0.004)),
        tableTopMat,
      );
      hubFrame.position.z = 0.0125;
      wheelGroup.add(hubFrame);

      // Crisp dark grid backing + 3x3 wooden crafting slots
      const gridBack = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.068, 0.068, 0.003)),
        oakDarkMat,
      );
      gridBack.position.z = 0.0145;
      wheelGroup.add(gridBack);

      const slotGeo = trackWGeo(new THREE.BoxGeometry(0.019, 0.019, 0.004));
      for (let gx = -1; gx <= 1; gx++) {
        for (let gy = -1; gy <= 1; gy++) {
          const isCenter = gx === 0 && gy === 0;
          const slot = new THREE.Mesh(
            slotGeo,
            isCenter ? oakLightMat : (gx + gy) % 2 === 0 ? oakLightMat : oakMidMat,
          );
          slot.position.set(gx * 0.022, gy * 0.022, 0.0165);
          wheelGroup.add(slot);
        }
      }
    } else if (style === 'aperturePortal') {
      // Portal – Aperture Science Laboratories Steering Wheel:
      // Sterile glossy white Aperture shells, dual Portal Blue & Orange plasma arcs + 8-Blade Camera Shutter Logo!
      const apWhiteMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.16, metalness: 0.28 }),
      );
      const apDarkMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0x1e2430, roughness: 0.44, metalness: 0.72 }),
      );
      const portalBlueMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 2.3,
          roughness: 0.12,
        }),
      );
      const portalOrangeMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0xfb923c,
          emissive: 0xea580c,
          emissiveIntensity: 2.3,
          roughness: 0.12,
        }),
      );
      wheelPulseMat = portalBlueMat;

      // Matte gunmetal Aperture chassis inner rim
      wheelGroup.add(
        new THREE.Mesh(trackWGeo(new THREE.TorusGeometry(0.136, 0.0155, 14, 36)), apDarkMat),
      );

      // 4 Sterile Glossy White Aperture Shell Segments with precision lab panel seams
      for (const [startAng, arcLen] of [
        [Math.PI * 0.16, Math.PI * 0.68],
        [Math.PI * 1.16, Math.PI * 0.68],
      ]) {
        const shell = new THREE.Mesh(
          trackWGeo(new THREE.TorusGeometry(0.137, 0.0175, 12, 24, arcLen)),
          apWhiteMat,
        );
        shell.rotation.z = startAng;
        wheelGroup.add(shell);
      }

      // Dual Iconic Portal Plasma Rim Arcs — Left Portal Blue, Right Portal Orange!
      const leftPortalArc = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.121, 0.0046, 8, 22, Math.PI * 0.76)),
        portalBlueMat,
      );
      leftPortalArc.rotation.z = Math.PI * 0.62;
      leftPortalArc.position.z = 0.007;
      wheelGroup.add(leftPortalArc);

      const rightPortalArc = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.121, 0.0046, 8, 22, Math.PI * 0.76)),
        portalOrangeMat,
      );
      rightPortalArc.rotation.z = -Math.PI * 0.38;
      rightPortalArc.position.z = 0.007;
      wheelGroup.add(rightPortalArc);

      // Left & Right White Aperture Spokes with matching Blue / Orange Energy Conduits
      for (const sx of [-1, 1]) {
        const sp = new THREE.Mesh(
          trackWGeo(new THREE.BoxGeometry(0.096, 0.026, 0.015)),
          apWhiteMat,
        );
        sp.position.set(sx * 0.078, -0.004, -0.001);
        wheelGroup.add(sp);
        const conduit = new THREE.Mesh(
          trackWGeo(new THREE.BoxGeometry(0.082, 0.0065, 0.018)),
          sx < 0 ? portalBlueMat : portalOrangeMat,
        );
        conduit.position.set(sx * 0.078, -0.004, 0.002);
        wheelGroup.add(conduit);
      }
      // Twin-strut laboratory lower spoke
      for (const ox of [-0.012, 0.012]) {
        const strut = new THREE.Mesh(
          trackWGeo(new THREE.BoxGeometry(0.011, 0.094, 0.014)),
          apWhiteMat,
        );
        strut.position.set(ox, -0.078, -0.001);
        wheelGroup.add(strut);
      }

      // Center Hub — Iconic 8-Blade Aperture Science Camera Shutter Logo!
      const apHub = new THREE.Mesh(
        trackWGeo(new THREE.CylinderGeometry(0.046, 0.049, 0.023, 28)),
        apWhiteMat,
      );
      apHub.rotation.x = Math.PI * 0.5;
      wheelGroup.add(apHub);

      const irisWell = new THREE.Mesh(
        trackWGeo(new THREE.CylinderGeometry(0.037, 0.037, 0.004, 28)),
        apDarkMat,
      );
      irisWell.rotation.x = Math.PI * 0.5;
      irisWell.position.z = 0.012;
      wheelGroup.add(irisWell);

      // 8 Angled White Shutter Blades forming the iconic Aperture Science octagon aperture
      const bladeGeo = trackWGeo(new THREE.BoxGeometry(0.022, 0.0095, 0.0045));
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const blade = new THREE.Mesh(bladeGeo, apWhiteMat);
        // Offset slightly off-radial to create the spiraling camera-shutter overlap
        blade.position.set(
          Math.cos(a) * 0.024 + Math.cos(a + Math.PI * 0.5) * 0.006,
          Math.sin(a) * 0.024 + Math.sin(a + Math.PI * 0.5) * 0.006,
          0.0155,
        );
        blade.rotation.z = a + 0.58;
        wheelGroup.add(blade);
      }

      // Animated rotating dual-portal core inside the Aperture shutter opening
      const spinPortal = new THREE.Group();
      spinPortal.position.z = 0.016;
      wheelGroup.add(spinPortal);
      wheelHoloSpinGroup = spinPortal;
      const miniBlue = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.0125, 0.0026, 8, 16, Math.PI * 0.85)),
        portalBlueMat,
      );
      miniBlue.rotation.z = 0.1;
      spinPortal.add(miniBlue);
      const miniOrange = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.0125, 0.0026, 8, 16, Math.PI * 0.85)),
        portalOrangeMat,
      );
      miniOrange.rotation.z = Math.PI + 0.1;
      spinPortal.add(miniOrange);
    } else if (style === 'wheatleyCore') {
      // Portal 2 Wheatley Personality Core Steering Wheel:
      // Management-rail handle rim + full 3D Wheatley Core Sphere with expressive eyelids & glowing spinning cyan optic!
      const whWhiteMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0xe6ebf2, roughness: 0.28, metalness: 0.35 }),
      );
      const whGreyMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0x526071, roughness: 0.42, metalness: 0.78 }),
      );
      const whDarkMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0x11151d, roughness: 0.55, metalness: 0.65 }),
      );
      const whBlueEyeMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0ea5e9,
          emissiveIntensity: 2.5,
          roughness: 0.1,
        }),
      );
      const whGlintMat = trackWMat(
        new THREE.MeshStandardMaterial({
          color: 0xe0f2fe,
          emissive: 0xbae6fd,
          emissiveIntensity: 2.0,
          roughness: 0.1,
        }),
      );
      const whCautionMat = trackWMat(
        new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.45, metalness: 0.2 }),
      );
      wheelPulseMat = whBlueEyeMat;

      // Dark metallic core-rail inner rim + white weathered side shells
      wheelGroup.add(
        new THREE.Mesh(trackWGeo(new THREE.TorusGeometry(0.136, 0.015, 12, 32)), whDarkMat),
      );
      for (const [startAng, arcLen] of [
        [-Math.PI * 0.26, Math.PI * 0.52],
        [Math.PI * 0.74, Math.PI * 0.52],
      ]) {
        const gripShell = new THREE.Mesh(
          trackWGeo(new THREE.TorusGeometry(0.137, 0.0172, 10, 20, arcLen)),
          whWhiteMat,
        );
        gripShell.rotation.z = startAng;
        wheelGroup.add(gripShell);
      }

      // Iconic Wheatley Top & Bottom Personality-Core Grab Handles!
      for (const sy of [1, -1]) {
        const handleBar = new THREE.Mesh(
          trackWGeo(new THREE.TorusGeometry(0.154, 0.0068, 8, 18, Math.PI * 0.38)),
          whGreyMat,
        );
        handleBar.rotation.z = sy > 0 ? Math.PI * 0.31 : Math.PI * 1.31;
        handleBar.position.z = 0.004;
        wheelGroup.add(handleBar);
        for (const sx of [-1, 1]) {
          const post = new THREE.Mesh(
            trackWGeo(new THREE.BoxGeometry(0.012, 0.022, 0.014)),
            whGreyMat,
          );
          post.position.set(sx * 0.079, sy * 0.121, 0.003);
          post.rotation.z = sx * sy * -0.58;
          wheelGroup.add(post);
        }
      }

      // Mechanical grey actuator spokes + subtle Aperture yellow caution decals
      for (const sx of [-1, 1]) {
        const sp = new THREE.Mesh(
          trackWGeo(new THREE.BoxGeometry(0.095, 0.024, 0.015)),
          whGreyMat,
        );
        sp.position.set(sx * 0.078, 0, -0.002);
        wheelGroup.add(sp);
        const decal = new THREE.Mesh(
          trackWGeo(new THREE.BoxGeometry(0.016, 0.012, 0.018)),
          whCautionMat,
        );
        decal.position.set(sx * 0.114, 0, 0.001);
        wheelGroup.add(decal);
      }
      const botActuator = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.028, 0.092, 0.015)),
        whGreyMat,
      );
      botActuator.position.set(0, -0.08, -0.002);
      wheelGroup.add(botActuator);

      // Center Hub — 3D Wheatley Personality Core Sphere!
      const coreSphere = new THREE.Mesh(
        trackWGeo(new THREE.SphereGeometry(0.049, 20, 16)),
        whWhiteMat,
      );
      coreSphere.scale.set(1, 1, 0.68);
      coreSphere.position.z = 0.006;
      wheelGroup.add(coreSphere);

      // Chassis equator seam ring around Wheatley's sphere
      const seamRing = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.048, 0.0032, 8, 28)),
        whGreyMat,
      );
      seamRing.position.z = 0.006;
      wheelGroup.add(seamRing);

      // Recessed matte-black mechanical eye socket + outer steel bezel
      const eyeSocketBezel = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.031, 0.0052, 10, 24)),
        whGreyMat,
      );
      eyeSocketBezel.position.z = 0.033;
      wheelGroup.add(eyeSocketBezel);

      const eyeWell = new THREE.Mesh(
        trackWGeo(new THREE.CylinderGeometry(0.029, 0.029, 0.005, 24)),
        whDarkMat,
      );
      eyeWell.rotation.x = Math.PI * 0.5;
      eyeWell.position.z = 0.032;
      wheelGroup.add(eyeWell);

      // Glowing Cyan-Blue Wheatley Optic Iris
      const blueIris = new THREE.Mesh(
        trackWGeo(new THREE.CylinderGeometry(0.022, 0.022, 0.004, 24)),
        whBlueEyeMat,
      );
      blueIris.rotation.x = Math.PI * 0.5;
      blueIris.position.z = 0.0345;
      wheelGroup.add(blueIris);

      // Animated rotating focus ring & bright pupil lens
      const eyeSpin = new THREE.Group();
      eyeSpin.position.z = 0.037;
      wheelGroup.add(eyeSpin);
      wheelHoloSpinGroup = eyeSpin;
      const focusRing = new THREE.Mesh(
        trackWGeo(new THREE.TorusGeometry(0.0155, 0.0022, 6, 18, Math.PI * 1.45)),
        whGlintMat,
      );
      eyeSpin.add(focusRing);
      const pupilDot = new THREE.Mesh(
        trackWGeo(new THREE.CylinderGeometry(0.0075, 0.0075, 0.003, 16)),
        whDarkMat,
      );
      pupilDot.rotation.x = Math.PI * 0.5;
      eyeSpin.add(pupilDot);
      const lensGlint = new THREE.Mesh(
        trackWGeo(new THREE.SphereGeometry(0.0032, 8, 8)),
        whGlintMat,
      );
      lensGlint.position.set(0.005, 0.005, 0.002);
      eyeSpin.add(lensGlint);

      // Expressive articulated upper & lower grey Wheatley eyelids
      const upperLid = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.044, 0.0085, 0.006)),
        whGreyMat,
      );
      upperLid.position.set(0, 0.021, 0.038);
      upperLid.rotation.z = -0.09;
      wheelGroup.add(upperLid);
      const lowerLid = new THREE.Mesh(
        trackWGeo(new THREE.BoxGeometry(0.042, 0.0075, 0.006)),
        whGreyMat,
      );
      lowerLid.position.set(0, -0.022, 0.038);
      lowerLid.rotation.z = 0.05;
      wheelGroup.add(lowerLid);
    }
  };

  setSteeringWheel('stock');

  const cockpitStrutGeo = trackGeo(new THREE.BoxGeometry(1, 1, 1));
  for (const sx of [-1, 1]) {
    addOrientedStrut(
      cabinOffset,
      cockpitStrutGeo,
      [sx * 0.66, -0.3, -0.84],
      [sx * 0.52, 0.44, -0.64],
      0.055,
      0.072,
      dashMat,
      [sx, 0, 0],
      0.03,
    );
  }

  const visor = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.48, 0.08, 0.22)),
    dashMat,
  );
  visor.position.set(0, 0.43, -0.66);
  cabinOffset.add(visor);

  // Rearview Mirror Stalk + Housing + Glossy Glass Face
  const mirrorStalk = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.009, 0.011, 0.065, 8)),
    trimMat,
  );
  mirrorStalk.position.set(0, 0.378, -0.648);
  cabinOffset.add(mirrorStalk);

  const rearMirror = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.18, 0.048, 0.028)),
    trimMat,
  );
  rearMirror.position.set(0, 0.34, -0.64);
  cabinOffset.add(rearMirror);

  const rearMirrorGlassMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      roughness: 0.08,
      metalness: 0.85,
      clearcoat: 1.0,
    }),
  );
  const rearMirrorGlass = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(0.162, 0.036)),
    rearMirrorGlassMat,
  );
  rearMirrorGlass.position.set(0, 0.34, -0.624);
  cabinOffset.add(rearMirrorGlass);

  // =========================================================================
  // PHYSICS-SWINGING REARVIEW MIRROR ORNAMENT PIVOT
  // =========================================================================
  const mirrorCharmPivot = new THREE.Group();
  mirrorCharmPivot.position.set(0, 0.316, -0.635);
  cabinOffset.add(mirrorCharmPivot);

  const charmDynamicGeos: THREE.BufferGeometry[] = [];
  const charmDynamicMats: THREE.Material[] = [];
  let charmTurboImpeller: THREE.Group | null = null;
  let charmDiscoGroup: THREE.Group | null = null;
  let charmDiscoSparkMats: THREE.MeshStandardMaterial[] = [];
  let charmCrystalGroup: THREE.Group | null = null;
  let charmCrystalMat: THREE.MeshStandardMaterial | null = null;
  let charmPlasmaRingA: THREE.Mesh | null = null;
  let charmPlasmaRingB: THREE.Mesh | null = null;
  let charmHeartGroup: THREE.Group | null = null;
  let charmHeartMat: THREE.MeshStandardMaterial | null = null;
  let charmJetAfterburnerMat: THREE.MeshStandardMaterial | null = null;
  let currentMirrorCharm: MirrorCharmId | null = null;

  // Damped 2-axis spring pendulum state
  let swingZ = 0;
  let swingVelZ = 0;
  let swingX = 0;
  let swingVelX = 0;

  const trackCGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    charmDynamicGeos.push(g);
    return g;
  };
  const trackCMat = <T extends THREE.Material>(m: T): T => {
    charmDynamicMats.push(m);
    return m;
  };

  const clearMirrorCharm = (): void => {
    while (mirrorCharmPivot.children.length > 0) {
      mirrorCharmPivot.remove(mirrorCharmPivot.children[0]);
    }
    charmDynamicGeos.forEach((g) => g.dispose());
    charmDynamicGeos.length = 0;
    charmDynamicMats.forEach((m) => m.dispose());
    charmDynamicMats.length = 0;
    charmTurboImpeller = null;
    charmDiscoGroup = null;
    charmDiscoSparkMats = [];
    charmCrystalGroup = null;
    charmCrystalMat = null;
    charmPlasmaRingA = null;
    charmPlasmaRingB = null;
    charmHeartGroup = null;
    charmHeartMat = null;
    charmJetAfterburnerMat = null;
  };

  const setMirrorCharm = (charm: MirrorCharmId): void => {
    if (currentMirrorCharm === charm) return;
    currentMirrorCharm = charm;
    clearMirrorCharm();
    if (charm === 'none') return;

    const isGoldCord =
      charm === 'goldCrown' ||
      charm === 'crescentStar' ||
      charm === 'goldenHorseshoe' ||
      charm === 'katanaMini' ||
      charm === 'discoBall';
    const cordMat = trackCMat(
      new THREE.MeshStandardMaterial({
        color: isGoldCord ? 0xfbbf24 : 0xe4e4e7,
        roughness: isGoldCord ? 0.25 : 0.45,
        metalness: isGoldCord ? 0.88 : 0.12,
      }),
    );

    const upAxis = new THREE.Vector3(0, 1, 0);
    const addCordSegment = (
      p0: THREE.Vector3,
      p1: THREE.Vector3,
      radius = 0.0024,
    ): void => {
      const dir = new THREE.Vector3().subVectors(p1, p0);
      const len = dir.length();
      if (len < 0.0005) return;
      const seg = new THREE.Mesh(
        trackCGeo(new THREE.CylinderGeometry(radius, radius, len, 6)),
        cordMat,
      );
      seg.position.copy(p0).addScaledVector(dir, 0.5);
      seg.quaternion.setFromUnitVectors(upAxis, dir.normalize());
      mirrorCharmPivot.add(seg);
    };
    const addBailRing = (
      y: number,
      mat: THREE.Material = cordMat,
      radius = 0.0052,
      x = 0,
      z = 0,
    ): void => {
      const ring = new THREE.Mesh(
        trackCGeo(new THREE.TorusGeometry(radius, 0.0018, 6, 12)),
        mat,
      );
      ring.position.set(x, y, z);
      mirrorCharmPivot.add(ring);
    };

    // Anchor collar bead right at the bottom of the rearview mirror
    const anchorBead = new THREE.Mesh(
      trackCGeo(new THREE.SphereGeometry(0.0046, 8, 6)),
      cordMat,
    );
    anchorBead.position.set(0, -0.001, 0);
    mirrorCharmPivot.add(anchorBead);

    const topOrigin = new THREE.Vector3(0, 0, 0);

    if (charm === 'nazar') {
      // Cord straight into the gold hanger loop atop the glass bead
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.062, 0));

      const cobaltMat = trackCMat(
        new THREE.MeshPhysicalMaterial({
          color: 0x1d4ed8,
          roughness: 0.08,
          metalness: 0.08,
          clearcoat: 1.0,
          clearcoatRoughness: 0.04,
          emissive: 0x1e3a8a,
          emissiveIntensity: 0.25,
        }),
      );
      const whiteMat = trackCMat(
        new THREE.MeshBasicMaterial({ color: 0xf8fafc }),
      );
      const skyMat = trackCMat(
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
      );
      const navyMat = trackCMat(
        new THREE.MeshBasicMaterial({ color: 0x09090b }),
      );

      const bead = new THREE.Mesh(
        trackCGeo(new THREE.SphereGeometry(0.034, 22, 16)),
        cobaltMat,
      );
      bead.scale.set(1.0, 1.0, 0.42);
      bead.position.set(0, -0.098, 0);
      mirrorCharmPivot.add(bead);

      // Front & Back eye rings so it looks sharp from any angle
      const whiteRingGeo = trackCGeo(new THREE.CircleGeometry(0.023, 22));
      const skyRingGeo = trackCGeo(new THREE.CircleGeometry(0.0155, 20));
      const pupilGeo = trackCGeo(new THREE.CircleGeometry(0.0085, 16));
      for (const sz of [1, -1]) {
        const wRing = new THREE.Mesh(whiteRingGeo, whiteMat);
        wRing.position.set(0, -0.098, sz * 0.0152);
        if (sz < 0) wRing.rotation.y = Math.PI;
        mirrorCharmPivot.add(wRing);

        const sRing = new THREE.Mesh(skyRingGeo, skyMat);
        sRing.position.set(0, -0.098, sz * 0.016);
        if (sz < 0) sRing.rotation.y = Math.PI;
        mirrorCharmPivot.add(sRing);

        const p = new THREE.Mesh(pupilGeo, navyMat);
        p.position.set(0, -0.098, sz * 0.0168);
        if (sz < 0) p.rotation.y = Math.PI;
        mirrorCharmPivot.add(p);
      }

      // Gold hanger loop bridging cord and top of bead (bead top is y = -0.064)
      const loop = new THREE.Mesh(
        trackCGeo(new THREE.TorusGeometry(0.007, 0.0022, 6, 14)),
        trackCMat(
          new THREE.MeshStandardMaterial({
            color: 0xfbbf24,
            roughness: 0.2,
            metalness: 0.9,
          }),
        ),
      );
      loop.position.set(0, -0.063, 0);
      mirrorCharmPivot.add(loop);
    } else if (charm === 'pine') {
      // Cord connects right into the top tip of the pine tree (y = -0.062)
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.068, 0));

      const eyelet = new THREE.Mesh(
        trackCGeo(new THREE.TorusGeometry(0.0055, 0.0018, 6, 12)),
        cordMat,
      );
      eyelet.position.set(0, -0.064, 0);
      mirrorCharmPivot.add(eyelet);

      const greenMat = trackCMat(
        new THREE.MeshStandardMaterial({
          color: 0x16a34a,
          roughness: 0.72,
          metalness: 0.05,
        }),
      );
      const trunkMat = trackCMat(
        new THREE.MeshStandardMaterial({
          color: 0x78350f,
          roughness: 0.8,
        }),
      );
      const tiers = [
        { y: -0.078, r: 0.022, h: 0.032 },
        { y: -0.102, r: 0.03, h: 0.036 },
        { y: -0.128, r: 0.038, h: 0.04 },
      ];
      for (const t of tiers) {
        const cone = new THREE.Mesh(
          trackCGeo(new THREE.ConeGeometry(t.r, t.h, 8)),
          greenMat,
        );
        cone.scale.set(1.0, 1.0, 0.22);
        cone.position.set(0, t.y, 0);
        mirrorCharmPivot.add(cone);
      }
      const trunk = new THREE.Mesh(
        trackCGeo(new THREE.BoxGeometry(0.012, 0.016, 0.006)),
        trunkMat,
      );
      trunk.position.set(0, -0.154, 0);
      mirrorCharmPivot.add(trunk);
    } else if (charm === 'dice') {
      // Central split knot + two mathematically exact branch cords directly into each die
      const knotPos = new THREE.Vector3(0, -0.052, 0);
      addCordSegment(topOrigin, knotPos);
      const knot = new THREE.Mesh(
        trackCGeo(new THREE.SphereGeometry(0.0042, 8, 6)),
        cordMat,
      );
      knot.position.copy(knotPos);
      mirrorCharmPivot.add(knot);

      const plushRedMat = trackCMat(
        new THREE.MeshStandardMaterial({
          color: 0xdc2626,
          roughness: 0.92,
          metalness: 0.02,
        }),
      );
      const pipMat = trackCMat(new THREE.MeshBasicMaterial({ color: 0xf8fafc }));
      const dieGeo = trackCGeo(new THREE.BoxGeometry(0.036, 0.036, 0.036));
      const pipGeo = trackCGeo(new THREE.CircleGeometry(0.0042, 10));

      const diceOffsets: [number, number, number, number][] = [
        [-0.022, -0.095, 0.004, 0.22],
        [0.024, -0.116, -0.005, -0.28],
      ];
      for (const [dx, dy, dz, rot] of diceOffsets) {
        const dieGrp = new THREE.Group();
        dieGrp.position.set(dx, dy, dz);
        dieGrp.rotation.set(0.18, rot, rot * 0.6);
        dieGrp.add(new THREE.Mesh(dieGeo, plushRedMat));

        // Exact attachment point on the top center of this rotated die
        const attachLocal = new THREE.Vector3(0, 0.016, 0)
          .applyEuler(dieGrp.rotation)
          .add(dieGrp.position);
        addCordSegment(knotPos, attachLocal, 0.002);

        // 5 pips on front face (+Z)
        for (const [px, py] of [
          [0, 0],
          [-0.009, 0.009],
          [0.009, 0.009],
          [-0.009, -0.009],
          [0.009, -0.009],
        ]) {
          const pip = new THREE.Mesh(pipGeo, pipMat);
          pip.position.set(px, py, 0.0186);
          dieGrp.add(pip);
        }
        mirrorCharmPivot.add(dieGrp);
      }
    } else if (charm === 'boxingGloves') {
      // Central split knot + two exact lace cords directly into each glove's wrist cuff
      const knotPos = new THREE.Vector3(0, -0.052, 0);
      addCordSegment(topOrigin, knotPos);
      const knot = new THREE.Mesh(
        trackCGeo(new THREE.SphereGeometry(0.0045, 8, 6)),
        cordMat,
      );
      knot.position.copy(knotPos);
      mirrorCharmPivot.add(knot);

      const gloveMat = trackCMat(
        new THREE.MeshPhysicalMaterial({
          color: 0xdc2626,
          roughness: 0.36,
          metalness: 0.1,
          clearcoat: 0.55,
        }),
      );
      const cuffMat = trackCMat(
        new THREE.MeshStandardMaterial({
          color: 0xf8fafc,
          roughness: 0.65,
        }),
      );
      for (const side of [-1, 1]) {
        const gGrp = new THREE.Group();
        gGrp.position.set(side * 0.024, side < 0 ? -0.102 : -0.114, 0);
        gGrp.rotation.z = side * -0.18;

        const fist = new THREE.Mesh(
          trackCGeo(new THREE.SphereGeometry(0.024, 14, 12)),
          gloveMat,
        );
        fist.scale.set(0.95, 1.15, 0.88);
        gGrp.add(fist);

        const thumb = new THREE.Mesh(
          trackCGeo(new THREE.SphereGeometry(0.012, 10, 8)),
          gloveMat,
        );
        thumb.position.set(-side * 0.017, -0.004, 0.008);
        gGrp.add(thumb);

        const cuff = new THREE.Mesh(
          trackCGeo(new THREE.CylinderGeometry(0.015, 0.017, 0.016, 12)),
          cuffMat,
        );
        cuff.position.set(0, 0.025, 0);
        gGrp.add(cuff);

        // Exact top-of-cuff attachment point in pivot space
        const cuffTopWorld = new THREE.Vector3(0, 0.031, 0)
          .applyEuler(gGrp.rotation)
          .add(gGrp.position);
        addCordSegment(knotPos, cuffTopWorld, 0.002);

        mirrorCharmPivot.add(gGrp);
      }
    } else if (charm === 'crescentStar') {
      const crimsonMat = trackCMat(
        new THREE.MeshPhysicalMaterial({
          color: 0xdc2626,
          roughness: 0.22,
          metalness: 0.25,
          clearcoat: 1.0,
        }),
      );
      const goldMat = trackCMat(
        new THREE.MeshStandardMaterial({
          color: 0xfde047,
          emissive: 0xd97706,
          emissiveIntensity: 0.35,
          roughness: 0.18,
          metalness: 0.92,
        }),
      );

      // Gold cord + jewelry bail ring soldered to the top of the medallion bezel (y = -0.068)
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.062, 0));
      const bail = new THREE.Mesh(
        trackCGeo(new THREE.TorusGeometry(0.0068, 0.0022, 6, 14)),
        goldMat,
      );
      bail.position.set(0, -0.064, 0);
      mirrorCharmPivot.add(bail);

      // Medallion disc + golden bezel
      const disc = new THREE.Mesh(
        trackCGeo(new THREE.CylinderGeometry(0.036, 0.036, 0.008, 24)),
        crimsonMat,
      );
      disc.rotation.x = Math.PI / 2;
      disc.position.set(0, -0.104, 0);
      mirrorCharmPivot.add(disc);

      const bezel = new THREE.Mesh(
        trackCGeo(new THREE.TorusGeometry(0.036, 0.004, 8, 24)),
        goldMat,
      );
      bezel.position.set(0, -0.104, 0);
      mirrorCharmPivot.add(bezel);

      // Raised gold crescent arc + 5-pointed star on front face
      const crescent = new THREE.Mesh(
        trackCGeo(
          new THREE.TorusGeometry(0.015, 0.0042, 8, 20, Math.PI * 1.45),
        ),
        goldMat,
      );
      crescent.position.set(-0.005, -0.104, 0.005);
      crescent.rotation.z = Math.PI * 0.28;
      mirrorCharmPivot.add(crescent);

      const starShape = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 0.01 : 0.0044;
        const a = (i / 10) * Math.PI * 2 + Math.PI * 0.5;
        const sx = Math.cos(a) * r;
        const sy = Math.sin(a) * r;
        if (i === 0) starShape.moveTo(sx, sy);
        else starShape.lineTo(sx, sy);
      }
      starShape.closePath();
      const starGeo = trackCGeo(
        new THREE.ExtrudeGeometry(starShape, { depth: 0.004, bevelEnabled: false }),
      );
      const star = new THREE.Mesh(starGeo, goldMat);
      star.position.set(0.012, -0.104, 0.004);
      mirrorCharmPivot.add(star);
    } else if (charm === 'turbo') {
      const chromeMat = trackCMat(
        new THREE.MeshStandardMaterial({
          color: 0xe4e4e7,
          roughness: 0.14,
          metalness: 0.96,
        }),
      );
      const darkInletMat = trackCMat(
        new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          roughness: 0.4,
          metalness: 0.7,
        }),
      );
      const bladeMat = trackCMat(
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 0.45,
          roughness: 0.22,
          metalness: 0.88,
        }),
      );

      // Cord + chrome keychain ring anchored cleanly into top of turbo snail (y = -0.064)
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.061, 0));
      const keyRing = new THREE.Mesh(
        trackCGeo(new THREE.TorusGeometry(0.007, 0.0022, 6, 14)),
        chromeMat,
      );
      keyRing.position.set(0, -0.063, 0);
      mirrorCharmPivot.add(keyRing);

      // Snail compressor housing
      const snail = new THREE.Mesh(
        trackCGeo(new THREE.TorusGeometry(0.025, 0.013, 12, 22)),
        chromeMat,
      );
      snail.position.set(0, -0.102, 0);
      mirrorCharmPivot.add(snail);

      const outlet = new THREE.Mesh(
        trackCGeo(new THREE.CylinderGeometry(0.009, 0.011, 0.032, 12)),
        chromeMat,
      );
      outlet.rotation.z = Math.PI * 0.48;
      outlet.position.set(0.024, -0.078, 0);
      mirrorCharmPivot.add(outlet);

      const inletBack = new THREE.Mesh(
        trackCGeo(new THREE.CircleGeometry(0.019, 16)),
        darkInletMat,
      );
      inletBack.position.set(0, -0.102, 0.005);
      mirrorCharmPivot.add(inletBack);

      // Spinning compressor impeller wheel
      const impGroup = new THREE.Group();
      impGroup.position.set(0, -0.102, 0.009);
      mirrorCharmPivot.add(impGroup);
      charmTurboImpeller = impGroup;

      const nut = new THREE.Mesh(
        trackCGeo(new THREE.CylinderGeometry(0.0045, 0.0045, 0.008, 8)),
        chromeMat,
      );
      nut.rotation.x = Math.PI / 2;
      impGroup.add(nut);

      const finGeo = trackCGeo(new THREE.BoxGeometry(0.03, 0.004, 0.003));
      for (let i = 0; i < 4; i++) {
        const fin = new THREE.Mesh(finGeo, bladeMat);
        fin.rotation.z = (i * Math.PI) / 4;
        impGroup.add(fin);
      }
    } else if (charm === 'goldCrown') {
      const goldMat = trackCMat(
        new THREE.MeshPhysicalMaterial({
          color: 0xfbbf24,
          roughness: 0.16,
          metalness: 0.95,
          clearcoat: 0.9,
          emissive: 0x78350f,
          emissiveIntensity: 0.25,
        }),
      );
      const velvetMat = trackCMat(
        new THREE.MeshStandardMaterial({
          color: 0x991b1b,
          roughness: 0.8,
        }),
      );
      const rubyMat = trackCMat(
        new THREE.MeshBasicMaterial({ color: 0xef4444 }),
      );

      // Extended golden chain cord down into royal finial orb + hanger loop atop the crown dome
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.078, 0));

      const crownLoop = new THREE.Mesh(
        trackCGeo(new THREE.TorusGeometry(0.0062, 0.002, 6, 14)),
        goldMat,
      );
      crownLoop.position.set(0, -0.08, 0);
      mirrorCharmPivot.add(crownLoop);

      const finialOrb = new THREE.Mesh(
        trackCGeo(new THREE.SphereGeometry(0.006, 10, 8)),
        goldMat,
      );
      finialOrb.position.set(0, -0.087, 0);
      mirrorCharmPivot.add(finialOrb);

      const base = new THREE.Mesh(
        trackCGeo(new THREE.CylinderGeometry(0.028, 0.025, 0.016, 16)),
        goldMat,
      );
      base.position.set(0, -0.114, 0);
      mirrorCharmPivot.add(base);

      const dome = new THREE.Mesh(
        trackCGeo(
          new THREE.SphereGeometry(0.023, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
        ),
        velvetMat,
      );
      dome.position.set(0, -0.11, 0);
      mirrorCharmPivot.add(dome);

      const spireGeo = trackCGeo(new THREE.ConeGeometry(0.007, 0.022, 4));
      const gemGeo = trackCGeo(new THREE.SphereGeometry(0.004, 8, 8));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const spire = new THREE.Mesh(spireGeo, goldMat);
        spire.position.set(Math.sin(a) * 0.025, -0.097, Math.cos(a) * 0.025);
        mirrorCharmPivot.add(spire);

        const gem = new THREE.Mesh(gemGeo, rubyMat);
        gem.position.set(Math.sin(a) * 0.028, -0.114, Math.cos(a) * 0.028);
        mirrorCharmPivot.add(gem);
      }
    } else if (charm === 'miniWheel') {
      // Mini Motorsport Alloy Wheel & Tire hanging flush from chrome eyelet
      const tireM = trackCMat(new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.88 }));
      const rimM = trackCMat(new THREE.MeshStandardMaterial({ color: 0xf5c542, roughness: 0.18, metalness: 0.94 }));
      const capM = trackCMat(new THREE.MeshBasicMaterial({ color: 0xef4444 }));

      addCordSegment(topOrigin, new THREE.Vector3(0, -0.068, 0));
      const eye = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.0065, 0.0022, 6, 14)), rimM);
      eye.position.set(0, -0.07, 0);
      mirrorCharmPivot.add(eye);

      const tire = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.027, 0.011, 10, 22)), tireM);
      tire.position.set(0, -0.105, 0);
      mirrorCharmPivot.add(tire);

      const rimRing = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.018, 0.003, 8, 20)), rimM);
      rimRing.position.set(0, -0.105, 0);
      mirrorCharmPivot.add(rimRing);

      const spokeGeo = trackCGeo(new THREE.BoxGeometry(0.036, 0.0045, 0.005));
      for (let i = 0; i < 5; i++) {
        const sp = new THREE.Mesh(spokeGeo, rimM);
        sp.position.set(0, -0.105, 0);
        sp.rotation.z = (i * Math.PI) / 5;
        mirrorCharmPivot.add(sp);
      }
      const cap = new THREE.Mesh(trackCGeo(new THREE.CylinderGeometry(0.006, 0.006, 0.009, 10)), capM);
      cap.rotation.x = Math.PI / 2;
      cap.position.set(0, -0.105, 0);
      mirrorCharmPivot.add(cap);
    } else if (charm === 'goldenHorseshoe') {
      // Lucky 24K Gold Horseshoe hanging cleanly from twin gold cords attached to both tips
      const goldM = trackCMat(
        new THREE.MeshPhysicalMaterial({
          color: 0xfbbf24,
          roughness: 0.15,
          metalness: 0.95,
          clearcoat: 0.9,
        }),
      );
      const knotPos = new THREE.Vector3(0, -0.048, 0);
      addCordSegment(topOrigin, knotPos);
      const knot = new THREE.Mesh(trackCGeo(new THREE.SphereGeometry(0.0042, 8, 6)), goldM);
      knot.position.copy(knotPos);
      mirrorCharmPivot.add(knot);

      // U-shaped horseshoe arc centered at y = -0.104 (tips at x = ±0.027, y = -0.09)
      const shoe = new THREE.Mesh(
        trackCGeo(new THREE.TorusGeometry(0.027, 0.0068, 10, 22, Math.PI * 1.32)),
        goldM,
      );
      shoe.position.set(0, -0.104, 0);
      shoe.rotation.z = Math.PI * 0.84;
      mirrorCharmPivot.add(shoe);

      // Exact tip eyelets & zero-gap twin gold cords
      for (const sx of [-1, 1]) {
        const tipPos = new THREE.Vector3(sx * 0.024, -0.088, 0);
        const ring = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.005, 0.0018, 6, 12)), goldM);
        ring.position.copy(tipPos);
        mirrorCharmPivot.add(ring);
        addCordSegment(knotPos, tipPos, 0.002);
      }
    } else if (charm === 'miniHelmet') {
      // Racing F1 Helmet with tinted visor & zero-gap top crown eyelet
      const shellM = trackCMat(
        new THREE.MeshPhysicalMaterial({
          color: 0xe11d48,
          roughness: 0.14,
          metalness: 0.35,
          clearcoat: 1.0,
        }),
      );
      const visorM = trackCMat(
        new THREE.MeshPhysicalMaterial({
          color: 0x0ea5e9,
          emissive: 0x0284c7,
          emissiveIntensity: 0.35,
          roughness: 0.08,
          metalness: 0.9,
        }),
      );
      const whiteM = trackCMat(new THREE.MeshBasicMaterial({ color: 0xf8fafc }));

      addCordSegment(topOrigin, new THREE.Vector3(0, -0.068, 0));
      const loop = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.006, 0.002, 6, 14)), whiteM);
      loop.position.set(0, -0.071, 0);
      mirrorCharmPivot.add(loop);

      const shell = new THREE.Mesh(trackCGeo(new THREE.SphereGeometry(0.03, 18, 14)), shellM);
      shell.scale.set(0.95, 1.0, 1.12);
      shell.position.set(0, -0.102, 0);
      mirrorCharmPivot.add(shell);

      const stripe = new THREE.Mesh(trackCGeo(new THREE.BoxGeometry(0.01, 0.062, 0.064)), whiteM);
      stripe.position.set(0, -0.101, 0);
      mirrorCharmPivot.add(stripe);

      const visor = new THREE.Mesh(
        trackCGeo(new THREE.CylinderGeometry(0.0315, 0.0315, 0.017, 16, 1, true, -0.95, 1.9)),
        visorM,
      );
      visor.position.set(0, -0.102, 0.004);
      mirrorCharmPivot.add(visor);
    } else if (charm === 'skullChrome') {
      // Polished Chrome Skull with glowing red eyes
      const chromeM = trackCMat(
        new THREE.MeshStandardMaterial({ color: 0xe4e4e7, roughness: 0.12, metalness: 0.98 }),
      );
      const eyeM = trackCMat(new THREE.MeshBasicMaterial({ color: 0xef4444 }));

      addCordSegment(topOrigin, new THREE.Vector3(0, -0.068, 0));
      const ring = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.0062, 0.002, 6, 14)), chromeM);
      ring.position.set(0, -0.07, 0);
      mirrorCharmPivot.add(ring);

      const cranium = new THREE.Mesh(trackCGeo(new THREE.SphereGeometry(0.026, 16, 12)), chromeM);
      cranium.scale.set(0.92, 1.05, 1.0);
      cranium.position.set(0, -0.098, 0);
      mirrorCharmPivot.add(cranium);

      const jaw = new THREE.Mesh(trackCGeo(new THREE.BoxGeometry(0.028, 0.018, 0.024)), chromeM);
      jaw.position.set(0, -0.12, 0.004);
      mirrorCharmPivot.add(jaw);

      const eyeGeo = trackCGeo(new THREE.SphereGeometry(0.0055, 8, 8));
      for (const sx of [-1, 1]) {
        const eye = new THREE.Mesh(eyeGeo, eyeM);
        eye.position.set(sx * 0.01, -0.1, 0.022);
        mirrorCharmPivot.add(eye);
      }
    } else if (charm === 'katanaMini') {
      // Mini Samurai Katana suspended horizontally by twin zero-gap gold cords!
      const scabbardM = trackCMat(
        new THREE.MeshPhysicalMaterial({ color: 0x991b1b, roughness: 0.18, clearcoat: 1.0 }),
      );
      const wrapM = trackCMat(new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 }));
      const goldM = trackCMat(
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.2, metalness: 0.95 }),
      );

      const knotPos = new THREE.Vector3(0, -0.056, 0);
      addCordSegment(topOrigin, knotPos);
      const knot = new THREE.Mesh(trackCGeo(new THREE.SphereGeometry(0.0042, 8, 6)), goldM);
      knot.position.copy(knotPos);
      mirrorCharmPivot.add(knot);

      const katanaGrp = new THREE.Group();
      katanaGrp.position.set(0, -0.106, 0);
      katanaGrp.rotation.z = 0.12;
      mirrorCharmPivot.add(katanaGrp);

      // Scabbard + handle + gold tsuba guard
      const scabbard = new THREE.Mesh(
        trackCGeo(new THREE.CylinderGeometry(0.0065, 0.0052, 0.095, 10)),
        scabbardM,
      );
      scabbard.rotation.z = Math.PI / 2;
      scabbard.position.x = -0.018;
      katanaGrp.add(scabbard);

      const handle = new THREE.Mesh(
        trackCGeo(new THREE.CylinderGeometry(0.0068, 0.0068, 0.036, 10)),
        wrapM,
      );
      handle.rotation.z = Math.PI / 2;
      handle.position.x = 0.048;
      katanaGrp.add(handle);

      const tsuba = new THREE.Mesh(
        trackCGeo(new THREE.CylinderGeometry(0.014, 0.014, 0.004, 14)),
        goldM,
      );
      tsuba.rotation.z = Math.PI / 2;
      tsuba.position.x = 0.03;
      katanaGrp.add(tsuba);

      // Two gold collar rings on scabbard + exact zero-gap twin cords to knotPos
      for (const localX of [-0.035, 0.01]) {
        const ring = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.0075, 0.0018, 6, 12)), goldM);
        ring.rotation.y = Math.PI / 2;
        ring.position.set(localX, 0, 0);
        katanaGrp.add(ring);

        const attachWorld = new THREE.Vector3(localX, 0.0065, 0)
          .applyEuler(katanaGrp.rotation)
          .add(katanaGrp.position);
        addCordSegment(knotPos, attachWorld, 0.0019);
      }
    } else if (charm === 'discoBall') {
      // Animated Spinning Faceted Mirror Disco Ball with sparkling tiles
      const silverM = trackCMat(
        new THREE.MeshStandardMaterial({ color: 0xf4f4f5, roughness: 0.08, metalness: 0.98 }),
      );
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.068, 0));
      const loop = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.006, 0.002, 6, 14)), silverM);
      loop.position.set(0, -0.07, 0);
      mirrorCharmPivot.add(loop);

      const discoGrp = new THREE.Group();
      discoGrp.position.set(0, -0.104, 0);
      mirrorCharmPivot.add(discoGrp);
      charmDiscoGroup = discoGrp;

      const ball = new THREE.Mesh(trackCGeo(new THREE.IcosahedronGeometry(0.032, 1)), silverM);
      discoGrp.add(ball);

      // 10 glowing sparkling mirror tiles around equator & tropics
      const tileGeo = trackCGeo(new THREE.BoxGeometry(0.009, 0.009, 0.004));
      const tileColors = [0x38bdf8, 0xf472b6, 0xfacc15, 0x4ade80, 0xc084fc];
      charmDiscoSparkMats = [];
      for (let i = 0; i < 10; i++) {
        const tMat = trackCMat(
          new THREE.MeshStandardMaterial({
            color: tileColors[i % tileColors.length],
            emissive: tileColors[i % tileColors.length],
            emissiveIntensity: 1.8,
            roughness: 0.1,
            metalness: 0.9,
          }),
        );
        charmDiscoSparkMats.push(tMat);
        const a = (i / 10) * Math.PI * 2;
        const yOff = i % 2 === 0 ? 0.008 : -0.008;
        const tile = new THREE.Mesh(tileGeo, tMat);
        tile.position.set(Math.sin(a) * 0.031, yOff, Math.cos(a) * 0.031);
        tile.lookAt(0, yOff, 0);
        discoGrp.add(tile);
      }
    } else if (charm === 'crystalPrism') {
      // Animated Spinning Rainbow-Shifting Diamond Crystal Prism
      const crystalM = trackCMat(
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x7c3aed,
          emissiveIntensity: 1.4,
          roughness: 0.06,
          metalness: 0.45,
          transparent: true,
          opacity: 0.88,
        }),
      );
      charmCrystalMat = crystalM;

      addCordSegment(topOrigin, new THREE.Vector3(0, -0.064, 0));
      const bail = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.006, 0.002, 6, 14)), cordMat);
      bail.position.set(0, -0.067, 0);
      mirrorCharmPivot.add(bail);

      const cGrp = new THREE.Group();
      cGrp.position.set(0, -0.105, 0);
      mirrorCharmPivot.add(cGrp);
      charmCrystalGroup = cGrp;

      const prism = new THREE.Mesh(trackCGeo(new THREE.OctahedronGeometry(0.03, 0)), crystalM);
      prism.scale.set(0.75, 1.35, 0.75);
      cGrp.add(prism);
    } else if (charm === 'plasmaOrb') {
      // Animated Dual-Axis Gyro Energy Plasma Orb inside cord-mounted gimbal socket
      const ringM = trackCMat(
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0ea5e9,
          emissiveIntensity: 1.9,
          roughness: 0.14,
          metalness: 0.85,
        }),
      );
      const coreM = trackCMat(
        new THREE.MeshStandardMaterial({
          color: 0xe879f9,
          emissive: 0xc026d3,
          emissiveIntensity: 2.4,
          roughness: 0.1,
        }),
      );

      addCordSegment(topOrigin, new THREE.Vector3(0, -0.065, 0));
      const mountLoop = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.006, 0.002, 6, 14)), ringM);
      mountLoop.position.set(0, -0.068, 0);
      mirrorCharmPivot.add(mountLoop);

      // Fixed outer cradle ring touching mountLoop at y = -0.070
      const cradle = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.035, 0.0028, 8, 24)), cordMat);
      cradle.position.set(0, -0.105, 0);
      mirrorCharmPivot.add(cradle);

      const core = new THREE.Mesh(trackCGeo(new THREE.SphereGeometry(0.015, 14, 12)), coreM);
      core.position.set(0, -0.105, 0);
      mirrorCharmPivot.add(core);

      const ringA = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.029, 0.0028, 8, 24)), ringM);
      ringA.position.set(0, -0.105, 0);
      mirrorCharmPivot.add(ringA);
      charmPlasmaRingA = ringA;

      const ringB = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.023, 0.0026, 8, 22)), coreM);
      ringB.position.set(0, -0.105, 0);
      mirrorCharmPivot.add(ringB);
      charmPlasmaRingB = ringB;
    } else if (charm === 'neonHeart') {
      // Animated Beating Neon Pink Heart
      const heartM = trackCMat(
        new THREE.MeshStandardMaterial({
          color: 0xf43f5e,
          emissive: 0xec4899,
          emissiveIntensity: 1.9,
          roughness: 0.15,
          metalness: 0.25,
        }),
      );
      charmHeartMat = heartM;

      // Cord & loop seated solidly into the top cleft of the heart (cleft y = -0.091)
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.091, 0));
      const loop = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.0058, 0.002, 6, 14)), cordMat);
      loop.position.set(0, -0.088, 0);
      mirrorCharmPivot.add(loop);

      const hGrp = new THREE.Group();
      hGrp.position.set(0, -0.104, 0);
      mirrorCharmPivot.add(hGrp);
      charmHeartGroup = hGrp;

      const hShape = new THREE.Shape();
      hShape.moveTo(0, -0.026);
      hShape.bezierCurveTo(-0.032, -0.004, -0.036, 0.024, -0.016, 0.028);
      hShape.bezierCurveTo(-0.005, 0.03, 0, 0.02, 0, 0.014);
      hShape.bezierCurveTo(0, 0.02, 0.005, 0.03, 0.016, 0.028);
      hShape.bezierCurveTo(0.036, 0.024, 0.032, -0.004, 0, -0.026);
      const heartGeo = trackCGeo(
        new THREE.ExtrudeGeometry(hShape, {
          depth: 0.012,
          bevelEnabled: true,
          bevelThickness: 0.004,
          bevelSize: 0.003,
          bevelSegments: 3,
        }),
      );
      heartGeo.center();
      const heartMesh = new THREE.Mesh(heartGeo, heartM);
      hGrp.add(heartMesh);
    } else if (charm === 'miniJet') {
      // Animated Mini Jet Engine Turbine with RPM-spinning intake fan + glowing afterburner!
      const steelM = trackCMat(
        new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.18, metalness: 0.94 }),
      );
      const darkM = trackCMat(
        new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.45, metalness: 0.72 }),
      );
      const abM = trackCMat(
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0ea5e9,
          emissiveIntensity: 2.2,
          roughness: 0.12,
        }),
      );
      charmJetAfterburnerMat = abM;

      addCordSegment(topOrigin, new THREE.Vector3(0, -0.072, 0));
      const loop = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.0065, 0.0022, 6, 14)), steelM);
      loop.position.set(0, -0.075, 0);
      mirrorCharmPivot.add(loop);

      // Nacelle body oriented facing viewer (+Z intake, -Z exhaust)
      const nacelle = new THREE.Mesh(
        trackCGeo(new THREE.CylinderGeometry(0.024, 0.021, 0.056, 18)),
        steelM,
      );
      nacelle.rotation.x = Math.PI / 2;
      nacelle.position.set(0, -0.104, 0);
      mirrorCharmPivot.add(nacelle);

      const intakeRim = new THREE.Mesh(
        trackCGeo(new THREE.TorusGeometry(0.023, 0.0035, 8, 20)),
        steelM,
      );
      intakeRim.position.set(0, -0.104, 0.028);
      mirrorCharmPivot.add(intakeRim);

      const coreBack = new THREE.Mesh(trackCGeo(new THREE.CircleGeometry(0.02, 16)), darkM);
      coreBack.position.set(0, -0.104, 0.02);
      mirrorCharmPivot.add(coreBack);

      // RPM-reactive spinning fan blades (reuses charmTurboImpeller!)
      const fanGrp = new THREE.Group();
      fanGrp.position.set(0, -0.104, 0.024);
      mirrorCharmPivot.add(fanGrp);
      charmTurboImpeller = fanGrp;

      const spinner = new THREE.Mesh(trackCGeo(new THREE.ConeGeometry(0.006, 0.014, 10)), steelM);
      spinner.rotation.x = Math.PI / 2;
      fanGrp.add(spinner);

      const bladeGeo = trackCGeo(new THREE.BoxGeometry(0.038, 0.0042, 0.0025));
      for (let i = 0; i < 6; i++) {
        const bl = new THREE.Mesh(bladeGeo, abM);
        bl.rotation.z = (i * Math.PI) / 6;
        fanGrp.add(bl);
      }

      // Rear pulsing afterburner cone
      const abCone = new THREE.Mesh(trackCGeo(new THREE.ConeGeometry(0.015, 0.028, 12)), abM);
      abCone.rotation.x = -Math.PI / 2;
      abCone.position.set(0, -0.104, -0.04);
      mirrorCharmPivot.add(abCone);
    } else if (charm === 'checkeredFlag') {
      // Level 8 Exclusive: Checkered Racing Flag Charm (twin cords anchored to pole top & upper flag corner)
      const whiteM = trackCMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 }));
      const blackM = trackCMat(new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4 }));
      const poleM = trackCMat(new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9, roughness: 0.2 }));
      const knotPos = new THREE.Vector3(0, -0.054, 0);
      addCordSegment(topOrigin, knotPos);
      const knot = new THREE.Mesh(trackCGeo(new THREE.SphereGeometry(0.0038, 8, 6)), poleM);
      knot.position.copy(knotPos);
      mirrorCharmPivot.add(knot);
      addCordSegment(knotPos, new THREE.Vector3(-0.022, -0.076, 0), 0.0019);
      addCordSegment(knotPos, new THREE.Vector3(0.016, -0.08, 0), 0.0019);
      addBailRing(-0.075, poleM, 0.0042, -0.022, 0);
      addBailRing(-0.079, poleM, 0.0042, 0.016, 0);
      const pole = new THREE.Mesh(trackCGeo(new THREE.CylinderGeometry(0.0025, 0.0025, 0.056, 8)), poleM);
      pole.position.set(-0.022, -0.102, 0);
      mirrorCharmPivot.add(pole);
      const sqGeo = trackCGeo(new THREE.BoxGeometry(0.011, 0.011, 0.005));
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
          const sq = new THREE.Mesh(sqGeo, (r + c) % 2 === 0 ? whiteM : blackM);
          sq.position.set(-0.014 + c * 0.011, -0.084 - r * 0.011, Math.sin(c * 0.9) * 0.003);
          mirrorCharmPivot.add(sq);
        }
      }
    } else if (charm === 'goldPiston') {
      // Level 35 Exclusive: 24K Polished Gold Engine Piston
      const goldM = trackCMat(
        new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          metalness: 0.96,
          roughness: 0.14,
          emissive: 0x92400e,
          emissiveIntensity: 0.35,
        }),
      );
      const steelM = trackCMat(new THREE.MeshStandardMaterial({ color: 0xe4e4e7, metalness: 0.92, roughness: 0.18 }));
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.077, 0));
      addBailRing(-0.074, goldM);
      const head = new THREE.Mesh(trackCGeo(new THREE.CylinderGeometry(0.018, 0.018, 0.026, 16)), goldM);
      head.position.set(0, -0.088, 0);
      mirrorCharmPivot.add(head);
      const rod = new THREE.Mesh(trackCGeo(new THREE.BoxGeometry(0.007, 0.036, 0.007)), steelM);
      rod.position.set(0, -0.114, 0);
      mirrorCharmPivot.add(rod);
      const crank = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.011, 0.0035, 8, 16)), goldM);
      crank.position.set(0, -0.136, 0);
      mirrorCharmPivot.add(crank);
    } else if (charm === 'apexStar') {
      // Level 85 Exclusive: Spinning Crimson-Gold Diamond Star mounted inside a fixed gold cradle hoop
      const goldM = trackCMat(
        new THREE.MeshStandardMaterial({
          color: 0xfde047,
          metalness: 0.96,
          roughness: 0.1,
          emissive: 0xd97706,
          emissiveIntensity: 0.8,
        }),
      );
      const rubyM = trackCMat(
        new THREE.MeshStandardMaterial({
          color: 0xf43f5e,
          emissive: 0xe11d48,
          emissiveIntensity: 2.2,
          roughness: 0.12,
        }),
      );
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.074, 0));
      addBailRing(-0.072, goldM, 0.0056);
      const cradle = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.031, 0.0024, 8, 24)), goldM);
      cradle.position.set(0, -0.106, 0);
      mirrorCharmPivot.add(cradle);
      const starGrp = new THREE.Group();
      starGrp.position.set(0, -0.106, 0);
      mirrorCharmPivot.add(starGrp);
      charmTurboImpeller = starGrp;
      const core = new THREE.Mesh(trackCGeo(new THREE.OctahedronGeometry(0.016, 0)), rubyM);
      starGrp.add(core);
      const rayGeo = trackCGeo(new THREE.ConeGeometry(0.006, 0.022, 4));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const ray = new THREE.Mesh(rayGeo, goldM);
        ray.position.set(Math.cos(a) * 0.019, Math.sin(a) * 0.019, 0);
        ray.rotation.z = a - Math.PI / 2;
        starGrp.add(ray);
      }
    } else if (charm === 'luckyClover') {
      // Emerald Four-Leaf Clover Charm
      const leafM = trackCMat(new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.35, metalness: 0.2 }));
      const stemM = trackCMat(new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.85 }));
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.092, 0));
      addBailRing(-0.085, stemM);
      const leafGeo = trackCGeo(new THREE.SphereGeometry(0.014, 10, 8));
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const leaf = new THREE.Mesh(leafGeo, leafM);
        leaf.scale.set(1, 1, 0.45);
        leaf.position.set(Math.cos(a) * 0.015, -0.105 + Math.sin(a) * 0.015, 0);
        mirrorCharmPivot.add(leaf);
      }
      const center = new THREE.Mesh(trackCGeo(new THREE.SphereGeometry(0.007, 8, 8)), stemM);
      center.position.set(0, -0.105, 0.002);
      mirrorCharmPivot.add(center);
    } else if (charm === 'miniTrophy') {
      // Miniature Gold-Silver Racing Cup
      const goldM = trackCMat(new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.94, roughness: 0.14 }));
      const baseM = trackCMat(new THREE.MeshStandardMaterial({ color: 0x27272a, metalness: 0.6, roughness: 0.3 }));
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.084, 0));
      addBailRing(-0.08, goldM);
      const cup = new THREE.Mesh(trackCGeo(new THREE.CylinderGeometry(0.02, 0.009, 0.028, 14)), goldM);
      cup.position.set(0, -0.095, 0);
      mirrorCharmPivot.add(cup);
      const base = new THREE.Mesh(trackCGeo(new THREE.CylinderGeometry(0.013, 0.016, 0.012, 12)), baseM);
      base.position.set(0, -0.116, 0);
      mirrorCharmPivot.add(base);
    } else if (charm === 'miniNitro') {
      // Metallic Blue NOS Bottle with Chrome Valve
      const nosM = trackCMat(new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.85, roughness: 0.16 }));
      const chromeM = trackCMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.95, roughness: 0.1 }));
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.076, 0));
      addBailRing(-0.072, chromeM);
      const valve = new THREE.Mesh(trackCGeo(new THREE.CylinderGeometry(0.005, 0.007, 0.012, 10)), chromeM);
      valve.position.set(0, -0.078, 0);
      mirrorCharmPivot.add(valve);
      const tank = new THREE.Mesh(trackCGeo(new THREE.CapsuleGeometry(0.013, 0.032, 8, 12)), nosM);
      tank.position.set(0, -0.106, 0);
      mirrorCharmPivot.add(tank);
    } else if (charm === 'diamondGem') {
      // Spinning Faceted Ice-Sapphire Diamond Gem (spins cleanly around vertical Y axis beneath bail)
      const diaM = trackCMat(
        new THREE.MeshStandardMaterial({
          color: 0x7dd3fc,
          emissive: 0x0284c7,
          emissiveIntensity: 1.6,
          metalness: 0.35,
          roughness: 0.06,
          transparent: true,
          opacity: 0.9,
        }),
      );
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.092, 0));
      addBailRing(-0.088, cordMat);
      const dGrp = new THREE.Group();
      dGrp.position.set(0, -0.105, 0);
      mirrorCharmPivot.add(dGrp);
      charmDiscoGroup = dGrp;
      const top = new THREE.Mesh(trackCGeo(new THREE.CylinderGeometry(0.013, 0.022, 0.012, 8)), diaM);
      top.position.y = 0.009;
      dGrp.add(top);
      const bot = new THREE.Mesh(trackCGeo(new THREE.ConeGeometry(0.022, 0.024, 8)), diaM);
      bot.rotation.x = Math.PI;
      bot.position.y = -0.009;
      dGrp.add(bot);
    } else if (charm === 'cyberSkull') {
      // Matte Black Skull with Pulsing Cyan-Magenta Neon Eyes & Spinning Halo
      const skullM = trackCMat(new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.35, metalness: 0.65 }));
      const eyeM = trackCMat(
        new THREE.MeshStandardMaterial({
          color: 0x22d3ee,
          emissive: 0x06b6d4,
          emissiveIntensity: 2.6,
          roughness: 0.1,
        }),
      );
      const haloM = trackCMat(
        new THREE.MeshStandardMaterial({
          color: 0xec4899,
          emissive: 0xdb2777,
          emissiveIntensity: 2.2,
          roughness: 0.12,
        }),
      );
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.083, 0));
      addBailRing(-0.079, skullM);
      const head = new THREE.Mesh(trackCGeo(new THREE.SphereGeometry(0.018, 12, 10)), skullM);
      head.position.set(0, -0.098, 0);
      mirrorCharmPivot.add(head);
      const jaw = new THREE.Mesh(trackCGeo(new THREE.BoxGeometry(0.018, 0.012, 0.016)), skullM);
      jaw.position.set(0, -0.114, 0.004);
      mirrorCharmPivot.add(jaw);
      for (const sx of [-0.007, 0.007]) {
        const eye = new THREE.Mesh(trackCGeo(new THREE.SphereGeometry(0.0042, 8, 8)), eyeM);
        eye.position.set(sx, -0.098, 0.016);
        mirrorCharmPivot.add(eye);
      }
      const ring = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.028, 0.0026, 8, 22)), haloM);
      ring.position.set(0, -0.102, 0);
      mirrorCharmPivot.add(ring);
      charmPlasmaRingA = ring;
    } else if (charm === 'turkishTea') {
      // Iconic Turkish Tulip Glass Tea (İnce Belli Çay) suspended by twin cords gripped cleanly on the glass rim!
      const glassM = trackCMat(
        new THREE.MeshStandardMaterial({
          color: 0xe0f2fe,
          roughness: 0.08,
          metalness: 0.15,
          transparent: true,
          opacity: 0.58,
        }),
      );
      const teaM = trackCMat(
        new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.15, metalness: 0.1 }),
      );
      const saucerM = trackCMat(
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.1 }),
      );
      const rimRedM = trackCMat(
        new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 }),
      );
      const spoonM = trackCMat(
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.15 }),
      );
      const knotPos = new THREE.Vector3(0, -0.056, 0);
      addCordSegment(topOrigin, knotPos);
      const knot = new THREE.Mesh(trackCGeo(new THREE.SphereGeometry(0.0038, 8, 6)), spoonM);
      knot.position.copy(knotPos);
      mirrorCharmPivot.add(knot);
      for (const sx of [-1, 1]) {
        addCordSegment(knotPos, new THREE.Vector3(sx * 0.012, -0.083, 0), 0.0018);
      }
      const rimCollar = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.0125, 0.0014, 6, 16)), spoonM);
      rimCollar.rotation.x = Math.PI * 0.5;
      rimCollar.position.set(0, -0.083, 0);
      mirrorCharmPivot.add(rimCollar);
      // Tulip waist lower bulb + upper flare
      const bulb = new THREE.Mesh(trackCGeo(new THREE.CylinderGeometry(0.0085, 0.012, 0.018, 14)), teaM);
      bulb.position.set(0, -0.106, 0);
      mirrorCharmPivot.add(bulb);
      const flare = new THREE.Mesh(trackCGeo(new THREE.CylinderGeometry(0.0125, 0.0085, 0.016, 14)), glassM);
      flare.position.set(0, -0.09, 0);
      mirrorCharmPivot.add(flare);
      const saucer = new THREE.Mesh(trackCGeo(new THREE.CylinderGeometry(0.021, 0.013, 0.004, 16)), saucerM);
      saucer.position.set(0, -0.117, 0);
      mirrorCharmPivot.add(saucer);
      const saucerRim = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.02, 0.0014, 6, 16)), rimRedM);
      saucerRim.rotation.x = Math.PI * 0.5;
      saucerRim.position.set(0, -0.115, 0);
      mirrorCharmPivot.add(saucerRim);
      const spoon = new THREE.Mesh(trackCGeo(new THREE.CylinderGeometry(0.0012, 0.0012, 0.028, 6)), spoonM);
      spoon.position.set(0.012, -0.114, 0.006);
      spoon.rotation.z = Math.PI * 0.45;
      mirrorCharmPivot.add(spoon);
    } else if (charm === 'soccerBall') {
      // Classic Black & White Faceted Soccer Ball
      const whiteM = trackCMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.48 }));
      const blackM = trackCMat(new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.52 }));
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.086, 0));
      addBailRing(-0.081, cordMat);
      const ball = new THREE.Mesh(trackCGeo(new THREE.IcosahedronGeometry(0.02, 1)), whiteM);
      ball.position.set(0, -0.102, 0);
      mirrorCharmPivot.add(ball);
      const patchGeo = trackCGeo(new THREE.CylinderGeometry(0.0065, 0.0065, 0.003, 5));
      for (const [dx, dy, dz] of [
        [0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0],
        [0.65, 0.65, 0.4], [-0.65, 0.65, 0.4], [0.65, -0.65, 0.4], [-0.65, -0.65, 0.4],
      ]) {
        const dir = new THREE.Vector3(dx, dy, dz).normalize();
        const p = new THREE.Mesh(patchGeo, blackM);
        p.position.set(0, -0.102, 0).addScaledVector(dir, 0.0195);
        p.quaternion.setFromUnitVectors(upAxis, dir);
        mirrorCharmPivot.add(p);
      }
    } else if (charm === 'miniDuck') {
      // Adorable Dangling Glossy Yellow Rubber Ducky (cord angled directly into top of duck's head)
      const yelM = trackCMat(new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25 }));
      const billM = trackCMat(new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35 }));
      const eyeM = trackCMat(new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.12 }));
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.084, 0.009));
      addBailRing(-0.08, cordMat, 0.0046, 0, 0.009);
      const body = new THREE.Mesh(trackCGeo(new THREE.SphereGeometry(0.016, 12, 10)), yelM);
      body.scale.set(0.95, 0.8, 1.25);
      body.position.set(0, -0.108, 0);
      mirrorCharmPivot.add(body);
      const head = new THREE.Mesh(trackCGeo(new THREE.SphereGeometry(0.0115, 12, 10)), yelM);
      head.position.set(0, -0.092, 0.01);
      mirrorCharmPivot.add(head);
      const bill = new THREE.Mesh(trackCGeo(new THREE.SphereGeometry(0.0065, 8, 8)), billM);
      bill.scale.set(1.1, 0.45, 1.2);
      bill.position.set(0, -0.094, 0.022);
      mirrorCharmPivot.add(bill);
      for (const sx of [-0.0065, 0.0065]) {
        const eye = new THREE.Mesh(trackCGeo(new THREE.SphereGeometry(0.0022, 6, 6)), eyeM);
        eye.position.set(sx, -0.089, 0.019);
        mirrorCharmPivot.add(eye);
      }
    } else if (charm === 'coffeeCup') {
      // Cozy Road-Trip Takeaway Coffee Cup with Kraft Sleeve & Lid
      const cupM = trackCMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55 }));
      const kraftM = trackCMat(new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.85 }));
      const lidM = trackCMat(new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4 }));
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.085, 0));
      addBailRing(-0.08, lidM);
      const cup = new THREE.Mesh(trackCGeo(new THREE.CylinderGeometry(0.014, 0.01, 0.032, 14)), cupM);
      cup.position.set(0, -0.102, 0);
      mirrorCharmPivot.add(cup);
      const sleeve = new THREE.Mesh(trackCGeo(new THREE.CylinderGeometry(0.0133, 0.0115, 0.014, 14)), kraftM);
      sleeve.position.set(0, -0.101, 0);
      mirrorCharmPivot.add(sleeve);
      const lid = new THREE.Mesh(trackCGeo(new THREE.CylinderGeometry(0.0155, 0.015, 0.006, 14)), lidM);
      lid.position.set(0, -0.084, 0);
      mirrorCharmPivot.add(lid);
    } else if (charm === 'simitRing') {
      // Crispy Braided Golden Turkish Simit Ring with Sesame Seeds!
      const breadM = trackCMat(new THREE.MeshStandardMaterial({ color: 0xc26d1f, roughness: 0.78 }));
      const sesameM = trackCMat(new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.85 }));
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.082, 0));
      addBailRing(-0.076, cordMat, 0.0048);
      const ring = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.019, 0.0068, 8, 18)), breadM);
      ring.position.set(0, -0.102, 0);
      mirrorCharmPivot.add(ring);
      const seedGeo = trackCGeo(new THREE.BoxGeometry(0.0022, 0.0014, 0.0014));
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const s = new THREE.Mesh(seedGeo, sesameM);
        s.position.set(Math.cos(a) * 0.019, -0.102 + Math.sin(a) * 0.019, i % 2 === 0 ? 0.0068 : -0.0068);
        s.rotation.z = a + 0.5;
        mirrorCharmPivot.add(s);
      }
    } else if (charm === 'pizzaSlice') {
      // Cheesy Pepperoni Pizza Slice Charm
      const cheeseM = trackCMat(new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 }));
      const crustM = trackCMat(new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 }));
      const pepM = trackCMat(new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 }));
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.084, 0));
      addBailRing(-0.079, cordMat);
      const slice = new THREE.Mesh(trackCGeo(new THREE.ConeGeometry(0.022, 0.036, 3)), cheeseM);
      slice.scale.set(1.0, 1.0, 0.25);
      slice.rotation.x = Math.PI;
      slice.position.set(0, -0.102, 0);
      mirrorCharmPivot.add(slice);
      const crust = new THREE.Mesh(trackCGeo(new THREE.CapsuleGeometry(0.0045, 0.034, 4, 8)), crustM);
      crust.rotation.z = Math.PI * 0.5;
      crust.position.set(0, -0.084, 0);
      mirrorCharmPivot.add(crust);
      const pepGeo = trackCGeo(new THREE.CylinderGeometry(0.0042, 0.0042, 0.007, 10));
      pepGeo.rotateX(Math.PI * 0.5);
      for (const [px, py] of [[-0.006, -0.094], [0.006, -0.097], [0, -0.108]]) {
        const p = new THREE.Mesh(pepGeo, pepM);
        p.position.set(px, py, 0);
        mirrorCharmPivot.add(p);
      }
    } else if (charm === 'donutGlazed') {
      // Pink Strawberry Frosted Donut with Rainbow Sprinkles!
      const doughM = trackCMat(new THREE.MeshStandardMaterial({ color: 0xd98a3c, roughness: 0.72 }));
      const icingM = trackCMat(new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.22 }));
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.082, 0));
      addBailRing(-0.076, cordMat, 0.0048);
      const base = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.017, 0.0085, 10, 20)), doughM);
      base.position.set(0, -0.102, 0);
      mirrorCharmPivot.add(base);
      const glaze = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.017, 0.0078, 10, 20)), icingM);
      glaze.position.set(0, -0.102, 0.0022);
      mirrorCharmPivot.add(glaze);
      const spColors = [0xfef08a, 0x38bdf8, 0x4ade80, 0xffffff];
      const spGeo = trackCGeo(new THREE.BoxGeometry(0.004, 0.0016, 0.0016));
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const sp = new THREE.Mesh(
          spGeo,
          trackCMat(new THREE.MeshStandardMaterial({ color: spColors[i % spColors.length], roughness: 0.3 })),
        );
        sp.position.set(Math.cos(a) * 0.017, -0.102 + Math.sin(a) * 0.017, 0.01);
        sp.rotation.z = a + 0.6;
        mirrorCharmPivot.add(sp);
      }
    } else if (charm === 'gamepadMini') {
      // Miniature Matte-Black Console Gamepad Controller with Glowing Buttons!
      const bodyM = trackCMat(new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.38, metalness: 0.45 }));
      const stickM = trackCMat(new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.6 }));
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.091, 0));
      addBailRing(-0.088, stickM);
      const pad = new THREE.Mesh(trackCGeo(new THREE.BoxGeometry(0.036, 0.018, 0.01)), bodyM);
      pad.position.set(0, -0.098, 0);
      mirrorCharmPivot.add(pad);
      for (const sx of [-1, 1]) {
        const grip = new THREE.Mesh(trackCGeo(new THREE.CapsuleGeometry(0.0065, 0.016, 4, 8)), bodyM);
        grip.position.set(sx * 0.017, -0.108, 0);
        grip.rotation.z = sx * 0.32;
        mirrorCharmPivot.add(grip);
        const stick = new THREE.Mesh(trackCGeo(new THREE.CylinderGeometry(0.0032, 0.0032, 0.005, 8)), stickM);
        stick.rotation.x = Math.PI * 0.5;
        stick.position.set(sx * 0.007, -0.101, 0.006);
        mirrorCharmPivot.add(stick);
      }
      const btnCols = [0x22d3ee, 0xec4899, 0x4ade80, 0xfacc15];
      const btnPos: [number, number][] = [[0.011, -0.094], [0.015, -0.097], [0.011, -0.1], [0.007, -0.097]];
      btnPos.forEach(([bx, by], i) => {
        const b = new THREE.Mesh(
          trackCGeo(new THREE.SphereGeometry(0.0018, 6, 6)),
          trackCMat(new THREE.MeshStandardMaterial({ color: btnCols[i], emissive: btnCols[i], emissiveIntensity: 1.8 })),
        );
        b.position.set(bx, by, 0.0058);
        mirrorCharmPivot.add(b);
      });
    } else if (charm === 'keychain8Ball') {
      // Glossy Jet-Black Billiard 8-Ball Lucky Charm
      const ballM = trackCMat(new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.08, metalness: 0.4 }));
      const whiteM = trackCMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 }));
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.086, 0));
      addBailRing(-0.081, cordMat);
      const sph = new THREE.Mesh(trackCGeo(new THREE.SphereGeometry(0.02, 16, 14)), ballM);
      sph.position.set(0, -0.102, 0);
      mirrorCharmPivot.add(sph);
      for (const sz of [-1, 1]) {
        const face = new THREE.Mesh(trackCGeo(new THREE.CylinderGeometry(0.009, 0.009, 0.002, 14)), whiteM);
        face.rotation.x = Math.PI * 0.5;
        face.position.set(0, -0.102, sz * 0.0195);
        mirrorCharmPivot.add(face);
        // Tiny stacked "8" figure rings
        for (const dy of [-0.0028, 0.0028]) {
          const loop = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.0024, 0.0009, 6, 10)), ballM);
          loop.position.set(0, -0.102 + dy, sz * 0.021);
          mirrorCharmPivot.add(loop);
        }
      }
    } else if (charm === 'miniHeadcrab') {
      // Miniature Half-Life Headcrab Dangling from the Mirror!
      const fleshM = trackCMat(new THREE.MeshStandardMaterial({ color: 0xc99c72, roughness: 0.72 }));
      const clawM = trackCMat(new THREE.MeshStandardMaterial({ color: 0x3b2316, roughness: 0.35 }));
      const mawM = trackCMat(new THREE.MeshStandardMaterial({ color: 0x7f1d2d, roughness: 0.45 }));
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.088, 0));
      addBailRing(-0.084, cordMat);
      const dome = new THREE.Mesh(trackCGeo(new THREE.SphereGeometry(0.016, 12, 10)), fleshM);
      dome.scale.set(1.1, 0.82, 1.15);
      dome.position.set(0, -0.098, 0);
      mirrorCharmPivot.add(dome);
      const maw = new THREE.Mesh(trackCGeo(new THREE.SphereGeometry(0.009, 8, 8)), mawM);
      maw.scale.set(1.0, 0.4, 1.0);
      maw.position.set(0, -0.109, 0);
      mirrorCharmPivot.add(maw);
      const legGeo = trackCGeo(new THREE.ConeGeometry(0.0032, 0.022, 5));
      for (const [lx, lz, rz, rx] of [
        [-0.016, 0.012, 0.45, 0.35],
        [0.016, 0.012, -0.45, 0.35],
        [-0.015, -0.012, 0.42, -0.35],
        [0.015, -0.012, -0.42, -0.35],
      ]) {
        const leg = new THREE.Mesh(legGeo, clawM);
        leg.rotation.set(Math.PI + rx, 0, rz);
        leg.position.set(lx, -0.112, lz);
        mirrorCharmPivot.add(leg);
      }
    } else if (charm === 'companionCharm') {
      // Spinning Miniature Portal Weighted Companion Cube with Glowing Pink Hearts!
      const shellM = trackCMat(new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.32, metalness: 0.45 }));
      const darkM = trackCMat(new THREE.MeshStandardMaterial({ color: 0x272d38, roughness: 0.5, metalness: 0.7 }));
      const pinkM = trackCMat(
        new THREE.MeshStandardMaterial({ color: 0xf472b6, emissive: 0xec4899, emissiveIntensity: 2.0, roughness: 0.14 }),
      );
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.091, 0));
      addBailRing(-0.087, shellM);
      const grp = new THREE.Group();
      grp.position.set(0, -0.104, 0);
      mirrorCharmPivot.add(grp);
      charmDiscoGroup = grp;
      charmDiscoSparkMats = [pinkM];
      grp.add(new THREE.Mesh(trackCGeo(new THREE.BoxGeometry(0.028, 0.028, 0.028)), darkM));
      const cornerGeo = trackCGeo(new THREE.BoxGeometry(0.012, 0.012, 0.012));
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          for (const sz of [-1, 1]) {
            const c = new THREE.Mesh(cornerGeo, shellM);
            c.position.set(sx * 0.01, sy * 0.01, sz * 0.01);
            grp.add(c);
          }
        }
      }
      const heartGeo = trackCGeo(new THREE.OctahedronGeometry(0.006, 0));
      for (const [hx, hz] of [[0, 0.0155], [0, -0.0155], [0.0155, 0], [-0.0155, 0]]) {
        const h = new THREE.Mesh(heartGeo, pinkM);
        h.position.set(hx, 0, hz);
        grp.add(h);
      }
    } else if (charm === 'pokeballMini') {
      // Glossy Red & White Split Monster Capsule with Pulsing Center Button!
      const redM = trackCMat(new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.18, metalness: 0.25 }));
      const whiteM = trackCMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.18, metalness: 0.2 }));
      const bandM = trackCMat(new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.4 }));
      const btnGlowM = trackCMat(
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xef4444, emissiveIntensity: 2.0, roughness: 0.1 }),
      );
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.086, 0));
      addBailRing(-0.082, cordMat);
      const topHalf = new THREE.Mesh(
        trackCGeo(new THREE.SphereGeometry(0.019, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5)),
        redM,
      );
      topHalf.position.set(0, -0.102, 0);
      mirrorCharmPivot.add(topHalf);
      const botHalf = new THREE.Mesh(
        trackCGeo(new THREE.SphereGeometry(0.019, 16, 10, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5)),
        whiteM,
      );
      botHalf.position.set(0, -0.102, 0);
      mirrorCharmPivot.add(botHalf);
      const band = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.0188, 0.0022, 8, 22)), bandM);
      band.rotation.x = Math.PI * 0.5;
      band.position.set(0, -0.102, 0);
      mirrorCharmPivot.add(band);
      const btn = new THREE.Mesh(trackCGeo(new THREE.SphereGeometry(0.0055, 10, 10)), btnGlowM);
      btn.position.set(0, -0.102, 0.018);
      mirrorCharmPivot.add(btn);
      charmJetAfterburnerMat = btnGlowM;
    } else if (charm === 'creeperCharm') {
      // Miniature Pixelated Minecraft Creeper Head Charm with Charge Pulse!
      const greenM = trackCMat(
        new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 0.6, roughness: 0.72 }),
      );
      const blkM = trackCMat(new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.85 }));
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.09, 0));
      addBailRing(-0.086, cordMat);
      const cube = new THREE.Mesh(trackCGeo(new THREE.BoxGeometry(0.03, 0.03, 0.03)), greenM);
      cube.position.set(0, -0.102, 0);
      mirrorCharmPivot.add(cube);
      charmJetAfterburnerMat = greenM;
      const px = 0.00375;
      const pxGeo = trackCGeo(new THREE.BoxGeometry(px * 1.1, px * 1.1, 0.0025));
      const pts: [number, number][] = [
        [-2.2, 1.4], [-1.2, 1.4], [1.2, 1.4], [2.2, 1.4],
        [0, -0.3], [-1.2, -1.5], [0, -1.5], [1.2, -1.5], [-1.2, -2.5], [1.2, -2.5],
      ];
      for (const [fx, fy] of pts) {
        const cell = new THREE.Mesh(pxGeo, blkM);
        cell.position.set(fx * px, -0.102 + fy * px, 0.0158);
        mirrorCharmPivot.add(cell);
      }
    } else if (charm === 'ufoCharm') {
      // Spinning Miniature Chrome Flying Saucer UFO with Glowing Green Dome & Rim Lights!
      const hullM = trackCMat(new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.92, roughness: 0.14 }));
      const domeM = trackCMat(
        new THREE.MeshStandardMaterial({ color: 0x4ade80, emissive: 0x22c55e, emissiveIntensity: 1.8, roughness: 0.12 }),
      );
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.091, 0));
      addBailRing(-0.087, hullM);
      const grp = new THREE.Group();
      grp.position.set(0, -0.104, 0);
      mirrorCharmPivot.add(grp);
      charmDiscoGroup = grp;
      charmDiscoSparkMats = [domeM];
      const disc = new THREE.Mesh(trackCGeo(new THREE.CylinderGeometry(0.015, 0.028, 0.008, 18)), hullM);
      grp.add(disc);
      const under = new THREE.Mesh(trackCGeo(new THREE.CylinderGeometry(0.028, 0.012, 0.006, 18)), hullM);
      under.position.y = -0.007;
      grp.add(under);
      const dome = new THREE.Mesh(
        trackCGeo(new THREE.SphereGeometry(0.013, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55)),
        domeM,
      );
      dome.position.y = 0.003;
      grp.add(dome);
      const orbGeo = trackCGeo(new THREE.SphereGeometry(0.0026, 6, 6));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const lMat = trackCMat(
          new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x06b6d4, emissiveIntensity: 2.0 }),
        );
        charmDiscoSparkMats.push(lMat);
        const orb = new THREE.Mesh(orbGeo, lMat);
        orb.position.set(Math.cos(a) * 0.025, -0.002, Math.sin(a) * 0.025);
        grp.add(orb);
      }
    } else if (charm === 'ghostGlow') {
      // Cute Pulsing Glowing Cyan-White Little Phantom Ghost!
      const ghostM = trackCMat(
        new THREE.MeshStandardMaterial({
          color: 0xe0f2fe,
          emissive: 0x38bdf8,
          emissiveIntensity: 1.5,
          roughness: 0.2,
          transparent: true,
          opacity: 0.9,
        }),
      );
      const eyeM = trackCMat(new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.15 }));
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.085, 0));
      addBailRing(-0.08, cordMat);
      const grp = new THREE.Group();
      grp.position.set(0, -0.102, 0);
      mirrorCharmPivot.add(grp);
      charmHeartGroup = grp;
      charmHeartMat = ghostM;
      const head = new THREE.Mesh(trackCGeo(new THREE.SphereGeometry(0.015, 14, 12)), ghostM);
      head.position.y = 0.006;
      grp.add(head);
      const skirt = new THREE.Mesh(trackCGeo(new THREE.CylinderGeometry(0.015, 0.018, 0.022, 14)), ghostM);
      skirt.position.y = -0.005;
      grp.add(skirt);
      for (const sx of [-0.0055, 0.0055]) {
        const eye = new THREE.Mesh(trackCGeo(new THREE.SphereGeometry(0.0028, 8, 8)), eyeM);
        eye.position.set(sx, 0.006, 0.0135);
        grp.add(eye);
      }
    } else if (charm === 'lambdaCharm') {
      // Spinning Half-Life HEV Armored Ring with Glowing 3D Orange Lambda (λ) Medallion!
      const steelM = trackCMat(new THREE.MeshStandardMaterial({ color: 0x1e2430, metalness: 0.85, roughness: 0.28 }));
      const glowM = trackCMat(
        new THREE.MeshStandardMaterial({ color: 0xffa733, emissive: 0xf97316, emissiveIntensity: 2.3, roughness: 0.14 }),
      );
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.082, 0));
      addBailRing(-0.077, steelM);
      const grp = new THREE.Group();
      grp.position.set(0, -0.104, 0);
      mirrorCharmPivot.add(grp);
      charmDiscoGroup = grp;
      charmDiscoSparkMats = [glowM];
      grp.add(new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.022, 0.0038, 8, 22)), steelM));
      grp.add(new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.018, 0.0018, 6, 20)), glowM));
      // 3D Lambda symbol inside ring
      const mainLeg = new THREE.Mesh(trackCGeo(new THREE.BoxGeometry(0.0042, 0.026, 0.0036)), glowM);
      mainLeg.position.set(0.002, 0.0005, 0);
      mainLeg.rotation.z = 0.42;
      grp.add(mainLeg);
      const topSerif = new THREE.Mesh(trackCGeo(new THREE.BoxGeometry(0.009, 0.0038, 0.0036)), glowM);
      topSerif.position.set(-0.005, 0.0115, 0);
      grp.add(topSerif);
      const leftLeg = new THREE.Mesh(trackCGeo(new THREE.BoxGeometry(0.004, 0.016, 0.0036)), glowM);
      leftLeg.position.set(-0.0055, -0.005, 0);
      leftLeg.rotation.z = -0.56;
      grp.add(leftLeg);
    } else if (charm === 'wheatleyCharm') {
      // Miniature Portal 2 Wheatley Personality Core with Glowing Cyan Optic & Handles!
      const whiteM = trackCMat(new THREE.MeshStandardMaterial({ color: 0xe6ebf2, roughness: 0.28, metalness: 0.35 }));
      const greyM = trackCMat(new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.42, metalness: 0.78 }));
      const darkM = trackCMat(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 }));
      const blueEyeM = trackCMat(
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 2.4, roughness: 0.1 }),
      );
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.083, 0));
      addBailRing(-0.079, greyM);
      const grp = new THREE.Group();
      grp.position.set(0, -0.104, 0);
      mirrorCharmPivot.add(grp);
      charmHeartGroup = grp;
      charmHeartMat = blueEyeM;
      grp.add(new THREE.Mesh(trackCGeo(new THREE.SphereGeometry(0.019, 16, 14)), whiteM));
      // Top & bottom handles
      for (const sy of [-1, 1]) {
        const h = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.022, 0.0022, 6, 14, Math.PI * 0.45)), greyM);
        h.rotation.z = sy > 0 ? Math.PI * 0.28 : Math.PI * 1.28;
        grp.add(h);
      }
      const sock = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.011, 0.0022, 8, 18)), greyM);
      sock.position.z = 0.017;
      grp.add(sock);
      const eye = new THREE.Mesh(trackCGeo(new THREE.CylinderGeometry(0.009, 0.009, 0.003, 16)), blueEyeM);
      eye.rotation.x = Math.PI * 0.5;
      eye.position.z = 0.0175;
      grp.add(eye);
      const pupil = new THREE.Mesh(trackCGeo(new THREE.SphereGeometry(0.0032, 8, 8)), darkM);
      pupil.position.z = 0.0195;
      grp.add(pupil);
    } else if (charm === 'saturnPlanet') {
      // Spinning Golden Ringed Saturn Planet mounted inside a fixed golden orbital cradle!
      const planetM = trackCMat(
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xb45309, emissiveIntensity: 0.65, roughness: 0.35 }),
      );
      const ringAM = trackCMat(
        new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xeab308, emissiveIntensity: 1.9, roughness: 0.15 }),
      );
      const ringBM = trackCMat(
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 1.8, roughness: 0.15 }),
      );
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.07, 0));
      addBailRing(-0.068, ringAM, 0.0056);
      const cradle = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.034, 0.0022, 8, 24)), cordMat);
      cradle.position.set(0, -0.104, 0);
      mirrorCharmPivot.add(cradle);
      const grp = new THREE.Group();
      grp.position.set(0, -0.104, 0);
      mirrorCharmPivot.add(grp);
      charmDiscoGroup = grp;
      grp.add(new THREE.Mesh(trackCGeo(new THREE.SphereGeometry(0.014, 16, 14)), planetM));
      const rA = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.025, 0.0024, 6, 24)), ringAM);
      rA.rotation.x = Math.PI * 0.38;
      grp.add(rA);
      const rB = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.031, 0.0018, 6, 24)), ringBM);
      rB.rotation.x = Math.PI * 0.42;
      grp.add(rB);
      charmPlasmaRingA = rA;
      charmPlasmaRingB = rB;
    } else if (charm === 'dragonEgg') {
      // Obsidian Dragon Egg veined with Pulsing Molten Ruby-Gold Cracks!
      const obsM = trackCMat(new THREE.MeshStandardMaterial({ color: 0x0f0b14, roughness: 0.24, metalness: 0.68 }));
      const lavaM = trackCMat(
        new THREE.MeshStandardMaterial({ color: 0xff5a1f, emissive: 0xdc2626, emissiveIntensity: 2.3, roughness: 0.12 }),
      );
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.087, 0));
      addBailRing(-0.082, obsM);
      const grp = new THREE.Group();
      grp.position.set(0, -0.104, 0);
      mirrorCharmPivot.add(grp);
      charmHeartGroup = grp;
      charmHeartMat = lavaM;
      const egg = new THREE.Mesh(trackCGeo(new THREE.SphereGeometry(0.016, 14, 12)), obsM);
      egg.scale.set(0.88, 1.28, 0.88);
      grp.add(egg);
      for (let i = 0; i < 3; i++) {
        const vein = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.0148, 0.0018, 6, 18)), lavaM);
        vein.rotation.set(0.5 + i * 0.7, i * 1.1, i * 0.6);
        grp.add(vein);
      }
    } else if (charm === 'infinityCube') {
      // Holographic Shifting Tesseract Energy Cube inside Counter-Rotating Gold Gyro Rings & Fixed Gimbal Cradle!
      const cubeM = trackCMat(
        new THREE.MeshStandardMaterial({
          color: 0x22d3ee,
          emissive: 0x06b6d4,
          emissiveIntensity: 2.2,
          roughness: 0.1,
          transparent: true,
          opacity: 0.9,
        }),
      );
      const goldM = trackCMat(
        new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xeab308, emissiveIntensity: 1.5, metalness: 0.9, roughness: 0.15 }),
      );
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.071, 0));
      addBailRing(-0.069, goldM, 0.0056);
      const cradle = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.032, 0.0022, 8, 24)), goldM);
      cradle.position.set(0, -0.104, 0);
      mirrorCharmPivot.add(cradle);
      const grp = new THREE.Group();
      grp.position.set(0, -0.104, 0);
      mirrorCharmPivot.add(grp);
      charmCrystalGroup = grp;
      charmCrystalMat = cubeM;
      const coreCube = new THREE.Mesh(trackCGeo(new THREE.BoxGeometry(0.018, 0.018, 0.018)), cubeM);
      coreCube.rotation.set(0.6, 0.7, 0.4);
      grp.add(coreCube);
      const rA = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.024, 0.002, 8, 22)), goldM);
      const rB = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.029, 0.0018, 8, 22)), goldM);
      grp.add(rA);
      grp.add(rB);
      charmPlasmaRingA = rA;
      charmPlasmaRingB = rB;
    }
  };

  setMirrorCharm('none');

  const updateInterior = (
    dt: number,
    timeSec: number,
    lateralAccel: number,
    longitudinalAccel: number,
    rpmRatio: number,
    speedKmh: number,
  ): void => {
    const safeDt = Math.min(0.05, Math.max(0.001, dt));

    // 1. Damped 2-Axis Pendulum Physics for Swinging Mirror Charm
    if (currentMirrorCharm && currentMirrorCharm !== 'none') {
      const stiffness = 36;
      const damping = 4.2;
      const microBump =
        speedKmh > 15
          ? Math.sin(timeSec * 14.5) * Math.min(0.08, speedKmh * 0.00025)
          : 0;
      const accelZ =
        -stiffness * swingZ -
        damping * swingVelZ +
        lateralAccel * 14.5 +
        microBump * 18;
      const accelX =
        -stiffness * swingX -
        damping * swingVelX +
        longitudinalAccel * 10.5;

      swingVelZ += accelZ * safeDt;
      swingVelX += accelX * safeDt;
      swingZ = THREE.MathUtils.clamp(swingZ + swingVelZ * safeDt, -0.68, 0.68);
      swingX = THREE.MathUtils.clamp(swingX + swingVelX * safeDt, -0.42, 0.42);

      mirrorCharmPivot.rotation.z = swingZ;
      mirrorCharmPivot.rotation.x = swingX;
      mirrorCharmPivot.rotation.y = Math.sin(timeSec * 1.9 + swingZ * 2) * 0.14;

      if (charmTurboImpeller) {
        const spool = 3.5 + rpmRatio * 26 + speedKmh * 0.06;
        charmTurboImpeller.rotation.z -= spool * safeDt;
      }
      if (charmDiscoGroup) {
        charmDiscoGroup.rotation.y = (timeSec * 2.2) % (Math.PI * 2);
        for (let i = 0; i < charmDiscoSparkMats.length; i++) {
          charmDiscoSparkMats[i].emissiveIntensity =
            0.9 + 1.9 * Math.max(0, Math.sin(timeSec * 6.5 + i * 1.3));
        }
      }
      if (charmCrystalGroup && charmCrystalMat) {
        charmCrystalGroup.rotation.y = (timeSec * 1.8) % (Math.PI * 2);
        const h = (timeSec * 0.28) % 1;
        charmCrystalMat.color.setHSL(h, 0.92, 0.62);
        charmCrystalMat.emissive.setHSL((h + 0.18) % 1, 0.94, 0.52);
      }
      if (charmPlasmaRingA && charmPlasmaRingB) {
        charmPlasmaRingA.rotation.x = timeSec * 2.8;
        charmPlasmaRingA.rotation.y = timeSec * 1.7;
        charmPlasmaRingB.rotation.y = -timeSec * 3.4;
        charmPlasmaRingB.rotation.z = timeSec * 2.1;
      }
      if (charmHeartGroup && charmHeartMat) {
        const beat =
          1 + 0.11 * Math.pow(Math.max(0, Math.sin(timeSec * 4.4)), 4);
        charmHeartGroup.scale.setScalar(beat);
        charmHeartMat.emissiveIntensity = 1.4 + (beat - 1) * 14;
      }
      if (charmJetAfterburnerMat) {
        charmJetAfterburnerMat.emissiveIntensity =
          1.4 + rpmRatio * 1.9 + Math.sin(timeSec * 18) * 0.35;
      }
    }

    // 2. Live Steering Wheel Shift LEDs (Carbon D-Cut, F1 Yoke, Cyber Tron, Magma, Stealth Jet, RGB, Hyper Holo)
    if (shiftLedMats.length > 0) {
      const count = shiftLedMats.length;
      const flashRedline = rpmRatio > 0.93 && Math.floor(timeSec * 14) % 2 === 0;
      const litCount = Math.round(
        THREE.MathUtils.clamp((rpmRatio - 0.35) / 0.62, 0, 1) * count,
      );
      for (let i = 0; i < count; i++) {
        const lit = i < litCount;
        if (flashRedline) {
          shiftLedMats[i].color.setHex(0xef4444);
        } else if (!lit) {
          shiftLedMats[i].color.setHex(0x1f2937);
        } else if (i < Math.floor(count * 0.45)) {
          shiftLedMats[i].color.setHex(0x22c55e);
        } else if (i < Math.floor(count * 0.78)) {
          shiftLedMats[i].color.setHex(0xf59e0b);
        } else {
          shiftLedMats[i].color.setHex(0xef4444);
        }
      }
    }

    // 3. Animated Steering Wheel Materials & Holo Core (Zero GC)
    if (neoSpokeMat) {
      const hue = (timeSec * 0.16) % 1;
      neoSpokeMat.color.setHSL(hue, 0.88, 0.56);
    }
    if (wheelPulseMat) {
      wheelPulseMat.emissiveIntensity = 1.35 + Math.sin(timeSec * 4.2) * 0.85;
    }
    if (wheelRgbMat) {
      const h = (timeSec * 0.34) % 1;
      wheelRgbMat.color.setHSL(h, 0.98, 0.56);
      wheelRgbMat.emissive.setHSL(h, 0.98, 0.52);
    }
    if (wheelHoloSpinGroup) {
      wheelHoloSpinGroup.rotation.z = -(timeSec * 2.4) % (Math.PI * 2);
    }
    if (wheelRadarBarMat) {
      wheelRadarBarMat.emissiveIntensity = 1.2 + Math.sin(timeSec * 6.2) * 0.95;
    }
  };

  return {
    root,
    cabinOffset,
    wheelGroup,
    paintMaterial,
    rpmBar,
    nitroBar,
    nitroBarMat,
    setSteeringWheel,
    setMirrorCharm,
    updateInterior,
    dispose: () => {
      clearSteeringWheel();
      clearMirrorCharm();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}

export function createTrafficAssetPool(
  contactShadowMap: THREE.Texture,
): TrafficAssetPool {
  const disposableGeos: THREE.BufferGeometry[] = [];
  const disposableMats: THREE.Material[] = [];

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x141418,
    roughness: 0.88,
    metalness: 0.04,
  });
  const alloyMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    roughness: 0.2,
    metalness: 0.88,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x09111f,
    roughness: 0.05,
    metalness: 0.14,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.65,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x18181c,
    roughness: 0.72,
    metalness: 0.18,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe4e4e7,
    roughness: 0.14,
    metalness: 0.94,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 2.35,
    roughness: 0.18,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfef08a,
    emissiveIntensity: 1.85,
    roughness: 0.14,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const amberMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 1.5,
    roughness: 0.25,
  });
  const shadowMat = new THREE.MeshBasicMaterial({
    map: contactShadowMap,
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const cargoMat = new THREE.MeshStandardMaterial({
    color: 0xe5e7eb,
    roughness: 0.48,
    metalness: 0.14,
  });

  disposableMats.push(
    tireMat,
    alloyMat,
    glassMat,
    trimMat,
    chromeMat,
    tailMat,
    headMat,
    amberMat,
    shadowMat,
    cargoMat,
  );

  // Hard-creased sculpted Traffic Sedan with real wheel arches
  const sedanCabinStations: CabinStation[] = [
    { z: -0.82, baseY: 0.84, baseHalfW: 0.76, roofY: 0.9, roofHalfW: 0.7, crownY: 0.92 },
    { z: -0.26, baseY: 0.86, baseHalfW: 0.75, roofY: 1.33, roofHalfW: 0.61, crownY: 1.37 },
    { z: 0.64, baseY: 0.86, baseHalfW: 0.75, roofY: 1.33, roofHalfW: 0.6, crownY: 1.37 },
    { z: 1.32, baseY: 0.85, baseHalfW: 0.76, roofY: 0.9, roofHalfW: 0.68, crownY: 0.91 },
  ];
  const sedanBodyGeo = buildSculptedBodyGeometry(
    [
      { z: -2.14, bottomY: 0.26, bottomHalfW: 0.78, rockerY: 0.42, rockerHalfW: 0.87, beltY: 0.62, beltHalfW: 0.85, shoulderY: 0.69, shoulderHalfW: 0.76, crownY: 0.72 },
      { z: -1.78, bottomY: 0.25, bottomHalfW: 0.84, rockerY: 0.44, rockerHalfW: 0.92, beltY: 0.78, beltHalfW: 0.91, shoulderY: 0.84, shoulderHalfW: 0.83, crownY: 0.87 },
      { z: -0.78, bottomY: 0.25, bottomHalfW: 0.85, rockerY: 0.45, rockerHalfW: 0.92, beltY: 0.85, beltHalfW: 0.91, shoulderY: 0.89, shoulderHalfW: 0.84, crownY: 0.91 },
      { z: 0.9, bottomY: 0.25, bottomHalfW: 0.86, rockerY: 0.46, rockerHalfW: 0.93, beltY: 0.87, beltHalfW: 0.92, shoulderY: 0.91, shoulderHalfW: 0.85, crownY: 0.92 },
      { z: 1.94, bottomY: 0.28, bottomHalfW: 0.83, rockerY: 0.47, rockerHalfW: 0.9, beltY: 0.83, beltHalfW: 0.88, shoulderY: 0.87, shoulderHalfW: 0.81, crownY: 0.88 },
      { z: 2.1, bottomY: 0.34, bottomHalfW: 0.76, rockerY: 0.47, rockerHalfW: 0.83, beltY: 0.79, beltHalfW: 0.81, shoulderY: 0.82, shoulderHalfW: 0.75, crownY: 0.83 },
    ],
    {
      subdivisions: 2,
      wheelBaseHalf: 1.28,
      wheelRadius: 0.34,
      waistPinch: 0.024,
      fenderFlare: 0.025,
      creaseAngleDeg: 32,
    },
  );
  const sedanCabinGeo = buildCabinGlassGeometry(sedanCabinStations, true, 36);
  const sedanRoofGeo = buildRoofPanelGeometry(
    sedanCabinStations[1],
    sedanCabinStations[2],
  );

  // Hard-creased sculpted Modern SUV with real wheel arches
  const suvCabinStations: CabinStation[] = [
    { z: -0.86, baseY: 1.01, baseHalfW: 0.82, roofY: 1.08, roofHalfW: 0.76, crownY: 1.1 },
    { z: -0.34, baseY: 1.03, baseHalfW: 0.81, roofY: 1.54, roofHalfW: 0.68, crownY: 1.58 },
    { z: 1.24, baseY: 1.04, baseHalfW: 0.81, roofY: 1.53, roofHalfW: 0.67, crownY: 1.57 },
    { z: 1.78, baseY: 1.01, baseHalfW: 0.79, roofY: 1.1, roofHalfW: 0.71, crownY: 1.12 },
  ];
  const suvBodyGeo = buildSculptedBodyGeometry(
    [
      { z: -2.28, bottomY: 0.32, bottomHalfW: 0.84, rockerY: 0.56, rockerHalfW: 0.95, beltY: 0.84, beltHalfW: 0.93, shoulderY: 0.92, shoulderHalfW: 0.84, crownY: 0.95 },
      { z: -1.86, bottomY: 0.31, bottomHalfW: 0.9, rockerY: 0.58, rockerHalfW: 1.0, beltY: 0.96, beltHalfW: 0.99, shoulderY: 1.02, shoulderHalfW: 0.91, crownY: 1.05 },
      { z: -0.82, bottomY: 0.31, bottomHalfW: 0.91, rockerY: 0.58, rockerHalfW: 0.99, beltY: 1.02, beltHalfW: 0.98, shoulderY: 1.06, shoulderHalfW: 0.91, crownY: 1.08 },
      { z: 0.95, bottomY: 0.31, bottomHalfW: 0.92, rockerY: 0.58, rockerHalfW: 1.0, beltY: 1.04, beltHalfW: 0.99, shoulderY: 1.08, shoulderHalfW: 0.92, crownY: 1.09 },
      { z: 2.1, bottomY: 0.34, bottomHalfW: 0.89, rockerY: 0.58, rockerHalfW: 0.97, beltY: 1.0, beltHalfW: 0.95, shoulderY: 1.04, shoulderHalfW: 0.88, crownY: 1.05 },
      { z: 2.26, bottomY: 0.4, bottomHalfW: 0.82, rockerY: 0.58, rockerHalfW: 0.9, beltY: 0.94, beltHalfW: 0.88, shoulderY: 0.98, shoulderHalfW: 0.82, crownY: 0.99 },
    ],
    {
      subdivisions: 2,
      wheelBaseHalf: 1.38,
      wheelRadius: 0.36,
      waistPinch: 0.015,
      fenderFlare: 0.032,
      creaseAngleDeg: 30,
    },
  );
  const suvCabinGeo = buildCabinGlassGeometry(suvCabinStations, true, 36);
  const suvRoofGeo = buildRoofPanelGeometry(
    suvCabinStations[1],
    suvCabinStations[2],
  );
  const roofRailGeo = new THREE.BoxGeometry(0.05, 0.05, 1.52);
  const trafficStrutGeo = new THREE.BoxGeometry(1, 1, 1);

  const addTrafficPillars = (
    target: THREE.Group,
    stations: CabinStation[],
    bodyMat: THREE.Material,
  ) => {
    const [c0, c1, c2, c3] = stations;
    for (const side of [-1, 1]) {
      addOrientedStrut(
        target,
        trafficStrutGeo,
        [side * ((c0.baseHalfW + c0.roofHalfW) * 0.5 + 0.016), c0.baseY + 0.014, c0.z + 0.01],
        [side * (c1.roofHalfW + 0.016), c1.roofY + 0.005, c1.z + 0.006],
        0.038,
        0.058,
        bodyMat,
        [side, 0.2, 0],
        0.008,
      );
      const bZ = (c1.z + c2.z) * 0.5;
      addOrientedStrut(
        target,
        trafficStrutGeo,
        [side * ((c1.baseHalfW + c2.baseHalfW) * 0.5 + 0.025), (c1.baseY + c2.baseY) * 0.5 + 0.014, bZ],
        [side * ((c1.roofHalfW + c2.roofHalfW) * 0.5 + 0.025), (c1.roofY + c2.roofY) * 0.5 - 0.012, bZ],
        0.022,
        0.06,
        trimMat,
        [side, 0, 0],
        0.004,
      );
      addOrientedStrut(
        target,
        trafficStrutGeo,
        [side * ((c3.baseHalfW + c3.roofHalfW) * 0.5 + 0.016), c3.baseY + 0.014, c3.z - 0.01],
        [side * (c2.roofHalfW + 0.016), c2.roofY + 0.005, c2.z - 0.006],
        0.042,
        0.092,
        bodyMat,
        [side, 0.2, 0],
        0.01,
      );
    }
  };

  // Detailed Semi-Truck Tractor Cab + Windshield + Grille + Corrugated Trailer
  const truckCabGeo = createExtrudedShapeGeo(
    [
      [-1.02, 0.48],
      [0.96, 0.48],
      [1.0, 1.34],
      [0.82, 2.28],
      [-0.82, 2.28],
      [-1.02, 1.48],
    ],
    2.24,
    0.06,
  );
  const truckWindshieldGeo = new THREE.BoxGeometry(1.94, 0.68, 0.1);
  const truckGrilleGeo = new THREE.BoxGeometry(1.66, 0.72, 0.08);
  const truckCargoGeo = new THREE.BoxGeometry(2.38, 2.26, 5.1);
  const trailerRibGeo = new THREE.BoxGeometry(2.45, 2.31, 0.08);

  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 20);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimHubGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.268, 14);
  rimHubGeo.rotateZ(Math.PI / 2);

  const truckWheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.28, 20);
  truckWheelGeo.rotateZ(Math.PI / 2);
  const truckRimGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.312, 14);
  truckRimGeo.rotateZ(Math.PI / 2);

  const bumperGeo = new THREE.BoxGeometry(1.82, 0.14, 0.18);
  const grilleBarGeo = new THREE.BoxGeometry(0.96, 0.14, 0.06);
  const lampPairGeo = new THREE.BoxGeometry(0.38, 0.085, 0.08);
  const mirrorGeo = new THREE.BoxGeometry(0.15, 0.075, 0.11);
  const shadowGeo = new THREE.PlaneGeometry(2.6, 5.2);
  shadowGeo.rotateX(-Math.PI / 2);
  const truckShadowGeo = new THREE.PlaneGeometry(3.0, 8.0);
  truckShadowGeo.rotateX(-Math.PI / 2);

  disposableGeos.push(
    sedanBodyGeo,
    sedanCabinGeo,
    sedanRoofGeo,
    suvBodyGeo,
    suvCabinGeo,
    suvRoofGeo,
    roofRailGeo,
    trafficStrutGeo,
    truckCabGeo,
    truckWindshieldGeo,
    truckGrilleGeo,
    truckCargoGeo,
    trailerRibGeo,
    wheelGeo,
    rimHubGeo,
    truckWheelGeo,
    truckRimGeo,
    bumperGeo,
    grilleBarGeo,
    lampPairGeo,
    mirrorGeo,
    shadowGeo,
    truckShadowGeo,
  );

  const bodyMatCache = new Map<number, THREE.MeshStandardMaterial>();
  const getBodyMat = (hex: number) => {
    let mat = bodyMatCache.get(hex);
    if (!mat) {
      mat = new THREE.MeshStandardMaterial({
        color: hex,
        roughness: 0.22,
        metalness: 0.64,
        envMapIntensity: 1.3,
      });
      bodyMatCache.set(hex, mat);
      disposableMats.push(mat);
    }
    return mat;
  };

  // Zero-visual-loss static mesh batching: merge all traffic sub-parts sharing the same
  // PBR material ONCE at pool creation (sedan 26->8, suv 28->9, truck 30->10 draw calls).
  interface MergedTrafficPart {
    geo: THREE.BufferGeometry;
    mat: THREE.Material | 'body';
    castShadow: boolean;
    receiveShadow: boolean;
  }

  const mergeStaticParts = (
    items: { geo: THREE.BufferGeometry; matrix: THREE.Matrix4 }[],
  ): THREE.BufferGeometry => {
    let totalVerts = 0;
    const expanded: THREE.BufferGeometry[] = [];
    for (let i = 0; i < items.length; i++) {
      const src = items[i].geo;
      const g = src.index ? src.toNonIndexed() : src.clone();
      g.applyMatrix4(items[i].matrix);
      if (!g.getAttribute('normal')) g.computeVertexNormals();
      const pos = g.getAttribute('position');
      totalVerts += pos.count;
      expanded.push(g);
    }
    const positions = new Float32Array(totalVerts * 3);
    const normals = new Float32Array(totalVerts * 3);
    let offset = 0;
    for (let i = 0; i < expanded.length; i++) {
      const g = expanded[i];
      const pos = g.getAttribute('position');
      const norm = g.getAttribute('normal');
      positions.set(pos.array as Float32Array, offset * 3);
      normals.set(norm.array as Float32Array, offset * 3);
      offset += pos.count;
      g.dispose();
    }
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    merged.computeBoundingSphere();
    disposableGeos.push(merged);
    return merged;
  };

  const bakeTemplateGroup = (
    group: THREE.Group,
    sentinelBodyMat: THREE.Material,
  ): MergedTrafficPart[] => {
    group.updateMatrixWorld(true);
    const buckets = new Map<
      THREE.Material,
      {
        items: { geo: THREE.BufferGeometry; matrix: THREE.Matrix4 }[];
        castShadow: boolean;
        receiveShadow: boolean;
      }
    >();
    group.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mat = obj.material as THREE.Material;
      let bucket = buckets.get(mat);
      if (!bucket) {
        bucket = { items: [], castShadow: false, receiveShadow: false };
        buckets.set(mat, bucket);
      }
      bucket.items.push({
        geo: obj.geometry,
        matrix: obj.matrixWorld.clone(),
      });
      if (obj.castShadow) bucket.castShadow = true;
      if (obj.receiveShadow) bucket.receiveShadow = true;
    });

    const parts: MergedTrafficPart[] = [];
    for (const [mat, bucket] of buckets.entries()) {
      const geo =
        bucket.items.length === 1 &&
        bucket.items[0].matrix.equals(new THREE.Matrix4())
          ? bucket.items[0].geo
          : mergeStaticParts(bucket.items);
      parts.push({
        geo,
        mat: mat === sentinelBodyMat ? 'body' : mat,
        castShadow: bucket.castShadow,
        receiveShadow: bucket.receiveShadow,
      });
    }
    return parts;
  };

  const sentinelBodyMat = new THREE.MeshBasicMaterial();
  disposableMats.push(sentinelBodyMat);

  // Build Sedan template once
  const sedanTemplateGroup = new THREE.Group();
  {
    const body = new THREE.Mesh(sedanBodyGeo, sentinelBodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    sedanTemplateGroup.add(body);
    sedanTemplateGroup.add(new THREE.Mesh(sedanCabinGeo, glassMat));
    sedanTemplateGroup.add(new THREE.Mesh(sedanRoofGeo, sentinelBodyMat));
    addTrafficPillars(sedanTemplateGroup, sedanCabinStations, sentinelBodyMat);
    for (const sx of [-0.94, 0.94]) {
      const m = new THREE.Mesh(mirrorGeo, sentinelBodyMat);
      m.position.set(sx, 0.93, -0.44);
      sedanTemplateGroup.add(m);
    }
    const frontGrille = new THREE.Mesh(grilleBarGeo, trimMat);
    frontGrille.position.set(0, 0.44, -2.14);
    sedanTemplateGroup.add(frontGrille);
    const rearBumper = new THREE.Mesh(bumperGeo, trimMat);
    rearBumper.position.set(0, 0.34, 2.04);
    sedanTemplateGroup.add(rearBumper);
    for (const sx of [-0.6, 0.6]) {
      const tail = new THREE.Mesh(lampPairGeo, tailMat);
      tail.position.set(sx, 0.72, 2.08);
      sedanTemplateGroup.add(tail);
      const head = new THREE.Mesh(lampPairGeo, headMat);
      head.position.set(sx, 0.56, -2.132);
      sedanTemplateGroup.add(head);
    }
    for (const [wx, wz] of [
      [-0.86, -1.28],
      [0.86, -1.28],
      [-0.86, 1.28],
      [0.86, 1.28],
    ]) {
      const w = new THREE.Mesh(wheelGeo, tireMat);
      w.position.set(wx, 0.34, wz);
      w.add(new THREE.Mesh(rimHubGeo, alloyMat));
      sedanTemplateGroup.add(w);
    }
  }
  const sedanParts = bakeTemplateGroup(sedanTemplateGroup, sentinelBodyMat);

  // Build SUV template once
  const suvTemplateGroup = new THREE.Group();
  {
    const body = new THREE.Mesh(suvBodyGeo, sentinelBodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    suvTemplateGroup.add(body);
    suvTemplateGroup.add(new THREE.Mesh(suvCabinGeo, glassMat));
    suvTemplateGroup.add(new THREE.Mesh(suvRoofGeo, sentinelBodyMat));
    addTrafficPillars(suvTemplateGroup, suvCabinStations, sentinelBodyMat);
    for (const sx of [-0.6, 0.6]) {
      const rail = new THREE.Mesh(roofRailGeo, chromeMat);
      rail.position.set(sx, 1.59, 0.44);
      suvTemplateGroup.add(rail);
    }
    for (const sx of [-1.0, 1.0]) {
      const m = new THREE.Mesh(mirrorGeo, sentinelBodyMat);
      m.position.set(sx, 1.11, -0.46);
      suvTemplateGroup.add(m);
    }
    const frontGrille = new THREE.Mesh(grilleBarGeo, trimMat);
    frontGrille.position.set(0, 0.66, -2.28);
    suvTemplateGroup.add(frontGrille);
    const rearBumper = new THREE.Mesh(bumperGeo, trimMat);
    rearBumper.position.set(0, 0.4, 2.22);
    suvTemplateGroup.add(rearBumper);
    for (const sx of [-0.64, 0.64]) {
      const tail = new THREE.Mesh(lampPairGeo, tailMat);
      tail.position.set(sx, 0.86, 2.24);
      suvTemplateGroup.add(tail);
      const head = new THREE.Mesh(lampPairGeo, headMat);
      head.position.set(sx, 0.72, -2.275);
      suvTemplateGroup.add(head);
    }
    for (const [wx, wz] of [
      [-0.93, -1.38],
      [0.93, -1.38],
      [-0.93, 1.38],
      [0.93, 1.38],
    ]) {
      const w = new THREE.Mesh(wheelGeo, tireMat);
      w.position.set(wx, 0.36, wz);
      w.add(new THREE.Mesh(rimHubGeo, alloyMat));
      suvTemplateGroup.add(w);
    }
  }
  const suvParts = bakeTemplateGroup(suvTemplateGroup, sentinelBodyMat);

  // Build Semi-Truck template once
  const truckTemplateGroup = new THREE.Group();
  {
    const cab = new THREE.Mesh(truckCabGeo, sentinelBodyMat);
    cab.position.set(0, 0, -2.55);
    cab.castShadow = true;
    truckTemplateGroup.add(cab);
    const windshield = new THREE.Mesh(truckWindshieldGeo, glassMat);
    windshield.position.set(0, 1.84, -3.52);
    windshield.rotation.x = 0.14;
    truckTemplateGroup.add(windshield);
    const truckGrille = new THREE.Mesh(truckGrilleGeo, chromeMat);
    truckGrille.position.set(0, 0.96, -3.56);
    truckTemplateGroup.add(truckGrille);
    for (const sx of [-0.64, 0, 0.64]) {
      const clearance = new THREE.Mesh(lampPairGeo, amberMat);
      clearance.scale.set(0.28, 0.5, 0.6);
      clearance.position.set(sx, 2.31, -3.38);
      truckTemplateGroup.add(clearance);
    }
    const cargo = new THREE.Mesh(truckCargoGeo, cargoMat);
    cargo.position.set(0, 1.75, 1.05);
    cargo.castShadow = true;
    cargo.receiveShadow = true;
    truckTemplateGroup.add(cargo);
    for (const rz of [-0.8, 0.15, 1.1, 2.05, 3.0]) {
      const rib = new THREE.Mesh(trailerRibGeo, trimMat);
      rib.position.set(0, 1.75, rz);
      truckTemplateGroup.add(rib);
    }
    const rearUnderride = new THREE.Mesh(bumperGeo, trimMat);
    rearUnderride.position.set(0, 0.45, 3.62);
    truckTemplateGroup.add(rearUnderride);
    for (const sx of [-0.78, 0.78]) {
      const tail = new THREE.Mesh(lampPairGeo, tailMat);
      tail.position.set(sx, 0.85, 3.63);
      truckTemplateGroup.add(tail);
      const head = new THREE.Mesh(lampPairGeo, headMat);
      head.position.set(sx, 0.72, -3.56);
      truckTemplateGroup.add(head);
    }
    for (const [wx, wz] of [
      [-1.08, -2.5],
      [1.08, -2.5],
      [-1.08, 0.45],
      [1.08, 0.45],
      [-1.08, 2.55],
      [1.08, 2.55],
    ]) {
      const w = new THREE.Mesh(truckWheelGeo, tireMat);
      w.position.set(wx, 0.45, wz);
      w.add(new THREE.Mesh(truckRimGeo, alloyMat));
      truckTemplateGroup.add(w);
    }
  }
  const truckParts = bakeTemplateGroup(truckTemplateGroup, sentinelBodyMat);

  const instantiateTrafficParts = (
    parts: MergedTrafficPart[],
    bodyMat: THREE.Material,
    shGeo: THREE.BufferGeometry,
  ): { root: THREE.Group; bodyMesh: THREE.Mesh } => {
    const root = new THREE.Group();
    let bodyMesh: THREE.Mesh | null = null;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const mat = p.mat === 'body' ? bodyMat : p.mat;
      const mesh = new THREE.Mesh(p.geo, mat);
      mesh.castShadow = p.castShadow;
      mesh.receiveShadow = p.receiveShadow;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      root.add(mesh);
      if (p.mat === 'body') bodyMesh = mesh;
    }
    const shadow = new THREE.Mesh(shGeo, shadowMat);
    shadow.position.y = 0.02;
    shadow.matrixAutoUpdate = false;
    shadow.updateMatrix();
    root.add(shadow);
    return { root, bodyMesh: bodyMesh! };
  };

  return {
    createVehicle: (kind: TrafficKind, colorHex: number): TrafficRig => {
      const bodyMat = getBodyMat(colorHex);
      if (kind === 'sedan') {
        const { root, bodyMesh } = instantiateTrafficParts(
          sedanParts,
          bodyMat,
          shadowGeo,
        );
        return {
          root,
          bodyMesh,
          kind,
          width: 1.9,
          length: 4.3,
          wheelMeshes: [],
        };
      }
      if (kind === 'suv') {
        const { root, bodyMesh } = instantiateTrafficParts(
          suvParts,
          bodyMat,
          shadowGeo,
        );
        return {
          root,
          bodyMesh,
          kind,
          width: 2.0,
          length: 4.6,
          wheelMeshes: [],
        };
      }
      const { root, bodyMesh } = instantiateTrafficParts(
        truckParts,
        bodyMat,
        truckShadowGeo,
      );
      return {
        root,
        bodyMesh,
        kind,
        width: 2.4,
        length: 7.3,
        wheelMeshes: [],
      };
    },
    setVehicleColor: (rig: TrafficRig, colorHex: number) => {
      const mat = getBodyMat(colorHex);
      if (rig.bodyMesh.material !== mat) {
        rig.bodyMesh.material = mat;
      }
    },
    dispose: () => {
      disposableGeos.forEach((g) => g.dispose());
      disposableMats.forEach((m) => m.dispose());
    },
  };
}
