# Power BI Visual — File Download API

## Overview

The File Download API lets users download data from a custom visual into a file on their device. The API supports multiple file formats (.txt, .csv, .json, .xml, .pdf, .xlsx, .tmplt) and requires both a privilege declaration in capabilities.json and admin permission.

**Official documentation:** https://learn.microsoft.com/en-us/power-bi/developer/visuals/file-download-api

## Requirements

- **API version:** 4.5 or higher (`exportVisualsContent`), 4.6 (`status`), 5.3 (`exportVisualsContentExtended`)
- **powerbi-visuals-api** package must be installed
- The download privilege must be declared in `capabilities.json`
- Admin must enable the download switch
- This is a **privileged API**

## Step-by-Step Implementation

### Step 1: Declare the Download Privilege in capabilities.json

```json
{
    "privileges": [
        {
            "name": "ExportContent"
        }
    ]
}
```

### Step 2: Access the Download Service

```typescript
import powerbi from "powerbi-visuals-api";
import IDownloadService = powerbi.extensibility.IDownloadService;

export class Visual implements powerbi.extensibility.visual.IVisual {
    private downloadService: IDownloadService;

    constructor(options: powerbi.extensibility.visual.VisualConstructorOptions) {
        this.downloadService = options.host.downloadService;
    }
}
```

### Step 3: Check Status and Export Content

```typescript
private async downloadContent(): Promise<void> {
    try {
        // Check if download is allowed (API 4.6+)
        const status = await this.downloadService.exportStatus();

        if (status === powerbi.PrivilegeStatus.Allowed) {
            // Export text file
            const result = await this.downloadService.exportVisualsContent(
                "Hello, World!",     // content
                "export.txt",        // filename
                "txt",               // fileType
                "Text file export"   // fileDescription
            );

            if (result) {
                console.log("Download completed");
            }
        } else {
            console.log("Download not allowed:", status);
        }
    } catch (error) {
        console.error("Download failed:", error);
    }
}
```

### Step 4: Export Binary Content (PDF, XLSX)

For binary files, use `base64` as the fileType:

```typescript
private async downloadExcel(base64Content: string): Promise<void> {
    const status = await this.downloadService.exportStatus();

    if (status === powerbi.PrivilegeStatus.Allowed) {
        // Use exportVisualsContentExtended for more result details (API 5.3+)
        const result = await this.downloadService.exportVisualsContentExtended(
            base64Content,       // content in base64
            "report.xlsx",       // filename
            "base64",            // fileType for binary
            "Excel report"       // fileDescription
        );

        if (result.downloadCompleted) {
            console.log("Downloaded:", result.fileName);
        }
    }
}
```

### Step 5: Add a Download Trigger

```typescript
constructor(options: powerbi.extensibility.visual.VisualConstructorOptions) {
    this.downloadService = options.host.downloadService;

    const downloadBtn = document.createElement("button");
    downloadBtn.textContent = "Download";
    downloadBtn.addEventListener("click", () => this.downloadContent());
    options.element.appendChild(downloadBtn);
}
```

### Step 6: Handle Dev Mode (Important)

**The File Download API does NOT work in dev mode (`pbiviz start`).** In dev mode, `exportStatus()` returns `NotDeclared` or `DisabledByAdmin`, and all browser-based download alternatives (`window.open()`, `Blob` + `<a>` click, `data:` URIs) are blocked by the Power BI iframe sandbox.

**This is expected behavior.** The download will only work when the visual is published and the admin has enabled the download privilege.

To avoid silent failures and to allow testing during development, always add a clipboard fallback:

```typescript
private async downloadContent(): Promise<void> {
    if (!this.data) return;

    const csvContent = this.buildCsvContent();

    // 1. Try the official Power BI download service (works only when published + admin allows)
    try {
        if (this.downloadService) {
            const status = await this.downloadService.exportStatus();
            if (status === powerbi.PrivilegeStatus.Allowed) {
                await this.downloadService.exportVisualsContent(
                    csvContent, "export.csv", "csv", "Data Export"
                );
                return;
            }
        }
    } catch (e) {
        // Service not available (dev mode or unsupported environment)
    }

    // 2. Fallback: copy to clipboard so developer can verify the output
    try {
        await navigator.clipboard.writeText(csvContent);
        console.log("Dev mode: CSV copied to clipboard (" + csvContent.length + " chars)");
    } catch (e) {
        console.warn("Export not available: requires published visual + admin permission");
    }
}
```

## Download Service Methods

| Method | API Version | Returns | Description |
|---|---|---|---|
| `exportStatus()` | 4.6+ | `Promise<PrivilegeStatus>` | Check if downloads are allowed |
| `exportVisualsContent(content, filename, fileType, desc)` | 4.5+ | `Promise<boolean>` | Download a file |
| `exportVisualsContentExtended(content, filename, fileType, desc)` | 5.3+ | `Promise<ExportContentResultInfo>` | Download with extended result info |

## Supported File Types

`.txt`, `.csv`, `.json`, `.tmplt`, `.xml`, `.pdf`, `.xlsx`

For `.pdf` and `.xlsx`, set `fileType` to `"base64"`.

## Considerations and Limitations

- Supported only in Power BI service and Power BI Desktop.
- Maximum file size: **30 MB**.
- This is a privileged API — requires declaration and admin approval.
- A confirmation dialog appears before download starts.
- **Does NOT work in dev mode (`pbiviz start`).** `exportStatus()` returns `NotDeclared` or `DisabledByAdmin`. Browser download alternatives (`window.open`, Blob, `data:` URI) are all blocked by the Power BI iframe sandbox. This is expected — the download only works when the visual is published. Use `navigator.clipboard.writeText()` as a dev-mode fallback for testing.

## Common Mistakes

| Mistake | Fix |
|---|---|
| Silent failure in dev mode with no user feedback | `exportStatus()` returns non-Allowed in dev mode. Always add a clipboard fallback so you can verify the export content during development |
| Using browser download methods as fallback | `window.open()`, `Blob` + `<a>` click, and `data:` URIs ALL fail in Power BI's sandboxed iframe. Only `downloadService` and `navigator.clipboard` work |

| Exporting from a filtered subset that may be empty | Export from the full data array (e.g., `series[].data`), not a filtered subset like event-only dots |
| CSV not escaping quotes | Double-quote fields and escape internal quotes with `""` to produce valid CSV |

## Files That May Need Changes

- `capabilities.json` — Add `ExportContent` privilege declaration
- `src/visual.ts` — Access `host.downloadService` and call export methods

## Validation Checklist

- [ ] `ExportContent` privilege is declared in `capabilities.json`
- [ ] `host.downloadService` is stored from constructor options
- [ ] `exportStatus()` is checked before attempting download
- [ ] `exportVisualsContent()` or `exportVisualsContentExtended()` is called with proper parameters
- [ ] Error handling covers both permission denial and download failure
- [ ] Fallback to `navigator.clipboard.writeText()` when download service is unavailable (dev mode)
- [ ] User feedback (console log / toast) is shown for both success and failure paths
- [ ] CSV content escapes double quotes and uses all data points (not a filtered subset)
- [ ] The code contains `.downloadService` and `.exportVisualsContent` (detected by the tool's linting feature)
- [ ] No unrelated files were changed

## Reference

Official Microsoft documentation: https://learn.microsoft.com/en-us/power-bi/developer/visuals/file-download-api
