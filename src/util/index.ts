/* 
  有使用到 `import.meta.url`，不便使用 `vite` 进行编译
*/

import type { ImageName } from './type';

/**
 * 加载所有图片资源
 */
const loadImages = (name: ImageName, extname = '.jpeg') => {
  const sizes = ['@1x', '@2x', '@3x'];
  const images = sizes.map((size) =>
    new URL(
      `/src/assets/.images/${name}${size}${extname}`,
      import.meta.url,
    ).href.replace(/(http|https):/, ''),
  );
  return images;
};

/**
 * 返回 `生成图片描述符` 的函数
 */
export const generateSrcset = (name: ImageName) => {
  return (extname = '.jpeg') => {
    const images = loadImages(name, extname);
    const srcset = images
      .map((image, index) => `${image} ${index + 1}x`)
      .join(',');
    return srcset;
  };
};
