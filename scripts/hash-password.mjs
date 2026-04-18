#!/usr/bin/env node
// Usage: node scripts/hash-password.mjs "mypassword"
import bcrypt from 'bcryptjs';
const pw = process.argv[2];
if (!pw) {
  console.error('usage: node scripts/hash-password.mjs <password>');
  process.exit(1);
}
console.log(bcrypt.hashSync(pw, 10));
