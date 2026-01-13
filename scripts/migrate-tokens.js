#!/usr/bin/env node
// Backward compatibility wrapper - actual script in tools/
module.exports = require('./tools/migrate-tokens.js');
if (require.main === module) require('./tools/migrate-tokens.js');
