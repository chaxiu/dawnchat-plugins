import { ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { manualTestRegistry } from '../tests/testRegistry'
import type { TestErrorKind, TestState } from '../types/sdk-test'

const toErrorMessage = (error: unknown): { kind: TestErrorKind; message: string } => {
  if (error instanceof Error) {
    const text = error.message.toLowerCase()
    if (text.includes('permission')) {
      return { kind: 'permission_denied', message: error.message }
    }
    if (text.includes('not implemented') || text.includes('unavailable')) {
      return { kind: 'unsupported', message: error.message }
    }
    return { kind: 'runtime_error', message: error.message }
  }
  return { kind: 'runtime_error', message: '未知错误' }
}

export const useManualActions = () => {
  const manualState = ref<Record<string, TestState>>({})

  const ensureDefaultStates = () => {
    manualTestRegistry.forEach((test) => {
      manualState.value[test.id] = { status: 'pending', message: '' }
    })
  }

  const runManualTest = async (testId: string): Promise<void> => {
    const test = manualTestRegistry.find((item) => item.id === testId)
    if (!test) {
      return
    }

    if (test.pluginKey && !Capacitor.isPluginAvailable(test.pluginKey)) {
      manualState.value[test.id] = {
        status: 'skipped',
        message: '宿主未注入该插件，已跳过'
      }
      return
    }

    manualState.value[test.id] = { status: 'running', message: '' }
    try {
      const message = await test.run()
      manualState.value[test.id] = { status: 'success', message }
    } catch (error) {
      const mapped = toErrorMessage(error)
      manualState.value[test.id] = { status: 'failed', message: `${mapped.kind}: ${mapped.message}` }
    }
  }

  ensureDefaultStates()

  return {
    manualTests: manualTestRegistry,
    manualState,
    runManualTest
  }
}

