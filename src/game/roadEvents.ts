import * as THREE from 'three';
import { RoadEventKind, UpcomingRoadEvent } from '../types/game';
import { EvaluatedRoadPoint, LANE_CENTERS, RoadSystem } from './roadSystem';

export interface ActiveRoadEvent {
  id: number;
  kind: RoadEventKind;
  s: number;
  laneIndex: number;
  lateral: number;
  triggered: boolean;
  passed: boolean;
  group: THREE.Group;
}

export interface RoadEventHitResult {
  kind: RoadEventKind;
  eventId: number;
  clearedAirborne?: boolean;
}

const LANE_LABELS = ['Sol Şerit', 'Orta Şerit', 'Sağ Şerit'] as const;

const EVENT_LABELS: Record<RoadEventKind, string> = {
  roadwork: 'Yol Çalışması',
  ramp: 'Zıplama Rampası',
  slick: 'Kaygan Zemin',
  boostpad: 'Turbo Şeridi',
};

const _evSample: EvaluatedRoadPoint = {
  s: 0,
  pos: new THREE.Vector3(),
  tangent: new THREE.Vector3(),
  right: new THREE.Vector3(),
  normal: new THREE.Vector3(),
  heading: 0,
  curvature: 0,
  bank: 0,
};
const _evNegTangent = new THREE.Vector3();
const _evBasis = new THREE.Matrix4();
const _evQuat = new THREE.Quaternion();

