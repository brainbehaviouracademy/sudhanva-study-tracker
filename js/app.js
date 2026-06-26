const STORAGE_KEY = 'bba_g9_cbse_study_tracker_v1';
const COLLAPSE_KEY = 'bba_g9_cbse_study_tracker_collapse_v1';
const NAME_KEY = 'bba_g9_cbse_study_tracker_name_v1';
const FILTER_KEY = 'bba_g9_cbse_study_tracker_filter_v1';

let syllabus = null;
let collapsedState = {};
let activeSubject = 'Science';
let idCounter = 1;
let studentName = '';
let filterImportantOnly = false;

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){ syllabus = JSON.parse(raw); }
  }catch(e){ syllabus = null; }
  if(!syllabus){ syllabus = JSON.parse(JSON.stringify(SYLLABUS_SEED)); }
  try{
    const c = localStorage.getItem(COLLAPSE_KEY);
    collapsedState = c ? JSON.parse(c) : {};
  }catch(e){ collapsedState = {}; }
  try{
    studentName = localStorage.getItem(NAME_KEY) || '';
  }catch(e){ studentName = ''; }
  try{
    filterImportantOnly = localStorage.getItem(FILTER_KEY) === '1';
  }catch(e){ filterImportantOnly = false; }
}

function saveState(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(syllabus)); }
  catch(e){ console.warn('Could not save progress (storage unavailable):', e); }
}
function saveCollapse(){
  try{ localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsedState)); }
  catch(e){ console.warn('Could not save collapse state (storage unavailable):', e); }
}
function saveStudentName(){
  try{ localStorage.setItem(NAME_KEY, studentName); }
  catch(e){ console.warn('Could not save student name (storage unavailable):', e); }
}
function saveFilter(){
  try{ localStorage.setItem(FILTER_KEY, filterImportantOnly ? '1' : '0'); }
  catch(e){ console.warn('Could not save filter state (storage unavailable):', e); }
}

function genId(prefix){
  return prefix + '-x' + (Date.now().toString(36)) + (idCounter++);
}

/* ---------- leaf collection & progress ---------- */

// returns array of {study,revise,test} leaf trackers for a topic (subtopics if present, else itself)
function topicLeaves(topic){
  if(topic.subtopics && topic.subtopics.length){
    return topic.subtopics;
  }
  return [topic];
}
// leaves for a chapter: union of topic leaves, or chapter itself if no topics
function chapterLeaves(chapter){
  if(chapter.topics && chapter.topics.length){
    let out = [];
    chapter.topics.forEach(t => out = out.concat(topicLeaves(t)));
    return out;
  }
  return [chapter];
}
function groupLeaves(group){
  let out = [];
  group.chapters.forEach(c => out = out.concat(chapterLeaves(c)));
  return out;
}
function subjectLeaves(subjectKey){
  let out = [];
  syllabus[subjectKey].forEach(g => out = out.concat(groupLeaves(g)));
  return out;
}

function ensureFlags(leaf){
  if(typeof leaf.study !== 'boolean') leaf.study = false;
  if(typeof leaf.revise !== 'boolean') leaf.revise = false;
  if(typeof leaf.test !== 'boolean') leaf.test = false;
  if(typeof leaf.important !== 'boolean') leaf.important = false;
}

function pctFromLeaves(leaves){
  if(!leaves.length) return 0;
  let total = leaves.length * 3;
  let done = 0;
  leaves.forEach(l=>{
    ensureFlags(l);
    if(l.study) done++;
    if(l.revise) done++;
    if(l.test) done++;
  });
  return Math.round((done/total)*100);
}

function metricPct(leaves, field){
  if(!leaves.length) return 0;
  let done = 0;
  leaves.forEach(l=>{ ensureFlags(l); if(l[field]) done++; });
  return Math.round((done/leaves.length)*100);
}

function importantStats(leaves){
  let important = [];
  leaves.forEach(l=>{ ensureFlags(l); if(l.important) important.push(l); });
  const total = important.length;
  const done = important.filter(l=>l.study&&l.revise&&l.test).length;
  return {total, done, pct: total ? Math.round((done/total)*100) : 0};
}

