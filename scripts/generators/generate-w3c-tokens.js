#!/usr/bin/env node
/**
 * Generate W3C Design Tokens Format from Design System JSON
 * Outputs JSON compatible with the W3C Design Tokens Community Group specification
 * https://design-tokens.github.io/community-group/format/
 *
 * Usage:
 *   node generate-w3c-tokens.js <design-system.json> [output.tokens.json]
 *   node generate-w3c-tokens.js references/linear.json tokens.json
 *
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// W3C TOKEN TYPE CONSTANTS
// =============================================================================

const TOKEN_TYPES = {
  COLOR: 'color',
  DIMENSION: 'dimension',
  FONT_FAMILY: 'fontFamily',
  FONT_WEIGHT: 'fontWeight',
  DURATION: 'duration',
  CUBIC_BEZIER: 'cubicBezier',
  NUMBER: 'number',
  STRING: 'string',
  SHADOW: 'shadow',
  BORDER: 'border',
  TRANSITION: 'transition',
  GRADIENT: 'gradient',
  TYPOGRAPHY: 'typography'
};

// =============================================================================
// VALUE TRANSFORMERS
// =============================================================================

function sanitizeName(name) {
  return name
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function parsePixelValue(value) {
  if (!value) return null;
  const match = value.match(/^([\d.]+)(px|rem|em|%)$/);
  if (match) {
    return { value: parseFloat(match[1]), unit: match[2] };
  }
  return null;
}

function parseDuration(value) {
  if (!value) return null;
  const match = value.match(/^([\d.]+)(s|ms)$/);
  if (match) {
    const num = parseFloat(match[1]);
    // W3C format uses milliseconds
    return match[2] === 's' ? num * 1000 : num;
  }
  return null;
}

function parseCubicBezier(value) {
  if (!value) return null;
  const match = value.match(/cubic-bezier\(([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)/);
  if (match) {
    return [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]), parseFloat(match[4])];
  }
  // Named easings
  const namedEasings = {
    'ease': [0.25, 0.1, 0.25, 1],
    'ease-in': [0.42, 0, 1, 1],
    'ease-out': [0, 0, 0.58, 1],
    'ease-in-out': [0.42, 0, 0.58, 1],
    'linear': [0, 0, 1, 1]
  };
  return namedEasings[value] || null;
}

function parseShadow(value) {
  if (!value || value === 'none') return null;

  // Parse box-shadow: offsetX offsetY blur spread color
  const shadows = [];
  const shadowRegex = /(inset\s+)?([\d.-]+px)\s+([\d.-]+px)\s+([\d.-]+px)(?:\s+([\d.-]+px))?\s+(rgba?\([^)]+\)|#[a-fA-F0-9]{3,8})/g;

  let match;
  while ((match = shadowRegex.exec(value)) !== null) {
    shadows.push({
      color: match[6],
      offsetX: parsePixelValue(match[2]) || { value: 0, unit: 'px' },
      offsetY: parsePixelValue(match[3]) || { value: 0, unit: 'px' },
      blur: parsePixelValue(match[4]) || { value: 0, unit: 'px' },
      spread: match[5] ? parsePixelValue(match[5]) : { value: 0, unit: 'px' },
      inset: !!match[1]
    });
  }

  return shadows.length > 0 ? shadows : null;
}

// =============================================================================
// W3C TOKEN GENERATORS
// =============================================================================

function generateW3CTokens(designSystem) {
  const tokens = {
    $description: `Design tokens extracted from ${designSystem.meta?.url || 'unknown source'}`,
    $extensions: {
      'com.impression': {
        extractedAt: designSystem.meta?.extractedAt,
        designCharacter: designSystem.meta?.designCharacter,
        source: designSystem.meta?.url
      }
    }
  };

  // Colors
  if (designSystem.colors?.palette?.length > 0 || designSystem.colors?.cssVariables) {
    tokens.color = {};

    // From palette
    designSystem.colors?.palette?.forEach((color, i) => {
      const name = sanitizeName(color.role || `color-${i + 1}`);
      tokens.color[name] = {
        $type: TOKEN_TYPES.COLOR,
        $value: color.value,
        $description: color.count ? `Used ${color.count} times` : undefined
      };
    });

    // Semantic groups
    if (designSystem.colors?.semantic) {
      tokens.color.semantic = {};

      ['backgrounds', 'text', 'borders', 'accents'].forEach(category => {
        const colors = designSystem.colors.semantic[category];
        if (colors?.length > 0) {
          tokens.color.semantic[category] = {};
          colors.forEach((c, i) => {
            const name = i === 0 ? 'primary' : i === 1 ? 'secondary' : `level-${i + 1}`;
            tokens.color.semantic[category][name] = {
              $type: TOKEN_TYPES.COLOR,
              $value: c.value
            };
          });
        }
      });
    }
  }

  // Typography
  if (designSystem.typography) {
    tokens.typography = {};

    // Font families
    if (designSystem.typography.fontFamilies?.length > 0) {
      tokens.typography.fontFamily = {};
      designSystem.typography.fontFamilies.forEach(font => {
        const name = sanitizeName(font.role || font.family || 'default');
        const family = font.family || font;
        tokens.typography.fontFamily[name] = {
          $type: TOKEN_TYPES.FONT_FAMILY,
          $value: Array.isArray(family) ? family : [family, 'system-ui', 'sans-serif']
        };
      });
    }

    // Font sizes
    if (designSystem.typography.scale?.length > 0) {
      tokens.typography.fontSize = {};
      const sizeNames = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl'];
      designSystem.typography.scale.forEach((size, i) => {
        const name = sizeNames[i] || `size-${i + 1}`;
        const parsed = parsePixelValue(size);
        tokens.typography.fontSize[name] = {
          $type: TOKEN_TYPES.DIMENSION,
          $value: parsed ? `${parsed.value}${parsed.unit}` : size
        };
      });
    }

    // Font weights
    if (designSystem.typography.fontWeights?.length > 0) {
      tokens.typography.fontWeight = {};
      const weightNames = {
        '100': 'thin', '200': 'extralight', '300': 'light',
        '400': 'normal', '500': 'medium', '600': 'semibold',
        '700': 'bold', '800': 'extrabold', '900': 'black'
      };
      designSystem.typography.fontWeights.forEach(weight => {
        const name = weightNames[weight] || `weight-${weight}`;
        tokens.typography.fontWeight[name] = {
          $type: TOKEN_TYPES.FONT_WEIGHT,
          $value: parseInt(weight)
        };
      });
    }

    // Line heights
    if (designSystem.typography.lineHeights?.length > 0) {
      tokens.typography.lineHeight = {};
      const names = ['none', 'tight', 'snug', 'normal', 'relaxed', 'loose'];
      designSystem.typography.lineHeights.slice(0, 6).forEach((lh, i) => {
        const val = lh.value || lh;
        tokens.typography.lineHeight[names[i] || `lh-${i + 1}`] = {
          $type: TOKEN_TYPES.DIMENSION,
          $value: val
        };
      });
    }

    // Letter spacing
    if (designSystem.typography.letterSpacing?.length > 0) {
      tokens.typography.letterSpacing = {};
      const names = ['tighter', 'tight', 'normal', 'wide', 'wider', 'widest'];
      designSystem.typography.letterSpacing.slice(0, 6).forEach((ls, i) => {
        const val = ls.value || ls;
        tokens.typography.letterSpacing[names[i] || `ls-${i + 1}`] = {
          $type: TOKEN_TYPES.DIMENSION,
          $value: val
        };
      });
    }
  }

  // Spacing
  if (designSystem.spacing?.scale?.length > 0) {
    tokens.spacing = {};
    designSystem.spacing.scale.forEach((space, i) => {
      tokens.spacing[`${i + 1}`] = {
        $type: TOKEN_TYPES.DIMENSION,
        $value: space
      };
    });

    if (designSystem.spacing.grid) {
      tokens.spacing.grid = {
        $type: TOKEN_TYPES.DIMENSION,
        $value: designSystem.spacing.grid,
        $description: 'Base grid unit'
      };
    }
  }

  // Border radius
  if (designSystem.borderRadius?.length > 0) {
    tokens.borderRadius = {};
    const names = ['none', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl', 'full'];
    designSystem.borderRadius.forEach((radius, i) => {
      const val = radius.value || radius;
      const name = sanitizeName(radius.role || names[i] || `radius-${i + 1}`);
      tokens.borderRadius[name] = {
        $type: TOKEN_TYPES.DIMENSION,
        $value: val
      };
    });
  }

  // Shadows
  if (designSystem.shadows?.length > 0) {
    tokens.shadow = {};
    const names = ['sm', 'base', 'md', 'lg', 'xl', '2xl'];
    designSystem.shadows.forEach((shadow, i) => {
      const val = shadow.value || shadow;
      const name = sanitizeName(shadow.role || names[i] || `shadow-${i + 1}`);
      const parsed = parseShadow(val);

      if (parsed) {
        tokens.shadow[name] = {
          $type: TOKEN_TYPES.SHADOW,
          $value: parsed.map(s => ({
            color: s.color,
            offsetX: `${s.offsetX.value}${s.offsetX.unit}`,
            offsetY: `${s.offsetY.value}${s.offsetY.unit}`,
            blur: `${s.blur.value}${s.blur.unit}`,
            spread: `${s.spread.value}${s.spread.unit}`
          }))
        };
      } else {
        // Fallback to string if parsing fails
        tokens.shadow[name] = {
          $type: TOKEN_TYPES.STRING,
          $value: val
        };
      }
    });
  }

  // Animation
  if (designSystem.animations) {
    tokens.animation = {};

    // Durations
    if (designSystem.animations.durations?.length > 0) {
      tokens.animation.duration = {};
      const names = ['instant', 'fast', 'normal', 'slow', 'slower'];
      designSystem.animations.durations.forEach((dur, i) => {
        const ms = parseDuration(dur);
        tokens.animation.duration[names[i] || `duration-${i + 1}`] = {
          $type: TOKEN_TYPES.DURATION,
          $value: ms ? `${ms}ms` : dur
        };
      });
    }

    // Easings
    if (designSystem.animations.easings?.length > 0) {
      tokens.animation.easing = {};
      const names = ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'];
      designSystem.animations.easings.forEach((easing, i) => {
        const bezier = parseCubicBezier(easing);
        if (bezier) {
          tokens.animation.easing[names[i] || `easing-${i + 1}`] = {
            $type: TOKEN_TYPES.CUBIC_BEZIER,
            $value: bezier
          };
        }
      });
    }
  }

  // Breakpoints
  if (designSystem.breakpoints?.detected?.length > 0) {
    tokens.breakpoint = {};
    const names = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'];
    designSystem.breakpoints.detected.forEach((bp, i) => {
      tokens.breakpoint[names[i] || `bp-${i + 1}`] = {
        $type: TOKEN_TYPES.DIMENSION,
        $value: `${bp}px`
      };
    });
  }

  return tokens;
}

// =============================================================================
// STYLE DICTIONARY FORMAT (ALTERNATIVE)
// =============================================================================

function generateStyleDictionaryFormat(designSystem) {
  const tokens = {
    color: {},
    size: {},
    font: {},
    shadow: {},
    time: {},
    asset: {}
  };

  // Colors
  designSystem.colors?.palette?.forEach((color, i) => {
    const name = sanitizeName(color.role || `color-${i + 1}`);
    tokens.color[name] = { value: color.value };
  });

  // Font sizes
  designSystem.typography?.scale?.forEach((size, i) => {
    const sizeNames = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'];
    tokens.size.font = tokens.size.font || {};
    tokens.size.font[sizeNames[i] || `size-${i + 1}`] = { value: size };
  });

  // Spacing
  designSystem.spacing?.scale?.forEach((space, i) => {
    tokens.size.spacing = tokens.size.spacing || {};
    tokens.size.spacing[`${i + 1}`] = { value: space };
  });

  // Font families
  designSystem.typography?.fontFamilies?.forEach(font => {
    const name = sanitizeName(font.role || font.family || 'default');
    tokens.font[name] = { value: font.family || font };
  });

  // Shadows
  designSystem.shadows?.forEach((shadow, i) => {
    const names = ['sm', 'base', 'md', 'lg', 'xl'];
    tokens.shadow[names[i] || `shadow-${i + 1}`] = { value: shadow.value || shadow };
  });

  // Durations
  designSystem.animations?.durations?.forEach((dur, i) => {
    const names = ['fast', 'normal', 'slow'];
    tokens.time[names[i] || `duration-${i + 1}`] = { value: dur };
  });

  return tokens;
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  generateW3CTokens,
  generateStyleDictionaryFormat,
  parsePixelValue,
  parseDuration,
  parseCubicBezier,
  parseShadow,
  sanitizeName,
  TOKEN_TYPES
};

// =============================================================================
// CLI
// =============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const formatFlag = args.find(a => a.startsWith('--format='));
  const format = formatFlag ? formatFlag.split('=')[1] : 'w3c';
  const filteredArgs = args.filter(a => !a.startsWith('--'));

  if (filteredArgs.length < 1) {
    console.log(`
Impression: W3C Design Tokens Generator
========================================

Usage:
  node generate-w3c-tokens.js <design-system.json> [output.tokens.json] [options]

Options:
  --format=w3c    W3C Design Tokens Community Group format (default)
  --format=sd     Style Dictionary format

Examples:
  # Generate W3C format
  node generate-w3c-tokens.js references/linear.json

  # Generate Style Dictionary format
  node generate-w3c-tokens.js references/linear.json --format=sd

  # Save to file
  node generate-w3c-tokens.js references/linear.json tokens.json

Specification:
  https://design-tokens.github.io/community-group/format/
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
    if (format === 'sd') {
      output = generateStyleDictionaryFormat(designSystem);
      console.log('Generated Style Dictionary format');
    } else {
      output = generateW3CTokens(designSystem);
      console.log('Generated W3C Design Tokens format');
    }

    const jsonOutput = JSON.stringify(output, null, 2);

    if (outputPath) {
      fs.writeFileSync(outputPath, jsonOutput);
      console.log(`Saved to: ${outputPath}`);
    } else {
      console.log('\n' + jsonOutput);
    }

    // Summary
    const categories = Object.keys(output).filter(k => !k.startsWith('$'));
    console.log(`\nToken categories: ${categories.join(', ')}`);

    let totalTokens = 0;
    const countTokens = (obj) => {
      for (const key in obj) {
        if (obj[key].$type || obj[key].value) totalTokens++;
        else if (typeof obj[key] === 'object') countTokens(obj[key]);
      }
    };
    countTokens(output);
    console.log(`Total tokens: ${totalTokens}`);

  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
