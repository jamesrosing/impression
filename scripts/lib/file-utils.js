/**
 * Shared File Utilities
 *
 * Common file system operations and project detection functions
 * used across multiple scripts in the Impression toolkit.
 */

const fs = require('fs');
const path = require('path');

// ============ FILE OPERATIONS ============

/**
 * Safely read JSON file
 * @param {string} filePath - Path to JSON file
 * @returns {Object|null} Parsed JSON or null on error
 */
function readJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
}

/**
 * Safely write JSON file with formatting
 * @param {string} filePath - Path to write to
 * @param {Object} data - Data to write
 * @param {number} indent - Indentation spaces (default 2)
 * @returns {boolean} Success status
 */
function writeJSON(filePath, data, indent = 2) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, indent));
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Safely read file contents
 * @param {string} filePath - Path to file
 * @returns {string|null} File contents or null on error
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    return null;
  }
}

/**
 * Safely write file contents
 * @param {string} filePath - Path to write to
 * @param {string} content - Content to write
 * @returns {boolean} Success status
 */
function writeFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Check if path exists
 * @param {string} filePath - Path to check
 * @returns {boolean}
 */
function exists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * Ensure directory exists, create if not
 * @param {string} dirPath - Directory path
 * @returns {boolean} Success status
 */
function ensureDir(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Get all files in directory matching pattern
 * @param {string} dirPath - Directory to scan
 * @param {RegExp} pattern - File pattern to match
 * @param {boolean} recursive - Scan subdirectories
 * @returns {string[]} Matching file paths
 */
function findFiles(dirPath, pattern, recursive = false) {
  const results = [];

  if (!fs.existsSync(dirPath)) return results;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory() && recursive) {
      results.push(...findFiles(fullPath, pattern, recursive));
    } else if (entry.isFile() && pattern.test(entry.name)) {
      results.push(fullPath);
    }
  }

  return results;
}

// ============ PROJECT DETECTION ============

/**
 * Tailwind config file patterns
 */
const TAILWIND_CONFIG_PATTERNS = [
  'tailwind.config.js',
  'tailwind.config.ts',
  'tailwind.config.mjs',
  'tailwind.config.cjs'
];

/**
 * Find Tailwind config in project
 * @param {string} projectPath - Project root path
 * @returns {string|null} Config file path or null
 */
function findTailwindConfig(projectPath) {
  for (const pattern of TAILWIND_CONFIG_PATTERNS) {
    const configPath = path.join(projectPath, pattern);
    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }
  return null;
}

/**
 * Find CSS files in project
 * @param {string} projectPath - Project root path
 * @returns {string[]} Array of CSS file paths
 */
function findCSSFiles(projectPath) {
  const cssFiles = [];

  // Common CSS directories
  const searchDirs = [
    projectPath,
    path.join(projectPath, 'src'),
    path.join(projectPath, 'styles'),
    path.join(projectPath, 'css'),
    path.join(projectPath, 'app'),
    path.join(projectPath, 'public'),
  ];

  for (const dir of searchDirs) {
    if (fs.existsSync(dir)) {
      const files = findFiles(dir, /\.css$/i, true);
      cssFiles.push(...files);
    }
  }

  return [...new Set(cssFiles)]; // Dedupe
}

/**
 * Detect project type from configuration files
 * @param {string} projectPath - Project root path
 * @returns {Object} Project info
 */
function detectProjectType(projectPath) {
  const info = {
    type: 'unknown',
    hasTailwind: false,
    hasCSS: false,
    hasPackageJson: false,
    framework: null,
    configFiles: []
  };

  // Check for Tailwind
  const tailwindConfig = findTailwindConfig(projectPath);
  if (tailwindConfig) {
    info.hasTailwind = true;
    info.configFiles.push(tailwindConfig);
  }

  // Check for CSS files
  const cssFiles = findCSSFiles(projectPath);
  if (cssFiles.length > 0) {
    info.hasCSS = true;
  }

  // Check for package.json
  const packagePath = path.join(projectPath, 'package.json');
  if (fs.existsSync(packagePath)) {
    info.hasPackageJson = true;
    info.configFiles.push(packagePath);

    try {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      // Detect framework
      if (deps['next']) info.framework = 'next';
      else if (deps['nuxt']) info.framework = 'nuxt';
      else if (deps['@angular/core']) info.framework = 'angular';
      else if (deps['vue']) info.framework = 'vue';
      else if (deps['react']) info.framework = 'react';
      else if (deps['svelte']) info.framework = 'svelte';
    } catch (err) {
      // Ignore parse errors
    }
  }

  // Determine primary type
  if (info.hasTailwind) {
    info.type = 'tailwind';
  } else if (info.hasCSS) {
    info.type = 'css';
  }

  return info;
}

// ============ CLI HELPERS ============

/**
 * Parse CLI arguments into options object
 * @param {string[]} args - Process argv slice
 * @param {Object} defaults - Default option values
 * @returns {Object} Parsed options
 */
function parseArgs(args, defaults = {}) {
  const options = { ...defaults, _positional: [] };

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      options[key] = value !== undefined ? value : true;
    } else if (arg.startsWith('-')) {
      options[arg.slice(1)] = true;
    } else {
      options._positional.push(arg);
    }
  }

  return options;
}

/**
 * Print usage message and exit
 * @param {string} usage - Usage string
 * @param {number} code - Exit code
 */
function printUsageAndExit(usage, code = 1) {
  console.error(usage);
  process.exit(code);
}

module.exports = {
  // File operations
  readJSON,
  writeJSON,
  readFile,
  writeFile,
  exists,
  ensureDir,
  findFiles,

  // Project detection
  findTailwindConfig,
  findCSSFiles,
  detectProjectType,
  TAILWIND_CONFIG_PATTERNS,

  // CLI helpers
  parseArgs,
  printUsageAndExit,
};
