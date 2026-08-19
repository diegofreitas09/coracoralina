(function(){
  try{ if(typeof TUITION!=='undefined' && !window.TUITION) window.TUITION=TUITION; }catch(e){}
  try{ if(typeof MATERIALS!=='undefined' && !window.MATERIALS) window.MATERIALS=MATERIALS; }catch(e){}
  try{ if(typeof UNIFORMS!=='undefined' && !window.UNIFORMS) window.UNIFORMS=UNIFORMS; }catch(e){}
  try{ if(typeof STUDENTS!=='undefined' && !window.STUDENTS) window.STUDENTS=STUDENTS; }catch(e){}
  window.addEventListener('error',function(ev){
    const m=String(ev && ev.message || '');
    if(/TUITION|MATERIALS|UNIFORMS|STUDENTS/.test(m)) console.warn('Cora Gestão: referência de dados recuperada pelo modo apresentação.',m);
  });
})();