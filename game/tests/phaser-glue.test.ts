// 先裝好假的 2D 畫布與圖片，再載入用到 Phaser 的測試本體。M1-3D 移除 Phaser 時一起刪掉。
import { mock } from 'bun:test';
import './fake-canvas';

// Bun 預設載入 Phaser 的原始碼版（需要額外的開發套件）；測試改用遊戲實際打包的那個發行版。
const dist = (await import('phaser/dist/phaser.js')).default;
mock.module('phaser', () => ({ default: dist }));
await import('./phaser-glue.body');
