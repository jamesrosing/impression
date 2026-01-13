#!/usr/bin/env node
/**
 * Generate Storybook Stories from Design System
 *
 * Features:
 * - Generate stories for color palettes
 * - Generate typography specimens
 * - Generate spacing scale documentation
 * - Generate component stories (Button, Input, Card)
 * - Create color contrast matrix
 * - Storybook 7+ CSF3 format
 *
 * Usage:
 *   node generate-storybook.js <design-system.json> [output-dir]
 *   node generate-storybook.js references/linear.json ./stories
 */

const fs = require('fs');
const path = require('path');

// ============ STORY TEMPLATES ============

const COLORS_STORY = `import type { Meta, StoryObj } from '@storybook/react';

/**
 * Color palette extracted from {{SOURCE}}
 */
const meta: Meta = {
  title: 'Design System/Colors',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

const ColorSwatch = ({ name, value, textColor = '#000' }: { name: string; value: string; textColor?: string }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    width: '150px',
  }}>
    <div style={{
      backgroundColor: value,
      height: '80px',
      borderRadius: '8px 8px 0 0',
      display: 'flex',
      alignItems: 'flex-end',
      padding: '8px',
      color: textColor,
      fontSize: '12px',
      fontFamily: 'monospace',
    }}>
      {value}
    </div>
    <div style={{
      padding: '8px',
      backgroundColor: '#f8f9fa',
      borderRadius: '0 0 8px 8px',
      fontSize: '14px',
      fontWeight: 500,
    }}>
      {name}
    </div>
  </div>
);

const ColorGrid = ({ colors }: { colors: Array<{ name: string; value: string }> }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '16px',
  }}>
    {colors.map((color) => (
      <ColorSwatch key={color.name} {...color} />
    ))}
  </div>
);

{{SEMANTIC_COLORS_EXPORT}}

{{PALETTE_COLORS_EXPORT}}

{{CSS_VARIABLES_EXPORT}}
`;

const TYPOGRAPHY_STORY = `import type { Meta, StoryObj } from '@storybook/react';

/**
 * Typography specimens extracted from {{SOURCE}}
 */
const meta: Meta = {
  title: 'Design System/Typography',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

const FontSpecimen = ({ family, weights }: { family: string; weights: number[] }) => (
  <div style={{
    padding: '24px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    marginBottom: '16px',
  }}>
    <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>
      {family}
    </div>
    <div style={{
      fontFamily: \`"\${family}", system-ui\`,
      fontSize: '32px',
      marginBottom: '16px',
    }}>
      The quick brown fox jumps over the lazy dog
    </div>
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
      {weights.map((weight) => (
        <span
          key={weight}
          style={{
            fontFamily: \`"\${family}", system-ui\`,
            fontWeight: weight,
            fontSize: '16px',
          }}
        >
          {weight}
        </span>
      ))}
    </div>
  </div>
);

const SizeScale = ({ sizes }: { sizes: string[] }) => (
  <div>
    {sizes.map((size) => (
      <div
        key={size}
        style={{
          fontSize: size,
          padding: '8px 0',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <span style={{ color: '#6b7280', fontSize: '12px', marginRight: '16px', fontFamily: 'monospace' }}>
          {size}
        </span>
        Sample Text
      </div>
    ))}
  </div>
);

{{FONT_FAMILIES_EXPORT}}

{{FONT_SIZES_EXPORT}}
`;

const SPACING_STORY = `import type { Meta, StoryObj } from '@storybook/react';

/**
 * Spacing scale extracted from {{SOURCE}}
 */
const meta: Meta = {
  title: 'Design System/Spacing',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

const SpacingBar = ({ value }: { value: string | number }) => {
  const numValue = typeof value === 'number' ? value : parseFloat(value);
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
      <span style={{
        width: '60px',
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#6b7280',
      }}>
        {value}{typeof value === 'number' ? 'px' : ''}
      </span>
      <div style={{
        width: Math.min(numValue * 4, 400),
        height: '24px',
        backgroundColor: '#3b82f6',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '8px',
        color: 'white',
        fontSize: '12px',
      }}>
        {numValue}px
      </div>
    </div>
  );
};

{{SPACING_SCALE_EXPORT}}
`;

