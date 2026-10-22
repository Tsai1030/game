import * as THREE from 'three';
import { hashStr, rng } from '../core/random';
import { S } from '../core/state';
import type { Thing } from '../data/world';
import { C, type LedColor } from '../render/palette';
import type { LedSpec } from './leds';
import { GLOW } from './glow';
import { BODY, EDGE, ledColor, POD, solid, TOP } from './materials';

/** 機台機身高度（單位）。比例沿用 mockups/tools-threejs.html。 */
export const TOOL_H = { etch: 1.5, cvd: 1.5, litho: 1.5, met: 1.3, track: 1.3, wet: 1.0, stk: 3.0 } as const;
type ToolKind = keyof typeof TOOL_H;

export interface ToolModel {
  group: THREE.Group;
  leds: LedSpec[];
  /** 依時間與機台狀態更新腔體視窗、燈號塔、跑馬燈、告警紅光。 */
  update(t: number, reduce: boolean): void;
}

const hex = (css: string) => parseInt(css.slice(1), 16);
const BODY_MATS = [BODY, BODY, TOP, BODY, BODY, BODY];

function box(g: THREE.Group, w: number, h: number, d: number, mat: THREE.Material | THREE.Material[], x: number, y: number, z: number, name = '', edges = true): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  if (edges) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), EDGE));
  g.add(m);
  return m;
}

function cyl(g: THREE.Group, r0: number, r1: number, h: number, mat: THREE.Material, x: number, y: number, z: number, name = ''): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, 24), mat);
  m.name = name;
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

/** 正面左下的機台名牌（像素字）。沒有 2D 畫布時（測試）只留空白名牌。 */
function label(g: THREE.Group, id: string, x: number, y: number, z: number): void {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 24;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#07080b';
    ctx.fillRect(0, 0, 128, 24);
    ctx.fillStyle = C.tLabel;
    ctx.font = 'bold 16px monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(id, 6, 13);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.24), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
  m.name = 'label';
  m.position.set(x, y, z);
  g.add(m);
}

/** 機台表面上的一塊 LED 區。face：front（正面 z 最大）、top、side（右側 x 最大）。 */
type Zone = { n: number; at: (u: number, v: number) => THREE.Vector3 };
const zone = (n: number, face: 'front' | 'top' | 'side', a0: number, a1: number, b0: number, b1: number, c: number): Zone => ({
  n,
  at: (u, v) =>
    face === 'front'
      ? new THREE.Vector3(a0 + (a1 - a0) * u, b0 + (b1 - b0) * v, c + 0.012)
      : face === 'top'
        ? new THREE.Vector3(a0 + (a1 - a0) * u, c + 0.012, b0 + (b1 - b0) * v)
        : new THREE.Vector3(c + 0.012, b0 + (b1 - b0) * v, a0 + (a1 - a0) * u),
});

/** 每台機台用自己的 ID 當種子，LED 位置固定；只有 ETCH-07 有紅燈（跟 2D 版相同）。 */
function makeLeds(id: string, zones: Zone[]): LedSpec[] {
  const r = rng(hashStr(id));
  const pal = id === 'ETCH-07' ? 'ggcccbwarrr' : 'gggcccbbwa';
  const out: LedSpec[] = [];
  for (const z of zones)
    for (let k = 0; k < z.n; k++) {
      const pos = z.at(r(), r());
      const q = r();
      const col = pal[Math.floor(r() * pal.length)] as LedColor;
      out.push({ pos, col, kind: q < 0.22 ? 'steady' : q < 0.62 ? 'blink' : 'flick', rate: 0.4 + r() * 2.6, ph: r(), duty: 0.25 + r() * 0.55, tool: id });
    }
  return out;
}

/** 腔體視窗的顏色：ETCH-07 的 PM-B 告警時紅色閃爍、停機時琥珀色；PM-C 暗。 */
function pmColor(o: Thing, n: string, blink: boolean): number {
  if (o.id !== 'ETCH-07') return hex(C.win);
  if (n === 'B') {
    if (S.etch === 'alarm') return blink ? hex(C.red) : hex(C.redDim);
    if (S.etch === 'inhibit') return hex(C.amber);
    return hex(C.win);
  }
  return n === 'C' ? hex(C.winDim) : hex(C.win);
}

