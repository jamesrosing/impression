#!/usr/bin/env node
// Backward compatibility wrapper - actual script in generators/
module.exports = require('./generators/generate-component-library.js');
if (require.main === module) require('./generators/generate-component-library.js');
