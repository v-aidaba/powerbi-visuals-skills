# Power BI Visual — Dialog Box (Modal Dialog)

## Overview

The Dialog Box (Modal Dialog) feature allows a Power BI custom visual to open a pop-up dialog window. The dialog runs as a separate visual instance inside a modal overlay. This is useful for showing detailed information, configuration forms, confirmations, or any interactive content that needs user attention.

**Why this matters:** Dialogs provide a dedicated space for complex user interactions (forms, confirmations, settings) without cluttering the visual canvas. They follow the standard Power BI UX pattern and are the only supported way to display modal UI from a custom visual.

**Official documentation:** https://learn.microsoft.com/en-us/power-bi/developer/visuals/create-display-dialog-box

## Requirements

- **API version:** 4.0 or higher (recommended: 5.3.0+)
- **powerbi-visuals-api** package must be installed
- The visual must use `IVisualHost.openModalDialog()` to trigger the dialog
- The `WebAccess` privilege with `openModalDialog` parameter must be declared in `capabilities.json`

## Architecture

A dialog box implementation consists of **two separate visuals**:

1. **Host Visual** – The main visual that calls `openModalDialog()` to open the dialog.
2. **Dialog Visual** – A separate visual class that renders inside the dialog window.

The dialog visual is registered as a separate class in `pbiviz.json` and referenced by its class name when calling `openModalDialog()`.

**Key architectural constraints:**
- The dialog visual does NOT receive `dataViews` — it has no access to the data model
- The dialog visual receives `DialogConstructorOptions` which contains `element` (HTMLElement) and `host` (IDialogHost)
- Communication between host and dialog happens through `IDialogHost.close(actionId, resultState)`, `IDialogHost.setResult(resultState)`, and `sessionStorage`/`localStorage`

**IMPORTANT type notes (common source of compile errors):**
- `DialogConstructorOptions` has property `host` (type `IDialogHost`), NOT `actionService`
- `IDialogHost` is at `powerbi.extensibility.visual.IDialogHost`, NOT `powerbi.extensibility.IDialogActionService`
- `DialogOpenOptions.size` is type `RectSize` (`{ width: number, height: number }`), NOT a number
- `DialogOpenOptions.position` is type `VisualDialogPosition` (`{ type: VisualDialogPositionType }`), NOT a number
- `DialogOpenOptions.actionButtons` is a required `DialogAction[]` array
- `IDialogHost.close()` takes `DialogAction` enum values, NOT strings

---

## Step-by-Step Implementation

### Step 1: Create the Dialog Visual Class

Create a new file `src/dialogVisual.ts`:

