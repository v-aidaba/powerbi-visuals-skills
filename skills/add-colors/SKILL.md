---
name: add-colors
description: "Add color support to a Power BI custom visual using the color palette API."
---

# Power BI Visual — Add Colors to Your Visual

The Color Palette API allows a Power BI custom visual to use theme-consistent colors provided by Power BI. Instead of hardcoding colors, the visual uses `host.colorPalette` to get colors that match the current report theme and are consistent across sessions. Colors can also be overridden by the user through the Format pane using `colorSelector` objects in `capabilities.json` and corresponding formatting settings.

## Trigger

**Use when:**

- The user asks to implement power bi visual — add colors to your visual in a Power BI custom visual.
- The user needs guidance on the add-colors feature or API.

**Don't use when:**

- The user is working with a standard (non-custom) Power BI visual that does not support the visuals SDK.

## Overview

The Color Palette API allows a Power BI custom visual to use theme-consistent colors provided by Power BI. Instead of hardcoding colors, the visual uses `host.colorPalette` to get colors that match the current report theme and are consistent across sessions. Colors can also be overridden by the user through the Format pane using `colorSelector` objects in `capabilities.json` and corresponding formatting settings.

See [references/README.md](references/README.md) for a detailed walkthrough, code samples, and a checklist.
