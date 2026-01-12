# Structure Patterns Reference

Comprehensive guide to skill file organization, progressive disclosure, and structural best practices.

## Contents
- SKILL.md Length Guidelines
- Progressive Disclosure Patterns
- Reference Depth Rules
- Directory Organization
- File Naming Conventions
- Table of Contents Requirements

## SKILL.md Length Guidelines

**Recommended maximum: 500 lines**

Why: Once loaded, every token in SKILL.md competes with conversation history. Longer files consume more context unnecessarily.

### When SKILL.md exceeds 500 lines:

1. **Identify extractable content:**
   - Detailed API references
   - Extensive examples
   - Domain-specific schemas
   - Advanced features used occasionally
   - Historical/legacy information

2. **Extract to reference files:**
   - Keep overview and common patterns in SKILL.md
   - Move details to separate files
   - Link prominently from SKILL.md

3. **Example reorganization:**

**Before (650 lines):**
```markdown
# PDF Processing

## Quick Start
[50 lines]

## Complete API Reference
[300 lines of detailed method documentation]

## Form Filling
[150 lines]

## Advanced Features
[150 lines]
```

**After (main: 280 lines, references: 370 lines):**
```markdown
# PDF Processing

## Quick Start
[50 lines - keep in SKILL.md]

## Common Operations
[130 lines of frequently used patterns - keep in SKILL.md]

## Advanced Features
For complete API reference, see [reference/api-reference.md](reference/api-reference.md)
For form filling guide, see [reference/forms.md](reference/forms.md)
For advanced features, see [reference/advanced.md](reference/advanced.md)

[100 lines of integration examples - keep in SKILL.md]
```

## Progressive Disclosure Patterns

Progressive disclosure loads information only when needed, saving context tokens.

### Pattern 1: High-Level Guide with References

**Use when:** Skill has multiple distinct capabilities or domains

```markdown
# BigQuery Analysis

## Quick Start
[Basic query examples]

## Available Datasets
**Finance**: Revenue, ARR, billing → See [reference/finance.md](reference/finance.md)
**Sales**: Opportunities, pipeline → See [reference/sales.md](reference/sales.md)
**Product**: API usage, features → See [reference/product.md](reference/product.md)

## Common Patterns
[Frequently used queries that apply across domains]
```

**Benefits:**
- Claude reads only relevant domain files
- Scales to many domains without bloating SKILL.md
- Clear navigation structure

### Pattern 2: Conditional Details

**Use when:** Basic and advanced users need different information levels

```markdown
# DOCX Processing

## Creating Documents
Use docx-js for new documents. See [reference/docx-js.md](reference/docx-js.md).

## Editing Documents
For simple edits, modify the XML directly.

**For tracked changes:** See [reference/redlining.md](reference/redlining.md)
**For complex OOXML:** See [reference/ooxml-spec.md](reference/ooxml-spec.md)
```

**Benefits:**
- Beginners get simple instructions
- Advanced users can find detailed docs
- Common cases don't load advanced content

### Pattern 3: Domain-Specific Organization

**Use when:** Multiple domains with domain-specific schemas/rules

**Directory structure:**
```
bigquery-skill/
├── SKILL.md (overview and navigation)
└── reference/
    ├── finance.md (revenue metrics, billing)
    ├── sales.md (opportunities, pipeline)
    ├── product.md (API usage, features)
    └── marketing.md (campaigns, attribution)
```

**SKILL.md content:**
```markdown
# BigQuery Data Analysis

## Quick Search
Find specific metrics using grep:
```bash
grep -i "revenue" reference/finance.md
grep -i "pipeline" reference/sales.md
```

## Available Datasets
**Finance** → [reference/finance.md](reference/finance.md)
**Sales** → [reference/sales.md](reference/sales.md)
**Product** → [reference/product.md](reference/product.md)
**Marketing** → [reference/marketing.md](reference/marketing.md)
```

### Pattern 4: Workflow with Supporting Files

**Use when:** Complex workflows need detailed supporting documentation

```markdown
# Document Workflow

## Basic Workflow
1. Unpack document: [See unpacking guide](reference/unpacking.md)
2. Edit XML: [See XML editing guide](reference/xml-editing.md)
3. Validate: [See validation guide](reference/validation.md)
4. Repack: [See packing guide](reference/packing.md)

## Quick Reference
- Unpacking: `python scripts/unpack.py input.docx output_dir/`
- Validation: `python scripts/validate.py output_dir/`
- Packing: `python scripts/pack.py output_dir/ output.docx`
```

## Reference Depth Rules

**Keep references ONE level deep from SKILL.md**

### ✓ Good: One Level Deep
```
SKILL.md
├─→ reference/api-reference.md
├─→ reference/examples.md
└─→ reference/advanced.md
```

Claude reads complete files when referenced directly from SKILL.md.

### ✗ Bad: Too Nested
```
SKILL.md
└─→ advanced.md
    └─→ details.md (Claude may only preview this)
        └─→ specifics.md (Claude likely won't see this)
```

**Problem:** Claude may use `head -100` for nested references, getting incomplete information.

**Fix:** Link all reference files directly from SKILL.md:
```markdown
# Main Skill

**Core functionality:** [instructions in SKILL.md]
**Advanced features:** See [reference/advanced.md](reference/advanced.md)
**Detailed API:** See [reference/api-details.md](reference/api-details.md)
**Implementation notes:** See [reference/implementation.md](reference/implementation.md)
```

