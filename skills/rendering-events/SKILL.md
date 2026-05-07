---
name: rendering-events
description: "Signal rendering start and finish events to Power BI."
---

# Power BI Visual — Rendering Events API

Rendering events let Power BI know when a visual has started and finished rendering. This is **required for certification** and ensures that exports to PDF and PowerPoint wait for the visual to complete rendering before capturing it. The API consists of three methods: `renderingStarted`, `renderingFinished`, and `renderingFailed`.

## Trigger

**Use when:**

- The user asks to implement power bi visual — rendering events api in a Power BI custom visual.
- The user needs guidance on the rendering-events feature or API.

**Don't use when:**

- The user is working with a standard (non-custom) Power BI visual that does not support the visuals SDK.

## Overview

Rendering events let Power BI know when a visual has started and finished rendering. This is **required for certification** and ensures that exports to PDF and PowerPoint wait for the visual to complete rendering before capturing it. The API consists of three methods: `renderingStarted`, `renderingFinished`, and `renderingFailed`.

See [references/README.md](references/README.md) for a detailed walkthrough, code samples, and a checklist.
