# Power BI Visual — On-Object Formatting & Subselection API (Preview)

## Overview

On-object formatting allows users to modify the format of visual elements by directly selecting them on the canvas. When an element is selected, Power BI shows a context menu/toolbar and the format pane automatically navigates to the relevant setting.

This requires two cooperating APIs:
1. **On-Object Formatting** — the visual declares `VisualOnObjectFormatting` methods (`getSubSelectionStyles`, `getSubSelectionShortcuts`, `getSubSelectables`) that tell Power BI what formatting options are available for each selected element.
2. **Subselection Service** — the visual uses `host.subSelectionService` (accessed via `HtmlSubSelectionHelper`) to send subselections and hover outlines to Power BI.

**Official documentation:**
- https://learn.microsoft.com/en-us/power-bi/developer/visuals/on-object-formatting-api
- https://learn.microsoft.com/en-us/power-bi/developer/visuals/subselection-api

## Requirements

- **API version:** 5.1.0 or higher (for `getFormattingModel`)
- **powerbi-visuals-utils-formattingmodel:** 6.0.0 or higher
- **powerbi-visuals-utils-onobjectutils** for `HTMLSubSelectionHelper`

---

## CRITICAL: Cover ALL Existing Formatting Objects

**This is the most important requirement.** When adding on-object formatting to an existing visual, you MUST:

1. **Read `capabilities.json`** and identify EVERY object defined under `"objects"`.
2. **Read the formatting settings model** (e.g., `FormattingSettingsModel`, `VisualSettingsModel`, or similar class extending `formattingSettings.Model`) and identify EVERY formatting card.
3. **Read `getFormattingModel`** to understand ALL cards and slices returned.
4. **For EVERY formatting card/object**, you must:
   - Identify the corresponding DOM element in the visual's rendering code
   - Add subselectable HTML attributes to that DOM element
   - Add a case in `getSubSelectionStyles` for that object
   - Add a case in `getSubSelectionShortcuts` for that object
   - Create a references object with the correct `cardUid` and all `FormattingId` entries

**Do NOT stop after handling just one or two objects.** Common formatting objects that exist in visuals include (but are not limited to):
- **Axes** (xAxis, yAxis, categoryAxis, valueAxis) — usually `Text` style for labels, `Shape` for axis line
- **Series / Data Colors** (colorSelector, dataColors, series) — usually `Shape` style with fill
- **Legend** (legend) — usually `Text` style for font, `Shape` for background
- **Title** (title, visualTitle) — usually `Text` style
- **Data Labels** (dataLabels, labels, dataLabelSettings) — usually `Text` or `NumericText` style
- **Gridlines** (gridlines, categoryGridlines, valueGridlines) — usually `Shape` style
- **Plot Area / Background** (plotArea, background) — usually `Shape` style
- **Tooltips** (tooltip) — usually `Text` style
- **Animation / Effects** (animation, effects) — usually `Shape` style
- **Any other card** — check the formatting model for the full list

### How to Map Each Object to a Style Type

Examine the properties defined in `capabilities.json` for each object:

| Object property types | SubSelectionStylesType | Style properties to return |
|---|---|---|
| `fill`, `border`, `background` color only | `Shape` | `fill`, `stroke`, `strokeWidth` (include stroke/strokeWidth ONLY if visual has border color/width properties) |
| `fill` + separate border color + border width | `Shape` | `fill` + `stroke` + `strokeWidth` — all three controls appear in toolbar |
| `fill` + toggle for showing/hiding borders (no separate border color) | `Shape` | `fill` only — use Toggle shortcut for border visibility instead |
| `fontFamily`, `fontSize`, `bold`, `italic`, `underline`, `fontColor` | `Text` | `fontFamily`, `fontSize`, `bold`, `italic`, `underline`, `fontColor`, `background` |
| `labelDisplayUnits`, `labelPrecision` + font properties | `NumericText` | All `Text` properties + `labelDisplayUnits`, `labelPrecision` |
| Mixed (has both color fills and text properties) | Use `Text` or `NumericText` (they include shape-like `background`/`fontColor`) | Include all relevant properties |

---

## Step-by-Step Implementation

### Step 1: Enable On-Object Formatting in capabilities.json

```json
{
    "supportsOnObjectFormatting": true,
    "enablePointerEventsFormatMode": true
}
```

### Step 2: Install Dependencies

```bash
npm install powerbi-visuals-utils-onobjectutils --save
```

### Step 3: Discover All Formatting Objects

Before writing any code, inventory ALL formatting objects:

1. Open `capabilities.json` → list every key under `"objects"`
2. Open the formatting settings file → list every `Card` class
3. For each object, note:
   - The `objectName` (key in capabilities.json / `name` property on Card)
   - The `displayName`
   - All property names and their types (fill, font, bool, numeric, etc.)
   - Which DOM element corresponds to this object (e.g., axis labels → SVG text elements, bars → rect elements)

### Step 4: Create References for ALL Objects

Create a references object for EACH formatting object. The `cardUid` MUST follow the pattern `Visual-{cardName}-card` where `{cardName}` matches the `name` property on the formatting card class.

**CRITICAL: The `propertyName` in each `FormattingId` MUST exactly match the property name in `capabilities.json`.** For example, if your capabilities.json defines `fontBold`, `fontItalic`, `fontUnderline`, and `labelColor`, those exact names must be used — NOT the short names `bold`, `italic`, `underline`, `fontColor`.

**CRITICAL: The `groupUid` MUST follow the pattern `{groupName}-group`** where `{groupName}` is the `name` property on the group class for composite cards, or the card `name` for simple cards. For a simple card named `"labels"`, the `groupUid` is `"labels-group"`. For a composite card like legend with a group named `"legendTextGroup"`, the `groupUid` is `"legendTextGroup-group"`.

#### Typing references with GroupFormattingModelReference

Import `GroupFormattingModelReference` and `FormattingId` from the API and define typed interfaces for your references:

```typescript
import powerbi from "powerbi-visuals-api";
import FormattingId = powerbi.visuals.FormattingId;
import GroupFormattingModelReference = powerbi.visuals.GroupFormattingModelReference;

// Base interface for font-related references — reuse across multiple objects
interface IFontReference extends GroupFormattingModelReference {
    fontFamily?: FormattingId;
    bold?: FormattingId;
    italic?: FormattingId;
    underline?: FormattingId;
    fontSize?: FormattingId;
    color?: FormattingId;
}

// Helper to create font references — avoids repeating objectName + propertyName pairs.
// IMPORTANT: propertyName values MUST match capabilities.json exactly.
const createBaseFontReference = (objectName: string): IFontReference => {
    return {
        fontFamily: { objectName, propertyName: "fontFamily" },
        bold: { objectName, propertyName: "fontBold" },       // NOT "bold" — must match capabilities.json
        italic: { objectName, propertyName: "fontItalic" },    // NOT "italic"
        underline: { objectName, propertyName: "fontUnderline" }, // NOT "underline"
        fontSize: { objectName, propertyName: "fontSize" },
    };
};
```

#### Example references for a legend (composite card with groups):

```typescript
interface ILegendReference extends IFontReference {
    show?: FormattingId;
    showTitle?: FormattingId;
    position?: FormattingId;
    titleText?: FormattingId;
}

// Legend is a composite card with groups: "legendTextGroup" and "legendTitleGroup"
// The groupUid uses the GROUP name, not the card name
const legendReferences: ILegendReference = {
    ...createBaseFontReference("legend"),
    cardUid: "Visual-legend-card",
    groupUid: "legendTextGroup-group",  // matches the group's `name` property, NOT "legend-group"
    show: { objectName: "legend", propertyName: "show" },
    showTitle: { objectName: "legend", propertyName: "showTitle" },
    titleText: { objectName: "legend", propertyName: "titleText" },
    position: { objectName: "legend", propertyName: "position" },
    color: { objectName: "legend", propertyName: "labelColor" },  // NOT "fontColor" — must match capabilities.json
};
```

#### Example references for data labels (simple card with font):

```typescript
interface ILabelsReference extends IFontReference {
    show?: FormattingId;
}

const labelsReferences: ILabelsReference = {
    ...createBaseFontReference("labels"),
    cardUid: "Visual-labels-card",
    groupUid: "labels-group",  // simple card: groupUid = "{cardName}-group"
    show: { objectName: "labels", propertyName: "show" },
    color: { objectName: "labels", propertyName: "color" },
};
```

#### Example references for per-datapoint data colors (shape only):

```typescript
interface IDataPointReference extends GroupFormattingModelReference {
    fill?: FormattingId;
}

const dataPointReferences: IDataPointReference = {
    cardUid: "Visual-dataPoint-card",
    groupUid: "dataPoint-group",
    fill: { objectName: "dataPoint", propertyName: "fill" },
};
```

#### Example references for display settings (non-visual shapes, e.g. axis orientation):

```typescript
interface IDisplayReference extends GroupFormattingModelReference {
    axisBeginning?: FormattingId;
}

const displayReferences: IDisplayReference = {
    cardUid: "Visual-displaySettings-card",
    groupUid: "displaySettings-group",
    axisBeginning: { objectName: "displaySettings", propertyName: "axisBeginning" },
};
```

#### Example references for a line/stroke toggle:

```typescript
interface ILineReference extends GroupFormattingModelReference {
    show?: FormattingId;
}

const linesReferences: ILineReference = {
    cardUid: "Visual-line-card",
    groupUid: "line-group",
    show: { objectName: "line", propertyName: "show" },
};
```

**You MUST create references for every formatting card, not just these examples.**

### Step 5: Set Up the SubSelection Service and VisualOnObjectFormatting

The `HtmlSubSelectionHelper` wraps the raw SubSelection Service (`host.subSelectionService`) and automatically handles:
- Sending `subSelect()` calls when the user clicks an element in format mode
- Sending `updateRegionOutlines()` on hover so Power BI draws highlight rectangles
- Reading subselectable data attributes from DOM elements

