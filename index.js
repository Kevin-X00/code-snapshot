#!/usr/bin/env node

/**
 * code-snapshot — Merge your codebase into one text block for AI agents.
 *
 * Just run: snap <dir>
 *   npm install -g @kevinxyz/code-snapshot
 *
 * v2.0.0 — Enhanced Edition
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createInterface } from 'node:readline';

// ─── Language map ────────────────────────────────────────────────────────────

const LANGUAGE_MAP = {
  '.js':'JavaScript','.ts':'TypeScript','.jsx':'React JSX','.tsx':'React TSX',
  '.mjs':'JavaScript','.cjs':'JavaScript','.mts':'TypeScript','.cts':'TypeScript',
  '.py':'Python','.go':'Go','.rs':'Rust','.rb':'Ruby','.java':'Java',
  '.cs':'C#','.c':'C','.cpp':'C++','.h':'C/C++ Header','.hpp':'C++ Header',
  '.php':'PHP','.swift':'Swift','.kt':'Kotlin','.kts':'Kotlin Script',
  '.sh':'Bash','.bash':'Bash','.zsh':'Zsh','.fish':'Fish',
  '.yaml':'YAML','.yml':'YAML','.json':'JSON','.jsonc':'JSONC','.json5':'JSON5',
  '.xml':'XML','.toml':'TOML','.plist':'Plist',
  '.md':'Markdown','.mdx':'MDX','.sql':'SQL','.graphql':'GraphQL','.gql':'GraphQL',
  '.html':'HTML','.css':'CSS','.scss':'SCSS','.less':'Less','.sass':'Sass',
  '.vue':'Vue','.svelte':'Svelte','.astro':'Astro','.svg':'SVG',
  '.dockerfile':'Dockerfile','.tf':'Terraform','.tfvars':'Terraform Variables','.pkl':'Pkl',
  '.gradle':'Gradle','.gradle.kts':'Gradle Kotlin','.properties':'Properties',
  '.env':'ENV','.env.example':'ENV Example','.ini':'INI','.cfg':'Config','.conf':'Config',
  '.lock':'Lockfile','.txt':'Text','.csv':'CSV','.tsv':'TSV',
  '.prisma':'Prisma','.proto':'Protobuf','.sol':'Solidity',
  '.zig':'Zig','.ex':'Elixir','.exs':'Elixir Script','.erl':'Erlang',
  '.dart':'Dart','.r':'R','.jl':'Julia','.nim':'Nim',
};

const DEFAULTS = { maxSizeBytes: 512 * 1024, maxDepth: 20 };

// ─── CLI args ────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const a = {
    files:[], out:null, gitOnly:false, minify:false, copy:false,
    noBinary:true, maxSize:DEFAULTS.maxSizeBytes,
    include:null, exclude:null, gitignore:true,
    interactive:false, topFiles:false, sortBy:'alpha',
    format:'marker', respectSnapignore:true,
    tokenCount:false, json:false,
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') { a.help = true; }
    else if ((arg === '-o' || arg === '--out') && argv[i+1]) { a.out = argv[++i]; }
    else if (arg === '--git-only') { a.gitOnly = true; }
    else if (arg === '--minify') { a.minify = true; }
    else if (arg === '--copy') { a.copy = true; }
    else if (arg === '--no-binary') { a.noBinary = false; }
    else if (arg === '--no-gitignore') { a.gitignore = false; }
    else if (arg === '--interactive' || arg === '-i') { a.interactive = true; }
    else if (arg === '--top-files') { a.topFiles = true; }
    else if ((arg === '--max-size') && argv[i+1]) { a.maxSize = parseInt(argv[++i]) || DEFAULTS.maxSizeBytes; }
    else if ((arg === '--include' || arg === '--filter') && argv[i+1]) { a.include = argv[++i]; }
    else if ((arg === '--exclude' || arg === '--ignore') && argv[i+1]) { a.exclude = argv[++i]; }
    else if (arg === '--tokens') { a.tokenCount = true; }
    else if (arg === '--json') { a.json = true; }
    else if ((arg === '--sort') && argv[i+1]) { a.sortBy = argv[++i]; }
    else if ((arg === '--format' || arg === '-f') && argv[i+1]) { a.format = argv[++i]; }
    else if (arg.startsWith('-')) { console.error('Unknown:', arg); process.exit(1); }
    else { a.files.push(arg); }
  }
  return a;
}

// ─── Help ────────────────────────────────────────────────────────────────────

function help() {
  console.log(`
📸 code-snapshot v2 — Merge codebase into one text block for AI agents

Usage:
  snap <path>                  Snapshot a file or directory
  snap <path> -o output.txt    Write to file
  snap <path> --git-only       Only changed files since last commit
  snap <path> --minify         Strip blank lines and single-line comments
  snap <path> --tokens         Show estimated token count
  snap <path> --copy           Copy to clipboard (macOS: pbcopy)
  snap <path> -i               Interactive file picker
  snap <path> --top-files      Show largest files before generating
  snap <path> --json           Output as JSON (machine-readable)
  snap --help                  Show this help

Format options:
  --format marker              [FILE] markers (default)
  --format xml                 XML tags
  --format plain               Plain file separators

Filter options:
  --include "*.js,*.ts"        Only matching patterns
  --exclude "*.test.*"         Exclude patterns (overrides defaults)
  --max-size 1048576           Max file size in bytes (default: 512KB)
  --sort alpha|size|type       Sort output files

Examples:
  snap ./src | claude                     # Pipe to Claude
  snap . --git-only -o diff.txt           # Changed files
  snap . -i --tokens                      # Interactive + token estimate
`);
}

// ─── .snapignore support ─────────────────────────────────────────────────────

function loadIgnorePatterns(root) {
  const patterns = [
    'node_modules','.git','.DS_Store','dist','build','.next','.cache',
    '__pycache__','*.pyc','.venv','venv','env','.env','coverage',
    '*.log','*.pid','*.seed','*.min.js','*.min.css',
    'package-lock.json','yarn.lock','pnpm-lock.yaml',
    '*.svg','*.ico','*.png','*.jpg','*.jpeg','*.gif','*.webp',
    '.gitignore',
  ];
  // Load .gitignore
  try {
    const gi = fs.readFileSync(path.join(root, '.gitignore'), 'utf-8');
    patterns.push(...gi.split('\n')
      .filter(l => l.trim() && !l.startsWith('#'))
      .map(l => l.replace(/\/$/, '').replace(/^\//, '')));
  } catch {}
  // Load .snapignore (if exists)
  try {
    const si = fs.readFileSync(path.join(root, '.snapignore'), 'utf-8');
    patterns.push(...si.split('\n')
      .filter(l => l.trim() && !l.startsWith('#')));
  } catch {}
  return [...new Set(patterns)];
}

// ─── Glob matching ───────────────────────────────────────────────────────────

function matchesGlob(name, patterns) {
  if (!patterns) return false;
  const parts = patterns.split(',').map(s => s.trim());
  for (const p of parts) {
    if (!p) continue;
    // Direct match
    if (name === p || name.endsWith('/' + p)) return true;
    // Simple glob
    const hasSlash = p.includes('/') || p.startsWith('**');
    const target = hasSlash ? name : path.basename(name);
    try {
      const regexStr = '^' + p
        .replace(/\./g, '\\.')
        .replace(/\*\*/g, '<<<GLOBSTAR>>>')
        .replace(/\*/g, '[^/]*')
        .replace(/<<<GLOBSTAR>>>/g, '.*')
        .replace(/\?/g, '.')
        + '$';
      if (new RegExp(regexStr).test(target)) return true;
    } catch {}
  }
  return false;
}

