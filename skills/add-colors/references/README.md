# Power BI Visual — Add Colors to Your Visual

## Overview

The Color Palette API allows a Power BI custom visual to use theme-consistent colors provided by Power BI. Instead of hardcoding colors, the visual uses `host.colorPalette` to get colors that match the current report theme and are consistent across sessions. Colors can also be overridden by the user through the Format pane using `colorSelector` objects in `capabilities.json` and corresponding formatting settings.

**Official documentation:** https://learn.microsoft.com/en-us/power-bi/developer/visuals/add-colors-power-bi-visual

## Requirements

- **powerbi-visuals-api** package must be installed (version 5.1.0 or higher recommended)
- **powerbi-visuals-utils-formattingmodel** package must be installed (for Format Pane integration)
- The visual must store a reference to `IVisualHost` and access `host.colorPalette`

## Pre-Implementation Check (REQUIRED)

**Before adding anything, inspect the existing code to avoid duplicating color support that is already present.**

1. **Check `capabilities.json`:**
   - Look in `"objects"` for an existing `"colorSelector"` object. If it already has a `fill` property with `fill.solid.color`, do NOT add another `colorSelector`.
   - Look for an existing `"dataPoint"` object with `fill`/`defaultColor` properties — these provide global or series-level color support and may already be sufficient.

2. **Check `src/settings.ts`:**
   - Look for an existing `ColorSelectorCardSettings` class (or any card with `name: "colorSelector"`). If it exists, do NOT create a duplicate class.
   - Look for existing `ColorPicker` slices in other cards (e.g., `DataPointCardSettings`). If global color pickers already exist, the visual already has color formatting — only add `colorSelector` if per-data-point colors are specifically needed and not already present.

3. **Check `src/visual.ts`:**
   - Look for `this.colorPalette = this.host.colorPalette` or `host.colorPalette.getColor()`. If already present, do NOT add duplicate palette initialization.
   - Look for existing `ColorDataPoint` interface or similar data point structures with a `color` property. If found, extend rather than replace.
   - Look for an existing `populateColorFormattingCard()` method or similar. If found, do NOT add a duplicate.
   - Look for an existing `getFormattingModel()` method. If found, do NOT add another one.

**Decision logic:**
- If `colorSelector` object exists in capabilities AND `ColorSelectorCardSettings` exists in settings AND `colorPalette` is used in visual.ts → **color support is already fully implemented. Do nothing.**
- If `dataPoint` object has `fill` but no `colorSelector` exists → **only add `colorSelector` and its card if per-data-point colors are needed, otherwise wire up the existing `dataPoint.fill` to `colorPalette.getColor()`.**
- If no color-related objects exist at all → **proceed with full implementation (all steps below).**
- For any partially implemented state → **only add the missing pieces, merging into existing code.**

Color support in a Power BI custom visual consists of three parts:

1. **IColorPalette** — Accessed from `host.colorPalette`, provides theme-consistent colors via `getColor(key)`. Each unique key receives a deterministic color from the Power BI theme.
2. **capabilities.json objects** — A `colorSelector` object with a `fill` property tells Power BI to show per-data-point color pickers in the Format pane.
3. **Formatting Settings Model** — A `ColorPicker` slice in the formatting settings model (in `src/settings.ts`) allows reading user-overridden colors back from the data view and populating the Format pane.

The flow is:
- On first render, `colorPalette.getColor(categoryName)` assigns default colors from the theme.
- If the user overrides a color in the Format pane, the overridden value is stored in the data view's `objects` property.
- On subsequent renders, the visual checks for user overrides first, falling back to the palette default.

---

## Choosing the Right Color Pattern

Before implementing, determine which color pattern fits your visual:

| Pattern | When to Use | Examples |
|---|---|---|
| **Per-data-point colors** (`colorSelector`) | Each category/bar/slice gets its own color picker | Bar chart, pie chart, donut chart |
| **Series-level colors** (`colorPalette.getColor()` for fill defaults) | The visual renders one or more data series where each series has a single color | Pulse chart, line chart, area chart, combo chart |

