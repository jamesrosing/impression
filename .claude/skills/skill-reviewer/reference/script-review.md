# Script Review Reference

Comprehensive guide for reviewing executable code in skills: error handling, documentation, dependencies, and validation patterns.

## Contents
- Error Handling Patterns
- Magic Number Detection
- Documentation Quality
- Dependency Verification
- Validation Script Patterns
- Script vs. Reference Guidance
- Security Considerations

## Error Handling Patterns

**Core principle: Scripts should solve problems, not punt to Claude**

### Excellent Error Handling

**✓ Good: Handles errors explicitly**
```python
def process_file(path):
    """Process a file, creating it if it doesn't exist."""
    try:
        with open(path) as f:
            return f.read()
    except FileNotFoundError:
        # Create file with default content instead of failing
        print(f"File {path} not found, creating default")
        with open(path, 'w') as f:
            f.write('')
        return ''
    except PermissionError:
        # Provide alternative instead of failing
        print(f"Cannot access {path}, trying fallback location")
        return read_from_fallback(path)
    except Exception as e:
        print(f"Error processing {path}: {e}")
        print("Using empty content as fallback")
        return ''
```

**Benefits:**
- Handles multiple failure modes
- Provides helpful error messages
- Offers alternatives instead of failing
- Claude doesn't need to debug

**❌ Bad: Punts to Claude**
```python
def process_file(path):
    # Just fail and let Claude figure it out
    return open(path).read()
```

**Problems:**
- Fails with cryptic error
- Claude must diagnose and fix
- No helpful guidance
- Wastes time and tokens

### Common Error Scenarios to Handle

**File operations:**
```python
try:
    # Operation
except FileNotFoundError:
    # File doesn't exist
except PermissionError:
    # No permission to read/write
except IsADirectoryError:
    # Expected file but got directory
except OSError as e:
    # Disk full, network drive unavailable, etc.
```

**Network operations:**
```python
try:
    response = requests.get(url, timeout=30)
    response.raise_for_status()
except requests.Timeout:
    # Request took too long
except requests.ConnectionError:
    # Network unavailable
except requests.HTTPError as e:
    # HTTP error status (404, 500, etc.)
```

**Data processing:**
```python
try:
    data = json.loads(content)
except json.JSONDecodeError as e:
    # Invalid JSON format
except KeyError as e:
    # Expected field missing
except ValueError as e:
    # Invalid value type or format
```

### Error Message Quality

**Good error messages:**
- Explain what happened
- Suggest how to fix it
- Provide context
- Point to documentation if applicable

**✓ Excellent:**
```python
except KeyError as e:
    print(f"Error: Required field {e} missing from configuration")
    print("Expected fields: name, description, version")
    print("See documentation: docs/config-format.md")
    sys.exit(1)
```

**❌ Poor:**
```python
except KeyError:
    print("Error")
    sys.exit(1)
```

## Magic Number Detection

**Problem: Unexplained constants ("voodoo constants")**

If you don't know the right value, how will Claude determine it?

### Magic Numbers to Flag

**❌ Bad: Magic numbers without explanation**
```python
TIMEOUT = 47      # Why 47?
RETRIES = 5       # Why 5?
BUFFER = 8192     # Why 8192?
THRESHOLD = 0.73  # Why 0.73?
```

**✓ Good: Self-documenting constants**
```python
# HTTP requests typically complete within 30 seconds
# Longer timeout accounts for slow connections and large payloads
REQUEST_TIMEOUT = 30

# Three retries balances reliability vs speed
# Most intermittent failures resolve by the second retry
# Additional retries beyond 3 show diminishing returns
MAX_RETRIES = 3

# 8KB buffer is optimal for most file I/O operations
# Balances memory usage with read/write efficiency
# Standard page size on most systems
BUFFER_SIZE = 8192

# Confidence threshold of 0.85 (85%) provides good balance
# Higher values reduce false positives but increase false negatives
# Based on validation testing with 1000+ examples
CONFIDENCE_THRESHOLD = 0.85
```

### What Makes a Good Explanation

**Include:**
- Why this specific value?
- What trade-offs does it balance?
- How was it determined? (testing, standards, best practices)
- What happens if it's too high or too low?

**Template:**
```python
# [What this controls]
# [Why this specific value]
# [Trade-offs or constraints]
CONSTANT_NAME = value
```

### Constants That Need Explanation

**Always explain:**
- Timeouts (why this duration?)
- Retry counts (why this many attempts?)
- Thresholds (why this cutoff?)
- Buffer sizes (why this amount?)
- Magic ratios or percentages
- Arbitrary-seeming numbers

