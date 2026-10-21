// 測試直接載入 Phaser 的發行版（phaser/dist/phaser.js）；型別跟 'phaser' 相同。
declare module 'phaser/dist/phaser.js' {
  import Phaser from 'phaser';
  export default Phaser;
}
