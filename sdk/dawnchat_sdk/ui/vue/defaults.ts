import { defineComponent, h } from 'vue'
import type { MessageMapperOptions } from '@dawnchat/shared-protocol'

export const defaultMessageMapperStrings: MessageMapperOptions['strings'] = {
  processing: '正在处理',
  unknownError: '发生未知错误',
  hil: {
    title: '需要确认的操作',
    responded: '已响应',
    confirmed: '已确认',
    rejected: '已拒绝',
    userCancelled: '用户取消',
    edited: '已编辑'
  }
}

export const defaultToolCallLabels = {
  calling: '调用中',
  completed: '已完成',
  failed: '失败',
  unknown: '未知',
  parameters: '参数',
  result: '结果',
  error: '错误',
  executing: '执行中'
}

export const defaultHilLabels = {
  title: '需要确认',
  pending: '等待确认',
  viewDetails: '查看详情',
  risk: {
    low: '低',
    medium: '中',
    high: '高'
  }
}

export const defaultMessageLabels = {
  received: '已收到',
  taskPlan: '任务规划',
  step: '步骤',
  completed: '已完成',
  failed: '失败',
  error: '错误',
  expand: '展开',
  collapse: '收起',
  thinking: '思考中',
  errorCode: '错误码'
}

export const defaultStageLabels: Record<string, string> = {
  planning: '规划',
  analyzing: '分析',
  gathering: '收集',
  reflecting: '反思',
  thinking: '思考'
}

export const defaultStageLabelResolver = (stage: string) => defaultStageLabels[stage] ?? stage

export const defaultFormatTime = (time: string) => {
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString()
}

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

export const defaultRenderMarkdown = (text: string) => {
  if (!text) return ''
  return escapeHtml(text)
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\n/g, '<br>')
}

export const EmptyIcon = defineComponent({
  name: 'EmptyIcon',
  setup() {
    return () => h('span')
  }
})

export const defaultTodoIconResolver = () => EmptyIcon
