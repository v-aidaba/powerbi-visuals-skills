# Power BI Visual — Add Bookmarks Support

## Overview

Bookmarks in Power BI allow users to capture and restore the configured state of a report page, including selections and filters. A custom visual that supports bookmarks must save and provide the correct selection or filter state when a bookmark is applied.

When a user applies a bookmark, Power BI restores the saved selection or filter state and passes it back to the visual. The visual must then update its internal state and re-render to reflect the bookmarked state.

**Official documentation:** https://learn.microsoft.com/en-us/power-bi/developer/visuals/bookmarks-support

## Requirements

- **API version:** 1.11.0 or higher (for non-filter visuals using `SelectionManager`)
- **API version:** 2.6.0 or higher (for filter visuals)
- **powerbi-visuals-api** package must be installed

## Architecture

There are two approaches depending on whether the visual uses selections or filters:

1. **Selection-based visuals** (bar charts, pie charts, etc.) — Use `selectionManager.registerOnSelectCallback()` to restore selections when a bookmark is applied.
2. **Filter-based visuals** (slicers) — Use `applyJsonFilter()` to apply filters and restore filter state from `options.jsonFilters` in the `update()` method.

---

## Pre-Implementation Check (REQUIRED)

**Before adding bookmark support, inspect the existing code to understand what selection/filter infrastructure is already in place.**

1. **Check `src/visual.ts` for existing selection support:**
   - Look for `this.selectionManager = this.host.createSelectionManager()` — if present, do NOT create another one.
   - Look for `selectionId` properties on data point interfaces — if present, reuse them (do NOT create a new interface).
   - Look for existing `registerOnSelectCallback` — if present, bookmark support for selections is already implemented. Do nothing.
   - Look for existing `updateSelectionOpacity()` or similar visual feedback methods — call these from the bookmark callback.

2. **Check for the ISelectionId import:**
   - The add-selections skill uses `import ISelectionId = powerbi.visuals.ISelectionId` — this is the standard import.
   - `registerOnSelectCallback` callback parameter is typed as `powerbi.extensibility.ISelectionId[]` in some API versions.
   - These are the **same interface** at runtime but TypeScript may report a type conflict.
   - **Fix:** Always import `ISelectionId` from `powerbi.visuals` and cast the callback parameter (see Step 1 below).

**Decision logic:**
- If `selectionManager` exists AND `selectionId` is on data points AND there's NO `registerOnSelectCallback` → **Only add the callback registration (Step 1).** This is the most common case.
- If `selectionManager` exists AND `registerOnSelectCallback` is already registered → **Bookmark support is already implemented. Do nothing.**
- If no selection manager exists at all → **The visual needs selection support first. Apply the add-selections skill before this one.**
- For filter-based visuals (slicers) → **Use the filter-based implementation (see below).**

---

## Implementation for Selection-Based Visuals

### Step 1: Register a Bookmark Callback

In your constructor, **after** creating the selection manager, register the `registerOnSelectCallback`. This callback is called by Power BI when a bookmark is applied, passing the saved selection IDs.

> **CRITICAL — Type compatibility:** The callback parameter `ids` may be typed as `powerbi.extensibility.ISelectionId[]` by the API, but your data points likely use `powerbi.visuals.ISelectionId` (the standard import from the add-selections skill). These are the same interface at runtime. Cast with `as powerbi.visuals.ISelectionId[]` to avoid TypeScript compilation errors.

```typescript
import powerbi from "powerbi-visuals-api";
import ISelectionId = powerbi.visuals.ISelectionId;
import ISelectionManager = powerbi.extensibility.ISelectionManager;

export class Visual implements powerbi.extensibility.visual.IVisual {
    private host: powerbi.extensibility.visual.IVisualHost;
    private selectionManager: ISelectionManager;
    private dataPoints: DataPoint[];  // Use your existing data point interface

    constructor(options: powerbi.extensibility.visual.VisualConstructorOptions) {
        this.host = options.host;
        this.selectionManager = this.host.createSelectionManager();
        this.dataPoints = [];

        // Register callback for bookmark selection restore
        // Cast 'ids' to powerbi.visuals.ISelectionId[] to match the data point selectionId type
        this.selectionManager.registerOnSelectCallback(
            (ids: ISelectionId[]) => {
                // Update visual to reflect the bookmark's saved selection state
                this.syncSelectionState(ids);
            }
        );
    }
}
```

> **IMPORTANT — Merging with existing code:** If the constructor already has `this.selectionManager = this.host.createSelectionManager()` and a clear-selection handler (from the add-selections skill), only add the `registerOnSelectCallback` block — do NOT duplicate the selection manager creation or the clear handler.

### Step 2: Implement the Selection Sync Method

Add a method that updates the visual to reflect the bookmark's selection state. This method should use the **existing** `updateSelectionOpacity()` (or equivalent) from the add-selections skill if it's already present.

```typescript
private syncSelectionState(bookmarkIds: ISelectionId[]): void {
    // If update visual feedback method exists (from add-selections skill), call it
    // The selectionManager's internal state is already updated by Power BI
    this.updateSelectionOpacity();
}
```

> **WHY this is simple:** When Power BI calls the `registerOnSelectCallback`, it has already updated the `selectionManager`'s internal state with the bookmarked selections. If you already have `updateSelectionOpacity()` from the add-selections skill that reads `selectionManager.hasSelection()` and `selectionManager.getSelectionIds()`, you just need to call it. No manual data point state management is needed.

**If the visual does NOT have `updateSelectionOpacity()` (manual data point state):**

