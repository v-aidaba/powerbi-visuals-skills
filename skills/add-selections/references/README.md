# Power BI Visual — Add Selections (Visual Interactions)

## Overview

The Selection API allows a Power BI custom visual to respond to user clicks on data points and notify the Power BI host about the current selection state. This enables cross-filtering and cross-highlighting between visuals on the same report page. The `allowInteractions` flag controls whether the visual should respond to user interactions (e.g., visuals on dashboards are non-interactive).

**Official documentation:**
- https://learn.microsoft.com/en-us/power-bi/developer/visuals/selection-api
- https://learn.microsoft.com/en-us/power-bi/developer/visuals/visuals-interactions

## Requirements

- **API version:** 1.11.0 or higher
- **powerbi-visuals-api** package must be installed
- The visual must use `ISelectionManager` from `IVisualHost`

## Pre-Implementation Check (REQUIRED)

**Before adding anything, inspect the existing code to avoid duplicating selection support that is already present.**

1. **Check `src/visual.ts`:**
   - Look for `this.selectionManager = this.host.createSelectionManager()`. If already present, do NOT create another SelectionManager.
   - Look for existing `ISelectionId` properties in data point interfaces. If a `selectionId` field already exists, do NOT add a duplicate — wire into the existing structure.
   - Look for existing click handlers calling `selectionManager.select()`. If found, do NOT add duplicate handlers.
   - Look for an existing `updateSelectionOpacity()` or similar visual feedback method. If found, extend rather than replace.

2. **Check for existing data point interfaces:**
   - If the visual already has a data point interface (e.g., `ColorDataPoint`, `DataPoint`), add `selectionId: ISelectionId` to it rather than creating a new interface.

**Decision logic:**
- If `selectionManager` is created AND `selectionId` is built per data point AND click handlers exist → **selection support is already fully implemented. Do nothing.**
- If `selectionId` exists in data points but no click handlers → **only add click handlers and visual feedback.**
- If no selection code exists at all → **proceed with full implementation (all steps below).**
- For any partially implemented state → **only add the missing pieces, merging into existing code.**

## Architecture

Selection support consists of three parts:

1. **SelectionId** — A unique identifier for each data point, built with `ISelectionIdBuilder`.
2. **SelectionManager** — Manages the selection state and communicates with the Power BI host.
3. **Visual Feedback** — Dimming unselected data points so the user can see what is selected.

---

## Step-by-Step Implementation

### Step 1: Add Imports and Store the Selection Manager

Add `ISelectionManager` and `ISelectionId` imports alongside existing imports. Create the selection manager in the constructor. Also add a `selectionId` property to your existing data point interface.

In your `src/visual.ts`:

```typescript
import powerbi from "powerbi-visuals-api";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.visuals.ISelectionId;

// Add selectionId to your existing data point interface
interface DataPoint {
    // ...existing properties...
    selectionId: ISelectionId;
}

export class Visual implements IVisual {
    private host: IVisualHost;
    private selectionManager: ISelectionManager;
    private target: HTMLElement;
    private dataPoints: DataPoint[];

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.target = options.element;
        this.selectionManager = this.host.createSelectionManager();
        this.dataPoints = [];

        // Clear selection when clicking on empty space
        this.target.addEventListener("click", (event) => {
            if (event.target === this.target) {
                this.selectionManager.clear();
                this.updateSelectionOpacity();
            }
        });
    }
}
```

**Important:** The clear-selection listener must be in the constructor (runs once), not in `update()` (runs repeatedly), to avoid attaching duplicate listeners.

### Step 2: Build SelectionIds for Data Points

In your `update()` method, create a SelectionId for each data point. Integrate into your existing data point building logic rather than creating a separate loop.

```typescript
public update(options: VisualUpdateOptions): void {
    const dataView = options.dataViews?.[0];
    if (!dataView) return;

    const categorical = dataView.categorical;
    const categories = categorical?.categories?.[0];

    // Build data points — add selectionId alongside existing properties
    this.dataPoints = categories?.values.map((value, index) => {
        const selectionId: ISelectionId = this.host
            .createSelectionIdBuilder()
            .withCategory(categories, index)
            .createSelectionId();

        return {
            value: value,
            selectionId: selectionId
            // ...other existing properties...
        };
    }) ?? [];

    this.renderDataPoints(this.dataPoints);
}
```

### Step 3: Handle Click Events with Visual Feedback

Attach click handlers to your rendered elements. **Critical details:**

- Use `event.stopPropagation()` to prevent the click from bubbling to the parent's clear-selection handler.
- Check `allowInteractions` to disable clicks in non-interactive contexts (dashboard tiles).
- Set `cursor: pointer` on interactive elements for UX clarity.
- Call `updateSelectionOpacity()` after selection changes to provide visual feedback.

