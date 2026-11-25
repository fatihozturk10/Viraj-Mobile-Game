import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CrateTierId } from '../services/storeCatalog';

export interface CrateVault3DProps {
  phase: 'drop' | 'charging' | 'burst';
  unlockedMask: readonly [boolean, boolean, boolean, boolean];
  lastUnlockedLock: number | null;
  tier: CrateTierId;
  accentHex: string;
  secondaryHex: string;
  tapRecoilKey: number;
  onUnlockLock: (lockIndex?: number) => void;
}

// Pre-allocated math helpers outside render loop (zero GC)
const _camPos = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _rayNdc = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();
const _dummy = new THREE.Object3D();
const _tmpVec = new THREE.Vector3();
const _tmpColor = new THREE.Color();
const _accentColor = new THREE.Color();
const _secondaryColor = new THREE.Color();
const _lockedLedColor = new THREE.Color('#ff5e2b');
const _nextLedColor = new THREE.Color('#fbbf24');
const _unlockedLedColor = new THREE.Color('#34d399');

interface LatchRig {
  index: number;
  group: THREE.Group;
  clampPivot: THREE.Group;
  pinLeft: THREE.Mesh;
  pinRight: THREE.Mesh;
  ledMat: THREE.MeshStandardMaterial;
  haloMesh: THREE.Mesh;
  haloMat: THREE.MeshBasicMaterial;
  clampMat: THREE.MeshStandardMaterial;
  collider: THREE.Mesh;
  preferredYaw: number;
  openProgress: number;
  openVelocity: number;
  wasUnlocked: boolean;
  sparkAnchor: THREE.Object3D;
}

interface SparkParticle {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
  scale: number;
  spin: number;
}

interface TierMaterialPalette {
  hullHex: string;
  lidHex: string;
  trimHex: string;
  bumperHex: string;
  clampHex: string;
  pedestalHex: string;
}

const TIER_MATERIALS: Record<CrateTierId, TierMaterialPalette> = {
  street: {
    hullHex: '#1c2432',
    lidHex: '#253144',
    trimHex: '#64748b',
    bumperHex: '#334155',
    clampHex: '#94a3b8',
    pedestalHex: '#131924',
  },
  pro: {
    hullHex: '#1b182a',
    lidHex: '#27203d',
    trimHex: '#8b7ec8',
    bumperHex: '#352b54',
    clampHex: '#c4b5fd',
    pedestalHex: '#12101d',
  },
  legendary: {
    hullHex: '#1a1418',
    lidHex: '#291c22',
    trimHex: '#d4a13e',
    bumperHex: '#3a242c',
    clampHex: '#f2c76e',
    pedestalHex: '#151014',
  },
};

