# Pasted and transcribed mathematics

Recognition runs locally on completed text from the clipboard or the editor's keyboard-input delegate. It does not record audio, call a language model, collect input, or train from users' documents.

## Research

[MathSpeech](https://arxiv.org/html/2412.15655v3) studies recordings from actual mathematics lectures and separates transcription correction from formula generation. Its examples show that recognized words alone can lose mathematical structure.

[Speech-to-LaTeX](https://arxiv.org/html/2508.03542v2) studies both isolated equations and mathematics embedded in sentences. It identifies genuine scope ambiguity in spoken fractions, as well as symbol and text/math boundary errors. A transcript does not always determine one intended expression.

[MathSpeak](https://www.seewritehear.com/accessible-mathml/mathspeak/examples/quick-tutorial/index.php?explicitness=0&interp=all&verbosity=b) provides explicit boundaries for fractions, roots, and scripts. These are useful grammar conventions, although ordinary dictation does not necessarily follow them. [MathML intent](https://www.w3.org/TR/mathml4/) likewise distinguishes presentation from intended meaning.

## Algorithm

1. Keep explicit LaTeX and delimited inline math on their existing paths. Respect forced Text mode, enabled categories, and custom dictionary precedence.
2. Tokenize complete words and longest dictionary phrases. Recognize conventional spoken numbers, operators, functions, grouping, and scripts.
3. Parse expression structure with operator precedence and bounded recursion. Serialize complete fractions and multi-digit exponents with braces rather than performing word substitution.
4. Recognize complete expressions within prose only when they have sufficient grammatical evidence. Preserve surrounding wording and punctuation.
5. Preserve the original text when structure is incomplete, unsupported, or ambiguous. Do not invent transcription repairs or infer unstated grouping. Explicit grouping can make an otherwise ambiguous expression convertible.
6. Insert the result using the existing validated, single-transaction paste path. Recognition also considers the preceding canvas operand for dictated fragments.

Very long individual lines (over 16,000 characters) remain text rather than invoking automatic recognition. The existing total paste limit still applies. This keeps large prose documents bounded; shorter lines are assessed separately.

## Evaluation

Run `node scripts/evaluate-pasted-math.mjs` and `npm test`.

The committed corpus contains 80 original examples: 57 development cases and 23 held-out examples. They cover arithmetic, numbers, structures, notation, mixed prose/math, and text that must remain unchanged. These are original regression examples informed by the research categories, not downloaded transcripts or a representative real-world benchmark.

The first implementation passed 24/57 development cases and changed four protected prose examples. The structural parser passes all 80, with no protected prose changes. Another test generates 288 expression combinations and checks mathematical structure, alongside malformed-input and ambiguity checks. This is test-driven grammar development, not reinforcement learning or evidence of general dictation accuracy.

For an external check, run `node scripts/evaluate-pasted-math.mjs --mathspeech`. It fetches metadata for the first 100 public [MathSpeech dataset](https://huggingface.co/datasets/AAAI2025/MathSpeech) rows, processes their human transcriptions, and reports aggregate counts. Audio is not downloaded; transcripts, media links, and source identities are not saved in the repository. This is an ordered convenience sample with topic bias, not a random held-out benchmark.

On the inspected sample, strict MathML matches improved from 8/100 to 13/100. The final parser preserved 74/100 as text and generated no invalid LaTeX. Structural comparison removes redundant rows and invisible multiplication but still distinguishes some equivalent presentation choices. The remaining 13 converted nonmatches include unsupported interpretations and presentation differences; they are not counted as correct. These results are substantially weaker than the original regression set and must be reported separately.

## Limits

Complex calculus, populated matrices, domain-specific shorthand, implicit grouping, homophones, and damaged ASR transcripts remain incomplete. Text-only recognition cannot recover information absent from the transcript. Expand grammar with independently authored positive, negative, and ambiguous cases; keep external checks separate from tuning. Do not loosen prose protection merely to raise conversion counts.
