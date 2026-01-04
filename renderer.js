// Proxy renderer module to call the rendering helpers on window.App
export function updateDisplay(){ if(window.App && window.App.renderer && typeof window.App.renderer.updateDisplay === 'function') return window.App.renderer.updateDisplay(); }
export function updateNowPlaying(){ if(window.App && window.App.renderer && typeof window.App.renderer.updateNowPlaying === 'function') return window.App.renderer.updateNowPlaying(); }
export function formatTime(t){ if(window.App && window.App.renderer && typeof window.App.renderer.formatTime === 'function') return window.App.renderer.formatTime(t); return '0:00'; }
export function playIndex(i){ if(window.App && window.App.controls && typeof window.App.controls.playIndex === 'function') return window.App.controls.playIndex(i); }
