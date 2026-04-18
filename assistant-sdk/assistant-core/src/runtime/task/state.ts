import { readonly, ref } from "vue";
import type { TaskDetail } from "./types";

const currentTaskIdRef = ref<string | null>(null);
const currentTaskDetailRef = ref<TaskDetail | null>(null);

export function useTaskRuntimeState() {
  return {
    currentTaskId: readonly(currentTaskIdRef),
    currentTaskDetail: readonly(currentTaskDetailRef),
  };
}

export function setCurrentTaskState(task: TaskDetail | null) {
  currentTaskIdRef.value = task?.task_id || null;
  currentTaskDetailRef.value = task ? { ...task, surface_workspace_refs: { ...task.surface_workspace_refs } } : null;
}

export function setCurrentTaskId(taskId: string | null) {
  currentTaskIdRef.value = taskId;
}

export function getTaskRuntimeStateSnapshot() {
  return {
    current_task_id: currentTaskIdRef.value,
    current_task_detail: currentTaskDetailRef.value
      ? {
          ...currentTaskDetailRef.value,
          surface_workspace_refs: { ...currentTaskDetailRef.value.surface_workspace_refs },
        }
      : null,
  };
}

export function resetTaskRuntimeState() {
  currentTaskIdRef.value = null;
  currentTaskDetailRef.value = null;
}
