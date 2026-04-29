---
name: sync-slicers
description: "Synchronize slicer filter state across multiple report pages."
---

# Power BI Visual — Enable Sync Slicers

Sync Slicers allows a slicer visual to synchronize its filter state across multiple report pages. When enabled, users can configure the slicer to appear on multiple pages and keep its filter selections in sync. This is configured via the `supportsSynchronizingFilterState` property in `capabilities.json`.

## Trigger

**Use when:**

- The user asks to implement power bi visual — enable sync slicers in a Power BI custom visual.
- The user needs guidance on the sync-slicers feature or API.

**Don't use when:**

- The user is working with a standard (non-custom) Power BI visual that does not support the visuals SDK.

## Overview

Sync Slicers allows a slicer visual to synchronize its filter state across multiple report pages. When enabled, users can configure the slicer to appear on multiple pages and keep its filter selections in sync. This is configured via the `supportsSynchronizingFilterState` property in `capabilities.json`.

See [references/README.md](references/README.md) for a detailed walkthrough, code samples, and a checklist.
