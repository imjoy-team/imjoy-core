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
  window.loadImJoyCore = function(config) {
    return new Promise(async (resolve, reject) => {
      try {
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
        if (typeof define === "function" && define.amd)
          require(["imjoyCore"], resolve);
        else if (window["imjoyCore"]) resolve(window["imjoyCore"]);
        else reject("Failed to import imjoy-core.");
      } catch (e) {
        reject(e);
      }
    });
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
          baseUrl = `https://cdn.jsdelivr.net/npm/imjoy-rpc@${
            config.version
          }/dist/`;
        } else {
          baseUrl = scriptBaseUrl;
        }
        let rpc_url = baseUrl + "imjoy-rpc.min.js";
        if (config.debug) {
          rpc_url = baseUrl + "imjoy-rpc.js";
        }
        _injectScript(rpc_url)
          .then(() => {
            window.initializeRPC();
            window.addEventListener("imjoy_api_ready", e => {
              // imjoy plugin api
              resolve(e.detail);
            });
          })
          .catch(reject);
      } else {
        reject(
          new Error("ImJoy plugin api can only be used inside an iframe.")
        );
      }
    });
  };

  window.loadImJoyAuto = async function(config) {
    if (_inIframe()) {
      return { mode: "plugin", api: await window.loadImJoyPluginAPI(config) };
    } else {
      return { mode: "core", core: await window.loadImJoyCore(config) };
    }
  };
})();
