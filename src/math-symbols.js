// Labels and conventional aliases keep symbols discoverable without source commands.
const groups=[
 ['logic','Logic',`∀|for all|forall universal quantifier
∃|there exists|exists existential quantifier
∄|there does not exist|nexists
¬|not|neg negation
∧|and|wedge conjunction
∨|or|vee disjunction
⊻|exclusive or|xor
⇒|implies|Rightarrow implication
⇐|implied by|Leftarrow
⇔|if and only if|iff equivalence
⊤|true|top tautology
⊥|false|bottom contradiction perpendicular
⊢|proves|vdash entails
⊣|reverse turnstile|dashv adjunction adjoint
⊨|models|vDash satisfies entails
⊩|forces|Vdash
⊬|does not prove|nvdash
⊭|does not model|nvDash
∴|therefore|hence
∵|because|since`],
 ['sets','Sets',`∈|element of|in membership belongs to
∉|not an element of|notin
∋|contains as element|ni
∌|does not contain as element|notni
⊂|proper subset|subset
⊆|subset or equal|subseteq
⊊|strict subset|subsetneq
⊄|not a subset|nsubset
⊈|not a subset or equal|nsubseteq
⊃|proper superset|supset
⊇|superset or equal|supseteq
⊋|strict superset|supsetneq
⊅|not a superset|nsupset
⊉|not a superset or equal|nsupseteq
∪|union|cup
∩|intersection|cap
∅|empty set|varnothing emptyset
∖|set difference|setminus
⊎|disjoint union|uplus
℘|power set|wp Weierstrass
ℕ|natural numbers|N naturals
ℤ|integers|Z
ℚ|rational numbers|Q rationals
ℝ|real numbers|R reals
ℂ|complex numbers|C
ℍ|quaternions|H
ℙ|projective space|P primes probability
ℵ|aleph|cardinality
ℶ|beth|cardinality`],
 ['relations','Relations',`=|equals|equal
≠|not equal|ne neq !=
<|less than|lt
>|greater than|gt
≤|less than or equal|le leq <= at most
≥|greater than or equal|ge geq >= at least
≪|much less than|ll
≫|much greater than|gg
≮|not less than|nless
≯|not greater than|ngtr
≰|not less than or equal|nleq
≱|not greater than or equal|ngeq
≈|approximately equal|approx
≃|asymptotically equal|simeq
≅|congruent or isomorphic|cong isomorphism
≡|identically equal|equiv congruent modulo
∼|similar to|sim distribution
≍|asymptotically equivalent|asymp
≐|approaches the limit|doteq
≔|defined as|coloneqq definition
≕|equals by definition|eqqcolon
∝|proportional to|propto
∣|divides|mid such that
∤|does not divide|nmid
∥|parallel|parallel
∦|not parallel|nparallel
⊥|perpendicular|perp orthogonal
≺|precedes|prec
≼|precedes or equal|preceq
≻|succeeds|succ
≽|succeeds or equal|succeq`],
 ['arrows','Arrows & categories',`→|right arrow|to rightarrow morphism
←|left arrow|leftarrow
↔|left right arrow|leftrightarrow
↦|maps to|mapsto
↤|maps from|mapsfrom
↪|right hook arrow|hookrightarrow inclusion embedding
↩|left hook arrow|hookleftarrow
↠|right two headed arrow|twoheadrightarrow surjection
↞|left two headed arrow|twoheadleftarrow
↣|right arrow with tail|rightarrowtail injection
↢|left arrow with tail|leftarrowtail
⇀|right harpoon up|rightharpoonup
⇁|right harpoon down|rightharpoondown
↼|left harpoon up|leftharpoonup
↽|left harpoon down|leftharpoondown
⇌|equilibrium arrows|rightleftharpoons
⇄|right left arrows|rightleftarrows
⇉|parallel right arrows|rightrightarrows
⇇|parallel left arrows|leftleftarrows
↑|up arrow|uparrow
↓|down arrow|downarrow
↕|up down arrow|updownarrow
⇑|double up arrow|Uparrow
⇓|double down arrow|Downarrow
⇕|double up down arrow|Updownarrow
↗|north east arrow|nearrow
↘|south east arrow|searrow
↖|north west arrow|nwarrow
↙|south west arrow|swarrow
⟶|long right arrow|longrightarrow
⟵|long left arrow|longleftarrow
⟷|long left right arrow|longleftrightarrow
⟹|long implication|Longrightarrow
⟺|long equivalence|Longleftrightarrow
⟼|long maps to|longmapsto
↝|right squiggle arrow|rightsquigarrow
↜|left squiggle arrow|leftsquigarrow`],
 ['operators','Operators',`+|plus|addition
−|minus|subtraction
±|plus or minus|pm
∓|minus or plus|mp
×|times|multiplication cross product
÷|divide|division div
·|center dot|cdot dot product multiplication
∘|composition|circ compose
⋅|dot operator|cdot
∗|asterisk operator|ast convolution
⋆|star operator|star
⊕|direct sum|oplus exclusive or
⊖|circled minus|ominus
⊗|tensor product|otimes
⊘|circled division|oslash
⊙|circled dot|odot Hadamard product
⊚|circled ring|circledcirc
⊛|circled asterisk|circledast
⊞|boxed plus|boxplus
⊟|boxed minus|boxminus
⊠|boxed times|boxtimes
⊡|boxed dot|boxdot
⋄|diamond operator|diamond
∧|meet|wedge
∨|join|vee
⊓|square intersection|sqcap
⊔|square union|sqcup`],
 ['calculus','Calculus & large operators',`∑|sum|sum summation sigma
∏|product|prod
∐|coproduct|coprod
∫|integral|int
∬|double integral|iint
∭|triple integral|iiint
∮|contour integral|oint
∯|surface integral|oiint
∰|volume integral|oiiint
∂|partial derivative|partial
∇|nabla|gradient grad divergence curl
∞|infinity|infty
√|square root sign|surd radical
∛|cube root sign|radical
∜|fourth root sign|radical
⋃|big union|bigcup
⋂|big intersection|bigcap
⨁|big direct sum|bigoplus
⨂|big tensor product|bigotimes
⨀|big circled dot|bigodot
⋀|big conjunction|bigwedge
⋁|big disjunction|bigvee`],
 ['greek','Greek letters',`α|alpha
β|beta
γ|gamma
δ|delta
ε|epsilon
ϵ|variant epsilon|varepsilon
ζ|zeta
η|eta
θ|theta
ϑ|variant theta|vartheta
ι|iota
κ|kappa
ϰ|variant kappa|varkappa
λ|lambda
μ|mu
ν|nu
ξ|xi
ο|omicron
π|pi
ϖ|variant pi|varpi
ρ|rho
ϱ|variant rho|varrho
σ|sigma
ς|final sigma|varsigma
τ|tau
υ|upsilon
φ|phi
ϕ|variant phi|varphi
χ|chi
ψ|psi
ω|omega
Γ|capital gamma|Gamma
Δ|capital delta|Delta
Θ|capital theta|Theta
Λ|capital lambda|Lambda
Ξ|capital xi|Xi
Π|capital pi|Pi
Σ|capital sigma|Sigma
Υ|capital upsilon|Upsilon
Φ|capital phi|Phi
Ψ|capital psi|Psi
Ω|capital omega|Omega`],
 ['geometry','Geometry & delimiters',`∠|angle|angle
∡|measured angle|measuredangle
∢|spherical angle|sphericalangle
°|degree|degrees
′|prime|derivative feet
″|double prime|second derivative inches
‴|triple prime|third derivative
△|triangle|triangle
▽|inverted triangle|triangledown
□|square|Box end proof qed
◇|diamond|lozenge
○|circle|bigcirc
∙|bullet|point
⌈|left ceiling|lceil
⌉|right ceiling|rceil
⌊|left floor|lfloor
⌋|right floor|rfloor
⟨|left angle bracket|langle inner product
⟩|right angle bracket|rangle inner product
‖|double vertical bar|norm
⟦|left double bracket|llbracket
⟧|right double bracket|rrbracket`],
 ['special','Special letters & marks',`ℓ|script ell|ell length
ℏ|reduced Planck constant|hbar
ℑ|imaginary part|Im imaginary
ℜ|real part|Re real
℧|mho|conductance
ℯ|Euler number|e exponential
ⅈ|imaginary unit|i
ℱ|script F|Fourier
ℒ|script L|Laplace Lagrangian
ℬ|script B|Borel
ℰ|script E|expectation
ℳ|script M|manifold
ℛ|script R
…|ellipsis|ldots horizontal dots
⋯|centered ellipsis|cdots
⋮|vertical ellipsis|vdots
⋱|diagonal ellipsis|ddots
†|dagger|adjoint
‡|double dagger|ddagger
✓|check mark|checkmark
♯|sharp|musical
♭|flat|musical
♮|natural sign|musical`]
];
export const SYMBOL_GROUPS=groups.map(([id,label])=>({id,label}));
// A symbol can have multiple mathematical readings; search includes them all.
const bySymbol=new Map();
for(const [category,,data] of groups)for(const line of data.split('\n')){const [symbol,label,aliases='']=line.split('|');const existing=bySymbol.get(symbol);if(existing){existing.categories.push(category);existing.label+=' / '+label;existing.search+=(' '+label+' '+aliases).toLowerCase();}else bySymbol.set(symbol,{symbol,label,category,categories:[category],search:`${symbol} ${label} ${aliases}`.toLowerCase()});}
export const MATH_SYMBOLS=[...bySymbol.values()];
const COMMON='∈ ∀ ∃ ⇒ ⇔ ℝ ℂ ℕ ℤ ∑ ∫ ∞ ∂ ∇ ⊗ ⊕ ≤ ≥ ≠ ± α π'.split(' ');
export function findSymbols(query='',category='common'){
 const words=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
 const base=category==='common'&&!words.length?COMMON.map(symbol=>bySymbol.get(symbol)):category==='common'||category==='all'?MATH_SYMBOLS:MATH_SYMBOLS.filter(s=>s.categories.includes(category));
 return base.filter(entry=>words.every(word=>entry.search.includes(word)));
}
