# Power BI Visual — Add Unit Tests for Visual Project

## Overview

Unit testing ensures your Power BI custom visual works correctly by verifying data transformations, rendering logic, and interaction behaviors in isolation. Power BI visuals typically use Jasmine with Karma, or Jest, along with `powerbi-visuals-utils-testutils` for mocking the Power BI host environment.

**Official documentation:** https://learn.microsoft.com/en-us/power-bi/developer/visuals/unit-tests-introduction

## Requirements

- **powerbi-visuals-utils-testutils** for creating mock host and data views
- A test framework: **Jasmine + Karma** or **Jest**
- **karma-webpack** (if using Karma)

## Step-by-Step Implementation

### Step 1: Install Test Dependencies

```bash
npm install --save-dev jasmine karma karma-jasmine karma-chrome-launcher karma-webpack karma-coverage
npm install --save-dev powerbi-visuals-utils-testutils
npm install --save-dev @types/jasmine
```

Or with Jest:

```bash
npm install --save-dev jest ts-jest @types/jest
npm install --save-dev powerbi-visuals-utils-testutils
```

### Step 2: Create Test Helper for Mock Host

Create `test/visualBuilder.ts`:

```typescript
import powerbi from "powerbi-visuals-api";
import { VisualBuilderBase } from "powerbi-visuals-utils-testutils";
import { Visual } from "../src/visual";

export class VisualBuilder extends VisualBuilderBase<Visual> {
    constructor(width: number, height: number) {
        super(width, height, "myVisualId");
    }

    protected build(options: powerbi.extensibility.visual.VisualConstructorOptions): Visual {
        return new Visual(options);
    }

    public get instance(): Visual {
        return this.visual;
    }

    public get mainElement(): HTMLElement {
        return this.element;
    }
}
```

### Step 3: Create Test Data Helper

Create `test/visualData.ts`:

```typescript
import powerbi from "powerbi-visuals-api";
import { testDataViewBuilder } from "powerbi-visuals-utils-testutils";
import TestDataViewBuilder = testDataViewBuilder.TestDataViewBuilder;

export class VisualData extends TestDataViewBuilder {
    private categories: string[] = ["Category1", "Category2", "Category3"];
    private values: number[] = [100, 200, 300];

    public getDataView(columnNames?: string[]): powerbi.DataView {
        const dataViewBuilder = this.createCategoricalDataViewBuilder(
            [
                {
                    source: {
                        displayName: "Category",
                        roles: { category: true },
                        type: { text: true }
                    },
                    values: this.categories
                }
            ],
            [
                {
                    source: {
                        displayName: "Value",
                        roles: { measure: true },
                        type: { numeric: true },
                        isMeasure: true
                    },
                    values: this.values
                }
            ]
        );

        return dataViewBuilder.build();
    }
}
```

### Step 4: Write Test Cases

Create `test/visual.test.ts`:

```typescript
import { VisualBuilder } from "./visualBuilder";
import { VisualData } from "./visualData";
import powerbi from "powerbi-visuals-api";

describe("Visual", () => {
    let visualBuilder: VisualBuilder;
    let dataView: powerbi.DataView;
    let visualData: VisualData;

    beforeEach(() => {
        visualBuilder = new VisualBuilder(500, 500);
        visualData = new VisualData();
        dataView = visualData.getDataView();
    });

    it("should create the visual", () => {
        expect(visualBuilder.instance).toBeDefined();
    });

    it("should render with data", (done) => {
        visualBuilder.updateRenderTimeout(
            [dataView],
            () => {
                const elements = visualBuilder.mainElement.querySelectorAll(".data-point");
                expect(elements.length).toBeGreaterThan(0);
                done();
            }
        );
    });

    it("should handle empty data", (done) => {
        visualBuilder.updateRenderTimeout(
            [{ metadata: { columns: [] } } as powerbi.DataView],
            () => {
                // Visual should handle gracefully
                done();
            }
        );
    });

    it("should handle null dataViews", (done) => {
        visualBuilder.updateRenderTimeout(
            [],
            () => {
                // Visual should handle gracefully
                done();
            }
        );
    });
});
```

### Step 5: Configure the Test Runner

**For Karma** — Create `karma.conf.js`:

```javascript
module.exports = function(config) {
    config.set({
        frameworks: ["jasmine"],
        files: ["test/**/*.test.ts"],
        preprocessors: {
            "test/**/*.test.ts": ["webpack"]
        },
        browsers: ["ChromeHeadless"],
        singleRun: true
    });
};
```

**For Jest** — Add to `package.json`:

```json
{
    "jest": {
        "preset": "ts-jest",
        "testEnvironment": "jsdom",
        "testMatch": ["**/test/**/*.test.ts"]
    }
}
```

### Step 6: Add Test Script to package.json

```json
{
    "scripts": {
        "test": "karma start" 
    }
}
```

Or for Jest:

```json
{
    "scripts": {
        "test": "jest"
    }
}
```

## Common Test Scenarios

| Scenario | What to Test |
|---|---|
| Rendering | Elements are created and visible |
| Data binding | Correct number of data points rendered |
| Empty data | Visual handles null/empty data gracefully |
| Formatting | Format pane properties affect rendering |
| Selection | Click handlers trigger selection |
| Tooltips | Tooltip data is correctly generated |
| High contrast | Colors change in high-contrast mode |

## Files That May Need Changes

- `package.json` — Add test dependencies and scripts
- `test/visualBuilder.ts` — (new) Mock visual builder
- `test/visualData.ts` — (new) Test data generator
- `test/visual.test.ts` — (new) Test cases

## Validation Checklist

- [ ] Test dependencies are installed (`powerbi-visuals-utils-testutils`, test framework)
- [ ] `VisualBuilder` extends `VisualBuilderBase` with the correct visual class
- [ ] Tests cover rendering, data binding, and empty data scenarios
- [ ] Tests pass with `npm test`
- [ ] No unrelated files were changed

## Reference

Official Microsoft documentation: https://learn.microsoft.com/en-us/power-bi/developer/visuals/unit-tests-introduction
