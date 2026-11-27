export const PLAIN_INPUT_LIMIT=16000;
// One set of semantic settings for every editor entry point. Math mode is an
// explicit user choice, not evidence inferred from the surrounding document.
export function mathInputOptions(field,overrides={}){
 return {mode:field.isProseLine?.()?'text':field.pageInputMode,groups:field.notationGroups,libraries:field.customDictionaries,shortcuts:field.getNotationShortcuts?.(),...overrides};
}
