# Power BI Custom Visuals - Agent Skills

A catalog of [Agent Skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills) for Power BI custom visual development. Each skill explains to an AI agent how to implement a specific feature or API in a custom visual - covering the implementation steps, certification constraints, and common pitfalls.

## How it works

This repository is a **source catalog**. The primary way to install skills is through the [`pbiviz` CLI](https://github.com/microsoft/PowerBI-visuals-tools):

```
pbiviz skills install
```

You can also copy skill directories manually into your project's `.github/skills/` folder if needed.

### What happens during install

1. [`pbiviz skills install`](https://github.com/microsoft/PowerBI-visuals-tools) clones this repo into a temporary directory.
2. It reads **`skills.json`** in the repo root to discover available skills.
3. It copies **only** the selected skill directories from `skills/<skill-id>/` into your visual project at:

   ```
   <your-visual>/
     .github/
       skills/
         <skill-id>/
           SKILL.md
           references/
             ...
   ```

4. It removes the temporary clone. Nothing else is copied.

### What gets copied

| Copied                              | NOT copied                                    |
| ----------------------------------- | --------------------------------------------- |
| `skills/<skill-id>/SKILL.md`        | `skills.json`                                 |
| `skills/<skill-id>/references/*`    | `README.md`, `CONTRIBUTING.md`, `LICENSE`      |
| `skills/<skill-id>/assets/*` (if any)| `tools/` directory                            |

Only the directories listed in `skills.json` under `skills[].path` are eligible for installation.

## `skills.json` manifest

The root [`skills.json`](/skills.json) file drives the install command. Key fields:

| Field              | Description                                                        |
| ------------------ | ------------------------------------------------------------------ |
| `schemaVersion`    | Manifest schema version.                           |
| `repo`             | GitHub repository URL for this catalog.                            |
| `defaultTarget`    | Where skills are placed in the consuming project (`.github/skills`). |
| `defaultSkills`    | Array of skill IDs installed by default when no selection is given. |
| `skills`           | Array of [skill descriptors](tools/types.ts#L11-L30) (see below).                            |

### Skill descriptor

| Field             | Required | Description                                                             |
| ----------------- | -------- | ----------------------------------------------------------------------- |
| `id`              | yes      | Unique kebab-case identifier. Must match directory name and SKILL.md `name`. |
| `path`            | yes      | Relative path to the skill directory (`skills/<id>`).                   |
| `version`         | yes      | Semver version of the skill content.                                    |
| `description`     | yes      | One-line summary.                                                       |
| `minApiVersion`   | no       | Minimum `powerbi-visuals-api` version required by this skill.           |
| `tags`            | no       | Array of category tags for filtering (`ui`, `interactivity`, `data-validation`, …). |
| `dependencies`    | no       | Array of other skill IDs that this skill recommends installing together. |
| `safe`            | yes      | `true` if the skill contains no executable code.                        |
| `scripts`         | yes      | `true` if the skill includes a `scripts/` directory.                    |

## Security

**No scripts by default.** Every skill shipped in this repo has `"scripts": false` and `"safe": true`. Skills contain only Markdown documentation and static reference files. There is no executable code to review or trust.

## Validation

A CI validation script checks that `skills.json`, skill directories, and SKILL.md frontmatter are consistent. It runs automatically on every pull request via GitHub Actions.

To run locally:

```bash
npm run validate
```

## Available skills

The single source of truth is [`skills.json`](skills.json). To list all available skills:

```bash
npm run skills-list
```

## npm scripts

After `npm install`, the following commands are available:

| Command | Description |
| --- | --- |
| `npm run validate` | Check that `skills.json`, skill directories, and SKILL.md frontmatter are consistent. Also runs in CI. |
| `npm run skills-add -- <id>` | Generate a new skill structure from templates and register it in `skills.json`. |
| `npm run skills-remove -- <id>` | Remove a skill directory and all its references from `skills.json`. Asks for confirmation (use `--force` to skip). |
| `npm run skills-list` | Print a table of all registered skills with version, tags, and description. |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add or improve skills.

## License

[MIT](LICENSE)
