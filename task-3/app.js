'use strict';
const lesson = JSON.parse(document.getElementById('lesson-data').textContent);
const KEY = `rki-task3-${lesson.revision}-lesson${lesson.lesson}`;
const $ = id => document.getElementById(id);
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fresh = () => ({name:'',answers:{},started:0,completed:0,active:false,position:0,finished:false,date:null});
let state=fresh(), storageAvailable=true;
try { const saved=JSON.parse(localStorage.getItem(KEY)||'null'); if(saved && typeof saved.name==='string' && saved.answers && typeof saved.answers==='object') {
 state={...fresh(),...saved};state.name=state.name.slice(0,80);state.started=Math.min(2,Math.max(0,Number(state.started)||0));state.completed=Math.min(state.started,Math.max(0,Number(state.completed)||0));state.position=Math.max(0,Number(state.position)||0);
 for(const q of lesson.questions) if(!Object.hasOwn(q.options,state.answers[q.n]))delete state.answers[q.n];
 if(state.finished && (Object.keys(state.answers).length!==10 || state.completed<2))state.finished=false;
}} catch { storageAvailable=false; }
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));localStorage.setItem('rki-task3-student',state.name);}catch{storageAvailable=false;}}
function answered(){return lesson.questions.filter(q=>Object.hasOwn(q.options,state.answers[q.n])).length;}
function grade(){const correct=lesson.questions.filter(q=>state.answers[q.n]===q.answer).length;return {correct,points:correct*2,total:lesson.questions.length*2,percent:Math.round(correct/lesson.questions.length*100)};}
const audio=$('story-audio');let busy=false,lastSave=-1,restorePosition=state.position;
function attachAudio(){if(!audio.getAttribute('src'))audio.src=$('audio-data').textContent.trim();}
function renderQuestions(){
 $('questions').innerHTML=lesson.questions.map(q=>`<fieldset class="panel question" id="question-${q.n}"><legend><span class="q-number">${q.n}</span> ${escapeHTML(q.question)}</legend><div class="options">${Object.entries(q.options).map(([key,text])=>`<label class="option"><input type="radio" name="q${q.n}" value="${key}" ${state.answers[q.n]===key?'checked':''}><span class="option-letter">${key}</span><span>${escapeHTML(text)}</span></label>`).join('')}</div></fieldset>`).join('');
 $('question-jumps').innerHTML=lesson.questions.map(q=>`<a href="#question-${q.n}" aria-label="Вопрос ${q.n}">${q.n}</a>`).join('');
 updateCounts();
}
function updateCounts(){const n=answered();$('answer-count').textContent=`Выбрано ${n} из 10 · 已答 ${n}/10`;
 document.querySelectorAll('#question-jumps a').forEach((el,i)=>el.classList.toggle('answered',Boolean(state.answers[lesson.questions[i].n])));
 $('submit').disabled=state.finished||state.completed<2||n!==10;
 $('submit-guide').textContent=state.completed<2?'Прослушайте текст два раза. Затем проверьте ответы. · 听两遍录音后检查答案。':n<10?`Ответьте на все вопросы: осталось ${10-n}. · 请回答所有问题，还剩 ${10-n} 题。`:'Проверьте свой выбор и нажмите кнопку. · 检查选择后点击按钮。';
}
function updatePlayer(){
 const playing=!audio.paused&&!audio.ended;const available=state.finished||state.active||state.started<2;
 $('play').disabled=busy||playing||!available;
 $('play').textContent=state.finished?'Слушать ещё раз · 再听一次':state.active&&state.position>0?'Продолжить слушать · 继续听':state.completed===1?'Слушать второй раз · 再听一遍':'Слушать · 播放';
 $('pause').disabled=!playing;$('resume').disabled=busy||playing||(!state.finished&&!state.active)||!audio.getAttribute('src')||audio.ended;
 $('stop').disabled=!audio.getAttribute('src')||(!state.finished&&!state.active);
 $('listen-count').textContent=state.finished?'Повторяйте текст без ограничений · 可以不限次数地再听':`Прослушано ${state.completed} из 2 · 已听 ${state.completed}/2${state.active?' · Сейчас '+state.started+'-е прослушивание':''}`;
 updateCounts();
}
async function play(restart=false){if(busy)return;if(!state.finished&&!state.active&&state.started>=2)return;busy=true;updatePlayer();const old={started:state.started,active:state.active,position:state.position};
 try{
  attachAudio();if(state.finished){if(restart||audio.ended)audio.currentTime=0;}else if(!state.active){state.active=true;state.started++;state.position=0;audio.currentTime=0;}
  audio.playbackRate=$('slow').checked?.8:1;await audio.play();save();$('audio-status').textContent='Слушаем · 正在播放';
 }catch{Object.assign(state,old);save();$('audio-status').textContent='Не удалось включить запись. Нажмите «Слушать» ещё раз. · 播放失败，请重试。';}
 finally{busy=false;updatePlayer();}
}
audio.addEventListener('loadedmetadata',()=>{if(restorePosition>0&&!state.finished){audio.currentTime=Math.min(restorePosition,Math.max(0,audio.duration-.1));restorePosition=0;}});
audio.addEventListener('timeupdate',()=>{if(Number.isFinite(audio.duration)){$('audio-progress').max=audio.duration;$('audio-progress').value=audio.currentTime;}
 if(!state.finished&&state.active){state.position=audio.currentTime;const sec=Math.floor(audio.currentTime);if(sec!==lastSave){save();lastSave=sec;}}
});
audio.addEventListener('ended',()=>{if(!state.finished&&state.active){state.completed=Math.min(2,state.completed+1);state.active=false;state.position=0;save();}$('audio-status').textContent='Запись закончилась · 播放完毕';updatePlayer();});
audio.addEventListener('pause',()=>{if(!audio.ended){if(!state.finished&&state.active)state.position=audio.currentTime;save();}updatePlayer();});
audio.addEventListener('playing',()=>updatePlayer());
audio.addEventListener('error',()=>{$('audio-status').textContent='Запись не загрузилась. Попробуйте ещё раз. · 录音未能加载，请重试。';updatePlayer();});
$('play').addEventListener('click',()=>play(state.finished));$('resume').addEventListener('click',()=>play());
$('pause').addEventListener('click',()=>{audio.pause();$('audio-status').textContent='Пауза. Продолжите с этого места. · 已暂停，可从此处继续。';});
$('stop').addEventListener('click',()=>{audio.pause();audio.currentTime=0;restorePosition=0;state.position=0;save();$('audio-status').textContent='Остановлено. Запись начнётся с начала. · 已停止，下次从头播放。';updatePlayer();});
$('slow').addEventListener('change',()=>{audio.playbackRate=$('slow').checked?.8:1;});
$('questions-form').addEventListener('change',e=>{if(state.finished)return;const input=e.target;if(input.matches('input[type="radio"]')){state.answers[input.name.slice(1)]=input.value;save();updateCounts();}});
$('questions-form').addEventListener('submit',e=>{e.preventDefault();if(state.finished||answered()!==10||state.completed<2)return;audio.pause();state.finished=true;state.date=new Date().toLocaleDateString('ru-RU');state.active=false;state.position=0;save();showResult();$('result').scrollIntoView({block:'start'});$('result').focus({preventScroll:true});});
function showResult(){const g=grade();$('answer-section').hidden=true;$('result').hidden=false;$('review').hidden=false;
 $('result').innerHTML=`<p class="eyebrow">Ваш результат · 你的成绩</p><h2>${escapeHTML(state.name)}</h2><p>Задание 3 · Урок ${lesson.lesson}. ${escapeHTML(lesson.theme)}</p><p class="result-date">${escapeHTML(state.date||'')}</p><div class="result-stats"><div><strong>${g.points}<small> / ${g.total}</small></strong><span>баллов · 得分</span></div><div><strong>${g.percent}%</strong><span>верно · 正确率</span></div><div><strong>${g.correct}<small> / 10</small></strong><span>верных ответов · 答对题数</span></div></div><p>Сделайте скриншот результата. · 请截图保存成绩。</p>`;
 $('review-list').innerHTML=lesson.questions.map(q=>{const correct=state.answers[q.n]===q.answer;return `<article class="panel review-item ${correct?'correct':'incorrect'}"><p class="verdict">${correct?'✓ Верно · 正确 · 2 балла':'× Неверно · 错误 · 0 баллов'}</p><h3>${q.n}. ${escapeHTML(q.question)}</h3><p class="your-answer">Ваш ответ · 你的答案: <b>${state.answers[q.n]}</b> — ${escapeHTML(q.options[state.answers[q.n]])}</p>${correct?'':`<p class="right-answer">Правильный ответ · 正确答案: <b>${q.answer}</b> — ${escapeHTML(q.options[q.answer])}</p>`}<p class="evidence-label">В рассказе · 故事中的依据</p><blockquote>${escapeHTML(q.evidence)}</blockquote></article>`;}).join('');
 $('transcript').innerHTML=lesson.text.split('\n\n').map(t=>`<p>${escapeHTML(t).replace(/\n/g,'<br>')}</p>`).join('');
 $('player-title').textContent='Слушайте и повторяйте · 听录音并跟读';$('listen-guide').textContent='Теперь можно слушать рассказ и читать полный текст.';$('listen-guide-zh').textContent='现在可以不限次数地听录音，并阅读下面的全文。';updatePlayer();
}
$('read-listen').addEventListener('click',()=>{play(true);$('story-audio').closest('section').scrollIntoView({block:'start'});});
function start(){ $('name-gate').hidden=true;$('work').hidden=false;$('student-label').textContent=state.name;renderQuestions();if(state.finished)showResult();else updatePlayer();$('audio-status').textContent=state.finished?'Можно слушать снова. · 可以再次播放。':state.completed===2?'Вы прослушали текст два раза. Проверьте ответы. · 已听两遍，请检查答案。':state.active?'Продолжите прослушивание. · 请继续听录音。':state.completed===1?'Послушайте текст второй раз. · 请再听一遍。':'Нажмите «Слушать». · 点击“播放”。';if(!storageAvailable){$('name-error').textContent='Браузер не сохраняет результат после закрытия. · 浏览器关闭后无法保存进度。';}}
$('name-form').addEventListener('submit',e=>{e.preventDefault();const name=$('student-name').value.trim();if(!name){$('name-error').textContent='Введите имя. · 请输入姓名。';return;}state.name=name;save();start();});
$('change-name').addEventListener('click',()=>{audio.pause();$('work').hidden=true;$('name-gate').hidden=false;$('student-name').value=state.name;$('student-name').focus();});
try{$('student-name').value=state.name||localStorage.getItem('rki-task3-student')||'';}catch{}
if(state.name)start();
window.addEventListener('pagehide',()=>{if(state.active&&!state.finished)state.position=audio.currentTime||state.position;save();});
