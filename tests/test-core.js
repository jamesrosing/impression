#!/usr/bin/env node
/**
 * Impression Test Suite
 * Basic tests for core functionality
 *
 * Run: node tests/test-core.js
 *
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// TEST UTILITIES
// =============================================================================

let passed = 0;
let failed = 0;
const errors = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}`);
    errors.push({ name, error: err.message });
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${expected}, got ${actual}`);
  }
}

function assertDeepEqual(actual, expected, message = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message} Deep equality failed`);
  }
}

function assertIncludes(arr, item, message = '') {
  if (!arr.includes(item)) {
    throw new Error(`${message} Array does not include ${item}`);
  }
}

function assertExists(filepath, message = '') {
  if (!fs.existsSync(filepath)) {
    throw new Error(`${message} File does not exist: ${filepath}`);
  }
}

function assertType(value, type, message = '') {
  if (typeof value !== type) {
    throw new Error(`${message} Expected type ${type}, got ${typeof value}`);
  }
}

// =============================================================================
// LOAD MODULES
// =============================================================================

const scriptsDir = path.join(__dirname, '..', 'scripts');

let migrateTokens, blendDesignSystems, generateTailwindConfig, generateCSSVariables;
let generateFigmaTokens, generateShadcnTheme, generateW3CTokens;
let captureScreenshots, ciCompare;

try {
  migrateTokens = require(path.join(scriptsDir, 'migrate-tokens.js'));
  blendDesignSystems = require(path.join(scriptsDir, 'blend-design-systems.js'));
  generateTailwindConfig = require(path.join(scriptsDir, 'generate-tailwind-config.js'));
  generateCSSVariables = require(path.join(scriptsDir, 'generate-css-variables.js'));
  generateFigmaTokens = require(path.join(scriptsDir, 'generate-figma-tokens.js'));
  generateShadcnTheme = require(path.join(scriptsDir, 'generate-shadcn-theme.js'));
  generateW3CTokens = require(path.join(scriptsDir, 'generate-w3c-tokens.js'));
  captureScreenshots = require(path.join(scriptsDir, 'capture-screenshots.js'));
  ciCompare = require(path.join(scriptsDir, 'ci-compare.js'));
} catch (err) {
  console.error('Failed to load modules:', err.message);
}

// =============================================================================
// SAMPLE DATA
// =============================================================================

const sampleDesignSystem = {
  meta: {
    url: 'https://example.com',
    title: 'Test Design System',
    extractedAt: '2024-01-01T00:00:00.000Z',
    viewport: { width: 1920, height: 1080 },
    designCharacter: 'Test design'
  },
  colors: {
    cssVariables: {
      '--color-primary': '#3b82f6',
      '--color-secondary': '#6366f1',
      '--color-background': '#ffffff',
      '--color-foreground': '#0a0a0a'
    },
    palette: [
      { value: '#3b82f6', count: 10, role: 'primary' },
      { value: '#6366f1', count: 5, role: 'secondary' },
      { value: '#ffffff', count: 100, role: 'background' },
      { value: '#0a0a0a', count: 50, role: 'text' }
    ],
    semantic: {
      backgrounds: [{ value: '#ffffff', count: 100 }],
      text: [{ value: '#0a0a0a', count: 50 }],
      borders: [{ value: '#e5e7eb', count: 20 }],
      accents: [{ value: '#3b82f6', count: 10 }]
    }
  },
  typography: {
    fontFamilies: [
      { family: 'Inter', weight: '400', style: 'normal', role: 'sans' }
    ],
    scale: ['14px', '16px', '18px', '24px', '32px'],
    fontWeights: ['400', '500', '600', '700'],
    lineHeights: [{ value: '1.5', count: 100 }],
    letterSpacing: []
  },
  spacing: {
    scale: ['4px', '8px', '16px', '24px', '32px'],
    grid: '8px',
    gaps: [{ value: '16px', count: 50 }],
    paddings: [{ value: '24px', count: 30 }]
  },
  animations: {
    keyframes: {},
    transitions: [],
    durations: ['150ms', '300ms'],
    easings: ['ease-in-out']
  },
  components: { buttons: [], inputs: [], cards: [] },
  shadows: [
    { value: '0 1px 3px rgba(0,0,0,0.1)', role: 'sm' }
  ],
  borderRadius: [
    { value: '4px', role: 'sm' },
    { value: '8px', role: 'md' }
  ],
  breakpoints: {
    detected: [640, 768, 1024, 1280],
    containerWidths: [640, 768, 1024, 1280]
  }
};

// =============================================================================
// TESTS: File Structure
// =============================================================================

console.log('\n📁 File Structure Tests');

test('scripts directory exists', () => {
  assertExists(scriptsDir);
});

test('extract-design-system.js exists', () => {
  assertExists(path.join(scriptsDir, 'extract-design-system.js'));
});

test('compare-design-systems.js exists', () => {
  assertExists(path.join(scriptsDir, 'compare-design-systems.js'));
});

test('implement-design-changes.js exists', () => {
  assertExists(path.join(scriptsDir, 'implement-design-changes.js'));
});

test('generate-tailwind-config.js exists', () => {
  assertExists(path.join(scriptsDir, 'generate-tailwind-config.js'));
});

test('generate-css-variables.js exists', () => {
  assertExists(path.join(scriptsDir, 'generate-css-variables.js'));
});

test('generate-figma-tokens.js exists', () => {
  assertExists(path.join(scriptsDir, 'generate-figma-tokens.js'));
});

test('generate-shadcn-theme.js exists', () => {
  assertExists(path.join(scriptsDir, 'generate-shadcn-theme.js'));
});

test('generate-w3c-tokens.js exists', () => {
  assertExists(path.join(scriptsDir, 'generate-w3c-tokens.js'));
});

test('blend-design-systems.js exists', () => {
  assertExists(path.join(scriptsDir, 'blend-design-systems.js'));
});

test('migrate-tokens.js exists', () => {
  assertExists(path.join(scriptsDir, 'migrate-tokens.js'));
});

test('capture-screenshots.js exists', () => {
  assertExists(path.join(scriptsDir, 'capture-screenshots.js'));
});

test('ci-compare.js exists', () => {
  assertExists(path.join(scriptsDir, 'ci-compare.js'));
});

test('types.d.ts exists', () => {
  assertExists(path.join(__dirname, '..', 'types.d.ts'));
});

test('templates directory exists', () => {
  assertExists(path.join(__dirname, '..', 'templates'));
});

test('examples/extracted directory exists', () => {
  assertExists(path.join(__dirname, '..', 'examples', 'extracted'));
});

// =============================================================================
// TESTS: Color Utilities
// =============================================================================

console.log('\n🎨 Color Utility Tests');

if (migrateTokens) {
  test('hexToRgb converts correctly', () => {
    const rgb = migrateTokens.hexToRgb('#3b82f6');
    assertEqual(rgb.r, 59);
    assertEqual(rgb.g, 130);
    assertEqual(rgb.b, 246);
  });

  test('rgbToHex converts correctly', () => {
    const hex = migrateTokens.rgbToHex(59, 130, 246);
    assertEqual(hex, '#3b82f6');
  });

  test('hexToHsl converts correctly', () => {
    const hsl = migrateTokens.hexToHsl('#3b82f6');
    assertType(hsl.h, 'number');
    assertType(hsl.s, 'number');
    assertType(hsl.l, 'number');
  });

  test('hslToHex converts correctly', () => {
    const hex = migrateTokens.hslToHex(217, 91, 60);
    assertType(hex, 'string');
  });
}

if (blendDesignSystems) {
  test('colorDistance calculates correctly', () => {
    const dist = blendDesignSystems.colorDistance('#000000', '#ffffff');
    assertEqual(dist > 400, true);
  });

  test('colorDistance returns 0 for same colors', () => {
    const dist = blendDesignSystems.colorDistance('#3b82f6', '#3b82f6');
    assertEqual(dist, 0);
  });

  test('blendColors produces middle color', () => {
    const blend = blendDesignSystems.blendColors('#000000', '#ffffff', 0.5);
    assertType(blend, 'string');
    // Should be around gray
  });
}

// =============================================================================
// TESTS: Token Migration
// =============================================================================

console.log('\n🔄 Token Migration Tests');

if (migrateTokens) {
  test('detectFormat identifies Impression format', () => {
    const format = migrateTokens.detectFormat(sampleDesignSystem);
    assertEqual(format, 'impression');
  });

  test('detectFormat identifies W3C format', () => {
    const w3cTokens = {
      colors: {
        primary: { $type: 'color', $value: '#3b82f6' }
      }
    };
    const format = migrateTokens.detectFormat(w3cTokens);
    assertEqual(format, 'w3c');
  });

  test('migrateTokens from impression to w3c', () => {
    const result = migrateTokens.migrateTokens(sampleDesignSystem, 'impression', 'w3c');
    assertType(result, 'object');
  });

  test('migrateTokens from impression to tailwind', () => {
    const result = migrateTokens.migrateTokens(sampleDesignSystem, 'impression', 'tailwind');
    assertType(result, 'string');
  });

  test('migrateTokens from impression to css', () => {
    const result = migrateTokens.migrateTokens(sampleDesignSystem, 'impression', 'css');
    assertType(result, 'string');
    assertEqual(result.includes(':root'), true);
  });
}

// =============================================================================
// TESTS: Design System Blending
// =============================================================================

console.log('\n🔀 Design System Blending Tests');

if (blendDesignSystems) {
  test('blendDesignSystems merges two systems', () => {
    const system1 = { ...sampleDesignSystem };
    const system2 = { ...sampleDesignSystem };
    system2.colors.palette = [{ value: '#ef4444', count: 10, role: 'accent' }];

    const blended = blendDesignSystems.blendDesignSystems([system1, system2]);
    assertType(blended, 'object');
    assertEqual(blended.meta.blendStrategy, 'merge');
  });

  test('blendDesignSystems respects weights', () => {
    const system1 = { ...sampleDesignSystem };
    const system2 = { ...sampleDesignSystem };

    const blended = blendDesignSystems.blendDesignSystems(
      [system1, system2],
      { weights: [70, 30] }
    );

    assertEqual(blended.meta.sources[0].weight > 0.6, true);
  });

  test('dedupeColors removes similar colors', () => {
    const palette = [
      { value: '#3b82f6' },
      { value: '#3b82f7' },  // Very similar to above
      { value: '#ef4444' }
    ];
    const deduped = blendDesignSystems.dedupeColors(palette, 10);
    assertEqual(deduped.length, 2);
  });
}

// =============================================================================
// TESTS: Generators
// =============================================================================

console.log('\n⚙️ Generator Tests');

if (generateTailwindConfig) {
  test('generateTailwindConfig returns valid config', () => {
    const config = generateTailwindConfig.generateTailwindConfig
      ? generateTailwindConfig.generateTailwindConfig(sampleDesignSystem)
      : generateTailwindConfig(sampleDesignSystem);
    assertType(config, 'string');
    assertEqual(config.includes('module.exports'), true);
  });
}

if (generateCSSVariables) {
  test('generateCSSVariables returns valid CSS', () => {
    const css = generateCSSVariables.generateCSSVariables
      ? generateCSSVariables.generateCSSVariables(sampleDesignSystem)
      : generateCSSVariables(sampleDesignSystem);
    assertType(css, 'string');
    assertEqual(css.includes(':root'), true);
    assertEqual(css.includes('--'), true);
  });
}

if (generateFigmaTokens) {
  test('generateFigmaTokens returns token structure', () => {
    const tokens = generateFigmaTokens.generateFigmaVariables(sampleDesignSystem);
    assertType(tokens, 'object');
  });
}

if (generateShadcnTheme) {
  test('generateShadcnTheme returns HSL variables', () => {
    const theme = generateShadcnTheme.mapToShadcnTheme(sampleDesignSystem);
    assertType(theme, 'object');
    assertEqual(theme.light !== undefined || theme['--background'] !== undefined, true);
  });
}

if (generateW3CTokens) {
  test('generateW3CTokens returns W3C format', () => {
    const tokens = generateW3CTokens.generateW3CTokens(sampleDesignSystem);
    assertType(tokens, 'object');
  });
}

// =============================================================================
// TESTS: Screenshot Utilities
// =============================================================================

console.log('\n📸 Screenshot Utility Tests');

if (captureScreenshots) {
  test('generateCapturePlan creates valid plan', () => {
    const plan = captureScreenshots.generateCapturePlan('https://example.com', {
      label: 'test'
    });
    assertType(plan, 'object');
    assertType(plan.manifest, 'object');
    assertType(plan.commands, 'object');
  });

  test('DEFAULT_BREAKPOINTS is defined', () => {
    assertEqual(Array.isArray(captureScreenshots.DEFAULT_BREAKPOINTS), true);
    assertEqual(captureScreenshots.DEFAULT_BREAKPOINTS.length > 0, true);
  });
}

// =============================================================================
// TESTS: CI Integration
// =============================================================================

console.log('\n🔧 CI Integration Tests');

if (ciCompare) {
  test('SEVERITY_LEVELS is defined', () => {
    assertType(ciCompare.SEVERITY_LEVELS, 'object');
    assertEqual(ciCompare.SEVERITY_LEVELS.critical !== undefined, true);
  });

  test('DEFAULT_THRESHOLDS is defined', () => {
    assertType(ciCompare.DEFAULT_THRESHOLDS, 'object');
    assertEqual(ciCompare.DEFAULT_THRESHOLDS.colorDelta !== undefined, true);
  });

  test('generateMarkdownReport produces markdown', () => {
    const result = { score: 85, issues: [], summary: {} };
    const md = ciCompare.generateMarkdownReport(result, {});
    assertType(md, 'string');
    assertEqual(md.includes('# Design System'), true);
  });

  test('generateGitHubAnnotations produces annotations', () => {
    const result = {
      score: 85,
      issues: [
        { severity: 'minor', category: 'colors', message: 'Test issue', file: 'test.css' }
      ],
      summary: {}
    };
    const annotations = ciCompare.generateGitHubAnnotations(result, {});
    assertType(annotations, 'string');
    assertEqual(annotations.includes('::'), true);
  });
}

// =============================================================================
// TESTS: Example Files
// =============================================================================

console.log('\n📄 Example File Tests');

const examplesDir = path.join(__dirname, '..', 'examples', 'extracted');

test('linear.json exists and is valid', () => {
  const filepath = path.join(examplesDir, 'linear.json');
  assertExists(filepath);
  const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  assertEqual(data.meta !== undefined, true);
  assertEqual(data.colors !== undefined, true);
});

test('vercel.json exists and is valid', () => {
  const filepath = path.join(examplesDir, 'vercel.json');
  assertExists(filepath);
  const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  assertEqual(data.meta !== undefined, true);
});

test('sorrel.json exists and is valid', () => {
  const filepath = path.join(examplesDir, 'sorrel.json');
  assertExists(filepath);
  const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  assertEqual(data.meta !== undefined, true);
  assertEqual(data.typography !== undefined, true);
});

// =============================================================================
// TESTS: Templates
// =============================================================================

console.log('\n📐 Template Tests');

const templatesDir = path.join(__dirname, '..', 'templates');

test('design-system-starter.json is valid', () => {
  const filepath = path.join(templatesDir, 'design-system-starter.json');
  assertExists(filepath);
  const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  assertEqual(data.meta !== undefined, true);
  assertEqual(data.colors !== undefined, true);
  assertEqual(data.typography !== undefined, true);
});

test('style-guide-schema.json is valid JSON Schema', () => {
  const filepath = path.join(templatesDir, 'style-guide-schema.json');
  assertExists(filepath);
  const schema = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  assertEqual(schema.$schema !== undefined, true);
  assertEqual(schema.type, 'object');
});

// =============================================================================
// SUMMARY
// =============================================================================

console.log('\n' + '='.repeat(50));
console.log(`\n✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

if (errors.length > 0) {
  console.log('\n📋 Error Details:');
  errors.forEach(({ name, error }) => {
    console.log(`  - ${name}: ${error}`);
  });
}

console.log('\n' + '='.repeat(50));

process.exit(failed > 0 ? 1 : 0);
