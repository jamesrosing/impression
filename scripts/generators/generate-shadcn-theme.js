#!/usr/bin/env node
/**
 * Generate shadcn/ui Theme from Design System JSON
 * Outputs CSS variables compatible with shadcn/ui components
 *
 * Usage:
 *   node generate-shadcn-theme.js <design-system.json> [output.css]
 *   node generate-shadcn-theme.js references/linear.json globals.css
 *
 * Options:
 *   --format=css     CSS custom properties (default)
 *   --format=json    JSON format for tailwind.config.js
 *   --with-dark      Include dark mode variables (if detected)
 *
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// COLOR UTILITIES
// =============================================================================

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

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
    l: Math.round(l * 100)
  };
}

function hexToHsl(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

function rgbStringToHsl(rgb) {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;
  return rgbToHsl(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
}

function parseToHsl(value) {
  if (!value) return null;
  if (value.startsWith('#')) return hexToHsl(value);
  if (value.startsWith('rgb')) return rgbStringToHsl(value);
  // Already HSL?
  const hslMatch = value.match(/hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/);
  if (hslMatch) {
    return { h: parseInt(hslMatch[1]), s: parseInt(hslMatch[2]), l: parseInt(hslMatch[3]) };
  }
  return null;
}

function hslToString(hsl) {
  if (!hsl) return '0 0% 0%';
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

function getLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function isLightColor(hex) {
  return getLuminance(hex) > 0.5;
}

// =============================================================================
// SHADCN/UI THEME MAPPING
// =============================================================================

function mapToShadcnTheme(designSystem) {
  const theme = {
    light: {},
    dark: {}
  };

  const colors = designSystem.colors || {};
  const palette = colors.palette || [];
  const semantic = colors.semantic || {};
  const cssVars = colors.cssVariables || {};

  // Find colors by role or luminance
  const findColor = (roles, fallbackIndex = 0) => {
    for (const role of roles) {
      const found = palette.find(c => c.role?.toLowerCase().includes(role.toLowerCase()));
      if (found) return found.value;
    }
    // Try CSS variables
    for (const role of roles) {
      const varName = Object.keys(cssVars).find(k => k.toLowerCase().includes(role.toLowerCase()));
      if (varName) return cssVars[varName];
    }
    return palette[fallbackIndex]?.value || '#000000';
  };

  const findBackground = () => {
    const bg = semantic.backgrounds?.[0]?.value;
    if (bg) return bg;
    return findColor(['background', 'bg', 'surface'], 0);
  };

  const findForeground = () => {
    const text = semantic.text?.[0]?.value;
    if (text) return text;
    return findColor(['foreground', 'text', 'primary'], 0);
  };

  const findAccent = () => {
    const accent = semantic.accents?.[0]?.value;
    if (accent) return accent;
    return findColor(['accent', 'primary', 'brand', 'indigo', 'blue'], 0);
  };

  const findMuted = () => {
    return findColor(['muted', 'secondary', 'subtle', 'gray'], 2);
  };

  const findBorder = () => {
    const border = semantic.borders?.[0]?.value;
    if (border) return border;
    return findColor(['border', 'divider', 'separator'], 3);
  };

  const findDestructive = () => {
    return findColor(['error', 'destructive', 'danger', 'red'], 0) || '#ef4444';
  };

  // Detect if dark mode
  const bgColor = findBackground();
  const isDarkMode = !isLightColor(bgColor);

  // Build light theme
  const bg = isDarkMode ? '#ffffff' : bgColor;
  const fg = isDarkMode ? '#0a0a0a' : findForeground();

  theme.light = {
    background: parseToHsl(bg),
    foreground: parseToHsl(fg),
    card: parseToHsl(bg),
    'card-foreground': parseToHsl(fg),
    popover: parseToHsl(bg),
    'popover-foreground': parseToHsl(fg),
    primary: parseToHsl(findAccent()),
    'primary-foreground': parseToHsl(isLightColor(findAccent()) ? '#0a0a0a' : '#fafafa'),
    secondary: parseToHsl(findMuted()) || { h: 0, s: 0, l: 96 },
    'secondary-foreground': parseToHsl(fg),
    muted: parseToHsl(findMuted()) || { h: 0, s: 0, l: 96 },
    'muted-foreground': { h: 0, s: 0, l: 45 },
    accent: parseToHsl(findMuted()) || { h: 0, s: 0, l: 96 },
    'accent-foreground': parseToHsl(fg),
    destructive: parseToHsl(findDestructive()),
    'destructive-foreground': { h: 0, s: 0, l: 98 },
    border: parseToHsl(findBorder()) || { h: 0, s: 0, l: 90 },
    input: parseToHsl(findBorder()) || { h: 0, s: 0, l: 90 },
    ring: parseToHsl(findAccent())
  };

  // Build dark theme
  const darkBg = isDarkMode ? bgColor : '#0a0a0a';
  const darkFg = isDarkMode ? findForeground() : '#fafafa';

  theme.dark = {
    background: parseToHsl(darkBg),
    foreground: parseToHsl(darkFg),
    card: parseToHsl(darkBg),
    'card-foreground': parseToHsl(darkFg),
    popover: parseToHsl(darkBg),
    'popover-foreground': parseToHsl(darkFg),
    primary: parseToHsl(findAccent()),
    'primary-foreground': parseToHsl(isLightColor(findAccent()) ? '#0a0a0a' : '#fafafa'),
    secondary: { h: 0, s: 0, l: 15 },
    'secondary-foreground': parseToHsl(darkFg),
    muted: { h: 0, s: 0, l: 15 },
    'muted-foreground': { h: 0, s: 0, l: 64 },
    accent: { h: 0, s: 0, l: 15 },
    'accent-foreground': parseToHsl(darkFg),
    destructive: parseToHsl(findDestructive()),
    'destructive-foreground': { h: 0, s: 0, l: 98 },
    border: { h: 0, s: 0, l: 15 },
    input: { h: 0, s: 0, l: 15 },
    ring: parseToHsl(findAccent())
  };

  // Add radius from design system
  const radii = designSystem.borderRadius || [];
  const defaultRadius = radii.find(r => r.role === 'default' || r.role === 'base');
  theme.radius = defaultRadius?.value || radii[1]?.value || '0.5rem';

  // Add chart colors if we have enough accents
  if (palette.length >= 5) {
    theme.light.chart = {};
    theme.dark.chart = {};
    for (let i = 0; i < Math.min(5, palette.length); i++) {
      theme.light.chart[i + 1] = parseToHsl(palette[i].value);
      theme.dark.chart[i + 1] = parseToHsl(palette[i].value);
    }
  }

  return theme;
}

// =============================================================================
// OUTPUT GENERATORS
// =============================================================================

function generateCSS(theme, options = {}) {
  const { includeDark = true, includeCharts = true } = options;
  const lines = [];

  lines.push('@tailwind base;');
  lines.push('@tailwind components;');
  lines.push('@tailwind utilities;');
  lines.push('');
  lines.push('@layer base {');
  lines.push('  :root {');

  // Light theme variables
  Object.entries(theme.light).forEach(([key, value]) => {
    if (key === 'chart' && includeCharts) {
      Object.entries(value).forEach(([n, hsl]) => {
        lines.push(`    --chart-${n}: ${hslToString(hsl)};`);
      });
    } else if (key !== 'chart') {
      lines.push(`    --${key}: ${hslToString(value)};`);
    }
  });

  // Radius
  if (theme.radius) {
    lines.push(`    --radius: ${theme.radius};`);
  }

  lines.push('  }');
  lines.push('');

  // Dark theme
  if (includeDark) {
    lines.push('  .dark {');
    Object.entries(theme.dark).forEach(([key, value]) => {
      if (key === 'chart' && includeCharts) {
        Object.entries(value).forEach(([n, hsl]) => {
          lines.push(`    --chart-${n}: ${hslToString(hsl)};`);
        });
      } else if (key !== 'chart') {
        lines.push(`    --${key}: ${hslToString(value)};`);
      }
    });
    lines.push('  }');
  }

  lines.push('}');
  lines.push('');

  // Base styles
  lines.push('@layer base {');
  lines.push('  * {');
  lines.push('    @apply border-border;');
  lines.push('  }');
  lines.push('  body {');
  lines.push('    @apply bg-background text-foreground;');
  lines.push('  }');
  lines.push('}');

  return lines.join('\n');
}

function generateJSON(theme) {
  const cssVars = {
    light: {},
    dark: {}
  };

  Object.entries(theme.light).forEach(([key, value]) => {
    if (key === 'chart') {
      Object.entries(value).forEach(([n, hsl]) => {
        cssVars.light[`--chart-${n}`] = hslToString(hsl);
      });
    } else if (key !== 'chart') {
      cssVars.light[`--${key}`] = hslToString(value);
    }
  });

  Object.entries(theme.dark).forEach(([key, value]) => {
    if (key === 'chart') {
      Object.entries(value).forEach(([n, hsl]) => {
        cssVars.dark[`--chart-${n}`] = hslToString(hsl);
      });
    } else if (key !== 'chart') {
      cssVars.dark[`--${key}`] = hslToString(value);
    }
  });

  if (theme.radius) {
    cssVars.light['--radius'] = theme.radius;
    cssVars.dark['--radius'] = theme.radius;
  }

  return {
    cssVars,
    tailwindExtend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))'
        }
      }
    }
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  mapToShadcnTheme,
  generateCSS,
  generateJSON,
  hexToHsl,
  hslToString,
  isLightColor
};

// =============================================================================
// CLI
// =============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const formatFlag = args.find(a => a.startsWith('--format='));
  const format = formatFlag ? formatFlag.split('=')[1] : 'css';
  const withDark = args.includes('--with-dark');
  const filteredArgs = args.filter(a => !a.startsWith('--'));

  if (filteredArgs.length < 1) {
    console.log(`
Impression: shadcn/ui Theme Generator
======================================

Usage:
  node generate-shadcn-theme.js <design-system.json> [output.css] [options]

Options:
  --format=css     CSS custom properties (default)
  --format=json    JSON format for tailwind.config.js
  --with-dark      Include dark mode (auto-detected by default)

Examples:
  # Generate CSS for shadcn/ui
  node generate-shadcn-theme.js references/linear.json

  # Generate JSON for Tailwind config
  node generate-shadcn-theme.js references/linear.json --format=json

  # Save to file
  node generate-shadcn-theme.js references/linear.json src/app/globals.css
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
    const theme = mapToShadcnTheme(designSystem);

    let output;
    if (format === 'json') {
      output = JSON.stringify(generateJSON(theme), null, 2);
      console.log('Generated shadcn/ui theme (JSON format)');
    } else {
      output = generateCSS(theme, { includeDark: true });
      console.log('Generated shadcn/ui theme (CSS format)');
    }

    if (outputPath) {
      fs.writeFileSync(outputPath, output);
      console.log(`Saved to: ${outputPath}`);
    } else {
      console.log('\n' + output);
    }

    // Summary
    console.log('\nTheme variables generated:');
    console.log(`  Light mode: ${Object.keys(theme.light).length} variables`);
    console.log(`  Dark mode: ${Object.keys(theme.dark).length} variables`);
    console.log(`  Border radius: ${theme.radius}`);

  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
