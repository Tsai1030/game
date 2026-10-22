import type { Bi } from '../core/i18n';
import type { Dir, EvidenceItem, GameState, MapId, NpcId, TacticId } from '../core/state';
import type { AskTopic, Beat, Cond, Effect, Labels, Scene, ScriptLine } from '../data/script';
import { addClue } from './clues';
import { COFFEE_MAX } from './coffee';
import { addEvidence, countEvidence, hasEvidence } from './evidence';
import { addRel, askOutcome } from './relations';
import { RESPONSES, responseEffect } from './responses';
import { applySanity, FORCED_LEAVE_SANITY, zeroOutcome } from './sanity';

export type Frame =
  | { kind: 'line'; line: ScriptLine; canRecognize: boolean }
  | { kind: 'choice'; options: { id: string; zh: string; en: string; enabled: boolean }[] }
  | { kind: 'card'; card: { kind: 'chapter' | 'notice' | 'end' } & Bi }
  | { kind: 'end' };

export type RunnerEvent =
  | { kind: 'zero'; outcome: 'forcedLeave' | 'burnout' }
  | { kind: 'codex'; id: TacticId }
  | { kind: 'evidence'; item: EvidenceItem }
  | { kind: 'clue'; id: string }
  | { kind: 'warp'; map: MapId; x: number; y: number; dir: Dir };

export interface RunnerEnv {
  state(): GameState;
  /** 目前遊戲時間 'HH:MM'，用在自動記錄的證據。 */
  clock(): string;
  scenes: Record<string, Scene>;
  asks: Record<string, AskTopic>;
  labels: Labels;
}

/** 條件判斷：列出的每一項都要成立。 */
export function evalCond(s: GameState, c: Cond): boolean {
  const list = (v: string | string[]) => (Array.isArray(v) ? v : [v]);
  if (c.flag !== undefined && !list(c.flag).every((f) => s.flags.includes(f))) return false;
  if (c.notFlag !== undefined && list(c.notFlag).some((f) => s.flags.includes(f))) return false;
  if (c.chapter !== undefined && s.chapter !== c.chapter) return false;
  if (c.evidence && !hasEvidence(s.evidence, c.evidence)) return false;
  if (c.evidenceMin && countEvidence(s.evidence, c.evidenceMin.ids) < c.evidenceMin.n) return false;
  if (c.clues !== undefined && s.clues.length < c.clues) return false;
  if (c.suit !== undefined && s.suit !== c.suit) return false;
  if (c.solved !== undefined && s.solved !== c.solved) return false;
  if (c.rel && s.rel[c.rel.npc] < c.rel.min) return false;
  return true;
}

function sanityDelta(s: GameState, delta: number, recognized: boolean, out: RunnerEvent[]): void {
  const r = applySanity(s.sanity, delta, recognized);
  s.sanity = r.value;
  if (!r.hitZero) return;
  const outcome = zeroOutcome(s.zeroCount);
  s.zeroCount = Math.min(2, s.zeroCount + 1);
  if (outcome === 'forcedLeave') s.sanity = FORCED_LEAVE_SANITY;
  out.push({ kind: 'zero', outcome });
}

/** 套用效果（直接修改 s），回傳產生的事件。理智歸零時處理強制請假／燃盡。 */
export function applyEffect(s: GameState, e: Effect, recognized = false): RunnerEvent[] {
  const out: RunnerEvent[] = [];
  if (e.rel) for (const [npc, d] of Object.entries(e.rel)) s.rel = addRel(s.rel, npc as NpcId, d ?? 0);
  if (e.flag !== undefined && !s.flags.includes(e.flag)) s.flags = [...s.flags, e.flag];
  if (e.unflag !== undefined) s.flags = s.flags.filter((f) => f !== e.unflag);
  if (e.coffee !== undefined) s.coffee = Math.max(0, Math.min(COFFEE_MAX, s.coffee + e.coffee));
  if (e.clue !== undefined) {
    const r = addClue(s.clues, e.clue);
    if (r.added) {
      s.clues = r.list;
      out.push({ kind: 'clue', id: e.clue });
    }
  }
  if (e.suit !== undefined) {
    s.suit = e.suit;
    if (e.suit) s.everSuit = true;
  }
  if (e.time !== undefined) {
    const [h, m] = e.time.split(':').map(Number);
    s.sec = (h ?? 0) * 3600 + (m ?? 0) * 60;
  }
  if (e.chapter !== undefined) {
    s.chapter = e.chapter;
    // 記下這一章開始時的理智（同一個效果裡的理智變化最後才套用）。
    s.chapterSanity = s.sanity;
  }
  if (e.etch !== undefined) s.etch = e.etch;
  if (e.warp) {
    const { map, x, y, dir = 'up' } = e.warp;
    Object.assign(s, { map, x, y, dir });
    out.push({ kind: 'warp', map, x, y, dir });
  }
  if (e.sanity !== undefined) sanityDelta(s, e.sanity, recognized, out);
  return out;
}

