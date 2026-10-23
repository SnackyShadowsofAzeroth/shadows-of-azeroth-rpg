"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"..","public","class-themes.js"),"utf8");
function setup(className="Druid"){
 const classes=new Set(["theme-alternative"]),listeners={},meta={value:"#131c27",getAttribute(){return this.value},setAttribute(_key,v){this.value=v}},body={dataset:{},classList:{toggle(name,force){if(force)classes.add(name);else classes.delete(name)}}};
 let profile={className};
 const context={window:{soaCharacters:{profile:()=>profile},addEventListener:(key,fn)=>{listeners[key]=fn}},document:{body,querySelector:()=>meta,addEventListener:(key,fn)=>{listeners[key]=fn}},localStorage:{setItem(){throw Error("Presentation must not mutate saves")}}};
 vm.runInNewContext(source,context);return {api:context.window.soaClassThemes,classes,body,meta,listeners,setProfile:p=>{profile=p}};
}
test("Druid theme automatically follows the active character and browser chrome",()=>{const x=setup();assert.ok(x.classes.has("soa-theme-druid"));assert.ok(x.classes.has("theme-alternative"));assert.equal(x.body.dataset.classTheme,"druid");assert.equal(x.meta.value,"#0b1410");});
test("switching away from a Druid removes its skin without changing the base theme",()=>{const x=setup();x.setProfile({className:"Rogue"});x.api.apply();assert.ok(!x.classes.has("soa-theme-druid"));assert.ok(x.classes.has("theme-alternative"));assert.equal(x.body.dataset.classTheme,"default");assert.equal(x.meta.value,"#131c27");});
test("restoring a page refreshes its class theme and repeated application is harmless",()=>{const x=setup("Mage");assert.equal(x.api.forClass("Mage"),"default");x.setProfile({className:"Druid"});x.listeners.pageshow();x.api.apply();x.listeners.DOMContentLoaded();assert.equal(x.classes.size,2);assert.equal(x.api.forClass("Druid"),"druid");});
test("missing or unsupported character metadata safely keeps the base UI",()=>{const x=setup();x.setProfile(null);assert.equal(x.api.apply(),"default");assert.ok(!x.classes.has("soa-theme-druid"));x.setProfile({className:"Unknown"});assert.equal(x.api.apply(),"default");});
