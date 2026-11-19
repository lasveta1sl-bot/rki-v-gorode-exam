/* Shared assessment rules. No audio or exercise content is changed here. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CityGrading=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const normalize=text=>String(text||'').normalize('NFC').toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/\u0301/g,'').match(/[\p{L}\p{N}]+/gu)?.join(' ')||'';
  function grade(row,answer){
    if(!answer||typeof answer.choice!=='boolean')return {done:false,choiceCorrect:false,correctionCorrect:false,points:0};
    const choiceCorrect=answer.choice===row.matches;
    const needsCorrection=choiceCorrect&&!row.matches;
    const done=!needsCorrection||answer.submitted===true;
    const correctionCorrect=needsCorrection&&done&&!answer.skipped&&normalize(answer.correction)===normalize(row.audio_text);
    return {done,choiceCorrect,correctionCorrect,points:choiceCorrect?(row.matches?2:1+Number(correctionCorrect)):0};
  }
  function stats(rows,answers){
    const grades=rows.map(r=>grade(r,answers[r.id])).filter(g=>g.done);
    const done=grades.length,points=grades.reduce((s,g)=>s+g.points,0),choices=grades.filter(g=>g.choiceCorrect).length,full=grades.filter(g=>g.points===2).length;
    return {total:rows.length,done,points,max:done*2,choices,full,percent:done?Math.round(points/(done*2)*1000)/10:0,choicePercent:done?Math.round(choices/done*1000)/10:0,fullPercent:done?Math.round(full/done*1000)/10:0};
  }
  function differences(written,heard){
    const split=s=>s.match(/[\p{L}\p{N}\u0301]+|[^\p{L}\p{N}\u0301]+/gu)||[];
    const left=split(written),right=split(heard);
    const words=a=>a.map((text,index)=>({text,index,key:normalize(text)})).filter(t=>t.key);
    const a=words(left),b=words(right),dp=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
    for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)dp[i][j]=a[i].key===b[j].key?1+dp[i+1][j+1]:Math.max(dp[i+1][j],dp[i][j+1]);
    const sameA=new Set(),sameB=new Set();let i=0,j=0;
    while(i<a.length&&j<b.length){if(a[i].key===b[j].key){sameA.add(a[i++].index);sameB.add(b[j++].index);}else if(dp[i+1][j]>=dp[i][j+1])i++;else j++;}
    return {written:left.map((text,index)=>({text,changed:!!normalize(text)&&!sameA.has(index)})),heard:right.map((text,index)=>({text,changed:!!normalize(text)&&!sameB.has(index)}))};
  }
  return {normalize,grade,stats,differences};
});