/** 執行器內部用的段落：問人的結果在玩家選完問法之後才決定。 */
type InnerBeat = Beat | { askResolve: { npc: NpcId; topic: string; checked: boolean } };
interface Option {
  id: string;
  zh: string;
  en: string;
  enabled: boolean;
  do: InnerBeat[];
}

/** 走訪劇情的每個段落，包含 if 分支、選項和四種回應之後的段落。 */
export function walkBeats(scene: Scene, visit: (b: Beat) => void): void {
  for (const b of scene) {
    visit(b);
    if ('choice' in b) for (const o of b.choice) walkBeats(o.do, visit);
    if ('if' in b) {
      walkBeats(b.then, visit);
      if (b.else) walkBeats(b.else, visit);
    }
    if ('respond' in b) for (const after of Object.values(b.respond.after ?? {})) if (after) walkBeats(after, visit);
  }
}

/** run() 一次最多連續處理幾個不用玩家操作的段落；超過就當成劇本寫成了迴圈。 */
const MAX_STEPS = 500;

/**
 * 劇本執行器：依遊戲狀態逐段執行，停在台詞、選項或卡片上等玩家操作。
 * 不碰 DOM；介面層讀 current() 來畫，玩家操作時呼叫 advance／choose／recognize／note。
 */
export class ScriptRunner {
  private stack: { beats: InnerBeat[]; i: number }[] = [];
  private frame: Frame = { kind: 'end' };
  private options: Option[] = [];
  private recognized = false;
  private attempted = false;
  private queue: RunnerEvent[] = [];
  private sceneId = '';

  constructor(private readonly env: RunnerEnv) {}

  private get s(): GameState {
    return this.env.state();
  }

  private scene(id: string): Scene {
    const sc = this.env.scenes[id];
    if (!sc) throw new Error(`unknown scene: ${id}`);
    return sc;
  }

  start(id: string): Frame {
    this.sceneId = id;
    this.stack = [{ beats: this.scene(id), i: 0 }];
    return this.run();
  }

  current(): Frame {
    return this.frame;
  }

  /** 從台詞或卡片往下走；台詞的理智變化在這時套用（辨識正確就減半）。 */
  advance(): Frame {
    const f = this.frame;
    if (f.kind === 'line') {
      if (f.line.sanity !== undefined) {
        const ev = applyEffect(this.s, { sanity: f.line.sanity }, this.recognized);
        this.queue.push(...ev);
        if (ev.some((e) => e.kind === 'zero' && e.outcome === 'burnout')) return this.end();
      }
      return this.run();
    }
    if (f.kind === 'card') return this.run();
    return f;
  }

  choose(id: string): Frame {
    if (this.frame.kind !== 'choice') return this.frame;
    const opt = this.options.find((o) => o.id === id);
    if (!opt || !opt.enabled) return this.frame;
    this.options = [];
    this.stack.push({ beats: opt.do, i: 0 });
    return this.run();
  }

  /** 辨識目前台詞的話術；每句只能猜一次。猜對就解鎖圖鑑卡。 */
  recognize(pick: TacticId): boolean {
    const f = this.frame;
    if (f.kind !== 'line' || !f.line.tactic || this.attempted) return false;
    this.attempted = true;
    if (pick !== f.line.tactic) return false;
    this.recognized = true;
    const r = addClue(this.s.codex, pick);
    if (r.added) {
      this.s.codex = r.list as TacticId[];
      this.queue.push({ kind: 'codex', id: pick });
    }
    return true;
  }

  /** 把目前台詞手動記進證據簿。 */
  note(): EvidenceItem | null {
    const f = this.frame;
    if (f.kind !== 'line') return null;
    const item: EvidenceItem = { id: `note:${f.line.id}`, time: this.env.clock(), source: 'talk', speaker: f.line.speaker, zh: f.line.zh, en: f.line.en };
    this.addEvidence(item);
    return item;
  }

  /** 取出並清空累積的事件。 */
  events(): RunnerEvent[] {
    const out = this.queue;
    this.queue = [];
    return out;
  }

