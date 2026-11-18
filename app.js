(() => {
  'use strict';
  const bank = window.CITY_BANK;
  const $ = id => document.getElementById(id);
  const storageKey = 'rki-city-exam-preview-v1';
  let saved;
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { saved = {}; }
  if (!saved || typeof saved !== 'object') saved = {};
  const state = {
    name: typeof saved.name === 'string' ? saved.name.slice(0, 60) : '',
    words: new Set(Array.isArray(saved.words) ? saved.words.filter(w => bank.words.includes(w)) : []),
    read: new Set(Array.isArray(saved.read) ? saved.read.filter(id => bank.rows.some(r => r.id === id)) : [])
  };
  let sentenceLimit = 6;
  let taskIndex = 0;
  const persist = () => {
    try { localStorage.setItem(storageKey, JSON.stringify({name:state.name,words:[...state.words],read:[...state.read]})); }
    catch { /* The page remains usable when browser storage is unavailable. */ }
  };
  function node(tag, text, className) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
  }
  function matchesSource(row, filter) {
    return filter === 'all' || (filter === 'ЭМ' ? row.sources.includes('ЭМ') : row.group === filter);
  }
  function updateName() {
    $('student-name').textContent = state.name;
    $('name-gate').hidden = Boolean(state.name);
    $('learning').hidden = !state.name;
    $('name-input').value = state.name;
  }
  function route(focus = false) {
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
      const button = node('button',undefined,'word');button.type='button';
      const selected=state.words.has(word); button.setAttribute('aria-pressed',String(selected));
      button.setAttribute('aria-label',word+' — '+(selected?'отмечено как повторённое':'отметить повторение'));
      button.append(node('span',word));const check=node('i',selected?'✓':'');check.setAttribute('aria-hidden','true');button.append(check);
      button.addEventListener('click',()=>{ if(state.words.has(word))state.words.delete(word);else state.words.add(word);persist();renderWords(); });
      container.append(button);
    });
    $('word-count').textContent = 'Повторено '+state.words.size+' из '+bank.words.length;
    $('word-empty').hidden = filtered.length !== 0;
  }
  function renderSentences() {
    const filtered=bank.rows.filter(r=>matchesSource(r,$('sentence-filter').value));
    const container=$('sentences-list');container.replaceChildren();
    filtered.slice(0,sentenceLimit).forEach(r=>{
      const article=node('article',undefined,'source-sentence');
      article.append(node('span',r.sources,'source-tag'),node('p',r.audio_text));
      const read=node('button',state.read.has(r.id)?'✓ Прочитано':'Отметить как прочитанное','read-button');read.type='button';read.setAttribute('aria-pressed',String(state.read.has(r.id)));
      read.addEventListener('click',()=>{if(state.read.has(r.id))state.read.delete(r.id);else state.read.add(r.id);persist();read.textContent=state.read.has(r.id)?'✓ Прочитано':'Отметить как прочитанное';read.setAttribute('aria-pressed',String(state.read.has(r.id)));});
      article.append(read);container.append(article);
    });
    $('sentence-count').textContent='Показано '+Math.min(sentenceLimit,filtered.length)+' из '+filtered.length;
    $('more-sentences').hidden=sentenceLimit>=filtered.length;
  }
  const taskRows = () => bank.rows.filter(r=>matchesSource(r,$('task-filter').value));
  function renderTask(reset=false) {
    const rows=taskRows(); if(reset)taskIndex=0;taskIndex=Math.min(taskIndex,rows.length-1);
    const r=rows[taskIndex];
    $('task-count').textContent='Пример '+(taskIndex+1)+' из '+rows.length;
    $('task-source').textContent=r.sources;$('task-id').textContent=r.id;
    $('task-written').textContent=r.written_text;$('task-audio').textContent=r.audio_text;
    const key=$('task-key');key.replaceChildren(node('h3',r.matches?'Да, совпадает':'Нет, есть отличия'));
    if(r.matches)key.append(node('p','Написанное полностью соответствует исходной фразе. Исправления не нужны.'));
    else r.changes.forEach(c=>key.append(node('p',c.written+' → '+c.audio)));
    $('task-details').open=false;
    $('task-prev').disabled=taskIndex===0;$('task-next').disabled=taskIndex===rows.length-1;
    const jump=$('task-jump');jump.replaceChildren();rows.forEach((row,i)=>{const option=node('option',String(i+1));option.value=String(i);jump.append(option);});jump.value=String(taskIndex);
  }
  function renderSummary() {
    $('summary-name').textContent=state.name;
    $('summary-words').textContent=state.words.size+' / '+bank.words.length;
    $('summary-sentences').textContent=state.read.size+' / '+bank.rows.length;
    $('summary-date').textContent='Дата просмотра: '+new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date());
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
  $('demo-reveal').addEventListener('click',()=>{$('demo-audio').hidden=false;$('demo-reveal').hidden=true;});
  $('demo-explain').addEventListener('click',()=>{$('demo-key').hidden=false;$('demo-explain').hidden=true;});
  $('task-filter').addEventListener('change',()=>renderTask(true));
  $('task-prev').addEventListener('click',()=>{if(taskIndex>0){taskIndex--;renderTask();}});
  $('task-next').addEventListener('click',()=>{if(taskIndex<taskRows().length-1){taskIndex++;renderTask();}});
  $('task-jump').addEventListener('change',()=>{taskIndex=Number($('task-jump').value);renderTask();});
  $('summary-open').addEventListener('click',()=>{location.hash='summary';});
  window.addEventListener('hashchange',()=>route(true));
  updateName();renderWords();renderSentences();renderTask();route();
})();
