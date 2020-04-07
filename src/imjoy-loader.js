(function() {
  var _parts = document.currentScript.src.split("/");
  var scriptBaseUrl = _parts.slice(0, _parts.length - 1).join("/") + "/";
  function _inIframe() {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }
  function _injectScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.addEventListener("load", resolve);
      script.addEventListener("error", () => {
        document.head.removeChild(script);
        reject("Error loading script.");
      });
      script.addEventListener("abort", () => reject("Script loading aborted."));
      document.head.appendChild(script);
    });
  }

  // Load the imjoy core script
  // it support the following options:
  // 1) version, you can specify a specific version of the core,
  // for example `version: "0.11.13"` or `version: "latest"`
  // 2) debug, by default, the minified version will be used,
  // if debug==true, the full version will be served
  window.loadImJoyCore = async function(config) {
    var baseUrl;
    config = config || {};
    if (config.version) {
      baseUrl = `https://cdn.jsdelivr.net/npm/imjoy-core@${
        config.version
      }/dist/`;
    } else {
      baseUrl = scriptBaseUrl;
    }
    if (config.debug) {
      await _injectScript(baseUrl + "imjoy-core.js");
    } else {
      await _injectScript(baseUrl + "imjoy-core.min.js");
    }
    return window.imjoyCore;
  };

  // Load the script for a plugin to communicate with a parent frame
  // This should only be called when the window is inside the iframe
  // it support the following options:
  // 1) version, you can specify a specific version of the core,
  // for example `version: "0.11.13"` or `version: "latest"`
  window.loadImJoyPluginAPI = function(config) {
    return new Promise((resolve, reject) => {
      if (_inIframe()) {
        var baseUrl;
        if (config && config.version) {
          baseUrl = `https://cdn.jsdelivr.net/npm/imjoy-core@${
            config.version
          }/dist/`;
        } else {
          baseUrl = scriptBaseUrl;
        }
        _injectScript(baseUrl + "static/jailed/_frame.js")
          .then(() => {
            window.addEventListener("imjoy_api_ready", e => {
              // imjoy plugin api
              resolve(e.detail);
            });
          })
          .catch(reject);
      } else {
        reject(
          new Error("The plugins script can only be used inside an iframe.")
        );
      }
    });
  };
})();
