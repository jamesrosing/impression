# Metadata Validation Checklist

Complete reference for validating YAML frontmatter in SKILL.md files.

## Required Fields

### Name Field

**Requirements:**
- Maximum 64 characters
- Lowercase letters (a-z) only
- Numbers (0-9) allowed
- Hyphens (-) allowed as separators
- No underscores, spaces, or special characters
- Must not contain reserved words: "anthropic", "claude"
- Must match directory name exactly

**Regex pattern:**
```regex
^[a-z0-9]+(-[a-z0-9]+)*$
```

**Valid examples:**
```yaml
name: pdf-processing
name: skill-creator
name: bigquery-analysis
name: html-to-pdf
name: data-pipeline-v2
```

**Invalid examples:**
```yaml
name: PDF_Processing  # Uppercase and underscore
name: skill creator   # Space
name: my.skill        # Period
name: Claude-Helper   # Reserved word and uppercase
name: anthropic-tool  # Reserved word
```

### Description Field

**Requirements:**
- Non-empty (minimum 1 character)
- Maximum 1024 characters
- No XML tags (<>, &lt;, &gt;)
- Must include WHAT the skill does
- Must include WHEN to use it (triggers, contexts, keywords)
- Written in third person
- Should be self-contained (Claude uses this to decide whether to load the skill)

**Quality checklist:**
- [ ] Describes the main functionality clearly
- [ ] Lists specific use cases or trigger keywords
- [ ] Written in third person ("This skill..." not "I can..." or "You can...")
- [ ] Includes enough detail for Claude to know when to activate
- [ ] Mentions file types, domains, or contexts where applicable

**Excellent example:**
```yaml
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
```
Why: Specifies what (extract, fill, merge), when (PDF files mentioned), and includes trigger keywords (PDFs, forms, document extraction).

**Good example:**
```yaml
description: Analyze Excel spreadsheets, create pivot tables, generate charts. Use when analyzing Excel files, spreadsheets, tabular data, or .xlsx files.
```
Why: Clear functionality, multiple trigger keywords, specific file types.

**Needs improvement:**
```yaml
description: Helps with documents
```
Problems: Too vague, no "when" guidance, no trigger keywords, could apply to anything.

**Poor example:**
```yaml
description: I can help you process various document formats including PDFs and Word files.
```
Problems: First person voice, vague "various formats", lacks specific triggers.

**Third-person voice patterns:**

✓ Correct:
- "This skill..."
- "Processes..."
- "Creates..."
- "Use when..."
- "Applies..."

✗ Avoid:
- "I can..."
- "I help..."
- "I will..."
- "You can use this to..."
- "Let me help you..."

## Optional Fields

**Allowed optional fields** (according to Claude.ai specification):
- `license` - License information
- `allowed-tools` - List of MCP tools this skill can use
- `metadata` - Container for custom metadata (version, dependencies, etc.)

### License

**Format:** String describing license

```yaml
license: MIT
license: Apache 2.0
license: Project-specific (Company Name)
license: Proprietary
```

**When to include:**
- Open source skills
- Project-specific skills
- Skills with licensing requirements

### Allowed Tools

**Format:** Array of MCP tool names

```yaml
allowed-tools: [Read, Bash, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot]
```

**When to include:**
- Skills that should restrict which tools Claude can use
- Skills with security requirements
- Skills that need specific MCP tool sets

### Metadata (Container for Custom Fields)

**Format:** Object/dictionary containing custom metadata

```yaml
metadata:
  version: 1.0.0
  dependencies: python>=3.8, pandas>=1.5.0
  author: Team Name
  created: 2025-10-29
```

**Common metadata fields:**

**version** - Semantic versioning (MAJOR.MINOR.PATCH)
```yaml
metadata:
  version: 1.0.0
  version: 2.1.3
  version: 0.5.0-beta
```
- Use for skills updated over time
- Track breaking changes
- Coordinate with team members

**dependencies** - Required packages
```yaml
metadata:
  dependencies: python>=3.8, pandas>=1.5.0, requests
```
- Skills with scripts requiring specific packages
- Version-specific requirements

**Note:** The `metadata` field is a container - you cannot use `version` or `dependencies` at the top level. They must be nested under `metadata`.

## Validation Checklist

Copy this checklist when manually reviewing metadata:

```
YAML Frontmatter Validation:
- [ ] YAML block exists (delimited by ---)
- [ ] YAML is valid (no syntax errors)
- [ ] name field present
- [ ] name is lowercase with hyphens only
- [ ] name is ≤64 characters
- [ ] name contains no reserved words
- [ ] name matches directory name
- [ ] description field present
- [ ] description is non-empty
- [ ] description is ≤1024 characters
- [ ] description contains no XML tags
- [ ] description includes "what" skill does
- [ ] description includes "when" to use it
- [ ] description written in third person
- [ ] version field (if present) follows semver
- [ ] dependencies field (if present) lists required packages
```

## Common Metadata Issues

### Issue: Name doesn't match directory
```
Directory: pdf-processor/
name: pdf-processing
```
**Fix:** Match exactly: `name: pdf-processor`

### Issue: Description too generic
```yaml
description: Processes data and creates reports
```
**Fix:** Be specific with triggers:
```yaml
description: Processes sales data CSV files and creates quarterly revenue reports with charts. Use when analyzing sales data, creating financial reports, or working with revenue metrics.
```

### Issue: First-person voice
```yaml
description: I can create beautiful presentations with your brand colors
```
**Fix:** Third person:
```yaml
description: Creates presentations applying brand colors and typography. Use when building slide decks, presentations, or branded visual content.
```

### Issue: Missing "when" guidance
```yaml
description: Extracts data from PDF documents
```
**Fix:** Add triggers and contexts:
```yaml
description: Extracts text, tables, and form data from PDF documents. Use when working with PDFs, extracting data, or when the user mentions PDF files.
```

### Issue: Name has uppercase
```yaml
name: PDF-Processor
```
**Fix:** Lowercase only:
```yaml
name: pdf-processor
```

## Testing Description Effectiveness

**Does the description help Claude decide when to use this skill?**

Test with these questions:
1. If user says "extract text from this PDF", would Claude load this skill?
2. Does the description differentiate this from similar skills?
3. Are the trigger keywords obvious and natural?
4. Would a human immediately understand when to use this?

If the answer to any is "no" or "maybe", improve the description.

## Reserved Words

**Never use in skill names:**
- anthropic
- claude

These are trademarked and reserved for official use only.

## Character Limits Summary

| Field | Minimum | Maximum | Notes |
|-------|---------|---------|-------|
| name | 1 | 64 | Lowercase, hyphens only |
| description | 1 | 1024 | Must include what & when |
| version | - | - | Optional, semver recommended |
