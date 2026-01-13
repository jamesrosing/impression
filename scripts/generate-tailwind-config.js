#!/usr/bin/env node
// Backward compatibility wrapper - actual script in generators/
module.exports = require('./generators/generate-tailwind-config.js');
if (require.main === module) require('./generators/generate-tailwind-config.js');
