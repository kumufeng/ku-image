import { defineConfig } from 'vite';
import path from 'path';
import url from 'url';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const resolve = (p: string, dir: string = __dirname) => path.resolve(dir, p);

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    dts({
      copyDtsFiles: true, // 将 `src/util/type.d.ts` 复制到 `dist/util/type.d.ts`
      tsconfigPath: resolve('tsconfig.component.json'),
    }),
  ],
  build: {
    // https://cn.vitejs.dev/config/build-options.html#build-lib
    lib: {
      entry: resolve('src/component/index.vue'),
      formats: ['es'],
      fileName: 'component/index',
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue',
        },
      },
    },
  },
});
