# Power BI Visual — Warning Icon

## Overview

The Warning Icon feature displays an alert icon in the visual's header bar (top-right corner) with a tooltip message when hovered. This is the standard Power BI pattern for communicating non-blocking issues to report consumers — such as missing data fields, truncated datasets, or unsupported values.

**Why this matters:** Warning icons are the official way to notify users about data quality issues without disrupting the visual rendering. They appear automatically in the header and are recognized by all Power BI users as a standard notification pattern.

**Official documentation:** https://learn.microsoft.com/en-us/power-bi/developer/visuals/visual-display-warning-icon

## Requirements

- **API version:** 2.6.0 or higher (recommended: 5.3.0+)
- **powerbi-visuals-api** package must be installed
- No additional capabilities or privileges needed — the API is available directly on `IVisualHost`

## Step-by-Step Implementation

### Step 1: Store the Host Reference

```typescript
import powerbi from "powerbi-visuals-api";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

export class Visual implements IVisual {
    private host: IVisualHost;
    private target: HTMLElement;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.target = options.element;
    }
}
```

### Step 2: Call `displayWarningIcon` in update()

Evaluate conditions inside `update()` and call `displayWarningIcon` when a warning is needed:

```typescript
public update(options: VisualUpdateOptions): void {
    const dataView = options.dataViews && options.dataViews[0];

    // Warn when no data is provided
    if (!dataView || !dataView.categorical || !dataView.categorical.values) {
        this.host.displayWarningIcon(
            "No data available",
            "Add a measure to the Values field to display this visual."
        );
        return;
    }

    // Normal rendering logic
    this.renderVisual(dataView.categorical);
}
```

### Step 3: Multiple Condition Checks

When you need to check several conditions, evaluate them in priority order. Only the **last** `displayWarningIcon` call in a single `update()` cycle will be shown (Power BI displays one warning at a time):

```typescript
public update(options: VisualUpdateOptions): void {
    const dataView = options.dataViews?.[0];
    const categorical = dataView?.categorical;

    // Priority 1: No data at all
    if (!dataView) {
        this.host.displayWarningIcon(
            "No data available",
            "Please add data fields to this visual."
        );
        return;
    }

    // Priority 2: Missing category field
    if (!categorical?.categories || categorical.categories.length === 0) {
        this.host.displayWarningIcon(
            "Missing required field",
            "Please add a field to the Category data role."
        );
        return;
    }

    // Priority 3: Missing measure field
    if (!categorical?.values || categorical.values.length === 0) {
        this.host.displayWarningIcon(
            "Missing measure",
            "Please add at least one measure to the Values data role."
        );
        return;
    }

    // Priority 4: Data truncation warning (non-blocking — still render)
    if (categorical.categories[0].values.length >= 1000) {
        this.host.displayWarningIcon(
            "Data truncated",
            "Only the first 1000 rows are shown. Apply filters to reduce data volume."
        );
    }

    // Render visual (proceed even if truncation warning was shown)
    this.renderVisual(categorical);
}
```

### Step 4: Conditional Warnings with Normal Rendering

Some warnings are non-blocking — the visual still renders, but alerts the user to a potential issue:

```typescript
public update(options: VisualUpdateOptions): void {
    const dataView = options.dataViews?.[0];
    const categorical = dataView?.categorical;

    if (!categorical?.categories || !categorical?.values) {
        this.host.displayWarningIcon(
            "Incomplete data",
            "Both a category and a measure are required."
        );
        return;
    }

    // Check for negative values (visual doesn't support them)
    const values = categorical.values[0].values as number[];
    const hasNegatives = values.some(v => v != null && v < 0);

    if (hasNegatives) {
        this.host.displayWarningIcon(
            "Unsupported values",
            "This visual does not support negative values. Negative values are excluded from the chart."
        );
    }

    // Filter out negatives and render
    const filteredData = values.filter(v => v == null || v >= 0);
    this.renderChart(categorical.categories[0].values, filteredData);
}
```

---

## API Reference

### Method Signature

```typescript
IVisualHost.displayWarningIcon(title: string, detailedMessage: string): void
```

| Parameter | Type | Description |
|---|---|---|
| `title` | `string` | Short warning title shown in bold in the tooltip |
| `detailedMessage` | `string` | Longer explanation shown below the title in the tooltip |

### Behavior

- The warning icon appears in the visual **header bar** (top-right corner)
- Hovering over the icon shows a tooltip with the title and message
- The icon is **automatically cleared** when a new `update()` cycle runs without calling `displayWarningIcon()`
- There is **no explicit "clear" method** — simply don't call it when conditions are normal
- Only **one warning** can be displayed at a time — multiple calls in one `update()` show only the last one
- The tooltip supports **plain text only** — no HTML or markdown

---

## Common Warning Scenarios

| Scenario | Title | Message |
|---|---|---|
| No data bound | `"No data available"` | `"Drag a measure into the Values field well."` |
| Missing required field | `"Missing required field"` | `"The Category field is required for this visual."` |
| Data exceeds row limit | `"Data truncated"` | `"Only the first 1000 rows are shown. Apply filters to reduce data."` |
| Negative values unsupported | `"Unsupported values"` | `"This visual does not support negative values. Negative values are excluded."` |
| Deprecated configuration | `"Configuration warning"` | `"The current settings use a deprecated option. Please update your configuration."` |
| Too many categories | `"Too many categories"` | `"Performance may be affected. Consider filtering to fewer than 100 categories."` |

---

## Edge Cases & Pitfalls

