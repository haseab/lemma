# Lemma

A free, open-source, offline desktop equation page powered by MathLive. The entire writing surface is one multiline math editor, with normal text and equations in the same cursor flow.

This is an early prototype. Undo history currently resets when switching pages or restarting the app. Automatic prose wrapping and general LaTeX document import/export are not implemented yet.

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

The Apple Silicon app is created at `deliverables/Lemma-darwin-arm64/Lemma.app`. It is ad hoc signed for local use, without Developer ID signing or notarization.

## Writing

Start typing anywhere on the blank page. There are no separate equation blocks to insert.

- Auto starts every line in math. Recognized prose converts the connected literal words to normal text, including earlier short words; subsequent sentence text stays prose without a mode background. Common math functions stay mathematical. In Auto, alphabetic shortcuts wait for a word boundary so word prefixes cannot turn into symbols. Inside backticks or explicit Math mode, normal equation shortcuts remain available.
- Auto re-evaluates connected words after Backspace and Delete. Removing the letter that made `pie` prose restores mathematical `pi`; surrounding sentence context keeps prose as prose. Explicit Text mode remains literal.
- Backticks enter and leave inline math without printing delimiter characters. Enter starts a new math line. Explicit Math and Text modes override detection.
- Choose Math or press Command-M for explicit equation input.
- Choose Text or press Command-T for literal prose.
- Enter adds a new line; arrow keys navigate equations. Tab indents, and Shift-Tab removes the indent. Tab does not select entire text groups.
- Choose sans serif, serif, or monospace, adjust size, and set ink color for selected content or upcoming typing. Bold and italic operate on intentional selections or upcoming typing.
- Pages reopen with a caret rather than a selected text group.
- At the baseline immediately after an exponent, Backspace pulls the following math expression into that exponent (and into its open parenthesis, if present). It preserves nested formatting, stops at a relation or prose, and undoes in one step.
- `/` creates a fraction and `^` creates a power in math mode.
- The toolbar provides fractions, powers, roots, integrals, sums, matrices, and text styles. The MathLive keyboard and context menu expose more formatting.
- Open the Pages sidebar to create and switch pages. Rename a page in the small header field.
- Export editable `.lemma` files or PDF. Earlier `.folio` exports remain importable.

## Saved work

No account, analytics, network service, or cloud sync is required. The desktop app keeps its original per-user application data directory so existing notebooks remain available. Browser previews retain the original browser-local storage key.

The v2 notebook format stores a MathLive LaTeX page and input mode. Previous rich text documents are converted to text and math lines. The original document structure is retained in `legacyContent`, and the first desktop save of an older notebook creates a separate `.before-math-page` backup before replacing the file. Unmodified starter content becomes a blank page; original content remains in the migration backup. Invalid saved data enters recovery mode and is preserved.

MathLive uses explicit newlines rather than word processor paragraph wrapping. Use Enter to lay out long text across lines. Very large pages remain one math field.

## Checks

```sh
npm test
npm run build
npm audit
```

## Credits

MathLive (MIT), Lucide (ISC), Electron (MIT), and Vite (MIT). Dependency license notices are included in `THIRD-PARTY-NOTICES.txt` and the application bundle.

## License

MIT. See [LICENSE](LICENSE). Third-party components retain their respective licenses.
