# @ku/image

一个用于 Vite 和 Vue 的图像处理插件，它会根据设备像素比和浏览器兼容性自动选择最合适的图片分辨率和图片格式。

## 安装

```bash
pnpm i @ku/image
# or
npm install @ku/image
# or
yarn add @ku/image
```

## 使用

1. **在 `vite.config.ts` 中使用**

```ts
import { defineConfig } from 'vite';
import { kuImagePlugin } from '@ku/image';
export default defineConfig({
  // ...其他配置
  plugins: [
    // ...其他配置
    kuImagePlugin(),
  ],
});
```

**注意**：`kuImagePlugin` 会监听 `输入目录（默认 src/assets/images）` 中图片文件的变化，并自动生成不同倍率/格式的图片。

2. **在 Vue 组件中使用**

```vue
<script setup lang="ts">
import { KuImage, generateSrcset } from '@ku/image';
</script>

<template>
  <!-- 缺陷：generateSrcset的智能提示有延迟 -->
  <KuImage :generate-srcset="generateSrcset('example.jpg')" />
</template>
```

## 功能特点

- **自动生成**：根据原图自动生成不同倍率/格式的图片。
- **自动适配**：根据设备像素比和浏览器兼容性自动选择最合适的图片分辨率和图片格式。
- **简单易用**：只需在 Vite 配置中添加 `kuImagePlugin` 插件，并在 Vue 组件中使用 `KuImage` 组件即可。

## 示例项目

你可以查看 [示例项目](https://github.com/kumufeng/ku-image/tree/main/examples/classic) 来了解如何在实际项目中使用 `@ku/image`。

## 贡献

欢迎贡献代码！如果你有任何问题或建议，请在 [GitHub Issues](https://github.com/kumufeng/ku-image/issues) 中提交。

## 许可证

MIT
