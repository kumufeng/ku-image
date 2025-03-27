/* 
  sharp 避免静态导入，因为组件和插件是同一个入口引入，sharp 会导致组件在客户端渲染时报错
*/
import path from 'path';
import crypto from 'crypto';
import fs from 'fs/promises';
import chalk from 'chalk';
import type { FormatEnum } from 'sharp';

type Format = '.png' | '.jpg' | '.jpeg' | '.webp' | '.avif';
type HandlePath = (path: string) => any;

/**
 * 配置
 */
export interface CoreProps {
  /** 输入目录 */
  inputDir: string;
  /** 输出目录 */
  outputDir: string;
  /** 缓存文件路径 */
  cachePath: string;
  /** 组件类型声明文件路径 */
  typePath: string;
  /** 原文件配置 */
  origin: {
    /** 图片格式 */
    format: Format[];
    /** 缩放比例 */
    scale: number;
  };
  /** 目标文件配置 */
  target: {
    /** 图片格式 */
    format: Format[];
    /** 缩放比例 */
    scale: number[];
  };
  /** 性能配置（配置该选项后不再全量图像处理） */
  performance: {
    /** 变动事件名 */
    eventName?: 'add' | 'del';
    /** 变动文件集合 */
    paths?: string[];
  };
}

/**
 * 图像处理
 */
export default async (props: CoreProps) => {
  // 获取哈希值记录
  const cache = await (async () => {
    try {
      return JSON.parse(await fs.readFile(props.cachePath, 'utf-8'));
    } catch (error) {
      return {};
    }
  })();

  /**
   * 获取相对路径
   */
  const relative = (dir: string, p: string) => {
    return path.relative(dir, p).replace(/\\/g, '/');
  };

  /**
   * 检查文件或目录是否存在
   */
  const exists = async (p: string) => {
    try {
      await fs.access(p);
      return true;
    } catch (error) {
      return false;
    }
  };

  /**
   * 确保目录存在
   */
  const ensureDir = async (dir: string) => {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  };

  /**
   * 计算文件哈希值
   */
  const calcHash = async (path: string) => {
    try {
      const content = await fs.readFile(path);
      return crypto.createHash('md5').update(content).digest('hex');
    } catch (error) {
      return '';
    }
  };

  /**
   * 更新哈希值记录（顺带生成TS类型）
   */
  const updateCache = async (key: string, p?: string) => {
    p ? (cache[key] = await calcHash(p)) : delete cache[key];
    await fs.writeFile(props.cachePath, JSON.stringify(cache, null, 2));

    // 生成TS类型
    const type = `export type ImageName = "${Object.keys(cache)
      .map((v) => path.basename(v, path.extname(v)))
      .join('" | "')}";`;
    await fs.writeFile(props.typePath, type);
  };

  /**
   * 根据文件前缀获取所有相关文件
   */
  const getRelatedFiles = async (basePaths: string[], dir: string) => {
    const basename = basePaths.map((v) => path.basename(v, path.extname(v)));
    const format = [...props.target.format, ...props.origin.format];
    const regex = new RegExp(
      `^(${basename.join('|')})@\\dx(${format.join('|')})$`,
    );

    const files = await fs.readdir(dir);
    return files.filter((v) => regex.test(v)).map((v) => path.join(dir, v));
  };

  /**
   * 递归遍历文件夹
   */
  const traverseDir = async (dir: string, handlePath: HandlePath) => {
    const files = await fs.readdir(dir);
    for (const file of files) {
      const p = path.join(dir, file);
      (await fs.stat(p)).isDirectory()
        ? await traverseDir(p, handlePath)
        : await handlePath(p);
    }
  };

  /**
   * 处理每个文件（根据`原目录`的文件生成不同分辨率/格式的图片）
   */
  const handleInputPath = async (inputPath: string) => {
    const inputRelativePath = relative(props.inputDir, inputPath);
    const outputPath = path.join(props.outputDir, inputRelativePath);
    const ext = path.extname(inputRelativePath) as Format;

    // 跳过不支持的文件
    if (!props.origin.format.includes(ext)) {
      return console.log(
        chalk.yellow(`跳过不支持的格式：${inputRelativePath}`),
      );
    }

    // 跳过已处理的文件
    if (cache[inputRelativePath] === (await calcHash(inputPath))) {
      // 更新哈希值记录
      await updateCache(inputRelativePath, inputPath);
      return console.log(
        chalk.yellow(`跳过已处理的文件：${inputRelativePath}`),
      );
    }

    try {
      // 确保目标目录存在
      await ensureDir(path.dirname(outputPath));

      const sharp = (await import('sharp')).default;

      // 获取原图片宽度
      const width =
        ((await sharp(inputPath).metadata()).width ?? 0) / props.origin.scale;

      // 生成不同分辨率的图片
      for (const scale of props.target.scale) {
        // 生成不同格式的图片
        for (const format of [
          ...props.target.format,
          // .jpg 统一为 .jpeg
          ext.replace('.jpg', '.jpeg'),
        ]) {
          await sharp(inputPath)
            .resize({ width: parseInt(`${scale * width}`) })
            .toFormat(format.slice(1) as keyof FormatEnum)
            .toFile(outputPath.replace(ext, `@${scale}x${format}`));
        }
      }

      // 更新哈希值记录
      await updateCache(inputRelativePath, inputPath);
      console.log(chalk.green(`文件处理完成：${inputRelativePath}`));
    } catch (error) {
      console.error(chalk.red(`文件处理失败：${inputRelativePath}\n${error}`));
    }
  };

  /**
   * 清理多余文件（清理`目标目录`中不再存在于`原目录`的文件）
   */
  const handleOutputPath = async (outputPath: string) => {
    const outputRelativePath = relative(props.outputDir, outputPath);

    // 枚举原文件可能存在的路径形式
    const inputMaybePaths = props.origin.format.map((v) =>
      path.join(
        props.inputDir,
        outputRelativePath.replace(
          new RegExp(`@\\dx(${v}|${props.target.format.join('|')})$`),
          v,
        ),
      ),
    );

    // 判断原文件是否存在于原目录中
    const inputPathInInputDir = (
      await Promise.all(inputMaybePaths.map((v) => exists(v)))
    ).some((v) => v);

    // 如果原文件不存在于原目录中，则删除目标文件
    if (!inputPathInInputDir) {
      await fs.unlink(outputPath);

      for (const inputMaybePath of inputMaybePaths) {
        const inputRelativePath = relative(props.inputDir, inputMaybePath);
        if (!cache[inputRelativePath]) continue;

        // 更新哈希值记录
        updateCache(inputRelativePath);
        console.log(chalk.green(`清理多余文件： ${inputRelativePath}`));
      }
    }
  };

  /**
   * 主程序
   */
  const main = async () => {
    console.log(chalk.green('图片处理任务开始....................'));

    await Promise.all([ensureDir(props.inputDir), ensureDir(props.outputDir)]);

    const { eventName, paths } = props.performance;
    if (eventName) {
      if (eventName === 'add') {
        await Promise.all(paths!.map(handleInputPath));
      } else {
        const relatedFiles = await getRelatedFiles(paths!, props.outputDir);
        await Promise.all(relatedFiles.map(handleOutputPath));
      }
    } else {
      await traverseDir(props.inputDir, handleInputPath); // 遍历原目录，处理每个文件
      await traverseDir(props.outputDir, handleOutputPath); // 遍历目标目录，清理多余文件
    }

    console.log(chalk.green('图片处理任务结束....................'));
  };

  await main();
};
