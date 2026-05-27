#!/usr/bin/env node

/**
 * code-snapshot — Merge your codebase into one text block for AI agents.
 *
 * Stop manually copying files into ChatGPT/Claude Code/Codex.
 * Just run: snap <dir>
 *
 * Features:
 *   - Walks directory tree, respects .gitignore
 *   - Labels each file with path and language
 *   --git-only  Only include files changed since last commit
 *   --minify    Strip blank lines and comments (reduces token count)
 *   --out       Write to file instead of stdout
 *   --copy      Copy to clipboard (macOS/Linux)
 */

import fs from 'node:fs';
import { execSync } from 'node:child_process';

const LANGUAGE_MAP = {
  '.js':'JavaScript','.ts':'TypeScript','.jsx':'React JSX','.tsx':'React TSX',
  '.py':'Python','.go':'Go','.rs':'Rust','.rb':'Ruby','.java':'Java',
  '.cs':'C#','.c':'C','.cpp':'C++','.php':'PHP','.swift':'Swift','.kt':'Kotlin',
  '.sh':'Bash','.bash':'Bash','.zsh':'Zsh','.fish':'Fish',
  '.yaml':'YAML','.yml':'YAML','.json':'JSON','.xml':'XML','.toml':'TOML',
  '.md':'Markdown','.mdx':'MDX','.sql':'SQL','.graphql':'GraphQL','.gql':'GraphQL',
  '.html':'HTML','.css':'CSS','.scss':'SCSS','.less':'Less','.sass':'Sass',
  '.vue':'Vue','.svelte':'Svelte','.astro':'Astro','.svg':'SVG',
  '.dockerfile':'Dockerfile','.tf':'Terraform','.pkl':'Pkl',
  '.gradle':'Gradle','.properties':'Properties',
  '.env':'ENV','.ini':'INI','.cfg':'Config','.conf':'Config',
  '.lock':'Lockfile','.txt':'Text','.csv':'CSV',
};

const DEFAULTS = { maxSizeBytes: 512 * 1024, maxDepth: 8 };

function help() {
  console.log(`
code-snapshot — merge codebase into one text block for AI agents

Usage:
  snap <path>                  Snapshot a file or directory
  snap <path> -o output.txt    Write to file
  snap <path> --git-only       Only changed files (git diff)
  snap <path> --minify         Strip blank lines and comments
  snap <path> --copy           Copy to clipboard (macOS: pbcopy)
  snap <path> --no-binary      Skip binary files (default)
  snap --help                  Show this help

Options:
  -o, --out <file>         Output file path
  --git-only               Only git-modified files
  --minify                 Remove blank lines + single-line comments
  --copy                   Copy to clipboard (requires pbcopy/xclip)
  --no-binary              Skip binary files (default: true)
  --max-size <bytes>       Max file size to include (default: 512KB)
  --include <glob>         Only include matching patterns (comma-sep)
  --exclude <glob>         Exclude patterns (comma-sep, overrides include)
  --no-gitignore           Don't read .gitignore
`);
}

function parseArgs(argv) {
  const a = { files:[], out:null, gitOnly:false, minify:false, copy:false, noBinary:true, maxSize:DEFAULTS.maxSizeBytes, include:null, exclude:null, gitignore:true };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') { a.help = true; }
    else if ((arg === '-o' || arg === '--out') && argv[i+1]) { a.out = argv[++i]; }
    else if (arg === '--git-only') { a.gitOnly = true; }
    else if (arg === '--minify') { a.minify = true; }
    else if (arg === '--copy') { a.copy = true; }
    else if (arg === '--no-binary') { a.noBinary = true; }
    else if (arg === '--no-gitignore') { a.gitignore = false; }
    else if ((arg === '--max-size') && argv[i+1]) { a.maxSize = parseInt(argv[++i]) || DEFAULTS.maxSizeBytes; }
    else if ((arg === '--include' || arg === '--filter') && argv[i+1]) { a.include = argv[++i]; }
    else if ((arg === '--exclude' || arg === '--ignore') && argv[i+1]) { a.exclude = argv[++i]; }
    else if (arg.startsWith('-')) { console.error('Unknown:', arg); process.exit(1); }
    else { a.files.push(arg); }
  }
  return a;
}