/* ---------- importance-based visibility (for "important only" filter) ---------- */

function subVisible(sub){
  if(!filterImportantOnly) return true;
  ensureFlags(sub);
  return !!sub.important;
}
function topicVisible(topic){
  if(!filterImportantOnly) return true;
  ensureFlags(topic);
  if(topic.subtopics && topic.subtopics.length){
    return !!topic.important || topic.subtopics.some(s=>{ ensureFlags(s); return !!s.important; });
  }
  return !!topic.important;
}
function chapterVisible(chapter){
  if(!filterImportantOnly) return true;
  if(chapter.topics && chapter.topics.length){
    return chapter.topics.some(t=>topicVisible(t));
  }
  ensureFlags(chapter);
  return !!chapter.important;
}

/* ---------- rendering ---------- */

function render(){
  renderOverview();
  renderTabs();
  renderToolbarVisibility();
  renderTree();
}

function renderOverview(){
  let allLeaves = [];
  ['Science','Social','Math'].forEach(s => allLeaves = allLeaves.concat(subjectLeaves(s)));
  const pct = pctFromLeaves(allLeaves);
  document.getElementById('overallPct').textContent = pct + '%';
  document.getElementById('overallBar').style.width = pct + '%';
  document.getElementById('overviewHeading').textContent = studentName
    ? `${studentName}'s Syllabus Progress`
    : 'Overall Syllabus Progress';

  const grid = document.getElementById('subjectProgressGrid');
  grid.innerHTML = '';
  const labels = {Science:'Science', Social:'Social Science', Math:'Maths'};
  ['Science','Social','Math'].forEach(s=>{
    const leaves = subjectLeaves(s);
    const p = pctFromLeaves(leaves);
    const div = document.createElement('div');
    div.className = 'sp-card';
    div.innerHTML = `
      <div class="sp-head"><span>${labels[s]}</span><span>${p}%</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${p}%"></div></div>
      <div class="meta">${leaves.length} topics tracked</div>
    `;
    grid.appendChild(div);
  });
}

function renderTabs(){
  const tabs = document.getElementById('subjectTabs');
  tabs.innerHTML = '';
  const labels = {Science:'Science', Social:'Social Science', Math:'Maths', Dashboard:'📊 Progress Dashboard'};
  ['Science','Social','Math','Dashboard'].forEach(s=>{
    const b = document.createElement('button');
    b.className = 'tab-btn' + (s===activeSubject ? ' active' : '');
    b.textContent = labels[s];
    b.onclick = ()=>{ activeSubject = s; render(); };
    tabs.appendChild(b);
  });
}

function renderToolbarVisibility(){
  const isDashboard = activeSubject === 'Dashboard';
  document.getElementById('importantFilterWrap').style.display = isDashboard ? 'none' : 'flex';
  document.getElementById('expandAllBtn').style.display = isDashboard ? 'none' : 'inline-block';
  document.getElementById('collapseAllBtn').style.display = isDashboard ? 'none' : 'inline-block';
  document.getElementById('addChapterBtn').style.display = isDashboard ? 'none' : 'inline-block';
  document.getElementById('toolbarLeftText').textContent = isDashboard
    ? 'A graphical breakdown of progress across all subjects.'
    : 'Click a chapter to expand/collapse. Tick Study / Revise / Test as you complete each topic.';
  const filterWrap = document.getElementById('importantFilterWrap');
  filterWrap.classList.toggle('active', filterImportantOnly);
  document.getElementById('importantFilterToggle').checked = filterImportantOnly;
}

function isCollapsed(id){
  return !!collapsedState[id];
}
function toggleCollapse(id){
  collapsedState[id] = !collapsedState[id];
  saveCollapse();
  renderTree();
}

