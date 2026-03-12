# Dialog Box - Reference

Detailed guidance for adding a modal dialog to a Power BI custom visual.

## Prerequisites

- `powerbi-visuals-api` version **5.9.0** or higher in `package.json`.
- `apiVersion` in `pbiviz.json` set to `5.9.0` or higher.
- A bundled HTML file for the dialog content.

## Step-by-step walkthrough

### 1. Create the dialog HTML page

Create `src/dialog.html` (or any path you prefer). This page is rendered inside an isolated iframe by Power BI.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Dialog</title>
  <style>
    body { font-family: "Segoe UI", sans-serif; padding: 16px; }
    button { margin-top: 12px; padding: 8px 16px; }
  </style>
</head>
<body>
  <h2>Confirm action</h2>
  <p id="message">Loading…</p>
  <button id="okBtn">OK</button>
  <button id="cancelBtn">Cancel</button>

  <script>
    // The dialog host is injected by Power BI at runtime.
    var dialogHost = window["dialogHost"];

    // Read initial data sent by the visual.
    var initialData = dialogHost.getInitialData();
    document.getElementById("message").textContent = initialData.message || "Are you sure?";

    document.getElementById("okBtn").addEventListener("click", function () {
      dialogHost.setResult({ confirmed: true });
      dialogHost.close();
    });

    document.getElementById("cancelBtn").addEventListener("click", function () {
      dialogHost.setResult({ confirmed: false });
      dialogHost.close();
    });
  </script>
</body>
</html>
```

### 2. Register the dialog in `pbiviz.json`

Add the dialog HTML file to the `assets` section so it is included in the `.pbiviz` package:

```jsonc
{
  "assets": {
    "icon": "assets/icon.png",
    "dialog": "src/dialog.html"   // <-- add this
  }
}
```

> The exact key name depends on your tooling version. Consult the `powerbi-visuals-tools` docs for the current schema.

### 3. Open the dialog from `visual.ts`

```typescript
import powerbi from "powerbi-visuals-api";
import IDialogCloseResult = powerbi.extensibility.visual.IDialogCloseResult;

// Inside your visual class:
private async showDialog(): Promise<void> {
    const options: powerbi.extensibility.visual.IDialogOptions = {
        actionId: "confirmAction",
        size: { width: 400, height: 250 },
        initialData: { message: "Delete this series?" }
    };

    try {
        const result: IDialogCloseResult = await this.host.openModalDialog(
            "src/dialog.html",
            options
        );
        if (result?.resultData?.confirmed) {
            // User clicked OK - proceed with action.
        }
    } catch (err) {
        // User dismissed without result, or an error occurred.
        console.warn("Dialog dismissed", err);
    }
}
```

### 4. Trigger the dialog

Call `this.showDialog()` from a button click handler, context menu, or any user interaction point within your visual's `update()` flow.

## Checklist

- [ ] `powerbi-visuals-api` >= 5.9.0 in `package.json`.
- [ ] `apiVersion` >= "5.9.0" in `pbiviz.json`.
- [ ] Dialog HTML file created and registered in `pbiviz.json` assets.
- [ ] `openModalDialog()` called with correct path and options.
- [ ] Promise `.catch()` handles dismissed/cancelled dialogs.
- [ ] Dialog content is fully self-contained (no external URLs).
- [ ] Tested in Power BI Desktop and Power BI Service.
- [ ] Dialog size stays within 600 × 400 logical pixels for best compatibility.

## Certification notes

| Requirement                                         | Status |
| --------------------------------------------------- | ------ |
| No external network calls from dialog page          | Required for certification |
| No `eval()` or dynamic code execution in dialog     | Required for certification |
| Dialog assets bundled inside `.pbiviz` package       | Required for certification |
| Works without any additional browser permissions     | Required for certification |

## Troubleshooting

| Symptom                                  | Likely cause                                     |
| ---------------------------------------- | ------------------------------------------------ |
| `openModalDialog is not a function`      | API version below 5.9.0                          |
| Dialog opens but shows blank page        | HTML file not registered in `pbiviz.json` assets |
| `result` is `undefined` after close      | `dialogHost.setResult()` was never called        |
| Dialog content cannot access visual DOM  | Expected - the dialog runs in a sandboxed iframe |
