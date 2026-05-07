---
name: format-pane
description: "Add Format Pane support using the formatting settings model."
---

# Power BI Visual — Add Format Pane

The Format Pane allows report creators to customize the appearance of a custom visual. Starting with API 5.1, visuals implement `getFormattingModel()` which returns a `FormattingModel` describing the properties, cards, and groups shown in the format pane. This replaces the deprecated `enumerateObjectInstances` method.

## Trigger

**Use when:**

- The user asks to implement power bi visual — add format pane in a Power BI custom visual.
- The user needs guidance on the format-pane feature or API.

**Don't use when:**

- The user is working with a standard (non-custom) Power BI visual that does not support the visuals SDK.

## Overview

The Format Pane allows report creators to customize the appearance of a custom visual. Starting with API 5.1, visuals implement `getFormattingModel()` which returns a `FormattingModel` describing the properties, cards, and groups shown in the format pane. This replaces the deprecated `enumerateObjectInstances` method.

See [references/README.md](references/README.md) for a detailed walkthrough, code samples, and a checklist.
