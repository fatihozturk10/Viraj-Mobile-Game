import React, { useMemo } from 'react';

export interface RoadPoint {
  x: number;
  y: number;
}

interface CareerMapSceneryProps {
  mapWidth: number;
  mapHeight: number;
  levelCoords: RoadPoint[];
  fullRoadPath: string;
  unlockedRoadPath: string;
  highestUnlockedLevel: number;
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

const WORLD_WIDTH = 1600;

function generateSceneryProps(
  coords: RoadPoint[],
  mapWidth: number,
): SceneryProp[] {
  const props: SceneryProp[] = [];
  for (let i = 0; i < coords.length; i++) {
    const levelId = i + 1;
    const chapterIndex = Math.min(3, Math.floor(i / 25));
    const pt = coords[i];

    const leftSpace = pt.x - 58;
    const rightSpace = mapWidth - (pt.x + 58);

    if (leftSpace > 38) {
      const lx = Math.max(20, leftSpace * (0.28 + ((levelId * 37) % 52) / 100));
      const ly = pt.y + (((levelId * 19) % 50) - 25);
      props.push({
        id: `p_l_${levelId}`,
        x: lx,
        y: ly,
        scale: 0.78 + ((levelId * 13) % 38) / 100,
        chapterIndex,
        variant: (levelId * 5) % 6,
        flip: levelId % 2 === 0,
      });

      // Secondary smaller filler prop when flank has generous space
      if (leftSpace > 128 && levelId % 2 === 0) {
        const lx2 = Math.max(18, lx - 48 + ((levelId * 11) % 24));
        const ly2 = pt.y + (levelId % 4 === 0 ? -44 : 44);
        props.push({
          id: `p_l2_${levelId}`,
          x: lx2,
          y: ly2,
          scale: 0.64 + ((levelId * 7) % 26) / 100,
          chapterIndex,
          variant: (levelId + 3) % 6,
          flip: true,
        });
      }
    }

    if (rightSpace > 38) {
      const rx = Math.min(
        mapWidth - 20,
        pt.x + 62 + rightSpace * (0.24 + ((levelId * 53) % 54) / 100),
      );
      const ry = pt.y + (((levelId * 29) % 52) - 26);
      props.push({
        id: `p_r_${levelId}`,
        x: rx,
        y: ry,
        scale: 0.78 + ((levelId * 23) % 38) / 100,
        chapterIndex,
        variant: (levelId * 7 + 2) % 6,
        flip: levelId % 2 === 1,
      });

      if (rightSpace > 128 && levelId % 2 === 1) {
        const rx2 = Math.min(mapWidth - 18, rx + 44 - ((levelId * 17) % 22));
        const ry2 = pt.y + (levelId % 3 === 0 ? -46 : 46);
        props.push({
          id: `p_r2_${levelId}`,
          x: rx2,
          y: ry2,
          scale: 0.64 + ((levelId * 11) % 24) / 100,
          chapterIndex,
          variant: (levelId + 4) % 6,
          flip: false,
        });
      }
    }
  }
  return props;
}

function generateRoadsideBeacons(coords: RoadPoint[]): RoadsideBeacon[] {
  const beacons: RoadsideBeacon[] = [];
  const palette = ['#fcd34d', '#fb923c', '#38bdf8', '#fb7185'];
  for (let i = 1; i < coords.length; i += 3) {
    const pt = coords[i];
    const prev = coords[i - 1];
    const dx = pt.x - prev.x;
    const side = dx >= 0 ? -1 : 1; // Place beacon along outside of curve
    const chapterIndex = Math.min(3, Math.floor(i / 25));
    beacons.push({
      id: `b_${i}`,
      x: pt.x + side * 44,
      y: pt.y + 38,
      color: palette[chapterIndex],
    });
  }
  return beacons;
}

function generateWideFlankLandmarks(mapHeight: number): FlankLandmark[] {
  const items: FlankLandmark[] = [];
  const rows = 96;
  for (let r = 0; r < rows; r++) {
    const t = (r + 0.5) / rows; // 0 = top (volcanic), 1 = bottom (alpine)
    const y = t * mapHeight;
    const chapterIndex =
      t >= 0.74 ? 0 : t >= 0.49 ? 1 : t >= 0.24 ? 2 : 3;

    // Left panoramic flank (x: 42 .. 548, framing the centered 460px corridor 570..1030)
    const lx = 42 + ((r * 149) % 496);
    items.push({
      id: `wf_l_${r}`,
      x: lx,
      y: y + (((r * 31) % 62) - 31),
      scale: 0.92 + ((r * 19) % 68) / 100,
      chapterIndex,
      variant: r % 6,
    });

    // Right panoramic flank (x: 1052 .. 1558)
    const rx = 1052 + ((r * 173) % 496);
    items.push({
      id: `wf_r_${r}`,
      x: rx,
      y: y + (((r * 47) % 62) - 31),
      scale: 0.92 + ((r * 29) % 68) / 100,
      chapterIndex,
      variant: (r + 3) % 6,
    });
  }
  return items;
}

function generateTerrainPatches(
  coords: RoadPoint[],
  mapWidth: number,
): TerrainPatch[] {
  const patches: TerrainPatch[] = [];
  for (let i = 0; i < coords.length; i++) {
    const levelId = i + 1;
    const chapterIndex = Math.min(3, Math.floor(i / 25));
    const pt = coords[i];
    const leftSpace = pt.x - 44;
    const rightSpace = mapWidth - (pt.x + 44);

    if (leftSpace > 30) {
      patches.push({
        id: `tp_l_${levelId}`,
        x: Math.max(24, leftSpace * (0.42 + ((levelId * 23) % 36) / 100)),
        y: pt.y + (((levelId * 17) % 46) - 23),
        rx: 28 + ((levelId * 13) % 32),
        ry: 16 + ((levelId * 7) % 18),
        rot: ((levelId * 19) % 36) - 18,
        chapterIndex,
        tone: levelId % 2,
      });
    }
    if (rightSpace > 30) {
      patches.push({
        id: `tp_r_${levelId}`,
        x: Math.min(
          mapWidth - 24,
          pt.x + 46 + rightSpace * (0.28 + ((levelId * 41) % 44) / 100),
        ),
        y: pt.y + (((levelId * 29) % 46) - 23),
        rx: 28 + ((levelId * 11) % 32),
        ry: 16 + ((levelId * 13) % 18),
        rot: ((levelId * 23) % 36) - 18,
        chapterIndex,
        tone: (levelId + 1) % 2,
      });
    }
  }
  return patches;
}

function generateMicroFoliage(
  coords: RoadPoint[],
  mapWidth: number,
): MicroFoliage[] {
  const details: MicroFoliage[] = [];
  for (let i = 0; i < coords.length; i++) {
    const chapterIndex = Math.min(3, Math.floor(i / 25));
    const p1 = coords[i];
    const p2 = coords[Math.min(coords.length - 1, i + 1)];

    // Populate both at each level row AND at the half-row midpoint between levels
    const samples: Array<{ x: number; y: number; seed: number }> = [
      { x: p1.x, y: p1.y, seed: (i + 1) * 31 },
      {
        x: (p1.x + p2.x) * 0.5,
        y: (p1.y + p2.y) * 0.5,
        seed: (i + 1) * 67 + 19,
      },
    ];

    for (let sIdx = 0; sIdx < samples.length; sIdx++) {
      const sample = samples[sIdx];
      const seed = sample.seed;
      const leftEdge = sample.x - 42;
      const rightEdge = sample.x + 42;

      // Left verge & outer pocket (1–2 small clusters)
      if (leftEdge > 22) {
        const lx1 = Math.max(10, leftEdge - 8 - ((seed * 13) % Math.max(14, Math.floor(leftEdge - 14))));
        const ly1 = sample.y + (((seed * 7) % 38) - 19);
        details.push({
          id: `mf_l1_${i}_${sIdx}`,
          x: lx1,
          y: ly1,
          scale: 0.72 + ((seed * 11) % 44) / 100,
          chapterIndex,
          variant: seed % 6,
          flip: seed % 2 === 0,
        });

        if (leftEdge > 92) {
          const lx2 = Math.max(12, 12 + ((seed * 29) % Math.max(18, Math.floor(leftEdge - 48))));
          const ly2 = sample.y + (((seed * 19) % 46) - 23);
          details.push({
            id: `mf_l2_${i}_${sIdx}`,
            x: lx2,
            y: ly2,
            scale: 0.68 + ((seed * 17) % 42) / 100,
            chapterIndex,
            variant: (seed + 2) % 6,
            flip: seed % 3 === 0,
          });
        }
      }

      // Right verge & outer pocket (1–2 small clusters)
      const rightSpace = mapWidth - rightEdge;
      if (rightSpace > 22) {
        const rx1 = Math.min(
          mapWidth - 10,
          rightEdge + 8 + ((seed * 23) % Math.max(14, Math.floor(rightSpace - 14))),
        );
        const ry1 = sample.y + (((seed * 11) % 38) - 19);
        details.push({
          id: `mf_r1_${i}_${sIdx}`,
          x: rx1,
          y: ry1,
          scale: 0.72 + ((seed * 13) % 44) / 100,
          chapterIndex,
          variant: (seed + 3) % 6,
          flip: seed % 2 === 1,
        });

        if (rightSpace > 92) {
          const rx2 = Math.min(
            mapWidth - 12,
            rightEdge + 38 + ((seed * 37) % Math.max(18, Math.floor(rightSpace - 48))),
          );
          const ry2 = sample.y + (((seed * 23) % 46) - 23);
          details.push({
            id: `mf_r2_${i}_${sIdx}`,
            x: rx2,
            y: ry2,
            scale: 0.68 + ((seed * 19) % 42) / 100,
            chapterIndex,
            variant: (seed + 5) % 6,
            flip: seed % 3 === 1,
          });
        }
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
      case 0: // Lush 3-Pine Alpine Grove
        return (
          <g key={prop.id} transform={tr}>
            <ellipse cx="0" cy="15" rx="26" ry="8" fill="#04150e" opacity="0.45" />
            {/* Back-left pine */}
            <g transform="translate(-12 2) scale(0.76)">
              <rect x="-2.5" y="4" width="5" height="9" fill="#4a2e1d" />
              <polygon points="0,-24 -14,6 14,6" fill="#0f5132" />
              <polygon points="0,-32 -10,-6 10,-6" fill="#15803d" />
            </g>
            {/* Back-right pine */}
            <g transform="translate(13 4) scale(0.7)">
              <rect x="-2.5" y="4" width="5" height="9" fill="#4a2e1d" />
              <polygon points="0,-22 -14,6 14,6" fill="#14532d" />
              <polygon points="0,-30 -10,-6 10,-6" fill="#16a34a" opacity="0.88" />
            </g>
            {/* Front hero pine */}
            <rect x="-3" y="5" width="6" height="10" rx="1.2" fill="#5c3822" />
            <polygon points="0,-22 -16,7 16,7" fill="#166534" />
            <polygon points="0,-31 -13,-4 13,-4" fill="#15803d" />
            <polygon points="0,-39 -9,-16 9,-16" fill="#22c55e" />
            <polygon points="0,-39 0,-16 9,-16" fill="#4ade80" opacity="0.45" />
          </g>
        );
      case 1: // Cozy Wooden Alpine Chalet with Warm Lit Windows
        return (
          <g key={prop.id} transform={tr}>
            <ellipse cx="0" cy="14" rx="24" ry="7.5" fill="#04150e" opacity="0.5" />
            {/* Chimney */}
            <rect x="8" y="-22" width="5" height="12" rx="1" fill="#78350f" />
            <circle cx="10.5" cy="-26" r="3" fill="#e2e8f0" opacity="0.32" />
            <circle cx="13" cy="-31" r="4" fill="#e2e8f0" opacity="0.2" />
            {/* Cabin walls */}
            <rect x="-15" y="-5" width="30" height="18" rx="1.5" fill="#7c4a27" />
            <rect x="0" y="-5" width="15" height="18" fill="#633a1e" />
            {/* Pitched alpine roof */}
            <polygon points="0,-22 -20,-3 20,-3" fill="#991b1b" />
            <polygon points="0,-22 20,-3 0,-3" fill="#7f1d1d" />
            <polyline points="-20,-3 0,-22 20,-3" fill="none" stroke="#fef3c7" strokeWidth="1.8" strokeLinecap="round" />
            {/* Warm glowing windows & door */}
            <rect x="-10" y="0" width="6" height="6" rx="1" fill="#fde047" />
            <rect x="4" y="0" width="6" height="6" rx="1" fill="#facc15" />
            <rect x="-2.5" y="4" width="5" height="9" rx="1" fill="#451a03" />
          </g>
        );
      case 2: // Spinning Alpine Wind Turbine on Green Hill
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
      case 3: // Granite Boulder Outcrop + Wildflower Meadow
        return (
          <g key={prop.id} transform={tr}>
            <ellipse cx="0" cy="10" rx="22" ry="7.5" fill="#05160f" opacity="0.45" />
            <ellipse cx="0" cy="8" rx="21" ry="7" fill="#15803d" opacity="0.55" />
            <polygon points="-17,9 -10,-9 4,-11 16,7" fill="#64748b" />
            <polygon points="-10,-9 4,-11 1,3 -12,4" fill="#94a3b8" />
            <polygon points="6,10 13,-2 21,9" fill="#475569" />
            {/* Wildflowers */}
            <circle cx="-14" cy="11" r="2.1" fill="#fde047" />
            <circle cx="-8" cy="13" r="1.8" fill="#38bdf8" />
            <circle cx="11" cy="12" r="2" fill="#f472b6" />
            <circle cx="17" cy="11" r="1.7" fill="#fde047" />
          </g>
        );
      case 4: // Sunlit Deciduous Oak + Mossy Stone
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
      default: // Alpine Lookout Signpost & Pine
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
      case 0: // Tall Ribbed Saguaro Cactus + Desert Shrub
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
      case 1: // Monument-Valley Layered Sandstone Mesa
        return (
          <g key={prop.id} transform={tr}>
            <ellipse cx="0" cy="13" rx="28" ry="8" fill="#290e05" opacity="0.5" />
            <polygon points="-26,12 -18,-14 14,-16 25,12" fill="#9a3412" />
            <polygon points="-18,-14 14,-16 8,-5 -13,-4" fill="#ea580c" />
            <line x1="-21" y1="2" x2="20" y2="1" stroke="#c2410c" strokeWidth="2.5" />
            <line x1="-18" y1="-6" x2="15" y2="-7" stroke="#fdba74" strokeWidth="1.4" opacity="0.5" />
          </g>
        );
      case 2: // Natural Red Canyon Stone Arch
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
      case 3: // Desert Oasis Palm Pair + Sparkling Spring
        return (
          <g key={prop.id} transform={tr}>
            <ellipse cx="0" cy="13" rx="24" ry="8.5" fill="#0ea5e9" opacity="0.52" />
            <ellipse cx="0" cy="13" rx="16" ry="5" fill="#38bdf8" opacity="0.58" />
            <path d="M -6 10 Q -12 -6 -8 -20" fill="none" stroke="#78350f" strokeWidth="4.2" strokeLinecap="round" />
            <path d="M 8 11 Q 12 -2 10 -15" fill="none" stroke="#92400e" strokeWidth="3.6" strokeLinecap="round" />
            {/* Palm fronds left */}
            <path d="M -8 -20 Q -22 -24 -25 -13" fill="none" stroke="#16a34a" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M -8 -20 Q -14 -32 -2 -30" fill="none" stroke="#22c55e" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M -8 -20 Q 4 -26 6 -15" fill="none" stroke="#15803d" strokeWidth="3.5" strokeLinecap="round" />
            {/* Palm fronds right */}
            <path d="M 10 -15 Q 22 -20 24 -10" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
            <path d="M 10 -15 Q 2 -24 -2 -14" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" />
          </g>
        );
      case 4: // Route-66 Desert Pit-Stop Diner Canopy
        return (
          <g key={prop.id} transform={tr}>
            <ellipse cx="0" cy="14" rx="24" ry="7" fill="#260e05" opacity="0.5" />
            {/* Pillars */}
            <rect x="-15" y="-6" width="3.5" height="18" fill="#cbd5e1" />
            <rect x="11.5" y="-6" width="3.5" height="18" fill="#cbd5e1" />
            {/* Booth */}
            <rect x="-8" y="-2" width="16" height="14" rx="1.5" fill="#475569" />
            <rect x="-5" y="1" width="10" height="6" rx="1" fill="#fde047" />
            {/* Retro canopy roof with glowing neon stripe */}
            <rect x="-20" y="-13" width="40" height="8" rx="2" fill="#dc2626" />
            <rect x="-20" y="-7" width="40" height="2.4" fill="#38bdf8" />
            <rect x="-12" y="-17" width="24" height="4" rx="1" fill="#f59e0b" />
          </g>
        );
      default: // Canyon Rock Spires & Agave
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
      case 0: // Snow-Capped Frost Pine Cluster
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
      case 1: // Faceted Translucent Glacier Crystal Spire
        return (
          <g key={prop.id} transform={tr}>
            <ellipse cx="0" cy="13" rx="20" ry="6.5" fill="#03101d" opacity="0.5" />
            <polygon points="-16,12 -10,-12 -2,12" fill="#38bdf8" opacity="0.72" />
            <polygon points="-8,12 -1,-28 10,-16 14,12" fill="#7dd3fc" opacity="0.86" />
            <polygon points="-1,-28 10,-16 3,12 -4,12" fill="#e0f2fe" opacity="0.92" />
            <polygon points="8,12 15,-8 21,12" fill="#0284c7" opacity="0.76" />
          </g>
        );
      case 2: // Warm-Lit Nordic Snow Cabin
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
      case 3: // Arctic Research Dome Outpost
        return (
          <g key={prop.id} transform={tr}>
            <ellipse cx="0" cy="13" rx="23" ry="7" fill="#031120" opacity="0.5" />
            {/* Radar mast */}
            <line x1="12" y1="2" x2="12" y2="-22" stroke="#94a3b8" strokeWidth="2" />
            <circle cx="12" cy="-23" r="2.5" fill="#38bdf8" />
            {/* Geodesic dome */}
            <path d="M -18 11 A 18 18 0 0 1 18 11 Z" fill="#cbd5e1" />
            <path d="M 0 -7 A 18 18 0 0 1 18 11 L 0 11 Z" fill="#94a3b8" opacity="0.55" />
            <rect x="-11" y="1" width="14" height="5.5" rx="2.5" fill="#38bdf8" />
            <rect x="-18" y="9" width="36" height="3.5" rx="1.5" fill="#475569" />
          </g>
        );
      case 4: // Shimmering Frozen Ice Pond & Snowbank
        return (
          <g key={prop.id} transform={tr}>
            <ellipse cx="0" cy="6" rx="24" ry="11" fill="#0284c7" opacity="0.55" />
            <ellipse cx="0" cy="6" rx="20" ry="8.5" fill="#7dd3fc" opacity="0.62" />
            <line x1="-12" y1="2" x2="2" y2="10" stroke="#f0f9ff" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
            <line x1="4" y1="1" x2="13" y2="7" stroke="#f0f9ff" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
            <ellipse cx="-12" cy="13" rx="11" ry="4" fill="#e2e8f0" opacity="0.8" />
          </g>
        );
      default: // Polar Ice Beacon Pylon
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
    case 0: // Jagged Obsidian Basalt Spire with Magma Veins
      return (
        <g key={prop.id} transform={tr}>
          <ellipse cx="0" cy="13" rx="22" ry="7" fill="#080305" opacity="0.65" />
          <polygon points="-18,12 -8,-25 4,-16 17,12" fill="#18181b" />
          <polygon points="-8,-25 4,-16 -1,10 -12,10" fill="#27272a" />
          <path d="M -5 -12 L -1 -2 L 3 8" fill="none" stroke="#f97316" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M -1 -2 L 6 2" fill="none" stroke="#fde047" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      );
    case 1: // Bubbling Volcanic Lava Pool
      return (
        <g key={prop.id} transform={tr}>
          <ellipse cx="0" cy="7" rx="25" ry="10" fill="#dc2626" opacity="0.45" className="animate-career-lava" />
          <ellipse cx="0" cy="7" rx="19" ry="7.5" fill="#f97316" opacity="0.88" />
          <ellipse cx="-2" cy="6.5" rx="10" ry="4" fill="#fde047" opacity="0.92" />
          <circle cx="9" cy="4" r="2.2" fill="#fef08a" />
          <circle cx="-10" cy="9" r="1.8" fill="#fb923c" />
        </g>
      );
    case 2: // Glowing Magma Ground Fissure
      return (
        <g key={prop.id} transform={tr}>
          <ellipse cx="0" cy="5" rx="24" ry="8" fill="#ea580c" opacity="0.32" className="animate-career-lava" />
          <path d="M -18 7 L -7 -2 L 4 5 L 18 -4" fill="none" stroke="#f97316" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M -16 6 L -7 -2 L 4 5 L 16 -3" fill="none" stroke="#fef08a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case 3: // Championship Volcanic Floodlight Tower
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
    case 4: // Mini Smoldering Volcanic Cone
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
    default: // Scorched Obsidian Monolith
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
        <g key={item.id} transform={tr} opacity="0.62">
          <polygon points="-58,36 -8,-44 48,36" fill="#133829" />
          <polygon points="-8,-44 48,36 4,36" fill="#0c261c" />
          <polygon points="-8,-44 -22,-20 -10,-25 0,-18 10,-22" fill="#e2e8f0" opacity="0.75" />
        </g>
      );
    }
    if (item.variant === 1 || item.variant === 2) {
      return (
        <g key={item.id} transform={tr} opacity="0.64">
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
      <g key={item.id} transform={tr} opacity="0.56">
        <polygon points="0,-24 -16,10 16,10" fill="#14532d" />
        <polygon points="18,-18 4,12 32,12" fill="#166534" />
        <polygon points="-16,-14 -28,12 -4,12" fill="#0f5132" />
      </g>
    );
  }
  if (item.chapterIndex === 1) {
    if (item.variant === 0) {
      return (
        <g key={item.id} transform={tr} opacity="0.58">
          <polygon points="-64,28 -44,-24 38,-24 62,28" fill="#7c2d12" />
          <polygon points="-44,-24 38,-24 22,-8 -32,-8" fill="#c2410c" opacity="0.7" />
        </g>
      );
    }
    if (item.variant === 1 || item.variant === 2) {
      // Wide Desert Sand Mound & Dry Scrub Bushes
      return (
        <g key={item.id} transform={tr} opacity="0.62">
          <path d="M -42 12 Q -10 -12 22 4 Q 38 10 46 12 Z" fill="#b45309" />
          <path d="M -32 10 Q -8 -7 16 5" fill="none" stroke="#fdba74" strokeWidth="2.2" opacity="0.55" strokeLinecap="round" />
          <circle cx="-16" cy="10" r="6" fill="#65a30d" opacity="0.65" />
          <circle cx="24" cy="11" r="5" fill="#a16207" opacity="0.72" />
        </g>
      );
    }
    return (
      <g key={item.id} transform={tr} opacity="0.48">
        <path d="M -55 18 Q -15 -14 25 6 T 75 14 L 75 28 L -55 28 Z" fill="#b45309" />
      </g>
    );
  }
  if (item.chapterIndex === 2) {
    if (item.variant === 0) {
      return (
        <g key={item.id} transform={tr} opacity="0.62">
          <polygon points="-60,34 -12,-46 52,34" fill="#1e3a5f" />
          <polygon points="-12,-46 52,34 6,34" fill="#0f2942" />
          <polygon points="-12,-46 -28,-16 -8,-22 8,-14 16,-20" fill="#bae6fd" opacity="0.82" />
        </g>
      );
    }
    if (item.variant === 1 || item.variant === 2) {
      // Snowdrift bank & frosted bushes
      return (
        <g key={item.id} transform={tr} opacity="0.62">
          <ellipse cx="0" cy="10" rx="38" ry="12" fill="#e0f2fe" opacity="0.4" />
          <ellipse cx="-10" cy="8" rx="22" ry="8" fill="#f0f9ff" opacity="0.5" />
          <circle cx="16" cy="7" r="7" fill="#64748b" />
          <path d="M 10 5 Q 16 -2 22 5 Z" fill="#f8fafc" />
        </g>
      );
    }
    return (
      <g key={item.id} transform={tr} opacity="0.52">
        <polygon points="-24,14 -8,-24 10,-12 24,14" fill="#38bdf8" opacity="0.48" />
        <polygon points="-8,-24 10,-12 2,14" fill="#e0f2fe" opacity="0.58" />
      </g>
    );
  }
  // Wide Volcanic Jagged Peak / Ash Mounds & Magma Cracks
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

  // === CHAPTER 0: YEŞİL VADİ (Grass tufts, bushes, wildflowers, pebbles, ferns, mossy stumps) ===
  if (item.chapterIndex === 0) {
    switch (item.variant) {
      case 0: // Crisp Grass Tuft Blades (Çim tutamı)
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="4" rx="9" ry="3" fill="#052e16" opacity="0.45" />
            <path d="M -6 3 Q -9 -5 -11 -9" fill="none" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M -2 3 Q -3 -7 -4 -12" fill="none" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 2 3 Q 4 -6 7 -11" fill="none" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 6 3 Q 9 -3 11 -6" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
          </g>
        );
      case 1: // Lush Round Leafy Bush with Tiny Blossoms (Çalı öbeği)
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="6" rx="14" ry="4.5" fill="#041c10" opacity="0.48" />
            <circle cx="-7" cy="2" r="6.5" fill="#14532d" />
            <circle cx="7" cy="2.5" r="6" fill="#166534" />
            <circle cx="0" cy="-2" r="7.5" fill="#15803d" />
            <circle cx="-2" cy="-4.5" r="3.8" fill="#4ade80" opacity="0.55" />
            <circle cx="-6" cy="0" r="1.4" fill="#fde047" />
            <circle cx="5" cy="-1" r="1.4" fill="#fb7185" />
            <circle cx="1" cy="3" r="1.2" fill="#fef08a" />
          </g>
        );
      case 2: // Clover & Wildflower Meadow Patch (Çiçekli çimen yaması)
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
      case 3: // Mossy River Pebbles & Grass Blades (Çakıl taşları & yosun)
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="5" rx="12" ry="4" fill="#04190f" opacity="0.42" />
            <ellipse cx="-5" cy="2" rx="5.5" ry="3.8" fill="#64748b" />
            <ellipse cx="-6" cy="0.8" rx="2.8" ry="1.6" fill="#94a3b8" />
            <ellipse cx="4" cy="3.5" rx="4.5" ry="3" fill="#475569" />
            <ellipse cx="8" cy="1.5" rx="3" ry="2.2" fill="#94a3b8" />
            <path d="M -9 3 Q -11 -2 -12 -5" fill="none" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        );
      case 4: // Roadside Fern Fronds (Eğrelti otu)
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="4" rx="10" ry="3.5" fill="#052e16" opacity="0.4" />
            <path d="M 0 3 Q -9 -1 -13 -6" fill="none" stroke="#16a34a" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M 0 3 Q -5 -5 -7 -11" fill="none" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 0 3 Q 5 -5 8 -10" fill="none" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 0 3 Q 9 -1 13 -5" fill="none" stroke="#15803d" strokeWidth="2.4" strokeLinecap="round" />
          </g>
        );
      default: // Mossy Tree Stump & Tiny Toadstools (Kütük & mantar)
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="5" rx="10" ry="3.8" fill="#051c11" opacity="0.48" />
            <rect x="-5.5" y="-2" width="11" height="6.5" rx="2" fill="#78350f" />
            <ellipse cx="0" cy="-2" rx="5.5" ry="2.2" fill="#d97706" />
            <ellipse cx="0" cy="-2" rx="3" ry="1.1" fill="#92400e" />
            {/* Tiny red mushrooms */}
            <rect x="6.5" y="1" width="1.8" height="3.5" fill="#fef3c7" />
            <path d="M 4.5 1.5 Q 7.4 -2.5 10.3 1.5 Z" fill="#ef4444" />
            <circle cx="7.4" cy="0" r="0.7" fill="#ffffff" />
          </g>
        );
    }
  }

  // === CHAPTER 1: KIZIL ÇÖL (Sand mounds, dry scrub bushes, pebbles, mini prickly cactus, cracked earth, dune ripples) ===
  if (item.chapterIndex === 1) {
    switch (item.variant) {
      case 0: // Sculpted Sand Mound / Kum Topağı
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="6" rx="15" ry="4.5" fill="#2c1005" opacity="0.45" />
            <path d="M -14 5 Q -4 -7 7 -2 Q 12 1 15 5 Z" fill="#d97706" />
            <path d="M -11 4 Q -3 -5 5 -1" fill="none" stroke="#fde68a" strokeWidth="2" strokeLinecap="round" opacity="0.72" />
            <circle cx="9" cy="5.5" r="1.6" fill="#9a3412" />
          </g>
        );
      case 1: // Dry Desert Scrub Bush / Tumbleweed (Kuru çöl çalısı)
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="5" rx="11" ry="3.8" fill="#290e04" opacity="0.44" />
            <circle cx="-5" cy="1" r="5" fill="#854d0e" opacity="0.9" />
            <circle cx="5" cy="1.5" r="4.8" fill="#a16207" opacity="0.9" />
            <circle cx="0" cy="-2" r="5.5" fill="#65a30d" opacity="0.82" />
            <path d="M -6 -2 L -10 -7 M 0 -5 L 1 -10 M 5 -2 L 9 -6" stroke="#ca8a04" strokeWidth="1.6" strokeLinecap="round" />
          </g>
        );
      case 2: // Red Sandstone Pebbles & Dust Mound (Çöl taşları & çakıllar)
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="5" rx="12" ry="4" fill="#290f05" opacity="0.44" />
            <polygon points="-10,4 -6,-3 1,-2 4,4" fill="#9a3412" />
            <polygon points="-6,-3 1,-2 -1,1 -7,1" fill="#ea580c" />
            <ellipse cx="7" cy="3.5" rx="4" ry="2.6" fill="#b45309" />
            <circle cx="-11" cy="5.5" r="1.8" fill="#c2410c" />
          </g>
        );
      case 3: // Mini Prickly Pear Cactus with Yellow Bloom (Küçük kaktüs)
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="6" rx="10" ry="3.4" fill="#290f05" opacity="0.45" />
            <ellipse cx="-4" cy="0" rx="4.5" ry="6" fill="#4d7c0f" transform="rotate(-14 -4 0)" />
            <ellipse cx="4.5" cy="1" rx="4" ry="5.5" fill="#3f6212" transform="rotate(18 4.5 1)" />
            <circle cx="-4.5" cy="-6" r="2.1" fill="#fde047" />
            <circle cx="5.5" cy="-4.5" r="1.6" fill="#fb923c" />
          </g>
        );
      case 4: // Baked Cracked Earth Patch (Çatlak kurak toprak)
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="2" rx="14" ry="6.5" fill="#9a3412" opacity="0.34" />
            <path
              d="M -9 1 L -2 -2 L 4 2 L 10 -1 M -2 -2 L -1 5 M 4 2 L 6 6"
              fill="none"
              stroke="#431407"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.7"
            />
          </g>
        );
      default: // Wind-Blown Sand Ripple Pair (Kum dalgası)
        return (
          <g key={item.id} transform={tr}>
            <path d="M -14 0 Q -4 -5 6 0 T 16 -2" fill="none" stroke="#fbbf24" strokeWidth="2.4" strokeLinecap="round" opacity="0.62" />
            <path d="M -11 5 Q -1 1 8 5 T 15 4" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" opacity="0.52" />
          </g>
        );
    }
  }

  // === CHAPTER 2: BUZUL KUTUPLAR (Snowdrifts, frosted bushes, ice shards, snowy stones, frost glints, baby pine) ===
  if (item.chapterIndex === 2) {
    switch (item.variant) {
      case 0: // Plump Layered Snowdrift Mound (Kar topağı / kar yığını)
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="6" rx="15" ry="4.8" fill="#041322" opacity="0.45" />
            <path d="M -14 5 Q -5 -6 5 -2 Q 11 0 14 5 Z" fill="#cbd5e1" />
            <path d="M -11 4 Q -4 -5 4 -1 Q 9 1 11 4 Z" fill="#f8fafc" />
          </g>
        );
      case 1: // Frosted Winter Bush (Karlı çalı)
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="6" rx="12" ry="4" fill="#041322" opacity="0.45" />
            <circle cx="-5.5" cy="2" r="5.5" fill="#475569" />
            <circle cx="5.5" cy="2" r="5" fill="#64748b" />
            <circle cx="0" cy="-1.5" r="6" fill="#94a3b8" />
            <path d="M -9 0 Q -4 -6 2 -5 Q 7 -5 9 0 Q 3 -2 -3 -2 Z" fill="#f8fafc" />
          </g>
        );
      case 2: // Tiny Ice Crystal Shards (Küçük buz parçaları)
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="5" rx="10" ry="3.5" fill="#031221" opacity="0.45" />
            <polygon points="-8,5 -5,-6 -1,5" fill="#38bdf8" opacity="0.82" />
            <polygon points="-2,5 2,-10 7,5" fill="#7dd3fc" opacity="0.9" />
            <polygon points="2,-10 7,5 2,5" fill="#e0f2fe" opacity="0.92" />
          </g>
        );
      case 3: // Snow-Dusted Arctic Pebbles (Karlı çakıllar)
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="5" rx="12" ry="4" fill="#041322" opacity="0.45" />
            <ellipse cx="-4" cy="2" rx="5.5" ry="3.8" fill="#475569" />
            <path d="M -9 1.5 Q -4 -3 1 1.5 Z" fill="#e2e8f0" />
            <ellipse cx="5" cy="3.5" rx="4.2" ry="2.8" fill="#334155" />
            <path d="M 1.5 3 Q 5 0 8.5 3 Z" fill="#f1f5f9" />
          </g>
        );
      case 4: // Frost Glint Patch (Parlayan buz & kırağı yaması)
        return (
          <g key={item.id} transform={tr}>
            <ellipse cx="0" cy="2" rx="13" ry="5.5" fill="#7dd3fc" opacity="0.28" />
            <path d="M -4 -2 L -4 4 M -7 1 L -1 1" stroke="#e0f2fe" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M 6 -1 L 6 3 M 4 1 L 8 1" stroke="#bae6fd" strokeWidth="1.4" strokeLinecap="round" />
          </g>
        );
      default: // Baby Snow Pine (Küçük karlı çam fidesi)
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

  // === CHAPTER 3: VOLKANİK ZİRVE (Ash mounds, basalt pebbles, mini ember cracks, sulfur stones, scorched twigs, molten nuggets) ===
  switch (item.variant) {
    case 0: // Volcanic Ash Mound & Cinder Heap (Kül topağı)
      return (
        <g key={item.id} transform={tr}>
          <ellipse cx="0" cy="6" rx="14" ry="4.5" fill="#090305" opacity="0.58" />
          <path d="M -13 5 Q -4 -6 6 -1 Q 11 2 13 5 Z" fill="#27272a" />
          <path d="M -8 4 Q -3 -3 3 1" fill="none" stroke="#52525b" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="5" cy="4" r="1.6" fill="#f97316" />
        </g>
      );
    case 1: // Charred Basalt Pebbles (Yanık bazalt çakılları)
      return (
        <g key={item.id} transform={tr}>
          <ellipse cx="0" cy="5" rx="11" ry="3.8" fill="#090305" opacity="0.55" />
          <polygon points="-9,4 -5,-3 1,-2 4,4" fill="#18181b" />
          <polygon points="-5,-3 1,-2 -1,1 -6,1" fill="#3f3f46" />
          <polygon points="4,4 7,-1 11,4" fill="#27272a" />
          <circle cx="2" cy="4.5" r="1.4" fill="#fb923c" opacity="0.85" />
        </g>
      );
    case 2: // Mini Glowing Magma Hairline Crack (Küçük kor çatlağı)
      return (
        <g key={item.id} transform={tr}>
          <ellipse cx="0" cy="2" rx="12" ry="4.5" fill="#ea580c" opacity="0.28" />
          <path d="M -10 3 L -3 -1 L 3 2 L 10 -2" fill="none" stroke="#f97316" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M -8 2.5 L -3 -1 L 3 2 L 8 -1.5" fill="none" stroke="#fef08a" strokeWidth="1" strokeLinecap="round" />
        </g>
      );
    case 3: // Glowing Ember Cluster (Kor taşları)
      return (
        <g key={item.id} transform={tr}>
          <ellipse cx="0" cy="4" rx="11" ry="4" fill="#dc2626" opacity="0.28" />
          <circle cx="-5" cy="2" r="3" fill="#27272a" />
          <circle cx="-5" cy="2" r="1.5" fill="#f97316" />
          <circle cx="4" cy="3" r="3.4" fill="#18181b" />
          <circle cx="4" cy="3" r="1.7" fill="#fde047" />
          <circle cx="0" cy="-1" r="2.2" fill="#fb923c" />
        </g>
      );
    case 4: // Scorched Volcanic Bramble Twigs (Kavrulmuş kuru çalı)
      return (
        <g key={item.id} transform={tr}>
          <ellipse cx="0" cy="5" rx="9" ry="3" fill="#090305" opacity="0.5" />
          <path d="M 0 4 L -7 -4 M 0 4 L -2 -7 M 0 4 L 6 -5 M -3 0 L -8 0 M 3 0 L 8 -1" fill="none" stroke="#3f3f46" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="-2" cy="-7" r="1.2" fill="#f97316" />
          <circle cx="6" cy="-5" r="1.1" fill="#fb7185" />
        </g>
      );
    default: // Molten Slag Nuggets (Lav damlaları)
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

export const CareerMapScenery: React.FC<CareerMapSceneryProps> = React.memo(
  ({
    mapWidth,
    mapHeight,
    levelCoords,
    fullRoadPath,
    unlockedRoadPath,
    highestUnlockedLevel,
  }) => {
    const sceneryProps = useMemo(
      () => generateSceneryProps(levelCoords, mapWidth),
      [levelCoords, mapWidth],
    );

    const terrainPatches = useMemo(
      () => generateTerrainPatches(levelCoords, mapWidth),
      [levelCoords, mapWidth],
    );

    const microFoliage = useMemo(
      () => generateMicroFoliage(levelCoords, mapWidth),
      [levelCoords, mapWidth],
    );

    const roadsideBeacons = useMemo(
      () => generateRoadsideBeacons(levelCoords),
      [levelCoords],
    );

    const wideFlankLandmarks = useMemo(
      () => generateWideFlankLandmarks(mapHeight),
      [mapHeight],
    );

    // Deterministic animated atmospheric particles (Clouds in Alpine, Snow in Arctic, Embers in Volcanic)
    const clouds = useMemo(
      () =>
        Array.from({ length: 8 }, (_, i) => ({
          id: `cloud_${i}`,
          x: 70 + ((i * 167) % (WORLD_WIDTH - 140)),
          y: mapHeight * (0.76 + (i / 8) * 0.21),
          scale: 0.9 + (i % 3) * 0.35,
          delay: `${-(i * 2.3).toFixed(1)}s`,
        })),
      [mapHeight],
    );

    const snowflakes = useMemo(
      () =>
        Array.from({ length: 24 }, (_, i) => ({
          id: `snow_${i}`,
          x: 60 + ((i * 113) % (WORLD_WIDTH - 120)),
          y: mapHeight * (0.25 + ((i * 17) % 24) / 100),
          r: 2 + (i % 3) * 1.1,
          delay: `${-(i * 0.65).toFixed(2)}s`,
        })),
      [mapHeight],
    );

    const embers = useMemo(
      () =>
        Array.from({ length: 22 }, (_, i) => ({
          id: `ember_${i}`,
          x: 70 + ((i * 137) % (WORLD_WIDTH - 140)),
          y: mapHeight * (0.02 + ((i * 19) % 22) / 100),
          r: 2.2 + (i % 3) * 1.1,
          delay: `${-(i * 0.5).toFixed(2)}s`,
        })),
      [mapHeight],
    );

    // Bridge coordinates aligned directly onto specific road points where waterways/gorges cross under the highway
    const alpineBridgePt = levelCoords[9]; // Level 10
    const desertBridgePt = levelCoords[35]; // Level 36
    const arcticBridgePt = levelCoords[61]; // Level 62
    const volcanicBridgePt = levelCoords[86]; // Level 87
    const summitPt = levelCoords[levelCoords.length - 1];

    return (
      <>
        {/* LAYER 1: Full-Bleed Panoramic World Scenery (1:1 vertical sync with highway bridges at every viewport width) */}
        <svg
          viewBox={`0 0 ${WORLD_WIDTH} ${mapHeight}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2"
          style={{ width: `max(100%, ${WORLD_WIDTH}px)`, height: `${mapHeight}px` }}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="volcanicCalderaGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fde047" stopOpacity="0.85" />
              <stop offset="35%" stopColor="#f97316" stopOpacity="0.52" />
              <stop offset="72%" stopColor="#dc2626" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="auroraCurtainA" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
              <stop offset="28%" stopColor="#2dd4bf" stopOpacity="0.34" />
              <stop offset="62%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="85%" stopColor="#a855f7" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="alpineLakeGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.62" />
              <stop offset="55%" stopColor="#0ea5e9" stopOpacity="0.46" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.32" />
            </linearGradient>
            <linearGradient id="lavaRiverGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#fde047" />
            </linearGradient>

            {/* Seamless Biome Ground Micro-Texture Patterns (zero flat bare terrain) */}
            <pattern id="alpineGroundPat" width="140" height="140" patternUnits="userSpaceOnUse">
              <ellipse cx="32" cy="44" rx="20" ry="8" fill="#22c55e" opacity="0.08" />
              <ellipse cx="104" cy="108" rx="22" ry="9" fill="#15803d" opacity="0.1" />
              <path d="M 18 32 L 15 24 M 21 32 L 22 23 M 24 32 L 27 25" stroke="#4ade80" strokeWidth="1.4" strokeLinecap="round" opacity="0.28" />
              <path d="M 88 64 L 85 57 M 91 64 L 92 55 M 94 64 L 97 58" stroke="#22c55e" strokeWidth="1.4" strokeLinecap="round" opacity="0.26" />
              <path d="M 52 118 L 49 110 M 55 118 L 56 109 M 58 118 L 61 112" stroke="#4ade80" strokeWidth="1.3" strokeLinecap="round" opacity="0.24" />
              <circle cx="42" cy="42" r="1.6" fill="#fde047" opacity="0.34" />
              <circle cx="118" cy="34" r="1.4" fill="#ffffff" opacity="0.24" />
              <circle cx="102" cy="106" r="1.6" fill="#38bdf8" opacity="0.28" />
              <ellipse cx="74" cy="24" rx="4" ry="2.2" fill="#64748b" opacity="0.2" />
            </pattern>

            <pattern id="desertGroundPat" width="150" height="140" patternUnits="userSpaceOnUse">
              <path d="M 12 34 Q 36 26 60 34 T 108 34" fill="none" stroke="#fdba74" strokeWidth="2" strokeLinecap="round" opacity="0.16" />
              <path d="M 48 92 Q 76 84 104 92 T 144 90" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" opacity="0.15" />
              <path d="M 14 114 Q 26 104 38 114 Z" fill="#d97706" opacity="0.2" />
              <path d="M 112 52 Q 124 43 136 52 Z" fill="#b45309" opacity="0.22" />
              <circle cx="76" cy="54" r="2.2" fill="#9a3412" opacity="0.28" />
              <circle cx="82" cy="58" r="1.5" fill="#ea580c" opacity="0.24" />
              <circle cx="30" cy="74" r="1.8" fill="#7c2d12" opacity="0.28" />
              <circle cx="122" cy="118" r="2.2" fill="#9a3412" opacity="0.24" />
            </pattern>

            <pattern id="arcticGroundPat" width="150" height="140" patternUnits="userSpaceOnUse">
              <ellipse cx="38" cy="40" rx="24" ry="8" fill="#e0f2fe" opacity="0.12" />
              <ellipse cx="110" cy="102" rx="26" ry="9" fill="#bae6fd" opacity="0.1" />
              <path d="M 76 30 L 88 38 L 82 48" fill="none" stroke="#7dd3fc" strokeWidth="1.2" opacity="0.22" />
              <path d="M 24 98 L 24 104 M 21 101 L 27 101" stroke="#f0f9ff" strokeWidth="1.3" strokeLinecap="round" opacity="0.34" />
              <path d="M 118 46 L 118 52 M 115 49 L 121 49" stroke="#e0f2fe" strokeWidth="1.3" strokeLinecap="round" opacity="0.3" />
              <circle cx="62" cy="84" r="1.5" fill="#ffffff" opacity="0.28" />
              <circle cx="96" cy="22" r="1.3" fill="#bae6fd" opacity="0.3" />
            </pattern>

            <pattern id="volcanicGroundPat" width="150" height="140" patternUnits="userSpaceOnUse">
              <path d="M 18 42 Q 30 33 42 42 Z" fill="#27272a" opacity="0.34" />
              <path d="M 102 104 Q 116 94 130 104 Z" fill="#18181b" opacity="0.38" />
              <path d="M 68 58 L 80 52 L 90 60" fill="none" stroke="#f97316" strokeWidth="1.4" strokeLinecap="round" opacity="0.22" />
              <circle cx="34" cy="96" r="2" fill="#27272a" opacity="0.45" />
              <circle cx="40" cy="98" r="1.2" fill="#fb923c" opacity="0.38" />
              <circle cx="116" cy="36" r="1.4" fill="#f97316" opacity="0.32" />
              <circle cx="72" cy="122" r="1.2" fill="#fde047" opacity="0.28" />
            </pattern>
          </defs>

          {/* Seamless Full-Width Biome Surface Ground Textures */}
          <rect x="0" y="0" width={WORLD_WIDTH} height={mapHeight * 0.26} fill="url(#volcanicGroundPat)" />
          <rect x="0" y={mapHeight * 0.24} width={WORLD_WIDTH} height={mapHeight * 0.27} fill="url(#arcticGroundPat)" />
          <rect x="0" y={mapHeight * 0.49} width={WORLD_WIDTH} height={mapHeight * 0.27} fill="url(#desertGroundPat)" />
          <rect x="0" y={mapHeight * 0.74} width={WORLD_WIDTH} height={mapHeight * 0.26} fill="url(#alpineGroundPat)" />

          {/* === VOLCANIC SUMMIT CALDERA CROWN BEHIND LEVEL 100 === */}
          <g transform={`translate(${WORLD_WIDTH * 0.5} ${summitPt.y - 30})`}>
            <ellipse cx="0" cy="-10" rx="340" ry="155" fill="url(#volcanicCalderaGlow)" className="animate-career-lava" />
            <polygon points="-290,95 -125,-95 125,-95 290,95" fill="#18070b" opacity="0.82" />
            <polygon points="-200,95 -95,-72 95,-72 200,95" fill="#2a0c12" opacity="0.86" />
            <ellipse cx="0" cy="-72" rx="108" ry="26" fill="#ea580c" opacity="0.85" />
            <ellipse cx="0" cy="-72" rx="68" ry="15" fill="#fde047" opacity="0.88" />
          </g>

          {/* === LAYERED TOPOGRAPHIC TERRAIN & WATER FEATURES === */}
          {/* 1. Alpine Emerald Meadows & Turquoise Mountain Lake */}
          <ellipse
            cx={WORLD_WIDTH * 0.22}
            cy={mapHeight * 0.89}
            rx="340"
            ry="280"
            fill="#15803d"
            opacity="0.16"
          />
          <ellipse
            cx={WORLD_WIDTH * 0.82}
            cy={mapHeight * 0.84}
            rx="270"
            ry="190"
            fill="url(#alpineLakeGrad)"
          />
          {/* Alpine lake shimmer streaks */}
          <path
            d={`M ${WORLD_WIDTH * 0.72} ${mapHeight * 0.83} Q ${WORLD_WIDTH * 0.8} ${mapHeight * 0.825}, ${WORLD_WIDTH * 0.88} ${mapHeight * 0.832}`}
            fill="none"
            stroke="#bae6fd"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.45"
          />
          <path
            d={`M ${WORLD_WIDTH * 0.76} ${mapHeight * 0.855} Q ${WORLD_WIDTH * 0.83} ${mapHeight * 0.85}, ${WORLD_WIDTH * 0.91} ${mapHeight * 0.857}`}
            fill="none"
            stroke="#e0f2fe"
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity="0.38"
          />
          {/* Alpine Meandering River passing cleanly under Level 10 bridge */}
          <path
            d={`M ${WORLD_WIDTH + 60} ${alpineBridgePt.y + 210} C ${WORLD_WIDTH * 0.74} ${alpineBridgePt.y + 80}, ${WORLD_WIDTH * 0.34} ${alpineBridgePt.y - 65}, -60 ${alpineBridgePt.y - 240}`}
            fill="none"
            stroke="#0284c7"
            strokeOpacity="0.38"
            strokeWidth="66"
            strokeLinecap="round"
          />
          <path
            d={`M ${WORLD_WIDTH + 60} ${alpineBridgePt.y + 210} C ${WORLD_WIDTH * 0.74} ${alpineBridgePt.y + 80}, ${WORLD_WIDTH * 0.34} ${alpineBridgePt.y - 65}, -60 ${alpineBridgePt.y - 240}`}
            fill="none"
            stroke="#38bdf8"
            strokeOpacity="0.42"
            strokeWidth="28"
            strokeLinecap="round"
          />
          <path
            d={`M ${WORLD_WIDTH + 60} ${alpineBridgePt.y + 210} C ${WORLD_WIDTH * 0.74} ${alpineBridgePt.y + 80}, ${WORLD_WIDTH * 0.34} ${alpineBridgePt.y - 65}, -60 ${alpineBridgePt.y - 240}`}
            fill="none"
            stroke="#e0f2fe"
            strokeOpacity="0.35"
            strokeWidth="6"
            strokeDasharray="18 28"
            strokeLinecap="round"
          />

          {/* 2. Desert Canyon Dunes, Red Gorge & Emerald Oasis */}
          <path
            d={`M -40 ${mapHeight * 0.71} Q ${WORLD_WIDTH * 0.3} ${mapHeight * 0.68}, ${WORLD_WIDTH * 0.62} ${mapHeight * 0.695} T ${WORLD_WIDTH + 40} ${mapHeight * 0.66}`}
            fill="none"
            stroke="#fb923c"
            strokeOpacity="0.16"
            strokeWidth="90"
          />
          <path
            d={`M -40 ${desertBridgePt.y + 160} C ${WORLD_WIDTH * 0.35} ${desertBridgePt.y + 55}, ${WORLD_WIDTH * 0.68} ${desertBridgePt.y - 50}, ${WORLD_WIDTH + 40} ${desertBridgePt.y - 180}`}
            fill="none"
            stroke="#3b1306"
            strokeOpacity="0.58"
            strokeWidth="74"
            strokeLinecap="round"
          />
          <path
            d={`M -40 ${desertBridgePt.y + 160} C ${WORLD_WIDTH * 0.35} ${desertBridgePt.y + 55}, ${WORLD_WIDTH * 0.68} ${desertBridgePt.y - 50}, ${WORLD_WIDTH + 40} ${desertBridgePt.y - 180}`}
            fill="none"
            stroke="#7c2d12"
            strokeOpacity="0.5"
            strokeWidth="40"
            strokeLinecap="round"
          />
          {/* Desert Oasis Lagoon on left canyon pocket */}
          <ellipse
            cx={WORLD_WIDTH * 0.21}
            cy={mapHeight * 0.59}
            rx="165"
            ry="95"
            fill="#15803d"
            opacity="0.34"
          />
          <ellipse
            cx={WORLD_WIDTH * 0.21}
            cy={mapHeight * 0.59}
            rx="115"
            ry="62"
            fill="#0ea5e9"
            opacity="0.52"
          />
          <ellipse
            cx={WORLD_WIDTH * 0.205}
            cy={mapHeight * 0.588}
            rx="72"
            ry="34"
            fill="#38bdf8"
            opacity="0.48"
          />

          {/* 3. Arctic Frozen Fjord, Glacial Lakes & Animated Aurora Borealis */}
          <path
            d={`M -60 ${arcticBridgePt.y - 150} C ${WORLD_WIDTH * 0.32} ${arcticBridgePt.y - 45}, ${WORLD_WIDTH * 0.66} ${arcticBridgePt.y + 45}, ${WORLD_WIDTH + 60} ${arcticBridgePt.y + 170}`}
            fill="none"
            stroke="#0c4a6e"
            strokeOpacity="0.58"
            strokeWidth="72"
            strokeLinecap="round"
          />
          <path
            d={`M -60 ${arcticBridgePt.y - 150} C ${WORLD_WIDTH * 0.32} ${arcticBridgePt.y - 45}, ${WORLD_WIDTH * 0.66} ${arcticBridgePt.y + 45}, ${WORLD_WIDTH + 60} ${arcticBridgePt.y + 170}`}
            fill="none"
            stroke="#7dd3fc"
            strokeOpacity="0.42"
            strokeWidth="30"
            strokeLinecap="round"
          />
          {/* Sweeping Animated Aurora Curtains */}
          <g className="animate-career-aurora">
            <path
              d={`M -40 ${mapHeight * 0.43} C 280 ${mapHeight * 0.39}, 640 ${mapHeight * 0.44}, 960 ${mapHeight * 0.38} T ${WORLD_WIDTH + 40} ${mapHeight * 0.35}`}
              fill="none"
              stroke="url(#auroraCurtainA)"
              strokeWidth="120"
              strokeLinecap="round"
            />
            <path
              d={`M -40 ${mapHeight * 0.33} C 320 ${mapHeight * 0.29}, 740 ${mapHeight * 0.35}, ${WORLD_WIDTH + 40} ${mapHeight * 0.28}`}
              fill="none"
              stroke="url(#auroraCurtainA)"
              strokeWidth="95"
              strokeLinecap="round"
            />
          </g>

          {/* 4. Volcanic Branching Magma Rivers */}
          <g className="animate-career-lava">
            <path
              d={`M -40 ${volcanicBridgePt.y + 175} C ${WORLD_WIDTH * 0.32} ${volcanicBridgePt.y + 60}, ${WORLD_WIDTH * 0.68} ${volcanicBridgePt.y - 55}, ${WORLD_WIDTH + 40} ${volcanicBridgePt.y - 170}`}
              fill="none"
              stroke="#dc2626"
              strokeOpacity="0.56"
              strokeWidth="56"
              strokeLinecap="round"
            />
            <path
              d={`M -40 ${volcanicBridgePt.y + 175} C ${WORLD_WIDTH * 0.32} ${volcanicBridgePt.y + 60}, ${WORLD_WIDTH * 0.68} ${volcanicBridgePt.y - 55}, ${WORLD_WIDTH + 40} ${volcanicBridgePt.y - 170}`}
              fill="none"
              stroke="url(#lavaRiverGrad)"
              strokeOpacity="0.88"
              strokeWidth="22"
              strokeLinecap="round"
            />
            <path
              d={`M -40 ${volcanicBridgePt.y + 175} C ${WORLD_WIDTH * 0.32} ${volcanicBridgePt.y + 60}, ${WORLD_WIDTH * 0.68} ${volcanicBridgePt.y - 55}, ${WORLD_WIDTH + 40} ${volcanicBridgePt.y - 170}`}
              fill="none"
              stroke="#fef08a"
              strokeOpacity="0.85"
              strokeWidth="6"
              strokeDasharray="24 22"
              strokeLinecap="round"
            />
          </g>

          {/* Wide Panoramic Flank Mountains & Silhouettes */}
          {wideFlankLandmarks.map(renderWideFlankLandmark)}

          {/* Animated Drifting Alpine Clouds */}
          {clouds.map((c) => (
            <g
              key={c.id}
              transform={`translate(${c.x} ${c.y}) scale(${c.scale})`}
            >
              <g
                className="animate-career-cloud"
                style={{ animationDelay: c.delay }}
              >
                <ellipse cx="0" cy="0" rx="52" ry="18" fill="#f8fafc" opacity="0.22" />
                <ellipse cx="-24" cy="4" rx="34" ry="14" fill="#f8fafc" opacity="0.2" />
                <ellipse cx="26" cy="5" rx="30" ry="13" fill="#e2e8f0" opacity="0.18" />
              </g>
            </g>
          ))}

          {/* Animated Arctic Snowflakes */}
          {snowflakes.map((sf) => (
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

          {/* Animated Volcanic Rising Embers */}
          {embers.map((em) => (
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

        {/* LAYER 2: Corridor Roadside Landmarks + Highway Bridges + Multi-Layer Asphalt Road */}
        <div
          className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2"
          style={{ width: `min(100vw, ${mapWidth}px)` }}
        >
          <svg
            viewBox={`0 0 ${mapWidth} ${mapHeight}`}
            preserveAspectRatio="none"
            className="h-full w-full"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="roadGlowActive" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="35%" stopColor="#f59e0b" />
                <stop offset="70%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>
              <filter id="roadShadow" x="-20%" y="-2%" width="140%" height="104%">
                <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#000000" floodOpacity="0.6" />
              </filter>
            </defs>

            {/* Soft Sculpted Terrain Contour Patches Grounding the Roadside Environment */}
            {terrainPatches.map((tp) => {
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

            {/* Dense Micro Ground Cover (Grass Tufts, Bushes, Flowers, Sand Mounds, Snowdrifts, Ash/Pebbles) */}
            {microFoliage.map(renderMicroFoliage)}

            {/* Detailed Roadside Biome Landmarks */}
            {sceneryProps.map(renderBiomeProp)}

            {/* Scenic Bridge Parapets & Side Deck Supports under the Highway at Biome Crossings */}
            {[
              { pt: alpineBridgePt, deck: '#64748b', rail: '#e2e8f0', glow: '#38bdf8' },
              { pt: desertBridgePt, deck: '#78350f', rail: '#f59e0b', glow: '#fb923c' },
              { pt: arcticBridgePt, deck: '#334155', rail: '#bae6fd', glow: '#38bdf8' },
              { pt: volcanicBridgePt, deck: '#27272a', rail: '#f43f5e', glow: '#f97316' },
            ].map((br, idx) => (
              <g key={`bridge_${idx}`} transform={`translate(${br.pt.x} ${br.pt.y})`}>
                <rect x="-52" y="-54" width="104" height="108" rx="10" fill={br.deck} opacity="0.92" />
                <rect x="-52" y="-54" width="8" height="108" rx="3" fill={br.rail} />
                <rect x="44" y="-54" width="8" height="108" rx="3" fill={br.rail} />
                {/* Bridge reflector posts */}
                {[-38, -12, 12, 38].map((py) => (
                  <g key={py}>
                    <circle cx="-48" cy={py} r="3" fill={br.glow} />
                    <circle cx="48" cy={py} r="3" fill={br.glow} />
                  </g>
                ))}
              </g>
            ))}

            {/* Roadside Streetlamps & Ambient Light Pools */}
            {roadsideBeacons.map((b) => (
              <g key={b.id} transform={`translate(${b.x.toFixed(1)} ${b.y.toFixed(1)})`}>
                <circle cx="0" cy="0" r="18" fill={b.color} opacity="0.16" />
                <circle cx="0" cy="0" r="7" fill={b.color} opacity="0.34" />
                <circle cx="0" cy="0" r="2.6" fill="#ffffff" opacity="0.92" />
              </g>
            ))}

            {/* Highway Roadbed Layers */}
            {/* 1. Outer Embankment & Guardrail Drop Shadow */}
            <path
              d={fullRoadPath}
              fill="none"
              stroke="#090d16"
              strokeWidth="80"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#roadShadow)"
            />
            {/* 2. Metallic Guardrail & Racing Shoulder Curb */}
            <path
              d={fullRoadPath}
              fill="none"
              stroke="#64748b"
              strokeWidth="68"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.82"
            />
            {/* 2b. Subtle Motorsport Apex Curb Dashes along Shoulder */}
            <path
              d={fullRoadPath}
              fill="none"
              stroke="#ef4444"
              strokeWidth="66"
              strokeDasharray="10 38"
              strokeLinecap="butt"
              opacity="0.28"
            />
            {/* 3. Main Dark Asphalt Surface */}
            <path
              d={fullRoadPath}
              fill="none"
              stroke="#141418"
              strokeWidth="58"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* 4. Crisp White Outer Highway Edge Lines */}
            <path
              d={fullRoadPath}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="50"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.24"
            />
            {/* 5. Inner Asphalt Roadway Surface */}
            <path
              d={fullRoadPath}
              fill="none"
              stroke="#1d1e24"
              strokeWidth="46"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* 6. Unlocked/Driven Highway Progress Glow */}
            {highestUnlockedLevel > 1 && (
              <>
                <path
                  d={unlockedRoadPath}
                  fill="none"
                  stroke="url(#roadGlowActive)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.28"
                />
                <path
                  d={unlockedRoadPath}
                  fill="none"
                  stroke="url(#roadGlowActive)"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.72"
                />
              </>
            )}
            {/* 7. Crisp Dashed Center Highway Lane Line */}
            <path
              d={fullRoadPath}
              fill="none"
              stroke="#fde047"
              strokeWidth="3"
              strokeDasharray="13 15"
              strokeLinecap="round"
              opacity="0.88"
            />
          </svg>
        </div>
      </>
    );
  },
);

CareerMapScenery.displayName = 'CareerMapScenery';