function loadGitignore(root) {
  const patterns = ['node_modules','.git','.DS_Store','dist','build','.next','.cache','__pycache__','*.pyc','.venv','venv','env','.env','coverage','*.log','.gitignore'];
  try { patterns.push(...fs.readFileSync(root+'/.gitignore','utf-8').split('\n').filter(l => l.trim() && !l.startsWith('#')).map(l => l.replace(/\/$/, ''))); } catch {}
  return patterns;
}

function matchesGlob(path, patterns) {
  if (!patterns) return false;
  for (const p of patterns.split(',').map(s => s.trim().replace(/^\*\./, '.').replace(/\*/g, '.*'))) {
    // detect if glob has path separator
    const hasSlash = p.includes('/');
    const name = path.split('/').pop() || path;
    const target = hasSlash ? path : name;
    try { if (new RegExp('^' + p.replace(/\./g,'\\.').replace(/\*/g,'.*') + '$').test(target)) return true; } catch {}
    try { if (new RegExp(p).test(target)) return true; } catch {}
  }
  return false;
}

function walk(root, opts, depth = 0) {
  if (depth > opts.maxDepth) return [];
  let results = [];
  try {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      const full = root + '/' + entry.name;
      const rel = full.replace(/^\.\//, '');
      if (entry.isDirectory()) {
        const name = entry.name;
        if (opts.gitignore.includes(name) || name.startsWith('.')) continue;
        results = results.concat(walk(full, opts, depth + 1));
      } else if (entry.isFile()) {
        // Skip if excluded
        if (opts.gitignore.includes(entry.name)) continue;
        if (opts.gitignore.length) {
          let skip = false;
          for (const p of opts.gitignore) {
            if (entry.name === p || entry.name.endsWith(p)) { skip = true; break; }
          }
          if (skip) continue;
        }
        // Check include/exclude
        if (opts.include && !matchesGlob(rel, opts.include)) continue;
        if (opts.exclude && matchesGlob(rel, opts.exclude)) continue;
        // Check size
        try {
          const stat = fs.statSync(full);
          if (stat.size > opts.maxSize) continue;
          if (stat.size === 0) continue;
        } catch { continue; }
        results.push(full);
      }
    }
  } catch {}
  return results;
}

function isBinary(buf, path) {
  const ext = path.split('.').pop()?.toLowerCase();
  const textExts = ['js','ts','jsx','tsx','py','go','rs','rb','java','cs','c','cpp','php','swift','kt','sh','bash','zsh','yaml','yml','json','xml','toml','md','mdx','sql','graphql','gql','html','css','scss','less','sass','vue','svelte','astro','svg','dockerfile','tf','pkl','gradle','properties','env','ini','cfg','conf','txt','csv','lock','gitignore','editorconfig','prettierrc','eslintrc','babelrc','npmrc','gitkeep','gitattributes'];
  if (textExts.includes(ext || '')) return false;
  // Check for null bytes (binary indicator)
  return buf.includes(0);
}

function getGitChanged(root) {
  try {
    const out = execSync('git diff --name-only --diff-filter=MAR', { cwd: root, encoding: 'utf-8', stdio: ['pipe','pipe','pipe'] });
    const files = out.trim().split('\n').filter(Boolean);
    // Also include unstaged
    const untracked = execSync('git ls-files --others --exclude-standard', { cwd: root, encoding: 'utf-8', stdio: ['pipe','pipe','pipe'] });
    files.push(...untracked.trim().split('\n').filter(Boolean));
    return files.map(f => root + '/' + f);
  } catch {
    console.error('Warning: not a git repo or git not available');
    return [];
  }
}

function minifyCode(code, ext) {
  // Strip blank lines
  let lines = code.split('\n').filter(l => l.trim() !== '');
  // Strip single-line comments (for some languages)
  if (['js','ts','jsx','tsx','java','c','cpp','cs','go','rs','php','swift','kt'].includes(ext)) {
    lines = lines.filter(l => !l.trim().startsWith('//'));
  } else if (['py','rb','sh','bash','yaml','yml'].includes(ext)) {
    lines = lines.filter(l => !l.trim().startsWith('#'));
  } else if (['html','vue','svelte'].includes(ext)) {
    lines = lines.filter(l => !l.trim().startsWith('<!--'));
  }
  return lines.join('\n');
}

