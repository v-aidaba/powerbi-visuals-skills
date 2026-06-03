# Contributing to Power BI Custom Visuals Agent Skills

Thank you for helping grow the skills catalog! This guide covers how to add a new skill, naming conventions, and content guidelines.

## Adding a new skill

### 1. Choose an ID

- **Lowercase kebab-case**: `my-new-skill` (no underscores, no camelCase).
- The `<skill-id>` **must** match the `name:` field in the SKILL.md YAML frontmatter exactly.
- Pick a short, descriptive name that reflects the task: `dialog-box`, `display-warning-icon`, `conditional-formatting`.

### 2. Generate the skill

Run the scaffold command:

```bash
npm run skills-add -- <skill-id>
```

This creates the directory structure from templates and adds an entry to `skills.json`:

```
skills/<skill-id>/
  SKILL.md               # from templates/new-skill/SKILL.md - fill in the placeholders
  references/
    README.md             # from templates/new-skill/references/README.md
```

You can also create the files manually if you prefer (see `templates/new-skill/` for the structure).

### 3. Write `SKILL.md`

Every SKILL.md must start with YAML frontmatter:

```yaml
---
name: my-new-skill
description: "One-line summary of what this skill teaches."
---
```

Then write the body following these rules:

- **Start with a trigger block** - clearly state "Use when …" and "Don't use when …" so agents know when to activate the skill.
- **Keep it lean.** The SKILL.md body should fit comfortably in an LLM context window. Aim for under ~200 lines.
- **Move deep content to `references/`.** Step-by-step walkthroughs, large code samples, API tables, checklists - put these in `references/README.md` or additional files under `references/`.
- **Be Power BI–specific.** Reference `capabilities.json`, `visual.ts`, format pane APIs, `powerbi-visuals-api`, certification constraints, and common pitfalls. Generic TypeScript advice belongs elsewhere.

### 4. Review the `skills.json` entry

If you used `npm run skills-add`, an entry was already added to `skills.json` with placeholder values. Review and update it.

The full schema is defined in [`tools/types.ts`](tools/types.ts#L11-L30) (`SkillEntry` interface) - this is the single source of truth for all fields. Key fields to check:

- **`description`**: must match the `description` in SKILL.md frontmatter exactly.
- **`version`**: start at `1.0.0`; bump when you update the skill content.
- **`minApiVersion`**: the minimum `powerbi-visuals-api` version required. Omit if the skill is API-version-agnostic.
- **`tags`**: one or more category labels (e.g. `ui`, `interactivity`, `data-validation`, `formatting`, `localization`).
- **`dependencies`**: array of other skill IDs this skill recommends. Use `[]` if none.
- `safe` must be `true` unless the skill contains executable content (strongly discouraged).
- `scripts` must be `false` - no `scripts/` directories.
- **`files`**: required. Explicit list of every file in the skill directory, paths relative to `path`. Must include `SKILL.md` (by convention listed first), followed by any `references/*` and other static assets. If you add or remove a file in the skill directory, update this array. `npm run validate` fails when the list is missing entries or references files that do not exist on disk.

Example:

```json
{
  "id": "bookmarks-support",
  "path": "skills/bookmarks-support",
  "files": ["SKILL.md", "references/README.md"]
}
```

This lets consumers (such as the MCP server in `microsoft/PowerBI-visuals-tools`) fetch each file directly from `raw.githubusercontent.com` without using the rate-limited GitHub contents API.

### 5. Validate locally

Run the validation script before pushing:

```bash
npm run validate
```

It checks that:
- Every `id` in `skills.json` has a matching `skills/<id>/SKILL.md` directory.
- The `name` in SKILL.md frontmatter matches the `id`.
- No orphaned skill directories exist without a `skills.json` entry.
- All `dependencies` reference valid skill IDs.
- The `files` array lists every file present on disk (no missing or extra entries) and includes `SKILL.md`.

### 6. Open a pull request

- One skill per PR (unless tightly related).
- Ensure no TODO placeholders remain in your content.
- Verify the skill directory name, frontmatter `name`, and `skills.json` `id` all match.

## Content guidelines

| Do                                                    | Don't                                                   |
| ----------------------------------------------------- | ------------------------------------------------------- |
| Write Power BI–specific guidance                      | Write generic TypeScript/D3 tutorials                   |
| Put large code blocks in `references/`                | Paste 300-line samples directly in SKILL.md             |
| Include certification constraints where relevant      | Ignore AppSource/certification rules                    |
| State trigger conditions ("Use when … / Don't when …")| Leave the agent guessing when to use the skill          |
| Use kebab-case IDs                                    | Use camelCase, snake_case, or spaces                    |

## Security policy

- **No executable scripts.** Skills must contain only Markdown and static assets.
- All skills must have `"safe": true` and `"scripts": false` in `skills.json`.
- If a future version of the spec allows scripts, they will require explicit opt-in and code review.

## Questions?

Open an issue in this repository.
