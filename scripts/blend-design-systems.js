#!/usr/bin/env node
// Backward compatibility wrapper - actual script in tools/
module.exports = require('./tools/blend-design-systems.js');
if (require.main === module) require('./tools/blend-design-systems.js');
