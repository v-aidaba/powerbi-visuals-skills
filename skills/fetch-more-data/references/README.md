# Power BI Visual — Fetch More Data

## Overview

The `fetchMoreData` API enables Power BI visuals to load data beyond the default 30K row limit by fetching data in configurable chunks. Data can be loaded in **segments aggregation mode** (default, accumulated data) or **incremental updates mode** (only new data each time).

**Official documentation:** https://learn.microsoft.com/en-us/power-bi/developer/visuals/fetch-more-data

## Requirements

- **API version:** 3.4.0 or higher (`fetchMoreData` API)
- **API version:** 5.2.0 or higher (dynamic `dataReductionCustomization`)
- **powerbi-visuals-api** package must be installed

## Step-by-Step Implementation

### Step 1: Configure dataReductionAlgorithm in capabilities.json

Add or **replace** the `dataReductionAlgorithm` to use `window` with a `count` value. The `count` (2–30,000) determines how many rows are fetched per segment.

> **CRITICAL — Migrating from `top` to `window`:** Most existing visuals already have `"top": { "count": N }` as their `dataReductionAlgorithm`. You must **replace** `top` with `window` — do NOT add a second `dataReductionAlgorithm` or leave `top` in place alongside `window`. The `top` algorithm fetches a fixed number of rows and does NOT support `fetchMoreData()`.

**For categorical data view mappings** (most common — bar charts, line charts, pulse charts, etc.):

```json
{
    "dataViewMappings": [
        {
            "categorical": {
                "categories": {
                    "for": { "in": "category" },
                    "dataReductionAlgorithm": {
                        "window": {
                            "count": 100
                        }
                    }
                },
                "values": {
                    "select": [
                        { "bind": { "to": "measure" } }
                    ]
                }
            }
        }
    ]
}
```

**For table data view mappings:**

```json
{
    "dataViewMappings": [
        {
            "table": {
                "rows": {
                    "for": {
                        "in": "values"
                    },
                    "dataReductionAlgorithm": {
                        "window": {
                            "count": 100
                        }
                    }
                }
            }
        }
    ]
}
```

> **Where to place it:** The `dataReductionAlgorithm` goes on the `categories` (categorical) or `rows` (table) binding — the grouping axis that drives row count. Do NOT put it on the `values` / measures binding.

**Before → After example (categorical migration):**

```diff
 "categories": {
     "for": { "in": "category" },
     "dataReductionAlgorithm": {
-        "top": {
-            "count": 10000
+        "window": {
+            "count": 100
         }
     }
 }
```

### Step 2: Request More Data in the Visual

In `src/visual.ts`, check for additional data segments and request them. When more data is still loading, **do not render yet** — wait until all segments have arrived.

> **IMPORTANT — Rendering events interaction:** If the visual uses the Rendering Events API (`renderingStarted` / `renderingFinished`), you **must** call `renderingFinished` even when returning early to fetch more data. Otherwise Power BI thinks the visual is stuck rendering, which blocks PDF/PowerPoint export and shows a perpetual loading spinner.

```typescript
import powerbi from "powerbi-visuals-api";
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import VisualDataChangeOperationKind = powerbi.VisualDataChangeOperationKind;

export class Visual implements powerbi.extensibility.visual.IVisual {
    private host: powerbi.extensibility.visual.IVisualHost;

    constructor(options: powerbi.extensibility.visual.VisualConstructorOptions) {
        this.host = options.host;
    }

    public update(options: VisualUpdateOptions): void {
        // Signal rendering started (if using rendering events)
        this.host.eventService.renderingStarted(options);

        const dataView = options.dataViews?.[0];
        if (!dataView) {
            this.host.eventService.renderingFinished(options);
            return;
        }

        // Check if this is the first segment or an appended segment
        if (options.operationKind === VisualDataChangeOperationKind.Create) {
            // First segment — initialize your data structures
        }

        if (options.operationKind === VisualDataChangeOperationKind.Append) {
            // Subsequent segment — append to existing data
        }

        // Check if more data is available
        if (dataView.metadata.segment) {
            // Request more data (true = aggregated mode)
            const accepted = this.host.fetchMoreData(true);
            if (!accepted) {
                // 100 MB limit reached — render what we have
                this.renderVisual(dataView);
            }
            // CRITICAL: still call renderingFinished even though we're fetching more
            this.host.eventService.renderingFinished(options);
            return; // Wait for next update() call with more data
        }

        // All data loaded — render the visual
        this.renderVisual(dataView);
        this.host.eventService.renderingFinished(options);
    }
}
```

