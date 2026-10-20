import { beforeEach, expect, test } from 'bun:test';
import { defaultSettings, loadSettings, parseSettings, saveSettings, settings, SETTINGS_KEY } from '../src/core/settings';
import { memStore, throwingStore } from './helpers';

const env = { navLang: 'zh-TW', prefersReduce: false };

beforeEach(() => Object.assign(settings, defaultSettings('zh-TW')));

test('default language follows the browser language', () => {
  expect(defaultSettings('zh-Hant-TW').lang).toBe('zh-TW');
  expect(defaultSettings('en-US').lang).toBe('en');
  expect(defaultSettings('').lang).toBe('en');
});

test('invalid stored fields fall back to the base settings', () => {
  const base = defaultSettings('zh-TW', true);
  expect(parseSettings({ lang: 'fr', textSpeed: 'warp', reduceMotion: 'yes' }, base)).toEqual(base);
});

test('settings round-trip through storage', () => {
  const store = memStore();
  Object.assign(settings, { lang: 'en', textSpeed: 'slow', reduceMotion: true });
  saveSettings(store);
  expect(JSON.parse(store.data[SETTINGS_KEY]!)).toEqual({ lang: 'en', textSpeed: 'slow', reduceMotion: true });
  Object.assign(settings, defaultSettings('zh-TW'));
  loadSettings(store, env);
  expect({ ...settings }).toEqual({ lang: 'en', textSpeed: 'slow', reduceMotion: true });
});

test('loading from blocked storage keeps the defaults without throwing', () => {
  expect(() => loadSettings(throwingStore, { navLang: 'en-US', prefersReduce: true })).not.toThrow();
  expect({ ...settings }).toEqual(defaultSettings('en-US', true));
});

test('saving to blocked storage does not throw', () => {
  expect(() => saveSettings(throwingStore)).not.toThrow();
});
