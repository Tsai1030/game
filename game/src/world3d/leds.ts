import * as THREE from 'three';
import type { ToolSt } from '../data/world';
import type { LedColor } from '../render/palette';
import { ledColor } from './materials';

/** 一顆 LED：位置、顏色、亮法（常亮／規律閃／亂閃）與節奏；tool 是所屬機台 id。 */
export interface LedSpec {
  pos: THREE.Vector3;
  col: LedColor;
  kind: 'steady' | 'blink' | 'flick';
  rate: number;
  ph: number;
  duty: number;
  tool: string;
}

const fract = (v: number) => v - Math.floor(v);
const OFF = new THREE.Color(0x000000);

/** 整張地圖的 LED 共用一個 InstancedMesh（一次繪圖）。顏色超過 1 讓光暈（bloom）抓得到。 */
export class LedField {
  readonly mesh: THREE.InstancedMesh;
  private readonly cols: THREE.Color[];

  constructor(private readonly specs: LedSpec[]) {
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), new THREE.MeshBasicMaterial({ toneMapped: false }), Math.max(1, specs.length));
    this.mesh.name = 'leds';
    // LED 散在整張地圖上；整組一起被視錐剔除會讓 LED 突然全部消失，所以不剔除。
    this.mesh.frustumCulled = false;
    this.mesh.count = specs.length;
    const m = new THREE.Matrix4();
    specs.forEach((l, i) => {
      this.mesh.setMatrixAt(i, m.makeTranslation(l.pos.x, l.pos.y, l.pos.z));
      this.mesh.setColorAt(i, OFF);
    });
    this.cols = (['g', 'c', 'a', 'b', 'r', 'w'] as LedColor[]).reduce<THREE.Color[]>((a, k) => ((a[k.charCodeAt(0)] = new THREE.Color(ledColor(k)).multiplyScalar(1.6)), a), []);
  }

  /**
   * 依時間更新每顆的亮滅。紅燈只在機台告警時是紅的，否則顯示成綠燈（跟 2D 版規則相同）。
   * reduce（減少動態）時：常亮與規律閃的燈固定亮著，亂閃的固定滅。
   */
  update(t: number, reduce: boolean, stOf: (id: string) => ToolSt | undefined): void {
    this.specs.forEach((l, i) => {
      const on = reduce
        ? l.kind !== 'flick'
        : l.kind === 'steady' ||
          (l.kind === 'blink' ? fract(t * l.rate + l.ph) < l.duty : fract(Math.sin((Math.floor(t * 12) + l.ph * 977) * 12.9898) * 43758.5453) > 0.45);
      const st = stOf(l.tool);
      const k: LedColor = l.col === 'r' && st !== 'alarm' ? (st === 'inhibit' ? 'a' : 'g') : l.col;
      this.mesh.setColorAt(i, on ? this.cols[k.charCodeAt(0)]! : OFF);
    });
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
