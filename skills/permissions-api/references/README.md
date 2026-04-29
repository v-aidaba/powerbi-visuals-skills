# Power BI Visual — Permissions API (Check Permissions)

## Overview

The Check Permissions API allows a Power BI custom visual to query the host at runtime to determine which privileges are granted. This enables the visual to adapt its behavior based on permission status — for example, hiding a download button if file export is disabled by the admin.

**Official documentation:** https://learn.microsoft.com/en-us/power-bi/developer/visuals/permissions-api

## Requirements

- **powerbi-visuals-api** package must be installed
- Privileges must be declared in `capabilities.json`

## PrivilegeStatus Enum

```typescript
export const enum PrivilegeStatus {
    Allowed,         // The privilege is allowed
    NotDeclared,     // Privilege missing in capabilities
    NotSupported,    // Not supported in current environment
    DisabledByAdmin, // Tenant admin denied usage
}
```

## Step-by-Step Implementation

### Step 1: Declare Privileges in capabilities.json

```json
{
    "privileges": [
        {
            "name": "WebAccess",
            "essential": true,
            "parameters": ["https://api.example.com"]
        },
        {
            "name": "ExportContent"
        }
    ]
}
```

### Step 2: Check Web Access Permission

```typescript
import powerbi from "powerbi-visuals-api";

export class Visual implements powerbi.extensibility.visual.IVisual {
    private host: powerbi.extensibility.visual.IVisualHost;

    constructor(options: powerbi.extensibility.visual.VisualConstructorOptions) {
        this.host = options.host;
    }

    private async checkWebAccess(url: string): Promise<void> {
        const status = await this.host.webAccessService.webAccessStatus(url);

        switch (status) {
            case powerbi.PrivilegeStatus.Allowed:
                // Proceed with web request
                await this.fetchData(url);
                break;
            case powerbi.PrivilegeStatus.DisabledByAdmin:
                this.showMessage("Web access is disabled by your administrator.");
                break;
            case powerbi.PrivilegeStatus.NotDeclared:
                this.showMessage("Web access is not configured for this visual.");
                break;
            case powerbi.PrivilegeStatus.NotSupported:
                this.showMessage("Web access is not supported in this environment.");
                break;
        }
    }
}
```

### Step 3: Check Export/Download Permission

```typescript
private async checkDownloadPermission(): Promise<void> {
    const status = await this.host.downloadService.exportStatus();

    if (status === powerbi.PrivilegeStatus.Allowed) {
        this.showDownloadButton();
    } else {
        this.hideDownloadButton();
    }
}
```

### Step 4: Adapt UI Based on Permissions

```typescript
public async update(options: powerbi.extensibility.visual.VisualUpdateOptions): Promise<void> {
    // Check permissions and adapt UI
    const webStatus = await this.host.webAccessService.webAccessStatus("https://api.example.com");
    const downloadStatus = await this.host.downloadService.exportStatus();

    // Show/hide features based on permissions
    this.renderVisual(options, {
        canAccessWeb: webStatus === powerbi.PrivilegeStatus.Allowed,
        canDownload: downloadStatus === powerbi.PrivilegeStatus.Allowed
    });
}
```

## Permission Query Interfaces

### Web Access Service

```typescript
interface IWebAccessService {
    webAccessStatus(url: string): IPromise<PrivilegeStatus>;
}
```

### Download Service

```typescript
interface IDownloadService {
    exportStatus(): IPromise<PrivilegeStatus>;
}
```

## Common Patterns

| Scenario | Implementation |
|---|---|
| Feature gating | Check permission before showing UI elements |
| Graceful degradation | Hide features when permissions are denied |
| User messaging | Show clear messages explaining why a feature is unavailable |
| Pre-flight check | Verify permissions before attempting privileged operations |

## Files That May Need Changes

- `capabilities.json` — Declare privileges (`WebAccess`, `ExportContent`, etc.)
- `src/visual.ts` — Check privilege status before using privileged APIs

## Validation Checklist

- [ ] All required privileges are declared in `capabilities.json`
- [ ] Permission status is checked before using privileged APIs
- [ ] All four `PrivilegeStatus` values are handled (Allowed, NotDeclared, NotSupported, DisabledByAdmin)
- [ ] UI adapts gracefully when permissions are denied
- [ ] Clear user messaging explains unavailable features
- [ ] No unrelated files were changed

## Reference

Official Microsoft documentation: https://learn.microsoft.com/en-us/power-bi/developer/visuals/permissions-api
