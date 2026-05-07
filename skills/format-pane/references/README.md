# Power BI Visual — Add Format Pane

## Overview

The Format Pane allows report creators to customize the appearance of a custom visual. Starting with API 5.1, visuals implement `getFormattingModel()` which returns a `FormattingModel` describing the properties, cards, and groups shown in the format pane. This replaces the deprecated `enumerateObjectInstances` method.

**Official documentation:** https://learn.microsoft.com/en-us/power-bi/developer/visuals/format-pane

## Requirements

- **API version:** 5.1.0 or higher
- **powerbi-visuals-api** 5.1.0+
- **powerbi-visuals-utils-formattingmodel** (recommended)

## Step-by-Step Implementation

### Step 1: Define Objects in capabilities.json

Add customizable objects with their properties:

```json
{
    "objects": {
        "circle": {
            "properties": {
                "circleColor": {
                    "type": {
                        "fill": {
                            "solid": {
                                "color": true
                            }
                        }
                    }
                },
                "circleThickness": {
                    "type": {
                        "numeric": true
                    }
                },
                "show": {
                    "type": {
                        "bool": true
                    }
                }
            }
        }
    }
}
```

### Step 2: Create Formatting Settings Classes

Using **FormattingModel Utils** (recommended):

```typescript
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

class CircleCardSettings extends formattingSettings.Card {
    circleColor = new formattingSettings.ColorPicker({
        name: "circleColor",
        displayName: "Circle Color",
        value: { value: "#000000" }
    });

    circleThickness = new formattingSettings.NumUpDown({
        name: "circleThickness",
        displayName: "Thickness",
        value: 2
    });

    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayName: undefined,
        value: true
    });

    name: string = "circle";
    displayName: string = "Circle";
    topLevelSlice = this.show;
    slices = [this.circleColor, this.circleThickness];
}

class VisualFormattingSettingsModel extends formattingSettings.Model {
    circleCard = new CircleCardSettings();
    cards = [this.circleCard];
}
```

### Step 3: Implement getFormattingModel in the Visual

```typescript
import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";

export class Visual implements powerbi.extensibility.visual.IVisual {
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;

    constructor(options: powerbi.extensibility.visual.VisualConstructorOptions) {
        this.formattingSettingsService = new FormattingSettingsService();
    }

    public update(options: powerbi.extensibility.visual.VisualUpdateOptions): void {
        this.formattingSettings = this.formattingSettingsService
            .populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews?.[0]);

        // Use this.formattingSettings.circleCard.circleColor.value.value, etc.
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
```

## Formatting Property Types

| Capabilities Type | Formatting Component | Formatter Class |
|---|---|---|
| `bool` | ToggleSwitch | `formattingSettings.ToggleSwitch` |
| `numeric` | NumUpDown | `formattingSettings.NumUpDown` |
| `numeric` | Slider | `formattingSettings.Slider` |
| `fill.solid.color` | ColorPicker | `formattingSettings.ColorPicker` |
| `text` | TextInput | `formattingSettings.TextInput` |
| `text` | TextArea | `formattingSettings.TextArea` |
| `enumeration:[]` | ItemDropdown | `formattingSettings.ItemDropdown` |
| `fontSize` | NumUpDown | (Font size formatting) |
| `fontFamily` | FontPicker | (Font family formatting) |

### Slider Example

Use `Slider` for bounded numeric values. Declare the property as `numeric` in capabilities.json:

```typescript
lineWidth = new formattingSettings.Slider({
    name: "lineWidth",
    displayName: "Line Width",
    value: 2,
    options: {
        minValue: { type: powerbi.visuals.ValidatorType.Min, value: 1 },
        maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 10 }
    }
});
```

### ItemDropdown with Options

Use `ItemDropdown` for enumerated choices. The `items` array must contain `ILocalizedItemMember[]` objects with `value` and `displayName`:

**In capabilities.json:**
```json
"position": {
    "type": {
        "enumeration": [
            { "value": "Left", "displayName": "Left" },
            { "value": "Right", "displayName": "Right" },
            { "value": "Top", "displayName": "Top" },
            { "value": "Bottom", "displayName": "Bottom" }
        ]
    }
}
```

