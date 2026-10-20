import { afterEach, expect, test } from 'bun:test';
import { on } from '../src/core/bus';
import { applyDom, dictKeys, fmt, L, LANGS, rich, setLang, t } from '../src/core/i18n';

afterEach(() => setLang('zh-TW'));

test('locale files have identical key sets', () => {
  expect(new Set(dictKeys('en'))).toEqual(new Set(dictKeys('zh-TW')));
});

test('no locale value is empty', () => {
  for (const l of LANGS) {
    setLang(l);
    for (const k of dictKeys(l)) expect(t(k).trim().length).toBeGreaterThan(0);
  }
});

test('unknown key returns the key', () => {
  expect(t('no.such.key')).toBe('no.such.key');
});

test('fmt fills known params and keeps unknown ones', () => {
  expect(fmt('a {x} {y}', { x: 1 })).toBe('a 1 {y}');
});

test('setLang switches t and L and emits lang', () => {
  expect(t('app.title')).toBe('Fab 夜班');
  const seen: unknown[] = [];
  const off = on('lang', (l) => seen.push(l));
  setLang('en');
  off();
  expect(t('app.title')).toBe('Fab Night Shift');
  expect(L({ zh: '甲', en: 'A' })).toBe('A');
  expect(seen).toEqual(['en']);
});

test('rich escapes before bolding', () => {
  expect(rich('<i>**hot**')).toBe('&lt;i&gt;<b>hot</b>');
});

test('applyDom fills text and aria-label', () => {
  document.body.innerHTML = '<span data-i18n="app.title"></span><canvas data-i18n-aria="app.title"></canvas>';
  setLang('en');
  applyDom();
  expect(document.querySelector('span')?.textContent).toBe('Fab Night Shift');
  expect(document.querySelector('canvas')?.getAttribute('aria-label')).toBe('Fab Night Shift');
});
