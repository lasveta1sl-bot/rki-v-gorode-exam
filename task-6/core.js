(function(root){
 'use strict';
 const shuffle=(items,random=Math.random)=>{const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 const validNumber=(s,max)=>/^\d+$/.test(String(s).trim())&&Number(s)>=1&&Number(s)<=max;
 function grade(ids,definitions,answers){return ids.map(id=>({id,answer:String(answers[id]||'').trim(),selectedId:validNumber(answers[id],definitions.length)?definitions[Number(answers[id])-1]:null,correct:validNumber(answers[id],definitions.length)&&definitions[Number(answers[id])-1]===id,expected:definitions.indexOf(id)+1}));}
 function createPass(ids,previous){let words=shuffle(ids),definitions=shuffle(ids);if(previous&&ids.length>1){if(words.join()==previous.words.join())words.push(words.shift());if(definitions.join()==previous.definitions.join())definitions.push(definitions.shift());}return {words,definitions,answers:{},result:null};}
 const api={shuffle,validNumber,grade,createPass};
 if(typeof module==='object')module.exports=api;else root.Task6Core=api;
})(typeof globalThis==='object'?globalThis:this);
