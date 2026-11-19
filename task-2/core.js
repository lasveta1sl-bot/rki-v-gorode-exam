(function(root){'use strict';
const api={
 order(ids,previous=[],stats={},random=Math.random){let a=[...new Set(ids)];for(let i=a.length-1;i>0;i--){let j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}a.sort((x,y)=>(stats[y]?.wrong||0)-(stats[x]?.wrong||0));if(a.length>1&&a.join('|')===previous.join('|'))a.push(a.shift());return a;},
 score(run,points=1){let correct=Object.values(run.answers).filter(x=>x.correct).length,total=run.order.length;return{correct,total,points:correct*points,max:total*points,percent:Math.round(correct/total*100),passed:correct/total>=.7};},
 create(ids,previous,stats,review=false){return {order:this.order(ids,previous,stats),answers:{},listens:{},heard:{},index:0,review,started:new Date().toISOString()};},
 record(run,item,answer){if(run.answers[item.id])return false;run.answers[item.id]={answer,correct:answer===item.answer};if(Object.keys(run.answers).length===run.order.length)run.finished=new Date().toISOString();return true;}
};if(typeof module!=='undefined')module.exports=api;root.Task2Core=api;
})(typeof window==='undefined'?globalThis:window);