function renderTree(){
  const root = document.getElementById('treeRoot');
  root.innerHTML = '';

  if(activeSubject === 'Dashboard'){
    root.appendChild(renderDashboard());
    return;
  }

  const groups = syllabus[activeSubject];
  let anyVisible = false;

  groups.forEach(group=>{
    const visibleChapters = group.chapters.filter(chapterVisible);
    if(filterImportantOnly && visibleChapters.length === 0) return;

    const groupWrap = document.createElement('div');
    groupWrap.className = 'group-block';

    if(group.name){
      const gt = document.createElement('div');
      gt.className = 'group-title';
      gt.textContent = group.name;
      groupWrap.appendChild(gt);
    }

    visibleChapters.forEach(chapter=>{
      groupWrap.appendChild(renderChapter(chapter, group));
      anyVisible = true;
    });

    root.appendChild(groupWrap);
  });

  if(filterImportantOnly && !anyVisible){
    const msg = document.createElement('div');
    msg.className = 'empty-filter-msg';
    msg.textContent = '⭐ No topics marked Important in this subject yet. Click the star icon next to a topic to flag it.';
    root.appendChild(msg);
  }
}

function renderChapter(chapter, group){
  const leaves = chapterLeaves(chapter);
  const pct = pctFromLeaves(leaves);
  const collapsed = isCollapsed(chapter.id);

  const card = document.createElement('div');
  card.className = 'chapter-card' + (collapsed ? ' collapsed' : '');

  const head = document.createElement('div');
  head.className = 'chapter-head';
  head.innerHTML = `
    <span class="chev">&#9660;</span>
    <span class="name editable-name" contenteditable="false" title="Double-click to rename" data-type="chapter" data-id="${chapter.id}">${escapeHtml(chapter.name)}</span>
    <span class="mini-pct">${pct}%</span>
    <span class="row-actions">
      <button class="icon-btn" data-action="add-topic" title="Add topic">＋ Topic</button>
      <button class="icon-btn" data-action="delete-chapter" title="Delete chapter">🗑</button>
    </span>
  `;
  const nameEl = head.querySelector('.name');
  nameEl.addEventListener('dblclick', e=>{
    e.stopPropagation();
    nameEl.contentEditable = 'true';
    nameEl.focus();
    document.execCommand('selectAll', false, null);
  });
  nameEl.addEventListener('click', e=>{
    if(nameEl.isContentEditable) e.stopPropagation();
  });
  nameEl.addEventListener('blur', e=>{
    chapter.name = e.target.textContent.trim() || chapter.name;
    nameEl.contentEditable = 'false';
    saveState();
  });
  nameEl.addEventListener('keydown', e=>{
    if(e.key === 'Enter'){ e.preventDefault(); nameEl.blur(); }
  });
  head.addEventListener('click', (e)=>{
    if(e.target.closest('.row-actions')) return;
    if(nameEl.isContentEditable) return;
    toggleCollapse(chapter.id);
  });
  head.querySelector('[data-action="add-topic"]').addEventListener('click', (e)=>{
    e.stopPropagation();
    openTopicModal({mode:'add-topic', chapter});
  });
  head.querySelector('[data-action="delete-chapter"]').addEventListener('click', (e)=>{
    e.stopPropagation();
    if(confirm(`Delete chapter "${chapter.name}" and all its topics?`)){
      const idx = group.chapters.indexOf(chapter);
      group.chapters.splice(idx,1);
      saveState();
      render();
    }
  });

  card.appendChild(head);

  if(!collapsed){
    const body = document.createElement('div');
    if(!chapter.topics || chapter.topics.length === 0){
      ensureFlags(chapter);
      const table = buildTopicTable();
      table.querySelector('tbody').appendChild(buildLeafRow(chapter, chapter.name, null, ()=>{
        // deleting the only leaf when chapter has no topics: not deletable here, delete via chapter delete
      }, true));
      body.appendChild(table);
      body.appendChild(buildAddRowForm(chapter, null));
    } else {
      const table = buildTopicTable();
      const tbody = table.querySelector('tbody');
      const visibleTopics = chapter.topics.filter(topicVisible);
      visibleTopics.forEach(topic=>{
        if(topic.subtopics && topic.subtopics.length){
          ensureFlags(topic);
          // header-only row for topic name (no own checkboxes), then subtopic leaf rows
          const trh = document.createElement('tr');
          trh.className = 'topic-row' + (topic.important ? ' is-important' : '');
          trh.innerHTML = `<td class="name-cell" colspan="3" style="font-weight:600;color:var(--bba-blue);">${escapeHtml(topic.name)}</td>
            <td class="chk"></td><td class="chk"></td><td class="chk"></td>
            <td class="act">
              <button class="star-btn${topic.important ? ' is-important' : ''}" data-action="star-topic" title="Mark topic important">${topic.important ? '★' : '☆'}</button>
              <button class="icon-btn" data-action="add-sub" title="Add subtopic">＋</button>
              <button class="icon-btn" data-action="delete-topic" title="Delete topic">🗑</button>
            </td>`;
          trh.querySelector('[data-action="star-topic"]').addEventListener('click', ()=>{
            topic.important = !topic.important;
            saveState(); render();
          });
          trh.querySelector('[data-action="add-sub"]').addEventListener('click', ()=>{
            openTopicModal({mode:'add-subtopic', chapter, topic});
          });
          trh.querySelector('[data-action="delete-topic"]').addEventListener('click', ()=>{
            if(confirm(`Delete topic "${topic.name}" and its subtopics?`)){
              const idx = chapter.topics.indexOf(topic);
              chapter.topics.splice(idx,1);
              saveState(); render();
            }
          });
          tbody.appendChild(trh);
          const visibleSubs = topic.subtopics.filter(subVisible);
          visibleSubs.forEach(sub=>{
            ensureFlags(sub);
            tbody.appendChild(buildLeafRow(sub, sub.name, ()=>{
              const idx = topic.subtopics.indexOf(sub);
              topic.subtopics.splice(idx,1);
              saveState(); render();
            }, false, true));
          });
        } else {
          ensureFlags(topic);
          tbody.appendChild(buildLeafRow(topic, topic.name, ()=>{
            const idx = chapter.topics.indexOf(topic);
            chapter.topics.splice(idx,1);
            saveState(); render();
          }, false, false, chapter, topic));
        }
      });
      body.appendChild(table);
      body.appendChild(buildAddRowForm(chapter, null));
    }
    card.appendChild(body);
  }

  return card;
}

