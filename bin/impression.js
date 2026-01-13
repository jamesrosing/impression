#!/usr/bin/env node
/**
 * Impression CLI
 *
 * Unified command-line interface for all Impression design system tools.
 *
 * Usage:
 *   impression <command> [options]
 *   impression help [command]
 *
 * Commands:
 *   extract       Extract design system from URL (requires Playwright)
 *   compare       Compare project against reference design system
 *   implement     Generate implementation plan with feature branch
 *   generate      Generate output format (tailwind, css, shadcn, etc.)
 *   blend         Blend multiple design systems
 *   migrate       Migrate between token formats
 *   version       Design system versioning (init, snapshot, diff, rollback)
 *   watch         Watch design system for changes
 *   pr            Generate PR description from design changes
 *   test          Run visual regression tests
 *   help          Show help for a command
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPTS_DIR = path.join(__dirname, '..', 'scripts');

// Command to script mapping
const COMMANDS = {
  // Core
  extract: { script: 'core/extract-design-system.js', desc: 'Extract design system from URL' },
  compare: { script: 'core/compare-design-systems.js', desc: 'Compare project against reference' },
  implement: { script: 'core/implement-design-changes.js', desc: 'Generate implementation plan' },

  // Generators (subcommands)
  generate: {
    desc: 'Generate output format',
    subcommands: {
      tailwind: { script: 'generators/generate-tailwind-config.js', desc: 'Generate Tailwind config' },
      css: { script: 'generators/generate-css-variables.js', desc: 'Generate CSS variables' },
      shadcn: { script: 'generators/generate-shadcn-theme.js', desc: 'Generate shadcn/ui theme' },
      w3c: { script: 'generators/generate-w3c-tokens.js', desc: 'Generate W3C tokens' },
      figma: { script: 'generators/generate-figma-tokens.js', desc: 'Generate Figma variables' },
      components: { script: 'generators/generate-component-library.js', desc: 'Generate component library' },
      'style-guide': { script: 'generators/generate-style-guide.js', desc: 'Generate style guide' },
      storybook: { script: 'generators/generate-storybook.js', desc: 'Generate Storybook stories' },
    }
  },

  // Tools
  blend: { script: 'tools/blend-design-systems.js', desc: 'Blend multiple design systems' },
  migrate: { script: 'tools/migrate-tokens.js', desc: 'Migrate between token formats' },
  name: { script: 'tools/semantic-naming.js', desc: 'Generate semantic names for colors' },
  screenshot: { script: 'tools/capture-screenshots.js', desc: 'Capture screenshots' },

  // CI/CD
  ci: { script: 'ci/ci-compare.js', desc: 'CI/CD comparison with exit codes' },
  pr: { script: 'ci/pr-automation.js', desc: 'Generate PR description' },
  test: { script: 'ci/visual-regression.js', desc: 'Visual regression testing' },
  watch: { script: 'ci/watch-design-system.js', desc: 'Watch for design changes' },
  version: { script: 'ci/design-versioning.js', desc: 'Design system versioning' },
};

// ANSI colors
const c = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function printHeader() {
  console.log(`
${c.cyan}┌─────────────────────────────────────┐
│  ${c.bold}Impression${c.reset}${c.cyan} Design System Toolkit  │
│  v3.0.0                             │
└─────────────────────────────────────┘${c.reset}
`);
}

function printUsage() {
  printHeader();
  console.log(`${c.bold}Usage:${c.reset}
  impression <command> [options]

${c.bold}Core Commands:${c.reset}
  ${c.green}extract${c.reset}       Extract design system from URL
  ${c.green}compare${c.reset}       Compare project against reference
  ${c.green}implement${c.reset}     Generate implementation plan

${c.bold}Generate Commands:${c.reset}
  ${c.green}generate tailwind${c.reset}    Tailwind config
  ${c.green}generate css${c.reset}         CSS variables
  ${c.green}generate shadcn${c.reset}      shadcn/ui theme
  ${c.green}generate w3c${c.reset}         W3C Design Tokens
  ${c.green}generate figma${c.reset}       Figma Variables
  ${c.green}generate components${c.reset}  React/Vue/Svelte components
  ${c.green}generate style-guide${c.reset} HTML/Markdown documentation
  ${c.green}generate storybook${c.reset}   Storybook stories

${c.bold}Tool Commands:${c.reset}
  ${c.green}blend${c.reset}         Blend multiple design systems
  ${c.green}migrate${c.reset}       Convert between token formats
  ${c.green}name${c.reset}          Generate semantic color names

${c.bold}CI/CD Commands:${c.reset}
  ${c.green}ci${c.reset}            CI comparison with exit codes
  ${c.green}pr${c.reset}            Generate PR description
  ${c.green}test${c.reset}          Visual regression testing
  ${c.green}watch${c.reset}         Watch for design changes
  ${c.green}version${c.reset}       Design system versioning

${c.bold}Examples:${c.reset}
  ${c.dim}# Compare project against Linear design${c.reset}
  impression compare ./my-project references/linear.json

  ${c.dim}# Generate Tailwind config${c.reset}
  impression generate tailwind design-system.json

  ${c.dim}# Watch for changes${c.reset}
  impression watch design.json baseline.json

${c.dim}Run 'impression help <command>' for detailed help${c.reset}
`);
}

function printCommandHelp(cmd) {
  const command = COMMANDS[cmd];
  if (!command) {
    console.error(`Unknown command: ${cmd}`);
    console.log(`Run 'impression help' for available commands`);
    process.exit(1);
  }

  if (command.subcommands) {
    console.log(`\n${c.bold}impression ${cmd}${c.reset} - ${command.desc}\n`);
    console.log(`${c.bold}Subcommands:${c.reset}`);
    for (const [sub, info] of Object.entries(command.subcommands)) {
      console.log(`  ${c.green}${sub}${c.reset}  ${c.dim}${info.desc}${c.reset}`);
    }
    console.log(`\n${c.dim}Run the script directly for full options:${c.reset}`);
    console.log(`  node scripts/generators/generate-<format>.js --help\n`);
  } else {
    // Run the script with --help
    const scriptPath = path.join(SCRIPTS_DIR, command.script);
    spawn('node', [scriptPath, '--help'], { stdio: 'inherit' });
  }
}

function runCommand(cmd, args) {
  let scriptPath;

  // Handle generate subcommands
  if (cmd === 'generate') {
    const subCmd = args[0];
    if (!subCmd) {
      console.error('Missing subcommand. Use: impression generate <format>');
      console.log('Formats: tailwind, css, shadcn, w3c, figma, components, style-guide, storybook');
      process.exit(1);
    }

    const subCommand = COMMANDS.generate.subcommands[subCmd];
    if (!subCommand) {
      console.error(`Unknown format: ${subCmd}`);
      process.exit(1);
    }

    scriptPath = path.join(SCRIPTS_DIR, subCommand.script);
    args = args.slice(1); // Remove subcommand from args
  } else {
    const command = COMMANDS[cmd];
    if (!command) {
      console.error(`Unknown command: ${cmd}`);
      console.log(`Run 'impression help' for available commands`);
      process.exit(1);
    }

    if (command.subcommands) {
      printCommandHelp(cmd);
      return;
    }

    scriptPath = path.join(SCRIPTS_DIR, command.script);
  }

  // Check script exists
  if (!fs.existsSync(scriptPath)) {
    console.error(`Script not found: ${scriptPath}`);
    process.exit(1);
  }

  // Run the script
  const child = spawn('node', [scriptPath, ...args], { stdio: 'inherit' });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}

// Main
const args = process.argv.slice(2);
const cmd = args[0];

if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
  if (args[1]) {
    printCommandHelp(args[1]);
  } else {
    printUsage();
  }
} else if (cmd === '--version' || cmd === '-v') {
  console.log('impression v3.0.0');
} else {
  runCommand(cmd, args.slice(1));
}
