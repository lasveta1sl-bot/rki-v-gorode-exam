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