```typescript
import {
    HtmlSubSelectableClass,
    HtmlSubSelectionHelper,
    SubSelectableObjectNameAttribute,
    SubSelectableDisplayNameAttribute,
    SubSelectableTypeAttribute,
    SubSelectableDirectEdit as SubSelectableDirectEditAttr,
} from "powerbi-visuals-utils-onobjectutils";

import CustomVisualSubSelection = powerbi.visuals.CustomVisualSubSelection;
import SubSelectionStyles = powerbi.visuals.SubSelectionStyles;
import VisualShortcutType = powerbi.visuals.VisualShortcutType;
import VisualSubSelectionShortcuts = powerbi.visuals.VisualSubSelectionShortcuts;
import SubSelectionStylesType = powerbi.visuals.SubSelectionStylesType;

export class Visual implements powerbi.extensibility.visual.IVisual {
    public visualOnObjectFormatting?: powerbi.extensibility.visual.VisualOnObjectFormatting;
    private subSelectionHelper: HtmlSubSelectionHelper;
    private formatMode: boolean = false;

    constructor(options: powerbi.extensibility.visual.VisualConstructorOptions) {
        // HtmlSubSelectionHelper manages subSelect() and updateRegionOutlines() internally
        this.subSelectionHelper = HtmlSubSelectionHelper.createHtmlSubselectionHelper({
            hostElement: options.element,
            subSelectionService: options.host.subSelectionService,
            selectionIdCallback: (e) => this.selectionIdCallback(e),
            // Optional: provide custom outlines for non-rectangular shapes (polygons, paths, etc.)
            customOutlineCallback: (e) => this.customOutlineCallback(e),
        });

        // IMPORTANT: getSubSelectionShortcuts takes ONLY subSelections — NO second filter parameter
        this.visualOnObjectFormatting = {
            getSubSelectionStyles: (subSelections) => this.getSubSelectionStyles(subSelections),
            getSubSelectionShortcuts: (subSelections) => this.getSubSelectionShortcuts(subSelections),
            getSubSelectables: (filter) => this.getSubSelectables(filter),
        };
    }

    // Called by subSelectionHelper to resolve selectionIds for per-datapoint elements.
    // Use the SubSelectableObjectNameAttribute to determine the element type, then
    // extract the selectionId from the D3 data bound to the element.
    private selectionIdCallback(e: Element): powerbi.visuals.ISelectionId | undefined {
        const elementType: string = d3Select(e).attr(SubSelectableObjectNameAttribute);
        switch (elementType) {
            case "dataPoint": {
                const datum = d3Select<Element, YourSeriesType>(e).datum();
                return datum?.identity;
            }
            default:
                return undefined;
        }
    }

    // Return custom outline fragments for non-rectangular shapes.
    // This makes Power BI draw the exact polygon/path outline instead of a bounding box.
    // CRITICAL: Points must be in VIEWPORT coordinates (relative to hostElement),
    // NOT internal SVG coordinates. You must add offsets for the SVG position,
    // legend margins, and any transforms applied to the chart group.
    private customOutlineCallback(
        subSelection: CustomVisualSubSelection
    ): powerbi.visuals.SubSelectionRegionOutlineFragment[] | undefined {
        const elementType: string = subSelection.customVisualObjects[0].objectName;
        switch (elementType) {
            case "dataPoint": {
                const subSelectionIdentity = subSelection.customVisualObjects[0].selectionId;
                // Find the series data matching this specific selection
                const selectedSeries = this.data.series.find(
                    (series) => series.identity.equals(subSelectionIdentity)
                );
                if (!selectedSeries?.dataPoints) return undefined;

                // Calculate polygon points in VIEWPORT coordinates
                const points = this.calculateOutlinePoints(selectedSeries.dataPoints);
                return [{
                    id: subSelectionIdentity.getKey(),
                    outline: {
                        type: powerbi.visuals.SubSelectionOutlineType.Polygon,
                        points: points,
                    },
                }];
            }
            default:
                return undefined;
        }
    }

    // Calculate outline points in viewport coordinates.
    // Must account for: chart center offset, legend margins, and axis transforms.
    private calculateOutlinePoints(dataPoints: YourDataPoint[]): powerbi.extensibility.IPoint[] {
        const yDomain = this.yScale; // your d3 scale
        const angle = this.angle;

        // Start with chart center position (viewport coordinates)
        let xShift = this.viewport.width / 2;
        let yShift = this.viewport.height / 2;

        // Add legend margins if legend pushes the chart
        const legendPosition = this.legend.getOrientation();
        if (legendPosition === LegendPosition.Left || legendPosition === LegendPosition.LeftCenter) {
            xShift += this.legend.getMargins().width;
        }
        if (legendPosition === LegendPosition.Top || legendPosition === LegendPosition.TopCenter) {
            yShift += this.legend.getMargins().height;
        }

        // Map each data point to its viewport position
        return dataPoints.map((point) => {
            const x = yDomain(point.y) * Math.sin(point.x * angle) + xShift;
            const y = yDomain(point.y) * Math.cos(point.x * angle) + yShift;
            return { x, y };
        });
    }
}
```

**When NOT to use HtmlSubSelectionHelper:** If your visual has complex SVG structures where the helper cannot determine bounding rectangles properly, you can call `host.subSelectionService.subSelect()` and `host.subSelectionService.updateRegionOutlines()` directly. See the "Manual SubSelection Service" section at the end.

### Step 6: Implement getSubSelectionStyles — HANDLE EVERY OBJECT

The switch statement MUST have a case for EVERY formatting object in the visual:

```typescript
private getSubSelectionStyles(
    subSelections: CustomVisualSubSelection[]
): SubSelectionStyles | undefined {
    const visualObject = subSelections[0]?.customVisualObjects[0];
    if (!visualObject) return undefined;

    switch (visualObject.objectName) {
        // Shape-style objects (color fills, borders)
        case 'dataPoint':
            return this.getDataPointStyles(subSelections);

        // Text-style objects (font properties) — e.g., axis labels
        case 'labels':
            return this.getLabelsStyles();

        // Legend (text + show toggle)
        case 'legend':
            return this.getLegendStyles();

        // ADD A CASE FOR EVERY OTHER OBJECT IN capabilities.json
        // ...

        default:
            return undefined;
    }
}
```

#### Shape-style example (data colors with per-datapoint selector):

```typescript
private getDataPointStyles(subSelections: CustomVisualSubSelection[]): SubSelectionStyles {
    const selector = subSelections[0].customVisualObjects[0].selectionId?.getSelector();
    return {
        type: SubSelectionStylesType.Shape,
        fill: {
            reference: { ...dataPointReferences.fill, selector },
            label: 'Fill',
        },
    };
}
```

#### Shape-style with stroke/border (bars, polygons, or series with border properties):

If the visual has border/line properties (e.g., `stroke`, `strokeColor`, `lineWidth`, `borderWidth`), include `stroke` and/or `strokeWidth` in the Shape style. This makes border controls appear in the on-object formatting toolbar.

```typescript
private getBarStyles(subSelections: CustomVisualSubSelection[]): SubSelectionStyles {
    const selector = subSelections[0].customVisualObjects[0].selectionId?.getSelector();
    return {
        type: SubSelectionStylesType.Shape,
        fill: {
            reference: { ...dataPointReferences.fill, selector },
            label: 'Fill',
        },
        // Include stroke if the visual has a separate border/stroke color property
        stroke: {
            reference: { ...bordersReferences.color, selector },
            label: 'Border color',
        },
        // Include strokeWidth if the visual has a border width/line width property
        strokeWidth: {
            reference: { ...bordersReferences.width },
            label: 'Border width',
        },
    };
}
```

