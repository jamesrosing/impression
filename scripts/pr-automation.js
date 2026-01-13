#!/usr/bin/env node
// Backward compatibility wrapper - actual script in ci/
module.exports = require('./ci/pr-automation.js');
if (require.main === module) require('./ci/pr-automation.js');
