#!/usr/bin/env node
// Backward compatibility wrapper - actual script in tools/
module.exports = require('./tools/semantic-naming.js');
if (require.main === module) require('./tools/semantic-naming.js');
