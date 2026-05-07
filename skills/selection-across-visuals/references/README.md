# Power BI Visual — Enable Selection Across Multiple Visuals

## Overview

The multi-visual selection feature allows users to select data points across multiple visuals on the same report page while holding the Ctrl key. This enables cross-filtering scenarios where selections in one visual affect other visuals simultaneously.

**Official documentation:** https://learn.microsoft.com/en-us/power-bi/developer/visuals/supportsmultivisualselection-feature

## Requirements

- **powerbi-visuals-api** package must be installed
- `supportsMultiVisualSelection: true` must be set in `capabilities.json`
- The visual must already implement the Selection API (`ISelectionManager`)

## Step-by-Step Implementation

### Step 1: Enable Multi-Visual Selection in capabilities.json

Add the `supportsMultiVisualSelection` property:

```json
{
    "supportsMultiVisualSelection": true
}
```

### Step 2: Ensure Selection Manager Uses Multi-Select

Your visual must already use `ISelectionManager` with Ctrl+Click multi-select support:

```typescript
import powerbi from "powerbi-visuals-api";
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.visuals.ISelectionId;

export class Visual implements powerbi.extensibility.visual.IVisual {
    private selectionManager: ISelectionManager;

    constructor(options: powerbi.extensibility.visual.VisualConstructorOptions) {
        this.selectionManager = options.host.createSelectionManager();
    }

    private onDataPointClick(selectionId: ISelectionId, event: MouseEvent): void {
        // The second parameter enables multi-select (Ctrl+Click)
        // With supportsMultiVisualSelection, this works across visuals
        this.selectionManager.select(selectionId, event.ctrlKey || event.metaKey);
    }
}
```

## How It Works

- Without `supportsMultiVisualSelection`: Selecting in one visual clears selection in all other visuals.
- With `supportsMultiVisualSelection`: Users can hold Ctrl and click data points across different visuals, maintaining selections in all of them. Power BI cross-filters based on the combined selection.

## Files That May Need Changes

- `capabilities.json` — Add `"supportsMultiVisualSelection": true`

## Validation Checklist

- [ ] `"supportsMultiVisualSelection": true` is set in `capabilities.json`
- [ ] The visual implements the Selection API (`ISelectionManager`)
- [ ] Multi-select (`event.ctrlKey`) is passed to `selectionManager.select()`
- [ ] No unrelated files were changed

## Reference

Official Microsoft documentation: https://learn.microsoft.com/en-us/power-bi/developer/visuals/supportsmultivisualselection-feature