function detectSoftwareGl(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

function createCarbonArmorTexture(baseHex: string, lineHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 256, 256);

    // Subtle diagonal motorsport carbon weave
    ctx.strokeStyle = lineHex;
    ctx.globalAlpha = 0.24;
    ctx.lineWidth = 4;
    for (let i = -256; i < 512; i += 14) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 256, 256);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.14;
    for (let i = -256; i < 512; i += 14) {
      ctx.beginPath();
      ctx.moveTo(i + 256, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();
    }

    // Subtle brushed panel seam lines
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#05070c';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, 248, 248);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 16, 64, 64, 62);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.88)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.45)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBeamGradientTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 256, 0, 0);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.28, 'rgba(255, 255, 255, 0.52)');
    grad.addColorStop(0.68, 'rgba(255, 255, 255, 0.14)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFloorGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 8, 128, 128, 126);
    grad.addColorStop(0, 'rgba(255,255,255,0.65)');
    grad.addColorStop(0.42, 'rgba(255,255,255,0.22)');
    grad.addColorStop(0.75, 'rgba(255,255,255,0.05)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Interactive 3D Armored Motorsport Vault with 4 independent articulated mechanical edge latches.
 * Latches NEVER open automatically — each tap/click physically releases one latch until all 4 are open,
 * blowing the hinged 3D armored lid wide open with volumetric energy beams & 3D sparks.
 */
export const CrateVault3D: React.FC<CrateVault3DProps> = ({
  phase,
  unlockedMask,
  lastUnlockedLock,
  tier,
  accentHex,
  secondaryHex,
  tapRecoilKey,
  onUnlockLock,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Live prop bridge for the Three.js render loop (avoids re-mounting WebGL context on state changes)
  const liveRef = useRef({
    phase,
    unlockedMask,
    lastUnlockedLock,
    accentHex,
    secondaryHex,
    tapRecoilKey,
    onUnlockLock,
  });
  liveRef.current = {
    phase,
    unlockedMask,
    lastUnlockedLock,
    accentHex,
    secondaryHex,
    tapRecoilKey,
    onUnlockLock,
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const palette = TIER_MATERIALS[tier];

    const scene = new THREE.Scene();

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 60);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSoftwareGl ? 1 : 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);

    // Environment map for authentic brushed metal, titanium & anodized reflections
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmrem.dispose();

    // ---- Studio 3-Point + Dynamic Interior Core Lighting ----
    const hemiLight = new THREE.HemisphereLight('#c8dcff', '#101420', 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#fff5e6', 2.4);
    keyLight.position.set(4.5, 7.2, 5.4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(accentHex, 2.2);
    rimLight.position.set(-5.2, 4.2, -4.6);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight('#7dd3fc', 0.7);
    fillLight.position.set(-4.2, 2.5, 4.0);
    scene.add(fillLight);

    const coreLight = new THREE.PointLight(accentHex, 0.4, 11, 1.5);
    coreLight.position.set(0, 1.05, 0);
    scene.add(coreLight);

    // ---- Shared Procedural Textures & Materials ----
    const armorTex = createCarbonArmorTexture(palette.hullHex, palette.trimHex);
    const shadowTex = createContactShadowTexture();
    const beamTex = createBeamGradientTexture();
    const floorGlowTex = createFloorGlowTexture();

    const hullMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: armorTex,
      roughness: 0.58,
      metalness: 0.34,
    });
    const lidArmorMat = new THREE.MeshStandardMaterial({
      color: palette.lidHex,
      map: armorTex,
      roughness: 0.48,
      metalness: 0.44,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: palette.trimHex,
      roughness: 0.26,
      metalness: 0.86,
    });
    const bumperMat = new THREE.MeshStandardMaterial({
      color: palette.bumperHex,
      roughness: 0.36,
      metalness: 0.72,
    });
    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: '#0e1118',
      roughness: 0.65,
      metalness: 0.42,
    });
    const boltMat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      roughness: 0.22,
      metalness: 0.92,
    });
    const seamGlowMat = new THREE.MeshStandardMaterial({
      color: accentHex,
      emissive: accentHex,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.1,
    });
    const emblemAccentMat = new THREE.MeshStandardMaterial({
      color: secondaryHex,
      emissive: accentHex,
      emissiveIntensity: 1.4,
      roughness: 0.2,
      metalness: 0.25,
    });

    // ---- Turntable Pedestal & Floor Glow ----
    const stageGroup = new THREE.Group();
    scene.add(stageGroup);

    const pedestalMat = new THREE.MeshStandardMaterial({
      color: palette.pedestalHex,
      roughness: 0.68,
      metalness: 0.3,
    });
    const pedestalGeo = new THREE.CylinderGeometry(2.35, 2.58, 0.24, 48);
    const pedestalMesh = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestalMesh.position.y = -0.14;
    stageGroup.add(pedestalMesh);

    const pedestalTrimGeo = new THREE.TorusGeometry(2.34, 0.032, 12, 64);
    const pedestalTrim = new THREE.Mesh(pedestalTrimGeo, trimMat);
    pedestalTrim.rotation.x = Math.PI / 2;
    pedestalTrim.position.y = -0.015;
    stageGroup.add(pedestalTrim);

    // 4 Segmented Neon Telemetry Arcs on pedestal corresponding to the 4 locks
    const floorArcMats: THREE.MeshStandardMaterial[] = [];
    const floorArcGeo = new THREE.RingGeometry(1.92, 2.02, 24, 1, 0, Math.PI * 0.42);
    for (let i = 0; i < 4; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: '#27272a',
        emissive: accentHex,
        emissiveIntensity: 0.08,
        roughness: 0.3,
        metalness: 0.2,
        side: THREE.DoubleSide,
      });
      floorArcMats.push(mat);
      const arc = new THREE.Mesh(floorArcGeo, mat);
      arc.rotation.x = -Math.PI / 2;
      arc.rotation.z = i * (Math.PI / 2) + 0.14;
      arc.position.y = -0.012;
      stageGroup.add(arc);
    }

    const contactShadowGeo = new THREE.PlaneGeometry(3.4, 2.8);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = -0.008;
    stageGroup.add(contactShadow);

    const floorGlowGeo = new THREE.PlaneGeometry(5.6, 5.6);
    const floorGlowMat = new THREE.MeshBasicMaterial({
      map: floorGlowTex,
      color: accentHex,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const floorGlow = new THREE.Mesh(floorGlowGeo, floorGlowMat);
    floorGlow.rotation.x = -Math.PI / 2;
    floorGlow.position.y = -0.006;
    stageGroup.add(floorGlow);

    // 3D Shockwave Ring (expands on burst)
    const shockwaveGeo = new THREE.RingGeometry(0.6, 0.92, 48);
    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: secondaryHex,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const shockwaveMesh = new THREE.Mesh(shockwaveGeo, shockwaveMat);
    shockwaveMesh.rotation.x = -Math.PI / 2;
    shockwaveMesh.position.y = 0.05;
    stageGroup.add(shockwaveMesh);

    // ---- Main Crate Root (handles drop bounce, rattle, recoil, orbit yaw) ----
    const vaultRoot = new THREE.Group();
    stageGroup.add(vaultRoot);

    // Invisible generous collider on vault body so tapping anywhere on the crate works effortlessly
    const bodyColliderGeo = new THREE.BoxGeometry(2.52, 1.56, 2.02);
    const invisibleColliderMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const bodyCollider = new THREE.Mesh(bodyColliderGeo, invisibleColliderMat);
    bodyCollider.position.y = 0.78;
    bodyCollider.userData = { isVaultBody: true };
    vaultRoot.add(bodyCollider);

    // ---- Lower Armored Hull ----
    const lowerHull = new THREE.Group();
    vaultRoot.add(lowerHull);

    // Main armored box core
    const hullW = 2.26;
    const hullH = 0.96;
    const hullD = 1.72;
    const mainBodyGeo = new THREE.BoxGeometry(hullW, hullH, hullD);
    const mainBody = new THREE.Mesh(mainBodyGeo, hullMat);
    mainBody.position.y = hullH * 0.5 + 0.04;
    lowerHull.add(mainBody);

    // Bottom skid frame rails (lifts crate subtly off turntable like heavy air-freight vault)
    const skidGeo = new THREE.BoxGeometry(2.14, 0.08, 0.24);
    for (const zSign of [-1, 1]) {
      const skid = new THREE.Mesh(skidGeo, darkSteelMat);
      skid.position.set(0, 0.04, zSign * 0.64);
      lowerHull.add(skid);
    }

    // 4 Heavy Armored Corner Bumpers
    const cornerPostGeo = new THREE.BoxGeometry(0.28, hullH + 0.05, 0.28);
    const cornerCapGeo = new THREE.BoxGeometry(0.32, 0.16, 0.32);
    for (const xSign of [-1, 1]) {
      for (const zSign of [-1, 1]) {
        const px = xSign * (hullW * 0.5 - 0.04);
        const pz = zSign * (hullD * 0.5 - 0.04);
        const post = new THREE.Mesh(cornerPostGeo, bumperMat);
        post.position.set(px, hullH * 0.5 + 0.04, pz);
        lowerHull.add(post);

        const foot = new THREE.Mesh(cornerCapGeo, trimMat);
        foot.position.set(px, 0.1, pz);
        lowerHull.add(foot);
      }
    }

    // Horizontal Side & Front Armor Ribs
    const frontRibGeo = new THREE.BoxGeometry(1.76, 0.08, 0.07);
    const sideRibGeo = new THREE.BoxGeometry(0.07, 0.08, 1.24);
    const ribYs = [0.28, 0.52, 0.76];
    for (const ry of ribYs) {
      for (const zSign of [-1, 1]) {
        const rib = new THREE.Mesh(frontRibGeo, bumperMat);
        rib.position.set(0, ry, zSign * (hullD * 0.5 + 0.02));
        lowerHull.add(rib);
      }
      for (const xSign of [-1, 1]) {
        const sRib = new THREE.Mesh(sideRibGeo, bumperMat);
        sRib.position.set(xSign * (hullW * 0.5 + 0.02), ry, 0);
        lowerHull.add(sRib);
      }
    }

    // Front Motorsport Crest Emblem Plate
    const emblemBackGeo = new THREE.BoxGeometry(0.56, 0.44, 0.09);
    const emblemBack = new THREE.Mesh(emblemBackGeo, darkSteelMat);
    emblemBack.position.set(0, 0.52, hullD * 0.5 + 0.035);
    lowerHull.add(emblemBack);

    const emblemFrameGeo = new THREE.BoxGeometry(0.46, 0.34, 0.04);
    const emblemFrame = new THREE.Mesh(emblemFrameGeo, trimMat);
    emblemFrame.position.set(0, 0.52, hullD * 0.5 + 0.075);
    lowerHull.add(emblemFrame);

    const emblemCoreGeo = new THREE.OctahedronGeometry(0.11, 0);
    const emblemCore = new THREE.Mesh(emblemCoreGeo, emblemAccentMat);
    emblemCore.scale.set(1.15, 1.15, 0.45);
    emblemCore.position.set(0, 0.52, hullD * 0.5 + 0.1);
    lowerHull.add(emblemCore);

    // Top Seam Glowing Collar (illuminates when lid starts rising!)
    const seamCollarGeo = new THREE.BoxGeometry(hullW - 0.08, 0.12, hullD - 0.08);
    const seamCollar = new THREE.Mesh(seamCollarGeo, seamGlowMat);
    seamCollar.position.y = hullH + 0.03;
    lowerHull.add(seamCollar);

    // ---- Internal Blazing Core & Volumetric Light Pillar ----
    const coreGroup = new THREE.Group();
    coreGroup.position.set(0, hullH + 0.02, 0);
    vaultRoot.add(coreGroup);

    const innerReactorGeo = new THREE.OctahedronGeometry(0.36, 1);
    const innerReactorMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: accentHex,
      emissiveIntensity: 2.2,
      roughness: 0.12,
      metalness: 0.2,
    });
    const innerReactor = new THREE.Mesh(innerReactorGeo, innerReactorMat);
    innerReactor.position.y = 0.05;
    coreGroup.add(innerReactor);

    // Outer & Inner Volumetric Light Cones (shoot out when lid cracks & bursts open)
    const beamOuterGeo = new THREE.CylinderGeometry(1.45, 0.72, 4.4, 24, 1, true);
    beamOuterGeo.translate(0, 2.2, 0);
    const beamOuterMat = new THREE.MeshBasicMaterial({
      map: beamTex,
      color: accentHex,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const beamOuter = new THREE.Mesh(beamOuterGeo, beamOuterMat);
    coreGroup.add(beamOuter);

    const beamInnerGeo = new THREE.CylinderGeometry(0.75, 0.34, 4.8, 20, 1, true);
    beamInnerGeo.translate(0, 2.4, 0);
    const beamInnerMat = new THREE.MeshBasicMaterial({
      map: beamTex,
      color: secondaryHex,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const beamInner = new THREE.Mesh(beamInnerGeo, beamInnerMat);
    coreGroup.add(beamInner);

    // ---- Articulated Armored Top Lid (hinged at rear top edge) ----
    const lidPivot = new THREE.Group();
    const hingeZ = -(hullD * 0.5 - 0.04);
    const hingeY = hullH + 0.08;
    lidPivot.position.set(0, hingeY, hingeZ);
    vaultRoot.add(lidPivot);

    const lidContent = new THREE.Group();
    // Offset relative to rear hinge pivot so lid sits centered over lower hull
    lidContent.position.set(0, 0, -hingeZ);
    lidPivot.add(lidContent);

    // Main lid skirt
    const lidBaseGeo = new THREE.BoxGeometry(hullW + 0.06, 0.24, hullD + 0.06);
    const lidBase = new THREE.Mesh(lidBaseGeo, lidArmorMat);
    lidBase.position.y = 0.12;
    lidContent.add(lidBase);

    // Chamfered upper crown deck
    const lidCrownGeo = new THREE.BoxGeometry(hullW - 0.26, 0.16, hullD - 0.24);
    const lidCrown = new THREE.Mesh(lidCrownGeo, hullMat);
    lidCrown.position.y = 0.3;
    lidContent.add(lidCrown);

    // Dual Longitudinal Roof Armor Rails
    const railGeo = new THREE.BoxGeometry(0.14, 0.11, hullD - 0.16);
    for (const xSign of [-1, 1]) {
      const rail = new THREE.Mesh(railGeo, trimMat);
      rail.position.set(xSign * 0.84, 0.33, 0);
      lidContent.add(rail);
    }

    // Center Racing Light Stripe on Lid Crown
    const lidStripeGeo = new THREE.BoxGeometry(0.18, 0.04, hullD - 0.32);
    const lidStripe = new THREE.Mesh(lidStripeGeo, emblemAccentMat);
    lidStripe.position.set(0, 0.39, 0);
    lidContent.add(lidStripe);

    // Lid corner reinforcement caps
    const lidCornerGeo = new THREE.BoxGeometry(0.32, 0.26, 0.32);
    for (const xSign of [-1, 1]) {
      for (const zSign of [-1, 1]) {
        const cap = new THREE.Mesh(lidCornerGeo, bumperMat);
        cap.position.set(
          xSign * (hullW * 0.5 - 0.02),
          0.13,
          zSign * (hullD * 0.5 - 0.02),
        );
        lidContent.add(cap);
      }
    }

    // Rear Heavy Dual Hydraulic Hinges
    const hingeBarrelGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.34, 16);
    hingeBarrelGeo.rotateZ(Math.PI / 2);
    for (const xSign of [-1, 1]) {
      const barrel = new THREE.Mesh(hingeBarrelGeo, trimMat);
      barrel.position.set(xSign * 0.66, 0.02, hingeZ - 0.05);
      lidContent.add(barrel);
    }

    // Instanced Hex Bolts across crate body & lid (single draw call)
    const boltGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.03, 6);
    const boltOffsets: Array<[number, number, number, number, number]> = [
      // Front corner bolts
      [-1.02, 0.88, hullD * 0.5 + 0.09, Math.PI / 2, 0],
      [1.02, 0.88, hullD * 0.5 + 0.09, Math.PI / 2, 0],
      [-1.02, 0.22, hullD * 0.5 + 0.09, Math.PI / 2, 0],
      [1.02, 0.22, hullD * 0.5 + 0.09, Math.PI / 2, 0],
      // Back corner bolts
      [-1.02, 0.88, -(hullD * 0.5 + 0.09), Math.PI / 2, 0],
      [1.02, 0.88, -(hullD * 0.5 + 0.09), Math.PI / 2, 0],
      // Side corner bolts
      [hullW * 0.5 + 0.09, 0.88, 0.74, 0, Math.PI / 2],
      [hullW * 0.5 + 0.09, 0.88, -0.74, 0, Math.PI / 2],
      [-(hullW * 0.5 + 0.09), 0.88, 0.74, 0, Math.PI / 2],
      [-(hullW * 0.5 + 0.09), 0.88, -0.74, 0, Math.PI / 2],
    ];
    const boltInstanced = new THREE.InstancedMesh(boltGeo, boltMat, boltOffsets.length);
    boltOffsets.forEach(([bx, by, bz, rx, rz], idx) => {
      _dummy.position.set(bx, by, bz);
      _dummy.rotation.set(rx, 0, rz);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      boltInstanced.setMatrixAt(idx, _dummy.matrix);
    });
    boltInstanced.instanceMatrix.needsUpdate = true;
    lowerHull.add(boltInstanced);

    // ---- 4 Independent Articulated Edge Latches ----
    // 0: Front-Left, 1: Front-Right, 2: Right-Edge, 3: Left-Edge
    const latchSpecs: Array<{
      pos: [number, number, number];
      rotY: number;
      preferredYaw: number;
    }> = [
      { pos: [-0.64, hullH + 0.03, hullD * 0.5 + 0.03], rotY: 0, preferredYaw: 0.42 },
      { pos: [0.64, hullH + 0.03, hullD * 0.5 + 0.03], rotY: 0, preferredYaw: -0.42 },
      { pos: [hullW * 0.5 + 0.03, hullH + 0.03, 0], rotY: Math.PI / 2, preferredYaw: -1.12 },
      { pos: [-(hullW * 0.5 + 0.03), hullH + 0.03, 0], rotY: -Math.PI / 2, preferredYaw: 1.12 },
    ];

    const latchHousingGeo = new THREE.BoxGeometry(0.32, 0.24, 0.12);
    const latchClampArmGeo = new THREE.BoxGeometry(0.06, 0.34, 0.09);
    const latchClampBridgeGeo = new THREE.BoxGeometry(0.28, 0.08, 0.11);
    const latchPinGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.14, 10);
    latchPinGeo.rotateZ(Math.PI / 2);
    const latchLedGeo = new THREE.BoxGeometry(0.2, 0.055, 0.04);
    const latchHaloGeo = new THREE.RingGeometry(0.21, 0.265, 24);
    const latchColliderGeo = new THREE.BoxGeometry(0.56, 0.62, 0.42);
    const lidCatchGeo = new THREE.BoxGeometry(0.24, 0.12, 0.11);

    const latches: LatchRig[] = latchSpecs.map((spec, index) => {
      const group = new THREE.Group();
      group.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
      group.rotation.y = spec.rotY;
      vaultRoot.add(group);

      // Upper catch hook mounted on the lid so it rises away from the clamp when lid lifts!
      const catchHook = new THREE.Mesh(lidCatchGeo, trimMat);
      catchHook.position.set(spec.pos[0], 0.15, spec.pos[2]);
      catchHook.rotation.y = spec.rotY;
      lidContent.add(catchHook);

      // Lower steel housing bolted to hull
      const housing = new THREE.Mesh(latchHousingGeo, darkSteelMat);
      housing.position.set(0, -0.1, 0.04);
      group.add(housing);

      // Retracting lateral locking pins (pop outward when unlocked)
      const pinLeft = new THREE.Mesh(latchPinGeo, boltMat);
      pinLeft.position.set(-0.15, -0.06, 0.06);
      group.add(pinLeft);

      const pinRight = new THREE.Mesh(latchPinGeo, boltMat);
      pinRight.position.set(0.15, -0.06, 0.06);
      group.add(pinRight);

      // Articulated U-clamp lever arm (pivots at bottom of housing, flips downward ~125° on unlock)
      const clampPivot = new THREE.Group();
      clampPivot.position.set(0, -0.14, 0.09);
      group.add(clampPivot);

      const clampMat = new THREE.MeshStandardMaterial({
        color: palette.clampHex,
        roughness: 0.24,
        metalness: 0.88,
        emissive: '#000000',
        emissiveIntensity: 0,
      });

      const leftArm = new THREE.Mesh(latchClampArmGeo, clampMat);
      leftArm.position.set(-0.11, 0.18, 0.03);
      clampPivot.add(leftArm);

      const rightArm = new THREE.Mesh(latchClampArmGeo, clampMat);
      rightArm.position.set(0.11, 0.18, 0.03);
      clampPivot.add(rightArm);

      const topBridge = new THREE.Mesh(latchClampBridgeGeo, clampMat);
      topBridge.position.set(0, 0.34, 0.03);
      clampPivot.add(topBridge);

      const handleBar = new THREE.Mesh(latchClampBridgeGeo, trimMat);
      handleBar.scale.set(0.84, 0.8, 1.15);
      handleBar.position.set(0, 0.15, 0.055);
      clampPivot.add(handleBar);

      // Status LED bar embedded in the latch handle
      const ledMat = new THREE.MeshStandardMaterial({
        color: '#ff5e2b',
        emissive: '#ff5e2b',
        emissiveIntensity: 1.8,
        roughness: 0.18,
        metalness: 0.1,
      });
      const ledBar = new THREE.Mesh(latchLedGeo, ledMat);
      ledBar.position.set(0, 0.24, 0.08);
      clampPivot.add(ledBar);

      // Subtle interactive target reticle ring for active/hovered locked latch
      const haloMat = new THREE.MeshBasicMaterial({
        color: '#fbbf24',
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const haloMesh = new THREE.Mesh(latchHaloGeo, haloMat);
      haloMesh.position.set(0, 0.08, 0.17);
      group.add(haloMesh);

      // Spark spawn anchor right at the seam catch
      const sparkAnchor = new THREE.Object3D();
      sparkAnchor.position.set(0, 0.12, 0.15);
      group.add(sparkAnchor);

      // Generous raycast hitbox for direct latch clicking
      const collider = new THREE.Mesh(latchColliderGeo, invisibleColliderMat);
      collider.position.set(0, 0.06, 0.12);
      collider.userData = { lockIndex: index };
      group.add(collider);

      return {
        index,
        group,
        clampPivot,
        pinLeft,
        pinRight,
        ledMat,
        haloMesh,
        haloMat,
        clampMat,
        collider,
        preferredYaw: spec.preferredYaw,
        openProgress: 0,
        openVelocity: 0,
        wasUnlocked: false,
        sparkAnchor,
      };
    });

    const raycastTargets: THREE.Object3D[] = [
      ...latches.map((l) => l.collider),
      bodyCollider,
    ];

    // ---- 3D Instanced Metallic Sparks & Embers Pool (zero GC) ----
    const SPARK_COUNT = 72;
    const sparkGeo = new THREE.OctahedronGeometry(0.042, 0);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.96,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sparkInstanced = new THREE.InstancedMesh(sparkGeo, sparkMat, SPARK_COUNT);
    sparkInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const sparks: SparkParticle[] = [];
    for (let i = 0; i < SPARK_COUNT; i++) {
      sparks.push({
        active: false,
        pos: new THREE.Vector3(0, -10, 0),
        vel: new THREE.Vector3(),
        age: 1,
        maxAge: 1,
        scale: 0,
        spin: 0,
      });
      _dummy.position.set(0, -10, 0);
      _dummy.scale.set(0, 0, 0);
      _dummy.updateMatrix();
      sparkInstanced.setMatrixAt(i, _dummy.matrix);
      sparkInstanced.setColorAt(i, _secondaryColor.set(secondaryHex));
    }
    sparkInstanced.instanceMatrix.needsUpdate = true;
    if (sparkInstanced.instanceColor) sparkInstanced.instanceColor.needsUpdate = true;
    stageGroup.add(sparkInstanced);

    let sparkCursor = 0;
    const emitSparksAt = (
      worldPos: THREE.Vector3,
      count: number,
      speedMin: number,
      speedMax: number,
      upwardBias: number,
      primaryHex: string,
      altHex: string,
    ) => {
      for (let i = 0; i < count; i++) {
        const s = sparks[sparkCursor % SPARK_COUNT];
        const idx = sparkCursor % SPARK_COUNT;
        sparkCursor++;
        s.active = true;
        s.pos.copy(worldPos);
        const theta = Math.random() * Math.PI * 2;
        const speed = speedMin + Math.random() * (speedMax - speedMin);
        s.vel.set(
          Math.cos(theta) * speed * (0.55 + Math.random() * 0.65),
          upwardBias + Math.random() * speed * 0.9,
          Math.sin(theta) * speed * (0.55 + Math.random() * 0.65),
        );
        s.age = 0;
        s.maxAge = 0.45 + Math.random() * 0.45;
        s.scale = 0.65 + Math.random() * 1.1;
        s.spin = (Math.random() - 0.5) * 14;
        _tmpColor.set(i % 2 === 0 ? primaryHex : altHex);
        sparkInstanced.setColorAt(idx, _tmpColor);
      }
      if (sparkInstanced.instanceColor) {
        sparkInstanced.instanceColor.needsUpdate = true;
      }
    };

    // ---- Interactive Pointer Controls (Tap to Unlock / Drag to Orbit) ----
    let isPointerDown = false;
    let pointerDragged = false;
    let pointerDownX = 0;
    let pointerDownY = 0;
    let lastPointerX = 0;
    let hoveredLockIndex: number | null = null;
    let manualOrbitCooldown = 0;

    let crateYaw = 0.36;
    let targetYaw = 0.36;

    const hitTestPointer = (clientX: number, clientY: number): { lockIndex?: number; hitBody: boolean } => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return { hitBody: false };
      _rayNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _rayNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      _raycaster.setFromCamera(_rayNdc, camera);
      const hits = _raycaster.intersectObjects(raycastTargets, false);
      for (const hit of hits) {
        const lIdx = hit.object.userData?.lockIndex;
        if (typeof lIdx === 'number') {
          if (!liveRef.current.unlockedMask[lIdx]) {
            return { lockIndex: lIdx, hitBody: true };
          }
        }
      }
      if (hits.length > 0) {
        return { hitBody: true };
      }
      return { hitBody: false };
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      isPointerDown = true;
      pointerDragged = false;
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
      lastPointerX = e.clientX;
      try {
        renderer.domElement.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isPointerDown) {
        const dxTotal = e.clientX - pointerDownX;
        const dyTotal = e.clientY - pointerDownY;
        if (!pointerDragged && Math.hypot(dxTotal, dyTotal) > 10) {
          pointerDragged = true;
        }
        if (pointerDragged) {
          const deltaX = e.clientX - lastPointerX;
          targetYaw += deltaX * 0.011;
          crateYaw += deltaX * 0.008;
          manualOrbitCooldown = 2.4;
          renderer.domElement.style.cursor = 'grabbing';
        }
        lastPointerX = e.clientX;
        return;
      }

      // Desktop hover highlight over locked latches
      if (e.pointerType === 'mouse' && liveRef.current.phase !== 'burst') {
        const hit = hitTestPointer(e.clientX, e.clientY);
        hoveredLockIndex = typeof hit.lockIndex === 'number' ? hit.lockIndex : null;
        renderer.domElement.style.cursor = hit.hitBody ? 'pointer' : 'grab';
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!isPointerDown) return;
      isPointerDown = false;
      try {
        renderer.domElement.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }

      if (!pointerDragged && liveRef.current.phase !== 'burst') {
        const hit = hitTestPointer(e.clientX, e.clientY);
        // Clicking a specific locked latch unlocks THAT exact latch; clicking anywhere else unlocks the next latch!
        liveRef.current.onUnlockLock(hit.lockIndex);
      }
      renderer.domElement.style.cursor = 'pointer';
    };

    const handlePointerCancel = () => {
      isPointerDown = false;
      pointerDragged = false;
      hoveredLockIndex = null;
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointercancel', handlePointerCancel);

    // ---- Resize Handling ----
    const handleResize = () => {
      if (!container) return;
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(handleResize)
        : null;
    resizeObserver?.observe(container);

    // ---- Animation State ----
    let elapsed = 0;
    let dropElapsed = 0;
    let burstElapsed = 0;
    let burstTriggered = false;
    let lastRecoilKey = liveRef.current.tapRecoilKey;
    let recoilEnergy = 0;
    let cameraShake = 0;
    let lidOpenAngle = 0;
    let lidLiftOffset = 0;
    let lastFrameMs = performance.now();
    let disposed = false;
    let rafId = 0;
    let swTimerId = 0;

    // Software-WebGL pacing helper matching project pattern
    const scheduleNext = (fn: () => void) => {
      if (disposed) return;
      if (isSoftwareGl) {
        swTimerId = window.setTimeout(fn, 32);
      } else {
        rafId = window.requestAnimationFrame(fn);
      }
    };

    const renderFrame = () => {
      if (disposed) return;
      const nowMs = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (nowMs - lastFrameMs) / 1000));
      lastFrameMs = nowMs;
      elapsed += dt;

      const cur = liveRef.current;
      const mask = cur.unlockedMask;
      const unlockedCount =
        (mask[0] ? 1 : 0) +
        (mask[1] ? 1 : 0) +
        (mask[2] ? 1 : 0) +
        (mask[3] ? 1 : 0);

      // Sync accent colors smoothly
      _accentColor.set(cur.accentHex);
      _secondaryColor.set(cur.secondaryHex);
      rimLight.color.lerp(_accentColor, Math.min(1, dt * 8));
      coreLight.color.lerp(_accentColor, Math.min(1, dt * 8));
      seamGlowMat.color.lerp(_accentColor, Math.min(1, dt * 8));
      seamGlowMat.emissive.lerp(_accentColor, Math.min(1, dt * 8));
      emblemAccentMat.emissive.lerp(_accentColor, Math.min(1, dt * 8));
      innerReactorMat.emissive.lerp(_accentColor, Math.min(1, dt * 8));
      floorGlowMat.color.lerp(_accentColor, Math.min(1, dt * 8));
      beamOuterMat.color.lerp(_accentColor, Math.min(1, dt * 8));
      beamInnerMat.color.lerp(_secondaryColor, Math.min(1, dt * 8));
      shockwaveMat.color.lerp(_secondaryColor, Math.min(1, dt * 8));

      // Detect tap recoil impulse
      if (cur.tapRecoilKey !== lastRecoilKey) {
        lastRecoilKey = cur.tapRecoilKey;
        recoilEnergy = 1.0;
        cameraShake = Math.max(cameraShake, 0.22 + unlockedCount * 0.07);
      }
      recoilEnergy = Math.max(0, recoilEnergy - dt * 4.4);
      cameraShake = Math.max(0, cameraShake - dt * 3.8);

      // Update Drop-in Physics (heavy armored slam onto turntable)
      let dropY = 0;
      let dropScaleY = 1;
      if (cur.phase === 'drop') {
        dropElapsed += dt;
        const t = Math.min(1, dropElapsed / 0.42);
        if (t < 0.65) {
          const u = t / 0.65;
          dropY = 3.2 * Math.pow(1 - u, 2.2);
        } else {
          const bounceU = (t - 0.65) / 0.35;
          dropY = Math.sin(bounceU * Math.PI) * 0.16 * (1 - bounceU * 0.4);
          dropScaleY = 1 - Math.sin(bounceU * Math.PI) * 0.06;
          if (t >= 0.65 && t < 0.72) {
            cameraShake = Math.max(cameraShake, 0.28);
          }
        }
      }

      // Find next still-locked latch to frame clearly (unless user manually dragged)
      let nextLockedIndex = -1;
      for (let i = 0; i < 4; i++) {
        if (!mask[i]) {
          nextLockedIndex = i;
          break;
        }
      }

      if (manualOrbitCooldown > 0) {
        manualOrbitCooldown = Math.max(0, manualOrbitCooldown - dt);
      }

      if (cur.phase === 'burst') {
        burstElapsed += dt;
        if (!burstTriggered) {
          burstTriggered = true;
          cameraShake = 0.68;
          vaultRoot.updateMatrixWorld(true);
          _tmpVec.set(0, hullH + 0.16, 0).applyMatrix4(vaultRoot.matrixWorld);
          emitSparksAt(_tmpVec, 56, 2.2, 6.2, 3.8, cur.secondaryHex, cur.accentHex);
        }
        // Center front-facing hero presentation as the lid blasts open!
        targetYaw = 0.18 + Math.sin(burstElapsed * 1.4) * 0.14;
      } else if (manualOrbitCooldown <= 0 && !isPointerDown && nextLockedIndex >= 0) {
        // Gently turn the crate so the next locked edge latch is presented clearly to the player
        const desired = latches[nextLockedIndex].preferredYaw;
        // Shortest angular interpolation
        const diff = Math.atan2(Math.sin(desired - targetYaw), Math.cos(desired - targetYaw));
        targetYaw += diff * Math.min(1, dt * 4.0);
      }

      const yawDiff = Math.atan2(Math.sin(targetYaw - crateYaw), Math.cos(targetYaw - crateYaw));
      crateYaw += yawDiff * Math.min(1, dt * 6.5);

      // Subtle tension rattle as more locks are released (only when >= 2 locks open)
      let rattleX = 0;
      let rattleZ = 0;
      let rattleRotZ = 0;
      if (cur.phase === 'charging' && unlockedCount >= 2) {
        const amp = unlockedCount === 2 ? 0.012 : 0.032;
        const freq = unlockedCount === 2 ? 24 : 38;
        rattleX = Math.sin(elapsed * freq) * amp;
        rattleZ = Math.cos(elapsed * (freq * 1.17)) * amp;
        rattleRotZ = Math.sin(elapsed * (freq * 0.8)) * amp * 0.55;
      }

      const recoilDrop = Math.sin(recoilEnergy * Math.PI) * -0.07;
      const recoilSquash = 1 - Math.sin(recoilEnergy * Math.PI) * 0.045;
      const recoilSpread = 1 + Math.sin(recoilEnergy * Math.PI) * 0.025;

      vaultRoot.position.set(rattleX, dropY + recoilDrop, rattleZ);
      vaultRoot.rotation.set(0, crateYaw, rattleRotZ);
      vaultRoot.scale.set(recoilSpread, dropScaleY * recoilSquash, recoilSpread);

      // ---- Animate the 4 Independent Mechanical Edge Latches ----
      vaultRoot.updateMatrixWorld(true);
      latches.forEach((latch, idx) => {
        const isUnlocked = mask[idx];

        // Trigger spark burst on the exact frame a latch unlocks!
        if (isUnlocked && !latch.wasUnlocked) {
          latch.wasUnlocked = true;
          latch.openVelocity = 8.4;
          latch.sparkAnchor.getWorldPosition(_tmpVec);
          emitSparksAt(_tmpVec, 18, 1.4, 3.8, 1.6, cur.secondaryHex, '#ffffff');
        }

        // Damped spring animation for mechanical clamp lever opening (0 -> 1)
        const targetOpen = isUnlocked ? 1 : 0;
        const springForce = (targetOpen - latch.openProgress) * 115;
        latch.openVelocity = (latch.openVelocity + springForce * dt) * Math.exp(-8.5 * dt);
        latch.openProgress = Math.max(0, Math.min(1.18, latch.openProgress + latch.openVelocity * dt));

        // Flip clamp lever outward & downward (~124 deg = 2.16 rad)
        latch.clampPivot.rotation.x = latch.openProgress * 2.16;

        // Slide side hydraulic locking pins outward as latch releases
        const pinSlide = latch.openProgress * 0.085;
        latch.pinLeft.position.x = -0.15 - pinSlide;
        latch.pinRight.position.x = 0.15 + pinSlide;

        // LED & Target Reticle Halo Feedback
        const isNextTarget = !isUnlocked && idx === nextLockedIndex && cur.phase === 'charging';
        const isHovered = !isUnlocked && hoveredLockIndex === idx && cur.phase !== 'burst';

        if (isUnlocked) {
          latch.ledMat.color.lerp(_unlockedLedColor, Math.min(1, dt * 12));
          latch.ledMat.emissive.lerp(_unlockedLedColor, Math.min(1, dt * 12));
          latch.ledMat.emissiveIntensity = 2.6;
          latch.clampMat.emissive.set('#000000');
          latch.clampMat.emissiveIntensity = 0;
          latch.haloMat.opacity = Math.max(0, latch.haloMat.opacity - dt * 6);
        } else if (isHovered || isNextTarget) {
          const pulse = 0.5 + 0.5 * Math.sin(elapsed * 5.2);
          latch.ledMat.color.lerp(_nextLedColor, Math.min(1, dt * 10));
          latch.ledMat.emissive.lerp(_nextLedColor, Math.min(1, dt * 10));
          latch.ledMat.emissiveIntensity = 2.2 + pulse * 1.1;
          latch.clampMat.emissive.copy(_accentColor);
          latch.clampMat.emissiveIntensity = isHovered ? 0.45 : 0.18 + pulse * 0.15;
          latch.haloMat.color.copy(isHovered ? _secondaryColor : _nextLedColor);
          latch.haloMat.opacity = isHovered ? 0.85 : 0.34 + pulse * 0.32;
          const haloScale = isHovered ? 1.12 : 0.96 + pulse * 0.14;
          latch.haloMesh.scale.set(haloScale, haloScale, 1);
          latch.haloMesh.rotation.z = elapsed * 0.9;
        } else {
          latch.ledMat.color.lerp(_lockedLedColor, Math.min(1, dt * 10));
          latch.ledMat.emissive.lerp(_lockedLedColor, Math.min(1, dt * 10));
          latch.ledMat.emissiveIntensity = 1.1;
          latch.clampMat.emissive.set('#000000');
          latch.clampMat.emissiveIntensity = 0;
          latch.haloMat.opacity = Math.max(0, latch.haloMat.opacity - dt * 5);
        }

        // Update matching floor telemetry arc
        const arcMat = floorArcMats[idx];
        if (isUnlocked) {
          arcMat.color.copy(_accentColor);
          arcMat.emissive.copy(_accentColor);
          arcMat.emissiveIntensity = cur.phase === 'burst' ? 3.2 : 1.8;
        } else if (isNextTarget) {
          arcMat.color.copy(_nextLedColor);
          arcMat.emissive.copy(_nextLedColor);
          arcMat.emissiveIntensity = 0.55;
        } else {
          arcMat.color.set('#27272a');
          arcMat.emissive.set('#000000');
          arcMat.emissiveIntensity = 0;
        }
      });

      // ---- Progressive Armored Lid Unsealing & Burst Explosion ----
      let targetLidAngle = 0;
      let targetLidLift = 0;
      if (cur.phase === 'burst') {
        const bT = Math.min(1, burstElapsed / 0.48);
        // Explosive pneumatic swing open to ~84° with slight elastic settle
        const easeOut = 1 - Math.pow(1 - bT, 3);
        targetLidAngle = -1.46 * easeOut - Math.sin(burstElapsed * 7) * 0.03 * Math.max(0, 1 - burstElapsed);
        targetLidLift = 0.18 * easeOut;
      } else {
        // Lid strains upward more with each released latch!
        const stageAngles = [0, -0.055, -0.125, -0.22, -1.46];
        const stageLifts = [0, 0.025, 0.065, 0.125, 0.18];
        targetLidAngle = stageAngles[unlockedCount];
        targetLidLift = stageLifts[unlockedCount];
        if (unlockedCount >= 1) {
          targetLidAngle -= Math.sin(elapsed * (6 + unlockedCount * 4)) * (0.008 * unlockedCount);
        }
      }

      lidOpenAngle += (targetLidAngle - lidOpenAngle) * Math.min(1, dt * (cur.phase === 'burst' ? 11 : 8));
      lidLiftOffset += (targetLidLift - lidLiftOffset) * Math.min(1, dt * 9);
      lidPivot.rotation.x = lidOpenAngle;
      lidPivot.position.y = hingeY + lidLiftOffset;

      // ---- Internal Core, Light Seam & Volumetric Beams ----
      innerReactor.rotation.y = elapsed * (1.2 + unlockedCount * 1.1);
      innerReactor.rotation.x = elapsed * 0.7;
      const coreScale =
        cur.phase === 'burst'
          ? 1.45 + Math.sin(burstElapsed * 18) * 0.15
          : 0.7 + unlockedCount * 0.16;
      innerReactor.scale.setScalar(coreScale);
      innerReactor.position.y = cur.phase === 'burst' ? 0.52 * Math.min(1, burstElapsed / 0.4) + 0.08 : 0.05;

      const targetCoreIntensity =
        cur.phase === 'burst'
          ? 18.0 * Math.min(1, burstElapsed / 0.16)
          : 0.4 + unlockedCount * 2.1 + recoilEnergy * 3.5;
      coreLight.intensity += (targetCoreIntensity - coreLight.intensity) * Math.min(1, dt * 10);

      seamGlowMat.emissiveIntensity =
        cur.phase === 'burst'
          ? 4.6
          : 0.55 + unlockedCount * 0.85 + recoilEnergy * 1.4;

      floorGlowMat.opacity =
        cur.phase === 'burst'
          ? 0.72
          : 0.16 + unlockedCount * 0.1 + recoilEnergy * 0.14;

      // Volumetric Light Cones leak from seam on 2-3 locks, then erupt skyward on burst!
      if (cur.phase === 'burst') {
        const bRamp = Math.min(1, burstElapsed / 0.22);
        beamOuterMat.opacity = 0.62 * bRamp;
        beamInnerMat.opacity = 0.82 * bRamp;
        beamOuter.scale.set(1.25 * bRamp, 1.35 * bRamp, 1.25 * bRamp);
        beamInner.scale.set(1.15 * bRamp, 1.45 * bRamp, 1.15 * bRamp);
        beamOuter.rotation.y = elapsed * 0.9;
        beamInner.rotation.y = -elapsed * 1.3;

        // Expanding floor shockwave ring
        const swT = Math.min(1, burstElapsed / 0.65);
        const swScale = 0.6 + swT * 5.8;
        shockwaveMesh.scale.set(swScale, swScale, 1);
        shockwaveMat.opacity = Math.max(0, (1 - swT) * 0.85);
      } else if (unlockedCount >= 1) {
        const leak = unlockedCount === 1 ? 0.08 : unlockedCount === 2 ? 0.18 : 0.34;
        beamOuterMat.opacity = leak + recoilEnergy * 0.14;
        beamInnerMat.opacity = leak * 0.9;
        beamOuter.scale.set(0.75, 0.25 + unlockedCount * 0.12, 0.75);
        beamInner.scale.set(0.55, 0.2 + unlockedCount * 0.12, 0.55);
        beamOuter.rotation.y = elapsed * 0.5;
        shockwaveMat.opacity = 0;
      } else {
        beamOuterMat.opacity = 0;
        beamInnerMat.opacity = 0;
        shockwaveMat.opacity = 0;
      }

      // ---- Update 3D Spark Particles ----
      let anySparkVisible = false;
      for (let i = 0; i < SPARK_COUNT; i++) {
        const s = sparks[i];
        if (!s.active) continue;
        s.age += dt;
        if (s.age >= s.maxAge) {
          s.active = false;
          _dummy.position.set(0, -10, 0);
          _dummy.scale.set(0, 0, 0);
          _dummy.updateMatrix();
          sparkInstanced.setMatrixAt(i, _dummy.matrix);
          anySparkVisible = true;
          continue;
        }
        anySparkVisible = true;
        s.vel.y -= 7.4 * dt; // gravity
        s.vel.multiplyScalar(Math.exp(-1.5 * dt));
        s.pos.addScaledVector(s.vel, dt);
        const lifeFrac = 1 - s.age / s.maxAge;
        const sc = s.scale * lifeFrac;
        _dummy.position.copy(s.pos);
        _dummy.rotation.set(s.age * s.spin, s.age * s.spin * 0.7, 0);
        _dummy.scale.set(sc, sc * 1.45, sc);
        _dummy.updateMatrix();
        sparkInstanced.setMatrixAt(i, _dummy.matrix);
      }
      if (anySparkVisible) {
        sparkInstanced.instanceMatrix.needsUpdate = true;
      }

      // ---- Dynamic Hero Camera Framing (responsive to portrait mobile & widescreen desktop) ----
      const aspect = camera.aspect || 1;
      const portraitFactor = THREE.MathUtils.clamp((1.05 - aspect) / 0.55, 0, 1);
      const baseDist = THREE.MathUtils.lerp(4.95, 6.95, portraitFactor);
      const zoomTighten =
        cur.phase === 'burst'
          ? -0.78 * Math.min(1, burstElapsed / 0.45)
          : -unlockedCount * 0.16;
      const dist = baseDist + zoomTighten;
      const camElev = THREE.MathUtils.lerp(2.25, 2.75, portraitFactor) + (cur.phase === 'burst' ? 0.35 : 0);

      const shakeX = cameraShake > 0.005 ? (Math.random() - 0.5) * cameraShake * 0.22 : 0;
      const shakeY = cameraShake > 0.005 ? (Math.random() - 0.5) * cameraShake * 0.18 : 0;

      _camPos.set(
        Math.sin(elapsed * 0.35) * 0.14 + shakeX,
        camElev + shakeY,
        dist,
      );
      camera.position.lerp(_camPos, Math.min(1, dt * 7.5));

      _camTarget.set(0, 0.78 + (cur.phase === 'burst' ? 0.24 : 0), 0);
      camera.lookAt(_camTarget);

      renderer.render(scene, camera);
      scheduleNext(renderFrame);
    };

    // Initial camera placement so first frame is never skewed
    const initAspect = camera.aspect || 1;
    const initPortrait = THREE.MathUtils.clamp((1.05 - initAspect) / 0.55, 0, 1);
    camera.position.set(
      0,
      THREE.MathUtils.lerp(2.25, 2.75, initPortrait),
      THREE.MathUtils.lerp(4.95, 6.95, initPortrait),
    );
    camera.lookAt(0, 0.78, 0);

    scheduleNext(renderFrame);

    return () => {
      disposed = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      if (swTimerId) window.clearTimeout(swTimerId);

      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointercancel', handlePointerCancel);
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();

      // Dispose all geometries, materials, textures, environment, and renderer
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
        }
      });

      armorTex.dispose();
      shadowTex.dispose();
      beamTex.dispose();
      floorGlowTex.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [tier]);

  return (
    <div
      ref={containerRef}
      aria-label="3D Zırhlı Kasa — Kilitleri açmak için tıkla veya çevirmek için sürükle"
      className="relative h-full w-full select-none"
    />
  );
};
