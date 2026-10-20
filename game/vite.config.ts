import { defineConfig, type Plugin } from 'vite';
import { parse } from 'yaml';

/** 把 .yaml 劇本轉成 JSON 模組，讓 Vite 建置時可以直接 import（Bun 測試則原生支援 YAML）。 */
function yamlPlugin(): Plugin {
  return {
    name: 'fab-yaml',
    transform(code, id) {
      if (!/\.ya?ml$/.test(id)) return null;
      return { code: `export default ${JSON.stringify(parse(code))};`, map: null };
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [yamlPlugin()],
  build: { chunkSizeWarningLimit: 2000 },
});