**When to include stroke/strokeWidth:**
- If `capabilities.json` has a property for border/line color → add `stroke`
- If `capabilities.json` has a property for border/line width → add `strokeWidth`
- The references can come from a DIFFERENT card than the `fill` (e.g., `fill` from `dataPoint` card, `strokeWidth` from `line` card)
- If stroke color is the SAME property as fill (no separate border color), omit `stroke` from styles and use a Toggle shortcut to show/hide the border instead
```

#### Text-style example (legend with font properties):

The reference spread (`...legendReferences.fontFamily`) copies `objectName` and `propertyName` from the reference. The `label` is a display string shown in the formatting toolbar.

```typescript
private getLegendStyles(): SubSelectionStyles {
    return {
        type: SubSelectionStylesType.Text,
        fontFamily: {
            reference: { ...legendReferences.fontFamily },
            label: legendReferences.fontFamily.propertyName,
        },
        bold: {
            reference: { ...legendReferences.bold },
            label: legendReferences.bold.propertyName,
        },
        italic: {
            reference: { ...legendReferences.italic },
            label: legendReferences.italic.propertyName,
        },
        underline: {
            reference: { ...legendReferences.underline },
            label: legendReferences.underline.propertyName,
        },
        fontSize: {
            reference: { ...legendReferences.fontSize },
            label: legendReferences.fontSize.propertyName,
        },
        fontColor: {
            reference: { ...legendReferences.color },
            label: legendReferences.color.propertyName,
        },
    };
}
```

#### Text-style example (data labels):

```typescript
private getLabelsStyles(): SubSelectionStyles {
    return {
        type: SubSelectionStylesType.Text,
        fontFamily: {
            reference: { ...labelsReferences.fontFamily },
            label: labelsReferences.fontFamily.propertyName,
        },
        bold: {
            reference: { ...labelsReferences.bold },
            label: labelsReferences.bold.propertyName,
        },
        italic: {
            reference: { ...labelsReferences.italic },
            label: labelsReferences.italic.propertyName,
        },
        underline: {
            reference: { ...labelsReferences.underline },
            label: labelsReferences.underline.propertyName,
        },
        fontSize: {
            reference: { ...labelsReferences.fontSize },
            label: labelsReferences.fontSize.propertyName,
        },
        fontColor: {
            reference: { ...labelsReferences.color },
            label: labelsReferences.color.propertyName,
        },
    };
}
```

### Step 7: Implement getSubSelectionShortcuts — HANDLE EVERY OBJECT

**CRITICAL: `getSubSelectionShortcuts` takes ONLY `subSelections` as a parameter.** There is NO second `filter` parameter.

The switch statement MUST have a case for EVERY formatting object:

```typescript
private getSubSelectionShortcuts(
    subSelections: CustomVisualSubSelection[]
): VisualSubSelectionShortcuts | undefined {
    const visualObject = subSelections[0]?.customVisualObjects[0];
    if (!visualObject) return undefined;

    switch (visualObject.objectName) {
        case 'dataPoint':
            return this.getDataPointShortcuts(subSelections);
        case 'labels':
            return this.getLabelsShortcuts();
        case 'legend':
            return this.getLegendShortcuts();
        case 'legendTitleGroup':
            return this.getLegendTitleShortcuts();
        // ADD A CASE FOR EVERY OTHER OBJECT IN capabilities.json
        default:
            return undefined;
    }
}
```

#### Shortcuts for text objects with show/hide toggle:

Use `VisualShortcutType.Divider` to visually separate context menu sections. Provide both `disabledLabel` (shown when toggle is ON, to turn OFF) and `enabledLabel` (shown when toggle is OFF, to turn ON) on Toggle shortcuts.

```typescript
private getLabelsShortcuts(): VisualSubSelectionShortcuts {
    return [
        {
            type: VisualShortcutType.Reset,
            relatedResetFormattingIds: [
                labelsReferences.bold,
                labelsReferences.fontFamily,
                labelsReferences.fontSize,
                labelsReferences.italic,
                labelsReferences.underline,
                labelsReferences.color,
            ],
        },
        {
            type: VisualShortcutType.Toggle,
            ...labelsReferences.show,
            disabledLabel: "Delete data labels",
            enabledLabel: "Add data labels",
        },
        {
            type: VisualShortcutType.Divider,
        },
        {
            type: VisualShortcutType.Navigate,
            destinationInfo: { cardUid: labelsReferences.cardUid },
            label: "Format data labels",
        },
    ];
}
```

#### Shortcuts for legend (composite card with groups, Picker, and multiple Toggles):

For composite cards, use `groupUid` in the Navigate `destinationInfo` to scroll to a specific group. Use `VisualShortcutType.Picker` for enum properties like position.

```typescript
private getLegendShortcuts(): VisualSubSelectionShortcuts {
    return [
        {
            type: VisualShortcutType.Reset,
            relatedResetFormattingIds: [
                legendReferences.bold,
                legendReferences.fontFamily,
                legendReferences.fontSize,
                legendReferences.italic,
                legendReferences.underline,
                legendReferences.color,
                legendReferences.showTitle,
                legendReferences.titleText,
            ],
        },
        {
            type: VisualShortcutType.Picker,
            ...legendReferences.position,
            label: "Position",
        },
        {
            type: VisualShortcutType.Toggle,
            ...legendReferences.show,
            disabledLabel: "Delete legend",
        },
        {
            type: VisualShortcutType.Toggle,
            ...legendReferences.showTitle,
            enabledLabel: "Add legend title",
        },
        {
            type: VisualShortcutType.Divider,
        },
        {
            type: VisualShortcutType.Navigate,
            destinationInfo: { cardUid: legendReferences.cardUid, groupUid: legendReferences.groupUid },
            label: "Format legend",
        },
    ];
}
```

#### Shortcuts for legend title (sub-object of legend composite card):

When a composite card has a title group as a separate subselectable element, create separate shortcuts that navigate to the title group:

```typescript
private getLegendTitleShortcuts(): VisualSubSelectionShortcuts {
    return [
        {
            type: VisualShortcutType.Reset,
            relatedResetFormattingIds: [
                legendReferences.showTitle,
                legendReferences.titleText,
            ],
        },
        {
            type: VisualShortcutType.Toggle,
            ...legendReferences.showTitle,
            disabledLabel: "Delete title",
        },
        {
            type: VisualShortcutType.Divider,
        },
        {
            type: VisualShortcutType.Navigate,
            destinationInfo: { cardUid: legendReferences.cardUid, groupUid: "legendTitleGroup-group" },
            label: "Format title",
        },
    ];
}
```

#### Shortcuts for per-datapoint objects (e.g., data colors):

**CRITICAL: Cross-card shortcuts — Include ALL related formatting controls.**

When a sub-selectable element's appearance is affected by properties from OTHER cards, you MUST include those as shortcuts in the element's shortcuts array. This is what makes Toggle and Picker actions appear in the context menu.

For example, a data point polygon's appearance is affected by:
- Its own fill color (from `dataPoint` card)
- Whether borders/lines are drawn (from `line` card → Toggle shortcut)
- Axis orientation (from `displaySettings` card → Picker shortcut)

**If you only include the Navigate shortcut, the context menu will only show "Format data colors". You MUST explicitly add Toggle and Picker shortcuts for ALL related properties the user should be able to change from that element's context menu.**

Pattern:
1. **Reset** — list ALL resettable properties (from current AND related cards)
2. **Toggle** — for every boolean show/hide property that affects this element (from ANY card)
3. **Picker** — for every enum/dropdown property that affects this element (from ANY card)
4. **Divider** — visual separator
5. **Navigate** — link to the primary formatting card

```typescript
private getDataPointShortcuts(subSelections: CustomVisualSubSelection[]): VisualSubSelectionShortcuts {
    const selector = subSelections[0].customVisualObjects[0].selectionId?.getSelector();
    return [
        {
            type: VisualShortcutType.Reset,
            relatedResetFormattingIds: [
                { ...dataPointReferences.fill, selector },
                // Include properties from OTHER cards that affect this element's appearance:
                displayReferences.axisBeginning,
                linesReferences.show,
            ],
        },
        // Toggle from the LINE card — controls border/stroke visibility on this element
        {
            type: VisualShortcutType.Toggle,
            ...linesReferences.show,
            disabledLabel: "Draw polygons",
            enabledLabel: "Draw lines",
        },
        // Picker from the DISPLAY card — controls axis orientation for this element
        {
            type: VisualShortcutType.Picker,
            ...displayReferences.axisBeginning,
            label: "Axis start position",
        },
        {
            type: VisualShortcutType.Divider,
        },
        {
            type: VisualShortcutType.Navigate,
            destinationInfo: { cardUid: dataPointReferences.cardUid },
            label: "Format data colors",
        },
    ];
}
```

**Generic cross-card shortcut rules — apply to ANY visual:**

| Visual has... | Add to the data element's shortcuts |
|---|---|
| A `show`/`hide` toggle for borders/lines/gridlines | `VisualShortcutType.Toggle` with `...borderReferences.show` |
| A `show`/`hide` toggle for labels on elements | `VisualShortcutType.Toggle` with `...labelsReferences.show` |
| A position/orientation dropdown | `VisualShortcutType.Picker` with `...positionReferences.position` |
| A sort order dropdown | `VisualShortcutType.Picker` with `...sortReferences.order` |
| A line style dropdown (solid/dashed/dotted) | `VisualShortcutType.Picker` with `...lineReferences.style` |

**If a shortcut is missing from the array, it will NOT appear in the context menu — even if the property exists in capabilities.json.**

### Step 8: Implement getSubSelectables

**CRITICAL: Call `getAllSubSelectables()`, NOT `getSubSelectables()`.** The method name on `HtmlSubSelectionHelper` is `getAllSubSelectables`.

```typescript
private getSubSelectables(
    filter?: SubSelectionStylesType
): CustomVisualSubSelection[] | undefined {
    return this.subSelectionHelper.getAllSubSelectables(filter);
}
```

### Step 9: Add Subselection Attributes to ALL Visual DOM Elements

**For EVERY formatting object, find the corresponding DOM element and add attributes.**

The `HtmlSubSelectionHelper` reads these attributes to know which elements are subselectable and what formatting object they map to. Without these attributes, on-object formatting will not work.

| Formatting Object | Typical DOM Element |
|---|---|
| X Axis labels | SVG `<text>` elements in the x-axis group |
| Y Axis labels | SVG `<text>` elements in the y-axis group |
| X Axis line | SVG `<line>` or `<path>` for axis line |
| Legend container | The legend `<div>` or `<g>` wrapper |
| Legend title | The legend title `<text>` element (separate subselectable) |
| Data Colors / Bars / Polygons | Group `<g>` wrapping per-series elements |
| Data Labels | SVG `<text>` elements for label values |
| Title | Title `<text>` element |
| Plot area / Background | The main chart area `<rect>` or container |
| Gridlines | SVG `<line>` elements for gridlines |
| Series | Individual series line/area `<path>` elements |

For D3 selections — data labels example:
```typescript
labelsSelection
    .classed(HtmlSubSelectableClass, this.formatMode && this.formattingSettings.labels.show.value)
    .attr(SubSelectableObjectNameAttribute, 'labels')
    .attr(SubSelectableDisplayNameAttribute, 'Data Labels');
