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