```typescript
import powerbi from "powerbi-visuals-api";

import IVisual = powerbi.extensibility.visual.IVisual;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import DialogConstructorOptions = powerbi.extensibility.visual.DialogConstructorOptions;
import IDialogHost = powerbi.extensibility.visual.IDialogHost;
import DialogAction = powerbi.DialogAction;

export class DialogVisual implements IVisual {
    private target: HTMLElement;
    private dialogHost: IDialogHost;

    constructor(options: DialogConstructorOptions) {
        this.target = options.element;
        this.dialogHost = options.host;

        try {
            this.renderDialogContent();
        } catch (error) {
            this.target.textContent = "Error loading dialog content.";
        }
    }

    private renderDialogContent(): void {
        this.target.style.padding = "24px";
        this.target.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        this.target.style.display = "flex";
        this.target.style.flexDirection = "column";
        this.target.style.height = "100%";
        this.target.style.boxSizing = "border-box";

        // Title
        const title = document.createElement("h2");
        title.textContent = "Dialog Title";
        title.style.margin = "0 0 12px 0";
        this.target.appendChild(title);

        // Description
        const description = document.createElement("p");
        description.textContent = "Dialog content goes here.";
        description.style.margin = "0 0 16px 0";
        this.target.appendChild(description);

        // Spacer
        const spacer = document.createElement("div");
        spacer.style.flex = "1";
        this.target.appendChild(spacer);

        // Button row
        const buttonRow = document.createElement("div");
        buttonRow.style.display = "flex";
        buttonRow.style.justifyContent = "flex-end";
        buttonRow.style.gap = "10px";
        buttonRow.style.borderTop = "1px solid #e0e0e0";
        buttonRow.style.paddingTop = "16px";

        // OK button
        const okButton = document.createElement("button");
        okButton.textContent = "OK";
        okButton.style.padding = "8px 24px";
        okButton.style.border = "none";
        okButton.style.borderRadius = "4px";
        okButton.style.backgroundColor = "#0078d4";
        okButton.style.color = "#ffffff";
        okButton.style.cursor = "pointer";
        okButton.addEventListener("click", () => {
            this.dialogHost.close(DialogAction.OK);
        });
        buttonRow.appendChild(okButton);

        // Close button
        const closeButton = document.createElement("button");
        closeButton.textContent = "Close";
        closeButton.style.padding = "8px 24px";
        closeButton.style.border = "1px solid #8a8886";
        closeButton.style.borderRadius = "4px";
        closeButton.style.backgroundColor = "#ffffff";
        closeButton.style.color = "#333";
        closeButton.style.cursor = "pointer";
        closeButton.addEventListener("click", () => {
            this.dialogHost.close(DialogAction.Close);
        });
        buttonRow.appendChild(closeButton);

        this.target.appendChild(buttonRow);
    }

    public update(options: VisualUpdateOptions): void {
        // Dialog visuals do not receive data updates — this method is never called
    }
}
```

### Step 2: Update the Host Visual to Open the Dialog

In your main visual file (e.g. `src/visual.ts`), add the necessary imports, a trigger button, and the `openModalDialog()` call.

**Add these imports** to the existing import section:

```typescript
import DialogOpenOptions = powerbi.extensibility.visual.DialogOpenOptions;
import DialogAction = powerbi.DialogAction;
import VisualDialogPositionType = powerbi.VisualDialogPositionType;
```

**Add the trigger button** at the end of the `constructor`:

```typescript
        // Dialog trigger button
        const openDialogBtn = document.createElement("button");
        openDialogBtn.textContent = "Details";
        openDialogBtn.style.position = "absolute";
        openDialogBtn.style.top = "5px";
        openDialogBtn.style.right = "5px";
        openDialogBtn.style.padding = "4px 12px";
        openDialogBtn.style.border = "none";
        openDialogBtn.style.borderRadius = "4px";
        openDialogBtn.style.backgroundColor = "#0078d4";
        openDialogBtn.style.color = "#ffffff";
        openDialogBtn.style.cursor = "pointer";
        openDialogBtn.style.fontSize = "12px";
        openDialogBtn.style.zIndex = "1000";
        openDialogBtn.addEventListener("click", () => this.openDialog());
        element.appendChild(openDialogBtn);
```

**Add the dialog method** to the class (e.g. after `getFormattingModel()`):

```typescript
    private isDialogOpen: boolean = false;

    public openDialog(): void {
        if (this.isDialogOpen) return;
        this.isDialogOpen = true;

        const dialogOptions: DialogOpenOptions = {
            title: "Visual Details",
            size: { width: 600, height: 400 },
            position: { type: VisualDialogPositionType.Center },
            actionButtons: [DialogAction.OK, DialogAction.Close]
        };

        this.visualHost.openModalDialog(
            "DialogVisual",
            dialogOptions,
            {}
        ).then((result) => {
            this.isDialogOpen = false;
            if (!result || !result.actionId) {
                return;
            }
            // Handle result.actionId and result.resultState here
        }).catch(() => {
            this.isDialogOpen = false;
        });
    }
```

**Note:** Replace `this.visualHost` with whatever your visual uses as the IVisualHost reference (e.g. `this.host`).

### Step 3: Register the Dialog Visual in `pbiviz.json`

Add the `dialogVisual` section at the top level (sibling to `visual` and `apiVersion`):

