// register tcf v1/2 apis
(function() {
  if (typeof window.__tcfapi === 'function') {
    return;
  }
  if (typeof window.__cmp === 'function') {
    return;
  }

  var locateFrame = function(frameName) {
    var frame = window,
      cmpFrame = null;
    while (!cmpFrame) {
      try {
        if (frame.frames[frameName]) {
          cmpFrame = frame;
        }
      } catch (e) {}
      if (frame === window.top) break;
      frame = frame.parent;
    }
    return cmpFrame;
  };

  var cmpFrame, returnFieldName, cmpCallbacks = {};
  if (cmpFrame = locateFrame('__tcfapiLocator')) {
    returnFieldName = '__tcfapiReturn';
    window.__tcfapi = function(cmd, version, callback, arg) {
      var callId = Math.random() + "";
      var msg = {
        __tcfapiCall: {
          command: cmd,
          parameter: arg,
          version: version,
          callId: callId
        }
      };

      cmpCallbacks[callId] = callback;
      cmpFrame.postMessage(msg, '*');
    };
  } else if (cmpFrame = locateFrame('__cmpLocator')) {
    returnFieldName = '__cmpReturn';
    window.__cmp = function(cmd, arg, callback) {
      var callId = Math.random() + "";
      var msg = {
        __cmpCall: {
          command: cmd,
          parameter: arg,
          callId: callId
        }
      };

      cmpCallbacks[callId] = callback;
      cmpFrame.postMessage(msg, '*');
    };
  } else {
    // nothing to do
    return
  }

  // add event listener message
  var postMessageHandler = function(event) {
    var json = {};
    try {
      json = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
    } catch (ignore) {}
    var payload = json[returnFieldName];
    if (payload) {
      if (typeof cmpCallbacks[payload.callId] === 'function') {
        cmpCallbacks[payload.callId](payload.returnValue, payload.success);
        delete cmpCallbacks[payload.callId];
      }
    }
  };

  window.addEventListener('message', postMessageHandler, false);
}());

