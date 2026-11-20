/* Shared navigation for every task. See ЕДИНАЯ_НАВИГАЦИЯ.md. */
(() => {
  'use strict';
  const config = document.currentScript.dataset;
  const root = config.root || './';
  const task = Number(config.task || 0);
  const lessons = [
    {id:9, slug:'v-gorode', title:'В городе', zh:'在城市里'},
    {id:10, slug:'u-vracha', title:'У врача', zh:'看医生'},
    {id:11, slug:'v-magazine', title:'В магазине', zh:'在商店'},
    {id:12, slug:'vneshnost', title:'Внешность и характер', zh:'外貌与性格'}
  ];
  const requested = task === 2 ? Number(new URLSearchParams(location.search).get('lesson')) : Number(config.lesson);
  let lesson = lessons.find(x => x.id === requested) || lessons[0];
  const profileKey = 'rki-student-name';
  const task1Keys = ['rki-city-exam-preview-v1','rki-doctor-exam-v1','rki-shop-exam-v1','rki-look-exam-v1'];
  const currentKey = task === 1 ? task1Keys[lesson.id-9] : task === 2 ? 'rki-task2-v1' : task === 3 ? `rki-task3-r3-2026-11-20-lesson${lesson.id}` : task === 4 ? `rki-task4-r2-2026-11-20-lesson${lesson.id}` : task === 5 ? `rki-task5-v1-lesson${lesson.id}` : null;
  const clean = s => typeof s === 'string' ? s.trim().replace(/\s+/g,' ').slice(0,60) : '';
  const read = key => {try {return JSON.parse(localStorage.getItem(key)||'{}') || {};} catch {return {};}};
  let name = '';
  try {
    name = clean(localStorage.getItem(profileKey)) || clean(currentKey && read(currentKey).name);
    if(!name) name = [...task1Keys,'rki-task2-v1',...lessons.map(l=>`rki-task3-r3-2026-11-20-lesson${l.id}`)].map(k=>clean(read(k).name)).find(Boolean) || clean(localStorage.getItem('rki-task3-student'));
    if(name) {
      localStorage.setItem(profileKey,name);
      if(currentKey) {
        const state=read(currentKey);state.name=name;
        if(task===3)state.answers ||= {};
        localStorage.setItem(currentKey,JSON.stringify(state));
      }
    }
  } catch { /* Existing name gates still work without storage. */ }
  const href = (t,l,keepSection=false) => {
    const item=lessons.find(x=>x.id===l);
    const section=location.hash.slice(1);
    if(t===6) return root+'task-6/'+item.slug+'/index.html#'+(keepSection&&['words','demo','practice'].includes(section)?section:'words');
    if(t===1) return root+(l===9?'prepare.html':item.slug+'/index.html')+'#'+(keepSection&&['words','sentences','format','task'].includes(section)?section:'words');
    if(t===2) return root+'task-2/index.html?lesson='+l+'#'+(keepSection&&['words','sentences','demo','practice'].includes(section)?section:'words');
    return root+'task-'+t+'/'+item.slug+'/index.html';
  };
  const anchor = t => t===1?'task-title':'task-'+t;
  function mount() {
    const header=document.getElementById('rki-header');
    const navigation=document.getElementById('rki-navigation');
    if(!header || !navigation)return;
    header.innerHTML=`<a class="rki-brand" href="${root}index.html">Русский на слух</a><div class="rki-header-actions"><a href="${root}index.html">На главную <span lang="zh">· 首页</span></a><button id="rki-name" type="button"></button></div>`;
    navigation.innerHTML=`<div class="rki-nav-row"><p class="rki-nav-label">Задание <span lang="zh">· 题型</span></p><nav class="rki-tasks" aria-label="Задания экзамена">${[1,2,3,4,5,6].map(t=>`<a data-task="${t}" href="${task?href(t,lesson.id):'#'+anchor(t)}" ${t===task?'aria-current="page"':''}>Задание ${t}<span lang="zh">题型 ${t}</span></a>`).join('')}</nav></div>${task?`<div class="rki-nav-row"><p class="rki-nav-label">Урок <span lang="zh">· 课程</span></p><nav class="rki-lessons" aria-label="Уроки задания ${task}">${lessons.map(l=>`<a data-lesson="${l.id}" href="${href(task,l.id,true)}" ${l.id===lesson.id?'aria-current="page"':''}><span>Урок ${l.id}</span><strong>${l.title}</strong><span lang="zh">${l.zh}</span></a>`).join('')}</nav></div><a class="rki-all-lessons" href="${root}index.html#${anchor(task)}">Все уроки задания ${task} <span lang="zh">· 本题型全部课程</span></a>`:''}`;
    const button=document.getElementById('rki-name');
    const updateName=()=>{button.textContent=name?name+' · Изменить имя · 修改姓名':'Ввести имя · 填写姓名';button.hidden=!task;};
    updateName();
    const begin=document.querySelector('#name-form button[type="submit"],#name-form button:not([type])');
    if(begin&&!begin.disabled)begin.textContent='Начать подготовку · 开始';
    button.addEventListener('click',()=>{
      if(!task){location.href=href(1,9);return;}
      const legacy=document.getElementById(task===1?'rename':'change-name');
      if(legacy)legacy.click();
      const gate=document.getElementById('name-gate');
      if(gate)gate.scrollIntoView({block:'center',behavior:'smooth'});
      document.getElementById(task===1?'name-input':'student-name')?.focus();
    });
    document.getElementById('name-form')?.addEventListener('submit',e=>{
      const input=document.getElementById(task===1?'name-input':'student-name');
      if(!e.target.checkValidity()||!clean(input.value))return;
      name=clean(input.value);input.value=name;
      try{localStorage.setItem(profileKey,name);}catch{}
      updateName();
    },true);
    function refreshLesson() {
      if(task!==2)return;
      lesson=lessons.find(x=>x.id===Number(new URLSearchParams(location.search).get('lesson')))||lessons[0];
      navigation.querySelectorAll('[data-task]').forEach(a=>a.href=href(Number(a.dataset.task),lesson.id));
      navigation.querySelectorAll('[data-lesson]').forEach(a=>{
        const n=Number(a.dataset.lesson);a.href=href(task,n,true);
        if(n===lesson.id)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
      });
      const title=document.querySelector('main > h1');if(title)title.textContent=`Урок ${lesson.id}. ${lesson.title}`;
      const label=document.querySelector('main > .eyebrow');if(label)label.textContent='Подготовка к заданию 2 · 题型二准备';
    }
    if(task===2){
      refreshLesson();
      // Reuse the existing in-page lesson switch: do not download all audio again.
      navigation.addEventListener('click',e=>{
        const a=e.target.closest('a[data-lesson]');
        if(!a||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
        const select=document.getElementById('lesson-select');if(!select)return;
        e.preventDefault();if(Number(a.dataset.lesson)===lesson.id)return;
        const target=a.href;select.value=a.dataset.lesson;
        select.dispatchEvent(new Event('change',{bubbles:true}));
        history.replaceState(null,'',target);
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      window.addEventListener('popstate',refreshLesson);
    }
    window.addEventListener('hashchange',()=>{
      if(task)navigation.querySelectorAll('[data-lesson]').forEach(a=>a.href=href(task,Number(a.dataset.lesson),true));
    });
  }
  if(task===4)document.addEventListener('rki-task4-ready',mount,{once:true});else if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
