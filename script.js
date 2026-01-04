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
  const durationEl = document.getElementById('duration');
  const addBtn = document.getElementById('addBtn');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  const mostPlayedBtn = document.getElementById('mostPlayedBtn');
  const recentlyPlayedBtn = document.getElementById('recentlyPlayedBtn');
  const allBtn = document.getElementById('allBtn');

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
    if(!title || !artist || !duration){ alert('Enter title, artist, and duration!'); return; }
    saveState();
    playlist.push({id: makeId(), title, artist, duration, plays:0});
    sortPlaylist();
    titleEl.value = artistEl.value = durationEl.value = '';
    updateDisplay();
  }

  function deleteSongById(id){
    saveState();
    const idx = playlist.findIndex(s => s.id === id);
    if(idx !== -1) playlist.splice(idx,1);
    if(currentIndex >= playlist.length) currentIndex = playlist.length - 1;
    if(playlist.length === 0) currentIndex = -1;
    persist();
    updateDisplay();
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
    if(type==='mostPlayed') mostPlayedBtn.classList.add('selected-filter');
    else if(type==='recentlyPlayed') recentlyPlayedBtn.classList.add('selected-filter');
    else allBtn.classList.add('selected-filter');
    updateDisplay();
  }

  function sortPlaylist(){
    playlist.sort((a,b) => a.title.localeCompare(b.title));
    if(playlist.length>0) currentIndex = Math.min(currentIndex, playlist.length - 1);
  }

  function updateDisplay(){
    const searchTerm = (searchEl.value || '').toLowerCase();
    const frag = document.createDocumentFragment();

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
    displayList.forEach((song, idx) =>{
      if(!song || !song.title) return;
      const firstLetter = song.title[0].toUpperCase();
      if(firstLetter !== lastLetter){
        const letterDiv = document.createElement('div'); letterDiv.className = 'alphabet'; letterDiv.textContent = firstLetter; frag.appendChild(letterDiv);
        lastLetter = firstLetter;
      }
      const row = document.createElement('div'); row.className = 'song';
      if(playlist.findIndex(s => s.id===song.id) === currentIndex) row.classList.add('current');

      const left = document.createElement('div');
      left.textContent = (playlist.findIndex(s => s.id===song.id)+1) + '. ' + song.title + ' by ' + (song.artist||'') + ' (' + (song.duration||'') + ') 🔥' + (song.plays||0);
      left.style.flex = '1 1 auto';
      left.style.marginRight = '12px';
      row.appendChild(left);

      const del = document.createElement('button'); del.className = 'delete-btn'; del.textContent = '❌';
      del.addEventListener('click', function(ev){ ev.stopPropagation(); deleteSongById(song.id); });
      row.appendChild(del);

      row.addEventListener('click', function(){
        const idx = playlist.findIndex(s => s.id === song.id);
        if(idx !== -1){ currentIndex = idx; playCurrent(); updateDisplay(); }
      });

      frag.appendChild(row);
    });

    playlistEl.appendChild(frag);
  }

  // Event bindings
  addBtn.addEventListener('click', addSong);
  prevBtn.addEventListener('click', playPrevious);
  nextBtn.addEventListener('click', playNext);
  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);
  mostPlayedBtn.addEventListener('click', () => filterPlaylist('mostPlayed'));
  recentlyPlayedBtn.addEventListener('click', () => filterPlaylist('recentlyPlayed'));
  allBtn.addEventListener('click', () => filterPlaylist('all'));
  searchEl.addEventListener('input', function(){ updateDisplay(); });

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
          alert('Invalid import file: no playlist array found');
        }
      }catch(err){ alert('Failed to import JSON: '+err.message); }
    };
    reader.readAsText(file);
  }

  exportBtn.addEventListener('click', exportData);
  importBtn.addEventListener('click', ()=> importFile.click());
  importFile.addEventListener('change', (ev)=>{ const f = ev.target.files && ev.target.files[0]; handleImportFile(f); importFile.value=''; });

  // init
  restore();
  sortPlaylist();
  updateDisplay();
})();
