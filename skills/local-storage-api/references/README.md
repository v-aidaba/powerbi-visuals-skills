# Power BI Visual — Local Storage API

## Overview

The Local Storage API allows a Power BI custom visual to store data in the browser's local storage. This enables persisting state (like user preferences, counters, or cached data) between visual sessions. Each visual type has isolated storage access.

**Official documentation:** https://learn.microsoft.com/en-us/power-bi/developer/visuals/local-storage

## Requirements

- **powerbi-visuals-api** package must be installed
- The visual must be [AppSource certified](https://learn.microsoft.com/en-us/power-bi/developer/visuals/power-bi-custom-visuals-certified)
- The customer's local storage admin switch must be enabled
- Storage limit: 1 MB per GUID

## Step-by-Step Implementation

### Step 1: Access the Storage Service

```typescript
import powerbi from "powerbi-visuals-api";
import ILocalVisualStorageService = powerbi.extensibility.ILocalVisualStorageService;

export class Visual implements powerbi.extensibility.visual.IVisual {
    private storage: ILocalVisualStorageService;

    constructor(options: powerbi.extensibility.visual.VisualConstructorOptions) {
        this.storage = options.host.storageService;
    }
}
```

### Step 2: Store and Retrieve Data

```typescript
// Store a value
this.storage.set("myKey", "myValue")
    .then(() => {
        console.log("Value stored successfully");
    })
    .catch((error) => {
        console.error("Failed to store value:", error);
    });

// Retrieve a value
this.storage.get("myKey")
    .then((value) => {
        console.log("Retrieved:", value);
    })
    .catch(() => {
        console.log("Key not found, using default");
    });
```

### Step 3: Practical Example — Persistent Counter

```typescript
export class Visual implements powerbi.extensibility.visual.IVisual {
    private storage: ILocalVisualStorageService;
    private updateCount: number = 0;

    constructor(options: powerbi.extensibility.visual.VisualConstructorOptions) {
        this.storage = options.host.storageService;

        // Restore counter from storage
        this.storage.get("updateCount")
            .then(count => { this.updateCount = +count; })
            .catch(() => {
                this.updateCount = 0;
                this.storage.set("updateCount", "0");
            });
    }

    public update(options: powerbi.extensibility.visual.VisualUpdateOptions): void {
        this.updateCount++;
        this.storage.set("updateCount", this.updateCount.toString());
    }
}
```

### Step 4: Remove a Value

```typescript
this.storage.remove("myKey")
    .then(() => { console.log("Key removed"); })
    .catch(() => { console.error("Failed to remove key"); });
```

## ILocalVisualStorageService Methods

| Method | Returns | Description |
|---|---|---|
| `get(key)` | `Promise<string>` | Retrieve stored value by key |
| `set(key, data)` | `Promise<number>` | Store a key-value pair (returns remaining storage) |
| `remove(key)` | `Promise<void>` | Remove a stored key |

## Important Notes

- Storage limit is **1 MB per visual GUID**.
- Data can only be shared between visuals with the **same GUID**.
- Data cannot be shared across Power BI Desktop instances.
- The API does **not** support `await` — use `.then()` and `.catch()` only.
- Developers must ensure stored data conforms to organizational policies.
- Encrypt sensitive data if business scenarios require it.

## Considerations and Limitations

- The local storage API must be activated by Power BI — send a request to `pbicvsupport@microsoft.com`.
- The visual must be available in AppSource and be certified.
- Only `.then()` and `.catch()` patterns are supported — no `async/await`.

## Files That May Need Changes

- `src/visual.ts` — Access `host.storageService` and use `get()`/`set()`/`remove()`

## Validation Checklist

- [ ] `host.storageService` is stored from constructor options
- [ ] `.get()` and `.set()` are used with `.then()` / `.catch()` (not await)
- [ ] Error handling is implemented for missing keys
- [ ] Storage size stays within the 1 MB limit
- [ ] The code contains `.storageService` (detected by the tool's linting feature)
- [ ] No unrelated files were changed

## Reference

Official Microsoft documentation: https://learn.microsoft.com/en-us/power-bi/developer/visuals/local-storage
