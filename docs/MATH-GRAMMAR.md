# Composable math input

`src/math-grammar.js` owns syntax properties shared by the tokenizer, parser,
notation catalogue, clipboard input, dictation, and native editor continuations.

- Operand productions declare their parsing rule and notation group. Product
  factors and template arguments use this grammar with different constraints:
  a signed argument is valid in a template, while a negative factor requires
  grouping to avoid rendering as subtraction. Quantifiers bind predicates.
- Postfix productions declare their role once. Scripts, ordinal powers,
  factorials, primes, and accents use the same parser on an operand, on a
  function before its argument, and after an existing native expression.
- Operators declare their canonical spelling, aliases, kind, and precedence
  together. Unicode and spoken spellings share classification and precedence.
  Spoken `over` retains its established wider fraction scope.
- Spoken fences combine actions (open/start/begin/left and close/end/right)
  with declared shapes (parentheses, square brackets, and braces). A generic
  spoken bracket closer takes the current opener’s shape. Explicit shape
  names and literal delimiters still require matching pairs. The bare word
  `bracket` retains its round-group convention.
- Callable function declarations generate the corresponding notation words.
  Enabled named operators also accept function arguments. User dictionary
  definitions continue to take precedence over built-ins.

Add syntax to its declaration and parsing production, rather than introducing
new token-type lists in an input handler. Lexical spellings and mathematical
scope rules remain explicit; recognizing a new word does not imply inventing a
missing operand or interpreting arbitrary prose as mathematics.

`tests/grammar-consistency.test.mjs` and `tests/operand-composition.test.mjs`
check independently specified formulas across compositions and input modes.
Editor integration tests exercise typing, paste, dictation, and Undo/Redo.
