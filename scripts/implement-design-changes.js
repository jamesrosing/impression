#!/usr/bin/env node
// Backward compatibility wrapper - actual script in core/
module.exports = require('./core/implement-design-changes.js');
if (require.main === module) require('./core/implement-design-changes.js');
