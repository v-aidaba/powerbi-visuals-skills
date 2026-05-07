# Power BI Visual — Add High-Contrast Mode Support

## Overview

High-contrast mode support ensures a Power BI custom visual is accessible to users who enable high-contrast themes in Windows. When high-contrast mode is active, the visual should use the operating system's high-contrast colors instead of its default color scheme.

The recommended approach is to override color **settings values** in the settings model, so all rendering code uses them automatically without `if/else` branches.

**Official documentation:** https://learn.microsoft.com/en-us/power-bi/developer/visuals/high-contrast-support

## Requirements

- **powerbi-visuals-api** package must be installed
- **powerbi-visuals-utils-colorutils** must be installed (`ColorHelper`)
- The visual must use a formatting settings model (see format-pane skill)

## Step-by-Step Implementation

### Step 1: Install ColorHelper Dependency

```bash
npm install powerbi-visuals-utils-colorutils --save
```

### Step 2: Create ColorHelper in the Visual Constructor

```typescript
import { ColorHelper } from "powerbi-visuals-utils-colorutils";

export class Visual implements powerbi.extensibility.visual.IVisual {
    private colorHelper: ColorHelper;

    constructor(options: powerbi.extensibility.visual.VisualConstructorOptions) {
        this.colorHelper = new ColorHelper(options.host.colorPalette);
    }
}
```

### Step 3: Add a `parseSettings()` Method to the Settings Model

Override all color settings when high contrast is active. This is the key pattern — rendering code stays unchanged because it reads colors from settings:

```typescript
import { ColorHelper } from "powerbi-visuals-utils-colorutils";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

export class VisualSettingsModel extends formattingSettings.Model {
    myCard = new MySettingsCard();
    cards = [this.myCard];

    public parseSettings(colorHelper: ColorHelper): void {
        this.setHighContrastColors(colorHelper);
    }

    private setHighContrastColors(colorHelper: ColorHelper): void {
        if (!colorHelper.isHighContrast) return;

        const foregroundColor: string = colorHelper.getThemeColor("foreground");
        const backgroundColor: string = colorHelper.getThemeColor("background");

        // Override every ColorPicker setting with HC colors
        // Text, lines, borders, data points → foreground
        this.myCard.fontColor.value.value = foregroundColor;
        this.myCard.lineColor.value.value = foregroundColor;
        this.myCard.dotColor.value.value = foregroundColor;

        // Backgrounds, fills → background
        this.myCard.backgroundColor.value.value = backgroundColor;

        // Hide all ColorPicker slices so users can't override HC colors
        this.cards.forEach((card) => {
            card.slices.forEach((slice) => {
                if (slice instanceof formattingSettings.ColorPicker) {
                    slice.visible = false;
                }
            });
        });
    }
}
```

### Step 4: Call `parseSettings()` in the Visual's `update()` Method

```typescript
public update(options: powerbi.extensibility.visual.VisualUpdateOptions): void {
    const dataView = options.dataViews?.[0];
    if (!dataView) return;

    this.settings = this.formattingSettingsService
        .populateFormattingSettingsModel(VisualSettingsModel, dataView);

    // Apply high-contrast overrides AFTER populating settings
    this.settings.parseSettings(this.colorHelper);

    // All rendering code reads from this.settings — no if/else needed
    this.render();
}
```

### Step 5: Rendering Code Stays Clean

Because HC colors are injected into the settings values, rendering code needs **no changes**:

```typescript
// This works for both normal and high-contrast mode
private render(): void {
    this.selection
        .style("fill", this.settings.myCard.dotColor.value.value)
        .style("stroke", this.settings.myCard.lineColor.value.value);
}
```

## Color Mapping Rules

When overriding settings for high contrast, follow these mappings:

| Element Type | HC Color | Method |
|---|---|---|
| Text, labels, fonts | `foreground` | `colorHelper.getThemeColor("foreground")` |
| Lines, borders, strokes | `foreground` | `colorHelper.getThemeColor("foreground")` |
| Data points, bars, dots | `foreground` | `colorHelper.getThemeColor("foreground")` |
| Backgrounds, fills | `background` | `colorHelper.getThemeColor("background")` |
| Selected/active elements | `foregroundSelected` | `colorHelper.getThemeColor("foregroundSelected")` |
| Hyperlinks | `hyperlink` | `colorHelper.getThemeColor("hyperlink")` |

## High-Contrast Color Palette Properties

| Property | Description |
|---|---|
| `foreground` | Text and foreground element color |
| `background` | Background color |
| `foregroundSelected` | Color for selected/active elements |
| `hyperlink` | Color for hyperlinks |
| `isHighContrast` | Boolean indicating if high-contrast mode is active |

## Common Mistakes

| Mistake | Fix |
|---|---|
| Putting HC logic in rendering code | Creates messy `if/else` branches everywhere. Override settings values in `parseSettings()` instead — rendering code stays clean |
| Not hiding ColorPicker slices | Users can accidentally override HC colors from the format pane. Set `slice.visible = false` for all ColorPicker slices when HC is active |
| Using raw `colorPalette` instead of `ColorHelper` | `ColorHelper` from `powerbi-visuals-utils-colorutils` provides `isHighContrast` and `getThemeColor()` in a cleaner API |
| Forgetting background fills | Popup backgrounds, axis backgrounds, and card fills must use `background` color — otherwise they remain visible against the HC background |
| Calling `parseSettings()` before `populateFormattingSettingsModel()` | The HC override must run AFTER settings are populated from the DataView, or saved values will overwrite the HC colors |

## Files That May Need Changes

| File | What to Change |
|---|---|
| `package.json` | Add `powerbi-visuals-utils-colorutils` dependency if not present |
| `src/settings.ts` | Add `parseSettings()` with HC color overrides and hide ColorPicker slices |
| `src/visual.ts` | Create `ColorHelper` in constructor, call `parseSettings()` in `update()` |

## Validation Checklist

- [ ] `powerbi-visuals-utils-colorutils` is installed
- [ ] `ColorHelper` is created from `host.colorPalette` in constructor
- [ ] `parseSettings()` is called in `update()` AFTER `populateFormattingSettingsModel()`
- [ ] All `ColorPicker` settings are overridden with `foreground` or `background` in HC mode
- [ ] All `ColorPicker` slices are hidden (`slice.visible = false`) in HC mode
- [ ] No `if (isHighContrast)` branches exist in rendering code
- [ ] Visual is readable with all four Windows high-contrast themes
- [ ] The code contains `.isHighContrast` (detected by the tool's linting feature)
- [ ] No unrelated files were changed

## Reference

Official Microsoft documentation: https://learn.microsoft.com/en-us/power-bi/developer/visuals/high-contrast-support
