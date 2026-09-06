/**
 * research-agent.js
 *
 * WHAT THIS DOES, IN PLAIN TERMS:
 * You give it a country name. It calls Claude (with web search turned on)
 * and asks it to research that country's GeoGuessr-relevant traits and
 * hand back ONLY a JSON object matching SCHEMA.md. That JSON gets saved
 * as a draft file in /countries/. You then open that file, read through
 * it, fix anything wrong, and flip "status" from "draft" to "reviewed".
 *
 * This does NOT publish anything automatically. It's a first-draft
 * generator, not an autonomous content pipeline. Think of it as an
 * intern who does the research legwork and you're the editor.
 *
 * HOW TO RUN IT:
 *   1. Set an environment variable with your Anthropic API key:
 *        export ANTHROPIC_API_KEY=sk-ant-...
 *   2. Run:
 *        node research-agent.js "Bulgaria"
 *   3. Check /countries/bg.json (or whatever it names the file) —
 *      it will NOT overwrite an existing reviewed file; it writes to
 *      a *-draft.json suffix instead if a real file already exists,
 *      so you never lose your own edits.
 *
 * WHY IT'S STRUCTURED THIS WAY:
 * - We force JSON-only output so this can be parsed and dropped straight
 *   into the countries/ folder without you hand-copying anything.
 * - We require the model to cite its sources array, so review is fast:
 *   you're checking claims against links, not researching from zero.
 * - We never auto-mark anything "reviewed" — that flag is a promise
 *   from a human, not a model.
 */

const fs = require("fs");
const path = require("path");

const SCHEMA_TEMPLATE = fs.readFileSync(
  path.join(__dirname, "..", "SCHEMA.md"),
  "utf-8"
);

const SYSTEM_PROMPT = `You are a research assistant populating a GeoGuessr/WorldGuessr study
database. You will be given a country name. Research its GeoGuessr-relevant
identifying traits using web search, prioritizing GeoGuessr community meta
resources (sites like Plonkit, Geomastr, Geometas, GeoGuessr subreddit
guides) as well as general facts about language, architecture, road
infrastructure, and vehicles.

Return ONLY a single JSON object matching this schema (no markdown fences,
no commentary, no preamble):

${SCHEMA_TEMPLATE}

Rules:
- Set "status" to "draft" always — you never set it to "reviewed".
- Populate "sources" with the actual URLs you used.
- If you are not confident about a field, write a short honest note like
  "No strong distinguishing feature found" rather than inventing one.
  A blank or honest "unclear" field is far more useful than a confident
  wrong one — this data gets studied and trusted later.
- Keep field values concise (1-3 sentences), not essays.
- "tier" should be 1 for countries that appear frequently in GeoGuessr-style
  games and have well-documented meta, 2 for moderately common, 3 for rare.`;

async function researchCountry(countryName) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Research and produce the JSON entry for: ${countryName}`,
        },
      ],
      tools: [{ type: "web_search_20250305", name: "web_search" }],
    }),
  });

  const data = await response.json();

  // Pull out just the text blocks (web_search tool blocks are separate
  // content items — we only want the final text response, which should
  // be the JSON object per our system prompt).
  const textBlocks = data.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  // Strip any accidental markdown fencing before parsing.
  const cleaned = textBlocks.replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error("Could not parse model output as JSON. Raw output:");
    console.error(cleaned);
    throw err;
  }

  return parsed;
}

function saveDraft(countryData) {
  const countriesDir = path.join(__dirname, "..", "countries");
  const targetPath = path.join(countriesDir, `${countryData.id}.json`);
  const draftPath = path.join(countriesDir, `${countryData.id}-draft.json`);

  const outPath = fs.existsSync(targetPath) ? draftPath : targetPath;

  fs.writeFileSync(outPath, JSON.stringify(countryData, null, 2));
  console.log(`Saved: ${outPath}`);
  if (outPath === draftPath) {
    console.log(
      `NOTE: ${targetPath} already existed, so this was saved as a *-draft file instead of overwriting it. Compare and merge by hand.`
    );
  }
}

async function main() {
  const countryName = process.argv[2];
  if (!countryName) {
    console.error('Usage: node research-agent.js "Country Name"');
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Set ANTHROPIC_API_KEY in your environment first.");
    process.exit(1);
  }

  console.log(`Researching ${countryName}...`);
  const countryData = await researchCountry(countryName);
  saveDraft(countryData);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
