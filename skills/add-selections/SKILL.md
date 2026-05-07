---
name: add-selections
description: "Add selection support to respond to user clicks on data points."
---

# Power BI Visual — Add Selections (Visual Interactions)

The Selection API allows a Power BI custom visual to respond to user clicks on data points and notify the Power BI host about the current selection state. This enables cross-filtering and cross-highlighting between visuals on the same report page. The `allowInteractions` flag controls whether the visual should respond to user interactions (e.g., visuals on dashboards are non-interactive).

## Trigger

**Use when:**

- The user asks to implement power bi visual — add selections (visual interactions) in a Power BI custom visual.
- The user needs guidance on the add-selections feature or API.

**Don't use when:**

- The user is working with a standard (non-custom) Power BI visual that does not support the visuals SDK.

## Overview

The Selection API allows a Power BI custom visual to respond to user clicks on data points and notify the Power BI host about the current selection state. This enables cross-filtering and cross-highlighting between visuals on the same report page. The `allowInteractions` flag controls whether the visual should respond to user interactions (e.g., visuals on dashboards are non-interactive).

See [references/README.md](references/README.md) for a detailed walkthrough, code samples, and a checklist.
