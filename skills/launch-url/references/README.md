# Power BI Visual — Launch URL

## Overview

The Launch URL API allows a Power BI custom visual to open a URL in a new browser tab using `host.launchUrl()`. This is useful for linking to documentation, external resources, or data source details.

**Official documentation:** https://learn.microsoft.com/en-us/power-bi/developer/visuals/launch-url

## Requirements

- **API version:** 1.9.0 or higher
- **powerbi-visuals-api** package must be installed
- Only absolute URLs with HTTP or HTTPS protocols are supported

## Step-by-Step Implementation

### Step 1: Store the Host Reference

```typescript
import powerbi from "powerbi-visuals-api";
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

export class Visual implements powerbi.extensibility.visual.IVisual {
    private host: IVisualHost;

    constructor(options: powerbi.extensibility.visual.VisualConstructorOptions) {
        this.host = options.host;
    }
}
```

### Step 2: Call launchUrl on User Action

```typescript
this.host.launchUrl("https://learn.microsoft.com/power-bi/");
```

### Step 3: Create a Link Element

```typescript
constructor(options: powerbi.extensibility.visual.VisualConstructorOptions) {
    this.host = options.host;
    this.target = options.element;

    const helpLink = document.createElement("a");
    helpLink.textContent = "?";
    helpLink.setAttribute("title", "Open documentation");
    helpLink.setAttribute("class", "helpLink");
    helpLink.addEventListener("click", () => {
        this.host.launchUrl("https://learn.microsoft.com/power-bi/developer/visuals/");
    });
    this.target.appendChild(helpLink);
}
```

### Step 4: Add a Toggle via Format Pane (Optional)

Add a static object in `capabilities.json` to let report authors hide/show the link:

```json
{
    "objects": {
        "generalView": {
            "displayName": "General View",
            "properties": {
                "showHelpLink": {
                    "displayName": "Show Help Button",
                    "type": {
                        "bool": true
                    }
                }
            }
        }
    }
}
```

Then toggle visibility in `update()`:

```typescript
public update(options: powerbi.extensibility.visual.VisualUpdateOptions): void {
    if (settings.generalView.showHelpLink) {
        this.helpLinkElement.classList.remove("hidden");
    } else {
        this.helpLinkElement.classList.add("hidden");
    }
}
```

## Best Practices

- Only open links in response to **explicit user actions** (clicks).
- Give report authors a way to disable/hide the link.
- Avoid calling `launchUrl()` from loops, `update()`, or frequently recurring code.
- Use only absolute URLs with `https://` — no relative paths, FTP, or MAILTO.

## Considerations and Limitations

- Only HTTP and HTTPS protocols are supported.
- Only absolute paths work (e.g., `https://example.com/page`), not relative (`/page`).
- Do not trigger `launchUrl()` automatically — only on user interaction.

## Files That May Need Changes

- `src/visual.ts` — Add `host.launchUrl()` call on click events
- `capabilities.json` — (Optional) Add toggle object for showing/hiding the link

## Validation Checklist

- [ ] `host.launchUrl()` is called only in response to user actions
- [ ] The URL is absolute and uses HTTP or HTTPS
- [ ] (Optional) A toggle exists in the Format pane to show/hide the link
- [ ] The code contains `.launchUrl` (detected by the tool's linting feature)
- [ ] No unrelated files were changed

## Reference

Official Microsoft documentation: https://learn.microsoft.com/en-us/power-bi/developer/visuals/launch-url
