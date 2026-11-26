// Only the outer page rows are reflowed. Nested fraction, script, root and
// matrix layout remains MathLive's own inline geometry.
export function installPageWrapping(field){
 const style=document.createElement('style');style.dataset.lemmaWrapping='true';
 style.textContent=`
 .ML__container{display:block!important;min-width:0;width:100%}
 .ML__content{display:block!important;width:100%;min-width:0;overflow:visible!important;box-sizing:border-box}
 /* Keep positioned selection rectangles behind the wrapped line text. */
 .ML__selection{z-index:0;pointer-events:none}
 .ML__content > .ML__latex{display:block;width:100%;white-space:normal;position:relative;z-index:1}
 .ML__content > .ML__latex > .ML__base{display:block!important;width:100%;white-space:normal}
 .ML__content > .ML__latex > .ML__strut,.ML__content > .ML__latex > .ML__strut--bottom{display:none}
 .ML__content > .ML__latex > .ML__multiline_environment{display:block;width:100%}
 .ML__content > .ML__latex > .ML__multiline_environment > .col-align-l,
 .ML__content > .ML__latex > .ML__multiline_environment > .col-align-l > .ML__vlist-t,
 .ML__content > .ML__latex > .ML__multiline_environment > .col-align-l > .ML__vlist-t > .ML__vlist-r:first-child,
 .ML__content > .ML__latex > .ML__multiline_environment > .col-align-l > .ML__vlist-t > .ML__vlist-r:first-child > .ML__vlist{display:block;height:auto!important;width:100%;position:static}
 .ML__content > .ML__latex > .ML__multiline_environment > .col-align-l > .ML__vlist-t > .ML__vlist-r:not(:first-child),
 .ML__content > .ML__latex > .ML__multiline_environment > .col-align-l > .ML__vlist-t > .ML__vlist-r > .ML__vlist-s{display:none}
 .ML__content > .ML__latex > .ML__multiline_environment > .col-align-l > .ML__vlist-t > .ML__vlist-r:first-child > .ML__vlist > span{display:block;position:static;height:auto;min-height:1.8em;line-height:1.8;margin-bottom:.35em}
 .ML__content > .ML__latex > .ML__multiline_environment > .col-align-l > .ML__vlist-t > .ML__vlist-r:first-child > .ML__vlist > span > .ML__pstrut{display:none}
 .ML__content > .ML__latex > .ML__multiline_environment > .col-align-l > .ML__vlist-t > .ML__vlist-r:first-child > .ML__vlist > span > span:last-child:not(.ML__caret):not(.ML__text-caret):not(.ML__latex-caret):not(.ML__empty-line-anchor){display:block!important;height:auto!important;min-height:1.8em;white-space:normal;line-height:1.8}
 .ML__content > .ML__latex > .ML__multiline_environment > .col-align-l > .ML__vlist-t > .ML__vlist-r:first-child > .ML__vlist > span > .ML__empty-line-anchor{height:0!important;vertical-align:baseline!important}
 .ML__content .ML__text{white-space:pre-wrap!important}
 @media print{
  .ML__caret::after,.ML__text-caret::after,.ML__latex-caret::after{display:none!important}
  .ML__selection,.ML__contains-highlight,.ML__tooltip-container{display:none!important}
  .ML__focused .ML__text{background:transparent!important}
  .ML__focused .ML__selected,.ML__focused .ML__selected .ML__contains-caret,.ML__focused .ML__selected .ML__smart-fence__close,.ML__focused .ML__selected .ML__placeholder{color:inherit}
  .ML__empty-line-anchor::after{display:none!important}
  .ML__content > .ML__latex > .ML__multiline_environment > .col-align-l > .ML__vlist-t > .ML__vlist-r:first-child > .ML__vlist > span{break-inside:avoid-page}
 }
 `;
 field.shadowRoot.append(style);
}