> **If the visual does NOT use rendering events**, remove the `eventService` calls but keep the same control flow — return early while fetching, render only when all data is loaded.

### Step 3: Incremental Updates Mode (Alternative)

For memory-efficient incremental loading, pass `false` to `fetchMoreData`:

```typescript
public update(options: VisualUpdateOptions): void {
    const dataView = options.dataViews?.[0];
    if (!dataView) return;

    if (options.operationKind === VisualDataChangeOperationKind.Create) {
        // First segment
    }

    if (options.operationKind === VisualDataChangeOperationKind.Segment) {
        // Skip overlapping rows
        const rowOffset = (dataView.table['lastMergeIndex'] === undefined)
            ? 0 : dataView.table['lastMergeIndex'] + 1;

        for (let i = rowOffset; i < dataView.table.rows.length; i++) {
            // Process each new row
        }
    }

    if (dataView.metadata.segment) {
        this.host.fetchMoreData(false); // incremental mode
    }
}
```

## Fetch Modes Comparison

| Feature | Segments Aggregation (`true`) | Incremental Updates (`false`) |
|---|---|---|
| Data view size | Grows with each update | Fixed window size |
| Memory usage | Higher (accumulated) | Lower (only current chunk) |
| Operation kind | `Append` | `Segment` |
| Overlapping rows | No | Yes (check `lastMergeIndex`) |

## Considerations and Limitations

- Window size range: 2–30,000
- Maximum total rows: 1,048,576
- Maximum data view memory: 100 MB (aggregation mode)
- `fetchMoreData()` returns `false` when the 100 MB limit is reached

## Common Mistakes

| Mistake | Fix |
|---|---|
| Leaving `"top"` in `dataReductionAlgorithm` instead of replacing with `"window"` | `top` does NOT support `fetchMoreData()`. You must **replace** `top` with `window`, not add `window` alongside it |
| Adding a second `dataReductionAlgorithm` instead of replacing the existing one | Each binding (`categories` or `rows`) can only have one `dataReductionAlgorithm`. Replace the existing one |
| Not calling `renderingFinished` when returning early to fetch more data | If the visual uses rendering events, **every** code path in `update()` must call `renderingFinished` — including the early return while fetching. Otherwise Power BI shows a perpetual loading spinner |
| Placing `dataReductionAlgorithm` on the `values` binding instead of `categories`/`rows` | It must go on the grouping binding (`categories` for categorical, `rows` for table) — the axis that drives row count |
| Rendering on every `update()` call during data loading | Only render after all segments are loaded (`!dataView.metadata.segment`), or when `fetchMoreData()` returns `false` (100 MB cap). Rendering on each partial segment causes flickering and wasted work |

## Files That May Need Changes

- `capabilities.json` — Replace `top` with `window` in `dataReductionAlgorithm` (or add `window` if no algorithm exists)
- `src/visual.ts` — Implement `fetchMoreData()` logic in the `update()` method, handle rendering events interaction

## Validation Checklist

- [ ] `dataReductionAlgorithm` uses `"window"` (NOT `"top"`) in `capabilities.json` `dataViewMappings`
- [ ] No leftover `"top"` algorithm exists alongside the new `"window"` algorithm
- [ ] `window.count` is set to a value between 2 and 30,000
- [ ] `host.fetchMoreData()` is called when `dataView.metadata.segment` exists
- [ ] `operationKind` is checked to distinguish first vs. subsequent segments
- [ ] The 100 MB rejection case is handled (when `fetchMoreData()` returns `false`)
- [ ] If using rendering events: `renderingFinished` is called on ALL code paths, including early returns during data fetching
- [ ] The visual only renders after all data is loaded (not on every partial segment)
- [ ] No unrelated files were changed

## Reference

Official Microsoft documentation: https://learn.microsoft.com/en-us/power-bi/developer/visuals/fetch-more-data