const COMPONENTS_STORY = `import type { Meta, StoryObj } from '@storybook/react';

/**
 * Component patterns extracted from {{SOURCE}}
 */
const meta: Meta = {
  title: 'Design System/Components',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

// Button component with design system styles
const Button = ({
  variant = 'primary',
  size = 'md',
  children,
}: {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}) => {
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 500,
    borderRadius: '{{BORDER_RADIUS}}',
    transition: 'all 150ms ease',
    cursor: 'pointer',
    border: 'none',
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: '{{PRIMARY_COLOR}}',
      color: 'white',
    },
    secondary: {
      backgroundColor: '{{SECONDARY_COLOR}}',
      color: '#111827',
    },
    outline: {
      backgroundColor: 'transparent',
      border: '1px solid #d1d5db',
      color: '#111827',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: '#111827',
    },
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { height: '32px', padding: '0 12px', fontSize: '14px' },
    md: { height: '40px', padding: '0 16px', fontSize: '14px' },
    lg: { height: '48px', padding: '0 24px', fontSize: '16px' },
  };

  return (
    <button style={{ ...baseStyles, ...variantStyles[variant], ...sizeStyles[size] }}>
      {children}
    </button>
  );
};

export const Buttons: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h3 style={{ marginBottom: '12px', color: '#6b7280' }}>Variants</h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: '12px', color: '#6b7280' }}>Sizes</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </div>
    </div>
  ),
};

// Input component
const Input = ({
  label,
  placeholder,
  error,
}: {
  label?: string;
  placeholder?: string;
  error?: string;
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
    {label && (
      <label style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
        {label}
      </label>
    )}
    <input
      placeholder={placeholder}
      style={{
        padding: '8px 12px',
        border: \`1px solid \${error ? '#ef4444' : '#d1d5db'}\`,
        borderRadius: '{{BORDER_RADIUS}}',
        fontSize: '14px',
        outline: 'none',
      }}
    />
    {error && (
      <span style={{ fontSize: '12px', color: '#ef4444' }}>{error}</span>
    )}
  </div>
);

export const Inputs: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '300px' }}>
      <Input label="Default" placeholder="Enter text..." />
      <Input label="With Error" placeholder="Invalid input" error="This field is required" />
    </div>
  ),
};

// Card component
const Card = ({
  variant = 'default',
  children,
}: {
  variant?: 'default' | 'elevated' | 'outlined';
  children: React.ReactNode;
}) => {
  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
    },
    elevated: {
      backgroundColor: '#ffffff',
      boxShadow: '{{BOX_SHADOW}}',
    },
    outlined: {
      backgroundColor: 'transparent',
      border: '2px solid #e5e7eb',
    },
  };

  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '{{CARD_RADIUS}}',
        ...variantStyles[variant],
      }}
    >
      {children}
    </div>
  );
};

export const Cards: StoryObj = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
      <Card variant="default">
        <h4 style={{ margin: '0 0 8px' }}>Default</h4>
        <p style={{ margin: 0, color: '#6b7280' }}>Card with border</p>
      </Card>
      <Card variant="elevated">
        <h4 style={{ margin: '0 0 8px' }}>Elevated</h4>
        <p style={{ margin: 0, color: '#6b7280' }}>Card with shadow</p>
      </Card>
      <Card variant="outlined">
        <h4 style={{ margin: '0 0 8px' }}>Outlined</h4>
        <p style={{ margin: 0, color: '#6b7280' }}>Card with thick border</p>
      </Card>
    </div>
  ),
};
`;

// ============ GENERATORS ============

