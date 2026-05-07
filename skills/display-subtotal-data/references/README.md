# Power BI Visual — Display Subtotal Data

## Overview

The Total/Subtotal API enables Power BI matrix visuals to display row and column totals and subtotals. This feature is only applicable to matrix-type visuals and is configured through the `subtotals` property in `capabilities.json`.

**Official documentation:** https://learn.microsoft.com/en-us/power-bi/developer/visuals/total-subtotal-api

## Requirements

- **powerbi-visuals-api** package must be installed
- The visual must use a **matrix** data view mapping
- `subtotals` must be configured in `capabilities.json`

## Step-by-Step Implementation

### Step 1: Configure Subtotals in capabilities.json

Add the `subtotals` property to enable total/subtotal support:

```json
{
    "subtotals": {
        "matrix": {
            "rowSubtotalsPerLevel": true,
            "rowSubtotals": true,
            "columnSubtotals": true,
            "columnSubtotalsPerLevel": true,
            "levelSubtotalEnabled": true
        }
    }
}
```

### Step 2: Configure Matrix Data View Mapping

Ensure your `dataViewMappings` uses matrix format:

```json
{
    "dataViewMappings": [
        {
            "matrix": {
                "rows": {
                    "for": { "in": "rows" }
                },
                "columns": {
                    "for": { "in": "columns" }
                },
                "values": {
                    "for": { "in": "values" }
                }
            }
        }
    ]
}
```

### Step 3: Read Subtotal Data in the Visual

In `src/visual.ts`, traverse the matrix data view hierarchy and check for subtotal nodes:

```typescript
import powerbi from "powerbi-visuals-api";
import DataViewMatrix = powerbi.DataViewMatrix;
import DataViewMatrixNode = powerbi.DataViewMatrixNode;

export class Visual implements powerbi.extensibility.visual.IVisual {
    public update(options: powerbi.extensibility.visual.VisualUpdateOptions): void {
        const dataView = options.dataViews?.[0];
        if (!dataView?.matrix) return;

        const matrix: DataViewMatrix = dataView.matrix;

        // Traverse row hierarchy
        this.traverseNodes(matrix.rows.root, 0);
    }

    private traverseNodes(node: DataViewMatrixNode, level: number): void {
        if (node.children) {
            for (const child of node.children) {
                if (child.isSubtotal) {
                    // This is a subtotal row — render it with subtotal styling
                    this.renderSubtotalRow(child, level);
                } else {
                    // Regular data row
                    this.renderDataRow(child, level);
                }

                // Recurse into children
                this.traverseNodes(child, level + 1);
            }
        }
    }

    private renderSubtotalRow(node: DataViewMatrixNode, level: number): void {
        // Render with bold/distinct styling to indicate a subtotal
    }

    private renderDataRow(node: DataViewMatrixNode, level: number): void {
        // Render normal data row
    }
}
```

## Subtotals Configuration Options

| Property | Description |
|---|---|
| `rowSubtotals` | Enable row totals (grand total) |
| `rowSubtotalsPerLevel` | Enable subtotals at each row hierarchy level |
| `columnSubtotals` | Enable column totals (grand total) |
| `columnSubtotalsPerLevel` | Enable subtotals at each column hierarchy level |
| `levelSubtotalEnabled` | Allow per-level subtotal toggling |

## Files That May Need Changes

- `capabilities.json` — Add `subtotals` configuration
- `src/visual.ts` — Handle `isSubtotal` nodes in matrix data traversal

## Validation Checklist

- [ ] `subtotals` is configured in `capabilities.json`
- [ ] Matrix data view mapping is properly set up
- [ ] The visual checks `node.isSubtotal` when traversing matrix data
- [ ] Subtotal rows are visually distinct from regular data rows
- [ ] Both row and column subtotals/totals are rendered correctly
- [ ] No unrelated files were changed

## Reference

Official Microsoft documentation: https://learn.microsoft.com/en-us/power-bi/developer/visuals/total-subtotal-api
