#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { TextDecoder } = require('util');

const projectRoot = path.resolve(__dirname, '..');
const decoder = new TextDecoder('utf-8', { fatal: true });

const includeRoots = [
  path.join(projectRoot, 'lambda'),
  path.join(projectRoot, 'skill-package'),
  path.join(projectRoot, 'scripts'),
  path.join(projectRoot, 'README.md')
];

const includeExt = new Set(['.js', '.json', '.md', '.ps1', '.txt', '.yml', '.yaml']);
const skipDirNames = new Set(['node_modules', '.ask', '.git']);
const skipFileNames = new Set(['package-lock.json', '.package-lock.json']);

const replacementCharPattern = /\uFFFD/g;
const mojibakePattern = /[\u00C2\u00C3][\u0080-\u00BF]|[\u00E2][\u0080-\u00BF][\u0080-\u00BF]/g;

function collectFiles(targetPath, result) {
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    const ext = path.extname(targetPath).toLowerCase();
    const base = path.basename(targetPath);
    if (includeExt.has(ext) && !skipFileNames.has(base)) {
      result.push(targetPath);
    }
    return;
  }

  if (!stat.isDirectory()) {
    return;
  }

  const baseName = path.basename(targetPath);
  if (skipDirNames.has(baseName)) {
    return;
  }

  for (const entry of fs.readdirSync(targetPath)) {
    collectFiles(path.join(targetPath, entry), result);
  }
}

const files = [];
for (const root of includeRoots) {
  if (fs.existsSync(root)) {
    collectFiles(root, files);
  }
}

const errors = [];
for (const file of files) {
  const abs = path.resolve(file);
  const rel = path.relative(projectRoot, abs);
  const buffer = fs.readFileSync(abs);

  let text;
  try {
    text = decoder.decode(buffer);
  } catch (err) {
    errors.push(`${rel}: invalid UTF-8 bytes (${err.message})`);
    continue;
  }

  const replacementHits = text.match(replacementCharPattern);
  if (replacementHits && replacementHits.length > 0) {
    errors.push(`${rel}: found replacement character U+FFFD`);
  }

  const mojibakeHits = text.match(mojibakePattern);
  if (mojibakeHits && mojibakeHits.length > 0) {
    const sample = [...new Set(mojibakeHits)].slice(0, 5).join(', ');
    errors.push(`${rel}: possible mojibake detected (${sample})`);
  }
}

if (errors.length > 0) {
  console.error('Encoding/text validation failed:');
  for (const err of errors) {
    console.error(`- ${err}`);
  }
  process.exit(1);
}

console.log(`Encoding validation OK (${files.length} files).`);
