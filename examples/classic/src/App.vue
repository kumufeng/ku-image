<script setup lang="ts">
import { KuImage, generateSrcset } from '@ku/image';
</script>

<template>
  <KuImage :generateSrcset="generateSrcset('vite')" />
</template>
