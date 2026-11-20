(function(root){
 'use strict';
 const normalize=s=>String(s||'').normalize('NFC').toLowerCase().replace(/ё/g,'е').replace(/[\u0300-\u036f]/g,'').trim().replace(/[.!?,;:]+$/,'').trim();
 function distance(a,b){
  const v=Array.from({length:b.length+1},(_,i)=>i);let prev;
  for(let i=1;i<=a.length;i++){prev=v[0];v[0]=i;for(let j=1;j<=b.length;j++){const old=v[j];v[j]=Math.min(v[j]+1,v[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old;}}
  return v[b.length];
 }
 function gradeOne(raw,key,keys,policy='recognition'){
  const value=normalize(raw);if(!value||!/^[а-я-]+$/.test(value)||value.length>60)return {correct:false,kind:'wrong',heard:key.answer};
  const choices=keys.map(k=>({key:k,forms:[...new Set((policy==='recognition'?k.forms:[k.answer]).map(normalize))]}));
  const exact=choices.filter(x=>x.forms.includes(value));
  if(exact.length){const ok=exact.some(x=>x.key.lemma===key.lemma);return {correct:ok,kind:ok?(normalize(key.answer)===value?'exact':'form'):'wrong',heard:key.answer};}
  const ranked=choices.map(x=>({key:x.key,d:Math.min(...x.forms.map(f=>{
   if(value==='не'+f||value==='ни'+f)return Infinity;
   const n=Math.min(f.length,value.length),allowed=n>=9?2:n>=4?1:0;
   const d=distance(value,f);return d<=allowed?d:Infinity;
  }))}));
  const best=Math.min(...ranked.map(x=>x.d));const matches=ranked.filter(x=>x.d===best);
  const ok=Number.isFinite(best)&&matches.length===1&&matches[0].key.lemma===key.lemma;
  return {correct:ok,kind:ok?'spelling':'wrong',heard:key.answer};
 }
 function grade(answers,keys,policy){const items=keys.map(k=>({...k,...gradeOne(answers[k.n],k,keys,policy),given:String(answers[k.n]||'')}));const points=items.filter(x=>x.correct).length;return {items,points,total:keys.length,percent:Math.round(points/keys.length*100)};}
 const api={normalize,distance,gradeOne,grade};root.RkiTask4=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
