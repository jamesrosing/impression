#!/usr/bin/env node
/**
 * Semantic Naming for Design System Tokens
 *
 * Features:
 * - Suggest semantic names for colors based on HSL analysis
 * - Detect color roles (primary, success, warning, error, etc.)
 * - Generate naming conventions (BEM, Tailwind, CSS vars)
 * - Suggest token hierarchy and relationships
 * - Export named tokens to various formats
 *
 * Usage:
 *   node semantic-naming.js <design-system.json> [--format=css|tailwind|json]
 *   node semantic-naming.js references/linear.json --output=named-tokens.json
 */

const fs = require('fs');
const path = require('path');

// ============ COLOR ANALYSIS ============

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function rgbToHsl(rgb) {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function getColorCharacteristics(hex) {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb);

  return {
    hex,
    rgb,
    hsl,
    isNeutral: hsl.s < 10,
    isLight: hsl.l > 70,
    isDark: hsl.l < 30,
    isMuted: hsl.s < 30 && hsl.l > 30 && hsl.l < 70,
    isVibrant: hsl.s > 60,
  };
}

// ============ SEMANTIC ROLE DETECTION ============

const COLOR_ROLES = {
  // Semantic by hue
  red: { hueRange: [350, 10], names: ['error', 'danger', 'destructive', 'negative'] },
  orange: { hueRange: [10, 45], names: ['warning', 'caution', 'attention'] },
  yellow: { hueRange: [45, 65], names: ['warning', 'highlight', 'attention'] },
  green: { hueRange: [80, 160], names: ['success', 'positive', 'safe', 'confirm'] },
  cyan: { hueRange: [160, 200], names: ['info', 'link', 'interactive'] },
  blue: { hueRange: [200, 260], names: ['primary', 'info', 'link', 'interactive'] },
  purple: { hueRange: [260, 300], names: ['accent', 'creative', 'premium'] },
  pink: { hueRange: [300, 350], names: ['accent', 'highlight'] },
};

const NEUTRAL_ROLES = {
  background: { lightRange: [95, 100] },
  surface: { lightRange: [85, 95] },
  subtle: { lightRange: [75, 85] },
  muted: { lightRange: [50, 75] },
  text: { lightRange: [0, 30] },
  heading: { lightRange: [0, 20] },
};

function detectColorRole(hex, existingColors = []) {
  const chars = getColorCharacteristics(hex);
  const { h, s, l } = chars.hsl;

  // Check for neutrals first
  if (chars.isNeutral) {
    if (l >= 95) return { role: 'background', confidence: 0.9, variant: 'primary' };
    if (l >= 85) return { role: 'background', confidence: 0.8, variant: 'secondary' };
    if (l >= 70) return { role: 'surface', confidence: 0.8 };
    if (l >= 50) return { role: 'border', confidence: 0.7 };
    if (l >= 30) return { role: 'text', confidence: 0.7, variant: 'muted' };
    if (l >= 15) return { role: 'text', confidence: 0.8, variant: 'secondary' };
    return { role: 'text', confidence: 0.9, variant: 'primary' };
  }

  // Detect semantic colors by hue
  for (const [colorName, config] of Object.entries(COLOR_ROLES)) {
    const [min, max] = config.hueRange;
    const inRange = min > max ? (h >= min || h <= max) : (h >= min && h <= max);

    if (inRange) {
      // Determine specific role
      let role = config.names[0];
      let confidence = 0.7;

      // Higher saturation = more likely to be semantic
      if (s > 60) {
        confidence = 0.85;
      }

      // Check if this could be primary
      if (colorName === 'blue' && s > 50 && l > 40 && l < 70) {
        role = 'primary';
        confidence = 0.9;
      }

      // Check for success
      if (colorName === 'green' && s > 40) {
        role = 'success';
        confidence = 0.85;
      }

      // Check for error
      if (colorName === 'red' && s > 50) {
        role = 'error';
        confidence = 0.9;
      }

      // Check for warning
      if ((colorName === 'orange' || colorName === 'yellow') && s > 50) {
        role = 'warning';
        confidence = 0.85;
      }

      return { role, confidence, hue: colorName };
    }
  }

  // Default to accent if vibrant but no specific match
  if (chars.isVibrant) {
    return { role: 'accent', confidence: 0.6 };
  }

  return { role: 'unknown', confidence: 0.3 };
}

// ============ NAME GENERATION ============

