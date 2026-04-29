# Power BI Visual — Add Context Menu Support

## Overview

Every Power BI visual can display a right-click context menu that enables operations like analyze, summarize, copy, drill-through, and more. There are two modes: clicking on empty space shows a basic context menu, while clicking on a data point shows additional options (Show data as table, Include, Exclude filters).

**Official documentation:** https://learn.microsoft.com/en-us/power-bi/developer/visuals/context-menu

## Requirements

- **API version:** 2.2.0 or higher
- **powerbi-visuals-api** package must be installed
- The visual must use `selectionManager.showContextMenu()`

## Step-by-Step Implementation

### Step 1: Set Up the Selection Manager

```typescript
import powerbi from "powerbi-visuals-api";
import ISelectionManager = powerbi.extensibility.ISelectionManager;

export class Visual implements powerbi.extensibility.visual.IVisual {
    private host: powerbi.extensibility.visual.IVisualHost;
    private selectionManager: ISelectionManager;
    private target: HTMLElement;

    constructor(options: powerbi.extensibility.visual.VisualConstructorOptions) {
        this.host = options.host;
        this.target = options.element;
        this.selectionManager = this.host.createSelectionManager();

        this.handleContextMenu();
    }
}
```

### Step 2: Handle the Context Menu Event

Attach a `contextmenu` event listener to your root element:

```typescript
private handleContextMenu(): void {
    this.target.addEventListener("contextmenu", (event: MouseEvent) => {
        // Find the data point under the cursor (if any)
        const dataPoint = this.getDataPointFromEvent(event);

        this.selectionManager.showContextMenu(
            dataPoint ? dataPoint.selectionId : {},
            {
                x: event.clientX,
                y: event.clientY
            }
        );

        event.preventDefault();
    });
}
```

### Step 3: Support Both Empty Space and Data Point Context Menus

The key distinction is what you pass as the first argument to `showContextMenu`:

- **Empty space**: Pass an empty object `{}` — shows basic context menu
- **Data point**: Pass the data point's `selectionId` — shows extended context menu with data filters

```typescript
private handleContextMenu(): void {
    this.target.addEventListener("contextmenu", (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const dataPoint = this.findDataPoint(target);

        this.selectionManager.showContextMenu(
            dataPoint ? dataPoint.selectionId : {},
            {
                x: event.clientX,
                y: event.clientY
            }
        );

        event.preventDefault();
    });
}

private findDataPoint(element: HTMLElement): any | null {
    // Look up the data point associated with the clicked element
    // Implementation depends on how your visual renders data points
    return null;
}
```

### Using D3.js (Alternative)

If your visual uses D3:

```typescript
private handleContextMenu(): void {
    d3.select(this.target).on("contextmenu", (event: PointerEvent, dataPoint: any) => {
        this.selectionManager.showContextMenu(
            dataPoint ? dataPoint.selectionId : {},
            {
                x: event.clientX,
                y: event.clientY
            }
        );
        event.preventDefault();
    });
}
```

## showContextMenu Parameters

| Parameter | Type | Description |
|---|---|---|
| `selectionId` | `ISelectionId \| {}` | The data point's selection ID, or empty object for empty space |
| `position` | `{ x: number, y: number }` | Screen coordinates where the menu should appear |

## Files That May Need Changes

- `src/visual.ts` — Add `contextmenu` event handler calling `showContextMenu()`

## Validation Checklist

- [ ] `ISelectionManager` is created via `host.createSelectionManager()`
- [ ] `contextmenu` event listener is attached to the visual's root element
- [ ] `showContextMenu()` is called with the correct `selectionId` (or `{}` for empty space)
- [ ] `event.preventDefault()` is called to suppress the browser's default context menu
- [ ] Both empty space and data point context menus are supported
- [ ] The code contains `.showContextMenu` (detected by the tool's linting feature)
- [ ] No unrelated files were changed

## Important Notes

- All visuals published to AppSource **must** support both context menu modes (empty space and data point).
- The context menu is displayed by Power BI — you don't need to build the menu UI yourself.
- Touch devices use long-press instead of right-click.

## Reference

Official Microsoft documentation: https://learn.microsoft.com/en-us/power-bi/developer/visuals/context-menu
