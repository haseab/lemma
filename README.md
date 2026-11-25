# Lemma

A free, open-source, offline desktop math scratchpad powered by MathLive. Write equations and prose in the same cursor flow, without an account or a network service.

Lemma is an early prototype. The desktop packaging currently targets Apple Silicon Macs and uses an ad hoc signature for local use, without Developer ID signing or notarization.

## Run

Requires Node.js 22.12 or newer and npm 11.8.0.

```sh
npm ci
npm run build
npm start
```

## Build a Mac app

```sh
npm run package
```

The app is created at `deliverables/Lemma-darwin-arm64/Lemma.app`. Packaging registers `.lemma` documents and offers Lemma as an alternate editor for LaTeX source files.

## Writing

- Every new line starts as math in Auto mode. Recognized prose converts connected literal words to normal text without a background highlight. Deleting the evidence for prose re-evaluates the whole connected run: `pie` returns to mathematical `pi` when its final letter is removed. Sentence context keeps prose as prose.
- Backticks enter and leave explicit inline math. Math and Text modes override automatic detection. Alphabetic math shortcuts wait for word boundaries in Auto mode so a prefix such as `in` cannot consume the beginning of `inline`.
- Prose wraps to the page width. Fractions, exponents, roots and matrices retain their structured layout. Enter creates a hard line break and preserves text after the caret.
- `/` creates a fraction and `^` a power in math mode. Arrow keys navigate structured math. Tab indents; Shift-Tab removes an indent. Escape moves focus from the editor to the formatting controls. Left and right arrows move between toolbar controls when a button has focus.
- Select text to change its font family, size, color, bold or italic style. Formatting also applies to upcoming typing.
- At the baseline immediately after an exponent, Backspace pulls the following math expression into that exponent and its open parenthesis, if present. It preserves nested formatting and stops at a relation or prose.
- Use the Pages sidebar to create and switch pages. Rename a page in the small header field.

## Undo, autosave and recovery

Each page has its own Undo/Redo history, saved with the notebook. History survives page switches and restarting the app. Keyboard commands, toolbar buttons and the math context menu use the same history. Automatic mode changes are part of the corresponding edit, and Replace All is a single undoable action.

To bound storage, history retains up to 1,000 states and 4 MB per page, with an 8 MB history budget across the notebook. Older states are discarded when those limits are reached. The notebook itself has a 20 MB save limit; an unsuccessful save leaves the previous file intact and reports the error.

Autosave runs after a short pause, with a one-second maximum delay during continuous typing. Failed saves retry automatically. The desktop app first writes a durable recovery journal, then atomically replaces the notebook. Previous valid notebook versions are retained automatically, at most once per minute, up to 40 versions. On launch, an interrupted save can recover from the journal, and a corrupt main file can recover from a validated backup. Unreadable originals are preserved during repair.

Choose **File → Previous versions** to restore the current page from a notebook backup. Other pages are preserved, and the restore can be undone. Recovery protects edits that reached autosave; no program can guarantee recovery of input that was never written to storage.

Saved work stays in the original per-user application data directory so existing notebooks survive upgrades. Earlier rich-text notebooks migrate to math pages while retaining their original content. Browser previews use browser-local storage and a local recovery copy; the durable journal and rotating version browser are desktop features.

## Find and replace

Use Command-F to find literal text and symbols. Command-G and Shift-Command-G move between results. The find bar supports case matching, replacing one match and replacing all matches. Search respects structural boundaries instead of treating a fraction or exponent as flat text; edit a complete formula through LaTeX source when needed.

## LaTeX and other editors

- Open `.lemma`, earlier `.folio`, or `.tex`/`.latex` files through **File → Open**. Opening a document adds an editable page to the notebook; it does not overwrite the source file.
- Paste equation fragments such as `\frac{a}{b}`, dollar-delimited math, or `\(...\)` / `\[...\]` expressions. Ordinary prose and multiple lines paste as literal text, with backticks available for embedded math.
- **Edit → Insert LaTeX** opens the source dialog. Apply edited source to the page or insert it at the cursor; both actions can be undone.
- Import supports equation fragments, common AMS display environments, and simple LaTeX documents containing prose and inline math. This is MathLive-compatible mathematical LaTeX, not a complete TeX implementation. Custom macros, included files and arbitrary package-dependent document commands are not executed or generally supported.
- **File → Export** offers editable `.lemma`, a standalone LaTeX `.tex` document, PDF, and readable plain text. LaTeX exports declare AMS math and color packages. Editable exports omit local undo history.
- Copying a selection puts readable plain/HTML text, LaTeX and MathML on the clipboard. Other apps choose the formats they support. **Edit → Copy selection as LaTeX** explicitly copies source.

## Checks

```sh
npm test
npm run build
npm audit
```

Tests cover persistent history, complete editing sequences, clipboard round trips, structured replacement, LaTeX interchange, queued file opening, frame validation, and failed-save/crash-recovery paths. Native visual and keyboard checks are also needed when changing layout or interaction behavior.

For isolated development profiles, `LEMMA_DATA_DIR` accepts an absolute runtime directory. `LEMMA_PREVIEW=1` uses a separate preview data directory. Normal builds do not set either override.

## Credits and license

MIT. See [LICENSE](LICENSE). MathLive (MIT), Lucide (ISC), Electron (MIT), and Vite (MIT) retain their respective licenses. Dependency license notices are included in `THIRD-PARTY-NOTICES.txt` and the application bundle.

Brand icons can be regenerated on macOS with `node scripts/icons.mjs`.

## Website

The browser scratchpad lives in `site/` and reuses the desktop editor’s math/prose handling, wrapping, clipboard, formatting, and undo logic. A single page and its undo history are saved in browser storage, with a previous saved copy for recovery. Clearing browser data can remove this work; export an editable `.lemma` file for a portable backup. LaTeX import/export, source editing, plain-text export, and browser print-to-PDF are available. No scratchpad content or usage analytics are collected.

Desktop downloads are secondary and are discovered from published GitHub Releases. No download is advertised until a matching release asset exists. The browser version requires the site to load; offline installation and the desktop app’s versioned backup system are not included.

Copy `.env.example` to `.env.local` and set `VITE_REPOSITORY_URL` to the public repository URL, then run:

```sh
npm run site:build
npm run site:dev
```

Deploy `site-dist/` to any static host and connect your domain there. No server, database, account system, or paid service is required. The public repository URL is build-time configuration; no credentials belong in it.

## Windows preview

```sh
npm run package:windows
```

This creates `deliverables/Lemma-win32-x64/Lemma.exe` and its supporting files. Distribute the entire folder as a ZIP; the executable cannot be copied on its own. This is a portable preview, without an installer, automatic file associations, or a Windows signing certificate. A successful cross-platform package build does not replace a native Windows launch and editing test.

The Mac packaging command remains `npm run package:mac`. Desktop packages contain only an explicit allowlist of runtime files; the website, tests, local settings, user pages, and repository metadata are excluded.
