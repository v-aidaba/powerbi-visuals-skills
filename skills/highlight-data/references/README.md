# Power BI Visual — Highlight Data in Visuals

## Overview

Data highlighting allows a Power BI custom visual to show which data points are selected across multiple visuals on the same report page. When a user selects data in one visual, other visuals that support highlighting dim non-related data points and emphasize the related ones.

**Official documentation:** https://learn.microsoft.com/en-us/power-bi/developer/visuals/highlight

## Requirements

- **powerbi-visuals-api** package must be installed
- `supportsHighlight: true` must be set in `capabilities.json`

## Step-by-Step Implementation

### Step 1: Enable Highlighting in capabilities.json

```json
{
    "supportsHighlight": true
}
```

### Step 2: Add `highlight` to the DataPoint Interface

Store highlight as a **boolean** on each data point, and track `hasHighlights` on the data model:

```typescript
// In models file
export interface DataPoint {
    category: any;
    value: number;
    selected: boolean;
    highlight?: boolean;
    identity: powerbi.visuals.ISelectionId;
}

export interface ChartData {
    dataPoints: DataPoint[];
    hasHighlights: boolean;
}
```

### Step 3: Read Highlights During Data Conversion

Check `valuesColumn.highlights` and store as boolean on each data point:

```typescript
// In your data conversion/series generation code
const valuesColumn = dataView.categorical.values[0];
const hasHighlights: boolean = !!valuesColumn.highlights;

const dataPoints: DataPoint[] = categories.values.map((category, index) => {
    return {
        category: category,
        value: valuesColumn.values[index] as number,
        highlight: hasHighlights && !!(valuesColumn.highlights[index]),
        selected: false,
        identity: host.createSelectionIdBuilder()
            .withCategory(categories, index)
            .createSelectionId(),
    };
});
```

### Step 4: Create a Shared Opacity Utility

Create a reusable function that handles all combinations of selection + highlight state:

```typescript
// In utils.ts
export const DimmedOpacity: number = 0.5;
export const DefaultOpacity: number = 1.0;

export function getFillOpacity(
    selected: boolean,
    highlight: boolean,
    hasSelection: boolean,
    hasPartialHighlights: boolean
): number {
    if (!selected && !highlight && (hasSelection || hasPartialHighlights)) {
        return DimmedOpacity;
    }
    return DefaultOpacity;
}
```

### Step 5: Pass `hasHighlights` Through BehaviorOptions

The behavior class needs `hasHighlights` to coordinate with selection:

```typescript
// In behavior options interface
export interface BehaviorOptions {
    dataPoints: DataPoint[];
    selection: d3.Selection<any, DataPoint, any, any>;
    clearCatcher: d3.Selection<any, any, any, any>;
    hasHighlights: boolean;
    onSelectCallback(): void;
}
```

### Step 6: Apply Opacity in Rendering Using the Utility

Use `getFillOpacity()` in rendering code — no inline `if/else` branches:

```typescript
import { getFillOpacity, DimmedOpacity, DefaultOpacity } from "./utils";

private renderDataPoints(data: ChartData): void {
    const hasSelection: boolean = this.behavior.hasSelection;
    const hasHighlights: boolean = data.hasHighlights;

    this.selection
        .style("opacity", (d: DataPoint) => {
            return getFillOpacity(
                d.selected,
                d.highlight,
                hasSelection,
                hasHighlights
            );
        });

    // Pass hasHighlights to behavior for selection coordination
    const behaviorOptions: BehaviorOptions = {
        dataPoints: data.dataPoints,
        selection: this.selection,
        clearCatcher: this.svg,
        hasHighlights: data.hasHighlights,
        onSelectCallback: () => this.render(),
    };
    this.behavior.bindEvents(behaviorOptions);
}
```

## How Selection + Highlight Interact

The `getFillOpacity()` utility handles four states:

| `selected` | `highlight` | `hasSelection` or `hasHighlights` | Result |
|---|---|---|---|
| `false` | `false` | `true` | Dimmed (0.5) |
| `true` | `false` | any | Full (1.0) |
| `false` | `true` | any | Full (1.0) |
| `true` | `true` | any | Full (1.0) |
| any | any | both `false` | Full (1.0) |

## Highlight Data Structure

When `supportsHighlight` is enabled, `DataViewValueColumn` contains:

| Property | Type | Description |
|---|---|---|
| `values` | `PrimitiveValue[]` | The original data values (always present) |
| `highlights` | `PrimitiveValue[]` | The highlighted values (`null` when no highlight active) |

- When no highlighting: `highlights` is `null`
- When highlighting: `highlights[i]` has a value for highlighted points; `null` for non-highlighted

## Files That May Need Changes

| File | What to Change |
|---|---|
| `capabilities.json` | Add `"supportsHighlight": true` |
| Models file | Add `highlight?: boolean` to DataPoint, `hasHighlights: boolean` to ChartData |
| `src/utils.ts` | Add `getFillOpacity()`, `DimmedOpacity`, `DefaultOpacity` |
| Data conversion file | Read `valuesColumn.highlights` and store as boolean |
| Behavior file | Add `hasHighlights` to BehaviorOptions interface |
| `src/visual.ts` | Use `getFillOpacity()` in rendering, pass `hasHighlights` to behavior |

## Common Mistakes

| Mistake | Fix |
|---|---|
| Storing highlight as a number value | Store as `boolean` on DataPoint. The highlight *value* from `highlights[i]` is rarely needed — what matters is whether the point is highlighted or not |
| Inline opacity logic in rendering | Use a shared `getFillOpacity()` utility that handles all combinations of selected + highlight state |
| Ignoring selection interaction | Highlighting and selection must work together. A selected point stays full opacity even when other points are highlighted. The utility handles this |
| Not tracking `hasHighlights` on the data model | Must be stored on ChartData and passed to BehaviorOptions. Computing it per-render from the data view is wasteful and error-prone |
| Hardcoding opacity values | Define `DimmedOpacity` and `DefaultOpacity` as constants in utils |

## Validation Checklist

- [ ] `"supportsHighlight": true` is set in `capabilities.json`
- [ ] `highlight?: boolean` is on the DataPoint interface
- [ ] `hasHighlights: boolean` is on the ChartData interface
- [ ] `valuesColumn.highlights` is read and stored as boolean during data conversion
- [ ] `getFillOpacity()` utility exists with `DimmedOpacity`/`DefaultOpacity` constants
- [ ] `hasHighlights` is passed through BehaviorOptions
- [ ] Rendering uses `getFillOpacity()` — no inline if/else opacity logic
- [ ] Non-highlighted/non-selected points are dimmed when highlighting or selection is active
- [ ] All points show at full opacity when no highlighting or selection is active
- [ ] No unrelated files were changed

## Reference

Official Microsoft documentation: https://learn.microsoft.com/en-us/power-bi/developer/visuals/highlight
