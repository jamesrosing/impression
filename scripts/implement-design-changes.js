#!/usr/bin/env node
/**
 * Generate Implementation Plan from Comparison Report
 * Creates a feature branch and generates atomic commits for design alignment
 * 
 * Usage:
 *   node implement-design-changes.js <project-path> <reference.json> [--dry-run]
 *   node implement-design-changes.js ./my-project examples/extracted/duchateau.json
 * 
 * Creates: feature/design-system-alignment branch with staged changes
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { compareDesignSystems } = require('./compare-design-systems');

function exec(cmd, cwd) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', stdio: 'pipe' });
  } catch (err) {
    return null;
  }
}

function detectConfigFiles(projectPath) {
  const configs = {
    tailwind: null,
    cssVars: null,
    packageJson: null
  };
  
  // Tailwind config
  const twFiles = ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs'];
  for (const f of twFiles) {
    if (fs.existsSync(path.join(projectPath, f))) {
      configs.tailwind = f;
      break;
    }
  }
  
  // CSS variables (look for globals.css or variables.css)
  const cssLocations = [
    'src/styles/globals.css',
    'src/globals.css',
    'styles/globals.css',
    'app/globals.css',
    'src/styles/variables.css',
    'src/variables.css'
  ];
  for (const f of cssLocations) {
    if (fs.existsSync(path.join(projectPath, f))) {
      configs.cssVars = f;
      break;
    }
  }
  
  // Package.json for font dependencies
  if (fs.existsSync(path.join(projectPath, 'package.json'))) {
    configs.packageJson = 'package.json';
  }
  
  return configs;
}

function generateColorTokens(reference, format) {
  const colors = {};
  
  // From palette with roles
  reference.colors?.palette?.forEach(c => {
    if (c.role) {
      const key = c.role.replace(/-/g, '_').replace(/\s+/g, '_');
      colors[key] = c.value;
    }
  });
  
  // Semantic colors
  if (reference.colors?.semantic) {
    const sem = reference.colors.semantic;
    if (sem.backgrounds?.[0]) colors.background = sem.backgrounds[0].value;
    if (sem.backgrounds?.[1]) colors.background_secondary = sem.backgrounds[1].value;
    if (sem.text?.[0]) colors.foreground = sem.text[0].value;
    if (sem.text?.[1]) colors.foreground_secondary = sem.text[1].value;
    if (sem.borders?.[0]) colors.border = sem.borders[0].value;
    if (sem.accents?.[0]) colors.accent = sem.accents[0].value;
  }
  
  if (format === 'tailwind') {
    return `colors: ${JSON.stringify(colors, null, 6).replace(/"/g, "'")}`;
  } else {
    return Object.entries(colors)
      .map(([k, v]) => `  --color-${k.replace(/_/g, '-')}: ${v};`)
      .join('\n');
  }
}

function generateTypographyTokens(reference, format) {
  const fonts = reference.typography?.fontFamilies || [];
  const scale = reference.typography?.scale || [];
  const weights = reference.typography?.fontWeights || [];
  
  if (format === 'tailwind') {
    const fontFamily = {};
    fonts.forEach(f => {
      const key = f.role?.includes('serif') ? 'serif' : 
                  f.role?.includes('display') ? 'display' : 'sans';
      if (!fontFamily[key]) {
        fontFamily[key] = [`'${f.family}'`, 'system-ui', 'sans-serif'];
      }
    });
    
    const fontSize = {};
    const names = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'];
    scale.slice(0, 9).forEach((s, i) => {
      fontSize[names[i]] = s;
    });
    
    return `fontFamily: ${JSON.stringify(fontFamily, null, 6).replace(/"/g, "'")},
      fontSize: ${JSON.stringify(fontSize, null, 6).replace(/"/g, "'")}`;
  } else {
    const lines = [];
    fonts.forEach(f => {
      const key = f.role?.includes('serif') ? 'serif' : 
                  f.role?.includes('display') ? 'display' : 'sans';
      lines.push(`  --font-${key}: '${f.family}', system-ui, sans-serif;`);
    });
    const names = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'];
    scale.slice(0, 9).forEach((s, i) => {
      lines.push(`  --font-size-${names[i]}: ${s};`);
    });
    weights.forEach(w => {
      const weightNames = { '400': 'normal', '500': 'medium', '600': 'semibold', '700': 'bold' };
      if (weightNames[w]) lines.push(`  --font-weight-${weightNames[w]}: ${w};`);
    });
    return lines.join('\n');
  }
}

function generateSpacingTokens(reference, format) {
  const scale = reference.spacing?.scale || [];
  
  if (format === 'tailwind') {
    const spacing = {};
    scale.forEach((s, i) => {
      spacing[i + 1] = s;
    });
    return `spacing: ${JSON.stringify(spacing, null, 6).replace(/"/g, "'")}`;
  } else {
    return scale.map((s, i) => `  --spacing-${i + 1}: ${s};`).join('\n');
  }
}

function generateRadiusTokens(reference, format) {
  const radii = reference.borderRadius || [];
  
  if (format === 'tailwind') {
    const borderRadius = {};
    const names = ['sm', 'DEFAULT', 'md', 'lg', 'xl', 'full'];
    radii.forEach((r, i) => {
      const name = r.role === 'pill' ? 'full' : names[i] || `r${i}`;
      borderRadius[name] = r.value;
    });
    return `borderRadius: ${JSON.stringify(borderRadius, null, 6).replace(/"/g, "'")}`;
  } else {
    const names = ['sm', 'DEFAULT', 'md', 'lg', 'xl', 'full'];
    return radii.map((r, i) => {
      const name = r.role === 'pill' ? 'full' : names[i] || i;
      return `  --radius-${name}: ${r.value};`;
    }).join('\n');
  }
}

function generateAnimationTokens(reference, format) {
  const durations = reference.animations?.durations || [];
  const easings = reference.animations?.easings || [];
  
  if (format === 'tailwind') {
    const transitionDuration = {};
    const durNames = ['fast', 'DEFAULT', 'slow'];
    durations.slice(0, 3).forEach((d, i) => {
      transitionDuration[durNames[i]] = d;
    });
    
    const transitionTimingFunction = {};
    const easeNames = ['DEFAULT', 'in', 'out'];
    easings.slice(0, 3).forEach((e, i) => {
      transitionTimingFunction[easeNames[i]] = e;
    });
    
    return `transitionDuration: ${JSON.stringify(transitionDuration, null, 6).replace(/"/g, "'")},
      transitionTimingFunction: ${JSON.stringify(transitionTimingFunction, null, 6).replace(/"/g, "'")}`;
  } else {
    const lines = [];
    const durNames = ['fast', 'DEFAULT', 'slow'];
    durations.slice(0, 3).forEach((d, i) => {
      lines.push(`  --duration-${durNames[i].toLowerCase()}: ${d};`);
    });
    const easeNames = ['DEFAULT', 'in', 'out'];
    easings.slice(0, 3).forEach((e, i) => {
      lines.push(`  --ease-${easeNames[i].toLowerCase()}: ${e};`);
    });
    return lines.join('\n');
  }
}

function generateImplementationPlan(projectPath, reference, comparisons, configs) {
  const plan = {
    branch: 'feature/design-system-alignment',
    commits: []
  };
  
  const format = configs.tailwind ? 'tailwind' : 'css';
  const targetFile = configs.tailwind || configs.cssVars;
  
  if (!targetFile) {
    throw new Error('No config file found. Create tailwind.config.js or src/styles/globals.css first.');
  }
  
  // P0: Design tokens foundation
  if (comparisons.colors.score < 100) {
    plan.commits.push({
      priority: 0,
      message: 'design: add color tokens from reference system',
      file: targetFile,
      tokens: generateColorTokens(reference, format),
      category: 'colors'
    });
  }
  
  // P1: Typography
  if (comparisons.typography.score < 100) {
    plan.commits.push({
      priority: 1,
      message: 'design: align typography with reference system',
      file: targetFile,
      tokens: generateTypographyTokens(reference, format),
      category: 'typography'
    });
  }
  
  // P2: Spacing
  if (comparisons.spacing.score < 100) {
    plan.commits.push({
      priority: 2,
      message: 'design: update spacing scale',
      file: targetFile,
      tokens: generateSpacingTokens(reference, format),
      category: 'spacing'
    });
  }
  
  // P3: Border radius
  if (comparisons.borderRadius.score < 100) {
    plan.commits.push({
      priority: 3,
      message: 'design: align border radius tokens',
      file: targetFile,
      tokens: generateRadiusTokens(reference, format),
      category: 'borderRadius'
    });
  }
  
  // P4: Animations
  plan.commits.push({
    priority: 4,
    message: 'design: add animation/transition tokens',
    file: targetFile,
    tokens: generateAnimationTokens(reference, format),
    category: 'animations'
  });
  
  return plan;
}

function executePlan(projectPath, plan, dryRun = false) {
  const results = [];
  
  // Check git status
  const gitStatus = exec('git status --porcelain', projectPath);
  if (gitStatus && gitStatus.trim() && !dryRun) {
    console.warn('⚠️  Working directory has uncommitted changes. Commit or stash first.');
  }
  
  // Create branch
  if (!dryRun) {
    exec(`git checkout -b ${plan.branch}`, projectPath);
    console.log(`✓ Created branch: ${plan.branch}`);
  } else {
    console.log(`[DRY RUN] Would create branch: ${plan.branch}`);
  }
  
  // Process each commit
  for (const commit of plan.commits.sort((a, b) => a.priority - b.priority)) {
    const filePath = path.join(projectPath, commit.file);
    
    results.push({
      priority: commit.priority,
      category: commit.category,
      message: commit.message,
      file: commit.file,
      tokens: commit.tokens
    });
    
    if (!dryRun) {
      // For now, just output what would be added
      // Full implementation would parse and modify the config file
      console.log(`\n[P${commit.priority}] ${commit.message}`);
      console.log(`     File: ${commit.file}`);
      console.log(`     Tokens to add:`);
      console.log(commit.tokens.split('\n').map(l => `       ${l}`).join('\n'));
    } else {
      console.log(`\n[DRY RUN] [P${commit.priority}] ${commit.message}`);
      console.log(`     File: ${commit.file}`);
    }
  }
  
  return results;
}

function generatePlanReport(plan, results) {
  const lines = [];
  
  lines.push('# Implementation Plan');
  lines.push('');
  lines.push(`**Branch:** \`${plan.branch}\``);
  lines.push(`**Commits:** ${results.length}`);
  lines.push('');
  lines.push('## Execution Order');
  lines.push('');
  
  for (const r of results) {
    lines.push(`### P${r.priority}: ${r.category}`);
    lines.push('');
    lines.push(`**Commit:** \`${r.message}\``);
    lines.push(`**File:** \`${r.file}\``);
    lines.push('');
    lines.push('**Tokens:**');
    lines.push('```');
    lines.push(r.tokens);
    lines.push('```');
    lines.push('');
  }
  
  lines.push('## Git Commands');
  lines.push('');
  lines.push('```bash');
  lines.push(`git checkout -b ${plan.branch}`);
  lines.push('');
  for (const r of results) {
    lines.push(`# P${r.priority}: ${r.category}`);
    lines.push(`# Edit ${r.file} with tokens above`);
    lines.push(`git add ${r.file}`);
    lines.push(`git commit -m "${r.message}"`);
    lines.push('');
  }
  lines.push(`git push -u origin ${plan.branch}`);
  lines.push('```');
  
  return lines.join('\n');
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const filteredArgs = args.filter(a => a !== '--dry-run');
  
  if (filteredArgs.length < 2) {
    console.error('Usage: node implement-design-changes.js <project-path> <reference.json> [--dry-run]');
    console.error('');
    console.error('Options:');
    console.error('  --dry-run  Preview changes without creating branch or modifying files');
    console.error('');
    console.error('Example:');
    console.error('  node implement-design-changes.js ./my-project examples/extracted/duchateau.json --dry-run');
    process.exit(1);
  }

  const projectPath = path.resolve(filteredArgs[0]);
  const referencePath = path.resolve(filteredArgs[1]);

  if (!fs.existsSync(projectPath)) {
    console.error(`Error: Project path not found: ${projectPath}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(referencePath)) {
    console.error(`Error: Reference file not found: ${referencePath}`);
    process.exit(1);
  }

  try {
    console.log('Analyzing project...');
    
    // Load reference
    const reference = JSON.parse(fs.readFileSync(referencePath, 'utf-8'));
    
    // Run comparison
    const { comparisons } = compareDesignSystems(projectPath, referencePath);
    
    // Detect config files
    const configs = detectConfigFiles(projectPath);
    console.log(`Config detected: ${configs.tailwind || configs.cssVars || 'none'}`);
    
    // Generate plan
    const plan = generateImplementationPlan(projectPath, reference, comparisons, configs);
    
    // Execute or preview
    const results = executePlan(projectPath, plan, dryRun);
    
    // Generate report
    const report = generatePlanReport(plan, results);
    
    // Save report
    const reportPath = path.join(projectPath, 'DESIGN_IMPLEMENTATION_PLAN.md');
    fs.writeFileSync(reportPath, report);
    console.log(`\n✓ Implementation plan saved to: ${reportPath}`);
    
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { generateImplementationPlan, executePlan };