```typescript
private renderDataPoints(dataPoints: DataPoint[]): void {
    const allowInteractions = this.host.hostCapabilities.allowInteractions;

    dataPoints.forEach((dp) => {
        const element = document.createElement("div");
        element.textContent = String(dp.value);
        element.style.cursor = allowInteractions ? "pointer" : "default";

        if (allowInteractions) {
            element.addEventListener("click", (event) => {
                // IMPORTANT: stop propagation so the parent clear-handler doesn't fire
                event.stopPropagation();
                // Ctrl+Click for multi-select
                const isMultiSelect = (event as MouseEvent).ctrlKey;
                this.selectionManager
                    .select(dp.selectionId, isMultiSelect)
                    .then(() => {
                        this.updateSelectionOpacity();
                    });
            });
        }

        this.target.appendChild(element);
    });

    // Apply opacity on initial render (preserves state across update cycles)
    this.updateSelectionOpacity();
}
```

### Step 4: Add Visual Feedback for Selection State

Add an `updateSelectionOpacity()` method that dims unselected data points. This gives the user clear visual feedback about which data points are selected.

```typescript
private updateSelectionOpacity(): void {
    const hasSelection = this.selectionManager.hasSelection();
    const selectedIds = this.selectionManager.getSelectionIds() as ISelectionId[];

    // Query all rendered data point elements
    const rows = this.target.querySelectorAll(".data-point-class");
    rows.forEach((row, index) => {
        const el = row as HTMLElement;
        if (!hasSelection) {
            el.style.opacity = "1";
        } else {
            const dp = this.dataPoints[index];
            const isSelected = selectedIds.some(id => id.equals(dp.selectionId));
            el.style.opacity = isSelected ? "1" : "0.3";
        }
    });
}
```

**Key points:**
- When nothing is selected (`!hasSelection`), all items show at full opacity.
- When a selection exists, selected items stay at `1` and unselected items dim to `0.3`.
- Use `id.equals(dp.selectionId)` for comparison — do NOT use `===` on SelectionId objects.
- Replace `".data-point-class"` with the actual CSS class used on your rendered elements.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---|---|---|
| Missing `event.stopPropagation()` | Clicking a data point also triggers the parent clear-selection handler, immediately clearing the selection | Add `event.stopPropagation()` in the data point click handler |
| Clear-handler in `update()` | Each update cycle adds another listener, causing multiple clear calls | Put the clear-selection listener in the `constructor()` only |
| No visual feedback | User clicks a data point but can't see what's selected | Add `updateSelectionOpacity()` and call it after every `select()` and `clear()` |
| Using `===` on SelectionIds | Object identity comparison always fails | Use `id.equals(otherSelectionId)` |
| Not calling `updateSelectionOpacity()` on render | Selection state resets visually after data refresh | Call `updateSelectionOpacity()` at the end of `renderDataPoints()` |

## Selection Builder Methods

| Method | Description |
|---|---|
| `withCategory(category, index)` | Select by categorical data point |
| `withMeasure(measureId)` | Select by measure |
| `withSeries(values, seriesGroup)` | Select by series |
| `withMatrixNode(node, levels)` | Select by matrix node |
| `createSelectionId()` | Build the final SelectionId |

## SelectionManager Methods

| Method | Description |
|---|---|
| `select(selectionId, multiSelect?)` | Select a data point |
| `clear()` | Clear all selections |
| `hasSelection()` | Check if any data point is selected |
| `getSelectionIds()` | Get currently selected IDs |
| `registerOnSelectCallback(callback)` | Register bookmark restore callback |

## Files That May Need Changes

- `src/visual.ts` — Add SelectionManager creation, SelectionId building, click handlers, visual feedback, and allowInteractions check

## Validation Checklist

- [ ] `ISelectionManager` is created via `this.host.createSelectionManager()` in the constructor
- [ ] `ISelectionId` is added to the existing data point interface
- [ ] `SelectionId` is built for each data point using `createSelectionIdBuilder()`
- [ ] Click handlers call `selectionManager.select()` with `event.stopPropagation()`
- [ ] Multi-select is supported via Ctrl+Click (`event.ctrlKey`)
- [ ] Empty space click clears selection via `selectionManager.clear()` (in constructor, not update)
- [ ] The `.allowInteractions` flag is checked before enabling interactions
- [ ] Visual feedback (`updateSelectionOpacity`) dims unselected items and is called after select, clear, and render
- [ ] `SelectionId` comparison uses `.equals()`, not `===`
- [ ] `cursor: pointer` is set on interactive data point elements
- [ ] No unrelated files were modified
- [ ] The code contains `.allowInteractions` (detected by the tool's linting feature)

## Reference

- Selection API: https://learn.microsoft.com/en-us/power-bi/developer/visuals/selection-api
- Visual Interactions: https://learn.microsoft.com/en-us/power-bi/developer/visuals/visuals-interactions