// ─── Directory walk ──────────────────────────────────────────────────────────

function walk(root, opts, depth = 0) {
  if (depth > opts.maxDepth) return [];
  let results = [];
  try {
    const entries = fs.readdirSync(root, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(root, entry.name);
      const rel = path.relative(opts.baseDir || root, full);
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') && entry.name !== '.') continue;
        if (opts.ignore.includes(entry.name)) continue;
        if (matchesGlob(rel, opts.exclude)) continue;
        results = results.concat(walk(full, opts, depth + 1));
      } else if (entry.isFile()) {
        if (entry.name.startsWith('.')) continue;
        if (opts.ignore.includes(entry.name)) continue;
        if (matchesGlob(rel, opts.exclude)) continue;
        if (opts.include && !matchesGlob(rel, opts.include)) continue;
        try {
          const stat = fs.statSync(full);
          if (stat.size === 0 || stat.size > opts.maxSize) continue;
        } catch { continue; }
        results.push(full);
      }
    }
  } catch {}
  return results;
}

// ─── Git-only files ──────────────────────────────────────────────────────────

function getGitChanged(root) {
  try {
    const out = execSync('git diff --name-only --diff-filter=MAR', {
      cwd: root, encoding: 'utf-8', stdio: ['pipe','pipe','pipe'],
    });
    const files = out.trim().split('\n').filter(Boolean);
    const untracked = execSync('git ls-files --others --exclude-standard', {
      cwd: root, encoding: 'utf-8', stdio: ['pipe','pipe','pipe'],
    });
    files.push(...untracked.trim().split('\n').filter(Boolean));
    return files.map(f => path.resolve(root, f)).filter(f => fs.existsSync(f));
  } catch {
    return [];
  }
}

