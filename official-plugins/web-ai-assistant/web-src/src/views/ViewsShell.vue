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
  min-width: 0;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
/* RouterView 根节点需参与拉伸，否则 board 等视图在双栏 grid 右侧无法铺满宽度 */
.views-shell > * {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  align-self: stretch;
}
</style>
