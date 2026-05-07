---
name: dialog-box
description: "Add a modal dialog box to a Power BI custom visual using openModalDialog API."
---

# Power BI Visual — Dialog Box (Modal Dialog)

The Dialog Box (Modal Dialog) feature allows a Power BI custom visual to open a pop-up dialog window. The dialog runs as a separate visual instance inside a modal overlay.

## Trigger

**Use when:**

- The user asks to add a dialog, modal, popup, or overlay to a Power BI custom visual.
- The user wants to show detailed information, a configuration form, or a confirmation prompt that requires a separate window within the visual.
- The user needs to implement `openModalDialog` or `IDialogOptions` in a custom visual project.

**Don't use when:**

- The user wants a tooltip or hover card - those use the `ITooltipService` API, not dialogs.
- The user wants a landing page or splash screen that replaces the visual canvas.
- The user is working with a standard (non-custom) Power BI visual that does not support the visuals SDK.
- The target API version is below 4.0 (dialogs are not available).

## Overview

The Dialog Box feature allows a Power BI custom visual to open a pop-up dialog window. The dialog runs as a separate visual instance inside a modal overlay. This is useful for showing detailed information, configuration forms, confirmations, or any interactive content that needs user attention.

A dialog box implementation consists of two separate visuals:
1. **Host Visual** - The main visual that calls `openModalDialog()` to open the dialog.
2. **Dialog Visual** - A separate visual class that renders inside the dialog window.

See [references/README.md](references/README.md) for a detailed walkthrough, code samples, and a checklist.