window.googletag = window.googletag || {cmd: []};

googletag.cmd.push(function() {
  console.log("set targeting via wam2gam.standalone.js");
  var data = JSON.parse(localStorage.getItem("webo_gam_targeting")) || {},
  targeting = data["targeting"];
  for(var key in targeting){
    googletag.pubads().setTargeting(key, targeting[key]);
  }
});

console.log("finish include wam2gam.standalone.js");
