(function(root){
'use strict';
const nums={один:1,одна:1,два:2,две:2,двух:2,пять:5,десять:10,двенадцать:12,двенадцати:12,двести:200,шестьсот:600,шестисот:600};
function lemma(w){
 for(const [pattern,base] of [[/^банк(а|у|е|ом)?$/,'банк'],[/^музе(й|я|ю|е|ем)$/,'музей'],[/^кругл(ый|ое|ая|ую|ого|ой|ом|ым|ые|ых|ыми|ому)$/,'круглый'],[/^рисовани(е|я|ю|и|ем)$/,'рисование'],[/^втор(ой|ом|ого|ому|ым)$/,'2'],[/^саш(а|е|и|у|ей)$/,'саша'],[/^андре(й|я|ю|ем|е)$/,'андрей'],[/^сергеевич(а|у|ем|е)?$/,'сергеевич']])if(pattern.test(w))return base;
 return String(nums[w]??w);
}
function normalize(value){return String(value).toLowerCase().replace(/ё/g,'е').replace(/(\d+)[.:]00\b/g,'$1').replace(/2[ -]м(?=\s|$)/g,'2').replace(/[^а-яa-z0-9\s]/g,' ').replace(/\s+/g,' ').trim().replace(/двести двенадцать/g,'212').split(' ').map(lemma).join(' ');}
function distance(a,b){let d=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const n=[i];for(let j=1;j<=b.length;j++)n[j]=Math.min(n[j-1]+1,d[j]+1,d[j-1]+(a[i-1]===b[j-1]?0:1));d=n;}return d[b.length];}
const strict=new Set(['T5-L09-Q04','T5-L10-Q01','T5-L10-Q02','T5-L10-Q03','T5-L10-Q04','T5-L11-Q01','T5-L11-Q03','T5-L11-Q05','T5-L12-Q05']);
const forbidden={
'T5-L09-Q01':/понедель|вторник|сред[ау]|четверг|пятниц|суббот/,
'T5-L09-Q02':/почт|парк|музе|магазин/,
'T5-L09-Q03':/право|прямо|назад/,
'T5-L09-Q04':/радуг|банк|почт/,
'T5-L09-Q05':/стадион|больниц|парк|магазин/,
'T5-L10-Q02':/ирина|павлов|саша|катя/,
'T5-L10-Q03':/перв|трет|четверт/,
'T5-L10-Q05':/терапев|стоматолог|хирург|\bлор\b/,
'T5-L11-Q01':/подарк/,
'T5-L11-Q02':/книг|тапоч|одеял/,
'T5-L11-Q04':/электротовар|канцтовар|одежд|обув/,
'T5-L12-Q01':/овальн|квадрат|сердцевид/,
'T5-L12-Q02':/сложно|модно|элегант/,
'T5-L12-Q03':/спорт|музык|балет|танц|плаван/,
'T5-L12-Q04':/театр|школ|парк|магазин/,
'T5-L12-Q05':/кат[яеию]|подруг/
};
function gradeAnswer(q,value){
 const text=normalize(value);if(!text||text.length>300)return false;
 const tokens=text.split(' ');
 if(tokens.some(w=>['не','нет','ни','или','либо'].includes(w)))return false;
 if(forbidden[q.id]?.test(text))return false;
 const numeric={'T5-L10-Q01':12,'T5-L10-Q03':2,'T5-L10-Q04':212,'T5-L11-Q03':2,'T5-L11-Q05':600}[q.id];
 const numbers=text.match(/\d+/g)||[];
 if(numeric!==undefined&&numbers.some(n=>Number(n)!==numeric))return false;
 const matches=(x,y)=>x===y||(!strict.has(q.id)&&!(/\d/.test(x+y))&&Math.min(x.length,y.length)>=4&&distance(x,y)<=(Math.min(x.length,y.length)>=7?2:1));
 const alternatives=q.accepted_answers.map(normalize).sort((a,b)=>b.length-a.length);
 if(alternatives.includes(text))return true;
 const scaffold=new Set(normalize(q.prompt_visible+' '+q.evidence+' '+q.accepted_answers.join(' ')+' это ответ находится будет она он они я есть').split(' '));
 for(const variant of alternatives){const wanted=variant.split(' ');
  for(let i=0;i<=tokens.length-wanted.length;i++){
   if(!wanted.every((w,j)=>matches(tokens[i+j],w)))continue;
   const rest=tokens.filter((_,j)=>j<i||j>=i+wanted.length);
   if(rest.every(w=>scaffold.has(w)))return true;
  }
 }
 return false;
}
const api={normalize,gradeAnswer};if(typeof module!=='undefined')module.exports=api;root.Task5Core=api;
})(typeof window!=='undefined'?window:globalThis);
