<script setup lang="ts">
/* 
  其实也可以采用直接传递一个图片相对路径的方式来生成srcset属性，这需要借助 `import.meta.glob` 方法，
  但是这种方式会导致每个图片组件都需要拥有所有图片资源路径的映射关系，故不采用此方法。
*/
type Numberish = number | string;
type HTMLAttributeReferrerPolicy = '' | 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url';
interface Props {
  /** 生成图片描述符 */
  generateSrcset: (extname?: string) => string,
  alt?: string;
  crossorigin?: 'anonymous' | 'use-credentials' | '';
  decoding?: 'async' | 'auto' | 'sync';
  height?: Numberish;
  loading?: 'eager' | 'lazy';
  referrerpolicy?: HTMLAttributeReferrerPolicy;
  sizes?: string;
  src?: string;
  srcset?: string;
  usemap?: string;
  width?: Numberish;
}

const { generateSrcset, ...props } = defineProps<Props>()
</script>

<template>
  <picture>
    <source :srcset="generateSrcset('.avif')" type="image/avif">
    <source :srcset="generateSrcset('.webp')" type="image/webp">
    <source :srcset="generateSrcset('.png')" type="image/png">
    <img v-bind="props" :srcset="generateSrcset()" loading="lazy">
  </picture>
</template>
