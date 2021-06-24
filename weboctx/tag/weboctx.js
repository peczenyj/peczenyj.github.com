// WeboCtx class
function WeboCtx(){
  var extract = function(object, field, fallback) {
    if (object != null && object.hasOwnProperty(field)) {
      return object[field];
    }
    return fallback;
  },
  prepend = function(value, array) {
    var newArray = Array.prototype.slice.call(array);
    newArray.unshift(value);
    return newArray;
  };

  this.push = function(){
      for (var i = 0; i < arguments.length; i++) try {
        if (typeof arguments[i] === "function") {
          var callback = arguments[i].bind(this);
          callback();
        }
      } catch (e) {
        console.log("WeboCtx.push exception",e);
      }
  }

  this.collectURL = function(collectCtxConf){
    var debugMode = extract(collectCtxConf, "debug", false),
      log = function(){
        if(debugMode){
          console.log.apply(console, prepend("[weboCtx/collect]", arguments));
        }
      }

      if (! collectCtxConf) {
        log("skip collect url: missing configuration")
        return
      }

      if (! collectCtxConf.clientID ) {
        log("skip collect url: missing client id");
        return
      }

      var baseURL = "https://dx.frontend-preprod.weborama.com/collect",
        clientID = encodeURIComponent(collectCtxConf.clientID),
        targetURL = extract(collectCtxConf, "targetURL", document.URL),
        urlCollectAPI = baseURL + "?ctx=1&touchpoint=" + clientID +
          "&url=" + encodeURIComponent( targetURL ),
        xhr = new XMLHttpRequest();

      log("connect to", baseURL, "to collect url", targetURL);

      xhr.open('GET', urlCollectAPI, true);

      xhr.onreadystatechange = function () {
        if (this.readyState == xhr.DONE) {
          log("url collect api done with status", this.status);
        }
      }

      xhr.ontimeout = function(){
        log("timeout url collect api: ", baseURL);
      };

      xhr.onerror = function(){
        log("error url collect api: ", baseURL);
      };

      xhr.send(null);
  }

  this.fetchContextualProfile = function(weboCtxConf){
    var debugMode = extract(weboCtxConf, "debug", false),
      log = function(){
        if(debugMode){
          console.log.apply(console, prepend("[weboCtx/fetch]", arguments));
        }
      },
      handleGlobalVariable = function(weboCtxProfile, useGlobalVariable, defaultGlobalVariableName){
        var target = defaultGlobalVariableName;
        if(typeof useGlobalVariable === "string"){
          target = useGlobalVariable
        }
        log("set profile on global variable window.", target);
        window[target] = weboCtxProfile;
      },
      handleSetTargeting = function(weboCtxProfile) {
        window.googletag = window.googletag || {cmd: []};
        googletag.cmd.push(function() {
          for(var key in weboCtxProfile){
            var value = weboCtxProfile[key];
            log("setTargeting on page level, key: ", key, ", value: ", value);
            googletag.pubads().setTargeting(key, value);
          }
        });
      };

    if (! weboCtxConf) {
      log("skip fetch contextual data: missing configuration")
      return
    }

    if (! weboCtxConf.token ) {
      log("skip fetch contextual data: missing token");
      return
    }

    var baseURL = "https://ctx.weborama.com/api/profile",
      defaultGlobalVariableName = "weboCtxProfile",
      token = encodeURIComponent(weboCtxConf.token),
      targetURL = extract(weboCtxConf, "targetURL", document.URL),
      timeout = extract(weboCtxConf, "timeout", 200),
      gamTargetingWeboCtxKey = extract(weboCtxConf, "gamTargetingWeboCtxKey", "webo_ctx"),
      gamTargetingWeboDSKey = extract(weboCtxConf, "gamTargetingWeboDSKey", "webo_ds"),
      defaultProfile = extract(weboCtxConf, "defaultProfile", {}),
      useGlobalVariable = extract(weboCtxConf, "useGlobalVariable", true),
      setTargeting = extract(weboCtxConf, "setTargeting", false),
      callback = weboCtxConf.callback,
      urlProfileAPI = baseURL + "?token=" + token + "&url=" + encodeURIComponent( targetURL ),
      xhr = new XMLHttpRequest();

    log("connect to", baseURL," to fetch contextual profile of url", targetURL);

    xhr.open('GET', urlProfileAPI, true);

    if (timeout > 0){
      xhr.timeout = timeout;
    }

    xhr.onreadystatechange = function () {
      if (this.readyState == xhr.DONE) {
        var weboCtxProfile = defaultProfile;

        if (this.status == 200) {
          var data = {};

          try {
            data = JSON.parse( this.responseText ) || {};
          } catch(e) {
            log("unable to parse api response", this.responseText, e);
          }

          if(data.hasOwnProperty("webo_ctx")){
            weboCtxProfile[gamTargetingWeboCtxKey] = data["webo_ctx"];
          }

          if(data.hasOwnProperty("webo_ds")){
            var weboDS = data["webo_ds"];
            if(weboCtxProfile.hasOwnProperty(gamTargetingWeboDSKey) && weboCtxProfile[gamTargetingWeboDSKey].length > 0){
              var old = weboCtxProfile[gamTargetingWeboDSKey];
              weboCtxProfile[gamTargetingWeboDSKey] = old.concat(weboDS)
            } else {
              weboCtxProfile[gamTargetingWeboDSKey] = weboDS;
            }
          }

          log("contextual api: success", weboCtxProfile);
        } else {
          log("contextual api: unexpected status code ", this.status, " use default profile");
        }

        if (!! useGlobalVariable){
          handleGlobalVariable(weboCtxProfile, useGlobalVariable, defaultGlobalVariableName);
        }

        if (!! setTargeting){
          handleSetTargeting(weboCtxProfile);
        }

        if(typeof callback === 'function'){
          log("send profile to callback");
          callback(weboCtxProfile);
        }
      }
    };

    xhr.ontimeout = function(){
      log("timeout contextual api: ", baseURL);
    };

    xhr.onerror = function(){
      log("error contextual api: ", baseURL);
    };

    xhr.send(null);
  }
}
// execute callbacks registered before the load of this class
var _old_weboCtx = window.weboCtx || [];
window.weboCtx = new WeboCtx();
window.weboCtx.push.apply(window.weboCtx, _old_weboCtx);
// END WeboCtx class
