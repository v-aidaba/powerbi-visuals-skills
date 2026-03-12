/**
 * skills-remove.ts
 *
 * Removes a skill directory and its entry from skills.json.
 *
 * Usage:  npm run skills-remove -- <skill-id> [--force]
 *
 * Flags:
 *   --force   Skip confirmation prompt
 *
 * Deletes:
 *   skills/<skill-id>/  (entire directory)
 *   Entry from skills.json
 *   References from defaultSkills (if present)
 *   References from other skills' dependencies (if present)
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { SkillsManifest } from "./types";

const ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(ROOT, "skills");
const MANIFEST_PATH = path.join(ROOT, "skills.json");

// ── Helpers ─────────────────────────────────────────────────────────────────

function confirm(question: string): Promise<boolean> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim().toLowerCase() === "y");
        });
    });
}

// ── Parse arguments ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const force = args.includes("--force");
const skillId = args.find((a) => !a.startsWith("--"));

if (!skillId) {
    console.error("Usage: npm run skills-remove -- <skill-id> [--force]");
    console.error("Example: npm run skills-remove -- tooltip-service");
    process.exit(1);
}

// ── Load manifest ───────────────────────────────────────────────────────────

const manifest: SkillsManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
const skillIndex = manifest.skills.findIndex((s) => s.id === skillId);

if (skillIndex === -1) {
    console.error(`Error: Skill "${skillId}" not found in skills.json.`);
    process.exit(1);
}

// ── Confirm ─────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
    if (!force) {
        const ok = await confirm(`Remove skill "${skillId}"? This deletes the directory and all references. (y/N) `);
        if (!ok) {
            console.log("Aborted.");
            process.exit(0);
        }
    }

// ── Remove directory ────────────────────────────────────────────────────────

    const skillDir = path.join(SKILLS_DIR, skillId!);
    if (fs.existsSync(skillDir)) {
        fs.rmSync(skillDir, { recursive: true });
        console.log(`Deleted skills/${skillId}/`);
    } else {
        console.warn(`Warning: Directory "skills/${skillId}" does not exist on disk.`);
    }

// ── Remove from skills array ────────────────────────────────────────────────

    manifest.skills.splice(skillIndex, 1);

// ── Remove from defaultSkills ───────────────────────────────────────────────

    const defaultIndex = manifest.defaultSkills.indexOf(skillId!);
    if (defaultIndex !== -1) {
        manifest.defaultSkills.splice(defaultIndex, 1);
        console.log(`Removed "${skillId}" from defaultSkills.`);
    }

// ── Remove from other skills' dependencies ──────────────────────────────────

    for (const skill of manifest.skills) {
        if (skill.dependencies && skill.dependencies.includes(skillId!)) {
            skill.dependencies = skill.dependencies.filter((d: string) => d !== skillId);
            console.log(`Removed "${skillId}" from dependencies of "${skill.id}".`);
        }
    }

// ── Write manifest ──────────────────────────────────────────────────────────

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");

    console.log(`Removed "${skillId}" from skills.json.`);
    console.log(`\nDone. Run: npm run validate`);
}

run();