function buildTopicTable(){
  const table = document.createElement('table');
  table.className = 'topic-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Topic</th>
        <th class="chk">Study</th>
        <th class="chk">Revise</th>
        <th class="chk">Test</th>
        <th class="act">Actions</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  return table;
}

function buildLeafRow(leafObj, name, onDelete, isChapterLevel, isSub, parentTopicForEdit){
  ensureFlags(leafObj);
  const tr = document.createElement('tr');
  tr.className = 'topic-row' + (isSub ? ' is-sub' : '') + ((leafObj.study&&leafObj.revise&&leafObj.test) ? ' done-all' : '') + (leafObj.important ? ' is-important' : '');
  const nameTd = document.createElement('td');
  nameTd.className = 'name-cell';
  nameTd.contentEditable = !isChapterLevel; // chapter-level name edited via header
  nameTd.textContent = name;
  if(!isChapterLevel){
    nameTd.classList.add('editable-name');
    nameTd.addEventListener('blur', ()=>{
      leafObj.name = nameTd.textContent.trim() || leafObj.name;
      saveState();
    });
  }
  tr.appendChild(nameTd);

  ['study','revise','test'].forEach(field=>{
    const td = document.createElement('td');
    td.className = 'chk';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!leafObj[field];
    cb.addEventListener('change', ()=>{
      leafObj[field] = cb.checked;
      saveState();
      renderOverview();
      // update mini pct + done-all styling without full re-render for snappiness
      renderTree();
    });
    td.appendChild(cb);
    tr.appendChild(td);
  });

  const actTd = document.createElement('td');
  actTd.className = 'act';
  const starBtn = document.createElement('button');
  starBtn.className = 'star-btn' + (leafObj.important ? ' is-important' : '');
  starBtn.textContent = leafObj.important ? '★' : '☆';
  starBtn.title = 'Mark important';
  starBtn.addEventListener('click', ()=>{
    leafObj.important = !leafObj.important;
    saveState();
    render();
  });
  actTd.appendChild(starBtn);
  if(!isChapterLevel){
    const delBtn = document.createElement('button');
    delBtn.className = 'icon-btn';
    delBtn.textContent = '🗑';
    delBtn.title = 'Delete';
    delBtn.addEventListener('click', ()=>{
      if(confirm(`Delete "${name}"?`) && onDelete) onDelete();
    });
    actTd.appendChild(delBtn);
  }
  tr.appendChild(actTd);

  return tr;
}

