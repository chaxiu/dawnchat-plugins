/** Canonical full path for the in-app view launcher (under `/views/*` in all shells). */
export const ASSISTANT_LAUNCHER_ROUTE = "/views/launcher";

/** Cold-start splash (optional); templates should register this path under their `/views` shell. */
export const ASSISTANT_SPLASH_ROUTE = "/views/splash";

/**
 * Default welcome path for desktop-style shells that nest welcome under `/views/welcome`.
 * Web assistant historically uses top-level `/welcome`; do not assume this constant matches every template.
 */
export const ASSISTANT_WELCOME_ROUTE = "/views/welcome";
