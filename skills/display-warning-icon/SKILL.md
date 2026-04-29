---
name: display-warning-icon
description: "Display a warning icon in the visual header using the displayWarningIcon API."
---

# Power BI Visual — Warning Icon

The Warning Icon feature displays an alert icon in the visual's header bar (top-right corner) with a tooltip message when hovered. This is the standard Power BI pattern for communicating non-blocking issues to report consumers.

## Trigger

**Use when:**

- The user asks to display a warning, alert, or caution icon in a Power BI custom visual header.
- The user wants to show a visual indicator when required data roles are not mapped or contain invalid values.
- The user needs to implement `displayWarningIcon()` from `IVisualHost`.
- The user wants to alert report consumers about data quality issues, missing fields, or truncated data.

**Don't use when:**

- The user wants a custom DOM warning overlay inside the visual canvas (use the display-warning-icon custom overlay pattern).
- The user wants to show a tooltip on hover - use `ITooltipService` instead.
- The user is working with a standard (non-custom) Power BI visual.
- The target API version is below 2.6.0.

## Overview

The Warning Icon feature displays an alert icon in the visual's header bar (top-right corner) with a tooltip message when hovered. This is the standard Power BI pattern for communicating non-blocking issues to report consumers — such as missing data fields, truncated datasets, or unsupported values.

Key behaviors:
- The icon appears automatically in the header when `displayWarningIcon()` is called
- It is automatically cleared when a new `update()` cycle runs without calling the method
- Only one warning can be displayed at a time
- No additional capabilities or privileges needed

See [references/README.md](references/README.md) for a detailed walkthrough, code samples, and a checklist.