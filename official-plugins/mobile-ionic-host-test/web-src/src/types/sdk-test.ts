export type TestStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped'

export type TestKind = 'auto' | 'manual'

export type TestErrorKind = 'unsupported' | 'permission_denied' | 'runtime_error'

export interface TestState {
  status: TestStatus
  message: string
}

export interface AutoTestDefinition {
  id: string
  name: string
  pluginKey?: string
  run: () => Promise<string>
}

export interface ManualTestDefinition {
  id: string
  name: string
  pluginKey?: string
  run: () => Promise<string>
}

export interface HostPluginDescriptor {
  id: string
  displayName: string
  packageName: string
  pluginKey?: string
  testKind: TestKind | 'build_only'
}

export interface HostPluginProbeResult {
  descriptor: HostPluginDescriptor
  status: TestStatus
  message: string
}