var Utils = {
  gdpr_params: null,
  areCookiesEnabled: function() {
    var cookieEnabled = (navigator.cookieEnabled) ? true : false,
      ua = navigator.userAgent.toLowerCase(),
      isIE = (ua.indexOf('msie') !== -1 || ua.indexOf('trident') !== -1);

    // try to set a test cookie if we can't see any cookies and we're using
    // either a browser that doesn't support navigator.cookieEnabled
    // or IE (which always returns true for navigator.cookieEnabled)
    if ((navigator.cookieEnabled === undefined) || isIE) {
      document.cookie = "__wtestcookie";
      cookieEnabled = (document.cookie.indexOf("__wtestcookie") !== -1) ? true : false;
    }
    return cookieEnabled;
  },
  writeTrackerPIXEL: function(trackerUrl) {
    this.decorateURL(trackerUrl, function(trackerUrl) {
      var i = new Image(1, 1);
      i.src = trackerUrl;
      i.onload = function() {
        return 1;
      }
    });
  },
  writeTrackerIFRAME: function(trackerUrl) {
    this.decorateURL(trackerUrl, function(trackerUrl) {
      var i = document.createElement('iframe');
      i.setAttribute('width', 1);
      i.setAttribute('height', 1);
      i.setAttribute('frameborder', 0);
      i.setAttribute('style', 'border:0px');
      i.setAttribute('src', trackerUrl);
      try {
        document.body.appendChild(i);
      } catch (e) {}
    });
  },
  writeTrackerJAVASCRIPT: function(trackerUrl) {
    this.decorateURL(trackerUrl, function(trackerUrl) {
      if (trackerUrl.indexOf('%%User_ID%%') >= 0) {
        userID = document.cookie.match("AFFICHE_W=([^!_][^;]*)(;|$)")
        trackerUrl = trackerUrl.replace('%%User_ID%%', userID[1])
      }
      var g = document.createElement('script');
      g.type = 'text/javascript';
      g.src = trackerUrl;
      var s = document.getElementsByTagName('script')[0];
      s.parentNode.insertBefore(g, s);
    });
  },
  writeTrackerPixelsWithCapping: function(extra, milliseconds, modulo) {
    if (milliseconds % modulo == 0) {
      for (var trackerIncrement = 0; trackerIncrement < extra.length; trackerIncrement++) {
        var trackerUrl = extra[trackerIncrement];
        this.writeTrackerPIXEL(trackerUrl);
      }
    }
  },
  callTrackers: function(today) {
    var isCookieSet,
      year,
      expiryDate,
      cookieLifetime = Config.cookieLifetime || 7, // cookieLifetime is in days
      trackerIncrement,
      i;

    // try to detect if the user has already been synced on this domain using a cookie.
    isCookieSet = document.cookie.match('(^|;) ?' + Config.cookieName + '=([^;]*)(;|$)');

    // if the cookie is set or cookies are not supported, leave the function. (stop propagation)
    if (isCookieSet || this.areCookiesEnabled() === false) {
      return;
    }

    // calculate expiry date
    year = today.getYear() < 2000 ? today.getYear() + 1900 : today.getYear();
    expiryDate = new Date(year, today.getMonth(), today.getDate() + cookieLifetime).toGMTString();

    // set the cookie if it was not set before.
    for (i in Config.cookies) {
      document.cookie = Config.cookies[i] + '=1; expires=' + expiryDate + '; path=/; SameSite=None; Secure';
    }

    // call ssl trackers
    var trackers = Config.trackersSSL;
    if (trackers['PIXEL'] !== undefined && trackers['PIXEL'] !== null) {
      for (trackerIncrement = 0; trackerIncrement < trackers['PIXEL'].length; trackerIncrement++) {
        this.writeTrackerPIXEL(trackers['PIXEL'][trackerIncrement]);
      }
    }

    if (trackers['IFRAME'] !== undefined && trackers['IFRAME'] !== null) {
      for (trackerIncrement = 0; trackerIncrement < trackers['IFRAME'].length; trackerIncrement++) {
        Utils.writeTrackerIFRAME(trackers['IFRAME'][trackerIncrement]);
      }
    }

    if (trackers['JAVASCRIPT'] !== undefined && trackers['JAVASCRIPT'] !== null) {
      for (trackerIncrement = 0; trackerIncrement < trackers['JAVASCRIPT'].length; trackerIncrement++) {
        Utils.writeTrackerJAVASCRIPT(trackers['JAVASCRIPT'][trackerIncrement]);
      }
    }

    if (trackers['EXTRA'] !== undefined && trackers['EXTRA'] !== null) {
      this.writeTrackerPixelsWithCapping(trackers['EXTRA'], today.getMilliseconds(), 100);
    }
  },
  isUserIDSet: function() {
    var userID, firstChar;

    userID = document.cookie.match("AFFICHE_W=([^;]*)(;|$)");
    if (userID === null) {
      return null;
    }
    firstChar = userID[1].substr(0, 1);
    if (firstChar === "!" || firstChar === "_") {
      return false;
    } else {
      return true;
    }
  },

  run: function(retries) {
    var obj = this,
      isUserIDSet = this.isUserIDSet();
    if (isUserIDSet === true) {
      this.callTrackers(new Date());
      return;
    }
    if (isUserIDSet === null) {
      retries -= 1;
      if (retries > 0) {
        window.setTimeout(function() {
          obj.run(retries)
        }, 500);
        return;
      } else {
        if (document.URL.indexOf('loop=1') == -1) {
          this.decorateURL(document.URL, this.tryToRedirect)
          return;
        }
      }
    }
  },
  appendGDPRParams: function(url) {
    if (url.indexOf('google') > 0) {
      return url;
    }
    var sep = (url.indexOf('?') === -1) ? '?' : '&';
    if (this.gdpr_params === null) {
      var params = [],
        vars = document.location.search.substring(1).split('&');

      for (var i = 0; i < vars.length; i++) {
        var pair = vars[i];
        if (pair.indexOf("gdpr") == 0) {
          params.push(pair)
        }
      }

      this.gdpr_params = params.join('&');
    }
    return url + sep + this.gdpr_params;
  },
  tryToRedirect: function(url) {
    var sep = ((url.indexOf('?') == -1) ? "?" : "&"),
      target = url.replace(/^http:/, "https:") + sep + "loop=1";
    window.location.replace("https://rd.frontend.weborama.fr/rd?key=synchro&url=" + encodeURIComponent(target));
  },
  extractGDPRParameters: function(url) {
    var questionMark = url.indexOf('?');
    if (questionMark === -1) {
      return null;
    }
    var params = [],
      vars = url.substring(questionMark + 1).split('&');
    for (var i = 0; i < vars.length; i++) {
      var pair = vars[i];
      if (pair.indexOf("gdpr") == 0) {
        if (params == null) {
          params = [];
        }
        params.push(pair)
      }
    }

    return params;
  },
  decorateURL: function(url, callback) {
    // 1. check gdpr parameters in url, if any GO
    var gdprParams = this.extractGDPRParameters(url);
    // 2. check gdpr parameters in document.location, if any COPY
    if (gdprParams == null) {
      gdprParams = this.extractGDPRParameters(document.location.search);
    }

    if (gdprParams == null) {
      // 3. check if cmp v2 and integrate async (!)
      if (typeof window.__tcfapi == 'function') {
        window.__tcfapi('getTCData', 2, function(response, success) {
          var checkPurposeIDs = function(response, purposeIDs) {
            for (i in purposeIDs) {
              if (purposeIDs.hasOwnProperty(i)) {
                if (!response.purpose.consents[purposeIDs[i]]) {
                  return false;
                }
              }
            }
            return true;
          };

          url += ((url.indexOf("?") == -1) ? "?" : "&");
          if (!success) {
            url += "gdpr=1&gdpr_cmp_failure=1";
          } else if (!response['gdprApplies']) {
            url += "gdpr=0";
          } else if (response.eventStatus !== 'useractioncomplete' && !checkPurposeIDs(response, [1, 3, 4])) {
            window.__tcfapi('addEventListener', 2, function(response, success) {
              if (success && response != null) {
                if (response.eventStatus == 'useractioncomplete') {
                  window.__tcfapi('removeEventListener', 2, function() {}, response.listenerId);

                  url += "gdpr=1&gdpr_consent=" + (response['tcString'] || "");

                  callback(url);
                }
              }
            });

            return;
          } else {
            url += "gdpr=1&gdpr_consent=" + (response['tcString'] || "");
          }

          callback(url);
        });
        return;
        // 4. check if cmp v1 and integrate async (!)
      } else if (typeof window.__cmp == 'function') {
        window.__cmp('getConsentData', null, function(response, success) {
          url += ((url.indexOf("?") == -1) ? "?" : "&");
          if (!success) {
            url += "gdpr=1&gdpr_cmp_failure=1";
          } else if (response['gdprApplies']) {
            url += "gdpr=1&gdpr_consent=" + (response['consentData'] || "");
          } else {
            url += "gdpr=0"
          }
          callback(url)
        });
        return;
      }
    } else {
      var sep = ((url.indexOf('?') == -1) ? "?" : "&");
      url += sep + gdprParams.join('&')
    }

    // fallback: call directly
    callback(url);
  }
};