## Directory Organization

### Standard Directory Structure
```
skill-name/
├── SKILL.md              # Main instructions (required)
├── scripts/              # Executable code
│   ├── helper.py
│   ├── validate.py
│   └── process.sh
├── reference/            # Documentation loaded on-demand
│   ├── api-reference.md
│   ├── examples.md
│   └── advanced.md
├── templates/            # Reusable templates
│   ├── report-template.md
│   └── config-template.json
├── examples/             # Example outputs or demonstrations
│   ├── example-output.pdf
│   └── sample-workflow.md
└── core/                 # Shared libraries (if needed)
    └── utils.py
```

### Directory Purpose Guidelines

**scripts/**
- Executable Python, JavaScript, Bash files
- Deterministic operations more reliable as code
- Should be executed, not loaded into context
- Include error handling and documentation

**reference/**
- Markdown documentation
- Loaded only when Claude needs specific information
- Should have clear, descriptive filenames
- Long files (>100 lines) need table of contents

**templates/**
- Reusable output templates
- Configuration file templates
- Document structure templates
- Can be text, JSON, markdown, etc.

**examples/**
- Example outputs showing expected results
- Sample workflows demonstrating usage
- Visual examples (images, PDFs)
- Test data files

**core/**
- Shared utility libraries
- Imported by multiple scripts
- Reusable functions across the skill

## File Naming Conventions

**Use descriptive, kebab-case names:**

✓ Good examples:
- `api-reference.md`
- `form-filling-guide.md`
- `validation-rules.md`
- `example-output-report.pdf`
- `analyze_form.py`
- `pack_document.sh`

✗ Bad examples:
- `doc1.md` (not descriptive)
- `API_Reference.md` (mixed case)
- `api reference.md` (spaces)
- `apiRef.md` (camelCase)
- `temp.py` (vague)

**Path conventions:**
- Always use forward slashes: `reference/api.md`
- Never use backslashes: `reference\api.md`
- Works across platforms (Unix, Windows, macOS)

## Table of Contents Requirements

**For reference files >100 lines, include a table of contents**

Why: Claude may preview files with partial reads. A TOC ensures Claude sees the full scope even in previews.

**Example:**
```markdown
# API Reference

## Contents
- Authentication and Setup
- Core Methods (create, read, update, delete)
- Advanced Features (batch operations, webhooks)
- Error Handling Patterns
- Code Examples

## Authentication and Setup
[Detailed content...]

## Core Methods
[Detailed content...]

## Advanced Features
[Detailed content...]
```

## File Organization Patterns by Skill Type

### Simple Instruction-Only Skills
```
skill-name/
└── SKILL.md (all content, <500 lines)
```

### Skills with Scripts
```
skill-name/
├── SKILL.md (instructions, <500 lines)
└── scripts/
    ├── main_script.py
    ├── validation.py
    └── helper.sh
```

### Complex Skills with References
```
skill-name/
├── SKILL.md (overview and navigation, <500 lines)
├── reference/
│   ├── detailed-guide.md
│   ├── api-reference.md
│   └── examples.md
└── scripts/
    ├── process.py
    └── validate.py
```

### Multi-Domain Skills
```
skill-name/
├── SKILL.md (overview, quick start, navigation)
├── reference/
│   ├── domain-a.md (finance, sales, etc.)
│   ├── domain-b.md
│   └── domain-c.md
└── scripts/
    └── common-operations.py
```

## Token Economy Considerations

**Files consume tokens only when loaded:**
- SKILL.md: Loaded when skill activates
- Reference files: Loaded when Claude reads them
- Scripts: Executed, only output consumes tokens
- Templates: Loaded when referenced

**Optimization strategies:**
1. Keep SKILL.md focused on common operations
2. Move rarely-used content to reference files
3. Use scripts for deterministic operations
4. Link clearly so Claude finds information efficiently

## Structural Anti-Patterns

### Anti-Pattern 1: Everything in SKILL.md
```
SKILL.md (1500 lines)
```
**Problem:** Entire file loads even for simple queries
**Fix:** Extract to reference files

### Anti-Pattern 2: Deeply Nested References
```
SKILL.md → advanced.md → details.md → specifics.md
```
**Problem:** Claude may only preview nested files
**Fix:** One level deep, link all from SKILL.md

### Anti-Pattern 3: Unclear Organization
```
skill-name/
├── SKILL.md
├── file1.md
├── file2.md
├── helper.py
├── stuff.md
└── utils.py
```
**Problem:** No clear structure, hard to navigate
**Fix:** Use standard directories (scripts/, reference/, etc.)

### Anti-Pattern 4: No Navigation
```
SKILL.md mentions "see advanced features" without linking
```
**Problem:** Claude doesn't know where to find them
**Fix:** Explicit links: `See [reference/advanced.md](reference/advanced.md)`

## Checklist for Structure Review

```
Structure Quality Checklist:
- [ ] SKILL.md is ≤500 lines
- [ ] All reference files linked directly from SKILL.md
- [ ] Reference depth is exactly 1 level
- [ ] Files >100 lines have table of contents
- [ ] All paths use forward slashes
- [ ] Directory structure follows standard patterns
- [ ] Filenames are descriptive and kebab-case
- [ ] Scripts are in scripts/ directory
- [ ] Reference docs are in reference/ directory
- [ ] Progressive disclosure is used appropriately
- [ ] Navigation is clear with explicit links
```