function generateColorsStory(designSystem) {
  const colors = designSystem.colors || {};
  let source = designSystem.meta?.url || 'design system';

  let semanticExport = '';
  let paletteExport = '';
  let cssVarsExport = '';

  // Semantic colors
  if (colors.semantic) {
    const semanticColors = [];

    if (colors.semantic.primary) semanticColors.push({ name: 'Primary', value: colors.semantic.primary });
    if (colors.semantic.secondary) semanticColors.push({ name: 'Secondary', value: colors.semantic.secondary });
    if (colors.semantic.accent) semanticColors.push({ name: 'Accent', value: colors.semantic.accent });
    if (colors.semantic.success) semanticColors.push({ name: 'Success', value: colors.semantic.success });
    if (colors.semantic.warning) semanticColors.push({ name: 'Warning', value: colors.semantic.warning });
    if (colors.semantic.error) semanticColors.push({ name: 'Error', value: colors.semantic.error });

    // Handle backgrounds/foregrounds
    if (colors.semantic.backgrounds) {
      colors.semantic.backgrounds.forEach((c, i) => {
        semanticColors.push({ name: `Background ${i + 1}`, value: c.value });
      });
    }
    if (colors.semantic.text) {
      colors.semantic.text.forEach((c, i) => {
        semanticColors.push({ name: `Text ${i + 1}`, value: c.value });
      });
    }

    if (semanticColors.length > 0) {
      semanticExport = `export const SemanticColors: StoryObj = {
  render: () => (
    <>
      <h2 style={{ marginBottom: '16px' }}>Semantic Colors</h2>
      <ColorGrid colors={${JSON.stringify(semanticColors)}} />
    </>
  ),
};`;
    }
  }

  // Palette
  if (colors.palette && colors.palette.length > 0) {
    const paletteColors = colors.palette.slice(0, 20).map((c, i) => ({
      name: `Color ${i + 1}`,
      value: c.value || c,
    }));

    paletteExport = `export const Palette: StoryObj = {
  render: () => (
    <>
      <h2 style={{ marginBottom: '16px' }}>Color Palette</h2>
      <ColorGrid colors={${JSON.stringify(paletteColors)}} />
    </>
  ),
};`;
  }

  // CSS Variables
  if (colors.cssVariables && Object.keys(colors.cssVariables).length > 0) {
    const cssVars = Object.entries(colors.cssVariables).slice(0, 15).map(([name, value]) => ({
      name: `--${name}`,
      value,
    }));

    cssVarsExport = `export const CSSVariables: StoryObj = {
  render: () => (
    <>
      <h2 style={{ marginBottom: '16px' }}>CSS Variables</h2>
      <ColorGrid colors={${JSON.stringify(cssVars)}} />
    </>
  ),
};`;
  }

  return COLORS_STORY
    .replace('{{SOURCE}}', source)
    .replace('{{SEMANTIC_COLORS_EXPORT}}', semanticExport)
    .replace('{{PALETTE_COLORS_EXPORT}}', paletteExport)
    .replace('{{CSS_VARIABLES_EXPORT}}', cssVarsExport);
}

function generateTypographyStory(designSystem) {
  const typography = designSystem.typography || {};
  let source = designSystem.meta?.url || 'design system';

  let fontFamiliesExport = '';
  let fontSizesExport = '';

  // Font families
  if (typography.fontFamilies && typography.fontFamilies.length > 0) {
    const families = typography.fontFamilies.map(f => ({
      family: typeof f === 'string' ? f : f.family,
      weights: f.weights || typography.fontWeights || [400, 500, 600, 700],
    }));

    fontFamiliesExport = `export const FontFamilies: StoryObj = {
  render: () => (
    <>
      <h2 style={{ marginBottom: '16px' }}>Font Families</h2>
      ${families.map(f => `<FontSpecimen family="${f.family}" weights={${JSON.stringify(f.weights)}} />`).join('\n      ')}
    </>
  ),
};`;
  }

  // Font sizes
  if (typography.fontSizes && typography.fontSizes.length > 0) {
    const sizes = [...new Set(typography.fontSizes)]
      .sort((a, b) => parseFloat(a) - parseFloat(b))
      .slice(0, 10);

    fontSizesExport = `export const FontSizes: StoryObj = {
  render: () => (
    <>
      <h2 style={{ marginBottom: '16px' }}>Font Size Scale</h2>
      <SizeScale sizes={${JSON.stringify(sizes)}} />
    </>
  ),
};`;
  }

  return TYPOGRAPHY_STORY
    .replace('{{SOURCE}}', source)
    .replace('{{FONT_FAMILIES_EXPORT}}', fontFamiliesExport)
    .replace('{{FONT_SIZES_EXPORT}}', fontSizesExport);
}