function buildAddRowForm(chapter, topic){
  const div = document.createElement('div');
  div.className = 'add-row-form';
  div.innerHTML = `
    <input type="text" placeholder="Add a new topic to this chapter..." />
    <button class="action">Add</button>
  `;
  const input = div.querySelector('input');
  const btn = div.querySelector('button');
  const doAdd = ()=>{
    const val = input.value.trim();
    if(!val) return;
    if(!chapter.topics) chapter.topics = [];
    chapter.topics.push({id: genId(chapter.id+'-t'), name: val, subtopics: [], study:false, revise:false, test:false});
    saveState();
    render();
  };
  btn.addEventListener('click', doAdd);
  input.addEventListener('keydown', e=>{ if(e.key==='Enter') doAdd(); });
  return div;
}

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/* ---------- dashboard ---------- */

function buildRing(pct, size, stroke){
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct/100) * c;
  const wrap = document.createElement('div');
  wrap.className = 'ring-wrap';
  wrap.style.width = size + 'px';
  wrap.style.height = size + 'px';
  wrap.innerHTML = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#e9ecf5" stroke-width="${stroke}"></circle>
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#e43f5a" stroke-width="${stroke}"
        stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${offset}"></circle>
    </svg>
    <div class="ring-center">
      <div class="big">${pct}%</div>
      <div class="small">Complete</div>
    </div>
  `;
  return wrap;
}

function buildMetricBars(leaves){
  const wrap = document.createElement('div');
  wrap.className = 'metric-bars';
  [['study','Study'],['revise','Revise'],['test','Test']].forEach(([field,label])=>{
    const p = metricPct(leaves, field);
    const row = document.createElement('div');
    row.className = 'metric-bar-row';
    row.innerHTML = `
      <span class="m-label">${label}</span>
      <div class="bar-track"><div class="bar-fill ${field}" style="width:${p}%"></div></div>
      <span class="m-pct">${p}%</span>
    `;
    wrap.appendChild(row);
  });
  return wrap;
}

function collectChapterStats(subjectKey){
  const labels = {Science:'Science', Social:'Social Science', Math:'Maths'};
  const out = [];
  syllabus[subjectKey].forEach(group=>{
    group.chapters.forEach(chapter=>{
      const leaves = chapterLeaves(chapter);
      const pct = pctFromLeaves(leaves);
      out.push({
        name: chapter.name,
        subjectLabel: labels[subjectKey] + (group.name ? ` · ${group.name}` : ''),
        pct
      });
    });
  });
  return out;
}

function renderDashboard(){
  const wrap = document.createElement('div');

  const greet = document.createElement('p');
  greet.className = 'dash-greeting';
  greet.textContent = studentName
    ? `Here's how ${studentName} is progressing across the Grade 9 CBSE syllabus.`
    : `Here's a graphical breakdown of progress across the Grade 9 CBSE syllabus.`;
  wrap.appendChild(greet);

  let allLeaves = [];
  ['Science','Social','Math'].forEach(s => allLeaves = allLeaves.concat(subjectLeaves(s)));
  const overallPct = pctFromLeaves(allLeaves);

  const grid1 = document.createElement('div');
  grid1.className = 'dashboard-grid';

  // overall ring card
  const ringCard = document.createElement('div');
  ringCard.className = 'dash-card ring-card';
  ringCard.innerHTML = `<h3>Overall Completion</h3>`;
  ringCard.appendChild(buildRing(overallPct, 170, 16));
  const legend = document.createElement('div');
  legend.className = 'ring-legend';
  legend.innerHTML = `
    <span><span class="dot" style="background:var(--bba-green)"></span>Study ${metricPct(allLeaves,'study')}%</span>
    <span><span class="dot" style="background:var(--bba-gold)"></span>Revise ${metricPct(allLeaves,'revise')}%</span>
    <span><span class="dot" style="background:var(--bba-accent)"></span>Test ${metricPct(allLeaves,'test')}%</span>
  `;
  ringCard.appendChild(legend);
  grid1.appendChild(ringCard);

  // per-subject metric bars card
  const subjCard = document.createElement('div');
  subjCard.className = 'dash-card';
  subjCard.innerHTML = `<h3>Study / Revise / Test by Subject</h3>`;
  const labels = {Science:'Science', Social:'Social Science', Math:'Maths'};
  ['Science','Social','Math'].forEach(s=>{
    const leaves = subjectLeaves(s);
    const block = document.createElement('div');
    block.className = 'subject-bar-block';
    block.innerHTML = `<div class="sb-label"><span>${labels[s]}</span><span>${pctFromLeaves(leaves)}%</span></div>`;
    block.appendChild(buildMetricBars(leaves));
    subjCard.appendChild(block);
  });
  grid1.appendChild(subjCard);

  // important topics card
  const impStats = importantStats(allLeaves);
  const impCard = document.createElement('div');
  impCard.className = 'dash-card';
  impCard.innerHTML = `<h3>⭐ Important Topics</h3>`;
  const impWrap = document.createElement('div');
  impWrap.className = 'important-stats';
  impWrap.innerHTML = `
    <div class="imp-stat"><div class="num">${impStats.total}</div><div class="lab">Marked Important</div></div>
    <div class="imp-stat"><div class="num">${impStats.done}</div><div class="lab">Fully Completed</div></div>
    <div class="imp-stat"><div class="num">${impStats.pct}%</div><div class="lab">Important Progress</div></div>
  `;
  impCard.appendChild(impWrap);
  if(impStats.total === 0){
    const hint = document.createElement('p');
    hint.style.cssText = 'font-size:.8rem;color:var(--muted);margin-top:12px;';
    hint.textContent = 'Tip: click the ☆ star icon next to any topic to mark it important and track it here.';
    impCard.appendChild(hint);
  }
  grid1.appendChild(impCard);

  wrap.appendChild(grid1);

  // focus areas: lowest-progress chapters across all subjects
  let allChapterStats = [];
  ['Science','Social','Math'].forEach(s => allChapterStats = allChapterStats.concat(collectChapterStats(s)));
  allChapterStats.sort((a,b)=>a.pct-b.pct);
  const focusList = allChapterStats.filter(c=>c.pct < 100).slice(0, 8);

  const focusCard = document.createElement('div');
  focusCard.className = 'dash-card';
  focusCard.style.marginTop = '16px';
  focusCard.innerHTML = `<h3>📌 Chapters Needing the Most Attention</h3>`;
  const fl = document.createElement('div');
  fl.className = 'focus-list';
  if(focusList.length === 0){
    fl.innerHTML = `<p style="font-size:.85rem;color:var(--muted);">All chapters are fully complete. Great work!</p>`;
  } else {
    focusList.forEach(c=>{
      const item = document.createElement('div');
      item.className = 'focus-item';
      item.innerHTML = `
        <div class="fi-top"><span class="fi-name">${escapeHtml(c.name)}</span><span class="fi-pct">${c.pct}%</span></div>
        <div class="fi-sub">${escapeHtml(c.subjectLabel)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${c.pct}%"></div></div>
      `;
      fl.appendChild(item);
    });
  }
  focusCard.appendChild(fl);
  wrap.appendChild(focusCard);

  return wrap;
}

