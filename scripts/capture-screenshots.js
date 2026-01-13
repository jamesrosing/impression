#!/usr/bin/env node
// Backward compatibility wrapper - actual script in tools/
module.exports = require('./tools/capture-screenshots.js');
if (require.main === module) require('./tools/capture-screenshots.js');
