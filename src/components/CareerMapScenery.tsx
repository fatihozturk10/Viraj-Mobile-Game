import React, { useEffect, useMemo, useState } from 'react';

export interface RoadPoint {
  x: number;
  y: number;
}

export interface BiomeBoundaries {
  /** Midpoint Y between Volcanic (76–100) and Arctic (51–75) */
  volcanicToArcticY: number;
  /** Midpoint Y between Arctic (51–75) and Desert (26–50) */
  arcticToDesertY: number;
  /** Midpoint Y between Desert (26–50) and Alpine (1–25) */
  desertToAlpineY: number;
}

interface CareerMapSceneryProps {
  worldWidth: number;
  mapHeight: number;
  levelCoords: RoadPoint[];
  highestUnlockedLevel: number;
  boundaries: BiomeBoundaries;
  gantryYs: number[];
}

interface SceneryProp {
  id: string;
  x: number;
  y: number;
  scale: number;
  chapterIndex: number;
  variant: number;
  flip: boolean;
}

interface RoadsideBeacon {
  id: string;
  x: number;
  y: number;
  color: string;
}

interface FlankLandmark {
  id: string;
  x: number;
  y: number;
  scale: number;
  chapterIndex: number;
  variant: number;
}

interface TerrainPatch {
  id: string;
  x: number;
  y: number;
  rx: number;
  ry: number;
  rot: number;
  chapterIndex: number;
  tone: number;
}

interface MicroFoliage {
  id: string;
  x: number;
  y: number;
  scale: number;
  chapterIndex: number;
  variant: number;
  flip: boolean;
}

interface BridgePlacement {
  x: number;
  y: number;
  angleDeg: number;
  deck: string;
  rail: string;
  glow: string;
}

interface SceneryBandSpec {
  index: number;
  top: number;
  bottom: number;
  height: number;
}

const BAND_HEIGHT = 1200;

/**
 * Builds a seamless Catmull-Rom cubic Bezier sub-path for segments [startSeg .. endSeg]
 * using the full levelCoords neighbors so adjacent SVG bands match with 0.0px seam.
 */
