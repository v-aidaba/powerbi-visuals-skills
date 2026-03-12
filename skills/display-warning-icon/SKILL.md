---
name: display-warning-icon
description: "Show a warning icon overlay inside a Power BI custom visual."
---

# Display Warning Icon

Render a warning or alert icon overlay inside a Power BI custom visual to signal data issues, missing fields, or configuration problems to the report consumer.

## Trigger

**Use when:**

- The user asks to display a warning, alert, caution, or error icon inside a custom visual.
- The user wants to show a visual indicator when required data roles are not mapped or contain invalid values.
- The user needs to overlay an informational icon (⚠️, ℹ️, ❌) on top of the visual canvas to communicate a problem state.
- The user wants to implement a "no data" or "misconfigured" state with an icon and message.

**Don't use when:**

- The user wants to show a tooltip on hover — use `ITooltipService` instead.
- The user wants to show a full landing page when no data is present — use the `IVisualHost.createLandingPage()` pattern or conditional rendering.
- The user wants to display a Power BI built-in error banner (those are managed by the host, not the visual code).
- The user is working with a standard (non-custom) Power BI visual.

## Overview

Power BI custom visuals control their own rendering surface. When data is missing, incomplete, or in an error state, the visual should communicate this clearly. A common pattern is to overlay a warning icon with a short message on the visual's container element.

### Key concepts

1. **Condition detection** — check in the `update()` method whether required data roles are populated and values are valid.
2. **Icon element** — create an absolutely-positioned HTML element (or SVG) inside the visual's root container that shows the icon and message.
3. **Show / hide logic** — toggle the icon overlay's visibility based on the condition each time `update()` is called.
4. **Accessibility** — add `role="alert"` and `aria-label` to the overlay so screen readers announce the warning.

### Minimal implementation steps

1. In `visual.ts`, add a private field for the warning overlay element.
2. In the `constructor`, create the overlay element and append it to the visual's root container (hidden by default).
3. In `update()`, evaluate the data condition and toggle the overlay visibility.
4. Style the overlay with CSS so it is centered and does not interfere with interactive elements when hidden.

### Certification constraints

- Do not load external icon fonts or images at runtime — bundle SVG icons or use Unicode characters.
- Do not use `innerHTML` with user-supplied data — sanitize or use `textContent`.
- The overlay must not break the visual when data later becomes valid (ensure it hides cleanly).

### Common mistakes

- Using `display: none` but forgetting to re-show the overlay when the condition reoccurs after valid data.
- Appending a new overlay element on every `update()` call instead of reusing a single element.
- Placing the overlay outside the visual's root container, causing it to render outside the visual boundary.
- Hardcoding pixel sizes that break at different visual dimensions — use relative/flexbox positioning.
- Missing accessibility attributes, which blocks certification.

See [references/README.md](references/README.md) for a full implementation example, styling guide, and checklist.
