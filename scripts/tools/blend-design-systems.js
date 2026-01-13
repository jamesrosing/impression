#!/usr/bin/env node
/**
 * Blend Design Systems
 * Merge multiple design system extractions into a hybrid design system
 *
 * Usage:
 *   node blend-design-systems.js <system1.json> <system2.json> [output.json]
 *   node blend-design-systems.js linear.json vercel.json --weights=60,40
 *
 * Options:
 *   --weights=N,M,...   Relative weights for each input (default: equal)
 *   --strategy=merge    Merge all tokens (default)
 *   --strategy=prefer   Prefer first system, fill gaps from others
 *   --strategy=combine  Combine palettes without deduplication
 *
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// COLOR UTILITIES
// =============================================================================

function hexToRgb(hex) {
  if (!hex) return null;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}

function blendColors(color1, color2, weight1 = 0.5) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return color1 || color2;

  const weight2 = 1 - weight1;
  return rgbToHex(
    rgb1.r * weight1 + rgb2.r * weight2,
    rgb1.g * weight1 + rgb2.g * weight2,
    rgb1.b * weight1 + rgb2.b * weight2
  );
}

function colorDistance(color1, color2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return Infinity;

  return Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
    Math.pow(rgb1.g - rgb2.g, 2) +
    Math.pow(rgb1.b - rgb2.b, 2)
  );
}

// =============================================================================
// BLENDING STRATEGIES
// =============================================================================

function mergeArrays(arrays, weights, options = {}) {
  const { dedupe = true, maxItems = 30, sortBy = 'count' } = options;
  const combined = [];
  const seen = new Set();

  arrays.forEach((arr, i) => {
    if (!Array.isArray(arr)) return;
    const weight = weights[i] || 1;

    arr.forEach(item => {
      const value = typeof item === 'object' ? item.value : item;
      const key = value?.toLowerCase?.() || String(value);

      if (dedupe && seen.has(key)) {
        // Merge counts for duplicates
        const existing = combined.find(c => (c.value?.toLowerCase?.() || c) === key);
        if (existing && existing.count && item.count) {
          existing.count += Math.round(item.count * weight);
        }
        return;
      }

      seen.add(key);
      if (typeof item === 'object') {
        combined.push({
          ...item,
          count: item.count ? Math.round(item.count * weight) : undefined,
          source: i
        });
      } else {
        combined.push(item);
      }
    });
  });

  // Sort by count if applicable
  if (sortBy === 'count' && combined[0]?.count !== undefined) {
    combined.sort((a, b) => (b.count || 0) - (a.count || 0));
  }

  return combined.slice(0, maxItems);
}

function mergeObjects(objects, weights, options = {}) {
  const { preferFirst = false } = options;
  const result = {};

  objects.forEach((obj, i) => {
    if (!obj || typeof obj !== 'object') return;

    Object.entries(obj).forEach(([key, value]) => {
      if (preferFirst && result[key] !== undefined) return;
      result[key] = value;
    });
  });

  return result;
}

function blendSpacingScales(scales, weights) {
  const allValues = new Set();

  scales.forEach((scale, i) => {
    if (!Array.isArray(scale)) return;
    scale.forEach(s => {
      const num = parseFloat(s);
      if (!isNaN(num)) allValues.add(num);
    });
  });

  return [...allValues].sort((a, b) => a - b).map(v => `${v}px`);
}

function blendTypographyScales(scales, weights) {
  const allSizes = new Set();

  scales.forEach(scale => {
    if (!Array.isArray(scale)) return;
    scale.forEach(size => {
      const num = parseFloat(size);
      if (!isNaN(num)) allSizes.add(num);
    });
  });

  return [...allSizes].sort((a, b) => a - b).map(s => `${s}px`);
}

function dedupeColors(palette, threshold = 15) {
  const result = [];

  palette.forEach(color => {
    const value = color.value || color;
    const isDuplicate = result.some(existing => {
      const existingValue = existing.value || existing;
      return colorDistance(value, existingValue) < threshold;
    });

    if (!isDuplicate) {
      result.push(color);
    }
  });

  return result;
}

// =============================================================================
// MAIN BLEND FUNCTION
// =============================================================================

function blendDesignSystems(systems, options = {}) {
  const {
    weights = systems.map(() => 1),
    strategy = 'merge',
    dedupeThreshold = 15
  } = options;

  // Normalize weights
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const normalizedWeights = weights.map(w => w / totalWeight);

  const result = {
    meta: {
      url: 'blended',
      title: 'Blended Design System',
      extractedAt: new Date().toISOString(),
      viewport: systems[0]?.meta?.viewport || { width: 1920, height: 1080 },
      designCharacter: '',
      sources: systems.map((s, i) => ({
        url: s.meta?.url || `source-${i + 1}`,
        weight: normalizedWeights[i]
      })),
      blendStrategy: strategy
    },
    colors: {
      cssVariables: {},
      palette: [],
      semantic: { backgrounds: [], text: [], borders: [], accents: [] }
    },
    typography: {
      fontFamilies: [],
      scale: [],
      fontWeights: [],
      lineHeights: [],
      letterSpacing: []
    },
    spacing: { scale: [], grid: null, gaps: [], paddings: [] },
    animations: { keyframes: {}, transitions: [], durations: [], easings: [] },
    components: { buttons: [], inputs: [], cards: [] },
    shadows: [],
    borderRadius: [],
    breakpoints: { detected: [], containerWidths: [] }
  };

  // Blend based on strategy
  if (strategy === 'prefer') {
    // Use first system as base, fill gaps from others
    const base = JSON.parse(JSON.stringify(systems[0]));
    result.colors = base.colors || result.colors;
    result.typography = base.typography || result.typography;
    result.spacing = base.spacing || result.spacing;
    result.animations = base.animations || result.animations;
    result.components = base.components || result.components;
    result.shadows = base.shadows || result.shadows;
    result.borderRadius = base.borderRadius || result.borderRadius;
    result.breakpoints = base.breakpoints || result.breakpoints;

    // Fill gaps from other systems
    for (let i = 1; i < systems.length; i++) {
      const sys = systems[i];

      // Fill missing colors
      if (!result.colors.palette?.length && sys.colors?.palette?.length) {
        result.colors.palette = sys.colors.palette;
      }

      // Fill missing fonts
      if (!result.typography.fontFamilies?.length && sys.typography?.fontFamilies?.length) {
        result.typography.fontFamilies = sys.typography.fontFamilies;
      }

      // Fill missing spacing
      if (!result.spacing.scale?.length && sys.spacing?.scale?.length) {
        result.spacing.scale = sys.spacing.scale;
      }
    }
  } else {
    // Merge strategy - combine all tokens

    // CSS Variables
    result.colors.cssVariables = mergeObjects(
      systems.map(s => s.colors?.cssVariables),
      normalizedWeights,
      { preferFirst: true }
    );

    // Color palette
    const allPalettes = systems.map(s => s.colors?.palette || []);
    result.colors.palette = mergeArrays(allPalettes, normalizedWeights, {
      dedupe: true,
      maxItems: 30
    });

    // Dedupe similar colors
    result.colors.palette = dedupeColors(result.colors.palette, dedupeThreshold);

    // Semantic colors
    ['backgrounds', 'text', 'borders', 'accents'].forEach(category => {
      const arrays = systems.map(s => s.colors?.semantic?.[category] || []);
      result.colors.semantic[category] = mergeArrays(arrays, normalizedWeights, {
        dedupe: true,
        maxItems: 10
      });
    });

    // Typography
    const fontArrays = systems.map(s => s.typography?.fontFamilies || []);
    result.typography.fontFamilies = mergeArrays(fontArrays, normalizedWeights, {
      dedupe: true,
      maxItems: 10
    });

    result.typography.scale = blendTypographyScales(
      systems.map(s => s.typography?.scale || []),
      normalizedWeights
    );

    const weightArrays = systems.map(s => s.typography?.fontWeights || []);
    result.typography.fontWeights = [...new Set(weightArrays.flat())].sort((a, b) => parseInt(a) - parseInt(b));

    const lineHeightArrays = systems.map(s => s.typography?.lineHeights || []);
    result.typography.lineHeights = mergeArrays(lineHeightArrays, normalizedWeights, { maxItems: 8 });

    // Spacing
    result.spacing.scale = blendSpacingScales(
      systems.map(s => s.spacing?.scale || []),
      normalizedWeights
    );

    // Grid: use most common or first available
    const grids = systems.map(s => s.spacing?.grid).filter(Boolean);
    result.spacing.grid = grids[0] || null;

    // Animations
    result.animations.keyframes = mergeObjects(
      systems.map(s => s.animations?.keyframes || {}),
      normalizedWeights
    );

    const durationArrays = systems.map(s => s.animations?.durations || []);
    result.animations.durations = [...new Set(durationArrays.flat())].slice(0, 6);

    const easingArrays = systems.map(s => s.animations?.easings || []);
    result.animations.easings = [...new Set(easingArrays.flat())].slice(0, 6);

    // Components
    ['buttons', 'inputs', 'cards'].forEach(component => {
      const arrays = systems.map(s => s.components?.[component] || []);
      result.components[component] = mergeArrays(arrays, normalizedWeights, {
        dedupe: false,
        maxItems: 10
      });
    });

    // Shadows
    const shadowArrays = systems.map(s => s.shadows || []);
    result.shadows = mergeArrays(shadowArrays, normalizedWeights, { maxItems: 8 });

    // Border radius
    const radiusArrays = systems.map(s => s.borderRadius || []);
    result.borderRadius = mergeArrays(radiusArrays, normalizedWeights, { maxItems: 10 });

    // Breakpoints
    const bpArrays = systems.map(s => s.breakpoints?.detected || []);
    result.breakpoints.detected = [...new Set(bpArrays.flat())].sort((a, b) => a - b);

    const containerArrays = systems.map(s => s.breakpoints?.containerWidths || []);
    result.breakpoints.containerWidths = [...new Set(containerArrays.flat())].sort((a, b) => a - b);
  }

  // Generate design character from blend
  const traits = [];
  const sourceNames = systems.map(s => {
    const url = s.meta?.url || '';
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^./]+)/);
    return match ? match[1] : 'unknown';
  });
  traits.push(`Blend of ${sourceNames.join(' + ')}`);

  const fonts = result.typography.fontFamilies.slice(0, 2).map(f => f.family || f);
  if (fonts.length > 0) traits.push(fonts.join(' & '));

  const accent = result.colors.semantic.accents?.[0]?.value;
  if (accent) traits.push(`${accent} accent`);

  result.meta.designCharacter = traits.join('. ');

  return result;
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  blendDesignSystems,
  blendColors,
  colorDistance,
  dedupeColors,
  mergeArrays,
  mergeObjects,
  blendSpacingScales,
  blendTypographyScales
};

// =============================================================================
// CLI
// =============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);

  // Parse flags
  const weightsFlag = args.find(a => a.startsWith('--weights='));
  const strategyFlag = args.find(a => a.startsWith('--strategy='));

  const weights = weightsFlag
    ? weightsFlag.split('=')[1].split(',').map(Number)
    : null;
  const strategy = strategyFlag ? strategyFlag.split('=')[1] : 'merge';

  const inputPaths = args.filter(a => !a.startsWith('--') && a.endsWith('.json'));
  const outputPath = args.find(a => !a.startsWith('--') && !inputPaths.includes(a)) || null;

  if (inputPaths.length < 2) {
    console.log(`
Impression: Blend Design Systems
=================================

Usage:
  node blend-design-systems.js <system1.json> <system2.json> [...] [output.json]

Options:
  --weights=N,M,...   Relative weights for each input (default: equal)
  --strategy=merge    Merge all tokens (default)
  --strategy=prefer   Prefer first system, fill gaps from others

Examples:
  # Equal blend of two systems
  node blend-design-systems.js linear.json vercel.json blended.json

  # Weighted blend (60% Linear, 40% Vercel)
  node blend-design-systems.js linear.json vercel.json --weights=60,40

  # Prefer first system, fill gaps
  node blend-design-systems.js linear.json vercel.json --strategy=prefer

  # Blend three systems
  node blend-design-systems.js linear.json vercel.json duchateau.json
`);
    process.exit(1);
  }

  // Load systems
  const systems = [];
  for (const inputPath of inputPaths) {
    const fullPath = path.resolve(inputPath);
    if (!fs.existsSync(fullPath)) {
      console.error(`Error: File not found: ${inputPath}`);
      process.exit(1);
    }
    try {
      systems.push(JSON.parse(fs.readFileSync(fullPath, 'utf-8')));
    } catch (err) {
      console.error(`Error parsing ${inputPath}: ${err.message}`);
      process.exit(1);
    }
  }

  try {
    console.log(`Blending ${systems.length} design systems...`);
    console.log(`Strategy: ${strategy}`);
    if (weights) console.log(`Weights: ${weights.join(', ')}`);

    const result = blendDesignSystems(systems, {
      weights: weights || systems.map(() => 1),
      strategy
    });

    const jsonOutput = JSON.stringify(result, null, 2);

    if (outputPath) {
      fs.writeFileSync(path.resolve(outputPath), jsonOutput);
      console.log(`\nSaved to: ${outputPath}`);
    } else {
      console.log('\n' + jsonOutput);
    }

    // Summary
    console.log('\n--- Blend Summary ---');
    console.log(`Sources: ${result.meta.sources.map(s => `${s.url} (${Math.round(s.weight * 100)}%)`).join(', ')}`);
    console.log(`Colors: ${result.colors.palette.length}`);
    console.log(`Fonts: ${result.typography.fontFamilies.length}`);
    console.log(`Spacing: ${result.spacing.scale.length} values`);
    console.log(`Character: ${result.meta.designCharacter}`);

  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
