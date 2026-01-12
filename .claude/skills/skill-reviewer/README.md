# Skill Reviewer

Comprehensive evaluation tool for Agent Skills that validates against Anthropic's best practices, identifies missing edge cases, suggests structural improvements, and provides prioritized recommendations.

## Overview

The skill-reviewer systematically evaluates Agent Skills across multiple dimensions:
- **Metadata validation** (YAML frontmatter compliance)
- **Structure assessment** (progressive disclosure, file organization)
- **Content quality** (conciseness, terminology, examples)
- **Script review** (error handling, documentation, if applicable)
- **Pattern matching** (workflows, feedback loops, best practices)
- **Edge case analysis** (failure scenarios, error conditions)

## Features

### 1. Eight-Phase Review Workflow

Systematic evaluation process:
1. **Discovery & Context** - Understand skill type and complexity
2. **Metadata Validation** - Check YAML frontmatter compliance
3. **Content Analysis** - Evaluate conciseness and quality
4. **Structure Inspection** - Review file organization and progressive disclosure
5. **Script & Code Review** - Assess error handling and documentation
6. **Pattern & Best Practice Matching** - Verify workflow patterns
7. **Edge Case Analysis** - Identify missing scenarios
8. **Generate Report** - Produce actionable recommendations

### 2. Automated Validation Script

Python script for quick metadata checks:
```bash
python scripts/validate_metadata.py /path/to/skill/
```

**Validates:**
- ✓ YAML frontmatter format and syntax
- ✓ Name format (lowercase, hyphens, ≤64 chars)
- ✓ No reserved words (anthropic, claude)
- ✓ Name matches directory name
- ✓ Description quality (includes "what" and "when")
- ✓ Third-person voice (not "I can..." or "You can...")
- ✓ Character limits (name ≤64, description ≤1024)
- ✓ SKILL.md length (recommended ≤500 lines)
- ✓ No Windows-style backslashes in paths

**Output formats:**
- Human-readable summary (default)
- JSON format (--json flag)

### 3. Severity-Based Prioritization

Four-tier system for recommendations:

- 🔴 **Critical** (Blocks skill usage)
  - Invalid YAML frontmatter
  - Missing required fields
  - Name format violations
  - Security issues

- 🟡 **High** (Significantly impacts effectiveness)
  - Incomplete description (missing what/when)
  - First/second-person voice
  - SKILL.md >500 lines without progressive disclosure
  - Missing validation for critical operations

- 🟢 **Medium** (Reduces quality/maintainability)
  - Verbose explanations
  - Inappropriate degree of freedom
  - Missing helpful examples
  - No workflow checklists for complex operations

- ⚪ **Low** (Polish/optimization)
  - Formatting inconsistencies
  - Could be more concise
  - Additional examples would help

### 4. Comprehensive Reference Files

Progressive disclosure with detailed guidance:

- **[reference/metadata-checklist.md](reference/metadata-checklist.md)**
  - Complete YAML validation rules with regex patterns
  - Name format requirements and examples
  - Description quality criteria
  - Third-person voice patterns

- **[reference/structure-patterns.md](reference/structure-patterns.md)**
  - Progressive disclosure patterns (4 types)
  - File organization best practices
  - Reference depth rules
  - Token economy considerations

- **[reference/content-quality.md](reference/content-quality.md)**
  - Conciseness guidelines with verbosity indicators
  - Degrees of freedom framework (high/medium/low)
  - Terminology consistency checking
  - Example quality rubric

- **[reference/script-review.md](reference/script-review.md)**
  - Error handling patterns
  - Magic number detection
  - Documentation quality standards
  - Security considerations

## Directory Structure

```
skill-reviewer/
├── SKILL.md                         # Main instructions (399 lines)
├── README.md                        # This file
├── scripts/
│   └── validate_metadata.py        # Automated validation tool
└── reference/
    ├── metadata-checklist.md       # YAML & naming rules
    ├── structure-patterns.md       # Organization patterns
    ├── content-quality.md          # Quality criteria
    └── script-review.md            # Code review standards
```

## Usage

### Quick Validation (Automated)

Run the validation script for quick metadata checks:

```bash
# Basic validation
python scripts/validate_metadata.py ../my-skill/

# JSON output
python scripts/validate_metadata.py ../my-skill/ --json
```

**Example output:**
```
======================================================================
SKILL METADATA VALIDATION: my-skill
======================================================================

✓ VALIDATION PASSED

DETAILED CHECKS:
  ✓ yaml_frontmatter: YAML frontmatter is valid
  ✓ name_present: Name present: my-skill
  ✓ name_format: Name format is valid
  ✓ name_length: Name length OK (8 chars)
  ✓ name_reserved: No reserved words
  ✓ name_matches_directory: Name matches directory name
  ✓ description_present: Description present
  ✓ description_length: Description length OK (245 chars)
  ✓ description_xml: No XML tags
  ✓ description_when: Includes 'when to use' guidance
  ✓ description_third_person: Written in third person
  ✓ skill_md_length: SKILL.md length OK (350 lines)
  ✓ file_structure: Found 12 files
  ✓ windows_paths: No Windows-style path separators
```