function generateSpacingStory(designSystem) {
  const spacing = designSystem.spacing || {};
  let source = designSystem.meta?.url || 'design system';

  let spacingExport = '';

  if (spacing.scale && spacing.scale.length > 0) {
    const scale = [...new Set(spacing.scale)]
      .sort((a, b) => parseFloat(a) - parseFloat(b))
      .slice(0, 12);

    spacingExport = `export const SpacingScale: StoryObj = {
  render: () => (
    <>
      <h2 style={{ marginBottom: '16px' }}>Spacing Scale</h2>
      ${scale.map(s => `<SpacingBar value="${s}" />`).join('\n      ')}
    </>
  ),
};`;
  }

  return SPACING_STORY
    .replace('{{SOURCE}}', source)
    .replace('{{SPACING_SCALE_EXPORT}}', spacingExport);
}

function generateComponentsStory(designSystem) {
  const colors = designSystem.colors || {};
  const borderRadius = designSystem.borderRadius || [];
  const effects = designSystem.effects || {};
  let source = designSystem.meta?.url || 'design system';

  // Extract values
  const primaryColor = colors.semantic?.primary ||
                       colors.semantic?.accents?.[0]?.value ||
                       '#3b82f6';
  const secondaryColor = colors.semantic?.secondary ||
                         colors.semantic?.background?.secondary ||
                         '#f3f4f6';
  const radius = borderRadius[0]?.value || borderRadius[0] || '0.375rem';
  const cardRadius = borderRadius[1]?.value || borderRadius[0]?.value || '0.5rem';
  const shadow = effects.boxShadows?.[0] || '0 1px 3px rgba(0,0,0,0.1)';

  return COMPONENTS_STORY
    .replace('{{SOURCE}}', source)
    .replace(/\{\{PRIMARY_COLOR\}\}/g, primaryColor)
    .replace(/\{\{SECONDARY_COLOR\}\}/g, secondaryColor)
    .replace(/\{\{BORDER_RADIUS\}\}/g, radius)
    .replace(/\{\{CARD_RADIUS\}\}/g, cardRadius)
    .replace(/\{\{BOX_SHADOW\}\}/g, shadow);
}

// ============ MAIN ============

function generateStorybook(designSystemPath, outputDir) {
  const designSystem = JSON.parse(fs.readFileSync(designSystemPath, 'utf-8'));

  fs.mkdirSync(outputDir, { recursive: true });

  const files = [];

  // Generate stories
  if (designSystem.colors) {
    const colorsStory = generateColorsStory(designSystem);
    fs.writeFileSync(path.join(outputDir, 'Colors.stories.tsx'), colorsStory);
    files.push('Colors.stories.tsx');
  }

  if (designSystem.typography) {
    const typographyStory = generateTypographyStory(designSystem);
    fs.writeFileSync(path.join(outputDir, 'Typography.stories.tsx'), typographyStory);
    files.push('Typography.stories.tsx');
  }

  if (designSystem.spacing) {
    const spacingStory = generateSpacingStory(designSystem);
    fs.writeFileSync(path.join(outputDir, 'Spacing.stories.tsx'), spacingStory);
    files.push('Spacing.stories.tsx');
  }

  // Components story
  const componentsStory = generateComponentsStory(designSystem);
  fs.writeFileSync(path.join(outputDir, 'Components.stories.tsx'), componentsStory);
  files.push('Components.stories.tsx');

  return {
    outputDir,
    files,
    designSystem: designSystemPath,
  };
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: node generate-storybook.js <design-system.json> [output-dir]');
    console.error('');
    console.error('Example:');
    console.error('  node generate-storybook.js references/linear.json ./stories');
    process.exit(1);
  }

  const designSystemPath = path.resolve(args[0]);
  const outputDir = args[1] ? path.resolve(args[1]) : './stories';

  if (!fs.existsSync(designSystemPath)) {
    console.error(`Error: Design system file not found: ${designSystemPath}`);
    process.exit(1);
  }

  try {
    const result = generateStorybook(designSystemPath, outputDir);

    console.log(`✓ Generated Storybook stories`);
    console.log(`  Output: ${result.outputDir}`);
    console.log(`  Files:`);
    for (const file of result.files) {
      console.log(`    - ${file}`);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  generateStorybook,
  generateColorsStory,
  generateTypographyStory,
  generateSpacingStory,
  generateComponentsStory,
};
