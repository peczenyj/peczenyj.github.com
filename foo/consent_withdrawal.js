// WeboFirstPartyCookieManager class
/**
 * @typedef WeboFirstPartyCookieManagerConf
 * @property {string} cookieName first party id cookie name, by default it is "AFFICHE_C"
 * @property {number} cookieTTL cookie property expiration date, by default it is 182 days
 * @property {string} cookiePath the cookie property path, by default it is "/"
 * @property {string} cookieDomain the cookie property domain, by default it is "auto" and it triggers the minimum cookie domain auto detection
 * @property {bool} cookieSecure the cookie property secure, by default it is false
 * @property {string} cookieSameSite the cookie property SameSite, by default it is "Strict"
 * @property {bool} shouldRefreshCookie if true, we update the cookie expiration date on each read. by default it is false
 * @property {string} firstPartyIDQueryArg used to customize the first party id query argument key when send data to Weborama. by default it is "fpid"
 * @property {bool} cookieless if true, we signalize to Weborama to ignore third party cookies. by default it is false.
 * @property {string?} useOptOutCookie if present, we will check if a cookie with this name exists and we will consider it an opt out. by default this is undefined.
 */
/**
 * WeboFirstPartyCookieManager constructor
 * @constructor
 * @param {WeboFirstPartyCookieManagerConf} c
 */
