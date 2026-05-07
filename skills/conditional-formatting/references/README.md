# Power BI Visual — Add Conditional Formatting

## Overview

Conditional formatting lets report creators dynamically change colors based on numerical values, rules, or gradients. When enabled, an **fx button** appears next to color properties in the Format pane. Clicking the fx button opens a dialog where users can define rules (e.g., "if value > 100, color = red") or bind colors to a data field gradient.

The fx button will **only appear** when three things are configured correctly on the `ColorPicker`:
1. `instanceKind` is set to `VisualEnumerationInstanceKinds.ConstantOrRule`
2. `selector` uses `dataViewWildcard.createDataViewWildcardSelector()`
3. `altConstantSelector` is set to the data point's or series' selection ID selector

If any of these are missing, the fx button will not show and the conditional formatting dialog will not open.

**Official documentation:** https://learn.microsoft.com/en-us/power-bi/developer/visuals/conditional-format

## Requirements

- **powerbi-visuals-api** package must be installed
- **powerbi-visuals-utils-formattingmodel** package must be installed
- **powerbi-visuals-utils-dataviewutils** package must be installed (provides `createDataViewWildcardSelector`)

> **IMPORTANT:** If `powerbi-visuals-utils-dataviewutils` is not in `package.json`, it must be installed first:
> ```
> npm install powerbi-visuals-utils-dataviewutils --save
> ```

## Choosing the Right Pattern

Before implementing, determine whether the visual uses per-data-point or series-level colors:

| Pattern | Visual Type | Examples | `altConstantSelector` uses |
|---|---|---|---|
| **Per-data-point** | Each category has its own color | Bar chart, pie chart, donut chart | `withCategory(categories, index)` |
| **Series-level** | Each series/measure has one color, gradient applies per data point within the series | Pulse chart, line chart, area chart | `withSeries(values, group)` or `withMeasure(queryName)` |

---

## Per-Data-Point Conditional Formatting (Bar Chart, Pie Chart, etc.)

This pattern applies when each category/bar/slice has its own `ColorPicker`.

### Step 1: Add the Color Object to capabilities.json

The `colorSelector` (or equivalent) object must exist in `capabilities.json` with a `fill` property. If the visual already has this from a previous "add colors" implementation, **skip this step**.

```json
{
    "objects": {
        "colorSelector": {
            "properties": {
                "fill": {
                    "type": {
                        "fill": {
                            "solid": {
                                "color": true
                            }
                        }
                    }
                }
            }
        }
    }
}
```

> Merge into the existing `"objects"` block — do NOT create a duplicate `"objects"` key.

### Step 2: Add Imports

```typescript
import powerbi from "powerbi-visuals-api";
import ISelectionId = powerbi.visuals.ISelectionId;
import * as dataViewWildcard from "powerbi-visuals-utils-dataviewutils/lib/dataViewWildcard";
```

### Step 3: Configure ColorPicker Slices with Conditional Formatting Properties

When creating each `ColorPicker` slice for data points, add the three required properties.

**If the visual already has ColorPicker slices** (e.g., from "add colors" implementation), modify them by changing `selector` and adding `altConstantSelector` + `instanceKind`:

**Before** (basic color without conditional formatting — no fx button):
```typescript
new formattingSettings.ColorPicker({
    name: "fill",
    displayName: dp.category,
    value: { value: dp.color },
    selector: dp.selectionId.getSelector()
})
```

**After** (with conditional formatting — fx button appears):
```typescript
new formattingSettings.ColorPicker({
    name: "fill",
    displayName: dp.category,
    value: { value: dp.color },
    selector: dataViewWildcard.createDataViewWildcardSelector(
        dataViewWildcard.DataViewWildcardMatchingOption.InstancesAndTotals
    ),
    altConstantSelector: dp.selectionId.getSelector(),
    instanceKind: powerbi.VisualEnumerationInstanceKinds.ConstantOrRule
})
```

