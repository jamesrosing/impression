#!/usr/bin/env node
// Backward compatibility wrapper - actual script in generators/
module.exports = require('./generators/generate-figma-tokens.js');
if (require.main === module) require('./generators/generate-figma-tokens.js');