/* ---------- modals ---------- */

let topicModalCtx = null;
function openTopicModal(ctx){
  topicModalCtx = ctx;
  document.getElementById('topicModalTitle').textContent =
    ctx.mode === 'add-subtopic' ? 'Add Subtopic' : 'Add Topic';
  document.getElementById('topicModalInput').value = '';
  document.getElementById('topicModal').classList.add('show');
  document.getElementById('topicModalInput').focus();
}
function closeTopicModal(){
  document.getElementById('topicModal').classList.remove('show');
  topicModalCtx = null;
}
document.getElementById('topicModalCancel').onclick = closeTopicModal;
document.getElementById('topicModalSave').onclick = ()=>{
  const val = document.getElementById('topicModalInput').value.trim();
  if(!val || !topicModalCtx) return closeTopicModal();
  if(topicModalCtx.mode === 'add-topic'){
    const chapter = topicModalCtx.chapter;
    if(!chapter.topics) chapter.topics = [];
    chapter.topics.push({id: genId(chapter.id+'-t'), name: val, subtopics: [], study:false, revise:false, test:false});
  } else if(topicModalCtx.mode === 'add-subtopic'){
    const topic = topicModalCtx.topic;
    if(!topic.subtopics) topic.subtopics = [];
    topic.subtopics.push({id: genId(topic.id+'-s'), name: val, study:false, revise:false, test:false});
  }
  saveState();
  closeTopicModal();
  render();
};
document.getElementById('topicModalInput').addEventListener('keydown', e=>{
  if(e.key==='Enter') document.getElementById('topicModalSave').click();
});

