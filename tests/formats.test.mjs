import {test} from 'node:test';
import assert from 'node:assert/strict';
import {importLatex,exportLatex,mixedTextToLatex,importPageFile} from '../src/formats.js';
test('LaTeX fragments and common display environments are accepted without executing TeX',()=>{
 assert.equal(importLatex('\\[\\frac{a}{b}\\]'),'\\frac{a}{b}');
 assert.equal(importLatex('$$x^2$$'),'x^2');assert.equal(importLatex('\\begin{equation}y=2\\end{equation}'),'y=2');
 assert.equal(importLatex('\\begin{align}x&=2\\\\y&=3\\end{align}'),'\\begin{aligned}x&=2\\\\y&=3\\end{aligned}');
 assert.throws(()=>importLatex('\\input{external.tex}'),/not supported/);
});
test('simple document prose and inline equations import together; literal text is escaped',()=>{
 const source='\\documentclass{article}\n\\begin{document}Let $x^2$ be useful.\nA & B\\end{document}';
 assert.equal(importLatex(source),'\\displaylines{\\text{Let }x^2\\text{ be useful.}\\\\\\text{A \\& B}}');
 assert.equal(mixedTextToLatex('An example `x+1` is clear.'),'\\text{An example }x+1\\text{ is clear.}');
});
test('multiline LaTeX export round trips and declares packages for color and AMS math',()=>{
 const latex='\\displaylines{\\text{A note}\\\\x=\\frac12}';const tex=exportLatex(latex);
 assert.match(tex,/amsmath,amssymb,xcolor/);assert.equal(importLatex(tex),latex);
 assert.equal(importPageFile({name:'example.tex',data:'x^2'}).content.latex,'x^2');
});
