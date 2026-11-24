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
  wheelMeshes: THREE.Mesh[];
}

export interface TrafficAssetPool {
  createVehicle: (kind: TrafficKind, colorHex: number) => TrafficRig;
  dispose: () => void;
}

export interface PoliceCarRig {
  root: THREE.Group;
  width: number;
  length: number;
  wheelMeshes: THREE.Mesh[];
  updateSirenLights: (timeSec: number, active: boolean) => void;
  dispose: () => void;
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
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    textures.push(t);
    return t;
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

  // Procedural Automotive PBR Surface Textures
  const carbonTex = trackTex(createCarbonTexture());
  const grilleTex = trackTex(createGrilleMeshTexture());
  const rotorTex = trackTex(createBrakeRotorTexture());
  const treadTex = trackTex(createTireTreadTexture());
  const panelBumpTex = trackTex(createPanelLineBumpTexture());

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
  const lowerBody = new THREE.Mesh(lowerBodyGeo, paintMaterial);
  lowerBody.castShadow = true;
  lowerBody.receiveShadow = true;
  chassisGroup.add(lowerBody);

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

  // 5. Multi-Piece High-Detail Wheels (Staggered Front/Rear + Drilled Rotors + Calipers + 5 Rim Styles)
  const wheelSpinGroups: THREE.Group[] = [];
  const wheelRimMounts: {
    rimGroup: THREE.Group;
    side: number;
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

    // Open-ended Tire Tread (NO solid end-caps burying the wheel spokes!)
    const tireTreadGeo = trackGeo(
      new THREE.CylinderGeometry(r, r, tw * 0.88, 28, 1, true),
    );
    tireTreadGeo.rotateZ(Math.PI / 2);
    const tireMesh = new THREE.Mesh(tireTreadGeo, tireTreadMat);
    tireMesh.castShadow = true;
    spin.add(tireMesh);

    // Sculpted Tire Shoulders + Open Hollow Sidewall Annulus Rings
    const shoulderGeo = trackGeo(
      new THREE.TorusGeometry(r * 0.895, r * 0.105, 10, 28),
    );
    shoulderGeo.rotateY(Math.PI / 2);
    for (const s of [-1, 1]) {
      const sh = new THREE.Mesh(shoulderGeo, tireSidewallMat);
      sh.position.x = s * (tw * 0.41);
      spin.add(sh);

      const sidewallGeo = trackGeo(
        new THREE.RingGeometry(rimRadius * 0.96, r * 0.915, 28),
      );
      sidewallGeo.rotateY(s > 0 ? Math.PI / 2 : -Math.PI / 2);
      const sw = new THREE.Mesh(sidewallGeo, tireSidewallMat);
      sw.position.x = s * (tw * 0.475);
      spin.add(sw);
    }

    // F1 Pirelli-style red racing sidewall stripe!
    if (modelId === 'f1') {
      const stripeGeo = trackGeo(new THREE.TorusGeometry(r * 0.8, 0.012, 8, 28));
      stripeGeo.rotateY(Math.PI / 2);
      const stripe = new THREE.Mesh(stripeGeo, tailLightMaterial);
      stripe.position.x = side * (tw * 0.495);
      spin.add(stripe);
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
    spin.add(new THREE.Mesh(barrelGeo, wheelBarrelMat));

    const backDiscGeo = trackGeo(new THREE.CircleGeometry(rimRadius * 0.95, 22));
    backDiscGeo.rotateY(side > 0 ? Math.PI / 2 : -Math.PI / 2);
    const backDisc = new THREE.Mesh(backDiscGeo, matteTrimMat);
    backDisc.position.x = -side * (tw * 0.24);
    spin.add(backDisc);

    // Drilled Carbon-Ceramic Brake Rotor (clearly visible through the rim spokes!)
    const rotorGeo = trackGeo(
      new THREE.CylinderGeometry(rimRadius * 0.78, rimRadius * 0.78, 0.028, 24),
    );
    rotorGeo.rotateZ(Math.PI / 2);
    const rotor = new THREE.Mesh(rotorGeo, rotorMat);
    rotor.position.x = side * (tw * 0.06);
    spin.add(rotor);

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
    wheelRimMounts.push({ rimGroup, side, rRadius: rimRadius, tWidth: tw });

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

  // Dynamic Swappable 3D Rim Spokes (5 Styles — 1:1 faithful to Garage thumbnails)
  const rimGeos: THREE.BufferGeometry[] = [];
  const trackRimGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    rimGeos.push(g);
    return g;
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
    }
  };

