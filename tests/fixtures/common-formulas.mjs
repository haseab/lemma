// Independently written spoken readings of standard textbook formulas.
// Expected expressions are authored separately from the parser.
export const formulaSources={
 algebra:'https://openstax.org/books/algebra-and-trigonometry-2e/pages/2-key-equations',
 geometry:'https://openstax.org/books/precalculus-2e/pages/8-key-equations',
 trigonometry:'https://openstax.org/books/precalculus-2e/pages/7-key-equations',
 calculus:'https://openstax.org/books/calculus-volume-1/pages/5-key-equations',
 probability:'https://openstax.org/books/precalculus-2e/pages/11-key-equations',
 mechanics:'https://apcentral.collegeboard.org/media/pdf/ap-physics-c-mechanics-equations-sheet.pdf',
 electricity:'https://apcentral.collegeboard.org/media/pdf/ap-physics-c-electricity-and-magnetism-equations-sheet.pdf',
 thermal:'https://openstax.org/books/university-physics-volume-2/pages/3-key-equations',
 modern:'https://openstax.org/books/university-physics-volume-3/pages/6-key-equations'
};
const rows=[];let category;
const section=name=>{category=name;};
const add=(name,input,expected)=>rows.push({id:rows.length+1,category,name,input,expected});
section('algebra');
add('Slope-intercept line','y equals m x plus b',String.raw`y=m x+b`);
add('Slope','m equals open parenthesis y subscript two minus y subscript one close parenthesis over open parenthesis x subscript two minus x subscript one close parenthesis',String.raw`m=\frac{\left(y_{2}-y_{1}\right)}{\left(x_{2}-x_{1}\right)}`);
add('Point-slope line','y minus y subscript one equals m times open parenthesis x minus x subscript one close parenthesis',String.raw`y-y_{1}=m\times\left(x-x_{1}\right)`);
add('Quadratic formula','x equals minus b plus or minus the square root of b squared minus four a c all over two a',String.raw`x=\frac{-b\pm\sqrt{b^{2}-4 a c}}{2 a}`);
add('Pythagorean theorem','a squared plus b squared equals c squared',String.raw`a^{2}+b^{2}=c^{2}`);
add('Square of a sum','open parenthesis a plus b close parenthesis squared equals a squared plus two a b plus b squared',String.raw`\left(a+b\right)^{2}=a^{2}+2 a b+b^{2}`);
add('Difference of squares','a squared minus b squared equals open parenthesis a minus b close parenthesis times open parenthesis a plus b close parenthesis',String.raw`a^{2}-b^{2}=\left(a-b\right)\times\left(a+b\right)`);
add('Cube of a sum','open parenthesis a plus b close parenthesis cubed equals a cubed plus three a squared b plus three a b squared plus b cubed',String.raw`\left(a+b\right)^{3}=a^{3}+3 a^{2} b+3 a b^{2}+b^{3}`);
add('Exponent product rule','x to the power a times x to the power b equals x to the power open parenthesis a plus b close parenthesis',String.raw`x^{a}\times x^{b}=x^{\left(a+b\right)}`);
add('Exponent quotient rule','start fraction x to the power a over x to the power b end fraction equals x to the power open parenthesis a minus b close parenthesis',String.raw`\frac{x^{a}}{x^{b}}=x^{\left(a-b\right)}`);
add('Logarithm product rule','natural log of open parenthesis a times b close parenthesis equals natural log of a plus natural log of b',String.raw`\ln\left(a\times b\right)=\ln\left(a\right)+\ln\left(b\right)`);
add('Change of logarithm base','log base b of x equals natural log of x over natural log of b',String.raw`\log_{b}\left(x\right)=\frac{\ln\left(x\right)}{\ln\left(b\right)}`);
add('Simple interest','capital I equals capital P r t',String.raw`I=P r t`);
add('Compound interest','capital A equals capital P times open parenthesis one plus start fraction r over n end fraction close parenthesis to the power open parenthesis n t close parenthesis',String.raw`A=P\times\left(1+\frac{r}{n}\right)^{\left(n t\right)}`);
add('Exponential growth','capital A equals capital A subscript zero times e to the power open parenthesis k t close parenthesis',String.raw`A=A_{0}\times e^{\left(k t\right)}`);
section('geometry');
add('Circle circumference','capital C equals two pi r',String.raw`C=2\pi r`);
add('Circle area','capital A equals pi r squared',String.raw`A=\pi r^{2}`);
add('Triangle area','capital A equals one half b h',String.raw`A=\frac{1}{2} b h`);
add('Rectangle area','capital A equals l w',String.raw`A=l w`);
add('Sphere surface area','capital A equals four pi r squared',String.raw`A=4\pi r^{2}`);
add('Sphere volume','capital V equals four thirds pi r cubed',String.raw`V=\frac{4}{3}\pi r^{3}`);
add('Cylinder volume','capital V equals pi r squared h',String.raw`V=\pi r^{2} h`);
add('Cone volume','capital V equals one third pi r squared h',String.raw`V=\frac{1}{3}\pi r^{2} h`);
add('Distance in a plane','d equals start root open parenthesis x subscript two minus x subscript one close parenthesis squared plus open parenthesis y subscript two minus y subscript one close parenthesis squared end root',String.raw`d=\sqrt{\left(x_{2}-x_{1}\right)^{2}+\left(y_{2}-y_{1}\right)^{2}}`);
add('Law of cosines','c squared equals a squared plus b squared minus two a b cosine of theta',String.raw`c^{2}=a^{2}+b^{2}-2 a b\cos\left(\theta\right)`);
section('trigonometry');
add('Pythagorean identity','sine squared theta plus cosine squared theta equals one',String.raw`\sin^{2}\left(\theta\right)+\cos^{2}\left(\theta\right)=1`);
add('Tangent identity','one plus tangent squared theta equals secant squared theta',String.raw`1+\tan^{2}\left(\theta\right)=\sec^{2}\left(\theta\right)`);
add('Tangent ratio','tangent of theta equals sine of theta over cosine of theta',String.raw`\tan\left(\theta\right)=\frac{\sin\left(\theta\right)}{\cos\left(\theta\right)}`);
add('Sine double angle','sine of open parenthesis two theta close parenthesis equals two sine of theta cosine of theta',String.raw`\sin\left(2\theta\right)=2\sin\left(\theta\right)\cos\left(\theta\right)`);
add('Cosine double angle','cosine of open parenthesis two theta close parenthesis equals cosine squared theta minus sine squared theta',String.raw`\cos\left(2\theta\right)=\cos^{2}\left(\theta\right)-\sin^{2}\left(\theta\right)`);
add('Sine angle addition','sine of open parenthesis a plus b close parenthesis equals sine of a cosine of b plus cosine of a sine of b',String.raw`\sin\left(a+b\right)=\sin\left(a\right)\cos\left(b\right)+\cos\left(a\right)\sin\left(b\right)`);
add('Cosine angle addition','cosine of open parenthesis a plus b close parenthesis equals cosine of a cosine of b minus sine of a sine of b',String.raw`\cos\left(a+b\right)=\cos\left(a\right)\cos\left(b\right)-\sin\left(a\right)\sin\left(b\right)`);
add('Law of sines','a over sine of capital A equals b over sine of capital B',String.raw`\frac{a}{\sin\left(A\right)}=\frac{b}{\sin\left(B\right)}`);
add('Degrees to radians','theta equals start fraction pi over one hundred eighty end fraction times d',String.raw`\theta=\frac{\pi}{180}\times d`);
add('Euler identity','e to the power open parenthesis i pi close parenthesis plus one equals zero',String.raw`e^{\left(i\pi\right)}+1=0`);
section('calculus');
add('Power derivative','derivative with respect to x of x to the power n equals n times x to the power open parenthesis n minus one close parenthesis',String.raw`\frac{d}{d x}x^{n}=n\times x^{\left(n-1\right)}`);
add('Sine derivative','derivative with respect to x of sine of x equals cosine of x',String.raw`\frac{d}{d x}\sin\left(x\right)=\cos\left(x\right)`);
add('Cosine derivative','derivative with respect to x of cosine of x equals minus sine of x',String.raw`\frac{d}{d x}\cos\left(x\right)=-\sin\left(x\right)`);
add('Exponential derivative','derivative with respect to x of e to the power x equals e to the power x',String.raw`\frac{d}{d x}e^{x}=e^{x}`);
add('Logarithm derivative','derivative with respect to x of natural log of x equals one over x',String.raw`\frac{d}{d x}\ln\left(x\right)=\frac{1}{x}`);
add('Product derivative','derivative with respect to x of open parenthesis f of x times g of x close parenthesis equals f prime of x times g of x plus f of x times g prime of x',String.raw`\frac{d}{d x}\left(f\left(x\right)\times g\left(x\right)\right)=f^{\prime}\left(x\right)\times g\left(x\right)+f\left(x\right)\times g^{\prime}\left(x\right)`);
add('Chain rule','derivative with respect to x of f of open parenthesis g of x close parenthesis equals f prime of open parenthesis g of x close parenthesis times g prime of x',String.raw`\frac{d}{d x}f\left(g\left(x\right)\right)=f^{\prime}\left(g\left(x\right)\right)\times g^{\prime}\left(x\right)`);
add('Quotient derivative','derivative with respect to x of start fraction f of x over g of x end fraction equals start fraction f prime of x times g of x minus f of x times g prime of x over open parenthesis g of x close parenthesis squared end fraction',String.raw`\frac{d}{d x}\frac{f\left(x\right)}{g\left(x\right)}=\frac{f^{\prime}\left(x\right)\times g\left(x\right)-f\left(x\right)\times g^{\prime}\left(x\right)}{\left(g\left(x\right)\right)^{2}}`);
add('Power antiderivative','integral of x squared d x equals x cubed over three plus capital C',String.raw`\int x^{2}\,d x=\frac{x^{3}}{3}+C`);
add('Definite integral','integral from zero to one of x squared d x equals one third',String.raw`\int_{0}^{1}x^{2}\,d x=\frac{1}{3}`);
add('Fundamental theorem','integral from a to b of f of x d x equals capital F of b minus capital F of a',String.raw`\int_{a}^{b}f\left(x\right)\,d x=F\left(b\right)-F\left(a\right)`);
add('Sum of integers','sum from i equals one to n of i equals n times open parenthesis n plus one close parenthesis all over two',String.raw`\sum_{i=1}^{n}i=\frac{n\times\left(n+1\right)}{2}`);
add('Sum of squares','sum from i equals one to n of i squared equals n times open parenthesis n plus one close parenthesis times open parenthesis two n plus one close parenthesis all over six',String.raw`\sum_{i=1}^{n}i^{2}=\frac{n\times\left(n+1\right)\times\left(2 n+1\right)}{6}`);
add('Finite geometric series','sum from k equals zero to n of r to the power k equals start fraction one minus r to the power open parenthesis n plus one close parenthesis over one minus r end fraction',String.raw`\sum_{k=0}^{n}r^{k}=\frac{1-r^{\left(n+1\right)}}{1-r}`);
add('Sum of a constant','sum from i equals one to n of c equals n c',String.raw`\sum_{i=1}^{n}c=n c`);
section('probability');
add('Complement probability','capital P of open parenthesis capital A superscript c close parenthesis equals one minus capital P of capital A',String.raw`P\left(A^{c}\right)=1-P\left(A\right)`);
add('Probability addition','capital P of open parenthesis capital A union capital B close parenthesis equals capital P of capital A plus capital P of capital B minus capital P of open parenthesis capital A intersection capital B close parenthesis',String.raw`P\left(A\cup B\right)=P\left(A\right)+P\left(B\right)-P\left(A\cap B\right)`);
add('Conditional probability','capital P of open parenthesis capital A given capital B close parenthesis equals start fraction capital P of open parenthesis capital A intersection capital B close parenthesis over capital P of capital B end fraction',String.raw`P\left(A\mid B\right)=\frac{P\left(A\cap B\right)}{P\left(B\right)}`);
add('Bayes theorem','capital P of open parenthesis capital A given capital B close parenthesis equals start fraction capital P of open parenthesis capital B given capital A close parenthesis times capital P of capital A over capital P of capital B end fraction',String.raw`P\left(A\mid B\right)=\frac{P\left(B\mid A\right)\times P\left(A\right)}{P\left(B\right)}`);
add('Combinations','n choose r equals start fraction n factorial over r factorial times open parenthesis n minus r close parenthesis factorial end fraction',String.raw`\binom{n}{r}=\frac{n!}{r!\times\left(n-r\right)!}`);
add('Permutations','capital P of open parenthesis n comma r close parenthesis equals start fraction n factorial over open parenthesis n minus r close parenthesis factorial end fraction',String.raw`P\left(n,r\right)=\frac{n!}{\left(n-r\right)!}`);
add('Normal density','f of x equals start fraction one over sigma times square root of open parenthesis two pi close parenthesis end fraction times e to the power open parenthesis minus start fraction open parenthesis x minus mu close parenthesis squared over two sigma squared end fraction close parenthesis',String.raw`f\left(x\right)=\frac{1}{\sigma\times\sqrt{\left(2\pi\right)}}\times e^{\left(-\frac{\left(x-\mu\right)^{2}}{2\sigma^{2}}\right)}`);
add('Sample mean','x bar equals start fraction sum from i equals one to n of x subscript i over n end fraction',String.raw`\bar{x}=\frac{\sum_{i=1}^{n}x_{i}}{n}`);
add('Sample variance','s squared equals start fraction sum from i equals one to n of open parenthesis x subscript i minus x bar close parenthesis squared over n minus one end fraction',String.raw`s^{2}=\frac{\sum_{i=1}^{n}\left(x_{i}-\bar{x}\right)^{2}}{n-1}`);
add('Standard score','z equals start fraction x minus mu over sigma end fraction',String.raw`z=\frac{x-\mu}{\sigma}`);
section('mechanics');
add('Newton second law','capital F equals m a',String.raw`F=m a`);
add('Momentum','p equals m v',String.raw`p=m v`);
add('Impulse','capital J equals capital delta p',String.raw`J=\Delta p`);
add('Constant acceleration velocity','v equals v subscript zero plus a t',String.raw`v=v_{0}+a t`);
add('Constant acceleration position','x equals x subscript zero plus v subscript zero t plus one half a t squared',String.raw`x=x_{0}+v_{0}t+\frac{1}{2}a t^{2}`);
add('Velocity-displacement relation','v squared equals v subscript zero squared plus two a times open parenthesis x minus x subscript zero close parenthesis',String.raw`v^{2}=v_{0}^{2}+2 a\times\left(x-x_{0}\right)`);
add('Kinetic energy','capital K equals one half m v squared',String.raw`K=\frac{1}{2}m v^{2}`);
add('Near-surface potential energy','capital U equals m g h',String.raw`U=m g h`);
add('Hooke law','capital F equals minus k x',String.raw`F=-k x`);
add('Constant-force work','capital W equals capital F d cosine of theta',String.raw`W=F d\cos\left(\theta\right)`);
add('Average power','capital P equals capital W over t',String.raw`P=\frac{W}{t}`);
add('Centripetal acceleration','a equals v squared over r',String.raw`a=\frac{v^{2}}{r}`);
add('Gravitational force','capital F equals start fraction capital G m subscript one m subscript two over r squared end fraction',String.raw`F=\frac{G m_{1}m_{2}}{r^{2}}`);
add('Escape speed','v equals square root of the fraction two capital G capital M over r',String.raw`v=\sqrt{\frac{2 G M}{r}}`);
add('Circular orbital speed','v equals square root of the fraction capital G capital M over r',String.raw`v=\sqrt{\frac{G M}{r}}`);
add('Torque magnitude','tau equals r capital F sine of theta',String.raw`\tau=r F\sin\left(\theta\right)`);
add('Point-mass inertia','capital I equals m r squared',String.raw`I=m r^{2}`);
add('Angular momentum','capital L equals capital I omega',String.raw`L=I\omega`);
add('Rotational kinetic energy','capital K equals one half capital I omega squared',String.raw`K=\frac{1}{2}I\omega^{2}`);
add('Angular acceleration velocity','omega equals omega subscript zero plus alpha t',String.raw`\omega=\omega_{0}+\alpha t`);
add('Mass-spring period','capital T equals two pi times square root of the fraction m over k',String.raw`T=2\pi\times\sqrt{\frac{m}{k}}`);
add('Small-angle pendulum period','capital T equals two pi times square root of the fraction l over g',String.raw`T=2\pi\times\sqrt{\frac{l}{g}}`);
add('Frequency and period','f equals one over capital T',String.raw`f=\frac{1}{T}`);
add('Wave speed','v equals f lambda',String.raw`v=f\lambda`);
section('electricity');
add('Coulomb force magnitude','capital F equals start fraction k q subscript one q subscript two over r squared end fraction',String.raw`F=\frac{k q_{1}q_{2}}{r^{2}}`);
add('Electric field magnitude','capital E equals capital F over q',String.raw`E=\frac{F}{q}`);
add('Point-charge potential','capital V equals k q over r',String.raw`V=\frac{k q}{r}`);
add('Ohm law','capital V equals capital I capital R',String.raw`V=I R`);
add('Electric power','capital P equals capital I capital V',String.raw`P=I V`);
add('Capacitance','capital C equals capital Q over capital V',String.raw`C=\frac{Q}{V}`);
add('Parallel-plate capacitance','capital C equals start fraction epsilon subscript zero capital A over d end fraction',String.raw`C=\frac{\epsilon_{0}A}{d}`);
add('Capacitor energy','capital U equals one half capital C capital V squared',String.raw`U=\frac{1}{2}C V^{2}`);
add('Magnetic force magnitude','capital F equals q v capital B sine of theta',String.raw`F=q v B\sin\left(\theta\right)`);
add('Magnetic flux','capital phi equals capital B capital A cosine of theta',String.raw`\Phi=B A\cos\left(\theta\right)`);
add('Faraday law','epsilon equals minus derivative with respect to t of capital phi',String.raw`\epsilon=-\frac{d}{d t}\Phi`);
section('thermal');
add('Ideal gas law','capital P capital V equals n capital R capital T',String.raw`P V=n R T`);
add('First law of thermodynamics','capital delta capital U equals capital Q minus capital W',String.raw`\Delta U=Q-W`);
add('Sensible heat','capital Q equals m c capital delta capital T',String.raw`Q=m c\Delta T`);
section('modern');
add('Photon energy','capital E equals h f',String.raw`E=h f`);
add('Mass-energy equivalence','capital E equals m c squared',String.raw`E=m c^{2}`);
export const commonFormulas=rows;
if(rows.length!==100)throw Error(`Expected 100 formulas, got ${rows.length}`);