**What changed:**
| Property | Before | After |
|---|---|---|
| `selector` | `dp.selectionId.getSelector()` | `dataViewWildcard.createDataViewWildcardSelector(...)` |
| `altConstantSelector` | _(not set)_ | `dp.selectionId.getSelector()` (moved here) |
| `instanceKind` | _(not set)_ | `powerbi.VisualEnumerationInstanceKinds.ConstantOrRule` |

> **KEY INSIGHT:** The data point's original selector moves from `selector` to `altConstantSelector`. The `selector` is replaced with a wildcard selector.

### Step 4: Read Conditionally-Formatted Colors from the DataView

When the user applies conditional formatting, Power BI calculates per-data-point colors and stores them in `categories.objects[index]`. You **must** read these colors back — otherwise the static color AND gradient will both fail to take effect.

```typescript
// In update(), when building data points:
const categories = dataView.categorical.categories[0];

this.dataPoints = categories.values.map((value, index) => {
    const defaultColor = this.colorPalette.getColor(String(value)).value;

    // Read the color — this covers BOTH static overrides AND conditional formatting
    const categoryObjects = categories.objects?.[index];
    // Cast through fill structure to avoid TS2339 on DataViewPropertyValue
    const fillValue = categoryObjects
        ? categoryObjects["colorSelector"]?.fill as { solid?: { color?: string } }
        : undefined;
    const userColor: string = fillValue?.solid?.color;

    const selectionId = this.host.createSelectionIdBuilder()
        .withCategory(categories, index)
        .createSelectionId();

    return {
        category: String(value),
        value: Number(dataView.categorical.values?.[0]?.values[index]) || 0,
        color: userColor || defaultColor,
        selectionId: selectionId
    };
});
```

> **CRITICAL:** Reading from `categories.objects[index]` is what makes both the static color picker AND the gradient/rules work. If you skip this step, the fx button will appear but nothing will change visually.

---

## Series-Level Conditional Formatting (Pulse Chart, Line Chart, etc.)

This pattern applies to visuals where each series/measure has a **single fill color** in the format pane, but conditional formatting (gradient) can apply **different colors per data point** within that series.

### How Series Conditional Formatting Works

1. **Without conditional formatting (static color):** The user picks one color for the series. That color applies to the entire series line/area.
2. **With conditional formatting (gradient/rules):** Power BI calculates a color for **each data point** in the series based on the rule. Each data point can have a different color (e.g., gradient from blue to red).

The visual must handle **both** cases: read the static series color for normal rendering, AND read per-data-point colors when conditional formatting is active.

### Step 1: Add the Series Object to capabilities.json

