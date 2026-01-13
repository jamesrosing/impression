#!/usr/bin/env node
// Backward compatibility wrapper - actual script in ci/
module.exports = require('./ci/visual-regression.js');
if (require.main === module) require('./ci/visual-regression.js');
