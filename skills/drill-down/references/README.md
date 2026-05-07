# Power BI Visual — Add Drill-Down Support

## Overview

Drill-down support enables users to navigate through data hierarchies in a Power BI custom visual. Users can drill down from a high-level view (e.g., Year) to more detailed levels (e.g., Quarter → Month → Day). This is configured through the `drilldown` property in `capabilities.json`.

**Official documentation:** https://learn.microsoft.com/en-us/power-bi/developer/visuals/drill-down-support

## Requirements

- **powerbi-visuals-api** package must be installed
- Data roles must support hierarchical data

## Step-by-Step Implementation

### Step 1: Configure Drill-Down Roles in capabilities.json

Add the `drilldown` property specifying which data roles support drill-down:

```json
{
    "dataRoles": [
        {
            "displayName": "Category",
            "name": "category",
            "kind": "Grouping"
        },
        {
            "displayName": "Measure",
            "name": "measure",
            "kind": "Measure"
        }
    ],
    "drilldown": {
        "roles": ["category"]
    },
    "dataViewMappings": [
        {
            "categorical": {
                "categories": {
                    "for": { "in": "category" }
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

### Step 2: Handle Drill Events in the Visual

When a user drills down, Power BI calls `update()` with a filtered data view at the lower hierarchy level:

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

        const categorical = dataView.categorical;
        const categories = categorical?.categories?.[0];

        // The categories will reflect the current drill level
        // e.g., at top level: years; after drilling: quarters
        if (categories) {
            categories.values.forEach((value, index) => {
                // Render each data point at the current drill level
            });
        }
    }
}
```

### Step 3: Handle Category Type Changes Across Drill Levels

When the user drills between hierarchy levels, the **category data type can change**. For example, a Date hierarchy may provide `Date` objects at the top level (Year) but `string` values at lower levels (Quarter name, Month name). Visuals that hardcode assumptions about category types (e.g., expecting timestamps, parsing dates, or using `.getTime()`) will break at certain drill levels.

**Check the category source metadata** to determine the current data type and adapt:

```typescript
public update(options: VisualUpdateOptions): void {
    const dataView = options.dataViews?.[0];
    if (!dataView) return;

    const categories = dataView.categorical?.categories?.[0];
    if (!categories) return;

    // Check what type of data the current drill level provides
    const sourceType = categories.source.type;
    const isDateTime = sourceType?.dateTime;
    const isNumeric = sourceType?.numeric;
    const displayName = categories.source.displayName; // e.g., "Year", "Quarter", "Month"

    categories.values.forEach((value, index) => {
        // Handle values based on the actual type at this drill level
        if (isDateTime && value instanceof Date) {
            // Date-level: use as timestamp
            const timestamp = (value as Date).getTime();
        } else {
            // String/other level: use display value
            const label = String(value);
        }
    });
}
```

> **CRITICAL — Visuals with time-based logic:** If the visual uses timestamps for axis calculations, sorting, or animations (e.g., pulse chart, timeline), it must detect when the drill level no longer provides `Date` objects and fall back to index-based or string-based positioning. Otherwise the visual will crash or render incorrectly at non-date drill levels.

### Step 4: Programmatic Drill (Optional)

Use `host.drill()` to trigger drill-down programmatically:

```typescript
private onDataPointClick(dataPoint: any): void {
    this.host.drill({
        dataRoles: ["category"],
        down: true  // true = drill down, false = drill up
    });
}
```

> **Note:** `host.drill()` availability depends on the API version. Verify the method exists on your `IVisualHost` interface before using it.

## Common Mistakes

| Mistake | Fix |
|---|---|
| Assuming category values are always the same type (e.g., `Date`) | Check `categories.source.type.dateTime` / `.numeric` / `.text` at each drill level and handle accordingly |
| Calling `.getTime()` or `new Date()` on category values without checking type | Guard with `if (value instanceof Date)` or check `sourceType.dateTime` before treating values as dates |
| Not handling the case where drill changes the number of category levels | After drilling, `categorical.categories` may have a different length — always use `categories[categories.length - 1]` for the deepest level or iterate all levels |

## Files That May Need Changes

- `capabilities.json` — Add `drilldown` configuration with `roles`
- `src/visual.ts` — Handle drill-level data in `update()`, optionally use `host.drill()`

## Validation Checklist

- [ ] `drilldown` property is defined in `capabilities.json` with `roles` array
- [ ] Data roles referenced in `drilldown.roles` exist in `dataRoles`
- [ ] The drill-down dataRole is of `Grouping` kind
- [ ] The visual properly renders data at each drill level
- [ ] The visual does NOT hardcode category type assumptions — it checks `categories.source.type` and handles `Date`, `numeric`, and `string` values appropriately
- [ ] For time-based visuals: the visual gracefully handles drill levels where categories are strings (e.g., "Q1", "January") instead of `Date` objects
- [ ] (Optional) Programmatic drill via `host.drill()` is implemented
- [ ] No unrelated files were changed

## Reference

Official Microsoft documentation: https://learn.microsoft.com/en-us/power-bi/developer/visuals/drill-down-support
