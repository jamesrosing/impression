#!/usr/bin/env node
// Backward compatibility wrapper - actual script in generators/
module.exports = require('./generators/generate-storybook.js');
if (require.main === module) require('./generators/generate-storybook.js');
