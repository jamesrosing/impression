#!/usr/bin/env python3
"""
Automated metadata validation for Agent Skills.

Validates YAML frontmatter compliance, name format, description quality,
and file structure according to Anthropic's Agent Skills specification.

Dependencies:
    - PyYAML (pip install pyyaml)

Usage:
    python validate_metadata.py /path/to/skill-directory/

    Options:
        --json    Output results in JSON format
        --verbose Show detailed validation information

Example:
    python validate_metadata.py ../pdf-processing/
    python validate_metadata.py ./my-skill/ --json

Returns exit code 0 if valid, 1 if validation fails.
"""

import os
import re
import sys
import json
from pathlib import Path
from typing import Dict, List, Tuple

try:
    import yaml
except ImportError:
    print("Error: PyYAML is not installed")
    print("Install it with: pip install pyyaml")
    sys.exit(1)


class SkillValidator:
    """Validates Agent Skill metadata and structure."""

    # Reserved words that cannot appear in skill names
    RESERVED_WORDS = ['anthropic', 'claude']

    # Name format regex: lowercase letters, numbers, hyphens only
    NAME_PATTERN = re.compile(r'^[a-z0-9]+(-[a-z0-9]+)*$')

    # Patterns indicating first/second person in description
    FIRST_PERSON_PATTERNS = [
        r'\bI\s+(?:can|will|help|provide|offer)',
        r'\bmy\s+',
        r'\bme\s+',
    ]

    SECOND_PERSON_PATTERNS = [
        r'\byou\s+can',
        r'\byour\s+',
        r'\blet\s+me\s+help\s+you',
    ]

    def __init__(self, skill_path: str):
        """
        Initialize validator with skill directory path.

        Args:
            skill_path: Path to the skill directory
        """
        self.skill_path = Path(skill_path).resolve()
        self.skill_md_path = self.skill_path / 'SKILL.md'
        self.results = {
            'valid': False,
            'skill_path': str(self.skill_path),
            'skill_name': self.skill_path.name,
            'checks': {},
            'errors': [],
            'warnings': []
        }

    def validate(self) -> Dict:
        """
        Run all validation checks.

        Returns:
            Dictionary with validation results
        """
        # Check if skill directory exists
        if not self.skill_path.exists():
            self.results['errors'].append(
                f"Skill directory not found: {self.skill_path}"
            )
            return self.results

        if not self.skill_path.is_dir():
            self.results['errors'].append(
                f"Path is not a directory: {self.skill_path}"
            )
            return self.results

        # Check if SKILL.md exists
        if not self.skill_md_path.exists():
            self.results['errors'].append(
                f"SKILL.md not found in {self.skill_path}"
            )
            return self.results

        # Run all checks
        self._check_yaml_frontmatter()
        self._check_skill_md_length()
        self._check_file_structure()

        # Determine overall validity
        self.results['valid'] = len(self.results['errors']) == 0

        return self.results

    def _check_yaml_frontmatter(self):
        """Validate YAML frontmatter in SKILL.md"""
        check_name = 'yaml_frontmatter'

        try:
            with open(self.skill_md_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Check for YAML frontmatter delimiters
            if not content.startswith('---'):
                self._add_check(check_name, False,
                               "SKILL.md must start with YAML frontmatter (---)")
                self.results['errors'].append(
                    "Missing YAML frontmatter. SKILL.md must start with '---'"
                )
                return

            # Extract YAML frontmatter
            parts = content.split('---', 2)
            if len(parts) < 3:
                self._add_check(check_name, False,
                               "YAML frontmatter not properly delimited")
                self.results['errors'].append(
                    "YAML frontmatter must be delimited by '---' at start and end"
                )
                return

            yaml_content = parts[1].strip()

            # Parse YAML
            try:
                metadata = yaml.safe_load(yaml_content)
            except yaml.YAMLError as e:
                self._add_check(check_name, False, f"Invalid YAML syntax: {e}")
                self.results['errors'].append(f"YAML syntax error: {e}")
                return

            self._add_check(check_name, True, "YAML frontmatter is valid")

            # Validate individual fields
            self._validate_name_field(metadata)
            self._validate_description_field(metadata)
            self._validate_optional_fields(metadata)

        except Exception as e:
            self._add_check(check_name, False, f"Error reading SKILL.md: {e}")
            self.results['errors'].append(f"Error reading SKILL.md: {e}")

    def _validate_name_field(self, metadata: Dict):
        """Validate the name field"""
        name = metadata.get('name')

        # Check if name exists
        if not name:
            self._add_check('name_present', False, "Name field is required")
            self.results['errors'].append("Missing required field: name")
            return

        self._add_check('name_present', True, f"Name present: {name}")

        # Check name format
        if not self.NAME_PATTERN.match(name):
            self._add_check('name_format', False,
                           f"Name must be lowercase with hyphens only: {name}")
            self.results['errors'].append(
                f"Invalid name format: '{name}'. "
                f"Must be lowercase letters, numbers, and hyphens only"
            )
        else:
            self._add_check('name_format', True, "Name format is valid")

        # Check name length
        if len(name) > 64:
            self._add_check('name_length', False,
                           f"Name is {len(name)} characters (max 64)")
            self.results['errors'].append(
                f"Name too long: {len(name)} characters (maximum 64)"
            )
        else:
            self._add_check('name_length', True,
                           f"Name length OK ({len(name)} chars)")

        # Check for reserved words
        name_lower = name.lower()
        reserved_found = [word for word in self.RESERVED_WORDS
                         if word in name_lower]
        if reserved_found:
            self._add_check('name_reserved', False,
                           f"Contains reserved words: {reserved_found}")
            self.results['errors'].append(
                f"Name contains reserved words: {', '.join(reserved_found)}"
            )
        else:
            self._add_check('name_reserved', True, "No reserved words")

        # Check if name matches directory name
        dir_name = self.skill_path.name
        if name != dir_name:
            self._add_check('name_matches_directory', False,
                           f"Name '{name}' doesn't match directory '{dir_name}'")
            self.results['warnings'].append(
                f"Name '{name}' doesn't match directory name '{dir_name}'. "
                f"They should match exactly."
            )
        else:
            self._add_check('name_matches_directory', True,
                           "Name matches directory name")

    def _validate_description_field(self, metadata: Dict):
        """Validate the description field"""
        description = metadata.get('description')

        # Check if description exists
        if not description:
            self._add_check('description_present', False,
                           "Description field is required")
            self.results['errors'].append("Missing required field: description")
            return

        self._add_check('description_present', True, "Description present")

        # Check description length
        desc_length = len(description)
        if desc_length > 1024:
            self._add_check('description_length', False,
                           f"Description is {desc_length} characters (max 1024)")
            self.results['errors'].append(
                f"Description too long: {desc_length} characters (maximum 1024)"
            )
        else:
            self._add_check('description_length', True,
                           f"Description length OK ({desc_length} chars)")

        # Check for XML tags
        if '<' in description or '>' in description:
            self._add_check('description_xml', False,
                           "Description contains XML tags")
            self.results['errors'].append(
                "Description cannot contain XML tags (< or >)"
            )
        else:
            self._add_check('description_xml', True, "No XML tags")

        # Check for "what" and "when" guidance
        has_what = True  # Assume present unless obviously missing
        has_when = any(keyword in description.lower() for keyword in
                      ['use when', 'when', 'for', 'whenever', 'trigger'])

        if not has_when:
            self._add_check('description_when', False,
                           "Description should include 'when to use' guidance")
            self.results['warnings'].append(
                "Description should include 'when to use' guidance "
                "(e.g., 'Use when...', 'Triggers when...')"
            )
        else:
            self._add_check('description_when', True,
                           "Includes 'when to use' guidance")

        # Check for first/second person voice
        voice_issues = []
        for pattern in self.FIRST_PERSON_PATTERNS:
            if re.search(pattern, description, re.IGNORECASE):
                voice_issues.append("first person (I/my/me)")
                break

        for pattern in self.SECOND_PERSON_PATTERNS:
            if re.search(pattern, description, re.IGNORECASE):
                voice_issues.append("second person (you/your)")
                break

        if voice_issues:
            self._add_check('description_third_person', False,
                           f"Uses {', '.join(voice_issues)}")
            self.results['warnings'].append(
                f"Description uses {', '.join(voice_issues)}. "
                f"Should be written in third person ('This skill...')"
            )
        else:
            self._add_check('description_third_person', True,
                           "Written in third person")

    def _validate_optional_fields(self, metadata: Dict):
        """Validate optional fields if present"""
        # Check allowed-tools field (optional)
        if 'allowed-tools' in metadata:
            tools = metadata['allowed-tools']
            self._add_check('allowed_tools_present', True,
                           f"Allowed tools specified: {len(tools)} tools")

        # Check license field (optional)
        if 'license' in metadata:
            license_val = metadata['license']
            self._add_check('license_present', True,
                           f"License: {license_val}")

        # Check metadata field (optional, can contain version, dependencies, etc.)
        if 'metadata' in metadata:
            meta = metadata['metadata']

            # Check for version in metadata
            if isinstance(meta, dict) and 'version' in meta:
                version = meta['version']
                self._add_check('version_present', True, f"Version: {version}")
            else:
                self._add_check('version_present', True,
                               "Version not in metadata (optional)")

            # Check for dependencies in metadata
            if isinstance(meta, dict) and 'dependencies' in meta:
                deps = meta['dependencies']
                self._add_check('dependencies_present', True,
                               f"Dependencies listed: {deps}")
            else:
                self._add_check('dependencies_present', True,
                               "Dependencies not in metadata (optional)")
        else:
            self._add_check('version_present', True,
                           "Metadata field not present (optional)")
            self._add_check('dependencies_present', True,
                           "Metadata field not present (optional)")

    def _check_skill_md_length(self):
        """Check SKILL.md file length"""
        try:
            with open(self.skill_md_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                line_count = len(lines)

            if line_count > 500:
                self._add_check('skill_md_length', False,
                               f"SKILL.md has {line_count} lines (recommended max: 500)")
                self.results['warnings'].append(
                    f"SKILL.md is {line_count} lines. "
                    f"Recommended maximum is 500 lines. "
                    f"Consider using progressive disclosure to extract content "
                    f"to reference files."
                )
            else:
                self._add_check('skill_md_length', True,
                               f"SKILL.md length OK ({line_count} lines)")

        except Exception as e:
            self._add_check('skill_md_length', False,
                           f"Error reading SKILL.md: {e}")

    def _check_file_structure(self):
        """Check file and directory structure"""
        # List all files and directories
        files = []
        for item in self.skill_path.rglob('*'):
            if item.is_file():
                rel_path = item.relative_to(self.skill_path)
                files.append(str(rel_path))

        self._add_check('file_structure', True,
                       f"Found {len(files)} files")

        # Check for Windows-style backslashes in SKILL.md
        try:
            with open(self.skill_md_path, 'r', encoding='utf-8') as f:
                content = f.read()

            backslash_count = content.count('\\')
            if backslash_count > 0:
                # Check if these are actual path separators (not escape sequences)
                path_backslashes = re.findall(r'[\w/]+\\[\w/\\]+', content)
                if path_backslashes:
                    self._add_check('windows_paths', False,
                                   f"Found Windows-style paths: {len(path_backslashes)}")
                    self.results['warnings'].append(
                        "Found Windows-style backslashes in file paths. "
                        "Use forward slashes (/) for cross-platform compatibility. "
                        f"Examples: {path_backslashes[:3]}"
                    )
                else:
                    self._add_check('windows_paths', True,
                                   "No Windows-style path separators")
            else:
                self._add_check('windows_paths', True,
                               "No Windows-style path separators")

        except Exception as e:
            self._add_check('windows_paths', False,
                           f"Error checking paths: {e}")

    def _add_check(self, name: str, passed: bool, message: str):
        """Add a check result"""
        self.results['checks'][name] = {
            'pass': passed,
            'message': message
        }


def format_results_human(results: Dict) -> str:
    """Format validation results for human reading"""
    output = []

    # Header
    output.append("=" * 70)
    output.append(f"SKILL METADATA VALIDATION: {results['skill_name']}")
    output.append("=" * 70)
    output.append("")

    # Overall result
    if results['valid']:
        output.append("✓ VALIDATION PASSED")
    else:
        output.append("✗ VALIDATION FAILED")
    output.append("")

    # Errors
    if results['errors']:
        output.append("ERRORS:")
        for error in results['errors']:
            output.append(f"  ✗ {error}")
        output.append("")

    # Warnings
    if results['warnings']:
        output.append("WARNINGS:")
        for warning in results['warnings']:
            output.append(f"  ⚠ {warning}")
        output.append("")

    # Detailed checks
    output.append("DETAILED CHECKS:")
    for check_name, check_result in results['checks'].items():
        symbol = "✓" if check_result['pass'] else "✗"
        output.append(f"  {symbol} {check_name}: {check_result['message']}")

    output.append("")
    output.append("=" * 70)

    return "\n".join(output)


def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    skill_path = sys.argv[1]
    output_json = '--json' in sys.argv
    verbose = '--verbose' in sys.argv or output_json

    # Validate skill
    validator = SkillValidator(skill_path)
    results = validator.validate()

    # Output results
    if output_json:
        print(json.dumps(results, indent=2))
    else:
        print(format_results_human(results))

        if verbose and results['checks']:
            print("\nAll checks completed.")

    # Exit with appropriate code
    sys.exit(0 if results['valid'] else 1)


if __name__ == '__main__':
    main()
