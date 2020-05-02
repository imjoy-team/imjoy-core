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
// 3) base_url, the url for loading the core library
export function loadImJoyCore(config) {
  config = config || {};
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      var baseUrl = config.base_url;
      if (!baseUrl) {
        const version = config.version || "latest";
        baseUrl = `https://cdn.jsdelivr.net/npm/imjoy-core@${version}/dist/`;
      }
      if (config.debug) {
        await _injectScript(baseUrl + "imjoy-core.js");
      } else {
        await _injectScript(baseUrl + "imjoy-core.min.js");
      }
      // eslint-disable-next-line no-undef
      if (typeof define === "function" && define.amd)
        eval("require")(["imjoyCore"], resolve);
      else if (window["imjoyCore"]) resolve(window["imjoyCore"]);
      else reject("Failed to import imjoy-core.");
    } catch (e) {
      reject(e);
    }
  });
}
const _rpc_registry = {};
const _rpc_api_versions = {
  "0.2.0": { from: "0.1.10", to: "latest", skips: [] },
};

// specify an api version and this function will return the actual imjoy-rpc version
// if you set latestOnly to true, then it returns always the latest for the api version
// otherwise, it will try to find a compatible version in the cached version.
function findRPCVersionByAPIVersion(apiVersion, latestOnly) {
  if (!apiVersion || !apiVersion.includes(".")) return;
  let cached = Object.keys(_rpc_registry);
  if (_rpc_api_versions[apiVersion]) {
    if (cached.length <= 0 || latestOnly) {
      return _rpc_api_versions[apiVersion].to;
    }
    // see if we can find a compatible version in the cache
    // sort the cached version
    cached = (f => f(f(cached, 1).sort(), -1))((cached, v) =>
      cached.map(a => a.replace(/\d+/g, n => +n + v * 100000))
    );
    for (let c of cached.reverse()) {
      if (_rpc_registry[c].API_VERSION === apiVersion) return c;
    }
    return _rpc_api_versions[apiVersion].to;
  } else {
    return null;
  }
}
// Load the script for a plugin to communicate with imjoy-rpc
// This should only be called when the window is inside the iframe
// it support the following options:
// 1) version, you can specify a specific version of the imjoy-rpc,
// for example `version: "0.11.13"` or `version: "latest"`
// 2) api_version, specify the api version of the imjoy-rpc
// 3) debug, by default, the minified version will be used,
// if debug==true, the full version will be served
// 4) base_url, the url for loading the rpc library
export function loadImJoyRPC(config) {
  config = config || {};
  return new Promise((resolve, reject) => {
    var baseUrl = config.base_url;
    let version = config.version;
    if (!baseUrl) {
      if (config.version) {
        baseUrl = `https://cdn.jsdelivr.net/npm/imjoy-rpc@${
          config.version
        }/dist/`;
      } else {
        if (config.api_version) {
          // find the latest version for this api_version
          version = findRPCVersionByAPIVersion(config.api_version, true);
          if (version) {
            baseUrl = `https://cdn.jsdelivr.net/npm/imjoy-rpc@${version}/dist/`;
          } else {
            reject(
              Error(
                `Cannot find a version of imjoy-rpc that supports api v${
                  config.api_version
                }`
              )
            );
            return;
          }
        } else {
          baseUrl = `https://cdn.jsdelivr.net/npm/imjoy-rpc@latest/dist/`;
          version = "latest";
          console.info(`Using imjoy-rpc library from ${baseUrl}.`);
        }
      }
    }

    if (version && _rpc_registry[version]) {
      console.info(`Using cached imjoy-rpc library v${version}.`);
      resolve(_rpc_registry[version]);
      return;
    }

    let rpc_url = baseUrl + "imjoy-rpc.min.js";
    if (config.debug) {
      rpc_url = baseUrl + "imjoy-rpc.js";
    }
    function checkAndCacheLib(imjoyRPC) {
      if (version && version !== "latest" && version !== imjoyRPC.VERSION) {
        throw new Error(
          `imjoy-rpc version mismatch ${version} != ${imjoyRPC.VERSION}`
        );
      }
      if (config.api_version && config.api_version !== imjoyRPC.API_VERSION) {
        throw new Error(
          `imjoy-rpc api version mismatch ${config.api_version} != ${
            imjoyRPC.API_VERSION
          }`
        );
      }
      _rpc_registry[imjoyRPC.VERSION] = imjoyRPC;
    }
    _injectScript(rpc_url)
      .then(() => {
        // eslint-disable-next-line no-undef
        if (typeof define === "function" && define.amd)
          eval("require")(["imjoyRPC"], imjoyRPC => {
            try {
              checkAndCacheLib(imjoyRPC);
              resolve(imjoyRPC);
            } catch (e) {
              reject(e);
            }
          });
        else if (window["imjoyRPC"]) {
          const imjoyRPC = window.imjoyRPC;
          delete window.imjoyRPC;
          try {
            checkAndCacheLib(imjoyRPC);
            resolve(imjoyRPC);
          } catch (e) {
            reject(e);
          }
        } else {
          reject("Failed to import imjoy-rpc.");
          return;
        }
      })
      .catch(reject);
  });
}