**In settings.ts:**
```typescript
position = new formattingSettings.ItemDropdown({
    name: "position",
    displayName: "Position",
    items: [
        { value: "Left", displayName: "Left" },
        { value: "Right", displayName: "Right" },
        { value: "Top", displayName: "Top" },
        { value: "Bottom", displayName: "Bottom" }
    ],
    value: { value: "Left", displayName: "Left" }
});
```

### TextInput with Placeholder

```typescript
label = new formattingSettings.TextInput({
    name: "label",
    displayName: "Label",
    placeholder: "Enter label text...",
    value: ""
});
```

## Non-Formatting Properties on Card Classes

Card classes can hold **custom properties** that are not formatting slices — such as parsed settings, helper values, or cached computations. These properties are not rendered in the Format pane but are available in the visual code.

```typescript
class SeriesCardSettings extends formattingSettings.SimpleCard {
    fill = new formattingSettings.ColorPicker({
        name: "fill",
        displayName: "Fill",
        value: { value: "#3779B7" }
    });

    width = new formattingSettings.NumUpDown({
        name: "width",
        displayName: "Width",
        value: 2
    });

    // Non-formatting properties — NOT in slices array, NOT rendered in Format pane
    dateFormat: string = "MMM dd";
    formatterOptions: any = null;

    name: string = "series";
    displayName: string = "Series";
    slices = [this.fill, this.width];
}
```

> Only properties listed in the `slices` array appear in the Format pane. Other class properties are just regular TypeScript fields.

## parseSettings() Pattern

For visuals that need post-processing (e.g., applying a `ColorHelper` for high contrast, computing derived values), add a `parseSettings()` method to the model:

```typescript
import { ColorHelper } from "powerbi-visuals-utils-colorutils";

class VisualFormattingSettingsModel extends formattingSettings.Model {
    seriesCard = new SeriesCardSettings();
    cards = [this.seriesCard];

    parseSettings(colorHelper: ColorHelper): void {
        // Post-process colors for high contrast mode
        this.seriesCard.fill.value.value = colorHelper.getHighContrastColor(
            "foreground",
            this.seriesCard.fill.value.value
        );
    }
}
```

Call `parseSettings()` in the visual's `update()` after populating the model:
```typescript
public update(options: VisualUpdateOptions): void {
    this.formattingSettings = this.formattingSettingsService
        .populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews);

    // Post-process (e.g., high contrast adjustments)
    this.formattingSettings.parseSettings(this.colorHelper);
}
```

## High Contrast Mode Integration

When the visual supports high contrast mode, `ColorPicker` slices should be hidden (since users cannot change colors in high contrast). Toggle visibility based on the palette's `isHighContrast` flag:

```typescript
public update(options: VisualUpdateOptions): void {
    this.formattingSettings = this.formattingSettingsService
        .populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews);

    // Hide color pickers in high contrast mode
    const isHighContrast = this.host.colorPalette.isHighContrast;
    this.formattingSettings.seriesCard.fill.visible = !isHighContrast;
}
```

> See the **high-contrast-mode** skill for full implementation details on applying high-contrast colors to the visual rendering.

## Formatting Model Hierarchy

1. **FormattingModel** — Top-level container with a list of cards
2. **FormattingCard** — Groups related properties (e.g., "Circle", "Labels")
3. **FormattingGroup** — Sub-group within a card
4. **FormattingSlice** — Individual property control (simple or composite)

## Files That May Need Changes

- `capabilities.json` — Define formatting objects and properties
- `src/visual.ts` — Implement `getFormattingModel()` method
- `src/settings.ts` (new file) — Define formatting settings model classes

## Validation Checklist

- [ ] API version is 5.1.0 or higher in `pbiviz.json`
- [ ] Objects are defined in `capabilities.json` with correct property types
- [ ] Formatting settings classes extend `formattingSettings.Card`
- [ ] `getFormattingModel()` is implemented in the visual class
- [ ] Object names and property names match between capabilities and formatting model
- [ ] Property types match between capabilities and formatting model
- [ ] The code contains `getFormattingModel` (detected by the tool's linting feature)
- [ ] No unrelated files were changed

## Reference

Official Microsoft documentation: https://learn.microsoft.com/en-us/power-bi/developer/visuals/format-pane