// ─── Binary detection ────────────────────────────────────────────────────────

function isBinary(buf, filePath) {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const textExts = new Set([
    'js','ts','jsx','tsx','mjs','cjs','mts','cts','py','go','rs','rb','java',
    'cs','c','cpp','h','hpp','php','swift','kt','kts','sh','bash','zsh','fish',
    'yaml','yml','json','jsonc','json5','xml','toml','plist',
    'md','mdx','sql','graphql','gql','html','css','scss','less','sass',
    'vue','svelte','astro','svg','dockerfile','tf','tfvars','pkl',
    'gradle','properties','env','ini','cfg','conf','txt','csv','tsv',
    'lock','prisma','proto','sol','zig','ex','exs','erl','dart','r','jl','nim',
  ]);
  if (textExts.has(ext)) return false;
  return buf.includes(0);
}

// ─── Minification ────────────────────────────────────────────────────────────

function minifyCode(code, ext) {
  const lang = ext.toLowerCase();
  let lines = code.split('\n');

  const singleLineCommentLangs = new Set([
    'js','ts','jsx','tsx','java','c','cpp','cs','go','rs','php','swift','kt',
    'dart','zig','nim',
  ]);
  const hashCommentLangs = new Set([
    'py','rb','sh','bash','zsh','fish','yaml','yml','r','jl',
    'dockerfile','tf','tfvars','pkl','prisma',
  ]);
  const htmlCommentLangs = new Set(['html','vue','svelte','astro','xml','mdx']);

  lines = lines.filter(l => l.trim() !== '');
  if (singleLineCommentLangs.has(lang)) {
    lines = lines.filter(l => !l.trim().startsWith('//'));
  } else if (hashCommentLangs.has(lang)) {
    lines = lines.filter(l => !l.trim().startsWith('#'));
  } else if (htmlCommentLangs.has(lang)) {
    lines = lines.filter(l => !l.trim().startsWith('<!--'));
  }
  return lines.join('\n');
}

// ─── Token estimation (cl100k_base encoding) ────────────────────────────────

function estimateTokens(text) {
  let tokens = 0;
  for (let i = 0; i < text.length; i++) {
    const cp = text.codePointAt(i);
    if (cp === undefined) continue;
    if (cp < 0x80) tokens += cp <= 0x7f ? 1 : 2;       // ASCII
    else if (cp < 0x800) tokens += 2;                    // 2-byte UTF-8
    else if (cp < 0x10000) tokens += 3;                  // 3-byte UTF-8
    else { tokens += 4; i++; }                           // surrogate pair
  }
  return Math.ceil(tokens * 0.25); // ~4 chars per token
}

// ─── Stream helper for large files ───────────────────────────────────────────

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

// ─── Output formatters ───────────────────────────────────────────────────────

