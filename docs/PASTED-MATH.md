# Pasted and transcribed mathematics

Recognition runs locally on completed text from the clipboard or the editor's keyboard-input delegate. It does not record audio, call a language model, collect input, or train from users' documents.

## Local paste diagnostics

Open the editor with `?pasteDebug=1` to display a collapsible event panel. It records up to 120 events: relative timings, event types, trust/cancellation/focus flags, character counts, whether the document changed, and whether an extra paste input was suppressed. It never records clipboard contents, document text, key values, or error messages. A native paste request without a following input event identifies a different failure from a completed conversion followed by another paste request. The report cannot identify the sending application or prove why it retried.

For automatic capture, set `LEMMA_PASTE_REPORT_DIR` to a private absolute folder when running `scripts/serve-site.mjs`. The debug panel probes the same-origin development receiver and autosaves metadata after activity, using one JSON file per capture. The receiver validates every field, rejects text and cross-site writes, caps report size, and writes files atomically. Its destination comes only from server configuration and is never client-selectable. The panel shows whether autosave is enabled or failed; manual Save report remains available. Normal editor sessions do not contact the receiver. Production has no receiver. Without a development receiver, the report stays in memory until cleared, reloaded, or explicitly saved.

Native paste readback is enabled by default in both renderers. The received text stays in the keyboard input long enough for a dictation client to check insertion. The receipt expires on editing, selection or caret changes, blur, history restoration, and programmatic content replacement. Buffer-only typing after a receipt inserts only the new suffix. Rejected insertions do not leave successful readback receipts. Automatic formatting preserves the receipt while settling equivalent LaTeX representations. The native keyboard receipt is never written as a separate diagnostic or history buffer. Recognized expression source ranges may be stored locally with notebook history to support continued editing; diagnostics still contain metadata only. For diagnosis, `pasteReadback=0` disables retention without changing recognition; `pasteDebug=1` separately enables the metadata panel.

## Research

