#!/usr/bin/env node
// Backward compatibility wrapper - actual script in ci/
module.exports = require('./ci/watch-design-system.js');
if (require.main === module) require('./ci/watch-design-system.js');