**May not need explanation:**
- Standard values (80 for HTTP, 443 for HTTPS)
- Mathematical constants (pi, e)
- Well-known defaults (page size, standard ports)

## Documentation Quality

### Docstring Requirements

**Every function should have:**
- Purpose description
- Parameter descriptions with types
- Return value description
- Exceptions that may be raised
- Usage example (for complex functions)

**✓ Excellent documentation:**
```python
def validate_skill_metadata(skill_path: str) -> dict:
    """
    Validates YAML frontmatter in a skill's SKILL.md file.

    Args:
        skill_path: Path to the skill directory containing SKILL.md

    Returns:
        Dictionary with validation results:
        {
            "valid": bool,
            "checks": {
                "yaml_present": {"pass": bool, "message": str},
                "name_format": {"pass": bool, "message": str},
                ...
            },
            "errors": [str],
            "warnings": [str]
        }

    Raises:
        FileNotFoundError: If SKILL.md doesn't exist
        PermissionError: If directory isn't readable

    Example:
        >>> result = validate_skill_metadata("./pdf-skill/")
        >>> if not result["valid"]:
        ...     for error in result["errors"]:
        ...         print(f"Error: {error}")
    """
    # Implementation...
```

**❌ Poor documentation:**
```python
def validate(path):
    # Validates stuff
    pass
```

### Script-Level Documentation

