import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  CAR_COLORS,
  CarColorId,
  CarCustomConfig,
  CarModelId,
  CarWheelConfig,
  getDefaultCustomForCar,
  getDefaultWheelForCar,
} from '../types/game';
import { RolledLootItem } from '../services/storeCatalog';
import { createPlayerCar, PlayerCarRig } from '../game/carBuilder';
import { getCarBlueprint } from '../game/carBlueprints';

export interface ShowcaseBaseCarConfig {
  modelId: CarModelId;
  colorId: CarColorId;
  wheelConfig: CarWheelConfig;
  customConfig: CarCustomConfig;
  licensePlate: string;
}

interface CrateCarShowcase3DProps {
  lootItem: RolledLootItem;
  baseCar: ShowcaseBaseCarConfig;
  accentHex: string;
  secondaryHex: string;
}

// Pre-allocated math helpers outside render loop (zero GC)
const _camTarget = new THREE.Vector3();
const _desiredTarget = new THREE.Vector3();
const _camPos = new THREE.Vector3();

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

function createShowcaseContactShadow(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 14, 64, 64, 62);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.82)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.44)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function resolveColorHex(colorId: CarColorId): number {
  const found = CAR_COLORS.find((c) => c.id === colorId);
  return found ? found.hex : CAR_COLORS[0].hex;
}

interface FocusCameraPlan {
  target: THREE.Vector3;
  startAzimuth: number;
  endAzimuth: number;
  orbitSweepAmp: number;
  orbitSweepSpeed: number;
  continuousSpin: boolean;
  startRadius: number;
  endRadius: number;
  startElevation: number;
  endElevation: number;
  steerFrontWheelRad: number;
}

function buildFocusCameraPlan(
  item: RolledLootItem,
  modelId: CarModelId,
): FocusCameraPlan {
  const bp = getCarBlueprint(modelId);

  if (item.kind === 'wheel') {
    // Car arrives wide, then camera sweeps circularly around the flank and zooms straight onto the front-right wheel!
    return {
      target: new THREE.Vector3(bp.trackHalf + 0.04, bp.wheelRadius, -bp.wheelBaseHalf),
      startAzimuth: 2.38,
      endAzimuth: 1.62,
      orbitSweepAmp: 0.42,
      orbitSweepSpeed: 0.58,
      continuousSpin: false,
      startRadius: 5.5,
      endRadius: 1.48,
      startElevation: 0.25,
      endElevation: 0.14,
      steerFrontWheelRad: -0.26,
    };
  }

  if (item.kind === 'spoiler') {
    // Sweeps circularly from front-right 3/4 around the flank to rear-3/4 and zooms cleanly onto the rear wing
    return {
      target: new THREE.Vector3(0, bp.wingY + 0.06, bp.wingZ),
      startAzimuth: 2.35,
      endAzimuth: 0.54,
      orbitSweepAmp: 0.55,
      orbitSweepSpeed: 0.52,
      continuousSpin: false,
      startRadius: 5.4,
      endRadius: 2.25,
      startElevation: 0.24,
      endElevation: 0.28,
      steerFrontWheelRad: 0.12,
    };
  }

  if (item.kind === 'bodyKit') {
    // Low aggressive circular sweep around front splitter, wide fenders & side aero
    return {
      target: new THREE.Vector3(0, 0.52, -0.35),
      startAzimuth: 2.55,
      endAzimuth: 1.92,
      orbitSweepAmp: 0.72,
      orbitSweepSpeed: 0.46,
      continuousSpin: true,
      startRadius: 5.7,
      endRadius: 3.55,
      startElevation: 0.24,
      endElevation: 0.16,
      steerFrontWheelRad: -0.18,
    };
  }

  if (item.kind === 'livery') {
    // Elevated 360° circular orbit showcasing the full wrap across hood, roof & flanks
    return {
      target: new THREE.Vector3(0, 0.72, 0),
      startAzimuth: 2.38,
      endAzimuth: 1.85,
      orbitSweepAmp: 0,
      orbitSweepSpeed: 0.45,
      continuousSpin: true,
      startRadius: 5.8,
      endRadius: 4.3,
      startElevation: 0.26,
      endElevation: 0.42,
      steerFrontWheelRad: -0.12,
    };
  }

  // Full Car Unlock: iconic Rocket League hero showroom turntable 360° reveal!
  return {
    target: new THREE.Vector3(0, 0.68, 0),
    startAzimuth: 2.48,
    endAzimuth: 1.95,
    orbitSweepAmp: 0,
    orbitSweepSpeed: 0.42,
    continuousSpin: true,
    startRadius: 6.1,
    endRadius: 4.55,
    startElevation: 0.28,
    endElevation: 0.22,
    steerFrontWheelRad: -0.2,
  };
}

