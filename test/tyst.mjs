/* Testerna ska inte låta. Sviten kör riktiga systemröster i WebKit, och att
   köra den innebar att datorn läste upp appens alla repliker rakt ut i rummet.

   Volymen, inte API:et: allt fortsätter hända precis som förut — onstart,
   onend, tider, fel — det kommer bara inget ljud. Ett test som stubbar bort
   syntesen testar inte längre syntesen. */
export const TYST = () => {
  try{
    const U = window.SpeechSynthesisUtterance;
    if(U){
      const Q = function(t){ const u = new U(t); try{ u.volume = 0; }catch(e){} return u; };
      Q.prototype = U.prototype;
      window.SpeechSynthesisUtterance = Q;
    }
  }catch(e){}
  try{
    const d = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');
    if(d && d.set) Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
      get(){ return 0; },
      set(){ try{ d.set.call(this, 0); }catch(e){} },
      configurable: true
    });
    const p = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function(){ try{ this.muted = true; }catch(e){} return p.apply(this, arguments); };
  }catch(e){}
};