export function buildTool(o: Thing): ToolModel {
  const kind = o.kind as ToolKind;
  const h = TOOL_H[kind];
  const x0 = o.x;
  const z0 = o.y;
  const w = o.w;
  const d = o.h;
  const g = new THREE.Group();
  g.name = `tool:${o.id}`;
  g.userData.thing = o;
  box(g, w, h, d, BODY_MATS, x0 + w / 2, h / 2, z0 + d / 2, 'body');
  const pms: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[] = [];
  const dark = solid(0x1c1f2c, { metalness: 0.5, roughness: 0.45 });
  const foups = (n: number, y: number) => {
    box(g, 0.75 * n + 0.1, 0.12, 0.45, solid(0x22252f), x0 + 0.2 + (0.75 * n + 0.1) / 2, y - 0.3, z0 + d + 0.22);
    for (let k = 0; k < n; k++) box(g, 0.55, 0.48, 0.42, POD, x0 + 0.55 + k * 0.72, y, z0 + d + 0.22);
  };
  let zones: Zone[];
  switch (kind) {
    case 'etch':
    case 'cvd': {
      const cx = x0 + w / 2;
      const cz = z0 + d * 0.45;
      cyl(g, 0.42, 0.42, 0.22, dark, cx, h + 0.11, cz);
      const ch: [string, number, number][] =
        kind === 'etch'
          ? [['A', -1.65, 0.55], ['B', -0.95, -0.7], ['C', 0.95, -0.7], ['D', 1.65, 0.55]]
          : [['A', -1.65, 0.55], ['B', 0, -0.75], ['C', 1.65, 0.55]];
      for (const [n, dx, dz] of ch) {
        cyl(g, 0.46, 0.5, 0.36, dark, cx + dx, h + 0.18, cz + dz);
        const win = cyl(g, 0.3, 0.3, 0.02, new THREE.MeshStandardMaterial({ color: 0x0a0b10, emissive: hex(C.win), emissiveIntensity: GLOW.window }), cx + dx, h + 0.37, cz + dz, `pm:${n}`);
        pms.push(win as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>);
      }
      foups(3, 1.3);
      zones = [
        zone(26, 'front', x0 + 2.6, x0 + w - 0.15, 0.25, 1.25, z0 + d),
        zone(10, 'top', x0 + 0.1, x0 + 0.3, z0 + 0.2, z0 + d - 0.3, h),
        zone(10, 'top', x0 + w - 0.3, x0 + w - 0.1, z0 + 0.2, z0 + d - 0.3, h),
        zone(22, 'side', z0 + 0.2, z0 + d - 0.2, 0.2, h - 0.15, x0 + w),
      ];
      break;
    }
    case 'wet': {
      const liquid = new THREE.MeshStandardMaterial({ color: 0x3a8fb8, emissive: 0x0d3a52, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 });
      for (let k = 0; k < 5; k++) {
        box(g, 0.95, 0.06, 1.1, solid(0x2a2e40), x0 + 0.75 + k * 1.12, h + 0.03, z0 + 0.85);
        box(g, 0.8, 0.04, 0.95, liquid, x0 + 0.75 + k * 1.12, h + 0.065, z0 + 0.85, '', false);
      }
      foups(1, 1.1);
      zones = [zone(24, 'front', x0 + 1.6, x0 + w - 0.2, 0.25, 0.8, z0 + d), zone(14, 'side', z0 + 0.2, z0 + d - 0.2, 0.2, h - 0.1, x0 + w)];
      break;
    }
    case 'met': {
      cyl(g, 0.5, 0.5, 0.1, dark, x0 + 1.1, h + 0.05, z0 + 1.2);
      cyl(g, 0.35, 0.35, 0.02, solid(hex(C.tWafer)), x0 + 1.1, h + 0.11, z0 + 1.2);
      box(g, 1.0, 0.65, 0.06, [dark, dark, dark, dark, new THREE.MeshStandardMaterial({ color: 0x0a1418, emissive: hex(C.screen), emissiveIntensity: 0.5 }), dark], x0 + 2.7, h + 0.33, z0 + 0.7);
      foups(1, 1.25);
      zones = [
        zone(18, 'front', x0 + 1.4, x0 + w - 0.2, 0.25, 1.05, z0 + d),
        zone(14, 'side', z0 + 0.2, z0 + d - 0.2, 0.2, h - 0.15, x0 + w),
        zone(10, 'top', x0 + 0.1, x0 + 0.35, z0 + 0.2, z0 + d - 0.3, h),
      ];
      break;
    }
    case 'litho': {
      box(g, 1.2, 0.16, 0.7, solid(0x040507), x0 + 1.2, h + 0.08, z0 + 0.9);
      box(g, 0.2, 0.03, 0.08, new THREE.MeshBasicMaterial({ color: hex(C.amber), toneMapped: false }), x0 + 0.9, h + 0.175, z0 + 0.8, '', false);
      cyl(g, 0.6, 0.6, 0.35, dark, x0 + 3.0, h + 0.17, z0 + 1.3);
      cyl(g, 0.3, 0.3, 0.02, solid(0x040507), x0 + 3.0, h + 0.36, z0 + 1.3);
      box(g, 1.7, 0.18, 1.7, dark, x0 + 5.3, h + 0.09, z0 + 1.4);
      cyl(g, 0.5, 0.5, 0.02, solid(hex(C.tWafer)), x0 + 5.3, h + 0.19, z0 + 1.4);
      zones = [
        zone(30, 'front', x0 + 0.3, x0 + w - 0.3, 0.25, 1.25, z0 + d),
        zone(16, 'side', z0 + 0.2, z0 + d - 0.2, 0.2, h - 0.15, x0 + w),
        zone(14, 'top', x0 + 3.9, x0 + 4.3, z0 + 0.2, z0 + d - 0.3, h),
      ];
      break;
    }
    case 'track': {
      for (let k = 0; k < 4; k++) {
        cyl(g, 0.42, 0.42, 0.14, dark, x0 + 0.9 + k * 1.4, h + 0.07, z0 + 1.1);
        cyl(g, 0.3, 0.3, 0.02, solid(hex(C.tWafer)), x0 + 0.9 + k * 1.4, h + 0.15, z0 + 1.1);
        box(g, 0.6, 0.04, 0.08, new THREE.MeshBasicMaterial({ color: hex(C.redDim) }), x0 + 0.9 + k * 1.4, h + 0.02, z0 + d - 0.35, '', false);
      }
      zones = [
        zone(24, 'front', x0 + 0.3, x0 + w - 0.3, 0.25, 1.05, z0 + d),
        zone(14, 'side', z0 + 0.2, z0 + d - 0.2, 0.2, h - 0.15, x0 + w),
        zone(12, 'top', x0 + 0.15, x0 + w - 0.15, z0 + d - 0.25, z0 + d - 0.15, h),
      ];
      break;
    }
    case 'stk': {
      box(g, w - 0.5, h - 0.9, 0.06, solid(0x05080c), x0 + w / 2, 1.65, z0 + d - 0.02, '', false);
      for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) box(g, 0.55, 0.42, 0.3, POD, x0 + 0.65 + k * 0.9, 0.75 + r * 0.7, z0 + d + 0.06, '', false);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.5, h - 0.9), new THREE.MeshStandardMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.9, depthWrite: false }));
      glass.position.set(x0 + w / 2, 1.65, z0 + d + 0.25);
      g.add(glass);
      zones = [zone(40, 'side', z0 + 0.2, z0 + d - 0.2, 0.3, h - 0.2, x0 + w), zone(16, 'top', x0 + 0.2, x0 + w - 0.2, z0 + 0.2, z0 + 0.6, h)];
      break;
    }
  }
  if (kind !== 'stk') label(g, o.id, x0 + 0.85, 0.3, z0 + d + 0.006);
  // 燈號塔：右後角；紅（告警閃）、黃（待機／停機）、綠（運轉）。
  const tx = x0 + w - 0.35;
  const tz = z0 + 0.35;
  box(g, 0.05, 0.55, 0.05, solid(0x2a2d3a), tx, h + 0.27, tz, '', false);
  const lamp = (k: LedColor, dy: number) =>
    cyl(g, 0.09, 0.09, 0.11, new THREE.MeshStandardMaterial({ color: 0x34304a, emissive: ledColor(k), emissiveIntensity: 0 }), tx, h + dy, tz, `lamp:${k}`) as THREE.Mesh<
      THREE.BufferGeometry,
      THREE.MeshStandardMaterial
    >;
  const lamps = { r: lamp('r', 0.75), a: lamp('a', 0.63), g: lamp('g', 0.51) };
  // 跑馬燈：正面最下面一顆來回跑的亮點。
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: ledColor('c'), toneMapped: false }));
  head.name = 'strip';
  head.position.set(x0 + 0.3, 0.08, z0 + d + 0.015);
  g.add(head);
  // 會告警的機台（ETCH-07）腳下一盞紅光。
  const alarm = o.act === 'etch07' ? new THREE.PointLight(hex(C.red), 0, 7, 1.6) : null;
  if (alarm) {
    alarm.position.set(x0 + w / 2, 1.1, z0 + d + 0.8);
    g.add(alarm);
  }
  const leds = makeLeds(o.id, zones);
  const fract = (v: number) => v - Math.floor(v);
  return {
    group: g,
    leds,
    update(t, reduce) {
      const blink = reduce || Math.floor(t * 2.5) % 2 === 0;
      for (const m of pms) {
        const n = m.name.slice(3);
        m.material.emissive.setHex(pmColor(o, n, blink));
        m.material.emissiveIntensity = o.id === 'ETCH-07' && n === 'B' && S.etch === 'alarm' && blink ? GLOW.windowAlarm : GLOW.window;
      }
      lamps.r.material.emissiveIntensity = o.st === 'alarm' && blink ? GLOW.lampAlarm : 0;
      lamps.a.material.emissiveIntensity = o.st === 'idle' || o.st === 'inhibit' ? GLOW.lamp : 0;
      lamps.g.material.emissiveIntensity = o.st === 'run' ? GLOW.lamp : 0;
      const sk: LedColor = o.st === 'alarm' ? 'r' : o.st === 'inhibit' ? 'a' : 'c';
      (head.material as THREE.MeshBasicMaterial).color.setHex(ledColor(sk));
      head.position.x = reduce ? x0 + w / 2 : x0 + 0.3 + fract(t * 0.35 + (hashStr(o.id) % 10) / 10) * (w - 0.6);
      if (alarm) alarm.intensity = o.st === 'alarm' ? (blink ? GLOW.alarmLight : GLOW.alarmLightDim) : 0;
    },
  };
}
