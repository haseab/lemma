// Original examples informed by published problem categories, not copied transcripts.
const math=(split,category,pairs)=>pairs.map(([input,expected],i)=>({id:`${split}-${category}-${i+1}`,split,category,input,expected}));
const prose=(split,inputs)=>inputs.map((input,i)=>({id:`${split}-prose-${i+1}`,split,category:'prose',input,expected:`\\text{${input}}`}));
export const pastedMathCases=[
 ...math('development','arithmetic',[
 ['x squared plus five equals fourteen','x^{2}+5=14'],['y cubed minus twelve equals zero','y^{3}-12=0'],
 ['a to the power of twelve','a^{12}'],['b to the power of negative three','b^{-3}'],
 ['negative seven plus twenty one equals fourteen','-7+21=14'],['three point five times four equals fourteen','3.5\\times4=14'],
 ['x divided by seven','\\frac{x}{7}'],['nine over thirteen','\\frac{9}{13}'],
 ['x subscript eleven plus y subscript two','x_{11}+y_{2}'],['p to the fourth equals q','p^{4}=q'],
 ['two hundred thirty four plus six','234+6'],['2x + 3y = 17','2x+3y=17']]),
 ...math('development','structures',[
 ['square root of twenty five','\\sqrt{25}'],['cube root of eight','\\sqrt[3]{8}'],
 ['square root of open parenthesis x plus seven close parenthesis','\\sqrt{\\left(x+7\\right)}'],
 ['open parenthesis a plus b close parenthesis squared','\\left(a+b\\right)^{2}'],
 ['start fraction a plus b over c minus d end fraction','\\frac{a+b}{c-d}'],
 ['start root x squared plus four end root','\\sqrt{x^{2}+4}'],
 ['absolute value of open parenthesis x minus four close parenthesis','\\left|\\left(x-4\\right)\\right|'],
 ['sine of theta equals zero','\\sin\\left(\\theta\\right)=0'],['cosine of open parenthesis x plus y close parenthesis','\\cos\\left(x+y\\right)'],
 ['f of x equals x squared','f\\left(x\\right)=x^{2}'],['log of x equals three','\\log\\left(x\\right)=3'],
 ['x to the power of open parenthesis n plus two close parenthesis','x^{\\left(n+2\\right)}']]),
 ...math('development','notation',[
 ['for all z element of real numbers','\\forall z\\in\\mathbb{R}'],['there exists k is in integers','\\exists k\\in\\mathbb{Z}'],
 ['m is at most seventeen','m\\le17'],['a is not equal to b','a\\ne b'],['x is greater than or equal to zero','x\\ge0'],
 ['alpha plus beta equals gamma','\\alpha+\\beta=\\gamma'],['A union B','A\\cup B'],['f maps to g','f\\mapsto g']]),
 ...math('development','mixed',[
 ['We have x squared equals sixteen.','\\text{We have }x^{2}=16\\text{.}'],
 ['Let z element of complex numbers.','\\text{Let }z\\in\\mathbb{C}\\text{.}'],
 ['The result is x plus three equals eight.','\\text{The result is }x+3=8\\text{.}'],
 ['Assume a is less than b, then b is greater than a.','\\text{Assume }a<b\\text{, then }b>a\\text{.}'],
 ['A short note.\nx squared equals nine','\\displaylines{\\text{A short note.}\\\\x^{2}=9}']]),
 ...prose('development',[
 'This is in my notebook.','At most seven people arrived.','I am here.','We go on.','The two times we tried were useful.',
 'The power of a good idea is clear.','The sum of our efforts mattered.','A fraction of the audience left.','There is no greater than usual demand.',
 'I like apple pie.','We say sine when discussing notation.','The element of surprise matters.','The vector of change is unclear.',
 'one over x plus two','square root of x plus y','x to the power of n plus one','x plus','start fraction x over y',
 'The code uses foo_bar as a name.','The cat is in the box.'
 ]),
 ...math('holdout','arithmetic',[
 ['r squared plus nineteen equals forty four','r^{2}+19=44'],['t to the power of fifteen','t^{15}'],['negative twelve times six','-12\\times6'],
 ['two point seven plus one point three equals four','2.7+1.3=4'],['a subscript twenty one equals b','a_{21}=b']]),
 ...math('holdout','structures',[
 ['start fraction p minus q over r plus s end fraction','\\frac{p-q}{r+s}'],['cube root of twenty seven','\\sqrt[3]{27}'],
 ['open parenthesis m minus n close parenthesis cubed','\\left(m-n\\right)^{3}'],['sine of phi equals one','\\sin\\left(\\phi\\right)=1'],
 ['h of t equals t cubed','h\\left(t\\right)=t^{3}']]),
 ...math('holdout','mixed',[
 ['Thus u plus five equals twelve.','\\text{Thus }u+5=12\\text{.}'],['Choose q element of rational numbers.','\\text{Choose }q\\in\\mathbb{Q}\\text{.}'],
 ['We know r is at least twenty.','\\text{We know }r\\ge20\\text{.}']]),
 ...prose('holdout',[
 'It is in the folder.','At least twenty guests came.','The root of the problem is unclear.','We need a matrix of responsibilities.',
 'The product of our work is ready.','I am at home.','three over z minus one','cube root of a plus b','y equals','open parenthesis x plus two'
 ])
];
