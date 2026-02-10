import { computed } from 'vue'
import type { UIMessage } from '@dawnchat/shared-protocol'
import { ChatStore } from '../store/ChatStore'

export const useChatStream = (store: ChatStore) => {
  const streamingMessage = computed<UIMessage | null>(() => {
    const messages = store.uiMessages.value
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i]
      if (message.type === 'stream' && !message.isFinal) {
        return message
      }
    }
    return null
  })

  return { streamingMessage }
}
