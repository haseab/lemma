# Mathematical input semantics

Math mode explicitly establishes mathematical intent. An equality, comparison, surrounding equation, short identifier, or completed sentence is not a prerequisite for recognition. Auto mode still decides whether ordinary language should become notation. Text mode keeps natural-language input literal.

## Audit findings

| Previous dependency | Math-mode behavior |
|---|---|
| Compact products required an equation or group and a short word | Unrecognized letter runs are variable products, with no identifier whitelist or three-letter limit. Keywords and custom definitions take priority. |
| Contextual relation aliases required a left operand to be recognized | A standalone `less than` or `is less than or equal to` produces its mathematical operator. |
| Live conversion required additional mathematical evidence | The selected mode supplies intent. Cardinal numbers and fractions use the same interpretation during typing and completed input. |
| Some helper calls omitted the selected mode | Typing, clipboard, dictation, replacement previews, source retention and history validation share the same editor options. |
| Saved mode was applied after restoring history | Both renderers set the page mode before validating restored source metadata. |
| Standard division was rejected by prose-oriented scope checks | `x divided by y plus z` means `(x/y)+z`; `x plus y divided by z` means `x+(y/z)`. Spoken `over` retains its broader numerator convention. |
| Bulk text services were routed by ASCII-letter presence | Committed multi-character input uses the shared clipboard parser, including numeric and Unicode expressions. Single keystrokes and composition keep native handling. |
| Operand-start and operator classifications were copied into feature lists | Shared grammar properties describe operand productions, postfix operations, operators, functions and group ownership. Products can contain every supported operand production. |
| A continuation knew only that math preceded it | Native operands are passed as mathematical tokens to the same precedence grammar. They are not reverse-translated into English or replaced with an empty numerator. |
| Single-word aliases could wait for an extra boundary keystroke | Math mode converts a complete keyword immediately and retains its source so continued typing can revise it. |
| Mixed source-letter styles could block recognition | Math mode recognizes the word and uses the caret style for its newly created notation. Existing native operands retain their serialized styling. |

The previous generic pending-phrase fallback could also be activated by the beginning of an unrelated dictionary word. It now requires an actual unfinished operator. Auto's ambiguity safeguards remain separate from Math intent.

## Rules that determine meaning

- Keyword boundaries and longest matching phrases remain necessary. `plus or minus` can replace provisional `or`; a keyword embedded inside an ordinary identifier is not a separate operator.
- Unknown letter runs in Math mode denote products. A multi-letter named function or custom symbol needs its declared meaning. Prefixes and scripts apply to mathematical operands, not arbitrary following sentences.
- A spoken `over` is a broad fraction bar. A written slash and `divided by` use ordinary arithmetic precedence. Explicit groups determine alternatives.
- Literal parentheses and brackets retain native fence editing. Spoken `bracket` can close at a completed utterance; explicit start/end fraction or root markers and bounded-operator clauses determine their own scope.
- Missing operand slots can remain editable. A function name can also stand alone as an operator. An empty input does not create a phantom placeholder.
- Commas used as dictation pauses do not determine whether input is mathematical. Explicit grouped argument lists and quantified separators retain their grammatical roles.
- Quantity names use catalog defaults, including vectors and displacement as change in position. Literal variable names retain their entered mathematical meaning. `of` denotes application where supported; it is not an implicit subscript.
- Typed variable letters retain their case. Pasted variables default to lowercase unless explicitly qualified. Spoken `delta` and `change in/of` produce uppercase Δ; `lowercase delta` produces δ. Quantity defaults and unit symbols retain their declared case.
- Variable-number adjacency denotes an index; a preceding numeral is a coefficient. Written measurements require the unit-symbol boundary that distinguishes `2m` from `2 m`. Unit symbols remain case sensitive.
- Text mode, disabled notation groups and custom definitions remain user choices. Explicit structured LaTeX is imported as structured content. Mode does not supply missing vocabulary or invent a physical model.
- Selection and native branch boundaries constrain replacement. A continuation cannot pull an operand from another row or a different numerator, denominator or matrix cell.

Math input still has bounded input size and nesting. These are resource limits, not evidence requirements. Unsupported clauses remain editable source; the implementation does not claim unrestricted natural-language understanding.

## Verification

The regression suite checks independently specified mathematical structures, including standalone expressions without an equation, contextual aliases, incomplete structures, precedence, Unicode/numeric input, custom meanings, Text mode and disabled groups. Editor checks cover character input, native paste, completed dictation, replacement previews, Undo/Redo, restored partial source, native variable/power/fraction continuations and nested branch boundaries. The existing formula and measurement corpus remains part of the regression suite. These tests use the real MathLive renderer in a DOM harness; they do not measure speech-recognition accuracy or constitute installed-app UI verification.
