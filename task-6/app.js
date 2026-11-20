(()=>{'use strict';
 const D=JSON.parse(document.getElementById('lesson-data').textContent),C=Task6Core,by=Object.fromEntries(D.units.map(u=>[u.id,u]));
 const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const storageKey=`rki-task6-v1-lesson${D.lesson}`;
 const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))||f;}catch{return f;}};
 let state=read(storageKey,null),name='',demoToken=0;
 try{name=localStorage.getItem('rki-student-name')||'';}catch{}
 const initial=()=>({version:1,pass:{words:D.pass.word_ids,definitions:D.pass.definition_ids,answers:{},result:null},baseResult:null,mode:'full',history:[],demoComplete:false});
 if(!state||state.version!==1||!Array.isArray(state.pass?.words)||state.pass.words.some(id=>!by[id]))state=initial();
 const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{$('storage-notice').hidden=false;}};
 function title(){return `Урок ${D.lesson}. ${D.topic}`;}
 function showSection(){demoToken++;const section=['words','demo','practice'].includes(location.hash.slice(1))?location.hash.slice(1):'words';
  $('name-gate').hidden=!!name;$('learning').hidden=!name;
  document.querySelectorAll('[data-section]').forEach(el=>el.hidden=el.dataset.section!==section);
  document.querySelectorAll('.steps a').forEach(a=>a.hash==='#'+section?a.setAttribute('aria-current','step'):a.removeAttribute('aria-current'));
  if(section==='demo')$('demo-play').disabled=false;
  if(section==='practice')renderPractice();
 }
 $('student-name').value=name;
 $('name-form').addEventListener('submit',e=>{e.preventDefault();name=$('student-name').value.trim().replace(/\s+/g,' ').slice(0,60);if(!name){$('student-name').setCustomValidity('Введите имя · 请填写姓名');$('student-name').reportValidity();return;}$('student-name').setCustomValidity('');try{localStorage.setItem('rki-student-name',name);}catch{}showSection();});
 $('student-name').addEventListener('input',()=> $('student-name').setCustomValidity(''));
 $('change-name').addEventListener('click',()=>{$('name-gate').hidden=false;$('learning').hidden=true;$('student-name').value=name;$('student-name').focus();demoToken++;});
 $('word-list').innerHTML=D.units.map(u=>`<article class="panel word-card"><h3>${esc(u.word)}</h3><p>${esc(u.definition)}</p><details><summary>Показать перевод · 显示中文</summary><p class="zh" lang="zh">${esc(u.zh)}</p></details><p class="source">${esc(u.exercise)} · с. ${esc(u.printed_pages)}</p></article>`).join('');
 const demo=D.demo;
 $('demo-word').innerHTML=esc(demo.word)+' <span id="demo-slot" class="demo-slot" aria-label="Номер объяснения"></span>';
 $('demo-options').innerHTML=demo.options.map((d,i)=>`<li id="demo-option-${i+1}"><strong>${i+1}.</strong> ${esc(d)}</li>`).join('');
 $('demo-play').addEventListener('click',async()=>{
  const token=++demoToken;const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  $('demo-play').disabled=true;$('demo-feedback').hidden=true;$('demo-next').hidden=true;$('demo-slot').textContent='';document.querySelectorAll('.demo-options li').forEach(x=>x.classList.remove('selected'));
  $('demo-status').textContent='Прочитайте слово и объяснения. · 阅读词语和解释。';
  await wait(1800);if(token!==demoToken)return;
  $(`demo-option-${demo.key}`).classList.add('selected');$('demo-status').textContent='Это объяснение подходит. · 这个解释正确。';
  await wait(1200);if(token!==demoToken)return;
  $('demo-slot').textContent=demo.key;$('demo-status').textContent='Напишите номер рядом со словом. · 在词语旁填写编号。';
  await wait(900);if(token!==demoToken)return;
  $('demo-feedback').innerHTML=`<p>✓ Верно! ${esc(demo.word)} — ${esc(demo.options[demo.key-1])}</p><p class="zh" lang="zh">${esc(demo.zh)}</p>`;$('demo-feedback').hidden=false;$('demo-play').disabled=false;$('demo-play').textContent='Повторить образец · 再看示范';$('demo-next').hidden=false;state.demoComplete=true;save();
 });
 function definitions(){return state.pass.definitions.map((id,i)=>`<div class="definition" data-number="${i+1}"><strong>${i+1}.</strong><div>${esc(by[id].definition)}<span class="used-label">Номер использован · 编号已使用</span></div></div>`).join('');}
 function renderPractice(){
  const pass=state.pass,done=!!pass.result;$('exercise').hidden=done;$('result-wrap').hidden=!done;
  if(done){renderResult();return;}
  $('practice-title').textContent=state.mode==='errors'?'Повторите ошибки · 重做错题':'Подготовка к заданию 6';
  $('practice-count').textContent=state.mode==='errors'?`${pass.words.length} пар · 组配对`:'20 пар · 20 баллов';
  $('word-inputs').innerHTML=pass.words.map((id,i)=>`<div class="word-row"><label for="answer-${id}">${i+1}. ${esc(by[id].word)}</label><input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" autocomplete="off" id="answer-${id}" data-id="${id}" aria-label="${i+1}. ${esc(by[id].word)} — номер объяснения" value="${esc(pass.answers[id]||'')}"></div>`).join('');
  $('definitions-list').innerHTML=definitions();$('dialog-definitions').innerHTML=definitions();updateInputs();
 }
 function updateInputs(){const a=state.pass.answers,max=state.pass.definitions.length;const counts={};Object.values(a).forEach(v=>{if(C.validNumber(v,max))counts[Number(v)]=(counts[Number(v)]||0)+1;});let invalid=false,dups=false;
  $('word-inputs').querySelectorAll('input').forEach(input=>{const v=input.value.trim(),bad=!!v&&!C.validNumber(v,max),dup=!!v&&counts[Number(v)]>1;invalid ||=bad;dups ||=dup;input.setAttribute('aria-invalid',String(bad||dup));});
  const filled=state.pass.words.filter(id=>C.validNumber(a[id],max)).length;$('answer-count').textContent=`Заполнено ${filled} из ${max} · 已填 ${filled}/${max}`;
  $('input-notice').textContent=invalid?`Введите номер от 1 до ${max}. · 请填写1至${max}之间的编号。`:dups?'Каждый номер используйте один раз. · 每个编号只用一次。':'';
  $('check').disabled=invalid||dups;
  document.querySelectorAll('.definition').forEach(el=>el.classList.toggle('used',!!counts[el.dataset.number]));
 }
 $('word-inputs').addEventListener('input',e=>{if(!e.target.matches('input'))return;state.pass.answers[e.target.dataset.id]=e.target.value;save();updateInputs();});
 $('answers-form').addEventListener('submit',e=>{e.preventDefault();updateInputs();if($('check').disabled)return;
  const rows=C.grade(state.pass.words,state.pass.definitions,state.pass.answers),score=rows.filter(x=>x.correct).length;
  state.pass.result={rows,score,total:rows.length,percent:Math.round(score/rows.length*100),name,date:new Date().toISOString()};
  if(state.mode==='full')state.baseResult=state.pass.result;
  save();renderPractice();$('result').focus();$('result').scrollIntoView({block:'start',behavior:'smooth'});
 });
 function renderResult(){const r=state.pass.result,wrong=r.rows.filter(x=>!x.correct);
  $('result').innerHTML=`<p class="eyebrow">${state.mode==='errors'?'Повтор ошибок · 重做错题':'Результат · 成绩'}</p><h2>${esc(title())}</h2><p class="result-name">${esc(r.name)}</p><p class="muted">${new Date(r.date).toLocaleDateString('ru-RU')}</p><div class="stats"><div><strong>${r.score} / ${r.total}</strong><span>Верно · 答对</span></div><div><strong>${r.percent}%</strong><span>Правильных ответов · 正确率</span></div></div><p>Баллы: ${r.score} из ${r.total} · 得分 ${r.score}/${r.total}</p>${state.mode==='errors'&&state.baseResult?`<p class="history-note">Первый результат: ${state.baseResult.score} из 20 · ${state.baseResult.percent}%<br>首次成绩：${state.baseResult.score}/20</p>`:''}`;
  $('review-list').innerHTML=r.rows.map(row=>{const u=by[row.id],selected=by[row.selectedId];return `<article class="panel review-item ${row.correct?'correct':'incorrect'}"><p class="verdict">${row.correct?'✓ Верно · 正确':'✕ Неверно · 不正确'}</p><h3>${esc(u.word)}</h3>${!row.correct?`<p class="your-answer">Ваш ответ · 你的答案: ${selected?esc(selected.definition):'Нет ответа · 未作答'}</p>`:''}<p class="right-answer">Правильно · 正确答案: ${row.expected}. ${esc(u.word)} — ${esc(u.definition)}</p><p class="zh" lang="zh">${esc(u.zh)}</p></article>`;}).join('');
  $('retry-errors').hidden=!wrong.length;
 }
 $('retry-errors').addEventListener('click',()=>{const ids=state.pass.result.rows.filter(x=>!x.correct).map(x=>x.id);if(!ids.length)return;state.history.push(state.pass.result);state.pass=C.createPass(ids);state.mode='errors';save();renderPractice();$('practice-title').scrollIntoView();});
 $('retry-all').addEventListener('click',()=>{state.history.push(state.pass.result);state.pass=C.createPass(D.units.map(u=>u.id),state.pass);state.mode='full';save();renderPractice();$('practice-title').scrollIntoView();});
 $('open-definitions').addEventListener('click',()=> $('definitions-dialog').showModal());
 $('close-definitions').addEventListener('click',()=> $('definitions-dialog').close());
 window.addEventListener('hashchange',showSection);window.addEventListener('pagehide',()=>{demoToken++;});
 showSection();
})();