```

For per-datapoint elements (data colors/series) with `SubSelectableTypeAttribute`:
```typescript
chartAreaSelection
    .attr(SubSelectableObjectNameAttribute, 'dataPoint')
    .attr(SubSelectableDisplayNameAttribute, (series) => `"${series.name}" polygon`)
    .attr(SubSelectableTypeAttribute, SubSelectionStylesType.Shape)
    .classed(HtmlSubSelectableClass, this.formatMode);
```

For legend container and legend title (separate subselectables):
```typescript
// Legend container
this.legendElement
    .classed(HtmlSubSelectableClass, this.formatMode && this.formattingSettings.legend.show.value)
    .attr(SubSelectableObjectNameAttribute, 'legend')
    .attr(SubSelectableDisplayNameAttribute, 'Legend');

// Legend title — separate subselectable with direct edit support
this.legendElement.select('.legendTitle')
    .classed(HtmlSubSelectableClass, this.formatMode && showLegend && showTitle)
    .attr(SubSelectableObjectNameAttribute, 'legendTitleGroup')
    .attr(SubSelectableDisplayNameAttribute, 'Title')
    .attr(SubSelectableDirectEditAttr, this.visualTitleEditSubSelection);
```

For HTML elements:
```typescript
element.classList.add(HtmlSubSelectableClass);
element.setAttribute(SubSelectableObjectNameAttribute, 'labels');
element.setAttribute(SubSelectableDisplayNameAttribute, 'Data Labels');
```

**IMPORTANT:** Only add `HtmlSubSelectableClass` when `this.formatMode` is true (and usually also when the element is visible, e.g., `show` toggle is on). In normal mode, elements should NOT be subselectable.

### Step 10: Handle Format Mode in Update

**CRITICAL: `setFormatMode()` takes a boolean (`options.formatMode`), NOT the entire `options` object.**

After calling `setFormatMode`, also call `updateOutlinesFromSubSelections` when in format mode and the update type includes Data, Resize, or FormattingSubSelectionChange. This ensures outlines persist across updates.

```typescript
public update(options: powerbi.extensibility.visual.VisualUpdateOptions): void {
    this.formatMode = options.formatMode;

    // ... render the visual (pass this.formatMode to rendering methods) ...

    // CRITICAL: pass the BOOLEAN, not the options object
    this.subSelectionHelper.setFormatMode(options.formatMode);

    // Persist outlines across data/resize/subselection updates
    const shouldUpdateSubSelection = options.type & (
        powerbi.VisualUpdateType.Data
        | powerbi.VisualUpdateType.Resize
        | powerbi.VisualUpdateType.FormattingSubSelectionChange
    );
    if (this.formatMode && shouldUpdateSubSelection) {
        this.subSelectionHelper.updateOutlinesFromSubSelections(options.subSelections, true);
    }
}
```

### Step 11: Direct Edit Support (Inline Text Editing)

To allow users to edit text directly on the canvas (e.g., legend title), use `SubSelectableDirectEdit`:

```typescript
import SubSelectableDirectEdit = powerbi.visuals.SubSelectableDirectEdit;
import SubSelectableDirectEditStyle = powerbi.visuals.SubSelectableDirectEditStyle;