// eslint-disable-next-line no-unused-vars
function WeboFirstPartyCookieManager(c) {
  /** @type {WeboFirstPartyCookieManagerConf} */
  const conf = Object.assign(
      {},
      {
        cookieName: "AFFICHE_C",
        cookieTTL: 182 * 24 * 60 * 60 * 1000,
        cookiePath: "/",
        cookieDomain: "auto",
        cookieSecure: false,
        cookieSameSite: "Strict",
        shouldRefreshCookie: false,
        firstPartyIDQueryArg: "fpid",
        cookieless: false,
        useOptOutCookie: undefined,
      },
      c
    ),
    checkCookieEnabled = function () {
      let enabled = navigator.cookieEnabled ? true : false;
      const ua = navigator.userAgent.toLowerCase(),
        isIE = ua.indexOf("msie") !== -1 || ua.indexOf("trident") !== -1,
        testName = "__wtestcookie";

      if (navigator.cookieEnabled === undefined || isIE) {
        document.cookie = testName;
        enabled = document.cookie.indexOf(testName) !== -1 ? true : false;
      }

      return enabled;
    },
    randomBounded = function (bound) {
      return Math.floor(Math.random() * bound);
    },
    dateZero = new Date(0),
    setRawCookie = function (
      name,
      value,
      expires,
      path,
      domain,
      secure,
      sameSite
    ) {
      const c =
        name +
        "=" +
        value +
        (expires ? "; expires=" + expires.toGMTString() : "") +
        (path ? "; path=" + path : "") +
        (domain ? "; domain=" + domain : "") +
        (secure ? "; secure" : "") +
        (sameSite ? "; SameSite=" + sameSite : "");
      document.cookie = c;
    },
    getTopDomain = function (path, secure, sameSite) {
      const baseName = "__wtest_top_domain";
      let testName = baseName,
        hostname = document.location.hostname.split(".");

      while (document.cookie.indexOf(testName) > -1) {
        testName = baseName + randomBounded(100000);
      }

      for (let i = hostname.length - 2; i >= 0; i--) {
        let h = hostname.slice(i).join(".");
        // name, value, expires, path, domain, secure, sameSite
        setRawCookie(testName, 1, null, path, h, secure, sameSite);
        if (document.cookie.indexOf(testName) > -1) {
          // We were able to store a cookie! This must be it
          setRawCookie(testName, "", dateZero, path, h, secure, sameSite);
          return h;
        }
      }
    };

  let topLevelDomain = null;

  const setCookie = function (
      name,
      value,
      expires,
      path,
      domain,
      secure,
      sameSite
    ) {
      if (domain === "auto") {
        if (topLevelDomain == null) {
          topLevelDomain = getTopDomain(path, secure, sameSite);
        }
        domain = topLevelDomain;
      }
      setRawCookie(name, value, expires, path, domain, secure, sameSite);
    },
    getCookie = (cookieName, flags, defaultValue) => {
      const cookieValue = document.cookie.match(
        new RegExp(
          `(?:(?:^|.*; *)${cookieName} *= *([^;]*).*$)|^.*$`,
          flags || ""
        )
      )?.[1];

      return cookieValue ? decodeURIComponent(cookieValue) : defaultValue;
    },
    getCookieValue = (cookieName) => getCookie(cookieName, "", undefined),
    hasCookie = function (cookieName) {
      return typeof getCookieValue(cookieName) != "undefined";
    },
    hasOptoutCookie = function () {
      return conf.useOptOutCookie && hasCookie(conf.useOptOutCookie);
    },
    isCookieEnabled = checkCookieEnabled(), // cache this once
    allowedToReadCookies = function () {
      return isCookieEnabled && !hasOptoutCookie(); // always check
    },
    setFirstPartyCookie = function (value) {
      const expires = new Date();
      expires.setTime(expires.getTime() + conf.cookieTTL);
      setCookie(
        conf.cookieName,
        value,
        expires,
        conf.cookiePath,
        conf.cookieDomain,
        conf.cookieSecure,
        conf.cookieSameSite
      );
    },
    deleteFirstPartyCookie = function () {
      setCookie(
        conf.cookieName,
        "",
        dateZero,
        conf.cookiePath,
        conf.cookieDomain,
        conf.cookieSecure,
        conf.cookieSameSite
      );
    },
    getFirstPartyCookie = function () {
      const cookieValue = getCookieValue(conf.cookieName);
      if (cookieValue == null) {
        return null; // not found
      }

      if (cookieValue.length != 14) {
        deleteFirstPartyCookie();
        return null;
      }

      const firstChar = cookieValue.charAt(0);
      if (firstChar == "@" || firstChar == "!" || firstChar == "_") {
        deleteFirstPartyCookie();
        return null;
      }

      const invalidChars = new RegExp("[^0-9A-Za-z@-]");
      if (invalidChars.test(cookieValue)) {
        deleteFirstPartyCookie();
        return null;
      }

      return cookieValue;
    },
    generateCookie = function () {
      const data = [];
      let first = randomBounded(256);
      while (first >= 248 && first <= 251) {
        // TODO we can change it using math
        // To avoid generate an @ as first char
        first = randomBounded(256);
      }
      data[0] = first;
      for (let i = 1; i < 8; i++) {
        data[i] = randomBounded(256);
      }
      data[8] = first;

      const strData = String.fromCharCode.apply(null, data);
      const output = btoa(strData).replaceAll("+", "@").replaceAll("/", "-");

      return (
        output + // suffix extra two chars in cookie 12+2
        String.fromCharCode(randomBounded(9) + 49) +
        String.fromCharCode(randomBounded(10) + 48)
      );
    },
    checkIfURLGoesToWeboramaDomains = function (/** @type {URL} */ url) {
      const regex = /\.weborama(\.(com|fr)|-tech\.ru)$/;

      return regex.test(url.hostname);
    },
    /**
     * can parse url is a polyfill for URL.canParse since not all browsers supports it
     * @param {string} url the url to be validated
     * @returns {boolean} true if can parse url
     */
    canParseURL = function (url) {
      try {
        return !!new URL(url);
      } catch (error) {
        return false;
      }
    };

  /**
   * This method will try to read the first party cookie and return "as is"
   *
   * @returns {string?} first party cookie or null
   */
  this.peekFirstPartyCookie = function () {
    if (!allowedToReadCookies()) {
      return null;
    }

    return getFirstPartyCookie();
  };

  /**
   * This method will try to read the first party cookie and, if not found,
   * will try to create a new one.
   *
   * @returns {string?} first party cookie or null
   */
  this.getFirstPartyCookie = function () {
    let firstPartyCookie = this.peekFirstPartyCookie();

    if (firstPartyCookie == null) {
      firstPartyCookie = generateCookie();

      setFirstPartyCookie(firstPartyCookie);
    } else if (conf.shouldRefreshCookie) {
      setFirstPartyCookie(firstPartyCookie);
    }

    return firstPartyCookie;
  };

  /**
   * This method will execute a callback.
   * Will execute with the following parameters:
   *  - first party cookie (or null)
   *  - allowed to read cookies (boolean)
   *  - cookie domain (string)
   * @param {*} callback
   */
  this.executeCallback = function (callback) {
    const firstPartyCookie = this.getFirstPartyCookie();

    callback(firstPartyCookie, allowedToReadCookies(), conf.cookieDomain);
  };

  /**
   * decorateURL apply first party id on query string if possible.
   * @param {URL | string} url
   * @returns {string}
   */
  this.decorateURL = function (url) {
    if (typeof url === "string") {
      if (!canParseURL(url)) {
        return url;
      }

      url = new URL(url);
    }
    if (!checkIfURLGoesToWeboramaDomains(url)) {
      return url.href;
    }

    const firstPartyCookie = this.getFirstPartyCookie();

    if (firstPartyCookie !== null) {
      url.searchParams.set(conf.firstPartyIDQueryArg, firstPartyCookie);

      if (conf.cookieless) {
        url.searchParams.set("cookieless", 1);
      }
    }

    return url.href;
  };
}


/*
  * This script sends a consent removal request to Weborama's server.
  * It retrieves the wamid from the global window object and the first party cookie,
  * then sends a beacon with the payload to the specified URL.
*/
(function() {
  const wamid = (window.wamid && window.wamid !== 'undefined' && window.wamid !== 'null')
    ? window.wamid
    : null;

  if (!wamid) return;

  const wfpcm = new WeboFirstPartyCookieManager();
  const firstPartyCookie = wfpcm.peekFirstPartyCookie();
  const payload = {
    wamid: String(wamid)
  };

  if (firstPartyCookie) {
    payload.affiche_c = firstPartyCookie;
  }

  let host = window?.wamhost || 'wf.frontend.weborama.fr';
  let url = `https://${host}/consent/withdraw`;
  let data = JSON.stringify(payload);
  navigator.sendBeacon(url, data);
})();
