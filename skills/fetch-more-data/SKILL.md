---
name: fetch-more-data
description: "Load data beyond the default 30K row limit using fetchMoreData API."
---

# Power BI Visual — Fetch More Data

The `fetchMoreData` API enables Power BI visuals to load data beyond the default 30K row limit by fetching data in configurable chunks. Data can be loaded in **segments aggregation mode** (default, accumulated data) or **incremental updates mode** (only new data each time).

## Trigger

**Use when:**

- The user asks to implement power bi visual — fetch more data in a Power BI custom visual.
- The user needs guidance on the fetch-more-data feature or API.

**Don't use when:**

- The user is working with a standard (non-custom) Power BI visual that does not support the visuals SDK.

## Overview

The `fetchMoreData` API enables Power BI visuals to load data beyond the default 30K row limit by fetching data in configurable chunks. Data can be loaded in **segments aggregation mode** (default, accumulated data) or **incremental updates mode** (only new data each time).

See [references/README.md](references/README.md) for a detailed walkthrough, code samples, and a checklist.