// Define the direct edit descriptor — reference points to the property to edit
const TitleEdit: SubSelectableDirectEdit = {
    reference: {
        objectName: "legend",
        propertyName: "titleText",
    },
    style: SubSelectableDirectEditStyle.HorizontalLeft,
};

// In the constructor, serialize it for use as an HTML attribute
this.visualTitleEditSubSelection = JSON.stringify(TitleEdit);

// In rendering, set the attribute on the title DOM element
titleElement
    .attr(SubSelectableDirectEditAttr, this.visualTitleEditSubSelection);
```

When the user double-clicks the title element in format mode, Power BI will show an inline text editor that writes directly to the `titleText` property.

### Step 12: Disable Interactivity in Format Mode

**CRITICAL: Normal selection/click behavior MUST be disabled when `formatMode` is true.** Format mode uses clicks for subselection (selecting formatting elements), NOT for data selection. If you don't disable normal interactivity, clicks will trigger data point selection instead of on-object formatting.

#### What to disable in format mode:

1. **Click event handlers** — remove or skip click-to-select behavior on data points
2. **Context menu handlers** — remove visual's custom context menu (Power BI shows its own formatting context menu)
3. **Keyboard navigation** — remove `tabindex`, `role`, `aria-selected`, `aria-label` from data elements (format mode has its own focus model)
4. **Clear selection** — call `selectionHandler.handleClearSelection()` to ensure no data points remain selected

#### Pattern for Interactivity Behavior class:

Pass `formatMode` to your behavior options interface and check it in `bindEvents`:

```typescript
export interface YourBehaviorOptions extends IBehaviorOptions {
    selection: Selection<YourDataPoint>;
    clearCatcher: Selection<any>;
    legend: Selection<any>;
    hasHighlights: boolean;
    formatMode: boolean;  // ← ADD THIS
}

export class YourWebBehavior implements IInteractiveBehavior {
    private selection: Selection<YourDataPoint>;
    private clearCatcher: Selection<any>;
    private legendItems: Selection<any>;

    public bindEvents(options: YourBehaviorOptions, selectionHandler: ISelectionHandler): void {
        this.selection = options.selection;
        this.clearCatcher = options.clearCatcher;
        this.legendItems = options.legend;

        if (options.formatMode) {
            // Format mode: remove ALL interactive event listeners
            this.removeEventListeners();
            // Clear any existing selection so it doesn't interfere
            selectionHandler.handleClearSelection();
        } else {
            // Normal mode: attach all interactive event listeners
            this.addEventListeners(selectionHandler);
        }
    }

    private addEventListeners(selectionHandler: ISelectionHandler): void {
        this.selection.on("click", (event: PointerEvent, dataPoint) => {
            selectionHandler.handleSelection(dataPoint, event.ctrlKey || event.metaKey || event.shiftKey);
            event.stopPropagation();
        });

        this.selection.on("contextmenu", (event: PointerEvent, dataPoint) => {
            selectionHandler.handleContextMenu(dataPoint, { x: event.clientX, y: event.clientY });
            event.preventDefault();
            event.stopPropagation();
        });

        this.clearCatcher.on("click", () => {
            selectionHandler.handleClearSelection();
        });
    }

    private removeEventListeners(): void {
        this.selection.on("click", null);
        this.selection.on("contextmenu", null);
        this.selection.on("keydown", null);
        this.clearCatcher.on("click", null);
        this.clearCatcher.on("contextmenu", null);
        this.legendItems?.on("click", null);
    }

