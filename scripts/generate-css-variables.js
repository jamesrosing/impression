#!/usr/bin/env node
// Backward compatibility wrapper - actual script in generators/
module.exports = require('./generators/generate-css-variables.js');
if (require.main === module) require('./generators/generate-css-variables.js');