function createHazardStripeTexture(
  stripeA: string,
  stripeB: string,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = stripeA;
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = stripeB;
    for (let x = -128; x < 384; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 24, 0);
      ctx.lineTo(x - 16, 128);
      ctx.lineTo(x - 40, 128);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 252, 124);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createChevronPadTexture(
  bg: string,
  chevronColor: string,
  glowColor: string,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 512);

    // Side rails
    ctx.fillStyle = glowColor;
    ctx.fillRect(6, 0, 12, 512);
    ctx.fillRect(238, 0, 12, 512);

    // Forward-pointing chevrons
    for (let y = 36; y < 490; y += 92) {
      ctx.strokeStyle = chevronColor;
      ctx.lineWidth = 22;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(46, y + 48);
      ctx.lineTo(128, y);
      ctx.lineTo(210, y + 48);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createSlickTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 512);

    // Organic irregular glossy slick puddle with subtle iridescent blue/violet sheen
    const grad = ctx.createRadialGradient(128, 256, 20, 128, 256, 175);
    grad.addColorStop(0, 'rgba(14, 165, 233, 0.72)');
    grad.addColorStop(0.45, 'rgba(30, 58, 138, 0.65)');
    grad.addColorStop(0.78, 'rgba(15, 23, 42, 0.56)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(128, 256, 108, 230, 0, 0, Math.PI * 2);
    ctx.fill();

    // Specular ice / oil streaks
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.42)';
    ctx.lineWidth = 6;
    for (let i = 0; i < 6; i++) {
      const y = 90 + i * 62;
      ctx.beginPath();
      ctx.moveTo(64 + (i % 2) * 24, y);
      ctx.quadraticCurveTo(128, y - 16, 184 - (i % 2) * 20, y + 8);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class RoadEventSystem {
  public readonly group = new THREE.Group();
  private events: ActiveRoadEvent[] = [];
  private eventPool: Record<RoadEventKind, THREE.Group[]> = {
    roadwork: [],
    ramp: [],
    slick: [],
    boostpad: [],
  };
  private nextEventId = 1;
  private nextSpawnS = 180;
  private blinkPhase = 0;
  private lastKind: RoadEventKind | null = null;

  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private readonly textures: THREE.Texture[] = [];

  // Shared Geometries
  private coneBaseGeo: THREE.BoxGeometry;
  private coneBodyGeo: THREE.ConeGeometry;
  private coneStripeGeo: THREE.CylinderGeometry;
  private barrierBoardGeo: THREE.BoxGeometry;
  private barrierLegGeo: THREE.BoxGeometry;
  private beaconGeo: THREE.SphereGeometry;
  private rampWedgeGeo: THREE.ExtrudeGeometry;
  private rampSideRailGeo: THREE.BoxGeometry;
  private slickPlaneGeo: THREE.PlaneGeometry;
  private boostPlaneGeo: THREE.PlaneGeometry;
  private boostRailGeo: THREE.BoxGeometry;

  // Shared Materials
  private coneOrangeMat: THREE.MeshStandardMaterial;
  private coneWhiteMat: THREE.MeshStandardMaterial;
  private darkSteelMat: THREE.MeshStandardMaterial;
  private barrierFaceMat: THREE.MeshStandardMaterial;
  private beaconAmberMat: THREE.MeshStandardMaterial;
  private rampDeckMat: THREE.MeshStandardMaterial;
  private rampSideMat: THREE.MeshStandardMaterial;
  private slickMat: THREE.MeshPhysicalMaterial;
  private boostPadMat: THREE.MeshStandardMaterial;
  private boostGlowMat: THREE.MeshStandardMaterial;

  constructor() {
    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      this.geometries.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      this.materials.push(m);
      return m;
    };
    const trackTex = <T extends THREE.Texture>(t: T): T => {
      this.textures.push(t);
      return t;
    };

    const barrierTex = trackTex(createHazardStripeTexture('#f8fafc', '#dc2626'));
    const rampTex = trackTex(
      createChevronPadTexture('#18181b', '#f59e0b', '#fbbf24'),
    );
    const boostTex = trackTex(
      createChevronPadTexture('#082f49', '#38bdf8', '#22d3ee'),
    );
    const slickTex = trackTex(createSlickTexture());

    // Cone geometries
    this.coneBaseGeo = trackGeo(new THREE.BoxGeometry(0.46, 0.06, 0.46));
    this.coneBodyGeo = trackGeo(new THREE.ConeGeometry(0.18, 0.68, 10));
    this.coneStripeGeo = trackGeo(new THREE.CylinderGeometry(0.095, 0.125, 0.14, 10));

    // Roadwork barricade geometries
    this.barrierBoardGeo = trackGeo(new THREE.BoxGeometry(2.75, 0.56, 0.12));
    this.barrierLegGeo = trackGeo(new THREE.BoxGeometry(0.12, 0.95, 0.14));
    this.beaconGeo = trackGeo(new THREE.SphereGeometry(0.13, 10, 8));

    // Stunt Jump Ramp wedge geometry (length 6.4m along -Z forward, height 0.95m at far lip)
    const wedgeShape = new THREE.Shape();
    wedgeShape.moveTo(0, 0);
    wedgeShape.lineTo(6.4, 0);
    wedgeShape.lineTo(6.4, 0.95);
    wedgeShape.lineTo(5.9, 0.95);
    wedgeShape.lineTo(0, 0.06);
    wedgeShape.closePath();
    this.rampWedgeGeo = trackGeo(
      new THREE.ExtrudeGeometry(wedgeShape, {
        depth: 2.5,
        bevelEnabled: false,
      }),
    );
    // Align so width is along X (-1.25..+1.25), length is along Z (+3.2 rear entry -> -3.2 front takeoff lip)
    this.rampWedgeGeo.translate(-3.2, 0, -1.25);
    this.rampWedgeGeo.rotateY(Math.PI / 2);

    this.rampSideRailGeo = trackGeo(new THREE.BoxGeometry(0.1, 0.18, 6.45));

    // Slick & Boostpad plane geometries
    this.slickPlaneGeo = trackGeo(new THREE.PlaneGeometry(3.2, 16.5));
    this.slickPlaneGeo.rotateX(-Math.PI / 2);

    this.boostPlaneGeo = trackGeo(new THREE.PlaneGeometry(2.75, 11.5));
    this.boostPlaneGeo.rotateX(-Math.PI / 2);
    this.boostRailGeo = trackGeo(new THREE.BoxGeometry(0.1, 0.08, 11.5));

    // Materials
    this.coneOrangeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xc2410c,
        emissiveIntensity: 0.25,
        roughness: 0.48,
      }),
    );
    this.coneWhiteMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        emissive: 0xe2e8f0,
        emissiveIntensity: 0.35,
        roughness: 0.32,
      }),
    );
    this.darkSteelMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x27272a,
        roughness: 0.52,
        metalness: 0.65,
      }),
    );
    this.barrierFaceMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: barrierTex,
        emissiveMap: barrierTex,
        emissive: 0xffffff,
        emissiveIntensity: 0.28,
        roughness: 0.42,
      }),
    );
    this.beaconAmberMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xf59e0b,
        emissiveIntensity: 2.8,
        roughness: 0.18,
      }),
    );
    this.rampDeckMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: rampTex,
        emissiveMap: rampTex,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.35,
        roughness: 0.45,
        metalness: 0.35,
      }),
    );
    this.rampSideMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.55,
        roughness: 0.38,
        metalness: 0.45,
      }),
    );
    this.slickMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        map: slickTex,
        transparent: true,
        opacity: 0.9,
        roughness: 0.05,
        metalness: 0.2,
        clearcoat: 1.0,
        clearcoatRoughness: 0.03,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      }),
    );
    this.boostPadMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: boostTex,
        emissiveMap: boostTex,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.35,
        roughness: 0.22,
        metalness: 0.4,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      }),
    );
    this.boostGlowMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x22d3ee,
        emissive: 0x06b6d4,
        emissiveIntensity: 2.2,
        roughness: 0.2,
      }),
    );
  }

  private createConeMesh(): THREE.Group {
    const g = new THREE.Group();
    const base = new THREE.Mesh(this.coneBaseGeo, this.darkSteelMat);
    base.position.y = 0.03;
    g.add(base);

    const body = new THREE.Mesh(this.coneBodyGeo, this.coneOrangeMat);
    body.position.y = 0.38;
    g.add(body);

    const stripe = new THREE.Mesh(this.coneStripeGeo, this.coneWhiteMat);
    stripe.position.y = 0.44;
    g.add(stripe);
    return g;
  }

  private buildEventMesh(kind: RoadEventKind): THREE.Group {
    const g = new THREE.Group();

    if (kind === 'roadwork') {
      // Main striped barricade perpendicular to traffic
      const board = new THREE.Mesh(this.barrierBoardGeo, this.barrierFaceMat);
      board.position.set(0, 0.82, 0);
      g.add(board);

      for (const lx of [-1.1, 1.1]) {
        const leg = new THREE.Mesh(this.barrierLegGeo, this.darkSteelMat);
        leg.position.set(lx, 0.48, 0);
        g.add(leg);

        const beacon = new THREE.Mesh(this.beaconGeo, this.beaconAmberMat);
        beacon.position.set(lx, 1.24, 0);
        g.add(beacon);
      }

      // Approach safety cones lining the closed lane ahead of the barrier (+Z is toward approaching player)
      const coneOffsets: [number, number][] = [
        [-1.15, 7.5],
        [1.15, 7.5],
        [-1.15, 3.8],
        [1.15, 3.8],
        [0, 10.8],
      ];
      for (const [cx, cz] of coneOffsets) {
        const cone = this.createConeMesh();
        cone.position.set(cx, 0, cz);
        g.add(cone);
      }
    } else if (kind === 'ramp') {
      const wedge = new THREE.Mesh(this.rampWedgeGeo, this.rampDeckMat);
      wedge.position.y = 0.02;
      g.add(wedge);

      // Sloped side guide rails along the ramp edges
      for (const sx of [-1.28, 1.28]) {
        const rail = new THREE.Mesh(this.rampSideRailGeo, this.rampSideMat);
        rail.position.set(sx, 0.56, 0);
        rail.rotation.x = 0.145;
        g.add(rail);
      }

      // Glowing top lip beacons so player sees ramp from afar
      for (const sx of [-1.15, 1.15]) {
        const beacon = new THREE.Mesh(this.beaconGeo, this.beaconAmberMat);
        beacon.position.set(sx, 1.05, -3.15);
        g.add(beacon);
      }
    } else if (kind === 'slick') {
      const patch = new THREE.Mesh(this.slickPlaneGeo, this.slickMat);
      patch.position.set(0, 0.035, 0);
      g.add(patch);

      // Two warning cones framing entry to slick zone
      for (const sx of [-1.45, 1.45]) {
        const cone = this.createConeMesh();
        cone.position.set(sx, 0, 7.2);
        g.add(cone);
      }
    } else {
      // boostpad
      const pad = new THREE.Mesh(this.boostPlaneGeo, this.boostPadMat);
      pad.position.set(0, 0.04, 0);
      g.add(pad);

      for (const sx of [-1.4, 1.4]) {
        const rail = new THREE.Mesh(this.boostRailGeo, this.boostGlowMat);
        rail.position.set(sx, 0.06, 0);
        g.add(rail);
      }
    }

    // Freeze static child matrices once (only root event group moves)
    g.updateMatrixWorld(true);
    g.traverse((obj) => {
      if (obj !== g) {
        obj.matrixAutoUpdate = false;
      }
    });

    return g;
  }

  private acquireEventMesh(kind: RoadEventKind): THREE.Group {
    const bucket = this.eventPool[kind];
    if (bucket.length > 0) {
      const reused = bucket.pop()!;
      reused.visible = false;
      return reused;
    }
    const created = this.buildEventMesh(kind);
    created.visible = false;
    this.group.add(created);
    return created;
  }

  private releaseEventMesh(kind: RoadEventKind, meshGroup: THREE.Group): void {
    meshGroup.visible = false;
    const bucket = this.eventPool[kind];
    if (bucket.length < 4) {
      bucket.push(meshGroup);
    } else {
      this.group.remove(meshGroup);
    }
  }

  public reset(): void {
    for (const ev of this.events) {
      this.releaseEventMesh(ev.kind, ev.group);
    }
    this.events = [];
    this.nextSpawnS = 185;
    this.lastKind = null;
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public recenter(offset: THREE.Vector3): void {
    for (const ev of this.events) {
      ev.group.position.sub(offset);
    }
  }

  public isLaneBlockedNear(s: number, laneIndex: number): boolean {
    for (const ev of this.events) {
      if (ev.laneIndex === laneIndex && Math.abs(ev.s - s) < 22) {
        return true;
      }
    }
    return false;
  }

  public spawnAhead(maxS: number): void {
    const kinds: RoadEventKind[] = ['ramp', 'boostpad', 'roadwork', 'slick'];
    while (this.nextSpawnS < maxS) {
      if (this.events.length < 6) {
        // Pick a varied event kind (avoid repeating identical kind back-to-back)
        const pool = kinds.filter((k) => k !== this.lastKind);
        const kind = pool[Math.floor(Math.random() * pool.length)];
        this.lastKind = kind;

        const laneIndex = Math.floor(Math.random() * LANE_CENTERS.length);
        const lateral = LANE_CENTERS[laneIndex];
        const meshGroup = this.acquireEventMesh(kind);

        this.events.push({
          id: this.nextEventId++,
          kind,
          s: this.nextSpawnS,
          laneIndex,
          lateral,
          triggered: false,
          passed: false,
          group: meshGroup,
        });
      }

      this.nextSpawnS += 145 + Math.random() * 75;
    }
  }

  public update(
    dt: number,
    road: RoadSystem,
    playerS: number,
    playerLateral: number,
    playerHeight: number,
    allowTriggers: boolean,
  ): {
    hits: RoadEventHitResult[];
    cleanRoadworkPasses: number;
    upcoming: UpcomingRoadEvent | null;
  } {
    this.blinkPhase += dt * 7.5;
    const blinkIntensity = 1.4 + Math.max(0, Math.sin(this.blinkPhase)) * 2.6;
    this.beaconAmberMat.emissiveIntensity = blinkIntensity;
    this.boostGlowMat.emissiveIntensity =
      1.6 + (Math.sin(this.blinkPhase * 0.9) * 0.5 + 0.5) * 1.4;

    const hits: RoadEventHitResult[] = [];
    let cleanRoadworkPasses = 0;
    let closestUpcoming: UpcomingRoadEvent | null = null;
    let closestDist = Infinity;

    for (let i = this.events.length - 1; i >= 0; i--) {
      const ev = this.events[i];
      if (ev.s < playerS - 28) {
        this.releaseEventMesh(ev.kind, ev.group);
        this.events.splice(i, 1);
        continue;
      }

      if (road.sampleAtS(ev.s, _evSample)) {
        _evNegTangent.copy(_evSample.tangent).negate();
        _evBasis.makeBasis(_evSample.right, _evSample.normal, _evNegTangent);
        _evQuat.setFromRotationMatrix(_evBasis);

        ev.group.position
          .copy(_evSample.pos)
          .addScaledVector(_evSample.right, ev.lateral);
        ev.group.quaternion.copy(_evQuat);
        ev.group.visible = true;
      } else {
        ev.group.visible = false;
      }

      const distAhead = ev.s - playerS;
      if (distAhead > 12 && distAhead < 155 && distAhead < closestDist) {
        closestDist = distAhead;
        closestUpcoming = {
          kind: ev.kind,
          label: EVENT_LABELS[ev.kind],
          laneLabel: LANE_LABELS[ev.laneIndex] ?? 'Orta Şerit',
          distanceMeters: Math.round(distAhead),
        };
      }

      if (!allowTriggers || !ev.group.visible) continue;

      const latDist = Math.abs(playerLateral - ev.lateral);
      if (!ev.triggered) {
        if (ev.kind === 'roadwork') {
          if (Math.abs(distAhead) < 2.25 && latDist < 1.38) {
            ev.triggered = true;
            if (playerHeight > 0.85) {
              hits.push({
                kind: 'roadwork',
                eventId: ev.id,
                clearedAirborne: true,
              });
            } else {
              hits.push({
                kind: 'roadwork',
                eventId: ev.id,
                clearedAirborne: false,
              });
            }
          } else if (!ev.passed && distAhead < -3.5) {
            ev.passed = true;
            cleanRoadworkPasses++;
          }
        } else if (ev.kind === 'ramp') {
          if (
            distAhead < 2.5 &&
            distAhead > -2.6 &&
            latDist < 1.42 &&
            playerHeight < 0.45
          ) {
            ev.triggered = true;
            hits.push({ kind: 'ramp', eventId: ev.id });
          }
        } else if (ev.kind === 'slick') {
          if (Math.abs(distAhead) < 7.8 && latDist < 1.55 && playerHeight < 0.35) {
            ev.triggered = true;
            hits.push({ kind: 'slick', eventId: ev.id });
          }
        } else if (ev.kind === 'boostpad') {
          if (Math.abs(distAhead) < 5.6 && latDist < 1.48 && playerHeight < 0.4) {
            ev.triggered = true;
            hits.push({ kind: 'boostpad', eventId: ev.id });
          }
        }
      }
    }

    return { hits, cleanRoadworkPasses, upcoming: closestUpcoming };
  }

  public dispose(): void {
    this.reset();
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
  }
}
