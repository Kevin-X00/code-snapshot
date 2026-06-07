# 📸 code-snapshot

**Merge your codebase into one text block for AI agents.**

Stop manually copy-pasting files into ChatGPT, Claude Code, Codex, or Cursor. One command, done.

```bash
npm install -g @kevinxyz/code-snapshot
```

已安装的用户更新到最新版:

```bash
npm update -g @kevinxyz/code-snapshot
```

**Just run it in your project root (no arguments = current dir):**

```bash
snap
```

Then pipe directly to any AI (replace `.` with your folder):

```bash
snap . | claude                  # Pipe to Claude Code
snap . -i --tokens               # Interactive + token estimate
snap . --git-only -o ctx.txt     # Just changed files
snap . --copy                    # Copy to clipboard
```

> 💡 **Tip:** `snap` with no args uses the current directory. If you get `ENOENT`, it means the folder doesn't exist — just run `snap .` in your project root.

## Why code-snapshot?

Every developer using AI coding tools has the same ritual: open 10 files, copy-paste them one by one into the chat, describe the problem, hope the AI understands the full context.

**code-snapshot automates this.** One command gives you a clean, structured text block your AI agent can immediately understand.

## Real Scenario

You have a project and want AI to help add a new feature. Without code-snapshot:

```bash
# Manual: open each file, copy-paste one by one to AI
src/index.js          → copy → paste to AI
src/utils/parser.js   → copy → paste to AI
src/config.js         → copy → paste to AI
package.json          → copy → paste to AI
...
# 10 files = 10 copy-pastes, easy to miss something
# AI says "I can't find the definition" → go back, find the file, copy again
```

With code-snapshot:

```bash
# One command, everything in one place
snap . -o context.txt
# Then drag context.txt into your AI chat
# AI gets full context in one shot, no back-and-forth
```

### Real output example

Run `snap` in your project, and you get:

```
============================================================
📸 CODE SNAPSHOT
============================================================
Generated: 2026-06-07T12:33:00.000Z
Source: /my-project
Files scanned: 12
============================================================

// [FILE] package.json
// [LANG] JSON
// [SIZE] 800 chars | ~200 tokens
{ "name": "my-project", ... }

// [FILE] src/index.js
// [LANG] JavaScript
// [SIZE] 3400 chars | ~850 tokens
import { parseFile } from './utils/parser';
...

// [FILE] src/utils/parser.js
// [LANG] JavaScript
// [SIZE] 5200 chars | ~1300 tokens
export function parseFile(path) { ... }
...

============================================================
END OF SNAPSHOT
============================================================
12 files | ~15000 chars | ~3750 tokens
```

Then you tell AI: *"Above is my full codebase. Please add a feature to export each page as an image."*

**AI understands instantly** — no need to paste files one by one, no missing context.

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
snap . -o context.txt

# Just what changed today (git diff)
snap . --git-only

# Interactive mode — pick files, set options
snap . -i

# Clean it up to save tokens
snap . --minify --exclude "*.test.js,*.spec.js"

# See token count before you use it
snap . --tokens

# Find the big files
snap . --top-files

# JSON for programmatic use
snap . --json -o codebase.json

# Quick clipboard
snap . --copy

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