function buildSmoothRoadSegment(
  coords: RoadPoint[],
  startSeg: number,
  endSeg: number,
): string {
  const n = coords.length;
  if (n < 2) return '';
  const from = Math.max(0, startSeg);
  const to = Math.min(n - 2, endSeg);
  if (from > to) return '';

  let d = `M ${coords[from].x.toFixed(1)} ${coords[from].y.toFixed(1)}`;
  for (let i = from; i <= to; i++) {
    const p0 = coords[Math.max(0, i - 1)];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[Math.min(n - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

/**
 * Sample road center X at any Y by interpolating the monotonically decreasing levelCoords.
 */
function sampleRoadXAtY(coords: RoadPoint[], y: number): number {
  const n = coords.length;
  if (n === 0) return 800;
  if (y >= coords[0].y) return coords[0].x;
  if (y <= coords[n - 1].y) return coords[n - 1].x;

  let lo = 0;
  let hi = n - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (coords[mid].y >= y) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const p1 = coords[lo];
  const p2 = coords[hi];
  const span = p1.y - p2.y;
  if (span <= 0.001) return p1.x;
  const t = (p1.y - y) / span;
  const s = t * t * (3 - 2 * t);
  return p1.x + (p2.x - p1.x) * s;
}

function getChapterIndexAtY(y: number, boundaries: BiomeBoundaries): number {
  if (y >= boundaries.desertToAlpineY) return 0;
  if (y >= boundaries.arcticToDesertY) return 1;
  if (y >= boundaries.volcanicToArcticY) return 2;
  return 3;
}

function isSafeFromRoadAndGantries(
  coords: RoadPoint[],
  x: number,
  y: number,
  minRoadDist: number,
  worldCenterX: number,
  gantryYs: number[],
  checkGantries: boolean,
): boolean {
  const rx0 = sampleRoadXAtY(coords, y);
  const rxUp = sampleRoadXAtY(coords, y - 28);
  const rxDn = sampleRoadXAtY(coords, y + 28);
  if (
    Math.abs(x - rx0) < minRoadDist ||
    Math.abs(x - rxUp) < minRoadDist * 0.92 ||
    Math.abs(x - rxDn) < minRoadDist * 0.92
  ) {
    return false;
  }

  if (checkGantries && Math.abs(x - worldCenterX) < 205) {
    for (let i = 0; i < gantryYs.length; i++) {
      if (Math.abs(y - gantryYs[i]) < 56) {
        return false;
      }
    }
  }
  return true;
}

function computeMidpointBridge(
  coords: RoadPoint[],
  idxA: number,
  deck: string,
  rail: string,
  glow: string,
): BridgePlacement {
  const pA = coords[idxA];
  const pB = coords[Math.min(coords.length - 1, idxA + 1)];
  const x = (pA.x + pB.x) * 0.5;
  const y = (pA.y + pB.y) * 0.5;
  const dx = pB.x - pA.x;
  const dy = pB.y - pA.y;
  const angleDeg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return { x, y, angleDeg, deck, rail, glow };
}

function generateSceneryProps(
  coords: RoadPoint[],
  worldWidth: number,
  boundaries: BiomeBoundaries,
  gantryYs: number[],
  bridgeYs: number[],
): SceneryProp[] {
  const props: SceneryProp[] = [];
  const centerX = worldWidth * 0.5;

  for (let i = 0; i < coords.length; i++) {
    const levelId = i + 1;
    const pt = coords[i];

    let nearBridge = false;
    for (let b = 0; b < bridgeYs.length; b++) {
      if (Math.abs(pt.y - bridgeYs[b]) < 58) {
        nearBridge = true;
        break;
      }
    }
    if (nearBridge) continue;

    const leftNearY = pt.y + (((levelId * 19) % 44) - 22);
    const leftNearRoadX = sampleRoadXAtY(coords, leftNearY);
    const leftNearX = leftNearRoadX - (94 + ((levelId * 37) % 62));
    if (
      leftNearX > 40 &&
      isSafeFromRoadAndGantries(
        coords,
        leftNearX,
        leftNearY,
        84,
        centerX,
        gantryYs,
        true,
      )
    ) {
      props.push({
        id: `p_ln_${levelId}`,
        x: leftNearX,
        y: leftNearY,
        scale: 0.78 + ((levelId * 13) % 34) / 100,
        chapterIndex: getChapterIndexAtY(leftNearY, boundaries),
        variant: (levelId * 5) % 6,
        flip: levelId % 2 === 0,
      });
    }

    const rightNearY = pt.y + (((levelId * 29) % 44) - 22);
    const rightNearRoadX = sampleRoadXAtY(coords, rightNearY);
    const rightNearX = rightNearRoadX + (94 + ((levelId * 53) % 62));
    if (
      rightNearX < worldWidth - 40 &&
      isSafeFromRoadAndGantries(
        coords,
        rightNearX,
        rightNearY,
        84,
        centerX,
        gantryYs,
        true,
      )
    ) {
      props.push({
        id: `p_rn_${levelId}`,
        x: rightNearX,
        y: rightNearY,
        scale: 0.78 + ((levelId * 23) % 34) / 100,
        chapterIndex: getChapterIndexAtY(rightNearY, boundaries),
        variant: (levelId * 7 + 2) % 6,
        flip: levelId % 2 === 1,
      });
    }

    if (levelId % 2 === 0) {
      const leftMidY = pt.y + (levelId % 4 === 0 ? -38 : 38);
      const leftMidX =
        sampleRoadXAtY(coords, leftMidY) - (176 + ((levelId * 41) % 105));
      if (
        leftMidX > 48 &&
        isSafeFromRoadAndGantries(
          coords,
          leftMidX,
          leftMidY,
          96,
          centerX,
          gantryYs,
          false,
        )
      ) {
        props.push({
          id: `p_lm_${levelId}`,
          x: leftMidX,
          y: leftMidY,
          scale: 0.84 + ((levelId * 11) % 32) / 100,
          chapterIndex: getChapterIndexAtY(leftMidY, boundaries),
          variant: (levelId + 3) % 6,
          flip: true,
        });
      }
    } else {
      const rightMidY = pt.y + (levelId % 3 === 0 ? -38 : 38);
      const rightMidX =
        sampleRoadXAtY(coords, rightMidY) + (176 + ((levelId * 47) % 105));
      if (
        rightMidX < worldWidth - 48 &&
        isSafeFromRoadAndGantries(
          coords,
          rightMidX,
          rightMidY,
          96,
          centerX,
          gantryYs,
          false,
        )
      ) {
        props.push({
          id: `p_rm_${levelId}`,
          x: rightMidX,
          y: rightMidY,
          scale: 0.84 + ((levelId * 17) % 32) / 100,
          chapterIndex: getChapterIndexAtY(rightMidY, boundaries),
          variant: (levelId + 4) % 6,
          flip: false,
        });
      }
    }
  }
  return props;
}

function generateRoadsideBeacons(
  coords: RoadPoint[],
  boundaries: BiomeBoundaries,
): RoadsideBeacon[] {
  const beacons: RoadsideBeacon[] = [];
  const palette = ['#fcd34d', '#fb923c', '#38bdf8', '#fb7185'];
  for (let i = 1; i < coords.length - 1; i += 3) {
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const midY = (p1.y + p2.y) * 0.5;
    const rx = sampleRoadXAtY(coords, midY);
    const dx = p2.x - p1.x;
    const side = dx >= 0 ? -1 : 1;
    const chapterIndex = getChapterIndexAtY(midY, boundaries);
    beacons.push({
      id: `b_${i}`,
      x: rx + side * 44,
      y: midY,
      color: palette[chapterIndex],
    });
  }
  return beacons;
}

function generateWideFlankLandmarks(
  coords: RoadPoint[],
  worldWidth: number,
  mapHeight: number,
  boundaries: BiomeBoundaries,
): FlankLandmark[] {
  const items: FlankLandmark[] = [];
  const centerX = worldWidth * 0.5;
  const rows = 92;

  for (let r = 0; r < rows; r++) {
    const y = 140 + ((r + 0.5) / rows) * (mapHeight - 280);
    const chapterIndex = getChapterIndexAtY(y, boundaries);

    const lx = 56 + ((r * 157) % Math.max(120, Math.floor(centerX - 330)));
    const ly = y + (((r * 31) % 56) - 28);
    if (Math.abs(lx - sampleRoadXAtY(coords, ly)) > 190) {
      items.push({
        id: `wf_l_${r}`,
        x: lx,
        y: ly,
        scale: 0.92 + ((r * 19) % 62) / 100,
        chapterIndex,
        variant: r % 6,
      });
    }

    const rx =
      centerX +
      270 +
      ((r * 173) % Math.max(120, Math.floor(centerX - 330)));
    const ry = y + (((r * 47) % 56) - 28);
    if (Math.abs(rx - sampleRoadXAtY(coords, ry)) > 190) {
      items.push({
        id: `wf_r_${r}`,
        x: rx,
        y: ry,
        scale: 0.92 + ((r * 29) % 62) / 100,
        chapterIndex,
        variant: (r + 3) % 6,
      });
    }
  }
  return items;
}

function generateTerrainPatches(
  coords: RoadPoint[],
  worldWidth: number,
  boundaries: BiomeBoundaries,
): TerrainPatch[] {
  const patches: TerrainPatch[] = [];
  for (let i = 0; i < coords.length; i++) {
    const levelId = i + 1;
    const pt = coords[i];
    const ly = pt.y + (((levelId * 17) % 44) - 22);
    const lx = sampleRoadXAtY(coords, ly) - (115 + ((levelId * 29) % 130));
    if (lx > 40) {
      patches.push({
        id: `tp_l_${levelId}`,
        x: lx,
        y: ly,
        rx: 34 + ((levelId * 13) % 34),
        ry: 18 + ((levelId * 7) % 18),
        rot: ((levelId * 19) % 34) - 17,
        chapterIndex: getChapterIndexAtY(ly, boundaries),
        tone: levelId % 2,
      });
    }

    const ry = pt.y + (((levelId * 23) % 44) - 22);
    const rx = sampleRoadXAtY(coords, ry) + (115 + ((levelId * 41) % 130));
    if (rx < worldWidth - 40) {
      patches.push({
        id: `tp_r_${levelId}`,
        x: rx,
        y: ry,
        rx: 34 + ((levelId * 11) % 34),
        ry: 18 + ((levelId * 13) % 18),
        rot: ((levelId * 23) % 34) - 17,
        chapterIndex: getChapterIndexAtY(ry, boundaries),
        tone: (levelId + 1) % 2,
      });
    }
  }
  return patches;
}

function generateMicroFoliage(
  coords: RoadPoint[],
  worldWidth: number,
  boundaries: BiomeBoundaries,
  gantryYs: number[],
  bridgeYs: number[],
): MicroFoliage[] {
  const details: MicroFoliage[] = [];
  const centerX = worldWidth * 0.5;

  for (let i = 0; i < coords.length; i++) {
    const p1 = coords[i];
    const p2 = coords[Math.min(coords.length - 1, i + 1)];

    const samples = [
      { y: p1.y, seed: (i + 1) * 31 },
      { y: (p1.y + p2.y) * 0.5, seed: (i + 1) * 67 + 19 },
    ];

    for (let sIdx = 0; sIdx < samples.length; sIdx++) {
      const sample = samples[sIdx];
      const seed = sample.seed;

      let nearBridge = false;
      for (let b = 0; b < bridgeYs.length; b++) {
        if (Math.abs(sample.y - bridgeYs[b]) < 46) {
          nearBridge = true;
          break;
        }
      }
      if (nearBridge) continue;

      const ly = sample.y + (((seed * 7) % 34) - 17);
      const lx = sampleRoadXAtY(coords, ly) - (68 + ((seed * 19) % 115));
      if (
        lx > 24 &&
        isSafeFromRoadAndGantries(
          coords,
          lx,
          ly,
          64,
          centerX,
          gantryYs,
          true,
        )
      ) {
        details.push({
          id: `mf_l_${i}_${sIdx}`,
          x: lx,
          y: ly,
          scale: 0.72 + ((seed * 11) % 38) / 100,
          chapterIndex: getChapterIndexAtY(ly, boundaries),
          variant: seed % 6,
          flip: seed % 2 === 0,
        });
      }

      const ry = sample.y + (((seed * 11) % 34) - 17);
      const rx = sampleRoadXAtY(coords, ry) + (68 + ((seed * 23) % 115));
      if (
        rx < worldWidth - 24 &&
        isSafeFromRoadAndGantries(
          coords,
          rx,
          ry,
          64,
          centerX,
          gantryYs,
          true,
        )
      ) {
        details.push({
          id: `mf_r_${i}_${sIdx}`,
          x: rx,
          y: ry,
          scale: 0.72 + ((seed * 13) % 38) / 100,
          chapterIndex: getChapterIndexAtY(ry, boundaries),
          variant: (seed + 3) % 6,
          flip: seed % 2 === 1,
        });
      }
    }
  }
  return details;
}

const renderBiomeProp = (prop: SceneryProp) => {
  const sx = prop.flip ? -prop.scale : prop.scale;
  const tr = `translate(${prop.x.toFixed(1)} ${prop.y.toFixed(1)}) scale(${sx.toFixed(2)} ${prop.scale.toFixed(2)})`;

  // === CHAPTER 0: YEŞİL VADİ (Alpine Valley) ===
  if (prop.chapterIndex === 0) {
    switch (prop.variant) {
      case 0:
        return (
          <g key={prop.id} transform={tr}>
            <ellipse cx="0" cy="15" rx="26" ry="8" fill="#04150e" opacity="0.45" />
            <g transform="translate(-12 2) scale(0.76)">
              <rect x="-2.5" y="4" width="5" height="9" fill="#4a2e1d" />
              <polygon points="0,-24 -14,6 14,6" fill="#0f5132" />
              <polygon points="0,-32 -10,-6 10,-6" fill="#15803d" />
            </g>
            <g transform="translate(13 4) scale(0.7)">
              <rect x="-2.5" y="4" width="5" height="9" fill="#4a2e1d" />
              <polygon points="0,-22 -14,6 14,6" fill="#14532d" />
              <polygon points="0,-30 -10,-6 10,-6" fill="#16a34a" opacity="0.88" />
            </g>
            <rect x="-3" y="5" width="6" height="10" rx="1.2" fill="#5c3822" />
            <polygon points="0,-22 -16,7 16,7" fill="#166534" />
            <polygon points="0,-31 -13,-4 13,-4" fill="#15803d" />
            <polygon points="0,-39 -9,-16 9,-16" fill="#22c55e" />
            <polygon points="0,-39 0,-16 9,-16" fill="#4ade80" opacity="0.45" />
          </g>
        );
      case 1:
        return (
          <g key={prop.id} transform={tr}>
            <ellipse cx="0" cy="14" rx="24" ry="7.5" fill="#04150e" opacity="0.5" />
            <rect x="8" y="-22" width="5" height="12" rx="1" fill="#78350f" />
            <circle cx="10.5" cy="-26" r="3" fill="#e2e8f0" opacity="0.32" />
            <circle cx="13" cy="-31" r="4" fill="#e2e8f0" opacity="0.2" />
            <rect x="-15" y="-5" width="30" height="18" rx="1.5" fill="#7c4a27" />
            <rect x="0" y="-5" width="15" height="18" fill="#633a1e" />
            <polygon points="0,-22 -20,-3 20,-3" fill="#991b1b" />
            <polygon points="0,-22 20,-3 0,-3" fill="#7f1d1d" />
            <polyline points="-20,-3 0,-22 20,-3" fill="none" stroke="#fef3c7" strokeWidth="1.8" strokeLinecap="round" />
            <rect x="-10" y="0" width="6" height="6" rx="1" fill="#fde047" />
            <rect x="4" y="0" width="6" height="6" rx="1" fill="#facc15" />
            <rect x="-2.5" y="4" width="5" height="9" rx="1" fill="#451a03" />
          </g>
        );
      case 2:
        return (
          <g key={prop.id} transform={tr}>
            <ellipse cx="0" cy="16" rx="16" ry="5.5" fill="#051a11" opacity="0.45" />
            <ellipse cx="0" cy="14" rx="13" ry="5" fill="#15803d" />
            <polygon points="-2.4,13 -1.1,-22 1.1,-22 2.4,13" fill="#e2e8f0" />
            <polygon points="0,13 1.1,-22 2.4,13" fill="#cbd5e1" />
            <g transform="translate(0 -22)">
              <g className="animate-career-turbine">
                <path d="M 0 0 L -2.2 -17 L 1.6 -17 Z" fill="#f8fafc" />
                <path d="M 0 0 L 15 8.5 L 13 11.5 Z" fill="#f1f5f9" />
                <path d="M 0 0 L -15 8.5 L -13 11.5 Z" fill="#e2e8f0" />
                <circle cx="0" cy="0" r="3" fill="#94a3b8" />
                <circle cx="0" cy="0" r="1.4" fill="#10b981" />
              </g>
            </g>
          </g>
        );
      case 3:
        return (
          <g key={prop.id} transform={tr}>
            <ellipse cx="0" cy="10" rx="22" ry="7.5" fill="#05160f" opacity="0.45" />
            <ellipse cx="0" cy="8" rx="21" ry="7" fill="#15803d" opacity="0.55" />
            <polygon points="-17,9 -10,-9 4,-11 16,7" fill="#64748b" />
            <polygon points="-10,-9 4,-11 1,3 -12,4" fill="#94a3b8" />
            <polygon points="6,10 13,-2 21,9" fill="#475569" />
            <circle cx="-14" cy="11" r="2.1" fill="#fde047" />
            <circle cx="-8" cy="13" r="1.8" fill="#38bdf8" />
            <circle cx="11" cy="12" r="2" fill="#f472b6" />
            <circle cx="17" cy="11" r="1.7" fill="#fde047" />
          </g>
        );
      case 4:
        return (
          <g key={prop.id} transform={tr}>
            <ellipse cx="0" cy="14" rx="18" ry="6" fill="#04150e" opacity="0.45" />
            <rect x="-3" y="-2" width="6" height="16" rx="2" fill="#5c3822" />
            <circle cx="-9" cy="-10" r="11" fill="#15803d" />
            <circle cx="10" cy="-9" r="10" fill="#166534" />
            <circle cx="0" cy="-17" r="13" fill="#22c55e" />
            <circle cx="-4" cy="-20" r="6" fill="#4ade80" opacity="0.55" />
          </g>
        );
      default:
        return (
          <g key={prop.id} transform={tr}>
            <ellipse cx="0" cy="14" rx="18" ry="6" fill="#04150e" opacity="0.45" />
            <g transform="translate(-8 0) scale(0.82)">
              <rect x="-2.5" y="4" width="5" height="10" fill="#4a2e1d" />
              <polygon points="0,-24 -14,6 14,6" fill="#166534" />
              <polygon points="0,-32 -10,-6 10,-6" fill="#22c55e" />
            </g>
            <rect x="7" y="-8" width="3" height="22" fill="#78350f" />
            <polygon points="2,-6 16,-6 19,-2.5 16,1 2,1" fill="#fef3c7" />
            <line x1="5" y1="-2.5" x2="14" y2="-2.5" stroke="#166534" strokeWidth="1.6" />
          </g>
        );
    }
  }

  // === CHAPTER 1: KIZIL ÇÖL (Red Desert Canyon) ===
  if (prop.chapterIndex === 1) {
    switch (prop.variant) {
      case 0:
        return (
          <g key={prop.id} transform={tr}>
            <ellipse cx="0" cy="15" rx="15" ry="5.5" fill="#2b0f05" opacity="0.5" />
            <rect x="-4.5" y="-26" width="9" height="40" rx="4.5" fill="#3f6212" />
            <line x1="-1.5" y1="-22" x2="-1.5" y2="11" stroke="#65a30d" strokeWidth="1.5" opacity="0.7" />
            <path d="M -4.5 -5 H -14 V -16" fill="none" stroke="#4d7c0f" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M 4.5 -10 H 14 V -20" fill="none" stroke="#365314" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="-11" cy="12" r="4" fill="#a16207" opacity="0.75" />
            <circle cx="9" cy="13" r="3.2" fill="#ca8a04" opacity="0.65" />
          </g>
        );
      case 1:
        return (
          <g key={prop.id} transform={tr}>
            <ellipse cx="0" cy="13" rx="28" ry="8" fill="#290e05" opacity="0.5" />
            <polygon points="-26,12 -18,-14 14,-16 25,12" fill="#9a3412" />
            <polygon points="-18,-14 14,-16 8,-5 -13,-4" fill="#ea580c" />
            <line x1="-21" y1="2" x2="20" y2="1" stroke="#c2410c" strokeWidth="2.5" />
            <line x1="-18" y1="-6" x2="15" y2="-7" stroke="#fdba74" strokeWidth="1.4" opacity="0.5" />
          </g>
        );
      case 2:
        return (
          <g key={prop.id} transform={tr}>
            <ellipse cx="0" cy="13" rx="26" ry="7" fill="#270d05" opacity="0.52" />
            <path
              d="M -22 12 L -18 -10 Q 0 -24 18 -10 L 22 12 L 11 12 L 9 -2 Q 0 -10 -9 -2 L -11 12 Z"
              fill="#b45309"
            />
            <path
              d="M -18 -10 Q 0 -24 18 -10 L 14 -6 Q 0 -16 -14 -6 Z"
              fill="#f97316"
              opacity="0.75"
            />
          </g>
        );
      case 3:
        return (
          <g key={prop.id} transform={tr}>
            <ellipse cx="0" cy="13" rx="24" ry="8.5" fill="#0ea5e9" opacity="0.52" />
            <ellipse cx="0" cy="13" rx="16" ry="5" fill="#38bdf8" opacity="0.58" />
            <path d="M -6 10 Q -12 -6 -8 -20" fill="none" stroke="#78350f" strokeWidth="4.2" strokeLinecap="round" />
            <path d="M 8 11 Q 12 -2 10 -15" fill="none" stroke="#92400e" strokeWidth="3.6" strokeLinecap="round" />
            <path d="M -8 -20 Q -22 -24 -25 -13" fill="none" stroke="#16a34a" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M -8 -20 Q -14 -32 -2 -30" fill="none" stroke="#22c55e" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M -8 -20 Q 4 -26 6 -15" fill="none" stroke="#15803d" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M 10 -15 Q 22 -20 24 -10" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
            <path d="M 10 -15 Q 2 -24 -2 -14" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" />
          </g>
        );
      case 4:
        return (
          <g key={prop.id} transform={tr}>
            <ellipse cx="0" cy="14" rx="24" ry="7" fill="#260e05" opacity="0.5" />
            <rect x="-15" y="-6" width="3.5" height="18" fill="#cbd5e1" />
            <rect x="11.5" y="-6" width="3.5" height="18" fill="#cbd5e1" />
            <rect x="-8" y="-2" width="16" height="14" rx="1.5" fill="#475569" />
            <rect x="-5" y="1" width="10" height="6" rx="1" fill="#fde047" />
            <rect x="-20" y="-13" width="40" height="8" rx="2" fill="#dc2626" />
            <rect x="-20" y="-7" width="40" height="2.4" fill="#38bdf8" />
            <rect x="-12" y="-17" width="24" height="4" rx="1" fill="#f59e0b" />
          </g>
        );
      default:
        return (
          <g key={prop.id} transform={tr}>
            <ellipse cx="0" cy="12" rx="19" ry="6" fill="#2b0f05" opacity="0.48" />
            <polygon points="-14,11 -6,-18 4,-10 12,11" fill="#c2410c" />
            <polygon points="-6,-18 4,-10 0,10 -9,10" fill="#ea580c" />
            <path d="M 10 11 L 4 2 M 10 11 L 10 0 M 10 11 L 16 2" stroke="#65a30d" strokeWidth="2.4" strokeLinecap="round" />
          </g>
        );
    }
  }

  // === CHAPTER 2: BUZUL KUTUPLAR (Arctic Glaciers) ===
  if (prop.chapterIndex === 2) {
    switch (prop.variant) {
      case 0:
        return (
          <g key={prop.id} transform={tr}>
            <ellipse cx="0" cy="15" rx="24" ry="7.5" fill="#031120" opacity="0.5" />
            <g transform="translate(-11 3) scale(0.74)">
              <rect x="-2.5" y="4" width="5" height="9" fill="#334155" />
              <polygon points="0,-24 -14,6 14,6" fill="#334155" />
              <polygon points="0,-30 -10,-6 10,-6" fill="#cbd5e1" />
            </g>
            <rect x="-3" y="4" width="6" height="10" fill="#334155" />
            <polygon points="0,-22 -16,6 16,6" fill="#475569" />
            <polygon points="0,-31 -13,-4 13,-4" fill="#94a3b8" />
            <polygon points="0,-38 -9,-16 9,-16" fill="#f1f5f9" />
            <polygon points="0,-38 0,-16 9,-16" fill="#bae6fd" opacity="0.65" />
          </g>
        );
      case 1:
        return (
          <g key={prop.id} transform={tr}>
            <ellipse cx="0" cy="13" rx="20" ry="6.5" fill="#03101d" opacity="0.5" />
            <polygon points="-16,12 -10,-12 -2,12" fill="#38bdf8" opacity="0.72" />
            <polygon points="-8,12 -1,-28 10,-16 14,12" fill="#7dd3fc" opacity="0.86" />
            <polygon points="-1,-28 10,-16 3,12 -4,12" fill="#e0f2fe" opacity="0.92" />
            <polygon points="8,12 15,-8 21,12" fill="#0284c7" opacity="0.76" />
          </g>
        );
      case 2:
        return (
          <g key={prop.id} transform={tr}>
            <ellipse cx="0" cy="14" rx="24" ry="7" fill="#041220" opacity="0.5" />
            <rect x="-15" y="-5" width="30" height="18" rx="1.5" fill="#334155" />
            <polygon points="0,-22 -20,-3 20,-3" fill="#e2e8f0" />
            <polygon points="0,-22 20,-3 4,-3" fill="#bae6fd" />
            <rect x="-10" y="0" width="7" height="6" rx="1" fill="#fbbf24" />
            <rect x="3" y="0" width="7" height="6" rx="1" fill="#f59e0b" />
            <ellipse cx="0" cy="13" rx="18" ry="3.2" fill="#e0f2fe" opacity="0.85" />
          </g>
        );
      case 3:
        return (
          <g key={prop.id} transform={tr}>
            <ellipse cx="0" cy="13" rx="23" ry="7" fill="#031120" opacity="0.5" />
            <line x1="12" y1="2" x2="12" y2="-22" stroke="#94a3b8" strokeWidth="2" />
            <circle cx="12" cy="-23" r="2.5" fill="#38bdf8" />
            <path d="M -18 11 A 18 18 0 0 1 18 11 Z" fill="#cbd5e1" />
            <path d="M 0 -7 A 18 18 0 0 1 18 11 L 0 11 Z" fill="#94a3b8" opacity="0.55" />
            <rect x="-11" y="1" width="14" height="5.5" rx="2.5" fill="#38bdf8" />
            <rect x="-18" y="9" width="36" height="3.5" rx="1.5" fill="#475569" />
          </g>
        );
      case 4:
        return (
          <g key={prop.id} transform={tr}>
            <ellipse cx="0" cy="6" rx="24" ry="11" fill="#0284c7" opacity="0.55" />
            <ellipse cx="0" cy="6" rx="20" ry="8.5" fill="#7dd3fc" opacity="0.62" />
            <line x1="-12" y1="2" x2="2" y2="10" stroke="#f0f9ff" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
            <line x1="4" y1="1" x2="13" y2="7" stroke="#f0f9ff" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
            <ellipse cx="-12" cy="13" rx="11" ry="4" fill="#e2e8f0" opacity="0.8" />
          </g>
        );
      default:
        return (
          <g key={prop.id} transform={tr}>
            <ellipse cx="0" cy="14" rx="14" ry="5" fill="#38bdf8" opacity="0.28" />
            <rect x="-3" y="-14" width="6" height="27" rx="1.5" fill="#475569" />
            <rect x="-5.5" y="-19" width="11" height="7" rx="2" fill="#38bdf8" />
            <circle cx="0" cy="-15.5" r="3" fill="#e0f2fe" />
          </g>
        );
    }
  }

  // === CHAPTER 3: VOLKANİK ZİRVE (Volcanic Summit) ===
  switch (prop.variant) {
    case 0:
      return (
        <g key={prop.id} transform={tr}>
          <ellipse cx="0" cy="13" rx="22" ry="7" fill="#080305" opacity="0.65" />
          <polygon points="-18,12 -8,-25 4,-16 17,12" fill="#18181b" />
          <polygon points="-8,-25 4,-16 -1,10 -12,10" fill="#27272a" />
          <path d="M -5 -12 L -1 -2 L 3 8" fill="none" stroke="#f97316" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M -1 -2 L 6 2" fill="none" stroke="#fde047" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      );
    case 1:
      return (
        <g key={prop.id} transform={tr}>
          <ellipse cx="0" cy="7" rx="25" ry="10" fill="#dc2626" opacity="0.45" className="animate-career-lava" />
          <ellipse cx="0" cy="7" rx="19" ry="7.5" fill="#f97316" opacity="0.88" />
          <ellipse cx="-2" cy="6.5" rx="10" ry="4" fill="#fde047" opacity="0.92" />
          <circle cx="9" cy="4" r="2.2" fill="#fef08a" />
          <circle cx="-10" cy="9" r="1.8" fill="#fb923c" />
        </g>
      );
    case 2:
      return (
        <g key={prop.id} transform={tr}>
          <ellipse cx="0" cy="5" rx="24" ry="8" fill="#ea580c" opacity="0.32" className="animate-career-lava" />
          <path d="M -18 7 L -7 -2 L 4 5 L 18 -4" fill="none" stroke="#f97316" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M -16 6 L -7 -2 L 4 5 L 16 -3" fill="none" stroke="#fef08a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case 3:
      return (
        <g key={prop.id} transform={tr}>
          <ellipse cx="0" cy="14" rx="16" ry="5.5" fill="#090305" opacity="0.6" />
          <polygon points="-5,13 -2,-20 2,-20 5,13" fill="#27272a" />
          <rect x="-11" y="-24" width="22" height="6" rx="1.5" fill="#3f3f46" />
          <circle cx="-6" cy="-21" r="2.2" fill="#f43f5e" />
          <circle cx="0" cy="-21" r="2.2" fill="#fde047" />
          <circle cx="6" cy="-21" r="2.2" fill="#f43f5e" />
        </g>
      );
    case 4:
      return (
        <g key={prop.id} transform={tr}>
          <ellipse cx="0" cy="13" rx="23" ry="7.5" fill="#090305" opacity="0.6" />
          <polygon points="-21,12 -7,-14 7,-14 21,12" fill="#27272a" />
          <polygon points="-7,-14 7,-14 14,12 0,12" fill="#18181b" />
          <ellipse cx="0" cy="-14" rx="7" ry="3" fill="#f97316" />
          <ellipse cx="0" cy="-14" rx="3.8" ry="1.6" fill="#fef08a" />
          <path d="M -2 -12 Q -5 -2 -10 8" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    default:
      return (
        <g key={prop.id} transform={tr}>
          <ellipse cx="0" cy="13" rx="17" ry="6" fill="#090305" opacity="0.58" />
          <polygon points="-11,12 -9,-20 0,-26 9,-18 11,12" fill="#1f1f24" />
          <polygon points="0,-26 9,-18 11,12 0,12" fill="#111115" />
          <line x1="0" y1="-22" x2="0" y2="8" stroke="#fb7185" strokeWidth="1.6" opacity="0.7" />
        </g>
      );
  }
};

const renderWideFlankLandmark = (item: FlankLandmark) => {
  const tr = `translate(${item.x.toFixed(1)} ${item.y.toFixed(1)}) scale(${item.scale.toFixed(2)})`;
  if (item.chapterIndex === 0) {
    if (item.variant === 0) {
      return (
        <g key={item.id} transform={tr} opacity="0.64">
          <polygon points="-58,36 -8,-44 48,36" fill="#133829" />
          <polygon points="-8,-44 48,36 4,36" fill="#0c261c" />
          <polygon points="-8,-44 -22,-20 -10,-25 0,-18 10,-22" fill="#e2e8f0" opacity="0.75" />
        </g>
      );
    }
    if (item.variant === 1 || item.variant === 2) {
      return (
        <g key={item.id} transform={tr} opacity="0.66">
          <ellipse cx="2" cy="12" rx="34" ry="9" fill="#062016" opacity="0.45" />
          <circle cx="-14" cy="4" r="13" fill="#14532d" />
          <circle cx="14" cy="5" r="12" fill="#166534" />
          <circle cx="0" cy="-2" r="15" fill="#15803d" />
          <circle cx="-4" cy="-5" r="7" fill="#22c55e" opacity="0.55" />
          <circle cx="-11" cy="2" r="2.2" fill="#fde047" />
          <circle cx="9" cy="0" r="2" fill="#f472b6" />
        </g>
      );
    }
    return (
      <g key={item.id} transform={tr} opacity="0.58">
        <polygon points="0,-24 -16,10 16,10" fill="#14532d" />
        <polygon points="18,-18 4,12 32,12" fill="#166534" />
        <polygon points="-16,-14 -28,12 -4,12" fill="#0f5132" />
      </g>
    );
  }
  if (item.chapterIndex === 1) {
    if (item.variant === 0) {
      return (
        <g key={item.id} transform={tr} opacity="0.6">
          <polygon points="-64,28 -44,-24 38,-24 62,28" fill="#7c2d12" />
          <polygon points="-44,-24 38,-24 22,-8 -32,-8" fill="#c2410c" opacity="0.72" />
        </g>
      );
    }
    if (item.variant === 1 || item.variant === 2) {
      return (
        <g key={item.id} transform={tr} opacity="0.64">
          <path d="M -42 12 Q -10 -12 22 4 Q 38 10 46 12 Z" fill="#b45309" />
          <path d="M -32 10 Q -8 -7 16 5" fill="none" stroke="#fdba74" strokeWidth="2.2" opacity="0.55" strokeLinecap="round" />
          <circle cx="-16" cy="10" r="6" fill="#65a30d" opacity="0.65" />
          <circle cx="24" cy="11" r="5" fill="#a16207" opacity="0.72" />
        </g>
      );
    }
    return (
      <g key={item.id} transform={tr} opacity="0.5">
        <path d="M -55 18 Q -15 -14 25 6 T 75 14 L 75 28 L -55 28 Z" fill="#b45309" />
      </g>
    );
  }
  if (item.chapterIndex === 2) {
    if (item.variant === 0) {
      return (
        <g key={item.id} transform={tr} opacity="0.64">
          <polygon points="-60,34 -12,-46 52,34" fill="#1e3a5f" />
          <polygon points="-12,-46 52,34 6,34" fill="#0f2942" />
          <polygon points="-12,-46 -28,-16 -8,-22 8,-14 16,-20" fill="#bae6fd" opacity="0.82" />
        </g>
      );
    }
    if (item.variant === 1 || item.variant === 2) {
      return (
        <g key={item.id} transform={tr} opacity="0.64">
          <ellipse cx="0" cy="10" rx="38" ry="12" fill="#e0f2fe" opacity="0.4" />
          <ellipse cx="-10" cy="8" rx="22" ry="8" fill="#f0f9ff" opacity="0.5" />
          <circle cx="16" cy="7" r="7" fill="#64748b" />
          <path d="M 10 5 Q 16 -2 22 5 Z" fill="#f8fafc" />
        </g>
      );
    }
    return (
      <g key={item.id} transform={tr} opacity="0.54">
        <polygon points="-24,14 -8,-24 10,-12 24,14" fill="#38bdf8" opacity="0.48" />
        <polygon points="-8,-24 10,-12 2,14" fill="#e0f2fe" opacity="0.58" />
      </g>
    );
  }
  if (item.variant === 0) {
    return (
      <g key={item.id} transform={tr} opacity="0.72">
        <polygon points="-64,34 -14,-44 12,-44 62,34" fill="#1c0b10" />
        <polygon points="-14,-44 12,-44 26,34 -4,34" fill="#2c0f16" />
        <ellipse cx="-1" cy="-44" rx="14" ry="4.5" fill="#f97316" opacity="0.8" className="animate-career-lava" />
      </g>
    );
  }
  if (item.variant === 1 || item.variant === 2) {
    return (
      <g key={item.id} transform={tr} opacity="0.66">
        <path d="M -36 14 Q -8 -10 18 4 Q 32 10 40 14 Z" fill="#27272a" />
        <ellipse cx="-6" cy="11" rx="12" ry="3.5" fill="#f97316" opacity="0.32" />
        <circle cx="14" cy="9" r="4" fill="#18181b" />
      </g>
    );
  }
  return (
    <g key={item.id} transform={tr} opacity="0.56">
      <path d="M -36 12 L -10 -4 L 12 8 L 38 -8" fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
    </g>
  );
};

const renderMicroFoliage = (item: MicroFoliage) => {
  const sx = item.flip ? -item.scale : item.scale;
  const tr = `translate(${item.x.toFixed(1)} ${item.y.toFixed(1)}) scale(${sx.toFixed(2)} ${item.scale.toFixed(2)})`;

  if (item.chapterIndex === 0) {
    switch (item.variant) {
      case 0:
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="4" rx="9" ry="3" fill="#052e16" opacity="0.45" />
            <path d="M -6 3 Q -9 -5 -11 -9" fill="none" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M -2 3 Q -3 -7 -4 -12" fill="none" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 2 3 Q 4 -6 7 -11" fill="none" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 6 3 Q 9 -3 11 -6" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
          </g>
        );
      case 1:
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="6" rx="14" ry="4.5" fill="#041c10" opacity="0.48" />
            <circle cx="-7" cy="2" r="6.5" fill="#14532d" />
            <circle cx="7" cy="2.5" r="6" fill="#166534" />
            <circle cx="0" cy="-2" r="7.5" fill="#15803d" />
            <circle cx="-2" cy="-4.5" r="3.8" fill="#4ade80" opacity="0.55" />
            <circle cx="-6" cy="0" r="1.4" fill="#fde047" />
            <circle cx="5" cy="-1" r="1.4" fill="#fb7185" />
          </g>
        );
      case 2:
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="2" rx="13" ry="6" fill="#15803d" opacity="0.45" />
            <circle cx="-7" cy="1" r="2" fill="#fef08a" />
            <circle cx="-1" cy="-2" r="1.8" fill="#ffffff" />
            <circle cx="6" cy="2" r="2" fill="#38bdf8" />
            <circle cx="3" cy="5" r="1.6" fill="#fde047" />
            <circle cx="-5" cy="5" r="1.6" fill="#f472b6" />
          </g>
        );
      case 3:
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="5" rx="12" ry="4" fill="#04190f" opacity="0.42" />
            <ellipse cx="-5" cy="2" rx="5.5" ry="3.8" fill="#64748b" />
            <ellipse cx="-6" cy="0.8" rx="2.8" ry="1.6" fill="#94a3b8" />
            <ellipse cx="4" cy="3.5" rx="4.5" ry="3" fill="#475569" />
            <path d="M -9 3 Q -11 -2 -12 -5" fill="none" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        );
      case 4:
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="4" rx="10" ry="3.5" fill="#052e16" opacity="0.4" />
            <path d="M 0 3 Q -9 -1 -13 -6" fill="none" stroke="#16a34a" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M 0 3 Q -5 -5 -7 -11" fill="none" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 0 3 Q 5 -5 8 -10" fill="none" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 0 3 Q 9 -1 13 -5" fill="none" stroke="#15803d" strokeWidth="2.4" strokeLinecap="round" />
          </g>
        );
      default:
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="5" rx="10" ry="3.8" fill="#051c11" opacity="0.48" />
            <rect x="-5.5" y="-2" width="11" height="6.5" rx="2" fill="#78350f" />
            <ellipse cx="0" cy="-2" rx="5.5" ry="2.2" fill="#d97706" />
            <rect x="6.5" y="1" width="1.8" height="3.5" fill="#fef3c7" />
            <path d="M 4.5 1.5 Q 7.4 -2.5 10.3 1.5 Z" fill="#ef4444" />
          </g>
        );
    }
  }

  if (item.chapterIndex === 1) {
    switch (item.variant) {
      case 0:
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="6" rx="15" ry="4.5" fill="#2c1005" opacity="0.45" />
            <path d="M -14 5 Q -4 -7 7 -2 Q 12 1 15 5 Z" fill="#d97706" />
            <path d="M -11 4 Q -3 -5 5 -1" fill="none" stroke="#fde68a" strokeWidth="2" strokeLinecap="round" opacity="0.72" />
          </g>
        );
      case 1:
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="5" rx="11" ry="3.8" fill="#290e04" opacity="0.44" />
            <circle cx="-5" cy="1" r="5" fill="#854d0e" opacity="0.9" />
            <circle cx="5" cy="1.5" r="4.8" fill="#a16207" opacity="0.9" />
            <circle cx="0" cy="-2" r="5.5" fill="#65a30d" opacity="0.82" />
          </g>
        );
      case 2:
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="5" rx="12" ry="4" fill="#290f05" opacity="0.44" />
            <polygon points="-10,4 -6,-3 1,-2 4,4" fill="#9a3412" />
            <polygon points="-6,-3 1,-2 -1,1 -7,1" fill="#ea580c" />
            <ellipse cx="7" cy="3.5" rx="4" ry="2.6" fill="#b45309" />
          </g>
        );
      case 3:
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="6" rx="10" ry="3.4" fill="#290f05" opacity="0.45" />
            <ellipse cx="-4" cy="0" rx="4.5" ry="6" fill="#4d7c0f" transform="rotate(-14 -4 0)" />
            <ellipse cx="4.5" cy="1" rx="4" ry="5.5" fill="#3f6212" transform="rotate(18 4.5 1)" />
            <circle cx="-4.5" cy="-6" r="2.1" fill="#fde047" />
          </g>
        );
      case 4:
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="2" rx="14" ry="6.5" fill="#9a3412" opacity="0.34" />
            <path d="M -9 1 L -2 -2 L 4 2 L 10 -1 M -2 -2 L -1 5" fill="none" stroke="#431407" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
          </g>
        );
      default:
        return (
          <g key={item.id} transform={tr}>
            <path d="M -14 0 Q -4 -5 6 0 T 16 -2" fill="none" stroke="#fbbf24" strokeWidth="2.4" strokeLinecap="round" opacity="0.62" />
            <path d="M -11 5 Q -1 1 8 5 T 15 4" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" opacity="0.52" />
          </g>
        );
    }
  }

  if (item.chapterIndex === 2) {
    switch (item.variant) {
      case 0:
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="6" rx="15" ry="4.8" fill="#041322" opacity="0.45" />
            <path d="M -14 5 Q -5 -6 5 -2 Q 11 0 14 5 Z" fill="#cbd5e1" />
            <path d="M -11 4 Q -4 -5 4 -1 Q 9 1 11 4 Z" fill="#f8fafc" />
          </g>
        );
      case 1:
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="6" rx="12" ry="4" fill="#041322" opacity="0.45" />
            <circle cx="-5.5" cy="2" r="5.5" fill="#475569" />
            <circle cx="5.5" cy="2" r="5" fill="#64748b" />
            <circle cx="0" cy="-1.5" r="6" fill="#94a3b8" />
            <path d="M -9 0 Q -4 -6 2 -5 Q 7 -5 9 0 Q 3 -2 -3 -2 Z" fill="#f8fafc" />
          </g>
        );
      case 2:
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="5" rx="10" ry="3.5" fill="#031221" opacity="0.45" />
            <polygon points="-8,5 -5,-6 -1,5" fill="#38bdf8" opacity="0.82" />
            <polygon points="-2,5 2,-10 7,5" fill="#7dd3fc" opacity="0.9" />
            <polygon points="2,-10 7,5 2,5" fill="#e0f2fe" opacity="0.92" />
          </g>
        );
      case 3:
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="5" rx="12" ry="4" fill="#041322" opacity="0.45" />
            <ellipse cx="-4" cy="2" rx="5.5" ry="3.8" fill="#475569" />
            <path d="M -9 1.5 Q -4 -3 1 1.5 Z" fill="#e2e8f0" />
            <ellipse cx="5" cy="3.5" rx="4.2" ry="2.8" fill="#334155" />
          </g>
        );
      case 4:
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="2" rx="13" ry="5.5" fill="#7dd3fc" opacity="0.28" />
            <path d="M -4 -2 L -4 4 M -7 1 L -1 1" stroke="#e0f2fe" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M 6 -1 L 6 3 M 4 1 L 8 1" stroke="#bae6fd" strokeWidth="1.4" strokeLinecap="round" />
          </g>
        );
      default:
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="6" rx="8" ry="3" fill="#041322" opacity="0.45" />
            <rect x="-1.5" y="1" width="3" height="5" fill="#334155" />
            <polygon points="0,-11 -8,2 8,2" fill="#64748b" />
            <polygon points="0,-14 -6,-4 6,-4" fill="#e2e8f0" />
          </g>
        );
    }
  }

  switch (item.variant) {
    case 0:
      return (
        <g key={item.id} transform={tr}>
          <ellipse cx="0" cy="6" rx="14" ry="4.5" fill="#090305" opacity="0.58" />
          <path d="M -13 5 Q -4 -6 6 -1 Q 11 2 13 5 Z" fill="#27272a" />
          <path d="M -8 4 Q -3 -3 3 1" fill="none" stroke="#52525b" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="5" cy="4" r="1.6" fill="#f97316" />
        </g>
      );
    case 1:
      return (
        <g key={item.id} transform={tr}>
          <ellipse cx="0" cy="5" rx="11" ry="3.8" fill="#090305" opacity="0.55" />
          <polygon points="-9,4 -5,-3 1,-2 4,4" fill="#18181b" />
          <polygon points="-5,-3 1,-2 -1,1 -6,1" fill="#3f3f46" />
          <polygon points="4,4 7,-1 11,4" fill="#27272a" />
          <circle cx="2" cy="4.5" r="1.4" fill="#fb923c" opacity="0.85" />
        </g>
      );
    case 2:
      return (
        <g key={item.id} transform={tr}>
          <ellipse cx="0" cy="2" rx="12" ry="4.5" fill="#ea580c" opacity="0.28" />
          <path d="M -10 3 L -3 -1 L 3 2 L 10 -2" fill="none" stroke="#f97316" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M -8 2.5 L -3 -1 L 3 2 L 8 -1.5" fill="none" stroke="#fef08a" strokeWidth="1" strokeLinecap="round" />
        </g>
      );
    case 3:
      return (
        <g key={item.id} transform={tr}>
          <ellipse cx="0" cy="4" rx="11" ry="4" fill="#dc2626" opacity="0.28" />
          <circle cx="-5" cy="2" r="3" fill="#27272a" />
          <circle cx="-5" cy="2" r="1.5" fill="#f97316" />
          <circle cx="4" cy="3" r="3.4" fill="#18181b" />
          <circle cx="4" cy="3" r="1.7" fill="#fde047" />
        </g>
      );
    case 4:
      return (
        <g key={item.id} transform={tr}>
          <ellipse cx="0" cy="5" rx="9" ry="3" fill="#090305" opacity="0.5" />
          <path d="M 0 4 L -7 -4 M 0 4 L -2 -7 M 0 4 L 6 -5" fill="none" stroke="#3f3f46" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="-2" cy="-7" r="1.2" fill="#f97316" />
          <circle cx="6" cy="-5" r="1.1" fill="#fb7185" />
        </g>
      );
    default:
      return (
        <g key={item.id} transform={tr}>
          <ellipse cx="0" cy="4" rx="10" ry="3.6" fill="#090305" opacity="0.55" />
          <ellipse cx="-4" cy="2" rx="4.2" ry="2.6" fill="#7f1d1d" />
          <ellipse cx="-4" cy="1.6" rx="2" ry="1.1" fill="#f97316" />
          <ellipse cx="5" cy="3" rx="3.8" ry="2.4" fill="#9a3412" />
          <ellipse cx="5" cy="2.6" rx="1.6" ry="1" fill="#fde047" />
        </g>
      );
  }
};

function rangesOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  return a1 >= b0 && a0 <= b1;
}

export const CareerMapScenery: React.FC<CareerMapSceneryProps> = React.memo(
  ({
    worldWidth,
    mapHeight,
    levelCoords,
    highestUnlockedLevel,
    boundaries,
    gantryYs,
  }) => {
    const centerX = worldWidth * 0.5;

    // Fit SVG raster width to the active viewport (+ small side bleed) so narrow mobile phones
    // don't rasterize 1000+ invisible off-screen horizontal pixels per tile.
    const [renderWidth, setRenderWidth] = useState<number>(() => {
      if (typeof window === 'undefined') return worldWidth;
      return Math.min(worldWidth, Math.max(520, Math.ceil(window.innerWidth + 120)));
    });

    useEffect(() => {
      const onResize = () => {
        const next = Math.min(
          worldWidth,
          Math.max(520, Math.ceil(window.innerWidth + 120)),
        );
        setRenderWidth((prev) => (Math.abs(prev - next) >= 32 ? next : prev));
      };
      window.addEventListener('resize', onResize, { passive: true });
      return () => window.removeEventListener('resize', onResize);
    }, [worldWidth]);

    const viewMinX = (worldWidth - renderWidth) * 0.5;
    const viewMaxX = viewMinX + renderWidth;

    const bands = useMemo<SceneryBandSpec[]>(() => {
      const result: SceneryBandSpec[] = [];
      let index = 0;
      for (let top = 0; top < mapHeight; top += BAND_HEIGHT) {
        const bottom = Math.min(mapHeight, top + BAND_HEIGHT);
        result.push({ index, top, bottom, height: bottom - top });
        index++;
      }
      return result;
    }, [mapHeight]);

    const bridges = useMemo(
      () => [
        computeMidpointBridge(levelCoords, 9, '#64748b', '#e2e8f0', '#38bdf8'),
        computeMidpointBridge(levelCoords, 34, '#78350f', '#f59e0b', '#fb923c'),
        computeMidpointBridge(levelCoords, 60, '#334155', '#bae6fd', '#38bdf8'),
        computeMidpointBridge(levelCoords, 85, '#27272a', '#f43f5e', '#f97316'),
      ],
      [levelCoords],
    );

    const bridgeYs = useMemo(() => bridges.map((b) => b.y), [bridges]);

    const sceneryProps = useMemo(
      () =>
        generateSceneryProps(
          levelCoords,
          worldWidth,
          boundaries,
          gantryYs,
          bridgeYs,
        ),
      [levelCoords, worldWidth, boundaries, gantryYs, bridgeYs],
    );

    const terrainPatches = useMemo(
      () => generateTerrainPatches(levelCoords, worldWidth, boundaries),
      [levelCoords, worldWidth, boundaries],
    );

    const microFoliage = useMemo(
      () =>
        generateMicroFoliage(
          levelCoords,
          worldWidth,
          boundaries,
          gantryYs,
          bridgeYs,
        ),
      [levelCoords, worldWidth, boundaries, gantryYs, bridgeYs],
    );

    const roadsideBeacons = useMemo(
      () => generateRoadsideBeacons(levelCoords, boundaries),
      [levelCoords, boundaries],
    );

    const wideFlankLandmarks = useMemo(
      () =>
        generateWideFlankLandmarks(
          levelCoords,
          worldWidth,
          mapHeight,
          boundaries,
        ),
      [levelCoords, worldWidth, mapHeight, boundaries],
    );

    const clouds = useMemo(() => {
      const bandTop = boundaries.desertToAlpineY + 120;
      const bandSpan = Math.max(400, mapHeight - bandTop - 160);
      return Array.from({ length: 8 }, (_, i) => ({
        id: `cloud_${i}`,
        x: centerX - 360 + ((i * 157) % 720),
        y: bandTop + (i / 8) * bandSpan,
        scale: 0.9 + (i % 3) * 0.3,
        delay: `${-(i * 2.3).toFixed(1)}s`,
      }));
    }, [boundaries.desertToAlpineY, mapHeight, centerX]);

    const snowflakes = useMemo(() => {
      const bandTop = boundaries.volcanicToArcticY + 80;
      const bandSpan = Math.max(
        400,
        boundaries.arcticToDesertY - boundaries.volcanicToArcticY - 160,
      );
      return Array.from({ length: 24 }, (_, i) => ({
        id: `snow_${i}`,
        x: centerX - 420 + ((i * 113) % 840),
        y: bandTop + (((i * 17) % 24) / 24) * bandSpan,
        r: 2 + (i % 3) * 1.0,
        delay: `${-(i * 0.65).toFixed(2)}s`,
      }));
    }, [boundaries.volcanicToArcticY, boundaries.arcticToDesertY, centerX]);

    const embers = useMemo(() => {
      const bandSpan = Math.max(400, boundaries.volcanicToArcticY - 140);
      return Array.from({ length: 22 }, (_, i) => ({
        id: `ember_${i}`,
        x: centerX - 420 + ((i * 137) % 840),
        y: 80 + (((i * 19) % 22) / 22) * bandSpan,
        r: 2.2 + (i % 3) * 1.0,
        delay: `${-(i * 0.5).toFixed(2)}s`,
      }));
    }, [boundaries.volcanicToArcticY, centerX]);

    const [alpineBridge, desertBridge, arcticBridge, volcanicBridge] = bridges;
    const summitPt = levelCoords[levelCoords.length - 1];
    const alpineMeadowCy =
      boundaries.desertToAlpineY + (mapHeight - boundaries.desertToAlpineY) * 0.62;
    const alpineLakeCy =
      boundaries.desertToAlpineY + (mapHeight - boundaries.desertToAlpineY) * 0.36;
    const desertOasisCy =
      (boundaries.arcticToDesertY + boundaries.desertToAlpineY) * 0.5;
    const auroraY1 =
      boundaries.volcanicToArcticY +
      (boundaries.arcticToDesertY - boundaries.volcanicToArcticY) * 0.3;
    const auroraY2 =
      boundaries.volcanicToArcticY +
      (boundaries.arcticToDesertY - boundaries.volcanicToArcticY) * 0.72;

    const maxUnlockedSeg = Math.max(
      -1,
      Math.min(levelCoords.length - 2, highestUnlockedLevel - 2),
    );

    const bandData = useMemo(() => {
      const xMin = viewMinX - 95;
      const xMax = viewMaxX + 95;

      return bands.map((band) => {
        const { top, bottom } = band;
        const pad = 160;
        const yMin = top - pad;
        const yMax = bottom + pad;

        // Find road segment range overlapping [top - 160, bottom + 160]
        let segStart = levelCoords.length;
        let segEnd = -1;
        for (let i = 0; i < levelCoords.length - 1; i++) {
          const segTopY = levelCoords[i + 1].y;
          const segBotY = levelCoords[i].y;
          if (rangesOverlap(segTopY, segBotY, yMin, yMax)) {
            if (i < segStart) segStart = i;
            if (i > segEnd) segEnd = i;
          }
        }
        const fullRoadSeg =
          segStart <= segEnd
            ? buildSmoothRoadSegment(levelCoords, segStart, segEnd)
            : '';
        const unlockedEnd = Math.min(segEnd, maxUnlockedSeg);
        const unlockedRoadSeg =
          highestUnlockedLevel > 1 && segStart <= unlockedEnd
            ? buildSmoothRoadSegment(levelCoords, segStart, unlockedEnd)
            : '';

        // Biome ground texture vertical intersections (no expensive <mask>!)
        const biomeSlices: Array<{
          kind: 'volcanic' | 'arctic' | 'desert' | 'alpine';
          y: number;
          h: number;
        }> = [];
        const addSlice = (
          kind: 'volcanic' | 'arctic' | 'desert' | 'alpine',
          b0: number,
          b1: number,
        ) => {
          const y0 = Math.max(top, b0);
          const y1 = Math.min(bottom, b1);
          if (y1 - y0 > 0.5) {
            biomeSlices.push({ kind, y: y0, h: y1 - y0 });
          }
        };
        addSlice('volcanic', 0, boundaries.volcanicToArcticY);
        addSlice('arctic', boundaries.volcanicToArcticY, boundaries.arcticToDesertY);
        addSlice('desert', boundaries.arcticToDesertY, boundaries.desertToAlpineY);
        addSlice('alpine', boundaries.desertToAlpineY, mapHeight);

        const inBandXY = (x: number, y: number, marginY: number) =>
          x >= xMin && x <= xMax && y >= top - marginY && y <= bottom + marginY;

        return {
          band,
          fullRoadSeg,
          unlockedRoadSeg,
          biomeSlices,
          hasVolcanicSlice: biomeSlices.some((s) => s.kind === 'volcanic'),
          hasArcticSlice: biomeSlices.some((s) => s.kind === 'arctic'),
          hasDesertSlice: biomeSlices.some((s) => s.kind === 'desert'),
          hasAlpineSlice: biomeSlices.some((s) => s.kind === 'alpine'),
          showSummit: rangesOverlap(summitPt.y - 240, summitPt.y + 160, top, bottom),
          showAlpineMeadow: rangesOverlap(alpineMeadowCy - 220, alpineMeadowCy + 220, top, bottom),
          showAlpineLake: rangesOverlap(alpineLakeCy - 170, alpineLakeCy + 170, top, bottom),
          showAlpineRiver: rangesOverlap(alpineBridge.y - 260, alpineBridge.y + 260, top, bottom),
          showDesertGorge: rangesOverlap(desertBridge.y - 240, desertBridge.y + 240, top, bottom),
          showDesertOasis: rangesOverlap(desertOasisCy - 120, desertOasisCy + 120, top, bottom),
          showArcticFjord: rangesOverlap(arcticBridge.y - 240, arcticBridge.y + 240, top, bottom),
          showArcticAurora: rangesOverlap(
            boundaries.volcanicToArcticY,
            boundaries.arcticToDesertY,
            top,
            bottom,
          ),
          showVolcanicRiver: rangesOverlap(
            volcanicBridge.y - 240,
            volcanicBridge.y + 240,
            top,
            bottom,
          ),
          landmarks: wideFlankLandmarks.filter((item) => inBandXY(item.x, item.y, 90)),
          patches: terrainPatches.filter((tp) => inBandXY(tp.x, tp.y, 60)),
          foliage: microFoliage.filter((item) => inBandXY(item.x, item.y, 40)),
          props: sceneryProps.filter((prop) => inBandXY(prop.x, prop.y, 70)),
          bandBridges: bridges.filter((br) => br.y >= top - 90 && br.y <= bottom + 90),
          beacons: roadsideBeacons.filter((b) => inBandXY(b.x, b.y, 32)),
          bandClouds: clouds.filter((c) => inBandXY(c.x, c.y, 60)),
          bandSnow: snowflakes.filter((sf) => inBandXY(sf.x, sf.y, 110)),
          bandEmbers: embers.filter((em) => inBandXY(em.x, em.y, 110)),
        };
      });
    }, [
      bands,
      viewMinX,
      viewMaxX,
      levelCoords,
      maxUnlockedSeg,
      highestUnlockedLevel,
      boundaries,
      mapHeight,
      summitPt.y,
      alpineMeadowCy,
      alpineLakeCy,
      alpineBridge.y,
      desertBridge.y,
      desertOasisCy,
      arcticBridge.y,
      volcanicBridge.y,
      wideFlankLandmarks,
      terrainPatches,
      microFoliage,
      sceneryProps,
      bridges,
      roadsideBeacons,
      clouds,
      snowflakes,
      embers,
    ]);

    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {bandData.map((bd) => {
          const idSuffix = `b${bd.band.index}`;
          const glowId = `roadGlowActive_${idSuffix}`;
          const calderaId = `volcanicCalderaGlow_${idSuffix}`;
          const auroraId = `auroraCurtainA_${idSuffix}`;
          const lakeId = `alpineLakeGrad_${idSuffix}`;
          const lavaId = `lavaRiverGrad_${idSuffix}`;
          const patVolcId = `volcanicGroundPat_${idSuffix}`;
          const patArcId = `arcticGroundPat_${idSuffix}`;
          const patDesId = `desertGroundPat_${idSuffix}`;
          const patAlpId = `alpineGroundPat_${idSuffix}`;

          return (
            <svg
              key={bd.band.index}
              width={renderWidth}
              height={bd.band.height}
              viewBox={`${viewMinX} ${bd.band.top} ${renderWidth} ${bd.band.height}`}
              className="pointer-events-none absolute left-1/2 block -translate-x-1/2"
              style={{
                top: `${bd.band.top}px`,
                contain: 'layout style paint',
              }}
            >
              <defs>
                {bd.showSummit && (
                  <radialGradient id={calderaId} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fde047" stopOpacity="0.85" />
                    <stop offset="35%" stopColor="#f97316" stopOpacity="0.52" />
                    <stop offset="72%" stopColor="#dc2626" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
                  </radialGradient>
                )}
                {bd.showArcticAurora && (
                  <linearGradient id={auroraId} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
                    <stop offset="28%" stopColor="#2dd4bf" stopOpacity="0.34" />
                    <stop offset="62%" stopColor="#38bdf8" stopOpacity="0.4" />
                    <stop offset="85%" stopColor="#a855f7" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                  </linearGradient>
                )}
                {bd.showAlpineLake && (
                  <linearGradient id={lakeId} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity="0.62" />
                    <stop offset="55%" stopColor="#0ea5e9" stopOpacity="0.46" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.32" />
                  </linearGradient>
                )}
                {bd.showVolcanicRiver && (
                  <linearGradient id={lavaId} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#dc2626" />
                    <stop offset="50%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#fde047" />
                  </linearGradient>
                )}
                {bd.unlockedRoadSeg && (
                  <linearGradient
                    id={glowId}
                    gradientUnits="userSpaceOnUse"
                    x1="0"
                    y1={mapHeight}
                    x2="0"
                    y2="0"
                  >
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="35%" stopColor="#f59e0b" />
                    <stop offset="70%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#f43f5e" />
                  </linearGradient>
                )}

                {bd.hasAlpineSlice && (
                  <pattern id={patAlpId} width="140" height="140" patternUnits="userSpaceOnUse">
                    <ellipse cx="32" cy="44" rx="20" ry="8" fill="#22c55e" opacity="0.08" />
                    <ellipse cx="104" cy="108" rx="22" ry="9" fill="#15803d" opacity="0.1" />
                    <path d="M 18 32 L 15 24 M 21 32 L 22 23 M 24 32 L 27 25" stroke="#4ade80" strokeWidth="1.4" strokeLinecap="round" opacity="0.28" />
                    <path d="M 88 64 L 85 57 M 91 64 L 92 55 M 94 64 L 97 58" stroke="#22c55e" strokeWidth="1.4" strokeLinecap="round" opacity="0.26" />
                    <circle cx="42" cy="42" r="1.6" fill="#fde047" opacity="0.34" />
                    <circle cx="118" cy="34" r="1.4" fill="#ffffff" opacity="0.24" />
                    <circle cx="102" cy="106" r="1.6" fill="#38bdf8" opacity="0.28" />
                  </pattern>
                )}
                {bd.hasDesertSlice && (
                  <pattern id={patDesId} width="150" height="140" patternUnits="userSpaceOnUse">
                    <path d="M 12 34 Q 36 26 60 34 T 108 34" fill="none" stroke="#fdba74" strokeWidth="2" strokeLinecap="round" opacity="0.16" />
                    <path d="M 48 92 Q 76 84 104 92 T 144 90" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" opacity="0.15" />
                    <path d="M 14 114 Q 26 104 38 114 Z" fill="#d97706" opacity="0.2" />
                    <circle cx="76" cy="54" r="2.2" fill="#9a3412" opacity="0.28" />
                    <circle cx="30" cy="74" r="1.8" fill="#7c2d12" opacity="0.28" />
                  </pattern>
                )}
                {bd.hasArcticSlice && (
                  <pattern id={patArcId} width="150" height="140" patternUnits="userSpaceOnUse">
                    <ellipse cx="38" cy="40" rx="24" ry="8" fill="#e0f2fe" opacity="0.12" />
                    <ellipse cx="110" cy="102" rx="26" ry="9" fill="#bae6fd" opacity="0.1" />
                    <path d="M 76 30 L 88 38 L 82 48" fill="none" stroke="#7dd3fc" strokeWidth="1.2" opacity="0.22" />
                    <path d="M 24 98 L 24 104 M 21 101 L 27 101" stroke="#f0f9ff" strokeWidth="1.3" strokeLinecap="round" opacity="0.34" />
                    <circle cx="62" cy="84" r="1.5" fill="#ffffff" opacity="0.28" />
                  </pattern>
                )}
                {bd.hasVolcanicSlice && (
                  <pattern id={patVolcId} width="150" height="140" patternUnits="userSpaceOnUse">
                    <path d="M 18 42 Q 30 33 42 42 Z" fill="#27272a" opacity="0.34" />
                    <path d="M 102 104 Q 116 94 130 104 Z" fill="#18181b" opacity="0.38" />
                    <path d="M 68 58 L 80 52 L 90 60" fill="none" stroke="#f97316" strokeWidth="1.4" strokeLinecap="round" opacity="0.22" />
                    <circle cx="34" cy="96" r="2" fill="#27272a" opacity="0.45" />
                    <circle cx="40" cy="98" r="1.2" fill="#fb923c" opacity="0.38" />
                  </pattern>
                )}
              </defs>

              {/* 1. Direct Biome Surface Ground Textures (zero <mask> offscreen passes!) */}
              {bd.biomeSlices.map((sl) => {
                const patUrl =
                  sl.kind === 'volcanic'
                    ? `url(#${patVolcId})`
                    : sl.kind === 'arctic'
                      ? `url(#${patArcId})`
                      : sl.kind === 'desert'
                        ? `url(#${patDesId})`
                        : `url(#${patAlpId})`;
                return (
                  <rect
                    key={sl.kind}
                    x={viewMinX}
                    y={sl.y}
                    width={renderWidth}
                    height={sl.h}
                    fill={patUrl}
                  />
                );
              })}

              {/* 2. Volcanic Summit Caldera Crown behind Level 100 */}
              {bd.showSummit && (
                <g transform={`translate(${summitPt.x} ${summitPt.y - 34})`}>
                  <ellipse cx="0" cy="-10" rx="340" ry="155" fill={`url(#${calderaId})`} className="animate-career-lava" />
                  <polygon points="-290,95 -125,-95 125,-95 290,95" fill="#18070b" opacity="0.82" />
                  <polygon points="-200,95 -95,-72 95,-72 200,95" fill="#2a0c12" opacity="0.86" />
                  <ellipse cx="0" cy="-72" rx="108" ry="26" fill="#ea580c" opacity="0.85" />
                  <ellipse cx="0" cy="-72" rx="68" ry="15" fill="#fde047" opacity="0.88" />
                </g>
              )}

              {/* 3. Large Topographic Lakes, Oases & Rivers routed cleanly beneath the 4 Midpoint Bridges */}
              {bd.showAlpineMeadow && (
                <ellipse
                  cx={centerX - 310}
                  cy={alpineMeadowCy}
                  rx="260"
                  ry="200"
                  fill="#15803d"
                  opacity="0.16"
                />
              )}
              {bd.showAlpineLake && (
                <ellipse
                  cx={centerX + 340}
                  cy={alpineLakeCy}
                  rx="210"
                  ry="140"
                  fill={`url(#${lakeId})`}
                />
              )}
              {bd.showAlpineRiver && (
                <>
                  <path
                    d={`M ${worldWidth + 40} ${alpineBridge.y + 185} C ${alpineBridge.x + 340} ${alpineBridge.y + 65}, ${alpineBridge.x - 340} ${alpineBridge.y - 65}, -40 ${alpineBridge.y - 195}`}
                    fill="none"
                    stroke="#0284c7"
                    strokeOpacity="0.42"
                    strokeWidth="62"
                    strokeLinecap="round"
                  />
                  <path
                    d={`M ${worldWidth + 40} ${alpineBridge.y + 185} C ${alpineBridge.x + 340} ${alpineBridge.y + 65}, ${alpineBridge.x - 340} ${alpineBridge.y - 65}, -40 ${alpineBridge.y - 195}`}
                    fill="none"
                    stroke="#38bdf8"
                    strokeOpacity="0.48"
                    strokeWidth="26"
                    strokeLinecap="round"
                  />
                  <path
                    d={`M ${worldWidth + 40} ${alpineBridge.y + 185} C ${alpineBridge.x + 340} ${alpineBridge.y + 65}, ${alpineBridge.x - 340} ${alpineBridge.y - 65}, -40 ${alpineBridge.y - 195}`}
                    fill="none"
                    stroke="#e0f2fe"
                    strokeOpacity="0.38"
                    strokeWidth="5"
                    strokeDasharray="18 28"
                    strokeLinecap="round"
                  />
                </>
              )}

              {bd.showDesertGorge && (
                <>
                  <path
                    d={`M -40 ${desertBridge.y + 160} C ${desertBridge.x - 320} ${desertBridge.y + 52}, ${desertBridge.x + 320} ${desertBridge.y - 52}, ${worldWidth + 40} ${desertBridge.y - 170}`}
                    fill="none"
                    stroke="#3b1306"
                    strokeOpacity="0.6"
                    strokeWidth="68"
                    strokeLinecap="round"
                  />
                  <path
                    d={`M -40 ${desertBridge.y + 160} C ${desertBridge.x - 320} ${desertBridge.y + 52}, ${desertBridge.x + 320} ${desertBridge.y - 52}, ${worldWidth + 40} ${desertBridge.y - 170}`}
                    fill="none"
                    stroke="#7c2d12"
                    strokeOpacity="0.52"
                    strokeWidth="36"
                    strokeLinecap="round"
                  />
                </>
              )}
              {bd.showDesertOasis && (
                <>
                  <ellipse
                    cx={centerX - 360}
                    cy={desertOasisCy}
                    rx="145"
                    ry="84"
                    fill="#15803d"
                    opacity="0.34"
                  />
                  <ellipse
                    cx={centerX - 360}
                    cy={desertOasisCy}
                    rx="100"
                    ry="54"
                    fill="#0ea5e9"
                    opacity="0.52"
                  />
                </>
              )}

              {bd.showArcticFjord && (
                <>
                  <path
                    d={`M -40 ${arcticBridge.y - 150} C ${arcticBridge.x - 320} ${arcticBridge.y - 45}, ${arcticBridge.x + 320} ${arcticBridge.y + 45}, ${worldWidth + 40} ${arcticBridge.y + 165}`}
                    fill="none"
                    stroke="#0c4a6e"
                    strokeOpacity="0.6"
                    strokeWidth="66"
                    strokeLinecap="round"
                  />
                  <path
                    d={`M -40 ${arcticBridge.y - 150} C ${arcticBridge.x - 320} ${arcticBridge.y - 45}, ${arcticBridge.x + 320} ${arcticBridge.y + 45}, ${worldWidth + 40} ${arcticBridge.y + 165}`}
                    fill="none"
                    stroke="#7dd3fc"
                    strokeOpacity="0.46"
                    strokeWidth="26"
                    strokeLinecap="round"
                  />
                </>
              )}
              {bd.showArcticAurora && (
                <g className="animate-career-aurora">
                  <path
                    d={`M -40 ${auroraY1} C ${centerX - 360} ${boundaries.volcanicToArcticY + 520}, ${centerX + 260} ${boundaries.volcanicToArcticY + 720}, ${worldWidth + 40} ${boundaries.volcanicToArcticY + 460}`}
                    fill="none"
                    stroke={`url(#${auroraId})`}
                    strokeWidth="110"
                    strokeLinecap="round"
                  />
                  <path
                    d={`M -40 ${auroraY2} C ${centerX - 240} ${boundaries.arcticToDesertY - 460}, ${centerX + 320} ${boundaries.arcticToDesertY - 620}, ${worldWidth + 40} ${boundaries.arcticToDesertY - 380}`}
                    fill="none"
                    stroke={`url(#${auroraId})`}
                    strokeWidth="92"
                    strokeLinecap="round"
                  />
                </g>
              )}

              {bd.showVolcanicRiver && (
                <g className="animate-career-lava">
                  <path
                    d={`M -40 ${volcanicBridge.y + 165} C ${volcanicBridge.x - 320} ${volcanicBridge.y + 55}, ${volcanicBridge.x + 320} ${volcanicBridge.y - 55}, ${worldWidth + 40} ${volcanicBridge.y - 165}`}
                    fill="none"
                    stroke="#dc2626"
                    strokeOpacity="0.56"
                    strokeWidth="54"
                    strokeLinecap="round"
                  />
                  <path
                    d={`M -40 ${volcanicBridge.y + 165} C ${volcanicBridge.x - 320} ${volcanicBridge.y + 55}, ${volcanicBridge.x + 320} ${volcanicBridge.y - 55}, ${worldWidth + 40} ${volcanicBridge.y - 165}`}
                    fill="none"
                    stroke={`url(#${lavaId})`}
                    strokeOpacity="0.88"
                    strokeWidth="22"
                    strokeLinecap="round"
                  />
                  <path
                    d={`M -40 ${volcanicBridge.y + 165} C ${volcanicBridge.x - 320} ${volcanicBridge.y + 55}, ${volcanicBridge.x + 320} ${volcanicBridge.y - 55}, ${worldWidth + 40} ${volcanicBridge.y - 165}`}
                    fill="none"
                    stroke="#fef08a"
                    strokeOpacity="0.85"
                    strokeWidth="5.5"
                    strokeDasharray="24 22"
                    strokeLinecap="round"
                  />
                </g>
              )}

              {/* 4. Wide Panoramic Mountains & Silhouettes */}
              {bd.landmarks.map(renderWideFlankLandmark)}

              {/* 5. Soft Terrain Contour Patches */}
              {bd.patches.map((tp) => {
                const fill =
                  tp.chapterIndex === 0
                    ? tp.tone === 0
                      ? '#16a34a'
                      : '#15803d'
                    : tp.chapterIndex === 1
                      ? tp.tone === 0
                        ? '#d97706'
                        : '#b45309'
                      : tp.chapterIndex === 2
                        ? tp.tone === 0
                          ? '#bae6fd'
                          : '#7dd3fc'
                        : tp.tone === 0
                          ? '#27272a'
                          : '#431407';
                return (
                  <ellipse
                    key={tp.id}
                    cx={tp.x.toFixed(1)}
                    cy={tp.y.toFixed(1)}
                    rx={tp.rx}
                    ry={tp.ry}
                    fill={fill}
                    opacity={tp.chapterIndex === 2 ? '0.14' : '0.2'}
                    transform={`rotate(${tp.rot} ${tp.x.toFixed(1)} ${tp.y.toFixed(1)})`}
                  />
                );
              })}

              {/* 6. Road-Clear Micro Foliage & Detailed Biome Props */}
              {bd.foliage.map(renderMicroFoliage)}
              {bd.props.map(renderBiomeProp)}

              {/* 7. Tangent-Aligned Midpoint Highway Bridges */}
              {bd.bandBridges.map((br, idx) => (
                <g
                  key={`bridge_${bd.band.index}_${idx}`}
                  transform={`translate(${br.x.toFixed(1)} ${br.y.toFixed(1)}) rotate(${br.angleDeg.toFixed(1)})`}
                >
                  <rect x="-46" y="-56" width="92" height="112" rx="10" fill={br.deck} opacity="0.95" />
                  <rect x="-46" y="-56" width="7.5" height="112" rx="3" fill={br.rail} />
                  <rect x="38.5" y="-56" width="7.5" height="112" rx="3" fill={br.rail} />
                  {[-40, -14, 14, 40].map((py) => (
                    <g key={py}>
                      <circle cx="-42.2" cy={py} r="2.8" fill={br.glow} />
                      <circle cx="42.2" cy={py} r="2.8" fill={br.glow} />
                    </g>
                  ))}
                </g>
              ))}

              {/* 8. Roadside Streetlamps & Light Pools */}
              {bd.beacons.map((b) => (
                <g key={b.id} transform={`translate(${b.x.toFixed(1)} ${b.y.toFixed(1)})`}>
                  <circle cx="0" cy="0" r="16" fill={b.color} opacity="0.16" />
                  <circle cx="0" cy="0" r="6.5" fill={b.color} opacity="0.34" />
                  <circle cx="0" cy="0" r="2.4" fill="#ffffff" opacity="0.92" />
                </g>
              ))}

              {/* 9. Crisp Aspect-True Multi-Layer Racing Highway (layered shadow strokes instead of costly feDropShadow!) */}
              {bd.fullRoadSeg && (
                <>
                  <path
                    d={bd.fullRoadSeg}
                    fill="none"
                    stroke="#000000"
                    strokeOpacity="0.22"
                    strokeWidth="92"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    transform="translate(0 7)"
                  />
                  <path
                    d={bd.fullRoadSeg}
                    fill="none"
                    stroke="#000000"
                    strokeOpacity="0.34"
                    strokeWidth="82"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    transform="translate(0 4)"
                  />
                  <path
                    d={bd.fullRoadSeg}
                    fill="none"
                    stroke="#090d16"
                    strokeWidth="76"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={bd.fullRoadSeg}
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="64"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.82"
                  />
                  <path
                    d={bd.fullRoadSeg}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="62"
                    strokeDasharray="10 38"
                    strokeLinecap="butt"
                    opacity="0.28"
                  />
                  <path
                    d={bd.fullRoadSeg}
                    fill="none"
                    stroke="#141418"
                    strokeWidth="54"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={bd.fullRoadSeg}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="46"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.24"
                  />
                  <path
                    d={bd.fullRoadSeg}
                    fill="none"
                    stroke="#1d1e24"
                    strokeWidth="42"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}
              {bd.unlockedRoadSeg && (
                <>
                  <path
                    d={bd.unlockedRoadSeg}
                    fill="none"
                    stroke={`url(#${glowId})`}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.28"
                  />
                  <path
                    d={bd.unlockedRoadSeg}
                    fill="none"
                    stroke={`url(#${glowId})`}
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.76"
                  />
                </>
              )}
              {bd.fullRoadSeg && (
                <path
                  d={bd.fullRoadSeg}
                  fill="none"
                  stroke="#fde047"
                  strokeWidth="2.8"
                  strokeDasharray="13 15"
                  strokeLinecap="round"
                  opacity="0.88"
                />
              )}

              {/* 10. Atmospheric Particles (Clouds, Snow, Embers) */}
              {bd.bandClouds.map((c) => (
                <g key={c.id} transform={`translate(${c.x} ${c.y}) scale(${c.scale})`}>
                  <g className="animate-career-cloud" style={{ animationDelay: c.delay }}>
                    <ellipse cx="0" cy="0" rx="52" ry="18" fill="#f8fafc" opacity="0.2" />
                    <ellipse cx="-24" cy="4" rx="34" ry="14" fill="#f8fafc" opacity="0.18" />
                    <ellipse cx="26" cy="5" rx="30" ry="13" fill="#e2e8f0" opacity="0.16" />
                  </g>
                </g>
              ))}

              {bd.bandSnow.map((sf) => (
                <g key={sf.id} transform={`translate(${sf.x} ${sf.y})`}>
                  <circle
                    cx="0"
                    cy="0"
                    r={sf.r}
                    fill="#e0f2fe"
                    className="animate-career-snow"
                    style={{ animationDelay: sf.delay }}
                  />
                </g>
              ))}

              {bd.bandEmbers.map((em) => (
                <g key={em.id} transform={`translate(${em.x} ${em.y})`}>
                  <circle
                    cx="0"
                    cy="0"
                    r={em.r}
                    fill="#fb923c"
                    className="animate-career-ember"
                    style={{ animationDelay: em.delay }}
                  />
                </g>
              ))}
            </svg>
          );
        })}
      </div>
    );
  },
);

CareerMapScenery.displayName = 'CareerMapScenery';