    public renderSelection(hasSelection: boolean): void {
        // ... opacity based on selection state (unchanged)
    }
}
```

#### Pattern for removing keyboard-navigation attributes in format mode:

In the visual's rendering code, strip accessibility attributes from data elements when in format mode. These attributes are for normal data exploration and conflict with format mode's own focus model:

```typescript
// After creating data point elements with accessibility attributes...
dotsSelection
    .attr("tabindex", 0)
    .attr("role", "option")
    .attr("aria-selected", "false")
    .attr("aria-label", (d) => getAriaLabel(d));

// Remove them in format mode
if (this.formatMode) {
    dotsSelection
        .attr("tabindex", null)
        .attr("role", null)
        .attr("aria-selected", null)
        .attr("aria-label", null);
}
```

#### Pattern for passing formatMode to interactivity service:

```typescript
if (this.interactivityService) {
    const behaviorOptions: YourBehaviorOptions = {
        selection: dotsSelection,
        clearCatcher: this.svg,
        legend: this.legendItems,
        hasHighlights: hasHighlights,
        behavior: this.behavior,
        dataPoints: dataPointsToBind,
        formatMode: this.formatMode,  // ← PASS formatMode here
    };
    this.interactivityService.bind(behaviorOptions);
}
```

**Summary of what happens in format mode:**
- ✅ Subselection clicks work (handled by `HtmlSubSelectionHelper`)
- ✅ Hover outlines work (handled by `HtmlSubSelectionHelper`)
- ✅ Power BI's formatting context menu works
- ❌ Data point selection disabled
- ❌ Custom context menus disabled
- ❌ Keyboard navigation on data points disabled

---

## Manual SubSelection Service (Without HtmlSubSelectionHelper)

If `HtmlSubSelectionHelper` does not work for your visual's DOM structure (e.g., complex overlapping SVGs), you can call the SubSelection Service directly:

### Manual subSelect on click

```typescript
private handleFormatModeClick = (event: MouseEvent): void => {
    const cVObject: powerbi.visuals.CustomVisualObject = {
        objectName: "labels",
        selectionId: undefined
    };

    const subSelection: powerbi.visuals.CustomVisualSubSelection = {
        customVisualObjects: [cVObject],
        displayName: "Data Labels",
        selectionOrigin: { x: event.clientX, y: event.clientY },
        subSelectionType: SubSelectionStylesType.Text,
        showUI: true
    };

    this.subSelectionService.subSelect(subSelection);
};
```

### Manual updateRegionOutlines on hover

```typescript
private handleFormatModePointerOver = (event: MouseEvent): void => {
    const element = event.target as HTMLElement;
    const domRect = element.getBoundingClientRect();

    const outline: powerbi.visuals.RectangleSubSelectionOutline = {
        height: domRect.height,
        width: domRect.width,
        x: domRect.x,
        y: domRect.y,
        type: powerbi.visuals.SubSelectionOutlineType.Rectangle
    };

    const regionOutline: powerbi.visuals.SubSelectionRegionOutline = {
        id: "labels",
        visibility: powerbi.visuals.SubSelectionOutlineVisibility.Hover,
        outline
    };

    this.subSelectionService.updateRegionOutlines([regionOutline]);
};
```

### Manual event attachment in update

```typescript
public update(options: powerbi.extensibility.visual.VisualUpdateOptions): void {
    if (options.formatMode) {
        this.hostElement.addEventListener("click", this.handleFormatModeClick);
        this.hostElement.addEventListener("pointerover", this.handleFormatModePointerOver);
    } else {
        this.hostElement.removeEventListener("click", this.handleFormatModeClick);
        this.hostElement.removeEventListener("pointerover", this.handleFormatModePointerOver);
    }
}
```

---

## Shortcut Types

| Type | Description |
|---|---|
| `VisualShortcutType.Navigate` | Scrolls format pane to the relevant card/group |
| `VisualShortcutType.Reset` | Resets changed properties to defaults |
| `VisualShortcutType.Toggle` | Toggles a boolean property (e.g., show/hide). Use `disabledLabel` for the label when turning OFF, `enabledLabel` for turning ON |
| `VisualShortcutType.Picker` | Shows a picker for enumeration/dropdown properties |
| `VisualShortcutType.Divider` | Visual separator between shortcut groups in the context menu |

## SubSelectionStylesType

| Type | Use For |
|---|---|
| `Shape` | Color fills, borders, backgrounds |
| `Text` | Font family, size, bold, italic, underline, color |
| `NumericText` | Numeric display formatting (display units + decimal places + font) |

## CustomVisualSubSelection Properties

| Property | Type | Description |
|---|---|---|
| `customVisualObjects` | `CustomVisualObject[]` | Object names and selection IDs |
| `displayName` | `string` | Localized display name |
| `subSelectionType` | `SubSelectionStylesType` | Shape, Text, or NumericText |
| `selectionOrigin` | `{ x, y }` | Click coordinates |
| `showUI` | `boolean` | Show formatting context menu/toolbar |

## Complete Checklist of What Each Object Needs

For EACH formatting object in the visual, verify ALL of the following:

- [ ] **References object** created with `cardUid`, `groupUid`, and a `FormattingId` for every property
- [ ] **`propertyName` values match `capabilities.json` exactly** (e.g., `fontBold` not `bold`, `labelColor` not `fontColor`)
- [ ] **`groupUid` matches** the pattern `{groupName}-group` (for composite cards, use the group `name`, not the card `name`)
- [ ] **`getSubSelectionStyles` case** added in the switch, returning the correct style type with all relevant properties
- [ ] **`getSubSelectionShortcuts` case** added in the switch, with `Navigate` shortcut (required), `Reset` shortcut (list all resetable properties), `Divider` before Navigate, and optionally `Toggle` (if has `show` property) and `Picker` (if has enum properties)
- [ ] **DOM element** identified and annotated with `HtmlSubSelectableClass`, `SubSelectableObjectNameAttribute`, `SubSelectableDisplayNameAttribute`
- [ ] **`cardUid` matches** the pattern `Visual-{cardName}-card` where `{cardName}` is the `name` property of the card in the formatting settings model
- [ ] **Direct edit** configured for inline-editable text elements (e.g., legend title) using `SubSelectableDirectEditAttr`

## Files That May Need Changes

- `capabilities.json` — Add `supportsOnObjectFormatting` and `enablePointerEventsFormatMode`
- `src/visual.ts` (or main visual file) — Implement `visualOnObjectFormatting` with three methods, set up `HtmlSubSelectionHelper`, handle format mode, annotate DOM elements
- `src/settings.ts` (or formatting settings file) — Verify card names match `cardUid` patterns; define reference objects and interfaces
- `src/dataInterfaces.ts` (or data interfaces file) — Define typed interfaces for references (`IFontReference`, `ILegendReference`, etc.)
- `src/behavior.ts` (or interactivity behavior file) — Add `formatMode` to behavior options, disable event listeners and clear selection in format mode, remove keyboard a11y attributes
- Package dependencies — Add `powerbi-visuals-utils-onobjectutils`
- `stringResources/en-US/resources.resjson` — Add localization keys for on-object labels (e.g., `Visual_OnObject_DeleteLegend`, `Visual_OnObject_FormatLegend`)

## Validation Checklist

- [ ] `supportsOnObjectFormatting: true` in `capabilities.json`
- [ ] `enablePointerEventsFormatMode: true` in `capabilities.json`
- [ ] `HtmlSubSelectionHelper` created in constructor with `hostElement`, `subSelectionService`, `selectionIdCallback`, and optionally `customOutlineCallback`
- [ ] `subSelectionHelper.setFormatMode(options.formatMode)` called in `update` — pass **boolean**, not options object
- [ ] `subSelectionHelper.updateOutlinesFromSubSelections(options.subSelections, true)` called when `formatMode` is true and update type includes Data/Resize/FormattingSubSelectionChange
- [ ] `getSubSelectionShortcuts` takes ONLY `subSelections` parameter — NO `filter` parameter
- [ ] `getSubSelectables` calls `subSelectionHelper.getAllSubSelectables(filter)` — NOT `getSubSelectables`
- [ ] **EVERY** formatting object in `capabilities.json` has a corresponding case in `getSubSelectionStyles`
- [ ] **EVERY** formatting object in `capabilities.json` has a corresponding case in `getSubSelectionShortcuts`
- [ ] **EVERY** formatting object has a `Navigate` shortcut so the format pane scrolls to it
- [ ] **ALL** visual DOM elements that correspond to formatting objects have subselectable HTML attributes (`HtmlSubSelectableClass`, `SubSelectableObjectNameAttribute`, `SubSelectableDisplayNameAttribute`)
- [ ] Subselectable attributes are only added when `formatMode` is true (and element is visible)
- [ ] `getFormattingModel` is also implemented (required for on-object formatting)
- [ ] `cardUid` values in references match the card `name` properties in the formatting settings model
- [ ] `groupUid` values match the group `name` properties (composite cards) or card `name` (simple cards)
- [ ] `propertyName` values in references match `capabilities.json` property names exactly
- [ ] Normal interactivity (click selection, context menu, keyboard nav) is **disabled** when `formatMode` is true
- [ ] `formatMode` is passed to the behavior class and event listeners are removed in format mode
- [ ] `selectionHandler.handleClearSelection()` is called when entering format mode
- [ ] Keyboard accessibility attributes (`tabindex`, `role`, `aria-selected`, `aria-label`) are removed from data elements in format mode
- [ ] No unrelated files were changed

## Common Mistakes to Avoid

1. **Wrong method signature**: `getSubSelectionShortcuts` does NOT take a `filter` parameter — only `subSelections`
2. **Wrong method name**: Use `subSelectionHelper.getAllSubSelectables(filter)`, NOT `.getSubSelectables(filter)`
3. **Wrong `setFormatMode` argument**: Pass `options.formatMode` (boolean), NOT the entire `options` object
4. **Missing `updateOutlinesFromSubSelections`**: Must call after `setFormatMode` to persist outlines
5. **Wrong `propertyName`**: Must match `capabilities.json` exactly (e.g., `fontBold`, `fontItalic`, `fontUnderline`, `labelColor`)
6. **Wrong `groupUid`**: For composite cards, use the group's `name` property, not the card's `name`
7. **Missing `customOutlineCallback`**: Required for non-rectangular shapes (polygons, paths)
8. **Missing `Divider` shortcut**: Use `VisualShortcutType.Divider` to separate context menu sections
9. **Missing `enabledLabel` on Toggle**: Provide both `disabledLabel` and `enabledLabel` for clear UX
10. **Missing `SubSelectableDirectEditAttr`**: Required for inline text editing (e.g., legend title)
11. **Missing cross-card shortcuts**: If an element's appearance is affected by a property from ANOTHER card (e.g., border toggle from a `line` card, orientation picker from a `display` card), you MUST add Toggle/Picker shortcuts for those properties in the element's shortcuts array. Otherwise the context menu will only show Navigate and those controls will be inaccessible.
12. **Missing `stroke`/`strokeWidth` in Shape styles**: If the visual has separate border color and border width properties, include `stroke` and `strokeWidth` in the SubSelectionStyles so the formatting toolbar shows border controls. If borders are toggled on/off without a separate color, use a Toggle shortcut instead.
13. **Not disabling interactivity in format mode**: Click/keyboard handlers on data points MUST be removed when `formatMode` is true. Otherwise, clicking a polygon to format it will instead select the data point. Pass `formatMode` to your behavior class and call `removeEventListeners()` + `selectionHandler.handleClearSelection()` when true.
14. **Leaving keyboard accessibility attributes in format mode**: Remove `tabindex`, `role`, `aria-selected`, `aria-label` from data elements when in format mode — they conflict with Power BI's format mode focus model.

## Reference

- On-Object Formatting: https://learn.microsoft.com/en-us/power-bi/developer/visuals/on-object-formatting-api
- Subselection API: https://learn.microsoft.com/en-us/power-bi/developer/visuals/subselection-api
- On-Object Utils: https://learn.microsoft.com/en-us/power-bi/developer/visuals/utils-on-object
