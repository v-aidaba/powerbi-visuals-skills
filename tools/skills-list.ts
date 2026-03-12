/**
 * skills-list.ts
 *
 * Prints all skills from skills.json in a readable table.
 *
 * Usage:  npm run skills-list
 */

import * as fs from "fs";
import * as path from "path";
import { SkillEntry, SkillsManifest } from "./types";

const MANIFEST_PATH = path.join(__dirname, "..", "skills.json");
const manifest: SkillsManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));

const skills: SkillEntry[] = manifest.skills;

if (skills.length === 0) {
    console.log("No skills registered in skills.json.");
    process.exit(0);
}

// Calculate column widths
const idWidth = Math.max(2, ...skills.map((s) => s.id.length));
const verWidth = Math.max(7, ...skills.map((s) => s.version.length));
const apiWidth = Math.max(6, ...skills.map((s) => (s.minApiVersion || "—").length));

const header = `${"ID".padEnd(idWidth)}  ${"Version".padEnd(verWidth)}  ${"MinAPI".padEnd(apiWidth)}  Description`;
const sep = "-".repeat(header.length);

console.log(`\n${skills.length} skill(s) registered:\n`);
console.log(header);
console.log(sep);

for (const s of skills) {
    const api = s.minApiVersion || "—";
    console.log(`${s.id.padEnd(idWidth)}  ${s.version.padEnd(verWidth)}  ${api.padEnd(apiWidth)}  ${s.description}`);
}

const allTags = [...new Set(skills.flatMap((s) => s.tags || []))].sort();
if (allTags.length > 0) {
    console.log(`\nTags: ${allTags.join(", ")}`);
}

console.log("");
