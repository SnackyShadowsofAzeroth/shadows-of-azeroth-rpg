(()=>{"use strict";
// Presentation follows the active character. No new save keys or game mutations.
const themes={Druid:{id:"druid",className:"soa-theme-druid",color:"#0b1410"}};
const meta=document.querySelector('meta[name="theme-color"]');
const originalColor=meta?.getAttribute("content")||"#131c27";
function apply(profile=window.soaCharacters?.profile?.()){
 const theme=themes[profile?.className]||null;
 for(const entry of Object.values(themes))document.body.classList.toggle(entry.className,entry===theme);
 document.body.dataset.classTheme=theme?.id||"default";
 if(meta)meta.setAttribute("content",theme?.color||originalColor);
 return theme?.id||"default";
}
window.soaClassThemes={apply,forClass:className=>themes[className]?.id||"default"};
apply();document.addEventListener("DOMContentLoaded",()=>apply());window.addEventListener("pageshow",()=>apply());
})();
