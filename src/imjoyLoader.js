(function() {
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
      script.async = true;
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

  function _getScriptUrl() {
    var scripts = document.getElementsByTagName("script");
    var thisScript = scripts[scripts.length - 1];
    var parentNode = thisScript.parentNode;
    var asset_url =
      thisScript.src
        .split("?")[0]
        .split("/")
        .slice(0, -1)
        .join("/") + "/";
    return asset_url;
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
      baseUrl = _getScriptUrl();
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
  window.loadImJoyPluginAPI = async function(config) {
    if (_inIframe()) {
      var baseUrl;
      if (config && config.version) {
        baseUrl = `https://cdn.jsdelivr.net/npm/imjoy-core@${
          config.version
        }/dist/`;
      } else {
        baseUrl = _getScriptUrl();
      }
      await _injectScript(baseUrl + "static/jailed/_frame.js");
    } else {
      throw new Error("The plugins script can only be used inside an iframe.");
    }
    return window.api;
  };
})();
