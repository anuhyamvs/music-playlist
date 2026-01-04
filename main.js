// Main ES module that wires together the proxy modules.
import * as State from './state.js';
import * as Renderer from './renderer.js';
import * as Controls from './controls.js';

// expose Modules for quick console access
try{ window.Modules = { State, Renderer, Controls }; }catch(e){}

// If the non-module script already initialized App, ensure renderer updates
if(window.App && window.App.renderer){
  // ensure UI reflects restored state
  requestAnimationFrame(()=>{
    try{ Renderer.updateDisplay(); Renderer.updateNowPlaying(); }catch(e){}
  });
}

export { State, Renderer, Controls };
