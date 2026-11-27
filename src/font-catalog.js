// Stable identifiers are saved with the page. Native LaTeX preserves individual
// text runs through \fontfamily; math continues to use mathematical typefaces.
const entry=(id,name,category,family,description)=>Object.freeze({id,name,category,family,description,css:['roman','sans-serif','monospace'].includes(family)?({roman:'Georgia, serif','sans-serif':'system-ui, sans-serif',monospace:'ui-monospace, monospace'}[family]):`"${family}", ${category==='Serif'?'serif':category==='Mono'?'monospace':'sans-serif'}`});
export const FONT_CATALOG=Object.freeze([
 entry('system','System Sans','Sans','sans-serif','Familiar & effortless'),
 entry('inter','Inter','Sans','Inter Variable','Crisp & versatile'),
 entry('dm-sans','DM Sans','Sans','DM Sans Variable','Geometric & balanced'),
 entry('manrope','Manrope','Sans','Manrope Variable','Clean & contemporary'),
 entry('nunito-sans','Nunito Sans','Sans','Nunito Sans Variable','Soft & approachable'),
 entry('work-sans','Work Sans','Sans','Work Sans Variable','Quiet & practical'),
 entry('source-sans','Source Sans 3','Sans','Source Sans 3 Variable','Open & readable'),
 entry('serif','Classic Serif','Serif','roman','Traditional & familiar'),
 entry('source-serif','Source Serif 4','Serif','Source Serif 4 Variable','Literary & composed'),
 entry('lora','Lora','Serif','Lora Variable','Warm & expressive'),
 entry('merriweather','Merriweather','Serif','Merriweather Variable','Sturdy & readable'),
 entry('baskerville','Libre Baskerville','Serif','Libre Baskerville','Elegant & editorial'),
 entry('roboto-slab','Roboto Slab','Serif','Roboto Slab Variable','Structured & distinctive'),
 entry('mono','System Mono','Mono','monospace','Simple & precise'),
 entry('jetbrains','JetBrains Mono','Mono','JetBrains Mono Variable','Technical & spacious'),
 entry('ibm-plex','IBM Plex Mono','Mono','IBM Plex Mono','Deliberate & detailed'),
 entry('caveat','Caveat','Handwritten','Caveat Variable','Loose & personal'),
 entry('kalam','Kalam','Handwritten','Kalam','Casual & handwritten')
]);
export const FONT_CATEGORIES=['All','Sans','Serif','Mono','Handwritten'];
export const fontById=id=>FONT_CATALOG.find(font=>font.id===id);
export const fontByFamily=family=>FONT_CATALOG.find(font=>font.family===family);
export function matchingFonts(query='',category='All'){
 const words=query.trim().toLowerCase().split(/\s+/);
 return FONT_CATALOG.filter(font=>(category==='All'||font.category===category)&&words.every(word=>`${font.name} ${font.category} ${font.description}`.toLowerCase().includes(word)));
}
