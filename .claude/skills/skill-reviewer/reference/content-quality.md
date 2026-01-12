# Content Quality Reference

Comprehensive guide for evaluating skill content quality: conciseness, degrees of freedom, terminology, time-sensitivity, and examples.

## Contents
- Conciseness Guidelines
- Degrees of Freedom Framework
- Terminology Consistency
- Time-Sensitivity Detection
- Example Quality Rubric
- Workflow and Checklist Patterns
- Feedback Loop Implementation

## Conciseness Guidelines

**Core principle: Assume Claude is already very smart**

Only add context Claude doesn't already have. Challenge each piece of information.

### Verbosity Indicators

**Patterns that signal over-explanation:**
- "First, let's understand what X is..."
- "X is a [common thing] that..."
- "You'll need to..."
- "There are many libraries available, but..."
- "To do this, we first need to..."
- Explaining what common file formats are (PDF, JSON, CSV)
- Describing what standard libraries do
- Teaching basic programming concepts

### Conciseness Examples

**❌ Too Verbose (150 tokens):**
```markdown
## Extract PDF Text

PDF (Portable Document Format) files are a common file format that contains
text, images, and other content. To extract text from a PDF, you'll need to
use a library. There are many libraries available for PDF processing, but we
recommend pdfplumber because it's easy to use and handles most cases well.
First, you'll need to install it using pip. Then you can use the code below...
```

**✓ Concise (50 tokens):**
```markdown
## Extract PDF Text

Use pdfplumber for text extraction:

```python
import pdfplumber

with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```
```

**Why better:** Assumes Claude knows what PDFs are and how libraries work.

### When to Keep Explanations

**Do explain:**
- Non-obvious requirements specific to this skill
- Subtle behaviors that aren't intuitive
- Critical constraints that must be followed
- Organization-specific context Claude wouldn't know
- Domain-specific terminology unique to your field

**Examples of necessary explanation:**
```markdown
## Validation Must Run After Each Edit

OOXML structure is fragile. Always validate immediately after editing:
```python
python scripts/validate.py output_dir/
```

If validation fails, fix issues before continuing. Invalid OOXML corrupts the document.
```

This explains WHY (fragile structure) and WHEN (after each edit) - both non-obvious.

### Conciseness Audit Process

1. **Read each paragraph and ask:**
   - Does Claude really need this explanation?
   - Can I assume Claude knows this?
   - Does this paragraph justify its token cost?

2. **Flag these phrases:**
   - "Let's start by understanding..."
   - "As you may know..."
   - "It's important to note that..."
   - "Simply put..."
   - "In other words..."

3. **Convert explanations to direct instructions:**
   - Remove: "You'll need to first install the package using pip"
   - Keep: "Install: `pip install package-name`"

## Degrees of Freedom Framework

Match the level of specificity to the task's fragility and variability.

### High Freedom (Text-Based Instructions)

**Use when:**
- Multiple approaches are equally valid
- Decisions depend on context
- Heuristics guide the approach
- Creativity is beneficial

**Example:**
```markdown
## Code Review Process

1. Analyze the code structure and organization
2. Check for potential bugs or edge cases
3. Suggest improvements for readability and maintainability
4. Verify adherence to project conventions
```

**Characteristics:**
- General guidance rather than specific steps
- Room for judgment and adaptation
- Context-dependent decisions
- No single "right" answer

### Medium Freedom (Pseudocode/Templates with Parameters)

**Use when:**
- A preferred pattern exists
- Some variation is acceptable
- Configuration affects behavior
- Framework provides structure

**Example:**
```markdown
## Generate Report

Use this template and customize as needed:

```python
def generate_report(data, format="markdown", include_charts=True):
    # Process data according to requirements
    # Generate output in specified format
    # Optionally include visualizations if enabled
    return formatted_report
```

Adjust parameters based on user requirements.
```

**Characteristics:**
- Provides scaffolding with flexibility
- Key parameters are explicit
- Pattern is clear but adaptable
- Balances structure and customization

### Low Freedom (Specific Scripts, Few/No Parameters)

**Use when:**
- Operations are fragile and error-prone
- Consistency is critical
- A specific sequence must be followed
- Small deviations cause failures

**Example:**
```markdown
## Database Migration

Run exactly this script in order:

```bash
python scripts/migrate.py --verify --backup
```

Do not modify the command or add additional flags.
Wait for "Migration complete" before proceeding.
```

