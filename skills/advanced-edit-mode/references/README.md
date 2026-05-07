# Power BI Visual — Advanced Edit Mode

## Overview

Advanced Edit Mode allows a Power BI custom visual to display a specialized editing interface when the user clicks the **Edit** button in report editing mode. This is useful for complex visuals that need a configuration UI, data mapping interface, or other advanced controls that aren't needed during normal viewing.

When Advanced Edit Mode is enabled, Power BI shows an **Edit** button on the visual. Clicking it triggers an `update()` call with `EditMode` set to `Advanced`, allowing the visual to switch to its editing interface.

**Official documentation:** https://learn.microsoft.com/en-us/power-bi/developer/visuals/advanced-edit-mode

## Requirements

- **powerbi-visuals-api** package must be installed
- `advancedEditModeSupport` must be set in `capabilities.json`

> **CRITICAL — Property name:** The correct property name is **`advancedEditModeSupport`** (NOT `advancedEditMode`). Using `advancedEditMode` will cause a JSON schema validation error: _"Property advancedEditMode is not allowed."_

## Step-by-Step Implementation

### Step 1: Enable Advanced Edit Mode in capabilities.json

Add the `advancedEditModeSupport` property to your `capabilities.json` file at the **top level** (not inside `objects` or any other nested block). Set it to `1` or `2` depending on the desired behavior:

```json
{
    "advancedEditModeSupport": 1
}
```

**Merge into existing capabilities.json — do NOT replace the file.** For example, if your `capabilities.json` already has `dataRoles`, `dataViewMappings`, and `objects`, add `advancedEditModeSupport` as a sibling property:

```json
{
    "dataRoles": [ ... ],
    "dataViewMappings": [ ... ],
    "objects": { ... },
    "advancedEditModeSupport": 1
}
```

| Value | Constant | Behavior |
|---|---|---|
| `0` | `NotSupported` | Advanced edit mode is disabled. The Edit button does **not** appear on the visual. This is the default if the property is omitted. |
| `1` | `SupportedNoAction` | The visual supports edit mode in the **normal viewport**. The Edit button appears, and clicking it triggers `update()` with `EditMode.Advanced`. The host does not take any additional action (no focus mode). |
| `2` | `SupportedInFocus` | The visual supports edit mode in **Focus mode only**. Clicking the Edit button causes Power BI to pop the visual into Focus mode first, then trigger the advanced edit update. Use this when the editing UI needs more screen space. |

### Step 2: Detect Edit Mode in the Update Method

In your `src/visual.ts`, check `options.editMode` in the `update()` method to determine if the visual is currently in advanced edit mode. When the user clicks the **Edit** button, Power BI calls `update()` with `editMode` set to `EditMode.Advanced` (value `1`). When the user exits edit mode, `update()` is called again with `EditMode.Default` (value `0`).

```typescript
import powerbi from "powerbi-visuals-api";
import EditMode = powerbi.EditMode;

export class Visual implements powerbi.extensibility.visual.IVisual {
    private host: powerbi.extensibility.visual.IVisualHost;
    private target: HTMLElement;
    private isEditMode: boolean = false;

    constructor(options: powerbi.extensibility.visual.VisualConstructorOptions) {
        this.host = options.host;
        this.target = options.element;
    }

    public update(options: powerbi.extensibility.visual.VisualUpdateOptions): void {
        // Check if the visual is in advanced edit mode
        this.isEditMode = options.editMode === EditMode.Advanced;

        if (this.isEditMode) {
            // User clicked "Edit" — show configuration/editing UI
            this.renderEditView(options);
        } else {
            // Normal view — show the standard data visualization
            this.renderNormalView(options);
        }
    }
}
```

> **NOTE:** The `options.editMode` property is only populated when `advancedEditModeSupport` is set to `1` or `2` in `capabilities.json`. If the property is missing or set to `0`, `editMode` will always be `EditMode.Default`.

### Step 3: Build the Edit Mode UI

Create a separate editing interface that appears when the visual enters advanced edit mode. This UI should provide configuration controls relevant to your visual — for example, axis settings, color mappings, thresholds, or data field assignments.

```typescript
private renderEditView(options: powerbi.extensibility.visual.VisualUpdateOptions): void {
    this.target.innerHTML = "";

    const editContainer = document.createElement("div");
    editContainer.className = "edit-mode-container";
    editContainer.style.padding = "16px";
    editContainer.style.border = "2px dashed #0078d4";

    const title = document.createElement("h2");
    title.textContent = "Visual Configuration";
    editContainer.appendChild(title);

    const description = document.createElement("p");
    description.textContent = "Use the controls below to configure your visual. Click 'Back to report' to return to normal view.";
    editContainer.appendChild(description);

    // Add configuration controls specific to your visual here
    // Examples: input fields, dropdowns, toggle switches, etc.

    this.target.appendChild(editContainer);
}

private renderNormalView(options: powerbi.extensibility.visual.VisualUpdateOptions): void {
    this.target.innerHTML = "";
    // Render the standard data visualization here
}
```

> **TIP:** When `advancedEditModeSupport` is set to `2` (`SupportedInFocus`), a **"Back to report"** button is automatically shown by Power BI. The user clicks it to exit Focus mode and return to normal view.

## EditMode Enum Values

| Value | Enum | Description |
|---|---|---|
| `0` | `EditMode.Default` | Normal view mode — the visual displays its standard data visualization |
| `1` | `EditMode.Advanced` | Advanced edit mode — the user clicked the Edit button and expects a configuration UI |

## Common Mistakes

| Mistake | Fix |
|---|---|
| Using `advancedEditMode` instead of `advancedEditModeSupport` | The correct property name is **`advancedEditModeSupport`**. Using `advancedEditMode` causes a schema validation error: _"Property advancedEditMode is not allowed."_ |
| Placing `advancedEditModeSupport` inside `"objects"` | This is a **top-level** property in `capabilities.json`, not nested inside `"objects"` or any other block |
| Not checking `options.editMode` in `update()` | Without checking `editMode`, the visual won't know when to switch between normal and edit views |
| Setting `advancedEditModeSupport` to `0` (or omitting it) and expecting the Edit button | Value `0` means "not supported" — the Edit button only appears with value `1` or `2` |

## Files That May Need Changes

| File | What to Change |
|---|---|
| `capabilities.json` | Add `"advancedEditModeSupport": 1` or `"advancedEditModeSupport": 2` at the top level |
| `src/visual.ts` | Check `options.editMode === EditMode.Advanced` in `update()` and render edit vs. normal UI |

## Validation Checklist

- [ ] `capabilities.json` has `"advancedEditModeSupport"` set to `1` or `2` (NOT `"advancedEditMode"` — that property name is invalid)
- [ ] `advancedEditModeSupport` is at the **top level** of `capabilities.json` (not nested inside `objects`)
- [ ] `options.editMode` is checked against `EditMode.Advanced` in the `update()` method
- [ ] The visual shows a distinct editing UI when `EditMode.Advanced` is active
- [ ] The visual returns to normal rendering when `EditMode.Default` is active
- [ ] No unrelated files were changed

## Reference

Official Microsoft documentation: https://learn.microsoft.com/en-us/power-bi/developer/visuals/advanced-edit-mode