const NAMING_CONVENTIONS = {
  css: {
    prefix: '--',
    separator: '-',
    format: (tokens) => tokens.join('-').toLowerCase(),
  },
  tailwind: {
    prefix: '',
    separator: '-',
    format: (tokens) => tokens.join('-').toLowerCase(),
  },
  camelCase: {
    prefix: '',
    separator: '',
    format: (tokens) => tokens.map((t, i) => i === 0 ? t.toLowerCase() : capitalize(t)).join(''),
  },
  pascalCase: {
    prefix: '',
    separator: '',
    format: (tokens) => tokens.map(capitalize).join(''),
  },
  screamingSnake: {
    prefix: '',
    separator: '_',
    format: (tokens) => tokens.join('_').toUpperCase(),
  },
};

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function generateName(role, variant, convention = 'css') {
  const config = NAMING_CONVENTIONS[convention] || NAMING_CONVENTIONS.css;

  const tokens = ['color'];

  if (role) tokens.push(role);
  if (variant && variant !== 'default') tokens.push(variant);

  return config.prefix + config.format(tokens);
}

function generateScale(baseRole, levels = 10, convention = 'css') {
  const scale = [];
  const config = NAMING_CONVENTIONS[convention] || NAMING_CONVENTIONS.css;

  for (let i = 1; i <= levels; i++) {
    const level = i * 100;
    scale.push({
      name: config.prefix + config.format(['color', baseRole, String(level)]),
      level,
    });
  }

  return scale;
}

// ============ NAMING ENGINE ============

function analyzeDesignSystem(designSystem) {
  const colors = designSystem.colors || {};
  const analysis = {
    semantic: {},
    palette: [],
    neutrals: [],
    suggestions: [],
  };

  // Analyze semantic colors if present
  if (colors.semantic) {
    for (const [key, value] of Object.entries(colors.semantic)) {
      if (typeof value === 'string' && value.startsWith('#')) {
        const role = detectColorRole(value);
        analysis.semantic[key] = {
          original: key,
          value,
          detectedRole: role,
          suggestedName: generateName(role.role, null, 'css'),
        };
      }
    }
  }

  // Analyze palette
  if (colors.palette && colors.palette.length > 0) {
    const usedRoles = new Map();

    for (const color of colors.palette) {
      const value = color.value || color;
      if (!value || !value.startsWith('#')) continue;

      const role = detectColorRole(value);
      const chars = getColorCharacteristics(value);

      // Track role usage to create variants
      if (!usedRoles.has(role.role)) {
        usedRoles.set(role.role, []);
      }
      usedRoles.get(role.role).push({ value, chars, role });

      const entry = {
        value,
        characteristics: chars,
        detectedRole: role,
      };

      if (chars.isNeutral) {
        analysis.neutrals.push(entry);
      } else {
        analysis.palette.push(entry);
      }
    }

    // Generate suggestions for scales
    for (const [role, colors] of usedRoles) {
      if (colors.length >= 3 && role !== 'unknown') {
        // Sort by lightness
        colors.sort((a, b) => a.chars.hsl.l - b.chars.hsl.l);

        analysis.suggestions.push({
          type: 'scale',
          role,
          colors: colors.map((c, i) => ({
            value: c.value,
            suggestedName: generateName(role, String((i + 1) * 100), 'css'),
          })),
        });
      }
    }
  }

  return analysis;
}

function generateNamedTokens(designSystem, options = {}) {
  const { convention = 'css', includeAlternatives = true } = options;

  const analysis = analyzeDesignSystem(designSystem);
  const tokens = {
    colors: {},
    scales: {},
    meta: {
      convention,
      generated: new Date().toISOString(),
      source: designSystem.meta?.url || 'unknown',
    },
  };

  // Generate semantic tokens
  const roleIndex = {};

  for (const entry of analysis.palette) {
    const { role, confidence } = entry.detectedRole;

    // Track role usage for indexing
    if (!roleIndex[role]) roleIndex[role] = 0;
    roleIndex[role]++;

    const variant = roleIndex[role] > 1 ? String(roleIndex[role]) : null;
    const name = generateName(role, variant, convention);

    tokens.colors[name] = {
      value: entry.value,
      role,
      confidence,
    };

    if (includeAlternatives) {
      tokens.colors[name].alternatives = [
        generateName(role, variant, 'tailwind'),
        generateName(role, variant, 'camelCase'),
      ];
    }
  }

  // Generate neutral scale
  if (analysis.neutrals.length > 0) {
    analysis.neutrals.sort((a, b) => b.characteristics.hsl.l - a.characteristics.hsl.l);

    tokens.scales.neutral = analysis.neutrals.map((n, i) => {
      const level = Math.round((analysis.neutrals.length - i) / analysis.neutrals.length * 900) + 100;
      return {
        name: generateName('neutral', String(level), convention),
        value: n.value,
        lightness: n.characteristics.hsl.l,
      };
    });
  }

  // Add suggested scales
  for (const suggestion of analysis.suggestions) {
    if (suggestion.type === 'scale') {
      tokens.scales[suggestion.role] = suggestion.colors;
    }
  }

  return tokens;
}