  const rebuildWheelRims = (style: WheelStyleId) => {
    for (const m of wheelRimMounts) m.rimGroup.clear();
    rimGeos.forEach((g) => g.dispose());
    rimGeos.length = 0;
    wheelAnimSpinners.length = 0;

    syncAnimatedWheelColors(style, activeWheelColorHex);

    const spokeUnit = trackRimGeo(new THREE.BoxGeometry(1, 1, 1));

    for (const { rimGroup, side, rRadius, tWidth } of wheelRimMounts) {
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
        style === 'animGalaxyOrb';

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

  // 6b. Underbody Neon Kit (2-Layer Organic Ground Spill + Real PointLight Bounce + Recessed Slim LED Strips)
  const createUnderglowOuterTexture = (): THREE.CanvasTexture => {
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
  };

  const createUnderglowInnerTexture = (): THREE.CanvasTexture => {
    const w = 160;
    const h = 320;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (ctx) {
      const img = ctx.createImageData(w, h);
      const data = img.data;
      // Rounded-capsule signed distance field hugging the rocker sills & bumpers
      // Softly recessed center so the car's dark contact shadow stays grounded!
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

          // Peak glow smoothly right under the sill perimeter (sd ≈ 2), soft fade outward & dimmer under axle center
          let alpha = 0;
          if (sd >= 0) {
            const normOut = sd / 38;
            alpha = Math.exp(-normOut * normOut * 3.1);
          } else {
            // Gently dip toward center so contactShadow underneath stays crisp
            const normIn = Math.min(1, Math.abs(sd) / 34);
            alpha = 0.94 - normIn * 0.56;
          }
          // Guarantee 0 strictly before canvas borders so zero rectangular seams ever appear
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
  };

  const underglowOuterTex = trackTex(createUnderglowOuterTexture());
  const underglowInnerTex = trackTex(createUnderglowInnerTexture());

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

  const createHeadlightFlareTexture = (): THREE.CanvasTexture => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 256, 256);
      // Soft outer optical bloom
      const outer = ctx.createRadialGradient(128, 128, 2, 128, 128, 118);
      outer.addColorStop(0.0, 'rgba(255,255,255,0.95)');
      outer.addColorStop(0.14, 'rgba(255,255,255,0.62)');
      outer.addColorStop(0.36, 'rgba(255,255,255,0.18)');
      outer.addColorStop(0.68, 'rgba(255,255,255,0.03)');
      outer.addColorStop(1.0, 'rgba(255,255,255,0.0)');
      ctx.fillStyle = outer;
      ctx.fillRect(0, 0, 256, 256);

      // Subtle horizontal anamorphic Xenon streak
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
  };

  const createGroundBeamTexture = (): THREE.CanvasTexture => {
    const w = 256;
    const h = 512;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (ctx) {
      const img = ctx.createImageData(w, h);
      const data = img.data;
      // Dual overlapping soft headlight cones projecting forward (v=1 at bumper -> v=0 far ahead)
      for (let py = 0; py < h; py++) {
        // v = 0 right in front of bumper (bottom of canvas), v = 1 far ahead (top of canvas)
        const v = 1 - py / (h - 1);
        const longFade =
          Math.min(1, v / 0.12) * Math.pow(Math.max(0, 1 - v), 1.65);
        for (let px = 0; px < w; px++) {
          const u = (px / (w - 1)) * 2 - 1; // -1 .. +1
          const halfSpread = 0.16 + v * 0.68;
          // Two headlight beam centers gently diverging outward
          const cL = -0.24 - v * 0.18;
          const cR = 0.24 + v * 0.18;
          const dL = (u - cL) / halfSpread;
          const dR = (u - cR) / halfSpread;
          const bL = Math.exp(-dL * dL * 2.4);
          const bR = Math.exp(-dR * dR * 2.4);
          const combined = Math.min(1, (bL + bR) * 0.78);

          // Soft border fade so plane edges are 100% invisible
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
  };

  const headFlareTex = trackTex(createHeadlightFlareTexture());
  const headBeamGroundTex = trackTex(createGroundBeamTexture());

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
    style === 'apexChampionPlate';

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
    } else {
      paintMaterial.metalness = 0.78;
      paintMaterial.roughness = 0.17;
      paintMaterial.clearcoat = 1.0;
      paintMaterial.clearcoatRoughness = 0.04;
      paintMaterial.envMapIntensity = 1.78;
      paintMaterial.iridescence = 0;
    }
  };

  const applyPaintAndLivery = (): void => {
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
    paintMaterial.needsUpdate = true;
  };

  const syncHeadlightOpticalStrength = (): void => {
    const hlSpec =
      HEADLIGHTS.find((h) => h.id === currentCustom.headlight) || HEADLIGHTS[0];
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
    flameMat.color.setHex(nfSpec.coneHex);

    // 4. License Plate Frame & Style
    const activePlateStyle = currentCustom.plateStyle ?? 'classic';
    rebuildPlateFrame3D(activePlateStyle);
    drawLicensePlate(currentPlateText, activePlateStyle, 0);
    lastAnimPlateDrawSec = -10;
  };

  const setHeadlightGlowScale = (scale: number): void => {
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

    const isWideKit = kit === 'widebody' || kit === 'cyberWide';
    stockLowerAeroGroup.visible = kit === 'stock';
    stockArchFlareGroup.visible = !isWideKit;

    if (kit !== 'stock') {
      const lipDepth =
        kit === 'street' ? 0.34 : kit === 'f1TrackPro' ? 0.58 : 0.48;
      const lipWidth = isWideKit
        ? bodyWidth * 1.13
        : kit === 'f1TrackPro'
          ? bodyWidth * 1.09
          : bodyWidth * 1.04;

      const frontLip = new THREE.Mesh(
        trackCustomGeo(new THREE.BoxGeometry(lipWidth, 0.048, lipDepth)),
        carbonMat,
      );
      frontLip.position.set(0, lowLipY, frontNoseZ - lipDepth * 0.25);
      frontLip.castShadow = true;
      customKitGroup.add(frontLip);

      const trimMaterial =
        kit === 'cyberWide'
          ? (() => {
              const m = trackCustomMat(
                new THREE.MeshStandardMaterial({
                  color: 0x22d3ee,
                  emissive: 0x06b6d4,
                  emissiveIntensity: 1.85,
                  roughness: 0.18,
                  metalness: 0.35,
                }),
              );
              kitNeonTrimMat = m;
              return m;
            })()
          : kit === 'f1TrackPro'
            ? brakeRedMat
            : amberMat;

      const lipTrim = new THREE.Mesh(
        trackCustomGeo(new THREE.BoxGeometry(lipWidth * 0.96, 0.02, 0.045)),
        trimMaterial,
      );
      lipTrim.position.set(0, lowLipY + 0.014, frontNoseZ - lipDepth * 0.72);
      customKitGroup.add(lipTrim);

      const skirtLen = wheelBaseHalf * 1.64;
      const skirtOutX = isWideKit
        ? bodyWidth * 0.565
        : kit === 'f1TrackPro'
          ? bodyWidth * 0.545
          : bodyWidth * 0.525;
      const sideBladeGeo = trackCustomGeo(
        new THREE.BoxGeometry(isWideKit ? 0.17 : 0.125, 0.052, skirtLen),
      );
      const sideWingletGeo = trackCustomGeo(
        new THREE.BoxGeometry(0.036, kit === 'f1TrackPro' ? 0.24 : 0.18, 0.28),
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

        if (kit === 'cyberWide') {
          const sideNeon = new THREE.Mesh(
            trackCustomGeo(new THREE.BoxGeometry(0.024, 0.024, skirtLen * 0.94)),
            trimMaterial,
          );
          sideNeon.position.set(side * (skirtOutX + 0.085), lowLipY + 0.028, 0.04);
          customKitGroup.add(sideNeon);
        } else if (kit === 'f1TrackPro') {
          // Track-Pro side bargeboard vane + red accent edge
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

      const diffW = bodyWidth * (isWideKit ? 0.98 : kit === 'f1TrackPro' ? 0.95 : 0.88);
      const diffDepth = kit === 'f1TrackPro' ? 0.3 : 0.22;
      const rearValance = new THREE.Mesh(
        trackCustomGeo(new THREE.BoxGeometry(diffW, 0.13, diffDepth)),
        carbonMat,
      );
      rearValance.position.set(0, lowLipY + 0.055, rearTailZ + (diffDepth - 0.22) * 0.45);
      customKitGroup.add(rearValance);

      const strakeOffsets =
        kit === 'street'
          ? [-0.42, -0.34, 0.34, 0.42]
          : kit === 'f1TrackPro'
            ? [-0.46, -0.38, -0.3, -0.22, 0.22, 0.3, 0.38, 0.46]
            : [-0.44, -0.37, -0.3, 0.3, 0.37, 0.44];
      const strakeGeo = trackCustomGeo(
        new THREE.BoxGeometry(0.03, kit === 'f1TrackPro' ? 0.16 : 0.13, diffDepth + 0.04),
      );
      for (const frac of strakeOffsets) {
        const strake = new THREE.Mesh(strakeGeo, matteTrimMat);
        strake.position.set(frac * diffW, lowLipY + 0.06, rearTailZ + 0.03);
        customKitGroup.add(strake);
      }

      if (kit === 'cyberWide') {
        const rearNeon = new THREE.Mesh(
          trackCustomGeo(new THREE.BoxGeometry(diffW * 0.94, 0.024, 0.03)),
          trimMaterial,
        );
        rearNeon.position.set(0, lowLipY + 0.125, rearTailZ + 0.11);
        customKitGroup.add(rearNeon);
      }

      if (kit === 'gtAero' || kit === 'widebody' || kit === 'cyberWide' || kit === 'f1TrackPro') {
        const strutGeo = trackCustomGeo(new THREE.CylinderGeometry(0.012, 0.012, 0.25, 8));
        const strutOffsets = kit === 'f1TrackPro' ? [-0.52, -0.22, 0.22, 0.52] : [-0.42, 0.42];
        for (const sx of strutOffsets) {
          const strut = new THREE.Mesh(strutGeo, chromeMat);
          strut.position.set(sx, lowLipY + 0.12, frontNoseZ - lipDepth * 0.48);
          strut.rotation.x = 0.24;
          customKitGroup.add(strut);
        }

        const canardGeo = trackCustomGeo(
          new THREE.BoxGeometry(kit === 'f1TrackPro' ? 0.18 : 0.14, 0.026, 0.3),
        );
        const canardYs = kit === 'f1TrackPro' ? [0.28, 0.4, 0.52] : [0.34, 0.47];
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
    }
  };

  applyPaintAndLivery();
  applyLightsAndVisualFx();
  rebuildCustomAero(currentCustom.bodyKit, currentCustom.spoiler);
  rebuildRoofHat(currentCustom.roofHat ?? 'none');

  const setPaintColor = (hex: number): void => {
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
    // 1. Animated Underglow (Pulse or RGB Rainbow)
    if (underglowGroup.visible) {
      const ugSpec =
        UNDERGLOWS.find((u) => u.id === currentCustom.underglow) || UNDERGLOWS[0];
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
    const activeLiverySpec = LIVERIES.find((l) => l.id === currentCustom.livery);
    const isFullWrap = Boolean(activeLiverySpec?.overridesBaseColor);
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
    }

    // 2d. Animated Nitro Exhaust Cone Color (Rainbow / Police Strobe / Aurora)
    const activeNitroSpec =
      NITRO_FLAMES.find((f) => f.id === currentCustom.nitroFlame) || NITRO_FLAMES[0];
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
    } else if (currentCustom.spoiler === 'animNeonBlade' && spoilerAnimPrimaryMat && spoilerAnimSecondaryMat) {
      const pA = 0.5 + 0.5 * Math.sin(timeSec * 4.4);
      const pB = 0.5 + 0.5 * Math.sin(timeSec * 4.4 + Math.PI);
      spoilerAnimPrimaryMat.emissiveIntensity = 1.2 + pA * 1.4;
      spoilerAnimSecondaryMat.emissiveIntensity = 1.2 + pB * 1.4;
    } else if (currentCustom.spoiler === 'animPlasmaWing' && spoilerHoverGroup && spoilerAnimPrimaryMat) {
      spoilerHoverGroup.position.y = spoilerHoverBaseY + Math.sin(timeSec * 3.4) * 0.032;
      spoilerHoverGroup.rotation.z = Math.sin(timeSec * 1.9) * 0.024;
      const w = 0.5 + 0.5 * Math.sin(timeSec * 3.2);
      _fxColor.setHSL(0.56 + w * 0.2, 0.95, 0.58);
      spoilerAnimPrimaryMat.emissive.copy(_fxColor);
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
    setLicensePlate: (text: string) =>
      drawLicensePlate(text, currentCustom.plateStyle ?? 'classic'),
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

      // 7 Live RPM Shift LEDs along the top carbon bridge
      const ledGeo = trackWGeo(new THREE.BoxGeometry(0.012, 0.009, 0.008));
      for (let i = 0; i < 7; i++) {
        const lMat = trackWMat(new THREE.MeshBasicMaterial({ color: 0x1f2937 }));
        shiftLedMats.push(lMat);
        const a = Math.PI * 0.5 + (3 - i) * 0.13;
        const led = new THREE.Mesh(ledGeo, lMat);
        led.position.set(Math.cos(a) * 0.135, Math.sin(a) * 0.135, 0.017);
        led.rotation.z = a - Math.PI * 0.5;
        wheelGroup.add(led);
      }
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

      // 7 Live RPM Shift LEDs
      const ledGeo = trackWGeo(new THREE.BoxGeometry(0.012, 0.009, 0.008));
      for (let i = 0; i < 7; i++) {
        const lMat = trackWMat(new THREE.MeshBasicMaterial({ color: 0x1f2937 }));
        shiftLedMats.push(lMat);
        const a = Math.PI * 0.5 + (3 - i) * 0.13;
        const led = new THREE.Mesh(ledGeo, lMat);
        led.position.set(Math.cos(a) * 0.136, Math.sin(a) * 0.136, 0.019);
        led.rotation.z = a - Math.PI * 0.5;
        wheelGroup.add(led);
      }
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

      const ledGeo = trackWGeo(new THREE.BoxGeometry(0.012, 0.009, 0.008));
      for (let i = 0; i < 7; i++) {
        const lMat = trackWMat(new THREE.MeshBasicMaterial({ color: 0x1f2937 }));
        shiftLedMats.push(lMat);
        const a = Math.PI * 0.5 + (3 - i) * 0.13;
        const led = new THREE.Mesh(ledGeo, lMat);
        led.position.set(Math.cos(a) * 0.136, Math.sin(a) * 0.136, 0.019);
        led.rotation.z = a - Math.PI * 0.5;
        wheelGroup.add(led);
      }
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

      // 7 Live RPM Shift LEDs across top of avionics bridge
      const ledGeo = trackWGeo(new THREE.BoxGeometry(0.011, 0.008, 0.008));
      for (let i = 0; i < 7; i++) {
        const lMat = trackWMat(new THREE.MeshBasicMaterial({ color: 0x1f2937 }));
        shiftLedMats.push(lMat);
        const led = new THREE.Mesh(ledGeo, lMat);
        led.position.set(-0.048 + i * 0.016, 0.018, 0.016);
        wheelGroup.add(led);
      }
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

      // 9 Live RPM Shift LEDs
      const ledGeo = trackWGeo(new THREE.BoxGeometry(0.01, 0.008, 0.008));
      for (let i = 0; i < 9; i++) {
        const lMat = trackWMat(new THREE.MeshBasicMaterial({ color: 0x1f2937 }));
        shiftLedMats.push(lMat);
        const a = Math.PI * 0.5 + (4 - i) * 0.11;
        const led = new THREE.Mesh(ledGeo, lMat);
        led.position.set(Math.cos(a) * 0.136, Math.sin(a) * 0.136, 0.019);
        led.rotation.z = a - Math.PI * 0.5;
        wheelGroup.add(led);
      }
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

      // 9 Live RPM Shift LEDs along upper holo arc
      const ledGeo = trackWGeo(new THREE.BoxGeometry(0.01, 0.008, 0.008));
      for (let i = 0; i < 9; i++) {
        const lMat = trackWMat(new THREE.MeshBasicMaterial({ color: 0x1f2937 }));
        shiftLedMats.push(lMat);
        const a = Math.PI * 0.5 + (4 - i) * 0.11;
        const led = new THREE.Mesh(ledGeo, lMat);
        led.position.set(Math.cos(a) * 0.136, Math.sin(a) * 0.136, 0.018);
        led.rotation.z = a - Math.PI * 0.5;
        wheelGroup.add(led);
      }
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
      const ledGeo = trackWGeo(new THREE.BoxGeometry(0.01, 0.008, 0.008));
      for (let i = 0; i < 9; i++) {
        const lMat = trackWMat(new THREE.MeshBasicMaterial({ color: 0x1f2937 }));
        shiftLedMats.push(lMat);
        const a = Math.PI * 0.5 + (4 - i) * 0.11;
        const led = new THREE.Mesh(ledGeo, lMat);
        led.position.set(Math.cos(a) * 0.136, Math.sin(a) * 0.136, 0.018);
        led.rotation.z = a - Math.PI * 0.5;
        wheelGroup.add(led);
      }
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
      const ledGeo = trackWGeo(new THREE.BoxGeometry(0.011, 0.008, 0.008));
      for (let i = 0; i < 9; i++) {
        const lMat = trackWMat(new THREE.MeshBasicMaterial({ color: 0x1f2937 }));
        shiftLedMats.push(lMat);
        const led = new THREE.Mesh(ledGeo, lMat);
        led.position.set((i - 4) * 0.022, 0.068, 0.016);
        wheelGroup.add(led);
      }
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

      addCordSegment(topOrigin, new THREE.Vector3(0, -0.072, 0));
      const loop = new THREE.Mesh(trackCGeo(new THREE.TorusGeometry(0.006, 0.002, 6, 14)), cordMat);
      loop.position.set(0, -0.075, 0);
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
      // Level 8 Exclusive: Checkered Racing Flag Charm
      const whiteM = trackCMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 }));
      const blackM = trackCMat(new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4 }));
      const poleM = trackCMat(new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9, roughness: 0.2 }));
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.074, 0));
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
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.072, 0));
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
      // Level 85 Exclusive: Spinning Crimson-Gold Diamond Star
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
      addCordSegment(topOrigin, new THREE.Vector3(0, -0.078, 0));
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

  return {
    createVehicle: (kind: TrafficKind, colorHex: number): TrafficRig => {
      const root = new THREE.Group();
      const bodyMat = getBodyMat(colorHex);
      const wheelMeshes: THREE.Mesh[] = [];

      if (kind === 'sedan') {
        const body = new THREE.Mesh(sedanBodyGeo, bodyMat);
        body.castShadow = true;
        body.receiveShadow = true;
        root.add(body);

        root.add(new THREE.Mesh(sedanCabinGeo, glassMat));
        root.add(new THREE.Mesh(sedanRoofGeo, bodyMat));
        addTrafficPillars(root, sedanCabinStations, bodyMat);

        for (const sx of [-0.94, 0.94]) {
          const m = new THREE.Mesh(mirrorGeo, bodyMat);
          m.position.set(sx, 0.93, -0.44);
          root.add(m);
        }

        const frontGrille = new THREE.Mesh(grilleBarGeo, trimMat);
        frontGrille.position.set(0, 0.44, -2.14);
        root.add(frontGrille);

        const rearBumper = new THREE.Mesh(bumperGeo, trimMat);
        rearBumper.position.set(0, 0.34, 2.04);
        root.add(rearBumper);

        for (const sx of [-0.6, 0.6]) {
          const tail = new THREE.Mesh(lampPairGeo, tailMat);
          tail.position.set(sx, 0.72, 2.08);
          root.add(tail);

          const head = new THREE.Mesh(lampPairGeo, headMat);
          head.position.set(sx, 0.56, -2.132);
          root.add(head);
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
          root.add(w);
          wheelMeshes.push(w);
        }

        const shadow = new THREE.Mesh(shadowGeo, shadowMat);
        shadow.position.y = 0.02;
        root.add(shadow);
        const wheelSet = new Set<THREE.Object3D>(wheelMeshes);
        root.updateMatrixWorld(true);
        root.traverse((obj) => {
          if (obj !== root && !wheelSet.has(obj)) {
            obj.matrixAutoUpdate = false;
          }
        });
        return { root, kind, width: 1.9, length: 4.3, wheelMeshes };
      }

      if (kind === 'suv') {
        const body = new THREE.Mesh(suvBodyGeo, bodyMat);
        body.castShadow = true;
        body.receiveShadow = true;
        root.add(body);

        root.add(new THREE.Mesh(suvCabinGeo, glassMat));
        root.add(new THREE.Mesh(suvRoofGeo, bodyMat));
        addTrafficPillars(root, suvCabinStations, bodyMat);

        for (const sx of [-0.6, 0.6]) {
          const rail = new THREE.Mesh(roofRailGeo, chromeMat);
          rail.position.set(sx, 1.59, 0.44);
          root.add(rail);
        }

        for (const sx of [-1.0, 1.0]) {
          const m = new THREE.Mesh(mirrorGeo, bodyMat);
          m.position.set(sx, 1.11, -0.46);
          root.add(m);
        }

        const frontGrille = new THREE.Mesh(grilleBarGeo, trimMat);
        frontGrille.position.set(0, 0.66, -2.28);
        root.add(frontGrille);

        const rearBumper = new THREE.Mesh(bumperGeo, trimMat);
        rearBumper.position.set(0, 0.4, 2.22);
        root.add(rearBumper);

        for (const sx of [-0.64, 0.64]) {
          const tail = new THREE.Mesh(lampPairGeo, tailMat);
          tail.position.set(sx, 0.86, 2.24);
          root.add(tail);

          const head = new THREE.Mesh(lampPairGeo, headMat);
          head.position.set(sx, 0.72, -2.275);
          root.add(head);
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
          root.add(w);
          wheelMeshes.push(w);
        }

        const shadow = new THREE.Mesh(shadowGeo, shadowMat);
        shadow.position.y = 0.02;
        root.add(shadow);
        const wheelSet = new Set<THREE.Object3D>(wheelMeshes);
        root.updateMatrixWorld(true);
        root.traverse((obj) => {
          if (obj !== root && !wheelSet.has(obj)) {
            obj.matrixAutoUpdate = false;
          }
        });
        return { root, kind, width: 2.0, length: 4.6, wheelMeshes };
      }

      // Semi-Truck Tractor & Corrugated Trailer
      const cab = new THREE.Mesh(truckCabGeo, bodyMat);
      cab.position.set(0, 0, -2.55);
      cab.castShadow = true;
      root.add(cab);

      const windshield = new THREE.Mesh(truckWindshieldGeo, glassMat);
      windshield.position.set(0, 1.84, -3.52);
      windshield.rotation.x = 0.14;
      root.add(windshield);

      const truckGrille = new THREE.Mesh(truckGrilleGeo, chromeMat);
      truckGrille.position.set(0, 0.96, -3.56);
      root.add(truckGrille);

      for (const sx of [-0.64, 0, 0.64]) {
        const clearance = new THREE.Mesh(lampPairGeo, amberMat);
        clearance.scale.set(0.28, 0.5, 0.6);
        clearance.position.set(sx, 2.31, -3.38);
        root.add(clearance);
      }

      const cargo = new THREE.Mesh(truckCargoGeo, cargoMat);
      cargo.position.set(0, 1.75, 1.05);
      cargo.castShadow = true;
      cargo.receiveShadow = true;
      root.add(cargo);

      for (const rz of [-0.8, 0.15, 1.1, 2.05, 3.0]) {
        const rib = new THREE.Mesh(trailerRibGeo, trimMat);
        rib.position.set(0, 1.75, rz);
        root.add(rib);
      }

      const rearUnderride = new THREE.Mesh(bumperGeo, trimMat);
      rearUnderride.position.set(0, 0.45, 3.62);
      root.add(rearUnderride);

      for (const sx of [-0.78, 0.78]) {
        const tail = new THREE.Mesh(lampPairGeo, tailMat);
        tail.position.set(sx, 0.85, 3.63);
        root.add(tail);

        const head = new THREE.Mesh(lampPairGeo, headMat);
        head.position.set(sx, 0.72, -3.56);
        root.add(head);
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
        root.add(w);
        wheelMeshes.push(w);
      }

      const shadow = new THREE.Mesh(truckShadowGeo, shadowMat);
      shadow.position.y = 0.02;
      root.add(shadow);
      const wheelSet = new Set<THREE.Object3D>(wheelMeshes);
      root.updateMatrixWorld(true);
      root.traverse((obj) => {
        if (obj !== root && !wheelSet.has(obj)) {
          obj.matrixAutoUpdate = false;
        }
      });
      return { root, kind, width: 2.4, length: 7.3, wheelMeshes };
    },
    dispose: () => {
      disposableGeos.forEach((g) => g.dispose());
      disposableMats.forEach((m) => m.dispose());
    },
  };
}

