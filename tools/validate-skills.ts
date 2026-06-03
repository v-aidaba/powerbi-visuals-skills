/**
 * validate-skills.ts
 *
 * CI validation script for the skills catalog.
 * Checks that skills.json, skill directories, and SKILL.md frontmatter are consistent.
 *
 * Usage:  npm run validate
 *
 * Exit code 0 = all checks passed, 1 = errors found.
 */

import * as fs from "fs";
import * as path from "path";
import { SkillsManifest } from "./types";

const ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(ROOT, "skills");
const MANIFEST_PATH = path.join(ROOT, "skills.json");
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

const errors: string[] = [];

function error(msg: string): void {
    errors.push(msg);
    console.error(`  ERROR: ${msg}`);
}

// ── 1. Load manifest ────────────────────────────────────────────────────────

if (!fs.existsSync(MANIFEST_PATH)) {
    error("skills.json not found in repo root.");
    process.exit(1);
}

let manifest: SkillsManifest;
try {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
} catch (e) {
    error(`skills.json is not valid JSON: ${(e as Error).message}`);
    process.exit(1);
}

console.log(`Validating ${manifest.skills.length} skill(s) …\n`);

// ── 2. Collect all skill directories on disk ────────────────────────────────

const dirsOnDisk = new Set<string>();
if (fs.existsSync(SKILLS_DIR)) {
    for (const entry of fs.readdirSync(SKILLS_DIR, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            dirsOnDisk.add(entry.name);
        }
    }
}

const idsInManifest = new Set<string>();

// ── 3. Validate each skill entry in the manifest ────────────────────────────

for (const skill of manifest.skills) {
    console.log(`• ${skill.id}`);

    // Duplicate ID
    if (idsInManifest.has(skill.id)) {
        error(`Duplicate skill id "${skill.id}" in skills.json.`);
    }
    idsInManifest.add(skill.id);

    // Kebab-case
    if (!KEBAB_CASE.test(skill.id)) {
        error(`"${skill.id}" is not valid kebab-case.`);
    }

    // Version
    if (!skill.version || !SEMVER.test(skill.version)) {
        error(`"${skill.id}" has missing or invalid version (expected semver x.y.z).`);
    }

    // Path consistency
    const expectedPath = `skills/${skill.id}`;
    if (skill.path !== expectedPath) {
        error(`"${skill.id}" path is "${skill.path}", expected "${expectedPath}".`);
    }

    // Directory exists
    const skillDir = path.join(ROOT, skill.path);
    if (!fs.existsSync(skillDir)) {
        error(`Directory "${skill.path}" does not exist for skill "${skill.id}".`);
        continue;
    }

    // SKILL.md exists
    const skillMdPath = path.join(skillDir, "SKILL.md");
    if (!fs.existsSync(skillMdPath)) {
        error(`"${skill.path}/SKILL.md" not found.`);
        continue;
    }

    // Frontmatter validation
    const content = fs.readFileSync(skillMdPath, "utf-8");
    const match = FRONTMATTER_RE.exec(content);
    if (!match) {
        error(`"${skill.path}/SKILL.md" has no YAML frontmatter.`);
    } else {
        const frontmatter = match[1];

        // Extract name from frontmatter (simple line-based parsing, no YAML lib needed)
        const nameLine = frontmatter.split(/\r?\n/).find((l) => l.startsWith("name:"));
        if (!nameLine) {
            error(`"${skill.path}/SKILL.md" frontmatter missing "name:" field.`);
        } else {
            const nameValue = nameLine.replace(/^name:\s*/, "").replace(/^["']|["']$/g, "").trim();
            if (nameValue !== skill.id) {
                error(
                    `"${skill.path}/SKILL.md" frontmatter name is "${nameValue}", ` +
                    `but skills.json id is "${skill.id}". They must match.`
                );
            }
        }

        const descLine = frontmatter.split(/\r?\n/).find((l) => l.startsWith("description:"));
        if (!descLine) {
            error(`"${skill.path}/SKILL.md" frontmatter missing "description:" field.`);
        } else {
            const descValue = descLine.replace(/^description:\s*/, "").replace(/^["']|["']$/g, "").trim();
            if (descValue !== skill.description) {
                error(
                    `"${skill.id}" description mismatch: skills.json says "${skill.description}", ` +
                    `but SKILL.md frontmatter says "${descValue}".`
                );
            }
        }
    }

    // Dependencies reference valid skill IDs
    if (skill.dependencies) {
        for (const dep of skill.dependencies) {
            if (!manifest.skills.some((s) => s.id === dep)) {
                error(`"${skill.id}" depends on "${dep}", which is not in skills.json.`);
            }
        }
    }

    // `files` array: required, must list every file on disk and match exactly.
    if (!Array.isArray(skill.files) || skill.files.length === 0) {
        error(`"${skill.id}" is missing the "files" array in skills.json.`);
    } else {
        if (!skill.files.includes("SKILL.md")) {
            error(`"${skill.id}" files array must include "SKILL.md".`);
        }

        // Collect all files actually on disk, relative to the skill dir.
        const filesOnDisk = new Set<string>();
        const walk = (dir: string, prefix: string): void => {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
                if (entry.isDirectory()) {
                    walk(path.join(dir, entry.name), rel);
                } else if (entry.isFile()) {
                    filesOnDisk.add(rel);
                }
            }
        };
        walk(skillDir, "");

        const filesInManifest = new Set(skill.files);

        for (const declared of skill.files) {
            if (!filesOnDisk.has(declared)) {
                error(`"${skill.id}" files array lists "${declared}" but it does not exist on disk.`);
            }
        }
        for (const actual of filesOnDisk) {
            if (!filesInManifest.has(actual)) {
                error(`"${skill.id}" has file "${actual}" on disk that is not declared in the manifest "files" array.`);
            }
        }
    }

    // Remove from disk set (to detect orphans later)
    dirsOnDisk.delete(skill.id);
}

// ── 4. Orphaned directories ─────────────────────────────────────────────────

for (const orphan of dirsOnDisk) {
    error(`Directory "skills/${orphan}" exists on disk but has no entry in skills.json.`);
}

// ── 5. defaultSkills reference valid IDs ────────────────────────────────────

for (const def of manifest.defaultSkills) {
    if (!idsInManifest.has(def)) {
        error(`defaultSkills contains "${def}", which is not a valid skill id.`);
    }
}

// ── 6. Summary ──────────────────────────────────────────────────────────────

console.log("");
if (errors.length === 0) {
    console.log("All checks passed.");
    process.exit(0);
} else {
    console.error(`${errors.length} error(s) found.`);
    process.exit(1);
}
