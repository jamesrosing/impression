#!/usr/bin/env node
// Backward compatibility wrapper - actual script in generators/
module.exports = require('./generators/generate-style-guide.js');
if (require.main === module) require('./generators/generate-style-guide.js');
