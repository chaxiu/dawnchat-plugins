import type { Component } from "vue";
import {
  BookOpen,
  Grid3x3,
  Image,
  LayoutDashboard,
  LayoutGrid,
  LineChart,
  Music,
} from "lucide-vue-next";

import type { ViewRegistration } from "./manifest";
import { ASSISTANT_LAUNCHER_ROUTE } from "./assistantNavigationRoutes";
import { TASK_MAIN_VIEW_ID } from "../task";

const VIEW_ID_TO_ICON: Record<string, Component> = {
  "board.main": LayoutDashboard,
  "plane.main": LineChart,
  "image.explainer": Image,
  "tictactoe.main": Grid3x3,
  "music.main": Music,
  "word.main": BookOpen,
};

export function resolveLauncherIconComponent(viewId: string): Component {
  return VIEW_ID_TO_ICON[viewId] || LayoutGrid;
}

export function filterRegistrationsForLauncher(
  registrations: ViewRegistration[]
): ViewRegistration[] {
  return registrations
    .filter((r) => r.route.full_path !== ASSISTANT_LAUNCHER_ROUTE && r.view_id !== TASK_MAIN_VIEW_ID)
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
}