[MathSpeech](https://arxiv.org/html/2412.15655v3) studies recordings from actual mathematics lectures and separates transcription correction from formula generation. Its examples show that recognized words alone can lose mathematical structure.

[Speech-to-LaTeX](https://arxiv.org/html/2508.03542v2) studies both isolated equations and mathematics embedded in sentences. It identifies genuine scope ambiguity in spoken fractions, as well as symbol and text/math boundary errors. A transcript does not always determine one intended expression.

[MathSpeak](https://www.seewritehear.com/accessible-mathml/mathspeak/examples/quick-tutorial/index.php?explicitness=0&interp=all&verbosity=b) provides explicit boundaries for fractions, roots, and scripts. These are useful grammar conventions, although ordinary dictation does not necessarily follow them. [MathML intent](https://www.w3.org/TR/mathml4/) likewise distinguishes presentation from intended meaning.

## Algorithm

1. Keep explicit LaTeX and delimited inline math on their existing paths. Respect forced Text mode, enabled categories, and custom dictionary precedence.
2. Tokenize complete words and longest dictionary phrases. Recognize conventional spoken numbers, operators, functions, grouping, and scripts.
3. Parse expression structure with operator precedence and bounded recursion. Serialize complete fractions and multi-digit exponents with braces rather than performing word substitution.
4. Recognize complete expressions within prose only when they have sufficient grammatical evidence. Preserve surrounding wording and punctuation.
5. Preserve the original text when structure is incomplete, unsupported, or ambiguous. Use documented spoken grouping conventions rather than transcription repairs. Spoken “over” uses the accumulated numerator and a product as its denominator; a following addition stays outside the fraction. Group a multi-term denominator with parentheses or start/end fraction. An ungrouped spoken root extends through a sum until a fraction bar, comparison, or closing delimiter. Explicit parentheses and start/end root or fraction boundaries override those defaults. Slash and “divided by” retain ordinary division precedence. Other unresolved ambiguities remain literal.
6. Insert the result using the existing validated, single-transaction paste path. Recognition also considers the preceding canvas operand for dictated fragments.

Leading quantifier phrases deliberately prefer notation in Auto mode. A phrase such as “for all people” keeps the quantifier symbol without requiring a variable or a complete predicate; unparsed wording remains readable alongside it. Unknown labels do not block recognized notation within the rest of the phrase. Typing, paste, and completed dictation use the same quantified-input assessment. Backspace rejects the automatic notation while deleting the last source character, and the line then stays prose even if that character is typed again. Enter starts a new Auto line. Explicit Text mode and disabled notation categories remain literal.

A relative clause can continue an existing mathematical comparison: “four is less than t, which is less than eleven” forms a chained inequality. The continuation requires another recognized comparison and a mathematical right operand; ordinary clauses such as “which is a useful bound” stay prose. Completed relative comparisons are reassessed during incremental typing as well as paste and dictation. Phrase matching accepts non-breaking and repeated whitespace while preserving original source offsets and literal prose.

Very long individual lines (over 16,000 characters) remain text rather than invoking automatic recognition. The existing total paste limit still applies. This keeps large prose documents bounded; shorter lines are assessed separately.

## Evaluation

Run `node scripts/evaluate-pasted-math.mjs` and `npm test`.

The committed corpus contains 80 original examples: 57 development cases and 23 held-out examples. They cover arithmetic, numbers, structures, notation, mixed prose/math, and text that must remain unchanged. These are original regression examples informed by the research categories, not downloaded transcripts or a representative real-world benchmark.

The first implementation passed 24/57 development cases and changed four protected prose examples. The earlier structural-parser baseline passed all 80 with no protected prose changes. Some scope expectations have since been deliberately revised to the conventions above, so the current corpus is a regression set rather than unchanged held-out evidence. Another test generates 288 expression combinations and checks mathematical structure, alongside malformed-input and ambiguity checks. This is test-driven grammar development, not reinforcement learning or evidence of general dictation accuracy.

For an external check, run `node scripts/evaluate-pasted-math.mjs --mathspeech`. It fetches metadata for the first 100 public [MathSpeech dataset](https://huggingface.co/datasets/AAAI2025/MathSpeech) rows, processes their human transcriptions, and reports aggregate counts. Audio is not downloaded; transcripts, media links, and source identities are not saved in the repository. This is an ordered convenience sample with topic bias, not a random held-out benchmark.

On the inspected sample, strict MathML matches improved from 8/100 to 13/100. The final parser preserved 74/100 as text and generated no invalid LaTeX. Structural comparison removes redundant rows and invisible multiplication but still distinguishes some equivalent presentation choices. The remaining 13 converted nonmatches include unsupported interpretations and presentation differences; they are not counted as correct. These results are substantially weaker than the original regression set and must be reported separately.

## Limits

Advanced calculus beyond the supported structural grammar, populated matrices, domain-specific shorthand, implicit grouping, homophones, and damaged ASR transcripts remain incomplete. Text-only recognition cannot recover information absent from the transcript. Expand grammar with independently authored positive, negative, and ambiguous cases; keep external checks separate from tuning. Do not loosen prose protection merely to raise conversion counts.

Spoken arithmetic recognizes “plus or minus,” “minus or plus,” optional “the” before a square or cube root, and compact coefficients with up to three adjacent variable letters, such as `5pq`. Typed literal variables preserve their case; pasted variables default to lowercase unless explicitly qualified. Terminal punctuation is preserved. The four earlier corpus cases for ungrouped roots and spoken fraction bars now use these grouping defaults; they are revised regression expectations, not untouched holdout evidence.


## Composable formula checks

[100 common formulas](COMMON-FORMULAS.md) supplies independently authored readings and expected notation drawn from standard textbook and physics-sheet topics. The application never imports this fixture or looks up a formula by its wording. Reusable grammar productions build expressions from operands, operators, groups, and nested bodies. Capital-letter qualifiers, fractional coefficients, function powers, scripts, primes, accents, logarithm bases, factorials, binomial choices, derivatives, integrals, bounded sums, and limits compose through the same parser.

Scripts bind one operand unless grouped. Thus “v subscript zero squared” means the square of v-subscript-zero, and “x to the power n plus one” means x-to-the-n plus one; use parentheses for an exponent n-plus-one. A root beginning with an explicit parenthesis ends with that grouped argument. Use start/end root to include a sum of several parenthesized terms. These conventions make scope predictable without formula-specific guesses.

Tests compare expression structure, preserving fractions, scripts, case, grouping, bounds and operator order. All 100 readings are checked in Auto and Math with ordinary, non-breaking and narrow non-breaking spaces (600 parser checks), and through native-paste events and completed dictation input in the actual MathLive page editor (400 insertion checks, including Undo/Redo). Another 120 independently generated combinations change variables, powers and bounds and nest operators not present in the formula list. Explicit Text mode, disabled categories, malformed structures and ordinary prose have separate protection checks.

This is deterministic grammar regression coverage, not an estimate of real-world speech recognition or proof that every possible spoken formula works. The event tests run the shared browser/desktop renderer under a DOM harness; they do not record audio, run a microphone transcription service, or launch the installed desktop application. Incremental spoken division uses the same fraction production: a recognized spoken fraction bar opens an editable denominator, and subsequent input stays inside it. Pasting that incomplete prefix selects the same denominator placeholder. Character input retains the original source across rendered fractions, scripts and placeholders and calls the same assessment entry point as completed input. Keyboard tests include an event-loop checkpoint between keydown and native text insertion: a pending character is not formatted before its actual input arrives. The 100 formula readings and 57 quantity/measurement/unit readings are also checked character by character through keyboard events and text-service input in Auto and Math (628 insertion checks). Source ranges are local editing metadata; caret navigation, deletion, explicit Text mode and rejected prose lines keep their native editing rules.

Numeric suffixes on variables denote indices: `m1`, `m12`, and `m1m2` become indexed variables, while a leading coefficient such as `2m` remains a product. Spoken “m one” uses the same index convention. During live typing, digits extend the numeric subscript and a following space, operator or variable returns to the baseline. Explicit scripts, matrix dimensions and custom numeric dictionary triggers retain their existing paths.

“Change in” and “change of” are aliases for a prefix operator applied to one mathematical operand: `change in D` becomes delta-D. The operand can itself be indexed or explicitly grouped. The resulting node composes with arithmetic, fractions and other structures. Rendered prefixes retain their source metadata for subsequent live composition and history, while ordinary phrases such as “change in the weather” remain prose. An unfinished prefix can expose an editable argument placeholder through the same completed-input grammar used for pending denominators.

Typed literal variable names preserve their case. Pasted and completed dictation variables default to lowercase unless qualified with “capital” or “uppercase.” “Capital QVB” qualifies the whole adjacent letter product. Ordinary prose, forced Text mode, named physical quantities, case-sensitive unit symbols, custom dictionary definitions, and structured LaTeX clipboard data retain their intended case. Clipboard normalization occurs at the input boundary; the shared tokenizer preserves literal case.

“Vector v” applies an arrow accent to its operand. It composes with prefix operators and fraction bars, for example “vector v equals change in vector d over change in vector t.” The vector accent follows the Linear algebra setting; matrix templates retain their existing dimensioned syntax.

“Delta” defaults to Δ, as do “capital delta,” “uppercase delta,” and “change in/of.” Say “lowercase delta” for δ. Other Greek names retain their conventional defaults.

Bare “bracket” starts a parenthesized group, with a matching end inferred at the end of a completed utterance when omitted. After a spoken fraction denominator has an operand, it starts a following product: “1 over 3 bracket pi r cubed” means (1/3)(πr³). “1 over bracket x plus y” instead puts the group in the denominator. Explicit “open parenthesis” and “open bracket” keep their existing denominator scope and require matching closers.

“Sub” and “subscript” share the same script grammar: “vector f sub e over q” yields an indexed vector divided by q. The alias requires a preceding operand and a following index, and does not match prefixes of ordinary words such as “submarine.”

Dictation pause commas do not disqualify an equation. Recognition can assess a comma-free token view while retaining original source offsets and draft text, including the selection-replacement textarea. Pauses inside notation phrases are also accepted (“less, than”, “capital, F”). Ordinary prose punctuation and valid argument/predicate separators retain their existing behavior; saying “comma” explicitly still supplies an argument separator.

Fraction coefficients accept numeric or spoken integer numerators with the same denominator names: “1 half,” “one half,” “3 quarters,” and “twenty one thirds” share one grammar production. “Equals to” is an equality alias alongside “equals” and “is equal to.” These compose with subscripts, compact products, and powers; no formula-specific rule is used.

[Physical notation](PHYSICAL-NOTATION.md) documents quantity-name defaults and measurements. Physics & units has an independent built-in dictionary and shared productions for numeric magnitudes, scientific notation, SI prefixes, unit products, powers and denominators. Quantity variables and upright unit symbols remain distinct.

Recognized unfinished operators remain notation while awaiting an operand, including “x equals,” “p plus or minus,” and a trailing comparison in a relative chain. A spoken fraction bar can expose its denominator placeholder before the next character arrives. The two original evaluation readings “x plus” and “y equals” now have incomplete-math expectations; their former prose classifications are revised regression expectations, not untouched holdout evidence.

Explicit Math mode parses recognized spans even when another word is unfinished or unknown. An incomplete relation phrase can retain its recognized left-hand quantity and operator while the remaining words stay mathematical literals; Auto mode retains its prose fallback.

Compact two- or three-letter products can use an explicit mathematical group as context, even without an equality in the inserted fragment. For example, `bracket kx squared` parses after an existing fraction using the same product and grouping productions as a complete equation. Adjacent prose words and longer unknown labels remain excluded from this shorthand.

The [Math input semantics audit](MATH-INPUT-SEMANTICS.md) separates explicit Math mode from Auto's prose heuristics and records the remaining grammar, scope and configuration rules.

A complete structural operand can establish mathematical context for a preceding compact letter product without an equals sign. For example, `QVB sine theta` becomes `q v b \sin(\theta)` in Auto and Math, including dictated non-breaking spaces. Auto retains conservative prose boundaries; explicit Math mode accepts arbitrary letter-product lengths.