  private addEvidence(item: EvidenceItem): void {
    const r = addEvidence(this.s.evidence, item);
    if (!r.added) return;
    this.s.evidence = r.list;
    this.queue.push({ kind: 'evidence', item });
  }

  private end(): Frame {
    this.stack = [];
    this.options = [];
    return (this.frame = { kind: 'end' });
  }

  private showChoice(options: Option[]): Frame {
    this.options = options;
    return (this.frame = { kind: 'choice', options: options.map(({ id, zh, en, enabled }) => ({ id, zh, en, enabled })) });
  }

  private resolveAsk(npc: NpcId, topic: string, checked: boolean): InnerBeat[] {
    const ans = this.env.asks[topic]?.[npc];
    if (!ans) return [];
    const outcome = askOutcome(this.s.rel[npc], checked);
    const flag = outcome === 'full' ? `knows_${topic}` : outcome === 'partial' ? `half_${topic}` : undefined;
    return [...ans[outcome].map((line) => ({ line })), ...(flag ? [{ effect: { flag } }] : [])];
  }

  /** 從堆疊往下執行，直到需要玩家操作的段落。 */
  private run(): Frame {
    for (let steps = 0; ; steps++) {
      if (steps > MAX_STEPS) {
        console.error(`script loop in scene "${this.sceneId}"`);
        return this.end();
      }
      const top = this.stack[this.stack.length - 1];
      if (!top) return this.end();
      if (top.i >= top.beats.length) {
        this.stack.pop();
        continue;
      }
      const b = top.beats[top.i++]!;
      if ('line' in b) {
        this.recognized = false;
        this.attempted = false;
        if (b.line.evidence) {
          const source = b.line.evidence === true ? 'talk' : b.line.evidence;
          this.addEvidence({ id: b.line.id, time: this.env.clock(), source, speaker: b.line.speaker, zh: b.line.zh, en: b.line.en });
        }
        return (this.frame = { kind: 'line', line: b.line, canRecognize: !!b.line.tactic });
      }
      if ('choice' in b) {
        return this.showChoice(b.choice.map((o) => ({ id: o.id, zh: o.zh, en: o.en, enabled: !o.if || evalCond(this.s, o.if), do: o.do })));
      }
      if ('respond' in b) {
        const { target, ally, evidence, after } = b.respond;
        const proven = !evidence || hasEvidence(this.s.evidence, evidence);
        return this.showChoice(
          RESPONSES.map((id) => {
            const e = responseEffect(id, proven);
            const rel: Partial<Record<NpcId, number>> = { [target]: e.target };
            if (ally) rel[ally] = (rel[ally] ?? 0) + e.ally;
            return { id, ...this.env.labels.resp[id], enabled: true, do: [{ effect: { sanity: e.sanity, rel } }, ...(after?.[id] ?? [])] };
          }),
        );
      }
      if ('ask' in b) {
        const { npc, topic } = b.ask;
        if (this.s.flags.includes('skill_asking_well')) {
          const opt = (id: 'plain' | 'checked'): Option => ({ id, ...this.env.labels.ask[id], enabled: true, do: [{ askResolve: { npc, topic, checked: id === 'checked' } }] });
          return this.showChoice([opt('plain'), opt('checked')]);
        }
        this.stack.push({ beats: this.resolveAsk(npc, topic, false), i: 0 });
        continue;
      }
      if ('askResolve' in b) {
        const { npc, topic, checked } = b.askResolve;
        this.stack.push({ beats: this.resolveAsk(npc, topic, checked), i: 0 });
        continue;
      }
      if ('if' in b) {
        const branch = evalCond(this.s, b.if) ? b.then : (b.else ?? []);
        this.stack.push({ beats: branch, i: 0 });
        continue;
      }
      if ('effect' in b) {
        const ev = applyEffect(this.s, b.effect);
        this.queue.push(...ev);
        if (ev.some((e) => e.kind === 'zero' && e.outcome === 'burnout')) return this.end();
        continue;
      }
      if ('evidence' in b) {
        this.addEvidence(b.evidence);
        continue;
      }
      if ('card' in b) return (this.frame = { kind: 'card', card: b.card });
      if ('goto' in b) {
        this.sceneId = b.goto;
        this.stack = [{ beats: this.scene(b.goto), i: 0 }];
        continue;
      }
      if ('include' in b) {
        this.stack.push({ beats: this.scene(b.include), i: 0 });
        continue;
      }
    }
  }
}
