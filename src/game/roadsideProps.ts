import * as THREE from 'three';
import { createBiomeSample, sampleBiomeAtDistance } from './biomes';
import { ProceduralTextureSet } from './textures';

export interface RoadsideSampleLike {
  index: number;
  s: number;
  pos: THREE.Vector3;
  heading: number;
  curvature: number;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  normal: THREE.Vector3;
}

export interface RoadsideChunkSlot {
  bollardBodies: THREE.InstancedMesh;
  bollardBands: THREE.InstancedMesh;
  cypresses: THREE.InstancedMesh;
  shrubs: THREE.InstancedMesh;
}

export interface RoadsidePlacementContext {
  extrasGroup: THREE.Group;
  slot: RoadsideChunkSlot;
  startIndex: number;
  count: number;
  guardrailOffset: number;
  getSample: (globalIndex: number) => RoadsideSampleLike;
  computeEmbankmentHeight: (
    s: number,
    side: number,
    distFromCenter: number,
  ) => number;
  hasRoadClearance: (worldP: THREE.Vector3, minDist: number) => boolean;
}

function hashInt(n: number, salt: number): number {
  let h = (n * 374761393 + salt * 668265263) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

const _propDummy = new THREE.Object3D();
const _propBasisMat = new THREE.Matrix4();
const _propNegTangent = new THREE.Vector3();
const _propWorldP = new THREE.Vector3();
const _propBiome = createBiomeSample();
const _propBandOffset = new THREE.Matrix4().makeTranslation(0, 0.24, 0);
const _propMatM = new THREE.Matrix4();
const _propTmpColor = new THREE.Color();
const _propWhite = new THREE.Color(0xffffff);

const MAX_CHUNK_BOLLARDS = 16;
const MAX_CHUNK_CYPRESSES = 24;
const MAX_CHUNK_SHRUBS = 24;

export class RoadsidePropsSystem {
  private readonly textures: ProceduralTextureSet;
  private readonly activeRotors: Set<THREE.Group> = new Set();

  // Shared materials
  private readonly steelMat: THREE.MeshStandardMaterial;
  private readonly darkFrameMat: THREE.MeshStandardMaterial;
  private readonly gantrySignMats: THREE.MeshStandardMaterial[];
  private readonly trafficSignMats: THREE.MeshStandardMaterial[];
  private readonly billboardFaceMats: THREE.MeshStandardMaterial[];
  private readonly billboardLampMat: THREE.MeshStandardMaterial;
  private readonly bollardBodyMat: THREE.MeshStandardMaterial;
  private readonly bollardBandMat: THREE.MeshStandardMaterial;
  private readonly sosBodyMat: THREE.MeshStandardMaterial;
  private readonly sosSignMat: THREE.MeshStandardMaterial;
  private readonly kmSignMat: THREE.MeshStandardMaterial;
  private readonly cypressMat: THREE.MeshStandardMaterial;
  private readonly shrubMat: THREE.MeshStandardMaterial;
  private readonly cabinWallMat: THREE.MeshStandardMaterial;
  private readonly cabinRoofMat: THREE.MeshStandardMaterial;
  private readonly cabinWindowMat: THREE.MeshStandardMaterial;
  private readonly turbineMat: THREE.MeshStandardMaterial;

  // Shared geometries
  private readonly signPostGeo: THREE.CylinderGeometry;
  private readonly signBackGeo: THREE.BoxGeometry;
  private readonly signFaceGeo: THREE.PlaneGeometry;
  private readonly kmPostGeo: THREE.BoxGeometry;
  private readonly kmFaceGeo: THREE.PlaneGeometry;
  private readonly bollardBodyGeo: THREE.CylinderGeometry;
  private readonly bollardBandGeo: THREE.CylinderGeometry;
  private readonly bbPoleGeo: THREE.CylinderGeometry;
  private readonly bbFrameGeo: THREE.BoxGeometry;
  private readonly bbFaceGeo: THREE.PlaneGeometry;
  private readonly bbLampBarGeo: THREE.BoxGeometry;
  private readonly gantryFaceGeo: THREE.PlaneGeometry;
  private readonly sosBoxGeo: THREE.BoxGeometry;
  private readonly sosFaceGeo: THREE.PlaneGeometry;
  private readonly sosBeaconGeo: THREE.SphereGeometry;
  private readonly cypressConeGeo: THREE.ConeGeometry;
  private readonly shrubGeo: THREE.DodecahedronGeometry;
  private readonly cabinBaseGeo: THREE.BoxGeometry;
  private readonly cabinRoofGeo: THREE.ConeGeometry;
  private readonly cabinWindowGeo: THREE.PlaneGeometry;
  private readonly turbineTowerGeo: THREE.CylinderGeometry;
  private readonly turbineNacelleGeo: THREE.BoxGeometry;
  private readonly turbineBladeGeo: THREE.BoxGeometry;

  constructor(textures: ProceduralTextureSet) {
    this.textures = textures;

    this.steelMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.5,
      metalness: 0.62,
    });

    this.darkFrameMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.55,
      metalness: 0.45,
    });

    this.gantrySignMats = textures.gantrySignMaps.map(
      (map) =>
        new THREE.MeshStandardMaterial({
          map,
          emissiveMap: map,
          emissive: new THREE.Color(0xffffff),
          emissiveIntensity: 0.22,
          roughness: 0.42,
          metalness: 0.1,
        }),
    );

    this.trafficSignMats = textures.trafficSignMaps.map(
      (map) =>
        new THREE.MeshStandardMaterial({
          map,
          emissiveMap: map,
          emissive: new THREE.Color(0xffffff),
          emissiveIntensity: 0.16,
          roughness: 0.36,
          metalness: 0.12,
        }),
    );

    this.billboardFaceMats = textures.billboardPairs.map(
      ({ map, emissiveMap }) =>
        new THREE.MeshStandardMaterial({
          map,
          emissiveMap,
          emissive: new THREE.Color(0xffffff),
          emissiveIntensity: 0.45,
          roughness: 0.45,
          metalness: 0.08,
        }),
    );

    this.billboardLampMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      emissive: 0xfde68a,
      emissiveIntensity: 0.35,
      roughness: 0.25,
    });

    this.bollardBodyMat = new THREE.MeshStandardMaterial({
      color: 0xea580c,
      roughness: 0.55,
      metalness: 0.1,
    });

    this.bollardBandMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0xfef08a,
      emissiveIntensity: 0.55,
      roughness: 0.3,
    });

    this.sosBodyMat = new THREE.MeshStandardMaterial({
      color: 0xea580c,
      roughness: 0.48,
      metalness: 0.2,
    });

    this.sosSignMat = new THREE.MeshStandardMaterial({
      map: textures.sosSignMap,
      emissiveMap: textures.sosSignMap,
      emissive: new THREE.Color(0xffedd5),
      emissiveIntensity: 0.3,
      roughness: 0.4,
    });

    this.kmSignMat = new THREE.MeshStandardMaterial({
      map: textures.kmSignMap,
      emissiveMap: textures.kmSignMap,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.18,
      roughness: 0.42,
    });

    this.cypressMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      flatShading: true,
    });

    this.shrubMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.92,
      flatShading: true,
    });

    this.cabinWallMat = new THREE.MeshStandardMaterial({
      color: 0xd6d3d1,
      roughness: 0.85,
    });

    this.cabinRoofMat = new THREE.MeshStandardMaterial({
      color: 0x9a3412,
      roughness: 0.78,
      flatShading: true,
    });

    this.cabinWindowMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.35,
      roughness: 0.25,
    });

    this.turbineMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.42,
      metalness: 0.22,
    });

    // Shared Geometries
    this.signPostGeo = new THREE.CylinderGeometry(0.055, 0.065, 3.3, 8);
    this.signBackGeo = new THREE.BoxGeometry(1.45, 1.45, 0.07);
    this.signFaceGeo = new THREE.PlaneGeometry(1.38, 1.38);

    this.kmPostGeo = new THREE.BoxGeometry(0.12, 1.15, 0.08);
    this.kmFaceGeo = new THREE.PlaneGeometry(0.62, 0.62);

    this.bollardBodyGeo = new THREE.CylinderGeometry(0.085, 0.105, 0.85, 8);
    this.bollardBandGeo = new THREE.CylinderGeometry(0.092, 0.092, 0.16, 8);

    this.bbPoleGeo = new THREE.CylinderGeometry(0.18, 0.22, 6.2, 8);
    this.bbFrameGeo = new THREE.BoxGeometry(8.6, 4.4, 0.26);
    this.bbFaceGeo = new THREE.PlaneGeometry(8.2, 4.1);
    this.bbLampBarGeo = new THREE.BoxGeometry(6.8, 0.14, 0.32);

    this.gantryFaceGeo = new THREE.PlaneGeometry(5.4, 1.56);

    this.sosBoxGeo = new THREE.BoxGeometry(0.56, 1.85, 0.48);
    this.sosFaceGeo = new THREE.PlaneGeometry(0.46, 0.46);
    this.sosBeaconGeo = new THREE.SphereGeometry(0.11, 8, 8);

    this.cypressConeGeo = new THREE.ConeGeometry(0.85, 7.6, 7);
    this.shrubGeo = new THREE.DodecahedronGeometry(0.95, 0);

    this.cabinBaseGeo = new THREE.BoxGeometry(4.8, 2.7, 3.6);
    this.cabinRoofGeo = new THREE.ConeGeometry(3.8, 1.7, 4);
    this.cabinWindowGeo = new THREE.PlaneGeometry(1.3, 0.85);

    this.turbineTowerGeo = new THREE.CylinderGeometry(0.28, 0.56, 22, 10);
    this.turbineNacelleGeo = new THREE.BoxGeometry(1.1, 1.1, 2.6);
    this.turbineBladeGeo = new THREE.BoxGeometry(0.38, 7.8, 0.08);
  }

  public getGantryFaceMaterial(ordinal: number): THREE.MeshStandardMaterial {
    return this.gantrySignMats[
      Math.abs(ordinal) % this.gantrySignMats.length
    ];
  }

  public getGantryFaceGeometry(): THREE.PlaneGeometry {
    return this.gantryFaceGeo;
  }

  public setLampIntensity(factor: number): void {
    const f = THREE.MathUtils.clamp(factor, 0, 1);
    for (const mat of this.gantrySignMats) {
      mat.emissiveIntensity = THREE.MathUtils.lerp(0.16, 0.72, f);
    }
    for (const mat of this.trafficSignMats) {
      mat.emissiveIntensity = THREE.MathUtils.lerp(0.1, 0.48, f);
    }
    for (const mat of this.billboardFaceMats) {
      mat.emissiveIntensity = THREE.MathUtils.lerp(0.25, 1.25, f);
    }
    this.billboardLampMat.emissiveIntensity = THREE.MathUtils.lerp(0.1, 2.1, f);
    this.bollardBandMat.emissiveIntensity = THREE.MathUtils.lerp(0.3, 1.3, f);
    this.sosSignMat.emissiveIntensity = THREE.MathUtils.lerp(0.2, 0.9, f);
    this.kmSignMat.emissiveIntensity = THREE.MathUtils.lerp(0.1, 0.42, f);
    this.cabinWindowMat.emissiveIntensity = THREE.MathUtils.lerp(0.15, 1.8, f);
  }

  public update(dt: number): void {
    if (this.activeRotors.size === 0) return;
    const step = Math.min(0.05, Math.max(0, dt)) * 1.15;
    for (const rotor of this.activeRotors) {
      rotor.rotation.z -= step;
    }
  }

  public unregisterChunkRotors(chunkGroup: THREE.Group): void {
    chunkGroup.traverse((obj) => {
      if (obj instanceof THREE.Group && obj.userData.isTurbineRotor) {
        this.activeRotors.delete(obj);
      }
    });
  }

  public resetRotors(): void {
    this.activeRotors.clear();
  }

  public createChunkSlot(parentGroup: THREE.Group): RoadsideChunkSlot {
    const bollardBodies = new THREE.InstancedMesh(
      this.bollardBodyGeo,
      this.bollardBodyMat,
      MAX_CHUNK_BOLLARDS,
    );
    bollardBodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    bollardBodies.count = 0;
    bollardBodies.visible = false;
    bollardBodies.matrixAutoUpdate = false;

    const bollardBands = new THREE.InstancedMesh(
      this.bollardBandGeo,
      this.bollardBandMat,
      MAX_CHUNK_BOLLARDS,
    );
    bollardBands.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    bollardBands.count = 0;
    bollardBands.visible = false;
    bollardBands.matrixAutoUpdate = false;

    const cypresses = new THREE.InstancedMesh(
      this.cypressConeGeo,
      this.cypressMat,
      MAX_CHUNK_CYPRESSES,
    );
    cypresses.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    cypresses.setColorAt(0, _propWhite);
    if (cypresses.instanceColor) {
      cypresses.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }
    cypresses.count = 0;
    cypresses.visible = false;
    cypresses.castShadow = true;
    cypresses.matrixAutoUpdate = false;

    const shrubs = new THREE.InstancedMesh(
      this.shrubGeo,
      this.shrubMat,
      MAX_CHUNK_SHRUBS,
    );
    shrubs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    shrubs.setColorAt(0, _propWhite);
    if (shrubs.instanceColor) {
      shrubs.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }
    shrubs.count = 0;
    shrubs.visible = false;
    shrubs.matrixAutoUpdate = false;

    parentGroup.add(bollardBodies, bollardBands, cypresses, shrubs);
    return { bollardBodies, bollardBands, cypresses, shrubs };
  }

  public clearChunkSlot(slot: RoadsideChunkSlot): void {
    slot.bollardBodies.count = 0;
    slot.bollardBodies.visible = false;
    slot.bollardBands.count = 0;
    slot.bollardBands.visible = false;
    slot.cypresses.count = 0;
    slot.cypresses.visible = false;
    slot.shrubs.count = 0;
    slot.shrubs.visible = false;
  }

  public disposeChunkSlot(slot: RoadsideChunkSlot): void {
    slot.bollardBodies.dispose();
    slot.bollardBands.dispose();
    slot.cypresses.dispose();
    slot.shrubs.dispose();
  }

  public populateChunk(ctx: RoadsidePlacementContext): void {
    const {
      extrasGroup,
      slot,
      startIndex,
      count,
      guardrailOffset,
      getSample,
      computeEmbankmentHeight,
      hasRoadClearance,
    } = ctx;

    let bollardCount = 0;
    let cypressCount = 0;
    let shrubCount = 0;

    const dummy = _propDummy;
    const basisMat = _propBasisMat;
    const negTangent = _propNegTangent;

    let placedTrafficSignInChunk = false;
    let placedBillboardInChunk = false;
    let placedLandmarkInChunk = false;

    for (let i = 0; i < count - 1; i++) {
      const sample = getSample(startIndex + i);
      const idx = sample.index;
      const absCurv = Math.abs(sample.curvature);

      // 1. Reflective Shoulder Bollards (Pooled InstancedMesh, zero allocations)
      if (idx % 4 === 0) {
        negTangent.copy(sample.tangent).negate();
        basisMat.makeBasis(sample.right, sample.normal, negTangent);

        for (const side of [-1, 1]) {
          // Denser along curve outsides or every 16m on straights
          const isOuter = sample.curvature * side < -0.005;
          if (!isOuter && idx % 8 !== 0) continue;
          if (bollardCount >= MAX_CHUNK_BOLLARDS) continue;

          dummy.position
            .copy(sample.pos)
            .addScaledVector(sample.right, side * (guardrailOffset + 0.34))
            .addScaledVector(sample.normal, 0.42);
          dummy.quaternion.setFromRotationMatrix(basisMat);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          slot.bollardBodies.setMatrixAt(bollardCount, dummy.matrix);
          _propMatM.multiplyMatrices(dummy.matrix, _propBandOffset);
          slot.bollardBands.setMatrixAt(bollardCount, _propMatM);
          bollardCount++;
        }
      }

      // 2. Dynamic Traffic Signs (Curve Warning / Speed Limit / Radar / Service Area)
      if (!placedTrafficSignInChunk && idx > 8) {
        const prevSample = getSample(Math.max(startIndex, startIndex + i - 3));
        const enteringSharpCurve =
          absCurv > 0.011 && Math.abs(prevSample.curvature) <= 0.011;

        if (enteringSharpCurve || (i === 5 && hashInt(idx, 11) > 0.42)) {
          const signKind = enteringSharpCurve
            ? 1 // Sharp curve warning
            : Math.floor(hashInt(idx, 23) * this.trafficSignMats.length);
          const side = enteringSharpCurve ? 1 : hashInt(idx, 31) > 0.25 ? 1 : -1;

          const signGroup = new THREE.Group();
          signGroup.position
            .copy(sample.pos)
            .addScaledVector(sample.right, side * (guardrailOffset + 0.95));
          signGroup.rotation.y = -sample.heading - side * 0.22;

          const post = new THREE.Mesh(this.signPostGeo, this.steelMat);
          post.position.y = 1.65;
          post.castShadow = true;

          const backing = new THREE.Mesh(this.signBackGeo, this.darkFrameMat);
          backing.position.y = 3.1;
          backing.castShadow = true;

          const face = new THREE.Mesh(
            this.signFaceGeo,
            this.trafficSignMats[signKind],
          );
          face.position.set(0, 3.1, 0.042);

          signGroup.add(post, backing, face);
          extrasGroup.add(signGroup);
          placedTrafficSignInChunk = true;
        }
      }

      // 3. Kilometre Marker Posts & Turkish SOS Emergency Pillars
      if (i === 13 && idx > 12) {
        if (idx % 60 < 20) {
          // SOS Emergency Call Pillar on right shoulder
          const sosGroup = new THREE.Group();
          sosGroup.position
            .copy(sample.pos)
            .addScaledVector(sample.right, guardrailOffset + 0.85);
          sosGroup.rotation.y = -sample.heading - 0.18;

          const box = new THREE.Mesh(this.sosBoxGeo, this.sosBodyMat);
          box.position.y = 0.92;
          box.castShadow = true;

          const face = new THREE.Mesh(this.sosFaceGeo, this.sosSignMat);
          face.position.set(0, 1.32, 0.25);

          const beacon = new THREE.Mesh(
            this.sosBeaconGeo,
            this.billboardLampMat,
          );
          beacon.position.set(0, 1.92, 0);

          sosGroup.add(box, face, beacon);
          extrasGroup.add(sosGroup);
        } else {
          // Green O-4 KM Marker Post
          const kmGroup = new THREE.Group();
          kmGroup.position
            .copy(sample.pos)
            .addScaledVector(sample.right, guardrailOffset + 0.72);
          kmGroup.rotation.y = -sample.heading - 0.15;

          const post = new THREE.Mesh(this.kmPostGeo, this.steelMat);
          post.position.y = 0.58;

          const face = new THREE.Mesh(this.kmFaceGeo, this.kmSignMat);
          face.position.set(0, 1.05, 0.045);

          kmGroup.add(post, face);
          extrasGroup.add(kmGroup);
        }
      }

      // 4. Illuminated Roadside Billboards (every ~2 chunks on straight/gentle sections)
      if (!placedBillboardInChunk && i === 10 && idx > 16 && absCurv < 0.013) {
        const chunkOrd = Math.round(startIndex / (count - 1));
        if (chunkOrd % 2 === 1) {
          const side = chunkOrd % 4 === 1 ? 1 : -1;
          let distOut = 14.8 + hashInt(idx, 41) * 3.0;
          const isInsideCurve = sample.curvature * side > 0.0005;
          let allowed = true;
          if (isInsideCurve) {
            const maxInside = (1 / Math.abs(sample.curvature)) * 0.4;
            if (maxInside < 14.2) allowed = false;
            distOut = Math.min(distOut, maxInside);
          }

          if (allowed) {
            const elev = computeEmbankmentHeight(sample.s, side, distOut);
            const worldP = _propWorldP
              .copy(sample.pos)
              .addScaledVector(sample.right, side * distOut);
            worldP.y = sample.pos.y + elev;

            if (hasRoadClearance(worldP, 13.4)) {
              const bbIdx =
                Math.floor(hashInt(chunkOrd, 53) * this.billboardFaceMats.length) %
                this.billboardFaceMats.length;
              const bbGroup = new THREE.Group();
              bbGroup.position.copy(worldP);
              bbGroup.rotation.y = -sample.heading - side * 0.28;

              for (const px of [-2.4, 2.4]) {
                const pole = new THREE.Mesh(this.bbPoleGeo, this.steelMat);
                pole.position.set(px, 3.1, 0);
                pole.castShadow = true;
                bbGroup.add(pole);
              }

              const frame = new THREE.Mesh(
                this.bbFrameGeo,
                this.darkFrameMat,
              );
              frame.position.set(0, 6.2, 0);
              frame.castShadow = true;

              const face = new THREE.Mesh(
                this.bbFaceGeo,
                this.billboardFaceMats[bbIdx],
              );
              face.position.set(0, 6.2, 0.14);

              const lampBar = new THREE.Mesh(
                this.bbLampBarGeo,
                this.billboardLampMat,
              );
              lampBar.position.set(0, 8.55, 0.25);

              bbGroup.add(frame, face, lampBar);
              extrasGroup.add(bbGroup);
              placedBillboardInChunk = true;
            }
          }
        }
      }

      // 5. Local Roadside Landmarks: Rest Cabin OR Distant Ridge Wind Turbine
      if (!placedLandmarkInChunk && i === 15 && idx > 20) {
        const chunkOrd = Math.round(startIndex / (count - 1));
        const h = hashInt(chunkOrd, 67);
        const side = chunkOrd % 2 === 0 ? -1 : 1;

        if (h > 0.62 && absCurv < 0.01) {
          // Distant Ridge Wind Turbine
          let distOut = 32 + hashInt(idx, 71) * 14;
          const isInsideCurve = sample.curvature * side > 0.0005;
          let allowed = !isInsideCurve;
          if (allowed) {
            const elev = computeEmbankmentHeight(sample.s, side, distOut);
            const worldP = _propWorldP
              .copy(sample.pos)
              .addScaledVector(sample.right, side * distOut);
            worldP.y = sample.pos.y + elev;

            if (hasRoadClearance(worldP, 22)) {
              const turbine = new THREE.Group();
              turbine.position.copy(worldP);
              turbine.rotation.y = -sample.heading - side * 0.35;

              const tower = new THREE.Mesh(
                this.turbineTowerGeo,
                this.turbineMat,
              );
              tower.position.y = 11;
              tower.castShadow = true;

              const nacelle = new THREE.Mesh(
                this.turbineNacelleGeo,
                this.turbineMat,
              );
              nacelle.position.set(0, 22, 0);

              const rotor = new THREE.Group();
              rotor.position.set(0, 22, 1.38);
              rotor.rotation.z = hashInt(idx, 79) * Math.PI * 2;
              rotor.userData.isTurbineRotor = true;

              for (let b = 0; b < 3; b++) {
                const bladePivot = new THREE.Group();
                bladePivot.rotation.z = (b * Math.PI * 2) / 3;
                const blade = new THREE.Mesh(
                  this.turbineBladeGeo,
                  this.turbineMat,
                );
                blade.position.y = 3.9;
                bladePivot.add(blade);
                rotor.add(bladePivot);
              }

              this.activeRotors.add(rotor);
              turbine.add(tower, nacelle, rotor);
              extrasGroup.add(turbine);
              placedLandmarkInChunk = true;
            }
          }
        } else if (h < 0.24 && absCurv < 0.009) {
          // Roadside Highway Service / Observation Cabin
          const distOut = 20 + hashInt(idx, 83) * 5;
          const isInsideCurve = sample.curvature * side > 0.0005;
          if (!isInsideCurve) {
            const elev = computeEmbankmentHeight(sample.s, side, distOut);
            const worldP = _propWorldP
              .copy(sample.pos)
              .addScaledVector(sample.right, side * distOut);
            worldP.y = sample.pos.y + elev;

            if (hasRoadClearance(worldP, 16.5)) {
              const cabin = new THREE.Group();
              cabin.position.copy(worldP);
              cabin.rotation.y = -sample.heading - side * 0.45;

              const base = new THREE.Mesh(this.cabinBaseGeo, this.cabinWallMat);
              base.position.y = 1.35;
              base.castShadow = true;

              const roof = new THREE.Mesh(this.cabinRoofGeo, this.cabinRoofMat);
              roof.position.y = 3.55;
              roof.rotation.y = Math.PI / 4;
              roof.castShadow = true;

              const win = new THREE.Mesh(
                this.cabinWindowGeo,
                this.cabinWindowMat,
              );
              win.position.set(0, 1.55, 1.82);

              cabin.add(base, roof, win);
              extrasGroup.add(cabin);
              placedLandmarkInChunk = true;
            }
          }
        }
      }

      // 6. Biome-aware Cypresses / Yuccas & Roadside Shrubs (Pooled InstancedMesh, zero allocations)
      if (i % 2 === 1) {
        const biome = sampleBiomeAtDistance(sample.s, _propBiome);
        for (const side of [-1, 1]) {
          const r = hashInt(idx + i * 7, side > 0 ? 97 : 103);
          let distOut = 11.4 + r * 22;

          const isInsideCurve = sample.curvature * side > 0.0005;
          if (isInsideCurve) {
            const maxInsideDist = (1 / Math.abs(sample.curvature)) * 0.42;
            if (maxInsideDist < 12.2) continue;
            distOut = Math.min(distOut, maxInsideDist);
          }

          const elev = computeEmbankmentHeight(sample.s, side, distOut);
          const worldP = _propWorldP
            .copy(sample.pos)
            .addScaledVector(sample.right, side * distOut);
          worldP.y = sample.pos.y + elev;

          if (!hasRoadClearance(worldP, 11.4)) continue;

          if (
            r > 0.68 &&
            hashInt(idx, side > 0 ? 111 : 119) < biome.cypressPresence
          ) {
            if (cypressCount >= MAX_CHUNK_CYPRESSES) continue;
            // Tall slender Cypress / Frosted Spire / Desert Yucca
            const scale = 0.8 + hashInt(idx, 113) * 0.55;
            dummy.position.set(worldP.x, worldP.y + 3.6 * scale, worldP.z);
            dummy.rotation.set(0, r * Math.PI * 2, 0);
            dummy.scale.set(scale * 0.85, scale, scale * 0.85);
            dummy.updateMatrix();
            slot.cypresses.setMatrixAt(cypressCount, dummy.matrix);
            _propTmpColor
              .copy(biome.cypressColorA)
              .lerp(biome.cypressColorB, hashInt(idx, 127));
            slot.cypresses.setColorAt(cypressCount, _propTmpColor);
            cypressCount++;
          } else if (distOut < 19) {
            if (shrubCount >= MAX_CHUNK_SHRUBS) continue;
            // Low roadside shrub / desert scrub / snow drift / volcanic ash mound
            const scale = 0.65 + hashInt(idx, 131) * 0.65;
            dummy.position.set(worldP.x, worldP.y + 0.45 * scale, worldP.z);
            dummy.rotation.set(r * 1.2, r * 3.1, 0);
            dummy.scale.set(scale * 1.35, scale * 0.78, scale * 1.15);
            dummy.updateMatrix();
            slot.shrubs.setMatrixAt(shrubCount, dummy.matrix);
            _propTmpColor
              .copy(biome.shrubColorA)
              .lerp(biome.shrubColorB, hashInt(idx, 139));
            slot.shrubs.setColorAt(shrubCount, _propTmpColor);
            shrubCount++;
          }
        }
      }
    }

    // Finalize pooled InstancedMeshes (in-place GPU upload, zero buffer allocations)
    slot.bollardBodies.count = bollardCount;
    slot.bollardBodies.visible = bollardCount > 0;
    slot.bollardBands.count = bollardCount;
    slot.bollardBands.visible = bollardCount > 0;
    if (bollardCount > 0) {
      slot.bollardBodies.instanceMatrix.needsUpdate = true;
      slot.bollardBands.instanceMatrix.needsUpdate = true;
      slot.bollardBodies.computeBoundingSphere();
      slot.bollardBands.computeBoundingSphere();
    }

    slot.cypresses.count = cypressCount;
    slot.cypresses.visible = cypressCount > 0;
    if (cypressCount > 0) {
      slot.cypresses.instanceMatrix.needsUpdate = true;
      if (slot.cypresses.instanceColor) {
        slot.cypresses.instanceColor.needsUpdate = true;
      }
      slot.cypresses.computeBoundingSphere();
    }

    slot.shrubs.count = shrubCount;
    slot.shrubs.visible = shrubCount > 0;
    if (shrubCount > 0) {
      slot.shrubs.instanceMatrix.needsUpdate = true;
      if (slot.shrubs.instanceColor) {
        slot.shrubs.instanceColor.needsUpdate = true;
      }
      slot.shrubs.computeBoundingSphere();
    }
  }

  public dispose(): void {
    this.activeRotors.clear();
    this.steelMat.dispose();
    this.darkFrameMat.dispose();
    this.gantrySignMats.forEach((m) => m.dispose());
    this.trafficSignMats.forEach((m) => m.dispose());
    this.billboardFaceMats.forEach((m) => m.dispose());
    this.billboardLampMat.dispose();
    this.bollardBodyMat.dispose();
    this.bollardBandMat.dispose();
    this.sosBodyMat.dispose();
    this.sosSignMat.dispose();
    this.kmSignMat.dispose();
    this.cypressMat.dispose();
    this.shrubMat.dispose();
    this.cabinWallMat.dispose();
    this.cabinRoofMat.dispose();
    this.cabinWindowMat.dispose();
    this.turbineMat.dispose();

    this.signPostGeo.dispose();
    this.signBackGeo.dispose();
    this.signFaceGeo.dispose();
    this.kmPostGeo.dispose();
    this.kmFaceGeo.dispose();
    this.bollardBodyGeo.dispose();
    this.bollardBandGeo.dispose();
    this.bbPoleGeo.dispose();
    this.bbFrameGeo.dispose();
    this.bbFaceGeo.dispose();
    this.bbLampBarGeo.dispose();
    this.gantryFaceGeo.dispose();
    this.sosBoxGeo.dispose();
    this.sosFaceGeo.dispose();
    this.sosBeaconGeo.dispose();
    this.cypressConeGeo.dispose();
    this.shrubGeo.dispose();
    this.cabinBaseGeo.dispose();
    this.cabinRoofGeo.dispose();
    this.cabinWindowGeo.dispose();
    this.turbineTowerGeo.dispose();
    this.turbineNacelleGeo.dispose();
    this.turbineBladeGeo.dispose();
  }
}
