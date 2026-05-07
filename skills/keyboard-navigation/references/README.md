# Power BI Visual — Enable Keyboard Navigation

## Overview

Keyboard navigation allows users to interact with a Power BI custom visual using only the keyboard (Tab, Enter, Escape, arrow keys). When enabled via `supportsKeyboardFocus`, Power BI adds the visual to the tab order, and the visual receives keyboard focus when the user tabs to it.

**Official documentation:** https://learn.microsoft.com/en-us/power-bi/developer/visuals/supportskeyboardfocus-feature

## Requirements

- **powerbi-visuals-api** package must be installed
- `supportsKeyboardFocus: true` must be set in `capabilities.json`
- Interactive elements must have `tabindex` attributes

## Step-by-Step Implementation

### Step 1: Enable Keyboard Focus in capabilities.json

```json
{
    "supportsKeyboardFocus": true
}
```

When this is set, Power BI adds a visible focus border around the visual when it receives keyboard focus via Tab.

### Step 2: Make Interactive Elements Focusable

Add `tabindex` to elements that should receive focus:

```typescript
private renderDataPoints(dataPoints: any[]): void {
    dataPoints.forEach((dp, index) => {
        const element = document.createElement("div");
        element.setAttribute("tabindex", String(index));
        element.setAttribute("role", "button");
        element.setAttribute("aria-label", `Data point: ${dp.category}, Value: ${dp.value}`);

        this.target.appendChild(element);
    });
}
```

### Step 3: Handle Keyboard Events

Add keyboard event handlers for Enter and arrow key navigation:

```typescript
private attachKeyboardEvents(element: HTMLElement, dataPoint: any): void {
    element.addEventListener("keydown", (event: KeyboardEvent) => {
        switch (event.key) {
            case "Enter":
            case " ":
                // Select the data point (same as click)
                this.selectionManager.select(dataPoint.selectionId);
                event.preventDefault();
                break;
            case "Escape":
                // Clear selection
                this.selectionManager.clear();
                event.preventDefault();
                break;
            case "ArrowRight":
            case "ArrowDown":
                // Move focus to next element
                const next = element.nextElementSibling as HTMLElement;
                if (next) next.focus();
                event.preventDefault();
                break;
            case "ArrowLeft":
            case "ArrowUp":
                // Move focus to previous element
                const prev = element.previousElementSibling as HTMLElement;
                if (prev) prev.focus();
                event.preventDefault();
                break;
        }
    });
}
```

### Step 4: Add ARIA Attributes for Accessibility

```typescript
private renderDataPoints(dataPoints: any[]): void {
    const container = document.createElement("div");
    container.setAttribute("role", "list");
    container.setAttribute("aria-label", "Data points");

    dataPoints.forEach((dp, index) => {
        const element = document.createElement("div");
        element.setAttribute("role", "listitem");
        element.setAttribute("tabindex", "0");
        element.setAttribute("aria-label", `${dp.category}: ${dp.value}`);
        element.setAttribute("aria-selected", String(dp.selected));

        this.attachKeyboardEvents(element, dp);
        container.appendChild(element);
    });

    this.target.appendChild(container);
}
```

## Files That May Need Changes

- `capabilities.json` — Add `"supportsKeyboardFocus": true`
- `src/visual.ts` — Add `tabindex`, `role`, `aria-label` attributes and keyboard event handlers

## Validation Checklist

- [ ] `"supportsKeyboardFocus": true` is set in `capabilities.json`
- [ ] Interactive elements have `tabindex` attributes
- [ ] Enter/Space key triggers the same action as a mouse click
- [ ] Arrow keys allow navigation between elements
- [ ] Escape clears selection
- [ ] ARIA roles and labels are added for screen reader support
- [ ] No unrelated files were changed

## Reference

Official Microsoft documentation: https://learn.microsoft.com/en-us/power-bi/developer/visuals/supportskeyboardfocus-feature
