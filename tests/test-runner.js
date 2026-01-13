#!/usr/bin/env node
/**
 * Simple Test Runner
 *
 * A minimal test framework with no external dependencies.
 * Run all tests: node tests/test-runner.js
 * Run specific test: node tests/test-runner.js color-utils
 */

const fs = require('fs');
const path = require('path');

// ANSI colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  dim: '\x1b[2m'
};

// Test context
let currentSuite = '';
let passed = 0;
let failed = 0;
let skipped = 0;

/**
 * Define a test suite
 */
function describe(name, fn) {
  currentSuite = name;
  console.log(`\n${colors.cyan}${name}${colors.reset}`);
  fn();
}

/**
 * Define a test case
 */
function it(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ${colors.green}✓${colors.reset} ${colors.dim}${name}${colors.reset}`);
  } catch (err) {
    failed++;
    console.log(`  ${colors.red}✗${colors.reset} ${name}`);
    console.log(`    ${colors.red}${err.message}${colors.reset}`);
  }
}

/**
 * Skip a test
 */
function skip(name, fn) {
  skipped++;
  console.log(`  ${colors.yellow}○${colors.reset} ${colors.dim}${name} (skipped)${colors.reset}`);
}

/**
 * Assertion helpers
 */
const assert = {
  equal(actual, expected, message = '') {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  },

  deepEqual(actual, expected, message = '') {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(message || `Objects not equal:\n  Expected: ${JSON.stringify(expected)}\n  Got: ${JSON.stringify(actual)}`);
    }
  },

  closeTo(actual, expected, delta = 0.01, message = '') {
    if (Math.abs(actual - expected) > delta) {
      throw new Error(message || `Expected ${actual} to be close to ${expected} (±${delta})`);
    }
  },

  truthy(value, message = '') {
    if (!value) {
      throw new Error(message || `Expected truthy value, got ${value}`);
    }
  },

  falsy(value, message = '') {
    if (value) {
      throw new Error(message || `Expected falsy value, got ${value}`);
    }
  },

  throws(fn, message = '') {
    let threw = false;
    try {
      fn();
    } catch (e) {
      threw = true;
    }
    if (!threw) {
      throw new Error(message || 'Expected function to throw');
    }
  },

  isNull(value, message = '') {
    if (value !== null) {
      throw new Error(message || `Expected null, got ${value}`);
    }
  },

  isNotNull(value, message = '') {
    if (value === null) {
      throw new Error(message || 'Expected non-null value');
    }
  }
};

/**
 * Run test files
 */
function runTests(filter = null) {
  const testsDir = __dirname;
  const testFiles = fs.readdirSync(testsDir)
    .filter(f => f.endsWith('.test.js'))
    .filter(f => !filter || f.includes(filter));

  if (testFiles.length === 0) {
    console.log('No test files found.');
    process.exit(1);
  }

  console.log(`${colors.cyan}Running ${testFiles.length} test file(s)...${colors.reset}`);

  for (const file of testFiles) {
    require(path.join(testsDir, file));
  }

  // Print summary
  console.log('\n' + '─'.repeat(40));
  console.log(`${colors.cyan}Test Results:${colors.reset}`);
  console.log(`  ${colors.green}Passed: ${passed}${colors.reset}`);
  if (failed > 0) {
    console.log(`  ${colors.red}Failed: ${failed}${colors.reset}`);
  }
  if (skipped > 0) {
    console.log(`  ${colors.yellow}Skipped: ${skipped}${colors.reset}`);
  }
  console.log('─'.repeat(40));

  process.exit(failed > 0 ? 1 : 0);
}

// Export for test files
global.describe = describe;
global.it = it;
global.skip = skip;
global.assert = assert;

// Run if executed directly
if (require.main === module) {
  const filter = process.argv[2];
  runTests(filter);
}

module.exports = { describe, it, skip, assert, runTests };
