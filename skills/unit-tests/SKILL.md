---
name: unit-tests
description: "Add unit tests to verify data transformations and rendering logic."
---

# Power BI Visual — Add Unit Tests for Visual Project

Unit testing ensures your Power BI custom visual works correctly by verifying data transformations, rendering logic, and interaction behaviors in isolation. Power BI visuals typically use Jasmine with Karma, or Jest, along with `powerbi-visuals-utils-testutils` for mocking the Power BI host environment.

## Trigger

**Use when:**

- The user asks to implement power bi visual — add unit tests for visual project in a Power BI custom visual.
- The user needs guidance on the unit-tests feature or API.

**Don't use when:**

- The user is working with a standard (non-custom) Power BI visual that does not support the visuals SDK.

## Overview

Unit testing ensures your Power BI custom visual works correctly by verifying data transformations, rendering logic, and interaction behaviors in isolation. Power BI visuals typically use Jasmine with Karma, or Jest, along with `powerbi-visuals-utils-testutils` for mocking the Power BI host environment.

See [references/README.md](references/README.md) for a detailed walkthrough, code samples, and a checklist.
