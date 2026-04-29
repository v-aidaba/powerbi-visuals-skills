# Power BI Visual — Add Localization

## Overview

The Localization API enables a Power BI custom visual to display text in the user's language. By providing string resource files for different locales, the visual automatically adapts to the language configured in Power BI.

**Official documentation:** https://learn.microsoft.com/en-us/power-bi/developer/visuals/localization

## Requirements

- **powerbi-visuals-api** package must be installed
- Locale string resource files must be created

## Step-by-Step Implementation

### Step 1: Create String Resource Files

Create a `stringResources` folder in your project root with JSON files for each supported locale:

**`stringResources/en-US/resources.resjson`:**
```json
{
    "Visual_Short_Description": "My custom visual",
    "Visual_Long_Description": "A detailed description of what this visual does.",
    "NoData_Label": "No data available",
    "Category_Label": "Category",
    "Value_Label": "Value"
}
```

**`stringResources/de-DE/resources.resjson`:**
```json
{
    "Visual_Short_Description": "Mein benutzerdefiniertes Visual",
    "Visual_Long_Description": "Eine detaillierte Beschreibung der Funktionsweise dieses Visuals.",
    "NoData_Label": "Keine Daten verfügbar",
    "Category_Label": "Kategorie",
    "Value_Label": "Wert"
}
```

### Step 2: Create the Localization Manager

In your `src/visual.ts` constructor:

```typescript
import powerbi from "powerbi-visuals-api";
import ILocalizationManager = powerbi.extensibility.ILocalizationManager;

export class Visual implements powerbi.extensibility.visual.IVisual {
    private host: powerbi.extensibility.visual.IVisualHost;
    private localizationManager: ILocalizationManager;

    constructor(options: powerbi.extensibility.visual.VisualConstructorOptions) {
        this.host = options.host;
        this.localizationManager = this.host.createLocalizationManager();
    }
}
```

### Step 3: Use Localized Strings in the Visual

Call `getDisplayName(key)` to retrieve the localized string:

```typescript
public update(options: powerbi.extensibility.visual.VisualUpdateOptions): void {
    const dataView = options.dataViews?.[0];

    if (!dataView) {
        const noDataText = this.localizationManager.getDisplayName("NoData_Label");
        this.target.textContent = noDataText;
        return;
    }

    // Use localized strings for headers, labels, etc.
    const categoryLabel = this.localizationManager.getDisplayName("Category_Label");
    const valueLabel = this.localizationManager.getDisplayName("Value_Label");

    // Render with localized labels
}
```

### Step 4: Reference Localization Keys in capabilities.json (Optional)

Use localization keys for display names in `capabilities.json`:

```json
{
    "dataRoles": [
        {
            "displayNameKey": "Category_Label",
            "name": "category",
            "kind": "Grouping"
        },
        {
            "displayNameKey": "Value_Label",
            "name": "measure",
            "kind": "Measure"
        }
    ]
}
```

## Supported Locales

Power BI supports locales including: `ar-SA`, `bg-BG`, `ca-ES`, `cs-CZ`, `da-DK`, `de-DE`, `el-GR`, `en-US`, `es-ES`, `et-EE`, `eu-ES`, `fi-FI`, `fr-FR`, `gl-ES`, `he-IL`, `hi-IN`, `hr-HR`, `hu-HU`, `id-ID`, `it-IT`, `ja-JP`, `kk-KZ`, `ko-KR`, `lt-LT`, `lv-LV`, `ms-MY`, `nb-NO`, `nl-NL`, `pl-PL`, `pt-BR`, `pt-PT`, `ro-RO`, `ru-RU`, `sk-SK`, `sl-SI`, `sr-Cyrl-RS`, `sr-Latn-RS`, `sv-SE`, `th-TH`, `tr-TR`, `uk-UA`, `vi-VN`, `zh-CN`, `zh-TW`.

## File Structure

```
myVisual/
├── stringResources/
│   ├── en-US/
│   │   └── resources.resjson
│   ├── de-DE/
│   │   └── resources.resjson
│   ├── fr-FR/
│   │   └── resources.resjson
│   └── ...
├── capabilities.json
└── src/
    └── visual.ts
```

## Files That May Need Changes

- `src/visual.ts` — Create localization manager and use `getDisplayName()`
- `stringResources/<locale>/resources.resjson` — Create locale-specific string files
- `capabilities.json` — (Optional) Use `displayNameKey` instead of `displayName`

## Validation Checklist

- [ ] `host.createLocalizationManager()` is called in the constructor
- [ ] `localizationManager.getDisplayName(key)` is used for all user-facing strings
- [ ] At minimum, `en-US/resources.resjson` exists with all string keys
- [ ] All localization keys used in code exist in the resource files
- [ ] (Optional) `displayNameKey` is used in `capabilities.json` for data role names
- [ ] The code contains `.createLocalizationManager` (detected by the tool's linting feature)
- [ ] No unrelated files were changed

## Reference

Official Microsoft documentation: https://learn.microsoft.com/en-us/power-bi/developer/visuals/localization
