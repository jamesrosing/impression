#!/usr/bin/env node
/**
 * Generate Component Library from Design System
 *
 * Features:
 * - Generate React, Vue, or Svelte components
 * - Use extracted button/input/card patterns
 * - Apply design tokens (colors, typography, spacing)
 * - Generate TypeScript types
 * - Create index.ts barrel exports
 *
 * Usage:
 *   node generate-component-library.js <design-system.json> [output-dir] [--framework=react|vue|svelte]
 *   node generate-component-library.js references/linear.json ./components --framework=react
 */

const fs = require('fs');
const path = require('path');

// ============ TEMPLATES ============

const REACT_BUTTON_TEMPLATE = `import React from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: {{VARIANTS}};
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) => {
  const baseStyles = '{{BASE_STYLES}}';

  const variantStyles: Record<string, string> = {
{{VARIANT_STYLES}}
  };

  const sizeStyles: Record<string, string> = {
    sm: '{{SIZE_SM}}',
    md: '{{SIZE_MD}}',
    lg: '{{SIZE_LG}}',
  };

  return (
    <button
      className={\`\${baseStyles} \${variantStyles[variant]} \${sizeStyles[size]} \${className}\`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
`;

const REACT_INPUT_TEMPLATE = `import React from 'react';
import type { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = ({
  label,
  error,
  helperText,
  className = '',
  ...props
}: InputProps) => {
  const baseStyles = '{{BASE_STYLES}}';
  const errorStyles = '{{ERROR_STYLES}}';
  const labelStyles = '{{LABEL_STYLES}}';
  const helperStyles = '{{HELPER_STYLES}}';

  return (
    <div className="flex flex-col gap-1">
      {label && <label className={labelStyles}>{label}</label>}
      <input
        className={\`\${baseStyles} \${error ? errorStyles : ''} \${className}\`}
        {...props}
      />
      {error && <span className={errorStyles}>{error}</span>}
      {helperText && !error && <span className={helperStyles}>{helperText}</span>}
    </div>
  );
};

export default Input;
`;

const REACT_CARD_TEMPLATE = `import React from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export const Card = ({
  variant = 'default',
  padding = 'md',
  children,
  className = '',
  ...props
}: CardProps) => {
  const baseStyles = '{{BASE_STYLES}}';

  const variantStyles: Record<string, string> = {
    default: '{{VARIANT_DEFAULT}}',
    elevated: '{{VARIANT_ELEVATED}}',
    outlined: '{{VARIANT_OUTLINED}}',
  };

  const paddingStyles: Record<string, string> = {
    none: 'p-0',
    sm: '{{PADDING_SM}}',
    md: '{{PADDING_MD}}',
    lg: '{{PADDING_LG}}',
  };

  return (
    <div
      className={\`\${baseStyles} \${variantStyles[variant]} \${paddingStyles[padding]} \${className}\`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
`;

const VUE_BUTTON_TEMPLATE = `<script setup lang="ts">
defineProps<{
  variant?: {{VARIANTS}}
  size?: 'sm' | 'md' | 'lg'
}>()
</script>

<template>
  <button
    :class="[
      '{{BASE_STYLES}}',
      {
{{VARIANT_CLASSES}}
      },
      {
        '{{SIZE_SM}}': size === 'sm',
        '{{SIZE_MD}}': size === 'md',
        '{{SIZE_LG}}': size === 'lg',
      }
    ]"
  >
    <slot />
  </button>
</template>
`;

const VUE_INPUT_TEMPLATE = `<script setup lang="ts">
defineProps<{
  label?: string
  error?: string
  helperText?: string
  modelValue?: string
}>()

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" class="{{LABEL_STYLES}}">{{ label }}</label>
    <input
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      :class="['{{BASE_STYLES}}', error && '{{ERROR_STYLES}}']"
    />
    <span v-if="error" class="{{ERROR_STYLES}}">{{ error }}</span>
    <span v-else-if="helperText" class="{{HELPER_STYLES}}">{{ helperText }}</span>
  </div>
</template>
`;

const VUE_CARD_TEMPLATE = `<script setup lang="ts">
defineProps<{
  variant?: 'default' | 'elevated' | 'outlined'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}>()
</script>

<template>
  <div
    :class="[
      '{{BASE_STYLES}}',
      {
        '{{VARIANT_DEFAULT}}': variant === 'default' || !variant,
        '{{VARIANT_ELEVATED}}': variant === 'elevated',
        '{{VARIANT_OUTLINED}}': variant === 'outlined',
      },
      {
        'p-0': padding === 'none',
        '{{PADDING_SM}}': padding === 'sm',
        '{{PADDING_MD}}': padding === 'md' || !padding,
        '{{PADDING_LG}}': padding === 'lg',
      }
    ]"
  >
    <slot />
  </div>
</template>
`;

