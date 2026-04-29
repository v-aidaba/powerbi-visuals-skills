---
name: permissions-api
description: "Query host permissions at runtime using the Check Permissions API."
---

# Power BI Visual — Permissions API (Check Permissions)

The Check Permissions API allows a Power BI custom visual to query the host at runtime to determine which privileges are granted. This enables the visual to adapt its behavior based on permission status — for example, hiding a download button if file export is disabled by the admin.

## Trigger

**Use when:**

- The user asks to implement power bi visual — permissions api (check permissions) in a Power BI custom visual.
- The user needs guidance on the permissions-api feature or API.

**Don't use when:**

- The user is working with a standard (non-custom) Power BI visual that does not support the visuals SDK.

## Overview

The Check Permissions API allows a Power BI custom visual to query the host at runtime to determine which privileges are granted. This enables the visual to adapt its behavior based on permission status — for example, hiding a download button if file export is disabled by the admin.

See [references/README.md](references/README.md) for a detailed walkthrough, code samples, and a checklist.
