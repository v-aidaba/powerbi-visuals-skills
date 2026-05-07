# Power BI Visual — Dynamic Drill Support API

## Overview

The Dynamic Drill Control feature allows a visual to programmatically enable or disable drilling via an API call. When drill is enabled, all drilldown functionalities (API calls, context menu, header buttons, expand/collapse) work. When disabled, these are unavailable. This is useful for migration scenarios or visuals that conditionally support drill.

**Official documentation:** https://learn.microsoft.com/en-us/power-bi/developer/visuals/dynamic-drill-down

## Requirements

- **API version:** 5.7.0 or higher
- **powerbi-visuals-api** package must be installed
- The visual must already have `drilldown` configured in capabilities

## Step-by-Step Implementation

### Step 1: Configure canDisableDrill in capabilities.json

**Drill disabled by default:**

```json
{
    "drilldown": {
        "roles": ["Rows", "Columns"],
        "canDisableDrill": {
            "disabledByDefault": true
        }
    }
}
```

**Drill enabled by default:**

```json
{
    "drilldown": {
        "roles": ["Rows", "Columns"],
        "canDisableDrill": {}
    }
}
```

The `canDisableDrill` property indicates the visual supports dynamic drill control. Without it, `setCanDrill` calls are ignored.

### Step 2: Use setCanDrill to Toggle Drilling

```typescript
import powerbi from "powerbi-visuals-api";

export class Visual implements powerbi.extensibility.visual.IVisual {
    private host: powerbi.extensibility.visual.IVisualHost;

    constructor(options: powerbi.extensibility.visual.VisualConstructorOptions) {
        this.host = options.host;
    }

    public update(options: powerbi.extensibility.visual.VisualUpdateOptions): void {
        const dataView = options.dataViews?.[0];
        const isDrillDisabled = dataView?.metadata?.dataRoles?.isDrillDisabled;

        // Check current drill state and toggle as needed
        if (isDrillDisabled !== undefined) {
            // Example: enable drill when a condition is met
            if (this.shouldEnableDrill(dataView)) {
                this.host.setCanDrill(true);
            } else {
                this.host.setCanDrill(false);
            }
        }
    }
}
```

### Step 3: Handle Drill Migration (Upgrading Existing Visuals)

When migrating from a non-drillable to a drillable version:

```typescript
export class Visual implements powerbi.extensibility.visual.IVisual {
    private isCalledToDisableDrillInMigrationScenario = false;
    private drillMigration = { disabledByDefault: true };

    public update(options: powerbi.extensibility.visual.VisualUpdateOptions): void {
        this.handleSelfDrillMigration(options);
        // ... rest of update
    }

    private handleSelfDrillMigration(options: powerbi.extensibility.visual.VisualUpdateOptions): void {
        const metadata = options.dataViews?.[0]?.metadata;
        if (!metadata?.dataRoles) return;

        const isDrillDisabled = metadata.dataRoles.isDrillDisabled;
        if (isDrillDisabled === undefined) return;

        // Check if already migrated
        if (!metadata.objects?.DrillMigration?.isMigrated) {
            if (this.drillMigration.disabledByDefault === isDrillDisabled) {
                this.persistMigrationProperty();
            } else if (!this.isCalledToDisableDrillInMigrationScenario) {
                this.host.setCanDrill(!this.drillMigration.disabledByDefault);
                this.isCalledToDisableDrillInMigrationScenario = true;
            }
        }
    }

    private persistMigrationProperty(): void {
        this.host.persistProperties({
            merge: [{
                objectName: "DrillMigration",
                properties: { isMigrated: true },
                selector: null
            }]
        });
    }
}
```

## API Elements

| Element | Description |
|---|---|
| `host.setCanDrill(boolean)` | Enable (`true`) or disable (`false`) drilling |
| `metadata.dataRoles.isDrillDisabled` | Current drill disabled state |
| `canDisableDrill` (capabilities) | Declares support for dynamic drill control |
| `disabledByDefault` (capabilities) | Whether drill starts disabled for new visuals |

## Considerations and Limitations

- Drill state isn't saved after disabling — re-enabling shows only the first level.
- Expand/collapse state isn't preserved after disabling.
- Not supported for dashboards.
- Use `"max": 1` in conditions for drillable roles to limit fields when drill is disabled.

## Files That May Need Changes

- `capabilities.json` — Add `canDisableDrill` to the `drilldown` property
- `src/visual.ts` — Use `host.setCanDrill()` and check `isDrillDisabled`

## Validation Checklist

- [ ] `canDisableDrill` is set in `capabilities.json` under `drilldown`
- [ ] `host.setCanDrill()` is called to toggle drill state
- [ ] `isDrillDisabled` is read from `dataView.metadata.dataRoles`
- [ ] Migration scenario is handled if upgrading from non-drillable version
- [ ] No unrelated files were changed

## Reference

Official Microsoft documentation: https://learn.microsoft.com/en-us/power-bi/developer/visuals/dynamic-drill-down
