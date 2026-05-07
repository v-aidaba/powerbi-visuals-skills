# Power BI Visual — Rendering Events API

## Overview

Rendering events let Power BI know when a visual has started and finished rendering. This is **required for certification** and ensures that exports to PDF and PowerPoint wait for the visual to complete rendering before capturing it. The API consists of three methods: `renderingStarted`, `renderingFinished`, and `renderingFailed`.

**Why this matters:** If `renderingStarted` is called but neither `renderingFinished` nor `renderingFailed` is ever called, Power BI will wait indefinitely—causing PDF/PowerPoint exports to hang and eventually time out. Every code path that exits `update()` **must** signal completion.

**Official documentation:** https://learn.microsoft.com/en-us/power-bi/developer/visuals/event-service

## Requirements

- **powerbi-visuals-api** package must be installed
- All three event methods must be called appropriately
- **Required for certification** — visuals without rendering events won't be approved

## Step-by-Step Implementation

### Step 1: Store the Event Service

```typescript
import powerbi from "powerbi-visuals-api";
import IVisualEventService = powerbi.extensibility.IVisualEventService;

export class Visual implements powerbi.extensibility.visual.IVisual {
    private events: IVisualEventService;

    constructor(options: powerbi.extensibility.visual.VisualConstructorOptions) {
        this.events = options.host.eventService;
    }
}
```

### Step 2: Synchronous Update with Early Return Guards

This is the **most critical pattern**. Many visuals have early returns (no data, invalid viewport, resize-only updates). Every early return **after** `renderingStarted` must call `renderingFinished` before returning.

```typescript
public update(options: powerbi.extensibility.visual.VisualUpdateOptions): void {
    this.events.renderingStarted(options);

    // Guard: no dataViews available
    if (!options.dataViews || !options.dataViews[0]) {
        this.clearVisual();
        this.events.renderingFinished(options);
        return;
    }

    // Guard: invalid viewport dimensions
    if (options.viewport.width <= 0 || options.viewport.height <= 0) {
        this.events.renderingFinished(options);
        return;
    }

    // Guard: no categorical data
    const categorical = options.dataViews[0].categorical;
    if (!categorical || !categorical.categories || categorical.categories.length === 0) {
        this.showLandingPage();
        this.events.renderingFinished(options);
        return;
    }

    // Guard: resize-only update (no data change)
    if (options.type === powerbi.VisualUpdateType.Resize && !this.needsRedrawOnResize) {
        this.events.renderingFinished(options);
        return;
    }

    try {
        this.renderView(options);
        this.events.renderingFinished(options);
    } catch (error) {
        this.events.renderingFailed(options, String(error));
    }
}
```

### Step 3: Asynchronous Update Pattern (async/await)

```typescript
public async update(options: powerbi.extensibility.visual.VisualUpdateOptions): Promise<void> {
    this.events.renderingStarted(options);

    // Guard: no data
    if (!options.dataViews || !options.dataViews[0]) {
        this.clearVisual();
        this.events.renderingFinished(options);
        return;
    }

    try {
        await this.renderAsync(options);
        this.events.renderingFinished(options);
    } catch (error) {
        this.events.renderingFailed(options, String(error));
    }
}
```

### Step 4: Promise Chain Pattern (.then/.catch)

```typescript
public update(options: powerbi.extensibility.visual.VisualUpdateOptions): void {
    this.events.renderingStarted(options);

    // Guard: no data
    if (!options.dataViews || !options.dataViews[0]) {
        this.clearVisual();
        this.events.renderingFinished(options);
        return;
    }

    this.renderAsync(options)
        .then(() => {
            this.events.renderingFinished(options);
        })
        .catch((error) => {
            this.events.renderingFailed(options, String(error));
        });
}
```

### Step 5: Complex Conditional Rendering with Multiple Exit Points

When a visual has many conditional branches, use a helper pattern to avoid missing `renderingFinished`:

```typescript
public update(options: powerbi.extensibility.visual.VisualUpdateOptions): void {
    this.events.renderingStarted(options);

    try {
        this.processUpdate(options);
    } catch (error) {
        this.events.renderingFailed(options, String(error));
        return;
    }

    this.events.renderingFinished(options);
}

/**
 * All rendering logic lives here. If it throws, the caller handles renderingFailed.
 * If it returns normally (including early returns), the caller calls renderingFinished.
 */
private processUpdate(options: powerbi.extensibility.visual.VisualUpdateOptions): void {
    if (!options.dataViews || !options.dataViews[0]) {
        this.clearVisual();
        return; // caller will call renderingFinished
    }

    const dataView = options.dataViews[0];
    if (!dataView.categorical) {
        this.showLandingPage();
        return; // caller will call renderingFinished
    }

    // ... main rendering logic
    this.renderChart(dataView);
}
```

## Rendering Event Lifecycle Rules

1. **`renderingStarted` is always the first call** in `update()` — before any guards, validation, or early returns.
2. **Every exit path must signal completion** — call exactly one of `renderingFinished` or `renderingFailed` before exiting.
3. **Early returns still require `renderingFinished`** — if you return early because there's no data or nothing to render, you must still call `renderingFinished` (not `renderingFailed`) because this is a valid "nothing to render" state, not an error.
4. **`renderingFailed` is only for actual errors** — exceptions, network failures, broken data. Do NOT call `renderingFailed` for empty data or resize events.
5. **For async rendering**, call `renderingFinished` only **after** the async work is truly complete. Never call it before the promise resolves.
6. **Never let `update()` exit without signaling** — an unmatched `renderingStarted` will cause Power BI to hang waiting forever.

## Common Edge Cases & Pitfalls

### Edge Case 1: Empty data is NOT a rendering failure

```typescript
// WRONG — empty data is a valid state, not an error
if (!options.dataViews || !options.dataViews[0]) {
    this.events.renderingFailed(options, "No data");  // ❌ DON'T DO THIS
    return;
}

// CORRECT — signal rendering finished (nothing to draw is still "done")
if (!options.dataViews || !options.dataViews[0]) {
    this.clearVisual();
    this.events.renderingFinished(options);  // ✅ CORRECT
    return;
}
```

### Edge Case 2: Forgotten renderingFinished in guard clauses

```typescript
// WRONG — missing renderingFinished before return
public update(options: VisualUpdateOptions): void {
    this.events.renderingStarted(options);

    if (!options.dataViews) {
        return;  // ❌ BUG: renderingStarted was called but never closed!
    }

    // ...
}

// CORRECT — always close before returning
public update(options: VisualUpdateOptions): void {
    this.events.renderingStarted(options);

    if (!options.dataViews) {
        this.events.renderingFinished(options);  // ✅ CORRECT
        return;
    }

    // ...
}
```

### Edge Case 3: Multiple early returns (ALL need renderingFinished)

```typescript
public update(options: VisualUpdateOptions): void {
    this.events.renderingStarted(options);

    if (!options.dataViews || !options.dataViews[0]) {
        this.events.renderingFinished(options);  // ✅ guard 1
        return;
    }

    if (options.viewport.width <= 0 || options.viewport.height <= 0) {
        this.events.renderingFinished(options);  // ✅ guard 2
        return;
    }

    const categorical = options.dataViews[0].categorical;
    if (!categorical || !categorical.categories) {
        this.events.renderingFinished(options);  // ✅ guard 3
        return;
    }

    if (categorical.categories[0].values.length === 0) {
        this.events.renderingFinished(options);  // ✅ guard 4
        return;
    }

    try {
        this.render(options);
        this.events.renderingFinished(options);  // ✅ success path
    } catch (error) {
        this.events.renderingFailed(options, String(error));  // ✅ error path
    }
}
```

### Edge Case 4: Animations and transitions (D3, SVG)

When using D3 transitions or CSS animations, `renderingFinished` must be called **after** the animation completes, not when it starts:

```typescript
public update(options: VisualUpdateOptions): void {
    this.events.renderingStarted(options);

    if (!options.dataViews || !options.dataViews[0]) {
        this.events.renderingFinished(options);
        return;
    }

    try {
        // Start D3 transition
        this.bars
            .transition()
            .duration(500)
            .attr("width", d => this.xScale(d.value))
            .on("end", () => {
                // ✅ Signal finished AFTER animation completes
                this.events.renderingFinished(options);
            });
    } catch (error) {
        this.events.renderingFailed(options, String(error));
    }
}
```

**Note:** If you do NOT need exports to wait for animations, you can call `renderingFinished` immediately after starting the animation. Use the pattern above only if the final visual state depends on the animation completing.

