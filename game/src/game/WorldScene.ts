import Phaser from 'phaser';
import { on } from '../core/bus';
import { t } from '../core/i18n';
import { settings } from '../core/settings';
import { S } from '../core/state';
import { MAP, MH, MW, NPC, OBJ, region, T, TS, type LookId } from '../data/world';
import { drawArrow, drawMarker, drawOht } from '../render/oht';
import { canvasPainter, gfxPainter, type Painter } from '../render/paint';
import { drawPerson, LOOK } from '../render/person';
import { drawMap } from '../render/tiles';
import { floorGlow, objDyn, objStatic, STATIC_PAD } from '../render/tools';
import { isDialogOpen } from '../ui/dialog';
import { advanceScene, pumpQueue } from '../ui/scene';
import { hideShower, setLocation, setPrompt, showShower } from '../ui/hud';
import { toast } from '../ui/toast';
import { doInteract } from './actions';
import { held } from './input';
import { Mover } from './movement';
import { busy, rt } from './runtime';

const DIRS = ['up', 'down', 'left', 'right'] as const;
const SHOWER_SEC = 1.4;

interface Layer {
  gfx: Phaser.GameObjects.Graphics;
  glowG: Phaser.GameObjects.Graphics;
  fx: Painter;
  glow: Painter;
}

/**
 * 遊戲畫面：把繪製模組的結果做成貼圖（靜態）和 Graphics（動態），
 * 以「底部 y」當深度排序前後；移動邏輯交給 Mover。
 */
export class WorldScene extends Phaser.Scene {
  private readonly layers = new Map<string, Layer>();
  private readonly npcImg = new Map<string, Phaser.GameObjects.Image>();
  private floorG!: Phaser.GameObjects.Graphics;
  private floorP!: Painter;
  private overG!: Phaser.GameObjects.Graphics;
  private overP!: Painter;
  private player!: Phaser.GameObjects.Image;
  private lastWarn = -Infinity;
  private readonly mover = new Mover({
    onArrive: (px) => this.arrive(px),
    onInteract: (o) => doInteract(o),
    onWarnSuit: () => this.warnSuit(),
    onUnreachable: () => toast(t('toast.cantReach')),
  });

  constructor() {
    super('world');
  }

