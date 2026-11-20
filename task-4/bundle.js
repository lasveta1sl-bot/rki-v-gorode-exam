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

;
/* One shared bank, marked by the student; never fills or grades a gap. */
window.RkiWordOrganizer={create({lesson,state,save,escape:esc}){
 const bank=document.getElementById('wordbank'),panel=bank.closest('.word-panel'),work=document.getElementById('work');
 const valid=id=>Number.isInteger(id)&&id>=0&&id<lesson.wordbank.length;
 const places={};
 if(state.wordPlaces&&typeof state.wordPlaces==='object')for(const [id,d] of Object.entries(state.wordPlaces))if(valid(Number(id))&&Number.isInteger(d)&&d>=0&&d<lesson.dialogs.length)places[id]=d;
 state.wordPlaces=places;let dragged=null;
 panel.dataset.wordZone='bank';
 bank.innerHTML=[...lesson.wordbank].sort((a,b)=>a.localeCompare(b,'ru')).map(word=>`<li>${esc(word)}</li>`).join('');
 const announce=document.createElement('p');announce.className='word-announcement';announce.setAttribute('role','status');work.append(announce);
 const trays=[...document.querySelectorAll('.word-tray')];
 // Locate only what the student actually typed; never use the correct gap to assign a colour.
 const gapDialogue=new Map();lesson.dialogs.forEach((dialog,d)=>dialog.turns.forEach(turn=>{for(const m of turn.matchAll(/\((\d+)\) __________/g))gapDialogue.set(Number(m[1]),d);}));
 const order=lesson.wordbank.map((_,id)=>id).sort((a,b)=>lesson.wordbank[a].localeCompare(lesson.wordbank[b],'ru'));
 const filters=trays.map(()=> 'all');
 function uses(id){
  const word=lesson.wordbank[id],forms=lesson.keys.find(k=>k.lemma===word)?.forms||[word];
  return Object.entries(state.answers).filter(([n,answer])=>gapDialogue.has(Number(n))&&forms.some(form=>RkiTask4.normalize(form)===RkiTask4.normalize(answer))).map(([n])=>({n:Number(n),d:gapDialogue.get(Number(n))}));
 }
 function render(){
  const entries=order.map(id=>({id,word:lesson.wordbank[id],used:uses(id)}));
  const remaining=entries.filter(x=>!x.used.length).length;
  trays.forEach((tray,d)=>{
   const list=tray.querySelector('.tray-words'),scroll=list.parentElement.scrollTop;
   tray.querySelectorAll('[data-word-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.wordFilter===filters[d])));
   tray.querySelector('[data-word-filter="remaining"] span').textContent=remaining;
   const visible=entries.filter(x=>filters[d]==='all'||filters[d]==='remaining'&&!x.used.length||filters[d]==='current'&&(x.used.length?x.used.some(u=>u.d===d):places[x.id]===d));
   list.innerHTML=visible.map(({word,id,used})=>{
    const destination=used.length?used[0].d:places[id],marked=Number.isInteger(destination),own=destination===d;
    const locations=used.length?used.map(u=>`<button type="button" class="word-jump dialog-color-${u.d}" data-word-gap="${u.n}" aria-label="${esc(word)}: ваш ответ, диалог ${u.d+1}, пропуск ${u.n}">${u.d+1} · №${u.n}</button>`).join(''):marked?`<span class="word-note dialog-color-${destination}" aria-label="Ваша отметка: диалог ${destination+1}">${destination+1} ✓</span>`:'';
    return `<li${word.length>12?' class="long-word"':''}><div class="word-item${marked?' dialog-color-'+destination:''}"><button type="button" class="word-chip${own?' selected':''}" data-word="${id}" aria-pressed="${own}" draggable="${!state.finished&&!used.length}" ${state.finished&&!used.length?'disabled':''} ${used.length?`aria-label="${esc(word)}: найти ваш ответ"`:''}>${esc(word)}</button>${locations?`<div class="word-locations">${locations}</div>`:''}</div></li>`;
   }).join('')||`<li class="word-empty">${filters[d]==='remaining'?'Все слова вписаны. · 所有词已填写。':'Вы пока не отметили слова. · 你还没有标记词语。'}</li>`;
   list.parentElement.scrollTop=scroll;
  });
 }
 function jump(n){
  const input=document.getElementById(`gap-${n}`),dialog=input?.closest('.dialog');if(!input||!dialog)return;
  if(dialog.hidden){const filter=document.getElementById('material');filter.value=String(gapDialogue.get(n));filter.dispatchEvent(new Event('change'));}
  input.scrollIntoView({block:'center',behavior:'instant'});input.focus({preventScroll:true});
  document.querySelectorAll('.gap.word-located').forEach(el=>el.classList.remove('word-located'));
  input.closest('.gap').classList.add('word-located');setTimeout(()=>input.closest('.gap').classList.remove('word-located'),2400);
 }
 function move(id,d){
  if(state.finished||!valid(id))return;
  if(d==='bank')delete places[id];else if(Number.isInteger(d)&&d>=0&&d<3)places[id]=d;else return;
  save();render();announce.textContent=`${lesson.wordbank[id]}: ${d==='bank'?'отметка снята · 已取消':`отмечено для диалога ${d+1} · 已标记对话 ${d+1}`}`;
 }
 function toggle(tray,open){
  tray.querySelector('.choose-words').setAttribute('aria-expanded',String(open));
  tray.querySelector('.word-toggle-icon').textContent=open?'−':'+';
  tray.querySelector('.word-tray-content').hidden=!open;
  tray.closest('.dialog-layout').classList.toggle('words-open',open);
 }
 trays.forEach(tray=>toggle(tray,!matchMedia('(max-width:760px)').matches));
 work.addEventListener('click',e=>{
  const button=e.target.closest('.choose-words'),word=e.target.closest('[data-word]'),filter=e.target.closest('[data-word-filter]'),target=e.target.closest('[data-word-gap]');
  if(button){toggle(button.closest('.word-tray'),button.getAttribute('aria-expanded')!=='true');return;}
  if(filter){const d=Number(filter.closest('.word-tray').dataset.wordZone);filters[d]=filter.dataset.wordFilter;render();return;}
  if(target){jump(Number(target.dataset.wordGap));return;}
  if(word){const id=Number(word.dataset.word),used=uses(id),d=Number(word.closest('.word-tray').dataset.wordZone);
   if(used.length){jump(used[0].n);return;}
   move(id,places[id]===d?'bank':d);trays[d].querySelector(`[data-word="${id}"]`)?.focus({preventScroll:true});}
 });
 work.addEventListener('dragstart',e=>{
  const word=e.target.closest('[data-word]');if(!word||state.finished||uses(Number(word.dataset.word)).length){e.preventDefault();return;}
  dragged=Number(word.dataset.word);e.dataTransfer.setData('application/x-rki-word',String(dragged));e.dataTransfer.effectAllowed='move';
 });
 function clearDrag(){dragged=null;document.querySelectorAll('.word-drop-over').forEach(e=>e.classList.remove('word-drop-over'));}
 document.addEventListener('dragend',clearDrag);
 document.addEventListener('dragover',e=>{
  if(dragged===null)return;e.preventDefault();const zone=e.target.closest('[data-word-zone]');e.dataTransfer.dropEffect=zone?'move':'none';
  document.querySelectorAll('.word-drop-over').forEach(n=>{if(n!==zone)n.classList.remove('word-drop-over');});zone?.classList.add('word-drop-over');
 });
 document.addEventListener('drop',e=>{if(dragged===null)return;e.preventDefault();const zone=e.target.closest('[data-word-zone]');if(zone)move(dragged,zone.dataset.wordZone==='bank'?'bank':Number(zone.dataset.wordZone));clearDrag();});
 render();save();return {render};
}};

;
'use strict';
const lesson=JSON.parse(document.getElementById('lesson-data').textContent);
const $=id=>document.getElementById(id), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const audioSources=lesson.dialogs.map((_,i)=>document.getElementById(`audio-data-${i}`)?.textContent.trim()||'');
const KEY=`rki-task4-${lesson.revision}-lesson${lesson.lesson}`;
const fresh=()=>({answers:{},listen:lesson.dialogs.map(()=>({started:0,completed:0,active:false,position:0})),finished:false,date:'',name:''});
let state=fresh(),storageOK=true;
try{const old=JSON.parse(localStorage.getItem(KEY)||'null');if(old&&Array.isArray(old.listen)&&old.listen.length===3){state={...fresh(),...old};state.answers=old.answers&&typeof old.answers==='object'?old.answers:{};state.listen=old.listen.map(x=>({started:Math.max(0,Math.floor(Number(x.started)||0)),completed:Math.max(0,Math.floor(Number(x.completed)||0)),active:Boolean(x.active),position:Math.max(0,Number(x.position)||0)}));}state.name=localStorage.getItem('rki-student-name')||state.name||'';}catch{storageOK=false;}
for(const key of Object.keys(state.answers))if(!lesson.keys.some(x=>String(x.n)===key)||typeof state.answers[key]!=='string')delete state.answers[key];
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{storageOK=false;}}
const count=()=>lesson.keys.filter(k=>String(state.answers[k.n]||'').trim()).length;
const listened=()=>state.listen.every(s=>s.completed>=2);
if(state.finished&&(!listened()||count()!==20))state.finished=false;
let wordOrganizer;
const players=[],busy=[false,false,false];let restoring=[true,true,true];
function progress(){
 $('answer-count').textContent=`Заполнено ${count()} из 20 · 已填 ${count()}/20`;
 $('submit').disabled=state.finished||!listened()||count()!==20;
 $('submit-guide').textContent=!listened()?'Послушайте каждый диалог два раза. · 每段对话听两遍。':count()<20?`Заполните все пропуски: осталось ${20-count()}. · 请填写所有空格，还剩 ${20-count()} 个。`:'Проверьте ответы и нажмите кнопку. · 检查后点击按钮。';
 if(!storageOK)$('storage-note').hidden=false;
}
function updatePlayer(i){
 const a=players[i],s=state.listen[i],box=$(`dialog-${i}`),ready=Boolean(audioSources[i]),playing=!a.paused&&!a.ended;
 box.querySelector('[data-action="play"]').disabled=!ready||busy[i]||playing;
 box.querySelector('[data-action="play"]').textContent=!ready?(lesson.audioAvailable?.[i]?'Загрузка записи… · 录音加载中…':'Запись скоро появится · 录音即将上线'):s.active&&s.position>0?'Продолжить слушать · 继续听':state.finished||s.completed>=2?'Слушать ещё раз · 再听一次':s.completed===1?'Слушать второй раз · 再听一遍':'Слушать · 播放';
 box.querySelector('[data-action="pause"]').disabled=!playing;
 box.querySelector('[data-action="resume"]').disabled=busy[i]||playing||!a.src||a.ended||(!state.finished&&!s.active);
 box.querySelector('[data-action="stop"]').disabled=!a.src||(!state.finished&&!s.active);
 box.querySelector('.listen-count').textContent=state.finished?'Можно слушать снова · 可以再次听':s.completed>=2?`Прослушано: ${s.completed}. Можно слушать ещё. · 已听${s.completed}遍，可以继续听。`:`Прослушано ${s.completed} из 2 · 已听 ${s.completed}/2`;
 progress();
}
async function play(i,resume=false){
 const a=players[i],s=state.listen[i],box=$(`dialog-${i}`),source=audioSources[i];
 if(busy[i]||!source)return;
 busy[i]=true;players.forEach((p,j)=>{if(j!==i)p.pause();});updatePlayer(i);
 const old={...s};
 try{
  if(!a.getAttribute('src')||a.readyState<1){
   a.preload='metadata';a.src=source;
   await new Promise((resolve,reject)=>{
    const cleanup=()=>{clearTimeout(timer);a.removeEventListener('loadedmetadata',ok);a.removeEventListener('error',fail);};
    const ok=()=>{cleanup();resolve();},fail=()=>{cleanup();reject(new Error('audio'));};
    const timer=setTimeout(fail,12000);a.addEventListener('loadedmetadata',ok,{once:true});a.addEventListener('error',fail,{once:true});a.load();
   });
  }
  if(restoring[i]){if(s.active&&s.position>0)a.currentTime=Math.min(s.position,Math.max(0,a.duration-.05));restoring[i]=false;}
  if(state.finished){if(!resume||a.ended)a.currentTime=0;}else if(!s.active){s.started++;s.active=true;s.position=0;a.currentTime=0;}
  a.playbackRate=box.querySelector('.slow input').checked?.8:1;await a.play();save();box.querySelector('.audio-status').textContent='Слушаем · 正在播放';
 }catch{Object.assign(s,old);box.querySelector('.audio-status').textContent='Не удалось включить запись. Попробуйте ещё раз. · 播放失败，请重试。';save();}
 finally{busy[i]=false;updatePlayer(i);}
}
function build(){
 $('material').innerHTML='<option value="all">Все диалоги · 全部对话</option>'+lesson.dialogs.map((d,i)=>`<option value="${i}">${d.exercise} · ${esc(d.title)}</option>`).join('');
 $('dialogs').innerHTML=lesson.dialogs.map((d,i)=>`<article class="panel dialog" id="dialog-${i}"><p class="eyebrow">Диалог ${i+1} · 对话 ${i+1}</p><h2>${esc(d.title)}</h2><p class="refs-title">По материалам учебника · 教材依据: ${d.exercise}Б, с. ${d.page}</p><div class="player"><p class="listen-count"></p><div class="audio-buttons"><button type="button" data-action="play">Слушать · 播放</button><button type="button" class="secondary" data-action="pause" disabled>Пауза · 暂停</button><button type="button" class="secondary" data-action="resume" disabled>Продолжить · 继续</button><button type="button" class="secondary" data-action="stop" disabled>Стоп · 停止</button><label class="slow"><input type="checkbox">Медленнее · 慢速</label></div><progress max="1" value="0" aria-label="Прослушано"></progress><p class="audio-status" role="status">${audioSources[i]?'Нажмите «Слушать». · 点击“播放”。':lesson.audioAvailable?.[i]?'Запись загружается… · 录音加载中…':'Запись скоро появится. · 录音即将上线。'}</p><audio preload="none"></audio></div><div class="dialog-layout"><div class="turns">${d.turns.map(t=>{
 const [speaker,...rest]=t.split(': ');let text=rest.join(': '),last=0,html='';const re=/\((\d+)\) __________/g;let m;
 while((m=re.exec(text))){html+=esc(text.slice(last,m.index))+`<span class="gap"><label for="gap-${m[1]}" class="gap-number">${m[1]}</label><input id="gap-${m[1]}" name="${m[1]}" aria-label="Пропуск ${m[1]} · 第${m[1]}空" aria-describedby="feedback-${m[1]}" value="${esc(state.answers[m[1]]||'')}" maxlength="60" autocapitalize="none" autocomplete="off" spellcheck="false"><span id="feedback-${m[1]}" class="gap-feedback"></span></span>`;last=re.lastIndex;}
 return `<p><b>${esc(speaker)}:</b> ${html+esc(text.slice(last))}</p>`;
 }).join('')}</div><aside class="word-tray" data-word-zone="${i}" aria-label="Общий список слов"><button type="button" class="secondary choose-words" aria-expanded="true" aria-controls="words-${i}">Все слова · 所有词语 <span class="word-toggle-icon" aria-hidden="true">−</span></button><div class="word-tray-content" id="words-${i}"><div class="word-filters" aria-label="Показать слова · 显示词语"><button type="button" data-word-filter="all" aria-pressed="true">Все · 全部 <span>20</span></button><button type="button" data-word-filter="remaining" aria-pressed="false">Осталось · 未填 <span>20</span></button><button type="button" data-word-filter="current" aria-pressed="false">Диалог ${i+1} · 对话${i+1}</button></div><div class="word-legend"><span>Диалоги · 对话:</span><span class="dialog-color-0">1</span><span class="dialog-color-1">2</span><span class="dialog-color-2">3</span></div><ul class="tray-words"></ul></div></aside></div><details class="full-text" hidden><summary>Полный диалог · 完整对话</summary><div>${d.full_turns.map(t=>`<p>${esc(t)}</p>`).join('')}</div></details></article>`).join('');
 lesson.dialogs.forEach((d,i)=>{
  const box=$(`dialog-${i}`),a=box.querySelector('audio');players.push(a);let lastSec=-1;
  box.querySelector('[data-action="play"]').onclick=()=>play(i);
  box.querySelector('[data-action="resume"]').onclick=()=>play(i,true);
  box.querySelector('[data-action="pause"]').onclick=()=>{a.pause();box.querySelector('.audio-status').textContent='Пауза · 暂停';};
  box.querySelector('[data-action="stop"]').onclick=()=>{a.pause();a.currentTime=0;state.listen[i].position=0;restoring[i]=false;save();box.querySelector('.audio-status').textContent='Остановлено. Можно начать с начала. · 已停止，可以从头播放。';updatePlayer(i);};
  box.querySelector('.slow input').onchange=e=>a.playbackRate=e.target.checked?.8:1;
  a.onpause=()=>{if(state.listen[i].active&&!state.finished)state.listen[i].position=a.currentTime;save();updatePlayer(i);};
  a.onplaying=()=>updatePlayer(i);
  a.ontimeupdate=()=>{if(Number.isFinite(a.duration)){box.querySelector('progress').max=a.duration;box.querySelector('progress').value=a.currentTime;}if(!state.finished&&state.listen[i].active){state.listen[i].position=a.currentTime;if(Math.floor(a.currentTime)!==lastSec){save();lastSec=Math.floor(a.currentTime);}}};
  a.onended=()=>{const s=state.listen[i];if(s.active&&!state.finished){s.completed++;s.active=false;s.position=0;save();}box.querySelector('.audio-status').textContent='Прослушано · 播放完毕';updatePlayer(i);};
  a.onerror=()=>{box.querySelector('.audio-status').textContent='Запись не загрузилась. Попробуйте ещё раз. · 录音未能加载，请重试。';updatePlayer(i);};
  updatePlayer(i);
 });
}
function result(){
 const g=RkiTask4.grade(state.answers,lesson.keys,lesson.gradingPolicy);
 $('result').hidden=false;$('submit-panel').hidden=true;$('review-guide').hidden=false;$('material').value='all';filter();
 $('result').innerHTML=`<p class="eyebrow">Ваш результат · 你的成绩</p><h2>${esc(state.name)}</h2><p>Задание 4 · Урок ${lesson.lesson}. ${esc(lesson.theme)}</p><p class="result-date">${esc(state.date)}</p><div class="result-stats"><div><strong>${g.points}<small> / 20</small></strong><span>баллов · 得分</span></div><div><strong>${g.percent}%</strong><span>верно · 正确率</span></div><div><strong>${g.points}<small> / 20</small></strong><span>верных ответов · 正确答案</span></div></div><p>Сделайте скриншот результата. · 请截图保存成绩。</p>`;
 for(const item of g.items){const input=$(`gap-${item.n}`),feedback=$(`feedback-${item.n}`);input.readOnly=true;input.closest('.gap').classList.add(item.correct?'correct':'incorrect');
  feedback.innerHTML=item.correct?`<b>✓ 1 балл · 1分</b>${item.kind!=='exact'?`<span>В записи · 录音中: ${esc(item.answer)}</span>`:''}`:`<b>× 0 баллов · 0分</b><span>Слышу · 听到的: <strong>${esc(item.answer)}</strong></span>`;
 }
 wordOrganizer?.render();document.querySelectorAll('.full-text').forEach(d=>d.hidden=false);players.forEach((a,i)=>updatePlayer(i));
}
function filter(){const v=$('material').value;lesson.dialogs.forEach((d,i)=>$(`dialog-${i}`).hidden=v!=='all'&&v!==String(i));}
$('material').onchange=()=>{players.forEach(a=>a.pause());filter();};
$('show-all').onclick=()=>{$('material').value='all';filter();const missing=lesson.keys.find(k=>!String(state.answers[k.n]||'').trim());if(missing)$(`gap-${missing.n}`).focus();};
$('task-form').addEventListener('input',e=>{if(!state.finished&&e.target.matches('.gap input')){state.answers[e.target.name]=e.target.value;save();progress();wordOrganizer?.render();}});
$('task-form').onsubmit=e=>{e.preventDefault();if(state.finished||!listened()||count()!==20)return;players.forEach(a=>a.pause());state.finished=true;state.date=new Date().toLocaleDateString('ru-RU');save();result();$('result').scrollIntoView({block:'start'});$('result').focus({preventScroll:true});};
function start(){state.name=$('student-name').value.trim().replace(/\s+/g,' ').slice(0,60);if(!state.name)return;try{localStorage.setItem('rki-student-name',state.name);}catch{storageOK=false;}save();$('name-gate').hidden=true;$('work').hidden=false;$('student-label').textContent=state.name;if(state.finished)result();}
$('name-form').onsubmit=e=>{e.preventDefault();start();};
$('change-name').onclick=()=>{players.forEach(a=>a.pause());$('work').hidden=true;$('name-gate').hidden=false;$('student-name').value=state.name;$('student-name').focus();};
$('student-name').value=state.name;build();wordOrganizer=RkiWordOrganizer.create({lesson,state,save,escape:esc});if(state.name)start();
window.addEventListener('pagehide',save);

// Bootstrap the exercise before the embedded recordings finish streaming.
document.addEventListener('rki-audio-ready',event=>{const i=event.detail;if(!Number.isInteger(i)||!players[i])return;audioSources[i]=$(`audio-data-${i}`)?.textContent.trim()||'';if(audioSources[i])$(`dialog-${i}`).querySelector('.audio-status').textContent='Нажмите «Слушать». · 点击“播放”。';updatePlayer(i);});
document.dispatchEvent(new Event('rki-task4-ready'));
performance.mark('rki-task4-ui-ready');
