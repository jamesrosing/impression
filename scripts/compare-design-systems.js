#!/usr/bin/env node
// Backward compatibility wrapper - actual script in core/
module.exports = require('./core/compare-design-systems.js');
if (require.main === module) require('./core/compare-design-systems.js');
