import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { on } from '../core/bus';
import { t } from '../core/i18n';
import { settings } from '../core/settings';
import { S } from '../core/state';
import { MAP, MH, MW, refreshNpcs, region, T, TS } from '../data/world';
import { doInteract } from '../game/actions';
import { held } from '../game/input';
import { Mover } from '../game/movement';
import { busy, rt } from '../game/runtime';
import { fireTrigger, onArrive, setFader } from '../game/travel';
import { isDialogOpen } from '../ui/dialog';
import { fadeIn, fadeOut } from '../ui/fade';
import { hideShower, setLocation, setPrompt, showBanner, showShower } from '../ui/hud';
import { advanceScene, pumpQueue } from '../ui/scene';
import { toast } from '../ui/toast';
import { followTarget, halfHeight, placeCamera, viewHalf } from './camera';
import { WorldModel } from './model';
import { pickAt } from './pick';
import { quality } from './quality';

const SHOWER_SEC = 1.4;

/** 舞台高度：盡量吃滿視窗，但不超過寬度的比例（沿用 2D 版的取法）。 */
function stageHeight(w: number, innerH: number): number {
  const narrow = w < 700;
  return Math.round(Math.max(narrow ? 300 : 420, Math.min(innerH - (narrow ? 300 : 140), narrow ? w * 1.2 : w * 0.68)));
}

/**
 * 3D 世界畫面（取代 Phaser）：WebGL 繪圖、光暈、跟隨相機、點擊選取、每格更新、換地圖的淡入淡出。
 * 整個遊戲只建一個，只跑一個 requestAnimationFrame 迴圈。
 */
export class WorldView {
  readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly model = new WorldModel();
  private readonly cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  private target = new THREE.Vector3();
  private shownMap = '';
  private last = 0;
  private lastWarn = -Infinity;
  private readonly mover = new Mover({
    onArrive: (prevX) => this.arrive(prevX),
    onInteract: (o) => doInteract(o),
    onWarnSuit: () => this.warnSuit(),
    onUnreachable: () => toast(t('toast.cantReach')),
  });

  constructor(private readonly stage: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    const r = this.renderer;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.15;
    this.canvas = r.domElement;
    this.canvas.tabIndex = 0;
    this.canvas.dataset.i18nAria = 'game.canvasAria';
    stage.prepend(this.canvas);
    this.composer = new EffectComposer(r);
    this.composer.addPass(new RenderPass(this.model.scene, this.cam));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.95, 0.45, 0.55);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.canvas.addEventListener('pointerdown', (e) => this.onPointer(e));
    new ResizeObserver(() => this.resize()).observe(stage);
    window.addEventListener('resize', () => this.resize());
    // 新遊戲／讀檔：換到別張地圖就重建，同一張就只更新 NPC 與移動狀態。
    on('reset', () => this.reset());
    // 換地圖：遮罩淡出 → 換過去並重建 → 顯示地點名稱 → 淡入。
    setFader((go, done) => {
      void (async () => {
        await fadeOut(200);
        go();
        this.rebuild();
        this.resetMotion();
        showBanner(region(S.x, S.y));
        await fadeIn(200);
        done();
      })();
    });
  }

  start(): void {
    this.resize();
    this.rebuild();
    requestAnimationFrame(this.frame);
  }

  /** 依目前地圖重建整個場景，鏡頭直接對準玩家。 */
  rebuild(): void {
    this.model.build();
    this.shownMap = MAP.id;
    const q = quality(this.stage.clientWidth, devicePixelRatio);
    this.model.scene.traverse((o) => {
      if ((o as THREE.DirectionalLight).isDirectionalLight) (o as THREE.DirectionalLight).shadow.mapSize.set(q.shadowMap, q.shadowMap);
    });
    this.snapCamera();
  }

  private reset(): void {
    if (MAP.id !== this.shownMap) this.rebuild();
    else this.model.syncNpcs();
    this.resetMotion();
    this.snapCamera();
  }

  /** 清掉移動、風淋、互動提示，更新地點名稱。 */
  private resetMotion(): void {
    this.mover.reset();
    rt.shower = 0;
    rt.near = null;
    setPrompt(null);
    hideShower();
    setLocation(region(S.x, S.y));
  }

  private snapCamera(): void {
    this.target = followTarget(this.target, S.x * TS, S.y * TS, MW, MH, 1, viewHalf(this.cam));
    placeCamera(this.cam, this.target);
  }

  private resize(): void {
    const w = this.stage.clientWidth;
    const h = stageHeight(w, innerHeight);
    this.stage.style.height = `${h}px`;
    const q = quality(w, devicePixelRatio);
    this.renderer.setPixelRatio(q.pixelRatio);
    this.composer.setPixelRatio(q.pixelRatio);
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    const half = halfHeight(q.narrow);
    Object.assign(this.cam, { left: (-half * w) / h, right: (half * w) / h, top: half, bottom: -half });
    this.cam.updateProjectionMatrix();
  }

  private frame = (now: number): void => {
    // 先排下一格：就算這一格出錯，迴圈也不會停。
    requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, (now - this.last) / 1000 || 0);
    this.last = now;
    if (MAP.id !== this.shownMap) return;
    const tt = now / 1000;
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
    // 「減少動態」時，踩到門會在 tick 裡直接換地圖。
    if (MAP.id !== this.shownMap) return;
    // 劇情旗標改變時，NPC 可能出現或消失。
    if (refreshNpcs(S)) this.model.syncNpcs();
    const near = busy() ? null : m.nearObj();
    if (near !== rt.near) {
      rt.near = near;
      setPrompt(near);
    }
    this.target = followTarget(this.target, m.px, m.py, MW, MH, 0.15, viewHalf(this.cam));
    placeCamera(this.cam, this.target);
    this.model.update(tt, dt, { px: m.px, py: m.py, dir: S.dir, moving: !!m.step, walkT: m.walkT, near: rt.near, marker: m.marker, reduce: settings.reduceMotion });
    this.composer.render(dt);
  };

  private onPointer(e: PointerEvent): void {
    this.canvas.focus({ preventScroll: true });
    if (isDialogOpen()) return advanceScene();
    if (busy()) return;
    held.length = 0;
    const r = this.canvas.getBoundingClientRect();
    const hit = pickAt(this.cam, ((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1, this.model.pickables());
    if (!hit) return;
    if ('thing' in hit) this.mover.click(hit.thing.x * TS, hit.thing.y * TS, hit.thing);
    else this.mover.click(hit.wx, hit.wy, null);
  }

  private arrive(prevX: number): void {
    setLocation(region(S.x, S.y));
    // 踩到門：換地圖；門鎖著就播原因、停下腳步。
    const exit = onArrive();
    if (exit === 'locked') this.mover.reset();
    if (exit) return;
    if (fireTrigger()) this.mover.reset();
    if (T[S.y]![S.x] === 'A' && prevX < S.x) {
      rt.shower = SHOWER_SEC;
      showShower();
    }
  }

  private warnSuit(): void {
    const now = performance.now();
    if (now - this.lastWarn < 1500) return;
    this.lastWarn = now;
    toast(t('toast.noSuit'), 'bad');
  }
}