function refreshChapterGroupOptions(){
  const subjSel = document.getElementById('chapterModalSubject');
  const groupSel = document.getElementById('chapterModalGroup');
  const subj = subjSel.value;
  if(subj === 'Social'){
    groupSel.style.display = 'block';
    groupSel.innerHTML = syllabus.Social.map(g=>`<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');
  } else {
    groupSel.style.display = 'none';
  }
}
document.getElementById('chapterModalSubject').addEventListener('change', refreshChapterGroupOptions);

document.getElementById('addChapterBtn').addEventListener('click', ()=>{
  document.getElementById('chapterModalInput').value = '';
  document.getElementById('chapterModalSubject').value = activeSubject;
  refreshChapterGroupOptions();
  document.getElementById('chapterModal').classList.add('show');
  document.getElementById('chapterModalInput').focus();
});
document.getElementById('chapterModalCancel').onclick = ()=>{
  document.getElementById('chapterModal').classList.remove('show');
};
document.getElementById('chapterModalSave').onclick = ()=>{
  const name = document.getElementById('chapterModalInput').value.trim();
  const subj = document.getElementById('chapterModalSubject').value;
  if(!name) { document.getElementById('chapterModal').classList.remove('show'); return; }
  let group;
  if(subj === 'Social'){
    const gid = document.getElementById('chapterModalGroup').value;
    group = syllabus.Social.find(g=>g.id===gid);
  } else {
    group = syllabus[subj][0];
  }
  const cid = genId(subj+'-c');
  group.chapters.push({id:cid, name, topics:[], study:false, revise:false, test:false});
  saveState();
  activeSubject = subj;
  document.getElementById('chapterModal').classList.remove('show');
  render();
};

/* ---------- toolbar actions ---------- */

document.getElementById('expandAllBtn').addEventListener('click', ()=>{
  syllabus[activeSubject].forEach(g=>g.chapters.forEach(c=>{ collapsedState[c.id] = false; }));
  saveCollapse();
  renderTree();
});
document.getElementById('collapseAllBtn').addEventListener('click', ()=>{
  syllabus[activeSubject].forEach(g=>g.chapters.forEach(c=>{ collapsedState[c.id] = true; }));
  saveCollapse();
  renderTree();
});
document.getElementById('resetBtn').addEventListener('click', ()=>{
  if(confirm('Reset ALL Study / Revise / Test progress for every subject? This cannot be undone.')){
    ['Science','Social','Math'].forEach(s=>{
      subjectLeaves(s).forEach(l=>{ l.study=false; l.revise=false; l.test=false; });
    });
    saveState();
    render();
  }
});

document.getElementById('importantFilterToggle').addEventListener('change', (e)=>{
  filterImportantOnly = e.target.checked;
  saveFilter();
  renderToolbarVisibility();
  renderTree();
});

document.getElementById('studentNameInput').addEventListener('input', (e)=>{
  studentName = e.target.value;
  saveStudentName();
  document.getElementById('overviewHeading').textContent = studentName
    ? `${studentName}'s Syllabus Progress`
    : 'Overall Syllabus Progress';
});
document.getElementById('studentNameInput').addEventListener('blur', ()=>{
  if(activeSubject === 'Dashboard') renderTree();
});

/* ---------- init ---------- */
loadState();
document.getElementById('studentNameInput').value = studentName;
render();
