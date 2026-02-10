<template>
  <div class="pdf-canvas" ref="viewerRef" @mouseup="handleMouseUp" @scroll="hideMenu">
    <div class="pdf-page" ref="pageRef">
      <canvas ref="canvasRef"></canvas>
      <div ref="textLayerRef" class="pdf-text-layer"></div>
    </div>
    <div
      v-if="menuVisible"
      ref="menuRef"
      class="pdf-selection-menu"
      :style="{ left: `${menuX}px`, top: `${menuY}px` }"
    >
      <button class="button ghost" @click="addSelectionToContext">添加到提问</button>
    </div>
  </div>
  <div class="pdf-controls">
    <div>
      <button class="button ghost" @click="prevPage" :disabled="pageNumber === 1">上一页</button>
      <button class="button ghost" @click="nextPage" :disabled="pageNumber === pageCount">下一页</button>
    </div>
    <div>第 {{ pageNumber }} / {{ pageCount || 1 }} 页</div>
    <div>
      <button class="button ghost" @click="zoomOut">-</button>
      <button class="button ghost" @click="zoomIn">+</button>
    </div>
  </div>
</template>

<script setup>
import { markRaw, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf'
import { TextLayerBuilder } from 'pdfjs-dist/legacy/web/pdf_viewer'
import workerSrc from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import { fetchPdf } from '../services/api'

const props = defineProps({
  fileId: {
    type: String,
    required: true
  }
})

GlobalWorkerOptions.workerSrc = workerSrc

const emit = defineEmits(['add-context'])

const canvasRef = ref(null)
const textLayerRef = ref(null)
const viewerRef = ref(null)
const pageRef = ref(null)
const menuRef = ref(null)
const pdfDoc = shallowRef(null)
const pageNumber = ref(1)
const pageCount = ref(0)
const scale = ref(1.1)
const menuVisible = ref(false)
const menuX = ref(0)
const menuY = ref(0)
const selectionText = ref('')

const hideMenu = () => {
  menuVisible.value = false
  selectionText.value = ''
}

const loadPdf = async () => {
  if (!props.fileId) return
  try {
    const data = await fetchPdf(props.fileId)
    pdfDoc.value = markRaw(await getDocument({ data }).promise)
    pageCount.value = pdfDoc.value.numPages || 0
    pageNumber.value = 1
    hideMenu()
    await nextTick()
    await renderPage()
  } catch (error) {
    console.error('[SmartReader][PdfViewer] loadPdf failed', error)
  }
}

const renderTextLayer = async (page, viewport) => {
  if (!textLayerRef.value) return
  textLayerRef.value.innerHTML = ''
  textLayerRef.value.style.width = `${viewport.width}px`
  textLayerRef.value.style.height = `${viewport.height}px`
  textLayerRef.value.style.setProperty('--scale-factor', viewport.scale.toString())
  const builder = new TextLayerBuilder({
    pdfPage: page,
    onAppend: (layerDiv) => {
      layerDiv.style.width = `${viewport.width}px`
      layerDiv.style.height = `${viewport.height}px`
      textLayerRef.value?.append(layerDiv)
    }
  })
  await builder.render(viewport)
  console.info('[SmartReader][PdfViewer] text layer rendered', {
    layerChildren: textLayerRef.value.childElementCount
  })
}

const renderPage = async () => {
  if (!pdfDoc.value || !canvasRef.value) return
  try {
    const page = await pdfDoc.value.getPage(pageNumber.value)
    const viewport = page.getViewport({ scale: scale.value })
    const canvas = canvasRef.value
    const context = canvas.getContext('2d')
    if (!context) {
      console.error('[SmartReader][PdfViewer] canvas context unavailable')
      return
    }
    const outputScale = window.devicePixelRatio || 1
    canvas.width = Math.floor(viewport.width * outputScale)
    canvas.height = Math.floor(viewport.height * outputScale)
    canvas.style.width = `${viewport.width}px`
    canvas.style.height = `${viewport.height}px`
    if (pageRef.value) {
      pageRef.value.style.width = `${viewport.width}px`
      pageRef.value.style.height = `${viewport.height}px`
    }
    if (viewerRef.value) {
      console.info('[SmartReader][PdfViewer] layout', {
        viewport: { width: viewport.width, height: viewport.height, scale: viewport.scale },
        canvas: { width: canvas.width, height: canvas.height },
        viewer: { width: viewerRef.value.clientWidth, height: viewerRef.value.clientHeight }
      })
    }
    const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null
    await page.render({ canvasContext: context, viewport, transform }).promise
    await renderTextLayer(page, viewport)
  } catch (error) {
    console.error('[SmartReader][PdfViewer] renderPage failed', error)
  }
}

const prevPage = async () => {
  if (pageNumber.value <= 1) return
  pageNumber.value -= 1
  await renderPage()
}

const nextPage = async () => {
  if (pageNumber.value >= pageCount.value) return
  pageNumber.value += 1
  await renderPage()
}

const zoomIn = async () => {
  scale.value = Math.min(scale.value + 0.1, 2)
  await renderPage()
}

const zoomOut = async () => {
  scale.value = Math.max(scale.value - 0.1, 0.6)
  await renderPage()
}

const updateSelection = () => {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed) {
    hideMenu()
    return
  }
  const text = selection.toString().trim()
  if (!text) {
    hideMenu()
    return
  }
  if (!viewerRef.value) {
    hideMenu()
    return
  }
  const range = selection.rangeCount ? selection.getRangeAt(0) : null
  if (!range || !viewerRef.value.contains(range.commonAncestorContainer)) {
    hideMenu()
    return
  }
  const rect = range.getBoundingClientRect()
  const containerRect = viewerRef.value.getBoundingClientRect()
  menuX.value = rect.left - containerRect.left + viewerRef.value.scrollLeft
  menuY.value = rect.bottom - containerRect.top + viewerRef.value.scrollTop
  selectionText.value = text
  menuVisible.value = true
}

const handleMouseUp = () => {
  requestAnimationFrame(updateSelection)
}

const addSelectionToContext = () => {
  if (!selectionText.value) return
  emit('add-context', selectionText.value)
  hideMenu()
  window.getSelection()?.removeAllRanges()
}

const handleDocumentMouseDown = (event) => {
  if (!menuVisible.value) return
  if (menuRef.value?.contains(event.target)) return
  if (viewerRef.value?.contains(event.target)) return
  hideMenu()
}

watch(() => props.fileId, loadPdf)
onMounted(() => {
  document.addEventListener('mousedown', handleDocumentMouseDown)
  loadPdf()
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentMouseDown)
})
</script>
