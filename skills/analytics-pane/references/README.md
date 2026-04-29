# Power BI Visual — Analytics Pane

## Overview

The Analytics Pane allows a Power BI custom visual to present dynamic reference lines (min, max, average, trend lines) that help users identify important trends or insights. These lines overlay the visual and highlight important data patterns. The Analytics Pane is separate from the Format Pane — it should **only** contain objects that add new informational content (e.g., reference lines), not visual styling options.

Analytics properties are defined as objects in `capabilities.json` and managed through formatting cards with the `analyticsPane` flag set to `true`.

**Official documentation:** https://learn.microsoft.com/en-us/power-bi/developer/visuals/analytics-pane

## Requirements

- **API version:** 2.5.0 or higher (recommended: 5.1.0+ for new Format Pane)
- **powerbi-visuals-api** package must be installed
- **powerbi-visuals-utils-formattingmodel** package must be installed (for the FormattingModel Utils approach)
- Objects must be defined with `objectCategory: 2` in capabilities.json (for older APIs) or use the `analyticsPane` flag in formatting settings cards (API 5.1+)

## Step-by-Step Implementation

### Step 1: Define Analytics Objects in capabilities.json

Add the analytics object to the `"objects"` section of your `capabilities.json`. The object name must match the `name` property on the formatting card class (see Step 2).

**For API 5.1+**, add only the object name, property name, and type (no `objectCategory` needed):

```json
{
  "objects": {
    "YourAnalyticsPropertiesCard": {
      "properties": {
        "show": {
          "type": {
            "bool": true
          }
        },
        "displayName": {
          "type": {
            "text": true
          }
        },
        "lineColor": {
          "type": {
            "fill": {
              "solid": {
                "color": true
              }
            }
          }
        },
        "lineValue": {
          "type": {
            "numeric": true
          }
        }
      }
    }
  }
}
```

> **IMPORTANT:** Merge this into the existing `"objects"` block — do NOT create a second `"objects"` key. If there are already other objects defined, add `"YourAnalyticsPropertiesCard"` alongside them.

**For older APIs (before 5.1)**, add `objectCategory: 2` to mark it as an analytics object:

```json
{
  "objects": {
    "YourAnalyticsPropertiesCard": {
      "objectCategory": 2,
      "properties": {
        "show": {
          "displayName": "Show",
          "type": { "bool": true }
        },
        "lineColor": {
          "displayName": "Color",
          "type": { "fill": { "solid": { "color": true } } }
        }
      }
    }
  }
}
```

### Step 2: Create the Formatting Settings Card (API 5.1+, Using FormattingModel Utils)

Create a formatting settings card class for your analytics properties. Key points:

- Set `analyticsPane = true` on the card to place it in the Analytics Pane (not the Format Pane)
- The `name` property **must match** the object name in `capabilities.json`
- To add a show/hide toggle at the top of the card, create a `ToggleSwitch` and assign it to the card's `topLevelSlice` property
- Do **NOT** pass `topLevelToggle: true` in the ToggleSwitch constructor — that property does not exist on `ToggleSwitch` and will cause a TypeScript error

```typescript
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;

class YourAnalyticsCardSettings extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayName: undefined,
        value: false
    });

    displayNameProperty = new formattingSettings.TextInput({
        displayName: "Display Name",
        name: "displayName",
        placeholder: "",
        value: "Analytics Instance",
    });

    lineColor = new formattingSettings.ColorPicker({
        name: "lineColor",
        displayName: "Color",
        value: { value: "#FF0000" }
    });

    name: string = "YourAnalyticsPropertiesCard";
    displayName: string = "Your Analytics Properties Card";
    analyticsPane: boolean = true;               // <== Places this card in the Analytics Pane
    topLevelSlice = this.show;                   // <== Show/hide toggle at the top of the card
    slices: Array<FormattingSettingsSlice> = [this.displayNameProperty, this.lineColor];
}
```

> **CRITICAL — `topLevelSlice` vs `topLevelToggle`:**
> - Use `topLevelSlice` as a **property on the card class** to set the top-level show/hide toggle. Assign your `ToggleSwitch` instance to it.
> - Do **NOT** use `topLevelToggle: true` inside the `ToggleSwitch` constructor — `ToggleSwitch` does not have a `topLevelToggle` parameter and it will cause a TypeScript compilation error.
> - Do **NOT** include the `show` toggle in the `slices` array — it is rendered separately as the top-level toggle.