const SVELTE_BUTTON_TEMPLATE = `<script lang="ts">
  export let variant: {{VARIANTS}} = 'primary';
  export let size: 'sm' | 'md' | 'lg' = 'md';

  const baseStyles = '{{BASE_STYLES}}';

  const variantStyles: Record<string, string> = {
{{VARIANT_STYLES}}
  };

  const sizeStyles: Record<string, string> = {
    sm: '{{SIZE_SM}}',
    md: '{{SIZE_MD}}',
    lg: '{{SIZE_LG}}',
  };
</script>

<button
  class="{baseStyles} {variantStyles[variant]} {sizeStyles[size]}"
  on:click
  {...$$restProps}
>
  <slot />
</button>
`;

const SVELTE_INPUT_TEMPLATE = `<script lang="ts">
  export let label: string = '';
  export let error: string = '';
  export let helperText: string = '';
  export let value: string = '';

  const baseStyles = '{{BASE_STYLES}}';
  const errorStyles = '{{ERROR_STYLES}}';
  const labelStyles = '{{LABEL_STYLES}}';
  const helperStyles = '{{HELPER_STYLES}}';
</script>

<div class="flex flex-col gap-1">
  {#if label}
    <label class={labelStyles}>{label}</label>
  {/if}
  <input
    bind:value
    class="{baseStyles} {error ? errorStyles : ''}"
    {...$$restProps}
  />
  {#if error}
    <span class={errorStyles}>{error}</span>
  {:else if helperText}
    <span class={helperStyles}>{helperText}</span>
  {/if}
</div>
`;

const SVELTE_CARD_TEMPLATE = `<script lang="ts">
  export let variant: 'default' | 'elevated' | 'outlined' = 'default';
  export let padding: 'none' | 'sm' | 'md' | 'lg' = 'md';

  const baseStyles = '{{BASE_STYLES}}';

  const variantStyles: Record<string, string> = {
    default: '{{VARIANT_DEFAULT}}',
    elevated: '{{VARIANT_ELEVATED}}',
    outlined: '{{VARIANT_OUTLINED}}',
  };

  const paddingStyles: Record<string, string> = {
    none: 'p-0',
    sm: '{{PADDING_SM}}',
    md: '{{PADDING_MD}}',
    lg: '{{PADDING_LG}}',
  };
</script>

<div
  class="{baseStyles} {variantStyles[variant]} {paddingStyles[padding]}"
  {...$$restProps}
>
  <slot />
</div>
`;

// ============ STYLE GENERATORS ============

function generateButtonStyles(designSystem) {
  const colors = designSystem.colors || {};
  const spacing = designSystem.spacing || {};
  const typography = designSystem.typography || {};
  const borderRadius = designSystem.borderRadius || [];
  const buttons = designSystem.components?.buttons || [];

  // Extract primary color
  const primaryColor = colors.semantic?.primary ||
                       colors.semantic?.accents?.[0]?.value ||
                       '#3b82f6';

  // Get border radius
  const radius = borderRadius[0]?.value || borderRadius[0] || '0.375rem';

  // Get font
  const fontFamily = typography.fontFamilies?.[0]?.family || 'system-ui';
  const fontWeight = typography.fontWeights?.includes(500) ? '500' : '600';

  // Base styles
  const baseStyles = `inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50`;

  // Detect variants from extracted buttons
  const variants = new Set(['primary', 'secondary', 'outline', 'ghost']);
  const variantStyles = {};

  // Primary variant
  variantStyles.primary = `bg-[${primaryColor}] text-white hover:opacity-90`;

  // Secondary variant
  const secondaryBg = colors.semantic?.secondary || colors.semantic?.background?.secondary || '#f3f4f6';
  variantStyles.secondary = `bg-[${secondaryBg}] text-gray-900 hover:bg-opacity-80`;

  // Outline variant
  variantStyles.outline = `border border-gray-300 bg-transparent hover:bg-gray-100`;

  // Ghost variant
  variantStyles.ghost = `bg-transparent hover:bg-gray-100`;

  // Check for destructive buttons
  if (buttons.some(b => b.variant === 'destructive')) {
    variants.add('destructive');
    const errorColor = colors.semantic?.error || '#ef4444';
    variantStyles.destructive = `bg-[${errorColor}] text-white hover:opacity-90`;
  }

  // Size styles
  const sizeStyles = {
    sm: `h-8 px-3 text-sm rounded-[${radius}]`,
    md: `h-10 px-4 text-sm rounded-[${radius}]`,
    lg: `h-12 px-6 text-base rounded-[${radius}]`,
  };

  return {
    variants: Array.from(variants),
    baseStyles,
    variantStyles,
    sizeStyles,
  };
}