### Edge Case 5: Re-entrant update calls

Power BI may call `update()` again before a previous async render completes. Handle this by cancelling or ignoring stale renders:

```typescript
private renderVersion: number = 0;

public async update(options: VisualUpdateOptions): Promise<void> {
    this.events.renderingStarted(options);

    const currentVersion = ++this.renderVersion;

    if (!options.dataViews || !options.dataViews[0]) {
        this.events.renderingFinished(options);
        return;
    }

    try {
        await this.renderAsync(options);

        // Only signal if this is still the latest render
        if (currentVersion === this.renderVersion) {
            this.events.renderingFinished(options);
        }
        // If stale, Power BI already received a new renderingStarted
    } catch (error) {
        if (currentVersion === this.renderVersion) {
            this.events.renderingFailed(options, String(error));
        }
    }
}
```

### Edge Case 6: Conditional rendering based on update type

```typescript
public update(options: VisualUpdateOptions): void {
    this.events.renderingStarted(options);

    // Resize-only: reflow layout but skip data processing
    if (options.type === powerbi.VisualUpdateType.Resize) {
        try {
            this.reflowLayout(options.viewport);
        } catch (error) {
            this.events.renderingFailed(options, String(error));
            return;
        }
        this.events.renderingFinished(options);  // ✅ resize path finished
        return;
    }

    // Full data update
    if (!options.dataViews || !options.dataViews[0]) {
        this.events.renderingFinished(options);  // ✅ no-data path finished
        return;
    }

    try {
        this.renderFull(options);
        this.events.renderingFinished(options);  // ✅ full render finished
    } catch (error) {
        this.events.renderingFailed(options, String(error));  // ✅ error path
    }
}
```

## Event Service Methods

| Method | Parameters | Description |
|---|---|---|
| `renderingStarted(options)` | `VisualUpdateOptions` | Signal that rendering has started. Must be called once at the top of `update()`. |
| `renderingFinished(options)` | `VisualUpdateOptions` | Signal that rendering completed successfully. Call for both successful renders AND valid "nothing to render" states. |
| `renderingFailed(options, reason?)` | `VisualUpdateOptions, string?` | Signal that rendering failed due to an actual error. Provide a descriptive reason string for debugging. |

## Files That May Need Changes

- `src/visual.ts` — Add `eventService` usage in the `update()` method

## Validation Checklist

- [ ] `host.eventService` is stored from constructor options
- [ ] `renderingStarted()` is called as the **first line** of every `update()` cycle
- [ ] `renderingFinished()` is called when rendering completes successfully
- [ ] `renderingFinished()` is called on **every early return path** (no data, invalid viewport, resize-only, empty categories)
- [ ] `renderingFailed()` is called only for actual errors (exceptions, broken data), NOT for empty data
- [ ] Every `renderingStarted` has a matching `renderingFinished` or `renderingFailed` — no exit path is unmatched
- [ ] Async rendering waits for completion before calling `renderingFinished`
- [ ] D3 transitions/animations call `renderingFinished` in the `.on("end")` callback if exports must wait for them
- [ ] Re-entrant `update()` calls don't produce double-signals (stale renders are discarded)
- [ ] The code contains `.eventService`, `.renderingStarted`, and `.renderingFinished`
- [ ] No unrelated files were changed

## Anti-Patterns to Avoid

| Anti-Pattern | Why It's Wrong | Fix |
|---|---|---|
| Early return without `renderingFinished` | Power BI hangs waiting for signal | Add `renderingFinished` before every `return` |
| Calling `renderingFailed` for empty data | Empty data is valid, not an error | Use `renderingFinished` instead |
| Calling `renderingFinished` before async work completes | Export captures incomplete visual | Move call into `.then()` or after `await` |
| Calling both `renderingFinished` AND `renderingFailed` | Undefined behavior, double-signal | Use try/catch to ensure exactly one is called |
| Placing `renderingStarted` after guards | Guards exit before Power BI knows rendering started | Always put `renderingStarted` as line 1 |
| Swallowing errors without `renderingFailed` | Power BI never knows rendering broke | Always signal failure in catch blocks |

## Reference

Official Microsoft documentation: https://learn.microsoft.com/en-us/power-bi/developer/visuals/event-service