**Every script should have:**
- Shebang line (#!/usr/bin/env python3)
- Module-level docstring explaining purpose
- Usage instructions
- Dependencies listed
- Example invocation

**Template:**
```python
#!/usr/bin/env python3
"""
Brief description of what this script does.

Longer description if needed, explaining the approach
or any important context.

Dependencies:
    - package1>=1.0.0
    - package2

Usage:
    python script_name.py input_file output_file

    Options:
        --verbose    Show detailed output
        --dry-run    Show what would be done without doing it

Example:
    python validate_metadata.py ./skill-directory/

Returns exit code 0 on success, 1 on failure.
"""
```

## Dependency Verification

### Listing Dependencies

**In SKILL.md:**
```markdown
## Requirements

This skill requires the following Python packages:

```bash
pip install pdfplumber>=0.9.0 pandas>=1.5.0 requests
```

**Platform requirements:**
- Python 3.8+
- Unix-style system (Linux, macOS) or Windows with WSL
```

### Checking Dependency Availability

**Claude Code environment:**
- Can install from PyPI (Python)
- Can install from npm (JavaScript)
- Can clone from GitHub

**API environment:**
- No network access
- No runtime installation
- All dependencies must be pre-installed

**Reference documentation:**
- Link to Claude's code execution tool docs
- List available pre-installed packages
- Note any platform-specific requirements

### Import Error Handling

**✓ Good: Graceful handling with helpful message**
```python
try:
    import pdfplumber
except ImportError:
    print("Error: pdfplumber is not installed")
    print("Install it with: pip install pdfplumber")
    print("See SKILL.md for complete requirements")
    sys.exit(1)
```

## Validation Script Patterns

### Plan-Validate-Execute Pattern

**Use for complex, error-prone operations**

**Example: Form Filling Workflow**
```markdown
1. Create plan: Generate changes.json mapping fields to values
2. Validate plan: Run validate_plan.py to check for errors
3. If validation fails: Fix plan and re-validate
4. Execute: Apply changes only after plan is validated
5. Verify: Check output is correct
```

**Benefits:**
- Catches errors before applying changes
- Plan is machine-verifiable
- Reversible planning phase
- Clear debugging when problems occur

### Validation Script Structure

**Good validation script:**
```python
#!/usr/bin/env python3
"""
Validates form field mappings before applying to PDF.

Checks:
- All referenced fields exist in the PDF
- No conflicting values
- All required fields have values
- Value types match field types
"""

def validate_mapping(pdf_path: str, mapping_path: str) -> bool:
    """Validates field mapping against PDF form."""
    errors = []
    warnings = []

    # Load PDF form fields
    available_fields = get_pdf_fields(pdf_path)

    # Load mapping
    with open(mapping_path) as f:
        mapping = json.load(f)

    # Check 1: All mapped fields exist
    for field_name in mapping:
        if field_name not in available_fields:
            errors.append(
                f"Field '{field_name}' not found. "
                f"Available: {', '.join(available_fields.keys())}"
            )

    # Check 2: Required fields have values
    required = [f for f, props in available_fields.items()
                if props.get('required')]
    for field in required:
        if field not in mapping:
            errors.append(f"Required field '{field}' missing from mapping")

    # Check 3: Value types match
    for field_name, value in mapping.items():
        expected_type = available_fields[field_name].get('type')
        if not validate_type(value, expected_type):
            errors.append(
                f"Field '{field_name}' expects {expected_type}, "
                f"got {type(value).__name__}"
            )

    # Report results
    if errors:
        print("VALIDATION FAILED")
        for error in errors:
            print(f"ERROR: {error}")
        return False

    if warnings:
        print("VALIDATION PASSED WITH WARNINGS")
        for warning in warnings:
            print(f"WARNING: {warning}")
    else:
        print("VALIDATION PASSED")

    return True

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python validate_plan.py pdf_file mapping.json")
        sys.exit(1)

    pdf_path = sys.argv[1]
    mapping_path = sys.argv[2]

    valid = validate_mapping(pdf_path, mapping_path)
    sys.exit(0 if valid else 1)
```

**Characteristics:**
- Specific, actionable error messages
- Lists all problems (not just first)
- Suggests corrections
- Clear pass/fail indication
- Proper exit codes

## Script vs. Reference Guidance

**Claude needs to know: execute or read?**

### Execute Scripts

**When SKILL.md should say "execute":**
- Deterministic operations
- Reliability is critical
- Avoid token cost of generating code
- Operations have been thoroughly tested

**Clear language:**
```markdown
## Validate Document

Run the validation script:

```bash
python scripts/validate.py document.xml
```

This checks for errors and outputs detailed diagnostics.
```

**Keywords:** "run", "execute", "invoke", "call"

### Read as Reference

**When SKILL.md should say "read as reference":**
- Complex algorithms to understand
- Implementation details Claude should know
- Patterns to follow in generated code
- Examples of how to handle edge cases

**Clear language:**
```markdown
## Complex Extraction Algorithm

For understanding the text extraction algorithm,
see [scripts/extract_text.py](scripts/extract_text.py).

The script demonstrates handling of:
- Rotated text blocks
- Multi-column layouts
- Embedded fonts
```

**Keywords:** "see", "refer to", "review", "demonstrates"

### Ambiguous (Avoid)

**❌ Unclear:**
```markdown
Use scripts/helper.py for processing.
```

**Problem:** Does "use" mean execute or read?

**✓ Clear alternatives:**
- "Run scripts/helper.py to process files"
- "See scripts/helper.py for implementation details"

## Security Considerations

### Never Hardcode Secrets

**❌ Bad:**
```python
API_KEY = "sk-1234567890abcdef"
PASSWORD = "admin123"
```

**✓ Good:**
```python
import os

API_KEY = os.environ.get('API_KEY')
if not API_KEY:
    print("Error: API_KEY environment variable not set")
    print("Set it with: export API_KEY=your-key-here")
    sys.exit(1)
```

### Path Traversal Prevention

**❌ Vulnerable:**
```python
def read_file(filename):
    return open(filename).read()  # Can read any file!
```

**✓ Safe:**
```python
def read_file(filename, base_dir):
    """Read file only from allowed directory."""
    # Normalize paths
    base = os.path.abspath(base_dir)
    path = os.path.abspath(os.path.join(base_dir, filename))

    # Ensure path is within base_dir
    if not path.startswith(base):
        raise ValueError(f"Access denied: {filename} outside allowed directory")

    with open(path) as f:
        return f.read()
```

### Input Validation

**Always validate external input:**
```python
def process_user_input(value, expected_type, allowed_values=None):
    """Validate and sanitize user input."""
    # Type check
    if not isinstance(value, expected_type):
        raise ValueError(f"Expected {expected_type}, got {type(value)}")

    # Value check
    if allowed_values and value not in allowed_values:
        raise ValueError(f"Value must be one of: {allowed_values}")

    # String sanitization
    if isinstance(value, str):
        # Remove dangerous characters for shell commands
        if any(c in value for c in [';', '|', '&', '`', '$', '(', ')']):
            raise ValueError("Invalid characters in input")

    return value
```

## Script Review Checklist

```
Script Quality Review:
- [ ] Error handling for all expected failures
- [ ] All constants explained (no magic numbers)
- [ ] Docstrings for all functions
- [ ] Module-level documentation
- [ ] Dependencies listed clearly
- [ ] Usage examples provided
- [ ] SKILL.md says "execute" or "read as reference"
- [ ] No hardcoded secrets
- [ ] Input validation for external data
- [ ] Path traversal protection
- [ ] Helpful error messages
- [ ] Proper exit codes (0 success, 1+ failure)
- [ ] Validation scripts for critical operations
```