```json
{
    "apiVersion": "5.3.0",
    "visual": {
        "name": "yourVisualName",
        "displayName": "Your Visual",
        "guid": "yourVisualGUID",
        "visualClassName": "Visual",
        "version": "1.0.0.0"
    },
    "dialogVisual": {
        "displayName": "DialogVisual",
        "visualClassName": "DialogVisual"
    }
}
```

**Critical:** `dialogVisual.visualClassName` must **exactly** match the exported class name in `src/dialogVisual.ts`.

### Step 4: Update `tsconfig.json`

Add the dialog visual file to the `files` array:

```json
{
    "compilerOptions": {
        "allowJs": false,
        "emitDecoratorMetadata": true,
        "experimentalDecorators": true,
        "target": "es2022",
        "sourceMap": true,
        "outDir": "./.tmp/build/",
        "moduleResolution": "node",
        "declaration": true,
        "lib": ["es2022", "dom"]
    },
    "files": [
        "./src/visual.ts",
        "./src/dialogVisual.ts"
    ]
}
```

### Step 5: Add the `openModalDialog` Privilege in `capabilities.json`

```json
{
    "dataRoles": [],
    "dataViewMappings": [],
    "privileges": [
        {
            "name": "WebAccess",
            "essential": true,
            "parameters": [
                "openModalDialog"
            ]
        }
    ]
}
```

If you already have a `privileges` array, add the `WebAccess` entry to it. The `"openModalDialog"` parameter is **required** — without it the dialog will be silently blocked.

---

## Common Patterns

### Confirmation Dialog

```typescript
private async confirmAction(): Promise<boolean> {
    try {
        const result = await this.host.openModalDialog(
            "DialogVisual",
            {
                title: "Confirm Action",
                size: { width: 400, height: 300 },
                position: { type: VisualDialogPositionType.Center },
                actionButtons: [DialogAction.OK, DialogAction.Cancel]
            },
            {}
        );
        return result?.actionId === DialogAction.OK;
    } catch {
        return false;
    }
}
```

### Settings / Configuration Dialog

Build a form in the dialog visual, collect values, and pass via `dialogHost.setResult()` then `dialogHost.close()`:

```typescript
// In the dialog visual — serialize form data on OK:
okButton.addEventListener("click", () => {
    const formData = { name: nameInput.value, color: colorPicker.value };
    this.dialogHost.setResult(formData);
    this.dialogHost.close(DialogAction.OK);
});

// In the host visual — read the resultState:
this.host.openModalDialog("DialogVisual", dialogOptions, {}).then((result) => {
    if (result.actionId === DialogAction.OK && result.resultState) {
        const formData = result.resultState as { name: string; color: string };
        // Use formData...
    }
});
```

### Passing Data to the Dialog (sessionStorage)

The dialog visual does **not** receive dataViews. Use `sessionStorage` to share data:

```typescript
// Host visual — set data before opening dialog:
sessionStorage.setItem("dialogData", JSON.stringify({ items: this.dataPoints }));

// Dialog visual constructor — read data:
const data = JSON.parse(sessionStorage.getItem("dialogData") || "{}");
```

**Important:** Always clear sensitive data from storage after the dialog closes.

---

## API Reference

### DialogOpenOptions (passed to `openModalDialog`)

| Property | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | Yes | Title bar text of the dialog |
| `size` | `RectSize` | No | `{ width: number, height: number }` — dialog dimensions in pixels |
| `position` | `VisualDialogPosition` | No | `{ type: VisualDialogPositionType.Center }` or `{ type: VisualDialogPositionType.RelativeToVisual }` |
| `actionButtons` | `DialogAction[]` | Yes | Array of action buttons (e.g. `[DialogAction.OK, DialogAction.Close]`) |

### RectSize

```typescript
interface RectSize {
    width: number;
    height: number;
}
```

### VisualDialogPosition

```typescript
interface VisualDialogPosition {
    type: VisualDialogPositionType;
    left?: number;
    top?: number;
}
```

### DialogConstructorOptions (received by dialog visual)