### Series-Level Colors (Pulse Chart, Line Chart, etc.)

For visuals that render **series** rather than individual categorical data points, you should NOT add a `colorSelector` object for per-data-point colors. Instead, use `colorPalette.getColor(seriesName)` to assign a default fill color per series, and read user overrides from the series-level objects in the data view.

**Why:** A pulse chart (or line chart) has one color per series line — not one color per data point. Adding `colorSelector` with per-point pickers would create hundreds of color pickers (one per data value) which is not what the user expects.

#### Implementation for Series-Level Colors

1. **In `capabilities.json`**, use a `dataPoint` object (or the visual's existing fill object) with a `fill` property for series-level color overrides:

```json
{
    "objects": {
        "dataPoint": {
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

2. **In the update method**, assign colors per series using `colorPalette.getColor()` with the series name as the key, and check for user overrides from the data view's grouped values:

```typescript
// For each series (grouped value), assign a palette color
const grouped = dataView.categorical.values.grouped();
const seriesColors: Map<string, string> = new Map();

grouped.forEach((group, index) => {
    const seriesName = String(group.name);

    // Default color from the palette (NOT hardcoded)
    const defaultColor = this.colorPalette.getColor(seriesName).value;

    // Check for user override from the format pane
    const userColor = group.objects?.dataPoint?.fill?.solid?.color as string;

    seriesColors.set(seriesName, userColor || defaultColor);
});
```

3. **Use the series color** when rendering the series line/area/pulse — apply the single color to the entire series, not per data point.

> **CRITICAL:** Do NOT use hardcoded colors (e.g., `"#FF0000"`) as defaults for series fill. Always use `colorPalette.getColor(seriesName).value` so the visual respects the report theme and stays consistent across sessions.

> **TIP — Conditional formatting for series:** To add an **fx button** next to the series color picker (for gradient/rules), see the **conditional-formatting** skill. It explains how to set `instanceKind: ConstantOrRule`, use `dataViewWildcard`, and read per-data-point colors from `valueColumn.objects[i]`.

---

## Per-Data-Point Colors (Bar Chart, Pie Chart, etc.)

The following steps apply when each data point (category) should have its own color picker in the Format pane. **Skip this section if your visual uses series-level colors (see above).**

## Step-by-Step Implementation

### Step 1: Add the `colorSelector` Object to `capabilities.json`

Add a `colorSelector` object to the `"objects"` section of your `capabilities.json`. This tells Power BI to display per-data-point color pickers in the Format pane.

**In `capabilities.json`, add inside the `"objects"` block:**

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

> **IMPORTANT:** If the file already has an `"objects"` block with other objects (e.g., `"dataPoint"`), merge `"colorSelector"` into the existing `"objects"` — do NOT create a second `"objects"` key. Example of a merged result:

```json
{
    "objects": {
        "dataPoint": {
            "properties": {
                "defaultColor": {
                    "type": { "fill": { "solid": { "color": true } } }
                },
                "showAllDataPoints": {
                    "type": { "bool": true }
                },
                "fill": {
                    "type": { "fill": { "solid": { "color": true } } }
                }
            }
        },
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

### Step 2: Define a Data Point Interface

Create or update an interface to hold each data point's category, value, color, and selection identity. This can go in `src/visual.ts` or a separate file like `src/dataPoint.ts`.

```typescript
import powerbi from "powerbi-visuals-api";
import ISelectionId = powerbi.visuals.ISelectionId;

/**
 * Represents a single data point with its color.
 */
export interface ColorDataPoint {
    category: string;
    value: number;
    color: string;
    selectionId: ISelectionId;
}
```

> **WHY:** Having a typed data point interface prevents runtime errors and makes mapping between colors, categories, and rendering explicit.

### Step 3: Store the Host Reference and Color Palette in the Constructor

In your `src/visual.ts`, store both the `IVisualHost` and `IColorPalette` references in the constructor. The host is needed later to create `SelectionIdBuilder` instances, and the color palette provides theme-consistent colors.

```typescript
import powerbi from "powerbi-visuals-api";
import IColorPalette = powerbi.extensibility.IColorPalette;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import ISelectionId = powerbi.visuals.ISelectionId;

export class Visual implements IVisual {
    private host: IVisualHost;
    private colorPalette: IColorPalette;
    private target: HTMLElement;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.colorPalette = this.host.colorPalette;
        this.target = options.element;
    }
}
```

> **CRITICAL:** You MUST store `this.host = options.host` — do not skip this. Many implementations fail because the host reference is missing.

### Step 4: Add the Color Formatting Settings Card

In `src/settings.ts`, add a formatting card for the `colorSelector` object. The `name` property on the card MUST exactly match the object name in `capabilities.json` (i.e., `"colorSelector"`).

**If `src/settings.ts` already exists (from the template), ADD the new card class and register it. If it does not exist, create the full file.**

```typescript
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

/**
 * Color Selector Card — one color picker per data point.
 * Each data point gets its own ColorPicker slice added dynamically in the visual's update method.
 */
export class ColorSelectorCardSettings extends FormattingSettingsCard {
    name: string = "colorSelector";
    displayName: string = "Data Colors";
    slices: Array<FormattingSettingsSlice> = [];
}

/**
 * Visual formatting settings model.
 * Add all formatting cards here.
 */
export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    colorSelectorCard = new ColorSelectorCardSettings();

    cards = [this.colorSelectorCard];
}
```

> **IMPORTANT — Merging with existing settings:** If the visual already has a `VisualFormattingSettingsModel` with other cards (e.g., `DataPointCardSettings`), do NOT replace the existing class. Instead:
> 1. Add the `ColorSelectorCardSettings` class alongside existing card classes.
> 2. Add `colorSelectorCard = new ColorSelectorCardSettings();` as a new property.
> 3. Add it to the `cards` array: `cards = [this.dataPointCard, this.colorSelectorCard];`

Example of a merged settings file:

```typescript
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

class DataPointCardSettings extends FormattingSettingsCard {
    // ...existing properties from the template...
    name: string = "dataPoint";
    displayName: string = "Data colors";
    slices: Array<FormattingSettingsSlice> = [/* ...existing slices... */];
}

export class ColorSelectorCardSettings extends FormattingSettingsCard {
    name: string = "colorSelector";
    displayName: string = "Data Colors";
    slices: Array<FormattingSettingsSlice> = [];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    dataPointCard = new DataPointCardSettings();
    colorSelectorCard = new ColorSelectorCardSettings();

    cards = [this.dataPointCard, this.colorSelectorCard];
}
```

### Step 5: Build Colored Data Points in the Update Method

In the `update()` method of `src/visual.ts`, extract data from the data view, assign colors from the palette, check for user overrides from the data view objects, and dynamically populate the color formatting card.

```typescript
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import { VisualFormattingSettingsModel, ColorSelectorCardSettings } from "./settings";

// Add these as class properties:
private formattingSettings: VisualFormattingSettingsModel;
private formattingSettingsService: FormattingSettingsService;
private dataPoints: ColorDataPoint[];

// Initialize in constructor:
constructor(options: VisualConstructorOptions) {
    this.host = options.host;
    this.colorPalette = this.host.colorPalette;
    this.target = options.element;
    this.formattingSettingsService = new FormattingSettingsService();
    this.dataPoints = [];
}

public update(options: VisualUpdateOptions): void {
    const dataView = options.dataViews?.[0];
    if (!dataView) return;

    // Populate formatting settings from the data view
    this.formattingSettings = this.formattingSettingsService
        .populateFormattingSettingsModel(VisualFormattingSettingsModel, dataView);

    const categorical = dataView.categorical;
    const categories = categorical?.categories?.[0];
    if (!categories) return;

    // Build data points with palette colors and user overrides
    this.dataPoints = categories.values.map((value, index) => {
        // 1. Get the default color from the palette
        const defaultColor: string = this.colorPalette.getColor(String(value)).value;

        // 2. Check if the user overrode the color in the Format pane
        const categoryObjects = categories.objects?.[index];
        const userColor: string = categoryObjects
            ? (categoryObjects["colorSelector"] as any)?.fill?.solid?.color
            : undefined;
        const color: string = userColor || defaultColor;

        // 3. Build a SelectionId for this data point (needed for Format pane binding)
        const selectionId: ISelectionId = this.host
            .createSelectionIdBuilder()
            .withCategory(categories, index)
            .createSelectionId();

        return {
            category: String(value),
            value: Number(categorical.values?.[0]?.values[index]) || 0,
            color: color,
            selectionId: selectionId
        };
    });

    // 4. Dynamically populate the color selector formatting card
    this.populateColorFormattingCard();

    // 5. Render the data points
    this.renderDataPoints(this.dataPoints);
}
```

### Step 6: Dynamically Populate the Color Formatting Card

The `colorSelector` card must have one `ColorPicker` slice per data point so each data point gets its own color picker in the Format pane. This method is called from `update()`.

```typescript
private populateColorFormattingCard(): void {
    const colorCard: ColorSelectorCardSettings =
        this.formattingSettings.colorSelectorCard;

    // Clear existing slices (they are rebuilt each update)
    colorCard.slices = [];

    // Add one ColorPicker slice per data point
    this.dataPoints.forEach((dp) => {
        colorCard.slices.push(
            new formattingSettings.ColorPicker({
                name: "fill",
                displayName: dp.category,
                value: { value: dp.color },
                selector: dp.selectionId.getSelector()
            })
        );
    });
}
```

> **CRITICAL:** The `selector` property links each color picker to a specific data point. Without it, Power BI cannot persist per-data-point color overrides. Always pass `dp.selectionId.getSelector()`.

### Step 7: Implement getFormattingModel

The `getFormattingModel()` method returns the formatting model to Power BI. This is what populates the Format pane.

```typescript
public getFormattingModel(): powerbi.visuals.FormattingModel {
    return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
}
```

> **NOTE:** If the visual class already has `getFormattingModel()` from the template, do NOT add a second one. The existing method is sufficient as long as `this.formattingSettings` is populated in `update()`.

### Step 8: Render Data Points Using Colors

Apply the colors when rendering your visual elements. Here is an example using plain DOM. Adapt this to your rendering approach (D3, SVG, Canvas, etc.).

```typescript
private renderDataPoints(dataPoints: ColorDataPoint[]): void {
    // Clear previous content
    this.target.innerHTML = "";

    dataPoints.forEach((dp) => {
        const element = document.createElement("div");
        element.style.backgroundColor = dp.color;
        element.style.padding = "4px 8px";
        element.style.margin = "2px 0";
        element.style.color = "#ffffff";
        element.textContent = `${dp.category}: ${dp.value}`;
        this.target.appendChild(element);
    });
}
```

### Step 9: Handle Theme Changes

When the Power BI report theme changes, the color palette is updated. Re-read it from the host:

```typescript
// Add this check at the TOP of the update() method, before building data points:
public update(options: VisualUpdateOptions): void {
    // Re-read palette on theme change
    if (options.type & powerbi.VisualUpdateType.Style) {
        this.colorPalette = this.host.colorPalette;
    }

    // ...rest of the update method...
}
```

---

## Complete Minimal Example

Below is a complete, self-contained `src/visual.ts` that can be dropped in as a reference. It assumes the `capabilities.json` has the `colorSelector` object and `src/settings.ts` has the `ColorSelectorCardSettings` card.

```typescript
import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import { VisualFormattingSettingsModel, ColorSelectorCardSettings } from "./settings";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import IColorPalette = powerbi.extensibility.IColorPalette;
import ISelectionId = powerbi.visuals.ISelectionId;

interface ColorDataPoint {
    category: string;
    value: number;
    color: string;
    selectionId: ISelectionId;
}

export class Visual implements IVisual {
    private host: IVisualHost;
    private colorPalette: IColorPalette;
    private target: HTMLElement;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private dataPoints: ColorDataPoint[];

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.colorPalette = this.host.colorPalette;
        this.target = options.element;
        this.formattingSettingsService = new FormattingSettingsService();
        this.dataPoints = [];
    }

    public update(options: VisualUpdateOptions): void {
        // Handle theme changes
        if (options.type & powerbi.VisualUpdateType.Style) {
            this.colorPalette = this.host.colorPalette;
        }

        const dataView = options.dataViews?.[0];
        if (!dataView) return;

        this.formattingSettings = this.formattingSettingsService
            .populateFormattingSettingsModel(VisualFormattingSettingsModel, dataView);

        const categorical = dataView.categorical;
        const categories = categorical?.categories?.[0];
        if (!categories) return;

        this.dataPoints = categories.values.map((value, index) => {
            const defaultColor: string = this.colorPalette.getColor(String(value)).value;
            const categoryObjects = categories.objects?.[index];
            const userColor: string = categoryObjects
                ? (categoryObjects["colorSelector"] as any)?.fill?.solid?.color
                : undefined;

            const selectionId: ISelectionId = this.host
                .createSelectionIdBuilder()
                .withCategory(categories, index)
                .createSelectionId();

            return {
                category: String(value),
                value: Number(categorical.values?.[0]?.values[index]) || 0,
                color: userColor || defaultColor,
                selectionId: selectionId
            };
        });

        this.populateColorFormattingCard();
        this.renderDataPoints(this.dataPoints);
    }

    private populateColorFormattingCard(): void {
        const colorCard: ColorSelectorCardSettings =
            this.formattingSettings.colorSelectorCard;
        colorCard.slices = [];
        this.dataPoints.forEach((dp) => {
            colorCard.slices.push(
                new formattingSettings.ColorPicker({
                    name: "fill",
                    displayName: dp.category,
                    value: { value: dp.color },
                    selector: dp.selectionId.getSelector()
                })
            );
        });
    }

    private renderDataPoints(dataPoints: ColorDataPoint[]): void {
        this.target.innerHTML = "";
        dataPoints.forEach((dp) => {
            const el = document.createElement("div");
            el.style.backgroundColor = dp.color;
            el.style.padding = "4px 8px";
            el.style.margin = "2px 0";
            el.style.color = "#ffffff";
            el.textContent = `${dp.category}: ${dp.value}`;
            this.target.appendChild(el);
        });
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
```

---

## IColorPalette Methods

| Method | Description |
|---|---|
| `getColor(key: string)` | Returns an `IColorInfo` object `{ value: string }` — a consistent hex color for the given key |
| `reset()` | Resets the internal counter so the next `getColor()` starts from the first theme color again |
| `isHighContrast` | Boolean property — `true` when high-contrast mode is active |

## Common Mistakes

| Mistake | Fix |
|---|---|
| Adding color support without checking if it already exists | Always perform the Pre-Implementation Check first — inspect `capabilities.json`, `settings.ts`, and `visual.ts` for existing color objects, cards, and palette usage before adding anything |
| Forgetting to store `this.host = options.host` | Always store the host reference in the constructor |
| Missing `colorSelector` object in `capabilities.json` | Add the `colorSelector` object with a `fill` property (see Step 1) |
| Card `name` in settings doesn't match `capabilities.json` key | The `name` property on the card class MUST be `"colorSelector"` to match the object key |
| Not passing `selector` to the `ColorPicker` | Without `selector: dp.selectionId.getSelector()`, per-data-point colors won't persist |
| Creating a duplicate `"objects"` key in `capabilities.json` | Merge `colorSelector` into the existing `"objects"` block |
| Hardcoding colors instead of using `colorPalette.getColor()` | Always use the palette for default colors — hardcoded colors break theme consistency |
| Using per-data-point `colorSelector` for series-based visuals (pulse chart, line chart) | For series-based visuals, use `colorPalette.getColor(seriesName)` for series-level fill defaults instead of per-data-point color pickers |
| Not checking for user overrides in `categories.objects` | Check `categories.objects?.[index]?.["colorSelector"]?.fill?.solid?.color` before falling back to palette |
| Duplicate `getFormattingModel()` method | If the template already has this method, do not add another one |

## Considerations and Limitations

- The `ColorPalette` feature applies to **NonSlicer** and **Slicer** visual types. It does NOT apply to Matrix visuals.
- The linting tool checks for the string `.colorPalette` in the built output at the **PostBuild** stage. If the string is missing, a **Warning** (not an error) is shown.
- `getColor(key)` returns deterministic colors — the same key always maps to the same color within a session. If you need to reset and start from the first theme color, call `colorPalette.reset()` before the mapping loop.
- User color overrides are stored in the data view's `objects` array per category index. They are only populated when the user has manually changed a color in the Format pane.

## Files That May Need Changes

| File | What to Change |
|---|---|
| `capabilities.json` | Add `"colorSelector"` object with `"fill"` property inside the existing `"objects"` block |
| `src/settings.ts` | Add `ColorSelectorCardSettings` class and register it in `VisualFormattingSettingsModel.cards` |
| `src/visual.ts` | Store `host` and `colorPalette`, build colored data points, populate color card slices, implement `getFormattingModel()` |

## Validation Checklist

- [ ] **Pre-check performed:** Inspected `capabilities.json`, `src/settings.ts`, and `src/visual.ts` for existing color support BEFORE making changes
- [ ] **No duplicate color objects:** Did not add `colorSelector` to `capabilities.json` if it already existed
- [ ] **No duplicate settings cards:** Did not add `ColorSelectorCardSettings` if a card with `name: "colorSelector"` already existed
- [ ] **No duplicate palette init:** Did not add `this.colorPalette = this.host.colorPalette` if it was already stored
- [ ] **Pattern selection:** Determined whether the visual needs per-data-point colors or series-level colors (see "Choosing the Right Color Pattern" above)
- [ ] For series-based visuals (pulse chart, line chart, etc.): `colorPalette.getColor(seriesName)` is used for default series colors — NOT hardcoded values
- [ ] For series-based visuals: `colorSelector` per-data-point object is NOT used (use `dataPoint` or series-level objects instead)
- [ ] `capabilities.json` has a `colorSelector` object with a `fill` property of type `fill.solid.color` (per-data-point visuals only)
- [ ] `src/settings.ts` has a `ColorSelectorCardSettings` class with `name: "colorSelector"` matching `capabilities.json`
- [ ] `ColorSelectorCardSettings` is added to `VisualFormattingSettingsModel.cards` array
- [ ] `this.host = options.host` is stored in the constructor
- [ ] `this.colorPalette = this.host.colorPalette` is stored in the constructor
- [ ] `colorPalette.getColor()` is used for assigning default colors to data points
- [ ] User color overrides are checked via `categories.objects?.[index]?.["colorSelector"]?.fill?.solid?.color`
- [ ] Each `ColorPicker` slice has `selector: dp.selectionId.getSelector()` for per-data-point binding
- [ ] `getFormattingModel()` returns the formatting model (not duplicated if already present)
- [ ] Colors are consistent for the same data point keys across renders
- [ ] Theme changes are handled by re-reading `this.host.colorPalette` when `options.type` includes `Style`
- [ ] The code contains `.colorPalette` (detected by the tool's linting feature)
- [ ] No unrelated files were changed
- [ ] No duplicate `"objects"` keys in `capabilities.json`

## Reference

Official Microsoft documentation: https://learn.microsoft.com/en-us/power-bi/developer/visuals/add-colors-power-bi-visual
