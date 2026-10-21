import { afterEach, expect, test } from 'bun:test';
import { LANGS, setLang, t } from '../src/core/i18n';
import { CASE } from '../src/data/case';
import type { Beat, Scene } from '../src/data/script';
import { ASKS, LABELS, SCENE_FILES, SCENES, SPEAKERS } from '../src/data/story';
import { walkBeats } from '../src/systems/script';

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

/** 所有劇情的所有段落（含巢狀分支、回應後續），再加上問人的每一句回答。 */
/** 一段劇情裡的所有段落。 */
const beats = (sc: Scene): Beat[] => {
  const out: Beat[] = [];
  walkBeats(sc, (b) => out.push(b));
  return out;
};
const allBeats = (): Beat[] => {
  const out: Beat[] = [];
  for (const sc of Object.values(SCENES)) walkBeats(sc, (b) => out.push(b));
  for (const topic of Object.values(ASKS))
    for (const a of Object.values(topic)) if (a) for (const l of [...a.full, ...a.partial, ...a.refuse]) out.push({ line: l });
  return out;
};

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

test('the walk reaches lines nested inside response follow-ups', () => {
  const nested: Scene = [{ respond: { target: 'boss', after: { boundary: [{ line: { id: 'n-1', speaker: 'me', zh: '好', en: 'OK' } }] } } }];
  const seen: string[] = [];
  walkBeats(nested, (b) => 'line' in b && seen.push(b.line.id));
  expect(seen).toEqual(['n-1']);
});

test('every line has non-empty text in both languages', () => {
  for (const b of allBeats()) if ('line' in b) expect({ id: b.line.id, ok: !!b.line.zh.trim() && !!b.line.en.trim() }).toEqual({ id: b.line.id, ok: true });
});

test('scene ids are unique across story files', () => {
  // 不直接數 SCENES：其他測試檔會把測試用劇情塞進去。
  const keys = Object.values(SCENE_FILES).flatMap((f) => Object.keys(f));
  expect(new Set(keys).size).toBe(keys.length);
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

test('source files contain no raw control characters', async () => {
  const bad: string[] = [];
  for await (const f of new Bun.Glob('{src,tests}/**/*.{ts,yaml,json}').scan('.')) {
    const s = await Bun.file(f).text();
    if (/[\x00-\x08\x0e-\x1f\x7f]/.test(s)) bad.push(f);
  }
  expect(bad).toEqual([]);
});
