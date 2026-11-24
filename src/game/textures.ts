import * as THREE from 'three';

export interface BillboardTexturePair {
  map: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
}

export interface ProceduralTextureSet {
  asphaltMap: THREE.CanvasTexture;
  asphaltRoughnessMap: THREE.CanvasTexture;
  shoulderMap: THREE.CanvasTexture;
  chevronMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  gantrySignMaps: THREE.CanvasTexture[];
  trafficSignMaps: THREE.CanvasTexture[];
  billboardPairs: BillboardTexturePair[];
  sosSignMap: THREE.CanvasTexture;
  kmSignMap: THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(
  renderer: THREE.WebGLRenderer,
  _isMobile = false,
): ProceduralTextureSet {
  const maxAniso = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);

  // 1. Multi-lane Asphalt Albedo Texture (1024x1024)
  const asphaltCanvas = document.createElement('canvas');
  asphaltCanvas.width = 1024;
  asphaltCanvas.height = 1024;
  const ctx = asphaltCanvas.getContext('2d')!;

  // Base dark asphalt
  ctx.fillStyle = '#24262b';
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle longitudinal tire wear bands across 3 lanes
  const laneCenters = [176, 512, 848];
  for (const cx of laneCenters) {
    for (const trackOffset of [-58, 58]) {
      const grad = ctx.createLinearGradient(
        cx + trackOffset - 45,
        0,
        cx + trackOffset + 45,
        0,
      );
      grad.addColorStop(0, 'rgba(18, 20, 24, 0)');
      grad.addColorStop(0.5, 'rgba(14, 15, 18, 0.35)');
      grad.addColorStop(1, 'rgba(18, 20, 24, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(cx + trackOffset - 45, 0, 90, 1024);
    }
  }

  // Fine aggregate speckle
  for (let i = 0; i < 24000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const v = 26 + Math.floor(Math.random() * 34);
    ctx.fillStyle = `rgb(${v},${v + 1},${v + 3})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Solid edge lines (amber-white crisp highway markings)
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(28, 0, 14, 1024);
  ctx.fillRect(982, 0, 14, 1024);

  // Dashed lane dividers (between 3 lanes at x=341 and x=683)
  ctx.fillStyle = '#f3f4f6';
  const dashCount = 4;
  const dashPeriod = 1024 / dashCount;
  for (let i = 0; i < dashCount; i++) {
    const y = i * dashPeriod + 28;
    ctx.fillRect(336, y, 12, dashPeriod * 0.44);
    ctx.fillRect(676, y, 12, dashPeriod * 0.44);
  }

  const asphaltMap = new THREE.CanvasTexture(asphaltCanvas);
  asphaltMap.colorSpace = THREE.SRGBColorSpace;
  asphaltMap.wrapS = THREE.ClampToEdgeWrapping;
  asphaltMap.wrapT = THREE.RepeatWrapping;
  asphaltMap.anisotropy = maxAniso;

  // 2. Asphalt Roughness Texture (linear space)
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 512;
  roughCanvas.height = 512;
  const rctx = roughCanvas.getContext('2d')!;
  rctx.fillStyle = '#c8c8c8';
  rctx.fillRect(0, 0, 512, 512);
  // Smoother worn tire grooves
  for (const cx of [88, 256, 424]) {
    for (const off of [-29, 29]) {
      rctx.fillStyle = 'rgba(130, 130, 130, 0.5)';
      rctx.fillRect(cx + off - 18, 0, 36, 512);
    }
  }
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = 140 + Math.floor(Math.random() * 90);
    rctx.fillStyle = `rgb(${v},${v},${v})`;
    rctx.fillRect(x, y, 2, 2);
  }
  const asphaltRoughnessMap = new THREE.CanvasTexture(roughCanvas);
  asphaltRoughnessMap.wrapS = THREE.ClampToEdgeWrapping;
  asphaltRoughnessMap.wrapT = THREE.RepeatWrapping;
  asphaltRoughnessMap.anisotropy = maxAniso;

  // 3. Shoulder / Curb Rumble Texture
  const shoulderCanvas = document.createElement('canvas');
  shoulderCanvas.width = 256;
  shoulderCanvas.height = 512;
  const sctx = shoulderCanvas.getContext('2d')!;
  sctx.fillStyle = '#383b40';
  sctx.fillRect(0, 0, 256, 512);
  for (let y = 0; y < 512; y += 64) {
    sctx.fillStyle = (y / 64) % 2 === 0 ? '#dc2626' : '#e5e7eb';
    sctx.fillRect(0, y, 36, 64);
  }
  for (let i = 0; i < 3000; i++) {
    const x = 38 + Math.random() * 218;
    const y = Math.random() * 512;
    const v = 45 + Math.floor(Math.random() * 35);
    sctx.fillStyle = `rgb(${v},${v},${v + 2})`;
    sctx.fillRect(x, y, 2, 2);
  }
  const shoulderMap = new THREE.CanvasTexture(shoulderCanvas);
  shoulderMap.colorSpace = THREE.SRGBColorSpace;
  shoulderMap.wrapS = THREE.ClampToEdgeWrapping;
  shoulderMap.wrapT = THREE.RepeatWrapping;
  shoulderMap.anisotropy = maxAniso;

  // 4. Curve Warning Chevron Sign Texture
  const chevCanvas = document.createElement('canvas');
  chevCanvas.width = 256;
  chevCanvas.height = 256;
  const cctx = chevCanvas.getContext('2d')!;
  cctx.fillStyle = '#18181b';
  cctx.fillRect(0, 0, 256, 256);
  cctx.strokeStyle = '#facc15';
  cctx.lineWidth = 12;
  cctx.strokeRect(8, 8, 240, 240);
  // Bright yellow chevron pointing right (+X)
  cctx.fillStyle = '#facc15';
  cctx.beginPath();
  cctx.moveTo(64, 34);
  cctx.lineTo(132, 34);
  cctx.lineTo(206, 128);
  cctx.lineTo(132, 222);
  cctx.lineTo(64, 222);
  cctx.lineTo(138, 128);
  cctx.closePath();
  cctx.fill();

  const chevronMap = new THREE.CanvasTexture(chevCanvas);
  chevronMap.colorSpace = THREE.SRGBColorSpace;
  chevronMap.anisotropy = maxAniso;

  // 5. Soft Radial Contact Shadow Texture
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 256;
  shadowCanvas.height = 256;
  const shctx = shadowCanvas.getContext('2d')!;
  const rad = shctx.createRadialGradient(128, 128, 18, 128, 128, 122);
  rad.addColorStop(0, 'rgba(0, 0, 0, 0.78)');
  rad.addColorStop(0.55, 'rgba(0, 0, 0, 0.42)');
  rad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  shctx.fillStyle = rad;
  shctx.fillRect(0, 0, 256, 256);
  const contactShadowMap = new THREE.CanvasTexture(shadowCanvas);

  // 6. Overhead Highway Gantry Directional Signs (512x160)
  const gantrySpecs = [
    {
      bg: '#065f46',
      route: 'O-4',
      routeBg: '#f59e0b',
      routeText: '#18181b',
      title: 'İSTANBUL  ·  KÖRFEZ',
      sub: 'E80  OTOYOLU   12 km',
    },
    {
      bg: '#065f46',
      route: 'E80',
      routeBg: '#dc2626',
      routeText: '#ffffff',
      title: 'ANKARA  ·  BOLU GEÇİŞİ',
      sub: 'TÜM ŞERİTLER AÇIK',
    },
    {
      bg: '#1e3a8a',
      route: 'D100',
      routeBg: '#facc15',
      routeText: '#18181b',
      title: 'SAHİL YOLU  ·  VİRAJ',
      sub: 'DİKKAT KESKİN VİRAJLAR',
    },
  ];

  const gantrySignMaps = gantrySpecs.map((spec) => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 160;
    const g = c.getContext('2d')!;
    g.fillStyle = spec.bg;
    g.fillRect(0, 0, 512, 160);
    g.strokeStyle = '#f8fafc';
    g.lineWidth = 6;
    g.strokeRect(8, 8, 496, 144);

    // Route shield badge
    g.fillStyle = spec.routeBg;
    g.fillRect(26, 24, 92, 42);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2.5;
    g.strokeRect(26, 24, 92, 42);
    g.fillStyle = spec.routeText;
    g.font = 'bold 26px "Oxanium", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(spec.route, 72, 46);

    // Destination title
    g.fillStyle = '#ffffff';
    g.font = 'bold 31px "Plus Jakarta Sans", sans-serif';
    g.textAlign = 'left';
    g.fillText(spec.title, 134, 48);

    // Subtitle + lane arrows
    g.fillStyle = 'rgba(241,245,249,0.88)';
    g.font = '600 18px "JetBrains Mono", monospace';
    g.fillText(spec.sub, 30, 114);

    // Downward lane arrows on right
    g.fillStyle = '#ffffff';
    for (const ax of [375, 425, 472]) {
      g.beginPath();
      g.moveTo(ax - 6, 92);
      g.lineTo(ax + 6, 92);
      g.lineTo(ax + 6, 116);
      g.lineTo(ax + 14, 116);
      g.lineTo(ax, 136);
      g.lineTo(ax - 14, 116);
      g.lineTo(ax - 6, 116);
      g.closePath();
      g.fill();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    return tex;
  });

  // 7. Roadside Traffic Signs (256x256)
  const makeTrafficSign = (draw: (g: CanvasRenderingContext2D) => void) => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const g = c.getContext('2d')!;
    draw(g);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    return tex;
  };

  const trafficSignMaps: THREE.CanvasTexture[] = [
    // 0: Speed Limit 120
    makeTrafficSign((g) => {
      g.fillStyle = '#1e293b';
      g.fillRect(0, 0, 256, 256);
      g.beginPath();
      g.arc(128, 128, 108, 0, Math.PI * 2);
      g.fillStyle = '#f8fafc';
      g.fill();
      g.lineWidth = 24;
      g.strokeStyle = '#dc2626';
      g.stroke();
      g.fillStyle = '#09090b';
      g.font = 'bold 84px "Oxanium", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('120', 128, 132);
    }),
    // 1: Sharp Curve Warning
    makeTrafficSign((g) => {
      g.fillStyle = '#f59e0b';
      g.fillRect(0, 0, 256, 256);
      g.strokeStyle = '#18181b';
      g.lineWidth = 14;
      g.strokeRect(10, 10, 236, 236);
      // Bold curved S-turn arrow
      g.strokeStyle = '#18181b';
      g.lineWidth = 24;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.beginPath();
      g.moveTo(92, 198);
      g.lineTo(92, 146);
      g.quadraticCurveTo(92, 108, 148, 88);
      g.lineTo(156, 62);
      g.stroke();
      g.fillStyle = '#18181b';
      g.beginPath();
      g.moveTo(156, 34);
      g.lineTo(186, 86);
      g.lineTo(126, 78);
      g.closePath();
      g.fill();
      g.font = 'bold 26px "Oxanium", sans-serif';
      g.textAlign = 'center';
      g.fillText('VİRAJ', 128, 228);
    }),
    // 2: Radar Control
    makeTrafficSign((g) => {
      g.fillStyle = '#1d4ed8';
      g.fillRect(0, 0, 256, 256);
      g.strokeStyle = '#ffffff';
      g.lineWidth = 10;
      g.strokeRect(10, 10, 236, 236);
      g.fillStyle = '#ffffff';
      g.font = 'bold 38px "Oxanium", sans-serif';
      g.textAlign = 'center';
      g.fillText('RADAR', 128, 72);
      // Radar wave arcs
      g.strokeStyle = '#facc15';
      g.lineWidth = 9;
      for (const r of [24, 46, 68]) {
        g.beginPath();
        g.arc(128, 160, r, -Math.PI * 0.78, -Math.PI * 0.22);
        g.stroke();
      }
      g.fillStyle = '#facc15';
      g.beginPath();
      g.arc(128, 168, 10, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#e2e8f0';
      g.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
      g.fillText('KONTROL', 128, 222);
    }),
    // 3: Service / Rest Area 500m
    makeTrafficSign((g) => {
      g.fillStyle = '#1e3a8a';
      g.fillRect(0, 0, 256, 256);
      g.strokeStyle = '#ffffff';
      g.lineWidth = 10;
      g.strokeRect(10, 10, 236, 236);
      g.fillStyle = '#ffffff';
      g.fillRect(46, 44, 164, 112);
      // Fuel pump silhouette
      g.fillStyle = '#1e3a8a';
      g.fillRect(96, 62, 52, 76);
      g.fillStyle = '#f59e0b';
      g.fillRect(106, 72, 32, 24);
      g.fillStyle = '#ffffff';
      g.font = 'bold 34px "Oxanium", sans-serif';
      g.textAlign = 'center';
      g.fillText('TESİS 500m', 128, 210);
    }),
  ];

  // 8. Roadside Illuminated Billboards (512x256 map + emissiveMap)
  const billboardSpecs = [
    {
      draw: (g: CanvasRenderingContext2D, em: CanvasRenderingContext2D) => {
        g.fillStyle = '#111827';
        g.fillRect(0, 0, 512, 256);
        em.fillStyle = '#000000';
        em.fillRect(0, 0, 512, 256);

        // Diagonal racing stripes
        for (const [x, col] of [
          [340, '#f59e0b'],
          [392, '#ef4444'],
        ] as const) {
          g.fillStyle = col;
          em.fillStyle = col;
          g.beginPath();
          g.moveTo(x, 0);
          g.lineTo(x + 42, 0);
          g.lineTo(x - 52, 256);
          g.lineTo(x - 94, 256);
          g.closePath();
          g.fill();
          em.beginPath();
          em.moveTo(x, 0);
          em.lineTo(x + 42, 0);
          em.lineTo(x - 52, 256);
          em.lineTo(x - 94, 256);
          em.closePath();
          em.fill();
        }

        g.fillStyle = '#ffffff';
        em.fillStyle = '#e5e7eb';
        g.font = '800 54px "Oxanium", sans-serif';
        em.font = '800 54px "Oxanium", sans-serif';
        g.fillText('VİRAJ', 34, 96);
        em.fillText('VİRAJ', 34, 96);

        g.fillStyle = '#fbbf24';
        em.fillStyle = '#fbbf24';
        g.font = 'bold 28px "Oxanium", sans-serif';
        em.font = 'bold 28px "Oxanium", sans-serif';
        g.fillText('MOTORSPORT', 36, 140);
        em.fillText('MOTORSPORT', 36, 140);

        g.fillStyle = '#cbd5e1';
        g.font = '600 20px "Plus Jakarta Sans", sans-serif';
        g.fillText('TURBO  ·  DRİFT  ·  SAF HIZ', 36, 206);
      },
    },
    {
      draw: (g: CanvasRenderingContext2D, em: CanvasRenderingContext2D) => {
        const grad = g.createLinearGradient(0, 0, 512, 256);
        grad.addColorStop(0, '#082f49');
        grad.addColorStop(1, '#0f172a');
        g.fillStyle = grad;
        g.fillRect(0, 0, 512, 256);
        em.fillStyle = '#051524';
        em.fillRect(0, 0, 512, 256);

        g.strokeStyle = '#38bdf8';
        em.strokeStyle = '#38bdf8';
        g.lineWidth = 6;
        g.strokeRect(12, 12, 488, 232);
        em.strokeRect(12, 12, 488, 232);

        g.fillStyle = '#38bdf8';
        em.fillStyle = '#38bdf8';
        g.font = '800 56px "Oxanium", sans-serif';
        em.font = '800 56px "Oxanium", sans-serif';
        g.fillText('NİTRO X900', 38, 108);
        em.fillText('NİTRO X900', 38, 108);

        g.fillStyle = '#e0f2fe';
        em.fillStyle = '#7dd3fc';
        g.font = '700 24px "Plus Jakarta Sans", sans-serif';
        em.font = '700 24px "Plus Jakarta Sans", sans-serif';
        g.fillText('ANINDA MAKSİMUM İVME', 40, 168);
        em.fillText('ANINDA MAKSİMUM İVME', 40, 168);
      },
    },
    {
      draw: (g: CanvasRenderingContext2D, em: CanvasRenderingContext2D) => {
        const grad = g.createLinearGradient(0, 0, 0, 256);
        grad.addColorStop(0, '#3b0764');
        grad.addColorStop(1, '#1e1b4b');
        g.fillStyle = grad;
        g.fillRect(0, 0, 512, 256);
        em.fillStyle = '#120624';
        em.fillRect(0, 0, 512, 256);

        // Synth sun disc
        g.fillStyle = '#f97316';
        em.fillStyle = '#f97316';
        g.beginPath();
        g.arc(412, 128, 68, 0, Math.PI * 2);
        g.fill();
        em.beginPath();
        em.arc(412, 128, 68, 0, Math.PI * 2);
        em.fill();

        g.fillStyle = '#ffffff';
        em.fillStyle = '#f472b6';
        g.font = '800 42px "Oxanium", sans-serif';
        em.font = '800 42px "Oxanium", sans-serif';
        g.fillText('GECE RADYO', 32, 98);
        em.fillText('GECE RADYO', 32, 98);

        g.fillStyle = '#fde047';
        em.fillStyle = '#fde047';
        g.font = 'bold 34px "JetBrains Mono", monospace';
        em.font = 'bold 34px "JetBrains Mono", monospace';
        g.fillText('98.4 FM · SYNTH', 32, 158);
        em.fillText('98.4 FM · SYNTH', 32, 158);
      },
    },
    {
      draw: (g: CanvasRenderingContext2D, em: CanvasRenderingContext2D) => {
        g.fillStyle = '#18181b';
        g.fillRect(0, 0, 512, 256);
        em.fillStyle = '#000000';
        em.fillRect(0, 0, 512, 256);

        g.fillStyle = '#dc2626';
        em.fillStyle = '#dc2626';
        g.fillRect(0, 0, 22, 256);
        em.fillRect(0, 0, 22, 256);

        g.fillStyle = '#ffffff';
        em.fillStyle = '#e5e7eb';
        g.font = '800 46px "Oxanium", sans-serif';
        em.font = '800 46px "Oxanium", sans-serif';
        g.fillText('APEX LASTİKLERİ', 44, 102);
        em.fillText('APEX LASTİKLERİ', 44, 102);

        g.fillStyle = '#a1a1aa';
        em.fillStyle = '#9ca3af';
        g.font = '600 22px "Plus Jakarta Sans", sans-serif';
        em.font = '600 22px "Plus Jakarta Sans", sans-serif';
        g.fillText('ISLAK VİRAJDA ÜSTÜN YOL TUTUŞ', 44, 164);
        em.fillText('ISLAK VİRAJDA ÜSTÜN YOL TUTUŞ', 44, 164);
      },
    },
  ];

  const billboardPairs: BillboardTexturePair[] = billboardSpecs.map((spec) => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const e = document.createElement('canvas');
    e.width = 512;
    e.height = 256;
    const g = c.getContext('2d')!;
    const em = e.getContext('2d')!;
    spec.draw(g, em);

    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = maxAniso;

    const emissiveMap = new THREE.CanvasTexture(e);
    emissiveMap.colorSpace = THREE.SRGBColorSpace;
    emissiveMap.anisotropy = maxAniso;

    return { map, emissiveMap };
  });

  // 9. Turkish Highway SOS Emergency Pillar Sign (128x128)
  const sosCanvas = document.createElement('canvas');
  sosCanvas.width = 128;
  sosCanvas.height = 128;
  const sox = sosCanvas.getContext('2d')!;
  sox.fillStyle = '#ea580c';
  sox.fillRect(0, 0, 128, 128);
  sox.strokeStyle = '#ffffff';
  sox.lineWidth = 6;
  sox.strokeRect(6, 6, 116, 116);
  sox.fillStyle = '#ffffff';
  sox.font = '800 44px "Oxanium", sans-serif';
  sox.textAlign = 'center';
  sox.textBaseline = 'middle';
  sox.fillText('SOS', 64, 54);
  sox.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
  sox.fillText('ACİL', 64, 96);
  const sosSignMap = new THREE.CanvasTexture(sosCanvas);
  sosSignMap.colorSpace = THREE.SRGBColorSpace;
  sosSignMap.anisotropy = maxAniso;

  // 10. Kilometer Marker Sign (128x128)
  const kmCanvas = document.createElement('canvas');
  kmCanvas.width = 128;
  kmCanvas.height = 128;
  const kmx = kmCanvas.getContext('2d')!;
  kmx.fillStyle = '#065f46';
  kmx.fillRect(0, 0, 128, 128);
  kmx.strokeStyle = '#f8fafc';
  kmx.lineWidth = 6;
  kmx.strokeRect(6, 6, 116, 116);
  kmx.fillStyle = '#ffffff';
  kmx.font = '800 38px "JetBrains Mono", monospace';
  kmx.textAlign = 'center';
  kmx.textBaseline = 'middle';
  kmx.fillText('O-4', 64, 46);
  kmx.fillStyle = '#fde047';
  kmx.font = 'bold 28px "Oxanium", sans-serif';
  kmx.fillText('KM', 64, 92);
  const kmSignMap = new THREE.CanvasTexture(kmCanvas);
  kmSignMap.colorSpace = THREE.SRGBColorSpace;
  kmSignMap.anisotropy = maxAniso;

  return {
    asphaltMap,
    asphaltRoughnessMap,
    shoulderMap,
    chevronMap,
    contactShadowMap,
    gantrySignMaps,
    trafficSignMaps,
    billboardPairs,
    sosSignMap,
    kmSignMap,
    dispose: () => {
      asphaltMap.dispose();
      asphaltRoughnessMap.dispose();
      shoulderMap.dispose();
      chevronMap.dispose();
      contactShadowMap.dispose();
      gantrySignMaps.forEach((t) => t.dispose());
      trafficSignMaps.forEach((t) => t.dispose());
      billboardPairs.forEach((p) => {
        p.map.dispose();
        p.emissiveMap.dispose();
      });
      sosSignMap.dispose();
      kmSignMap.dispose();
    },
  };
}
