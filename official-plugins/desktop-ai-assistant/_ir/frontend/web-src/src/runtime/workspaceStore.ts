import { ref } from "vue";

import type { GuideStateSnapshot } from "./guideState";
import type { ViewStateSnapshot } from "./viewState";
import type {
  WorkspaceArtifact,
  WorkspaceCheckpointMeta,
  WorkspaceSnapshot,
  WorkspaceTaskProgress,
} from "./workspaceTypes";

export interface WorkspaceStoreDeps {
  getGuideStateSnapshot: () => GuideStateSnapshot;
  getViewStateSnapshot: () => ViewStateSnapshot;
}

const DEFAULT_TASK_PROGRESS: WorkspaceTaskProgress = {
  status: "idle",
};

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneTaskProgress(nextProgress: WorkspaceTaskProgress): WorkspaceTaskProgress {
  return {
    status: nextProgress.status,
    current_task_id: nextProgress.current_task_id,
    completed_steps: nextProgress.completed_steps,
    total_steps: nextProgress.total_steps,
    summary: nextProgress.summary,
  };
}

function cloneArtifacts(nextArtifacts: WorkspaceArtifact[]): WorkspaceArtifact[] {
  return nextArtifacts.map((artifact) => ({
    id: artifact.id,
    kind: artifact.kind,
    title: artifact.title,
    data: artifact.data ? cloneJsonValue(artifact.data) : undefined,
  }));
}

function cloneCheckpointMeta(meta: WorkspaceCheckpointMeta | null): WorkspaceCheckpointMeta | null {
  if (!meta) {
    return null;
  }
  return {
    checkpoint_id: meta.checkpoint_id,
    resume_token: meta.resume_token,
    saved_at_ms: meta.saved_at_ms,
    trigger: meta.trigger,
    status: meta.status,
    scene_view_id: meta.scene_view_id,
    resource_id: meta.resource_id,
    error_code: meta.error_code,
    error_message: meta.error_message,
  };
}

export function createWorkspaceStore(deps: WorkspaceStoreDeps) {
  const taskProgress = ref<WorkspaceTaskProgress>({ ...DEFAULT_TASK_PROGRESS });
  const artifacts = ref<WorkspaceArtifact[]>([]);
  const lastCheckpointMeta = ref<WorkspaceCheckpointMeta | null>(null);
  const workspaceMetaVersion = ref(0);

  const setTaskProgress = (nextProgress: WorkspaceTaskProgress) => {
    taskProgress.value = cloneTaskProgress(nextProgress);
    workspaceMetaVersion.value += 1;
  };

  const setArtifacts = (nextArtifacts: WorkspaceArtifact[]) => {
    artifacts.value = cloneArtifacts(nextArtifacts);
    workspaceMetaVersion.value += 1;
  };

  const setLastCheckpointMeta = (nextMeta: WorkspaceCheckpointMeta | null) => {
    lastCheckpointMeta.value = cloneCheckpointMeta(nextMeta);
    workspaceMetaVersion.value += 1;
  };

  const getWorkspaceSnapshot = (): WorkspaceSnapshot => {
    const viewState = deps.getViewStateSnapshot();
    const guideState = deps.getGuideStateSnapshot();
    return {
      workspace_version: viewState.view_state_version + guideState.guide_state_version + workspaceMetaVersion.value,
      active_resource: viewState.current_resource ? cloneJsonValue(viewState.current_resource) : null,
      active_view: viewState.active_view_id,
      active_anchor: viewState.active_anchor,
      task_progress: cloneTaskProgress(taskProgress.value),
      artifacts: cloneArtifacts(artifacts.value),
      guide_state: cloneJsonValue(guideState),
      view_state: cloneJsonValue(viewState),
      last_checkpoint_meta: cloneCheckpointMeta(lastCheckpointMeta.value),
    };
  };

  return {
    taskProgress,
    artifacts,
    lastCheckpointMeta,
    setTaskProgress,
    setArtifacts,
    setLastCheckpointMeta,
    getWorkspaceSnapshot,
  };
}
