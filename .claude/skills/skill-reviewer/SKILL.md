---
name: skill-reviewer
description: Evaluates Agent Skills against Anthropic's best practices, identifies missing edge cases, suggests structural improvements, and provides prioritized recommendations. Use when reviewing SKILL.md files, auditing skill quality, improving existing skills, or ensuring skills follow best practices before deployment.
metadata:
  version: 1.0.0
---

# Skill Reviewer

Systematic evaluation tool for Agent Skills following Anthropic's best practices. Provides comprehensive analysis with actionable recommendations prioritized by severity.

## Quick Start

**Basic usage:**
```
Review the skill at ./path/to/skill-name/
```

**With automated validation:**
```
Review the skill at ./path/to/skill-name/ and run the validation script first
```

The reviewer will:
1. Run automated metadata checks (if requested)
2. Analyze structure, content, and patterns
3. Identify missing edge cases
4. Provide prioritized recommendations with before/after examples
5. Suggest structural improvements

## Eight-Phase Review Workflow

Copy this checklist and check off items as you complete the review:

```
Skill Review Progress:
- [ ] Phase 1: Discovery & Context
- [ ] Phase 2: Metadata Validation
- [ ] Phase 3: Content Analysis
- [ ] Phase 4: Structure Inspection
- [ ] Phase 5: Script & Code Review (if applicable)
- [ ] Phase 6: Pattern & Best Practice Matching
- [ ] Phase 7: Edge Case Analysis
- [ ] Phase 8: Generate Report
```

### Phase 1: Discovery & Context

**Read the skill completely:**
1. Read SKILL.md from start to finish
2. List all files in the skill directory: `ls -R skill-path/`
3. Identify skill category:
   - Creative/Design (art, design, media)
   - Development (testing, building, technical)
   - Document Processing (PDF, DOCX, XLSX, PPTX)
   - Meta (skills about skills)
   - Enterprise/Communication (branding, internal comms)
4. Determine complexity:
   - Simple: Instructions-only
   - Medium: Instructions + reference files
   - Complex: Instructions + scripts + reference files

### Phase 2: Metadata Validation

**For automated checking:**
```bash
python scripts/validate_metadata.py /path/to/skill/
```

**Manual checks:**
1. **YAML frontmatter exists and is valid**
2. **Name field:**
   - Lowercase letters, numbers, hyphens only
   - Maximum 64 characters
   - No reserved words ("anthropic", "claude")
   - Matches directory name exactly
3. **Description field:**
   - Non-empty, maximum 1024 characters
   - No XML tags
   - Includes WHAT the skill does
   - Includes WHEN to use it (triggers, contexts)
   - Written in third person ("This skill..." not "I can..." or "You can...")
4. **Optional fields:** version, dependencies (check if present and appropriate)

**Common metadata issues:**
- Description too vague: "Helps with documents" → Add specifics
- Missing "when to use": Add trigger keywords and contexts
- First/second person: "I can help you..." → "This skill helps..."
- Name format violations: "My_Skill" → "my-skill"

### Phase 3: Content Analysis

**Check conciseness:**
1. Look for over-explanation patterns:
   - "First, let's understand what X is..."
   - "You'll need to..."
   - "X is a common thing that..."
2. Assume Claude's intelligence - flag unnecessary explanations
3. Count tokens approximately (rule of thumb: 1 token ≈ 4 characters)

**Assess degrees of freedom:**
- **High freedom** (text-based guidance): Multiple valid approaches, context-dependent
- **Medium freedom** (pseudocode/templates): Preferred patterns with room for variation
- **Low freedom** (exact scripts): Fragile operations requiring precision

**Verify:**
- Consistent terminology (build frequency map, flag synonyms)
- No time-sensitive information (dates, "currently", "as of")
- If time-sensitive exists, check it's in "old patterns" section
- Examples are concrete (show actual input/output), not abstract

**Example quality rubric:**
- ✓ Good: Shows actual code/data with clear before/after
- ✗ Bad: Abstract descriptions without specifics

### Phase 4: Structure Inspection

**SKILL.md length check:**
- Count lines: `wc -l SKILL.md`
- Flag if >500 lines
- Identify sections that could move to reference files

