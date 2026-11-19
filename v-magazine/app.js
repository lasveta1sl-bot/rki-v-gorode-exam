(() => {
  'use strict';
  const bank = window.SHOP_BANK;
  const clips = window.SHOP_AUDIO || (window.SHOP_AUDIO = {});
  const $ = id => document.getElementById(id);
  const storageKey = 'rki-shop-exam-v1';
  let saved;
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { saved = {}; }
  if (!saved || typeof saved !== 'object') saved = {};
  const state = {
    name: typeof saved.name === 'string' ? saved.name.slice(0, 60) : '',
    words: new Set(Array.isArray(saved.words) ? saved.words.map(w => w === "Простуда" ? "простуда" : w).filter(w => bank.words.includes(w)) : []),
    read: new Set(Array.isArray(saved.read) ? saved.read.filter(id => bank.rows.some(r => r.id === id)) : []),
    listened: new Set(Array.isArray(saved.listened) ? saved.listened.filter(id => bank.rows.some(r => r.id === id)) : [])
  };
  let sentenceLimit = 6;
  const grading=window.CityGrading;
  const validIds=new Set(bank.rows.map(r=>r.id));
  let answers={};
  for(const [id,a] of Object.entries(saved.answers||{}))if(validIds.has(id)&&a&&typeof a.choice==='boolean')answers[id]={choice:a.choice,submitted:a.submitted===true,skipped:a.skipped===true,format:a.format==='words'?'words':'legacy',correction:typeof a.correction==='string'?a.correction.slice(0,2000):''};
  for(const [id,a] of Object.entries(answers)){
    const row=bank.rows.find(r=>r.id===id);
    if(!a.submitted&&!row.matches&&!a.choice&&grading.normalize(a.correction)===grading.normalize(row.written_text))answers[id]={...a,format:'words',correction:''};
  }
  let order=Array.isArray(saved.order)?saved.order.filter(id=>validIds.has(id)):[];
  order=[...new Set([...order,...validIds])];
  const groups=['all','11.3','11.5','practice','Другие фрагменты'];
  $('task-filter').value=groups.includes(saved.filter)?saved.filter:'all';
  let taskIndex=Number.isInteger(saved.taskIndex)&&saved.taskIndex>=0?saved.taskIndex:0;
  const persist = () => {
    try { localStorage.setItem(storageKey, JSON.stringify({name:state.name,words:[...state.words],read:[...state.read],listened:[...state.listened],answers,order,filter:$('task-filter').value,taskIndex})); }
    catch { /* The page remains usable when browser storage is unavailable. */ }
  };
  function node(tag, text, className) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
  }
  function matchesSource(row, filter) {
    return filter === 'all' || row.group === filter;
  }
  const player = new Audio();
  player.id = 'shop-audio-player';
  player.hidden = true;
  document.body.append(player);
  player.preload = 'auto';
  let activeControl = null;
  let playGeneration = 0;
  function stopAudio() {
    playGeneration++;
    player.pause();
    player.currentTime = 0;
    if (activeControl) {activeControl.pause.textContent='Пауза · 暂停'; activeControl.status.textContent=''; activeControl.pause.disabled=true; activeControl.stop.disabled=true;}
    activeControl=null;
  }
  function buildPlayer(host, id, onEnd) {
    const box=$(host); box.replaceChildren();
    const start=node('button',clips[id]?'▶ Слушать · 听':window.SHOP_PENDING.includes(id)?'Запись готовится · 录音准备中':'Загрузка · 加载中…','button primary');start.type='button';start.disabled=!clips[id];
    if(!clips[id]){const ready=()=>{if(!clips[id])return;start.disabled=false;start.textContent='▶ Слушать · 听';window.removeEventListener('shop-audio-ready',ready);};window.addEventListener('shop-audio-ready',ready);}
    const pause=node('button','Пауза · 暂停','button secondary');pause.type='button';pause.disabled=true;
    const stop=node('button','Стоп · 停止','button secondary');stop.type='button';stop.disabled=true;
    const speed=node('button','Медленнее · 慢速','button secondary');speed.type='button';speed.setAttribute('aria-pressed','false');
    const status=node('span','','audio-status');status.setAttribute('role','status');
    const control={start,pause,stop,speed,status,id,onEnd,slow:false};
    async function play() {
      const generation=++playGeneration;
      try {await player.play(); if(generation!==playGeneration)return;pause.disabled=false;stop.disabled=false;pause.textContent='Пауза · 暂停';status.textContent='Слушайте · 请听';}
      catch {if(generation!==playGeneration)return;status.textContent='Не удалось включить запись. Нажмите «Слушать» ещё раз.';pause.disabled=true;stop.disabled=true;}
    }
    start.addEventListener('click',()=>{
      stopAudio();activeControl=control;player.src=clips[id];player.playbackRate=control.slow?0.8:1;play();
    });
    pause.addEventListener('click',()=>{if(activeControl!==control)return;if(player.paused)play();else{playGeneration++;player.pause();pause.textContent='Продолжить · 继续';status.textContent='Пауза · 暂停';}});
    stop.addEventListener('click',stopAudio);
    speed.addEventListener('click',()=>{control.slow=!control.slow;speed.setAttribute('aria-pressed',String(control.slow));if(activeControl===control)player.playbackRate=control.slow?0.8:1;});
    box.append(start,pause,stop,speed,status);
    return control;
  }
  player.addEventListener('ended',()=>{
    if(!activeControl)return;
    const control=activeControl;control.pause.disabled=true;control.stop.disabled=true;control.status.textContent='Слушайте ещё раз, если нужно. 可以再听。';
    if(bank.rows.some(row=>row.id===control.id))state.listened.add(control.id);
    persist();control.onEnd();
  });
  player.addEventListener('error',()=>{if(activeControl){activeControl.status.textContent='Запись не загрузилась. Попробуйте ещё раз.';activeControl.pause.disabled=true;activeControl.stop.disabled=true;}});
  function highlight(host,tokens,kind){
    host.replaceChildren();
    tokens.forEach(t=>host.append(t.changed?node('mark',t.text,'difference-'+kind):document.createTextNode(t.text)));
  }
  function createExercise(prefix,getRow,getAnswer,setAnswer,onComplete){
    let heard=false;
    function refresh(){
      const row=getRow(),answer=getAnswer(),g=grading.grade(row,answer);
      const yes=$(prefix+'-yes'),no=$(prefix+'-no');
      [yes,no].forEach((button,i)=>{
        const chosen=!!answer&&answer.choice===(i===0);
        button.disabled=!heard||!!answer;
        button.setAttribute('aria-pressed',String(chosen));
        button.classList.toggle('choice-correct',chosen&&g.choiceCorrect);
        button.classList.toggle('choice-incorrect',chosen&&!g.choiceCorrect);
      });
      const feedback=$(prefix+'-feedback');
      feedback.className='answer-feedback'+(answer?(g.choiceCorrect?' correct':' incorrect'):'');
      feedback.textContent=!answer?(heard?'Выберите: одинаково или нет? 请选择：是否相同？':'Сначала слушайте. 请先听完整句子。'):g.choiceCorrect?(row.matches?'✓ Верно. Одинаково. 答对了，内容相同。':'✓ Верно. Есть разные слова. +1 балл. 答对了，有不同的词。+1分。'):(row.matches?'✕ Нет. Слова одинаковые. 选错了，内容相同。':'✕ Нет. Есть разные слова. 选错了，有不同的词。');
      const pending=!!answer&&!g.done;
      $(prefix+'-correction-form').hidden=!pending;
      $(prefix+'-comparison').hidden=!g.done;
      $(prefix+'-written').textContent=row.written_text;
      if(pending)$(prefix+'-correction').value=answer.correction;
      if(g.done){
        const diff=grading.differences(row.written_text,row.audio_text);
        highlight($(prefix+'-written'),diff.written,'written');
        highlight($(prefix+'-heard'),diff.heard,'heard');
        const pairs=$(prefix+'-pairs');pairs.replaceChildren();
        if(row.matches)pairs.append(node('p','Всё одинаково. 内容相同，不用改。'));
        else row.changes.forEach(c=>{
          const pair=node('div',undefined,'word-pair');
          const written=node('div'),audio=node('div');
          written.append(node('span','Вижу · 看到的','pair-label'),node('mark',c.written,'difference-written'));
          audio.append(node('span','Слышу · 听到的','pair-label'),node('mark',c.audio,'difference-heard'));
          pair.append(written,audio);pairs.append(pair);
        });
        let result=g.points+' / 2 балла · 分。 ';
        if(!g.choiceCorrect)result+='Выбор: 0. Слушайте ещё раз. 判断：0分。请再听一次。';
        else if(row.matches)result+='Верно: +2. 判断正确：+2分。';
        else if(g.correctionCorrect)result+='Выбор: +1. Слова: +1. 判断：+1分。改词：+1分。';
        else if(answer.skipped)result+='Выбор: +1. Слова: 0. Вы открыли ответ. 判断：+1分。改词：0分，已查看答案。';
        else result+='Выбор: +1. Слова: 0. Сравните слова ниже. 判断：+1分。改词：0分。请对照正确答案。';
        $(prefix+'-result').textContent=result;
        $(prefix+'-result').className='score-feedback '+(g.points===2?'correct':g.points===1?'partial':'incorrect');
        if(answer.submitted&&!answer.skipped){
          const submitted=node('p',undefined,'submitted-answer');submitted.append(node('strong','Ваш ответ · 你的答案：'),document.createTextNode(answer.correction));pairs.append(submitted);
        }
      }
    }
    function choose(choice){
      if(!heard||getAnswer())return;
      const row=getRow();
      setAnswer({choice,submitted:false,skipped:false,format:'words',correction:''});
      refresh();onComplete();
      if(!grading.grade(row,getAnswer()).done)$(prefix+'-correction').focus();
    }
    $(prefix+'-yes').addEventListener('click',()=>choose(true));
    $(prefix+'-no').addEventListener('click',()=>choose(false));
    $(prefix+'-correction').addEventListener('input',()=>{
      $(prefix+'-correction').setCustomValidity('');const a=getAnswer();if(a&&!grading.grade(getRow(),a).done)setAnswer({...a,correction:$(prefix+'-correction').value});
    });
    function submit(skipped){
      const a=getAnswer();if(!a||grading.grade(getRow(),a).done)return;
      if(!skipped&&!$(prefix+'-correction').value.trim()){$(prefix+'-correction').setCustomValidity('Напишите слово. 请写出你听到的词。');$(prefix+'-correction').reportValidity();return;}
      setAnswer({...a,correction:$(prefix+'-correction').value,submitted:true,skipped});refresh();onComplete();
    }
    $(prefix+'-correction-form').addEventListener('submit',e=>{e.preventDefault();submit(false);});
    $(prefix+'-skip').addEventListener('click',()=>submit(true));
    return {render(){heard=false;refresh();buildPlayer(prefix+'-player',getRow().id,()=>{heard=true;refresh();});}};
  }
  function updateName() {
    $('student-name').textContent = state.name;
    $('name-gate').hidden = Boolean(state.name);
    $('learning').hidden = !state.name;
    $('name-input').value = state.name;
  }
  function route(focus = false) {
    stopAudio();
    const requested = location.hash.slice(1);
    const step = ['words','sentences','format','task','summary'].includes(requested) ? requested : 'words';
    document.querySelectorAll('[data-panel]').forEach(el => { el.hidden = el.dataset.panel !== step; });
    document.querySelectorAll('[data-step]').forEach(el => {
      if (el.dataset.step === step) el.setAttribute('aria-current','step'); else el.removeAttribute('aria-current');
    });
    if (step === 'summary') renderSummary();
    if (focus && state.name) $('workspace').focus({preventScroll:false});
  }
  function renderWords() {
    const query = $('word-search').value.trim().toLocaleLowerCase('ru');
    const filtered = bank.words.filter(w => w.toLocaleLowerCase('ru').includes(query));
    const container = $('vocabulary'); container.replaceChildren();
    filtered.forEach(word => {
      const id='WORD-'+String(bank.words.indexOf(word)+1).padStart(3,'0');
      const card=node('div',undefined,'word-card');
      const button = node('button',undefined,'word');button.type='button';
      button.setAttribute('aria-label','Слушать: '+word.toLocaleLowerCase('ru'));button.append(node('span',word.toLocaleLowerCase('ru')));
      button.addEventListener('click',()=>{const controls=buildPlayer('word-player',id,()=>{});if(clips[id])controls.start.click();});
      const mark=node('button',state.words.has(word)?'✓':'○','word-mark');mark.type='button';mark.setAttribute('aria-label','Повторено: '+word.toLocaleLowerCase('ru'));mark.setAttribute('aria-pressed',String(state.words.has(word)));
      mark.addEventListener('click',()=>{if(state.words.has(word))state.words.delete(word);else state.words.add(word);persist();mark.textContent=state.words.has(word)?'✓':'○';mark.setAttribute('aria-pressed',String(state.words.has(word)));$('word-count').textContent='Повторено '+state.words.size+' из '+bank.words.length;});
      card.append(button,mark);container.append(card);
    });
    $('word-count').textContent = 'Повторено '+state.words.size+' из '+bank.words.length;
    $('word-empty').hidden = filtered.length !== 0;
  }
  function renderSentences() {
    stopAudio();
    const filtered=bank.rows.filter(r=>matchesSource(r,$('sentence-filter').value));
    const container=$('sentences-list');container.replaceChildren();
    filtered.slice(0,sentenceLimit).forEach(r=>{
      const article=node('article',undefined,'source-sentence');
      article.append(node('span',r.sources,'source-tag'),node('p',r.audio_text));
      const read=node('button',state.read.has(r.id)?'✓ Повторил(а) · 已跟读':'Повторил(а) · 已跟读','read-button');read.type='button';read.setAttribute('aria-pressed',String(state.read.has(r.id)));
      read.addEventListener('click',()=>{if(state.read.has(r.id))state.read.delete(r.id);else state.read.add(r.id);persist();read.textContent=state.read.has(r.id)?'✓ Повторил(а) · 已跟读':'Повторил(а) · 已跟读';read.setAttribute('aria-pressed',String(state.read.has(r.id)));});
      const audioBox=node('div',undefined,'clip-player');audioBox.id='sentence-player-'+r.id;
      article.append(audioBox,read);container.append(article);
      buildPlayer(audioBox.id,r.id,()=>{});
    });
    $('sentence-count').textContent='Показано '+Math.min(sentenceLimit,filtered.length)+' из '+filtered.length;
    $('more-sentences').hidden=sentenceLimit>=filtered.length;
  }
  const taskRows=()=>order.map(id=>bank.rows.find(r=>r.id===id)).filter(r=>matchesSource(r,$('task-filter').value));
  function updateProgress(){
    const stats=grading.stats(taskRows(),answers);
    $('task-progress').textContent='Выполнено '+stats.done+' из '+stats.total+'. Набрано баллов: '+stats.points+' / '+(stats.total*2)+'.';
    $('task-next').textContent=taskIndex===taskRows().length-1?'Результат · 成绩':'Дальше · 下一题';
  }
  const taskExercise=createExercise('task',()=>taskRows()[taskIndex],()=>answers[taskRows()[taskIndex].id],a=>{answers[taskRows()[taskIndex].id]=a;persist();},updateProgress);
  let demoAnswer=null;
  const demoExercise=createExercise('demo',()=>bank.demonstration,()=>demoAnswer,a=>{demoAnswer=a;},()=>{});
  function renderTask(reset=false){
    stopAudio();
    const rows=taskRows();if(reset)taskIndex=0;taskIndex=Math.min(taskIndex,rows.length-1);
    $('task-count').textContent='Предложение '+(taskIndex+1)+' из '+rows.length;
    taskExercise.render();updateProgress();persist();
    $('task-prev').disabled=taskIndex===0;
    const jump=$('task-jump');jump.replaceChildren();rows.forEach((row,i)=>{const option=node('option',String(i+1));option.value=String(i);jump.append(option);});jump.value=String(taskIndex);
  }
  function renderSummary() {
    $('summary-name').textContent=state.name;
    const stats=grading.stats(taskRows(),answers);
    $('summary-scope').textContent='Материал: '+$('task-filter').selectedOptions[0].textContent;
    $('summary-status').textContent=stats.done===stats.total?'Готово! 已完成。':stats.done?'Ещё не всё. 尚未完成。 '+stats.done+' из '+stats.total+' предложений.':'Ответов пока нет. 尚未完成任何题目。';
    const box=$('summary-assessment');box.replaceChildren();
    const percent=node('p',stats.done?String(stats.percent).replace('.',',')+'%':'—','result-percent');
    box.append(percent,node('p','Набрано баллов: '+stats.points+' из '+stats.max+'. Выполнено предложений: '+stats.done+'.','score-caption'));
    if(stats.done){
      const list=node('dl');
      [['Всё верно · 全对',stats.full+' из '+stats.done+' ('+String(stats.fullPercent).replace('.',',')+'%)'],['Верный выбор · 判断正确',stats.choices+' из '+stats.done+' ('+String(stats.choicePercent).replace('.',',')+'%)'],['Выполнено · 已完成',stats.done+' из '+stats.total]].forEach(([label,value])=>{const item=node('div');item.append(node('dt',label),node('dd',value));list.append(item);});
      box.append(list);
    }
    if(stats.done<stats.total)box.append(node('p','Проценты рассчитаны только по завершённым предложениям. Максимум баллов за весь выбранный материал: '+(stats.total*2)+'.','caption'));
    $('summary-words').textContent=state.words.size+' / '+bank.words.length;
    $('summary-sentences').textContent=state.read.size+' / '+bank.rows.length;
    $('summary-listened').textContent=state.listened.size+' / '+bank.rows.length;
    $('summary-date').textContent='Дата: '+new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date());
  }
  $('name-form').addEventListener('submit',e=>{
    e.preventDefault();const value=$('name-input').value.trim();
    if(!value){$('name-input').setCustomValidity('Введите имя.');$('name-input').reportValidity();return;}
    state.name=value;persist();updateName();route(true);
  });
  $('name-input').addEventListener('input',()=> $('name-input').setCustomValidity(''));
  $('rename').addEventListener('click',()=>{ $('name-gate').hidden=false;$('learning').hidden=true;$('name-input').focus(); });
  $('word-search').addEventListener('input',renderWords);
  $('sentence-filter').addEventListener('change',()=>{sentenceLimit=6;renderSentences();});
  $('more-sentences').addEventListener('click',()=>{sentenceLimit+=6;renderSentences();});
  demoExercise.render();
  $('new-attempt').addEventListener('click',()=>{
    const previousAnswers=answers;
    answers={};
    const previous=order.join(',');
    for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
    if(order.join(',')===previous)order.push(order.shift());
    const priority=id=>{const a=previousAnswers[id];return !a?1:grading.grade(bank.rows.find(r=>r.id===id),a).points<2?0:2;};
    order.sort((a,b)=>priority(a)-priority(b));
    $('task-filter').value='all';renderTask(true);location.hash='task';
  });
  window.addEventListener('pagehide',stopAudio);
  $('task-filter').addEventListener('change',()=>renderTask(true));
  $('task-prev').addEventListener('click',()=>{if(taskIndex>0){taskIndex--;renderTask();}});
  $('task-next').addEventListener('click',()=>{if(taskIndex<taskRows().length-1){taskIndex++;renderTask();}else{location.hash='summary';}});
  $('task-jump').addEventListener('change',()=>{taskIndex=Number($('task-jump').value);renderTask();});
  $('summary-open').addEventListener('click',()=>{location.hash='summary';});
  window.addEventListener('hashchange',()=>route(true));
  const begin=$('name-form').querySelector('button[type=submit]');
  begin.disabled=false;begin.textContent='Начать подготовку →';
  updateName();renderWords();renderSentences();renderTask();route();
})();
