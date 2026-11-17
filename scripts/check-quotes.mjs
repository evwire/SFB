// Story stacks: every quote and speaker must be an exact substring of the stored article text, and every published
// article must have at least one line. Same rule as src/lib/stories.ts (which also throws during `next build`).
import fs from "node:fs";
const q = JSON.parse(fs.readFileSync("data/stories/quotes.json", "utf8")).quotes;
const t = JSON.parse(fs.readFileSync("data/stories/articles-text.json", "utf8"));
const arts = JSON.parse(fs.readFileSync("data/wall/articles.json", "utf8"));
const bad = [];
for (const x of q) {
  const a = t[String(x.n)];
  if (!a) { bad.push(`${x.id}: no stored text for article ${x.n}`); continue; }
  if (!a.text.normalize("NFC").includes(x.text.normalize("NFC"))) bad.push(`${x.id}: not verbatim in article ${x.n}`);
  if (x.speaker && !a.text.includes(x.speaker)) bad.push(`${x.id}: speaker "${x.speaker}" not in article ${x.n}`);
}
const used = new Set(q.map((x) => x.n));
for (const a of arts) if (!used.has(a.n)) bad.push(`article ${a.n} has no line in any stack`);
if (bad.length) { console.error("check-quotes: FAILED\n" + bad.join("\n")); process.exit(1); }
console.log(`check-quotes: ${q.length} quotes verbatim, ${used.size}/${arts.length} articles covered`);
