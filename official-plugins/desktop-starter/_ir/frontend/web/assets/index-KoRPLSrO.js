(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))i(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const o of s.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function t(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(r){if(r.ep)return;r.ep=!0;const s=t(r);fetch(r.href,s)}})();function Za(n){const e=Object.create(null);for(const t of n.split(","))e[t]=1;return t=>t in e}const ft={},qi=[],vn=()=>{},du=()=>!1,Gs=n=>n.charCodeAt(0)===111&&n.charCodeAt(1)===110&&(n.charCodeAt(2)>122||n.charCodeAt(2)<97),Ja=n=>n.startsWith("onUpdate:"),Et=Object.assign,Qa=(n,e)=>{const t=n.indexOf(e);t>-1&&n.splice(t,1)},rh=Object.prototype.hasOwnProperty,it=(n,e)=>rh.call(n,e),He=Array.isArray,Yi=n=>zr(n)==="[object Map]",pu=n=>zr(n)==="[object Set]",Fl=n=>zr(n)==="[object Date]",Ve=n=>typeof n=="function",vt=n=>typeof n=="string",Mn=n=>typeof n=="symbol",lt=n=>n!==null&&typeof n=="object",mu=n=>(lt(n)||Ve(n))&&Ve(n.then)&&Ve(n.catch),_u=Object.prototype.toString,zr=n=>_u.call(n),sh=n=>zr(n).slice(8,-1),gu=n=>zr(n)==="[object Object]",el=n=>vt(n)&&n!=="NaN"&&n[0]!=="-"&&""+parseInt(n,10)===n,xr=Za(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"),ks=n=>{const e=Object.create(null);return(t=>e[t]||(e[t]=n(t)))},oh=/-\w/g,Lt=ks(n=>n.replace(oh,e=>e.slice(1).toUpperCase())),ah=/\B([A-Z])/g,wi=ks(n=>n.replace(ah,"-$1").toLowerCase()),Ws=ks(n=>n.charAt(0).toUpperCase()+n.slice(1)),io=ks(n=>n?`on${Ws(n)}`:""),mn=(n,e)=>!Object.is(n,e),ro=(n,...e)=>{for(let t=0;t<n.length;t++)n[t](...e)},vu=(n,e,t,i=!1)=>{Object.defineProperty(n,e,{configurable:!0,enumerable:!1,writable:i,value:t})},lh=n=>{const e=parseFloat(n);return isNaN(e)?n:e};let Ol;const Xs=()=>Ol||(Ol=typeof globalThis<"u"?globalThis:typeof self<"u"?self:typeof window<"u"?window:typeof global<"u"?global:{});function wr(n){if(He(n)){const e={};for(let t=0;t<n.length;t++){const i=n[t],r=vt(i)?hh(i):wr(i);if(r)for(const s in r)e[s]=r[s]}return e}else if(vt(n)||lt(n))return n}const ch=/;(?![^(]*\))/g,uh=/:([^]+)/,fh=/\/\*[^]*?\*\//g;function hh(n){const e={};return n.replace(fh,"").split(ch).forEach(t=>{if(t){const i=t.split(uh);i.length>1&&(e[i[0].trim()]=i[1].trim())}}),e}function qs(n){let e="";if(vt(n))e=n;else if(He(n))for(let t=0;t<n.length;t++){const i=qs(n[t]);i&&(e+=i+" ")}else if(lt(n))for(const t in n)n[t]&&(e+=t+" ");return e.trim()}const dh="itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly",ph=Za(dh);function xu(n){return!!n||n===""}function mh(n,e){if(n.length!==e.length)return!1;let t=!0;for(let i=0;t&&i<n.length;i++)t=tl(n[i],e[i]);return t}function tl(n,e){if(n===e)return!0;let t=Fl(n),i=Fl(e);if(t||i)return t&&i?n.getTime()===e.getTime():!1;if(t=Mn(n),i=Mn(e),t||i)return n===e;if(t=He(n),i=He(e),t||i)return t&&i?mh(n,e):!1;if(t=lt(n),i=lt(e),t||i){if(!t||!i)return!1;const r=Object.keys(n).length,s=Object.keys(e).length;if(r!==s)return!1;for(const o in n){const a=n.hasOwnProperty(o),l=e.hasOwnProperty(o);if(a&&!l||!a&&l||!tl(n[o],e[o]))return!1}}return String(n)===String(e)}const Mu=n=>!!(n&&n.__v_isRef===!0),Dn=n=>vt(n)?n:n==null?"":He(n)||lt(n)&&(n.toString===_u||!Ve(n.toString))?Mu(n)?Dn(n.value):JSON.stringify(n,Su,2):String(n),Su=(n,e)=>Mu(e)?Su(n,e.value):Yi(e)?{[`Map(${e.size})`]:[...e.entries()].reduce((t,[i,r],s)=>(t[so(i,s)+" =>"]=r,t),{})}:pu(e)?{[`Set(${e.size})`]:[...e.values()].map(t=>so(t))}:Mn(e)?so(e):lt(e)&&!He(e)&&!gu(e)?String(e):e,so=(n,e="")=>{var t;return Mn(n)?`Symbol(${(t=n.description)!=null?t:e})`:n};let Bt;class _h{constructor(e=!1){this.detached=e,this._active=!0,this._on=0,this.effects=[],this.cleanups=[],this._isPaused=!1,this.__v_skip=!0,this.parent=Bt,!e&&Bt&&(this.index=(Bt.scopes||(Bt.scopes=[])).push(this)-1)}get active(){return this._active}pause(){if(this._active){this._isPaused=!0;let e,t;if(this.scopes)for(e=0,t=this.scopes.length;e<t;e++)this.scopes[e].pause();for(e=0,t=this.effects.length;e<t;e++)this.effects[e].pause()}}resume(){if(this._active&&this._isPaused){this._isPaused=!1;let e,t;if(this.scopes)for(e=0,t=this.scopes.length;e<t;e++)this.scopes[e].resume();for(e=0,t=this.effects.length;e<t;e++)this.effects[e].resume()}}run(e){if(this._active){const t=Bt;try{return Bt=this,e()}finally{Bt=t}}}on(){++this._on===1&&(this.prevScope=Bt,Bt=this)}off(){this._on>0&&--this._on===0&&(Bt=this.prevScope,this.prevScope=void 0)}stop(e){if(this._active){this._active=!1;let t,i;for(t=0,i=this.effects.length;t<i;t++)this.effects[t].stop();for(this.effects.length=0,t=0,i=this.cleanups.length;t<i;t++)this.cleanups[t]();if(this.cleanups.length=0,this.scopes){for(t=0,i=this.scopes.length;t<i;t++)this.scopes[t].stop(!0);this.scopes.length=0}if(!this.detached&&this.parent&&!e){const r=this.parent.scopes.pop();r&&r!==this&&(this.parent.scopes[this.index]=r,r.index=this.index)}this.parent=void 0}}}function gh(){return Bt}let ut;const oo=new WeakSet;class Eu{constructor(e){this.fn=e,this.deps=void 0,this.depsTail=void 0,this.flags=5,this.next=void 0,this.cleanup=void 0,this.scheduler=void 0,Bt&&Bt.active&&Bt.effects.push(this)}pause(){this.flags|=64}resume(){this.flags&64&&(this.flags&=-65,oo.has(this)&&(oo.delete(this),this.trigger()))}notify(){this.flags&2&&!(this.flags&32)||this.flags&8||Tu(this)}run(){if(!(this.flags&1))return this.fn();this.flags|=2,Bl(this),bu(this);const e=ut,t=sn;ut=this,sn=!0;try{return this.fn()}finally{Au(this),ut=e,sn=t,this.flags&=-3}}stop(){if(this.flags&1){for(let e=this.deps;e;e=e.nextDep)rl(e);this.deps=this.depsTail=void 0,Bl(this),this.onStop&&this.onStop(),this.flags&=-2}}trigger(){this.flags&64?oo.add(this):this.scheduler?this.scheduler():this.runIfDirty()}runIfDirty(){Ko(this)&&this.run()}get dirty(){return Ko(this)}}let yu=0,Mr,Sr;function Tu(n,e=!1){if(n.flags|=8,e){n.next=Sr,Sr=n;return}n.next=Mr,Mr=n}function nl(){yu++}function il(){if(--yu>0)return;if(Sr){let e=Sr;for(Sr=void 0;e;){const t=e.next;e.next=void 0,e.flags&=-9,e=t}}let n;for(;Mr;){let e=Mr;for(Mr=void 0;e;){const t=e.next;if(e.next=void 0,e.flags&=-9,e.flags&1)try{e.trigger()}catch(i){n||(n=i)}e=t}}if(n)throw n}function bu(n){for(let e=n.deps;e;e=e.nextDep)e.version=-1,e.prevActiveLink=e.dep.activeLink,e.dep.activeLink=e}function Au(n){let e,t=n.depsTail,i=t;for(;i;){const r=i.prevDep;i.version===-1?(i===t&&(t=r),rl(i),vh(i)):e=i,i.dep.activeLink=i.prevActiveLink,i.prevActiveLink=void 0,i=r}n.deps=e,n.depsTail=t}function Ko(n){for(let e=n.deps;e;e=e.nextDep)if(e.dep.version!==e.version||e.dep.computed&&(wu(e.dep.computed)||e.dep.version!==e.version))return!0;return!!n._dirty}function wu(n){if(n.flags&4&&!(n.flags&16)||(n.flags&=-17,n.globalVersion===Rr)||(n.globalVersion=Rr,!n.isSSR&&n.flags&128&&(!n.deps&&!n._dirty||!Ko(n))))return;n.flags|=2;const e=n.dep,t=ut,i=sn;ut=n,sn=!0;try{bu(n);const r=n.fn(n._value);(e.version===0||mn(r,n._value))&&(n.flags|=128,n._value=r,e.version++)}catch(r){throw e.version++,r}finally{ut=t,sn=i,Au(n),n.flags&=-3}}function rl(n,e=!1){const{dep:t,prevSub:i,nextSub:r}=n;if(i&&(i.nextSub=r,n.prevSub=void 0),r&&(r.prevSub=i,n.nextSub=void 0),t.subs===n&&(t.subs=i,!i&&t.computed)){t.computed.flags&=-5;for(let s=t.computed.deps;s;s=s.nextDep)rl(s,!0)}!e&&!--t.sc&&t.map&&t.map.delete(t.key)}function vh(n){const{prevDep:e,nextDep:t}=n;e&&(e.nextDep=t,n.prevDep=void 0),t&&(t.prevDep=e,n.nextDep=void 0)}let sn=!0;const Ru=[];function Hn(){Ru.push(sn),sn=!1}function Vn(){const n=Ru.pop();sn=n===void 0?!0:n}function Bl(n){const{cleanup:e}=n;if(n.cleanup=void 0,e){const t=ut;ut=void 0;try{e()}finally{ut=t}}}let Rr=0;class xh{constructor(e,t){this.sub=e,this.dep=t,this.version=t.version,this.nextDep=this.prevDep=this.nextSub=this.prevSub=this.prevActiveLink=void 0}}class sl{constructor(e){this.computed=e,this.version=0,this.activeLink=void 0,this.subs=void 0,this.map=void 0,this.key=void 0,this.sc=0,this.__v_skip=!0}track(e){if(!ut||!sn||ut===this.computed)return;let t=this.activeLink;if(t===void 0||t.sub!==ut)t=this.activeLink=new xh(ut,this),ut.deps?(t.prevDep=ut.depsTail,ut.depsTail.nextDep=t,ut.depsTail=t):ut.deps=ut.depsTail=t,Cu(t);else if(t.version===-1&&(t.version=this.version,t.nextDep)){const i=t.nextDep;i.prevDep=t.prevDep,t.prevDep&&(t.prevDep.nextDep=i),t.prevDep=ut.depsTail,t.nextDep=void 0,ut.depsTail.nextDep=t,ut.depsTail=t,ut.deps===t&&(ut.deps=i)}return t}trigger(e){this.version++,Rr++,this.notify(e)}notify(e){nl();try{for(let t=this.subs;t;t=t.prevSub)t.sub.notify()&&t.sub.dep.notify()}finally{il()}}}function Cu(n){if(n.dep.sc++,n.sub.flags&4){const e=n.dep.computed;if(e&&!n.dep.subs){e.flags|=20;for(let i=e.deps;i;i=i.nextDep)Cu(i)}const t=n.dep.subs;t!==n&&(n.prevSub=t,t&&(t.nextSub=n)),n.dep.subs=n}}const jo=new WeakMap,Ti=Symbol(""),Zo=Symbol(""),Cr=Symbol("");function bt(n,e,t){if(sn&&ut){let i=jo.get(n);i||jo.set(n,i=new Map);let r=i.get(t);r||(i.set(t,r=new sl),r.map=i,r.key=t),r.track()}}function Fn(n,e,t,i,r,s){const o=jo.get(n);if(!o){Rr++;return}const a=l=>{l&&l.trigger()};if(nl(),e==="clear")o.forEach(a);else{const l=He(n),c=l&&el(t);if(l&&t==="length"){const u=Number(i);o.forEach((f,d)=>{(d==="length"||d===Cr||!Mn(d)&&d>=u)&&a(f)})}else switch((t!==void 0||o.has(void 0))&&a(o.get(t)),c&&a(o.get(Cr)),e){case"add":l?c&&a(o.get("length")):(a(o.get(Ti)),Yi(n)&&a(o.get(Zo)));break;case"delete":l||(a(o.get(Ti)),Yi(n)&&a(o.get(Zo)));break;case"set":Yi(n)&&a(o.get(Ti));break}}il()}function Ci(n){const e=nt(n);return e===n?e:(bt(e,"iterate",Cr),on(n)?e:e.map(Gn))}function ol(n){return bt(n=nt(n),"iterate",Cr),n}function hn(n,e){return ri(n)?Pr($i(n)?Gn(e):e):Gn(e)}const Mh={__proto__:null,[Symbol.iterator](){return ao(this,Symbol.iterator,n=>hn(this,n))},concat(...n){return Ci(this).concat(...n.map(e=>He(e)?Ci(e):e))},entries(){return ao(this,"entries",n=>(n[1]=hn(this,n[1]),n))},every(n,e){return bn(this,"every",n,e,void 0,arguments)},filter(n,e){return bn(this,"filter",n,e,t=>t.map(i=>hn(this,i)),arguments)},find(n,e){return bn(this,"find",n,e,t=>hn(this,t),arguments)},findIndex(n,e){return bn(this,"findIndex",n,e,void 0,arguments)},findLast(n,e){return bn(this,"findLast",n,e,t=>hn(this,t),arguments)},findLastIndex(n,e){return bn(this,"findLastIndex",n,e,void 0,arguments)},forEach(n,e){return bn(this,"forEach",n,e,void 0,arguments)},includes(...n){return lo(this,"includes",n)},indexOf(...n){return lo(this,"indexOf",n)},join(n){return Ci(this).join(n)},lastIndexOf(...n){return lo(this,"lastIndexOf",n)},map(n,e){return bn(this,"map",n,e,void 0,arguments)},pop(){return cr(this,"pop")},push(...n){return cr(this,"push",n)},reduce(n,...e){return zl(this,"reduce",n,e)},reduceRight(n,...e){return zl(this,"reduceRight",n,e)},shift(){return cr(this,"shift")},some(n,e){return bn(this,"some",n,e,void 0,arguments)},splice(...n){return cr(this,"splice",n)},toReversed(){return Ci(this).toReversed()},toSorted(n){return Ci(this).toSorted(n)},toSpliced(...n){return Ci(this).toSpliced(...n)},unshift(...n){return cr(this,"unshift",n)},values(){return ao(this,"values",n=>hn(this,n))}};function ao(n,e,t){const i=ol(n),r=i[e]();return i!==n&&!on(n)&&(r._next=r.next,r.next=()=>{const s=r._next();return s.done||(s.value=t(s.value)),s}),r}const Sh=Array.prototype;function bn(n,e,t,i,r,s){const o=ol(n),a=o!==n&&!on(n),l=o[e];if(l!==Sh[e]){const f=l.apply(n,s);return a?Gn(f):f}let c=t;o!==n&&(a?c=function(f,d){return t.call(this,hn(n,f),d,n)}:t.length>2&&(c=function(f,d){return t.call(this,f,d,n)}));const u=l.call(o,c,i);return a&&r?r(u):u}function zl(n,e,t,i){const r=ol(n),s=r!==n&&!on(n);let o=t,a=!1;r!==n&&(s?(a=i.length===0,o=function(c,u,f){return a&&(a=!1,c=hn(n,c)),t.call(this,c,hn(n,u),f,n)}):t.length>3&&(o=function(c,u,f){return t.call(this,c,u,f,n)}));const l=r[e](o,...i);return a?hn(n,l):l}function lo(n,e,t){const i=nt(n);bt(i,"iterate",Cr);const r=i[e](...t);return(r===-1||r===!1)&&ul(t[0])?(t[0]=nt(t[0]),i[e](...t)):r}function cr(n,e,t=[]){Hn(),nl();const i=nt(n)[e].apply(n,t);return il(),Vn(),i}const Eh=Za("__proto__,__v_isRef,__isVue"),Pu=new Set(Object.getOwnPropertyNames(Symbol).filter(n=>n!=="arguments"&&n!=="caller").map(n=>Symbol[n]).filter(Mn));function yh(n){Mn(n)||(n=String(n));const e=nt(this);return bt(e,"has",n),e.hasOwnProperty(n)}class Du{constructor(e=!1,t=!1){this._isReadonly=e,this._isShallow=t}get(e,t,i){if(t==="__v_skip")return e.__v_skip;const r=this._isReadonly,s=this._isShallow;if(t==="__v_isReactive")return!r;if(t==="__v_isReadonly")return r;if(t==="__v_isShallow")return s;if(t==="__v_raw")return i===(r?s?Ih:Nu:s?Uu:Iu).get(e)||Object.getPrototypeOf(e)===Object.getPrototypeOf(i)?e:void 0;const o=He(e);if(!r){let l;if(o&&(l=Mh[t]))return l;if(t==="hasOwnProperty")return yh}const a=Reflect.get(e,t,wt(e)?e:i);if((Mn(t)?Pu.has(t):Eh(t))||(r||bt(e,"get",t),s))return a;if(wt(a)){const l=o&&el(t)?a:a.value;return r&&lt(l)?Qo(l):l}return lt(a)?r?Qo(a):ll(a):a}}class Lu extends Du{constructor(e=!1){super(!1,e)}set(e,t,i,r){let s=e[t];const o=He(e)&&el(t);if(!this._isShallow){const c=ri(s);if(!on(i)&&!ri(i)&&(s=nt(s),i=nt(i)),!o&&wt(s)&&!wt(i))return c||(s.value=i),!0}const a=o?Number(t)<e.length:it(e,t),l=Reflect.set(e,t,i,wt(e)?e:r);return e===nt(r)&&(a?mn(i,s)&&Fn(e,"set",t,i):Fn(e,"add",t,i)),l}deleteProperty(e,t){const i=it(e,t);e[t];const r=Reflect.deleteProperty(e,t);return r&&i&&Fn(e,"delete",t,void 0),r}has(e,t){const i=Reflect.has(e,t);return(!Mn(t)||!Pu.has(t))&&bt(e,"has",t),i}ownKeys(e){return bt(e,"iterate",He(e)?"length":Ti),Reflect.ownKeys(e)}}class Th extends Du{constructor(e=!1){super(!0,e)}set(e,t){return!0}deleteProperty(e,t){return!0}}const bh=new Lu,Ah=new Th,wh=new Lu(!0);const Jo=n=>n,jr=n=>Reflect.getPrototypeOf(n);function Rh(n,e,t){return function(...i){const r=this.__v_raw,s=nt(r),o=Yi(s),a=n==="entries"||n===Symbol.iterator&&o,l=n==="keys"&&o,c=r[n](...i),u=t?Jo:e?Pr:Gn;return!e&&bt(s,"iterate",l?Zo:Ti),Et(Object.create(c),{next(){const{value:f,done:d}=c.next();return d?{value:f,done:d}:{value:a?[u(f[0]),u(f[1])]:u(f),done:d}}})}}function Zr(n){return function(...e){return n==="delete"?!1:n==="clear"?void 0:this}}function Ch(n,e){const t={get(r){const s=this.__v_raw,o=nt(s),a=nt(r);n||(mn(r,a)&&bt(o,"get",r),bt(o,"get",a));const{has:l}=jr(o),c=e?Jo:n?Pr:Gn;if(l.call(o,r))return c(s.get(r));if(l.call(o,a))return c(s.get(a));s!==o&&s.get(r)},get size(){const r=this.__v_raw;return!n&&bt(nt(r),"iterate",Ti),r.size},has(r){const s=this.__v_raw,o=nt(s),a=nt(r);return n||(mn(r,a)&&bt(o,"has",r),bt(o,"has",a)),r===a?s.has(r):s.has(r)||s.has(a)},forEach(r,s){const o=this,a=o.__v_raw,l=nt(a),c=e?Jo:n?Pr:Gn;return!n&&bt(l,"iterate",Ti),a.forEach((u,f)=>r.call(s,c(u),c(f),o))}};return Et(t,n?{add:Zr("add"),set:Zr("set"),delete:Zr("delete"),clear:Zr("clear")}:{add(r){const s=nt(this),o=jr(s),a=nt(r),l=!e&&!on(r)&&!ri(r)?a:r;return o.has.call(s,l)||mn(r,l)&&o.has.call(s,r)||mn(a,l)&&o.has.call(s,a)||(s.add(l),Fn(s,"add",l,l)),this},set(r,s){!e&&!on(s)&&!ri(s)&&(s=nt(s));const o=nt(this),{has:a,get:l}=jr(o);let c=a.call(o,r);c||(r=nt(r),c=a.call(o,r));const u=l.call(o,r);return o.set(r,s),c?mn(s,u)&&Fn(o,"set",r,s):Fn(o,"add",r,s),this},delete(r){const s=nt(this),{has:o,get:a}=jr(s);let l=o.call(s,r);l||(r=nt(r),l=o.call(s,r)),a&&a.call(s,r);const c=s.delete(r);return l&&Fn(s,"delete",r,void 0),c},clear(){const r=nt(this),s=r.size!==0,o=r.clear();return s&&Fn(r,"clear",void 0,void 0),o}}),["keys","values","entries",Symbol.iterator].forEach(r=>{t[r]=Rh(r,n,e)}),t}function al(n,e){const t=Ch(n,e);return(i,r,s)=>r==="__v_isReactive"?!n:r==="__v_isReadonly"?n:r==="__v_raw"?i:Reflect.get(it(t,r)&&r in i?t:i,r,s)}const Ph={get:al(!1,!1)},Dh={get:al(!1,!0)},Lh={get:al(!0,!1)};const Iu=new WeakMap,Uu=new WeakMap,Nu=new WeakMap,Ih=new WeakMap;function Uh(n){switch(n){case"Object":case"Array":return 1;case"Map":case"Set":case"WeakMap":case"WeakSet":return 2;default:return 0}}function Nh(n){return n.__v_skip||!Object.isExtensible(n)?0:Uh(sh(n))}function ll(n){return ri(n)?n:cl(n,!1,bh,Ph,Iu)}function Fh(n){return cl(n,!1,wh,Dh,Uu)}function Qo(n){return cl(n,!0,Ah,Lh,Nu)}function cl(n,e,t,i,r){if(!lt(n)||n.__v_raw&&!(e&&n.__v_isReactive))return n;const s=Nh(n);if(s===0)return n;const o=r.get(n);if(o)return o;const a=new Proxy(n,s===2?i:t);return r.set(n,a),a}function $i(n){return ri(n)?$i(n.__v_raw):!!(n&&n.__v_isReactive)}function ri(n){return!!(n&&n.__v_isReadonly)}function on(n){return!!(n&&n.__v_isShallow)}function ul(n){return n?!!n.__v_raw:!1}function nt(n){const e=n&&n.__v_raw;return e?nt(e):n}function Oh(n){return!it(n,"__v_skip")&&Object.isExtensible(n)&&vu(n,"__v_skip",!0),n}const Gn=n=>lt(n)?ll(n):n,Pr=n=>lt(n)?Qo(n):n;function wt(n){return n?n.__v_isRef===!0:!1}function Jn(n){return Bh(n,!1)}function Bh(n,e){return wt(n)?n:new zh(n,e)}class zh{constructor(e,t){this.dep=new sl,this.__v_isRef=!0,this.__v_isShallow=!1,this._rawValue=t?e:nt(e),this._value=t?e:Gn(e),this.__v_isShallow=t}get value(){return this.dep.track(),this._value}set value(e){const t=this._rawValue,i=this.__v_isShallow||on(e)||ri(e);e=i?e:nt(e),mn(e,t)&&(this._rawValue=e,this._value=i?e:Gn(e),this.dep.trigger())}}function _i(n){return wt(n)?n.value:n}const Hh={get:(n,e,t)=>e==="__v_raw"?n:_i(Reflect.get(n,e,t)),set:(n,e,t,i)=>{const r=n[e];return wt(r)&&!wt(t)?(r.value=t,!0):Reflect.set(n,e,t,i)}};function Fu(n){return $i(n)?n:new Proxy(n,Hh)}class Vh{constructor(e,t,i){this.fn=e,this.setter=t,this._value=void 0,this.dep=new sl(this),this.__v_isRef=!0,this.deps=void 0,this.depsTail=void 0,this.flags=16,this.globalVersion=Rr-1,this.next=void 0,this.effect=this,this.__v_isReadonly=!t,this.isSSR=i}notify(){if(this.flags|=16,!(this.flags&8)&&ut!==this)return Tu(this,!0),!0}get value(){const e=this.dep.track();return wu(this),e&&(e.version=this.dep.version),this._value}set value(e){this.setter&&this.setter(e)}}function Gh(n,e,t=!1){let i,r;return Ve(n)?i=n:(i=n.get,r=n.set),new Vh(i,r,t)}const Jr={},Ds=new WeakMap;let gi;function kh(n,e=!1,t=gi){if(t){let i=Ds.get(t);i||Ds.set(t,i=[]),i.push(n)}}function Wh(n,e,t=ft){const{immediate:i,deep:r,once:s,scheduler:o,augmentJob:a,call:l}=t,c=E=>r?E:on(E)||r===!1||r===0?Qn(E,1):Qn(E);let u,f,d,p,v=!1,M=!1;if(wt(n)?(f=()=>n.value,v=on(n)):$i(n)?(f=()=>c(n),v=!0):He(n)?(M=!0,v=n.some(E=>$i(E)||on(E)),f=()=>n.map(E=>{if(wt(E))return E.value;if($i(E))return c(E);if(Ve(E))return l?l(E,2):E()})):Ve(n)?e?f=l?()=>l(n,2):n:f=()=>{if(d){Hn();try{d()}finally{Vn()}}const E=gi;gi=u;try{return l?l(n,3,[p]):n(p)}finally{gi=E}}:f=vn,e&&r){const E=f,R=r===!0?1/0:r;f=()=>Qn(E(),R)}const m=gh(),h=()=>{u.stop(),m&&m.active&&Qa(m.effects,u)};if(s&&e){const E=e;e=(...R)=>{E(...R),h()}}let w=M?new Array(n.length).fill(Jr):Jr;const b=E=>{if(!(!(u.flags&1)||!u.dirty&&!E))if(e){const R=u.run();if(r||v||(M?R.some((C,P)=>mn(C,w[P])):mn(R,w))){d&&d();const C=gi;gi=u;try{const P=[R,w===Jr?void 0:M&&w[0]===Jr?[]:w,p];w=R,l?l(e,3,P):e(...P)}finally{gi=C}}}else u.run()};return a&&a(b),u=new Eu(f),u.scheduler=o?()=>o(b,!1):b,p=E=>kh(E,!1,u),d=u.onStop=()=>{const E=Ds.get(u);if(E){if(l)l(E,4);else for(const R of E)R();Ds.delete(u)}},e?i?b(!0):w=u.run():o?o(b.bind(null,!0),!0):u.run(),h.pause=u.pause.bind(u),h.resume=u.resume.bind(u),h.stop=h,h}function Qn(n,e=1/0,t){if(e<=0||!lt(n)||n.__v_skip||(t=t||new Map,(t.get(n)||0)>=e))return n;if(t.set(n,e),e--,wt(n))Qn(n.value,e,t);else if(He(n))for(let i=0;i<n.length;i++)Qn(n[i],e,t);else if(pu(n)||Yi(n))n.forEach(i=>{Qn(i,e,t)});else if(gu(n)){for(const i in n)Qn(n[i],e,t);for(const i of Object.getOwnPropertySymbols(n))Object.prototype.propertyIsEnumerable.call(n,i)&&Qn(n[i],e,t)}return n}function Hr(n,e,t,i){try{return i?n(...i):n()}catch(r){Ys(r,e,t)}}function Sn(n,e,t,i){if(Ve(n)){const r=Hr(n,e,t,i);return r&&mu(r)&&r.catch(s=>{Ys(s,e,t)}),r}if(He(n)){const r=[];for(let s=0;s<n.length;s++)r.push(Sn(n[s],e,t,i));return r}}function Ys(n,e,t,i=!0){const r=e?e.vnode:null,{errorHandler:s,throwUnhandledErrorInProduction:o}=e&&e.appContext.config||ft;if(e){let a=e.parent;const l=e.proxy,c=`https://vuejs.org/error-reference/#runtime-${t}`;for(;a;){const u=a.ec;if(u){for(let f=0;f<u.length;f++)if(u[f](n,l,c)===!1)return}a=a.parent}if(s){Hn(),Hr(s,null,10,[n,l,c]),Vn();return}}Xh(n,t,r,i,o)}function Xh(n,e,t,i=!0,r=!1){if(r)throw n;console.error(n)}const Dt=[];let fn=-1;const Ki=[];let Zn=null,Wi=0;const Ou=Promise.resolve();let Ls=null;function qh(n){const e=Ls||Ou;return n?e.then(this?n.bind(this):n):e}function Yh(n){let e=fn+1,t=Dt.length;for(;e<t;){const i=e+t>>>1,r=Dt[i],s=Dr(r);s<n||s===n&&r.flags&2?e=i+1:t=i}return e}function fl(n){if(!(n.flags&1)){const e=Dr(n),t=Dt[Dt.length-1];!t||!(n.flags&2)&&e>=Dr(t)?Dt.push(n):Dt.splice(Yh(e),0,n),n.flags|=1,Bu()}}function Bu(){Ls||(Ls=Ou.then(Hu))}function $h(n){He(n)?Ki.push(...n):Zn&&n.id===-1?Zn.splice(Wi+1,0,n):n.flags&1||(Ki.push(n),n.flags|=1),Bu()}function Hl(n,e,t=fn+1){for(;t<Dt.length;t++){const i=Dt[t];if(i&&i.flags&2){if(n&&i.id!==n.uid)continue;Dt.splice(t,1),t--,i.flags&4&&(i.flags&=-2),i(),i.flags&4||(i.flags&=-2)}}}function zu(n){if(Ki.length){const e=[...new Set(Ki)].sort((t,i)=>Dr(t)-Dr(i));if(Ki.length=0,Zn){Zn.push(...e);return}for(Zn=e,Wi=0;Wi<Zn.length;Wi++){const t=Zn[Wi];t.flags&4&&(t.flags&=-2),t.flags&8||t(),t.flags&=-2}Zn=null,Wi=0}}const Dr=n=>n.id==null?n.flags&2?-1:1/0:n.id;function Hu(n){try{for(fn=0;fn<Dt.length;fn++){const e=Dt[fn];e&&!(e.flags&8)&&(e.flags&4&&(e.flags&=-2),Hr(e,e.i,e.i?15:14),e.flags&4||(e.flags&=-2))}}finally{for(;fn<Dt.length;fn++){const e=Dt[fn];e&&(e.flags&=-2)}fn=-1,Dt.length=0,zu(),Ls=null,(Dt.length||Ki.length)&&Hu()}}let tn=null,Vu=null;function Is(n){const e=tn;return tn=n,Vu=n&&n.type.__scopeId||null,e}function Kh(n,e=tn,t){if(!e||n._n)return n;const i=(...r)=>{i._d&&Jl(-1);const s=Is(e);let o;try{o=n(...r)}finally{Is(s),i._d&&Jl(1)}return o};return i._n=!0,i._c=!0,i._d=!0,i}function li(n,e,t,i){const r=n.dirs,s=e&&e.dirs;for(let o=0;o<r.length;o++){const a=r[o];s&&(a.oldValue=s[o].value);let l=a.dir[i];l&&(Hn(),Sn(l,t,8,[n.el,a,n,e]),Vn())}}function jh(n,e){if(At){let t=At.provides;const i=At.parent&&At.parent.provides;i===t&&(t=At.provides=Object.create(i)),t[n]=e}}function ys(n,e,t=!1){const i=Jd();if(i||ji){let r=ji?ji._context.provides:i?i.parent==null||i.ce?i.vnode.appContext&&i.vnode.appContext.provides:i.parent.provides:void 0;if(r&&n in r)return r[n];if(arguments.length>1)return t&&Ve(e)?e.call(i&&i.proxy):e}}const Zh=Symbol.for("v-scx"),Jh=()=>ys(Zh);function co(n,e,t){return Gu(n,e,t)}function Gu(n,e,t=ft){const{immediate:i,deep:r,flush:s,once:o}=t,a=Et({},t),l=e&&i||!e&&s!=="post";let c;if(Ir){if(s==="sync"){const p=Jh();c=p.__watcherHandles||(p.__watcherHandles=[])}else if(!l){const p=()=>{};return p.stop=vn,p.resume=vn,p.pause=vn,p}}const u=At;a.call=(p,v,M)=>Sn(p,u,v,M);let f=!1;s==="post"?a.scheduler=p=>{Ot(p,u&&u.suspense)}:s!=="sync"&&(f=!0,a.scheduler=(p,v)=>{v?p():fl(p)}),a.augmentJob=p=>{e&&(p.flags|=4),f&&(p.flags|=2,u&&(p.id=u.uid,p.i=u))};const d=Wh(n,e,a);return Ir&&(c?c.push(d):l&&d()),d}function Qh(n,e,t){const i=this.proxy,r=vt(n)?n.includes(".")?ku(i,n):()=>i[n]:n.bind(i,i);let s;Ve(e)?s=e:(s=e.handler,t=e);const o=Vr(this),a=Gu(r,s.bind(i),t);return o(),a}function ku(n,e){const t=e.split(".");return()=>{let i=n;for(let r=0;r<t.length&&i;r++)i=i[t[r]];return i}}const ed=Symbol("_vte"),td=n=>n.__isTeleport,nd=Symbol("_leaveCb");function hl(n,e){n.shapeFlag&6&&n.component?(n.transition=e,hl(n.component.subTree,e)):n.shapeFlag&128?(n.ssContent.transition=e.clone(n.ssContent),n.ssFallback.transition=e.clone(n.ssFallback)):n.transition=e}function Wu(n,e){return Ve(n)?Et({name:n.name},e,{setup:n}):n}function Xu(n){n.ids=[n.ids[0]+n.ids[2]+++"-",0,0]}function Vl(n,e){let t;return!!((t=Object.getOwnPropertyDescriptor(n,e))&&!t.configurable)}const Us=new WeakMap;function Er(n,e,t,i,r=!1){if(He(n)){n.forEach((M,m)=>Er(M,e&&(He(e)?e[m]:e),t,i,r));return}if(yr(i)&&!r){i.shapeFlag&512&&i.type.__asyncResolved&&i.component.subTree.component&&Er(n,e,t,i.component.subTree);return}const s=i.shapeFlag&4?vl(i.component):i.el,o=r?null:s,{i:a,r:l}=n,c=e&&e.r,u=a.refs===ft?a.refs={}:a.refs,f=a.setupState,d=nt(f),p=f===ft?du:M=>Vl(u,M)?!1:it(d,M),v=(M,m)=>!(m&&Vl(u,m));if(c!=null&&c!==l){if(Gl(e),vt(c))u[c]=null,p(c)&&(f[c]=null);else if(wt(c)){const M=e;v(c,M.k)&&(c.value=null),M.k&&(u[M.k]=null)}}if(Ve(l))Hr(l,a,12,[o,u]);else{const M=vt(l),m=wt(l);if(M||m){const h=()=>{if(n.f){const w=M?p(l)?f[l]:u[l]:v()||!n.k?l.value:u[n.k];if(r)He(w)&&Qa(w,s);else if(He(w))w.includes(s)||w.push(s);else if(M)u[l]=[s],p(l)&&(f[l]=u[l]);else{const b=[s];v(l,n.k)&&(l.value=b),n.k&&(u[n.k]=b)}}else M?(u[l]=o,p(l)&&(f[l]=o)):m&&(v(l,n.k)&&(l.value=o),n.k&&(u[n.k]=o))};if(o){const w=()=>{h(),Us.delete(n)};w.id=-1,Us.set(n,w),Ot(w,t)}else Gl(n),h()}}}function Gl(n){const e=Us.get(n);e&&(e.flags|=8,Us.delete(n))}Xs().requestIdleCallback;Xs().cancelIdleCallback;const yr=n=>!!n.type.__asyncLoader,qu=n=>n.type.__isKeepAlive;function id(n,e){Yu(n,"a",e)}function rd(n,e){Yu(n,"da",e)}function Yu(n,e,t=At){const i=n.__wdc||(n.__wdc=()=>{let r=t;for(;r;){if(r.isDeactivated)return;r=r.parent}return n()});if($s(e,i,t),t){let r=t.parent;for(;r&&r.parent;)qu(r.parent.vnode)&&sd(i,e,t,r),r=r.parent}}function sd(n,e,t,i){const r=$s(e,n,i,!0);pl(()=>{Qa(i[e],r)},t)}function $s(n,e,t=At,i=!1){if(t){const r=t[n]||(t[n]=[]),s=e.__weh||(e.__weh=(...o)=>{Hn();const a=Vr(t),l=Sn(e,t,n,o);return a(),Vn(),l});return i?r.unshift(s):r.push(s),s}}const Wn=n=>(e,t=At)=>{(!Ir||n==="sp")&&$s(n,(...i)=>e(...i),t)},od=Wn("bm"),dl=Wn("m"),ad=Wn("bu"),ld=Wn("u"),cd=Wn("bum"),pl=Wn("um"),ud=Wn("sp"),fd=Wn("rtg"),hd=Wn("rtc");function dd(n,e=At){$s("ec",n,e)}const pd="components",$u=Symbol.for("v-ndc");function md(n){return vt(n)?_d(pd,n,!1)||n:n||$u}function _d(n,e,t=!0,i=!1){const r=tn||At;if(r){const s=r.type;{const a=ip(s,!1);if(a&&(a===e||a===Lt(e)||a===Ws(Lt(e))))return s}const o=kl(r[n]||s[n],e)||kl(r.appContext[n],e);return!o&&i?s:o}}function kl(n,e){return n&&(n[e]||n[Lt(e)]||n[Ws(Lt(e))])}const ea=n=>n?_f(n)?vl(n):ea(n.parent):null,Tr=Et(Object.create(null),{$:n=>n,$el:n=>n.vnode.el,$data:n=>n.data,$props:n=>n.props,$attrs:n=>n.attrs,$slots:n=>n.slots,$refs:n=>n.refs,$parent:n=>ea(n.parent),$root:n=>ea(n.root),$host:n=>n.ce,$emit:n=>n.emit,$options:n=>ju(n),$forceUpdate:n=>n.f||(n.f=()=>{fl(n.update)}),$nextTick:n=>n.n||(n.n=qh.bind(n.proxy)),$watch:n=>Qh.bind(n)}),uo=(n,e)=>n!==ft&&!n.__isScriptSetup&&it(n,e),gd={get({_:n},e){if(e==="__v_skip")return!0;const{ctx:t,setupState:i,data:r,props:s,accessCache:o,type:a,appContext:l}=n;if(e[0]!=="$"){const d=o[e];if(d!==void 0)switch(d){case 1:return i[e];case 2:return r[e];case 4:return t[e];case 3:return s[e]}else{if(uo(i,e))return o[e]=1,i[e];if(r!==ft&&it(r,e))return o[e]=2,r[e];if(it(s,e))return o[e]=3,s[e];if(t!==ft&&it(t,e))return o[e]=4,t[e];ta&&(o[e]=0)}}const c=Tr[e];let u,f;if(c)return e==="$attrs"&&bt(n.attrs,"get",""),c(n);if((u=a.__cssModules)&&(u=u[e]))return u;if(t!==ft&&it(t,e))return o[e]=4,t[e];if(f=l.config.globalProperties,it(f,e))return f[e]},set({_:n},e,t){const{data:i,setupState:r,ctx:s}=n;return uo(r,e)?(r[e]=t,!0):i!==ft&&it(i,e)?(i[e]=t,!0):it(n.props,e)||e[0]==="$"&&e.slice(1)in n?!1:(s[e]=t,!0)},has({_:{data:n,setupState:e,accessCache:t,ctx:i,appContext:r,props:s,type:o}},a){let l;return!!(t[a]||n!==ft&&a[0]!=="$"&&it(n,a)||uo(e,a)||it(s,a)||it(i,a)||it(Tr,a)||it(r.config.globalProperties,a)||(l=o.__cssModules)&&l[a])},defineProperty(n,e,t){return t.get!=null?n._.accessCache[e]=0:it(t,"value")&&this.set(n,e,t.value,null),Reflect.defineProperty(n,e,t)}};function Wl(n){return He(n)?n.reduce((e,t)=>(e[t]=null,e),{}):n}let ta=!0;function vd(n){const e=ju(n),t=n.proxy,i=n.ctx;ta=!1,e.beforeCreate&&Xl(e.beforeCreate,n,"bc");const{data:r,computed:s,methods:o,watch:a,provide:l,inject:c,created:u,beforeMount:f,mounted:d,beforeUpdate:p,updated:v,activated:M,deactivated:m,beforeDestroy:h,beforeUnmount:w,destroyed:b,unmounted:E,render:R,renderTracked:C,renderTriggered:P,errorCaptured:B,serverPrefetch:T,expose:y,inheritAttrs:L,components:X,directives:Z,filters:se}=e;if(c&&xd(c,i,null),o)for(const Q in o){const U=o[Q];Ve(U)&&(i[Q]=U.bind(t))}if(r){const Q=r.call(t,t);lt(Q)&&(n.data=ll(Q))}if(ta=!0,s)for(const Q in s){const U=s[Q],K=Ve(U)?U.bind(t,t):Ve(U.get)?U.get.bind(t,t):vn,de=!Ve(U)&&Ve(U.set)?U.set.bind(t):vn,ge=xl({get:K,set:de});Object.defineProperty(i,Q,{enumerable:!0,configurable:!0,get:()=>ge.value,set:Le=>ge.value=Le})}if(a)for(const Q in a)Ku(a[Q],i,t,Q);if(l){const Q=Ve(l)?l.call(t):l;Reflect.ownKeys(Q).forEach(U=>{jh(U,Q[U])})}u&&Xl(u,n,"c");function j(Q,U){He(U)?U.forEach(K=>Q(K.bind(t))):U&&Q(U.bind(t))}if(j(od,f),j(dl,d),j(ad,p),j(ld,v),j(id,M),j(rd,m),j(dd,B),j(hd,C),j(fd,P),j(cd,w),j(pl,E),j(ud,T),He(y))if(y.length){const Q=n.exposed||(n.exposed={});y.forEach(U=>{Object.defineProperty(Q,U,{get:()=>t[U],set:K=>t[U]=K,enumerable:!0})})}else n.exposed||(n.exposed={});R&&n.render===vn&&(n.render=R),L!=null&&(n.inheritAttrs=L),X&&(n.components=X),Z&&(n.directives=Z),T&&Xu(n)}function xd(n,e,t=vn){He(n)&&(n=na(n));for(const i in n){const r=n[i];let s;lt(r)?"default"in r?s=ys(r.from||i,r.default,!0):s=ys(r.from||i):s=ys(r),wt(s)?Object.defineProperty(e,i,{enumerable:!0,configurable:!0,get:()=>s.value,set:o=>s.value=o}):e[i]=s}}function Xl(n,e,t){Sn(He(n)?n.map(i=>i.bind(e.proxy)):n.bind(e.proxy),e,t)}function Ku(n,e,t,i){let r=i.includes(".")?ku(t,i):()=>t[i];if(vt(n)){const s=e[n];Ve(s)&&co(r,s)}else if(Ve(n))co(r,n.bind(t));else if(lt(n))if(He(n))n.forEach(s=>Ku(s,e,t,i));else{const s=Ve(n.handler)?n.handler.bind(t):e[n.handler];Ve(s)&&co(r,s,n)}}function ju(n){const e=n.type,{mixins:t,extends:i}=e,{mixins:r,optionsCache:s,config:{optionMergeStrategies:o}}=n.appContext,a=s.get(e);let l;return a?l=a:!r.length&&!t&&!i?l=e:(l={},r.length&&r.forEach(c=>Ns(l,c,o,!0)),Ns(l,e,o)),lt(e)&&s.set(e,l),l}function Ns(n,e,t,i=!1){const{mixins:r,extends:s}=e;s&&Ns(n,s,t,!0),r&&r.forEach(o=>Ns(n,o,t,!0));for(const o in e)if(!(i&&o==="expose")){const a=Md[o]||t&&t[o];n[o]=a?a(n[o],e[o]):e[o]}return n}const Md={data:ql,props:Yl,emits:Yl,methods:gr,computed:gr,beforeCreate:Ct,created:Ct,beforeMount:Ct,mounted:Ct,beforeUpdate:Ct,updated:Ct,beforeDestroy:Ct,beforeUnmount:Ct,destroyed:Ct,unmounted:Ct,activated:Ct,deactivated:Ct,errorCaptured:Ct,serverPrefetch:Ct,components:gr,directives:gr,watch:Ed,provide:ql,inject:Sd};function ql(n,e){return e?n?function(){return Et(Ve(n)?n.call(this,this):n,Ve(e)?e.call(this,this):e)}:e:n}function Sd(n,e){return gr(na(n),na(e))}function na(n){if(He(n)){const e={};for(let t=0;t<n.length;t++)e[n[t]]=n[t];return e}return n}function Ct(n,e){return n?[...new Set([].concat(n,e))]:e}function gr(n,e){return n?Et(Object.create(null),n,e):e}function Yl(n,e){return n?He(n)&&He(e)?[...new Set([...n,...e])]:Et(Object.create(null),Wl(n),Wl(e??{})):e}function Ed(n,e){if(!n)return e;if(!e)return n;const t=Et(Object.create(null),n);for(const i in e)t[i]=Ct(n[i],e[i]);return t}function Zu(){return{app:null,config:{isNativeTag:du,performance:!1,globalProperties:{},optionMergeStrategies:{},errorHandler:void 0,warnHandler:void 0,compilerOptions:{}},mixins:[],components:{},directives:{},provides:Object.create(null),optionsCache:new WeakMap,propsCache:new WeakMap,emitsCache:new WeakMap}}let yd=0;function Td(n,e){return function(i,r=null){Ve(i)||(i=Et({},i)),r!=null&&!lt(r)&&(r=null);const s=Zu(),o=new WeakSet,a=[];let l=!1;const c=s.app={_uid:yd++,_component:i,_props:r,_container:null,_context:s,_instance:null,version:sp,get config(){return s.config},set config(u){},use(u,...f){return o.has(u)||(u&&Ve(u.install)?(o.add(u),u.install(c,...f)):Ve(u)&&(o.add(u),u(c,...f))),c},mixin(u){return s.mixins.includes(u)||s.mixins.push(u),c},component(u,f){return f?(s.components[u]=f,c):s.components[u]},directive(u,f){return f?(s.directives[u]=f,c):s.directives[u]},mount(u,f,d){if(!l){const p=c._ceVNode||ti(i,r);return p.appContext=s,d===!0?d="svg":d===!1&&(d=void 0),n(p,u,d),l=!0,c._container=u,u.__vue_app__=c,vl(p.component)}},onUnmount(u){a.push(u)},unmount(){l&&(Sn(a,c._instance,16),n(null,c._container),delete c._container.__vue_app__)},provide(u,f){return s.provides[u]=f,c},runWithContext(u){const f=ji;ji=c;try{return u()}finally{ji=f}}};return c}}let ji=null;const bd=(n,e)=>e==="modelValue"||e==="model-value"?n.modelModifiers:n[`${e}Modifiers`]||n[`${Lt(e)}Modifiers`]||n[`${wi(e)}Modifiers`];function Ad(n,e,...t){if(n.isUnmounted)return;const i=n.vnode.props||ft;let r=t;const s=e.startsWith("update:"),o=s&&bd(i,e.slice(7));o&&(o.trim&&(r=t.map(u=>vt(u)?u.trim():u)),o.number&&(r=t.map(lh)));let a,l=i[a=io(e)]||i[a=io(Lt(e))];!l&&s&&(l=i[a=io(wi(e))]),l&&Sn(l,n,6,r);const c=i[a+"Once"];if(c){if(!n.emitted)n.emitted={};else if(n.emitted[a])return;n.emitted[a]=!0,Sn(c,n,6,r)}}const wd=new WeakMap;function Ju(n,e,t=!1){const i=t?wd:e.emitsCache,r=i.get(n);if(r!==void 0)return r;const s=n.emits;let o={},a=!1;if(!Ve(n)){const l=c=>{const u=Ju(c,e,!0);u&&(a=!0,Et(o,u))};!t&&e.mixins.length&&e.mixins.forEach(l),n.extends&&l(n.extends),n.mixins&&n.mixins.forEach(l)}return!s&&!a?(lt(n)&&i.set(n,null),null):(He(s)?s.forEach(l=>o[l]=null):Et(o,s),lt(n)&&i.set(n,o),o)}function Ks(n,e){return!n||!Gs(e)?!1:(e=e.slice(2).replace(/Once$/,""),it(n,e[0].toLowerCase()+e.slice(1))||it(n,wi(e))||it(n,e))}function $l(n){const{type:e,vnode:t,proxy:i,withProxy:r,propsOptions:[s],slots:o,attrs:a,emit:l,render:c,renderCache:u,props:f,data:d,setupState:p,ctx:v,inheritAttrs:M}=n,m=Is(n);let h,w;try{if(t.shapeFlag&4){const E=r||i,R=E;h=dn(c.call(R,E,u,f,p,d,v)),w=a}else{const E=e;h=dn(E.length>1?E(f,{attrs:a,slots:o,emit:l}):E(f,null)),w=e.props?a:Rd(a)}}catch(E){br.length=0,Ys(E,n,1),h=ti(Qi)}let b=h;if(w&&M!==!1){const E=Object.keys(w),{shapeFlag:R}=b;E.length&&R&7&&(s&&E.some(Ja)&&(w=Cd(w,s)),b=er(b,w,!1,!0))}return t.dirs&&(b=er(b,null,!1,!0),b.dirs=b.dirs?b.dirs.concat(t.dirs):t.dirs),t.transition&&hl(b,t.transition),h=b,Is(m),h}const Rd=n=>{let e;for(const t in n)(t==="class"||t==="style"||Gs(t))&&((e||(e={}))[t]=n[t]);return e},Cd=(n,e)=>{const t={};for(const i in n)(!Ja(i)||!(i.slice(9)in e))&&(t[i]=n[i]);return t};function Pd(n,e,t){const{props:i,children:r,component:s}=n,{props:o,children:a,patchFlag:l}=e,c=s.emitsOptions;if(e.dirs||e.transition)return!0;if(t&&l>=0){if(l&1024)return!0;if(l&16)return i?Kl(i,o,c):!!o;if(l&8){const u=e.dynamicProps;for(let f=0;f<u.length;f++){const d=u[f];if(Qu(o,i,d)&&!Ks(c,d))return!0}}}else return(r||a)&&(!a||!a.$stable)?!0:i===o?!1:i?o?Kl(i,o,c):!0:!!o;return!1}function Kl(n,e,t){const i=Object.keys(e);if(i.length!==Object.keys(n).length)return!0;for(let r=0;r<i.length;r++){const s=i[r];if(Qu(e,n,s)&&!Ks(t,s))return!0}return!1}function Qu(n,e,t){const i=n[t],r=e[t];return t==="style"&&lt(i)&&lt(r)?!tl(i,r):i!==r}function Dd({vnode:n,parent:e},t){for(;e;){const i=e.subTree;if(i.suspense&&i.suspense.activeBranch===n&&(i.el=n.el),i===n)(n=e.vnode).el=t,e=e.parent;else break}}const ef={},tf=()=>Object.create(ef),nf=n=>Object.getPrototypeOf(n)===ef;function Ld(n,e,t,i=!1){const r={},s=tf();n.propsDefaults=Object.create(null),rf(n,e,r,s);for(const o in n.propsOptions[0])o in r||(r[o]=void 0);t?n.props=i?r:Fh(r):n.type.props?n.props=r:n.props=s,n.attrs=s}function Id(n,e,t,i){const{props:r,attrs:s,vnode:{patchFlag:o}}=n,a=nt(r),[l]=n.propsOptions;let c=!1;if((i||o>0)&&!(o&16)){if(o&8){const u=n.vnode.dynamicProps;for(let f=0;f<u.length;f++){let d=u[f];if(Ks(n.emitsOptions,d))continue;const p=e[d];if(l)if(it(s,d))p!==s[d]&&(s[d]=p,c=!0);else{const v=Lt(d);r[v]=ia(l,a,v,p,n,!1)}else p!==s[d]&&(s[d]=p,c=!0)}}}else{rf(n,e,r,s)&&(c=!0);let u;for(const f in a)(!e||!it(e,f)&&((u=wi(f))===f||!it(e,u)))&&(l?t&&(t[f]!==void 0||t[u]!==void 0)&&(r[f]=ia(l,a,f,void 0,n,!0)):delete r[f]);if(s!==a)for(const f in s)(!e||!it(e,f))&&(delete s[f],c=!0)}c&&Fn(n.attrs,"set","")}function rf(n,e,t,i){const[r,s]=n.propsOptions;let o=!1,a;if(e)for(let l in e){if(xr(l))continue;const c=e[l];let u;r&&it(r,u=Lt(l))?!s||!s.includes(u)?t[u]=c:(a||(a={}))[u]=c:Ks(n.emitsOptions,l)||(!(l in i)||c!==i[l])&&(i[l]=c,o=!0)}if(s){const l=nt(t),c=a||ft;for(let u=0;u<s.length;u++){const f=s[u];t[f]=ia(r,l,f,c[f],n,!it(c,f))}}return o}function ia(n,e,t,i,r,s){const o=n[t];if(o!=null){const a=it(o,"default");if(a&&i===void 0){const l=o.default;if(o.type!==Function&&!o.skipFactory&&Ve(l)){const{propsDefaults:c}=r;if(t in c)i=c[t];else{const u=Vr(r);i=c[t]=l.call(null,e),u()}}else i=l;r.ce&&r.ce._setProp(t,i)}o[0]&&(s&&!a?i=!1:o[1]&&(i===""||i===wi(t))&&(i=!0))}return i}const Ud=new WeakMap;function sf(n,e,t=!1){const i=t?Ud:e.propsCache,r=i.get(n);if(r)return r;const s=n.props,o={},a=[];let l=!1;if(!Ve(n)){const u=f=>{l=!0;const[d,p]=sf(f,e,!0);Et(o,d),p&&a.push(...p)};!t&&e.mixins.length&&e.mixins.forEach(u),n.extends&&u(n.extends),n.mixins&&n.mixins.forEach(u)}if(!s&&!l)return lt(n)&&i.set(n,qi),qi;if(He(s))for(let u=0;u<s.length;u++){const f=Lt(s[u]);jl(f)&&(o[f]=ft)}else if(s)for(const u in s){const f=Lt(u);if(jl(f)){const d=s[u],p=o[f]=He(d)||Ve(d)?{type:d}:Et({},d),v=p.type;let M=!1,m=!0;if(He(v))for(let h=0;h<v.length;++h){const w=v[h],b=Ve(w)&&w.name;if(b==="Boolean"){M=!0;break}else b==="String"&&(m=!1)}else M=Ve(v)&&v.name==="Boolean";p[0]=M,p[1]=m,(M||it(p,"default"))&&a.push(f)}}const c=[o,a];return lt(n)&&i.set(n,c),c}function jl(n){return n[0]!=="$"&&!xr(n)}const ml=n=>n==="_"||n==="_ctx"||n==="$stable",_l=n=>He(n)?n.map(dn):[dn(n)],Nd=(n,e,t)=>{if(e._n)return e;const i=Kh((...r)=>_l(e(...r)),t);return i._c=!1,i},of=(n,e,t)=>{const i=n._ctx;for(const r in n){if(ml(r))continue;const s=n[r];if(Ve(s))e[r]=Nd(r,s,i);else if(s!=null){const o=_l(s);e[r]=()=>o}}},af=(n,e)=>{const t=_l(e);n.slots.default=()=>t},lf=(n,e,t)=>{for(const i in e)(t||!ml(i))&&(n[i]=e[i])},Fd=(n,e,t)=>{const i=n.slots=tf();if(n.vnode.shapeFlag&32){const r=e._;r?(lf(i,e,t),t&&vu(i,"_",r,!0)):of(e,i)}else e&&af(n,e)},Od=(n,e,t)=>{const{vnode:i,slots:r}=n;let s=!0,o=ft;if(i.shapeFlag&32){const a=e._;a?t&&a===1?s=!1:lf(r,e,t):(s=!e.$stable,of(e,r)),o=e}else e&&(af(n,e),o={default:1});if(s)for(const a in r)!ml(a)&&o[a]==null&&delete r[a]},Ot=Gd;function Bd(n){return zd(n)}function zd(n,e){const t=Xs();t.__VUE__=!0;const{insert:i,remove:r,patchProp:s,createElement:o,createText:a,createComment:l,setText:c,setElementText:u,parentNode:f,nextSibling:d,setScopeId:p=vn,insertStaticContent:v}=n,M=(A,_,O,W=null,k=null,z=null,ae=void 0,$=null,te=!!_.dynamicChildren)=>{if(A===_)return;A&&!ur(A,_)&&(W=oe(A),Le(A,k,z,!0),A=null),_.patchFlag===-2&&(te=!1,_.dynamicChildren=null);const{type:ne,ref:xe,shapeFlag:x}=_;switch(ne){case js:m(A,_,O,W);break;case Qi:h(A,_,O,W);break;case ho:A==null&&w(_,O,W,ae);break;case Un:X(A,_,O,W,k,z,ae,$,te);break;default:x&1?R(A,_,O,W,k,z,ae,$,te):x&6?Z(A,_,O,W,k,z,ae,$,te):(x&64||x&128)&&ne.process(A,_,O,W,k,z,ae,$,te,we)}xe!=null&&k?Er(xe,A&&A.ref,z,_||A,!_):xe==null&&A&&A.ref!=null&&Er(A.ref,null,z,A,!0)},m=(A,_,O,W)=>{if(A==null)i(_.el=a(_.children),O,W);else{const k=_.el=A.el;_.children!==A.children&&c(k,_.children)}},h=(A,_,O,W)=>{A==null?i(_.el=l(_.children||""),O,W):_.el=A.el},w=(A,_,O,W)=>{[A.el,A.anchor]=v(A.children,_,O,W,A.el,A.anchor)},b=({el:A,anchor:_},O,W)=>{let k;for(;A&&A!==_;)k=d(A),i(A,O,W),A=k;i(_,O,W)},E=({el:A,anchor:_})=>{let O;for(;A&&A!==_;)O=d(A),r(A),A=O;r(_)},R=(A,_,O,W,k,z,ae,$,te)=>{if(_.type==="svg"?ae="svg":_.type==="math"&&(ae="mathml"),A==null)C(_,O,W,k,z,ae,$,te);else{const ne=A.el&&A.el._isVueCE?A.el:null;try{ne&&ne._beginPatch(),T(A,_,k,z,ae,$,te)}finally{ne&&ne._endPatch()}}},C=(A,_,O,W,k,z,ae,$)=>{let te,ne;const{props:xe,shapeFlag:x,transition:g,dirs:D}=A;if(te=A.el=o(A.type,z,xe&&xe.is,xe),x&8?u(te,A.children):x&16&&B(A.children,te,null,W,k,fo(A,z),ae,$),D&&li(A,null,W,"created"),P(te,A,A.scopeId,ae,W),xe){for(const J in xe)J!=="value"&&!xr(J)&&s(te,J,null,xe[J],z,W);"value"in xe&&s(te,"value",null,xe.value,z),(ne=xe.onVnodeBeforeMount)&&un(ne,W,A)}D&&li(A,null,W,"beforeMount");const V=Hd(k,g);V&&g.beforeEnter(te),i(te,_,O),((ne=xe&&xe.onVnodeMounted)||V||D)&&Ot(()=>{ne&&un(ne,W,A),V&&g.enter(te),D&&li(A,null,W,"mounted")},k)},P=(A,_,O,W,k)=>{if(O&&p(A,O),W)for(let z=0;z<W.length;z++)p(A,W[z]);if(k){let z=k.subTree;if(_===z||hf(z.type)&&(z.ssContent===_||z.ssFallback===_)){const ae=k.vnode;P(A,ae,ae.scopeId,ae.slotScopeIds,k.parent)}}},B=(A,_,O,W,k,z,ae,$,te=0)=>{for(let ne=te;ne<A.length;ne++){const xe=A[ne]=$?Nn(A[ne]):dn(A[ne]);M(null,xe,_,O,W,k,z,ae,$)}},T=(A,_,O,W,k,z,ae)=>{const $=_.el=A.el;let{patchFlag:te,dynamicChildren:ne,dirs:xe}=_;te|=A.patchFlag&16;const x=A.props||ft,g=_.props||ft;let D;if(O&&ci(O,!1),(D=g.onVnodeBeforeUpdate)&&un(D,O,_,A),xe&&li(_,A,O,"beforeUpdate"),O&&ci(O,!0),(x.innerHTML&&g.innerHTML==null||x.textContent&&g.textContent==null)&&u($,""),ne?y(A.dynamicChildren,ne,$,O,W,fo(_,k),z):ae||U(A,_,$,null,O,W,fo(_,k),z,!1),te>0){if(te&16)L($,x,g,O,k);else if(te&2&&x.class!==g.class&&s($,"class",null,g.class,k),te&4&&s($,"style",x.style,g.style,k),te&8){const V=_.dynamicProps;for(let J=0;J<V.length;J++){const G=V[J],Se=x[G],le=g[G];(le!==Se||G==="value")&&s($,G,Se,le,k,O)}}te&1&&A.children!==_.children&&u($,_.children)}else!ae&&ne==null&&L($,x,g,O,k);((D=g.onVnodeUpdated)||xe)&&Ot(()=>{D&&un(D,O,_,A),xe&&li(_,A,O,"updated")},W)},y=(A,_,O,W,k,z,ae)=>{for(let $=0;$<_.length;$++){const te=A[$],ne=_[$],xe=te.el&&(te.type===Un||!ur(te,ne)||te.shapeFlag&198)?f(te.el):O;M(te,ne,xe,null,W,k,z,ae,!0)}},L=(A,_,O,W,k)=>{if(_!==O){if(_!==ft)for(const z in _)!xr(z)&&!(z in O)&&s(A,z,_[z],null,k,W);for(const z in O){if(xr(z))continue;const ae=O[z],$=_[z];ae!==$&&z!=="value"&&s(A,z,$,ae,k,W)}"value"in O&&s(A,"value",_.value,O.value,k)}},X=(A,_,O,W,k,z,ae,$,te)=>{const ne=_.el=A?A.el:a(""),xe=_.anchor=A?A.anchor:a("");let{patchFlag:x,dynamicChildren:g,slotScopeIds:D}=_;D&&($=$?$.concat(D):D),A==null?(i(ne,O,W),i(xe,O,W),B(_.children||[],O,xe,k,z,ae,$,te)):x>0&&x&64&&g&&A.dynamicChildren&&A.dynamicChildren.length===g.length?(y(A.dynamicChildren,g,O,k,z,ae,$),(_.key!=null||k&&_===k.subTree)&&cf(A,_,!0)):U(A,_,O,xe,k,z,ae,$,te)},Z=(A,_,O,W,k,z,ae,$,te)=>{_.slotScopeIds=$,A==null?_.shapeFlag&512?k.ctx.activate(_,O,W,ae,te):se(_,O,W,k,z,ae,te):ie(A,_,te)},se=(A,_,O,W,k,z,ae)=>{const $=A.component=Zd(A,W,k);if(qu(A)&&($.ctx.renderer=we),Qd($,!1,ae),$.asyncDep){if(k&&k.registerDep($,j,ae),!A.el){const te=$.subTree=ti(Qi);h(null,te,_,O),A.placeholder=te.el}}else j($,A,_,O,k,z,ae)},ie=(A,_,O)=>{const W=_.component=A.component;if(Pd(A,_,O))if(W.asyncDep&&!W.asyncResolved){Q(W,_,O);return}else W.next=_,W.update();else _.el=A.el,W.vnode=_},j=(A,_,O,W,k,z,ae)=>{const $=()=>{if(A.isMounted){let{next:x,bu:g,u:D,parent:V,vnode:J}=A;{const Te=uf(A);if(Te){x&&(x.el=J.el,Q(A,x,ae)),Te.asyncDep.then(()=>{Ot(()=>{A.isUnmounted||ne()},k)});return}}let G=x,Se;ci(A,!1),x?(x.el=J.el,Q(A,x,ae)):x=J,g&&ro(g),(Se=x.props&&x.props.onVnodeBeforeUpdate)&&un(Se,V,x,J),ci(A,!0);const le=$l(A),Ee=A.subTree;A.subTree=le,M(Ee,le,f(Ee.el),oe(Ee),A,k,z),x.el=le.el,G===null&&Dd(A,le.el),D&&Ot(D,k),(Se=x.props&&x.props.onVnodeUpdated)&&Ot(()=>un(Se,V,x,J),k)}else{let x;const{el:g,props:D}=_,{bm:V,m:J,parent:G,root:Se,type:le}=A,Ee=yr(_);ci(A,!1),V&&ro(V),!Ee&&(x=D&&D.onVnodeBeforeMount)&&un(x,G,_),ci(A,!0);{Se.ce&&Se.ce._hasShadowRoot()&&Se.ce._injectChildStyle(le,A.parent?A.parent.type:void 0);const Te=A.subTree=$l(A);M(null,Te,O,W,A,k,z),_.el=Te.el}if(J&&Ot(J,k),!Ee&&(x=D&&D.onVnodeMounted)){const Te=_;Ot(()=>un(x,G,Te),k)}(_.shapeFlag&256||G&&yr(G.vnode)&&G.vnode.shapeFlag&256)&&A.a&&Ot(A.a,k),A.isMounted=!0,_=O=W=null}};A.scope.on();const te=A.effect=new Eu($);A.scope.off();const ne=A.update=te.run.bind(te),xe=A.job=te.runIfDirty.bind(te);xe.i=A,xe.id=A.uid,te.scheduler=()=>fl(xe),ci(A,!0),ne()},Q=(A,_,O)=>{_.component=A;const W=A.vnode.props;A.vnode=_,A.next=null,Id(A,_.props,W,O),Od(A,_.children,O),Hn(),Hl(A),Vn()},U=(A,_,O,W,k,z,ae,$,te=!1)=>{const ne=A&&A.children,xe=A?A.shapeFlag:0,x=_.children,{patchFlag:g,shapeFlag:D}=_;if(g>0){if(g&128){de(ne,x,O,W,k,z,ae,$,te);return}else if(g&256){K(ne,x,O,W,k,z,ae,$,te);return}}D&8?(xe&16&&ee(ne,k,z),x!==ne&&u(O,x)):xe&16?D&16?de(ne,x,O,W,k,z,ae,$,te):ee(ne,k,z,!0):(xe&8&&u(O,""),D&16&&B(x,O,W,k,z,ae,$,te))},K=(A,_,O,W,k,z,ae,$,te)=>{A=A||qi,_=_||qi;const ne=A.length,xe=_.length,x=Math.min(ne,xe);let g;for(g=0;g<x;g++){const D=_[g]=te?Nn(_[g]):dn(_[g]);M(A[g],D,O,null,k,z,ae,$,te)}ne>xe?ee(A,k,z,!0,!1,x):B(_,O,W,k,z,ae,$,te,x)},de=(A,_,O,W,k,z,ae,$,te)=>{let ne=0;const xe=_.length;let x=A.length-1,g=xe-1;for(;ne<=x&&ne<=g;){const D=A[ne],V=_[ne]=te?Nn(_[ne]):dn(_[ne]);if(ur(D,V))M(D,V,O,null,k,z,ae,$,te);else break;ne++}for(;ne<=x&&ne<=g;){const D=A[x],V=_[g]=te?Nn(_[g]):dn(_[g]);if(ur(D,V))M(D,V,O,null,k,z,ae,$,te);else break;x--,g--}if(ne>x){if(ne<=g){const D=g+1,V=D<xe?_[D].el:W;for(;ne<=g;)M(null,_[ne]=te?Nn(_[ne]):dn(_[ne]),O,V,k,z,ae,$,te),ne++}}else if(ne>g)for(;ne<=x;)Le(A[ne],k,z,!0),ne++;else{const D=ne,V=ne,J=new Map;for(ne=V;ne<=g;ne++){const Ce=_[ne]=te?Nn(_[ne]):dn(_[ne]);Ce.key!=null&&J.set(Ce.key,ne)}let G,Se=0;const le=g-V+1;let Ee=!1,Te=0;const ce=new Array(le);for(ne=0;ne<le;ne++)ce[ne]=0;for(ne=D;ne<=x;ne++){const Ce=A[ne];if(Se>=le){Le(Ce,k,z,!0);continue}let be;if(Ce.key!=null)be=J.get(Ce.key);else for(G=V;G<=g;G++)if(ce[G-V]===0&&ur(Ce,_[G])){be=G;break}be===void 0?Le(Ce,k,z,!0):(ce[be-V]=ne+1,be>=Te?Te=be:Ee=!0,M(Ce,_[be],O,null,k,z,ae,$,te),Se++)}const ve=Ee?Vd(ce):qi;for(G=ve.length-1,ne=le-1;ne>=0;ne--){const Ce=V+ne,be=_[Ce],me=_[Ce+1],Be=Ce+1<xe?me.el||ff(me):W;ce[ne]===0?M(null,be,O,Be,k,z,ae,$,te):Ee&&(G<0||ne!==ve[G]?ge(be,O,Be,2):G--)}}},ge=(A,_,O,W,k=null)=>{const{el:z,type:ae,transition:$,children:te,shapeFlag:ne}=A;if(ne&6){ge(A.component.subTree,_,O,W);return}if(ne&128){A.suspense.move(_,O,W);return}if(ne&64){ae.move(A,_,O,we);return}if(ae===Un){i(z,_,O);for(let x=0;x<te.length;x++)ge(te[x],_,O,W);i(A.anchor,_,O);return}if(ae===ho){b(A,_,O);return}if(W!==2&&ne&1&&$)if(W===0)$.beforeEnter(z),i(z,_,O),Ot(()=>$.enter(z),k);else{const{leave:x,delayLeave:g,afterLeave:D}=$,V=()=>{A.ctx.isUnmounted?r(z):i(z,_,O)},J=()=>{z._isLeaving&&z[nd](!0),x(z,()=>{V(),D&&D()})};g?g(z,V,J):J()}else i(z,_,O)},Le=(A,_,O,W=!1,k=!1)=>{const{type:z,props:ae,ref:$,children:te,dynamicChildren:ne,shapeFlag:xe,patchFlag:x,dirs:g,cacheIndex:D}=A;if(x===-2&&(k=!1),$!=null&&(Hn(),Er($,null,O,A,!0),Vn()),D!=null&&(_.renderCache[D]=void 0),xe&256){_.ctx.deactivate(A);return}const V=xe&1&&g,J=!yr(A);let G;if(J&&(G=ae&&ae.onVnodeBeforeUnmount)&&un(G,_,A),xe&6)Xe(A.component,O,W);else{if(xe&128){A.suspense.unmount(O,W);return}V&&li(A,null,_,"beforeUnmount"),xe&64?A.type.remove(A,_,O,we,W):ne&&!ne.hasOnce&&(z!==Un||x>0&&x&64)?ee(ne,_,O,!1,!0):(z===Un&&x&384||!k&&xe&16)&&ee(te,_,O),W&&ke(A)}(J&&(G=ae&&ae.onVnodeUnmounted)||V)&&Ot(()=>{G&&un(G,_,A),V&&li(A,null,_,"unmounted")},O)},ke=A=>{const{type:_,el:O,anchor:W,transition:k}=A;if(_===Un){Ze(O,W);return}if(_===ho){E(A);return}const z=()=>{r(O),k&&!k.persisted&&k.afterLeave&&k.afterLeave()};if(A.shapeFlag&1&&k&&!k.persisted){const{leave:ae,delayLeave:$}=k,te=()=>ae(O,z);$?$(A.el,z,te):te()}else z()},Ze=(A,_)=>{let O;for(;A!==_;)O=d(A),r(A),A=O;r(_)},Xe=(A,_,O)=>{const{bum:W,scope:k,job:z,subTree:ae,um:$,m:te,a:ne}=A;Zl(te),Zl(ne),W&&ro(W),k.stop(),z&&(z.flags|=8,Le(ae,A,_,O)),$&&Ot($,_),Ot(()=>{A.isUnmounted=!0},_)},ee=(A,_,O,W=!1,k=!1,z=0)=>{for(let ae=z;ae<A.length;ae++)Le(A[ae],_,O,W,k)},oe=A=>{if(A.shapeFlag&6)return oe(A.component.subTree);if(A.shapeFlag&128)return A.suspense.next();const _=d(A.anchor||A.el),O=_&&_[ed];return O?d(O):_};let ye=!1;const Ue=(A,_,O)=>{let W;A==null?_._vnode&&(Le(_._vnode,null,null,!0),W=_._vnode.component):M(_._vnode||null,A,_,null,null,null,O),_._vnode=A,ye||(ye=!0,Hl(W),zu(),ye=!1)},we={p:M,um:Le,m:ge,r:ke,mt:se,mc:B,pc:U,pbc:y,n:oe,o:n};return{render:Ue,hydrate:void 0,createApp:Td(Ue)}}function fo({type:n,props:e},t){return t==="svg"&&n==="foreignObject"||t==="mathml"&&n==="annotation-xml"&&e&&e.encoding&&e.encoding.includes("html")?void 0:t}function ci({effect:n,job:e},t){t?(n.flags|=32,e.flags|=4):(n.flags&=-33,e.flags&=-5)}function Hd(n,e){return(!n||n&&!n.pendingBranch)&&e&&!e.persisted}function cf(n,e,t=!1){const i=n.children,r=e.children;if(He(i)&&He(r))for(let s=0;s<i.length;s++){const o=i[s];let a=r[s];a.shapeFlag&1&&!a.dynamicChildren&&((a.patchFlag<=0||a.patchFlag===32)&&(a=r[s]=Nn(r[s]),a.el=o.el),!t&&a.patchFlag!==-2&&cf(o,a)),a.type===js&&(a.patchFlag===-1&&(a=r[s]=Nn(a)),a.el=o.el),a.type===Qi&&!a.el&&(a.el=o.el)}}function Vd(n){const e=n.slice(),t=[0];let i,r,s,o,a;const l=n.length;for(i=0;i<l;i++){const c=n[i];if(c!==0){if(r=t[t.length-1],n[r]<c){e[i]=r,t.push(i);continue}for(s=0,o=t.length-1;s<o;)a=s+o>>1,n[t[a]]<c?s=a+1:o=a;c<n[t[s]]&&(s>0&&(e[i]=t[s-1]),t[s]=i)}}for(s=t.length,o=t[s-1];s-- >0;)t[s]=o,o=e[o];return t}function uf(n){const e=n.subTree.component;if(e)return e.asyncDep&&!e.asyncResolved?e:uf(e)}function Zl(n){if(n)for(let e=0;e<n.length;e++)n[e].flags|=8}function ff(n){if(n.placeholder)return n.placeholder;const e=n.component;return e?ff(e.subTree):null}const hf=n=>n.__isSuspense;function Gd(n,e){e&&e.pendingBranch?He(n)?e.effects.push(...n):e.effects.push(n):$h(n)}const Un=Symbol.for("v-fgt"),js=Symbol.for("v-txt"),Qi=Symbol.for("v-cmt"),ho=Symbol.for("v-stc"),br=[];let Xt=null;function Fs(n=!1){br.push(Xt=n?null:[])}function kd(){br.pop(),Xt=br[br.length-1]||null}let Lr=1;function Jl(n,e=!1){Lr+=n,n<0&&Xt&&e&&(Xt.hasOnce=!0)}function df(n){return n.dynamicChildren=Lr>0?Xt||qi:null,kd(),Lr>0&&Xt&&Xt.push(n),n}function ra(n,e,t,i,r,s){return df(et(n,e,t,i,r,s,!0))}function Wd(n,e,t,i,r){return df(ti(n,e,t,i,r,!0))}function pf(n){return n?n.__v_isVNode===!0:!1}function ur(n,e){return n.type===e.type&&n.key===e.key}const mf=({key:n})=>n??null,Ts=({ref:n,ref_key:e,ref_for:t})=>(typeof n=="number"&&(n=""+n),n!=null?vt(n)||wt(n)||Ve(n)?{i:tn,r:n,k:e,f:!!t}:n:null);function et(n,e=null,t=null,i=0,r=null,s=n===Un?0:1,o=!1,a=!1){const l={__v_isVNode:!0,__v_skip:!0,type:n,props:e,key:e&&mf(e),ref:e&&Ts(e),scopeId:Vu,slotScopeIds:null,children:t,component:null,suspense:null,ssContent:null,ssFallback:null,dirs:null,transition:null,el:null,anchor:null,target:null,targetStart:null,targetAnchor:null,staticCount:0,shapeFlag:s,patchFlag:i,dynamicProps:r,dynamicChildren:null,appContext:null,ctx:tn};return a?(gl(l,t),s&128&&n.normalize(l)):t&&(l.shapeFlag|=vt(t)?8:16),Lr>0&&!o&&Xt&&(l.patchFlag>0||s&6)&&l.patchFlag!==32&&Xt.push(l),l}const ti=Xd;function Xd(n,e=null,t=null,i=0,r=null,s=!1){if((!n||n===$u)&&(n=Qi),pf(n)){const a=er(n,e,!0);return t&&gl(a,t),Lr>0&&!s&&Xt&&(a.shapeFlag&6?Xt[Xt.indexOf(n)]=a:Xt.push(a)),a.patchFlag=-2,a}if(rp(n)&&(n=n.__vccOpts),e){e=qd(e);let{class:a,style:l}=e;a&&!vt(a)&&(e.class=qs(a)),lt(l)&&(ul(l)&&!He(l)&&(l=Et({},l)),e.style=wr(l))}const o=vt(n)?1:hf(n)?128:td(n)?64:lt(n)?4:Ve(n)?2:0;return et(n,e,t,i,r,o,s,!0)}function qd(n){return n?ul(n)||nf(n)?Et({},n):n:null}function er(n,e,t=!1,i=!1){const{props:r,ref:s,patchFlag:o,children:a,transition:l}=n,c=e?$d(r||{},e):r,u={__v_isVNode:!0,__v_skip:!0,type:n.type,props:c,key:c&&mf(c),ref:e&&e.ref?t&&s?He(s)?s.concat(Ts(e)):[s,Ts(e)]:Ts(e):s,scopeId:n.scopeId,slotScopeIds:n.slotScopeIds,children:a,target:n.target,targetStart:n.targetStart,targetAnchor:n.targetAnchor,staticCount:n.staticCount,shapeFlag:n.shapeFlag,patchFlag:e&&n.type!==Un?o===-1?16:o|16:o,dynamicProps:n.dynamicProps,dynamicChildren:n.dynamicChildren,appContext:n.appContext,dirs:n.dirs,transition:l,component:n.component,suspense:n.suspense,ssContent:n.ssContent&&er(n.ssContent),ssFallback:n.ssFallback&&er(n.ssFallback),placeholder:n.placeholder,el:n.el,anchor:n.anchor,ctx:n.ctx,ce:n.ce};return l&&i&&hl(u,l.clone(u)),u}function Yd(n=" ",e=0){return ti(js,null,n,e)}function dn(n){return n==null||typeof n=="boolean"?ti(Qi):He(n)?ti(Un,null,n.slice()):pf(n)?Nn(n):ti(js,null,String(n))}function Nn(n){return n.el===null&&n.patchFlag!==-1||n.memo?n:er(n)}function gl(n,e){let t=0;const{shapeFlag:i}=n;if(e==null)e=null;else if(He(e))t=16;else if(typeof e=="object")if(i&65){const r=e.default;r&&(r._c&&(r._d=!1),gl(n,r()),r._c&&(r._d=!0));return}else{t=32;const r=e._;!r&&!nf(e)?e._ctx=tn:r===3&&tn&&(tn.slots._===1?e._=1:(e._=2,n.patchFlag|=1024))}else Ve(e)?(e={default:e,_ctx:tn},t=32):(e=String(e),i&64?(t=16,e=[Yd(e)]):t=8);n.children=e,n.shapeFlag|=t}function $d(...n){const e={};for(let t=0;t<n.length;t++){const i=n[t];for(const r in i)if(r==="class")e.class!==i.class&&(e.class=qs([e.class,i.class]));else if(r==="style")e.style=wr([e.style,i.style]);else if(Gs(r)){const s=e[r],o=i[r];o&&s!==o&&!(He(s)&&s.includes(o))&&(e[r]=s?[].concat(s,o):o)}else r!==""&&(e[r]=i[r])}return e}function un(n,e,t,i=null){Sn(n,e,7,[t,i])}const Kd=Zu();let jd=0;function Zd(n,e,t){const i=n.type,r=(e?e.appContext:n.appContext)||Kd,s={uid:jd++,vnode:n,type:i,parent:e,appContext:r,root:null,next:null,subTree:null,effect:null,update:null,job:null,scope:new _h(!0),render:null,proxy:null,exposed:null,exposeProxy:null,withProxy:null,provides:e?e.provides:Object.create(r.provides),ids:e?e.ids:["",0,0],accessCache:null,renderCache:[],components:null,directives:null,propsOptions:sf(i,r),emitsOptions:Ju(i,r),emit:null,emitted:null,propsDefaults:ft,inheritAttrs:i.inheritAttrs,ctx:ft,data:ft,props:ft,attrs:ft,slots:ft,refs:ft,setupState:ft,setupContext:null,suspense:t,suspenseId:t?t.pendingId:0,asyncDep:null,asyncResolved:!1,isMounted:!1,isUnmounted:!1,isDeactivated:!1,bc:null,c:null,bm:null,m:null,bu:null,u:null,um:null,bum:null,da:null,a:null,rtg:null,rtc:null,ec:null,sp:null};return s.ctx={_:s},s.root=e?e.root:s,s.emit=Ad.bind(null,s),n.ce&&n.ce(s),s}let At=null;const Jd=()=>At||tn;let Os,sa;{const n=Xs(),e=(t,i)=>{let r;return(r=n[t])||(r=n[t]=[]),r.push(i),s=>{r.length>1?r.forEach(o=>o(s)):r[0](s)}};Os=e("__VUE_INSTANCE_SETTERS__",t=>At=t),sa=e("__VUE_SSR_SETTERS__",t=>Ir=t)}const Vr=n=>{const e=At;return Os(n),n.scope.on(),()=>{n.scope.off(),Os(e)}},Ql=()=>{At&&At.scope.off(),Os(null)};function _f(n){return n.vnode.shapeFlag&4}let Ir=!1;function Qd(n,e=!1,t=!1){e&&sa(e);const{props:i,children:r}=n.vnode,s=_f(n);Ld(n,i,s,e),Fd(n,r,t||e);const o=s?ep(n,e):void 0;return e&&sa(!1),o}function ep(n,e){const t=n.type;n.accessCache=Object.create(null),n.proxy=new Proxy(n.ctx,gd);const{setup:i}=t;if(i){Hn();const r=n.setupContext=i.length>1?np(n):null,s=Vr(n),o=Hr(i,n,0,[n.props,r]),a=mu(o);if(Vn(),s(),(a||n.sp)&&!yr(n)&&Xu(n),a){if(o.then(Ql,Ql),e)return o.then(l=>{ec(n,l)}).catch(l=>{Ys(l,n,0)});n.asyncDep=o}else ec(n,o)}else gf(n)}function ec(n,e,t){Ve(e)?n.type.__ssrInlineRender?n.ssrRender=e:n.render=e:lt(e)&&(n.setupState=Fu(e)),gf(n)}function gf(n,e,t){const i=n.type;n.render||(n.render=i.render||vn);{const r=Vr(n);Hn();try{vd(n)}finally{Vn(),r()}}}const tp={get(n,e){return bt(n,"get",""),n[e]}};function np(n){const e=t=>{n.exposed=t||{}};return{attrs:new Proxy(n.attrs,tp),slots:n.slots,emit:n.emit,expose:e}}function vl(n){return n.exposed?n.exposeProxy||(n.exposeProxy=new Proxy(Fu(Oh(n.exposed)),{get(e,t){if(t in e)return e[t];if(t in Tr)return Tr[t](n)},has(e,t){return t in e||t in Tr}})):n.proxy}function ip(n,e=!0){return Ve(n)?n.displayName||n.name:n.name||e&&n.__name}function rp(n){return Ve(n)&&"__vccOpts"in n}const xl=(n,e)=>Gh(n,e,Ir),sp="3.5.30";let oa;const tc=typeof window<"u"&&window.trustedTypes;if(tc)try{oa=tc.createPolicy("vue",{createHTML:n=>n})}catch{}const vf=oa?n=>oa.createHTML(n):n=>n,op="http://www.w3.org/2000/svg",ap="http://www.w3.org/1998/Math/MathML",In=typeof document<"u"?document:null,nc=In&&In.createElement("template"),lp={insert:(n,e,t)=>{e.insertBefore(n,t||null)},remove:n=>{const e=n.parentNode;e&&e.removeChild(n)},createElement:(n,e,t,i)=>{const r=e==="svg"?In.createElementNS(op,n):e==="mathml"?In.createElementNS(ap,n):t?In.createElement(n,{is:t}):In.createElement(n);return n==="select"&&i&&i.multiple!=null&&r.setAttribute("multiple",i.multiple),r},createText:n=>In.createTextNode(n),createComment:n=>In.createComment(n),setText:(n,e)=>{n.nodeValue=e},setElementText:(n,e)=>{n.textContent=e},parentNode:n=>n.parentNode,nextSibling:n=>n.nextSibling,querySelector:n=>In.querySelector(n),setScopeId(n,e){n.setAttribute(e,"")},insertStaticContent(n,e,t,i,r,s){const o=t?t.previousSibling:e.lastChild;if(r&&(r===s||r.nextSibling))for(;e.insertBefore(r.cloneNode(!0),t),!(r===s||!(r=r.nextSibling)););else{nc.innerHTML=vf(i==="svg"?`<svg>${n}</svg>`:i==="mathml"?`<math>${n}</math>`:n);const a=nc.content;if(i==="svg"||i==="mathml"){const l=a.firstChild;for(;l.firstChild;)a.appendChild(l.firstChild);a.removeChild(l)}e.insertBefore(a,t)}return[o?o.nextSibling:e.firstChild,t?t.previousSibling:e.lastChild]}},cp=Symbol("_vtc");function up(n,e,t){const i=n[cp];i&&(e=(e?[e,...i]:[...i]).join(" ")),e==null?n.removeAttribute("class"):t?n.setAttribute("class",e):n.className=e}const ic=Symbol("_vod"),fp=Symbol("_vsh"),hp=Symbol(""),dp=/(?:^|;)\s*display\s*:/;function pp(n,e,t){const i=n.style,r=vt(t);let s=!1;if(t&&!r){if(e)if(vt(e))for(const o of e.split(";")){const a=o.slice(0,o.indexOf(":")).trim();t[a]==null&&bs(i,a,"")}else for(const o in e)t[o]==null&&bs(i,o,"");for(const o in t)o==="display"&&(s=!0),bs(i,o,t[o])}else if(r){if(e!==t){const o=i[hp];o&&(t+=";"+o),i.cssText=t,s=dp.test(t)}}else e&&n.removeAttribute("style");ic in n&&(n[ic]=s?i.display:"",n[fp]&&(i.display="none"))}const rc=/\s*!important$/;function bs(n,e,t){if(He(t))t.forEach(i=>bs(n,e,i));else if(t==null&&(t=""),e.startsWith("--"))n.setProperty(e,t);else{const i=mp(n,e);rc.test(t)?n.setProperty(wi(i),t.replace(rc,""),"important"):n[i]=t}}const sc=["Webkit","Moz","ms"],po={};function mp(n,e){const t=po[e];if(t)return t;let i=Lt(e);if(i!=="filter"&&i in n)return po[e]=i;i=Ws(i);for(let r=0;r<sc.length;r++){const s=sc[r]+i;if(s in n)return po[e]=s}return e}const oc="http://www.w3.org/1999/xlink";function ac(n,e,t,i,r,s=ph(e)){i&&e.startsWith("xlink:")?t==null?n.removeAttributeNS(oc,e.slice(6,e.length)):n.setAttributeNS(oc,e,t):t==null||s&&!xu(t)?n.removeAttribute(e):n.setAttribute(e,s?"":Mn(t)?String(t):t)}function lc(n,e,t,i,r){if(e==="innerHTML"||e==="textContent"){t!=null&&(n[e]=e==="innerHTML"?vf(t):t);return}const s=n.tagName;if(e==="value"&&s!=="PROGRESS"&&!s.includes("-")){const a=s==="OPTION"?n.getAttribute("value")||"":n.value,l=t==null?n.type==="checkbox"?"on":"":String(t);(a!==l||!("_value"in n))&&(n.value=l),t==null&&n.removeAttribute(e),n._value=t;return}let o=!1;if(t===""||t==null){const a=typeof n[e];a==="boolean"?t=xu(t):t==null&&a==="string"?(t="",o=!0):a==="number"&&(t=0,o=!0)}try{n[e]=t}catch{}o&&n.removeAttribute(r||e)}function _p(n,e,t,i){n.addEventListener(e,t,i)}function gp(n,e,t,i){n.removeEventListener(e,t,i)}const cc=Symbol("_vei");function vp(n,e,t,i,r=null){const s=n[cc]||(n[cc]={}),o=s[e];if(i&&o)o.value=i;else{const[a,l]=xp(e);if(i){const c=s[e]=Ep(i,r);_p(n,a,c,l)}else o&&(gp(n,a,o,l),s[e]=void 0)}}const uc=/(?:Once|Passive|Capture)$/;function xp(n){let e;if(uc.test(n)){e={};let i;for(;i=n.match(uc);)n=n.slice(0,n.length-i[0].length),e[i[0].toLowerCase()]=!0}return[n[2]===":"?n.slice(3):wi(n.slice(2)),e]}let mo=0;const Mp=Promise.resolve(),Sp=()=>mo||(Mp.then(()=>mo=0),mo=Date.now());function Ep(n,e){const t=i=>{if(!i._vts)i._vts=Date.now();else if(i._vts<=t.attached)return;Sn(yp(i,t.value),e,5,[i])};return t.value=n,t.attached=Sp(),t}function yp(n,e){if(He(e)){const t=n.stopImmediatePropagation;return n.stopImmediatePropagation=()=>{t.call(n),n._stopped=!0},e.map(i=>r=>!r._stopped&&i&&i(r))}else return e}const fc=n=>n.charCodeAt(0)===111&&n.charCodeAt(1)===110&&n.charCodeAt(2)>96&&n.charCodeAt(2)<123,Tp=(n,e,t,i,r,s)=>{const o=r==="svg";e==="class"?up(n,i,o):e==="style"?pp(n,t,i):Gs(e)?Ja(e)||vp(n,e,t,i,s):(e[0]==="."?(e=e.slice(1),!0):e[0]==="^"?(e=e.slice(1),!1):bp(n,e,i,o))?(lc(n,e,i),!n.tagName.includes("-")&&(e==="value"||e==="checked"||e==="selected")&&ac(n,e,i,o,s,e!=="value")):n._isVueCE&&(Ap(n,e)||n._def.__asyncLoader&&(/[A-Z]/.test(e)||!vt(i)))?lc(n,Lt(e),i,s,e):(e==="true-value"?n._trueValue=i:e==="false-value"&&(n._falseValue=i),ac(n,e,i,o))};function bp(n,e,t,i){if(i)return!!(e==="innerHTML"||e==="textContent"||e in n&&fc(e)&&Ve(t));if(e==="spellcheck"||e==="draggable"||e==="translate"||e==="autocorrect"||e==="sandbox"&&n.tagName==="IFRAME"||e==="form"||e==="list"&&n.tagName==="INPUT"||e==="type"&&n.tagName==="TEXTAREA")return!1;if(e==="width"||e==="height"){const r=n.tagName;if(r==="IMG"||r==="VIDEO"||r==="CANVAS"||r==="SOURCE")return!1}return fc(e)&&vt(t)?!1:e in n}function Ap(n,e){const t=n._def.props;if(!t)return!1;const i=Lt(e);return Array.isArray(t)?t.some(r=>Lt(r)===i):Object.keys(t).some(r=>Lt(r)===i)}const wp=Et({patchProp:Tp},lp);let hc;function Rp(){return hc||(hc=Bd(wp))}const Cp=((...n)=>{const e=Rp().createApp(...n),{mount:t}=e;return e.mount=i=>{const r=Dp(i);if(!r)return;const s=e._component;!Ve(s)&&!s.render&&!s.template&&(s.template=r.innerHTML),r.nodeType===1&&(r.textContent="");const o=t(r,!1,Pp(r));return r instanceof Element&&(r.removeAttribute("v-cloak"),r.setAttribute("data-v-app","")),o},e});function Pp(n){if(n instanceof SVGElement)return"svg";if(typeof MathMLElement=="function"&&n instanceof MathMLElement)return"mathml"}function Dp(n){return vt(n)?document.querySelector(n):n}const xf={sceneId:"holographic-command-orb",defaults:{particleSize:1.1,particleColor:"#bfdbfe",backgroundColor:"#02040f",coreColor:"#93c5fd",waveSpeed:.74,welcomeText:"Hello"}};const Ml="180",Lp=0,dc=1,Ip=2,Mf=1,Up=2,Ln=3,si=0,It=1,On=2,ni=0,Zi=1,Ar=2,pc=3,mc=4,Np=5,Mi=100,Fp=101,Op=102,Bp=103,zp=104,Hp=200,Vp=201,Gp=202,kp=203,aa=204,la=205,Wp=206,Xp=207,qp=208,Yp=209,$p=210,Kp=211,jp=212,Zp=213,Jp=214,ca=0,ua=1,fa=2,tr=3,ha=4,da=5,pa=6,ma=7,Sf=0,Qp=1,em=2,ii=0,tm=1,nm=2,im=3,rm=4,sm=5,om=6,am=7,Ef=300,nr=301,ir=302,_a=303,ga=304,Zs=306,va=1e3,Ei=1001,xa=1002,an=1003,lm=1004,Qr=1005,_n=1006,_o=1007,yi=1008,En=1009,yf=1010,Tf=1011,Ur=1012,Sl=1013,bi=1014,Bn=1015,Gr=1016,El=1017,yl=1018,Nr=1020,bf=35902,Af=35899,wf=1021,Rf=1022,nn=1023,Fr=1026,Or=1027,Cf=1028,Tl=1029,Pf=1030,bl=1031,Al=1033,As=33776,ws=33777,Rs=33778,Cs=33779,Ma=35840,Sa=35841,Ea=35842,ya=35843,Ta=36196,ba=37492,Aa=37496,wa=37808,Ra=37809,Ca=37810,Pa=37811,Da=37812,La=37813,Ia=37814,Ua=37815,Na=37816,Fa=37817,Oa=37818,Ba=37819,za=37820,Ha=37821,Va=36492,Ga=36494,ka=36495,Wa=36283,Xa=36284,qa=36285,Ya=36286,cm=3200,um=3201,fm=0,hm=1,ei="",jt="srgb",rr="srgb-linear",Bs="linear",st="srgb",Pi=7680,_c=519,dm=512,pm=513,mm=514,Df=515,_m=516,gm=517,vm=518,xm=519,gc=35044,vc="300 es",gn=2e3,zs=2001;class or{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(t)===-1&&i[e].push(t)}hasEventListener(e,t){const i=this._listeners;return i===void 0?!1:i[e]!==void 0&&i[e].indexOf(t)!==-1}removeEventListener(e,t){const i=this._listeners;if(i===void 0)return;const r=i[e];if(r!==void 0){const s=r.indexOf(t);s!==-1&&r.splice(s,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const i=t[e.type];if(i!==void 0){e.target=this;const r=i.slice(0);for(let s=0,o=r.length;s<o;s++)r[s].call(this,e);e.target=null}}}const yt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],go=Math.PI/180,$a=180/Math.PI;function kr(){const n=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(yt[n&255]+yt[n>>8&255]+yt[n>>16&255]+yt[n>>24&255]+"-"+yt[e&255]+yt[e>>8&255]+"-"+yt[e>>16&15|64]+yt[e>>24&255]+"-"+yt[t&63|128]+yt[t>>8&255]+"-"+yt[t>>16&255]+yt[t>>24&255]+yt[i&255]+yt[i>>8&255]+yt[i>>16&255]+yt[i>>24&255]).toLowerCase()}function Ke(n,e,t){return Math.max(e,Math.min(t,n))}function Mm(n,e){return(n%e+e)%e}function vo(n,e,t){return(1-t)*n+t*e}function fr(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("Invalid component type.")}}function Ft(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return Math.round(n*4294967295);case Uint16Array:return Math.round(n*65535);case Uint8Array:return Math.round(n*255);case Int32Array:return Math.round(n*2147483647);case Int16Array:return Math.round(n*32767);case Int8Array:return Math.round(n*127);default:throw new Error("Invalid component type.")}}class Ye{constructor(e=0,t=0){Ye.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,i=this.y,r=e.elements;return this.x=r[0]*t+r[3]*i+r[6],this.y=r[1]*t+r[4]*i+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Ke(this.x,e.x,t.x),this.y=Ke(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Ke(this.x,e,t),this.y=Ke(this.y,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Ke(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(Ke(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y;return t*t+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const i=Math.cos(t),r=Math.sin(t),s=this.x-e.x,o=this.y-e.y;return this.x=s*i-o*r+e.x,this.y=s*r+o*i+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Wr{constructor(e=0,t=0,i=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=i,this._w=r}static slerpFlat(e,t,i,r,s,o,a){let l=i[r+0],c=i[r+1],u=i[r+2],f=i[r+3];const d=s[o+0],p=s[o+1],v=s[o+2],M=s[o+3];if(a===0){e[t+0]=l,e[t+1]=c,e[t+2]=u,e[t+3]=f;return}if(a===1){e[t+0]=d,e[t+1]=p,e[t+2]=v,e[t+3]=M;return}if(f!==M||l!==d||c!==p||u!==v){let m=1-a;const h=l*d+c*p+u*v+f*M,w=h>=0?1:-1,b=1-h*h;if(b>Number.EPSILON){const R=Math.sqrt(b),C=Math.atan2(R,h*w);m=Math.sin(m*C)/R,a=Math.sin(a*C)/R}const E=a*w;if(l=l*m+d*E,c=c*m+p*E,u=u*m+v*E,f=f*m+M*E,m===1-a){const R=1/Math.sqrt(l*l+c*c+u*u+f*f);l*=R,c*=R,u*=R,f*=R}}e[t]=l,e[t+1]=c,e[t+2]=u,e[t+3]=f}static multiplyQuaternionsFlat(e,t,i,r,s,o){const a=i[r],l=i[r+1],c=i[r+2],u=i[r+3],f=s[o],d=s[o+1],p=s[o+2],v=s[o+3];return e[t]=a*v+u*f+l*p-c*d,e[t+1]=l*v+u*d+c*f-a*p,e[t+2]=c*v+u*p+a*d-l*f,e[t+3]=u*v-a*f-l*d-c*p,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,i,r){return this._x=e,this._y=t,this._z=i,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const i=e._x,r=e._y,s=e._z,o=e._order,a=Math.cos,l=Math.sin,c=a(i/2),u=a(r/2),f=a(s/2),d=l(i/2),p=l(r/2),v=l(s/2);switch(o){case"XYZ":this._x=d*u*f+c*p*v,this._y=c*p*f-d*u*v,this._z=c*u*v+d*p*f,this._w=c*u*f-d*p*v;break;case"YXZ":this._x=d*u*f+c*p*v,this._y=c*p*f-d*u*v,this._z=c*u*v-d*p*f,this._w=c*u*f+d*p*v;break;case"ZXY":this._x=d*u*f-c*p*v,this._y=c*p*f+d*u*v,this._z=c*u*v+d*p*f,this._w=c*u*f-d*p*v;break;case"ZYX":this._x=d*u*f-c*p*v,this._y=c*p*f+d*u*v,this._z=c*u*v-d*p*f,this._w=c*u*f+d*p*v;break;case"YZX":this._x=d*u*f+c*p*v,this._y=c*p*f+d*u*v,this._z=c*u*v-d*p*f,this._w=c*u*f-d*p*v;break;case"XZY":this._x=d*u*f-c*p*v,this._y=c*p*f-d*u*v,this._z=c*u*v+d*p*f,this._w=c*u*f+d*p*v;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const i=t/2,r=Math.sin(i);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,i=t[0],r=t[4],s=t[8],o=t[1],a=t[5],l=t[9],c=t[2],u=t[6],f=t[10],d=i+a+f;if(d>0){const p=.5/Math.sqrt(d+1);this._w=.25/p,this._x=(u-l)*p,this._y=(s-c)*p,this._z=(o-r)*p}else if(i>a&&i>f){const p=2*Math.sqrt(1+i-a-f);this._w=(u-l)/p,this._x=.25*p,this._y=(r+o)/p,this._z=(s+c)/p}else if(a>f){const p=2*Math.sqrt(1+a-i-f);this._w=(s-c)/p,this._x=(r+o)/p,this._y=.25*p,this._z=(l+u)/p}else{const p=2*Math.sqrt(1+f-i-a);this._w=(o-r)/p,this._x=(s+c)/p,this._y=(l+u)/p,this._z=.25*p}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let i=e.dot(t)+1;return i<1e-8?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Ke(this.dot(e),-1,1)))}rotateTowards(e,t){const i=this.angleTo(e);if(i===0)return this;const r=Math.min(1,t/i);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const i=e._x,r=e._y,s=e._z,o=e._w,a=t._x,l=t._y,c=t._z,u=t._w;return this._x=i*u+o*a+r*c-s*l,this._y=r*u+o*l+s*a-i*c,this._z=s*u+o*c+i*l-r*a,this._w=o*u-i*a-r*l-s*c,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);const i=this._x,r=this._y,s=this._z,o=this._w;let a=o*e._w+i*e._x+r*e._y+s*e._z;if(a<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,a=-a):this.copy(e),a>=1)return this._w=o,this._x=i,this._y=r,this._z=s,this;const l=1-a*a;if(l<=Number.EPSILON){const p=1-t;return this._w=p*o+t*this._w,this._x=p*i+t*this._x,this._y=p*r+t*this._y,this._z=p*s+t*this._z,this.normalize(),this}const c=Math.sqrt(l),u=Math.atan2(c,a),f=Math.sin((1-t)*u)/c,d=Math.sin(t*u)/c;return this._w=o*f+this._w*d,this._x=i*f+this._x*d,this._y=r*f+this._y*d,this._z=s*f+this._z*d,this._onChangeCallback(),this}slerpQuaternions(e,t,i){return this.copy(e).slerp(t,i)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),i=Math.random(),r=Math.sqrt(1-i),s=Math.sqrt(i);return this.set(r*Math.sin(e),r*Math.cos(e),s*Math.sin(t),s*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class H{constructor(e=0,t=0,i=0){H.prototype.isVector3=!0,this.x=e,this.y=t,this.z=i}set(e,t,i){return i===void 0&&(i=this.z),this.x=e,this.y=t,this.z=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(xc.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(xc.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[3]*i+s[6]*r,this.y=s[1]*t+s[4]*i+s[7]*r,this.z=s[2]*t+s[5]*i+s[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,i=this.y,r=this.z,s=e.elements,o=1/(s[3]*t+s[7]*i+s[11]*r+s[15]);return this.x=(s[0]*t+s[4]*i+s[8]*r+s[12])*o,this.y=(s[1]*t+s[5]*i+s[9]*r+s[13])*o,this.z=(s[2]*t+s[6]*i+s[10]*r+s[14])*o,this}applyQuaternion(e){const t=this.x,i=this.y,r=this.z,s=e.x,o=e.y,a=e.z,l=e.w,c=2*(o*r-a*i),u=2*(a*t-s*r),f=2*(s*i-o*t);return this.x=t+l*c+o*f-a*u,this.y=i+l*u+a*c-s*f,this.z=r+l*f+s*u-o*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[4]*i+s[8]*r,this.y=s[1]*t+s[5]*i+s[9]*r,this.z=s[2]*t+s[6]*i+s[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Ke(this.x,e.x,t.x),this.y=Ke(this.y,e.y,t.y),this.z=Ke(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Ke(this.x,e,t),this.y=Ke(this.y,e,t),this.z=Ke(this.z,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Ke(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const i=e.x,r=e.y,s=e.z,o=t.x,a=t.y,l=t.z;return this.x=r*l-s*a,this.y=s*o-i*l,this.z=i*a-r*o,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const i=e.dot(this)/t;return this.copy(e).multiplyScalar(i)}projectOnPlane(e){return xo.copy(this).projectOnVector(e),this.sub(xo)}reflect(e){return this.sub(xo.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(Ke(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y,r=this.z-e.z;return t*t+i*i+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,i){const r=Math.sin(t)*e;return this.x=r*Math.sin(i),this.y=Math.cos(t)*e,this.z=r*Math.cos(i),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,i){return this.x=e*Math.sin(t),this.y=i,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),i=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=i,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,i=Math.sqrt(1-t*t);return this.x=i*Math.cos(e),this.y=t,this.z=i*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const xo=new H,xc=new Wr;class Ge{constructor(e,t,i,r,s,o,a,l,c){Ge.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,i,r,s,o,a,l,c)}set(e,t,i,r,s,o,a,l,c){const u=this.elements;return u[0]=e,u[1]=r,u[2]=a,u[3]=t,u[4]=s,u[5]=l,u[6]=i,u[7]=o,u[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],this}extractBasis(e,t,i){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,r=t.elements,s=this.elements,o=i[0],a=i[3],l=i[6],c=i[1],u=i[4],f=i[7],d=i[2],p=i[5],v=i[8],M=r[0],m=r[3],h=r[6],w=r[1],b=r[4],E=r[7],R=r[2],C=r[5],P=r[8];return s[0]=o*M+a*w+l*R,s[3]=o*m+a*b+l*C,s[6]=o*h+a*E+l*P,s[1]=c*M+u*w+f*R,s[4]=c*m+u*b+f*C,s[7]=c*h+u*E+f*P,s[2]=d*M+p*w+v*R,s[5]=d*m+p*b+v*C,s[8]=d*h+p*E+v*P,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8];return t*o*u-t*a*c-i*s*u+i*a*l+r*s*c-r*o*l}invert(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8],f=u*o-a*c,d=a*l-u*s,p=c*s-o*l,v=t*f+i*d+r*p;if(v===0)return this.set(0,0,0,0,0,0,0,0,0);const M=1/v;return e[0]=f*M,e[1]=(r*c-u*i)*M,e[2]=(a*i-r*o)*M,e[3]=d*M,e[4]=(u*t-r*l)*M,e[5]=(r*s-a*t)*M,e[6]=p*M,e[7]=(i*l-c*t)*M,e[8]=(o*t-i*s)*M,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,i,r,s,o,a){const l=Math.cos(s),c=Math.sin(s);return this.set(i*l,i*c,-i*(l*o+c*a)+o+e,-r*c,r*l,-r*(-c*o+l*a)+a+t,0,0,1),this}scale(e,t){return this.premultiply(Mo.makeScale(e,t)),this}rotate(e){return this.premultiply(Mo.makeRotation(-e)),this}translate(e,t){return this.premultiply(Mo.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,i,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,i=e.elements;for(let r=0;r<9;r++)if(t[r]!==i[r])return!1;return!0}fromArray(e,t=0){for(let i=0;i<9;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const Mo=new Ge;function Lf(n){for(let e=n.length-1;e>=0;--e)if(n[e]>=65535)return!0;return!1}function Hs(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function Sm(){const n=Hs("canvas");return n.style.display="block",n}const Mc={};function Br(n){n in Mc||(Mc[n]=!0,console.warn(n))}function Em(n,e,t){return new Promise(function(i,r){function s(){switch(n.clientWaitSync(e,n.SYNC_FLUSH_COMMANDS_BIT,0)){case n.WAIT_FAILED:r();break;case n.TIMEOUT_EXPIRED:setTimeout(s,t);break;default:i()}}setTimeout(s,t)})}const Sc=new Ge().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Ec=new Ge().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function ym(){const n={enabled:!0,workingColorSpace:rr,spaces:{},convert:function(r,s,o){return this.enabled===!1||s===o||!s||!o||(this.spaces[s].transfer===st&&(r.r=zn(r.r),r.g=zn(r.g),r.b=zn(r.b)),this.spaces[s].primaries!==this.spaces[o].primaries&&(r.applyMatrix3(this.spaces[s].toXYZ),r.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===st&&(r.r=Ji(r.r),r.g=Ji(r.g),r.b=Ji(r.b))),r},workingToColorSpace:function(r,s){return this.convert(r,this.workingColorSpace,s)},colorSpaceToWorking:function(r,s){return this.convert(r,s,this.workingColorSpace)},getPrimaries:function(r){return this.spaces[r].primaries},getTransfer:function(r){return r===ei?Bs:this.spaces[r].transfer},getToneMappingMode:function(r){return this.spaces[r].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(r,s=this.workingColorSpace){return r.fromArray(this.spaces[s].luminanceCoefficients)},define:function(r){Object.assign(this.spaces,r)},_getMatrix:function(r,s,o){return r.copy(this.spaces[s].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(r){return this.spaces[r].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(r=this.workingColorSpace){return this.spaces[r].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(r,s){return Br("THREE.ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),n.workingToColorSpace(r,s)},toWorkingColorSpace:function(r,s){return Br("THREE.ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),n.colorSpaceToWorking(r,s)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],i=[.3127,.329];return n.define({[rr]:{primaries:e,whitePoint:i,transfer:Bs,toXYZ:Sc,fromXYZ:Ec,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:jt},outputColorSpaceConfig:{drawingBufferColorSpace:jt}},[jt]:{primaries:e,whitePoint:i,transfer:st,toXYZ:Sc,fromXYZ:Ec,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:jt}}}),n}const Qe=ym();function zn(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function Ji(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}let Di;class Tm{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let i;if(e instanceof HTMLCanvasElement)i=e;else{Di===void 0&&(Di=Hs("canvas")),Di.width=e.width,Di.height=e.height;const r=Di.getContext("2d");e instanceof ImageData?r.putImageData(e,0,0):r.drawImage(e,0,0,e.width,e.height),i=Di}return i.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Hs("canvas");t.width=e.width,t.height=e.height;const i=t.getContext("2d");i.drawImage(e,0,0,e.width,e.height);const r=i.getImageData(0,0,e.width,e.height),s=r.data;for(let o=0;o<s.length;o++)s[o]=zn(s[o]/255)*255;return i.putImageData(r,0,0),t}else if(e.data){const t=e.data.slice(0);for(let i=0;i<t.length;i++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[i]=Math.floor(zn(t[i]/255)*255):t[i]=zn(t[i]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let bm=0;class wl{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:bm++}),this.uuid=kr(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):t instanceof VideoFrame?e.set(t.displayHeight,t.displayWidth,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const i={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let o=0,a=r.length;o<a;o++)r[o].isDataTexture?s.push(So(r[o].image)):s.push(So(r[o]))}else s=So(r);i.url=s}return t||(e.images[this.uuid]=i),i}}function So(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?Tm.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let Am=0;const Eo=new H;class zt extends or{constructor(e=zt.DEFAULT_IMAGE,t=zt.DEFAULT_MAPPING,i=Ei,r=Ei,s=_n,o=yi,a=nn,l=En,c=zt.DEFAULT_ANISOTROPY,u=ei){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Am++}),this.uuid=kr(),this.name="",this.source=new wl(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=i,this.wrapT=r,this.magFilter=s,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new Ye(0,0),this.repeat=new Ye(1,1),this.center=new Ye(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ge,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(Eo).x}get height(){return this.source.getSize(Eo).y}get depth(){return this.source.getSize(Eo).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const i=e[t];if(i===void 0){console.warn(`THREE.Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){console.warn(`THREE.Texture.setValues(): property '${t}' does not exist.`);continue}r&&i&&r.isVector2&&i.isVector2||r&&i&&r.isVector3&&i.isVector3||r&&i&&r.isMatrix3&&i.isMatrix3?r.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const i={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),t||(e.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Ef)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case va:e.x=e.x-Math.floor(e.x);break;case Ei:e.x=e.x<0?0:1;break;case xa:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case va:e.y=e.y-Math.floor(e.y);break;case Ei:e.y=e.y<0?0:1;break;case xa:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}zt.DEFAULT_IMAGE=null;zt.DEFAULT_MAPPING=Ef;zt.DEFAULT_ANISOTROPY=1;class ot{constructor(e=0,t=0,i=0,r=1){ot.prototype.isVector4=!0,this.x=e,this.y=t,this.z=i,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,i,r){return this.x=e,this.y=t,this.z=i,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,i=this.y,r=this.z,s=this.w,o=e.elements;return this.x=o[0]*t+o[4]*i+o[8]*r+o[12]*s,this.y=o[1]*t+o[5]*i+o[9]*r+o[13]*s,this.z=o[2]*t+o[6]*i+o[10]*r+o[14]*s,this.w=o[3]*t+o[7]*i+o[11]*r+o[15]*s,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,i,r,s;const l=e.elements,c=l[0],u=l[4],f=l[8],d=l[1],p=l[5],v=l[9],M=l[2],m=l[6],h=l[10];if(Math.abs(u-d)<.01&&Math.abs(f-M)<.01&&Math.abs(v-m)<.01){if(Math.abs(u+d)<.1&&Math.abs(f+M)<.1&&Math.abs(v+m)<.1&&Math.abs(c+p+h-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const b=(c+1)/2,E=(p+1)/2,R=(h+1)/2,C=(u+d)/4,P=(f+M)/4,B=(v+m)/4;return b>E&&b>R?b<.01?(i=0,r=.707106781,s=.707106781):(i=Math.sqrt(b),r=C/i,s=P/i):E>R?E<.01?(i=.707106781,r=0,s=.707106781):(r=Math.sqrt(E),i=C/r,s=B/r):R<.01?(i=.707106781,r=.707106781,s=0):(s=Math.sqrt(R),i=P/s,r=B/s),this.set(i,r,s,t),this}let w=Math.sqrt((m-v)*(m-v)+(f-M)*(f-M)+(d-u)*(d-u));return Math.abs(w)<.001&&(w=1),this.x=(m-v)/w,this.y=(f-M)/w,this.z=(d-u)/w,this.w=Math.acos((c+p+h-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Ke(this.x,e.x,t.x),this.y=Ke(this.y,e.y,t.y),this.z=Ke(this.z,e.z,t.z),this.w=Ke(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Ke(this.x,e,t),this.y=Ke(this.y,e,t),this.z=Ke(this.z,e,t),this.w=Ke(this.w,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Ke(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this.w=e.w+(t.w-e.w)*i,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class wm extends or{constructor(e=1,t=1,i={}){super(),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:_n,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},i),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=i.depth,this.scissor=new ot(0,0,e,t),this.scissorTest=!1,this.viewport=new ot(0,0,e,t);const r={width:e,height:t,depth:i.depth},s=new zt(r);this.textures=[];const o=i.count;for(let a=0;a<o;a++)this.textures[a]=s.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(i),this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=i.depthTexture,this.samples=i.samples,this.multiview=i.multiview}_setTextureOptions(e={}){const t={minFilter:_n,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let i=0;i<this.textures.length;i++)this.textures[i].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,i=1){if(this.width!==e||this.height!==t||this.depth!==i){this.width=e,this.height=t,this.depth=i;for(let r=0,s=this.textures.length;r<s;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=i,this.textures[r].isArrayTexture=this.textures[r].image.depth>1;this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,i=e.textures.length;t<i;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const r=Object.assign({},e.textures[t].image);this.textures[t].source=new wl(r)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Ai extends wm{constructor(e=1,t=1,i={}){super(e,t,i),this.isWebGLRenderTarget=!0}}class If extends zt{constructor(e=null,t=1,i=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=an,this.minFilter=an,this.wrapR=Ei,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class Rm extends zt{constructor(e=null,t=1,i=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=an,this.minFilter=an,this.wrapR=Ei,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Xr{constructor(e=new H(1/0,1/0,1/0),t=new H(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t+=3)this.expandByPoint(Zt.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,i=e.count;t<i;t++)this.expandByPoint(Zt.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const i=Zt.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const i=e.geometry;if(i!==void 0){const s=i.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=s.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,Zt):Zt.fromBufferAttribute(s,o),Zt.applyMatrix4(e.matrixWorld),this.expandByPoint(Zt);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),es.copy(e.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),es.copy(i.boundingBox)),es.applyMatrix4(e.matrixWorld),this.union(es)}const r=e.children;for(let s=0,o=r.length;s<o;s++)this.expandByObject(r[s],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Zt),Zt.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,i;return e.normal.x>0?(t=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),t<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(hr),ts.subVectors(this.max,hr),Li.subVectors(e.a,hr),Ii.subVectors(e.b,hr),Ui.subVectors(e.c,hr),Xn.subVectors(Ii,Li),qn.subVectors(Ui,Ii),ui.subVectors(Li,Ui);let t=[0,-Xn.z,Xn.y,0,-qn.z,qn.y,0,-ui.z,ui.y,Xn.z,0,-Xn.x,qn.z,0,-qn.x,ui.z,0,-ui.x,-Xn.y,Xn.x,0,-qn.y,qn.x,0,-ui.y,ui.x,0];return!yo(t,Li,Ii,Ui,ts)||(t=[1,0,0,0,1,0,0,0,1],!yo(t,Li,Ii,Ui,ts))?!1:(ns.crossVectors(Xn,qn),t=[ns.x,ns.y,ns.z],yo(t,Li,Ii,Ui,ts))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Zt).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Zt).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(An[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),An[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),An[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),An[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),An[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),An[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),An[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),An[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(An),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const An=[new H,new H,new H,new H,new H,new H,new H,new H],Zt=new H,es=new Xr,Li=new H,Ii=new H,Ui=new H,Xn=new H,qn=new H,ui=new H,hr=new H,ts=new H,ns=new H,fi=new H;function yo(n,e,t,i,r){for(let s=0,o=n.length-3;s<=o;s+=3){fi.fromArray(n,s);const a=r.x*Math.abs(fi.x)+r.y*Math.abs(fi.y)+r.z*Math.abs(fi.z),l=e.dot(fi),c=t.dot(fi),u=i.dot(fi);if(Math.max(-Math.max(l,c,u),Math.min(l,c,u))>a)return!1}return!0}const Cm=new Xr,dr=new H,To=new H;class Js{constructor(e=new H,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const i=this.center;t!==void 0?i.copy(t):Cm.setFromPoints(e).getCenter(i);let r=0;for(let s=0,o=e.length;s<o;s++)r=Math.max(r,i.distanceToSquared(e[s]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const i=this.center.distanceToSquared(e);return t.copy(e),i>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;dr.subVectors(e,this.center);const t=dr.lengthSq();if(t>this.radius*this.radius){const i=Math.sqrt(t),r=(i-this.radius)*.5;this.center.addScaledVector(dr,r/i),this.radius+=r}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(To.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(dr.copy(e.center).add(To)),this.expandByPoint(dr.copy(e.center).sub(To))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}const wn=new H,bo=new H,is=new H,Yn=new H,Ao=new H,rs=new H,wo=new H;class Uf{constructor(e=new H,t=new H(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,wn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const i=t.dot(this.direction);return i<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=wn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(wn.copy(this.origin).addScaledVector(this.direction,t),wn.distanceToSquared(e))}distanceSqToSegment(e,t,i,r){bo.copy(e).add(t).multiplyScalar(.5),is.copy(t).sub(e).normalize(),Yn.copy(this.origin).sub(bo);const s=e.distanceTo(t)*.5,o=-this.direction.dot(is),a=Yn.dot(this.direction),l=-Yn.dot(is),c=Yn.lengthSq(),u=Math.abs(1-o*o);let f,d,p,v;if(u>0)if(f=o*l-a,d=o*a-l,v=s*u,f>=0)if(d>=-v)if(d<=v){const M=1/u;f*=M,d*=M,p=f*(f+o*d+2*a)+d*(o*f+d+2*l)+c}else d=s,f=Math.max(0,-(o*d+a)),p=-f*f+d*(d+2*l)+c;else d=-s,f=Math.max(0,-(o*d+a)),p=-f*f+d*(d+2*l)+c;else d<=-v?(f=Math.max(0,-(-o*s+a)),d=f>0?-s:Math.min(Math.max(-s,-l),s),p=-f*f+d*(d+2*l)+c):d<=v?(f=0,d=Math.min(Math.max(-s,-l),s),p=d*(d+2*l)+c):(f=Math.max(0,-(o*s+a)),d=f>0?s:Math.min(Math.max(-s,-l),s),p=-f*f+d*(d+2*l)+c);else d=o>0?-s:s,f=Math.max(0,-(o*d+a)),p=-f*f+d*(d+2*l)+c;return i&&i.copy(this.origin).addScaledVector(this.direction,f),r&&r.copy(bo).addScaledVector(is,d),p}intersectSphere(e,t){wn.subVectors(e.center,this.origin);const i=wn.dot(this.direction),r=wn.dot(wn)-i*i,s=e.radius*e.radius;if(r>s)return null;const o=Math.sqrt(s-r),a=i-o,l=i+o;return l<0?null:a<0?this.at(l,t):this.at(a,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const i=-(this.origin.dot(e.normal)+e.constant)/t;return i>=0?i:null}intersectPlane(e,t){const i=this.distanceToPlane(e);return i===null?null:this.at(i,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let i,r,s,o,a,l;const c=1/this.direction.x,u=1/this.direction.y,f=1/this.direction.z,d=this.origin;return c>=0?(i=(e.min.x-d.x)*c,r=(e.max.x-d.x)*c):(i=(e.max.x-d.x)*c,r=(e.min.x-d.x)*c),u>=0?(s=(e.min.y-d.y)*u,o=(e.max.y-d.y)*u):(s=(e.max.y-d.y)*u,o=(e.min.y-d.y)*u),i>o||s>r||((s>i||isNaN(i))&&(i=s),(o<r||isNaN(r))&&(r=o),f>=0?(a=(e.min.z-d.z)*f,l=(e.max.z-d.z)*f):(a=(e.max.z-d.z)*f,l=(e.min.z-d.z)*f),i>l||a>r)||((a>i||i!==i)&&(i=a),(l<r||r!==r)&&(r=l),r<0)?null:this.at(i>=0?i:r,t)}intersectsBox(e){return this.intersectBox(e,wn)!==null}intersectTriangle(e,t,i,r,s){Ao.subVectors(t,e),rs.subVectors(i,e),wo.crossVectors(Ao,rs);let o=this.direction.dot(wo),a;if(o>0){if(r)return null;a=1}else if(o<0)a=-1,o=-o;else return null;Yn.subVectors(this.origin,e);const l=a*this.direction.dot(rs.crossVectors(Yn,rs));if(l<0)return null;const c=a*this.direction.dot(Ao.cross(Yn));if(c<0||l+c>o)return null;const u=-a*Yn.dot(wo);return u<0?null:this.at(u/o,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class mt{constructor(e,t,i,r,s,o,a,l,c,u,f,d,p,v,M,m){mt.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,i,r,s,o,a,l,c,u,f,d,p,v,M,m)}set(e,t,i,r,s,o,a,l,c,u,f,d,p,v,M,m){const h=this.elements;return h[0]=e,h[4]=t,h[8]=i,h[12]=r,h[1]=s,h[5]=o,h[9]=a,h[13]=l,h[2]=c,h[6]=u,h[10]=f,h[14]=d,h[3]=p,h[7]=v,h[11]=M,h[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new mt().fromArray(this.elements)}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],t[9]=i[9],t[10]=i[10],t[11]=i[11],t[12]=i[12],t[13]=i[13],t[14]=i[14],t[15]=i[15],this}copyPosition(e){const t=this.elements,i=e.elements;return t[12]=i[12],t[13]=i[13],t[14]=i[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,i){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this}makeBasis(e,t,i){return this.set(e.x,t.x,i.x,0,e.y,t.y,i.y,0,e.z,t.z,i.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,i=e.elements,r=1/Ni.setFromMatrixColumn(e,0).length(),s=1/Ni.setFromMatrixColumn(e,1).length(),o=1/Ni.setFromMatrixColumn(e,2).length();return t[0]=i[0]*r,t[1]=i[1]*r,t[2]=i[2]*r,t[3]=0,t[4]=i[4]*s,t[5]=i[5]*s,t[6]=i[6]*s,t[7]=0,t[8]=i[8]*o,t[9]=i[9]*o,t[10]=i[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,i=e.x,r=e.y,s=e.z,o=Math.cos(i),a=Math.sin(i),l=Math.cos(r),c=Math.sin(r),u=Math.cos(s),f=Math.sin(s);if(e.order==="XYZ"){const d=o*u,p=o*f,v=a*u,M=a*f;t[0]=l*u,t[4]=-l*f,t[8]=c,t[1]=p+v*c,t[5]=d-M*c,t[9]=-a*l,t[2]=M-d*c,t[6]=v+p*c,t[10]=o*l}else if(e.order==="YXZ"){const d=l*u,p=l*f,v=c*u,M=c*f;t[0]=d+M*a,t[4]=v*a-p,t[8]=o*c,t[1]=o*f,t[5]=o*u,t[9]=-a,t[2]=p*a-v,t[6]=M+d*a,t[10]=o*l}else if(e.order==="ZXY"){const d=l*u,p=l*f,v=c*u,M=c*f;t[0]=d-M*a,t[4]=-o*f,t[8]=v+p*a,t[1]=p+v*a,t[5]=o*u,t[9]=M-d*a,t[2]=-o*c,t[6]=a,t[10]=o*l}else if(e.order==="ZYX"){const d=o*u,p=o*f,v=a*u,M=a*f;t[0]=l*u,t[4]=v*c-p,t[8]=d*c+M,t[1]=l*f,t[5]=M*c+d,t[9]=p*c-v,t[2]=-c,t[6]=a*l,t[10]=o*l}else if(e.order==="YZX"){const d=o*l,p=o*c,v=a*l,M=a*c;t[0]=l*u,t[4]=M-d*f,t[8]=v*f+p,t[1]=f,t[5]=o*u,t[9]=-a*u,t[2]=-c*u,t[6]=p*f+v,t[10]=d-M*f}else if(e.order==="XZY"){const d=o*l,p=o*c,v=a*l,M=a*c;t[0]=l*u,t[4]=-f,t[8]=c*u,t[1]=d*f+M,t[5]=o*u,t[9]=p*f-v,t[2]=v*f-p,t[6]=a*u,t[10]=M*f+d}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Pm,e,Dm)}lookAt(e,t,i){const r=this.elements;return Gt.subVectors(e,t),Gt.lengthSq()===0&&(Gt.z=1),Gt.normalize(),$n.crossVectors(i,Gt),$n.lengthSq()===0&&(Math.abs(i.z)===1?Gt.x+=1e-4:Gt.z+=1e-4,Gt.normalize(),$n.crossVectors(i,Gt)),$n.normalize(),ss.crossVectors(Gt,$n),r[0]=$n.x,r[4]=ss.x,r[8]=Gt.x,r[1]=$n.y,r[5]=ss.y,r[9]=Gt.y,r[2]=$n.z,r[6]=ss.z,r[10]=Gt.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,r=t.elements,s=this.elements,o=i[0],a=i[4],l=i[8],c=i[12],u=i[1],f=i[5],d=i[9],p=i[13],v=i[2],M=i[6],m=i[10],h=i[14],w=i[3],b=i[7],E=i[11],R=i[15],C=r[0],P=r[4],B=r[8],T=r[12],y=r[1],L=r[5],X=r[9],Z=r[13],se=r[2],ie=r[6],j=r[10],Q=r[14],U=r[3],K=r[7],de=r[11],ge=r[15];return s[0]=o*C+a*y+l*se+c*U,s[4]=o*P+a*L+l*ie+c*K,s[8]=o*B+a*X+l*j+c*de,s[12]=o*T+a*Z+l*Q+c*ge,s[1]=u*C+f*y+d*se+p*U,s[5]=u*P+f*L+d*ie+p*K,s[9]=u*B+f*X+d*j+p*de,s[13]=u*T+f*Z+d*Q+p*ge,s[2]=v*C+M*y+m*se+h*U,s[6]=v*P+M*L+m*ie+h*K,s[10]=v*B+M*X+m*j+h*de,s[14]=v*T+M*Z+m*Q+h*ge,s[3]=w*C+b*y+E*se+R*U,s[7]=w*P+b*L+E*ie+R*K,s[11]=w*B+b*X+E*j+R*de,s[15]=w*T+b*Z+E*Q+R*ge,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[4],r=e[8],s=e[12],o=e[1],a=e[5],l=e[9],c=e[13],u=e[2],f=e[6],d=e[10],p=e[14],v=e[3],M=e[7],m=e[11],h=e[15];return v*(+s*l*f-r*c*f-s*a*d+i*c*d+r*a*p-i*l*p)+M*(+t*l*p-t*c*d+s*o*d-r*o*p+r*c*u-s*l*u)+m*(+t*c*f-t*a*p-s*o*f+i*o*p+s*a*u-i*c*u)+h*(-r*a*u-t*l*f+t*a*d+r*o*f-i*o*d+i*l*u)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,i){const r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=i),this}invert(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8],f=e[9],d=e[10],p=e[11],v=e[12],M=e[13],m=e[14],h=e[15],w=f*m*c-M*d*c+M*l*p-a*m*p-f*l*h+a*d*h,b=v*d*c-u*m*c-v*l*p+o*m*p+u*l*h-o*d*h,E=u*M*c-v*f*c+v*a*p-o*M*p-u*a*h+o*f*h,R=v*f*l-u*M*l-v*a*d+o*M*d+u*a*m-o*f*m,C=t*w+i*b+r*E+s*R;if(C===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const P=1/C;return e[0]=w*P,e[1]=(M*d*s-f*m*s-M*r*p+i*m*p+f*r*h-i*d*h)*P,e[2]=(a*m*s-M*l*s+M*r*c-i*m*c-a*r*h+i*l*h)*P,e[3]=(f*l*s-a*d*s-f*r*c+i*d*c+a*r*p-i*l*p)*P,e[4]=b*P,e[5]=(u*m*s-v*d*s+v*r*p-t*m*p-u*r*h+t*d*h)*P,e[6]=(v*l*s-o*m*s-v*r*c+t*m*c+o*r*h-t*l*h)*P,e[7]=(o*d*s-u*l*s+u*r*c-t*d*c-o*r*p+t*l*p)*P,e[8]=E*P,e[9]=(v*f*s-u*M*s-v*i*p+t*M*p+u*i*h-t*f*h)*P,e[10]=(o*M*s-v*a*s+v*i*c-t*M*c-o*i*h+t*a*h)*P,e[11]=(u*a*s-o*f*s-u*i*c+t*f*c+o*i*p-t*a*p)*P,e[12]=R*P,e[13]=(u*M*r-v*f*r+v*i*d-t*M*d-u*i*m+t*f*m)*P,e[14]=(v*a*r-o*M*r-v*i*l+t*M*l+o*i*m-t*a*m)*P,e[15]=(o*f*r-u*a*r+u*i*l-t*f*l-o*i*d+t*a*d)*P,this}scale(e){const t=this.elements,i=e.x,r=e.y,s=e.z;return t[0]*=i,t[4]*=r,t[8]*=s,t[1]*=i,t[5]*=r,t[9]*=s,t[2]*=i,t[6]*=r,t[10]*=s,t[3]*=i,t[7]*=r,t[11]*=s,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],i=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,i,r))}makeTranslation(e,t,i){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,i,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),i=Math.sin(e);return this.set(1,0,0,0,0,t,-i,0,0,i,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,0,i,0,0,1,0,0,-i,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,0,i,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const i=Math.cos(t),r=Math.sin(t),s=1-i,o=e.x,a=e.y,l=e.z,c=s*o,u=s*a;return this.set(c*o+i,c*a-r*l,c*l+r*a,0,c*a+r*l,u*a+i,u*l-r*o,0,c*l-r*a,u*l+r*o,s*l*l+i,0,0,0,0,1),this}makeScale(e,t,i){return this.set(e,0,0,0,0,t,0,0,0,0,i,0,0,0,0,1),this}makeShear(e,t,i,r,s,o){return this.set(1,i,s,0,e,1,o,0,t,r,1,0,0,0,0,1),this}compose(e,t,i){const r=this.elements,s=t._x,o=t._y,a=t._z,l=t._w,c=s+s,u=o+o,f=a+a,d=s*c,p=s*u,v=s*f,M=o*u,m=o*f,h=a*f,w=l*c,b=l*u,E=l*f,R=i.x,C=i.y,P=i.z;return r[0]=(1-(M+h))*R,r[1]=(p+E)*R,r[2]=(v-b)*R,r[3]=0,r[4]=(p-E)*C,r[5]=(1-(d+h))*C,r[6]=(m+w)*C,r[7]=0,r[8]=(v+b)*P,r[9]=(m-w)*P,r[10]=(1-(d+M))*P,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,i){const r=this.elements;let s=Ni.set(r[0],r[1],r[2]).length();const o=Ni.set(r[4],r[5],r[6]).length(),a=Ni.set(r[8],r[9],r[10]).length();this.determinant()<0&&(s=-s),e.x=r[12],e.y=r[13],e.z=r[14],Jt.copy(this);const c=1/s,u=1/o,f=1/a;return Jt.elements[0]*=c,Jt.elements[1]*=c,Jt.elements[2]*=c,Jt.elements[4]*=u,Jt.elements[5]*=u,Jt.elements[6]*=u,Jt.elements[8]*=f,Jt.elements[9]*=f,Jt.elements[10]*=f,t.setFromRotationMatrix(Jt),i.x=s,i.y=o,i.z=a,this}makePerspective(e,t,i,r,s,o,a=gn,l=!1){const c=this.elements,u=2*s/(t-e),f=2*s/(i-r),d=(t+e)/(t-e),p=(i+r)/(i-r);let v,M;if(l)v=s/(o-s),M=o*s/(o-s);else if(a===gn)v=-(o+s)/(o-s),M=-2*o*s/(o-s);else if(a===zs)v=-o/(o-s),M=-o*s/(o-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=u,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=f,c[9]=p,c[13]=0,c[2]=0,c[6]=0,c[10]=v,c[14]=M,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,i,r,s,o,a=gn,l=!1){const c=this.elements,u=2/(t-e),f=2/(i-r),d=-(t+e)/(t-e),p=-(i+r)/(i-r);let v,M;if(l)v=1/(o-s),M=o/(o-s);else if(a===gn)v=-2/(o-s),M=-(o+s)/(o-s);else if(a===zs)v=-1/(o-s),M=-s/(o-s);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=u,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=f,c[9]=0,c[13]=p,c[2]=0,c[6]=0,c[10]=v,c[14]=M,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){const t=this.elements,i=e.elements;for(let r=0;r<16;r++)if(t[r]!==i[r])return!1;return!0}fromArray(e,t=0){for(let i=0;i<16;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e[t+9]=i[9],e[t+10]=i[10],e[t+11]=i[11],e[t+12]=i[12],e[t+13]=i[13],e[t+14]=i[14],e[t+15]=i[15],e}}const Ni=new H,Jt=new mt,Pm=new H(0,0,0),Dm=new H(1,1,1),$n=new H,ss=new H,Gt=new H,yc=new mt,Tc=new Wr;class kn{constructor(e=0,t=0,i=0,r=kn.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=i,this._order=r}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,i,r=this._order){return this._x=e,this._y=t,this._z=i,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,i=!0){const r=e.elements,s=r[0],o=r[4],a=r[8],l=r[1],c=r[5],u=r[9],f=r[2],d=r[6],p=r[10];switch(t){case"XYZ":this._y=Math.asin(Ke(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-u,p),this._z=Math.atan2(-o,s)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Ke(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(a,p),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-f,s),this._z=0);break;case"ZXY":this._x=Math.asin(Ke(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-f,p),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,s));break;case"ZYX":this._y=Math.asin(-Ke(f,-1,1)),Math.abs(f)<.9999999?(this._x=Math.atan2(d,p),this._z=Math.atan2(l,s)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(Ke(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-u,c),this._y=Math.atan2(-f,s)):(this._x=0,this._y=Math.atan2(a,p));break;case"XZY":this._z=Math.asin(-Ke(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(a,s)):(this._x=Math.atan2(-u,p),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,i===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,i){return yc.makeRotationFromQuaternion(e),this.setFromRotationMatrix(yc,t,i)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Tc.setFromEuler(this),this.setFromQuaternion(Tc,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}kn.DEFAULT_ORDER="XYZ";class Nf{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let Lm=0;const bc=new H,Fi=new Wr,Rn=new mt,os=new H,pr=new H,Im=new H,Um=new Wr,Ac=new H(1,0,0),wc=new H(0,1,0),Rc=new H(0,0,1),Cc={type:"added"},Nm={type:"removed"},Oi={type:"childadded",child:null},Ro={type:"childremoved",child:null};class Ut extends or{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Lm++}),this.uuid=kr(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Ut.DEFAULT_UP.clone();const e=new H,t=new kn,i=new Wr,r=new H(1,1,1);function s(){i.setFromEuler(t,!1)}function o(){t.setFromQuaternion(i,void 0,!1)}t._onChange(s),i._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new mt},normalMatrix:{value:new Ge}}),this.matrix=new mt,this.matrixWorld=new mt,this.matrixAutoUpdate=Ut.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Ut.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Nf,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Fi.setFromAxisAngle(e,t),this.quaternion.multiply(Fi),this}rotateOnWorldAxis(e,t){return Fi.setFromAxisAngle(e,t),this.quaternion.premultiply(Fi),this}rotateX(e){return this.rotateOnAxis(Ac,e)}rotateY(e){return this.rotateOnAxis(wc,e)}rotateZ(e){return this.rotateOnAxis(Rc,e)}translateOnAxis(e,t){return bc.copy(e).applyQuaternion(this.quaternion),this.position.add(bc.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Ac,e)}translateY(e){return this.translateOnAxis(wc,e)}translateZ(e){return this.translateOnAxis(Rc,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Rn.copy(this.matrixWorld).invert())}lookAt(e,t,i){e.isVector3?os.copy(e):os.set(e,t,i);const r=this.parent;this.updateWorldMatrix(!0,!1),pr.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Rn.lookAt(pr,os,this.up):Rn.lookAt(os,pr,this.up),this.quaternion.setFromRotationMatrix(Rn),r&&(Rn.extractRotation(r.matrixWorld),Fi.setFromRotationMatrix(Rn),this.quaternion.premultiply(Fi.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Cc),Oi.child=e,this.dispatchEvent(Oi),Oi.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Nm),Ro.child=e,this.dispatchEvent(Ro),Ro.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Rn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Rn.multiply(e.parent.matrixWorld)),e.applyMatrix4(Rn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Cc),Oi.child=e,this.dispatchEvent(Oi),Oi.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let i=0,r=this.children.length;i<r;i++){const o=this.children[i].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,i=[]){this[e]===t&&i.push(this);const r=this.children;for(let s=0,o=r.length;s<o;s++)r[s].getObjectsByProperty(e,t,i);return i}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(pr,e,Im),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(pr,Um,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].updateMatrixWorld(e)}updateWorldMatrix(e,t){const i=this.parent;if(e===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const r=this.children;for(let s=0,o=r.length;s<o;s++)r[s].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",i={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(a=>({...a})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(e),r.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function s(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(e.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const l=a.shapes;if(Array.isArray(l))for(let c=0,u=l.length;c<u;c++){const f=l[c];s(e.shapes,f)}else s(e.shapes,l)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(s(e.materials,this.material[l]));r.material=a}else r.material=s(e.materials,this.material);if(this.children.length>0){r.children=[];for(let a=0;a<this.children.length;a++)r.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let a=0;a<this.animations.length;a++){const l=this.animations[a];r.animations.push(s(e.animations,l))}}if(t){const a=o(e.geometries),l=o(e.materials),c=o(e.textures),u=o(e.images),f=o(e.shapes),d=o(e.skeletons),p=o(e.animations),v=o(e.nodes);a.length>0&&(i.geometries=a),l.length>0&&(i.materials=l),c.length>0&&(i.textures=c),u.length>0&&(i.images=u),f.length>0&&(i.shapes=f),d.length>0&&(i.skeletons=d),p.length>0&&(i.animations=p),v.length>0&&(i.nodes=v)}return i.object=r,i;function o(a){const l=[];for(const c in a){const u=a[c];delete u.metadata,l.push(u)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let i=0;i<e.children.length;i++){const r=e.children[i];this.add(r.clone())}return this}}Ut.DEFAULT_UP=new H(0,1,0);Ut.DEFAULT_MATRIX_AUTO_UPDATE=!0;Ut.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const Qt=new H,Cn=new H,Co=new H,Pn=new H,Bi=new H,zi=new H,Pc=new H,Po=new H,Do=new H,Lo=new H,Io=new ot,Uo=new ot,No=new ot;class en{constructor(e=new H,t=new H,i=new H){this.a=e,this.b=t,this.c=i}static getNormal(e,t,i,r){r.subVectors(i,t),Qt.subVectors(e,t),r.cross(Qt);const s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(e,t,i,r,s){Qt.subVectors(r,t),Cn.subVectors(i,t),Co.subVectors(e,t);const o=Qt.dot(Qt),a=Qt.dot(Cn),l=Qt.dot(Co),c=Cn.dot(Cn),u=Cn.dot(Co),f=o*c-a*a;if(f===0)return s.set(0,0,0),null;const d=1/f,p=(c*l-a*u)*d,v=(o*u-a*l)*d;return s.set(1-p-v,v,p)}static containsPoint(e,t,i,r){return this.getBarycoord(e,t,i,r,Pn)===null?!1:Pn.x>=0&&Pn.y>=0&&Pn.x+Pn.y<=1}static getInterpolation(e,t,i,r,s,o,a,l){return this.getBarycoord(e,t,i,r,Pn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(s,Pn.x),l.addScaledVector(o,Pn.y),l.addScaledVector(a,Pn.z),l)}static getInterpolatedAttribute(e,t,i,r,s,o){return Io.setScalar(0),Uo.setScalar(0),No.setScalar(0),Io.fromBufferAttribute(e,t),Uo.fromBufferAttribute(e,i),No.fromBufferAttribute(e,r),o.setScalar(0),o.addScaledVector(Io,s.x),o.addScaledVector(Uo,s.y),o.addScaledVector(No,s.z),o}static isFrontFacing(e,t,i,r){return Qt.subVectors(i,t),Cn.subVectors(e,t),Qt.cross(Cn).dot(r)<0}set(e,t,i){return this.a.copy(e),this.b.copy(t),this.c.copy(i),this}setFromPointsAndIndices(e,t,i,r){return this.a.copy(e[t]),this.b.copy(e[i]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,i,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,i),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Qt.subVectors(this.c,this.b),Cn.subVectors(this.a,this.b),Qt.cross(Cn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return en.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return en.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,i,r,s){return en.getInterpolation(e,this.a,this.b,this.c,t,i,r,s)}containsPoint(e){return en.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return en.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const i=this.a,r=this.b,s=this.c;let o,a;Bi.subVectors(r,i),zi.subVectors(s,i),Po.subVectors(e,i);const l=Bi.dot(Po),c=zi.dot(Po);if(l<=0&&c<=0)return t.copy(i);Do.subVectors(e,r);const u=Bi.dot(Do),f=zi.dot(Do);if(u>=0&&f<=u)return t.copy(r);const d=l*f-u*c;if(d<=0&&l>=0&&u<=0)return o=l/(l-u),t.copy(i).addScaledVector(Bi,o);Lo.subVectors(e,s);const p=Bi.dot(Lo),v=zi.dot(Lo);if(v>=0&&p<=v)return t.copy(s);const M=p*c-l*v;if(M<=0&&c>=0&&v<=0)return a=c/(c-v),t.copy(i).addScaledVector(zi,a);const m=u*v-p*f;if(m<=0&&f-u>=0&&p-v>=0)return Pc.subVectors(s,r),a=(f-u)/(f-u+(p-v)),t.copy(r).addScaledVector(Pc,a);const h=1/(m+M+d);return o=M*h,a=d*h,t.copy(i).addScaledVector(Bi,o).addScaledVector(zi,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const Ff={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Kn={h:0,s:0,l:0},as={h:0,s:0,l:0};function Fo(n,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?n+(e-n)*6*t:t<1/2?e:t<2/3?n+(e-n)*6*(2/3-t):n}class je{constructor(e,t,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,i)}set(e,t,i){if(t===void 0&&i===void 0){const r=e;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(e,t,i);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=jt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Qe.colorSpaceToWorking(this,t),this}setRGB(e,t,i,r=Qe.workingColorSpace){return this.r=e,this.g=t,this.b=i,Qe.colorSpaceToWorking(this,r),this}setHSL(e,t,i,r=Qe.workingColorSpace){if(e=Mm(e,1),t=Ke(t,0,1),i=Ke(i,0,1),t===0)this.r=this.g=this.b=i;else{const s=i<=.5?i*(1+t):i+t-i*t,o=2*i-s;this.r=Fo(o,s,e+1/3),this.g=Fo(o,s,e),this.b=Fo(o,s,e-1/3)}return Qe.colorSpaceToWorking(this,r),this}setStyle(e,t=jt){function i(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let s;const o=r[1],a=r[2];switch(o){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,t);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){const s=r[1],o=s.length;if(o===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(s,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=jt){const i=Ff[e.toLowerCase()];return i!==void 0?this.setHex(i,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=zn(e.r),this.g=zn(e.g),this.b=zn(e.b),this}copyLinearToSRGB(e){return this.r=Ji(e.r),this.g=Ji(e.g),this.b=Ji(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=jt){return Qe.workingToColorSpace(Tt.copy(this),e),Math.round(Ke(Tt.r*255,0,255))*65536+Math.round(Ke(Tt.g*255,0,255))*256+Math.round(Ke(Tt.b*255,0,255))}getHexString(e=jt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Qe.workingColorSpace){Qe.workingToColorSpace(Tt.copy(this),t);const i=Tt.r,r=Tt.g,s=Tt.b,o=Math.max(i,r,s),a=Math.min(i,r,s);let l,c;const u=(a+o)/2;if(a===o)l=0,c=0;else{const f=o-a;switch(c=u<=.5?f/(o+a):f/(2-o-a),o){case i:l=(r-s)/f+(r<s?6:0);break;case r:l=(s-i)/f+2;break;case s:l=(i-r)/f+4;break}l/=6}return e.h=l,e.s=c,e.l=u,e}getRGB(e,t=Qe.workingColorSpace){return Qe.workingToColorSpace(Tt.copy(this),t),e.r=Tt.r,e.g=Tt.g,e.b=Tt.b,e}getStyle(e=jt){Qe.workingToColorSpace(Tt.copy(this),e);const t=Tt.r,i=Tt.g,r=Tt.b;return e!==jt?`color(${e} ${t.toFixed(3)} ${i.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(i*255)},${Math.round(r*255)})`}offsetHSL(e,t,i){return this.getHSL(Kn),this.setHSL(Kn.h+e,Kn.s+t,Kn.l+i)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,i){return this.r=e.r+(t.r-e.r)*i,this.g=e.g+(t.g-e.g)*i,this.b=e.b+(t.b-e.b)*i,this}lerpHSL(e,t){this.getHSL(Kn),e.getHSL(as);const i=vo(Kn.h,as.h,t),r=vo(Kn.s,as.s,t),s=vo(Kn.l,as.l,t);return this.setHSL(i,r,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,i=this.g,r=this.b,s=e.elements;return this.r=s[0]*t+s[3]*i+s[6]*r,this.g=s[1]*t+s[4]*i+s[7]*r,this.b=s[2]*t+s[5]*i+s[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Tt=new je;je.NAMES=Ff;let Fm=0;class qr extends or{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Fm++}),this.uuid=kr(),this.name="",this.type="Material",this.blending=Zi,this.side=si,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=aa,this.blendDst=la,this.blendEquation=Mi,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new je(0,0,0),this.blendAlpha=0,this.depthFunc=tr,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=_c,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Pi,this.stencilZFail=Pi,this.stencilZPass=Pi,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const i=e[t];if(i===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(i):r&&r.isVector3&&i&&i.isVector3?r.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const i={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(i.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(i.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==Zi&&(i.blending=this.blending),this.side!==si&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==aa&&(i.blendSrc=this.blendSrc),this.blendDst!==la&&(i.blendDst=this.blendDst),this.blendEquation!==Mi&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==tr&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==_c&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Pi&&(i.stencilFail=this.stencilFail),this.stencilZFail!==Pi&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==Pi&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function r(s){const o=[];for(const a in s){const l=s[a];delete l.metadata,o.push(l)}return o}if(t){const s=r(e.textures),o=r(e.images);s.length>0&&(i.textures=s),o.length>0&&(i.images=o)}return i}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let i=null;if(t!==null){const r=t.length;i=new Array(r);for(let s=0;s!==r;++s)i[s]=t[s].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class Of extends qr{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new je(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new kn,this.combine=Sf,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const gt=new H,ls=new Ye;let Om=0;class qt{constructor(e,t,i=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Om++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=i,this.usage=gc,this.updateRanges=[],this.gpuType=Bn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,i){e*=this.itemSize,i*=t.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[e+r]=t.array[i+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,i=this.count;t<i;t++)ls.fromBufferAttribute(this,t),ls.applyMatrix3(e),this.setXY(t,ls.x,ls.y);else if(this.itemSize===3)for(let t=0,i=this.count;t<i;t++)gt.fromBufferAttribute(this,t),gt.applyMatrix3(e),this.setXYZ(t,gt.x,gt.y,gt.z);return this}applyMatrix4(e){for(let t=0,i=this.count;t<i;t++)gt.fromBufferAttribute(this,t),gt.applyMatrix4(e),this.setXYZ(t,gt.x,gt.y,gt.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)gt.fromBufferAttribute(this,t),gt.applyNormalMatrix(e),this.setXYZ(t,gt.x,gt.y,gt.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)gt.fromBufferAttribute(this,t),gt.transformDirection(e),this.setXYZ(t,gt.x,gt.y,gt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let i=this.array[e*this.itemSize+t];return this.normalized&&(i=fr(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=Ft(i,this.array)),this.array[e*this.itemSize+t]=i,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=fr(t,this.array)),t}setX(e,t){return this.normalized&&(t=Ft(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=fr(t,this.array)),t}setY(e,t){return this.normalized&&(t=Ft(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=fr(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Ft(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=fr(t,this.array)),t}setW(e,t){return this.normalized&&(t=Ft(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,i){return e*=this.itemSize,this.normalized&&(t=Ft(t,this.array),i=Ft(i,this.array)),this.array[e+0]=t,this.array[e+1]=i,this}setXYZ(e,t,i,r){return e*=this.itemSize,this.normalized&&(t=Ft(t,this.array),i=Ft(i,this.array),r=Ft(r,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this}setXYZW(e,t,i,r,s){return e*=this.itemSize,this.normalized&&(t=Ft(t,this.array),i=Ft(i,this.array),r=Ft(r,this.array),s=Ft(s,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==gc&&(e.usage=this.usage),e}}class Bf extends qt{constructor(e,t,i){super(new Uint16Array(e),t,i)}}class zf extends qt{constructor(e,t,i){super(new Uint32Array(e),t,i)}}class xn extends qt{constructor(e,t,i){super(new Float32Array(e),t,i)}}let Bm=0;const Kt=new mt,Oo=new Ut,Hi=new H,kt=new Xr,mr=new Xr,St=new H;class yn extends or{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Bm++}),this.uuid=kr(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Lf(e)?zf:Bf)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,i=0){this.groups.push({start:e,count:t,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const s=new Ge().getNormalMatrix(e);i.applyNormalMatrix(s),i.needsUpdate=!0}const r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return Kt.makeRotationFromQuaternion(e),this.applyMatrix4(Kt),this}rotateX(e){return Kt.makeRotationX(e),this.applyMatrix4(Kt),this}rotateY(e){return Kt.makeRotationY(e),this.applyMatrix4(Kt),this}rotateZ(e){return Kt.makeRotationZ(e),this.applyMatrix4(Kt),this}translate(e,t,i){return Kt.makeTranslation(e,t,i),this.applyMatrix4(Kt),this}scale(e,t,i){return Kt.makeScale(e,t,i),this.applyMatrix4(Kt),this}lookAt(e){return Oo.lookAt(e),Oo.updateMatrix(),this.applyMatrix4(Oo.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Hi).negate(),this.translate(Hi.x,Hi.y,Hi.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const i=[];for(let r=0,s=e.length;r<s;r++){const o=e[r];i.push(o.x,o.y,o.z||0)}this.setAttribute("position",new xn(i,3))}else{const i=Math.min(e.length,t.count);for(let r=0;r<i;r++){const s=e[r];t.setXYZ(r,s.x,s.y,s.z||0)}e.length>t.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Xr);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new H(-1/0,-1/0,-1/0),new H(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let i=0,r=t.length;i<r;i++){const s=t[i];kt.setFromBufferAttribute(s),this.morphTargetsRelative?(St.addVectors(this.boundingBox.min,kt.min),this.boundingBox.expandByPoint(St),St.addVectors(this.boundingBox.max,kt.max),this.boundingBox.expandByPoint(St)):(this.boundingBox.expandByPoint(kt.min),this.boundingBox.expandByPoint(kt.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Js);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new H,1/0);return}if(e){const i=this.boundingSphere.center;if(kt.setFromBufferAttribute(e),t)for(let s=0,o=t.length;s<o;s++){const a=t[s];mr.setFromBufferAttribute(a),this.morphTargetsRelative?(St.addVectors(kt.min,mr.min),kt.expandByPoint(St),St.addVectors(kt.max,mr.max),kt.expandByPoint(St)):(kt.expandByPoint(mr.min),kt.expandByPoint(mr.max))}kt.getCenter(i);let r=0;for(let s=0,o=e.count;s<o;s++)St.fromBufferAttribute(e,s),r=Math.max(r,i.distanceToSquared(St));if(t)for(let s=0,o=t.length;s<o;s++){const a=t[s],l=this.morphTargetsRelative;for(let c=0,u=a.count;c<u;c++)St.fromBufferAttribute(a,c),l&&(Hi.fromBufferAttribute(e,c),St.add(Hi)),r=Math.max(r,i.distanceToSquared(St))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const i=t.position,r=t.normal,s=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new qt(new Float32Array(4*i.count),4));const o=this.getAttribute("tangent"),a=[],l=[];for(let B=0;B<i.count;B++)a[B]=new H,l[B]=new H;const c=new H,u=new H,f=new H,d=new Ye,p=new Ye,v=new Ye,M=new H,m=new H;function h(B,T,y){c.fromBufferAttribute(i,B),u.fromBufferAttribute(i,T),f.fromBufferAttribute(i,y),d.fromBufferAttribute(s,B),p.fromBufferAttribute(s,T),v.fromBufferAttribute(s,y),u.sub(c),f.sub(c),p.sub(d),v.sub(d);const L=1/(p.x*v.y-v.x*p.y);isFinite(L)&&(M.copy(u).multiplyScalar(v.y).addScaledVector(f,-p.y).multiplyScalar(L),m.copy(f).multiplyScalar(p.x).addScaledVector(u,-v.x).multiplyScalar(L),a[B].add(M),a[T].add(M),a[y].add(M),l[B].add(m),l[T].add(m),l[y].add(m))}let w=this.groups;w.length===0&&(w=[{start:0,count:e.count}]);for(let B=0,T=w.length;B<T;++B){const y=w[B],L=y.start,X=y.count;for(let Z=L,se=L+X;Z<se;Z+=3)h(e.getX(Z+0),e.getX(Z+1),e.getX(Z+2))}const b=new H,E=new H,R=new H,C=new H;function P(B){R.fromBufferAttribute(r,B),C.copy(R);const T=a[B];b.copy(T),b.sub(R.multiplyScalar(R.dot(T))).normalize(),E.crossVectors(C,T);const L=E.dot(l[B])<0?-1:1;o.setXYZW(B,b.x,b.y,b.z,L)}for(let B=0,T=w.length;B<T;++B){const y=w[B],L=y.start,X=y.count;for(let Z=L,se=L+X;Z<se;Z+=3)P(e.getX(Z+0)),P(e.getX(Z+1)),P(e.getX(Z+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new qt(new Float32Array(t.count*3),3),this.setAttribute("normal",i);else for(let d=0,p=i.count;d<p;d++)i.setXYZ(d,0,0,0);const r=new H,s=new H,o=new H,a=new H,l=new H,c=new H,u=new H,f=new H;if(e)for(let d=0,p=e.count;d<p;d+=3){const v=e.getX(d+0),M=e.getX(d+1),m=e.getX(d+2);r.fromBufferAttribute(t,v),s.fromBufferAttribute(t,M),o.fromBufferAttribute(t,m),u.subVectors(o,s),f.subVectors(r,s),u.cross(f),a.fromBufferAttribute(i,v),l.fromBufferAttribute(i,M),c.fromBufferAttribute(i,m),a.add(u),l.add(u),c.add(u),i.setXYZ(v,a.x,a.y,a.z),i.setXYZ(M,l.x,l.y,l.z),i.setXYZ(m,c.x,c.y,c.z)}else for(let d=0,p=t.count;d<p;d+=3)r.fromBufferAttribute(t,d+0),s.fromBufferAttribute(t,d+1),o.fromBufferAttribute(t,d+2),u.subVectors(o,s),f.subVectors(r,s),u.cross(f),i.setXYZ(d+0,u.x,u.y,u.z),i.setXYZ(d+1,u.x,u.y,u.z),i.setXYZ(d+2,u.x,u.y,u.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,i=e.count;t<i;t++)St.fromBufferAttribute(e,t),St.normalize(),e.setXYZ(t,St.x,St.y,St.z)}toNonIndexed(){function e(a,l){const c=a.array,u=a.itemSize,f=a.normalized,d=new c.constructor(l.length*u);let p=0,v=0;for(let M=0,m=l.length;M<m;M++){a.isInterleavedBufferAttribute?p=l[M]*a.data.stride+a.offset:p=l[M]*u;for(let h=0;h<u;h++)d[v++]=c[p++]}return new qt(d,u,f)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new yn,i=this.index.array,r=this.attributes;for(const a in r){const l=r[a],c=e(l,i);t.setAttribute(a,c)}const s=this.morphAttributes;for(const a in s){const l=[],c=s[a];for(let u=0,f=c.length;u<f;u++){const d=c[u],p=e(d,i);l.push(p)}t.morphAttributes[a]=l}t.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,l=o.length;a<l;a++){const c=o[a];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const i=this.attributes;for(const l in i){const c=i[l];e.data.attributes[l]=c.toJSON(e.data)}const r={};let s=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],u=[];for(let f=0,d=c.length;f<d;f++){const p=c[f];u.push(p.toJSON(e.data))}u.length>0&&(r[l]=u,s=!0)}s&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(e.data.boundingSphere=a.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const i=e.index;i!==null&&this.setIndex(i.clone());const r=e.attributes;for(const c in r){const u=r[c];this.setAttribute(c,u.clone(t))}const s=e.morphAttributes;for(const c in s){const u=[],f=s[c];for(let d=0,p=f.length;d<p;d++)u.push(f[d].clone(t));this.morphAttributes[c]=u}this.morphTargetsRelative=e.morphTargetsRelative;const o=e.groups;for(let c=0,u=o.length;c<u;c++){const f=o[c];this.addGroup(f.start,f.count,f.materialIndex)}const a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Dc=new mt,hi=new Uf,cs=new Js,Lc=new H,us=new H,fs=new H,hs=new H,Bo=new H,ds=new H,Ic=new H,ps=new H;class rn extends Ut{constructor(e=new yn,t=new Of){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const r=t[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){const a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}getVertexPosition(e,t){const i=this.geometry,r=i.attributes.position,s=i.morphAttributes.position,o=i.morphTargetsRelative;t.fromBufferAttribute(r,e);const a=this.morphTargetInfluences;if(s&&a){ds.set(0,0,0);for(let l=0,c=s.length;l<c;l++){const u=a[l],f=s[l];u!==0&&(Bo.fromBufferAttribute(f,e),o?ds.addScaledVector(Bo,u):ds.addScaledVector(Bo.sub(t),u))}t.add(ds)}return t}raycast(e,t){const i=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),cs.copy(i.boundingSphere),cs.applyMatrix4(s),hi.copy(e.ray).recast(e.near),!(cs.containsPoint(hi.origin)===!1&&(hi.intersectSphere(cs,Lc)===null||hi.origin.distanceToSquared(Lc)>(e.far-e.near)**2))&&(Dc.copy(s).invert(),hi.copy(e.ray).applyMatrix4(Dc),!(i.boundingBox!==null&&hi.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(e,t,hi)))}_computeIntersections(e,t,i){let r;const s=this.geometry,o=this.material,a=s.index,l=s.attributes.position,c=s.attributes.uv,u=s.attributes.uv1,f=s.attributes.normal,d=s.groups,p=s.drawRange;if(a!==null)if(Array.isArray(o))for(let v=0,M=d.length;v<M;v++){const m=d[v],h=o[m.materialIndex],w=Math.max(m.start,p.start),b=Math.min(a.count,Math.min(m.start+m.count,p.start+p.count));for(let E=w,R=b;E<R;E+=3){const C=a.getX(E),P=a.getX(E+1),B=a.getX(E+2);r=ms(this,h,e,i,c,u,f,C,P,B),r&&(r.faceIndex=Math.floor(E/3),r.face.materialIndex=m.materialIndex,t.push(r))}}else{const v=Math.max(0,p.start),M=Math.min(a.count,p.start+p.count);for(let m=v,h=M;m<h;m+=3){const w=a.getX(m),b=a.getX(m+1),E=a.getX(m+2);r=ms(this,o,e,i,c,u,f,w,b,E),r&&(r.faceIndex=Math.floor(m/3),t.push(r))}}else if(l!==void 0)if(Array.isArray(o))for(let v=0,M=d.length;v<M;v++){const m=d[v],h=o[m.materialIndex],w=Math.max(m.start,p.start),b=Math.min(l.count,Math.min(m.start+m.count,p.start+p.count));for(let E=w,R=b;E<R;E+=3){const C=E,P=E+1,B=E+2;r=ms(this,h,e,i,c,u,f,C,P,B),r&&(r.faceIndex=Math.floor(E/3),r.face.materialIndex=m.materialIndex,t.push(r))}}else{const v=Math.max(0,p.start),M=Math.min(l.count,p.start+p.count);for(let m=v,h=M;m<h;m+=3){const w=m,b=m+1,E=m+2;r=ms(this,o,e,i,c,u,f,w,b,E),r&&(r.faceIndex=Math.floor(m/3),t.push(r))}}}}function zm(n,e,t,i,r,s,o,a){let l;if(e.side===It?l=i.intersectTriangle(o,s,r,!0,a):l=i.intersectTriangle(r,s,o,e.side===si,a),l===null)return null;ps.copy(a),ps.applyMatrix4(n.matrixWorld);const c=t.ray.origin.distanceTo(ps);return c<t.near||c>t.far?null:{distance:c,point:ps.clone(),object:n}}function ms(n,e,t,i,r,s,o,a,l,c){n.getVertexPosition(a,us),n.getVertexPosition(l,fs),n.getVertexPosition(c,hs);const u=zm(n,e,t,i,us,fs,hs,Ic);if(u){const f=new H;en.getBarycoord(Ic,us,fs,hs,f),r&&(u.uv=en.getInterpolatedAttribute(r,a,l,c,f,new Ye)),s&&(u.uv1=en.getInterpolatedAttribute(s,a,l,c,f,new Ye)),o&&(u.normal=en.getInterpolatedAttribute(o,a,l,c,f,new H),u.normal.dot(i.direction)>0&&u.normal.multiplyScalar(-1));const d={a,b:l,c,normal:new H,materialIndex:0};en.getNormal(us,fs,hs,d.normal),u.face=d,u.barycoord=f}return u}class Yr extends yn{constructor(e=1,t=1,i=1,r=1,s=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:i,widthSegments:r,heightSegments:s,depthSegments:o};const a=this;r=Math.floor(r),s=Math.floor(s),o=Math.floor(o);const l=[],c=[],u=[],f=[];let d=0,p=0;v("z","y","x",-1,-1,i,t,e,o,s,0),v("z","y","x",1,-1,i,t,-e,o,s,1),v("x","z","y",1,1,e,i,t,r,o,2),v("x","z","y",1,-1,e,i,-t,r,o,3),v("x","y","z",1,-1,e,t,i,r,s,4),v("x","y","z",-1,-1,e,t,-i,r,s,5),this.setIndex(l),this.setAttribute("position",new xn(c,3)),this.setAttribute("normal",new xn(u,3)),this.setAttribute("uv",new xn(f,2));function v(M,m,h,w,b,E,R,C,P,B,T){const y=E/P,L=R/B,X=E/2,Z=R/2,se=C/2,ie=P+1,j=B+1;let Q=0,U=0;const K=new H;for(let de=0;de<j;de++){const ge=de*L-Z;for(let Le=0;Le<ie;Le++){const ke=Le*y-X;K[M]=ke*w,K[m]=ge*b,K[h]=se,c.push(K.x,K.y,K.z),K[M]=0,K[m]=0,K[h]=C>0?1:-1,u.push(K.x,K.y,K.z),f.push(Le/P),f.push(1-de/B),Q+=1}}for(let de=0;de<B;de++)for(let ge=0;ge<P;ge++){const Le=d+ge+ie*de,ke=d+ge+ie*(de+1),Ze=d+(ge+1)+ie*(de+1),Xe=d+(ge+1)+ie*de;l.push(Le,ke,Xe),l.push(ke,Ze,Xe),U+=6}a.addGroup(p,U,T),p+=U,d+=Q}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Yr(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function sr(n){const e={};for(const t in n){e[t]={};for(const i in n[t]){const r=n[t][i];r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)?r.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][i]=null):e[t][i]=r.clone():Array.isArray(r)?e[t][i]=r.slice():e[t][i]=r}}return e}function Pt(n){const e={};for(let t=0;t<n.length;t++){const i=sr(n[t]);for(const r in i)e[r]=i[r]}return e}function Hm(n){const e=[];for(let t=0;t<n.length;t++)e.push(n[t].clone());return e}function Hf(n){const e=n.getRenderTarget();return e===null?n.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:Qe.workingColorSpace}const Vm={clone:sr,merge:Pt};var Gm=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,km=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class ln extends qr{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Gm,this.fragmentShader=km,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=sr(e.uniforms),this.uniformsGroups=Hm(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const r in this.uniforms){const o=this.uniforms[r].value;o&&o.isTexture?t.uniforms[r]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[r]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[r]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[r]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[r]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[r]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[r]={type:"m4",value:o.toArray()}:t.uniforms[r]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const i={};for(const r in this.extensions)this.extensions[r]===!0&&(i[r]=!0);return Object.keys(i).length>0&&(t.extensions=i),t}}class Vf extends Ut{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new mt,this.projectionMatrix=new mt,this.projectionMatrixInverse=new mt,this.coordinateSystem=gn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const jn=new H,Uc=new Ye,Nc=new Ye;class Wt extends Vf{constructor(e=50,t=1,i=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=$a*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(go*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return $a*2*Math.atan(Math.tan(go*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,i){jn.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(jn.x,jn.y).multiplyScalar(-e/jn.z),jn.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(jn.x,jn.y).multiplyScalar(-e/jn.z)}getViewSize(e,t){return this.getViewBounds(e,Uc,Nc),t.subVectors(Nc,Uc)}setViewOffset(e,t,i,r,s,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(go*.5*this.fov)/this.zoom,i=2*t,r=this.aspect*i,s=-.5*r;const o=this.view;if(this.view!==null&&this.view.enabled){const l=o.fullWidth,c=o.fullHeight;s+=o.offsetX*r/l,t-=o.offsetY*i/c,r*=o.width/l,i*=o.height/c}const a=this.filmOffset;a!==0&&(s+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,t,t-i,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const Vi=-90,Gi=1;class Wm extends Ut{constructor(e,t,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;const r=new Wt(Vi,Gi,e,t);r.layers=this.layers,this.add(r);const s=new Wt(Vi,Gi,e,t);s.layers=this.layers,this.add(s);const o=new Wt(Vi,Gi,e,t);o.layers=this.layers,this.add(o);const a=new Wt(Vi,Gi,e,t);a.layers=this.layers,this.add(a);const l=new Wt(Vi,Gi,e,t);l.layers=this.layers,this.add(l);const c=new Wt(Vi,Gi,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[i,r,s,o,a,l]=t;for(const c of t)this.remove(c);if(e===gn)i.up.set(0,1,0),i.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===zs)i.up.set(0,-1,0),i.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:i,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[s,o,a,l,c,u]=this.children,f=e.getRenderTarget(),d=e.getActiveCubeFace(),p=e.getActiveMipmapLevel(),v=e.xr.enabled;e.xr.enabled=!1;const M=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,e.setRenderTarget(i,0,r),e.render(t,s),e.setRenderTarget(i,1,r),e.render(t,o),e.setRenderTarget(i,2,r),e.render(t,a),e.setRenderTarget(i,3,r),e.render(t,l),e.setRenderTarget(i,4,r),e.render(t,c),i.texture.generateMipmaps=M,e.setRenderTarget(i,5,r),e.render(t,u),e.setRenderTarget(f,d,p),e.xr.enabled=v,i.texture.needsPMREMUpdate=!0}}class Gf extends zt{constructor(e=[],t=nr,i,r,s,o,a,l,c,u){super(e,t,i,r,s,o,a,l,c,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class Xm extends Ai{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const i={width:e,height:e,depth:1},r=[i,i,i,i,i,i];this.texture=new Gf(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new Yr(5,5,5),s=new ln({name:"CubemapFromEquirect",uniforms:sr(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:It,blending:ni});s.uniforms.tEquirect.value=t;const o=new rn(r,s),a=t.minFilter;return t.minFilter===yi&&(t.minFilter=_n),new Wm(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t=!0,i=!0,r=!0){const s=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,i,r);e.setRenderTarget(s)}}class _s extends Ut{constructor(){super(),this.isGroup=!0,this.type="Group"}}const qm={type:"move"};class zo{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new _s,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new _s,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new H,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new H),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new _s,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new H,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new H),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const i of e.hand.values())this._getHandJoint(t,i)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,i){let r=null,s=null,o=null;const a=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){o=!0;for(const M of e.hand.values()){const m=t.getJointPose(M,i),h=this._getHandJoint(c,M);m!==null&&(h.matrix.fromArray(m.transform.matrix),h.matrix.decompose(h.position,h.rotation,h.scale),h.matrixWorldNeedsUpdate=!0,h.jointRadius=m.radius),h.visible=m!==null}const u=c.joints["index-finger-tip"],f=c.joints["thumb-tip"],d=u.position.distanceTo(f.position),p=.02,v=.005;c.inputState.pinching&&d>p+v?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&d<=p-v&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,i),s!==null&&(l.matrix.fromArray(s.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,s.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(s.linearVelocity)):l.hasLinearVelocity=!1,s.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(s.angularVelocity)):l.hasAngularVelocity=!1));a!==null&&(r=t.getPose(e.targetRaySpace,i),r===null&&s!==null&&(r=s),r!==null&&(a.matrix.fromArray(r.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,r.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(r.linearVelocity)):a.hasLinearVelocity=!1,r.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(r.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(qm)))}return a!==null&&(a.visible=r!==null),l!==null&&(l.visible=s!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const i=new _s;i.matrixAutoUpdate=!1,i.visible=!1,e.joints[t.jointName]=i,e.add(i)}return e.joints[t.jointName]}}class Ym extends Ut{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new kn,this.environmentIntensity=1,this.environmentRotation=new kn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}const Ho=new H,$m=new H,Km=new Ge;class vi{constructor(e=new H(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,i,r){return this.normal.set(e,t,i),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,i){const r=Ho.subVectors(i,t).cross($m.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const i=e.delta(Ho),r=this.normal.dot(i);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const s=-(e.start.dot(this.normal)+this.constant)/r;return s<0||s>1?null:t.copy(e.start).addScaledVector(i,s)}intersectsLine(e){const t=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return t<0&&i>0||i<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const i=t||Km.getNormalMatrix(e),r=this.coplanarPoint(Ho).applyMatrix4(e),s=this.normal.applyMatrix3(i).normalize();return this.constant=-r.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const di=new Js,jm=new Ye(.5,.5),gs=new H;class Rl{constructor(e=new vi,t=new vi,i=new vi,r=new vi,s=new vi,o=new vi){this.planes=[e,t,i,r,s,o]}set(e,t,i,r,s,o){const a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(i),a[3].copy(r),a[4].copy(s),a[5].copy(o),this}copy(e){const t=this.planes;for(let i=0;i<6;i++)t[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e,t=gn,i=!1){const r=this.planes,s=e.elements,o=s[0],a=s[1],l=s[2],c=s[3],u=s[4],f=s[5],d=s[6],p=s[7],v=s[8],M=s[9],m=s[10],h=s[11],w=s[12],b=s[13],E=s[14],R=s[15];if(r[0].setComponents(c-o,p-u,h-v,R-w).normalize(),r[1].setComponents(c+o,p+u,h+v,R+w).normalize(),r[2].setComponents(c+a,p+f,h+M,R+b).normalize(),r[3].setComponents(c-a,p-f,h-M,R-b).normalize(),i)r[4].setComponents(l,d,m,E).normalize(),r[5].setComponents(c-l,p-d,h-m,R-E).normalize();else if(r[4].setComponents(c-l,p-d,h-m,R-E).normalize(),t===gn)r[5].setComponents(c+l,p+d,h+m,R+E).normalize();else if(t===zs)r[5].setComponents(l,d,m,E).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),di.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),di.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(di)}intersectsSprite(e){di.center.set(0,0,0);const t=jm.distanceTo(e.center);return di.radius=.7071067811865476+t,di.applyMatrix4(e.matrixWorld),this.intersectsSphere(di)}intersectsSphere(e){const t=this.planes,i=e.center,r=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(i)<r)return!1;return!0}intersectsBox(e){const t=this.planes;for(let i=0;i<6;i++){const r=t[i];if(gs.x=r.normal.x>0?e.max.x:e.min.x,gs.y=r.normal.y>0?e.max.y:e.min.y,gs.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(gs)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let i=0;i<6;i++)if(t[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Zm extends qr{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new je(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const Fc=new mt,Ka=new Uf,vs=new Js,xs=new H;class Jm extends Ut{constructor(e=new yn,t=new Zm){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const i=this.geometry,r=this.matrixWorld,s=e.params.Points.threshold,o=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),vs.copy(i.boundingSphere),vs.applyMatrix4(r),vs.radius+=s,e.ray.intersectsSphere(vs)===!1)return;Fc.copy(r).invert(),Ka.copy(e.ray).applyMatrix4(Fc);const a=s/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=i.index,f=i.attributes.position;if(c!==null){const d=Math.max(0,o.start),p=Math.min(c.count,o.start+o.count);for(let v=d,M=p;v<M;v++){const m=c.getX(v);xs.fromBufferAttribute(f,m),Oc(xs,m,l,r,e,t,this)}}else{const d=Math.max(0,o.start),p=Math.min(f.count,o.start+o.count);for(let v=d,M=p;v<M;v++)xs.fromBufferAttribute(f,v),Oc(xs,v,l,r,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const r=t[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){const a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}}function Oc(n,e,t,i,r,s,o){const a=Ka.distanceSqToPoint(n);if(a<t){const l=new H;Ka.closestPointToPoint(n,l),l.applyMatrix4(i);const c=r.ray.origin.distanceTo(l);if(c<r.near||c>r.far)return;s.push({distance:c,distanceToRay:Math.sqrt(a),point:l,index:e,face:null,faceIndex:null,barycoord:null,object:o})}}class kf extends zt{constructor(e,t,i=bi,r,s,o,a=an,l=an,c,u=Fr,f=1){if(u!==Fr&&u!==Or)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const d={width:e,height:t,depth:f};super(d,r,s,o,a,l,u,i,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new wl(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class Wf extends zt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class Qs extends yn{constructor(e=1,t=1,i=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:i,heightSegments:r};const s=e/2,o=t/2,a=Math.floor(i),l=Math.floor(r),c=a+1,u=l+1,f=e/a,d=t/l,p=[],v=[],M=[],m=[];for(let h=0;h<u;h++){const w=h*d-o;for(let b=0;b<c;b++){const E=b*f-s;v.push(E,-w,0),M.push(0,0,1),m.push(b/a),m.push(1-h/l)}}for(let h=0;h<l;h++)for(let w=0;w<a;w++){const b=w+c*h,E=w+c*(h+1),R=w+1+c*(h+1),C=w+1+c*h;p.push(b,E,C),p.push(E,R,C)}this.setIndex(p),this.setAttribute("position",new xn(v,3)),this.setAttribute("normal",new xn(M,3)),this.setAttribute("uv",new xn(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Qs(e.width,e.height,e.widthSegments,e.heightSegments)}}class Vs extends yn{constructor(e=1,t=32,i=16,r=0,s=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:i,phiStart:r,phiLength:s,thetaStart:o,thetaLength:a},t=Math.max(3,Math.floor(t)),i=Math.max(2,Math.floor(i));const l=Math.min(o+a,Math.PI);let c=0;const u=[],f=new H,d=new H,p=[],v=[],M=[],m=[];for(let h=0;h<=i;h++){const w=[],b=h/i;let E=0;h===0&&o===0?E=.5/t:h===i&&l===Math.PI&&(E=-.5/t);for(let R=0;R<=t;R++){const C=R/t;f.x=-e*Math.cos(r+C*s)*Math.sin(o+b*a),f.y=e*Math.cos(o+b*a),f.z=e*Math.sin(r+C*s)*Math.sin(o+b*a),v.push(f.x,f.y,f.z),d.copy(f).normalize(),M.push(d.x,d.y,d.z),m.push(C+E,1-b),w.push(c++)}u.push(w)}for(let h=0;h<i;h++)for(let w=0;w<t;w++){const b=u[h][w+1],E=u[h][w],R=u[h+1][w],C=u[h+1][w+1];(h!==0||o>0)&&p.push(b,E,C),(h!==i-1||l<Math.PI)&&p.push(E,R,C)}this.setIndex(p),this.setAttribute("position",new xn(v,3)),this.setAttribute("normal",new xn(M,3)),this.setAttribute("uv",new xn(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Vs(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}class Qm extends qr{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=cm,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class e_ extends qr{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}class Xf extends Ut{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new je(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(t.object.target=this.target.uuid),t}}const Vo=new mt,Bc=new H,zc=new H;class t_{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Ye(512,512),this.mapType=En,this.map=null,this.mapPass=null,this.matrix=new mt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Rl,this._frameExtents=new Ye(1,1),this._viewportCount=1,this._viewports=[new ot(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,i=this.matrix;Bc.setFromMatrixPosition(e.matrixWorld),t.position.copy(Bc),zc.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(zc),t.updateMatrixWorld(),Vo.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Vo,t.coordinateSystem,t.reversedDepth),t.reversedDepth?i.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply(Vo)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const Hc=new mt,_r=new H,Go=new H;class n_ extends t_{constructor(){super(new Wt(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new Ye(4,2),this._viewportCount=6,this._viewports=[new ot(2,1,1,1),new ot(0,1,1,1),new ot(3,1,1,1),new ot(1,1,1,1),new ot(3,0,1,1),new ot(1,0,1,1)],this._cubeDirections=[new H(1,0,0),new H(-1,0,0),new H(0,0,1),new H(0,0,-1),new H(0,1,0),new H(0,-1,0)],this._cubeUps=[new H(0,1,0),new H(0,1,0),new H(0,1,0),new H(0,1,0),new H(0,0,1),new H(0,0,-1)]}updateMatrices(e,t=0){const i=this.camera,r=this.matrix,s=e.distance||i.far;s!==i.far&&(i.far=s,i.updateProjectionMatrix()),_r.setFromMatrixPosition(e.matrixWorld),i.position.copy(_r),Go.copy(i.position),Go.add(this._cubeDirections[t]),i.up.copy(this._cubeUps[t]),i.lookAt(Go),i.updateMatrixWorld(),r.makeTranslation(-_r.x,-_r.y,-_r.z),Hc.multiplyMatrices(i.projectionMatrix,i.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Hc,i.coordinateSystem,i.reversedDepth)}}class i_ extends Xf{constructor(e,t,i=0,r=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=i,this.decay=r,this.shadow=new n_}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}}class r_ extends Vf{constructor(e=-1,t=1,i=1,r=-1,s=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=i,this.bottom=r,this.near=s,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,i,r,s,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,r=(this.top+this.bottom)/2;let s=i-e,o=i+e,a=r+t,l=r-t;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=c*this.view.offsetX,o=s+c*this.view.width,a-=u*this.view.offsetY,l=a-u*this.view.height}this.projectionMatrix.makeOrthographic(s,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class s_ extends Xf{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}class o_ extends Wt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}function Vc(n,e,t,i){const r=a_(i);switch(t){case wf:return n*e;case Cf:return n*e/r.components*r.byteLength;case Tl:return n*e/r.components*r.byteLength;case Pf:return n*e*2/r.components*r.byteLength;case bl:return n*e*2/r.components*r.byteLength;case Rf:return n*e*3/r.components*r.byteLength;case nn:return n*e*4/r.components*r.byteLength;case Al:return n*e*4/r.components*r.byteLength;case As:case ws:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case Rs:case Cs:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case Sa:case ya:return Math.max(n,16)*Math.max(e,8)/4;case Ma:case Ea:return Math.max(n,8)*Math.max(e,8)/2;case Ta:case ba:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case Aa:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case wa:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case Ra:return Math.floor((n+4)/5)*Math.floor((e+3)/4)*16;case Ca:return Math.floor((n+4)/5)*Math.floor((e+4)/5)*16;case Pa:return Math.floor((n+5)/6)*Math.floor((e+4)/5)*16;case Da:return Math.floor((n+5)/6)*Math.floor((e+5)/6)*16;case La:return Math.floor((n+7)/8)*Math.floor((e+4)/5)*16;case Ia:return Math.floor((n+7)/8)*Math.floor((e+5)/6)*16;case Ua:return Math.floor((n+7)/8)*Math.floor((e+7)/8)*16;case Na:return Math.floor((n+9)/10)*Math.floor((e+4)/5)*16;case Fa:return Math.floor((n+9)/10)*Math.floor((e+5)/6)*16;case Oa:return Math.floor((n+9)/10)*Math.floor((e+7)/8)*16;case Ba:return Math.floor((n+9)/10)*Math.floor((e+9)/10)*16;case za:return Math.floor((n+11)/12)*Math.floor((e+9)/10)*16;case Ha:return Math.floor((n+11)/12)*Math.floor((e+11)/12)*16;case Va:case Ga:case ka:return Math.ceil(n/4)*Math.ceil(e/4)*16;case Wa:case Xa:return Math.ceil(n/4)*Math.ceil(e/4)*8;case qa:case Ya:return Math.ceil(n/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function a_(n){switch(n){case En:case yf:return{byteLength:1,components:1};case Ur:case Tf:case Gr:return{byteLength:2,components:1};case El:case yl:return{byteLength:2,components:4};case bi:case Sl:case Bn:return{byteLength:4,components:1};case bf:case Af:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${n}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Ml}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Ml);function qf(){let n=null,e=!1,t=null,i=null;function r(s,o){t(s,o),i=n.requestAnimationFrame(r)}return{start:function(){e!==!0&&t!==null&&(i=n.requestAnimationFrame(r),e=!0)},stop:function(){n.cancelAnimationFrame(i),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){n=s}}}function l_(n){const e=new WeakMap;function t(a,l){const c=a.array,u=a.usage,f=c.byteLength,d=n.createBuffer();n.bindBuffer(l,d),n.bufferData(l,c,u),a.onUploadCallback();let p;if(c instanceof Float32Array)p=n.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)p=n.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?p=n.HALF_FLOAT:p=n.UNSIGNED_SHORT;else if(c instanceof Int16Array)p=n.SHORT;else if(c instanceof Uint32Array)p=n.UNSIGNED_INT;else if(c instanceof Int32Array)p=n.INT;else if(c instanceof Int8Array)p=n.BYTE;else if(c instanceof Uint8Array)p=n.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)p=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:d,type:p,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:f}}function i(a,l,c){const u=l.array,f=l.updateRanges;if(n.bindBuffer(c,a),f.length===0)n.bufferSubData(c,0,u);else{f.sort((p,v)=>p.start-v.start);let d=0;for(let p=1;p<f.length;p++){const v=f[d],M=f[p];M.start<=v.start+v.count+1?v.count=Math.max(v.count,M.start+M.count-v.start):(++d,f[d]=M)}f.length=d+1;for(let p=0,v=f.length;p<v;p++){const M=f[p];n.bufferSubData(c,M.start*u.BYTES_PER_ELEMENT,u,M.start,M.count)}l.clearUpdateRanges()}l.onUploadCallback()}function r(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function s(a){a.isInterleavedBufferAttribute&&(a=a.data);const l=e.get(a);l&&(n.deleteBuffer(l.buffer),e.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const u=e.get(a);(!u||u.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const c=e.get(a);if(c===void 0)e.set(a,t(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(c.buffer,a,l),c.version=a.version}}return{get:r,remove:s,update:o}}var c_=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,u_=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,f_=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,h_=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,d_=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,p_=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,m_=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,__=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,g_=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,v_=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,x_=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,M_=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,S_=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,E_=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,y_=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,T_=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,b_=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,A_=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,w_=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,R_=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,C_=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,P_=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,D_=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,L_=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,I_=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,U_=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,N_=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,F_=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,O_=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,B_=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,z_="gl_FragColor = linearToOutputTexel( gl_FragColor );",H_=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,V_=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,G_=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,k_=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,W_=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,X_=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,q_=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Y_=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,$_=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,K_=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,j_=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Z_=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,J_=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Q_=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,eg=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,tg=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,ng=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,ig=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,rg=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,sg=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,og=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,ag=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,lg=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,cg=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,ug=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,fg=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,hg=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,dg=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,pg=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,mg=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,_g=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,gg=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,vg=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,xg=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Mg=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Sg=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Eg=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,yg=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Tg=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,bg=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Ag=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,wg=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Rg=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Cg=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Pg=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Dg=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Lg=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Ig=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Ug=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Ng=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Fg=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Og=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,Bg=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,zg=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Hg=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Vg=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Gg=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,kg=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Wg=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		float depth = unpackRGBAToDepth( texture2D( depths, uv ) );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			return step( depth, compare );
		#else
			return step( compare, depth );
		#endif
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow( sampler2D shadow, vec2 uv, float compare ) {
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			float hard_shadow = step( distribution.x, compare );
		#else
			float hard_shadow = step( compare, distribution.x );
		#endif
		if ( hard_shadow != 1.0 ) {
			float distance = compare - distribution.x;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,Xg=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,qg=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Yg=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,$g=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Kg=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,jg=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Zg=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,Jg=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Qg=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,ev=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,tv=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,nv=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,iv=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,rv=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,sv=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,ov=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,av=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const lv=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,cv=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,uv=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,fv=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,hv=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,dv=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,pv=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,mv=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,_v=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,gv=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,vv=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,xv=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Mv=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Sv=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Ev=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,yv=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Tv=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,bv=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Av=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,wv=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Rv=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Cv=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Pv=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Dv=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Lv=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Iv=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Uv=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Nv=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Fv=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Ov=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Bv=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,zv=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Hv=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Vv=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,We={alphahash_fragment:c_,alphahash_pars_fragment:u_,alphamap_fragment:f_,alphamap_pars_fragment:h_,alphatest_fragment:d_,alphatest_pars_fragment:p_,aomap_fragment:m_,aomap_pars_fragment:__,batching_pars_vertex:g_,batching_vertex:v_,begin_vertex:x_,beginnormal_vertex:M_,bsdfs:S_,iridescence_fragment:E_,bumpmap_pars_fragment:y_,clipping_planes_fragment:T_,clipping_planes_pars_fragment:b_,clipping_planes_pars_vertex:A_,clipping_planes_vertex:w_,color_fragment:R_,color_pars_fragment:C_,color_pars_vertex:P_,color_vertex:D_,common:L_,cube_uv_reflection_fragment:I_,defaultnormal_vertex:U_,displacementmap_pars_vertex:N_,displacementmap_vertex:F_,emissivemap_fragment:O_,emissivemap_pars_fragment:B_,colorspace_fragment:z_,colorspace_pars_fragment:H_,envmap_fragment:V_,envmap_common_pars_fragment:G_,envmap_pars_fragment:k_,envmap_pars_vertex:W_,envmap_physical_pars_fragment:tg,envmap_vertex:X_,fog_vertex:q_,fog_pars_vertex:Y_,fog_fragment:$_,fog_pars_fragment:K_,gradientmap_pars_fragment:j_,lightmap_pars_fragment:Z_,lights_lambert_fragment:J_,lights_lambert_pars_fragment:Q_,lights_pars_begin:eg,lights_toon_fragment:ng,lights_toon_pars_fragment:ig,lights_phong_fragment:rg,lights_phong_pars_fragment:sg,lights_physical_fragment:og,lights_physical_pars_fragment:ag,lights_fragment_begin:lg,lights_fragment_maps:cg,lights_fragment_end:ug,logdepthbuf_fragment:fg,logdepthbuf_pars_fragment:hg,logdepthbuf_pars_vertex:dg,logdepthbuf_vertex:pg,map_fragment:mg,map_pars_fragment:_g,map_particle_fragment:gg,map_particle_pars_fragment:vg,metalnessmap_fragment:xg,metalnessmap_pars_fragment:Mg,morphinstance_vertex:Sg,morphcolor_vertex:Eg,morphnormal_vertex:yg,morphtarget_pars_vertex:Tg,morphtarget_vertex:bg,normal_fragment_begin:Ag,normal_fragment_maps:wg,normal_pars_fragment:Rg,normal_pars_vertex:Cg,normal_vertex:Pg,normalmap_pars_fragment:Dg,clearcoat_normal_fragment_begin:Lg,clearcoat_normal_fragment_maps:Ig,clearcoat_pars_fragment:Ug,iridescence_pars_fragment:Ng,opaque_fragment:Fg,packing:Og,premultiplied_alpha_fragment:Bg,project_vertex:zg,dithering_fragment:Hg,dithering_pars_fragment:Vg,roughnessmap_fragment:Gg,roughnessmap_pars_fragment:kg,shadowmap_pars_fragment:Wg,shadowmap_pars_vertex:Xg,shadowmap_vertex:qg,shadowmask_pars_fragment:Yg,skinbase_vertex:$g,skinning_pars_vertex:Kg,skinning_vertex:jg,skinnormal_vertex:Zg,specularmap_fragment:Jg,specularmap_pars_fragment:Qg,tonemapping_fragment:ev,tonemapping_pars_fragment:tv,transmission_fragment:nv,transmission_pars_fragment:iv,uv_pars_fragment:rv,uv_pars_vertex:sv,uv_vertex:ov,worldpos_vertex:av,background_vert:lv,background_frag:cv,backgroundCube_vert:uv,backgroundCube_frag:fv,cube_vert:hv,cube_frag:dv,depth_vert:pv,depth_frag:mv,distanceRGBA_vert:_v,distanceRGBA_frag:gv,equirect_vert:vv,equirect_frag:xv,linedashed_vert:Mv,linedashed_frag:Sv,meshbasic_vert:Ev,meshbasic_frag:yv,meshlambert_vert:Tv,meshlambert_frag:bv,meshmatcap_vert:Av,meshmatcap_frag:wv,meshnormal_vert:Rv,meshnormal_frag:Cv,meshphong_vert:Pv,meshphong_frag:Dv,meshphysical_vert:Lv,meshphysical_frag:Iv,meshtoon_vert:Uv,meshtoon_frag:Nv,points_vert:Fv,points_frag:Ov,shadow_vert:Bv,shadow_frag:zv,sprite_vert:Hv,sprite_frag:Vv},_e={common:{diffuse:{value:new je(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ge},alphaMap:{value:null},alphaMapTransform:{value:new Ge},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ge}},envmap:{envMap:{value:null},envMapRotation:{value:new Ge},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ge}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ge}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ge},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ge},normalScale:{value:new Ye(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ge},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ge}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ge}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ge}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new je(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new je(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ge},alphaTest:{value:0},uvTransform:{value:new Ge}},sprite:{diffuse:{value:new je(16777215)},opacity:{value:1},center:{value:new Ye(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ge},alphaMap:{value:null},alphaMapTransform:{value:new Ge},alphaTest:{value:0}}},pn={basic:{uniforms:Pt([_e.common,_e.specularmap,_e.envmap,_e.aomap,_e.lightmap,_e.fog]),vertexShader:We.meshbasic_vert,fragmentShader:We.meshbasic_frag},lambert:{uniforms:Pt([_e.common,_e.specularmap,_e.envmap,_e.aomap,_e.lightmap,_e.emissivemap,_e.bumpmap,_e.normalmap,_e.displacementmap,_e.fog,_e.lights,{emissive:{value:new je(0)}}]),vertexShader:We.meshlambert_vert,fragmentShader:We.meshlambert_frag},phong:{uniforms:Pt([_e.common,_e.specularmap,_e.envmap,_e.aomap,_e.lightmap,_e.emissivemap,_e.bumpmap,_e.normalmap,_e.displacementmap,_e.fog,_e.lights,{emissive:{value:new je(0)},specular:{value:new je(1118481)},shininess:{value:30}}]),vertexShader:We.meshphong_vert,fragmentShader:We.meshphong_frag},standard:{uniforms:Pt([_e.common,_e.envmap,_e.aomap,_e.lightmap,_e.emissivemap,_e.bumpmap,_e.normalmap,_e.displacementmap,_e.roughnessmap,_e.metalnessmap,_e.fog,_e.lights,{emissive:{value:new je(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:We.meshphysical_vert,fragmentShader:We.meshphysical_frag},toon:{uniforms:Pt([_e.common,_e.aomap,_e.lightmap,_e.emissivemap,_e.bumpmap,_e.normalmap,_e.displacementmap,_e.gradientmap,_e.fog,_e.lights,{emissive:{value:new je(0)}}]),vertexShader:We.meshtoon_vert,fragmentShader:We.meshtoon_frag},matcap:{uniforms:Pt([_e.common,_e.bumpmap,_e.normalmap,_e.displacementmap,_e.fog,{matcap:{value:null}}]),vertexShader:We.meshmatcap_vert,fragmentShader:We.meshmatcap_frag},points:{uniforms:Pt([_e.points,_e.fog]),vertexShader:We.points_vert,fragmentShader:We.points_frag},dashed:{uniforms:Pt([_e.common,_e.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:We.linedashed_vert,fragmentShader:We.linedashed_frag},depth:{uniforms:Pt([_e.common,_e.displacementmap]),vertexShader:We.depth_vert,fragmentShader:We.depth_frag},normal:{uniforms:Pt([_e.common,_e.bumpmap,_e.normalmap,_e.displacementmap,{opacity:{value:1}}]),vertexShader:We.meshnormal_vert,fragmentShader:We.meshnormal_frag},sprite:{uniforms:Pt([_e.sprite,_e.fog]),vertexShader:We.sprite_vert,fragmentShader:We.sprite_frag},background:{uniforms:{uvTransform:{value:new Ge},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:We.background_vert,fragmentShader:We.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ge}},vertexShader:We.backgroundCube_vert,fragmentShader:We.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:We.cube_vert,fragmentShader:We.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:We.equirect_vert,fragmentShader:We.equirect_frag},distanceRGBA:{uniforms:Pt([_e.common,_e.displacementmap,{referencePosition:{value:new H},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:We.distanceRGBA_vert,fragmentShader:We.distanceRGBA_frag},shadow:{uniforms:Pt([_e.lights,_e.fog,{color:{value:new je(0)},opacity:{value:1}}]),vertexShader:We.shadow_vert,fragmentShader:We.shadow_frag}};pn.physical={uniforms:Pt([pn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ge},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ge},clearcoatNormalScale:{value:new Ye(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ge},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ge},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ge},sheen:{value:0},sheenColor:{value:new je(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ge},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ge},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ge},transmissionSamplerSize:{value:new Ye},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ge},attenuationDistance:{value:0},attenuationColor:{value:new je(0)},specularColor:{value:new je(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ge},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ge},anisotropyVector:{value:new Ye},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ge}}]),vertexShader:We.meshphysical_vert,fragmentShader:We.meshphysical_frag};const Ms={r:0,b:0,g:0},pi=new kn,Gv=new mt;function kv(n,e,t,i,r,s,o){const a=new je(0);let l=s===!0?0:1,c,u,f=null,d=0,p=null;function v(b){let E=b.isScene===!0?b.background:null;return E&&E.isTexture&&(E=(b.backgroundBlurriness>0?t:e).get(E)),E}function M(b){let E=!1;const R=v(b);R===null?h(a,l):R&&R.isColor&&(h(R,1),E=!0);const C=n.xr.getEnvironmentBlendMode();C==="additive"?i.buffers.color.setClear(0,0,0,1,o):C==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,o),(n.autoClear||E)&&(i.buffers.depth.setTest(!0),i.buffers.depth.setMask(!0),i.buffers.color.setMask(!0),n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil))}function m(b,E){const R=v(E);R&&(R.isCubeTexture||R.mapping===Zs)?(u===void 0&&(u=new rn(new Yr(1,1,1),new ln({name:"BackgroundCubeMaterial",uniforms:sr(pn.backgroundCube.uniforms),vertexShader:pn.backgroundCube.vertexShader,fragmentShader:pn.backgroundCube.fragmentShader,side:It,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),u.geometry.deleteAttribute("normal"),u.geometry.deleteAttribute("uv"),u.onBeforeRender=function(C,P,B){this.matrixWorld.copyPosition(B.matrixWorld)},Object.defineProperty(u.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(u)),pi.copy(E.backgroundRotation),pi.x*=-1,pi.y*=-1,pi.z*=-1,R.isCubeTexture&&R.isRenderTargetTexture===!1&&(pi.y*=-1,pi.z*=-1),u.material.uniforms.envMap.value=R,u.material.uniforms.flipEnvMap.value=R.isCubeTexture&&R.isRenderTargetTexture===!1?-1:1,u.material.uniforms.backgroundBlurriness.value=E.backgroundBlurriness,u.material.uniforms.backgroundIntensity.value=E.backgroundIntensity,u.material.uniforms.backgroundRotation.value.setFromMatrix4(Gv.makeRotationFromEuler(pi)),u.material.toneMapped=Qe.getTransfer(R.colorSpace)!==st,(f!==R||d!==R.version||p!==n.toneMapping)&&(u.material.needsUpdate=!0,f=R,d=R.version,p=n.toneMapping),u.layers.enableAll(),b.unshift(u,u.geometry,u.material,0,0,null)):R&&R.isTexture&&(c===void 0&&(c=new rn(new Qs(2,2),new ln({name:"BackgroundMaterial",uniforms:sr(pn.background.uniforms),vertexShader:pn.background.vertexShader,fragmentShader:pn.background.fragmentShader,side:si,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=R,c.material.uniforms.backgroundIntensity.value=E.backgroundIntensity,c.material.toneMapped=Qe.getTransfer(R.colorSpace)!==st,R.matrixAutoUpdate===!0&&R.updateMatrix(),c.material.uniforms.uvTransform.value.copy(R.matrix),(f!==R||d!==R.version||p!==n.toneMapping)&&(c.material.needsUpdate=!0,f=R,d=R.version,p=n.toneMapping),c.layers.enableAll(),b.unshift(c,c.geometry,c.material,0,0,null))}function h(b,E){b.getRGB(Ms,Hf(n)),i.buffers.color.setClear(Ms.r,Ms.g,Ms.b,E,o)}function w(){u!==void 0&&(u.geometry.dispose(),u.material.dispose(),u=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return a},setClearColor:function(b,E=1){a.set(b),l=E,h(a,l)},getClearAlpha:function(){return l},setClearAlpha:function(b){l=b,h(a,l)},render:M,addToRenderList:m,dispose:w}}function Wv(n,e){const t=n.getParameter(n.MAX_VERTEX_ATTRIBS),i={},r=d(null);let s=r,o=!1;function a(y,L,X,Z,se){let ie=!1;const j=f(Z,X,L);s!==j&&(s=j,c(s.object)),ie=p(y,Z,X,se),ie&&v(y,Z,X,se),se!==null&&e.update(se,n.ELEMENT_ARRAY_BUFFER),(ie||o)&&(o=!1,E(y,L,X,Z),se!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,e.get(se).buffer))}function l(){return n.createVertexArray()}function c(y){return n.bindVertexArray(y)}function u(y){return n.deleteVertexArray(y)}function f(y,L,X){const Z=X.wireframe===!0;let se=i[y.id];se===void 0&&(se={},i[y.id]=se);let ie=se[L.id];ie===void 0&&(ie={},se[L.id]=ie);let j=ie[Z];return j===void 0&&(j=d(l()),ie[Z]=j),j}function d(y){const L=[],X=[],Z=[];for(let se=0;se<t;se++)L[se]=0,X[se]=0,Z[se]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:L,enabledAttributes:X,attributeDivisors:Z,object:y,attributes:{},index:null}}function p(y,L,X,Z){const se=s.attributes,ie=L.attributes;let j=0;const Q=X.getAttributes();for(const U in Q)if(Q[U].location>=0){const de=se[U];let ge=ie[U];if(ge===void 0&&(U==="instanceMatrix"&&y.instanceMatrix&&(ge=y.instanceMatrix),U==="instanceColor"&&y.instanceColor&&(ge=y.instanceColor)),de===void 0||de.attribute!==ge||ge&&de.data!==ge.data)return!0;j++}return s.attributesNum!==j||s.index!==Z}function v(y,L,X,Z){const se={},ie=L.attributes;let j=0;const Q=X.getAttributes();for(const U in Q)if(Q[U].location>=0){let de=ie[U];de===void 0&&(U==="instanceMatrix"&&y.instanceMatrix&&(de=y.instanceMatrix),U==="instanceColor"&&y.instanceColor&&(de=y.instanceColor));const ge={};ge.attribute=de,de&&de.data&&(ge.data=de.data),se[U]=ge,j++}s.attributes=se,s.attributesNum=j,s.index=Z}function M(){const y=s.newAttributes;for(let L=0,X=y.length;L<X;L++)y[L]=0}function m(y){h(y,0)}function h(y,L){const X=s.newAttributes,Z=s.enabledAttributes,se=s.attributeDivisors;X[y]=1,Z[y]===0&&(n.enableVertexAttribArray(y),Z[y]=1),se[y]!==L&&(n.vertexAttribDivisor(y,L),se[y]=L)}function w(){const y=s.newAttributes,L=s.enabledAttributes;for(let X=0,Z=L.length;X<Z;X++)L[X]!==y[X]&&(n.disableVertexAttribArray(X),L[X]=0)}function b(y,L,X,Z,se,ie,j){j===!0?n.vertexAttribIPointer(y,L,X,se,ie):n.vertexAttribPointer(y,L,X,Z,se,ie)}function E(y,L,X,Z){M();const se=Z.attributes,ie=X.getAttributes(),j=L.defaultAttributeValues;for(const Q in ie){const U=ie[Q];if(U.location>=0){let K=se[Q];if(K===void 0&&(Q==="instanceMatrix"&&y.instanceMatrix&&(K=y.instanceMatrix),Q==="instanceColor"&&y.instanceColor&&(K=y.instanceColor)),K!==void 0){const de=K.normalized,ge=K.itemSize,Le=e.get(K);if(Le===void 0)continue;const ke=Le.buffer,Ze=Le.type,Xe=Le.bytesPerElement,ee=Ze===n.INT||Ze===n.UNSIGNED_INT||K.gpuType===Sl;if(K.isInterleavedBufferAttribute){const oe=K.data,ye=oe.stride,Ue=K.offset;if(oe.isInstancedInterleavedBuffer){for(let we=0;we<U.locationSize;we++)h(U.location+we,oe.meshPerAttribute);y.isInstancedMesh!==!0&&Z._maxInstanceCount===void 0&&(Z._maxInstanceCount=oe.meshPerAttribute*oe.count)}else for(let we=0;we<U.locationSize;we++)m(U.location+we);n.bindBuffer(n.ARRAY_BUFFER,ke);for(let we=0;we<U.locationSize;we++)b(U.location+we,ge/U.locationSize,Ze,de,ye*Xe,(Ue+ge/U.locationSize*we)*Xe,ee)}else{if(K.isInstancedBufferAttribute){for(let oe=0;oe<U.locationSize;oe++)h(U.location+oe,K.meshPerAttribute);y.isInstancedMesh!==!0&&Z._maxInstanceCount===void 0&&(Z._maxInstanceCount=K.meshPerAttribute*K.count)}else for(let oe=0;oe<U.locationSize;oe++)m(U.location+oe);n.bindBuffer(n.ARRAY_BUFFER,ke);for(let oe=0;oe<U.locationSize;oe++)b(U.location+oe,ge/U.locationSize,Ze,de,ge*Xe,ge/U.locationSize*oe*Xe,ee)}}else if(j!==void 0){const de=j[Q];if(de!==void 0)switch(de.length){case 2:n.vertexAttrib2fv(U.location,de);break;case 3:n.vertexAttrib3fv(U.location,de);break;case 4:n.vertexAttrib4fv(U.location,de);break;default:n.vertexAttrib1fv(U.location,de)}}}}w()}function R(){B();for(const y in i){const L=i[y];for(const X in L){const Z=L[X];for(const se in Z)u(Z[se].object),delete Z[se];delete L[X]}delete i[y]}}function C(y){if(i[y.id]===void 0)return;const L=i[y.id];for(const X in L){const Z=L[X];for(const se in Z)u(Z[se].object),delete Z[se];delete L[X]}delete i[y.id]}function P(y){for(const L in i){const X=i[L];if(X[y.id]===void 0)continue;const Z=X[y.id];for(const se in Z)u(Z[se].object),delete Z[se];delete X[y.id]}}function B(){T(),o=!0,s!==r&&(s=r,c(s.object))}function T(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:a,reset:B,resetDefaultState:T,dispose:R,releaseStatesOfGeometry:C,releaseStatesOfProgram:P,initAttributes:M,enableAttribute:m,disableUnusedAttributes:w}}function Xv(n,e,t){let i;function r(c){i=c}function s(c,u){n.drawArrays(i,c,u),t.update(u,i,1)}function o(c,u,f){f!==0&&(n.drawArraysInstanced(i,c,u,f),t.update(u,i,f))}function a(c,u,f){if(f===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,c,0,u,0,f);let p=0;for(let v=0;v<f;v++)p+=u[v];t.update(p,i,1)}function l(c,u,f,d){if(f===0)return;const p=e.get("WEBGL_multi_draw");if(p===null)for(let v=0;v<c.length;v++)o(c[v],u[v],d[v]);else{p.multiDrawArraysInstancedWEBGL(i,c,0,u,0,d,0,f);let v=0;for(let M=0;M<f;M++)v+=u[M]*d[M];t.update(v,i,1)}}this.setMode=r,this.render=s,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=l}function qv(n,e,t,i){let r;function s(){if(r!==void 0)return r;if(e.has("EXT_texture_filter_anisotropic")===!0){const P=e.get("EXT_texture_filter_anisotropic");r=n.getParameter(P.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function o(P){return!(P!==nn&&i.convert(P)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(P){const B=P===Gr&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(P!==En&&i.convert(P)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE)&&P!==Bn&&!B)}function l(P){if(P==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";P="mediump"}return P==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp";const u=l(c);u!==c&&(console.warn("THREE.WebGLRenderer:",c,"not supported, using",u,"instead."),c=u);const f=t.logarithmicDepthBuffer===!0,d=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),p=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),v=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),M=n.getParameter(n.MAX_TEXTURE_SIZE),m=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),h=n.getParameter(n.MAX_VERTEX_ATTRIBS),w=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),b=n.getParameter(n.MAX_VARYING_VECTORS),E=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),R=v>0,C=n.getParameter(n.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:f,reversedDepthBuffer:d,maxTextures:p,maxVertexTextures:v,maxTextureSize:M,maxCubemapSize:m,maxAttributes:h,maxVertexUniforms:w,maxVaryings:b,maxFragmentUniforms:E,vertexTextures:R,maxSamples:C}}function Yv(n){const e=this;let t=null,i=0,r=!1,s=!1;const o=new vi,a=new Ge,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(f,d){const p=f.length!==0||d||i!==0||r;return r=d,i=f.length,p},this.beginShadows=function(){s=!0,u(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(f,d){t=u(f,d,0)},this.setState=function(f,d,p){const v=f.clippingPlanes,M=f.clipIntersection,m=f.clipShadows,h=n.get(f);if(!r||v===null||v.length===0||s&&!m)s?u(null):c();else{const w=s?0:i,b=w*4;let E=h.clippingState||null;l.value=E,E=u(v,d,b,p);for(let R=0;R!==b;++R)E[R]=t[R];h.clippingState=E,this.numIntersection=M?this.numPlanes:0,this.numPlanes+=w}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=i>0),e.numPlanes=i,e.numIntersection=0}function u(f,d,p,v){const M=f!==null?f.length:0;let m=null;if(M!==0){if(m=l.value,v!==!0||m===null){const h=p+M*4,w=d.matrixWorldInverse;a.getNormalMatrix(w),(m===null||m.length<h)&&(m=new Float32Array(h));for(let b=0,E=p;b!==M;++b,E+=4)o.copy(f[b]).applyMatrix4(w,a),o.normal.toArray(m,E),m[E+3]=o.constant}l.value=m,l.needsUpdate=!0}return e.numPlanes=M,e.numIntersection=0,m}}function $v(n){let e=new WeakMap;function t(o,a){return a===_a?o.mapping=nr:a===ga&&(o.mapping=ir),o}function i(o){if(o&&o.isTexture){const a=o.mapping;if(a===_a||a===ga)if(e.has(o)){const l=e.get(o).texture;return t(l,o.mapping)}else{const l=o.image;if(l&&l.height>0){const c=new Xm(l.height);return c.fromEquirectangularTexture(n,o),e.set(o,c),o.addEventListener("dispose",r),t(c.texture,o.mapping)}else return null}}return o}function r(o){const a=o.target;a.removeEventListener("dispose",r);const l=e.get(a);l!==void 0&&(e.delete(a),l.dispose())}function s(){e=new WeakMap}return{get:i,dispose:s}}const Xi=4,Gc=[.125,.215,.35,.446,.526,.582],Si=20,ko=new r_,kc=new je;let Wo=null,Xo=0,qo=0,Yo=!1;const xi=(1+Math.sqrt(5))/2,ki=1/xi,Wc=[new H(-xi,ki,0),new H(xi,ki,0),new H(-ki,0,xi),new H(ki,0,xi),new H(0,xi,-ki),new H(0,xi,ki),new H(-1,1,-1),new H(1,1,-1),new H(-1,1,1),new H(1,1,1)],Kv=new H;class Xc{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,i=.1,r=100,s={}){const{size:o=256,position:a=Kv}=s;Wo=this._renderer.getRenderTarget(),Xo=this._renderer.getActiveCubeFace(),qo=this._renderer.getActiveMipmapLevel(),Yo=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,i,r,l,a),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=$c(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Yc(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(Wo,Xo,qo),this._renderer.xr.enabled=Yo,e.scissorTest=!1,Ss(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===nr||e.mapping===ir?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Wo=this._renderer.getRenderTarget(),Xo=this._renderer.getActiveCubeFace(),qo=this._renderer.getActiveMipmapLevel(),Yo=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=t||this._allocateTargets();return this._textureToCubeUV(e,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:_n,minFilter:_n,generateMipmaps:!1,type:Gr,format:nn,colorSpace:rr,depthBuffer:!1},r=qc(e,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=qc(e,t,i);const{_lodMax:s}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=jv(s)),this._blurMaterial=Zv(s,e,t)}return r}_compileMaterial(e){const t=new rn(this._lodPlanes[0],e);this._renderer.compile(t,ko)}_sceneToCubeUV(e,t,i,r,s){const l=new Wt(90,1,t,i),c=[1,-1,1,1,1,1],u=[1,1,1,-1,-1,-1],f=this._renderer,d=f.autoClear,p=f.toneMapping;f.getClearColor(kc),f.toneMapping=ii,f.autoClear=!1,f.state.buffers.depth.getReversed()&&(f.setRenderTarget(r),f.clearDepth(),f.setRenderTarget(null));const M=new Of({name:"PMREM.Background",side:It,depthWrite:!1,depthTest:!1}),m=new rn(new Yr,M);let h=!1;const w=e.background;w?w.isColor&&(M.color.copy(w),e.background=null,h=!0):(M.color.copy(kc),h=!0);for(let b=0;b<6;b++){const E=b%3;E===0?(l.up.set(0,c[b],0),l.position.set(s.x,s.y,s.z),l.lookAt(s.x+u[b],s.y,s.z)):E===1?(l.up.set(0,0,c[b]),l.position.set(s.x,s.y,s.z),l.lookAt(s.x,s.y+u[b],s.z)):(l.up.set(0,c[b],0),l.position.set(s.x,s.y,s.z),l.lookAt(s.x,s.y,s.z+u[b]));const R=this._cubeSize;Ss(r,E*R,b>2?R:0,R,R),f.setRenderTarget(r),h&&f.render(m,l),f.render(e,l)}m.geometry.dispose(),m.material.dispose(),f.toneMapping=p,f.autoClear=d,e.background=w}_textureToCubeUV(e,t){const i=this._renderer,r=e.mapping===nr||e.mapping===ir;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=$c()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Yc());const s=r?this._cubemapMaterial:this._equirectMaterial,o=new rn(this._lodPlanes[0],s),a=s.uniforms;a.envMap.value=e;const l=this._cubeSize;Ss(t,0,0,3*l,2*l),i.setRenderTarget(t),i.render(o,ko)}_applyPMREM(e){const t=this._renderer,i=t.autoClear;t.autoClear=!1;const r=this._lodPlanes.length;for(let s=1;s<r;s++){const o=Math.sqrt(this._sigmas[s]*this._sigmas[s]-this._sigmas[s-1]*this._sigmas[s-1]),a=Wc[(r-s-1)%Wc.length];this._blur(e,s-1,s,o,a)}t.autoClear=i}_blur(e,t,i,r,s){const o=this._pingPongRenderTarget;this._halfBlur(e,o,t,i,r,"latitudinal",s),this._halfBlur(o,e,i,i,r,"longitudinal",s)}_halfBlur(e,t,i,r,s,o,a){const l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const u=3,f=new rn(this._lodPlanes[r],c),d=c.uniforms,p=this._sizeLods[i]-1,v=isFinite(s)?Math.PI/(2*p):2*Math.PI/(2*Si-1),M=s/v,m=isFinite(s)?1+Math.floor(u*M):Si;m>Si&&console.warn(`sigmaRadians, ${s}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${Si}`);const h=[];let w=0;for(let P=0;P<Si;++P){const B=P/M,T=Math.exp(-B*B/2);h.push(T),P===0?w+=T:P<m&&(w+=2*T)}for(let P=0;P<h.length;P++)h[P]=h[P]/w;d.envMap.value=e.texture,d.samples.value=m,d.weights.value=h,d.latitudinal.value=o==="latitudinal",a&&(d.poleAxis.value=a);const{_lodMax:b}=this;d.dTheta.value=v,d.mipInt.value=b-i;const E=this._sizeLods[r],R=3*E*(r>b-Xi?r-b+Xi:0),C=4*(this._cubeSize-E);Ss(t,R,C,3*E,2*E),l.setRenderTarget(t),l.render(f,ko)}}function jv(n){const e=[],t=[],i=[];let r=n;const s=n-Xi+1+Gc.length;for(let o=0;o<s;o++){const a=Math.pow(2,r);t.push(a);let l=1/a;o>n-Xi?l=Gc[o-n+Xi-1]:o===0&&(l=0),i.push(l);const c=1/(a-2),u=-c,f=1+c,d=[u,u,f,u,f,f,u,u,f,f,u,f],p=6,v=6,M=3,m=2,h=1,w=new Float32Array(M*v*p),b=new Float32Array(m*v*p),E=new Float32Array(h*v*p);for(let C=0;C<p;C++){const P=C%3*2/3-1,B=C>2?0:-1,T=[P,B,0,P+2/3,B,0,P+2/3,B+1,0,P,B,0,P+2/3,B+1,0,P,B+1,0];w.set(T,M*v*C),b.set(d,m*v*C);const y=[C,C,C,C,C,C];E.set(y,h*v*C)}const R=new yn;R.setAttribute("position",new qt(w,M)),R.setAttribute("uv",new qt(b,m)),R.setAttribute("faceIndex",new qt(E,h)),e.push(R),r>Xi&&r--}return{lodPlanes:e,sizeLods:t,sigmas:i}}function qc(n,e,t){const i=new Ai(n,e,t);return i.texture.mapping=Zs,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function Ss(n,e,t,i,r){n.viewport.set(e,t,i,r),n.scissor.set(e,t,i,r)}function Zv(n,e,t){const i=new Float32Array(Si),r=new H(0,1,0);return new ln({name:"SphericalGaussianBlur",defines:{n:Si,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:Cl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:ni,depthTest:!1,depthWrite:!1})}function Yc(){return new ln({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Cl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:ni,depthTest:!1,depthWrite:!1})}function $c(){return new ln({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Cl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:ni,depthTest:!1,depthWrite:!1})}function Cl(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function Jv(n){let e=new WeakMap,t=null;function i(a){if(a&&a.isTexture){const l=a.mapping,c=l===_a||l===ga,u=l===nr||l===ir;if(c||u){let f=e.get(a);const d=f!==void 0?f.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==d)return t===null&&(t=new Xc(n)),f=c?t.fromEquirectangular(a,f):t.fromCubemap(a,f),f.texture.pmremVersion=a.pmremVersion,e.set(a,f),f.texture;if(f!==void 0)return f.texture;{const p=a.image;return c&&p&&p.height>0||u&&p&&r(p)?(t===null&&(t=new Xc(n)),f=c?t.fromEquirectangular(a):t.fromCubemap(a),f.texture.pmremVersion=a.pmremVersion,e.set(a,f),a.addEventListener("dispose",s),f.texture):null}}}return a}function r(a){let l=0;const c=6;for(let u=0;u<c;u++)a[u]!==void 0&&l++;return l===c}function s(a){const l=a.target;l.removeEventListener("dispose",s);const c=e.get(l);c!==void 0&&(e.delete(l),c.dispose())}function o(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:i,dispose:o}}function Qv(n){const e={};function t(i){if(e[i]!==void 0)return e[i];let r;switch(i){case"WEBGL_depth_texture":r=n.getExtension("WEBGL_depth_texture")||n.getExtension("MOZ_WEBGL_depth_texture")||n.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":r=n.getExtension("EXT_texture_filter_anisotropic")||n.getExtension("MOZ_EXT_texture_filter_anisotropic")||n.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":r=n.getExtension("WEBGL_compressed_texture_s3tc")||n.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":r=n.getExtension("WEBGL_compressed_texture_pvrtc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:r=n.getExtension(i)}return e[i]=r,r}return{has:function(i){return t(i)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(i){const r=t(i);return r===null&&Br("THREE.WebGLRenderer: "+i+" extension not supported."),r}}}function e0(n,e,t,i){const r={},s=new WeakMap;function o(f){const d=f.target;d.index!==null&&e.remove(d.index);for(const v in d.attributes)e.remove(d.attributes[v]);d.removeEventListener("dispose",o),delete r[d.id];const p=s.get(d);p&&(e.remove(p),s.delete(d)),i.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,t.memory.geometries--}function a(f,d){return r[d.id]===!0||(d.addEventListener("dispose",o),r[d.id]=!0,t.memory.geometries++),d}function l(f){const d=f.attributes;for(const p in d)e.update(d[p],n.ARRAY_BUFFER)}function c(f){const d=[],p=f.index,v=f.attributes.position;let M=0;if(p!==null){const w=p.array;M=p.version;for(let b=0,E=w.length;b<E;b+=3){const R=w[b+0],C=w[b+1],P=w[b+2];d.push(R,C,C,P,P,R)}}else if(v!==void 0){const w=v.array;M=v.version;for(let b=0,E=w.length/3-1;b<E;b+=3){const R=b+0,C=b+1,P=b+2;d.push(R,C,C,P,P,R)}}else return;const m=new(Lf(d)?zf:Bf)(d,1);m.version=M;const h=s.get(f);h&&e.remove(h),s.set(f,m)}function u(f){const d=s.get(f);if(d){const p=f.index;p!==null&&d.version<p.version&&c(f)}else c(f);return s.get(f)}return{get:a,update:l,getWireframeAttribute:u}}function t0(n,e,t){let i;function r(d){i=d}let s,o;function a(d){s=d.type,o=d.bytesPerElement}function l(d,p){n.drawElements(i,p,s,d*o),t.update(p,i,1)}function c(d,p,v){v!==0&&(n.drawElementsInstanced(i,p,s,d*o,v),t.update(p,i,v))}function u(d,p,v){if(v===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,p,0,s,d,0,v);let m=0;for(let h=0;h<v;h++)m+=p[h];t.update(m,i,1)}function f(d,p,v,M){if(v===0)return;const m=e.get("WEBGL_multi_draw");if(m===null)for(let h=0;h<d.length;h++)c(d[h]/o,p[h],M[h]);else{m.multiDrawElementsInstancedWEBGL(i,p,0,s,d,0,M,0,v);let h=0;for(let w=0;w<v;w++)h+=p[w]*M[w];t.update(h,i,1)}}this.setMode=r,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=u,this.renderMultiDrawInstances=f}function n0(n){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(s,o,a){switch(t.calls++,o){case n.TRIANGLES:t.triangles+=a*(s/3);break;case n.LINES:t.lines+=a*(s/2);break;case n.LINE_STRIP:t.lines+=a*(s-1);break;case n.LINE_LOOP:t.lines+=a*s;break;case n.POINTS:t.points+=a*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function r(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:r,update:i}}function i0(n,e,t){const i=new WeakMap,r=new ot;function s(o,a,l){const c=o.morphTargetInfluences,u=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,f=u!==void 0?u.length:0;let d=i.get(a);if(d===void 0||d.count!==f){let y=function(){B.dispose(),i.delete(a),a.removeEventListener("dispose",y)};var p=y;d!==void 0&&d.texture.dispose();const v=a.morphAttributes.position!==void 0,M=a.morphAttributes.normal!==void 0,m=a.morphAttributes.color!==void 0,h=a.morphAttributes.position||[],w=a.morphAttributes.normal||[],b=a.morphAttributes.color||[];let E=0;v===!0&&(E=1),M===!0&&(E=2),m===!0&&(E=3);let R=a.attributes.position.count*E,C=1;R>e.maxTextureSize&&(C=Math.ceil(R/e.maxTextureSize),R=e.maxTextureSize);const P=new Float32Array(R*C*4*f),B=new If(P,R,C,f);B.type=Bn,B.needsUpdate=!0;const T=E*4;for(let L=0;L<f;L++){const X=h[L],Z=w[L],se=b[L],ie=R*C*4*L;for(let j=0;j<X.count;j++){const Q=j*T;v===!0&&(r.fromBufferAttribute(X,j),P[ie+Q+0]=r.x,P[ie+Q+1]=r.y,P[ie+Q+2]=r.z,P[ie+Q+3]=0),M===!0&&(r.fromBufferAttribute(Z,j),P[ie+Q+4]=r.x,P[ie+Q+5]=r.y,P[ie+Q+6]=r.z,P[ie+Q+7]=0),m===!0&&(r.fromBufferAttribute(se,j),P[ie+Q+8]=r.x,P[ie+Q+9]=r.y,P[ie+Q+10]=r.z,P[ie+Q+11]=se.itemSize===4?r.w:1)}}d={count:f,texture:B,size:new Ye(R,C)},i.set(a,d),a.addEventListener("dispose",y)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(n,"morphTexture",o.morphTexture,t);else{let v=0;for(let m=0;m<c.length;m++)v+=c[m];const M=a.morphTargetsRelative?1:1-v;l.getUniforms().setValue(n,"morphTargetBaseInfluence",M),l.getUniforms().setValue(n,"morphTargetInfluences",c)}l.getUniforms().setValue(n,"morphTargetsTexture",d.texture,t),l.getUniforms().setValue(n,"morphTargetsTextureSize",d.size)}return{update:s}}function r0(n,e,t,i){let r=new WeakMap;function s(l){const c=i.render.frame,u=l.geometry,f=e.get(l,u);if(r.get(f)!==c&&(e.update(f),r.set(f,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",a)===!1&&l.addEventListener("dispose",a),r.get(l)!==c&&(t.update(l.instanceMatrix,n.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,n.ARRAY_BUFFER),r.set(l,c))),l.isSkinnedMesh){const d=l.skeleton;r.get(d)!==c&&(d.update(),r.set(d,c))}return f}function o(){r=new WeakMap}function a(l){const c=l.target;c.removeEventListener("dispose",a),t.remove(c.instanceMatrix),c.instanceColor!==null&&t.remove(c.instanceColor)}return{update:s,dispose:o}}const Yf=new zt,Kc=new kf(1,1),$f=new If,Kf=new Rm,jf=new Gf,jc=[],Zc=[],Jc=new Float32Array(16),Qc=new Float32Array(9),eu=new Float32Array(4);function ar(n,e,t){const i=n[0];if(i<=0||i>0)return n;const r=e*t;let s=jc[r];if(s===void 0&&(s=new Float32Array(r),jc[r]=s),e!==0){i.toArray(s,0);for(let o=1,a=0;o!==e;++o)a+=t,n[o].toArray(s,a)}return s}function xt(n,e){if(n.length!==e.length)return!1;for(let t=0,i=n.length;t<i;t++)if(n[t]!==e[t])return!1;return!0}function Mt(n,e){for(let t=0,i=e.length;t<i;t++)n[t]=e[t]}function eo(n,e){let t=Zc[e];t===void 0&&(t=new Int32Array(e),Zc[e]=t);for(let i=0;i!==e;++i)t[i]=n.allocateTextureUnit();return t}function s0(n,e){const t=this.cache;t[0]!==e&&(n.uniform1f(this.addr,e),t[0]=e)}function o0(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(xt(t,e))return;n.uniform2fv(this.addr,e),Mt(t,e)}}function a0(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(n.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(xt(t,e))return;n.uniform3fv(this.addr,e),Mt(t,e)}}function l0(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(xt(t,e))return;n.uniform4fv(this.addr,e),Mt(t,e)}}function c0(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(xt(t,e))return;n.uniformMatrix2fv(this.addr,!1,e),Mt(t,e)}else{if(xt(t,i))return;eu.set(i),n.uniformMatrix2fv(this.addr,!1,eu),Mt(t,i)}}function u0(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(xt(t,e))return;n.uniformMatrix3fv(this.addr,!1,e),Mt(t,e)}else{if(xt(t,i))return;Qc.set(i),n.uniformMatrix3fv(this.addr,!1,Qc),Mt(t,i)}}function f0(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(xt(t,e))return;n.uniformMatrix4fv(this.addr,!1,e),Mt(t,e)}else{if(xt(t,i))return;Jc.set(i),n.uniformMatrix4fv(this.addr,!1,Jc),Mt(t,i)}}function h0(n,e){const t=this.cache;t[0]!==e&&(n.uniform1i(this.addr,e),t[0]=e)}function d0(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(xt(t,e))return;n.uniform2iv(this.addr,e),Mt(t,e)}}function p0(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(xt(t,e))return;n.uniform3iv(this.addr,e),Mt(t,e)}}function m0(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(xt(t,e))return;n.uniform4iv(this.addr,e),Mt(t,e)}}function _0(n,e){const t=this.cache;t[0]!==e&&(n.uniform1ui(this.addr,e),t[0]=e)}function g0(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(xt(t,e))return;n.uniform2uiv(this.addr,e),Mt(t,e)}}function v0(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(xt(t,e))return;n.uniform3uiv(this.addr,e),Mt(t,e)}}function x0(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(xt(t,e))return;n.uniform4uiv(this.addr,e),Mt(t,e)}}function M0(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r);let s;this.type===n.SAMPLER_2D_SHADOW?(Kc.compareFunction=Df,s=Kc):s=Yf,t.setTexture2D(e||s,r)}function S0(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTexture3D(e||Kf,r)}function E0(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTextureCube(e||jf,r)}function y0(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTexture2DArray(e||$f,r)}function T0(n){switch(n){case 5126:return s0;case 35664:return o0;case 35665:return a0;case 35666:return l0;case 35674:return c0;case 35675:return u0;case 35676:return f0;case 5124:case 35670:return h0;case 35667:case 35671:return d0;case 35668:case 35672:return p0;case 35669:case 35673:return m0;case 5125:return _0;case 36294:return g0;case 36295:return v0;case 36296:return x0;case 35678:case 36198:case 36298:case 36306:case 35682:return M0;case 35679:case 36299:case 36307:return S0;case 35680:case 36300:case 36308:case 36293:return E0;case 36289:case 36303:case 36311:case 36292:return y0}}function b0(n,e){n.uniform1fv(this.addr,e)}function A0(n,e){const t=ar(e,this.size,2);n.uniform2fv(this.addr,t)}function w0(n,e){const t=ar(e,this.size,3);n.uniform3fv(this.addr,t)}function R0(n,e){const t=ar(e,this.size,4);n.uniform4fv(this.addr,t)}function C0(n,e){const t=ar(e,this.size,4);n.uniformMatrix2fv(this.addr,!1,t)}function P0(n,e){const t=ar(e,this.size,9);n.uniformMatrix3fv(this.addr,!1,t)}function D0(n,e){const t=ar(e,this.size,16);n.uniformMatrix4fv(this.addr,!1,t)}function L0(n,e){n.uniform1iv(this.addr,e)}function I0(n,e){n.uniform2iv(this.addr,e)}function U0(n,e){n.uniform3iv(this.addr,e)}function N0(n,e){n.uniform4iv(this.addr,e)}function F0(n,e){n.uniform1uiv(this.addr,e)}function O0(n,e){n.uniform2uiv(this.addr,e)}function B0(n,e){n.uniform3uiv(this.addr,e)}function z0(n,e){n.uniform4uiv(this.addr,e)}function H0(n,e,t){const i=this.cache,r=e.length,s=eo(t,r);xt(i,s)||(n.uniform1iv(this.addr,s),Mt(i,s));for(let o=0;o!==r;++o)t.setTexture2D(e[o]||Yf,s[o])}function V0(n,e,t){const i=this.cache,r=e.length,s=eo(t,r);xt(i,s)||(n.uniform1iv(this.addr,s),Mt(i,s));for(let o=0;o!==r;++o)t.setTexture3D(e[o]||Kf,s[o])}function G0(n,e,t){const i=this.cache,r=e.length,s=eo(t,r);xt(i,s)||(n.uniform1iv(this.addr,s),Mt(i,s));for(let o=0;o!==r;++o)t.setTextureCube(e[o]||jf,s[o])}function k0(n,e,t){const i=this.cache,r=e.length,s=eo(t,r);xt(i,s)||(n.uniform1iv(this.addr,s),Mt(i,s));for(let o=0;o!==r;++o)t.setTexture2DArray(e[o]||$f,s[o])}function W0(n){switch(n){case 5126:return b0;case 35664:return A0;case 35665:return w0;case 35666:return R0;case 35674:return C0;case 35675:return P0;case 35676:return D0;case 5124:case 35670:return L0;case 35667:case 35671:return I0;case 35668:case 35672:return U0;case 35669:case 35673:return N0;case 5125:return F0;case 36294:return O0;case 36295:return B0;case 36296:return z0;case 35678:case 36198:case 36298:case 36306:case 35682:return H0;case 35679:case 36299:case 36307:return V0;case 35680:case 36300:case 36308:case 36293:return G0;case 36289:case 36303:case 36311:case 36292:return k0}}class X0{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.setValue=T0(t.type)}}class q0{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=W0(t.type)}}class Y0{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,i){const r=this.seq;for(let s=0,o=r.length;s!==o;++s){const a=r[s];a.setValue(e,t[a.id],i)}}}const $o=/(\w+)(\])?(\[|\.)?/g;function tu(n,e){n.seq.push(e),n.map[e.id]=e}function $0(n,e,t){const i=n.name,r=i.length;for($o.lastIndex=0;;){const s=$o.exec(i),o=$o.lastIndex;let a=s[1];const l=s[2]==="]",c=s[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===r){tu(t,c===void 0?new X0(a,n,e):new q0(a,n,e));break}else{let f=t.map[a];f===void 0&&(f=new Y0(a),tu(t,f)),t=f}}}class Ps{constructor(e,t){this.seq=[],this.map={};const i=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<i;++r){const s=e.getActiveUniform(t,r),o=e.getUniformLocation(t,s.name);$0(s,o,this)}}setValue(e,t,i,r){const s=this.map[t];s!==void 0&&s.setValue(e,i,r)}setOptional(e,t,i){const r=t[i];r!==void 0&&this.setValue(e,i,r)}static upload(e,t,i,r){for(let s=0,o=t.length;s!==o;++s){const a=t[s],l=i[a.id];l.needsUpdate!==!1&&a.setValue(e,l.value,r)}}static seqWithValue(e,t){const i=[];for(let r=0,s=e.length;r!==s;++r){const o=e[r];o.id in t&&i.push(o)}return i}}function nu(n,e,t){const i=n.createShader(e);return n.shaderSource(i,t),n.compileShader(i),i}const K0=37297;let j0=0;function Z0(n,e){const t=n.split(`
`),i=[],r=Math.max(e-6,0),s=Math.min(e+6,t.length);for(let o=r;o<s;o++){const a=o+1;i.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return i.join(`
`)}const iu=new Ge;function J0(n){Qe._getMatrix(iu,Qe.workingColorSpace,n);const e=`mat3( ${iu.elements.map(t=>t.toFixed(4))} )`;switch(Qe.getTransfer(n)){case Bs:return[e,"LinearTransferOETF"];case st:return[e,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",n),[e,"LinearTransferOETF"]}}function ru(n,e,t){const i=n.getShaderParameter(e,n.COMPILE_STATUS),s=(n.getShaderInfoLog(e)||"").trim();if(i&&s==="")return"";const o=/ERROR: 0:(\d+)/.exec(s);if(o){const a=parseInt(o[1]);return t.toUpperCase()+`

`+s+`

`+Z0(n.getShaderSource(e),a)}else return s}function Q0(n,e){const t=J0(e);return[`vec4 ${n}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function ex(n,e){let t;switch(e){case tm:t="Linear";break;case nm:t="Reinhard";break;case im:t="Cineon";break;case rm:t="ACESFilmic";break;case om:t="AgX";break;case am:t="Neutral";break;case sm:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+n+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const Es=new H;function tx(){Qe.getLuminanceCoefficients(Es);const n=Es.x.toFixed(4),e=Es.y.toFixed(4),t=Es.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${n}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function nx(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",n.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(vr).join(`
`)}function ix(n){const e=[];for(const t in n){const i=n[t];i!==!1&&e.push("#define "+t+" "+i)}return e.join(`
`)}function rx(n,e){const t={},i=n.getProgramParameter(e,n.ACTIVE_ATTRIBUTES);for(let r=0;r<i;r++){const s=n.getActiveAttrib(e,r),o=s.name;let a=1;s.type===n.FLOAT_MAT2&&(a=2),s.type===n.FLOAT_MAT3&&(a=3),s.type===n.FLOAT_MAT4&&(a=4),t[o]={type:s.type,location:n.getAttribLocation(e,o),locationSize:a}}return t}function vr(n){return n!==""}function su(n,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return n.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function ou(n,e){return n.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const sx=/^[ \t]*#include +<([\w\d./]+)>/gm;function ja(n){return n.replace(sx,ax)}const ox=new Map;function ax(n,e){let t=We[e];if(t===void 0){const i=ox.get(e);if(i!==void 0)t=We[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,i);else throw new Error("Can not resolve #include <"+e+">")}return ja(t)}const lx=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function au(n){return n.replace(lx,cx)}function cx(n,e,t,i){let r="";for(let s=parseInt(e);s<parseInt(t);s++)r+=i.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function lu(n){let e=`precision ${n.precision} float;
	precision ${n.precision} int;
	precision ${n.precision} sampler2D;
	precision ${n.precision} samplerCube;
	precision ${n.precision} sampler3D;
	precision ${n.precision} sampler2DArray;
	precision ${n.precision} sampler2DShadow;
	precision ${n.precision} samplerCubeShadow;
	precision ${n.precision} sampler2DArrayShadow;
	precision ${n.precision} isampler2D;
	precision ${n.precision} isampler3D;
	precision ${n.precision} isamplerCube;
	precision ${n.precision} isampler2DArray;
	precision ${n.precision} usampler2D;
	precision ${n.precision} usampler3D;
	precision ${n.precision} usamplerCube;
	precision ${n.precision} usampler2DArray;
	`;return n.precision==="highp"?e+=`
#define HIGH_PRECISION`:n.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:n.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function ux(n){let e="SHADOWMAP_TYPE_BASIC";return n.shadowMapType===Mf?e="SHADOWMAP_TYPE_PCF":n.shadowMapType===Up?e="SHADOWMAP_TYPE_PCF_SOFT":n.shadowMapType===Ln&&(e="SHADOWMAP_TYPE_VSM"),e}function fx(n){let e="ENVMAP_TYPE_CUBE";if(n.envMap)switch(n.envMapMode){case nr:case ir:e="ENVMAP_TYPE_CUBE";break;case Zs:e="ENVMAP_TYPE_CUBE_UV";break}return e}function hx(n){let e="ENVMAP_MODE_REFLECTION";return n.envMap&&n.envMapMode===ir&&(e="ENVMAP_MODE_REFRACTION"),e}function dx(n){let e="ENVMAP_BLENDING_NONE";if(n.envMap)switch(n.combine){case Sf:e="ENVMAP_BLENDING_MULTIPLY";break;case Qp:e="ENVMAP_BLENDING_MIX";break;case em:e="ENVMAP_BLENDING_ADD";break}return e}function px(n){const e=n.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,i=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:i,maxMip:t}}function mx(n,e,t,i){const r=n.getContext(),s=t.defines;let o=t.vertexShader,a=t.fragmentShader;const l=ux(t),c=fx(t),u=hx(t),f=dx(t),d=px(t),p=nx(t),v=ix(s),M=r.createProgram();let m,h,w=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,v].filter(vr).join(`
`),m.length>0&&(m+=`
`),h=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,v].filter(vr).join(`
`),h.length>0&&(h+=`
`)):(m=[lu(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,v,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(vr).join(`
`),h=[lu(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,v,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+u:"",t.envMap?"#define "+f:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==ii?"#define TONE_MAPPING":"",t.toneMapping!==ii?We.tonemapping_pars_fragment:"",t.toneMapping!==ii?ex("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",We.colorspace_pars_fragment,Q0("linearToOutputTexel",t.outputColorSpace),tx(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(vr).join(`
`)),o=ja(o),o=su(o,t),o=ou(o,t),a=ja(a),a=su(a,t),a=ou(a,t),o=au(o),a=au(a),t.isRawShaderMaterial!==!0&&(w=`#version 300 es
`,m=[p,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,h=["#define varying in",t.glslVersion===vc?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===vc?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+h);const b=w+m+o,E=w+h+a,R=nu(r,r.VERTEX_SHADER,b),C=nu(r,r.FRAGMENT_SHADER,E);r.attachShader(M,R),r.attachShader(M,C),t.index0AttributeName!==void 0?r.bindAttribLocation(M,0,t.index0AttributeName):t.morphTargets===!0&&r.bindAttribLocation(M,0,"position"),r.linkProgram(M);function P(L){if(n.debug.checkShaderErrors){const X=r.getProgramInfoLog(M)||"",Z=r.getShaderInfoLog(R)||"",se=r.getShaderInfoLog(C)||"",ie=X.trim(),j=Z.trim(),Q=se.trim();let U=!0,K=!0;if(r.getProgramParameter(M,r.LINK_STATUS)===!1)if(U=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(r,M,R,C);else{const de=ru(r,R,"vertex"),ge=ru(r,C,"fragment");console.error("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(M,r.VALIDATE_STATUS)+`

Material Name: `+L.name+`
Material Type: `+L.type+`

Program Info Log: `+ie+`
`+de+`
`+ge)}else ie!==""?console.warn("THREE.WebGLProgram: Program Info Log:",ie):(j===""||Q==="")&&(K=!1);K&&(L.diagnostics={runnable:U,programLog:ie,vertexShader:{log:j,prefix:m},fragmentShader:{log:Q,prefix:h}})}r.deleteShader(R),r.deleteShader(C),B=new Ps(r,M),T=rx(r,M)}let B;this.getUniforms=function(){return B===void 0&&P(this),B};let T;this.getAttributes=function(){return T===void 0&&P(this),T};let y=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return y===!1&&(y=r.getProgramParameter(M,K0)),y},this.destroy=function(){i.releaseStatesOfProgram(this),r.deleteProgram(M),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=j0++,this.cacheKey=e,this.usedTimes=1,this.program=M,this.vertexShader=R,this.fragmentShader=C,this}let _x=0;class gx{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,i=e.fragmentShader,r=this._getShaderStage(t),s=this._getShaderStage(i),o=this._getShaderCacheForMaterial(e);return o.has(r)===!1&&(o.add(r),r.usedTimes++),o.has(s)===!1&&(o.add(s),s.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let i=t.get(e);return i===void 0&&(i=new Set,t.set(e,i)),i}_getShaderStage(e){const t=this.shaderCache;let i=t.get(e);return i===void 0&&(i=new vx(e),t.set(e,i)),i}}class vx{constructor(e){this.id=_x++,this.code=e,this.usedTimes=0}}function xx(n,e,t,i,r,s,o){const a=new Nf,l=new gx,c=new Set,u=[],f=r.logarithmicDepthBuffer,d=r.vertexTextures;let p=r.precision;const v={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function M(T){return c.add(T),T===0?"uv":`uv${T}`}function m(T,y,L,X,Z){const se=X.fog,ie=Z.geometry,j=T.isMeshStandardMaterial?X.environment:null,Q=(T.isMeshStandardMaterial?t:e).get(T.envMap||j),U=Q&&Q.mapping===Zs?Q.image.height:null,K=v[T.type];T.precision!==null&&(p=r.getMaxPrecision(T.precision),p!==T.precision&&console.warn("THREE.WebGLProgram.getParameters:",T.precision,"not supported, using",p,"instead."));const de=ie.morphAttributes.position||ie.morphAttributes.normal||ie.morphAttributes.color,ge=de!==void 0?de.length:0;let Le=0;ie.morphAttributes.position!==void 0&&(Le=1),ie.morphAttributes.normal!==void 0&&(Le=2),ie.morphAttributes.color!==void 0&&(Le=3);let ke,Ze,Xe,ee;if(K){const tt=pn[K];ke=tt.vertexShader,Ze=tt.fragmentShader}else ke=T.vertexShader,Ze=T.fragmentShader,l.update(T),Xe=l.getVertexShaderID(T),ee=l.getFragmentShaderID(T);const oe=n.getRenderTarget(),ye=n.state.buffers.depth.getReversed(),Ue=Z.isInstancedMesh===!0,we=Z.isBatchedMesh===!0,qe=!!T.map,A=!!T.matcap,_=!!Q,O=!!T.aoMap,W=!!T.lightMap,k=!!T.bumpMap,z=!!T.normalMap,ae=!!T.displacementMap,$=!!T.emissiveMap,te=!!T.metalnessMap,ne=!!T.roughnessMap,xe=T.anisotropy>0,x=T.clearcoat>0,g=T.dispersion>0,D=T.iridescence>0,V=T.sheen>0,J=T.transmission>0,G=xe&&!!T.anisotropyMap,Se=x&&!!T.clearcoatMap,le=x&&!!T.clearcoatNormalMap,Ee=x&&!!T.clearcoatRoughnessMap,Te=D&&!!T.iridescenceMap,ce=D&&!!T.iridescenceThicknessMap,ve=V&&!!T.sheenColorMap,Ce=V&&!!T.sheenRoughnessMap,be=!!T.specularMap,me=!!T.specularColorMap,Be=!!T.specularIntensityMap,I=J&&!!T.transmissionMap,he=J&&!!T.thicknessMap,pe=!!T.gradientMap,Re=!!T.alphaMap,ue=T.alphaTest>0,re=!!T.alphaHash,De=!!T.extensions;let ze=ii;T.toneMapped&&(oe===null||oe.isXRRenderTarget===!0)&&(ze=n.toneMapping);const ct={shaderID:K,shaderType:T.type,shaderName:T.name,vertexShader:ke,fragmentShader:Ze,defines:T.defines,customVertexShaderID:Xe,customFragmentShaderID:ee,isRawShaderMaterial:T.isRawShaderMaterial===!0,glslVersion:T.glslVersion,precision:p,batching:we,batchingColor:we&&Z._colorsTexture!==null,instancing:Ue,instancingColor:Ue&&Z.instanceColor!==null,instancingMorph:Ue&&Z.morphTexture!==null,supportsVertexTextures:d,outputColorSpace:oe===null?n.outputColorSpace:oe.isXRRenderTarget===!0?oe.texture.colorSpace:rr,alphaToCoverage:!!T.alphaToCoverage,map:qe,matcap:A,envMap:_,envMapMode:_&&Q.mapping,envMapCubeUVHeight:U,aoMap:O,lightMap:W,bumpMap:k,normalMap:z,displacementMap:d&&ae,emissiveMap:$,normalMapObjectSpace:z&&T.normalMapType===hm,normalMapTangentSpace:z&&T.normalMapType===fm,metalnessMap:te,roughnessMap:ne,anisotropy:xe,anisotropyMap:G,clearcoat:x,clearcoatMap:Se,clearcoatNormalMap:le,clearcoatRoughnessMap:Ee,dispersion:g,iridescence:D,iridescenceMap:Te,iridescenceThicknessMap:ce,sheen:V,sheenColorMap:ve,sheenRoughnessMap:Ce,specularMap:be,specularColorMap:me,specularIntensityMap:Be,transmission:J,transmissionMap:I,thicknessMap:he,gradientMap:pe,opaque:T.transparent===!1&&T.blending===Zi&&T.alphaToCoverage===!1,alphaMap:Re,alphaTest:ue,alphaHash:re,combine:T.combine,mapUv:qe&&M(T.map.channel),aoMapUv:O&&M(T.aoMap.channel),lightMapUv:W&&M(T.lightMap.channel),bumpMapUv:k&&M(T.bumpMap.channel),normalMapUv:z&&M(T.normalMap.channel),displacementMapUv:ae&&M(T.displacementMap.channel),emissiveMapUv:$&&M(T.emissiveMap.channel),metalnessMapUv:te&&M(T.metalnessMap.channel),roughnessMapUv:ne&&M(T.roughnessMap.channel),anisotropyMapUv:G&&M(T.anisotropyMap.channel),clearcoatMapUv:Se&&M(T.clearcoatMap.channel),clearcoatNormalMapUv:le&&M(T.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Ee&&M(T.clearcoatRoughnessMap.channel),iridescenceMapUv:Te&&M(T.iridescenceMap.channel),iridescenceThicknessMapUv:ce&&M(T.iridescenceThicknessMap.channel),sheenColorMapUv:ve&&M(T.sheenColorMap.channel),sheenRoughnessMapUv:Ce&&M(T.sheenRoughnessMap.channel),specularMapUv:be&&M(T.specularMap.channel),specularColorMapUv:me&&M(T.specularColorMap.channel),specularIntensityMapUv:Be&&M(T.specularIntensityMap.channel),transmissionMapUv:I&&M(T.transmissionMap.channel),thicknessMapUv:he&&M(T.thicknessMap.channel),alphaMapUv:Re&&M(T.alphaMap.channel),vertexTangents:!!ie.attributes.tangent&&(z||xe),vertexColors:T.vertexColors,vertexAlphas:T.vertexColors===!0&&!!ie.attributes.color&&ie.attributes.color.itemSize===4,pointsUvs:Z.isPoints===!0&&!!ie.attributes.uv&&(qe||Re),fog:!!se,useFog:T.fog===!0,fogExp2:!!se&&se.isFogExp2,flatShading:T.flatShading===!0&&T.wireframe===!1,sizeAttenuation:T.sizeAttenuation===!0,logarithmicDepthBuffer:f,reversedDepthBuffer:ye,skinning:Z.isSkinnedMesh===!0,morphTargets:ie.morphAttributes.position!==void 0,morphNormals:ie.morphAttributes.normal!==void 0,morphColors:ie.morphAttributes.color!==void 0,morphTargetsCount:ge,morphTextureStride:Le,numDirLights:y.directional.length,numPointLights:y.point.length,numSpotLights:y.spot.length,numSpotLightMaps:y.spotLightMap.length,numRectAreaLights:y.rectArea.length,numHemiLights:y.hemi.length,numDirLightShadows:y.directionalShadowMap.length,numPointLightShadows:y.pointShadowMap.length,numSpotLightShadows:y.spotShadowMap.length,numSpotLightShadowsWithMaps:y.numSpotLightShadowsWithMaps,numLightProbes:y.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:T.dithering,shadowMapEnabled:n.shadowMap.enabled&&L.length>0,shadowMapType:n.shadowMap.type,toneMapping:ze,decodeVideoTexture:qe&&T.map.isVideoTexture===!0&&Qe.getTransfer(T.map.colorSpace)===st,decodeVideoTextureEmissive:$&&T.emissiveMap.isVideoTexture===!0&&Qe.getTransfer(T.emissiveMap.colorSpace)===st,premultipliedAlpha:T.premultipliedAlpha,doubleSided:T.side===On,flipSided:T.side===It,useDepthPacking:T.depthPacking>=0,depthPacking:T.depthPacking||0,index0AttributeName:T.index0AttributeName,extensionClipCullDistance:De&&T.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(De&&T.extensions.multiDraw===!0||we)&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:T.customProgramCacheKey()};return ct.vertexUv1s=c.has(1),ct.vertexUv2s=c.has(2),ct.vertexUv3s=c.has(3),c.clear(),ct}function h(T){const y=[];if(T.shaderID?y.push(T.shaderID):(y.push(T.customVertexShaderID),y.push(T.customFragmentShaderID)),T.defines!==void 0)for(const L in T.defines)y.push(L),y.push(T.defines[L]);return T.isRawShaderMaterial===!1&&(w(y,T),b(y,T),y.push(n.outputColorSpace)),y.push(T.customProgramCacheKey),y.join()}function w(T,y){T.push(y.precision),T.push(y.outputColorSpace),T.push(y.envMapMode),T.push(y.envMapCubeUVHeight),T.push(y.mapUv),T.push(y.alphaMapUv),T.push(y.lightMapUv),T.push(y.aoMapUv),T.push(y.bumpMapUv),T.push(y.normalMapUv),T.push(y.displacementMapUv),T.push(y.emissiveMapUv),T.push(y.metalnessMapUv),T.push(y.roughnessMapUv),T.push(y.anisotropyMapUv),T.push(y.clearcoatMapUv),T.push(y.clearcoatNormalMapUv),T.push(y.clearcoatRoughnessMapUv),T.push(y.iridescenceMapUv),T.push(y.iridescenceThicknessMapUv),T.push(y.sheenColorMapUv),T.push(y.sheenRoughnessMapUv),T.push(y.specularMapUv),T.push(y.specularColorMapUv),T.push(y.specularIntensityMapUv),T.push(y.transmissionMapUv),T.push(y.thicknessMapUv),T.push(y.combine),T.push(y.fogExp2),T.push(y.sizeAttenuation),T.push(y.morphTargetsCount),T.push(y.morphAttributeCount),T.push(y.numDirLights),T.push(y.numPointLights),T.push(y.numSpotLights),T.push(y.numSpotLightMaps),T.push(y.numHemiLights),T.push(y.numRectAreaLights),T.push(y.numDirLightShadows),T.push(y.numPointLightShadows),T.push(y.numSpotLightShadows),T.push(y.numSpotLightShadowsWithMaps),T.push(y.numLightProbes),T.push(y.shadowMapType),T.push(y.toneMapping),T.push(y.numClippingPlanes),T.push(y.numClipIntersection),T.push(y.depthPacking)}function b(T,y){a.disableAll(),y.supportsVertexTextures&&a.enable(0),y.instancing&&a.enable(1),y.instancingColor&&a.enable(2),y.instancingMorph&&a.enable(3),y.matcap&&a.enable(4),y.envMap&&a.enable(5),y.normalMapObjectSpace&&a.enable(6),y.normalMapTangentSpace&&a.enable(7),y.clearcoat&&a.enable(8),y.iridescence&&a.enable(9),y.alphaTest&&a.enable(10),y.vertexColors&&a.enable(11),y.vertexAlphas&&a.enable(12),y.vertexUv1s&&a.enable(13),y.vertexUv2s&&a.enable(14),y.vertexUv3s&&a.enable(15),y.vertexTangents&&a.enable(16),y.anisotropy&&a.enable(17),y.alphaHash&&a.enable(18),y.batching&&a.enable(19),y.dispersion&&a.enable(20),y.batchingColor&&a.enable(21),y.gradientMap&&a.enable(22),T.push(a.mask),a.disableAll(),y.fog&&a.enable(0),y.useFog&&a.enable(1),y.flatShading&&a.enable(2),y.logarithmicDepthBuffer&&a.enable(3),y.reversedDepthBuffer&&a.enable(4),y.skinning&&a.enable(5),y.morphTargets&&a.enable(6),y.morphNormals&&a.enable(7),y.morphColors&&a.enable(8),y.premultipliedAlpha&&a.enable(9),y.shadowMapEnabled&&a.enable(10),y.doubleSided&&a.enable(11),y.flipSided&&a.enable(12),y.useDepthPacking&&a.enable(13),y.dithering&&a.enable(14),y.transmission&&a.enable(15),y.sheen&&a.enable(16),y.opaque&&a.enable(17),y.pointsUvs&&a.enable(18),y.decodeVideoTexture&&a.enable(19),y.decodeVideoTextureEmissive&&a.enable(20),y.alphaToCoverage&&a.enable(21),T.push(a.mask)}function E(T){const y=v[T.type];let L;if(y){const X=pn[y];L=Vm.clone(X.uniforms)}else L=T.uniforms;return L}function R(T,y){let L;for(let X=0,Z=u.length;X<Z;X++){const se=u[X];if(se.cacheKey===y){L=se,++L.usedTimes;break}}return L===void 0&&(L=new mx(n,y,T,s),u.push(L)),L}function C(T){if(--T.usedTimes===0){const y=u.indexOf(T);u[y]=u[u.length-1],u.pop(),T.destroy()}}function P(T){l.remove(T)}function B(){l.dispose()}return{getParameters:m,getProgramCacheKey:h,getUniforms:E,acquireProgram:R,releaseProgram:C,releaseShaderCache:P,programs:u,dispose:B}}function Mx(){let n=new WeakMap;function e(o){return n.has(o)}function t(o){let a=n.get(o);return a===void 0&&(a={},n.set(o,a)),a}function i(o){n.delete(o)}function r(o,a,l){n.get(o)[a]=l}function s(){n=new WeakMap}return{has:e,get:t,remove:i,update:r,dispose:s}}function Sx(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.material.id!==e.material.id?n.material.id-e.material.id:n.z!==e.z?n.z-e.z:n.id-e.id}function cu(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.z!==e.z?e.z-n.z:n.id-e.id}function uu(){const n=[];let e=0;const t=[],i=[],r=[];function s(){e=0,t.length=0,i.length=0,r.length=0}function o(f,d,p,v,M,m){let h=n[e];return h===void 0?(h={id:f.id,object:f,geometry:d,material:p,groupOrder:v,renderOrder:f.renderOrder,z:M,group:m},n[e]=h):(h.id=f.id,h.object=f,h.geometry=d,h.material=p,h.groupOrder=v,h.renderOrder=f.renderOrder,h.z=M,h.group=m),e++,h}function a(f,d,p,v,M,m){const h=o(f,d,p,v,M,m);p.transmission>0?i.push(h):p.transparent===!0?r.push(h):t.push(h)}function l(f,d,p,v,M,m){const h=o(f,d,p,v,M,m);p.transmission>0?i.unshift(h):p.transparent===!0?r.unshift(h):t.unshift(h)}function c(f,d){t.length>1&&t.sort(f||Sx),i.length>1&&i.sort(d||cu),r.length>1&&r.sort(d||cu)}function u(){for(let f=e,d=n.length;f<d;f++){const p=n[f];if(p.id===null)break;p.id=null,p.object=null,p.geometry=null,p.material=null,p.group=null}}return{opaque:t,transmissive:i,transparent:r,init:s,push:a,unshift:l,finish:u,sort:c}}function Ex(){let n=new WeakMap;function e(i,r){const s=n.get(i);let o;return s===void 0?(o=new uu,n.set(i,[o])):r>=s.length?(o=new uu,s.push(o)):o=s[r],o}function t(){n=new WeakMap}return{get:e,dispose:t}}function yx(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new H,color:new je};break;case"SpotLight":t={position:new H,direction:new H,color:new je,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new H,color:new je,distance:0,decay:0};break;case"HemisphereLight":t={direction:new H,skyColor:new je,groundColor:new je};break;case"RectAreaLight":t={color:new je,position:new H,halfWidth:new H,halfHeight:new H};break}return n[e.id]=t,t}}}function Tx(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ye};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ye};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ye,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[e.id]=t,t}}}let bx=0;function Ax(n,e){return(e.castShadow?2:0)-(n.castShadow?2:0)+(e.map?1:0)-(n.map?1:0)}function wx(n){const e=new yx,t=Tx(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)i.probe.push(new H);const r=new H,s=new mt,o=new mt;function a(c){let u=0,f=0,d=0;for(let T=0;T<9;T++)i.probe[T].set(0,0,0);let p=0,v=0,M=0,m=0,h=0,w=0,b=0,E=0,R=0,C=0,P=0;c.sort(Ax);for(let T=0,y=c.length;T<y;T++){const L=c[T],X=L.color,Z=L.intensity,se=L.distance,ie=L.shadow&&L.shadow.map?L.shadow.map.texture:null;if(L.isAmbientLight)u+=X.r*Z,f+=X.g*Z,d+=X.b*Z;else if(L.isLightProbe){for(let j=0;j<9;j++)i.probe[j].addScaledVector(L.sh.coefficients[j],Z);P++}else if(L.isDirectionalLight){const j=e.get(L);if(j.color.copy(L.color).multiplyScalar(L.intensity),L.castShadow){const Q=L.shadow,U=t.get(L);U.shadowIntensity=Q.intensity,U.shadowBias=Q.bias,U.shadowNormalBias=Q.normalBias,U.shadowRadius=Q.radius,U.shadowMapSize=Q.mapSize,i.directionalShadow[p]=U,i.directionalShadowMap[p]=ie,i.directionalShadowMatrix[p]=L.shadow.matrix,w++}i.directional[p]=j,p++}else if(L.isSpotLight){const j=e.get(L);j.position.setFromMatrixPosition(L.matrixWorld),j.color.copy(X).multiplyScalar(Z),j.distance=se,j.coneCos=Math.cos(L.angle),j.penumbraCos=Math.cos(L.angle*(1-L.penumbra)),j.decay=L.decay,i.spot[M]=j;const Q=L.shadow;if(L.map&&(i.spotLightMap[R]=L.map,R++,Q.updateMatrices(L),L.castShadow&&C++),i.spotLightMatrix[M]=Q.matrix,L.castShadow){const U=t.get(L);U.shadowIntensity=Q.intensity,U.shadowBias=Q.bias,U.shadowNormalBias=Q.normalBias,U.shadowRadius=Q.radius,U.shadowMapSize=Q.mapSize,i.spotShadow[M]=U,i.spotShadowMap[M]=ie,E++}M++}else if(L.isRectAreaLight){const j=e.get(L);j.color.copy(X).multiplyScalar(Z),j.halfWidth.set(L.width*.5,0,0),j.halfHeight.set(0,L.height*.5,0),i.rectArea[m]=j,m++}else if(L.isPointLight){const j=e.get(L);if(j.color.copy(L.color).multiplyScalar(L.intensity),j.distance=L.distance,j.decay=L.decay,L.castShadow){const Q=L.shadow,U=t.get(L);U.shadowIntensity=Q.intensity,U.shadowBias=Q.bias,U.shadowNormalBias=Q.normalBias,U.shadowRadius=Q.radius,U.shadowMapSize=Q.mapSize,U.shadowCameraNear=Q.camera.near,U.shadowCameraFar=Q.camera.far,i.pointShadow[v]=U,i.pointShadowMap[v]=ie,i.pointShadowMatrix[v]=L.shadow.matrix,b++}i.point[v]=j,v++}else if(L.isHemisphereLight){const j=e.get(L);j.skyColor.copy(L.color).multiplyScalar(Z),j.groundColor.copy(L.groundColor).multiplyScalar(Z),i.hemi[h]=j,h++}}m>0&&(n.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=_e.LTC_FLOAT_1,i.rectAreaLTC2=_e.LTC_FLOAT_2):(i.rectAreaLTC1=_e.LTC_HALF_1,i.rectAreaLTC2=_e.LTC_HALF_2)),i.ambient[0]=u,i.ambient[1]=f,i.ambient[2]=d;const B=i.hash;(B.directionalLength!==p||B.pointLength!==v||B.spotLength!==M||B.rectAreaLength!==m||B.hemiLength!==h||B.numDirectionalShadows!==w||B.numPointShadows!==b||B.numSpotShadows!==E||B.numSpotMaps!==R||B.numLightProbes!==P)&&(i.directional.length=p,i.spot.length=M,i.rectArea.length=m,i.point.length=v,i.hemi.length=h,i.directionalShadow.length=w,i.directionalShadowMap.length=w,i.pointShadow.length=b,i.pointShadowMap.length=b,i.spotShadow.length=E,i.spotShadowMap.length=E,i.directionalShadowMatrix.length=w,i.pointShadowMatrix.length=b,i.spotLightMatrix.length=E+R-C,i.spotLightMap.length=R,i.numSpotLightShadowsWithMaps=C,i.numLightProbes=P,B.directionalLength=p,B.pointLength=v,B.spotLength=M,B.rectAreaLength=m,B.hemiLength=h,B.numDirectionalShadows=w,B.numPointShadows=b,B.numSpotShadows=E,B.numSpotMaps=R,B.numLightProbes=P,i.version=bx++)}function l(c,u){let f=0,d=0,p=0,v=0,M=0;const m=u.matrixWorldInverse;for(let h=0,w=c.length;h<w;h++){const b=c[h];if(b.isDirectionalLight){const E=i.directional[f];E.direction.setFromMatrixPosition(b.matrixWorld),r.setFromMatrixPosition(b.target.matrixWorld),E.direction.sub(r),E.direction.transformDirection(m),f++}else if(b.isSpotLight){const E=i.spot[p];E.position.setFromMatrixPosition(b.matrixWorld),E.position.applyMatrix4(m),E.direction.setFromMatrixPosition(b.matrixWorld),r.setFromMatrixPosition(b.target.matrixWorld),E.direction.sub(r),E.direction.transformDirection(m),p++}else if(b.isRectAreaLight){const E=i.rectArea[v];E.position.setFromMatrixPosition(b.matrixWorld),E.position.applyMatrix4(m),o.identity(),s.copy(b.matrixWorld),s.premultiply(m),o.extractRotation(s),E.halfWidth.set(b.width*.5,0,0),E.halfHeight.set(0,b.height*.5,0),E.halfWidth.applyMatrix4(o),E.halfHeight.applyMatrix4(o),v++}else if(b.isPointLight){const E=i.point[d];E.position.setFromMatrixPosition(b.matrixWorld),E.position.applyMatrix4(m),d++}else if(b.isHemisphereLight){const E=i.hemi[M];E.direction.setFromMatrixPosition(b.matrixWorld),E.direction.transformDirection(m),M++}}}return{setup:a,setupView:l,state:i}}function fu(n){const e=new wx(n),t=[],i=[];function r(u){c.camera=u,t.length=0,i.length=0}function s(u){t.push(u)}function o(u){i.push(u)}function a(){e.setup(t)}function l(u){e.setupView(t,u)}const c={lightsArray:t,shadowsArray:i,camera:null,lights:e,transmissionRenderTarget:{}};return{init:r,state:c,setupLights:a,setupLightsView:l,pushLight:s,pushShadow:o}}function Rx(n){let e=new WeakMap;function t(r,s=0){const o=e.get(r);let a;return o===void 0?(a=new fu(n),e.set(r,[a])):s>=o.length?(a=new fu(n),o.push(a)):a=o[s],a}function i(){e=new WeakMap}return{get:t,dispose:i}}const Cx=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Px=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function Dx(n,e,t){let i=new Rl;const r=new Ye,s=new Ye,o=new ot,a=new Qm({depthPacking:um}),l=new e_,c={},u=t.maxTextureSize,f={[si]:It,[It]:si,[On]:On},d=new ln({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Ye},radius:{value:4}},vertexShader:Cx,fragmentShader:Px}),p=d.clone();p.defines.HORIZONTAL_PASS=1;const v=new yn;v.setAttribute("position",new qt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const M=new rn(v,d),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Mf;let h=this.type;this.render=function(C,P,B){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||C.length===0)return;const T=n.getRenderTarget(),y=n.getActiveCubeFace(),L=n.getActiveMipmapLevel(),X=n.state;X.setBlending(ni),X.buffers.depth.getReversed()===!0?X.buffers.color.setClear(0,0,0,0):X.buffers.color.setClear(1,1,1,1),X.buffers.depth.setTest(!0),X.setScissorTest(!1);const Z=h!==Ln&&this.type===Ln,se=h===Ln&&this.type!==Ln;for(let ie=0,j=C.length;ie<j;ie++){const Q=C[ie],U=Q.shadow;if(U===void 0){console.warn("THREE.WebGLShadowMap:",Q,"has no shadow.");continue}if(U.autoUpdate===!1&&U.needsUpdate===!1)continue;r.copy(U.mapSize);const K=U.getFrameExtents();if(r.multiply(K),s.copy(U.mapSize),(r.x>u||r.y>u)&&(r.x>u&&(s.x=Math.floor(u/K.x),r.x=s.x*K.x,U.mapSize.x=s.x),r.y>u&&(s.y=Math.floor(u/K.y),r.y=s.y*K.y,U.mapSize.y=s.y)),U.map===null||Z===!0||se===!0){const ge=this.type!==Ln?{minFilter:an,magFilter:an}:{};U.map!==null&&U.map.dispose(),U.map=new Ai(r.x,r.y,ge),U.map.texture.name=Q.name+".shadowMap",U.camera.updateProjectionMatrix()}n.setRenderTarget(U.map),n.clear();const de=U.getViewportCount();for(let ge=0;ge<de;ge++){const Le=U.getViewport(ge);o.set(s.x*Le.x,s.y*Le.y,s.x*Le.z,s.y*Le.w),X.viewport(o),U.updateMatrices(Q,ge),i=U.getFrustum(),E(P,B,U.camera,Q,this.type)}U.isPointLightShadow!==!0&&this.type===Ln&&w(U,B),U.needsUpdate=!1}h=this.type,m.needsUpdate=!1,n.setRenderTarget(T,y,L)};function w(C,P){const B=e.update(M);d.defines.VSM_SAMPLES!==C.blurSamples&&(d.defines.VSM_SAMPLES=C.blurSamples,p.defines.VSM_SAMPLES=C.blurSamples,d.needsUpdate=!0,p.needsUpdate=!0),C.mapPass===null&&(C.mapPass=new Ai(r.x,r.y)),d.uniforms.shadow_pass.value=C.map.texture,d.uniforms.resolution.value=C.mapSize,d.uniforms.radius.value=C.radius,n.setRenderTarget(C.mapPass),n.clear(),n.renderBufferDirect(P,null,B,d,M,null),p.uniforms.shadow_pass.value=C.mapPass.texture,p.uniforms.resolution.value=C.mapSize,p.uniforms.radius.value=C.radius,n.setRenderTarget(C.map),n.clear(),n.renderBufferDirect(P,null,B,p,M,null)}function b(C,P,B,T){let y=null;const L=B.isPointLight===!0?C.customDistanceMaterial:C.customDepthMaterial;if(L!==void 0)y=L;else if(y=B.isPointLight===!0?l:a,n.localClippingEnabled&&P.clipShadows===!0&&Array.isArray(P.clippingPlanes)&&P.clippingPlanes.length!==0||P.displacementMap&&P.displacementScale!==0||P.alphaMap&&P.alphaTest>0||P.map&&P.alphaTest>0||P.alphaToCoverage===!0){const X=y.uuid,Z=P.uuid;let se=c[X];se===void 0&&(se={},c[X]=se);let ie=se[Z];ie===void 0&&(ie=y.clone(),se[Z]=ie,P.addEventListener("dispose",R)),y=ie}if(y.visible=P.visible,y.wireframe=P.wireframe,T===Ln?y.side=P.shadowSide!==null?P.shadowSide:P.side:y.side=P.shadowSide!==null?P.shadowSide:f[P.side],y.alphaMap=P.alphaMap,y.alphaTest=P.alphaToCoverage===!0?.5:P.alphaTest,y.map=P.map,y.clipShadows=P.clipShadows,y.clippingPlanes=P.clippingPlanes,y.clipIntersection=P.clipIntersection,y.displacementMap=P.displacementMap,y.displacementScale=P.displacementScale,y.displacementBias=P.displacementBias,y.wireframeLinewidth=P.wireframeLinewidth,y.linewidth=P.linewidth,B.isPointLight===!0&&y.isMeshDistanceMaterial===!0){const X=n.properties.get(y);X.light=B}return y}function E(C,P,B,T,y){if(C.visible===!1)return;if(C.layers.test(P.layers)&&(C.isMesh||C.isLine||C.isPoints)&&(C.castShadow||C.receiveShadow&&y===Ln)&&(!C.frustumCulled||i.intersectsObject(C))){C.modelViewMatrix.multiplyMatrices(B.matrixWorldInverse,C.matrixWorld);const Z=e.update(C),se=C.material;if(Array.isArray(se)){const ie=Z.groups;for(let j=0,Q=ie.length;j<Q;j++){const U=ie[j],K=se[U.materialIndex];if(K&&K.visible){const de=b(C,K,T,y);C.onBeforeShadow(n,C,P,B,Z,de,U),n.renderBufferDirect(B,null,Z,de,C,U),C.onAfterShadow(n,C,P,B,Z,de,U)}}}else if(se.visible){const ie=b(C,se,T,y);C.onBeforeShadow(n,C,P,B,Z,ie,null),n.renderBufferDirect(B,null,Z,ie,C,null),C.onAfterShadow(n,C,P,B,Z,ie,null)}}const X=C.children;for(let Z=0,se=X.length;Z<se;Z++)E(X[Z],P,B,T,y)}function R(C){C.target.removeEventListener("dispose",R);for(const B in c){const T=c[B],y=C.target.uuid;y in T&&(T[y].dispose(),delete T[y])}}}const Lx={[ca]:ua,[fa]:pa,[ha]:ma,[tr]:da,[ua]:ca,[pa]:fa,[ma]:ha,[da]:tr};function Ix(n,e){function t(){let I=!1;const he=new ot;let pe=null;const Re=new ot(0,0,0,0);return{setMask:function(ue){pe!==ue&&!I&&(n.colorMask(ue,ue,ue,ue),pe=ue)},setLocked:function(ue){I=ue},setClear:function(ue,re,De,ze,ct){ct===!0&&(ue*=ze,re*=ze,De*=ze),he.set(ue,re,De,ze),Re.equals(he)===!1&&(n.clearColor(ue,re,De,ze),Re.copy(he))},reset:function(){I=!1,pe=null,Re.set(-1,0,0,0)}}}function i(){let I=!1,he=!1,pe=null,Re=null,ue=null;return{setReversed:function(re){if(he!==re){const De=e.get("EXT_clip_control");re?De.clipControlEXT(De.LOWER_LEFT_EXT,De.ZERO_TO_ONE_EXT):De.clipControlEXT(De.LOWER_LEFT_EXT,De.NEGATIVE_ONE_TO_ONE_EXT),he=re;const ze=ue;ue=null,this.setClear(ze)}},getReversed:function(){return he},setTest:function(re){re?oe(n.DEPTH_TEST):ye(n.DEPTH_TEST)},setMask:function(re){pe!==re&&!I&&(n.depthMask(re),pe=re)},setFunc:function(re){if(he&&(re=Lx[re]),Re!==re){switch(re){case ca:n.depthFunc(n.NEVER);break;case ua:n.depthFunc(n.ALWAYS);break;case fa:n.depthFunc(n.LESS);break;case tr:n.depthFunc(n.LEQUAL);break;case ha:n.depthFunc(n.EQUAL);break;case da:n.depthFunc(n.GEQUAL);break;case pa:n.depthFunc(n.GREATER);break;case ma:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}Re=re}},setLocked:function(re){I=re},setClear:function(re){ue!==re&&(he&&(re=1-re),n.clearDepth(re),ue=re)},reset:function(){I=!1,pe=null,Re=null,ue=null,he=!1}}}function r(){let I=!1,he=null,pe=null,Re=null,ue=null,re=null,De=null,ze=null,ct=null;return{setTest:function(tt){I||(tt?oe(n.STENCIL_TEST):ye(n.STENCIL_TEST))},setMask:function(tt){he!==tt&&!I&&(n.stencilMask(tt),he=tt)},setFunc:function(tt,Tn,cn){(pe!==tt||Re!==Tn||ue!==cn)&&(n.stencilFunc(tt,Tn,cn),pe=tt,Re=Tn,ue=cn)},setOp:function(tt,Tn,cn){(re!==tt||De!==Tn||ze!==cn)&&(n.stencilOp(tt,Tn,cn),re=tt,De=Tn,ze=cn)},setLocked:function(tt){I=tt},setClear:function(tt){ct!==tt&&(n.clearStencil(tt),ct=tt)},reset:function(){I=!1,he=null,pe=null,Re=null,ue=null,re=null,De=null,ze=null,ct=null}}}const s=new t,o=new i,a=new r,l=new WeakMap,c=new WeakMap;let u={},f={},d=new WeakMap,p=[],v=null,M=!1,m=null,h=null,w=null,b=null,E=null,R=null,C=null,P=new je(0,0,0),B=0,T=!1,y=null,L=null,X=null,Z=null,se=null;const ie=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let j=!1,Q=0;const U=n.getParameter(n.VERSION);U.indexOf("WebGL")!==-1?(Q=parseFloat(/^WebGL (\d)/.exec(U)[1]),j=Q>=1):U.indexOf("OpenGL ES")!==-1&&(Q=parseFloat(/^OpenGL ES (\d)/.exec(U)[1]),j=Q>=2);let K=null,de={};const ge=n.getParameter(n.SCISSOR_BOX),Le=n.getParameter(n.VIEWPORT),ke=new ot().fromArray(ge),Ze=new ot().fromArray(Le);function Xe(I,he,pe,Re){const ue=new Uint8Array(4),re=n.createTexture();n.bindTexture(I,re),n.texParameteri(I,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(I,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let De=0;De<pe;De++)I===n.TEXTURE_3D||I===n.TEXTURE_2D_ARRAY?n.texImage3D(he,0,n.RGBA,1,1,Re,0,n.RGBA,n.UNSIGNED_BYTE,ue):n.texImage2D(he+De,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,ue);return re}const ee={};ee[n.TEXTURE_2D]=Xe(n.TEXTURE_2D,n.TEXTURE_2D,1),ee[n.TEXTURE_CUBE_MAP]=Xe(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),ee[n.TEXTURE_2D_ARRAY]=Xe(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),ee[n.TEXTURE_3D]=Xe(n.TEXTURE_3D,n.TEXTURE_3D,1,1),s.setClear(0,0,0,1),o.setClear(1),a.setClear(0),oe(n.DEPTH_TEST),o.setFunc(tr),k(!1),z(dc),oe(n.CULL_FACE),O(ni);function oe(I){u[I]!==!0&&(n.enable(I),u[I]=!0)}function ye(I){u[I]!==!1&&(n.disable(I),u[I]=!1)}function Ue(I,he){return f[I]!==he?(n.bindFramebuffer(I,he),f[I]=he,I===n.DRAW_FRAMEBUFFER&&(f[n.FRAMEBUFFER]=he),I===n.FRAMEBUFFER&&(f[n.DRAW_FRAMEBUFFER]=he),!0):!1}function we(I,he){let pe=p,Re=!1;if(I){pe=d.get(he),pe===void 0&&(pe=[],d.set(he,pe));const ue=I.textures;if(pe.length!==ue.length||pe[0]!==n.COLOR_ATTACHMENT0){for(let re=0,De=ue.length;re<De;re++)pe[re]=n.COLOR_ATTACHMENT0+re;pe.length=ue.length,Re=!0}}else pe[0]!==n.BACK&&(pe[0]=n.BACK,Re=!0);Re&&n.drawBuffers(pe)}function qe(I){return v!==I?(n.useProgram(I),v=I,!0):!1}const A={[Mi]:n.FUNC_ADD,[Fp]:n.FUNC_SUBTRACT,[Op]:n.FUNC_REVERSE_SUBTRACT};A[Bp]=n.MIN,A[zp]=n.MAX;const _={[Hp]:n.ZERO,[Vp]:n.ONE,[Gp]:n.SRC_COLOR,[aa]:n.SRC_ALPHA,[$p]:n.SRC_ALPHA_SATURATE,[qp]:n.DST_COLOR,[Wp]:n.DST_ALPHA,[kp]:n.ONE_MINUS_SRC_COLOR,[la]:n.ONE_MINUS_SRC_ALPHA,[Yp]:n.ONE_MINUS_DST_COLOR,[Xp]:n.ONE_MINUS_DST_ALPHA,[Kp]:n.CONSTANT_COLOR,[jp]:n.ONE_MINUS_CONSTANT_COLOR,[Zp]:n.CONSTANT_ALPHA,[Jp]:n.ONE_MINUS_CONSTANT_ALPHA};function O(I,he,pe,Re,ue,re,De,ze,ct,tt){if(I===ni){M===!0&&(ye(n.BLEND),M=!1);return}if(M===!1&&(oe(n.BLEND),M=!0),I!==Np){if(I!==m||tt!==T){if((h!==Mi||E!==Mi)&&(n.blendEquation(n.FUNC_ADD),h=Mi,E=Mi),tt)switch(I){case Zi:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case Ar:n.blendFunc(n.ONE,n.ONE);break;case pc:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case mc:n.blendFuncSeparate(n.DST_COLOR,n.ONE_MINUS_SRC_ALPHA,n.ZERO,n.ONE);break;default:console.error("THREE.WebGLState: Invalid blending: ",I);break}else switch(I){case Zi:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case Ar:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE,n.ONE,n.ONE);break;case pc:console.error("THREE.WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case mc:console.error("THREE.WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:console.error("THREE.WebGLState: Invalid blending: ",I);break}w=null,b=null,R=null,C=null,P.set(0,0,0),B=0,m=I,T=tt}return}ue=ue||he,re=re||pe,De=De||Re,(he!==h||ue!==E)&&(n.blendEquationSeparate(A[he],A[ue]),h=he,E=ue),(pe!==w||Re!==b||re!==R||De!==C)&&(n.blendFuncSeparate(_[pe],_[Re],_[re],_[De]),w=pe,b=Re,R=re,C=De),(ze.equals(P)===!1||ct!==B)&&(n.blendColor(ze.r,ze.g,ze.b,ct),P.copy(ze),B=ct),m=I,T=!1}function W(I,he){I.side===On?ye(n.CULL_FACE):oe(n.CULL_FACE);let pe=I.side===It;he&&(pe=!pe),k(pe),I.blending===Zi&&I.transparent===!1?O(ni):O(I.blending,I.blendEquation,I.blendSrc,I.blendDst,I.blendEquationAlpha,I.blendSrcAlpha,I.blendDstAlpha,I.blendColor,I.blendAlpha,I.premultipliedAlpha),o.setFunc(I.depthFunc),o.setTest(I.depthTest),o.setMask(I.depthWrite),s.setMask(I.colorWrite);const Re=I.stencilWrite;a.setTest(Re),Re&&(a.setMask(I.stencilWriteMask),a.setFunc(I.stencilFunc,I.stencilRef,I.stencilFuncMask),a.setOp(I.stencilFail,I.stencilZFail,I.stencilZPass)),$(I.polygonOffset,I.polygonOffsetFactor,I.polygonOffsetUnits),I.alphaToCoverage===!0?oe(n.SAMPLE_ALPHA_TO_COVERAGE):ye(n.SAMPLE_ALPHA_TO_COVERAGE)}function k(I){y!==I&&(I?n.frontFace(n.CW):n.frontFace(n.CCW),y=I)}function z(I){I!==Lp?(oe(n.CULL_FACE),I!==L&&(I===dc?n.cullFace(n.BACK):I===Ip?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):ye(n.CULL_FACE),L=I}function ae(I){I!==X&&(j&&n.lineWidth(I),X=I)}function $(I,he,pe){I?(oe(n.POLYGON_OFFSET_FILL),(Z!==he||se!==pe)&&(n.polygonOffset(he,pe),Z=he,se=pe)):ye(n.POLYGON_OFFSET_FILL)}function te(I){I?oe(n.SCISSOR_TEST):ye(n.SCISSOR_TEST)}function ne(I){I===void 0&&(I=n.TEXTURE0+ie-1),K!==I&&(n.activeTexture(I),K=I)}function xe(I,he,pe){pe===void 0&&(K===null?pe=n.TEXTURE0+ie-1:pe=K);let Re=de[pe];Re===void 0&&(Re={type:void 0,texture:void 0},de[pe]=Re),(Re.type!==I||Re.texture!==he)&&(K!==pe&&(n.activeTexture(pe),K=pe),n.bindTexture(I,he||ee[I]),Re.type=I,Re.texture=he)}function x(){const I=de[K];I!==void 0&&I.type!==void 0&&(n.bindTexture(I.type,null),I.type=void 0,I.texture=void 0)}function g(){try{n.compressedTexImage2D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function D(){try{n.compressedTexImage3D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function V(){try{n.texSubImage2D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function J(){try{n.texSubImage3D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function G(){try{n.compressedTexSubImage2D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Se(){try{n.compressedTexSubImage3D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function le(){try{n.texStorage2D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Ee(){try{n.texStorage3D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Te(){try{n.texImage2D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function ce(){try{n.texImage3D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function ve(I){ke.equals(I)===!1&&(n.scissor(I.x,I.y,I.z,I.w),ke.copy(I))}function Ce(I){Ze.equals(I)===!1&&(n.viewport(I.x,I.y,I.z,I.w),Ze.copy(I))}function be(I,he){let pe=c.get(he);pe===void 0&&(pe=new WeakMap,c.set(he,pe));let Re=pe.get(I);Re===void 0&&(Re=n.getUniformBlockIndex(he,I.name),pe.set(I,Re))}function me(I,he){const Re=c.get(he).get(I);l.get(he)!==Re&&(n.uniformBlockBinding(he,Re,I.__bindingPointIndex),l.set(he,Re))}function Be(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),o.setReversed(!1),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),u={},K=null,de={},f={},d=new WeakMap,p=[],v=null,M=!1,m=null,h=null,w=null,b=null,E=null,R=null,C=null,P=new je(0,0,0),B=0,T=!1,y=null,L=null,X=null,Z=null,se=null,ke.set(0,0,n.canvas.width,n.canvas.height),Ze.set(0,0,n.canvas.width,n.canvas.height),s.reset(),o.reset(),a.reset()}return{buffers:{color:s,depth:o,stencil:a},enable:oe,disable:ye,bindFramebuffer:Ue,drawBuffers:we,useProgram:qe,setBlending:O,setMaterial:W,setFlipSided:k,setCullFace:z,setLineWidth:ae,setPolygonOffset:$,setScissorTest:te,activeTexture:ne,bindTexture:xe,unbindTexture:x,compressedTexImage2D:g,compressedTexImage3D:D,texImage2D:Te,texImage3D:ce,updateUBOMapping:be,uniformBlockBinding:me,texStorage2D:le,texStorage3D:Ee,texSubImage2D:V,texSubImage3D:J,compressedTexSubImage2D:G,compressedTexSubImage3D:Se,scissor:ve,viewport:Ce,reset:Be}}function Ux(n,e,t,i,r,s,o){const a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new Ye,u=new WeakMap;let f;const d=new WeakMap;let p=!1;try{p=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function v(x,g){return p?new OffscreenCanvas(x,g):Hs("canvas")}function M(x,g,D){let V=1;const J=xe(x);if((J.width>D||J.height>D)&&(V=D/Math.max(J.width,J.height)),V<1)if(typeof HTMLImageElement<"u"&&x instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&x instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&x instanceof ImageBitmap||typeof VideoFrame<"u"&&x instanceof VideoFrame){const G=Math.floor(V*J.width),Se=Math.floor(V*J.height);f===void 0&&(f=v(G,Se));const le=g?v(G,Se):f;return le.width=G,le.height=Se,le.getContext("2d").drawImage(x,0,0,G,Se),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+J.width+"x"+J.height+") to ("+G+"x"+Se+")."),le}else return"data"in x&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+J.width+"x"+J.height+")."),x;return x}function m(x){return x.generateMipmaps}function h(x){n.generateMipmap(x)}function w(x){return x.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:x.isWebGL3DRenderTarget?n.TEXTURE_3D:x.isWebGLArrayRenderTarget||x.isCompressedArrayTexture?n.TEXTURE_2D_ARRAY:n.TEXTURE_2D}function b(x,g,D,V,J=!1){if(x!==null){if(n[x]!==void 0)return n[x];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+x+"'")}let G=g;if(g===n.RED&&(D===n.FLOAT&&(G=n.R32F),D===n.HALF_FLOAT&&(G=n.R16F),D===n.UNSIGNED_BYTE&&(G=n.R8)),g===n.RED_INTEGER&&(D===n.UNSIGNED_BYTE&&(G=n.R8UI),D===n.UNSIGNED_SHORT&&(G=n.R16UI),D===n.UNSIGNED_INT&&(G=n.R32UI),D===n.BYTE&&(G=n.R8I),D===n.SHORT&&(G=n.R16I),D===n.INT&&(G=n.R32I)),g===n.RG&&(D===n.FLOAT&&(G=n.RG32F),D===n.HALF_FLOAT&&(G=n.RG16F),D===n.UNSIGNED_BYTE&&(G=n.RG8)),g===n.RG_INTEGER&&(D===n.UNSIGNED_BYTE&&(G=n.RG8UI),D===n.UNSIGNED_SHORT&&(G=n.RG16UI),D===n.UNSIGNED_INT&&(G=n.RG32UI),D===n.BYTE&&(G=n.RG8I),D===n.SHORT&&(G=n.RG16I),D===n.INT&&(G=n.RG32I)),g===n.RGB_INTEGER&&(D===n.UNSIGNED_BYTE&&(G=n.RGB8UI),D===n.UNSIGNED_SHORT&&(G=n.RGB16UI),D===n.UNSIGNED_INT&&(G=n.RGB32UI),D===n.BYTE&&(G=n.RGB8I),D===n.SHORT&&(G=n.RGB16I),D===n.INT&&(G=n.RGB32I)),g===n.RGBA_INTEGER&&(D===n.UNSIGNED_BYTE&&(G=n.RGBA8UI),D===n.UNSIGNED_SHORT&&(G=n.RGBA16UI),D===n.UNSIGNED_INT&&(G=n.RGBA32UI),D===n.BYTE&&(G=n.RGBA8I),D===n.SHORT&&(G=n.RGBA16I),D===n.INT&&(G=n.RGBA32I)),g===n.RGB&&(D===n.UNSIGNED_INT_5_9_9_9_REV&&(G=n.RGB9_E5),D===n.UNSIGNED_INT_10F_11F_11F_REV&&(G=n.R11F_G11F_B10F)),g===n.RGBA){const Se=J?Bs:Qe.getTransfer(V);D===n.FLOAT&&(G=n.RGBA32F),D===n.HALF_FLOAT&&(G=n.RGBA16F),D===n.UNSIGNED_BYTE&&(G=Se===st?n.SRGB8_ALPHA8:n.RGBA8),D===n.UNSIGNED_SHORT_4_4_4_4&&(G=n.RGBA4),D===n.UNSIGNED_SHORT_5_5_5_1&&(G=n.RGB5_A1)}return(G===n.R16F||G===n.R32F||G===n.RG16F||G===n.RG32F||G===n.RGBA16F||G===n.RGBA32F)&&e.get("EXT_color_buffer_float"),G}function E(x,g){let D;return x?g===null||g===bi||g===Nr?D=n.DEPTH24_STENCIL8:g===Bn?D=n.DEPTH32F_STENCIL8:g===Ur&&(D=n.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):g===null||g===bi||g===Nr?D=n.DEPTH_COMPONENT24:g===Bn?D=n.DEPTH_COMPONENT32F:g===Ur&&(D=n.DEPTH_COMPONENT16),D}function R(x,g){return m(x)===!0||x.isFramebufferTexture&&x.minFilter!==an&&x.minFilter!==_n?Math.log2(Math.max(g.width,g.height))+1:x.mipmaps!==void 0&&x.mipmaps.length>0?x.mipmaps.length:x.isCompressedTexture&&Array.isArray(x.image)?g.mipmaps.length:1}function C(x){const g=x.target;g.removeEventListener("dispose",C),B(g),g.isVideoTexture&&u.delete(g)}function P(x){const g=x.target;g.removeEventListener("dispose",P),y(g)}function B(x){const g=i.get(x);if(g.__webglInit===void 0)return;const D=x.source,V=d.get(D);if(V){const J=V[g.__cacheKey];J.usedTimes--,J.usedTimes===0&&T(x),Object.keys(V).length===0&&d.delete(D)}i.remove(x)}function T(x){const g=i.get(x);n.deleteTexture(g.__webglTexture);const D=x.source,V=d.get(D);delete V[g.__cacheKey],o.memory.textures--}function y(x){const g=i.get(x);if(x.depthTexture&&(x.depthTexture.dispose(),i.remove(x.depthTexture)),x.isWebGLCubeRenderTarget)for(let V=0;V<6;V++){if(Array.isArray(g.__webglFramebuffer[V]))for(let J=0;J<g.__webglFramebuffer[V].length;J++)n.deleteFramebuffer(g.__webglFramebuffer[V][J]);else n.deleteFramebuffer(g.__webglFramebuffer[V]);g.__webglDepthbuffer&&n.deleteRenderbuffer(g.__webglDepthbuffer[V])}else{if(Array.isArray(g.__webglFramebuffer))for(let V=0;V<g.__webglFramebuffer.length;V++)n.deleteFramebuffer(g.__webglFramebuffer[V]);else n.deleteFramebuffer(g.__webglFramebuffer);if(g.__webglDepthbuffer&&n.deleteRenderbuffer(g.__webglDepthbuffer),g.__webglMultisampledFramebuffer&&n.deleteFramebuffer(g.__webglMultisampledFramebuffer),g.__webglColorRenderbuffer)for(let V=0;V<g.__webglColorRenderbuffer.length;V++)g.__webglColorRenderbuffer[V]&&n.deleteRenderbuffer(g.__webglColorRenderbuffer[V]);g.__webglDepthRenderbuffer&&n.deleteRenderbuffer(g.__webglDepthRenderbuffer)}const D=x.textures;for(let V=0,J=D.length;V<J;V++){const G=i.get(D[V]);G.__webglTexture&&(n.deleteTexture(G.__webglTexture),o.memory.textures--),i.remove(D[V])}i.remove(x)}let L=0;function X(){L=0}function Z(){const x=L;return x>=r.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+x+" texture units while this GPU supports only "+r.maxTextures),L+=1,x}function se(x){const g=[];return g.push(x.wrapS),g.push(x.wrapT),g.push(x.wrapR||0),g.push(x.magFilter),g.push(x.minFilter),g.push(x.anisotropy),g.push(x.internalFormat),g.push(x.format),g.push(x.type),g.push(x.generateMipmaps),g.push(x.premultiplyAlpha),g.push(x.flipY),g.push(x.unpackAlignment),g.push(x.colorSpace),g.join()}function ie(x,g){const D=i.get(x);if(x.isVideoTexture&&te(x),x.isRenderTargetTexture===!1&&x.isExternalTexture!==!0&&x.version>0&&D.__version!==x.version){const V=x.image;if(V===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(V.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{ee(D,x,g);return}}else x.isExternalTexture&&(D.__webglTexture=x.sourceTexture?x.sourceTexture:null);t.bindTexture(n.TEXTURE_2D,D.__webglTexture,n.TEXTURE0+g)}function j(x,g){const D=i.get(x);if(x.isRenderTargetTexture===!1&&x.version>0&&D.__version!==x.version){ee(D,x,g);return}t.bindTexture(n.TEXTURE_2D_ARRAY,D.__webglTexture,n.TEXTURE0+g)}function Q(x,g){const D=i.get(x);if(x.isRenderTargetTexture===!1&&x.version>0&&D.__version!==x.version){ee(D,x,g);return}t.bindTexture(n.TEXTURE_3D,D.__webglTexture,n.TEXTURE0+g)}function U(x,g){const D=i.get(x);if(x.version>0&&D.__version!==x.version){oe(D,x,g);return}t.bindTexture(n.TEXTURE_CUBE_MAP,D.__webglTexture,n.TEXTURE0+g)}const K={[va]:n.REPEAT,[Ei]:n.CLAMP_TO_EDGE,[xa]:n.MIRRORED_REPEAT},de={[an]:n.NEAREST,[lm]:n.NEAREST_MIPMAP_NEAREST,[Qr]:n.NEAREST_MIPMAP_LINEAR,[_n]:n.LINEAR,[_o]:n.LINEAR_MIPMAP_NEAREST,[yi]:n.LINEAR_MIPMAP_LINEAR},ge={[dm]:n.NEVER,[xm]:n.ALWAYS,[pm]:n.LESS,[Df]:n.LEQUAL,[mm]:n.EQUAL,[vm]:n.GEQUAL,[_m]:n.GREATER,[gm]:n.NOTEQUAL};function Le(x,g){if(g.type===Bn&&e.has("OES_texture_float_linear")===!1&&(g.magFilter===_n||g.magFilter===_o||g.magFilter===Qr||g.magFilter===yi||g.minFilter===_n||g.minFilter===_o||g.minFilter===Qr||g.minFilter===yi)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),n.texParameteri(x,n.TEXTURE_WRAP_S,K[g.wrapS]),n.texParameteri(x,n.TEXTURE_WRAP_T,K[g.wrapT]),(x===n.TEXTURE_3D||x===n.TEXTURE_2D_ARRAY)&&n.texParameteri(x,n.TEXTURE_WRAP_R,K[g.wrapR]),n.texParameteri(x,n.TEXTURE_MAG_FILTER,de[g.magFilter]),n.texParameteri(x,n.TEXTURE_MIN_FILTER,de[g.minFilter]),g.compareFunction&&(n.texParameteri(x,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(x,n.TEXTURE_COMPARE_FUNC,ge[g.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(g.magFilter===an||g.minFilter!==Qr&&g.minFilter!==yi||g.type===Bn&&e.has("OES_texture_float_linear")===!1)return;if(g.anisotropy>1||i.get(g).__currentAnisotropy){const D=e.get("EXT_texture_filter_anisotropic");n.texParameterf(x,D.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(g.anisotropy,r.getMaxAnisotropy())),i.get(g).__currentAnisotropy=g.anisotropy}}}function ke(x,g){let D=!1;x.__webglInit===void 0&&(x.__webglInit=!0,g.addEventListener("dispose",C));const V=g.source;let J=d.get(V);J===void 0&&(J={},d.set(V,J));const G=se(g);if(G!==x.__cacheKey){J[G]===void 0&&(J[G]={texture:n.createTexture(),usedTimes:0},o.memory.textures++,D=!0),J[G].usedTimes++;const Se=J[x.__cacheKey];Se!==void 0&&(J[x.__cacheKey].usedTimes--,Se.usedTimes===0&&T(g)),x.__cacheKey=G,x.__webglTexture=J[G].texture}return D}function Ze(x,g,D){return Math.floor(Math.floor(x/D)/g)}function Xe(x,g,D,V){const G=x.updateRanges;if(G.length===0)t.texSubImage2D(n.TEXTURE_2D,0,0,0,g.width,g.height,D,V,g.data);else{G.sort((ce,ve)=>ce.start-ve.start);let Se=0;for(let ce=1;ce<G.length;ce++){const ve=G[Se],Ce=G[ce],be=ve.start+ve.count,me=Ze(Ce.start,g.width,4),Be=Ze(ve.start,g.width,4);Ce.start<=be+1&&me===Be&&Ze(Ce.start+Ce.count-1,g.width,4)===me?ve.count=Math.max(ve.count,Ce.start+Ce.count-ve.start):(++Se,G[Se]=Ce)}G.length=Se+1;const le=n.getParameter(n.UNPACK_ROW_LENGTH),Ee=n.getParameter(n.UNPACK_SKIP_PIXELS),Te=n.getParameter(n.UNPACK_SKIP_ROWS);n.pixelStorei(n.UNPACK_ROW_LENGTH,g.width);for(let ce=0,ve=G.length;ce<ve;ce++){const Ce=G[ce],be=Math.floor(Ce.start/4),me=Math.ceil(Ce.count/4),Be=be%g.width,I=Math.floor(be/g.width),he=me,pe=1;n.pixelStorei(n.UNPACK_SKIP_PIXELS,Be),n.pixelStorei(n.UNPACK_SKIP_ROWS,I),t.texSubImage2D(n.TEXTURE_2D,0,Be,I,he,pe,D,V,g.data)}x.clearUpdateRanges(),n.pixelStorei(n.UNPACK_ROW_LENGTH,le),n.pixelStorei(n.UNPACK_SKIP_PIXELS,Ee),n.pixelStorei(n.UNPACK_SKIP_ROWS,Te)}}function ee(x,g,D){let V=n.TEXTURE_2D;(g.isDataArrayTexture||g.isCompressedArrayTexture)&&(V=n.TEXTURE_2D_ARRAY),g.isData3DTexture&&(V=n.TEXTURE_3D);const J=ke(x,g),G=g.source;t.bindTexture(V,x.__webglTexture,n.TEXTURE0+D);const Se=i.get(G);if(G.version!==Se.__version||J===!0){t.activeTexture(n.TEXTURE0+D);const le=Qe.getPrimaries(Qe.workingColorSpace),Ee=g.colorSpace===ei?null:Qe.getPrimaries(g.colorSpace),Te=g.colorSpace===ei||le===Ee?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,g.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,g.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,g.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,Te);let ce=M(g.image,!1,r.maxTextureSize);ce=ne(g,ce);const ve=s.convert(g.format,g.colorSpace),Ce=s.convert(g.type);let be=b(g.internalFormat,ve,Ce,g.colorSpace,g.isVideoTexture);Le(V,g);let me;const Be=g.mipmaps,I=g.isVideoTexture!==!0,he=Se.__version===void 0||J===!0,pe=G.dataReady,Re=R(g,ce);if(g.isDepthTexture)be=E(g.format===Or,g.type),he&&(I?t.texStorage2D(n.TEXTURE_2D,1,be,ce.width,ce.height):t.texImage2D(n.TEXTURE_2D,0,be,ce.width,ce.height,0,ve,Ce,null));else if(g.isDataTexture)if(Be.length>0){I&&he&&t.texStorage2D(n.TEXTURE_2D,Re,be,Be[0].width,Be[0].height);for(let ue=0,re=Be.length;ue<re;ue++)me=Be[ue],I?pe&&t.texSubImage2D(n.TEXTURE_2D,ue,0,0,me.width,me.height,ve,Ce,me.data):t.texImage2D(n.TEXTURE_2D,ue,be,me.width,me.height,0,ve,Ce,me.data);g.generateMipmaps=!1}else I?(he&&t.texStorage2D(n.TEXTURE_2D,Re,be,ce.width,ce.height),pe&&Xe(g,ce,ve,Ce)):t.texImage2D(n.TEXTURE_2D,0,be,ce.width,ce.height,0,ve,Ce,ce.data);else if(g.isCompressedTexture)if(g.isCompressedArrayTexture){I&&he&&t.texStorage3D(n.TEXTURE_2D_ARRAY,Re,be,Be[0].width,Be[0].height,ce.depth);for(let ue=0,re=Be.length;ue<re;ue++)if(me=Be[ue],g.format!==nn)if(ve!==null)if(I){if(pe)if(g.layerUpdates.size>0){const De=Vc(me.width,me.height,g.format,g.type);for(const ze of g.layerUpdates){const ct=me.data.subarray(ze*De/me.data.BYTES_PER_ELEMENT,(ze+1)*De/me.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,ue,0,0,ze,me.width,me.height,1,ve,ct)}g.clearLayerUpdates()}else t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,ue,0,0,0,me.width,me.height,ce.depth,ve,me.data)}else t.compressedTexImage3D(n.TEXTURE_2D_ARRAY,ue,be,me.width,me.height,ce.depth,0,me.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else I?pe&&t.texSubImage3D(n.TEXTURE_2D_ARRAY,ue,0,0,0,me.width,me.height,ce.depth,ve,Ce,me.data):t.texImage3D(n.TEXTURE_2D_ARRAY,ue,be,me.width,me.height,ce.depth,0,ve,Ce,me.data)}else{I&&he&&t.texStorage2D(n.TEXTURE_2D,Re,be,Be[0].width,Be[0].height);for(let ue=0,re=Be.length;ue<re;ue++)me=Be[ue],g.format!==nn?ve!==null?I?pe&&t.compressedTexSubImage2D(n.TEXTURE_2D,ue,0,0,me.width,me.height,ve,me.data):t.compressedTexImage2D(n.TEXTURE_2D,ue,be,me.width,me.height,0,me.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):I?pe&&t.texSubImage2D(n.TEXTURE_2D,ue,0,0,me.width,me.height,ve,Ce,me.data):t.texImage2D(n.TEXTURE_2D,ue,be,me.width,me.height,0,ve,Ce,me.data)}else if(g.isDataArrayTexture)if(I){if(he&&t.texStorage3D(n.TEXTURE_2D_ARRAY,Re,be,ce.width,ce.height,ce.depth),pe)if(g.layerUpdates.size>0){const ue=Vc(ce.width,ce.height,g.format,g.type);for(const re of g.layerUpdates){const De=ce.data.subarray(re*ue/ce.data.BYTES_PER_ELEMENT,(re+1)*ue/ce.data.BYTES_PER_ELEMENT);t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,re,ce.width,ce.height,1,ve,Ce,De)}g.clearLayerUpdates()}else t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,ce.width,ce.height,ce.depth,ve,Ce,ce.data)}else t.texImage3D(n.TEXTURE_2D_ARRAY,0,be,ce.width,ce.height,ce.depth,0,ve,Ce,ce.data);else if(g.isData3DTexture)I?(he&&t.texStorage3D(n.TEXTURE_3D,Re,be,ce.width,ce.height,ce.depth),pe&&t.texSubImage3D(n.TEXTURE_3D,0,0,0,0,ce.width,ce.height,ce.depth,ve,Ce,ce.data)):t.texImage3D(n.TEXTURE_3D,0,be,ce.width,ce.height,ce.depth,0,ve,Ce,ce.data);else if(g.isFramebufferTexture){if(he)if(I)t.texStorage2D(n.TEXTURE_2D,Re,be,ce.width,ce.height);else{let ue=ce.width,re=ce.height;for(let De=0;De<Re;De++)t.texImage2D(n.TEXTURE_2D,De,be,ue,re,0,ve,Ce,null),ue>>=1,re>>=1}}else if(Be.length>0){if(I&&he){const ue=xe(Be[0]);t.texStorage2D(n.TEXTURE_2D,Re,be,ue.width,ue.height)}for(let ue=0,re=Be.length;ue<re;ue++)me=Be[ue],I?pe&&t.texSubImage2D(n.TEXTURE_2D,ue,0,0,ve,Ce,me):t.texImage2D(n.TEXTURE_2D,ue,be,ve,Ce,me);g.generateMipmaps=!1}else if(I){if(he){const ue=xe(ce);t.texStorage2D(n.TEXTURE_2D,Re,be,ue.width,ue.height)}pe&&t.texSubImage2D(n.TEXTURE_2D,0,0,0,ve,Ce,ce)}else t.texImage2D(n.TEXTURE_2D,0,be,ve,Ce,ce);m(g)&&h(V),Se.__version=G.version,g.onUpdate&&g.onUpdate(g)}x.__version=g.version}function oe(x,g,D){if(g.image.length!==6)return;const V=ke(x,g),J=g.source;t.bindTexture(n.TEXTURE_CUBE_MAP,x.__webglTexture,n.TEXTURE0+D);const G=i.get(J);if(J.version!==G.__version||V===!0){t.activeTexture(n.TEXTURE0+D);const Se=Qe.getPrimaries(Qe.workingColorSpace),le=g.colorSpace===ei?null:Qe.getPrimaries(g.colorSpace),Ee=g.colorSpace===ei||Se===le?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,g.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,g.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,g.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,Ee);const Te=g.isCompressedTexture||g.image[0].isCompressedTexture,ce=g.image[0]&&g.image[0].isDataTexture,ve=[];for(let re=0;re<6;re++)!Te&&!ce?ve[re]=M(g.image[re],!0,r.maxCubemapSize):ve[re]=ce?g.image[re].image:g.image[re],ve[re]=ne(g,ve[re]);const Ce=ve[0],be=s.convert(g.format,g.colorSpace),me=s.convert(g.type),Be=b(g.internalFormat,be,me,g.colorSpace),I=g.isVideoTexture!==!0,he=G.__version===void 0||V===!0,pe=J.dataReady;let Re=R(g,Ce);Le(n.TEXTURE_CUBE_MAP,g);let ue;if(Te){I&&he&&t.texStorage2D(n.TEXTURE_CUBE_MAP,Re,Be,Ce.width,Ce.height);for(let re=0;re<6;re++){ue=ve[re].mipmaps;for(let De=0;De<ue.length;De++){const ze=ue[De];g.format!==nn?be!==null?I?pe&&t.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+re,De,0,0,ze.width,ze.height,be,ze.data):t.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+re,De,Be,ze.width,ze.height,0,ze.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):I?pe&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+re,De,0,0,ze.width,ze.height,be,me,ze.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+re,De,Be,ze.width,ze.height,0,be,me,ze.data)}}}else{if(ue=g.mipmaps,I&&he){ue.length>0&&Re++;const re=xe(ve[0]);t.texStorage2D(n.TEXTURE_CUBE_MAP,Re,Be,re.width,re.height)}for(let re=0;re<6;re++)if(ce){I?pe&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+re,0,0,0,ve[re].width,ve[re].height,be,me,ve[re].data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+re,0,Be,ve[re].width,ve[re].height,0,be,me,ve[re].data);for(let De=0;De<ue.length;De++){const ct=ue[De].image[re].image;I?pe&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+re,De+1,0,0,ct.width,ct.height,be,me,ct.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+re,De+1,Be,ct.width,ct.height,0,be,me,ct.data)}}else{I?pe&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+re,0,0,0,be,me,ve[re]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+re,0,Be,be,me,ve[re]);for(let De=0;De<ue.length;De++){const ze=ue[De];I?pe&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+re,De+1,0,0,be,me,ze.image[re]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+re,De+1,Be,be,me,ze.image[re])}}}m(g)&&h(n.TEXTURE_CUBE_MAP),G.__version=J.version,g.onUpdate&&g.onUpdate(g)}x.__version=g.version}function ye(x,g,D,V,J,G){const Se=s.convert(D.format,D.colorSpace),le=s.convert(D.type),Ee=b(D.internalFormat,Se,le,D.colorSpace),Te=i.get(g),ce=i.get(D);if(ce.__renderTarget=g,!Te.__hasExternalTextures){const ve=Math.max(1,g.width>>G),Ce=Math.max(1,g.height>>G);J===n.TEXTURE_3D||J===n.TEXTURE_2D_ARRAY?t.texImage3D(J,G,Ee,ve,Ce,g.depth,0,Se,le,null):t.texImage2D(J,G,Ee,ve,Ce,0,Se,le,null)}t.bindFramebuffer(n.FRAMEBUFFER,x),$(g)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,V,J,ce.__webglTexture,0,ae(g)):(J===n.TEXTURE_2D||J>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&J<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,V,J,ce.__webglTexture,G),t.bindFramebuffer(n.FRAMEBUFFER,null)}function Ue(x,g,D){if(n.bindRenderbuffer(n.RENDERBUFFER,x),g.depthBuffer){const V=g.depthTexture,J=V&&V.isDepthTexture?V.type:null,G=E(g.stencilBuffer,J),Se=g.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,le=ae(g);$(g)?a.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,le,G,g.width,g.height):D?n.renderbufferStorageMultisample(n.RENDERBUFFER,le,G,g.width,g.height):n.renderbufferStorage(n.RENDERBUFFER,G,g.width,g.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,Se,n.RENDERBUFFER,x)}else{const V=g.textures;for(let J=0;J<V.length;J++){const G=V[J],Se=s.convert(G.format,G.colorSpace),le=s.convert(G.type),Ee=b(G.internalFormat,Se,le,G.colorSpace),Te=ae(g);D&&$(g)===!1?n.renderbufferStorageMultisample(n.RENDERBUFFER,Te,Ee,g.width,g.height):$(g)?a.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,Te,Ee,g.width,g.height):n.renderbufferStorage(n.RENDERBUFFER,Ee,g.width,g.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function we(x,g){if(g&&g.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(n.FRAMEBUFFER,x),!(g.depthTexture&&g.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const V=i.get(g.depthTexture);V.__renderTarget=g,(!V.__webglTexture||g.depthTexture.image.width!==g.width||g.depthTexture.image.height!==g.height)&&(g.depthTexture.image.width=g.width,g.depthTexture.image.height=g.height,g.depthTexture.needsUpdate=!0),ie(g.depthTexture,0);const J=V.__webglTexture,G=ae(g);if(g.depthTexture.format===Fr)$(g)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,J,0,G):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,J,0);else if(g.depthTexture.format===Or)$(g)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,J,0,G):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,J,0);else throw new Error("Unknown depthTexture format")}function qe(x){const g=i.get(x),D=x.isWebGLCubeRenderTarget===!0;if(g.__boundDepthTexture!==x.depthTexture){const V=x.depthTexture;if(g.__depthDisposeCallback&&g.__depthDisposeCallback(),V){const J=()=>{delete g.__boundDepthTexture,delete g.__depthDisposeCallback,V.removeEventListener("dispose",J)};V.addEventListener("dispose",J),g.__depthDisposeCallback=J}g.__boundDepthTexture=V}if(x.depthTexture&&!g.__autoAllocateDepthBuffer){if(D)throw new Error("target.depthTexture not supported in Cube render targets");const V=x.texture.mipmaps;V&&V.length>0?we(g.__webglFramebuffer[0],x):we(g.__webglFramebuffer,x)}else if(D){g.__webglDepthbuffer=[];for(let V=0;V<6;V++)if(t.bindFramebuffer(n.FRAMEBUFFER,g.__webglFramebuffer[V]),g.__webglDepthbuffer[V]===void 0)g.__webglDepthbuffer[V]=n.createRenderbuffer(),Ue(g.__webglDepthbuffer[V],x,!1);else{const J=x.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,G=g.__webglDepthbuffer[V];n.bindRenderbuffer(n.RENDERBUFFER,G),n.framebufferRenderbuffer(n.FRAMEBUFFER,J,n.RENDERBUFFER,G)}}else{const V=x.texture.mipmaps;if(V&&V.length>0?t.bindFramebuffer(n.FRAMEBUFFER,g.__webglFramebuffer[0]):t.bindFramebuffer(n.FRAMEBUFFER,g.__webglFramebuffer),g.__webglDepthbuffer===void 0)g.__webglDepthbuffer=n.createRenderbuffer(),Ue(g.__webglDepthbuffer,x,!1);else{const J=x.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,G=g.__webglDepthbuffer;n.bindRenderbuffer(n.RENDERBUFFER,G),n.framebufferRenderbuffer(n.FRAMEBUFFER,J,n.RENDERBUFFER,G)}}t.bindFramebuffer(n.FRAMEBUFFER,null)}function A(x,g,D){const V=i.get(x);g!==void 0&&ye(V.__webglFramebuffer,x,x.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),D!==void 0&&qe(x)}function _(x){const g=x.texture,D=i.get(x),V=i.get(g);x.addEventListener("dispose",P);const J=x.textures,G=x.isWebGLCubeRenderTarget===!0,Se=J.length>1;if(Se||(V.__webglTexture===void 0&&(V.__webglTexture=n.createTexture()),V.__version=g.version,o.memory.textures++),G){D.__webglFramebuffer=[];for(let le=0;le<6;le++)if(g.mipmaps&&g.mipmaps.length>0){D.__webglFramebuffer[le]=[];for(let Ee=0;Ee<g.mipmaps.length;Ee++)D.__webglFramebuffer[le][Ee]=n.createFramebuffer()}else D.__webglFramebuffer[le]=n.createFramebuffer()}else{if(g.mipmaps&&g.mipmaps.length>0){D.__webglFramebuffer=[];for(let le=0;le<g.mipmaps.length;le++)D.__webglFramebuffer[le]=n.createFramebuffer()}else D.__webglFramebuffer=n.createFramebuffer();if(Se)for(let le=0,Ee=J.length;le<Ee;le++){const Te=i.get(J[le]);Te.__webglTexture===void 0&&(Te.__webglTexture=n.createTexture(),o.memory.textures++)}if(x.samples>0&&$(x)===!1){D.__webglMultisampledFramebuffer=n.createFramebuffer(),D.__webglColorRenderbuffer=[],t.bindFramebuffer(n.FRAMEBUFFER,D.__webglMultisampledFramebuffer);for(let le=0;le<J.length;le++){const Ee=J[le];D.__webglColorRenderbuffer[le]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,D.__webglColorRenderbuffer[le]);const Te=s.convert(Ee.format,Ee.colorSpace),ce=s.convert(Ee.type),ve=b(Ee.internalFormat,Te,ce,Ee.colorSpace,x.isXRRenderTarget===!0),Ce=ae(x);n.renderbufferStorageMultisample(n.RENDERBUFFER,Ce,ve,x.width,x.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+le,n.RENDERBUFFER,D.__webglColorRenderbuffer[le])}n.bindRenderbuffer(n.RENDERBUFFER,null),x.depthBuffer&&(D.__webglDepthRenderbuffer=n.createRenderbuffer(),Ue(D.__webglDepthRenderbuffer,x,!0)),t.bindFramebuffer(n.FRAMEBUFFER,null)}}if(G){t.bindTexture(n.TEXTURE_CUBE_MAP,V.__webglTexture),Le(n.TEXTURE_CUBE_MAP,g);for(let le=0;le<6;le++)if(g.mipmaps&&g.mipmaps.length>0)for(let Ee=0;Ee<g.mipmaps.length;Ee++)ye(D.__webglFramebuffer[le][Ee],x,g,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+le,Ee);else ye(D.__webglFramebuffer[le],x,g,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+le,0);m(g)&&h(n.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Se){for(let le=0,Ee=J.length;le<Ee;le++){const Te=J[le],ce=i.get(Te);let ve=n.TEXTURE_2D;(x.isWebGL3DRenderTarget||x.isWebGLArrayRenderTarget)&&(ve=x.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),t.bindTexture(ve,ce.__webglTexture),Le(ve,Te),ye(D.__webglFramebuffer,x,Te,n.COLOR_ATTACHMENT0+le,ve,0),m(Te)&&h(ve)}t.unbindTexture()}else{let le=n.TEXTURE_2D;if((x.isWebGL3DRenderTarget||x.isWebGLArrayRenderTarget)&&(le=x.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),t.bindTexture(le,V.__webglTexture),Le(le,g),g.mipmaps&&g.mipmaps.length>0)for(let Ee=0;Ee<g.mipmaps.length;Ee++)ye(D.__webglFramebuffer[Ee],x,g,n.COLOR_ATTACHMENT0,le,Ee);else ye(D.__webglFramebuffer,x,g,n.COLOR_ATTACHMENT0,le,0);m(g)&&h(le),t.unbindTexture()}x.depthBuffer&&qe(x)}function O(x){const g=x.textures;for(let D=0,V=g.length;D<V;D++){const J=g[D];if(m(J)){const G=w(x),Se=i.get(J).__webglTexture;t.bindTexture(G,Se),h(G),t.unbindTexture()}}}const W=[],k=[];function z(x){if(x.samples>0){if($(x)===!1){const g=x.textures,D=x.width,V=x.height;let J=n.COLOR_BUFFER_BIT;const G=x.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,Se=i.get(x),le=g.length>1;if(le)for(let Te=0;Te<g.length;Te++)t.bindFramebuffer(n.FRAMEBUFFER,Se.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+Te,n.RENDERBUFFER,null),t.bindFramebuffer(n.FRAMEBUFFER,Se.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+Te,n.TEXTURE_2D,null,0);t.bindFramebuffer(n.READ_FRAMEBUFFER,Se.__webglMultisampledFramebuffer);const Ee=x.texture.mipmaps;Ee&&Ee.length>0?t.bindFramebuffer(n.DRAW_FRAMEBUFFER,Se.__webglFramebuffer[0]):t.bindFramebuffer(n.DRAW_FRAMEBUFFER,Se.__webglFramebuffer);for(let Te=0;Te<g.length;Te++){if(x.resolveDepthBuffer&&(x.depthBuffer&&(J|=n.DEPTH_BUFFER_BIT),x.stencilBuffer&&x.resolveStencilBuffer&&(J|=n.STENCIL_BUFFER_BIT)),le){n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,Se.__webglColorRenderbuffer[Te]);const ce=i.get(g[Te]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,ce,0)}n.blitFramebuffer(0,0,D,V,0,0,D,V,J,n.NEAREST),l===!0&&(W.length=0,k.length=0,W.push(n.COLOR_ATTACHMENT0+Te),x.depthBuffer&&x.resolveDepthBuffer===!1&&(W.push(G),k.push(G),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,k)),n.invalidateFramebuffer(n.READ_FRAMEBUFFER,W))}if(t.bindFramebuffer(n.READ_FRAMEBUFFER,null),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),le)for(let Te=0;Te<g.length;Te++){t.bindFramebuffer(n.FRAMEBUFFER,Se.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+Te,n.RENDERBUFFER,Se.__webglColorRenderbuffer[Te]);const ce=i.get(g[Te]).__webglTexture;t.bindFramebuffer(n.FRAMEBUFFER,Se.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+Te,n.TEXTURE_2D,ce,0)}t.bindFramebuffer(n.DRAW_FRAMEBUFFER,Se.__webglMultisampledFramebuffer)}else if(x.depthBuffer&&x.resolveDepthBuffer===!1&&l){const g=x.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[g])}}}function ae(x){return Math.min(r.maxSamples,x.samples)}function $(x){const g=i.get(x);return x.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&g.__useRenderToTexture!==!1}function te(x){const g=o.render.frame;u.get(x)!==g&&(u.set(x,g),x.update())}function ne(x,g){const D=x.colorSpace,V=x.format,J=x.type;return x.isCompressedTexture===!0||x.isVideoTexture===!0||D!==rr&&D!==ei&&(Qe.getTransfer(D)===st?(V!==nn||J!==En)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",D)),g}function xe(x){return typeof HTMLImageElement<"u"&&x instanceof HTMLImageElement?(c.width=x.naturalWidth||x.width,c.height=x.naturalHeight||x.height):typeof VideoFrame<"u"&&x instanceof VideoFrame?(c.width=x.displayWidth,c.height=x.displayHeight):(c.width=x.width,c.height=x.height),c}this.allocateTextureUnit=Z,this.resetTextureUnits=X,this.setTexture2D=ie,this.setTexture2DArray=j,this.setTexture3D=Q,this.setTextureCube=U,this.rebindTextures=A,this.setupRenderTarget=_,this.updateRenderTargetMipmap=O,this.updateMultisampleRenderTarget=z,this.setupDepthRenderbuffer=qe,this.setupFrameBufferTexture=ye,this.useMultisampledRTT=$}function Nx(n,e){function t(i,r=ei){let s;const o=Qe.getTransfer(r);if(i===En)return n.UNSIGNED_BYTE;if(i===El)return n.UNSIGNED_SHORT_4_4_4_4;if(i===yl)return n.UNSIGNED_SHORT_5_5_5_1;if(i===bf)return n.UNSIGNED_INT_5_9_9_9_REV;if(i===Af)return n.UNSIGNED_INT_10F_11F_11F_REV;if(i===yf)return n.BYTE;if(i===Tf)return n.SHORT;if(i===Ur)return n.UNSIGNED_SHORT;if(i===Sl)return n.INT;if(i===bi)return n.UNSIGNED_INT;if(i===Bn)return n.FLOAT;if(i===Gr)return n.HALF_FLOAT;if(i===wf)return n.ALPHA;if(i===Rf)return n.RGB;if(i===nn)return n.RGBA;if(i===Fr)return n.DEPTH_COMPONENT;if(i===Or)return n.DEPTH_STENCIL;if(i===Cf)return n.RED;if(i===Tl)return n.RED_INTEGER;if(i===Pf)return n.RG;if(i===bl)return n.RG_INTEGER;if(i===Al)return n.RGBA_INTEGER;if(i===As||i===ws||i===Rs||i===Cs)if(o===st)if(s=e.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(i===As)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===ws)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===Rs)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===Cs)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=e.get("WEBGL_compressed_texture_s3tc"),s!==null){if(i===As)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===ws)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===Rs)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===Cs)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===Ma||i===Sa||i===Ea||i===ya)if(s=e.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(i===Ma)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===Sa)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===Ea)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===ya)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===Ta||i===ba||i===Aa)if(s=e.get("WEBGL_compressed_texture_etc"),s!==null){if(i===Ta||i===ba)return o===st?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(i===Aa)return o===st?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===wa||i===Ra||i===Ca||i===Pa||i===Da||i===La||i===Ia||i===Ua||i===Na||i===Fa||i===Oa||i===Ba||i===za||i===Ha)if(s=e.get("WEBGL_compressed_texture_astc"),s!==null){if(i===wa)return o===st?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===Ra)return o===st?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===Ca)return o===st?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===Pa)return o===st?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===Da)return o===st?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===La)return o===st?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===Ia)return o===st?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===Ua)return o===st?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===Na)return o===st?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===Fa)return o===st?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===Oa)return o===st?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===Ba)return o===st?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===za)return o===st?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Ha)return o===st?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===Va||i===Ga||i===ka)if(s=e.get("EXT_texture_compression_bptc"),s!==null){if(i===Va)return o===st?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===Ga)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===ka)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===Wa||i===Xa||i===qa||i===Ya)if(s=e.get("EXT_texture_compression_rgtc"),s!==null){if(i===Wa)return s.COMPRESSED_RED_RGTC1_EXT;if(i===Xa)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===qa)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===Ya)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===Nr?n.UNSIGNED_INT_24_8:n[i]!==void 0?n[i]:null}return{convert:t}}const Fx=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Ox=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class Bx{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const i=new Wf(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=i}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,i=new ln({vertexShader:Fx,fragmentShader:Ox,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new rn(new Qs(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class zx extends or{constructor(e,t){super();const i=this;let r=null,s=1,o=null,a="local-floor",l=1,c=null,u=null,f=null,d=null,p=null,v=null;const M=typeof XRWebGLBinding<"u",m=new Bx,h={},w=t.getContextAttributes();let b=null,E=null;const R=[],C=[],P=new Ye;let B=null;const T=new Wt;T.viewport=new ot;const y=new Wt;y.viewport=new ot;const L=[T,y],X=new o_;let Z=null,se=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(ee){let oe=R[ee];return oe===void 0&&(oe=new zo,R[ee]=oe),oe.getTargetRaySpace()},this.getControllerGrip=function(ee){let oe=R[ee];return oe===void 0&&(oe=new zo,R[ee]=oe),oe.getGripSpace()},this.getHand=function(ee){let oe=R[ee];return oe===void 0&&(oe=new zo,R[ee]=oe),oe.getHandSpace()};function ie(ee){const oe=C.indexOf(ee.inputSource);if(oe===-1)return;const ye=R[oe];ye!==void 0&&(ye.update(ee.inputSource,ee.frame,c||o),ye.dispatchEvent({type:ee.type,data:ee.inputSource}))}function j(){r.removeEventListener("select",ie),r.removeEventListener("selectstart",ie),r.removeEventListener("selectend",ie),r.removeEventListener("squeeze",ie),r.removeEventListener("squeezestart",ie),r.removeEventListener("squeezeend",ie),r.removeEventListener("end",j),r.removeEventListener("inputsourceschange",Q);for(let ee=0;ee<R.length;ee++){const oe=C[ee];oe!==null&&(C[ee]=null,R[ee].disconnect(oe))}Z=null,se=null,m.reset();for(const ee in h)delete h[ee];e.setRenderTarget(b),p=null,d=null,f=null,r=null,E=null,Xe.stop(),i.isPresenting=!1,e.setPixelRatio(B),e.setSize(P.width,P.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(ee){s=ee,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(ee){a=ee,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(ee){c=ee},this.getBaseLayer=function(){return d!==null?d:p},this.getBinding=function(){return f===null&&M&&(f=new XRWebGLBinding(r,t)),f},this.getFrame=function(){return v},this.getSession=function(){return r},this.setSession=async function(ee){if(r=ee,r!==null){if(b=e.getRenderTarget(),r.addEventListener("select",ie),r.addEventListener("selectstart",ie),r.addEventListener("selectend",ie),r.addEventListener("squeeze",ie),r.addEventListener("squeezestart",ie),r.addEventListener("squeezeend",ie),r.addEventListener("end",j),r.addEventListener("inputsourceschange",Q),w.xrCompatible!==!0&&await t.makeXRCompatible(),B=e.getPixelRatio(),e.getSize(P),M&&"createProjectionLayer"in XRWebGLBinding.prototype){let ye=null,Ue=null,we=null;w.depth&&(we=w.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,ye=w.stencil?Or:Fr,Ue=w.stencil?Nr:bi);const qe={colorFormat:t.RGBA8,depthFormat:we,scaleFactor:s};f=this.getBinding(),d=f.createProjectionLayer(qe),r.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),E=new Ai(d.textureWidth,d.textureHeight,{format:nn,type:En,depthTexture:new kf(d.textureWidth,d.textureHeight,Ue,void 0,void 0,void 0,void 0,void 0,void 0,ye),stencilBuffer:w.stencil,colorSpace:e.outputColorSpace,samples:w.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}else{const ye={antialias:w.antialias,alpha:!0,depth:w.depth,stencil:w.stencil,framebufferScaleFactor:s};p=new XRWebGLLayer(r,t,ye),r.updateRenderState({baseLayer:p}),e.setPixelRatio(1),e.setSize(p.framebufferWidth,p.framebufferHeight,!1),E=new Ai(p.framebufferWidth,p.framebufferHeight,{format:nn,type:En,colorSpace:e.outputColorSpace,stencilBuffer:w.stencil,resolveDepthBuffer:p.ignoreDepthValues===!1,resolveStencilBuffer:p.ignoreDepthValues===!1})}E.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await r.requestReferenceSpace(a),Xe.setContext(r),Xe.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return m.getDepthTexture()};function Q(ee){for(let oe=0;oe<ee.removed.length;oe++){const ye=ee.removed[oe],Ue=C.indexOf(ye);Ue>=0&&(C[Ue]=null,R[Ue].disconnect(ye))}for(let oe=0;oe<ee.added.length;oe++){const ye=ee.added[oe];let Ue=C.indexOf(ye);if(Ue===-1){for(let qe=0;qe<R.length;qe++)if(qe>=C.length){C.push(ye),Ue=qe;break}else if(C[qe]===null){C[qe]=ye,Ue=qe;break}if(Ue===-1)break}const we=R[Ue];we&&we.connect(ye)}}const U=new H,K=new H;function de(ee,oe,ye){U.setFromMatrixPosition(oe.matrixWorld),K.setFromMatrixPosition(ye.matrixWorld);const Ue=U.distanceTo(K),we=oe.projectionMatrix.elements,qe=ye.projectionMatrix.elements,A=we[14]/(we[10]-1),_=we[14]/(we[10]+1),O=(we[9]+1)/we[5],W=(we[9]-1)/we[5],k=(we[8]-1)/we[0],z=(qe[8]+1)/qe[0],ae=A*k,$=A*z,te=Ue/(-k+z),ne=te*-k;if(oe.matrixWorld.decompose(ee.position,ee.quaternion,ee.scale),ee.translateX(ne),ee.translateZ(te),ee.matrixWorld.compose(ee.position,ee.quaternion,ee.scale),ee.matrixWorldInverse.copy(ee.matrixWorld).invert(),we[10]===-1)ee.projectionMatrix.copy(oe.projectionMatrix),ee.projectionMatrixInverse.copy(oe.projectionMatrixInverse);else{const xe=A+te,x=_+te,g=ae-ne,D=$+(Ue-ne),V=O*_/x*xe,J=W*_/x*xe;ee.projectionMatrix.makePerspective(g,D,V,J,xe,x),ee.projectionMatrixInverse.copy(ee.projectionMatrix).invert()}}function ge(ee,oe){oe===null?ee.matrixWorld.copy(ee.matrix):ee.matrixWorld.multiplyMatrices(oe.matrixWorld,ee.matrix),ee.matrixWorldInverse.copy(ee.matrixWorld).invert()}this.updateCamera=function(ee){if(r===null)return;let oe=ee.near,ye=ee.far;m.texture!==null&&(m.depthNear>0&&(oe=m.depthNear),m.depthFar>0&&(ye=m.depthFar)),X.near=y.near=T.near=oe,X.far=y.far=T.far=ye,(Z!==X.near||se!==X.far)&&(r.updateRenderState({depthNear:X.near,depthFar:X.far}),Z=X.near,se=X.far),X.layers.mask=ee.layers.mask|6,T.layers.mask=X.layers.mask&3,y.layers.mask=X.layers.mask&5;const Ue=ee.parent,we=X.cameras;ge(X,Ue);for(let qe=0;qe<we.length;qe++)ge(we[qe],Ue);we.length===2?de(X,T,y):X.projectionMatrix.copy(T.projectionMatrix),Le(ee,X,Ue)};function Le(ee,oe,ye){ye===null?ee.matrix.copy(oe.matrixWorld):(ee.matrix.copy(ye.matrixWorld),ee.matrix.invert(),ee.matrix.multiply(oe.matrixWorld)),ee.matrix.decompose(ee.position,ee.quaternion,ee.scale),ee.updateMatrixWorld(!0),ee.projectionMatrix.copy(oe.projectionMatrix),ee.projectionMatrixInverse.copy(oe.projectionMatrixInverse),ee.isPerspectiveCamera&&(ee.fov=$a*2*Math.atan(1/ee.projectionMatrix.elements[5]),ee.zoom=1)}this.getCamera=function(){return X},this.getFoveation=function(){if(!(d===null&&p===null))return l},this.setFoveation=function(ee){l=ee,d!==null&&(d.fixedFoveation=ee),p!==null&&p.fixedFoveation!==void 0&&(p.fixedFoveation=ee)},this.hasDepthSensing=function(){return m.texture!==null},this.getDepthSensingMesh=function(){return m.getMesh(X)},this.getCameraTexture=function(ee){return h[ee]};let ke=null;function Ze(ee,oe){if(u=oe.getViewerPose(c||o),v=oe,u!==null){const ye=u.views;p!==null&&(e.setRenderTargetFramebuffer(E,p.framebuffer),e.setRenderTarget(E));let Ue=!1;ye.length!==X.cameras.length&&(X.cameras.length=0,Ue=!0);for(let _=0;_<ye.length;_++){const O=ye[_];let W=null;if(p!==null)W=p.getViewport(O);else{const z=f.getViewSubImage(d,O);W=z.viewport,_===0&&(e.setRenderTargetTextures(E,z.colorTexture,z.depthStencilTexture),e.setRenderTarget(E))}let k=L[_];k===void 0&&(k=new Wt,k.layers.enable(_),k.viewport=new ot,L[_]=k),k.matrix.fromArray(O.transform.matrix),k.matrix.decompose(k.position,k.quaternion,k.scale),k.projectionMatrix.fromArray(O.projectionMatrix),k.projectionMatrixInverse.copy(k.projectionMatrix).invert(),k.viewport.set(W.x,W.y,W.width,W.height),_===0&&(X.matrix.copy(k.matrix),X.matrix.decompose(X.position,X.quaternion,X.scale)),Ue===!0&&X.cameras.push(k)}const we=r.enabledFeatures;if(we&&we.includes("depth-sensing")&&r.depthUsage=="gpu-optimized"&&M){f=i.getBinding();const _=f.getDepthInformation(ye[0]);_&&_.isValid&&_.texture&&m.init(_,r.renderState)}if(we&&we.includes("camera-access")&&M){e.state.unbindTexture(),f=i.getBinding();for(let _=0;_<ye.length;_++){const O=ye[_].camera;if(O){let W=h[O];W||(W=new Wf,h[O]=W);const k=f.getCameraImage(O);W.sourceTexture=k}}}}for(let ye=0;ye<R.length;ye++){const Ue=C[ye],we=R[ye];Ue!==null&&we!==void 0&&we.update(Ue,oe,c||o)}ke&&ke(ee,oe),oe.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:oe}),v=null}const Xe=new qf;Xe.setAnimationLoop(Ze),this.setAnimationLoop=function(ee){ke=ee},this.dispose=function(){}}}const mi=new kn,Hx=new mt;function Vx(n,e){function t(m,h){m.matrixAutoUpdate===!0&&m.updateMatrix(),h.value.copy(m.matrix)}function i(m,h){h.color.getRGB(m.fogColor.value,Hf(n)),h.isFog?(m.fogNear.value=h.near,m.fogFar.value=h.far):h.isFogExp2&&(m.fogDensity.value=h.density)}function r(m,h,w,b,E){h.isMeshBasicMaterial||h.isMeshLambertMaterial?s(m,h):h.isMeshToonMaterial?(s(m,h),f(m,h)):h.isMeshPhongMaterial?(s(m,h),u(m,h)):h.isMeshStandardMaterial?(s(m,h),d(m,h),h.isMeshPhysicalMaterial&&p(m,h,E)):h.isMeshMatcapMaterial?(s(m,h),v(m,h)):h.isMeshDepthMaterial?s(m,h):h.isMeshDistanceMaterial?(s(m,h),M(m,h)):h.isMeshNormalMaterial?s(m,h):h.isLineBasicMaterial?(o(m,h),h.isLineDashedMaterial&&a(m,h)):h.isPointsMaterial?l(m,h,w,b):h.isSpriteMaterial?c(m,h):h.isShadowMaterial?(m.color.value.copy(h.color),m.opacity.value=h.opacity):h.isShaderMaterial&&(h.uniformsNeedUpdate=!1)}function s(m,h){m.opacity.value=h.opacity,h.color&&m.diffuse.value.copy(h.color),h.emissive&&m.emissive.value.copy(h.emissive).multiplyScalar(h.emissiveIntensity),h.map&&(m.map.value=h.map,t(h.map,m.mapTransform)),h.alphaMap&&(m.alphaMap.value=h.alphaMap,t(h.alphaMap,m.alphaMapTransform)),h.bumpMap&&(m.bumpMap.value=h.bumpMap,t(h.bumpMap,m.bumpMapTransform),m.bumpScale.value=h.bumpScale,h.side===It&&(m.bumpScale.value*=-1)),h.normalMap&&(m.normalMap.value=h.normalMap,t(h.normalMap,m.normalMapTransform),m.normalScale.value.copy(h.normalScale),h.side===It&&m.normalScale.value.negate()),h.displacementMap&&(m.displacementMap.value=h.displacementMap,t(h.displacementMap,m.displacementMapTransform),m.displacementScale.value=h.displacementScale,m.displacementBias.value=h.displacementBias),h.emissiveMap&&(m.emissiveMap.value=h.emissiveMap,t(h.emissiveMap,m.emissiveMapTransform)),h.specularMap&&(m.specularMap.value=h.specularMap,t(h.specularMap,m.specularMapTransform)),h.alphaTest>0&&(m.alphaTest.value=h.alphaTest);const w=e.get(h),b=w.envMap,E=w.envMapRotation;b&&(m.envMap.value=b,mi.copy(E),mi.x*=-1,mi.y*=-1,mi.z*=-1,b.isCubeTexture&&b.isRenderTargetTexture===!1&&(mi.y*=-1,mi.z*=-1),m.envMapRotation.value.setFromMatrix4(Hx.makeRotationFromEuler(mi)),m.flipEnvMap.value=b.isCubeTexture&&b.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=h.reflectivity,m.ior.value=h.ior,m.refractionRatio.value=h.refractionRatio),h.lightMap&&(m.lightMap.value=h.lightMap,m.lightMapIntensity.value=h.lightMapIntensity,t(h.lightMap,m.lightMapTransform)),h.aoMap&&(m.aoMap.value=h.aoMap,m.aoMapIntensity.value=h.aoMapIntensity,t(h.aoMap,m.aoMapTransform))}function o(m,h){m.diffuse.value.copy(h.color),m.opacity.value=h.opacity,h.map&&(m.map.value=h.map,t(h.map,m.mapTransform))}function a(m,h){m.dashSize.value=h.dashSize,m.totalSize.value=h.dashSize+h.gapSize,m.scale.value=h.scale}function l(m,h,w,b){m.diffuse.value.copy(h.color),m.opacity.value=h.opacity,m.size.value=h.size*w,m.scale.value=b*.5,h.map&&(m.map.value=h.map,t(h.map,m.uvTransform)),h.alphaMap&&(m.alphaMap.value=h.alphaMap,t(h.alphaMap,m.alphaMapTransform)),h.alphaTest>0&&(m.alphaTest.value=h.alphaTest)}function c(m,h){m.diffuse.value.copy(h.color),m.opacity.value=h.opacity,m.rotation.value=h.rotation,h.map&&(m.map.value=h.map,t(h.map,m.mapTransform)),h.alphaMap&&(m.alphaMap.value=h.alphaMap,t(h.alphaMap,m.alphaMapTransform)),h.alphaTest>0&&(m.alphaTest.value=h.alphaTest)}function u(m,h){m.specular.value.copy(h.specular),m.shininess.value=Math.max(h.shininess,1e-4)}function f(m,h){h.gradientMap&&(m.gradientMap.value=h.gradientMap)}function d(m,h){m.metalness.value=h.metalness,h.metalnessMap&&(m.metalnessMap.value=h.metalnessMap,t(h.metalnessMap,m.metalnessMapTransform)),m.roughness.value=h.roughness,h.roughnessMap&&(m.roughnessMap.value=h.roughnessMap,t(h.roughnessMap,m.roughnessMapTransform)),h.envMap&&(m.envMapIntensity.value=h.envMapIntensity)}function p(m,h,w){m.ior.value=h.ior,h.sheen>0&&(m.sheenColor.value.copy(h.sheenColor).multiplyScalar(h.sheen),m.sheenRoughness.value=h.sheenRoughness,h.sheenColorMap&&(m.sheenColorMap.value=h.sheenColorMap,t(h.sheenColorMap,m.sheenColorMapTransform)),h.sheenRoughnessMap&&(m.sheenRoughnessMap.value=h.sheenRoughnessMap,t(h.sheenRoughnessMap,m.sheenRoughnessMapTransform))),h.clearcoat>0&&(m.clearcoat.value=h.clearcoat,m.clearcoatRoughness.value=h.clearcoatRoughness,h.clearcoatMap&&(m.clearcoatMap.value=h.clearcoatMap,t(h.clearcoatMap,m.clearcoatMapTransform)),h.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=h.clearcoatRoughnessMap,t(h.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),h.clearcoatNormalMap&&(m.clearcoatNormalMap.value=h.clearcoatNormalMap,t(h.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(h.clearcoatNormalScale),h.side===It&&m.clearcoatNormalScale.value.negate())),h.dispersion>0&&(m.dispersion.value=h.dispersion),h.iridescence>0&&(m.iridescence.value=h.iridescence,m.iridescenceIOR.value=h.iridescenceIOR,m.iridescenceThicknessMinimum.value=h.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=h.iridescenceThicknessRange[1],h.iridescenceMap&&(m.iridescenceMap.value=h.iridescenceMap,t(h.iridescenceMap,m.iridescenceMapTransform)),h.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=h.iridescenceThicknessMap,t(h.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),h.transmission>0&&(m.transmission.value=h.transmission,m.transmissionSamplerMap.value=w.texture,m.transmissionSamplerSize.value.set(w.width,w.height),h.transmissionMap&&(m.transmissionMap.value=h.transmissionMap,t(h.transmissionMap,m.transmissionMapTransform)),m.thickness.value=h.thickness,h.thicknessMap&&(m.thicknessMap.value=h.thicknessMap,t(h.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=h.attenuationDistance,m.attenuationColor.value.copy(h.attenuationColor)),h.anisotropy>0&&(m.anisotropyVector.value.set(h.anisotropy*Math.cos(h.anisotropyRotation),h.anisotropy*Math.sin(h.anisotropyRotation)),h.anisotropyMap&&(m.anisotropyMap.value=h.anisotropyMap,t(h.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=h.specularIntensity,m.specularColor.value.copy(h.specularColor),h.specularColorMap&&(m.specularColorMap.value=h.specularColorMap,t(h.specularColorMap,m.specularColorMapTransform)),h.specularIntensityMap&&(m.specularIntensityMap.value=h.specularIntensityMap,t(h.specularIntensityMap,m.specularIntensityMapTransform))}function v(m,h){h.matcap&&(m.matcap.value=h.matcap)}function M(m,h){const w=e.get(h).light;m.referencePosition.value.setFromMatrixPosition(w.matrixWorld),m.nearDistance.value=w.shadow.camera.near,m.farDistance.value=w.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:r}}function Gx(n,e,t,i){let r={},s={},o=[];const a=n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS);function l(w,b){const E=b.program;i.uniformBlockBinding(w,E)}function c(w,b){let E=r[w.id];E===void 0&&(v(w),E=u(w),r[w.id]=E,w.addEventListener("dispose",m));const R=b.program;i.updateUBOMapping(w,R);const C=e.render.frame;s[w.id]!==C&&(d(w),s[w.id]=C)}function u(w){const b=f();w.__bindingPointIndex=b;const E=n.createBuffer(),R=w.__size,C=w.usage;return n.bindBuffer(n.UNIFORM_BUFFER,E),n.bufferData(n.UNIFORM_BUFFER,R,C),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,b,E),E}function f(){for(let w=0;w<a;w++)if(o.indexOf(w)===-1)return o.push(w),w;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(w){const b=r[w.id],E=w.uniforms,R=w.__cache;n.bindBuffer(n.UNIFORM_BUFFER,b);for(let C=0,P=E.length;C<P;C++){const B=Array.isArray(E[C])?E[C]:[E[C]];for(let T=0,y=B.length;T<y;T++){const L=B[T];if(p(L,C,T,R)===!0){const X=L.__offset,Z=Array.isArray(L.value)?L.value:[L.value];let se=0;for(let ie=0;ie<Z.length;ie++){const j=Z[ie],Q=M(j);typeof j=="number"||typeof j=="boolean"?(L.__data[0]=j,n.bufferSubData(n.UNIFORM_BUFFER,X+se,L.__data)):j.isMatrix3?(L.__data[0]=j.elements[0],L.__data[1]=j.elements[1],L.__data[2]=j.elements[2],L.__data[3]=0,L.__data[4]=j.elements[3],L.__data[5]=j.elements[4],L.__data[6]=j.elements[5],L.__data[7]=0,L.__data[8]=j.elements[6],L.__data[9]=j.elements[7],L.__data[10]=j.elements[8],L.__data[11]=0):(j.toArray(L.__data,se),se+=Q.storage/Float32Array.BYTES_PER_ELEMENT)}n.bufferSubData(n.UNIFORM_BUFFER,X,L.__data)}}}n.bindBuffer(n.UNIFORM_BUFFER,null)}function p(w,b,E,R){const C=w.value,P=b+"_"+E;if(R[P]===void 0)return typeof C=="number"||typeof C=="boolean"?R[P]=C:R[P]=C.clone(),!0;{const B=R[P];if(typeof C=="number"||typeof C=="boolean"){if(B!==C)return R[P]=C,!0}else if(B.equals(C)===!1)return B.copy(C),!0}return!1}function v(w){const b=w.uniforms;let E=0;const R=16;for(let P=0,B=b.length;P<B;P++){const T=Array.isArray(b[P])?b[P]:[b[P]];for(let y=0,L=T.length;y<L;y++){const X=T[y],Z=Array.isArray(X.value)?X.value:[X.value];for(let se=0,ie=Z.length;se<ie;se++){const j=Z[se],Q=M(j),U=E%R,K=U%Q.boundary,de=U+K;E+=K,de!==0&&R-de<Q.storage&&(E+=R-de),X.__data=new Float32Array(Q.storage/Float32Array.BYTES_PER_ELEMENT),X.__offset=E,E+=Q.storage}}}const C=E%R;return C>0&&(E+=R-C),w.__size=E,w.__cache={},this}function M(w){const b={boundary:0,storage:0};return typeof w=="number"||typeof w=="boolean"?(b.boundary=4,b.storage=4):w.isVector2?(b.boundary=8,b.storage=8):w.isVector3||w.isColor?(b.boundary=16,b.storage=12):w.isVector4?(b.boundary=16,b.storage=16):w.isMatrix3?(b.boundary=48,b.storage=48):w.isMatrix4?(b.boundary=64,b.storage=64):w.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",w),b}function m(w){const b=w.target;b.removeEventListener("dispose",m);const E=o.indexOf(b.__bindingPointIndex);o.splice(E,1),n.deleteBuffer(r[b.id]),delete r[b.id],delete s[b.id]}function h(){for(const w in r)n.deleteBuffer(r[w]);o=[],r={},s={}}return{bind:l,update:c,dispose:h}}class kx{constructor(e={}){const{canvas:t=Sm(),context:i=null,depth:r=!0,stencil:s=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:f=!1,reversedDepthBuffer:d=!1}=e;this.isWebGLRenderer=!0;let p;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");p=i.getContextAttributes().alpha}else p=o;const v=new Uint32Array(4),M=new Int32Array(4);let m=null,h=null;const w=[],b=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=ii,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const E=this;let R=!1;this._outputColorSpace=jt;let C=0,P=0,B=null,T=-1,y=null;const L=new ot,X=new ot;let Z=null;const se=new je(0);let ie=0,j=t.width,Q=t.height,U=1,K=null,de=null;const ge=new ot(0,0,j,Q),Le=new ot(0,0,j,Q);let ke=!1;const Ze=new Rl;let Xe=!1,ee=!1;const oe=new mt,ye=new H,Ue=new ot,we={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let qe=!1;function A(){return B===null?U:1}let _=i;function O(S,N){return t.getContext(S,N)}try{const S={alpha:!0,depth:r,stencil:s,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:u,failIfMajorPerformanceCaveat:f};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Ml}`),t.addEventListener("webglcontextlost",pe,!1),t.addEventListener("webglcontextrestored",Re,!1),t.addEventListener("webglcontextcreationerror",ue,!1),_===null){const N="webgl2";if(_=O(N,S),_===null)throw O(N)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(S){throw console.error("THREE.WebGLRenderer: "+S.message),S}let W,k,z,ae,$,te,ne,xe,x,g,D,V,J,G,Se,le,Ee,Te,ce,ve,Ce,be,me,Be;function I(){W=new Qv(_),W.init(),be=new Nx(_,W),k=new qv(_,W,e,be),z=new Ix(_,W),k.reversedDepthBuffer&&d&&z.buffers.depth.setReversed(!0),ae=new n0(_),$=new Mx,te=new Ux(_,W,z,$,k,be,ae),ne=new $v(E),xe=new Jv(E),x=new l_(_),me=new Wv(_,x),g=new e0(_,x,ae,me),D=new r0(_,g,x,ae),ce=new i0(_,k,te),le=new Yv($),V=new xx(E,ne,xe,W,k,me,le),J=new Vx(E,$),G=new Ex,Se=new Rx(W),Te=new kv(E,ne,xe,z,D,p,l),Ee=new Dx(E,D,k),Be=new Gx(_,ae,k,z),ve=new Xv(_,W,ae),Ce=new t0(_,W,ae),ae.programs=V.programs,E.capabilities=k,E.extensions=W,E.properties=$,E.renderLists=G,E.shadowMap=Ee,E.state=z,E.info=ae}I();const he=new zx(E,_);this.xr=he,this.getContext=function(){return _},this.getContextAttributes=function(){return _.getContextAttributes()},this.forceContextLoss=function(){const S=W.get("WEBGL_lose_context");S&&S.loseContext()},this.forceContextRestore=function(){const S=W.get("WEBGL_lose_context");S&&S.restoreContext()},this.getPixelRatio=function(){return U},this.setPixelRatio=function(S){S!==void 0&&(U=S,this.setSize(j,Q,!1))},this.getSize=function(S){return S.set(j,Q)},this.setSize=function(S,N,q=!0){if(he.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}j=S,Q=N,t.width=Math.floor(S*U),t.height=Math.floor(N*U),q===!0&&(t.style.width=S+"px",t.style.height=N+"px"),this.setViewport(0,0,S,N)},this.getDrawingBufferSize=function(S){return S.set(j*U,Q*U).floor()},this.setDrawingBufferSize=function(S,N,q){j=S,Q=N,U=q,t.width=Math.floor(S*q),t.height=Math.floor(N*q),this.setViewport(0,0,S,N)},this.getCurrentViewport=function(S){return S.copy(L)},this.getViewport=function(S){return S.copy(ge)},this.setViewport=function(S,N,q,Y){S.isVector4?ge.set(S.x,S.y,S.z,S.w):ge.set(S,N,q,Y),z.viewport(L.copy(ge).multiplyScalar(U).round())},this.getScissor=function(S){return S.copy(Le)},this.setScissor=function(S,N,q,Y){S.isVector4?Le.set(S.x,S.y,S.z,S.w):Le.set(S,N,q,Y),z.scissor(X.copy(Le).multiplyScalar(U).round())},this.getScissorTest=function(){return ke},this.setScissorTest=function(S){z.setScissorTest(ke=S)},this.setOpaqueSort=function(S){K=S},this.setTransparentSort=function(S){de=S},this.getClearColor=function(S){return S.copy(Te.getClearColor())},this.setClearColor=function(){Te.setClearColor(...arguments)},this.getClearAlpha=function(){return Te.getClearAlpha()},this.setClearAlpha=function(){Te.setClearAlpha(...arguments)},this.clear=function(S=!0,N=!0,q=!0){let Y=0;if(S){let F=!1;if(B!==null){const fe=B.texture.format;F=fe===Al||fe===bl||fe===Tl}if(F){const fe=B.texture.type,Me=fe===En||fe===bi||fe===Ur||fe===Nr||fe===El||fe===yl,Pe=Te.getClearColor(),Ae=Te.getClearAlpha(),Fe=Pe.r,Oe=Pe.g,Ie=Pe.b;Me?(v[0]=Fe,v[1]=Oe,v[2]=Ie,v[3]=Ae,_.clearBufferuiv(_.COLOR,0,v)):(M[0]=Fe,M[1]=Oe,M[2]=Ie,M[3]=Ae,_.clearBufferiv(_.COLOR,0,M))}else Y|=_.COLOR_BUFFER_BIT}N&&(Y|=_.DEPTH_BUFFER_BIT),q&&(Y|=_.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),_.clear(Y)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",pe,!1),t.removeEventListener("webglcontextrestored",Re,!1),t.removeEventListener("webglcontextcreationerror",ue,!1),Te.dispose(),G.dispose(),Se.dispose(),$.dispose(),ne.dispose(),xe.dispose(),D.dispose(),me.dispose(),Be.dispose(),V.dispose(),he.dispose(),he.removeEventListener("sessionstart",cn),he.removeEventListener("sessionend",Pl),oi.stop()};function pe(S){S.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),R=!0}function Re(){console.log("THREE.WebGLRenderer: Context Restored."),R=!1;const S=ae.autoReset,N=Ee.enabled,q=Ee.autoUpdate,Y=Ee.needsUpdate,F=Ee.type;I(),ae.autoReset=S,Ee.enabled=N,Ee.autoUpdate=q,Ee.needsUpdate=Y,Ee.type=F}function ue(S){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",S.statusMessage)}function re(S){const N=S.target;N.removeEventListener("dispose",re),De(N)}function De(S){ze(S),$.remove(S)}function ze(S){const N=$.get(S).programs;N!==void 0&&(N.forEach(function(q){V.releaseProgram(q)}),S.isShaderMaterial&&V.releaseShaderCache(S))}this.renderBufferDirect=function(S,N,q,Y,F,fe){N===null&&(N=we);const Me=F.isMesh&&F.matrixWorld.determinant()<0,Pe=Jf(S,N,q,Y,F);z.setMaterial(Y,Me);let Ae=q.index,Fe=1;if(Y.wireframe===!0){if(Ae=g.getWireframeAttribute(q),Ae===void 0)return;Fe=2}const Oe=q.drawRange,Ie=q.attributes.position;let $e=Oe.start*Fe,rt=(Oe.start+Oe.count)*Fe;fe!==null&&($e=Math.max($e,fe.start*Fe),rt=Math.min(rt,(fe.start+fe.count)*Fe)),Ae!==null?($e=Math.max($e,0),rt=Math.min(rt,Ae.count)):Ie!=null&&($e=Math.max($e,0),rt=Math.min(rt,Ie.count));const _t=rt-$e;if(_t<0||_t===1/0)return;me.setup(F,Y,Pe,q,Ae);let ht,at=ve;if(Ae!==null&&(ht=x.get(Ae),at=Ce,at.setIndex(ht)),F.isMesh)Y.wireframe===!0?(z.setLineWidth(Y.wireframeLinewidth*A()),at.setMode(_.LINES)):at.setMode(_.TRIANGLES);else if(F.isLine){let Ne=Y.linewidth;Ne===void 0&&(Ne=1),z.setLineWidth(Ne*A()),F.isLineSegments?at.setMode(_.LINES):F.isLineLoop?at.setMode(_.LINE_LOOP):at.setMode(_.LINE_STRIP)}else F.isPoints?at.setMode(_.POINTS):F.isSprite&&at.setMode(_.TRIANGLES);if(F.isBatchedMesh)if(F._multiDrawInstances!==null)Br("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),at.renderMultiDrawInstances(F._multiDrawStarts,F._multiDrawCounts,F._multiDrawCount,F._multiDrawInstances);else if(W.get("WEBGL_multi_draw"))at.renderMultiDraw(F._multiDrawStarts,F._multiDrawCounts,F._multiDrawCount);else{const Ne=F._multiDrawStarts,dt=F._multiDrawCounts,Je=F._multiDrawCount,Ht=Ae?x.get(Ae).bytesPerElement:1,Ri=$.get(Y).currentProgram.getUniforms();for(let Vt=0;Vt<Je;Vt++)Ri.setValue(_,"_gl_DrawID",Vt),at.render(Ne[Vt]/Ht,dt[Vt])}else if(F.isInstancedMesh)at.renderInstances($e,_t,F.count);else if(q.isInstancedBufferGeometry){const Ne=q._maxInstanceCount!==void 0?q._maxInstanceCount:1/0,dt=Math.min(q.instanceCount,Ne);at.renderInstances($e,_t,dt)}else at.render($e,_t)};function ct(S,N,q){S.transparent===!0&&S.side===On&&S.forceSinglePass===!1?(S.side=It,S.needsUpdate=!0,Kr(S,N,q),S.side=si,S.needsUpdate=!0,Kr(S,N,q),S.side=On):Kr(S,N,q)}this.compile=function(S,N,q=null){q===null&&(q=S),h=Se.get(q),h.init(N),b.push(h),q.traverseVisible(function(F){F.isLight&&F.layers.test(N.layers)&&(h.pushLight(F),F.castShadow&&h.pushShadow(F))}),S!==q&&S.traverseVisible(function(F){F.isLight&&F.layers.test(N.layers)&&(h.pushLight(F),F.castShadow&&h.pushShadow(F))}),h.setupLights();const Y=new Set;return S.traverse(function(F){if(!(F.isMesh||F.isPoints||F.isLine||F.isSprite))return;const fe=F.material;if(fe)if(Array.isArray(fe))for(let Me=0;Me<fe.length;Me++){const Pe=fe[Me];ct(Pe,q,F),Y.add(Pe)}else ct(fe,q,F),Y.add(fe)}),h=b.pop(),Y},this.compileAsync=function(S,N,q=null){const Y=this.compile(S,N,q);return new Promise(F=>{function fe(){if(Y.forEach(function(Me){$.get(Me).currentProgram.isReady()&&Y.delete(Me)}),Y.size===0){F(S);return}setTimeout(fe,10)}W.get("KHR_parallel_shader_compile")!==null?fe():setTimeout(fe,10)})};let tt=null;function Tn(S){tt&&tt(S)}function cn(){oi.stop()}function Pl(){oi.start()}const oi=new qf;oi.setAnimationLoop(Tn),typeof self<"u"&&oi.setContext(self),this.setAnimationLoop=function(S){tt=S,he.setAnimationLoop(S),S===null?oi.stop():oi.start()},he.addEventListener("sessionstart",cn),he.addEventListener("sessionend",Pl),this.render=function(S,N){if(N!==void 0&&N.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(R===!0)return;if(S.matrixWorldAutoUpdate===!0&&S.updateMatrixWorld(),N.parent===null&&N.matrixWorldAutoUpdate===!0&&N.updateMatrixWorld(),he.enabled===!0&&he.isPresenting===!0&&(he.cameraAutoUpdate===!0&&he.updateCamera(N),N=he.getCamera()),S.isScene===!0&&S.onBeforeRender(E,S,N,B),h=Se.get(S,b.length),h.init(N),b.push(h),oe.multiplyMatrices(N.projectionMatrix,N.matrixWorldInverse),Ze.setFromProjectionMatrix(oe,gn,N.reversedDepth),ee=this.localClippingEnabled,Xe=le.init(this.clippingPlanes,ee),m=G.get(S,w.length),m.init(),w.push(m),he.enabled===!0&&he.isPresenting===!0){const fe=E.xr.getDepthSensingMesh();fe!==null&&to(fe,N,-1/0,E.sortObjects)}to(S,N,0,E.sortObjects),m.finish(),E.sortObjects===!0&&m.sort(K,de),qe=he.enabled===!1||he.isPresenting===!1||he.hasDepthSensing()===!1,qe&&Te.addToRenderList(m,S),this.info.render.frame++,Xe===!0&&le.beginShadows();const q=h.state.shadowsArray;Ee.render(q,S,N),Xe===!0&&le.endShadows(),this.info.autoReset===!0&&this.info.reset();const Y=m.opaque,F=m.transmissive;if(h.setupLights(),N.isArrayCamera){const fe=N.cameras;if(F.length>0)for(let Me=0,Pe=fe.length;Me<Pe;Me++){const Ae=fe[Me];Ll(Y,F,S,Ae)}qe&&Te.render(S);for(let Me=0,Pe=fe.length;Me<Pe;Me++){const Ae=fe[Me];Dl(m,S,Ae,Ae.viewport)}}else F.length>0&&Ll(Y,F,S,N),qe&&Te.render(S),Dl(m,S,N);B!==null&&P===0&&(te.updateMultisampleRenderTarget(B),te.updateRenderTargetMipmap(B)),S.isScene===!0&&S.onAfterRender(E,S,N),me.resetDefaultState(),T=-1,y=null,b.pop(),b.length>0?(h=b[b.length-1],Xe===!0&&le.setGlobalState(E.clippingPlanes,h.state.camera)):h=null,w.pop(),w.length>0?m=w[w.length-1]:m=null};function to(S,N,q,Y){if(S.visible===!1)return;if(S.layers.test(N.layers)){if(S.isGroup)q=S.renderOrder;else if(S.isLOD)S.autoUpdate===!0&&S.update(N);else if(S.isLight)h.pushLight(S),S.castShadow&&h.pushShadow(S);else if(S.isSprite){if(!S.frustumCulled||Ze.intersectsSprite(S)){Y&&Ue.setFromMatrixPosition(S.matrixWorld).applyMatrix4(oe);const Me=D.update(S),Pe=S.material;Pe.visible&&m.push(S,Me,Pe,q,Ue.z,null)}}else if((S.isMesh||S.isLine||S.isPoints)&&(!S.frustumCulled||Ze.intersectsObject(S))){const Me=D.update(S),Pe=S.material;if(Y&&(S.boundingSphere!==void 0?(S.boundingSphere===null&&S.computeBoundingSphere(),Ue.copy(S.boundingSphere.center)):(Me.boundingSphere===null&&Me.computeBoundingSphere(),Ue.copy(Me.boundingSphere.center)),Ue.applyMatrix4(S.matrixWorld).applyMatrix4(oe)),Array.isArray(Pe)){const Ae=Me.groups;for(let Fe=0,Oe=Ae.length;Fe<Oe;Fe++){const Ie=Ae[Fe],$e=Pe[Ie.materialIndex];$e&&$e.visible&&m.push(S,Me,$e,q,Ue.z,Ie)}}else Pe.visible&&m.push(S,Me,Pe,q,Ue.z,null)}}const fe=S.children;for(let Me=0,Pe=fe.length;Me<Pe;Me++)to(fe[Me],N,q,Y)}function Dl(S,N,q,Y){const F=S.opaque,fe=S.transmissive,Me=S.transparent;h.setupLightsView(q),Xe===!0&&le.setGlobalState(E.clippingPlanes,q),Y&&z.viewport(L.copy(Y)),F.length>0&&$r(F,N,q),fe.length>0&&$r(fe,N,q),Me.length>0&&$r(Me,N,q),z.buffers.depth.setTest(!0),z.buffers.depth.setMask(!0),z.buffers.color.setMask(!0),z.setPolygonOffset(!1)}function Ll(S,N,q,Y){if((q.isScene===!0?q.overrideMaterial:null)!==null)return;h.state.transmissionRenderTarget[Y.id]===void 0&&(h.state.transmissionRenderTarget[Y.id]=new Ai(1,1,{generateMipmaps:!0,type:W.has("EXT_color_buffer_half_float")||W.has("EXT_color_buffer_float")?Gr:En,minFilter:yi,samples:4,stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Qe.workingColorSpace}));const fe=h.state.transmissionRenderTarget[Y.id],Me=Y.viewport||L;fe.setSize(Me.z*E.transmissionResolutionScale,Me.w*E.transmissionResolutionScale);const Pe=E.getRenderTarget(),Ae=E.getActiveCubeFace(),Fe=E.getActiveMipmapLevel();E.setRenderTarget(fe),E.getClearColor(se),ie=E.getClearAlpha(),ie<1&&E.setClearColor(16777215,.5),E.clear(),qe&&Te.render(q);const Oe=E.toneMapping;E.toneMapping=ii;const Ie=Y.viewport;if(Y.viewport!==void 0&&(Y.viewport=void 0),h.setupLightsView(Y),Xe===!0&&le.setGlobalState(E.clippingPlanes,Y),$r(S,q,Y),te.updateMultisampleRenderTarget(fe),te.updateRenderTargetMipmap(fe),W.has("WEBGL_multisampled_render_to_texture")===!1){let $e=!1;for(let rt=0,_t=N.length;rt<_t;rt++){const ht=N[rt],at=ht.object,Ne=ht.geometry,dt=ht.material,Je=ht.group;if(dt.side===On&&at.layers.test(Y.layers)){const Ht=dt.side;dt.side=It,dt.needsUpdate=!0,Il(at,q,Y,Ne,dt,Je),dt.side=Ht,dt.needsUpdate=!0,$e=!0}}$e===!0&&(te.updateMultisampleRenderTarget(fe),te.updateRenderTargetMipmap(fe))}E.setRenderTarget(Pe,Ae,Fe),E.setClearColor(se,ie),Ie!==void 0&&(Y.viewport=Ie),E.toneMapping=Oe}function $r(S,N,q){const Y=N.isScene===!0?N.overrideMaterial:null;for(let F=0,fe=S.length;F<fe;F++){const Me=S[F],Pe=Me.object,Ae=Me.geometry,Fe=Me.group;let Oe=Me.material;Oe.allowOverride===!0&&Y!==null&&(Oe=Y),Pe.layers.test(q.layers)&&Il(Pe,N,q,Ae,Oe,Fe)}}function Il(S,N,q,Y,F,fe){S.onBeforeRender(E,N,q,Y,F,fe),S.modelViewMatrix.multiplyMatrices(q.matrixWorldInverse,S.matrixWorld),S.normalMatrix.getNormalMatrix(S.modelViewMatrix),F.onBeforeRender(E,N,q,Y,S,fe),F.transparent===!0&&F.side===On&&F.forceSinglePass===!1?(F.side=It,F.needsUpdate=!0,E.renderBufferDirect(q,N,Y,F,S,fe),F.side=si,F.needsUpdate=!0,E.renderBufferDirect(q,N,Y,F,S,fe),F.side=On):E.renderBufferDirect(q,N,Y,F,S,fe),S.onAfterRender(E,N,q,Y,F,fe)}function Kr(S,N,q){N.isScene!==!0&&(N=we);const Y=$.get(S),F=h.state.lights,fe=h.state.shadowsArray,Me=F.state.version,Pe=V.getParameters(S,F.state,fe,N,q),Ae=V.getProgramCacheKey(Pe);let Fe=Y.programs;Y.environment=S.isMeshStandardMaterial?N.environment:null,Y.fog=N.fog,Y.envMap=(S.isMeshStandardMaterial?xe:ne).get(S.envMap||Y.environment),Y.envMapRotation=Y.environment!==null&&S.envMap===null?N.environmentRotation:S.envMapRotation,Fe===void 0&&(S.addEventListener("dispose",re),Fe=new Map,Y.programs=Fe);let Oe=Fe.get(Ae);if(Oe!==void 0){if(Y.currentProgram===Oe&&Y.lightsStateVersion===Me)return Nl(S,Pe),Oe}else Pe.uniforms=V.getUniforms(S),S.onBeforeCompile(Pe,E),Oe=V.acquireProgram(Pe,Ae),Fe.set(Ae,Oe),Y.uniforms=Pe.uniforms;const Ie=Y.uniforms;return(!S.isShaderMaterial&&!S.isRawShaderMaterial||S.clipping===!0)&&(Ie.clippingPlanes=le.uniform),Nl(S,Pe),Y.needsLights=eh(S),Y.lightsStateVersion=Me,Y.needsLights&&(Ie.ambientLightColor.value=F.state.ambient,Ie.lightProbe.value=F.state.probe,Ie.directionalLights.value=F.state.directional,Ie.directionalLightShadows.value=F.state.directionalShadow,Ie.spotLights.value=F.state.spot,Ie.spotLightShadows.value=F.state.spotShadow,Ie.rectAreaLights.value=F.state.rectArea,Ie.ltc_1.value=F.state.rectAreaLTC1,Ie.ltc_2.value=F.state.rectAreaLTC2,Ie.pointLights.value=F.state.point,Ie.pointLightShadows.value=F.state.pointShadow,Ie.hemisphereLights.value=F.state.hemi,Ie.directionalShadowMap.value=F.state.directionalShadowMap,Ie.directionalShadowMatrix.value=F.state.directionalShadowMatrix,Ie.spotShadowMap.value=F.state.spotShadowMap,Ie.spotLightMatrix.value=F.state.spotLightMatrix,Ie.spotLightMap.value=F.state.spotLightMap,Ie.pointShadowMap.value=F.state.pointShadowMap,Ie.pointShadowMatrix.value=F.state.pointShadowMatrix),Y.currentProgram=Oe,Y.uniformsList=null,Oe}function Ul(S){if(S.uniformsList===null){const N=S.currentProgram.getUniforms();S.uniformsList=Ps.seqWithValue(N.seq,S.uniforms)}return S.uniformsList}function Nl(S,N){const q=$.get(S);q.outputColorSpace=N.outputColorSpace,q.batching=N.batching,q.batchingColor=N.batchingColor,q.instancing=N.instancing,q.instancingColor=N.instancingColor,q.instancingMorph=N.instancingMorph,q.skinning=N.skinning,q.morphTargets=N.morphTargets,q.morphNormals=N.morphNormals,q.morphColors=N.morphColors,q.morphTargetsCount=N.morphTargetsCount,q.numClippingPlanes=N.numClippingPlanes,q.numIntersection=N.numClipIntersection,q.vertexAlphas=N.vertexAlphas,q.vertexTangents=N.vertexTangents,q.toneMapping=N.toneMapping}function Jf(S,N,q,Y,F){N.isScene!==!0&&(N=we),te.resetTextureUnits();const fe=N.fog,Me=Y.isMeshStandardMaterial?N.environment:null,Pe=B===null?E.outputColorSpace:B.isXRRenderTarget===!0?B.texture.colorSpace:rr,Ae=(Y.isMeshStandardMaterial?xe:ne).get(Y.envMap||Me),Fe=Y.vertexColors===!0&&!!q.attributes.color&&q.attributes.color.itemSize===4,Oe=!!q.attributes.tangent&&(!!Y.normalMap||Y.anisotropy>0),Ie=!!q.morphAttributes.position,$e=!!q.morphAttributes.normal,rt=!!q.morphAttributes.color;let _t=ii;Y.toneMapped&&(B===null||B.isXRRenderTarget===!0)&&(_t=E.toneMapping);const ht=q.morphAttributes.position||q.morphAttributes.normal||q.morphAttributes.color,at=ht!==void 0?ht.length:0,Ne=$.get(Y),dt=h.state.lights;if(Xe===!0&&(ee===!0||S!==y)){const Rt=S===y&&Y.id===T;le.setState(Y,S,Rt)}let Je=!1;Y.version===Ne.__version?(Ne.needsLights&&Ne.lightsStateVersion!==dt.state.version||Ne.outputColorSpace!==Pe||F.isBatchedMesh&&Ne.batching===!1||!F.isBatchedMesh&&Ne.batching===!0||F.isBatchedMesh&&Ne.batchingColor===!0&&F.colorTexture===null||F.isBatchedMesh&&Ne.batchingColor===!1&&F.colorTexture!==null||F.isInstancedMesh&&Ne.instancing===!1||!F.isInstancedMesh&&Ne.instancing===!0||F.isSkinnedMesh&&Ne.skinning===!1||!F.isSkinnedMesh&&Ne.skinning===!0||F.isInstancedMesh&&Ne.instancingColor===!0&&F.instanceColor===null||F.isInstancedMesh&&Ne.instancingColor===!1&&F.instanceColor!==null||F.isInstancedMesh&&Ne.instancingMorph===!0&&F.morphTexture===null||F.isInstancedMesh&&Ne.instancingMorph===!1&&F.morphTexture!==null||Ne.envMap!==Ae||Y.fog===!0&&Ne.fog!==fe||Ne.numClippingPlanes!==void 0&&(Ne.numClippingPlanes!==le.numPlanes||Ne.numIntersection!==le.numIntersection)||Ne.vertexAlphas!==Fe||Ne.vertexTangents!==Oe||Ne.morphTargets!==Ie||Ne.morphNormals!==$e||Ne.morphColors!==rt||Ne.toneMapping!==_t||Ne.morphTargetsCount!==at)&&(Je=!0):(Je=!0,Ne.__version=Y.version);let Ht=Ne.currentProgram;Je===!0&&(Ht=Kr(Y,N,F));let Ri=!1,Vt=!1,lr=!1;const pt=Ht.getUniforms(),Yt=Ne.uniforms;if(z.useProgram(Ht.program)&&(Ri=!0,Vt=!0,lr=!0),Y.id!==T&&(T=Y.id,Vt=!0),Ri||y!==S){z.buffers.depth.getReversed()&&S.reversedDepth!==!0&&(S._reversedDepth=!0,S.updateProjectionMatrix()),pt.setValue(_,"projectionMatrix",S.projectionMatrix),pt.setValue(_,"viewMatrix",S.matrixWorldInverse);const Nt=pt.map.cameraPosition;Nt!==void 0&&Nt.setValue(_,ye.setFromMatrixPosition(S.matrixWorld)),k.logarithmicDepthBuffer&&pt.setValue(_,"logDepthBufFC",2/(Math.log(S.far+1)/Math.LN2)),(Y.isMeshPhongMaterial||Y.isMeshToonMaterial||Y.isMeshLambertMaterial||Y.isMeshBasicMaterial||Y.isMeshStandardMaterial||Y.isShaderMaterial)&&pt.setValue(_,"isOrthographic",S.isOrthographicCamera===!0),y!==S&&(y=S,Vt=!0,lr=!0)}if(F.isSkinnedMesh){pt.setOptional(_,F,"bindMatrix"),pt.setOptional(_,F,"bindMatrixInverse");const Rt=F.skeleton;Rt&&(Rt.boneTexture===null&&Rt.computeBoneTexture(),pt.setValue(_,"boneTexture",Rt.boneTexture,te))}F.isBatchedMesh&&(pt.setOptional(_,F,"batchingTexture"),pt.setValue(_,"batchingTexture",F._matricesTexture,te),pt.setOptional(_,F,"batchingIdTexture"),pt.setValue(_,"batchingIdTexture",F._indirectTexture,te),pt.setOptional(_,F,"batchingColorTexture"),F._colorsTexture!==null&&pt.setValue(_,"batchingColorTexture",F._colorsTexture,te));const $t=q.morphAttributes;if(($t.position!==void 0||$t.normal!==void 0||$t.color!==void 0)&&ce.update(F,q,Ht),(Vt||Ne.receiveShadow!==F.receiveShadow)&&(Ne.receiveShadow=F.receiveShadow,pt.setValue(_,"receiveShadow",F.receiveShadow)),Y.isMeshGouraudMaterial&&Y.envMap!==null&&(Yt.envMap.value=Ae,Yt.flipEnvMap.value=Ae.isCubeTexture&&Ae.isRenderTargetTexture===!1?-1:1),Y.isMeshStandardMaterial&&Y.envMap===null&&N.environment!==null&&(Yt.envMapIntensity.value=N.environmentIntensity),Vt&&(pt.setValue(_,"toneMappingExposure",E.toneMappingExposure),Ne.needsLights&&Qf(Yt,lr),fe&&Y.fog===!0&&J.refreshFogUniforms(Yt,fe),J.refreshMaterialUniforms(Yt,Y,U,Q,h.state.transmissionRenderTarget[S.id]),Ps.upload(_,Ul(Ne),Yt,te)),Y.isShaderMaterial&&Y.uniformsNeedUpdate===!0&&(Ps.upload(_,Ul(Ne),Yt,te),Y.uniformsNeedUpdate=!1),Y.isSpriteMaterial&&pt.setValue(_,"center",F.center),pt.setValue(_,"modelViewMatrix",F.modelViewMatrix),pt.setValue(_,"normalMatrix",F.normalMatrix),pt.setValue(_,"modelMatrix",F.matrixWorld),Y.isShaderMaterial||Y.isRawShaderMaterial){const Rt=Y.uniformsGroups;for(let Nt=0,no=Rt.length;Nt<no;Nt++){const ai=Rt[Nt];Be.update(ai,Ht),Be.bind(ai,Ht)}}return Ht}function Qf(S,N){S.ambientLightColor.needsUpdate=N,S.lightProbe.needsUpdate=N,S.directionalLights.needsUpdate=N,S.directionalLightShadows.needsUpdate=N,S.pointLights.needsUpdate=N,S.pointLightShadows.needsUpdate=N,S.spotLights.needsUpdate=N,S.spotLightShadows.needsUpdate=N,S.rectAreaLights.needsUpdate=N,S.hemisphereLights.needsUpdate=N}function eh(S){return S.isMeshLambertMaterial||S.isMeshToonMaterial||S.isMeshPhongMaterial||S.isMeshStandardMaterial||S.isShadowMaterial||S.isShaderMaterial&&S.lights===!0}this.getActiveCubeFace=function(){return C},this.getActiveMipmapLevel=function(){return P},this.getRenderTarget=function(){return B},this.setRenderTargetTextures=function(S,N,q){const Y=$.get(S);Y.__autoAllocateDepthBuffer=S.resolveDepthBuffer===!1,Y.__autoAllocateDepthBuffer===!1&&(Y.__useRenderToTexture=!1),$.get(S.texture).__webglTexture=N,$.get(S.depthTexture).__webglTexture=Y.__autoAllocateDepthBuffer?void 0:q,Y.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(S,N){const q=$.get(S);q.__webglFramebuffer=N,q.__useDefaultFramebuffer=N===void 0};const th=_.createFramebuffer();this.setRenderTarget=function(S,N=0,q=0){B=S,C=N,P=q;let Y=!0,F=null,fe=!1,Me=!1;if(S){const Ae=$.get(S);if(Ae.__useDefaultFramebuffer!==void 0)z.bindFramebuffer(_.FRAMEBUFFER,null),Y=!1;else if(Ae.__webglFramebuffer===void 0)te.setupRenderTarget(S);else if(Ae.__hasExternalTextures)te.rebindTextures(S,$.get(S.texture).__webglTexture,$.get(S.depthTexture).__webglTexture);else if(S.depthBuffer){const Ie=S.depthTexture;if(Ae.__boundDepthTexture!==Ie){if(Ie!==null&&$.has(Ie)&&(S.width!==Ie.image.width||S.height!==Ie.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");te.setupDepthRenderbuffer(S)}}const Fe=S.texture;(Fe.isData3DTexture||Fe.isDataArrayTexture||Fe.isCompressedArrayTexture)&&(Me=!0);const Oe=$.get(S).__webglFramebuffer;S.isWebGLCubeRenderTarget?(Array.isArray(Oe[N])?F=Oe[N][q]:F=Oe[N],fe=!0):S.samples>0&&te.useMultisampledRTT(S)===!1?F=$.get(S).__webglMultisampledFramebuffer:Array.isArray(Oe)?F=Oe[q]:F=Oe,L.copy(S.viewport),X.copy(S.scissor),Z=S.scissorTest}else L.copy(ge).multiplyScalar(U).floor(),X.copy(Le).multiplyScalar(U).floor(),Z=ke;if(q!==0&&(F=th),z.bindFramebuffer(_.FRAMEBUFFER,F)&&Y&&z.drawBuffers(S,F),z.viewport(L),z.scissor(X),z.setScissorTest(Z),fe){const Ae=$.get(S.texture);_.framebufferTexture2D(_.FRAMEBUFFER,_.COLOR_ATTACHMENT0,_.TEXTURE_CUBE_MAP_POSITIVE_X+N,Ae.__webglTexture,q)}else if(Me){const Ae=N;for(let Fe=0;Fe<S.textures.length;Fe++){const Oe=$.get(S.textures[Fe]);_.framebufferTextureLayer(_.FRAMEBUFFER,_.COLOR_ATTACHMENT0+Fe,Oe.__webglTexture,q,Ae)}}else if(S!==null&&q!==0){const Ae=$.get(S.texture);_.framebufferTexture2D(_.FRAMEBUFFER,_.COLOR_ATTACHMENT0,_.TEXTURE_2D,Ae.__webglTexture,q)}T=-1},this.readRenderTargetPixels=function(S,N,q,Y,F,fe,Me,Pe=0){if(!(S&&S.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ae=$.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&Me!==void 0&&(Ae=Ae[Me]),Ae){z.bindFramebuffer(_.FRAMEBUFFER,Ae);try{const Fe=S.textures[Pe],Oe=Fe.format,Ie=Fe.type;if(!k.textureFormatReadable(Oe)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!k.textureTypeReadable(Ie)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}N>=0&&N<=S.width-Y&&q>=0&&q<=S.height-F&&(S.textures.length>1&&_.readBuffer(_.COLOR_ATTACHMENT0+Pe),_.readPixels(N,q,Y,F,be.convert(Oe),be.convert(Ie),fe))}finally{const Fe=B!==null?$.get(B).__webglFramebuffer:null;z.bindFramebuffer(_.FRAMEBUFFER,Fe)}}},this.readRenderTargetPixelsAsync=async function(S,N,q,Y,F,fe,Me,Pe=0){if(!(S&&S.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Ae=$.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&Me!==void 0&&(Ae=Ae[Me]),Ae)if(N>=0&&N<=S.width-Y&&q>=0&&q<=S.height-F){z.bindFramebuffer(_.FRAMEBUFFER,Ae);const Fe=S.textures[Pe],Oe=Fe.format,Ie=Fe.type;if(!k.textureFormatReadable(Oe))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!k.textureTypeReadable(Ie))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const $e=_.createBuffer();_.bindBuffer(_.PIXEL_PACK_BUFFER,$e),_.bufferData(_.PIXEL_PACK_BUFFER,fe.byteLength,_.STREAM_READ),S.textures.length>1&&_.readBuffer(_.COLOR_ATTACHMENT0+Pe),_.readPixels(N,q,Y,F,be.convert(Oe),be.convert(Ie),0);const rt=B!==null?$.get(B).__webglFramebuffer:null;z.bindFramebuffer(_.FRAMEBUFFER,rt);const _t=_.fenceSync(_.SYNC_GPU_COMMANDS_COMPLETE,0);return _.flush(),await Em(_,_t,4),_.bindBuffer(_.PIXEL_PACK_BUFFER,$e),_.getBufferSubData(_.PIXEL_PACK_BUFFER,0,fe),_.deleteBuffer($e),_.deleteSync(_t),fe}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(S,N=null,q=0){const Y=Math.pow(2,-q),F=Math.floor(S.image.width*Y),fe=Math.floor(S.image.height*Y),Me=N!==null?N.x:0,Pe=N!==null?N.y:0;te.setTexture2D(S,0),_.copyTexSubImage2D(_.TEXTURE_2D,q,0,0,Me,Pe,F,fe),z.unbindTexture()};const nh=_.createFramebuffer(),ih=_.createFramebuffer();this.copyTextureToTexture=function(S,N,q=null,Y=null,F=0,fe=null){fe===null&&(F!==0?(Br("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),fe=F,F=0):fe=0);let Me,Pe,Ae,Fe,Oe,Ie,$e,rt,_t;const ht=S.isCompressedTexture?S.mipmaps[fe]:S.image;if(q!==null)Me=q.max.x-q.min.x,Pe=q.max.y-q.min.y,Ae=q.isBox3?q.max.z-q.min.z:1,Fe=q.min.x,Oe=q.min.y,Ie=q.isBox3?q.min.z:0;else{const $t=Math.pow(2,-F);Me=Math.floor(ht.width*$t),Pe=Math.floor(ht.height*$t),S.isDataArrayTexture?Ae=ht.depth:S.isData3DTexture?Ae=Math.floor(ht.depth*$t):Ae=1,Fe=0,Oe=0,Ie=0}Y!==null?($e=Y.x,rt=Y.y,_t=Y.z):($e=0,rt=0,_t=0);const at=be.convert(N.format),Ne=be.convert(N.type);let dt;N.isData3DTexture?(te.setTexture3D(N,0),dt=_.TEXTURE_3D):N.isDataArrayTexture||N.isCompressedArrayTexture?(te.setTexture2DArray(N,0),dt=_.TEXTURE_2D_ARRAY):(te.setTexture2D(N,0),dt=_.TEXTURE_2D),_.pixelStorei(_.UNPACK_FLIP_Y_WEBGL,N.flipY),_.pixelStorei(_.UNPACK_PREMULTIPLY_ALPHA_WEBGL,N.premultiplyAlpha),_.pixelStorei(_.UNPACK_ALIGNMENT,N.unpackAlignment);const Je=_.getParameter(_.UNPACK_ROW_LENGTH),Ht=_.getParameter(_.UNPACK_IMAGE_HEIGHT),Ri=_.getParameter(_.UNPACK_SKIP_PIXELS),Vt=_.getParameter(_.UNPACK_SKIP_ROWS),lr=_.getParameter(_.UNPACK_SKIP_IMAGES);_.pixelStorei(_.UNPACK_ROW_LENGTH,ht.width),_.pixelStorei(_.UNPACK_IMAGE_HEIGHT,ht.height),_.pixelStorei(_.UNPACK_SKIP_PIXELS,Fe),_.pixelStorei(_.UNPACK_SKIP_ROWS,Oe),_.pixelStorei(_.UNPACK_SKIP_IMAGES,Ie);const pt=S.isDataArrayTexture||S.isData3DTexture,Yt=N.isDataArrayTexture||N.isData3DTexture;if(S.isDepthTexture){const $t=$.get(S),Rt=$.get(N),Nt=$.get($t.__renderTarget),no=$.get(Rt.__renderTarget);z.bindFramebuffer(_.READ_FRAMEBUFFER,Nt.__webglFramebuffer),z.bindFramebuffer(_.DRAW_FRAMEBUFFER,no.__webglFramebuffer);for(let ai=0;ai<Ae;ai++)pt&&(_.framebufferTextureLayer(_.READ_FRAMEBUFFER,_.COLOR_ATTACHMENT0,$.get(S).__webglTexture,F,Ie+ai),_.framebufferTextureLayer(_.DRAW_FRAMEBUFFER,_.COLOR_ATTACHMENT0,$.get(N).__webglTexture,fe,_t+ai)),_.blitFramebuffer(Fe,Oe,Me,Pe,$e,rt,Me,Pe,_.DEPTH_BUFFER_BIT,_.NEAREST);z.bindFramebuffer(_.READ_FRAMEBUFFER,null),z.bindFramebuffer(_.DRAW_FRAMEBUFFER,null)}else if(F!==0||S.isRenderTargetTexture||$.has(S)){const $t=$.get(S),Rt=$.get(N);z.bindFramebuffer(_.READ_FRAMEBUFFER,nh),z.bindFramebuffer(_.DRAW_FRAMEBUFFER,ih);for(let Nt=0;Nt<Ae;Nt++)pt?_.framebufferTextureLayer(_.READ_FRAMEBUFFER,_.COLOR_ATTACHMENT0,$t.__webglTexture,F,Ie+Nt):_.framebufferTexture2D(_.READ_FRAMEBUFFER,_.COLOR_ATTACHMENT0,_.TEXTURE_2D,$t.__webglTexture,F),Yt?_.framebufferTextureLayer(_.DRAW_FRAMEBUFFER,_.COLOR_ATTACHMENT0,Rt.__webglTexture,fe,_t+Nt):_.framebufferTexture2D(_.DRAW_FRAMEBUFFER,_.COLOR_ATTACHMENT0,_.TEXTURE_2D,Rt.__webglTexture,fe),F!==0?_.blitFramebuffer(Fe,Oe,Me,Pe,$e,rt,Me,Pe,_.COLOR_BUFFER_BIT,_.NEAREST):Yt?_.copyTexSubImage3D(dt,fe,$e,rt,_t+Nt,Fe,Oe,Me,Pe):_.copyTexSubImage2D(dt,fe,$e,rt,Fe,Oe,Me,Pe);z.bindFramebuffer(_.READ_FRAMEBUFFER,null),z.bindFramebuffer(_.DRAW_FRAMEBUFFER,null)}else Yt?S.isDataTexture||S.isData3DTexture?_.texSubImage3D(dt,fe,$e,rt,_t,Me,Pe,Ae,at,Ne,ht.data):N.isCompressedArrayTexture?_.compressedTexSubImage3D(dt,fe,$e,rt,_t,Me,Pe,Ae,at,ht.data):_.texSubImage3D(dt,fe,$e,rt,_t,Me,Pe,Ae,at,Ne,ht):S.isDataTexture?_.texSubImage2D(_.TEXTURE_2D,fe,$e,rt,Me,Pe,at,Ne,ht.data):S.isCompressedTexture?_.compressedTexSubImage2D(_.TEXTURE_2D,fe,$e,rt,ht.width,ht.height,at,ht.data):_.texSubImage2D(_.TEXTURE_2D,fe,$e,rt,Me,Pe,at,Ne,ht);_.pixelStorei(_.UNPACK_ROW_LENGTH,Je),_.pixelStorei(_.UNPACK_IMAGE_HEIGHT,Ht),_.pixelStorei(_.UNPACK_SKIP_PIXELS,Ri),_.pixelStorei(_.UNPACK_SKIP_ROWS,Vt),_.pixelStorei(_.UNPACK_SKIP_IMAGES,lr),fe===0&&N.generateMipmaps&&_.generateMipmap(dt),z.unbindTexture()},this.initRenderTarget=function(S){$.get(S).__webglFramebuffer===void 0&&te.setupRenderTarget(S)},this.initTexture=function(S){S.isCubeTexture?te.setTextureCube(S,0):S.isData3DTexture?te.setTexture3D(S,0):S.isDataArrayTexture||S.isCompressedArrayTexture?te.setTexture2DArray(S,0):te.setTexture2D(S,0),z.unbindTexture()},this.resetState=function(){C=0,P=0,B=null,z.reset(),me.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return gn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=Qe._getDrawingBufferColorSpace(e),t.unpackColorSpace=Qe._getUnpackColorSpace()}}const Wx=`
      uniform float uTime;
      uniform float uWaveSpeed;
      uniform vec2 uMouse;
      uniform float uMouseForce;
      uniform vec2 uClick;
      uniform float uClickPulse;
      varying float vWave;
      varying vec3 vN;
      varying vec3 vW;
      void main() {
        vec3 p = position;
        float t = uTime * uWaveSpeed;
        float wave = sin(t * 1.4 + p.y * 7.0 + p.x * 4.0) * 0.03;
        wave += cos(t * 1.2 + p.z * 6.0) * 0.03;
        float mouseDist = distance(p.xy, uMouse * 1.2);
        float mouseInfluence = smoothstep(1.75, 0.12, mouseDist);
        vec2 pullDir = (uMouse * 1.1) - p.xy;
        float pullLen = length(pullDir);
        if (pullLen > 0.0001) {
          vec2 pullNorm = pullDir / pullLen;
          float radial = dot(normalize(p.xy + vec2(0.0001)), pullNorm);
          float bulge = (0.045 + uMouseForce * 0.07) * mouseInfluence * (0.55 + radial * 0.45);
          p += normal * bulge;
        }
        float clickDist = distance(p.xy, uClick * 1.2);
        float clickInfluence = smoothstep(1.35, 0.05, clickDist) * uClickPulse;
        float ripple = sin((1.3 - clickDist) * 16.0 + t * 6.0) * clickInfluence * 0.075;
        p += normal * ripple;
        wave += sin(t * 3.0 + p.x * 9.8 - p.y * 8.6) * (0.06 + uMouseForce * 0.08) * mouseInfluence;
        p += normal * wave;
        vWave = wave + ripple;
        vec4 worldPos = modelMatrix * vec4(p, 1.0);
        vW = worldPos.xyz;
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,Xx=`
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      varying float vWave;
      varying vec3 vN;
      varying vec3 vW;
      void main() {
        vec3 v = normalize(cameraPosition - vW);
        float fresnel = pow(1.0 - max(dot(vN, v), 0.0), 2.0);
        vec3 c = mix(uColorA, uColorB, 0.5 + vWave * 8.0);
        c *= (1.05 + fresnel * 1.2);
        float alpha = 0.85;
        gl_FragColor = vec4(c, alpha);
      }
    `,qx=`
      uniform float uTime;
      uniform float uWaveSpeed;
      varying float vEdge;
      varying vec3 vW;
      void main() {
        vec3 p = position;
        float t = uTime * uWaveSpeed;
        float wave = sin(t + p.y * 4.0) * 0.04;
        p += normal * wave;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vW = wp.xyz;
        vec3 n = normalize(normalMatrix * normal);
        vec3 v = normalize(cameraPosition - wp.xyz);
        vEdge = pow(1.0 - max(dot(n, v), 0.0), 2.5);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,Yx=`
      uniform vec3 uColor;
      varying float vEdge;
      varying vec3 vW;
      void main() {
        float strip = 0.5 + 0.5 * sin(vW.y * 12.0);
        float alpha = vEdge * (0.2 + strip * 0.1);
        gl_FragColor = vec4(uColor, alpha);
      }
    `,$x=`
      uniform float uTime;
      uniform float uWaveSpeed;
      uniform float uParticleSize;
      attribute float aPhase;
      attribute float aSize;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        float t = uTime * uWaveSpeed + aPhase;
        p.y += sin(t * 1.8) * 0.08;
        p.x += cos(t * 0.9) * 0.05;
        p.z += sin(t * 1.2) * 0.05;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (10.0 * aSize * uParticleSize) * (1.0 / -mv.z);
        vAlpha = 0.36 + 0.64 * (0.5 + 0.5 * sin(t * 1.5 + aSize));
      }
    `,Kx=`
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float glow = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(uColor * (1.0 + glow), glow * vAlpha);
      }
    `,jx={class:"hud-panel"},Zx={class:"title-wrap"},Jx={class:"title"},Qx=Wu({__name:"HolographicCommandOrbScene",props:{backendApiStatus:{},backendApiLabel:{}},setup(n){const e=n,t=Jn(null),i=Jn(0),r=xf.defaults;let s=null,o=null,a=null,l=null,c=null,u=null,f=0,d=0;const p=new Ye(0,0),v=new Ye(0,0),M=new Ye(0,0);let m=0,h=0;const w=new Ye(0,0);let b=0;const E=Jn(50),R=Jn(50),C=Jn(0),P=[];function B(U,K){P.push({geometry:U,material:K})}function T(U){const K=U.replace("#",""),de=K.length===3?K.split("").map(Le=>`${Le}${Le}`).join(""):K,ge=Number.parseInt(de,16);return{r:ge>>16&255,g:ge>>8&255,b:ge&255}}function y(U,K){const{r:de,g:ge,b:Le}=T(U);return`rgba(${de}, ${ge}, ${Le}, ${K})`}const L=xl(()=>({background:`
    radial-gradient(circle at 50% 45%, ${y(r.coreColor,.16)}, transparent 45%),
    radial-gradient(circle at 18% 24%, ${y(r.coreColor,.2)}, transparent 42%),
    radial-gradient(circle at 80% 18%, ${y(r.particleColor,.18)}, transparent 44%),
    linear-gradient(165deg, #01030b 0%, #030a1c 52%, ${r.backgroundColor} 100%)
  `}));function X(){return new ln({uniforms:{uTime:{value:0},uWaveSpeed:{value:r.waveSpeed},uColorA:{value:new je(r.coreColor)},uColorB:{value:new je(r.particleColor)},uMouse:{value:new Ye(0,0)},uMouseForce:{value:0},uClick:{value:new Ye(0,0)},uClickPulse:{value:0}},vertexShader:Wx,fragmentShader:Xx,transparent:!0,blending:Ar,depthWrite:!1})}function Z(){return new ln({uniforms:{uTime:{value:0},uWaveSpeed:{value:r.waveSpeed},uColor:{value:new je(r.coreColor)}},vertexShader:qx,fragmentShader:Yx,transparent:!0,blending:Ar,depthWrite:!1,side:It})}function se(U){const K=new yn,de=new Float32Array(U*3),ge=new Float32Array(U),Le=new Float32Array(U);for(let ke=0;ke<U;ke+=1){const Ze=Math.random()*Math.PI*2,Xe=2+Math.random()*1.4,ee=(Math.random()-.5)*2.4;de[ke*3]=Math.cos(Ze)*Xe,de[ke*3+1]=ee,de[ke*3+2]=Math.sin(Ze)*Xe,ge[ke]=Math.random()*Math.PI*2,Le[ke]=1+Math.random()*.2}return K.setAttribute("position",new qt(de,3)),K.setAttribute("aPhase",new qt(ge,1)),K.setAttribute("aSize",new qt(Le,1)),K}function ie(){return new ln({uniforms:{uTime:{value:0},uWaveSpeed:{value:r.waveSpeed},uParticleSize:{value:r.particleSize},uColor:{value:new je(r.particleColor)}},vertexShader:$x,fragmentShader:Kx,transparent:!0,blending:Ar,depthWrite:!1})}function j(){if(!s||!o||!a||!l||!c||!u)return;const U=(performance.now()-d)/1e3;v.lerp(p,.14),m*=.9,b*=.9,h+=(m-h)*.16,l.material.uniforms.uTime.value=U,l.material.uniforms.uWaveSpeed.value=r.waveSpeed,l.material.uniforms.uMouse.value.copy(v),l.material.uniforms.uMouseForce.value=h,l.material.uniforms.uClick.value.copy(w),l.material.uniforms.uClickPulse.value=b,c.material.uniforms.uTime.value=U,c.material.uniforms.uWaveSpeed.value=r.waveSpeed,u.material.uniforms.uTime.value=U,u.material.uniforms.uWaveSpeed.value=r.waveSpeed,u.material.uniforms.uParticleSize.value=r.particleSize,l.rotation.y=U*.14+v.x*.36,l.rotation.x=v.y*.34,c.rotation.y=-U*.08-v.x*.14,c.rotation.x=-v.y*.14,u.rotation.y=-U*.06-v.x*.12,u.rotation.x=v.y*.06;const K=Math.min(100,Math.floor(U/4*100));i.value=K,s.render(o,a),f=requestAnimationFrame(j)}function Q(){cancelAnimationFrame(f);for(const U of P)U.geometry.dispose(),U.material.dispose();P.length=0,s?.dispose(),o=null,a=null,s=null,l=null,c=null,u=null}return dl(()=>{if(!t.value)return;const U=t.value,K=U.parentElement;if(!K)return;const de=K.clientWidth,ge=K.clientHeight;o=new Ym,a=new Wt(52,de/ge,.1,100),a.position.set(0,0,5.8),s=new kx({canvas:U,antialias:!0,alpha:!0}),s.setPixelRatio(Math.min(window.devicePixelRatio||1,2)),s.setSize(de,ge),o.add(new s_(r.coreColor,.5));const Le=new i_(r.coreColor,1.6,20);Le.position.set(2.1,2.5,3.5),o.add(Le);const ke=new Vs(1.08,96,96),Ze=X();l=new rn(ke,Ze),B(ke,Ze),o.add(l);const Xe=new Vs(1.64,64,64),ee=Z();c=new rn(Xe,ee),B(Xe,ee),o.add(c);const oe=se(1e3),ye=ie();u=new Jm(oe,ye),B(oe,ye),o.add(u);const Ue=_=>{const O=K.getBoundingClientRect(),W=(_.clientX-O.left)/O.width*2-1,k=-((_.clientY-O.top)/O.height*2-1);p.set(W,k);const z=p.distanceTo(M);m=Math.min(.72,m+z*1.6),M.copy(p)},we=()=>{p.set(0,0),m*=.6},qe=_=>{const O=K.getBoundingClientRect(),W=(_.clientX-O.left)/O.width*2-1,k=-((_.clientY-O.top)/O.height*2-1);w.set(W,k),b=1,m=Math.min(.86,m+.25),E.value=(_.clientX-O.left)/O.width*100,R.value=(_.clientY-O.top)/O.height*100,C.value+=1},A=()=>{if(!a||!s||!K)return;const _=K.clientWidth,O=K.clientHeight;a.aspect=_/O,a.updateProjectionMatrix(),s.setSize(_,O)};window.addEventListener("resize",A),K.addEventListener("mousemove",Ue),K.addEventListener("mouseleave",we),K.addEventListener("click",qe),d=performance.now(),j(),pl(()=>{window.removeEventListener("resize",A),K.removeEventListener("mousemove",Ue),K.removeEventListener("mouseleave",we),K.removeEventListener("click",qe),Q()})}),(U,K)=>(Fs(),ra("main",{class:"scene holo-scene",style:wr(L.value)},[et("canvas",{ref_key:"canvasRef",ref:t,class:"canvas"},null,512),K[8]||(K[8]=et("div",{class:"scanlines"},null,-1)),K[9]||(K[9]=et("div",{class:"grid-overlay"},null,-1)),(Fs(),ra("div",{key:C.value,class:"click-burst",style:wr({left:`${E.value}%`,top:`${R.value}%`})},null,4)),et("header",jx,[K[7]||(K[7]=et("h2",null,"Command Orb",-1)),et("p",null,[K[0]||(K[0]=et("span",null,"Particle Size",-1)),et("strong",null,Dn(_i(r).particleSize),1)]),et("p",null,[K[1]||(K[1]=et("span",null,"Particle Color",-1)),et("strong",null,Dn(_i(r).particleColor),1)]),et("p",null,[K[2]||(K[2]=et("span",null,"Background",-1)),et("strong",null,Dn(_i(r).backgroundColor),1)]),et("p",null,[K[3]||(K[3]=et("span",null,"Core Color",-1)),et("strong",null,Dn(_i(r).coreColor),1)]),et("p",null,[K[4]||(K[4]=et("span",null,"Wave Speed",-1)),et("strong",null,Dn(_i(r).waveSpeed),1)]),et("p",null,[K[5]||(K[5]=et("span",null,"Boot",-1)),et("strong",null,Dn(i.value)+"%",1)]),et("p",null,[K[6]||(K[6]=et("span",null,"Backend API",-1)),et("strong",{class:qs(["api-status",`api-status--${e.backendApiStatus}`])},Dn(e.backendApiLabel),3)])]),et("div",Zx,[et("h1",Jx,Dn(_i(r).welcomeText),1)])],4))}}),Zf=(n,e)=>{const t=n.__vccOpts||n;for(const[i,r]of e)t[i]=r;return t},hu=Zf(Qx,[["__scopeId","data-v-ff767c54"]]),eM={class:"starter-shell"},tM={class:"scene-stage"},nM=Wu({__name:"App",setup(n){const e=[{key:"holographic-command-orb",label:"Holographic Orb",component:hu}],t=Jn(xf.sceneId),i=Jn("checking"),r=Jn("Checking"),s=xl(()=>e.find(l=>l.key===t.value)?.component??hu);async function o(){i.value="checking",r.value="Checking";try{const a=await fetch("/api/hello?name=Starter",{cache:"no-store"});if(!a.ok)throw new Error(`HTTP ${a.status}`);if((await a.json()).status!=="ok")throw new Error("Invalid payload");i.value="ok",r.value="OK"}catch{i.value="error",r.value="ERROR"}}return dl(()=>{o()}),(a,l)=>(Fs(),ra("main",eM,[et("div",tM,[(Fs(),Wd(md(s.value),{key:t.value,"backend-api-status":i.value,"backend-api-label":r.value},null,8,["backend-api-status","backend-api-label"]))])]))}}),iM=Zf(nM,[["__scopeId","data-v-23bd42a2"]]);Cp(iM).mount("#app");
