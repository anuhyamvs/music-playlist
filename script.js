(function(){
  // Minimal refactor of original logic: stable IDs, safe DOM updates, event listeners, small fixes
  let nextId = 1;
  function makeId(){ return String(nextId++); }

  // initial playlist (assign ids)
  let playlist = [
    {title:"Ae Mere Humsafar",artist:"Baazigar",duration:"5:40",plays:0},
    {title:"Aap Ki Nazron Ne Samjha",artist:"Anpadh",duration:"4:30",plays:0},
    {title:"Agar Tum Mil Jao",artist:"Zeher",duration:"5:10",plays:0},
    {title:"Billie Jean",artist:"Michael Jackson",duration:"4:54",plays:0},
    {title:"Bohemian Rhapsody",artist:"Queen",duration:"5:55",plays:0},
    {title:"Chalte Chalte",artist:"Pakeezah",duration:"3:45",plays:0},
    {title:"Chand Sifarish",artist:"Fanaa",duration:"4:20",plays:0},
    {title:"Dil Dhoondta Hai",artist:"Mausam",duration:"6:00",plays:0},
    {title:"Imagine",artist:"John Lennon",duration:"3:04",plays:0},
    {title:"Bohemian Rhapsody (duplicate)",artist:"Queen",duration:"5:55",plays:0}
  ].map(s => Object.assign({id: makeId()}, s));

  let currentIndex = -1;
  let undoStack = [];
  let redoStack = [];
  let recentlyPlayed = []; // array of {id, playedAt}
  let currentFilter = 'all';
  const UNDO_LIMIT = 50;

  // DOM refs
  const playlistEl = document.getElementById('playlist');
  const searchEl = document.getElementById('search');
  const titleEl = document.getElementById('title');
  const artistEl = document.getElementById('artist');
  const artEl = document.getElementById('art');
  const durationEl = document.getElementById('duration');
  const addBtn = document.getElementById('addBtn');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  const mostPlayedBtn = document.getElementById('mostPlayedBtn');
  const recentlyPlayedBtn = document.getElementById('recentlyPlayedBtn');
  const allBtn = document.getElementById('allBtn');
  const toastContainer = document.getElementById('toastContainer');
  if(playlistEl) playlistEl.setAttribute('role','list');
  // Now-playing / audio refs
  const audioEl = document.getElementById('audio');
  const nowPlayingTitle = document.getElementById('nowPlayingTitle');
  const nowPlayingArtist = document.getElementById('nowPlayingArtist');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const progressBar = document.getElementById('progressBar');
  const progressFill = document.getElementById('progressFill');
  const timeElapsedEl = document.getElementById('timeElapsed');
  const timeDurationEl = document.getElementById('timeDuration');

  // Persistence
  function persist(){
    try{ localStorage.setItem('playlist:v1', JSON.stringify({playlist,currentIndex,recentlyPlayed,currentFilter,nextId})); }catch(e){/* ignore */}
  }
  function restore(){
    try{
      const raw = localStorage.getItem('playlist:v1');
      if(!raw) return;
      const data = JSON.parse(raw);
      if(Array.isArray(data.playlist)){
        playlist = data.playlist;
        currentIndex = typeof data.currentIndex === 'number' ? data.currentIndex : -1;
        recentlyPlayed = Array.isArray(data.recentlyPlayed) ? data.recentlyPlayed : [];
        currentFilter = data.currentFilter || 'all';
        if(data.nextId) nextId = data.nextId;
      }
    }catch(e){console.warn('restore failed', e)}
  }

  // Save undo state
  function saveState(){
    undoStack.push({playlist: JSON.parse(JSON.stringify(playlist)), currentIndex, currentFilter, recentlyPlayed: JSON.parse(JSON.stringify(recentlyPlayed))});
    if(undoStack.length>UNDO_LIMIT) undoStack.shift();
    redoStack = [];
    persist();
  }

  // CRUD
  function addSong(){
    const title = titleEl.value.trim();
    const artist = artistEl.value.trim();
    const duration = durationEl.value.trim();
    const art = artEl ? artEl.value.trim() : '';
    if(!title || !artist || !duration){ showToast('Please enter title, artist, and duration'); return; }
    saveState();
    playlist.push({id: makeId(), title, artist, duration, plays:0, art: art || undefined});
    sortPlaylist();
    titleEl.value = artistEl.value = durationEl.value = '';
    if(artEl) artEl.value = '';
    updateDisplay();
  }

  function deleteSongById(id){
    // save previous state so undo can revert
    saveState();
    const idx = playlist.findIndex(s => s.id === id);
    const removed = idx !== -1 ? playlist.splice(idx,1)[0] : null;
    if(currentIndex >= playlist.length) currentIndex = playlist.length - 1;
    if(playlist.length === 0) currentIndex = -1;
    persist();
    updateDisplay();
    if(removed){
      showToast(`Removed "${removed.title}"`, { undoLabel: 'Undo', onUndo: function(){ undo(); } });
    }
  }

  // Toast helper
  function showToast(msg, opts){
    if(!toastContainer) return;
    const container = toastContainer;
    const toast = document.createElement('div'); toast.className = 'toast';
    const txt = document.createElement('div'); txt.className = 'toast-msg'; txt.textContent = msg;
    toast.appendChild(txt);
    const actions = document.createElement('div'); actions.className = 'toast-actions';
    if(opts && typeof opts.onUndo === 'function'){
      const btn = document.createElement('button'); btn.className = 'undo-btn'; btn.textContent = opts.undoLabel || 'Undo';
      btn.addEventListener('click', function(){ try{ opts.onUndo(); }catch(e){} remove(); });
      actions.appendChild(btn);
    }
    toast.appendChild(actions);
    container.appendChild(toast);
    let removedFlag = false;
    const id = setTimeout(remove, (opts && opts.duration) || 5000);
    function remove(){ if(removedFlag) return; removedFlag = true; clearTimeout(id); try{ toast.remove(); }catch(e){} }
  }

  // Playback
  function playCurrent(){
    if(currentIndex < 0 || currentIndex >= playlist.length) return;
    playlist[currentIndex].plays = (playlist[currentIndex].plays||0) + 1;
    const id = playlist[currentIndex].id;
    recentlyPlayed = recentlyPlayed.filter(x => x.id !== id);
    recentlyPlayed.unshift({id, playedAt: Date.now()});
    if(recentlyPlayed.length>50) recentlyPlayed.pop();
    persist();
    // attempt to play audio if src is available
    const song = playlist[currentIndex];
    if(song && song.src){
      if(audioEl.getAttribute('src') !== song.src) audioEl.src = song.src;
      audioEl.play().catch(()=>{});
    } else {
      // no audio source: pause audio and reset progress
      try{ audioEl.pause(); audioEl.removeAttribute('src'); audioEl.currentTime = 0; }catch(e){}
    }
    updateNowPlaying();
  }

  function playNext(){
    if(playlist.length===0) return;
    saveState();
    currentIndex = (currentIndex + 1) % playlist.length;
    playCurrent();
    updateDisplay();
  }
  function playPrevious(){
    if(playlist.length===0) return;
    saveState();
    currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    playCurrent();
    updateDisplay();
  }

  // Undo/Redo
  function undo(){
    if(undoStack.length===0) return;
    redoStack.push({playlist: JSON.parse(JSON.stringify(playlist)), currentIndex, currentFilter, recentlyPlayed: JSON.parse(JSON.stringify(recentlyPlayed))});
    const prev = undoStack.pop();
    playlist = prev.playlist; currentIndex = prev.currentIndex; currentFilter = prev.currentFilter; recentlyPlayed = prev.recentlyPlayed || [];
    persist(); updateDisplay();
  }
  function redo(){
    if(redoStack.length===0) return;
    undoStack.push({playlist: JSON.parse(JSON.stringify(playlist)), currentIndex, currentFilter, recentlyPlayed: JSON.parse(JSON.stringify(recentlyPlayed))});
    const next = redoStack.pop();
    playlist = next.playlist; currentIndex = next.currentIndex; currentFilter = next.currentFilter; recentlyPlayed = next.recentlyPlayed || [];
    persist(); updateDisplay();
  }

  // Filters & display
  function filterPlaylist(type){
    currentFilter = type;
    mostPlayedBtn.classList.remove('selected-filter');
    recentlyPlayedBtn.classList.remove('selected-filter');
    allBtn.classList.remove('selected-filter');
    // aria pressed state
    if(type==='mostPlayed'){
      mostPlayedBtn.classList.add('selected-filter'); mostPlayedBtn.setAttribute('aria-pressed','true');
      recentlyPlayedBtn.setAttribute('aria-pressed','false'); allBtn.setAttribute('aria-pressed','false');
    } else if(type==='recentlyPlayed'){
      recentlyPlayedBtn.classList.add('selected-filter'); recentlyPlayedBtn.setAttribute('aria-pressed','true');
      mostPlayedBtn.setAttribute('aria-pressed','false'); allBtn.setAttribute('aria-pressed','false');
    } else {
      allBtn.classList.add('selected-filter'); allBtn.setAttribute('aria-pressed','true');
      mostPlayedBtn.setAttribute('aria-pressed','false'); recentlyPlayedBtn.setAttribute('aria-pressed','false');
    }
    updateDisplay();
  }

  function sortPlaylist(){
    playlist.sort((a,b) => a.title.localeCompare(b.title));
    if(playlist.length>0) currentIndex = Math.min(currentIndex, playlist.length - 1);
  }

  function updateDisplay(){
    const searchTerm = (searchEl.value || '').toLowerCase();
    const frag = document.createDocumentFragment();
    // update filter counts on buttons
    try{
      const mostCount = playlist.filter(s => (s.plays||0) > 0).length;
      const recentCount = recentlyPlayed.length;
      const allCount = playlist.length;
      const mpLabel = mostPlayedBtn && mostPlayedBtn.querySelector('.btn-label'); if(mpLabel) mpLabel.textContent = `Most Played (${mostCount})`;
      const rpLabel = recentlyPlayedBtn && recentlyPlayedBtn.querySelector('.btn-label'); if(rpLabel) rpLabel.textContent = `Recently (${recentCount})`;
      const allLabel = allBtn && allBtn.querySelector('.btn-label'); if(allLabel) allLabel.textContent = `All (${allCount})`;
    }catch(e){}

    let displayList = [];
    if(currentFilter === 'mostPlayed'){
      const played = playlist.filter(s => (s.plays||0) > 0);
      const sorted = played.slice().sort((a,b) => (b.plays||0) - (a.plays||0));
      const N = Math.min(25, sorted.length);
      displayList = sorted.slice(0, N);
    } else if(currentFilter === 'recentlyPlayed'){
      // map recentlyPlayed entries (most recent first) to song objects
      displayList = recentlyPlayed.slice().sort((a,b)=>b.playedAt - a.playedAt).map(entry => {
        const s = playlist.find(p => p.id === entry.id);
        return s ? Object.assign({}, s, {playedAt: entry.playedAt}) : null;
      }).filter(Boolean);
    } else {
      displayList = playlist;
    }

    displayList = displayList.filter(s => (s.title||'').toLowerCase().includes(searchTerm) || (s.artist||'').toLowerCase().includes(searchTerm));

    playlistEl.innerHTML = '';

    if(displayList.length === 0){
      const msg = document.createElement('div'); msg.className = 'empty-message';
      msg.textContent = currentFilter === 'mostPlayed' ? 'No songs played yet.' : currentFilter === 'recentlyPlayed' ? 'No recently played songs.' : 'No songs to display.';
      playlistEl.appendChild(msg); return;
    }

    let lastLetter = '';
    const alphaTpl = document.getElementById('alpha-template');
    const songTpl = document.getElementById('song-template');
    displayList.forEach((song, idx) =>{
      if(!song || !song.title) return;
      const firstLetter = song.title[0].toUpperCase();
      if(firstLetter !== lastLetter){
        if(alphaTpl){
          const letterNode = alphaTpl.content.cloneNode(true);
          const el = letterNode.querySelector('.alphabet');
          if(el) el.textContent = firstLetter;
          frag.appendChild(letterNode);
        } else {
          const letterDiv = document.createElement('div'); letterDiv.className = 'alphabet'; letterDiv.textContent = firstLetter; frag.appendChild(letterDiv);
        }
        lastLetter = firstLetter;
      }

      if(songTpl){
        const node = songTpl.content.cloneNode(true);
        const row = node.querySelector('.song');
        row.dataset.id = song.id;
        if(playlist.findIndex(s => s.id===song.id) === currentIndex) row.classList.add('current');
        const img = row.querySelector('.thumb');
        const placeholderSvg = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><rect width="100%" height="100%" fill="%23f3f4f6" rx="8"/><path d="M9 9v6l6 3V9z" fill="%23e5e7eb"/></svg>');
        const placeholderData = 'data:image/svg+xml;utf8,' + placeholderSvg;
        if(img){ img.src = song.art || placeholderData; img.alt = song.title || 'Album art'; img.onerror = function(){ this.onerror = null; this.src = placeholderData; }; }
        const titleDiv = node.querySelector('.title'); if(titleDiv) titleDiv.textContent = (playlist.findIndex(s => s.id===song.id)+1) + '. ' + song.title;
        const subDiv = node.querySelector('.sub'); if(subDiv) subDiv.textContent = (song.artist||'') + (song.duration ? (' • ' + song.duration) : '') + ' • ' + '🔥' + (song.plays||0);
        const delBtn = node.querySelector('.delete-btn'); if(delBtn){ delBtn.addEventListener('click', function(ev){ ev.stopPropagation(); deleteSongById(song.id); }); }

        // interactions
        row.addEventListener('click', function(){ const idx = playlist.findIndex(s => s.id === song.id); if(idx !== -1){ currentIndex = idx; playCurrent(); updateDisplay(); } });
        row.addEventListener('keydown', function(ev){ if(ev.key === 'Enter'){ ev.preventDefault(); const idx = playlist.findIndex(s => s.id === song.id); if(idx!==-1){ currentIndex = idx; playCurrent(); updateDisplay(); } } if(ev.key === 'Delete'){ ev.preventDefault(); deleteSongById(song.id); } });

        // drag handlers
        row.setAttribute('draggable','true');
        row.addEventListener('dragstart', function(ev){ ev.dataTransfer.setData('text/plain', song.id); ev.dataTransfer.effectAllowed = 'move'; row.classList.add('dragging'); });
        row.addEventListener('dragend', function(ev){ row.classList.remove('dragging'); document.querySelectorAll('.song.drag-over').forEach(el=>el.classList.remove('drag-over')); });
        row.addEventListener('dragover', function(ev){ ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; row.classList.add('drag-over'); });
        row.addEventListener('dragleave', function(ev){ row.classList.remove('drag-over'); });
        row.addEventListener('drop', function(ev){ ev.preventDefault(); row.classList.remove('drag-over'); const draggedId = ev.dataTransfer.getData('text/plain'); if(!draggedId || draggedId === song.id) return; const fromIdx = playlist.findIndex(s => s.id === draggedId); const toIdx = playlist.findIndex(s => s.id === song.id); if(fromIdx === -1 || toIdx === -1) return; saveState(); const [moved] = playlist.splice(fromIdx,1); const insertAt = fromIdx < toIdx ? toIdx : toIdx; playlist.splice(insertAt,0,moved); persist(); updateDisplay(); });

        frag.appendChild(node);
      } else {
        // fallback to manual creation
        const row = document.createElement('div'); row.className = 'song'; row.dataset.id = song.id; row.textContent = song.title; frag.appendChild(row);
      }
    });

    playlistEl.appendChild(frag);
    // update now-playing highlight/info
    updateNowPlaying();
  }

  function formatTime(t){
    if(!t || isNaN(t)) return '0:00';
    const s = Math.floor(t%60).toString().padStart(2,'0');
    const m = Math.floor(t/60);
    return m+':'+s;
  }

  function updateNowPlaying(){
    if(currentIndex >=0 && playlist[currentIndex]){
      const s = playlist[currentIndex];
      nowPlayingTitle.textContent = s.title || 'Unknown title';
      nowPlayingArtist.textContent = s.artist || '';
      if(playPauseBtn) playPauseBtn.disabled = !s.src;
    } else {
      nowPlayingTitle.textContent = 'Not playing';
      nowPlayingArtist.textContent = '';
      if(playPauseBtn) playPauseBtn.disabled = true;
    }
  }

  // audio events
  if(audioEl){
    audioEl.addEventListener('timeupdate', function(){
      if(!audioEl.duration) return;
      const pct = (audioEl.currentTime / audioEl.duration) * 100;
      progressFill.style.width = pct + '%';
      timeElapsedEl.textContent = formatTime(audioEl.currentTime);
      timeDurationEl.textContent = formatTime(audioEl.duration);
    });
    audioEl.addEventListener('ended', function(){
      playNext();
    });
    audioEl.addEventListener('play', function(){ playPauseBtn.textContent = '⏸'; });
    audioEl.addEventListener('pause', function(){ playPauseBtn.textContent = '▶️'; });
  }

  // play/pause toggle
  if(playPauseBtn){
    playPauseBtn.addEventListener('click', function(){
      if(!audioEl.src) return; // nothing to play
      if(audioEl.paused) audioEl.play().catch(()=>{}); else audioEl.pause();
    });
  }

  // progress seek
  if(progressBar){
    // Pointer-based seek (supports mouse & touch)
    let isSeeking = false;
    function seekToClientX(clientX){
      const rect = progressBar.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      if(audioEl.duration) audioEl.currentTime = pct * audioEl.duration;
      progressFill.style.width = (pct * 100) + '%';
    }

    progressBar.addEventListener('pointerdown', function(ev){
      ev.preventDefault();
      isSeeking = true;
      progressBar.setPointerCapture(ev.pointerId);
      seekToClientX(ev.clientX);
    });
    progressBar.addEventListener('pointermove', function(ev){
      if(!isSeeking) return;
      seekToClientX(ev.clientX);
    });
    progressBar.addEventListener('pointerup', function(ev){
      if(!isSeeking) return;
      seekToClientX(ev.clientX);
      isSeeking = false;
      try{ progressBar.releasePointerCapture(ev.pointerId); }catch(e){}
    });
    progressBar.addEventListener('pointercancel', function(ev){ isSeeking = false; try{ progressBar.releasePointerCapture(ev.pointerId); }catch(e){} });
  }

  // Keyboard shortcuts and navigation
  document.addEventListener('keydown', function(ev){
    const target = ev.target || {};
    const tag = (target.tagName || '').toUpperCase();
    const editable = target.isContentEditable;
    if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || editable) return;

    if(ev.key === ' '){ // Space -> toggle play/pause
      ev.preventDefault();
      if(audioEl.src){ if(audioEl.paused) audioEl.play().catch(()=>{}); else audioEl.pause(); }
      return;
    }
    if(ev.key === 'Enter'){
      // play current selection
      ev.preventDefault();
      if(currentIndex >= 0){
        const song = playlist[currentIndex];
        if(song && song.src){
          playCurrent(); updateDisplay();
        }
      }
      return;
    }
    if(ev.key === 'ArrowDown'){
      ev.preventDefault(); playNext(); return;
    }
    if(ev.key === 'ArrowUp'){
      ev.preventDefault(); playPrevious(); return;
    }
    if((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's'){
      ev.preventDefault(); exportData(); return;
    }
  });

  // Event bindings
  addBtn.addEventListener('click', addSong);
  prevBtn.addEventListener('click', playPrevious);
  nextBtn.addEventListener('click', playNext);
  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);
  mostPlayedBtn.addEventListener('click', () => filterPlaylist('mostPlayed'));
  recentlyPlayedBtn.addEventListener('click', () => filterPlaylist('recentlyPlayed'));
  allBtn.addEventListener('click', () => filterPlaylist('all'));
  // debounce search input for performance
  function debounce(fn, wait){ let t; return function(...args){ clearTimeout(t); t = setTimeout(()=>fn.apply(this,args), wait); }; }
  const debouncedUpdate = debounce(updateDisplay, 180);
  searchEl.addEventListener('input', function(){ debouncedUpdate(); });

  // Import / Export
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');

  function exportData(){
    const data = { playlist, currentIndex, recentlyPlayed, currentFilter };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'playlist-export.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(file){
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e){
      try{
        const data = JSON.parse(String(e.target.result));
        if(Array.isArray(data.playlist)){
          // basic schema validation: ensure each item has a title and artist
          const ok = data.playlist.every(it => it && typeof it.title === 'string' && typeof it.artist === 'string');
          if(!ok){ showToast('Import failed: playlist items missing required fields'); return; }
          // ensure ids
          data.playlist = data.playlist.map(s => {
            if(!s.id) s.id = makeId();
            return s;
          });
          saveState();
          playlist = data.playlist;
          currentIndex = typeof data.currentIndex === 'number' ? data.currentIndex : -1;
          recentlyPlayed = Array.isArray(data.recentlyPlayed) ? data.recentlyPlayed : [];
          currentFilter = data.currentFilter || 'all';
          sortPlaylist(); persist(); updateDisplay();
        } else {
          showToast('Invalid import file: no playlist array found');
        }
      }catch(err){ showToast('Failed to import JSON: '+err.message); }
    };
    reader.readAsText(file);
  }

  exportBtn.addEventListener('click', exportData);
  importBtn.addEventListener('click', ()=> importFile.click());
  importFile.addEventListener('change', (ev)=>{ const f = ev.target.files && ev.target.files[0]; handleImportFile(f); importFile.value=''; });

  // init
  // expose modular grouping for future splitting
  const App = {
    state: {
      get playlist(){ return playlist; },
      get currentIndex(){ return currentIndex; },
      set currentIndex(v){ currentIndex = v; },
      get recentlyPlayed(){ return recentlyPlayed; },
      get nextId(){ return nextId; }
    },
    persistence: { persist, restore, saveState },
    renderer: { updateDisplay, updateNowPlaying, formatTime },
    controls: { addSong, deleteSongById, playNext, playPrevious, undo, redo, exportData, handleImportFile }
  };
  try{ window.App = App; }catch(e){}

  restore();
  sortPlaylist();
  updateDisplay();
})();