**Characteristics:**
- Exact commands provided
- Explicit warnings not to deviate
- Clear sequences
- Minimal room for variation

### Decision Framework

**Ask these questions:**

1. **What happens if Claude deviates?**
   - Nothing/minor issues → High freedom
   - Suboptimal but functional → Medium freedom
   - Breaks/corrupts/fails → Low freedom

2. **How many valid approaches exist?**
   - Many → High freedom
   - Several → Medium freedom
   - One or few → Low freedom

3. **How much context is needed?**
   - Varies greatly by case → High freedom
   - Some variation → Medium freedom
   - Context doesn't matter → Low freedom

### Analogy

**Narrow bridge with cliffs (Low freedom):**
One safe path. Provide guardrails and exact instructions.
Example: Database migrations, OOXML editing

**Open field with scattered obstacles (Medium freedom):**
Several good paths. Provide map and guidance.
Example: Report generation, data analysis

**Open field, no hazards (High freedom):**
Many paths lead to success. Give direction, trust Claude.
Example: Code reviews, content creation

## Terminology Consistency

**Choose one term and use it throughout**

### Building a Terminology Map

1. **Identify key concepts in the skill**
2. **List all terms used for each concept**
3. **Choose one canonical term**
4. **Flag inconsistencies**

### Example Audit

**Inconsistent (Bad):**
```markdown
## Working with API Endpoints

First, call the API route to get data.
Then process the URL response.
Finally, send results to the endpoint.
Configure the API path in settings.
```

Uses 4 different terms: endpoint, route, URL, path

**Consistent (Good):**
```markdown
## Working with API Endpoints

First, call the endpoint to get data.
Then process the endpoint response.
Finally, send results to the endpoint.
Configure the endpoint in settings.
```

Uses one term consistently: endpoint

### Common Terminology Confusion

**File operations:**
- Inconsistent: extract, pull, get, retrieve, read
- Choose one: **extract** or **read**

**Form fields:**
- Inconsistent: field, box, element, control, input
- Choose one: **field**

**API interactions:**
- Inconsistent: endpoint, URL, route, path, API call
- Choose one: **endpoint**

**Validation:**
- Inconsistent: validate, verify, check, confirm
- Choose one: **validate**

### Terminology Consistency Checklist

```
Terminology Audit:
- [ ] Identify all key concepts (3-10 typically)
- [ ] List all terms used for each concept
- [ ] Choose canonical term for each
- [ ] Search for inconsistencies: grep -i "term" SKILL.md
- [ ] Flag sections with mixed terminology
- [ ] Recommend consistent replacements
```

## Time-Sensitivity Detection

**Skills should not contain information that becomes outdated**

### Patterns to Flag

**Explicit dates:**
- "Before August 2025..."
- "As of 2024..."
- "Currently in version..."
- "The latest version is..."

**Temporal language:**
- "Currently"
- "At this time"
- "For now"
- "Recently"
- "Soon"
- "Upcoming"

**Conditional time-based instructions:**
- "If you're doing this before X date..."
- "Until version Y is released..."

### Handling Time-Sensitive Information

**❌ Bad: Time-sensitive instruction**
```markdown
If you're doing this before August 2025, use the old API.
After August 2025, use the new API.
```

Problem: Becomes wrong after August 2025

**✓ Good: Old Patterns Section**
```markdown
## Current Method

Use the v2 API endpoint: `api.example.com/v2/messages`

## Old Patterns

<details>
<summary>Legacy v1 API (deprecated 2025-08)</summary>

The v1 API used: `api.example.com/v1/messages`

This endpoint is no longer supported.
</details>
```

Benefits: Always correct, provides context, doesn't clutter main content

### Time-Sensitivity Audit

```
Time-Sensitivity Check:
- [ ] Search for year mentions: grep -i "202[0-9]"
- [ ] Search for months: grep -i "january\|february\|march..."
- [ ] Search for temporal words: grep -i "currently\|soon\|recently"
- [ ] Flag conditional time-based logic
- [ ] Recommend moving to "Old Patterns" section
```

## Example Quality Rubric

Good examples make skills dramatically more effective.

### Quality Criteria

**Excellent examples:**
- ✓ Show actual code/data (not placeholders)
- ✓ Include both input and output
- ✓ Demonstrate the desired pattern
- ✓ Are concrete and specific
- ✓ Can be adapted to user's needs

