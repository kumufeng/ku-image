import type { PluginOption } from 'vite';
import { debounce, toMerged } from 'es-toolkit';
import path from 'path';
import url from 'url';
import core, { type CoreProps } from './core.js';

type EventName = Exclude<CoreProps['performance']['eventName'], undefined>;

/**
 * 图像处理插件
 * - [inputDir] 输入目录（位置基于 process.cwd()），默认 'src/assets/images'
 * - [outputDir] 输出目录（位置基于 process.cwd()），默认 'src/assets/.images'
 * - [cachePath] 缓存文件路径（位置基于 process.cwd()），默认 'src/assets/.cacheimages.json'
 * - [origin] 原文件配置，{ format: ['.png', '.jpg', '.jpeg'], scale: 3 }
 * - [target] 目标文件配置，{ format: ['.webp', '.avif'], scale: [1, 2, 3] }
 */
export default (coreProps?: Partial<CoreProps>): PluginOption => {
  const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
  const resolve = (p: string, dir: string = process.cwd()) =>
    path.resolve(dir, p);

  const props = {
    inputDir: resolve(coreProps?.inputDir ?? 'src/assets/images'),
    outputDir: resolve(coreProps?.outputDir ?? 'src/assets/.images'),
    cachePath: resolve(coreProps?.cachePath ?? 'src/assets/.cacheimages.json'),
    typePath: resolve('../util/type.d.ts', __dirname), // 组件类型声明文件路径
    origin: toMerged(coreProps?.origin ?? {}, {
      format: ['.png', '.jpg', '.jpeg'],
      scale: 3,
    }),
    target: toMerged(coreProps?.target ?? {}, {
      format: ['.webp', '.avif'],
      scale: [1, 2, 3],
    }),
    performance: {}, // 性能配置
  } as CoreProps;

  return {
    name: '@ku/plugin-image',
    apply: 'serve',
    configureServer(server) {
      core(props); // 兜底执行一次

      const performanceCache: Record<EventName, string[]> = {
        add: [],
        del: [],
      };

      const coreDebounce = debounce(async () => {
        for (const key in performanceCache) {
          const eventName = key as EventName;
          const paths = performanceCache[eventName];
          if (paths.length)
            await core({ ...props, performance: { eventName, paths } });
          performanceCache[eventName] = [];
        }
      }, 1000);

      const updatePerformanceCache = (
        e: EventName,
        ee: EventName,
        path: string,
      ) => {
        const eeIdx = performanceCache[ee].findIndex((e) => e === path);
        if (eeIdx !== -1) performanceCache[ee].splice(eeIdx, 1);
        const hasPath = performanceCache[e].includes(path);
        if (!hasPath) performanceCache[e].push(path);
        coreDebounce();
      };

      server.watcher.on('all', (eventName, path) => {
        if (!path.startsWith(props.inputDir)) return;
        if (['add', 'change'].includes(eventName)) {
          updatePerformanceCache('add', 'del', path);
        } else if ('unlink' === eventName) {
          updatePerformanceCache('del', 'add', path);
        }
      });
    },
  };
};