// ============ OUTPUT FORMATTERS ============

function formatAsCSS(tokens) {
  const lines = [':root {'];

  for (const [name, token] of Object.entries(tokens.colors)) {
    lines.push(`  ${name}: ${token.value};`);
  }

  for (const [scaleName, scale] of Object.entries(tokens.scales)) {
    lines.push('');
    lines.push(`  /* ${scaleName} scale */`);
    for (const entry of scale) {
      lines.push(`  ${entry.name}: ${entry.value};`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}

function formatAsTailwind(tokens) {
  const config = {
    colors: {},
  };

  for (const [name, token] of Object.entries(tokens.colors)) {
    const cleanName = name.replace(/^--color-/, '');
    config.colors[cleanName] = token.value;
  }

  for (const [scaleName, scale] of Object.entries(tokens.scales)) {
    config.colors[scaleName] = {};
    for (const entry of scale) {
      const level = entry.name.match(/(\d+)$/)?.[1] || 'DEFAULT';
      config.colors[scaleName][level] = entry.value;
    }
  }

  return `module.exports = {
  theme: {
    extend: {
      colors: ${JSON.stringify(config.colors, null, 6).replace(/"/g, "'").split('\n').join('\n      ')}
    }
  }
}`;
}

// ============ MAIN ============

function processDesignSystem(designSystemPath, options = {}) {
  const { format = 'json', convention = 'css' } = options;

  const designSystem = JSON.parse(fs.readFileSync(designSystemPath, 'utf-8'));
  const tokens = generateNamedTokens(designSystem, { convention });

  let output;

  switch (format) {
    case 'css':
      output = formatAsCSS(tokens);
      break;
    case 'tailwind':
      output = formatAsTailwind(tokens);
      break;
    case 'json':
    default:
      output = JSON.stringify(tokens, null, 2);
  }

  return { tokens, output, format };
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: node semantic-naming.js <design-system.json> [options]');
    console.error('');
    console.error('Options:');
    console.error('  --format=json|css|tailwind   Output format (default: json)');
    console.error('  --convention=css|tailwind|camelCase   Naming convention (default: css)');
    console.error('  --output=<file>              Write output to file');
    console.error('');
    console.error('Example:');
    console.error('  node semantic-naming.js references/linear.json --format=css');
    process.exit(1);
  }

  const designSystemPath = path.resolve(args[0]);
  let format = 'json';
  let convention = 'css';
  let outputPath = null;

  for (const arg of args.slice(1)) {
    if (arg.startsWith('--format=')) {
      format = arg.split('=')[1];
    } else if (arg.startsWith('--convention=')) {
      convention = arg.split('=')[1];
    } else if (arg.startsWith('--output=')) {
      outputPath = path.resolve(arg.split('=')[1]);
    }
  }

  if (!fs.existsSync(designSystemPath)) {
    console.error(`Error: Design system file not found: ${designSystemPath}`);
    process.exit(1);
  }

  try {
    const result = processDesignSystem(designSystemPath, { format, convention });

    console.log(`✓ Generated semantic names`);
    console.log(`  Format: ${result.format}`);
    console.log(`  Colors: ${Object.keys(result.tokens.colors).length}`);
    console.log(`  Scales: ${Object.keys(result.tokens.scales).length}`);
    console.log('');

    if (outputPath) {
      fs.writeFileSync(outputPath, result.output);
      console.log(`✓ Written to: ${outputPath}`);
    } else {
      console.log(result.output);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  processDesignSystem,
  analyzeDesignSystem,
  generateNamedTokens,
  detectColorRole,
  getColorCharacteristics,
  generateName,
  formatAsCSS,
  formatAsTailwind,
};