  create(): void {
    // 換地圖時整個場景重建；Map 欄位會跨重建保留，先清空。貼圖每張地圖各一份，建過就沿用。
    this.layers.clear();
    this.npcImg.clear();
    const mapKey = `map_${MAP.id}`;
    if (!this.textures.exists(mapKey)) {
      const map = this.textures.createCanvas(mapKey, MW * TS, MH * TS)!;
      drawMap(canvasPainter(map.context));
      map.refresh();
    }
    this.add.image(0, 0, mapKey).setOrigin(0).setDepth(-10000);
    this.floorG = this.add.graphics().setDepth(-9000);
    this.floorP = gfxPainter(this.floorG);

    for (const o of OBJ) {
      const key = `obj_${MAP.id}_${o.id}`;
      if (!this.textures.exists(key)) {
        const tex = this.textures.createCanvas(key, o.w * TS + STATIC_PAD.x * 2, o.h * TS + STATIC_PAD.top + STATIC_PAD.bottom)!;
        objStatic(canvasPainter(tex.context), o, STATIC_PAD.x, STATIC_PAD.top);
        tex.refresh();
      }
      const bottom = (o.y + o.h) * TS;
      this.add.image(o.x * TS - STATIC_PAD.x, o.y * TS - STATIC_PAD.top, key).setOrigin(0).setDepth(bottom);
      const gfx = this.add.graphics().setDepth(bottom + 0.01);
      const glowG = this.add.graphics().setDepth(bottom + 0.02).setBlendMode(Phaser.BlendModes.ADD);
      this.layers.set(o.id, { gfx, glowG, fx: gfxPainter(gfx), glow: gfxPainter(glowG) });
    }

    // 人物貼圖：每種外觀 × 4 方向 × 3 格（站立、左腳、右腳）。
    for (const id of Object.keys(LOOK) as LookId[])
      for (const d of DIRS)
        for (let f = 0; f < 3; f++) {
          if (this.textures.exists(`p_${id}_${d}_${f}`)) continue;
          const tex = this.textures.createCanvas(`p_${id}_${d}_${f}`, 16, 24)!;
          drawPerson(canvasPainter(tex.context), 0, 7, d, f === 2 ? 1 : 0, f > 0, LOOK[id]);
          tex.refresh();
        }
    for (const n of NPC) {
      const img = this.add.image(n.x * TS, n.y * TS - 7, `p_${n.look}_${n.dir}_0`).setOrigin(0).setDepth((n.y + 1) * TS);
      this.npcImg.set(n.id, img);
    }
    this.player = this.add.image(0, 0, 'p_office_up_0').setOrigin(0);
    this.overG = this.add.graphics().setDepth(1e6);
    this.overP = gfxPainter(this.overG);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointer(p));
    const off = on('reset', () => this.resetWorld());
    this.events.once('shutdown', off);
    this.resetWorld();
  }

  /** 新遊戲或讀檔之後：清掉移動狀態、風淋、地點名稱。 */
  private resetWorld(): void {
    this.mover.reset();
    rt.shower = 0;
    rt.near = null;
    hideShower();
    setLocation(region(S.x, S.y));
  }

  private arrive(prevX: number): void {
    setLocation(region(S.x, S.y));
    if (T[S.y]![S.x] === 'A' && prevX < S.x) {
      rt.shower = SHOWER_SEC;
      showShower();
    }
  }

  private warnSuit(): void {
    const now = this.time.now;
    if (now - this.lastWarn < 1500) return;
    this.lastWarn = now;
    toast(t('toast.noSuit'), 'bad');
  }

  private onPointer(p: Phaser.Input.Pointer): void {
    this.game.canvas.focus({ preventScroll: true });
    if (isDialogOpen()) return advanceScene();
    if (busy()) return;
    held.length = 0;
    this.mover.click(p.worldX, p.worldY);
  }

  update(time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    const tt = time / 1000;
    const reduce = settings.reduceMotion;
    if (rt.shower > 0) {
      rt.shower -= dt;
      if (rt.shower <= 0) {
        rt.shower = 0;
        hideShower();
        toast(t('toast.showerDone'));
      }
    }
    // 排隊中的劇情（例如 LINE 回報）等玩家空下來再播。
    pumpQueue();
    const m = this.mover;
    m.tick(dt, held[held.length - 1], busy);

    // 鏡頭：跟著玩家，不超出地圖；地圖比畫面小時置中。
    const VW = this.scale.width;
    const VH = this.scale.height;
    const mw = MW * TS;
    const mh = MH * TS;
    const cx = mw <= VW ? -((VW - mw) >> 1) : Phaser.Math.Clamp(Math.round(m.px + 8 - VW / 2), 0, mw - VW);
    const cy = mh <= VH ? -((VH - mh) >> 1) : Phaser.Math.Clamp(Math.round(m.py + 8 - VH / 2), 0, mh - VH);
    this.cameras.main.setScroll(cx, cy);

    const look = S.suit ? 'suit' : 'office';
    const frame = m.step ? (Math.floor(m.walkT * 7) % 2 ? 2 : 1) : 0;
    this.player
      .setTexture(`p_${look}_${S.dir}_${frame}`)
      .setPosition(Math.round(m.px), Math.round(m.py) - 7)
      .setDepth(m.py + TS + 0.5);
    for (const n of NPC) this.npcImg.get(n.id)!.setTexture(`p_${n.look}_${n.dir}_0`);

    const near = busy() ? null : m.nearObj();
    if (near !== rt.near) {
      rt.near = near;
      setPrompt(near);
    }
    this.drawDynamic(tt, cx, cy, VW, VH, reduce);
  }

  /** 每格重畫：告警地板光、機台燈號與 LED（只畫畫面內的）、天車、目的地框、互動箭頭。 */
  private drawDynamic(tt: number, cx: number, cy: number, VW: number, VH: number, reduce: boolean): void {
    this.floorG.clear();
    for (const o of OBJ) {
      const L = this.layers.get(o.id)!;
      L.gfx.clear();
      L.glowG.clear();
      const X = o.x * TS;
      const Y = o.y * TS;
      if (X + o.w * TS + 8 < cx || X - 8 > cx + VW || Y + o.h * TS + 8 < cy || Y - 32 > cy + VH) continue;
      floorGlow(this.floorP, o, X, Y, tt, reduce);
      objDyn(L.fx, L.glow, o, X, Y, tt, reduce);
    }
    this.overG.clear();
    if (MAP.oht) drawOht(this.overP, tt, reduce);
    if (this.mover.marker && (reduce || Math.floor(tt * 4) % 2 === 0)) drawMarker(this.overP, this.mover.marker);
    if (rt.near) drawArrow(this.overP, rt.near, tt, reduce);
  }
}
