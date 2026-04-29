# Power BI Visual — Visuals Tooltips

## Overview

Tooltips provide contextual information when users hover over data points in a Power BI visual. The Power BI tooltips API handles showing, hiding, and moving tooltips. Tooltips display a textual element with a title, value, color, and opacity at specified coordinates.

**Official documentation:** https://learn.microsoft.com/en-us/power-bi/developer/visuals/add-tooltips

## Requirements

- **API version:** 2.2.0 or higher (modern tooltips require 3.8.3+)
- **powerbi-visuals-api** package must be installed
- The visual must use `ITooltipService` from `IVisualHost`
- The `tooltips` object must be declared in `capabilities.json`

## Architecture

Tooltip support requires:

1. **capabilities.json** — Declare `tooltips` support with `supportedTypes` and optional `roles`.
2. **visual.ts** — Use `host.tooltipService` to show/hide/move tooltips on mouse events.

---

## Step-by-Step Implementation

### Step 1: Update capabilities.json

Add the `tooltips` object to your `capabilities.json`:

```json
{
    "tooltips": {
        "supportedTypes": {
            "default": true,
            "canvas": true
        },
        "roles": [
            "tooltips"
        ]
    }
}
```

- `default`: Enables automatic tooltip binding via data fields.
- `canvas`: Enables report page tooltips.
- `roles`: (Optional) Specifies which data roles are bound to tooltips.

### Step 2: Use the Tooltip Service in Your Visual

In `src/visual.ts`:

```typescript
import powerbi from "powerbi-visuals-api";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ITooltipService = powerbi.extensibility.ITooltipService;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import ISelectionId = powerbi.visuals.ISelectionId;

export class Visual implements IVisual {
    private host: IVisualHost;
    private tooltipService: ITooltipService;
    private target: HTMLElement;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.tooltipService = this.host.tooltipService;
        this.target = options.element;
    }
}
```

### Step 3: Show Tooltips on Hover

Attach mouse event handlers to data point elements:

```typescript
private attachTooltipEvents(element: HTMLElement, dataPoint: any): void {
    element.addEventListener("mouseover", (event: MouseEvent) => {
        const tooltipData: VisualTooltipDataItem[] = [
            {
                displayName: dataPoint.category,
                value: dataPoint.value.toString(),
                color: dataPoint.color,
                header: "Data Point"
            }
        ];

        this.tooltipService.show({
            coordinates: [event.clientX, event.clientY],
            isTouchEvent: false,
            dataItems: tooltipData,
            identities: dataPoint.selectionId ? [dataPoint.selectionId] : []
        });
    });

    element.addEventListener("mousemove", (event: MouseEvent) => {
        this.tooltipService.move({
            coordinates: [event.clientX, event.clientY],
            isTouchEvent: false,
            dataItems: []
        });
    });

    element.addEventListener("mouseout", () => {
        this.tooltipService.hide({
            immediately: true,
            isTouchEvent: false
        });
    });
}
```

### Step 4: Enable Modern Tooltips (Optional, API 3.8.3+)

Add `supportEnhancedTooltips` to `capabilities.json` for modern tooltip styling and drill actions:

```json
{
    "tooltips": {
        "supportedTypes": {
            "default": true,
            "canvas": true
        },
        "roles": ["tooltips"],
        "supportEnhancedTooltips": true
    }
}
```

## ITooltipService Interface

```typescript
interface ITooltipService {
    enabled(): boolean;
    show(options: TooltipShowOptions): void;
    move(options: TooltipMoveOptions): void;
    hide(options: TooltipHideOptions): void;
}
```

## Common Tooltip Patterns

| Scenario | Implementation |
|---|---|
| Static tooltip | Return fixed `VisualTooltipDataItem[]` |
| Dynamic tooltip | Build items from the hovered data point |
| Multi-line tooltip | Return multiple items in the array |
| Report page tooltip | Enable `canvas: true` in capabilities |
| Modern tooltip | Add `supportEnhancedTooltips: true` |

## Files That May Need Changes

- `capabilities.json` — Add `tooltips` object with `supportedTypes` and `roles`
- `src/visual.ts` — Add tooltip service usage with mouse event handlers

## Validation Checklist

- [ ] `tooltips` object is declared in `capabilities.json`
- [ ] `supportedTypes.default` is set to `true`
- [ ] `host.tooltipService` is stored from constructor options
- [ ] `tooltipService.show()` is called on mouseover with proper `VisualTooltipDataItem[]`
- [ ] `tooltipService.move()` is called on mousemove
- [ ] `tooltipService.hide()` is called on mouseout
- [ ] `tooltipService.enabled()` is checked before showing tooltips
- [ ] No unrelated files were changed
- [ ] The code contains `tooltipService` (detected by the tool's linting feature)

## Reference

Official Microsoft documentation: https://learn.microsoft.com/en-us/power-bi/developer/visuals/add-tooltips
