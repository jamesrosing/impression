#!/usr/bin/env node
// Backward compatibility wrapper - actual script in ci/
module.exports = require('./ci/ci-compare.js');
if (require.main === module) require('./ci/ci-compare.js');