function generateInputStyles(designSystem) {
  const colors = designSystem.colors || {};
  const borderRadius = designSystem.borderRadius || [];
  const typography = designSystem.typography || {};

  const radius = borderRadius[0]?.value || borderRadius[0] || '0.375rem';
  const borderColor = colors.semantic?.border?.default || colors.semantic?.borders?.[0]?.value || '#e5e7eb';
  const errorColor = colors.semantic?.error || '#ef4444';
  const textColor = colors.semantic?.foreground?.primary || colors.semantic?.text?.[0]?.value || '#111827';
  const mutedText = colors.semantic?.foreground?.muted || colors.semantic?.text?.[2]?.value || '#6b7280';

  return {
    baseStyles: `w-full px-3 py-2 border border-[${borderColor}] rounded-[${radius}] text-[${textColor}] placeholder:text-[${mutedText}] focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50`,
    errorStyles: `border-[${errorColor}] text-[${errorColor}] focus:ring-[${errorColor}]`,
    labelStyles: `text-sm font-medium text-[${textColor}]`,
    helperStyles: `text-sm text-[${mutedText}]`,
  };
}

function generateCardStyles(designSystem) {
  const colors = designSystem.colors || {};
  const borderRadius = designSystem.borderRadius || [];
  const spacing = designSystem.spacing || {};
  const effects = designSystem.effects || {};

  const radius = borderRadius[1]?.value || borderRadius[0]?.value || '0.5rem';
  const bgColor = colors.semantic?.background?.primary || colors.semantic?.backgrounds?.[0]?.value || '#ffffff';
  const borderColor = colors.semantic?.border?.default || colors.semantic?.borders?.[0]?.value || '#e5e7eb';

  // Get shadow
  const shadow = effects.boxShadows?.[0] || '0 1px 3px rgba(0,0,0,0.1)';

  // Spacing scale
  const spacingScale = spacing.scale || [4, 8, 16, 24, 32];
  const smPadding = `${spacingScale[1] || 8}px`;
  const mdPadding = `${spacingScale[2] || 16}px`;
  const lgPadding = `${spacingScale[3] || 24}px`;

  return {
    baseStyles: `rounded-[${radius}] bg-[${bgColor}]`,
    variantDefault: `border border-[${borderColor}]`,
    variantElevated: `shadow-[${shadow}]`,
    variantOutlined: `border-2 border-[${borderColor}]`,
    paddingSm: `p-[${smPadding}]`,
    paddingMd: `p-[${mdPadding}]`,
    paddingLg: `p-[${lgPadding}]`,
  };
}

// ============ COMPONENT GENERATORS ============

