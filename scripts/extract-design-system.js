#!/usr/bin/env node
// Backward compatibility wrapper - actual script in core/
module.exports = require('./core/extract-design-system.js');
if (require.main === module) require('./core/extract-design-system.js');
