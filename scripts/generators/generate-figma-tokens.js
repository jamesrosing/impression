#!/usr/bin/env node
/**
 * Generate Figma Variables/Tokens from Design System JSON
 * Outputs JSON compatible with Figma's Variables API and Tokens Studio
 *
 * Usage:
 *   node generate-figma-tokens.js <design-system.json> [output.json]
 *   node generate-figma-tokens.js references/linear.json figma-tokens.json
 *
 * Formats supported:
 *   --format=figma    Figma Variables API format (default)
 *   --format=tokens   Tokens Studio for Figma format
 *
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// COLOR UTILITIES
// =============================================================================

function hexToRgba(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
    a: result[4] ? parseInt(result[4], 16) / 255 : 1
  };
}

function rgbStringToRgba(rgb) {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return null;
  return {
    r: parseInt(match[1]) / 255,
    g: parseInt(match[2]) / 255,
    b: parseInt(match[3]) / 255,
    a: match[4] ? parseFloat(match[4]) : 1
  };
}

function parseColor(value) {
  if (!value) return null;
  if (value.startsWith('#')) return hexToRgba(value);
  if (value.startsWith('rgb')) return rgbStringToRgba(value);
  return null;
}

function sanitizeName(name) {
  return name
    .replace(/[^a-zA-Z0-9-_/]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

// =============================================================================
// FIGMA VARIABLES FORMAT
// =============================================================================

function generateFigmaVariables(designSystem) {
  const collections = [];
  const modes = [{ name: 'Default', modeId: 'default' }];

  // Check for dark mode
  if (designSystem.themes?.dark || designSystem.colors?.cssVariables?.dark) {
    modes.push({ name: 'Dark', modeId: 'dark' });
  }

  // Color collection
  const colorVariables = [];
  const colorValues = {};

  // From palette
  designSystem.colors?.palette?.forEach((color, i) => {
    const name = color.role || `color-${i + 1}`;
    const rgba = parseColor(color.value);
    if (rgba) {
      colorVariables.push({
        id: `color-${sanitizeName(name)}`,
        name: name,
        resolvedType: 'COLOR',
        description: color.count ? `Used ${color.count} times` : ''
      });
      colorValues[`color-${sanitizeName(name)}`] = {
        default: rgba
      };
    }
  });

  // From semantic colors
  if (designSystem.colors?.semantic) {
    const semantic = designSystem.colors.semantic;

    ['backgrounds', 'text', 'borders', 'accents'].forEach(category => {
      semantic[category]?.forEach((color, i) => {
        const name = `${category}/${i === 0 ? 'primary' : i === 1 ? 'secondary' : `${i + 1}`}`;
        const rgba = parseColor(color.value);
        if (rgba) {
          colorVariables.push({
            id: `color-${sanitizeName(name)}`,
            name: name,
            resolvedType: 'COLOR',
            description: `Semantic ${category} color`
          });
          colorValues[`color-${sanitizeName(name)}`] = {
            default: rgba
          };
        }
      });
    });
  }

  if (colorVariables.length > 0) {
    collections.push({
      id: 'colors',
      name: 'Colors',
      modes,
      variables: colorVariables,
      values: colorValues
    });
  }

  // Typography collection
  const typographyVariables = [];
  const typographyValues = {};

  // Font families as strings
  designSystem.typography?.fontFamilies?.forEach(font => {
    const name = font.role || sanitizeName(font.family);
    typographyVariables.push({
      id: `font-family-${sanitizeName(name)}`,
      name: `font-family/${name}`,
      resolvedType: 'STRING',
      description: `${font.weight || ''} ${font.style || ''}`.trim()
    });
    typographyValues[`font-family-${sanitizeName(name)}`] = {
      default: font.family
    };
  });

  // Font sizes as numbers
  designSystem.typography?.scale?.forEach((size, i) => {
    const numericValue = parseFloat(size);
    const names = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'];
    const name = names[i] || `size-${i + 1}`;

    typographyVariables.push({
      id: `font-size-${name}`,
      name: `font-size/${name}`,
      resolvedType: 'FLOAT',
      description: size
    });
    typographyValues[`font-size-${name}`] = {
      default: numericValue
    };
  });

  // Font weights
  designSystem.typography?.fontWeights?.forEach(weight => {
    const weightNames = {
      '100': 'thin', '200': 'extralight', '300': 'light',
      '400': 'normal', '500': 'medium', '600': 'semibold',
      '700': 'bold', '800': 'extrabold', '900': 'black'
    };
    const name = weightNames[weight] || weight;

    typographyVariables.push({
      id: `font-weight-${name}`,
      name: `font-weight/${name}`,
      resolvedType: 'FLOAT',
      description: ''
    });
    typographyValues[`font-weight-${name}`] = {
      default: parseInt(weight)
    };
  });

  if (typographyVariables.length > 0) {
    collections.push({
      id: 'typography',
      name: 'Typography',
      modes: [{ name: 'Default', modeId: 'default' }],
      variables: typographyVariables,
      values: typographyValues
    });
  }

  // Spacing collection
  const spacingVariables = [];
  const spacingValues = {};

  designSystem.spacing?.scale?.forEach((space, i) => {
    const numericValue = parseFloat(space);
    const name = `${i + 1}`;

    spacingVariables.push({
      id: `spacing-${name}`,
      name: `spacing/${name}`,
      resolvedType: 'FLOAT',
      description: space
    });
    spacingValues[`spacing-${name}`] = {
      default: numericValue
    };
  });

  if (spacingVariables.length > 0) {
    collections.push({
      id: 'spacing',
      name: 'Spacing',
      modes: [{ name: 'Default', modeId: 'default' }],
      variables: spacingVariables,
      values: spacingValues
    });
  }

  // Border radius collection
  const radiusVariables = [];
  const radiusValues = {};

  designSystem.borderRadius?.forEach((radius, i) => {
    const val = radius.value || radius;
    const numericValue = parseFloat(val);
    const names = ['none', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl', 'full'];
    const name = radius.role || names[i] || `${i + 1}`;

    radiusVariables.push({
      id: `radius-${sanitizeName(name)}`,
      name: `radius/${name}`,
      resolvedType: 'FLOAT',
      description: val
    });
    radiusValues[`radius-${sanitizeName(name)}`] = {
      default: numericValue
    };
  });

  if (radiusVariables.length > 0) {
    collections.push({
      id: 'radius',
      name: 'Border Radius',
      modes: [{ name: 'Default', modeId: 'default' }],
      variables: radiusVariables,
      values: radiusValues
    });
  }

  // Effects collection (shadows)
  const effectVariables = [];
  const effectValues = {};

  designSystem.shadows?.forEach((shadow, i) => {
    const val = shadow.value || shadow;
    const names = ['sm', 'base', 'md', 'lg', 'xl', '2xl'];
    const name = names[i] || `${i + 1}`;

    effectVariables.push({
      id: `shadow-${name}`,
      name: `shadow/${name}`,
      resolvedType: 'STRING', // Shadows stored as strings in Figma Variables
      description: ''
    });
    effectValues[`shadow-${name}`] = {
      default: val
    };
  });

  if (effectVariables.length > 0) {
    collections.push({
      id: 'effects',
      name: 'Effects',
      modes: [{ name: 'Default', modeId: 'default' }],
      variables: effectVariables,
      values: effectValues
    });
  }

  return {
    version: '1.0.0',
    meta: {
      source: designSystem.meta?.url || 'extracted',
      extractedAt: designSystem.meta?.extractedAt || new Date().toISOString(),
      generator: 'impression/generate-figma-tokens'
    },
    collections
  };
}

// =============================================================================
// TOKENS STUDIO FORMAT
// =============================================================================

function generateTokensStudio(designSystem) {
  const tokens = {
    global: {}
  };

  // Colors
  if (designSystem.colors?.palette?.length > 0 || designSystem.colors?.semantic) {
    tokens.global.colors = {};

    // From palette
    designSystem.colors?.palette?.forEach((color, i) => {
      const name = sanitizeName(color.role || `color-${i + 1}`);
      tokens.global.colors[name] = {
        value: color.value,
        type: 'color',
        description: color.count ? `Used ${color.count} times` : ''
      };
    });

    // Semantic colors nested
    if (designSystem.colors?.semantic) {
      const semantic = designSystem.colors.semantic;

      tokens.global.colors.semantic = {};

      ['backgrounds', 'text', 'borders', 'accents'].forEach(category => {
        if (semantic[category]?.length > 0) {
          tokens.global.colors.semantic[category] = {};
          semantic[category].forEach((color, i) => {
            const name = i === 0 ? 'primary' : i === 1 ? 'secondary' : `${i + 1}`;
            tokens.global.colors.semantic[category][name] = {
              value: color.value,
              type: 'color'
            };
          });
        }
      });
    }
  }

  // Typography
  tokens.global.typography = {
    fontFamilies: {},
    fontSize: {},
    fontWeight: {},
    lineHeight: {},
    letterSpacing: {}
  };

  designSystem.typography?.fontFamilies?.forEach(font => {
    const name = sanitizeName(font.role || font.family);
    tokens.global.typography.fontFamilies[name] = {
      value: font.family,
      type: 'fontFamilies'
    };
  });

  const sizeNames = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'];
  designSystem.typography?.scale?.forEach((size, i) => {
    const name = sizeNames[i] || `size-${i + 1}`;
    tokens.global.typography.fontSize[name] = {
      value: size,
      type: 'fontSizes'
    };
  });

  designSystem.typography?.fontWeights?.forEach(weight => {
    const weightNames = {
      '100': 'thin', '200': 'extralight', '300': 'light',
      '400': 'normal', '500': 'medium', '600': 'semibold',
      '700': 'bold', '800': 'extrabold', '900': 'black'
    };
    const name = weightNames[weight] || weight;
    tokens.global.typography.fontWeight[name] = {
      value: weight,
      type: 'fontWeights'
    };
  });

  designSystem.typography?.lineHeights?.forEach((lh, i) => {
    const val = lh.value || lh;
    const names = ['none', 'tight', 'snug', 'normal', 'relaxed', 'loose'];
    const name = names[i] || `${i + 1}`;
    tokens.global.typography.lineHeight[name] = {
      value: val,
      type: 'lineHeights'
    };
  });

  designSystem.typography?.letterSpacing?.forEach((ls, i) => {
    const val = ls.value || ls;
    const names = ['tighter', 'tight', 'normal', 'wide', 'wider', 'widest'];
    const name = names[i] || `${i + 1}`;
    tokens.global.typography.letterSpacing[name] = {
      value: val,
      type: 'letterSpacing'
    };
  });

  // Spacing
  tokens.global.spacing = {};
  designSystem.spacing?.scale?.forEach((space, i) => {
    tokens.global.spacing[`${i + 1}`] = {
      value: space,
      type: 'spacing'
    };
  });

  // Border radius
  tokens.global.borderRadius = {};
  const radiusNames = ['none', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl', 'full'];
  designSystem.borderRadius?.forEach((radius, i) => {
    const val = radius.value || radius;
    const name = radius.role || radiusNames[i] || `${i + 1}`;
    tokens.global.borderRadius[sanitizeName(name)] = {
      value: val,
      type: 'borderRadius'
    };
  });

  // Shadows
  tokens.global.boxShadow = {};
  const shadowNames = ['sm', 'base', 'md', 'lg', 'xl', '2xl'];
  designSystem.shadows?.forEach((shadow, i) => {
    const val = shadow.value || shadow;
    const name = shadowNames[i] || `${i + 1}`;
    tokens.global.boxShadow[name] = {
      value: val,
      type: 'boxShadow'
    };
  });

  // Animations
  if (designSystem.animations?.durations?.length > 0) {
    tokens.global.duration = {};
    const durationNames = ['instant', 'fast', 'normal', 'slow', 'slower'];
    designSystem.animations.durations.forEach((dur, i) => {
      const name = durationNames[i] || `${i + 1}`;
      tokens.global.duration[name] = {
        value: dur,
        type: 'duration'
      };
    });
  }

  if (designSystem.animations?.easings?.length > 0) {
    tokens.global.easing = {};
    const easingNames = ['linear', 'in', 'out', 'in-out'];
    designSystem.animations.easings.forEach((ease, i) => {
      const name = easingNames[i] || `${i + 1}`;
      tokens.global.easing[name] = {
        value: ease,
        type: 'other'
      };
    });
  }

  // Add dark theme if available
  if (designSystem.themes?.dark) {
    tokens.dark = {
      colors: {}
    };

    Object.entries(designSystem.themes.dark.colors || {}).forEach(([key, val]) => {
      tokens.dark.colors[sanitizeName(key)] = {
        value: val,
        type: 'color'
      };
    });
  }

  // Metadata
  tokens.$themes = [
    {
      id: 'global',
      name: 'Global',
      selectedTokenSets: {
        global: 'enabled'
      }
    }
  ];

  if (tokens.dark) {
    tokens.$themes.push({
      id: 'dark',
      name: 'Dark',
      selectedTokenSets: {
        global: 'source',
        dark: 'enabled'
      }
    });
  }

  tokens.$metadata = {
    tokenSetOrder: tokens.dark ? ['global', 'dark'] : ['global']
  };

  return tokens;
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  generateFigmaVariables,
  generateTokensStudio,
  parseColor,
  hexToRgba,
  sanitizeName
};

// =============================================================================
// CLI
// =============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const formatFlag = args.find(a => a.startsWith('--format='));
  const format = formatFlag ? formatFlag.split('=')[1] : 'figma';
  const filteredArgs = args.filter(a => !a.startsWith('--'));

  if (filteredArgs.length < 1) {
    console.log(`
Impression: Figma Tokens Generator
===================================

Usage:
  node generate-figma-tokens.js <design-system.json> [output.json] [options]

Options:
  --format=figma    Figma Variables API format (default)
  --format=tokens   Tokens Studio for Figma format

Examples:
  # Generate Figma Variables format
  node generate-figma-tokens.js references/linear.json

  # Generate Tokens Studio format
  node generate-figma-tokens.js references/linear.json --format=tokens

  # Save to file
  node generate-figma-tokens.js references/linear.json figma-tokens.json
`);
    process.exit(1);
  }

  const inputPath = path.resolve(filteredArgs[0]);
  const outputPath = filteredArgs[1] ? path.resolve(filteredArgs[1]) : null;

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  try {
    const designSystem = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

    let output;
    if (format === 'tokens') {
      output = generateTokensStudio(designSystem);
      console.log('Generated Tokens Studio format');
    } else {
      output = generateFigmaVariables(designSystem);
      console.log('Generated Figma Variables format');
    }

    const jsonOutput = JSON.stringify(output, null, 2);

    if (outputPath) {
      fs.writeFileSync(outputPath, jsonOutput);
      console.log(`Saved to: ${outputPath}`);
    } else {
      console.log('\n' + jsonOutput);
    }

    // Summary
    if (format === 'figma') {
      const totalVars = output.collections.reduce((sum, c) => sum + c.variables.length, 0);
      console.log(`\nCollections: ${output.collections.length}`);
      console.log(`Total variables: ${totalVars}`);
    } else {
      const categories = Object.keys(output.global);
      console.log(`\nCategories: ${categories.join(', ')}`);
      console.log(`Themes: ${output.$themes.map(t => t.name).join(', ')}`);
    }

  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