/**
 * High-contrast black-and-white Police Interceptor sedan rig with metallic
 * front push-bumper bullbar, sculpted wheel arches, and strobing red/blue
 * roof LED lightbar + dynamic siren point light.
 */
export function createPoliceCarRig(
  contactShadowMap: THREE.Texture,
  isSoftwareGl: boolean,
): PoliceCarRig {
  const root = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    mats.push(m);
    return m;
  };

  // Sculpted wide-shoulder police interceptor body (Dodge Charger / Ford Interceptor inspired)
  const bodyStations = [
    { z: -2.26, bottomY: 0.25, bottomHalfW: 0.78, rockerY: 0.44, rockerHalfW: 0.88, beltY: 0.64, beltHalfW: 0.86, shoulderY: 0.72, shoulderHalfW: 0.78, crownY: 0.75 },
    { z: -1.96, bottomY: 0.23, bottomHalfW: 0.88, rockerY: 0.46, rockerHalfW: 0.97, beltY: 0.82, beltHalfW: 0.96, shoulderY: 0.88, shoulderHalfW: 0.88, crownY: 0.92 },
    { z: -1.28, bottomY: 0.22, bottomHalfW: 0.9, rockerY: 0.46, rockerHalfW: 0.99, beltY: 0.89, beltHalfW: 0.98, shoulderY: 0.95, shoulderHalfW: 0.9, crownY: 0.98 },
    { z: -0.72, bottomY: 0.22, bottomHalfW: 0.9, rockerY: 0.46, rockerHalfW: 0.98, beltY: 0.92, beltHalfW: 0.97, shoulderY: 0.98, shoulderHalfW: 0.89, crownY: 1.0 },
    { z: 0.25, bottomY: 0.22, bottomHalfW: 0.9, rockerY: 0.46, rockerHalfW: 0.98, beltY: 0.94, beltHalfW: 0.97, shoulderY: 0.99, shoulderHalfW: 0.89, crownY: 1.01 },
    { z: 1.18, bottomY: 0.23, bottomHalfW: 0.91, rockerY: 0.47, rockerHalfW: 1.0, beltY: 0.96, beltHalfW: 0.99, shoulderY: 1.01, shoulderHalfW: 0.91, crownY: 1.02 },
    { z: 2.08, bottomY: 0.28, bottomHalfW: 0.86, rockerY: 0.49, rockerHalfW: 0.94, beltY: 0.9, beltHalfW: 0.92, shoulderY: 0.95, shoulderHalfW: 0.84, crownY: 0.96 },
    { z: 2.26, bottomY: 0.34, bottomHalfW: 0.78, rockerY: 0.51, rockerHalfW: 0.86, beltY: 0.84, beltHalfW: 0.84, shoulderY: 0.89, shoulderHalfW: 0.77, crownY: 0.9 },
  ];

  const cabinStations: CabinStation[] = [
    { z: -0.88, baseY: 0.95, baseHalfW: 0.83, roofY: 1.03, roofHalfW: 0.75, crownY: 1.05 },
    { z: -0.26, baseY: 0.97, baseHalfW: 0.84, roofY: 1.4, roofHalfW: 0.67, crownY: 1.44 },
    { z: 0.76, baseY: 0.98, baseHalfW: 0.83, roofY: 1.38, roofHalfW: 0.65, crownY: 1.42 },
    { z: 1.48, baseY: 0.97, baseHalfW: 0.8, roofY: 1.05, roofHalfW: 0.72, crownY: 1.07 },
  ];

  const blackBodyMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x111318,
      metalness: 0.55,
      roughness: 0.24,
    }),
  );
  const whiteLiveryMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf4f6fa,
      metalness: 0.18,
      roughness: 0.28,
    }),
  );
  const glassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x090f18,
      metalness: 0.9,
      roughness: 0.08,
    }),
  );
  const bullbarMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x22262e,
      metalness: 0.78,
      roughness: 0.32,
    }),
  );
  const chromeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd8dde6,
      metalness: 0.92,
      roughness: 0.16,
    }),
  );
  const tireMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x15171c,
      roughness: 0.88,
      metalness: 0.06,
    }),
  );
  const steelieMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2b303a,
      metalness: 0.72,
      roughness: 0.3,
    }),
  );
  const headMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf4f9ff,
      emissive: 0xdbeeff,
      emissiveIntensity: 2.2,
      roughness: 0.1,
    }),
  );
  const tailMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0xef4444,
      emissiveIntensity: 1.8,
      roughness: 0.2,
    }),
  );
  const redSirenMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xff1e2d,
      emissiveIntensity: 0.4,
      roughness: 0.12,
    }),
  );
  const blueSirenMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      emissive: 0x1d6bff,
      emissiveIntensity: 0.4,
      roughness: 0.12,
    }),
  );
  const whiteStrobeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      emissive: 0xffffff,
      emissiveIntensity: 0.3,
      roughness: 0.12,
    }),
  );

  // Main black sculpted chassis
  const bodyGeo = trackGeo(
    buildSculptedBodyGeometry(bodyStations, {
      subdivisions: 2,
      wheelBaseHalf: 1.38,
      wheelRadius: 0.36,
      waistPinch: 0.015,
      fenderFlare: 0.036,
      creaseAngleDeg: 30,
    }),
  );
  const bodyMesh = new THREE.Mesh(bodyGeo, blackBodyMat);
  bodyMesh.castShadow = !isSoftwareGl;
  bodyMesh.receiveShadow = true;
  root.add(bodyMesh);

  // Iconic white Police door panels (slight proud offset to prevent z-fighting)
  const doorPanelGeo = trackGeo(new THREE.BoxGeometry(0.04, 0.56, 1.72));
  const stripeGeo = trackGeo(new THREE.BoxGeometry(0.015, 0.08, 1.66));
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(doorPanelGeo, whiteLiveryMat);
    panel.position.set(side * 0.985, 0.61, 0.12);
    root.add(panel);

    // Side blue tactical stripe along white door
    const stripe = new THREE.Mesh(stripeGeo, blueSirenMat);
    stripe.position.set(side * 1.008, 0.6, 0.12);
    root.add(stripe);
  }

  // Cabin glass & crisp white roof cap
  const cabinGeo = trackGeo(buildCabinGlassGeometry(cabinStations, true, 36));
  root.add(new THREE.Mesh(cabinGeo, glassMat));

  const roofGeo = trackGeo(
    buildRoofPanelGeometry(cabinStations[1], cabinStations[2]),
  );
  root.add(new THREE.Mesh(roofGeo, whiteLiveryMat));

  // Structural A, B, C pillars
  const strutGeo = trackGeo(new THREE.BoxGeometry(1, 1, 1));
  const [c0, c1, c2, c3] = cabinStations;
  for (const side of [-1, 1]) {
    addOrientedStrut(
      root,
      strutGeo,
      [side * ((c0.baseHalfW + c0.roofHalfW) * 0.5 + 0.016), c0.baseY + 0.014, c0.z + 0.01],
      [side * (c1.roofHalfW + 0.016), c1.roofY + 0.005, c1.z + 0.006],
      0.04,
      0.058,
      blackBodyMat,
      [side, 0.2, 0],
      0.008,
    );
    const bZ = (c1.z + c2.z) * 0.5;
    addOrientedStrut(
      root,
      strutGeo,
      [side * ((c1.baseHalfW + c2.baseHalfW) * 0.5 + 0.025), (c1.baseY + c2.baseY) * 0.5 + 0.014, bZ],
      [side * ((c1.roofHalfW + c2.roofHalfW) * 0.5 + 0.025), (c1.roofY + c2.roofY) * 0.5 - 0.012, bZ],
      0.026,
      0.064,
      blackBodyMat,
      [side, 0, 0],
      0.004,
    );
    addOrientedStrut(
      root,
      strutGeo,
      [side * ((c3.baseHalfW + c3.roofHalfW) * 0.5 + 0.016), c3.baseY + 0.014, c3.z - 0.01],
      [side * (c2.roofHalfW + 0.016), c2.roofY + 0.005, c2.z - 0.006],
      0.046,
      0.092,
      whiteLiveryMat,
      [side, 0.2, 0],
      0.01,
    );
  }

  // Heavy-duty Front Push-Bumper Bullbar
  const uprightGeo = trackGeo(new THREE.BoxGeometry(0.08, 0.56, 0.14));
  for (const sx of [-0.5, 0.5]) {
    const up = new THREE.Mesh(uprightGeo, bullbarMat);
    up.position.set(sx, 0.52, -2.31);
    root.add(up);
  }
  const crossBarGeo = trackGeo(new THREE.BoxGeometry(1.16, 0.065, 0.075));
  for (const cy of [0.38, 0.66]) {
    const bar = new THREE.Mesh(crossBarGeo, bullbarMat);
    bar.position.set(0, cy, -2.35);
    root.add(bar);
  }

  // Front grille & twin aggressive headlights
  const grilleGeo = trackGeo(new THREE.BoxGeometry(1.12, 0.22, 0.08));
  const grille = new THREE.Mesh(grilleGeo, bullbarMat);
  grille.position.set(0, 0.58, -2.23);
  root.add(grille);

  const headGeo = trackGeo(new THREE.BoxGeometry(0.42, 0.13, 0.08));
  for (const sx of [-0.66, 0.66]) {
    const hl = new THREE.Mesh(headGeo, headMat);
    hl.position.set(sx, 0.66, -2.22);
    root.add(hl);
  }

  // Full-width Dodge-style glowing rear taillight bar + low trunk lip spoiler
  const tailBarGeo = trackGeo(new THREE.BoxGeometry(1.66, 0.14, 0.07));
  const tailBar = new THREE.Mesh(tailBarGeo, tailMat);
  tailBar.position.set(0, 0.74, 2.26);
  root.add(tailBar);

  const trunkSpoilerGeo = trackGeo(new THREE.BoxGeometry(1.68, 0.06, 0.2));
  const trunkSpoiler = new THREE.Mesh(trunkSpoilerGeo, blackBodyMat);
  trunkSpoiler.position.set(0, 0.96, 2.08);
  root.add(trunkSpoiler);

  const exhaustGeo = trackGeo(new THREE.CylinderGeometry(0.055, 0.055, 0.14, 10));
  exhaustGeo.rotateX(Math.PI / 2);
  for (const sx of [-0.58, 0.58]) {
    const ex = new THREE.Mesh(exhaustGeo, chromeMat);
    ex.position.set(sx, 0.34, 2.27);
    root.add(ex);
  }

  // Roof LED Siren Lightbar Assembly
  const barBaseGeo = trackGeo(new THREE.BoxGeometry(1.18, 0.05, 0.24));
  const barBase = new THREE.Mesh(barBaseGeo, bullbarMat);
  barBase.position.set(0, 1.43, 0.18);
  root.add(barBase);

  const podGeo = trackGeo(new THREE.BoxGeometry(0.46, 0.11, 0.21));
  const redPod = new THREE.Mesh(podGeo, redSirenMat);
  redPod.position.set(-0.34, 1.49, 0.18);
  root.add(redPod);

  const bluePod = new THREE.Mesh(podGeo, blueSirenMat);
  bluePod.position.set(0.34, 1.49, 0.18);
  root.add(bluePod);

  const centerStrobeGeo = trackGeo(new THREE.BoxGeometry(0.2, 0.1, 0.2));
  const centerStrobe = new THREE.Mesh(centerStrobeGeo, whiteStrobeMat);
  centerStrobe.position.set(0, 1.49, 0.18);
  root.add(centerStrobe);

  // Subtle dynamic point light above lightbar (disabled on software GL for FPS)
  let sirenLight: THREE.PointLight | null = null;
  if (!isSoftwareGl) {
    sirenLight = new THREE.PointLight(0xff2244, 0, 14, 1.8);
    sirenLight.position.set(0, 1.72, 0.18);
    root.add(sirenLight);
  }

  // Heavy-duty Interceptor wheels (matte black steelie + chrome center cap)
  const wheelGeo = trackGeo(new THREE.CylinderGeometry(0.36, 0.36, 0.27, 16));
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.24, 0.285, 14));
  rimGeo.rotateZ(Math.PI / 2);
  const capGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.11, 0.3, 12));
  capGeo.rotateZ(Math.PI / 2);

  const wheelMeshes: THREE.Mesh[] = [];
  for (const [wx, wz] of [
    [-0.9, -1.38],
    [0.9, -1.38],
    [-0.9, 1.38],
    [0.9, 1.38],
  ]) {
    const w = new THREE.Mesh(wheelGeo, tireMat);
    w.position.set(wx, 0.36, wz);
    w.add(new THREE.Mesh(rimGeo, steelieMat));
    w.add(new THREE.Mesh(capGeo, chromeMat));
    root.add(w);
    wheelMeshes.push(w);
  }

  // Ground contact shadow
  const shadowGeo = trackGeo(new THREE.PlaneGeometry(2.55, 5.15));
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: contactShadowMap,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
  );
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.position.y = 0.02;
  root.add(shadow);

  const policeWheelSet = new Set<THREE.Object3D>(wheelMeshes);
  root.updateMatrixWorld(true);
  root.traverse((obj) => {
    if (obj !== root && !policeWheelSet.has(obj)) {
      obj.matrixAutoUpdate = false;
    }
  });

  return {
    root,
    width: 1.98,
    length: 4.55,
    wheelMeshes,
    updateSirenLights: (timeSec: number, active: boolean) => {
      if (!active) {
        redSirenMat.emissiveIntensity = 0.2;
        blueSirenMat.emissiveIntensity = 0.2;
        whiteStrobeMat.emissiveIntensity = 0.1;
        if (sirenLight) sirenLight.intensity = 0;
        return;
      }
      // Realistic double-flash alternating red/blue police strobe pattern
      const phase = (timeSec * 3.4) % 1;
      const redFlash =
        phase < 0.16 || (phase > 0.24 && phase < 0.42);
      const blueFlash =
        (phase > 0.5 && phase < 0.66) || (phase > 0.74 && phase < 0.92);
      const centerFlash = phase > 0.43 && phase < 0.49;

      redSirenMat.emissiveIntensity = redFlash ? 5.2 : 0.25;
      blueSirenMat.emissiveIntensity = blueFlash ? 5.2 : 0.25;
      whiteStrobeMat.emissiveIntensity = centerFlash ? 4.4 : 0.2;

      if (sirenLight) {
        if (redFlash) {
          sirenLight.color.setHex(0xff2233);
          sirenLight.intensity = 5.5;
        } else if (blueFlash) {
          sirenLight.color.setHex(0x2575ff);
          sirenLight.intensity = 5.5;
        } else {
          sirenLight.intensity = 0.4;
        }
      }
    },
    dispose: () => {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}
