# Power BI Visual — Landing Page

## Overview

A landing page is displayed in a Power BI custom visual when no data has been mapped to it. It can show usage instructions, links to documentation, videos, or any helpful content to guide the user. The landing page disappears once data is added.

**Official documentation:** https://learn.microsoft.com/en-us/power-bi/developer/visuals/landing-page

## Requirements

- **API version:** 2.3.0 or higher
- **powerbi-visuals-api** package must be installed
- Both `supportsLandingPage` and `supportsEmptyDataView` must be set in `capabilities.json`

## Step-by-Step Implementation

### Step 1: Enable Landing Page in capabilities.json

```json
{
    "supportsLandingPage": true,
    "supportsEmptyDataView": true
}
```

- `supportsLandingPage`: Enables the landing page feature.
- `supportsEmptyDataView`: Allows the visual to render even when no data roles are filled (required for the landing page to display in view mode).

### Step 2: Handle the Landing Page in the Visual

In `src/visual.ts`:

```typescript
import powerbi from "powerbi-visuals-api";

export class Visual implements powerbi.extensibility.visual.IVisual {
    private target: HTMLElement;
    private isLandingPageOn: boolean = false;
    private landingPageRemoved: boolean = false;
    private landingPage: HTMLElement | null = null;

    constructor(options: powerbi.extensibility.visual.VisualConstructorOptions) {
        this.target = options.element;
    }

    public update(options: powerbi.extensibility.visual.VisualUpdateOptions): void {
        this.handleLandingPage(options);

        // Only render data visualization if we have data
        const dataView = options.dataViews?.[0];
        if (dataView?.metadata?.columns?.length) {
            this.renderVisual(dataView);
        }
    }

    private handleLandingPage(options: powerbi.extensibility.visual.VisualUpdateOptions): void {
        const hasData = options.dataViews?.[0]?.metadata?.columns?.length > 0;

        if (!hasData) {
            if (!this.isLandingPageOn) {
                this.isLandingPageOn = true;
                this.landingPage = this.createLandingPage();
                this.target.appendChild(this.landingPage);
            }
        } else {
            if (this.isLandingPageOn && !this.landingPageRemoved) {
                this.landingPageRemoved = true;
                if (this.landingPage) {
                    this.landingPage.remove();
                    this.landingPage = null;
                }
            }
        }
    }

    private createLandingPage(): HTMLElement {
        const container = document.createElement("div");
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.alignItems = "center";
        container.style.justifyContent = "center";
        container.style.height = "100%";
        container.style.padding = "20px";
        container.style.textAlign = "center";

        const title = document.createElement("h2");
        title.textContent = "Welcome to My Visual";
        container.appendChild(title);

        const description = document.createElement("p");
        description.textContent = "Drag data fields into the data roles to get started.";
        container.appendChild(description);

        return container;
    }
}
```

## Common Landing Page Content

| Content | Description |
|---|---|
| Title | Visual name and brief intro |
| Instructions | How to use the visual (which data roles to fill) |
| Documentation link | Link to the visual's help page |
| Sample image | Preview of what the visual looks like with data |
| Version info | Current version of the visual |

## Files That May Need Changes

- `capabilities.json` — Add `"supportsLandingPage": true` and `"supportsEmptyDataView": true`
- `src/visual.ts` — Add landing page creation and toggle logic in `update()`

## Validation Checklist

- [ ] `"supportsLandingPage": true` is set in `capabilities.json`
- [ ] `"supportsEmptyDataView": true` is set in `capabilities.json`
- [ ] The landing page is displayed when no data is mapped
- [ ] The landing page is removed once data is added
- [ ] The landing page content is informative and helps the user
- [ ] No unrelated files were changed

## Reference

Official Microsoft documentation: https://learn.microsoft.com/en-us/power-bi/developer/visuals/landing-page