```typescript
private syncSelectionState(bookmarkIds: ISelectionId[]): void {
    // Mark data points as selected/unselected based on bookmark state
    const hasSelection = bookmarkIds.length > 0;

    this.dataPoints.forEach(dp => {
        if (!hasSelection) {
            dp.selected = false;
        } else {
            dp.selected = bookmarkIds.some(
                bookmarkId => bookmarkId.equals(dp.selectionId)
            );
        }
    });

    // Re-render to reflect the restored selection state
    this.renderVisual();
}
```

> **NOTE:** Use `.equals()` for `ISelectionId` comparison — do NOT use `===`.

### Complete Example — Adding Bookmarks to a Visual That Already Has Selections

If Copilot previously applied the add-selections skill and the visual already has `selectionManager`, `selectionId` on data points, `updateSelectionOpacity()`, and click handlers, you only need to add **one block** in the constructor:

```typescript
constructor(options: VisualConstructorOptions) {
    this.host = options.host;
    this.target = options.element;
    this.selectionManager = this.host.createSelectionManager();
    this.dataPoints = [];

    // === EXISTING CODE from add-selections skill ===
    // Clear selection when clicking on empty space
    this.target.addEventListener("click", (event) => {
        if (event.target === this.target) {
            this.selectionManager.clear();
            this.updateSelectionOpacity();
        }
    });

    // === NEW: Register bookmark callback ===
    this.selectionManager.registerOnSelectCallback(
        (ids: ISelectionId[]) => {
            this.updateSelectionOpacity();
        }
    );
}
```

That's it — one callback registration that calls the existing opacity update method. No other changes needed.

---

## Implementation for Filter-Based Visuals (Slicers)

### Step 1: Apply Filters Using applyJsonFilter

When the user makes a selection in your slicer, apply the filter to the Power BI host. This filter state is automatically saved when a bookmark is created.

```typescript
import { AdvancedFilter } from "powerbi-models";

private applyFilter(startDate: Date, endDate: Date): void {
    const target = {
        table: "YourTable",
        column: "YourColumn"
    };

    const filter = new AdvancedFilter(
        target,
        "And",
        { operator: "GreaterThanOrEqual", value: startDate.toJSON() },
        { operator: "LessThanOrEqual", value: endDate.toJSON() }
    );

    this.host.applyJsonFilter(
        filter,
        "general",
        "filter",
        (startDate && endDate)
            ? powerbi.FilterAction.merge
            : powerbi.FilterAction.remove
    );
}
```

### Step 2: Restore Filter State from Bookmarks

When a bookmark is applied, Power BI calls `update()` with the saved filter in `options.jsonFilters`. Restore the filter conditions and update the visual's internal state:

```typescript
public update(options: powerbi.extensibility.visual.VisualUpdateOptions): void {
    // Restore filter from bookmark
    const jsonFilters = options.jsonFilters as any[];
    if (jsonFilters?.[0]?.conditions?.[0] && jsonFilters[0].conditions[1]) {
        const startDate: Date = new Date(jsonFilters[0].conditions[0].value);
        const endDate: Date = new Date(jsonFilters[0].conditions[1].value);
        // Apply restored filter conditions to visual state
        // (e.g., update the slicer's selected range)
    } else {
        // No filter — apply default settings
    }

    // Continue with normal rendering...
}
```

### Step 3: Save Additional Filter State in Bookmarks (Optional)

To persist extra state (like granularity, view mode, etc.), set `"filterState": true` on the property in `capabilities.json`:

```json
{
    "objects": {
        "general": {
            "properties": {
                "granularity": {
                    "type": { "enumeration": [] },
                    "filterState": true
                }
            }
        }
    }
}
```

---

## Common Mistakes

| Mistake | Fix |
|---|---|
| Type conflict: `registerOnSelectCallback` expects `powerbi.extensibility.ISelectionId[]` but data points use `powerbi.visuals.ISelectionId` | Cast the callback parameter: `(ids: ISelectionId[])` using the `powerbi.visuals.ISelectionId` import. These are the same interface at runtime |
| Duplicating `selectionManager` creation when selections already exist | Check if `this.selectionManager` is already created (from add-selections). Only add the `registerOnSelectCallback` block |
| Complex callback logic when `updateSelectionOpacity()` already exists | If the add-selections skill's `updateSelectionOpacity()` is present, just call it — the selectionManager's state is already updated by Power BI |
| Using `===` to compare `ISelectionId` objects | Always use `id.equals(otherSelectionId)` |
| Not re-rendering after bookmark restore | The callback must trigger a visual update (either `updateSelectionOpacity()` or full re-render) |

## Files That May Need Changes

| File | What to Change |
|---|---|
| `src/visual.ts` | Add `registerOnSelectCallback` in the constructor (selection-based) or restore filter in `update()` (filter-based) |
| `capabilities.json` | Add `filterState: true` for filter-based bookmarks (optional, only for slicers) |

## Validation Checklist

- [ ] **Pre-check:** Verified what selection/filter infrastructure already exists before making changes
- [ ] Selection-based: `registerOnSelectCallback` is registered in the constructor, **after** `createSelectionManager()`
- [ ] Selection-based: The callback uses the same `ISelectionId` import as the rest of the visual (`powerbi.visuals.ISelectionId`)
- [ ] Selection-based: The callback triggers a visual update (calls `updateSelectionOpacity()` or re-renders)
- [ ] Selection-based: No duplicate `selectionManager` creation
- [ ] Filter-based: `applyJsonFilter` is used to set filters
- [ ] Filter-based: `options.jsonFilters` is restored in the `update()` method
- [ ] (Optional) `filterState: true` is set in capabilities for additional filter state persistence
- [ ] The code contains `registerOnSelectCallback` or `applySelectionFromFilter` (detected by the tool's linting feature)
- [ ] No unrelated files were changed

## Reference

Official Microsoft documentation: https://learn.microsoft.com/en-us/power-bi/developer/visuals/bookmarks-support
