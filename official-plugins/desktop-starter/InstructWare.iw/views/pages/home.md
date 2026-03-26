# page_home

This page defines the fullscreen holographic command-orb scene used as the default visual entry for desktop-starter.

## Page Purpose

- Present an immersive visual stage that is immediately interactive after load.
- Demonstrate a maintainable Three.js + Vue scene baseline for further feature extension.

## Page Structure

- One fullscreen stage container with one active scene renderer. @iwp(kind=views.pages.layout_tree)
- One HUD panel showing live scene parameters and boot progress.
- One centered title region bound to configurable welcome text.

## Interaction Intent

- Scene startup loads holographic scene by default.
- Pointer move updates orb motion response.
- Click emits local burst pulse feedback.
- View implementation lives under `_ir/frontend/web-src/src/views/pages/home/**`.

## Display Contract

- Stage renders immersive visual effect with animated core, shell, and particle layers.
- HUD displays particle size, particle color, background color, core color, wave speed, and boot progress.

## State Expectations

Default parameter values:

- `particle_size = 1.1` @iwp(file=state,section=defaults)
- `particle_color = #bfdbfe` @iwp(file=state,section=defaults)
- `background_color = #02040f` @iwp(file=state,section=defaults)
- `core_color = #93c5fd` @iwp(file=state,section=defaults)
- `wave_speed = 0.74` @iwp(file=state,section=defaults)
- `welcome_text = Hello` @iwp(file=state,section=defaults)

## Acceptance Criteria

- Scene is visible and interactive immediately after page load.
- Pointer movement changes orb motion and click triggers burst feedback.
- HUD and title values stay consistent with runtime parameters.