The object name must match whatever the visual uses for series formatting (often `series`, `dataPoint`, or the visual's existing fill object). Add a `fill` property:

```json
{
    "objects": {
        "series": {
            "properties": {
                "fill": {
                    "type": {
                        "fill": {
                            "solid": {
                                "color": true
                            }
                        }
                    }
                }
            }
        }
    }
}
```

> **IMPORTANT:** Use whatever object name the visual already defines for series colors. If the visual already has a `"series"` or `"dataPoint"` object with `fill`, do NOT create a new one — add conditional formatting support to the existing object. The object name MUST match the `name` property on the formatting card class.

### Step 2: Add Imports

```typescript
import powerbi from "powerbi-visuals-api";
import ISelectionId = powerbi.visuals.ISelectionId;
import IColorPalette = powerbi.extensibility.IColorPalette;
import * as dataViewWildcard from "powerbi-visuals-utils-dataviewutils/lib/dataViewWildcard";
```

### Step 3: Build Selection IDs for Each Series

For series-level colors, the `altConstantSelector` must identify the **series**, not individual data points. Use `withSeries()` for grouped data or `withMeasure()` for single measures.

**For grouped data (multiple series):**
```typescript
const grouped = dataView.categorical.values.grouped();

grouped.forEach((group) => {
    const seriesSelectionId = this.host.createSelectionIdBuilder()
        .withSeries(dataView.categorical.values, group)
        .createSelectionId();
    // Use seriesSelectionId for the ColorPicker's altConstantSelector
});
```

**For single measure (one series):**
```typescript
const valueColumn = dataView.categorical.values[0];
const measureSelectionId = this.host.createSelectionIdBuilder()
    .withMeasure(valueColumn.source.queryName)
    .createSelectionId();
```

### Step 4: Create the ColorPicker with Conditional Formatting Support

```typescript
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;

class SeriesCardSettings extends FormattingSettingsCard {
    name: string = "series";      // Must match the object name in capabilities.json
    displayName: string = "Series";
    slices: Array<FormattingSettingsSlice> = [];
}
```

In the `update()` method, populate the card slices dynamically — one `ColorPicker` per series:

```typescript
private populateSeriesFormattingCard(): void {
    const seriesCard = this.formattingSettings.seriesCard;
    seriesCard.slices = [];

    const grouped = this.dataView.categorical.values.grouped();

    grouped.forEach((group) => {
        const seriesName = String(group.name);
        const defaultColor = this.colorPalette.getColor(seriesName).value;

        // Read the static (non-conditional) color override
        // Cast through fill structure to avoid TS2339 on DataViewPropertyValue
        const fillValue = group.objects?.series?.fill as { solid?: { color?: string } };
        const userColor: string = fillValue?.solid?.color;
        const color = userColor || defaultColor;

        const seriesSelectionId = this.host.createSelectionIdBuilder()
            .withSeries(this.dataView.categorical.values, group)
            .createSelectionId();

        seriesCard.slices.push(
            new formattingSettings.ColorPicker({
                name: "fill",
                displayName: seriesName,
                value: { value: color },
                // Wildcard selector — enables conditional formatting (fx button)
                selector: dataViewWildcard.createDataViewWildcardSelector(
                    dataViewWildcard.DataViewWildcardMatchingOption.InstancesAndTotals
                ),
                // Series selector — used for constant (non-conditional) color
                altConstantSelector: seriesSelectionId.getSelector(),
                // Show the fx button
                instanceKind: powerbi.VisualEnumerationInstanceKinds.ConstantOrRule
            })
        );
    });
}
```

### Step 5: Read Conditionally-Formatted Colors Per Data Point (CRITICAL)

This is the step that makes the **gradient and rules actually work**. When conditional formatting is active, Power BI populates per-data-point colors in the value column's `objects` array. You **must** read these colors and apply them to each data point.

```typescript
private getSeriesDataPointColors(
    dataView: powerbi.DataView,
    seriesIndex: number,
    objectName: string   // e.g., "series" — must match capabilities.json
): string[] {
    const categorical = dataView.categorical;
    const grouped = categorical.values.grouped();
    const group = grouped[seriesIndex];

    // Default color: palette -> user static override
    // Cast through fill structure to avoid TS2339 on DataViewPropertyValue
    const defaultColor = this.colorPalette.getColor(String(group.name)).value;
    const staticFill = group.objects?.[objectName]?.fill as { solid?: { color?: string } };
    const staticColor: string = staticFill?.solid?.color || defaultColor;

    // Find the value columns belonging to this series
    const seriesValues = group.values;  // DataViewValueColumn[]
    const primaryColumn = seriesValues[0]; // The first measure in the series

    const colors: string[] = [];
    for (let i = 0; i < primaryColumn.values.length; i++) {
        // Check for per-data-point conditional color
        const pointObjects = primaryColumn.objects?.[i];
        // Cast through fill structure to avoid TS2339 on DataViewPropertyValue
        const fillValue = pointObjects
            ? pointObjects[objectName]?.fill as { solid?: { color?: string } }
            : undefined;
        const conditionalColor: string = fillValue?.solid?.color;

        // Per-data-point conditional color > static series color > palette default
        colors.push(conditionalColor || staticColor);
    }
    return colors;
}
```

**How to use the per-data-point colors in rendering:**

```typescript
// In update():
const grouped = dataView.categorical.values.grouped();
grouped.forEach((group, seriesIndex) => {
    const colors = this.getSeriesDataPointColors(dataView, seriesIndex, "series");

    // 'colors' is an array with one color per data point in this series.
    // - Without conditional formatting: all entries are the same (static series color)
    // - With gradient: each entry is a different color from the gradient
    // - With rules: each entry is colored by the matching rule

    // Example: for a line/pulse chart, color each segment differently
    colors.forEach((color, dataIndex) => {
        // Apply 'color' when rendering data point at 'dataIndex'
    });
});
```

> **CRITICAL:** If you skip reading `primaryColumn.objects[i]`, the visual will ignore conditional formatting entirely. The fx button will appear, the user can set up a gradient, but nothing will change visually.

### Step 6: For Single-Measure Visuals (No Grouping)

If the visual has only one series (e.g., a single-line pulse chart without grouping), adapt the reading logic:

```typescript
// Single measure — no grouped() needed
const valueColumn = dataView.categorical.values[0];
const objectName = "series"; // Must match capabilities.json

const defaultColor = this.colorPalette.getColor(valueColumn.source.displayName).value;

// Static color override (user picked a color, no conditional formatting)
// Cast through fill structure to avoid TS2339 on DataViewPropertyValue
const staticFill = valueColumn.source.objects?.[objectName]?.fill as { solid?: { color?: string } };
const staticColor: string = staticFill?.solid?.color || defaultColor;

// Build per-data-point colors
const colors: string[] = [];
for (let i = 0; i < valueColumn.values.length; i++) {
    // Cast through fill structure to avoid TS2339 on DataViewPropertyValue
    const fillValue = valueColumn.objects?.[i]
        ? valueColumn.objects[i][objectName]?.fill as { solid?: { color?: string } }
        : undefined;
    const conditionalColor: string = fillValue?.solid?.color;
    colors.push(conditionalColor || staticColor);
}

// 'colors' array: one color per data point
// Apply during rendering
```

For the `ColorPicker`:
```typescript
const measureSelectionId = this.host.createSelectionIdBuilder()
    .withMeasure(valueColumn.source.queryName)
    .createSelectionId();

seriesCard.slices.push(
    new formattingSettings.ColorPicker({
        name: "fill",
        displayName: valueColumn.source.displayName,
        value: { value: staticColor },
        selector: dataViewWildcard.createDataViewWildcardSelector(
            dataViewWildcard.DataViewWildcardMatchingOption.InstancesAndTotals
        ),
        altConstantSelector: measureSelectionId.getSelector(),
        instanceKind: powerbi.VisualEnumerationInstanceKinds.ConstantOrRule
    })
);
```

---

## Instance Kind Options

| Kind | Behavior | fx Button |
|---|---|---|
| `VisualEnumerationInstanceKinds.Constant` | Only constant value (default) | No |
| `VisualEnumerationInstanceKinds.ConstantOrRule` | Constant value with conditional formatting rules | **Yes** |
| `VisualEnumerationInstanceKinds.Rule` | Only rule-based (no constant fallback) | Yes (always active) |

> Use `ConstantOrRule` in most cases — it lets users choose between a static color or a conditional rule.

## DataViewWildcard Matching Options

| Option | Description |
|---|---|
| `InstancesAndTotals` | Apply formatting to both data instances and totals (most common) |
| `Instances` | Apply only to data instances |
| `Totals` | Apply only to totals |

## Common Mistakes

| Mistake | Fix |
|---|---|
| fx button doesn't appear | All three properties must be set: `selector` (wildcard), `altConstantSelector`, and `instanceKind: ConstantOrRule` |
| Color picker changes but visual doesn't update | You must **read** the color from `categories.objects[i]` (per-data-point) or `valueColumn.objects[i]` (series) and **apply** it during rendering. Without reading, the visual ignores the override |
| Gradient set but visual stays one color | For series, you must read per-data-point colors from `valueColumn.objects[i].objectName.fill.solid.color` in a loop. Each data point can have a different color |
| Using `altConstantValueSelector` instead of `altConstantSelector` | When using FormattingModel Utils (`formattingSettings.ColorPicker`), the property is `altConstantSelector`. The raw API uses `altConstantValueSelector` — different names for the same concept |
| Missing `powerbi-visuals-utils-dataviewutils` package | Install: `npm install powerbi-visuals-utils-dataviewutils --save` |
| Keeping the data point selector in `selector` instead of moving to `altConstantSelector` | The `selector` must be a wildcard. Move the original selector to `altConstantSelector` |
| Using `withCategory()` for series visuals | For series, use `withSeries(values, group)` or `withMeasure(queryName)`, NOT `withCategory()` |
| Object name in code doesn't match `capabilities.json` | When reading `objects[i].objectName.fill`, the `objectName` must exactly match the key in `capabilities.json`'s `"objects"` block |
| **TS2339: Property 'solid' does not exist on type 'DataViewPropertyValue'** | `DataViewPropertyValue` is a union type. Cast the property value before accessing `.solid.color`: `const fill = obj?.series?.fill as { solid?: { color?: string } }; fill?.solid?.color;` |
| Constant color change ignored for series-level ColorPicker with no data-point identity | Use `altConstantSelector: null` (not omitted) for series ColorPickers that have no `selectionId` available |

## Considerations and Limitations

- Conditional formatting is currently limited to **color** properties only.
- Not supported for table-based or matrix-based visuals.
- For series visuals, conditional formatting with gradient produces per-data-point colors. The visual's rendering logic must iterate data points and apply individual colors — not just one color per series.
- The `powerbi-visuals-utils-dataviewutils` package must be installed as a dependency.

## Files That May Need Changes

| File | What to Change |
|---|---|
| `package.json` | Add `powerbi-visuals-utils-dataviewutils` dependency if not present |
| `capabilities.json` | Ensure color objects with `fill` property exist in `"objects"` |
| `src/settings.ts` | Add or update card class with slices populated dynamically |
| `src/visual.ts` | Add wildcard import, set `selector`/`altConstantSelector`/`instanceKind` on ColorPickers, **read per-data-point colors** from DataView objects, and **apply** them during rendering |
| Data model file (e.g., interfaces/models) | Add per-data-point color fields (e.g., `pointColor`, `dotColor`) to data point interfaces if the visual needs to store resolved conditional colors |

## Validation Checklist

- [ ] `powerbi-visuals-utils-dataviewutils` is installed (`npm install powerbi-visuals-utils-dataviewutils --save`)
- [ ] `dataViewWildcard` is imported from `powerbi-visuals-utils-dataviewutils/lib/dataViewWildcard`
- [ ] Each `ColorPicker` that should support conditional formatting has all three properties:
  - [ ] `selector: dataViewWildcard.createDataViewWildcardSelector(DataViewWildcardMatchingOption.InstancesAndTotals)`
  - [ ] `altConstantSelector` set to the data point's or series' selection ID selector
  - [ ] `instanceKind: powerbi.VisualEnumerationInstanceKinds.ConstantOrRule`
- [ ] For per-data-point visuals: `altConstantSelector` uses `.withCategory(categories, index)`
- [ ] For series visuals: `altConstantSelector` uses `.withSeries(values, group)` or `.withMeasure(queryName)`
- [ ] **Colors are READ back** from the DataView objects (`categories.objects[i]` or `valueColumn.objects[i]`) — not just displayed in the Format Pane
- [ ] **Colors are APPLIED** during rendering to each data point / series segment
- [ ] For series with gradient: per-data-point colors are read in a loop and applied individually
- [ ] Object name used when reading `objects[i]["objectName"]` matches the key in `capabilities.json`
- [ ] `getFormattingModel()` returns the formatting model
- [ ] The code contains `.createDataViewWildcardSelector` (detected by the tool's linting feature)
- [ ] No unrelated files were changed

## Reference

Official Microsoft documentation: https://learn.microsoft.com/en-us/power-bi/developer/visuals/conditional-format
