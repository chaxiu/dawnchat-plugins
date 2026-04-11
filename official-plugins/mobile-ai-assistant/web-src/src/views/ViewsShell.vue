<template>
  <section class="views-shell">
    <RouterView />
  </section>
</template>

<style scoped>
.views-shell {
  width: 100%;
  height: 100%;
  min-height: 0;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