**Progressive disclosure audit:**
1. Map all file references in SKILL.md
2. Check reference depth:
   - ✓ One level: SKILL.md → reference/api.md
   - ✗ Too deep: SKILL.md → advanced.md → details.md
3. For files >100 lines, verify table of contents exists

**File path check:**
- Scan for backslashes: `grep -r '\\' SKILL.md`
- Should use forward slashes: `reference/guide.md` not `reference\guide.md`

**Directory organization:**
```
skill-name/
├── SKILL.md (main instructions)
├── scripts/ (executable code)
├── reference/ (documentation loaded on-demand)
├── examples/ (usage demonstrations)
└── templates/ (reusable templates)
```

### Phase 5: Script & Code Review

**If skill contains scripts:**

1. **List all scripts:**
   ```bash
   find skill-path/scripts/ -type f -name "*.py" -o -name "*.js" -o -name "*.sh"
   ```

2. **For each script, check:**
   - Error handling exists (try/except, proper exceptions)
   - No "magic numbers" without comments explaining them
   - Clear documentation (docstrings, comments)
   - Instructions say "run" vs "read as reference"

3. **Dependencies verification:**
   - Check if required packages listed in SKILL.md
   - Verify packages are available in Claude's environment
   - Note if installation instructions are provided

4. **Validation patterns:**
   - Critical operations have validation scripts
   - Feedback loops for quality-critical tasks
   - Plan-validate-execute pattern for complex operations

**Common script issues:**
- No error handling → Script fails without helpful message
- Magic constants → `TIMEOUT = 47` without explanation
- Punts to Claude → `return open(path).read()` instead of handling FileNotFoundError

### Phase 6: Pattern & Best Practice Matching

**Identify patterns used:**
- ☐ Template pattern (provides output format templates)
- ☐ Examples pattern (shows input/output pairs)
- ☐ Conditional workflow pattern (decision points with branching)
- ☐ Domain-specific organization (separate files per domain)
- ☐ Workflow with checklist (complex operations with progress tracking)
- ☐ Feedback loops (validate → fix → repeat)

**Check pattern implementation:**
1. Templates: Are they strict ("ALWAYS use") or flexible ("sensible default")?
2. Examples: Do they show concrete input/output, not abstractions?
3. Workflows: Do complex operations have copy-paste checklists?
4. Feedback loops: Are validation steps clearly marked?

**MCP tool references (if applicable):**
- Check format: Should be `ServerName:tool_name`
- Flag if missing server prefix

### Phase 7: Edge Case Analysis

**Consider failure scenarios for this skill type:**

1. **What inputs might break this?**
   - Invalid file formats
   - Missing files
   - Empty or malformed data
   - Edge values (very large, very small, negative)

2. **What assumptions might not hold?**
   - Files exist at expected locations
   - Dependencies are installed
   - User has permissions
   - Platform-specific behaviors

3. **What error conditions are unhandled?**
   - Network failures (if applicable)
   - Disk space issues
   - Concurrent access
   - Timeout scenarios

4. **Cross-platform issues:**
   - Path separators
   - Line endings
   - Case sensitivity
   - Platform-specific commands

**Document findings:**
- List scenarios not covered
- Note missing validation
- Identify error handling gaps

### Phase 8: Generate Report

Use this template structure:

## Output Report Template

