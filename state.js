// Lightweight proxy module exposing state/persistence from window.App
export const state = {
  get playlist(){ return (window.App && window.App.state && window.App.state.playlist) || []; },
  get currentIndex(){ return window.App && window.App.state ? window.App.state.currentIndex : -1; },
  set currentIndex(v){ if(window.App && window.App.state) window.App.state.currentIndex = v; },
  get recentlyPlayed(){ return (window.App && window.App.state && window.App.state.recentlyPlayed) || []; },
  get nextId(){ return window.App && window.App.state ? window.App.state.nextId : undefined; },
};

export const persistence = {
  persist(){ if(window.App && window.App.persistence && typeof window.App.persistence.persist === 'function') return window.App.persistence.persist(); },
  restore(){ if(window.App && window.App.persistence && typeof window.App.persistence.restore === 'function') return window.App.persistence.restore(); },
  saveState(){ if(window.App && window.App.persistence && typeof window.App.persistence.saveState === 'function') return window.App.persistence.saveState(); },
  undo(){ if(window.App && window.App.persistence && typeof window.App.persistence.undo === 'function') return window.App.persistence.undo(); },
  redo(){ if(window.App && window.App.persistence && typeof window.App.persistence.redo === 'function') return window.App.persistence.redo(); }
};
