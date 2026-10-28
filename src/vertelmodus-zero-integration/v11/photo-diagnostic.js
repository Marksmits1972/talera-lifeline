(function(){
  if(new URL(location.href).searchParams.get('photo_test')==='raw'){
    document.documentElement.classList.add('talera-v11-raw-photo');
    document.documentElement.dataset.taleraPhotoDiagnostic='raw';
  }else{
    document.documentElement.dataset.taleraPhotoDiagnostic='normal';
  }
})();