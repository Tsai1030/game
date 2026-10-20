import { afterEach, expect, test } from 'bun:test';
import { dictKeys, setLang } from '../src/core/i18n';
import { CODEX, TACTIC_IDS } from '../src/data/codex';

afterEach(() => setLang('zh-TW'));

test('the codex has the 7 v0.1 cards in order', () => {
  expect([...TACTIC_IDS]).toEqual(['double_bind', 'personal_attack', 'comparison', 'family', 'for_your_good', 'credit_stealing', 'gaslighting']);
  expect(Object.keys(CODEX).sort()).toEqual([...TACTIC_IDS].sort());
});

test('every card has name, what and todo in both languages', () => {
  for (const id of TACTIC_IDS) {
    for (const field of ['name', 'what', 'todo'] as const) {
      const b = CODEX[id][field];
      expect(b.zh.trim().length).toBeGreaterThan(0);
      expect(b.en.trim().length).toBeGreaterThan(0);
    }
  }
});

test('codex UI strings exist in both locale files', () => {
  const keys = ['codex.title', 'codex.locked', 'codex.what', 'codex.todo', 'codex.correct', 'codex.wrong', 'codex.pick'];
  for (const k of keys) {
    expect(dictKeys('zh-TW')).toContain(k);
    expect(dictKeys('en')).toContain(k);
  }
});
