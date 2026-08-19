(function(){
  function applyBrand(){
    document.title='Cora Gestão | Matrículas 2027';
    let apple=document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if(!apple){apple=document.createElement('meta');apple.name='apple-mobile-web-app-title';document.head.appendChild(apple)}
    apple.content='Cora Gestão';
    const brand=document.querySelector('header .brand');
    if(brand){
      const small=brand.querySelector('small');
      const strong=brand.querySelector('strong');
      if(small)small.textContent='PLATAFORMA ESTRATÉGICA · MATRÍCULAS 2027';
      if(strong)strong.textContent='CORA GESTÃO';
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyBrand);else applyBrand();
  window.addEventListener('load',applyBrand);
})();