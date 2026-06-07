# 📸 code-snapshot

**Merge your codebase into one text block for AI agents.**

Stop manually copy-pasting files into ChatGPT, Claude Code, Codex, or Cursor. One command, done.

```bash
npm install -g @kevinxyz/code-snapshot
snap ./src
```

Then pipe directly to any AI:

```bash
snap . | claude             # Pipe to Claude Code
snap . -i --tokens          # Interactive + token estimate
snap . --git-only -o ctx.txt # Just changed files
snap ./src --copy            # Copy to clipboard
```

## Why code-snapshot?

Every developer using AI coding tools has the same ritual: open 10 files, copy-paste them one by one into the chat, describe the problem, hope the AI understands the full context.

**code-snapshot automates this.** One command gives you a clean, structured text block your AI agent can immediately understand.

## Features (v2)

| Feature | CLI Flag | Description |
|---------|----------|-------------|
| Directory walk | `snap <dir>` | Recursive with `.gitignore` + `.snapignore` awareness |
| Git-only | `--git-only` | Only modified/new files since last commit |
| Minify | `--minify` | Strip blank lines + single-line comments to save tokens |
| Token estimate | `--tokens` | See estimated token count in output |
| Interactive picker | `-i` or `--interactive` | Pick files and options interactively |
| Top files report | `--top-files` | Show largest files before generating |
| Output file | `-o <file>` | Write to file instead of stdout |
| Clipboard | `--copy` | Copy to clipboard (macOS/Linux) |
| Include filter | `--include "*.js,*.ts"` | Only matching file patterns |
| Exclude filter | `--exclude "*.test.*"` | Skip matching patterns |
| Max file size | `--max-size <bytes>` | Skip large files (default: 512KB) |
| Skip binary | `--no-binary` | Auto-detect and skip binary files (default: on) |
| JSON output | `--json` | Machine-readable JSON format |
| Sort options | `--sort alpha\|size\|type` | Control output file order |
| Output formats | `--format marker\|xml\|plain` | Choose your output format |

## Quick Examples

```bash
# Everything you need for your AI prompt
snap ./src -o context.txt

# Just what changed today (git diff)
snap . --git-only

# Interactive mode — pick files, set options
snap . -i

# Clean it up to save tokens
snap ./lib --minify --exclude "*.test.js,*.spec.js"

# See token count before you use it
snap . --tokens

# Find the big files
snap . --top-files

# JSON for programmatic use
snap . --json -o codebase.json

# Quick clipboard
snap ./src --copy

# Different output format
snap . --format xml
```

## Output Format

Every file is wrapped with clear markers:

```
// [FILE] src/utils.ts
// [LANG] TypeScript
// [SIZE] 1234 chars | ~308 tokens
export function hello() { ... }
// [/FILE] src/utils.ts
```

The header includes generation info and token estimation. Footer gives total statistics.

## Ignored by Default

`node_modules`, `.git`, `.DS_Store`, `dist`, `build`, `.next`, `.cache`, `__pycache__`, `.venv`, `venv`, `env`, `.env`, `coverage`, `*.log`, plus everything in your `.gitignore` **and** `.snapignore`.

### .snapignore

Create a `.snapignore` file in your project root for custom exclusions:

```
# .snapignore
generated/
*.graphql
**/*.stories.*
```

## How it works

1. **Scans** your directory, respecting `.gitignore` and `.snapignore`
2. **Wraps** every file with FILE/LANG/SIZE markers
3. **Outputs** one clean text block — pipe it, save it, copy it
4. **Your AI agent** gets full context in one shot

## Roadmap

- [x] Interactive file picker
- [x] Token-aware output
- [x] .snapignore file support
- [ ] VS Code extension
- [ ] Token-aware chunking (auto-split for context limits)
- [ ] GUI landing page

## License

MIT — free for everyone.

If you find this useful, a ⭐ on GitHub goes a long way.
