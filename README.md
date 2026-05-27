# 📸 code-snapshot

**Merge your codebase into one prompt-ready text block for AI agents.**

Stop manually copying files into ChatGPT/Claude Code/Codex. One command, done.

```bash
npm install -g code-snapshot
snap ./src                          # Snapshot a directory
snap ./src --git-only               # Only changed files
snap ./src -o snapshot.txt          # Write to file
cat snapshot.txt | pbcopy           # Copy to clipboard
```

## Why?

Every developer using AI coding tools has the same ritual: open 10 files, copy-paste them one by one into the chat, describe the problem, hope the AI understands the full context.

**code-snapshot** automates this. One command gives you a clean, structured text block your AI agent can immediately understand.

## Features

| Feature | CLI Flag | Description |
|---------|----------|-------------|
| Directory walk | `snap <dir>` | Recursive with `.gitignore` awareness |
| Git-only | `--git-only` | Only modified/new files since last commit |
| Minify | `--minify` | Strip blank lines and single-line comments (save tokens) |
| Output file | `-o <file>` | Write to file instead of stdout |
| Clipboard | `--copy` | Copy to clipboard (macOS/Linux) |
| Include filter | `--include "*.js,*.ts"` | Only matching file patterns |
| Exclude filter | `--exclude "*.test.*"` | Skip matching patterns |
| Max file size | `--max-size <bytes>` | Skip large files (default: 512KB) |
| Skip binary | `--no-binary` | Auto-detect and skip binary files (default: on) |
| Ignore gitignore | `--no-gitignore` | Don't read .gitignore rules |

## Quick Examples

```bash
# Everything you need for your AI prompt
snap ./src -o context.txt

# Just what changed today
snap . --git-only

# Clean it up (save tokens)
snap ./lib --minify --exclude "*.test.js,*.spec.js"

# Pipe directly to Claude Code (or any AI)
snap . | claude

# Quick clipboard
snap ./src --copy
```

## Output Format

Every file is wrapped with clear markers:

```
// [FILE] src/utils.ts
// [LANG] TypeScript
// [SIZE] 1234 chars
export function hello() { ... }
// [/FILE] src/utils.ts
```

The header includes a summary for token estimation. Footer gives total stats.

## Ignored by Default

`node_modules`, `.git`, `.DS_Store`, `dist`, `build`, `.next`, `.cache`, `__pycache__`, `.venv`, `venv`, `env`, `coverage`, plus everything in your `.gitignore`.

## Roadmap

- [ ] Interactive file picker
- [ ] Token-aware chunking (split large outputs for context limits)
- [ ] VS Code extension
- [ ] .snapignore file support

## License

MIT — free for everyone. If you find it useful, a GitHub star goes a long way.