export const CrateCarShowcase3D: React.FC<CrateCarShowcase3DProps> = ({
  lootItem,
  baseCar,
  accentHex,
  secondaryHex,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Store latest props in refs so we can cleanly swap car / camera choreography without tearing down WebGL context
  const activePropsRef = useRef({ lootItem, baseCar, accentHex, secondaryHex });
  activePropsRef.current = { lootItem, baseCar, accentHex, secondaryHex };

  const rebuildCarFnRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    rebuildCarFnRef.current?.();
  }, [lootItem, baseCar, accentHex, secondaryHex]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.16;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2),
    );
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const initialW = Math.max(1, container.clientWidth);
    const initialH = Math.max(1, container.clientHeight);
    renderer.setSize(initialW, initialH);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070910);
    scene.fog = new THREE.FogExp2(0x070910, 0.038);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(42, initialW / initialH, 0.1, 100);

    // 3-point automotive studio lighting + rarity-tinted rim light
    const hemiLight = new THREE.HemisphereLight(0xa6c8ff, 0x151924, 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e2, 2.25);
    keyLight.position.set(5.5, 8.2, -5.0);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 24;
      keyLight.shadow.camera.left = -5.5;
      keyLight.shadow.camera.right = 5.5;
      keyLight.shadow.camera.top = 5.5;
      keyLight.shadow.camera.bottom = -5.5;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x88b4ff, 0.95);
    fillLight.position.set(-6.0, 4.2, 4.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(
      new THREE.Color(activePropsRef.current.accentHex),
      2.1,
    );
    rimLight.position.set(-3.2, 3.6, -6.5);
    scene.add(rimLight);

    const detailSpotLight = new THREE.PointLight(
      new THREE.Color(activePropsRef.current.secondaryHex),
      3.4,
      9,
      1.6,
    );
    detailSpotLight.position.set(2.4, 1.4, -2.0);
    scene.add(detailSpotLight);

    // Grounded Dark Motorsport Showroom Turntable & Horizon Floor
    const stageGeos: THREE.BufferGeometry[] = [];
    const stageMats: THREE.Material[] = [];

    const outerFloorGeo = new THREE.PlaneGeometry(90, 90);
    stageGeos.push(outerFloorGeo);
    const outerFloorMat = new THREE.MeshStandardMaterial({
      color: 0x090c14,
      roughness: 0.78,
      metalness: 0.22,
    });
    stageMats.push(outerFloorMat);
    const outerFloor = new THREE.Mesh(outerFloorGeo, outerFloorMat);
    outerFloor.rotation.x = -Math.PI / 2;
    outerFloor.position.y = -0.18;
    outerFloor.receiveShadow = !isSoftwareGl;
    scene.add(outerFloor);

    const plinthGeo = new THREE.CylinderGeometry(4.4, 4.75, 0.18, 64);
    stageGeos.push(plinthGeo);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x111521,
      roughness: 0.36,
      metalness: 0.42,
    });
    stageMats.push(plinthMat);
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = -0.09;
    plinth.receiveShadow = !isSoftwareGl;
    scene.add(plinth);

    const outerRingGeo = new THREE.RingGeometry(4.24, 4.38, 72);
    stageGeos.push(outerRingGeo);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(activePropsRef.current.accentHex),
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    stageMats.push(outerRingMat);
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.y = 0.008;
    scene.add(outerRing);

    const innerRingGeo = new THREE.RingGeometry(2.85, 2.89, 72);
    stageGeos.push(innerRingGeo);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(activePropsRef.current.secondaryHex),
      transparent: true,
      opacity: 0.36,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    stageMats.push(innerRingMat);
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.006;
    scene.add(innerRing);

    // Overhead Architectural Studio Light Bars (gives realistic sleek car roof reflections)
    const lightBarGeo = new THREE.BoxGeometry(5.6, 0.08, 0.36);
    stageGeos.push(lightBarGeo);
    const lightBarMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    stageMats.push(lightBarMat);
    const barLeft = new THREE.Mesh(lightBarGeo, lightBarMat);
    barLeft.position.set(-2.3, 4.8, 0);
    barLeft.rotation.y = Math.PI / 2;
    scene.add(barLeft);

    const barRight = new THREE.Mesh(lightBarGeo, lightBarMat);
    barRight.position.set(2.3, 4.8, 0);
    barRight.rotation.y = Math.PI / 2;
    scene.add(barRight);

    const contactShadowTex = createShowcaseContactShadow();
    let carRig: PlayerCarRig | null = null;

    // Choreography & Camera State
    let plan: FocusCameraPlan = buildFocusCameraPlan(
      activePropsRef.current.lootItem,
      activePropsRef.current.baseCar.modelId,
    );
    let showcaseElapsed = 0;
    let carRollZ = 3.4;
    let wheelSpinAngle = 0;

    let currentAzimuth = plan.startAzimuth;
    let currentElevation = plan.startElevation;
    let currentRadius = plan.startRadius;
    _camTarget.set(0, 0.72, 0);

    // Manual orbit drag override
    let userTookControl = false;
    let isDragging = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let manualAzimuth = plan.endAzimuth;
    let manualElevation = plan.endElevation;

    const rebuildShowcaseCar = () => {
      const { lootItem: item, baseCar: carCfg, accentHex: acc, secondaryHex: sec } =
        activePropsRef.current;

      if (carRig) {
        scene.remove(carRig.root);
        carRig.dispose();
        carRig = null;
      }

      const targetModelId: CarModelId =
        item.kind === 'car' && item.carId ? item.carId : carCfg.modelId;

      const baseWheel =
        item.kind === 'car'
          ? getDefaultWheelForCar(targetModelId)
          : { ...carCfg.wheelConfig };
      const wheelConfig: CarWheelConfig =
        item.kind === 'wheel' && item.wheelStyleId
          ? { ...baseWheel, style: item.wheelStyleId }
          : baseWheel;

      const baseCustom =
        item.kind === 'car'
          ? getDefaultCustomForCar()
          : { ...carCfg.customConfig };
      const customConfig: CarCustomConfig = {
        ...baseCustom,
        bodyKit:
          item.kind === 'bodyKit' && item.bodyKitId
            ? item.bodyKitId
            : baseCustom.bodyKit,
        spoiler:
          item.kind === 'spoiler' && item.spoilerId
            ? item.spoilerId
            : baseCustom.spoiler,
        livery:
          item.kind === 'livery' && item.liveryId
            ? item.liveryId
            : baseCustom.livery,
      };

      const paintHex = resolveColorHex(carCfg.colorId);

      carRig = createPlayerCar(
        targetModelId,
        paintHex,
        contactShadowTex,
        isSoftwareGl,
        carCfg.licensePlate || 'VİRAJ 34',
        wheelConfig,
        customConfig,
      );
      carRig.headLightSpots[0].intensity = 18;
      carRig.headLightSpots[1].intensity = 18;
      carRig.headLightMaterial.emissiveIntensity = 2.4;
      carRig.setHeadlightGlowScale(0.75);
      carRig.root.position.set(0, 0, 3.4);
      scene.add(carRig.root);

      // Update rarity accents
      rimLight.color.set(acc);
      detailSpotLight.color.set(sec);
      outerRingMat.color.set(acc);
      innerRingMat.color.set(sec);

      // Reset Rocket League entrance & circular zoom choreography
      plan = buildFocusCameraPlan(item, targetModelId);
      showcaseElapsed = 0;
      carRollZ = 3.4;
      userTookControl = false;
      currentAzimuth = plan.startAzimuth;
      currentElevation = plan.startElevation;
      currentRadius = plan.startRadius;
      manualAzimuth = plan.endAzimuth;
      manualElevation = plan.endElevation;
      _camTarget.set(0, 0.72, 0);
    };

    rebuildCarFnRef.current = rebuildShowcaseCar;
    rebuildShowcaseCar();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Pointer drag handlers for optional manual inspection
    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      userTookControl = true;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      manualAzimuth = currentAzimuth;
      manualElevation = currentElevation;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      manualAzimuth -= dx * 0.0085;
      manualElevation = THREE.MathUtils.clamp(
        manualElevation + dy * 0.0055,
        0.07,
        0.82,
      );
    };
    const onPointerUp = () => {
      isDragging = false;
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      if (!container) return;
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();

    const afterDraw = (cb: () => void) => {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.004, (now - lastTime) / 1000));
      lastTime = now;
      showcaseElapsed += dt;

      // 1. Car rolls smoothly into the spotlight onto the turntable (0s -> 1.05s)
      const prevZ = carRollZ;
      carRollZ = THREE.MathUtils.damp(carRollZ, 0, 4.4, dt);
      const rolledDelta = prevZ - carRollZ;

      if (carRig) {
        carRig.root.position.z = carRollZ;
        // Subtle braking suspension dip as car settles onto the turntable
        const brakePitch =
          carRollZ > 0.04 ? Math.min(0.032, carRollZ * 0.015) : 0;
        carRig.chassisGroup.rotation.x = THREE.MathUtils.damp(
          carRig.chassisGroup.rotation.x,
          brakePitch,
          6.5,
          dt,
        );

        // Turn front wheels slightly toward camera once arrived to showcase rims
        const desiredSteer =
          showcaseElapsed > 0.72 ? plan.steerFrontWheelRad : 0;
        carRig.frontLeftPivot.rotation.y = THREE.MathUtils.damp(
          carRig.frontLeftPivot.rotation.y,
          desiredSteer,
          3.8,
          dt,
        );
        carRig.frontRightPivot.rotation.y = THREE.MathUtils.damp(
          carRig.frontRightPivot.rotation.y,
          desiredSteer,
          3.8,
          dt,
        );

        // Spin wheels as car rolls in, then keep a smooth showroom wheel spin when wheel item is spotlighted!
        const showcaseSpin =
          activePropsRef.current.lootItem.kind === 'wheel' ? dt * 1.45 : 0;
        wheelSpinAngle -= rolledDelta * 2.8 + showcaseSpin;
        for (const wg of carRig.wheelSpinGroups) {
          wg.rotation.x = wheelSpinAngle;
        }

        carRig.updateEffects(showcaseElapsed, 12, 0);
      }

      // 2. Choreographed Rocket League Camera:
      // Stage A (0.0s - 0.95s): Establishing wide view as the car rolls onto screen
      // Stage B (0.95s+): Smooth circular orbit + dramatic zoom-in straight onto the dropped part!
      const zoomPhaseT = THREE.MathUtils.clamp(
        (showcaseElapsed - 0.92) / 1.75,
        0,
        1,
      );
      const zoomEase =
        zoomPhaseT * zoomPhaseT * (3 - 2 * zoomPhaseT);

      _desiredTarget
        .set(0, 0.72, carRollZ * 0.45)
        .lerp(plan.target, zoomEase);
      _camTarget.x = THREE.MathUtils.damp(_camTarget.x, _desiredTarget.x, 4.6, dt);
      _camTarget.y = THREE.MathUtils.damp(_camTarget.y, _desiredTarget.y, 4.6, dt);
      _camTarget.z = THREE.MathUtils.damp(_camTarget.z, _desiredTarget.z, 4.6, dt);

      if (userTookControl) {
        currentAzimuth = THREE.MathUtils.damp(currentAzimuth, manualAzimuth, 8.5, dt);
        currentElevation = THREE.MathUtils.damp(
          currentElevation,
          manualElevation,
          8.5,
          dt,
        );
        currentRadius = THREE.MathUtils.damp(
          currentRadius,
          plan.endRadius,
          3.4,
          dt,
        );
      } else {
        const postArriveTime = Math.max(0, showcaseElapsed - 2.35);
        let targetAzimuth = THREE.MathUtils.lerp(
          plan.startAzimuth,
          plan.endAzimuth,
          zoomEase,
        );
        if (plan.continuousSpin) {
          targetAzimuth -= postArriveTime * plan.orbitSweepSpeed;
        } else if (postArriveTime > 0) {
          targetAzimuth +=
            Math.sin(postArriveTime * plan.orbitSweepSpeed) * plan.orbitSweepAmp;
        }

        const targetRadius = THREE.MathUtils.lerp(
          plan.startRadius,
          plan.endRadius,
          zoomEase,
        );
        const targetElevation = THREE.MathUtils.lerp(
          plan.startElevation,
          plan.endElevation,
          zoomEase,
        );

        currentAzimuth = THREE.MathUtils.damp(currentAzimuth, targetAzimuth, 3.6, dt);
        currentRadius = THREE.MathUtils.damp(currentRadius, targetRadius, 3.4, dt);
        currentElevation = THREE.MathUtils.damp(
          currentElevation,
          targetElevation,
          3.6,
          dt,
        );
      }

      const cosElev = Math.cos(currentElevation);
      _camPos.set(
        _camTarget.x + Math.sin(currentAzimuth) * cosElev * currentRadius,
        Math.max(0.28, _camTarget.y + Math.sin(currentElevation) * currentRadius),
        _camTarget.z + Math.cos(currentAzimuth) * cosElev * currentRadius,
      );

      camera.position.copy(_camPos);
      camera.lookAt(_camTarget);

      // Position detail accent light gently offset from camera so focused rim/spoiler gleams
      detailSpotLight.position.set(
        _camTarget.x + Math.sin(currentAzimuth + 0.5) * 2.2,
        _camTarget.y + 1.15,
        _camTarget.z + Math.cos(currentAzimuth + 0.5) * 2.2,
      );

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      rebuildCarFnRef.current = null;
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);

      if (carRig) {
        scene.remove(carRig.root);
        carRig.dispose();
        carRig = null;
      }
      stageGeos.forEach((g) => g.dispose());
      stageMats.forEach((m) => m.dispose());
      contactShadowTex.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="h-full w-full cursor-grab active:cursor-grabbing"
    />
  );
};