**Poor examples:**
- ✗ Use vague placeholders: "your data here"
- ✗ Show only abstract structure
- ✗ Lack context
- ✗ Don't show output
- ✗ Too specific to be useful

### Example Pattern: Input/Output Pairs

**Excellent:**
```markdown
## Commit Message Format

Generate commit messages following these examples:

**Example 1:**
Input: Added user authentication with JWT tokens
Output:
```
feat(auth): implement JWT-based authentication

Add login endpoint and token validation middleware
```

**Example 2:**
Input: Fixed bug where dates displayed incorrectly in reports
Output:
```
fix(reports): correct date formatting in timezone conversion

Use UTC timestamps consistently across report generation
```
```

Why excellent: Shows concrete input, exact output, demonstrates pattern clearly

**Poor:**
```markdown
## Commit Message Format

Use conventional commits format:
- Type: feat, fix, chore
- Scope: optional
- Description: brief summary
```

Why poor: Abstract description, no concrete examples, unclear pattern

### Examples for Different Content Types

**For code:**
- Show complete, runnable code snippets
- Include imports and setup
- Show expected output or behavior

**For documents:**
- Show actual document structure
- Include real (or realistic) content
- Demonstrate formatting/styling

**For data:**
- Use realistic sample data
- Show input data structure
- Show transformed output

**For workflows:**
- Walk through concrete scenario
- Show each step with actual commands
- Include expected results at each stage

## Workflow and Checklist Patterns

Complex operations benefit from explicit workflows with progress tracking.

### Workflow Structure

**Components:**
1. **Copy-paste checklist** for progress tracking
2. **Step-by-step instructions** with specific actions
3. **Validation points** to catch errors early
4. **Decision points** when branching is needed

**Template:**
```markdown
## [Workflow Name]

Copy this checklist and track your progress:

```
Task Progress:
- [ ] Step 1: [Action name]
- [ ] Step 2: [Action name]
- [ ] Step 3: [Action name]
- [ ] Step 4: [Action name]
```

**Step 1: [Action Name]**

[Specific instructions]

Run: `command here`

Expected output: [what you should see]

**Step 2: [Action Name]**

[Specific instructions]

If [condition], then [branch to different step]
Otherwise, continue to Step 3

[Continue for all steps]
```

### When to Use Workflows

**Use workflows for:**
- Multi-step operations (>3 steps)
- Complex processes with dependencies
- Operations where order matters
- Tasks with validation checkpoints
- Processes where users might lose track

**Don't use workflows for:**
- Single-step operations
- Obvious sequences
- Highly variable processes
- Simple tasks

## Feedback Loop Implementation

Quality-critical tasks benefit from validation loops.

### Feedback Loop Pattern

**Structure:**
1. Perform operation
2. Validate result
3. If validation fails:
   - Review errors
   - Fix issues
   - Return to validation
4. Only proceed when validation passes

### Example: Document Editing

```markdown
## Document Editing Process

1. Make your edits to `word/document.xml`

2. **Validate immediately:**
   ```bash
   python scripts/validate.py output_dir/
   ```

3. **If validation fails:**
   - Review the error message carefully
   - Fix the specific issues in the XML
   - Run validation again
   - Repeat until validation passes

4. **Only proceed when validation passes**

5. Rebuild: `python scripts/pack.py output_dir/ output.docx`
```

### When to Implement Feedback Loops

**Implement for:**
- Destructive operations
- Complex validation requirements
- Operations prone to subtle errors
- Quality-critical outputs
- Tasks where errors are costly

**Characteristics:**
- Explicit validation steps
- Clear error handling
- Iterative refinement
- "Only proceed when..." language

## Content Quality Checklist

```
Content Quality Review:
- [ ] Conciseness: No over-explanation of basics
- [ ] Degrees of freedom: Appropriate for task type
- [ ] Terminology: Consistent throughout
- [ ] Time-sensitivity: No dates/temporal language (or properly handled)
- [ ] Examples: Concrete with input/output
- [ ] Workflows: Complex operations have checklists
- [ ] Feedback loops: Quality-critical tasks have validation
- [ ] Clarity: Instructions are unambiguous
- [ ] Completeness: All necessary information present
- [ ] Accessibility: Easy to scan and navigate
```
