/**
 * skills-add.ts
 *
 * Scaffolds a new skill directory from templates.
 *
 * Usage:  npm run skills-add -- <skill-id>
 *
 * Copies every file under templates/new-skill/ into skills/<skill-id>/,
 * applies placeholders, and adds an entry to skills.json with the same
 * file list. If the template grows, both the scaffolded skill and the
 * manifest stay in sync automatically.
 */

import * as fs from "fs";
import * as path from "path";
import { SkillEntry, SkillsManifest } from "./types";

const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(ROOT, "skills");
const TEMPLATES_DIR = path.join(ROOT, "templates", "new-skill");
const MANIFEST_PATH = path.join(ROOT, "skills.json");

// ── Parse argument ──────────────────────────────────────────────────────────

const skillId = process.argv[2];

if (!skillId) {
    console.error("Usage: npm run skills-add -- <skill-id>");
    console.error("Example: npm run skills-add -- tooltip-service");
    process.exit(1);
}

if (!KEBAB_CASE.test(skillId)) {
    console.error(`Error: "${skillId}" is not valid kebab-case (lowercase letters, numbers, hyphens).`);
    process.exit(1);
}

// ── Check for conflicts ─────────────────────────────────────────────────────

const skillDir = path.join(SKILLS_DIR, skillId);
if (fs.existsSync(skillDir)) {
    console.error(`Error: Directory "skills/${skillId}" already exists.`);
    process.exit(1);
}

const manifest: SkillsManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
if (manifest.skills.some((s) => s.id === skillId)) {
    console.error(`Error: Skill "${skillId}" already exists in skills.json.`);
    process.exit(1);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function toTitle(id: string): string {
    return id
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

function applyPlaceholders(content: string, id: string): string {
    const title = toTitle(id);
    return content
        .replace(/\{\{SKILL_ID\}\}/g, id)
        .replace(/\{\{SKILL_TITLE\}\}/g, title)
        .replace(/\{\{DESCRIPTION\}\}/g, `Implement ${title} in a Power BI custom visual.`);
}

function collectFiles(dir: string, prefix = ""): string[] {
    const result: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
            result.push(...collectFiles(path.join(dir, entry.name), rel));
        } else {
            result.push(rel);
        }
    }
    return result;
}

// ── Scaffold files ──────────────────────────────────────────────────────────

const templateFiles = collectFiles(TEMPLATES_DIR);

for (const relPath of templateFiles) {
    const srcPath = path.join(TEMPLATES_DIR, relPath);
    const destPath = path.join(skillDir, relPath);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    const content = fs.readFileSync(srcPath, "utf-8");
    fs.writeFileSync(destPath, applyPlaceholders(content, skillId));
}

// ── Update skills.json ──────────────────────────────────────────────────────

const newEntry: SkillEntry = {
    id: skillId,
    path: `skills/${skillId}`,
    version: "1.0.0",
    description: `Implement ${toTitle(skillId)} in a Power BI custom visual.`,
    minApiVersion: "3.8.0",
    tags: [],
    dependencies: [],
    safe: true,
    scripts: false,
    files: templateFiles,
};

manifest.skills.push(newEntry);

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");

// ── Done ────────────────────────────────────────────────────────────────────

console.log(`\nCreated skill "${skillId}":\n`);
for (const relPath of templateFiles) {
    console.log(`  skills/${skillId}/${relPath}`);
}
console.log(`  skills.json updated\n`);
console.log(`Next steps:`);
console.log(`  1. Edit skills/${skillId}/SKILL.md - fill in trigger, overview, steps`);
console.log(`  2. Edit skills/${skillId}/references/README.md - add detailed walkthrough`);
console.log(`  3. Update description, minApiVersion, and tags in skills.json`);
console.log(`  4. Run: npm run validate`);
