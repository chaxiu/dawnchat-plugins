<template>
  <div class="app-shell">
    <Sidebar v-if="view === 'lobby'" />
    <main class="main">
      <template v-if="view === 'lobby'">
        <LibraryToolbar
          :view-mode="viewMode"
          @add-files="handleAddFiles"
          @refresh="fetchFiles"
          @toggle-view="viewMode = $event"
        />
        <FileGrid :files="files" :loading="loading" :error="error" @open="openFile" />
      </template>
      <template v-else>
        <WorkbenchView
          :file="currentFile"
          @back="backToLobby"
          @refresh="refreshCurrentFile"
        />
      </template>
    </main>
  </div>
</template>

<script setup>
import Sidebar from './components/Sidebar.vue'
import LibraryToolbar from './components/LibraryToolbar.vue'
import FileGrid from './components/FileGrid.vue'
import WorkbenchView from './components/WorkbenchView.vue'
import { useSmartReader } from './composables/useSmartReader'

const {
  view,
  viewMode,
  files,
  loading,
  error,
  currentFile,
  fetchFiles,
  handleAddFiles,
  openFile,
  backToLobby,
  refreshCurrentFile
} = useSmartReader()
</script>
