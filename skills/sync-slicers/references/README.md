# Power BI Visual — Enable Sync Slicers

## Overview

Sync Slicers allows a slicer visual to synchronize its filter state across multiple report pages. When enabled, users can configure the slicer to appear on multiple pages and keep its filter selections in sync. This is configured via the `supportsSynchronizingFilterState` property in `capabilities.json`.

**Official documentation:** https://learn.microsoft.com/en-us/power-bi/developer/visuals/enable-sync-slicers

## Requirements

- **powerbi-visuals-api** package must be installed
- The visual must be a slicer (applies filters)
- `supportsSynchronizingFilterState: true` must be set in `capabilities.json`

## Step-by-Step Implementation

### Step 1: Enable Sync Slicers in capabilities.json

Add the `supportsSynchronizingFilterState` property:

```json
{
    "supportsSynchronizingFilterState": true
}
```

### Step 2: Ensure Proper Filter State Restoration

Your slicer must properly restore its filter state from the `update()` method's options, since Power BI will call `update()` when synchronizing slicers across pages:

```typescript
import powerbi from "powerbi-visuals-api";

export class Visual implements powerbi.extensibility.visual.IVisual {
    private host: powerbi.extensibility.visual.IVisualHost;

    constructor(options: powerbi.extensibility.visual.VisualConstructorOptions) {
        this.host = options.host;
    }

    public update(options: powerbi.extensibility.visual.VisualUpdateOptions): void {
        const dataView = options.dataViews?.[0];
        if (!dataView) return;

        // Restore filter state from json filters
        const jsonFilters = options.jsonFilters;
        if (jsonFilters && jsonFilters.length > 0) {
            // Restore the slicer state from the filter
            this.restoreFromFilter(jsonFilters[0]);
        }

        // Render the slicer
        this.renderSlicer(dataView);
    }

    private restoreFromFilter(filter: any): void {
        // Restore slicer UI state from the filter object
    }
}
```

### Step 3: Apply Filters Consistently

Ensure that when the slicer applies a filter, it does so in a way that can be properly synchronized:

```typescript
import { AdvancedFilter } from "powerbi-models";

private applySlicerFilter(selectedValues: any[]): void {
    if (selectedValues.length === 0) {
        this.host.applyJsonFilter(null, "general", "filter", powerbi.FilterAction.remove);
        return;
    }

    const filter = new AdvancedFilter(
        this.target,
        "Or",
        ...selectedValues.map(val => ({
            operator: "Is",
            value: val
        }))
    );

    this.host.applyJsonFilter(filter, "general", "filter", powerbi.FilterAction.merge);
}
```

## How Sync Slicers Works

1. User configures a slicer on Page 1 and syncs it to Page 2.
2. Power BI creates instances of the slicer on both pages.
3. When the user changes the slicer on Page 1, Power BI calls `update()` on Page 2's instance with the same filter state.
4. The slicer on Page 2 restores its visual state from the filter.

## Files That May Need Changes

- `capabilities.json` — Add `"supportsSynchronizingFilterState": true`
- `src/visual.ts` — Ensure proper filter state restoration in `update()`

## Validation Checklist

- [ ] `"supportsSynchronizingFilterState": true` is set in `capabilities.json`
- [ ] The slicer properly restores its UI state from `options.jsonFilters`
- [ ] Filter application uses `host.applyJsonFilter()` consistently
- [ ] The slicer works correctly when synchronized across multiple report pages
- [ ] No unrelated files were changed

## Reference

Official Microsoft documentation: https://learn.microsoft.com/en-us/power-bi/developer/visuals/enable-sync-slicers