function generateReactComponents(designSystem, outputDir) {
  const buttonStyles = generateButtonStyles(designSystem);
  const inputStyles = generateInputStyles(designSystem);
  const cardStyles = generateCardStyles(designSystem);

  // Create output directory
  fs.mkdirSync(outputDir, { recursive: true });

  // Generate Button
  let buttonContent = REACT_BUTTON_TEMPLATE
    .replace('{{VARIANTS}}', buttonStyles.variants.map(v => `'${v}'`).join(' | '))
    .replace('{{BASE_STYLES}}', buttonStyles.baseStyles)
    .replace('{{SIZE_SM}}', buttonStyles.sizeStyles.sm)
    .replace('{{SIZE_MD}}', buttonStyles.sizeStyles.md)
    .replace('{{SIZE_LG}}', buttonStyles.sizeStyles.lg);

  const variantStylesCode = Object.entries(buttonStyles.variantStyles)
    .map(([key, value]) => `    ${key}: '${value}',`)
    .join('\n');
  buttonContent = buttonContent.replace('{{VARIANT_STYLES}}', variantStylesCode);

  fs.writeFileSync(path.join(outputDir, 'Button.tsx'), buttonContent);

  // Generate Input
  const inputContent = REACT_INPUT_TEMPLATE
    .replace('{{BASE_STYLES}}', inputStyles.baseStyles)
    .replace(/\{\{ERROR_STYLES\}\}/g, inputStyles.errorStyles)
    .replace('{{LABEL_STYLES}}', inputStyles.labelStyles)
    .replace('{{HELPER_STYLES}}', inputStyles.helperStyles);

  fs.writeFileSync(path.join(outputDir, 'Input.tsx'), inputContent);

  // Generate Card
  const cardContent = REACT_CARD_TEMPLATE
    .replace('{{BASE_STYLES}}', cardStyles.baseStyles)
    .replace('{{VARIANT_DEFAULT}}', cardStyles.variantDefault)
    .replace('{{VARIANT_ELEVATED}}', cardStyles.variantElevated)
    .replace('{{VARIANT_OUTLINED}}', cardStyles.variantOutlined)
    .replace('{{PADDING_SM}}', cardStyles.paddingSm)
    .replace('{{PADDING_MD}}', cardStyles.paddingMd)
    .replace('{{PADDING_LG}}', cardStyles.paddingLg);

  fs.writeFileSync(path.join(outputDir, 'Card.tsx'), cardContent);

  // Generate index.ts
  const indexContent = `export { Button } from './Button';
export type { ButtonProps } from './Button';
export { Input } from './Input';
export type { InputProps } from './Input';
export { Card } from './Card';
export type { CardProps } from './Card';
`;

  fs.writeFileSync(path.join(outputDir, 'index.ts'), indexContent);

  return ['Button.tsx', 'Input.tsx', 'Card.tsx', 'index.ts'];
}

function generateVueComponents(designSystem, outputDir) {
  const buttonStyles = generateButtonStyles(designSystem);
  const inputStyles = generateInputStyles(designSystem);
  const cardStyles = generateCardStyles(designSystem);

  fs.mkdirSync(outputDir, { recursive: true });

  // Generate Button
  const variantClasses = Object.entries(buttonStyles.variantStyles)
    .map(([key, value]) => `        '${value}': variant === '${key}'${key === 'primary' ? ' || !variant' : ''},`)
    .join('\n');

  const buttonContent = VUE_BUTTON_TEMPLATE
    .replace('{{VARIANTS}}', buttonStyles.variants.map(v => `'${v}'`).join(' | '))
    .replace('{{BASE_STYLES}}', buttonStyles.baseStyles)
    .replace('{{VARIANT_CLASSES}}', variantClasses)
    .replace('{{SIZE_SM}}', buttonStyles.sizeStyles.sm)
    .replace('{{SIZE_MD}}', buttonStyles.sizeStyles.md)
    .replace('{{SIZE_LG}}', buttonStyles.sizeStyles.lg);

  fs.writeFileSync(path.join(outputDir, 'Button.vue'), buttonContent);

  // Generate Input
  const inputContent = VUE_INPUT_TEMPLATE
    .replace('{{BASE_STYLES}}', inputStyles.baseStyles)
    .replace(/\{\{ERROR_STYLES\}\}/g, inputStyles.errorStyles)
    .replace('{{LABEL_STYLES}}', inputStyles.labelStyles)
    .replace('{{HELPER_STYLES}}', inputStyles.helperStyles);

  fs.writeFileSync(path.join(outputDir, 'Input.vue'), inputContent);

  // Generate Card
  const cardContent = VUE_CARD_TEMPLATE
    .replace('{{BASE_STYLES}}', cardStyles.baseStyles)
    .replace('{{VARIANT_DEFAULT}}', cardStyles.variantDefault)
    .replace('{{VARIANT_ELEVATED}}', cardStyles.variantElevated)
    .replace('{{VARIANT_OUTLINED}}', cardStyles.variantOutlined)
    .replace('{{PADDING_SM}}', cardStyles.paddingSm)
    .replace('{{PADDING_MD}}', cardStyles.paddingMd)
    .replace('{{PADDING_LG}}', cardStyles.paddingLg);

  fs.writeFileSync(path.join(outputDir, 'Card.vue'), cardContent);

  // Generate index.ts
  const indexContent = `export { default as Button } from './Button.vue';
export { default as Input } from './Input.vue';
export { default as Card } from './Card.vue';
`;

  fs.writeFileSync(path.join(outputDir, 'index.ts'), indexContent);

  return ['Button.vue', 'Input.vue', 'Card.vue', 'index.ts'];
}

