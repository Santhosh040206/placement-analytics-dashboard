/* Campus Placement Analytics — client-only demo app */
(() => {
  const LS_USERS = 'cpa_users';
  const LS_STUDENTS = 'cpa_students';
  const LS_SESSION = 'cpa_session';
  const BRANCHES = ['CSE','ECE','EEE','ME','CE','IT'];

  // ---------- storage helpers ----------
  const load = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const uid = () => Math.random().toString(36).slice(2, 10);

  // seed default admin
  if (!load(LS_USERS, null)) {
    save(LS_USERS, [{ id: uid(), name: 'Placement Admin', email: 'admin@campus.edu', password: 'admin123', role: 'admin' }]);
  }
  if (!load(LS_STUDENTS, null)) save(LS_STUDENTS, []);

  // ---------- auth ----------
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  function currentUser() { return load(LS_SESSION, null); }

  function showAuth() {
    $('#authScreen').classList.remove('hidden');
    $('#app').classList.add('hidden');
  }
  function showApp() {
    const u = currentUser();
    $('#authScreen').classList.add('hidden');
    $('#app').classList.remove('hidden');
    $('#userNameLabel').textContent = u.name;
    $('#userEmailLabel').textContent = u.email;
    $('#userRoleLabel').textContent = { admin:'Admin', student:'Student', company:'Recruiter' }[u.role];
    buildNav();
    switchView('dashboard');
    renderAll();
  }

  $$('#authTabs .tab').forEach(t => t.addEventListener('click', () => {
    $$('#authTabs .tab').forEach(x => x.classList.toggle('active', x === t));
    const isLogin = t.dataset.tab === 'login';
    $('#loginForm').classList.toggle('hidden', !isLogin);
    $('#signupForm').classList.toggle('hidden', isLogin);
    $('#authMsg').textContent = '';
  }));

  $('#loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = fd.get('email').trim().toLowerCase();
    const password = fd.get('password');
    const user = load(LS_USERS, []).find(u => u.email === email && u.password === password);
    if (!user) { $('#authMsg').textContent = 'Invalid email or password.'; return; }
    save(LS_SESSION, user);
    showApp();
  });

  $('#signupForm').addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = fd.get('name').trim();
    const email = fd.get('email').trim().toLowerCase();
    const password = fd.get('password');
    const role = fd.get('role');
    if (!name || !email || password.length < 6) { $('#authMsg').textContent = 'Fill all fields (password 6+ chars).'; return; }
    const users = load(LS_USERS, []);
    if (users.some(u => u.email === email)) { $('#authMsg').textContent = 'That email is already registered.'; return; }
    const user = { id: uid(), name, email, password, role };
    users.push(user); save(LS_USERS, users); save(LS_SESSION, user);
    showApp();
  });

  $('#logoutBtn').addEventListener('click', () => { localStorage.removeItem(LS_SESSION); showAuth(); });

  // ---------- nav ----------
  function buildNav() {
    const u = currentUser();
    const tabs = [{ id:'dashboard', label:'Dashboard' }];
    if (u.role === 'student') tabs.push({ id:'student', label:'My record' });
    if (u.role === 'company') tabs.push({ id:'company', label:'Post offer' });
    if (u.role === 'admin') tabs.push({ id:'admin', label:'Admin' });
    const nav = $('#navTabs');
    nav.innerHTML = tabs.map(t => `<button data-view="${t.id}">${t.label}</button>`).join('');
    nav.querySelectorAll('button').forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));
  }
  function switchView(id) {
    $$('.view').forEach(v => v.classList.toggle('hidden', v.dataset.view !== id));
    $$('#navTabs button').forEach(b => b.classList.toggle('active', b.dataset.view === id));
    if (id === 'dashboard') renderAll();
  }

  // ---------- data ops ----------
  function students() { return load(LS_STUDENTS, []); }
  function saveStudents(s) { save(LS_STUDENTS, s); renderAll(); }

  function upsertStudent(record, matchBy = 'ownerEmail') {
    const list = students();
    let idx = -1;
    if (matchBy === 'ownerEmail' && record.ownerEmail)
      idx = list.findIndex(s => s.ownerEmail === record.ownerEmail);
    if (idx === -1 && record.name && record.branch)
      idx = list.findIndex(s => s.name.toLowerCase() === record.name.toLowerCase() && s.branch === record.branch);
    if (idx >= 0) list[idx] = { ...list[idx], ...record };
    else list.push({ id: uid(), ...record });
    saveStudents(list);
    return idx >= 0 ? 'updated' : 'added';
  }

  // ---------- forms ----------
  $('#studentForm').addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const u = currentUser();
    const rec = {
      ownerEmail: u.email,
      name: (fd.get('name') || u.name).trim(),
      branch: fd.get('branch'),
      cgpa: parseFloat(fd.get('cgpa')),
      skills: (fd.get('skills') || '').trim(),
      status: fd.get('status'),
      company: (fd.get('company') || '').trim(),
      package: parseFloat(fd.get('package')) || 0,
    };
    if (rec.status === 'Placed' && (!rec.company || !rec.package)) {
      $('#studentFormMsg').textContent = 'Placed status needs a company and package.'; return;
    }
    const r = upsertStudent(rec, 'ownerEmail');
    const msg = $('#studentFormMsg'); msg.className = 'auth-msg ok';
    msg.textContent = r === 'updated' ? 'Record updated.' : 'Record saved.';
  });

  // prefill student form with existing record
  document.addEventListener('click', e => {
    if (e.target?.dataset?.view === 'student') {
      const u = currentUser();
      const rec = students().find(s => s.ownerEmail === u.email);
      const f = $('#studentForm');
      if (rec) {
        f.name.value = rec.name; f.branch.value = rec.branch; f.cgpa.value = rec.cgpa;
        f.skills.value = rec.skills || ''; f.status.value = rec.status;
        f.company.value = rec.company || ''; f.package.value = rec.package || '';
      } else {
        f.name.value = u.name;
      }
    }
  });

  $('#offerForm').addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const rec = {
      name: fd.get('name').trim(),
      branch: fd.get('branch'),
      cgpa: parseFloat(fd.get('cgpa')) || 0,
      status: 'Placed',
      company: fd.get('company').trim(),
      package: parseFloat(fd.get('package')),
    };
    const r = upsertStudent(rec, 'nameBranch');
    const msg = $('#offerFormMsg'); msg.className = 'auth-msg ok';
    msg.textContent = r === 'updated' ? `Offer recorded for existing student.` : `New placed record added.`;
    e.target.reset();
  });

  $('#adminForm').addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const rec = {
      name: fd.get('name').trim(), branch: fd.get('branch'),
      cgpa: parseFloat(fd.get('cgpa')), status: fd.get('status'),
      company: (fd.get('company') || '').trim(),
      package: parseFloat(fd.get('package')) || 0,
    };
    const list = students(); list.push({ id: uid(), ...rec }); saveStudents(list);
    e.target.reset();
  });

  // CSV
  $('#csvBtn').addEventListener('click', () => {
    const file = $('#csvFile').files[0];
    const msg = $('#csvMsg');
    if (!file) { msg.className='auth-msg'; msg.textContent = 'Choose a CSV first.'; return; }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCSV(reader.result);
        const list = students();
        let n = 0;
        rows.forEach(r => {
          if (!r.name || !r.branch) return;
          list.push({
            id: uid(),
            name: r.name.trim(), branch: r.branch.trim(),
            cgpa: parseFloat(r.cgpa) || 0,
            status: (r.status || 'Not placed').trim(),
            company: (r.company || '').trim(),
            package: parseFloat(r.package) || 0,
          }); n++;
        });
        saveStudents(list);
        msg.className='auth-msg ok'; msg.textContent = `Imported ${n} records.`;
      } catch (err) { msg.className='auth-msg'; msg.textContent = 'CSV parse error: ' + err.message; }
    };
    reader.readAsText(file);
  });

  $('#csvSample').addEventListener('click', () => {
    const csv = 'name,branch,cgpa,status,company,package\nAsha Rao,CSE,8.6,Placed,Infosys,7.5\nRohit Verma,ECE,7.4,Not placed,,\n';
    downloadFile('sample_students.csv', csv);
  });
  $('#exportBtn').addEventListener('click', () => {
    const rows = students();
    const header = 'name,branch,cgpa,status,company,package';
    const body = rows.map(r => [r.name,r.branch,r.cgpa,r.status,r.company||'',r.package||''].map(csvEsc).join(',')).join('\n');
    downloadFile('cohort_export.csv', header + '\n' + body);
  });
  $('#seedBtn').addEventListener('click', () => {
    if (!confirm('Add 220 synthetic records to current dataset?')) return;
    const list = students();
    const companies = ['Infosys','TCS','Wipro','Accenture','Amazon','Google','Microsoft','Deloitte','Adobe','Zoho'];
    for (let i=0;i<220;i++){
      const placed = Math.random() < 0.72;
      const branch = BRANCHES[Math.floor(Math.random()*BRANCHES.length)];
      const cgpa = +(6 + Math.random()*4).toFixed(2);
      list.push({
        id: uid(),
        name: `Student ${list.length+1}`, branch, cgpa,
        status: placed ? 'Placed':'Not placed',
        company: placed ? companies[Math.floor(Math.random()*companies.length)] : '',
        package: placed ? +(4 + Math.random()*26).toFixed(1) : 0,
      });
    }
    saveStudents(list);
  });
  $('#clearBtn').addEventListener('click', () => {
    if (confirm('Delete ALL student records? This cannot be undone.')) saveStudents([]);
  });

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines.shift().split(',').map(h => h.trim().toLowerCase());
    return lines.map(line => {
      const cells = splitCSVLine(line);
      const obj = {}; headers.forEach((h,i) => obj[h] = cells[i] ?? ''); return obj;
    });
  }
  function splitCSVLine(line) {
    const out = []; let cur = '', q = false;
    for (let i=0;i<line.length;i++){
      const c = line[i];
      if (q) { if (c === '"' && line[i+1] === '"') { cur+='"'; i++; } else if (c==='"') q=false; else cur+=c; }
      else { if (c === ',') { out.push(cur); cur=''; } else if (c === '"') q=true; else cur+=c; }
    }
    out.push(cur); return out;
  }
  function csvEsc(v){ const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; }
  function downloadFile(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], {type:'text/csv'}));
    a.download = name; a.click(); URL.revokeObjectURL(a.href);
  }

  // ---------- rendering ----------
  let charts = {};
  function renderAll() {
    const data = students();
    renderLedger(data); renderTable(data); renderCharts(data);
  }
  function renderLedger(d) {
    const total = d.length;
    const placed = d.filter(s => s.status === 'Placed');
    const rate = total ? Math.round(placed.length/total*100) : 0;
    const avg = placed.length ? (placed.reduce((a,s)=>a+(+s.package||0),0)/placed.length) : 0;
    const top = placed.length ? Math.max(...placed.map(s=>+s.package||0)) : 0;
    const companies = new Set(placed.map(s => s.company).filter(Boolean)).size;
    $('#ledger').innerHTML = [
      ['Cohort size', total],
      ['Placed', placed.length],
      ['Placement rate', rate + '%'],
      ['Avg package', avg.toFixed(1) + ' LPA'],
      ['Top offer', top.toFixed(1) + ' LPA'],
    ].map(([l,v],i) => `<div class="ledger-item"><p class="ledger-label">${l}</p><div class="ledger-value ${i>=3?'accent':''}">${v}</div></div>`).join('') +
    `<div class="ledger-item" style="grid-column:1/-1;border-top:1px solid var(--line);border-right:none"><p class="ledger-label">Recruiters engaged</p><div class="ledger-value">${companies}</div></div>`;
    // simpler: keep 5-column layout
    $('#ledger').innerHTML = [
      ['Cohort size', total],
      ['Placed', placed.length],
      ['Placement rate', rate + '%'],
      ['Avg package', avg.toFixed(1) + ' LPA'],
      ['Top offer', top.toFixed(1) + ' LPA'],
    ].map(([l,v],i) => `<div class="ledger-item"><p class="ledger-label">${l}</p><div class="ledger-value ${i>=2?'accent':''}">${v}</div></div>`).join('');
  }

  function renderTable(d) {
    const u = currentUser();
    const isAdmin = u.role === 'admin';
    $('#actionsHead').classList.toggle('hidden', !isAdmin);
    $('#rowCount').textContent = `${d.length} records`;
    const tbody = $('#studentTable tbody');
    tbody.innerHTML = d.slice(0, 200).map(s => `
      <tr>
        <td>${esc(s.name)}</td><td>${esc(s.branch)}</td>
        <td class="num">${(+s.cgpa||0).toFixed(2)}</td>
        <td><span class="badge ${s.status==='Placed'?'placed':'open'}">${esc(s.status)}</span></td>
        <td>${esc(s.company||'—')}</td>
        <td class="num">${s.package?(+s.package).toFixed(1):'—'}</td>
        ${isAdmin?`<td><button class="row-btn" data-del="${s.id}">Delete</button></td>`:''}
      </tr>`).join('') || `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--muted)">No records yet. Add students, post offers, or seed demo data.</td></tr>`;
    tbody.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.del;
      saveStudents(students().filter(s => s.id !== id));
    }));
  }
  const esc = s => String(s ?? '').replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));

  function renderCharts(d) {
    Object.values(charts).forEach(c => c && c.destroy());
    const ink='#1E2A22', amber='#C08A34', green='#3F6B4C', coral='#B4573F', muted='#8C8873';
    const byBranch = BRANCHES.map(b => {
      const all = d.filter(s => s.branch === b);
      const placed = all.filter(s => s.status === 'Placed');
      const avg = placed.length ? placed.reduce((a,s)=>a+(+s.package||0),0)/placed.length : 0;
      return { branch:b, total:all.length, placed:placed.length, rate: all.length ? placed.length/all.length*100 : 0, avg };
    });

    charts.rate = new Chart($('#chartRate'), {
      type:'bar',
      data:{ labels: byBranch.map(x=>x.branch),
        datasets:[{ data: byBranch.map(x=>+x.rate.toFixed(1)), backgroundColor:green, borderRadius:4 }] },
      options: chartOpts('%')
    });
    charts.pkg = new Chart($('#chartPkg'), {
      type:'bar',
      data:{ labels: byBranch.map(x=>x.branch),
        datasets:[{ data: byBranch.map(x=>+x.avg.toFixed(1)), backgroundColor:amber, borderRadius:4 }] },
      options: chartOpts(' LPA')
    });
    const placed = d.filter(s => s.status==='Placed');
    const notPlaced = d.filter(s => s.status!=='Placed');
    charts.scatter = new Chart($('#chartScatter'), {
      type:'scatter',
      data:{ datasets:[
        { label:'Placed', data: placed.map(s=>({x:+s.cgpa,y:+s.package||0})), backgroundColor:green },
        { label:'Not placed', data: notPlaced.map(s=>({x:+s.cgpa,y:0})), backgroundColor:coral },
      ]},
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ labels:{ color:muted, font:{family:'IBM Plex Mono',size:11}}}},
        scales:{
          x:{ title:{display:true,text:'CGPA',color:muted}, grid:{color:'#EFE8D6'}, ticks:{color:muted}},
          y:{ title:{display:true,text:'Package (LPA)',color:muted}, grid:{color:'#EFE8D6'}, ticks:{color:muted}},
        }
      }
    });
    const compCounts = {};
    placed.forEach(s => { if (s.company) compCounts[s.company]=(compCounts[s.company]||0)+1; });
    const topComps = Object.entries(compCounts).sort((a,b)=>b[1]-a[1]).slice(0,8);
    charts.companies = new Chart($('#chartCompanies'), {
      type:'bar',
      data:{ labels: topComps.map(x=>x[0]),
        datasets:[{ data: topComps.map(x=>x[1]), backgroundColor:ink, borderRadius:4 }] },
      options:{ indexAxis:'y', ...chartOpts(' offers') }
    });
  }
  function chartOpts(suffix){
    return { responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:c=>c.parsed.y!==undefined?c.parsed.y+suffix:c.parsed.x+suffix }}},
      scales:{ x:{ grid:{display:false}, ticks:{color:'#8C8873',font:{family:'IBM Plex Mono',size:11}}},
               y:{ grid:{color:'#EFE8D6'}, ticks:{color:'#8C8873',font:{family:'IBM Plex Mono',size:11}}}}
    };
  }

  // ---------- boot ----------
  if (currentUser()) showApp(); else showAuth();
})();