| Property | Type | Description |
|---|---|---|
| `element` | `HTMLElement` | DOM element for the dialog visual to render into |
| `host` | `IDialogHost` | Service to close the dialog and return a result |

### IDialogHost

| Method | Description |
|---|---|
| `setResult(resultState: object)` | Sets the result data without closing the dialog |
| `close(actionId: DialogAction, resultState?: object)` | Closes the dialog with an action and optional result |

### DialogAction (const enum in `powerbi` namespace)

| Value | Number | Description |
|---|---|---|
| `DialogAction.Close` | 0 | Dialog dismissed |
| `DialogAction.OK` | 1 | User confirmed |
| `DialogAction.Cancel` | 2 | User cancelled |
| `DialogAction.Continue` | 3 | Continue action |
| `DialogAction.No` | 4 | User said no |
| `DialogAction.Yes` | 5 | User said yes |

### VisualDialogPositionType (const enum in `powerbi` namespace)

| Value | Number | Description |
|---|---|---|
| `VisualDialogPositionType.Center` | 0 | Centered on screen |
| `VisualDialogPositionType.RelativeToVisual` | 1 | Positioned relative to the visual |

### ModalDialogResult (received by host visual)

| Property | Type | Description |
|---|---|---|
| `actionId` | `DialogAction` | The action enum value from the dialog |
| `resultState` | `object` | The result object set via `setResult()` or passed to `close()` |

### openModalDialog Signature

```typescript
openModalDialog: (dialogId: string, options?: DialogOpenOptions, initialState?: object) => IPromise<ModalDialogResult>
```

- `dialogId` — The class name of the dialog visual (must match `pbiviz.json` `dialogVisual.visualClassName`)
- `options` — Dialog configuration (size, position, action buttons)
- `initialState` — Optional object passed to the dialog (accessible in dialog via constructor)

---

## Import Reference

### Host Visual Imports

```typescript
import powerbi from "powerbi-visuals-api";
import DialogOpenOptions = powerbi.extensibility.visual.DialogOpenOptions;
import DialogAction = powerbi.DialogAction;
import VisualDialogPositionType = powerbi.VisualDialogPositionType;
```

### Dialog Visual Imports

```typescript
import powerbi from "powerbi-visuals-api";
import IVisual = powerbi.extensibility.visual.IVisual;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import DialogConstructorOptions = powerbi.extensibility.visual.DialogConstructorOptions;
import IDialogHost = powerbi.extensibility.visual.IDialogHost;
import DialogAction = powerbi.DialogAction;
```

### WRONG imports (will cause compile errors):

```typescript
// ❌ WRONG — IDialogActionService does not exist
import IDialogActionService = powerbi.extensibility.IDialogActionService;

// ❌ WRONG — actionService does not exist on DialogConstructorOptions
this.dialogActionService = options.actionService;

// ✅ CORRECT — use IDialogHost from options.host
import IDialogHost = powerbi.extensibility.visual.IDialogHost;
this.dialogHost = options.host;
```

---

## Edge Cases & Pitfalls

### Edge Case 1: Dialog class name mismatch

The most common issue — dialog opens but is blank or throws an error:

```json
// pbiviz.json — class name must EXACTLY match
"dialogVisual": {
    "visualClassName": "DialogVisual"  // ✅ Must match export class DialogVisual
}
```

```typescript
// WRONG — name mismatch
this.host.openModalDialog("dialogVisual", ...);  // ❌ lowercase 'd'

// CORRECT — exact class name
this.host.openModalDialog("DialogVisual", ...);  // ✅ matches export
```

### Edge Case 2: Missing privilege declaration

Without the privilege, `openModalDialog` silently fails or throws:

```json
// WRONG — missing openModalDialog parameter
"privileges": [
    { "name": "WebAccess", "essential": true, "parameters": [] }  // ❌
]

// CORRECT — include the parameter
"privileges": [
    { "name": "WebAccess", "essential": true, "parameters": ["openModalDialog"] }  // ✅
]
```

### Edge Case 3: Dialog visual not in tsconfig.json

If you forget to add the dialog file, webpack won't bundle it:

```json
// WRONG — missing dialog file
"files": ["./src/visual.ts"]  // ❌ DialogVisual won't be found

// CORRECT — include both files
"files": ["./src/visual.ts", "./src/dialogVisual.ts"]  // ✅
```

### Edge Case 4: Using wrong types for size and position

```typescript
// ❌ WRONG — size and position cannot be plain numbers
const dialogOptions: DialogOpenOptions = {
    title: "My Dialog",
    size: 0,                    // ❌ Type 'number' is not assignable to type 'RectSize'
    position: 0,                // ❌ Type 'number' is not assignable to type 'VisualDialogPosition'
    actionButtons: []
};

// ✅ CORRECT — use proper object types
const dialogOptions: DialogOpenOptions = {
    title: "My Dialog",
    size: { width: 600, height: 400 },
    position: { type: VisualDialogPositionType.Center },
    actionButtons: [DialogAction.OK, DialogAction.Close]
};
```

### Edge Case 5: User closes dialog via X button or Escape key

When the user closes the dialog using the browser's X button or Escape, the promise may reject or return undefined. Always handle this:

```typescript
this.host.openModalDialog("DialogVisual", dialogOptions, {}).then((result) => {
    if (!result || !result.actionId) {
        // User closed without action (X button, Escape)
        return;
    }
    // Process result...
}).catch((error) => {
    // Dialog was dismissed or failed to open
    console.warn("Dialog dismissed:", error);
});
```

### Edge Case 6: Opening multiple dialogs

Power BI only supports **one dialog at a time**. If you try to open a second dialog while one is already open, it will be rejected:

```typescript
// WRONG — opening while another is open
this.showDialog();
this.showDialog();  // ❌ Second call will fail

// CORRECT — guard against double-open
private isDialogOpen = false;

private async showDialog(): Promise<void> {
    if (this.isDialogOpen) return;  // Prevent double-open
    this.isDialogOpen = true;

    try {
        const result = await this.host.openModalDialog("DialogVisual", dialogOptions, {});
        // Process result...
    } finally {
        this.isDialogOpen = false;
    }
}
```

### Edge Case 7: Large data in sessionStorage

`sessionStorage` has a ~5MB limit. For large datasets, pass only the necessary subset:

```typescript
// WRONG — dumping entire dataset
sessionStorage.setItem("dialogData", JSON.stringify(this.allDataPoints));  // ❌ May exceed limit

// CORRECT — pass only what the dialog needs
const dialogPayload = {
    selectedItem: this.selectedDataPoint,
    options: this.configOptions
};
sessionStorage.setItem("dialogData", JSON.stringify(dialogPayload));  // ✅
```

### Edge Case 8: Dialog visual constructor throws

If the dialog visual constructor throws an error, the dialog will appear blank. Always wrap initialization in try/catch:

```typescript
constructor(options: DialogConstructorOptions) {
    this.target = options.element;
    this.dialogHost = options.host;

    try {
        this.renderDialogContent();
    } catch (error) {
        this.target.textContent = "Error loading dialog content.";
        console.error("Dialog init error:", error);
    }
}
```

### Edge Case 9: Passing strings to dialogHost.close()