function formatFile(filePath, opts, content) {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const lang = LANGUAGE_MAP['.' + ext] || ext || 'text';
  const rel = path.relative(opts.baseDir, filePath);
  const chars = content.length;
  const tokens = estimateTokens(content);

  switch (opts.format) {
    case 'xml':
      return `<file path="${rel}" language="${lang}" size="${chars}" tokens="${tokens}">\n${content}\n</file>`;
    case 'plain':
      return `\n--- ${rel} (${lang}) ---\n${content}\n`;
    case 'marker':
    default:
      return `\n// [FILE] ${rel}\n// [LANG] ${lang}\n// [SIZE] ${chars} chars | ~${tokens} tokens\n${content}\n// [/FILE] ${rel}\n`;
  }
}

// ─── Interactive picker ──────────────────────────────────────────────────────

async function interactivePicker(files, opts) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const question = (q) => new Promise(r => rl.question(q, r));

  console.log(`\n📋 ${files.length} files found. Select output format:`);
  console.log('  1) All files (default)');
  console.log('  2) Top 10 largest files');
  console.log('  3) Top 20 largest files');
  console.log('  4) Custom file count');
  const ans = (await question('\nChoose (1-4): ')).trim();
  let selected = files;

  if (ans === '2') {
    selected = [...files].sort((a, b) => fs.statSync(b).size - fs.statSync(a).size).slice(0, 10);
    console.log(`\n  Selected top 10 files (${selected.length})`);
  } else if (ans === '3') {
    selected = [...files].sort((a, b) => fs.statSync(b).size - fs.statSync(a).size).slice(0, 20);
    console.log(`\n  Selected top 20 files (${selected.length})`);
  } else if (ans === '4') {
    const n = parseInt((await question('How many files? ')).trim()) || 10;
    selected = [...files].sort((a, b) => fs.statSync(b).size - fs.statSync(a).size).slice(0, n);
    console.log(`\n  Selected ${selected.length} files`);
  }

  const wantMinify = (await question('\nMinify? (y/N): ')).trim().toLowerCase() === 'y';
  const wantCopy = (await question('Copy to clipboard? (y/N): ')).trim().toLowerCase() === 'y';

  rl.close();
  opts.minify = wantMinify;
  opts.copy = wantCopy;
  return selected;
}

// ─── Sorting ─────────────────────────────────────────────────────────────────

function sortFiles(files, sortBy) {
  const f = [...files];
  switch (sortBy) {
    case 'size':
      f.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);
      break;
    case 'type':
      f.sort((a, b) => {
        const ea = path.extname(a).toLowerCase();
        const eb = path.extname(b).toLowerCase();
        return ea.localeCompare(eb) || a.localeCompare(b);
      });
      break;
    case 'alpha':
    default:
      f.sort((a, b) => a.localeCompare(b));
      break;
  }
  return f;
}

// ─── Top files summary ───────────────────────────────────────────────────────