```markdown
# Skill Review: [skill-name]

## Executive Summary
**Overall Rating:** [Production Ready | Needs Refinement | Requires Major Changes]

[2-3 sentence overview of strengths and critical issues]

**Readiness:** [Ready for use | Ready with minor fixes | Requires significant work]

## Metadata Analysis
| Check | Status | Notes |
|-------|--------|-------|
| YAML valid | ✓/✗ | |
| Name format | ✓/✗ | |
| Description quality | ✓/✗ | Includes what & when / Missing context |
| Third person | ✓/✗ | |

**Description Effectiveness:** [Excellent / Good / Needs Improvement / Poor]

## Structure Assessment
- **SKILL.md length:** [X lines] [✓ Under 500 / ✗ Over 500]
- **Progressive disclosure:** [Well used / Partially used / Not used]
- **Reference depth:** [✓ One level / ✗ Too nested]
- **File organization:** [Excellent / Good / Needs improvement]

## Content Quality Review
- **Conciseness:** [Excellent / Good / Verbose / Very verbose]
  - [List specific examples of verbosity with line numbers]
- **Degrees of freedom:** [Appropriate / Too rigid / Too loose]
- **Terminology:** [Consistent / Minor inconsistencies / Major inconsistencies]
- **Time-sensitivity:** [No issues / Properly handled / Issues found]
- **Examples:** [Excellent / Good / Lacking / Poor quality]

## Missing Edge Cases
1. [Edge case 1 description]
2. [Edge case 2 description]
...

## Improvement Recommendations

### 🔴 Critical (Must fix before use)
1. **[Issue name]**
   - Problem: [Description]
   - Location: [File:line or section]
   - Fix: [Specific actionable fix]
   - Example:
     ```
     Current: [before]
     Improved: [after]
     ```

### 🟡 High (Should fix soon)
[Same format as Critical]

### 🟢 Medium (Nice to have)
[Same format as Critical]

### ⚪ Low (Polish items)
[Same format as Critical]

## Structure Change Suggestions
1. **[Suggestion 1]**
   - Rationale: [Why this improves the skill]
   - Implementation: [How to do it]
2. **[Suggestion 2]**
...

## Checklist for Improvement
Copy this checklist to track fixes:

```
Priority Fixes:
- [ ] Critical issue 1
- [ ] Critical issue 2
- [ ] High priority issue 1
- [ ] High priority issue 2

Enhancements:
- [ ] Medium priority item 1
- [ ] Low priority item 1
```

## Next Steps
1. [Immediate action item]
2. [Follow-up action item]
3. [Testing recommendation]
```

## Top 20 Common Issues Quick Reference

Scan for these frequent problems:

**Metadata:**
1. 🔴 Missing required fields (name or description)
2. 🔴 Name has uppercase or special characters
3. 🟡 Description missing "when to use" guidance
4. 🟡 Description in first/second person
5. 🔴 Name doesn't match directory name

**Structure:**
6. 🟡 SKILL.md >500 lines without progressive disclosure
7. 🟢 References nested >1 level deep
8. 🟢 Long files (>100 lines) without table of contents
9. ⚪ Windows-style backslashes in paths

**Content:**
10. 🟡 Over-explanation of basic concepts
11. 🟢 Inconsistent terminology (multiple terms for same concept)
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

## Severity System

**🔴 Critical** (Blocks skill usage):
- Invalid YAML frontmatter, missing required fields, name format violations
- Security issues (hardcoded credentials)
- File structure prevents loading

**🟡 High** (Significantly impacts effectiveness):
- Description incomplete (missing what/when)
- Wrong voice (first/second person)
- SKILL.md >500 lines without progressive disclosure
- Scripts without error handling
- Missing validation for critical operations

**🟢 Medium** (Reduces quality/maintainability):
- Verbose explanations
- Inappropriate degree of freedom
- Missing helpful examples
- No workflow checklists for complex operations
- Time-sensitive info not properly handled

**⚪ Low** (Polish/optimization):
- Formatting inconsistencies
- Could be more concise
- Better file organization possible
- Additional examples would help

## Using Reference Files

**For detailed guidance, consult:**
- **[reference/metadata-checklist.md](reference/metadata-checklist.md)** - Complete YAML validation rules and examples
- **[reference/structure-patterns.md](reference/structure-patterns.md)** - Progressive disclosure patterns and organization
- **[reference/content-quality.md](reference/content-quality.md)** - Conciseness guidelines, terminology checking
- **[reference/script-review.md](reference/script-review.md)** - Code quality patterns and error handling

## Best Practices for Reviewers

1. **Be specific**: Reference exact lines, provide concrete examples
2. **Be constructive**: Show before/after, explain rationale
3. **Prioritize**: Critical issues first, polish last
4. **Consider context**: Skill type affects appropriate patterns
5. **Test understanding**: If something is unclear, it needs improvement
6. **Check assumptions**: What works for Opus might need more guidance for Haiku
7. **Think token economy**: Every token competes with conversation history
8. **Consider edge cases**: Real usage reveals problems design doesn't anticipate
