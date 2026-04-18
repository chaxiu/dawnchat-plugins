import TaskMainView from "./TaskMainView.vue";
import { defineView, type ViewOpenSuccess, type ViewStateBinding } from "../../../runtime/view/manifest";
import { TASK_MAIN_VIEW_ID } from "../../../runtime/task";

const TASK_MAIN_DEFAULT_STATE: ViewStateBinding = {
  binding_type: "task.selection",
  binding_label: "task:current",
  title: "Current Task",
  data: {},
};

export const taskMainView = defineView({
  view_id: TASK_MAIN_VIEW_ID,
  binding_type: "task.selection",
  title: "Task",
  component: TaskMainView,
  render_mode: "light-dom",
  state_mode: "lightweight",
  default_state_binding: TASK_MAIN_DEFAULT_STATE,
  anchors: [
    {
      id: "task.header",
      title: "Task Header",
      description: "Task title, summary, and current status.",
    },
    {
      id: "task.workspaces",
      title: "Bound Workspaces",
      description: "Workspaces linked to the current task.",
    },
  ],
  getStateSummary: (_stateBinding, activeAnchor) => ({
    active_anchor: activeAnchor || "task.header",
    binding_label: "task:current",
  }),
  open: (payload): ViewOpenSuccess => {
    const initialAnchor = typeof payload.initial_anchor === "string" ? payload.initial_anchor.trim() : "";
    return {
      state_binding: TASK_MAIN_DEFAULT_STATE,
      activeAnchor: initialAnchor || "task.header",
      data: {
        status: "applied",
      },
    };
  },
});
