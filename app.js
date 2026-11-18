(() => {
  'use strict';
  const bank = window.CITY_BANK;
  const clips = window.CITY_AUDIO || (window.CITY_AUDIO = {});
  const $ = id => document.getElementById(id);
  const storageKey = 'rki-city-exam-preview-v1';
  let saved;
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { saved = {}; }
  if (!saved || typeof saved !== 'object') saved = {};
  const state = {
    name: typeof saved.name === 'string' ? saved.name.slice(0, 60) : '',
    words: new Set(Array.isArray(saved.words) ? saved.words.filter(w => bank.words.includes(w)) : []),
    read: new Set(Array.isArray(saved.read) ? saved.read.filter(id => bank.rows.some(r => r.id === id)) : []),
    listened: new Set(Array.isArray(saved.listened) ? saved.listened.filter(id => bank.rows.some(r => r.id === id)) : [])
  };
  let sentenceLimit = 6;
  let taskIndex = 0;
  const persist = () => {
    try { localStorage.setItem(storageKey, JSON.stringify({name:state.name,words:[...state.words],read:[...state.read],listened:[...state.listened]})); }
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
  player.id = 'city-audio-player';
  player.hidden = true;
  document.body.append(player);
  player.preload = 'auto';
  let activeControl = null;
  let playGeneration = 0;
  let taskHeard = false;
  function stopAudio() {
    playGeneration++;
    player.pause();
    player.currentTime = 0;
    if (activeControl) {activeControl.pause.textContent='Пауза'; activeControl.status.textContent=''; activeControl.pause.disabled=true; activeControl.stop.disabled=true;}
    activeControl=null;
  }
  function buildPlayer(host, id, onEnd) {
    const box=$(host); box.replaceChildren();
    const start=node('button',clips[id]?'▶ Слушать':'Загружается…','button primary');start.type='button';start.disabled=!clips[id];
    if(!clips[id]){const ready=()=>{if(!clips[id])return;start.disabled=false;start.textContent='▶ Слушать';window.removeEventListener('city-audio-ready',ready);};window.addEventListener('city-audio-ready',ready);}
    const pause=node('button','Пауза','button secondary');pause.type='button';pause.disabled=true;
    const stop=node('button','Стоп','button secondary');stop.type='button';stop.disabled=true;
    const speed=node('button','Медленнее','button secondary');speed.type='button';speed.setAttribute('aria-pressed','false');
    const status=node('span','','audio-status');status.setAttribute('role','status');
    const control={start,pause,stop,speed,status,id,onEnd,slow:false};
    async function play() {
      const generation=++playGeneration;
      try {await player.play(); if(generation!==playGeneration)return;pause.disabled=false;stop.disabled=false;pause.textContent='Пауза';status.textContent='Слушайте';}
      catch {if(generation!==playGeneration)return;status.textContent='Не удалось включить запись. Нажмите «Слушать» ещё раз.';pause.disabled=true;stop.disabled=true;}
    }
    start.addEventListener('click',()=>{
      stopAudio();activeControl=control;player.src=clips[id];player.playbackRate=control.slow?0.8:1;play();
    });
    pause.addEventListener('click',()=>{if(activeControl!==control)return;if(player.paused)play();else{playGeneration++;player.pause();pause.textContent='Продолжить';status.textContent='Пауза';}});
    stop.addEventListener('click',stopAudio);
    speed.addEventListener('click',()=>{control.slow=!control.slow;speed.setAttribute('aria-pressed',String(control.slow));if(activeControl===control)player.playbackRate=control.slow?0.8:1;});
    box.append(start,pause,stop,speed,status);
    return control;
  }
  player.addEventListener('ended',()=>{
    if(!activeControl)return;
    const control=activeControl;control.pause.disabled=true;control.stop.disabled=true;control.status.textContent='Можно слушать ещё раз';
    if(bank.rows.some(row=>row.id===control.id))state.listened.add(control.id);
    persist();control.onEnd();
  });
  player.addEventListener('error',()=>{if(activeControl){activeControl.status.textContent='Запись не загрузилась. Попробуйте ещё раз.';activeControl.pause.disabled=true;activeControl.stop.disabled=true;}});
  function answerTask(value) {
    if(!taskHeard)return;
    const r=taskRows()[taskIndex];
    $('answer-feedback').textContent=value===r.matches?(r.matches?'Верно, фразы совпадают.':'Верно, есть отличия. Посмотрите, какие слова нужно исправить.'):(r.matches?'Фразы совпадают. Послушайте ещё раз.':'Во фразах есть отличия. Посмотрите разбор и послушайте ещё раз.');
    $('answer-yes').disabled=true;$('answer-no').disabled=true;
    $('task-details').hidden=false;$('task-details').open=true;
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
      button.setAttribute('aria-label','Слушать: '+word);button.append(node('span',word));
      button.addEventListener('click',()=>{const controls=buildPlayer('word-player',id,()=>{});if(clips[id])controls.start.click();});
      const mark=node('button',state.words.has(word)?'✓':'○','word-mark');mark.type='button';mark.setAttribute('aria-label','Повторено: '+word);mark.setAttribute('aria-pressed',String(state.words.has(word)));
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
      const read=node('button',state.read.has(r.id)?'✓ Прочитано':'Отметить как прочитанное','read-button');read.type='button';read.setAttribute('aria-pressed',String(state.read.has(r.id)));
      read.addEventListener('click',()=>{if(state.read.has(r.id))state.read.delete(r.id);else state.read.add(r.id);persist();read.textContent=state.read.has(r.id)?'✓ Прочитано':'Отметить как прочитанное';read.setAttribute('aria-pressed',String(state.read.has(r.id)));});
      const audioBox=node('div',undefined,'clip-player');audioBox.id='sentence-player-'+r.id;
      article.append(audioBox,read);container.append(article);
      buildPlayer(audioBox.id,r.id,()=>{});
    });
    $('sentence-count').textContent='Показано '+Math.min(sentenceLimit,filtered.length)+' из '+filtered.length;
    $('more-sentences').hidden=sentenceLimit>=filtered.length;
  }
  const taskRows = () => bank.rows.filter(r=>matchesSource(r,$('task-filter').value));
  function renderTask(reset=false) {
    stopAudio();taskHeard=false;
    const rows=taskRows(); if(reset)taskIndex=0;taskIndex=Math.min(taskIndex,rows.length-1);
    const r=rows[taskIndex];
    $('task-count').textContent='Пример '+(taskIndex+1)+' из '+rows.length;
    $('task-source').textContent='';
    $('task-written').textContent=r.written_text;$('task-audio').textContent=r.audio_text;
    const key=$('task-key');key.replaceChildren(node('h3',r.matches?'Да, совпадает':'Нет, есть отличия'));
    if(r.matches)key.append(node('p','Написанное полностью соответствует исходной фразе. Исправления не нужны.'));
    else r.changes.forEach(c=>key.append(node('p',c.written+' → '+c.audio)));
    $('task-details').open=false;
    $('task-details').hidden=true;$('answer-feedback').textContent='';
    $('answer-yes').disabled=true;$('answer-no').disabled=true;
    buildPlayer('task-player',r.id,()=>{taskHeard=true;$('answer-yes').disabled=false;$('answer-no').disabled=false;});
    $('task-prev').disabled=taskIndex===0;$('task-next').disabled=taskIndex===rows.length-1;
    const jump=$('task-jump');jump.replaceChildren();rows.forEach((row,i)=>{const option=node('option',String(i+1));option.value=String(i);jump.append(option);});jump.value=String(taskIndex);
  }
  function renderSummary() {
    $('summary-name').textContent=state.name;
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
  buildPlayer('demo-player','CITY-006',()=>{$('demo-audio').hidden=false;$('demo-key').hidden=false;});
  $('answer-yes').addEventListener('click',()=>answerTask(true));
  $('answer-no').addEventListener('click',()=>answerTask(false));
  window.addEventListener('pagehide',stopAudio);
  $('task-filter').addEventListener('change',()=>renderTask(true));
  $('task-prev').addEventListener('click',()=>{if(taskIndex>0){taskIndex--;renderTask();}});
  $('task-next').addEventListener('click',()=>{if(taskIndex<taskRows().length-1){taskIndex++;renderTask();}});
  $('task-jump').addEventListener('change',()=>{taskIndex=Number($('task-jump').value);renderTask();});
  $('summary-open').addEventListener('click',()=>{location.hash='summary';});
  window.addEventListener('hashchange',()=>route(true));
  const begin=$('name-form').querySelector('button[type=submit]');
  begin.disabled=false;begin.textContent='Начать подготовку →';
  updateName();renderWords();renderSentences();renderTask();route();
})();
