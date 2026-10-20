import { afterEach, expect, test } from 'bun:test';
import { LANGS, setLang, t } from '../src/core/i18n';
import { CASE } from '../src/data/case';
import { SPEAKERS, story, STORY_KEYS } from '../src/data/story';

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

test('every bilingual field in the case and the story has both languages', () => {
  const nodes = [...bilingualNodes(CASE), ...bilingualNodes(story)];
  expect(nodes.length).toBeGreaterThan(40);
  for (const n of nodes) {
    expect(typeof n.zh === 'string' && n.zh.trim().length > 0).toBe(true);
    expect(typeof n.en === 'string' && n.en.trim().length > 0).toBe(true);
  }
});

test('every speaker is known and named in both languages', () => {
  for (const lines of Object.values(story)) for (const l of lines) expect(SPEAKERS).toContain(l.speaker);
  for (const lang of LANGS) {
    setLang(lang);
    for (const s of SPEAKERS) expect(t('speaker.' + s)).not.toBe('speaker.' + s);
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
  const last = story.rc_solved.at(-1)!;
  for (const s of [last.zh, last.en]) {
    expect(s).toContain('{n}');
    expect(s).toContain('{c}');
  }
});

test('all required story keys exist with the expected line counts', () => {
  for (const k of STORY_KEYS) expect(story[k]?.length ?? 0).toBeGreaterThan(0);
  expect(story.intro.length).toBe(3);
  expect(story.kevin.length).toBe(4);
  expect(story.fse.length).toBe(3);
  expect(story.locker_on.length).toBe(2);
  expect(story.rc_solved.length).toBe(4);
});