### Edge Case 1: Multiple warnings — only the last one shows

Power BI displays only one warning icon at a time. If you call `displayWarningIcon` multiple times, only the last call wins:

```typescript
// WRONG — only the second warning will be visible
this.host.displayWarningIcon("Warning 1", "First issue.");
this.host.displayWarningIcon("Warning 2", "Second issue.");  // ❌ Overwrites first

// CORRECT — concatenate multiple issues into one message
const warnings: string[] = [];
if (hasNegatives) warnings.push("Negative values are excluded.");
if (hasTruncation) warnings.push("Data is truncated to 1000 rows.");

if (warnings.length > 0) {
    this.host.displayWarningIcon(
        "Data issues detected",
        warnings.join(" ")  // ✅ Single call with combined message
    );
}
```

### Edge Case 2: Warning automatically clears — no manual clear needed

```typescript
public update(options: VisualUpdateOptions): void {
    const dataView = options.dataViews?.[0];

    if (!dataView) {
        // Warning icon appears
        this.host.displayWarningIcon("No data", "Please add data fields.");
        return;
    }

    // No displayWarningIcon call here — icon automatically disappears
    // ✅ This is correct — no "clearWarning()" method exists
    this.renderVisual(dataView);
}
```

### Edge Case 3: Warning on early return vs. non-blocking warning

Decide whether the warning should stop rendering or allow it to continue:

```typescript
public update(options: VisualUpdateOptions): void {
    const categorical = options.dataViews?.[0]?.categorical;

    // BLOCKING warning — visual cannot render without data
    if (!categorical?.categories) {
        this.host.displayWarningIcon("Missing field", "Add a category field.");
        this.clearVisual();  // Clear any previous render
        return;  // ✅ Stop here — nothing to render
    }

    // NON-BLOCKING warning — visual renders but alerts the user
    if (categorical.categories[0].values.length > 500) {
        this.host.displayWarningIcon("Performance notice", "Large dataset may affect performance.");
        // ✅ Don't return — continue rendering
    }

    this.renderVisual(categorical);
}
```

### Edge Case 4: Warning in combination with rendering events

When using rendering events (renderingStarted/renderingFinished), warnings must not prevent the rendering signal:

```typescript
public update(options: VisualUpdateOptions): void {
    this.events.renderingStarted(options);

    const dataView = options.dataViews?.[0];

    if (!dataView || !dataView.categorical) {
        this.host.displayWarningIcon("No data", "Add data fields to the visual.");
        this.clearVisual();
        this.events.renderingFinished(options);  // ✅ Still must signal finished!
        return;
    }

    try {
        this.renderVisual(dataView.categorical);
        this.events.renderingFinished(options);
    } catch (error) {
        this.events.renderingFailed(options, String(error));
    }
}
```

### Edge Case 5: Empty strings passed to displayWarningIcon

```typescript
// WRONG — empty title/message shows a blank tooltip
this.host.displayWarningIcon("", "");  // ❌ Shows icon with empty tooltip

// CORRECT — always provide meaningful text
this.host.displayWarningIcon(
    "Data issue",
    "Unable to display the visual with the current data configuration."
);  // ✅
```

### Edge Case 6: Warning visible to report consumers (not just developers)

The warning icon is visible to everyone viewing the report — not just in development mode. Keep messages user-friendly and actionable:

```typescript
// WRONG — developer-facing message
this.host.displayWarningIcon("Error", "dataView.categorical is null");  // ❌

// CORRECT — user-facing message
this.host.displayWarningIcon(
    "Missing data",
    "Please add a category and measure field to display this chart."
);  // ✅
```

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why It's Wrong | Fix |
|---|---|---|
| Custom DOM warning icon inside the visual | Doesn't follow Power BI UX patterns | Use `displayWarningIcon()` API |
| Calling `displayWarningIcon` for errors that prevent all rendering | Errors need visible feedback in the canvas | Show error UI in visual + optionally warning icon |
| Multiple `displayWarningIcon` calls expecting all to show | Only last call wins | Concatenate messages into one call |
| Developer/technical language in warning messages | Report consumers won't understand | Use plain, actionable language |
| Trying to manually clear the warning icon | No clear API exists | Simply don't call `displayWarningIcon` in next `update()` |
| Calling `displayWarningIcon` outside of `update()` | May not persist or may be overwritten | Always call inside `update()` |

---

## Files That May Need Changes

- `src/visual.ts` — Add `displayWarningIcon()` calls in the `update()` method

No additional files, config changes, or capabilities updates are required for warning icons. The API is available directly on `IVisualHost`.

## Validation Checklist

- [ ] `IVisualHost` is stored from the constructor options
- [ ] `displayWarningIcon()` is called with both `title` and `detailedMessage` strings
- [ ] The warning condition is evaluated inside the `update()` method
- [ ] The warning icon is not shown when data is valid (automatic clearing)
- [ ] Warning messages are clear, user-friendly, and actionable (not developer jargon)
- [ ] Multiple issues are concatenated into a single `displayWarningIcon` call
- [ ] Non-blocking warnings don't prevent rendering (no premature `return`)
- [ ] Blocking warnings clear the visual canvas before returning
- [ ] If rendering events are used, `renderingFinished` is still called even when showing a warning
- [ ] The `powerbi-visuals-api` version is 2.6.0 or higher
- [ ] No unrelated files were changed

## Reference

Official Microsoft documentation: https://learn.microsoft.com/en-us/power-bi/developer/visuals/visual-display-warning-icon
