import { computed, ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { hostPluginDescriptors, probeHostPlugin } from '../services/plugins/capabilityService'
import { autoTestRegistry } from '../tests/testRegistry'
import type { HostPluginProbeResult, TestErrorKind, TestState } from '../types/sdk-test'

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

export const useSdkTests = () => {
  const autoState = ref<Record<string, TestState>>({})
  const hostProbeResults = ref<HostPluginProbeResult[]>([])
  const running = ref(false)

  const ensureDefaultStates = () => {
    autoTestRegistry.forEach((test) => {
      autoState.value[test.id] = { status: 'pending', message: '' }
    })
  }

  const runSingleAutoTest = async (testId: string): Promise<void> => {
    const test = autoTestRegistry.find((item) => item.id === testId)
    if (!test) {
      return
    }
    if (test.pluginKey && !Capacitor.isPluginAvailable(test.pluginKey)) {
      autoState.value[test.id] = {
        status: 'skipped',
        message: '宿主未注入该插件，已跳过功能测试'
      }
      return
    }

    autoState.value[test.id] = { status: 'running', message: '' }
    try {
      const message = await test.run()
      autoState.value[test.id] = { status: 'success', message }
    } catch (error) {
      const mapped = toErrorMessage(error)
      autoState.value[test.id] = { status: 'failed', message: `${mapped.kind}: ${mapped.message}` }
    }
  }

  const runHostProbe = (): void => {
    hostProbeResults.value = hostPluginDescriptors.map((descriptor) => probeHostPlugin(descriptor))
  }

  const runAllAutoTests = async (): Promise<void> => {
    running.value = true
    ensureDefaultStates()
    for (const test of autoTestRegistry) {
      await runSingleAutoTest(test.id)
    }
    runHostProbe()
    running.value = false
  }

  const summary = computed(() => {
    const values = Object.values(autoState.value)
    return {
      success: values.filter((item) => item.status === 'success').length,
      failed: values.filter((item) => item.status === 'failed').length,
      skipped: values.filter((item) => item.status === 'skipped').length,
      total: values.length
    }
  })

  ensureDefaultStates()

  return {
    autoTests: autoTestRegistry,
    autoState,
    hostProbeResults,
    running,
    summary,
    runAllAutoTests,
    runSingleAutoTest
  }
}

