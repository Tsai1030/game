import { afterEach, expect, test } from 'bun:test';
import { LANGS, setLang, t } from '../src/core/i18n';
import { CASE } from '../src/data/case';
import type { Beat, Scene } from '../src/data/script';
import { LABELS, SCENES, SPEAKERS } from '../src/data/story';

afterEach(() => setLang('zh-TW'));

/** 走訪整棵資料，找出所有含 zh 欄位的物件。 */
function bilingualNodes(v: unknown, out: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(v)) v.forEach((x) => bilingualNodes(x, out));
  else if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if ('zh' in o) out.push(o);
    Object.values(o).forEach((x) => bilingualNodes(x, out));
  }
  return out;
}

/** 依序取出劇本裡所有段落（含巢狀的選項、分支）。 */
function beats(scene: Scene, out: Beat[] = []): Beat[] {
  for (const b of scene) {
    out.push(b);
    if ('choice' in b) b.choice.forEach((o) => beats(o.do, out));
    if ('if' in b) {
      beats(b.then, out);
      if (b.else) beats(b.else, out);
    }
  }
  return out;
}
const allBeats = () => Object.values(SCENES).flatMap((sc) => beats(sc));

test('every bilingual field in the case, the scenes and the labels has both languages', () => {
  const nodes = [...bilingualNodes(CASE), ...bilingualNodes(SCENES), ...bilingualNodes(LABELS)];
  expect(nodes.length).toBeGreaterThan(40);
  for (const n of nodes) {
    expect(typeof n.zh === 'string' && n.zh.trim().length > 0).toBe(true);
    expect(typeof n.en === 'string' && n.en.trim().length > 0).toBe(true);
  }
});

test('every speaker is known and named in both languages', () => {
  for (const b of allBeats()) if ('line' in b) expect(SPEAKERS).toContain(b.line.speaker);
  for (const lang of LANGS) {
    setLang(lang);
    for (const s of SPEAKERS) expect(t('speaker.' + s)).not.toBe('speaker.' + s);
  }
});

test('every line id is unique and every goto/include target exists', () => {
  const ids = allBeats().flatMap((b) => ('line' in b ? [b.line.id] : []));
  expect(new Set(ids).size).toBe(ids.length);
  for (const b of allBeats()) {
    if ('goto' in b) expect(SCENES[b.goto]).toBeDefined();
    if ('include' in b) expect(SCENES[b.include]).toBeDefined();
  }
});

test('log clue and note indices point at real log lines', () => {
  for (const [i, clue] of Object.entries(CASE.logClue)) {
    expect(Number(i)).toBeLessThan(CASE.logs.length);
    expect(Object.keys(CASE.clues)).toContain(clue);
  }
  for (const i of Object.keys(CASE.logNote)) {
    expect(Number(i)).toBeLessThan(CASE.logs.length);
    expect(Object.keys(CASE.logClue)).not.toContain(i);
  }
});

test('the answer is one of the selectable options', () => {
  expect(CASE.tools).toContain(CASE.answer.tool);
  expect(CASE.chambers).toContain(CASE.answer.ch);
  expect(CASE.causes.map((c) => c.id)).toContain(CASE.answer.cause);
});

test('the case data has the prototype sizes', () => {
  expect(CASE.spc.length).toBe(25);
  expect(CASE.lots.length).toBe(6);
  expect(CASE.logs.length).toBe(15);
  expect(CASE.cons.length).toBe(5);
  expect(CASE.causes[0]!.id).toBe('focus_ring_eol');
  expect(CASE.minClues).toBe(3);
  expect(CASE.waferSeed).toBe(1027);
});

test('the solved summary keeps its placeholders in both languages', () => {
  const lines = SCENES.rc_solved!.flatMap((b) => ('line' in b ? [b.line] : []));
  const last = lines.at(-1)!;
  for (const s of [last.zh, last.en]) {
    expect(s).toContain('{clues}');
    expect(s).toContain('{coffee}');
  }
});

test('all chapter 2 scenes exist, including the LINE reports', () => {
  const keys = ['intro', 'boss', 'boss_solved', 'boss_suit', 'boss_main', 'boss_ready', 'boss_more', 'kevin', 'fse', 'say_desk2', 'say_desk3', 'say_desk4', 'say_bossdesk', 'locker_on', 'coffee_ok', 'coffee_full', 'rc_wrong', 'rc_solved', 'c2_report_spc', 'c2_report_ring'];
  for (const k of keys) expect(SCENES[k]?.length ?? 0).toBeGreaterThan(0);
  const evIds = (k: string) => beats(SCENES[k]!).flatMap((b) => ('evidence' in b ? [b.evidence.id] : []));
  expect(evIds('c2_report_spc')).toEqual(['E-C2-01', 'E-C2-02']);
  expect(evIds('c2_report_ring')).toEqual(['E-C2-03', 'E-C2-04']);
  expect(beats(SCENES.kevin!).some((b) => 'effect' in b && b.effect.clue === 'pm')).toBe(true);
});
