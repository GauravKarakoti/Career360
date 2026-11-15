#!/usr/bin/env node
// Fails when a locale catalog is missing keys that the source (en) catalog has,
// or when a catalog carries keys that no other locale knows about.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'messages');
const load = (locale) => JSON.parse(readFileSync(join(dir, `${locale}.json`), 'utf8'));

const en = load('en');
const enKeys = Object.keys(en).sort();
const problems = [];

for (const locale of ['hi']) {
  const catalog = load(locale);
  const keys = Object.keys(catalog).sort();
  const missing = enKeys.filter((key) => !(key in catalog));
  if (missing.length) problems.push(`${locale}: missing keys: ${missing.join(', ')}`);
  const unknown = keys.filter((key) => !(key in en));
  if (unknown.length) problems.push(`${locale}: unknown keys: ${unknown.join(', ')}`);
  for (const key of keys.filter((key) => key in en)) {
    if (typeof catalog[key] !== 'string' || !catalog[key].trim()) {
      problems.push(`${locale}: empty value for ${key}`);
    }
  }
}

// ICU plural catalogs must offer an `other` case so any count renders.
for (const [locale, catalog] of Object.entries({ en, hi: load('hi') })) {
  for (const [key, value] of Object.entries(catalog)) {
    if (value.includes('{count, plural') && !/(?:^|[ ])other\s*\{/.test(value)) {
      problems.push(`${locale}: ${key} has an ICU plural without an "other" case`);
    }
  }
}

if (problems.length) {
  console.error(`i18n catalog check failed:\n${problems.map((line) => `  - ${line}`).join('\n')}`);
  process.exit(1);
}
console.log(`i18n catalog check passed: ${enKeys.length} keys; en complete, hi complete.`);
