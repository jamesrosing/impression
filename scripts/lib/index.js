/**
 * Impression Shared Utilities
 *
 * Re-exports all shared utilities from lib modules.
 * Import from here to get all utilities in one place.
 *
 * Usage:
 *   const { deltaE2000, getContrastRatio, readJSON } = require('./lib');
 */

const colorUtils = require('./color-utils');
const contrastUtils = require('./contrast-utils');
const fileUtils = require('./file-utils');

module.exports = {
  // Color utilities
  ...colorUtils,

  // Contrast & accessibility utilities
  ...contrastUtils,

  // File utilities
  ...fileUtils,
};
