/**
 * types.ts
 *
 * Shared interfaces for the skills catalog.
 * This is the single source of truth for the skills.json schema.
 *
 * All tools (validate, skills-add, skills-remove, skills-list) import from here.
 * CONTRIBUTING.md references this file instead of inline JSON examples.
 */

export interface SkillEntry {
    /** Unique kebab-case identifier. Must match directory name and SKILL.md frontmatter `name`. */
    id: string;
    /** Relative path to the skill directory, e.g. `skills/<id>`. */
    path: string;
    /** Semver version of the skill content. Start at "1.0.0". */
    version: string;
    /** One-line description. Must match SKILL.md frontmatter `description`. */
    description: string;
    /** Minimum `powerbi-visuals-api` version required by this skill. */
    minApiVersion?: string;
    /** Category tags for filtering (e.g. "ui", "interactivity", "data-validation"). */
    tags?: string[];
    /** Other skill IDs this skill recommends installing together. */
    dependencies?: string[];
    /** `true` if the skill contains no executable code. */
    safe: boolean;
    /** `true` if the skill includes a `scripts/` directory. */
    scripts: boolean;
}

export interface SkillsManifest {
    /** Manifest schema version. */
    schemaVersion: number;
    /** GitHub repository URL for this catalog. */
    repo: string;
    /** Where skills are placed in the consuming project (e.g. ".github/skills"). */
    defaultTarget: string;
    /** Skill IDs installed by default when no selection is given. */
    defaultSkills: string[];
    /** Array of skill descriptors. */
    skills: SkillEntry[];
}