function formatFile(path, opts) {
  const buf = fs.readFileSync(path);
  const ext = path.split('.').pop()?.toLowerCase() || '';
  if (opts.noBinary && isBinary(buf, path)) return null;
  let code = buf.toString('utf-8');
  const lang = LANGUAGE_MAP['.' + ext] || ext || 'text';
  if (opts.minify) code = minifyCode(code, ext);
  const rel = path.replace(/^\.\//, '');
  return `\n// [FILE] ${rel}\n// [LANG] ${lang}\n// [SIZE] ${code.length} chars\n${code}\n// [/FILE] ${rel}\n`;
}

function buildHeader(files, opts) {
  const h = [];
  h.push('='.repeat(60));
  h.push('CODE SNAPSHOT');
  h.push('='.repeat(60));
  h.push(`Generated: ${new Date().toISOString()}`);
  h.push(`Total files: ${files.length}`);
  h.push(`Options: git-only=${opts.gitOnly} minify=${opts.minify} max-size=${opts.maxSize}`);
  h.push(`Intended for: AI agents (Claude Code, ChatGPT, Codex, etc.)`);
  h.push('='.repeat(60));
  h.push('');
  return h.join('\n');
}

function buildFooter() {
  return '\n' + '='.repeat(60) + '\nEND OF SNAPSHOT\n' + '='.repeat(60) + '\n';
}

async function main() {
  const a = parseArgs(process.argv);
  if (a.help) { help(); process.exit(0); }

  let root = '.';
  if (a.files.length === 0) {
    a.files.push('.');
  }
  root = a.files[0];

  // Resolve single file or directory
  let files = [];
  try {
    const stat = fs.statSync(root);
    if (stat.isFile()) {
      files = [root];
    } else if (stat.isDirectory()) {
      const opts = { gitignore: a.gitignore ? loadGitignore(root) : [], maxSize: a.maxSize, include: a.include, exclude: a.exclude, maxDepth: DEFAULTS.maxDepth };
      if (a.gitOnly) {
        files = getGitChanged(root);
      } else {
        files = walk(root, opts);
      }
      files = files.filter((f, i) => files.indexOf(f) === i); // dedupe
    }
  } catch (e) {
    console.error('Error accessing path:', root, '-', e.message);
    process.exit(1);
  }

  if (files.length === 0) {
    console.error('No files found.');
    process.exit(1);
  }

  console.log(`📸 code-snapshot: scanning ${files.length} file(s)...\n`);

  let output = buildHeader(files, a);
  let count = 0;
  for (const file of files) {
    try {
      const block = formatFile(file, a);
      if (block) {
        output += block;
        count++;
      }
    } catch (e) {
      console.error(`  ⚠ Skipping ${file}: ${e.message}`);
    }
  }
  output += buildFooter();

  output += `\nSummary: ${count} files, ${output.length} chars (~${Math.ceil(output.length / 4)} tokens)\n`;

  if (a.out) {
    fs.writeFileSync(a.out, output, 'utf-8');
    console.log(`✅ Written to ${a.out} (${output.length} chars)`);
  } else if (a.copy) {
    try {
      const proc = execSync('pbcopy 2>/dev/null || xclip -selection clipboard 2>/dev/null || xsel -b 2>/dev/null || echo "no-clipboard"', { input: output, encoding: 'utf-8', stdio: ['pipe','pipe','pipe'] });
      if (proc?.stderr?.includes('no-clipboard')) throw new Error('no clipboard');
      console.log(`✅ Copied to clipboard (${output.length} chars)`);
    } catch {
      console.log(output);
      console.log('⚠ Clipboard not available, printed to stdout instead.');
    }
  } else {
    console.log(output);
  }

  console.log(`\n📊 Stats: ${count}/${files.length} files, ${output.length} chars, ~${Math.ceil(output.length / 4)} tokens`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