```typescript
// ❌ WRONG — close() takes DialogAction enum, NOT strings
this.dialogHost.close("accepted");
this.dialogHost.close("closed");

// ✅ CORRECT — use DialogAction enum values
this.dialogHost.close(DialogAction.OK);
this.dialogHost.close(DialogAction.Close);
```

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why It's Wrong | Fix |
|---|---|---|
| Class name mismatch between code and `pbiviz.json` | Dialog won't load, appears blank | Ensure exact string match (case-sensitive) |
| Missing `"openModalDialog"` in privileges | Dialog silently blocked | Add to `capabilities.json` privileges |
| Not handling promise rejection | Unhandled promise error on dismiss | Always add `.catch()` or try/catch |
| Opening dialog during `update()` | Can cause infinite loops or UI freezes | Only open on user interaction (click) |
| Storing sensitive data in sessionStorage without clearing | Data persists until tab closes | Clear immediately after dialog closes |
| Relying on dialog `update()` being called | Dialog never receives updates | Put all logic in constructor |
| Using `options.actionService` | Property doesn't exist, compile error | Use `options.host` (type `IDialogHost`) |
| Using `IDialogActionService` type | Doesn't exist in namespace | Use `IDialogHost` from `powerbi.extensibility.visual` |
| Passing numbers for `size`/`position` | Type mismatch compile error | Use `RectSize` and `VisualDialogPosition` objects |
| Passing strings to `close()` | Type mismatch, won't compile | Use `DialogAction` enum values |

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `'IDialogActionService' has no exported member` | Use `IDialogHost` from `powerbi.extensibility.visual.IDialogHost` instead |
| `'actionService' does not exist on type 'DialogConstructorOptions'` | Use `options.host` (not `options.actionService`) |
| `Type 'number' is not assignable to type 'RectSize'` | Use `{ width: 600, height: 400 }` instead of a number |
| `Type 'number' is not assignable to type 'VisualDialogPosition'` | Use `{ type: VisualDialogPositionType.Center }` instead of a number |
| Dialog doesn't open | Ensure `"openModalDialog"` is in `capabilities.json` privileges |
| `openModalDialog is not a function` | Update `powerbi-visuals-api` to version 4.0+ |
| Dialog opens but is blank | Verify `dialogVisualClassName` in `pbiviz.json` matches the class name |
| Dialog visual not found at runtime | Make sure dialog class is exported and in `tsconfig.json` files array |
| Result is undefined | Ensure dialog calls `dialogHost.close(DialogAction.OK)` before closing |
| Only Close button works | Make sure both button click handlers call `dialogHost.close()` with appropriate `DialogAction` |
| Dialog doesn't open in published report | WebAccess privilege must have `"essential": true` |

---

## Files That May Need Changes

- `src/dialogVisual.ts` — **New file**: Dialog visual class
- `src/visual.ts` — **Updated**: Add imports, trigger button in constructor, and `openDialog()` method
- `pbiviz.json` — **Updated**: Add `dialogVisual` section
- `tsconfig.json` — **Updated**: Add `./src/dialogVisual.ts` to files array
- `capabilities.json` — **Updated**: Add `WebAccess` privilege with `openModalDialog`

## Validation Checklist

- [ ] `src/dialogVisual.ts` exists with a class implementing `IVisual`
- [ ] Dialog class uses `DialogConstructorOptions` (not `VisualConstructorOptions`)
- [ ] Dialog class accesses `options.host` (not `options.actionService`)
- [ ] Dialog class stores host as `IDialogHost` (not `IDialogActionService`)
- [ ] `dialogHost.close(DialogAction.XX)` is called with enum values in every button handler
- [ ] `pbiviz.json` has `dialogVisual.visualClassName` matching the exact class name
- [ ] `tsconfig.json` includes `./src/dialogVisual.ts` in the `files` array
- [ ] `capabilities.json` has `WebAccess` privilege with `"openModalDialog"` parameter
- [ ] Host visual imports `DialogOpenOptions`, `DialogAction`, and `VisualDialogPositionType`
- [ ] Host visual uses `size: { width: N, height: N }` (not a plain number)
- [ ] Host visual uses `position: { type: VisualDialogPositionType.Center }` (not a plain number)
- [ ] Host visual provides `actionButtons: [DialogAction.OK, DialogAction.Close]`
- [ ] Host visual handles both `.then()` and `.catch()` for `openModalDialog`
- [ ] Host visual has `isDialogOpen` guard to prevent double-opening
- [ ] Host visual has a button (or other user interaction) that triggers the dialog
- [ ] Dialog is only opened on user interaction (not during `update()`)
- [ ] Sensitive data in `sessionStorage` is cleared after dialog closes
- [ ] No unrelated files were changed

## Reference

Official Microsoft documentation: https://learn.microsoft.com/en-us/power-bi/developer/visuals/create-display-dialog-box