### Step 3: Include the Analytics Card in the Formatting Model

Add the analytics card to your visual's formatting settings model:

```typescript
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import FormattingSettingsModel = formattingSettings.Model;

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    analyticsCard = new YourAnalyticsCardSettings();

    cards = [this.analyticsCard];
}
```

> If the model already has other cards (e.g., for the Format Pane), add the analytics card to the existing `cards` array:
> ```typescript
> cards = [this.dataPointCard, this.analyticsCard];
> ```

### Step 4: Wire Up in the Visual Class

In `src/visual.ts`, populate the formatting settings in `update()` and return the formatting model in `getFormattingModel()`:

```typescript
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { VisualFormattingSettingsModel } from "./settings";

export class Visual implements IVisual {
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;

    constructor(options: VisualConstructorOptions) {
        this.formattingSettingsService = new FormattingSettingsService();
    }

    public update(options: VisualUpdateOptions): void {
        this.formattingSettings = this.formattingSettingsService
            .populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews);

        // Read analytics values:
        // this.formattingSettings.analyticsCard.show.value  (boolean)
        // this.formattingSettings.analyticsCard.lineColor.value.value  (string)

        // If show is true, render the reference line on your visual
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
```

## Common Mistakes

| Mistake | Fix |
|---|---|
| Using `topLevelToggle: true` inside the `ToggleSwitch` constructor | `ToggleSwitch` does not have a `topLevelToggle` property. Set `topLevelSlice = this.show` on the **card class** instead |
| Including the show toggle in both `topLevelSlice` and `slices` array | Only assign it to `topLevelSlice`. Do NOT also add it to the `slices` array — it will render twice |
| Putting styling/formatting options in the Analytics Pane | The Analytics Pane is for informational overlays (reference lines, trend lines). Formatting options belong in the Format Pane |
| Using `integer` type for numeric properties | Properties of type `integer` don't display correctly — use `numeric` instead |
| Missing `analyticsPane: true` on the card | Without this flag, the card appears in the Format Pane instead of the Analytics Pane |
| Card `name` doesn't match the object name in `capabilities.json` | The `name` property on the card class **must exactly match** the key in `capabilities.json`'s `"objects"` block |

## Important Notes

- Use the Analytics Pane **only** for objects that add new information or illuminate trends (e.g., dynamic reference lines, averages, medians).
- Formatting/styling options should go in the **Format Pane**, not the Analytics Pane.
- The Analytics Pane has **no multi-instance support** yet. Objects can only have a static selector (`selector: null`), and Power BI visuals can't have multiple instances of a user-defined card.
- Properties of type `integer` don't display correctly — use `numeric` instead.

## Files That May Need Changes

| File | What to Change |
|---|---|
| `capabilities.json` | Add analytics objects with properties (add `objectCategory: 2` for older APIs) |
| `src/settings.ts` | Add formatting settings card with `analyticsPane: true` and `topLevelSlice` for show/hide |
| `src/visual.ts` | Populate formatting settings in `update()`, return model in `getFormattingModel()`, render analytics overlays |

## Validation Checklist

- [ ] Analytics objects are defined in `capabilities.json` with all required properties
- [ ] For API < 5.1: `objectCategory: 2` is set on analytics objects
- [ ] For API 5.1+: Formatting settings card has `analyticsPane: true`
- [ ] The card uses `topLevelSlice = this.show` for the show/hide toggle (NOT `topLevelToggle: true` in the ToggleSwitch constructor)
- [ ] The `show` ToggleSwitch is NOT included in the `slices` array (only in `topLevelSlice`)
- [ ] Card `name` matches the object name in `capabilities.json`
- [ ] Analytics properties are rendered as reference lines or similar informational overlays
- [ ] Only informational/analytical objects are in the Analytics Pane (not styling)
- [ ] `getFormattingModel()` returns the formatting model built by `FormattingSettingsService`
- [ ] No unrelated files were changed

## Reference

Official Microsoft documentation: https://learn.microsoft.com/en-us/power-bi/developer/visuals/analytics-pane
