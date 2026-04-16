export const ROUTE_PATHS = {
  root: "/",
  /** App view launcher (registered under `/views` in the shell). */
  launcher: "/views/launcher",
  /** Prefix for nested view routes (full paths come from registrations). */
  views: "/views",
} as const;