function topFilesReport(files, n = 10) {
  const sorted = [...files]
    .map(f => ({ path: f, size: fs.statSync(f).size }))
    .sort((a, b) => b.size - a.size)
    .slice(0, n);
  let out = `\n📊 Top ${n} largest files:\n`;
  for (const f of sorted) {
    const rel = path.relative(process.cwd(), f.path);
    const sizeKb = (f.size / 1024).toFixed(1);
    out += `  ${sizeKb.padStart(8)} KB  ${rel}\n`;
  }
  return out;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const a = parseArgs(process.argv);
  if (a.help) { help(); process.exit(0); }

  let root = '.';
  if (a.files.length > 0) root = a.files[0];
  root = path.resolve(root);

  // Stat root
  let files = [];
  try {
    const stat = fs.statSync(root);
    if (stat.isFile()) {
      files = [root];
    } else if (stat.isDirectory()) {
      const opts = {
        ignore: a.gitignore ? loadIgnorePatterns(root) : [],
        maxSize: a.maxSize, include: a.include, exclude: a.exclude,
        maxDepth: DEFAULTS.maxDepth, baseDir: root,
      };
      if (a.gitOnly) {
        files = getGitChanged(root);
      } else {
        files = walk(root, opts);
      }
      files = [...new Set(files)];
    }
  } catch (e) {
    console.error('Error accessing path:', root, '-', e.message);
    process.exit(1);
  }

  if (files.length === 0) {
    console.error('No files found.');
    process.exit(1);
  }

  // Sort
  files = sortFiles(files, a.sortBy);

  // Interactive mode
  if (a.interactive) {
    files = await interactivePicker(files, a);
  }

  // Top files report
  if (a.topFiles) {
    console.log(topFilesReport(files));
    if (!a.out && !a.copy) process.exit(0);
  }

  const baseDir = path.isAbsolute(root) ? root : path.resolve(root);
  const opts = {
    format: a.format, minify: a.minify,
    gitOnly: a.gitOnly, maxSize: a.maxSize,
    baseDir: stat.isFile ? path.dirname(root) : root,
  };

  // Build output
  let header = '';
  header += '='.repeat(60) + '\n';
  header += '📸 CODE SNAPSHOT\n';
  header += '='.repeat(60) + '\n';
  header += `Generated: ${new Date().toISOString()}\n`;
  header += `Source: ${root}\n`;
  header += `Files scanned: ${files.length}\n`;
  header += `Options: git-only=${a.gitOnly} minify=${a.minify} max-size=${a.maxSize}\n`;
  header += `Intended for: AI agents (Claude Code, ChatGPT, Codex, etc.)\n`;
  header += '='.repeat(60) + '\n\n';

  let body = '';
  let count = 0;
  let totalChars = 0;
  const skipped = [];

  for (const file of files) {
    try {
      let content = readFileSafe(file);
      if (content === null) { skipped.push(file); continue; }
      if (a.noBinary && isBinary(Buffer.from(content, 'utf-8'), file)) { skipped.push(file); continue; }
      if (a.minify) content = minifyCode(content, path.extname(file).slice(1));
      body += formatFile(file, opts, content);
      totalChars += content.length;
      count++;
    } catch (e) {
      skipped.push(file);
    }
  }

  let footer = '';
  footer += '\n' + '='.repeat(60) + '\n';
  footer += 'END OF SNAPSHOT\n';
  footer += '='.repeat(60) + '\n';
  footer += `\nFiles included: ${count}/${files.length}`;
  if (skipped.length) footer += ` | Skipped: ${skipped.length}`;
  footer += ` | Total chars: ${totalChars}`;
  footer += ` | Est. tokens: ~${estimateTokens(header + body + footer)}\n`;

  const output = header + body + footer;

  // JSON output
  if (a.json) {
    const json = {
      version: '2.0.0',
      generated: new Date().toISOString(),
      source: root,
      files_count: count,
      total_chars: totalChars,
      estimated_tokens: estimateTokens(header + body + footer),
      files: files
        .filter(f => !skipped.includes(f))
        .map(f => ({
          path: path.relative(baseDir, f),
          content: (() => {
            let c = readFileSafe(f);
            if (a.minify) c = minifyCode(c || '', path.extname(f).slice(1));
            return c || '';
          })(),
        })),
    };
    const jsonStr = JSON.stringify(json, null, 2);
    if (a.out) {
      fs.writeFileSync(a.out, jsonStr, 'utf-8');
      console.log(`✅ Written to ${a.out}`);
    } else {
      console.log(jsonStr);
    }
    return;
  }

  // Output
  if (a.out) {
    fs.writeFileSync(a.out, output, 'utf-8');
    console.log(`✅ Written to ${a.out} (${output.length} chars, ~${estimateTokens(output)} tokens)`);
  } else if (a.copy) {
    try {
      execSync('pbcopy', { input: output, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
      console.log(`✅ Copied to clipboard (${output.length} chars, ~${estimateTokens(output)} tokens)`);
    } catch {
      console.log(output);
    }
  } else {
    // Default: write snapshot.txt in current directory
    const defaultOut = 'snapshot.txt';
    fs.writeFileSync(process.cwd() + '/' + defaultOut, output, 'utf-8');
    console.log(`✅ Written to ${defaultOut} (${output.length} chars, ~${estimateTokens(output)} tokens)`);
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
