#!/usr/bin/env node
const path = require('path');
const actualScript = path.join(__dirname, 'ci', path.basename(__filename));
module.exports = require(actualScript);
if (require.main === module) {
  require('child_process').fork(actualScript, process.argv.slice(2), { stdio: 'inherit' });
}
