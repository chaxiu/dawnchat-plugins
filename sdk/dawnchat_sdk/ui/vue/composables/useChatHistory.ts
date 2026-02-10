import { computed } from 'vue'
import { ChatStore } from '../store/ChatStore'

export const useChatHistory = (store: ChatStore) => {
  return {
    rawMessages: computed(() => store.rawMessages.value),
    messages: computed(() => store.uiMessages.value),
    clear: () => store.clearSession()
  }
}
