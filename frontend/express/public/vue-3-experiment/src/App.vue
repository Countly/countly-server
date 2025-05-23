<script setup lang="ts">
import SideMenu from './components/SideMenu.vue';
</script>

<template>
  <div class="app-root">
    <SideMenu />
    <RouterView />
  </div>
</template>

<style>
.app-root {
  display: flex;
}
</style>