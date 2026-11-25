export function editorHints(isMac){
 const mod=isMac?'⌘':'Ctrl+';
 return '<span class="keyboard-hints" aria-label="Keyboard shortcuts">'+[
  ['/','fraction'],['^','power'],['_','subscript'],['← →','navigate'],['↵','new line'],['`','math / text'],['Tab','indent'],[mod+'Z','undo'],[mod+'⇧Z','redo']
 ].map(([key,label],i)=>`<span class="key-hint${i>4?' extra-hint':''}"><kbd>${key}</kbd>${label}</span>`).join('')+'</span>';
}