function generateSvelteComponents(designSystem, outputDir) {
  const buttonStyles = generateButtonStyles(designSystem);
  const inputStyles = generateInputStyles(designSystem);
  const cardStyles = generateCardStyles(designSystem);

  fs.mkdirSync(outputDir, { recursive: true });

  // Generate Button
  const variantStylesCode = Object.entries(buttonStyles.variantStyles)
    .map(([key, value]) => `    ${key}: '${value}',`)
    .join('\n');

  const buttonContent = SVELTE_BUTTON_TEMPLATE
    .replace('{{VARIANTS}}', buttonStyles.variants.map(v => `'${v}'`).join(' | '))
    .replace('{{BASE_STYLES}}', buttonStyles.baseStyles)
    .replace('{{VARIANT_STYLES}}', variantStylesCode)
    .replace('{{SIZE_SM}}', buttonStyles.sizeStyles.sm)
    .replace('{{SIZE_MD}}', buttonStyles.sizeStyles.md)
    .replace('{{SIZE_LG}}', buttonStyles.sizeStyles.lg);

  fs.writeFileSync(path.join(outputDir, 'Button.svelte'), buttonContent);

  // Generate Input
  const inputContent = SVELTE_INPUT_TEMPLATE
    .replace('{{BASE_STYLES}}', inputStyles.baseStyles)
    .replace(/\{\{ERROR_STYLES\}\}/g, inputStyles.errorStyles)
    .replace('{{LABEL_STYLES}}', inputStyles.labelStyles)
    .replace('{{HELPER_STYLES}}', inputStyles.helperStyles);

  fs.writeFileSync(path.join(outputDir, 'Input.svelte'), inputContent);

  // Generate Card
  const cardContent = SVELTE_CARD_TEMPLATE
    .replace('{{BASE_STYLES}}', cardStyles.baseStyles)
    .replace('{{VARIANT_DEFAULT}}', cardStyles.variantDefault)
    .replace('{{VARIANT_ELEVATED}}', cardStyles.variantElevated)
    .replace('{{VARIANT_OUTLINED}}', cardStyles.variantOutlined)
    .replace('{{PADDING_SM}}', cardStyles.paddingSm)
    .replace('{{PADDING_MD}}', cardStyles.paddingMd)
    .replace('{{PADDING_LG}}', cardStyles.paddingLg);

  fs.writeFileSync(path.join(outputDir, 'Card.svelte'), cardContent);

  // Generate index.ts
  const indexContent = `export { default as Button } from './Button.svelte';
export { default as Input } from './Input.svelte';
export { default as Card } from './Card.svelte';
`;

  fs.writeFileSync(path.join(outputDir, 'index.ts'), indexContent);

  return ['Button.svelte', 'Input.svelte', 'Card.svelte', 'index.ts'];
}

// ============ MAIN ============

function generateComponentLibrary(designSystemPath, outputDir, options = {}) {
  const { framework = 'react' } = options;

  // Load design system
  const designSystem = JSON.parse(fs.readFileSync(designSystemPath, 'utf-8'));

  let generatedFiles = [];

  switch (framework) {
    case 'react':
      generatedFiles = generateReactComponents(designSystem, outputDir);
      break;
    case 'vue':
      generatedFiles = generateVueComponents(designSystem, outputDir);
      break;
    case 'svelte':
      generatedFiles = generateSvelteComponents(designSystem, outputDir);
      break;
    default:
      throw new Error(`Unsupported framework: ${framework}. Use react, vue, or svelte.`);
  }

  return {
    framework,
    outputDir,
    files: generatedFiles,
    designSystem: designSystemPath,
  };
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: node generate-component-library.js <design-system.json> [output-dir] [--framework=react|vue|svelte]');
    console.error('');
    console.error('Example:');
    console.error('  node generate-component-library.js references/linear.json ./components');
    console.error('  node generate-component-library.js references/linear.json ./components --framework=vue');
    process.exit(1);
  }

  const designSystemPath = path.resolve(args[0]);
  let outputDir = './components';
  let framework = 'react';

  for (const arg of args.slice(1)) {
    if (arg.startsWith('--framework=')) {
      framework = arg.split('=')[1];
    } else if (!arg.startsWith('--')) {
      outputDir = arg;
    }
  }

  outputDir = path.resolve(outputDir);

  if (!fs.existsSync(designSystemPath)) {
    console.error(`Error: Design system file not found: ${designSystemPath}`);
    process.exit(1);
  }

  try {
    const result = generateComponentLibrary(designSystemPath, outputDir, { framework });

    console.log(`✓ Generated ${result.framework} component library`);
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
  generateComponentLibrary,
  generateButtonStyles,
  generateInputStyles,
  generateCardStyles,
};
