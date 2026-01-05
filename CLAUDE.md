# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Impression** is a Claude Code skill/plugin that extracts design systems from live websites using Playwright browser automation. It outputs structured JSON, and can generate Tailwind configs or CSS variables. It also compares existing projects against extracted reference designs and generates implementation plans.

**No dependencies** - vanilla Node.js scripts, no package.json, no build step.

## Commands

```bash
# Compare project styles against a reference design system
node scripts/compare-design-systems.js <project-path> <reference.json> [output.md]

# Generate implementation plan with feature branch
node scripts/implement-design-changes.js <project-path> <reference.json> [--dry-run]

# Generate Tailwind config from extracted JSON
node scripts/generate-tailwind-config.js <design-system.json> [output.js]

# Generate CSS variables from extracted JSON
node scripts/generate-css-variables.js <design-system.json> [output.css]
```

## Live Extraction Workflow

The core use case is extracting from a live URL via Playwright MCP tools:

```javascript
// 1. Navigate to target
await browser_navigate({ url: 'https://example.com' });

// 2. Wait for fonts/animations to load
await browser_wait_for({ time: 3 });

// 3. Read the extraction script
const scriptContent = fs.readFileSync('scripts/extract-design-system.js', 'utf8');

// 4. Inject and execute in page context
const result = await browser_run_code({
  code: `async (page) => {
    return await page.evaluate(() => {
      ${scriptContent}
    });
  }`
});

// 5. Save result to examples/extracted/{site}.json
```

## Scripts

- `extract-design-system.js` - Browser injection script; walks DOM, extracts CSS vars, computed styles, keyframes
- `compare-design-systems.js` - Compares project to reference JSON using CIE ΔE 2000 color matching (ΔE < 5 = similar)
- `implement-design-changes.js` - Generates prioritized plan (P0: colors → P4: animations), creates feature branch
- `generate-tailwind-config.js` - JSON → Tailwind config
- `generate-css-variables.js` - JSON → CSS custom properties

## Pre-Extracted References

`examples/extracted/` contains ready-to-use design systems:
- `duchateau.json` - Luxury/editorial aesthetic
- `linear.json` - Dark-mode SaaS, Inter Variable, indigo accent
- `vercel.json` - Developer platform, Geist font, blue accent

## File Purposes

- `SKILL.md` - Instructions Claude receives when skill is invoked (edit for behavior changes)
- `README.md` - User-facing documentation
- `marketplace.json` - Plugin metadata for Claude Code marketplace
