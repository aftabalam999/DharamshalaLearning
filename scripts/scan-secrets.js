#!/usr/bin/env node
// Small local scanner to detect common secret patterns in the repository.
// Exits with code 1 if any matches are found.

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const ignoreDirs = new Set(['node_modules', '.git', 'build', '.github']);

const patterns = [
  { name: 'Discord Webhook', re: /https:\/\/discord\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_\-]+/g },
  { name: 'Firebase API Key (AIza)', re: /AIza[0-9A-Za-z_\-]{20,}/g },
  { name: 'Google Service Account JSON (type \'service_account\')', re: /"type"\s*:\s*"service_account"/g },
  { name: 'Possible Base64 JSON blob', re: /[A-Za-z0-9_\-]{40,}\.[A-Za-z0-9_\-]{40,}/g }
];

let findings = [];

function scanFile(filePath) {
  try {
    const txt = fs.readFileSync(filePath, 'utf8');
    patterns.forEach(p => {
      const matches = txt.match(p.re);
      if (matches && matches.length) {
        matches.forEach(m => findings.push({ file: filePath, pattern: p.name, match: m }));
      }
    });
  } catch (e) {
    // ignore binary or unreadable files
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (ignoreDirs.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full);
    } else if (e.isFile()) {
      // skip typical large/binary files
      if (/\.(png|jpg|jpeg|gif|ico|zip|tgz|gz|exe|dll|so|dylib)$/i.test(e.name)) continue;
      scanFile(full);
    }
  }
}

console.log('🔎 Running secret scan...');
walk(repoRoot);

if (findings.length === 0) {
  console.log('✅ No obvious secrets detected by patterns.');
  process.exit(0);
} else {
  console.error(`❌ Found ${findings.length} potential secret(s):`);
  findings.slice(0, 200).forEach(f => {
    console.error(`- ${f.pattern} in ${path.relative(repoRoot, f.file)} -> ${f.match}`);
  });
  console.error('\nPlease remove/rotate these secrets and replace them with placeholders or use environment variables.');
  process.exit(1);
}
