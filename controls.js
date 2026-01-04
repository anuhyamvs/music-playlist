// Proxy controls module to call the controls on window.App
export function addSong(){ if(window.App && window.App.controls && typeof window.App.controls.addSong === 'function') return window.App.controls.addSong(); }
export function deleteSongById(id){ if(window.App && window.App.controls && typeof window.App.controls.deleteSongById === 'function') return window.App.controls.deleteSongById(id); }
export function playNext(){ if(window.App && window.App.controls && typeof window.App.controls.playNext === 'function') return window.App.controls.playNext(); }
export function playPrevious(){ if(window.App && window.App.controls && typeof window.App.controls.playPrevious === 'function') return window.App.controls.playPrevious(); }
export function undo(){ if(window.App && window.App.controls && typeof window.App.controls.undo === 'function') return window.App.controls.undo(); }
export function redo(){ if(window.App && window.App.controls && typeof window.App.controls.redo === 'function') return window.App.controls.redo(); }
export function exportData(){ if(window.App && window.App.controls && typeof window.App.controls.exportData === 'function') return window.App.controls.exportData(); }
export function handleImportFile(f){ if(window.App && window.App.controls && typeof window.App.controls.handleImportFile === 'function') return window.App.controls.handleImportFile(f); }