### Full Review (Manual with Claude)

Ask Claude to perform a comprehensive review:

```
Review the skill at /path/to/skill-name/
```

Or with automated checks first:

```
Review the skill at ./pdf-processing/ and run the validation script first
```

Claude will follow the eight-phase workflow and produce a detailed report with:
- Executive summary with overall rating
- Detailed check results by category
- Missing edge cases identified
- Prioritized improvement recommendations (Critical → High → Medium → Low)
- Structure change suggestions
- Before/after examples for all recommendations

## Output Report Structure

The skill reviewer produces structured reports:

```markdown
# Skill Review: [skill-name]

## Executive Summary
**Overall Rating:** [Production Ready | Needs Refinement | Requires Major Changes]
[2-3 sentence overview]
**Readiness:** [Assessment]

## Metadata Analysis
[Table of validation checks with ✓/✗ status]

## Structure Assessment
- SKILL.md length, progressive disclosure usage
- Reference depth, file organization

## Content Quality Review
- Conciseness, degrees of freedom, terminology
- Time-sensitivity, examples quality

## Missing Edge Cases
[Numbered list of unhandled scenarios]

## Improvement Recommendations

### 🔴 Critical (Must fix before use)
[Prioritized issues with before/after examples]

### 🟡 High (Should fix soon)
[Same format]

### 🟢 Medium (Nice to have)
[Same format]

### ⚪ Low (Polish items)
[Same format]

## Structure Change Suggestions
[Reorganization recommendations]

## Checklist for Improvement
[Copy-paste checklist to track fixes]
```

## Top 20 Common Issues

Quick reference for frequent problems:

**Metadata:**
1. 🔴 Missing required fields (name or description)
2. 🔴 Name has uppercase or special characters
3. 🔴 Unrecognized top-level field (version, dependencies - must be in metadata:{})
4. 🟡 Description missing "when to use" guidance
5. 🟡 Description in first/second person
6. 🔴 Name doesn't match directory name

**Structure:**
7. 🟡 SKILL.md >500 lines without progressive disclosure
8. 🟢 References nested >1 level deep
9. 🟢 Long files (>100 lines) without table of contents
10. ⚪ Windows-style backslashes in paths

**Content:**
10. 🟡 Over-explanation of basic concepts
11. 🟢 Inconsistent terminology
12. 🟢 Time-sensitive information without "old patterns" section
13. 🟢 Abstract examples instead of concrete input/output
14. 🟡 Inappropriate degree of freedom for task type

**Scripts:**
15. 🟡 No error handling in scripts
16. 🟡 Magic numbers without explanation
17. 🟢 Missing validation for critical operations
18. 🟢 Unclear whether to execute or read as reference

**Patterns:**
19. 🟡 Complex workflows without checklists
20. 🟢 Quality-critical tasks without feedback loops

## Testing Results

### Self-Testing (Meta-Testing)

The skill-reviewer validates itself:

```
✓ VALIDATION PASSED
- All metadata checks passed
- 399 lines (under 500 limit)
- Proper structure and naming
- Progressive disclosure with 4 reference files
- Automated validation script included
```

### Example: Booking Skill Validation

```
✓ VALIDATION PASSED
- YAML frontmatter valid
- Name format correct (7 chars)
- Description includes what & when (648 chars)
- Third-person voice
- 500 lines (at recommended limit)
- 23 files, proper structure
- No Windows-style paths
```

## Key Design Decisions

1. **Token Economy**: SKILL.md kept to 399 lines with progressive disclosure to 4 reference files
2. **Executable Validation**: Python script for automated checks (doesn't load into context when executed)
3. **Severity System**: 4-tier prioritization for actionable recommendations
4. **Before/After Examples**: All recommendations include concrete improvements
5. **Self-Testing**: Successfully validates itself and other skills
6. **Comprehensive Coverage**: Reviews metadata, structure, content, scripts, patterns, and edge cases

## Dependencies

**Python 3.7+ required for validation script**

```bash
pip install pyyaml
```

## Best Practices for Reviewers

When using this skill to review others:

1. **Be specific**: Reference exact lines, provide concrete examples
2. **Be constructive**: Show before/after, explain rationale
3. **Prioritize**: Critical issues first, polish last
4. **Consider context**: Skill type affects appropriate patterns
5. **Test understanding**: If something is unclear, it needs improvement
6. **Check assumptions**: What works for Opus might need more guidance for Haiku
7. **Think token economy**: Every token competes with conversation history
8. **Consider edge cases**: Real usage reveals problems design doesn't anticipate

## Version

**Current version:** 1.0.0

## License

Part of the Allure MD project skills library.

---

**Created:** 2025-10-29
**Status:** Production Ready
**Skill Type:** Meta (evaluates other skills)
**Complexity:** Complex (instructions + scripts + reference files)
