# Display Warning Icon — Reference

Detailed implementation guide for showing a warning icon overlay in a Power BI custom visual.

## Prerequisites

- A Power BI custom visual project created with `pbiviz new`.
- Basic familiarity with the visual lifecycle (`constructor`, `update`, `destroy`).

## Step-by-step walkthrough

### 1. Add a warning overlay element in the constructor

```typescript
import powerbi from "powerbi-visuals-api";
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

export class Visual implements powerbi.extensibility.visual.IVisual {
    private target: HTMLElement;
    private warningOverlay: HTMLElement;

    constructor(options: powerbi.extensibility.visual.VisualConstructorOptions) {
        this.target = options.element;

        // Create the overlay once, hidden by default.
        this.warningOverlay = document.createElement("div");
        this.warningOverlay.className = "warning-overlay";
        this.warningOverlay.setAttribute("role", "alert");
        this.warningOverlay.setAttribute("aria-label", "Visual warning");
        this.warningOverlay.style.display = "none";

        // Icon + message (using a Unicode warning sign — no external assets needed).
        const icon = document.createElement("span");
        icon.className = "warning-icon";
        icon.textContent = "\u26A0"; // ⚠

        const message = document.createElement("span");
        message.className = "warning-message";
        message.textContent = "Data is missing or invalid.";

        this.warningOverlay.appendChild(icon);
        this.warningOverlay.appendChild(message);
        this.target.appendChild(this.warningOverlay);
    }
    // ...
}
```

### 2. Add CSS styles

Add the following to your visual's stylesheet (e.g., `style/visual.less` or `visual.css`):

```css
.warning-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.85);
    z-index: 100;
    pointer-events: none;
}

.warning-icon {
    font-size: 48px;
    line-height: 1;
    color: #d83b01; /* Office orange-red */
}

.warning-message {
    margin-top: 8px;
    font-family: "Segoe UI", sans-serif;
    font-size: 14px;
    color: #323130;
    text-align: center;
    padding: 0 16px;
}
```

### 3. Toggle visibility in `update()`

```typescript
public update(options: VisualUpdateOptions): void {
    const dataViews = options.dataViews;
    const hasValidData = this.validateData(dataViews);

    if (!hasValidData) {
        this.showWarning("Required data fields are not mapped.");
        return; // Skip normal rendering.
    }

    this.hideWarning();
    // ... proceed with normal rendering.
}

private validateData(dataViews: powerbi.DataView[] | undefined): boolean {
    if (!dataViews || dataViews.length === 0) {
        return false;
    }

    const categorical = dataViews[0].categorical;
    if (!categorical || !categorical.categories || categorical.categories.length === 0) {
        return false;
    }

    return true;
}

private showWarning(text: string): void {
    const messageEl = this.warningOverlay.querySelector(".warning-message");
    if (messageEl) {
        messageEl.textContent = text; // Safe — uses textContent, not innerHTML.
    }
    this.warningOverlay.style.display = "flex";
}

private hideWarning(): void {
    this.warningOverlay.style.display = "none";
}
```

### 4. Customize the icon

You can swap the Unicode character for an inline SVG if you need a specific icon style:

```typescript
icon.innerHTML = `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M24 4L2 44h44L24 4z" fill="#d83b01"/>
  <text x="24" y="36" text-anchor="middle" fill="#fff" font-size="24" font-weight="bold">!</text>
</svg>`;
```

> When using inline SVG, ensure the markup is a static string literal — never interpolate user data into SVG markup.

## Checklist

- [ ] Warning overlay element created once in `constructor`, not on every `update()`.
- [ ] Overlay uses `display: none` / `display: flex` toggling (not element removal/creation).
- [ ] `role="alert"` and `aria-label` set for accessibility.
- [ ] `textContent` used (not `innerHTML`) for user-facing message text.
- [ ] Overlay positioned with `position: absolute` inside the visual's root container.
- [ ] Overlay uses `pointer-events: none` so it does not block interaction when hidden.
- [ ] No external icon fonts or images loaded at runtime.
- [ ] Warning hides cleanly when valid data arrives.
- [ ] Tested at multiple visual sizes (small, medium, large).
- [ ] Tested in Power BI Desktop and Power BI Service.

## Certification notes

| Requirement                                              | Status |
| -------------------------------------------------------- | ------ |
| No external resources loaded at runtime                  | Required for certification |
| No `innerHTML` with dynamic/user data                    | Required for certification |
| Accessibility attributes present (`role`, `aria-label`)  | Required for certification |
| Visual renders correctly when data becomes valid again   | Required for certification |

## Troubleshooting

| Symptom                                   | Likely cause                                             |
| ----------------------------------------- | -------------------------------------------------------- |
| Warning never appears                     | `display` not set to `flex`; or condition logic inverted |
| Warning never disappears                  | `hideWarning()` not called when data becomes valid       |
| Warning renders outside the visual box    | Overlay appended to wrong parent; or missing `position: absolute` |
| Multiple overlays stacking up             | New element created on every `update()` call             |
| Screen reader does not announce warning   | Missing `role="alert"` attribute                         |

## Alternative patterns

| Pattern                        | When to use                                                        |
| ------------------------------ | ------------------------------------------------------------------ |
| Landing page                   | Full "get started" experience when no data is bound at all         |
| Tooltip with info icon         | Non-blocking hint; data is usable but suboptimal                   |
| Format pane validation message | Warning about a format setting value, not about data               |
