import * as THREE from 'three';
import { S, type Dir } from '../core/state';
import { LOOK } from '../data/looks';
import { MAP, NPC, OBJ, T, type Thing } from '../data/world';
import type { Pt } from '../systems/path';
import { buildFurniture, type FurnModel } from './furniture';
import { buildGround } from './ground';
import { LedField } from './leds';
import { buildOht } from './oht';
import { buildPerson, type PersonModel } from './person';
import { buildTool, TOOL_H, type ToolModel } from './tools';
import { toWorld } from './units';

/** 每格畫面需要的執行期狀態（移動、互動對象、目的地框、減少動態）。 */
export interface ViewState {
  px: number;
  py: number;
  dir: Dir;
  moving: boolean;
  walkT: number;
  near: Thing | null;
  marker: Pt | null;
  reduce: boolean;
  /** 鏡頭對準的地面點（世界單位）；平行光和陰影範圍跟著它。 */
  focus: { x: number; z: number };
}

const isTool = (o: Thing) => o.kind in TOOL_H;

/**
 * 3D 世界的場景（不需要 WebGL，測試可以直接建）。
 * build() 依目前地圖（MAP、T、OBJ、NPC）建出全部；換地圖時再呼叫一次。
 */
export class WorldModel {
  readonly scene = new THREE.Scene();
  private tools: ToolModel[] = [];
  private furn: FurnModel[] = [];
  private leds: LedField | null = null;
  private oht: ReturnType<typeof buildOht> | null = null;
  private readonly npcs = new Map<string, { thing: Thing; person: PersonModel }>();
  private picks: THREE.Object3D[] = [];
  /** 擋住點擊的東西：牆、玻璃、風淋室門框、不能互動的家具。 */
  private blocks: THREE.Object3D[] = [];
  private tops = new Map<Thing, number>();
  private player: { office: PersonModel; suit: PersonModel; root: THREE.Group } | null = null;
  private sun = new THREE.DirectionalLight(0xdfe6ff, 1.4);
  private ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 24), new THREE.MeshBasicMaterial({ color: 0x5fd0c4, toneMapped: false, side: THREE.DoubleSide }));
  private arrow = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.26, 4), new THREE.MeshBasicMaterial({ color: 0xffe08a, toneMapped: false }));

  build(): void {
    this.dispose();
    const sc = this.scene;
    sc.background = new THREE.Color(0x050507);
    const groundG = buildGround(T);
    sc.add(groundG);
    this.blocks = groundG.children.filter((c) => c.name !== 'floor');
    for (const o of OBJ) {
      const m = isTool(o) ? buildTool(o) : buildFurniture(o);
      if (!m) continue;
      sc.add(m.group);
      if (isTool(o)) this.tools.push(m as ToolModel);
      else this.furn.push(m as FurnModel);
      if (o.act) this.picks.push(m.group);
      else this.blocks.push(m.group);
      this.tops.set(o, new THREE.Box3().setFromObject(m.group).max.y);
    }
    const specs = this.tools.flatMap((t) => t.leds);
    if (specs.length) {
      this.leds = new LedField(specs);
      sc.add(this.leds.mesh);
    }
    if (MAP.oht) {
      this.oht = buildOht();
      sc.add(this.oht.group);
    }
    const root = new THREE.Group();
    root.name = 'player';
    const office = buildPerson(LOOK.office);
    const suit = buildPerson(LOOK.suit);
    root.add(office.group, suit.group);
    sc.add(root);
    this.player = { office, suit, root };
    this.syncNpcs();
    sc.add(new THREE.HemisphereLight(0x8890c0, 0x0a0a12, 0.55));
    this.sun = new THREE.DirectionalLight(0xdfe6ff, 1.4);
    this.sun.castShadow = true;
    Object.assign(this.sun.shadow.camera, { left: -14, right: 14, top: 12, bottom: -12, near: 1, far: 60 });
    sc.add(this.sun, this.sun.target);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.visible = false;
    this.arrow.rotation.x = Math.PI;
    this.arrow.visible = false;
    sc.add(this.ring, this.arrow);
  }

  /** 讓場景裡的 NPC 人物跟目前的 NPC 清單一致（劇情旗標改變時呼叫）。 */
  syncNpcs(): void {
    const ids = new Set(NPC.map((n) => n.id));
    for (const [id, e] of this.npcs) {
      if (ids.has(id) && e.thing === NPC.find((n) => n.id === id)) continue;
      this.scene.remove(e.person.group);
      disposeTree(e.person.group);
      this.npcs.delete(id);
    }
    for (const n of NPC) {
      if (this.npcs.has(n.id)) continue;
      const person = buildPerson(LOOK[n.look ?? 'office']);
      person.group.name = `npc:${n.id}`;
      person.group.userData.thing = n;
      person.group.position.set(n.x + 0.5, 0, n.y + 0.5);
      this.scene.add(person.group);
      this.npcs.set(n.id, { thing: n, person });
    }
  }

  /** 可以點選的模型（userData.thing 是對應的物件或 NPC）。 */
  pickables(): THREE.Object3D[] {
    return [...this.picks, ...[...this.npcs.values()].map((e) => e.person.group)];
  }

  blockers(): THREE.Object3D[] {
    return this.blocks;
  }

  update(t: number, _dt: number, v: ViewState): void {
    for (const m of this.tools) m.update(t, v.reduce);
    for (const m of this.furn) m.update(t, v.reduce);
    this.leds?.update(t, v.reduce, (id) => OBJ.find((o) => o.id === id)?.st);
    this.oht?.update(t, v.reduce);
    for (const { thing, person } of this.npcs.values()) {
      person.group.position.set(thing.x + 0.5, 0, thing.y + 0.5);
      person.setDir(thing.dir ?? 'down');
    }
    const p = this.player;
    if (p) {
      const { x, z } = toWorld(v.px, v.py);
      p.root.position.set(x + 0.5, 0, z + 0.5);
      p.office.group.visible = !S.suit;
      p.suit.group.visible = S.suit;
      for (const m of [p.office, p.suit]) {
        m.setDir(v.dir);
        m.setWalk(v.walkT, v.moving && !v.reduce);
      }
    }
    // 平行光跟著畫面中心（不是玩家）：鏡頭停在地圖邊上時，畫面裡的陰影也都算得到。
    const f = v.focus;
    this.sun.target.position.set(f.x, 0, f.z);
    this.sun.position.set(f.x - 9, 16, f.z + 10);
    this.ring.visible = !!v.marker && (v.reduce || Math.floor(t * 4) % 2 === 0);
    if (v.marker) this.ring.position.set(v.marker.x + 0.5, 0.02, v.marker.y + 0.5);
    this.arrow.visible = !!v.near;
    if (v.near) {
      const top = v.near.npc ? 1.4 : (this.tops.get(v.near) ?? 1);
      const bob = v.reduce ? 0 : Math.abs(Math.sin(t * 4)) * 0.12;
      this.arrow.position.set(v.near.x + v.near.w / 2, top + 0.35 + bob, v.near.y + v.near.h / 2);
    }
  }

  /** 釋放這張地圖建出來的幾何與材質，清空場景（換地圖或關閉時）。 */
  dispose(): void {
    disposeTree(this.scene, new Set<unknown>([this.ring.geometry, this.ring.material, this.arrow.geometry, this.arrow.material]));
    this.scene.clear();
    this.tools = [];
    this.furn = [];
    this.leds = null;
    this.oht = null;
    this.npcs.clear();
    this.picks = [];
    this.blocks = [];
    this.tops.clear();
    this.player = null;
  }
}

/** 釋放一棵物件樹的幾何與材質（keep 裡的留著重用）。共用材質釋放後下次使用會自動重新上傳。 */
function disposeTree(root: THREE.Object3D, keep = new Set<unknown>()): void {
  root.traverse((o) => {
    // 平行光的陰影貼圖、LED 的 instance 緩衝區都在顯示卡上，不會自己回收。
    if ((o as THREE.DirectionalLight).isDirectionalLight) (o as THREE.DirectionalLight).dispose();
    if ((o as THREE.InstancedMesh).isInstancedMesh) (o as THREE.InstancedMesh).dispose();
    const m = o as THREE.Mesh;
    if (m.geometry && !keep.has(m.geometry)) m.geometry.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const mat of mats) {
      if (keep.has(mat)) continue;
      (mat as THREE.MeshStandardMaterial).map?.dispose();
      mat.dispose();
    }
  });
}
