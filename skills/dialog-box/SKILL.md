---
name: dialog-box
description: "Add a modal dialog box to a Power BI custom visual."
---

# Dialog Box

Add a modal dialog box to a Power BI custom visual using the `IVisualHost.openModalDialog` API introduced in API v5.9.0.

## Trigger

**Use when:**

- The user asks to add a dialog, modal, popup, or overlay to a Power BI custom visual.
- The user wants to show detailed information, a configuration form, or a confirmation prompt that requires a separate window within the visual.
- The user needs to implement `openModalDialog` or `IDialogOptions` in a custom visual project.

**Don't use when:**

- The user wants a tooltip or hover card — those use the `ITooltipService` API, not dialogs.
- The user wants a landing page or splash screen that replaces the visual canvas (use conditional rendering in `update()` instead).
- The user is working with a standard (non-custom) Power BI visual that does not support the visuals SDK.
- The target API version is below 5.9.0 (dialogs are not available).

## Overview

Power BI custom visuals can open modal dialogs via `IVisualHost.openModalDialog()`. The dialog renders an embedded HTML page from the visual package, communicates with the host visual through a message-passing interface, and returns a result when closed.

### Key concepts

1. **Dialog HTML page** — a standalone HTML file bundled in the visual package (declared in `pbiviz.json` under `externalJS` or assets). It runs in an isolated iframe.
2. **`IDialogOptions`** — configuration object passed to `openModalDialog()`: dialog size (`DialogOpenOptions`), initial data, and action ID.
3. **Message passing** — the dialog page and the visual exchange data using `IDialogHost.setResult()` and the `DialogAction` callback.
4. **Result handling** — `openModalDialog()` returns a promise that resolves with the dialog result when the user closes it.

### Minimal implementation steps

1. Create the dialog HTML page (e.g., `dialog.html`) and include it in the visual package assets.
2. Register the dialog asset in `pbiviz.json`.
3. Call `this.host.openModalDialog()` from `visual.ts`, passing `IDialogOptions`.
4. Handle the returned `Promise<IDialogCloseResult>` to read the user's response.
5. Inside the dialog page, use the Dialog API (`window['dialogHost']`) to send results back.

### Certification constraints

- Dialogs must not load external URLs — all content must be bundled.
- Dialogs must not execute arbitrary user-supplied code.
- Keep dialog size within recommended limits (max 600 × 400 logical pixels is a safe default).

### Common mistakes

- Forgetting to declare the dialog HTML in `pbiviz.json` — the file won't be found at runtime.
- Using API version below 5.9.0 — `openModalDialog` is undefined.
- Attempting to access the visual's DOM directly from the dialog iframe — this is blocked by the sandbox.
- Not handling the promise rejection case when the user dismisses the dialog without a result.

See [references/README.md](references/README.md) for a detailed walkthrough, code samples, and a checklist.
