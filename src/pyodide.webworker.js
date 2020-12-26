// webworker for running imjoy plugin with pyodide
self.languagePluginUrl = "https://cdn.jsdelivr.net/pyodide/v0.16.1/full/";
importScripts("https://cdn.jsdelivr.net/pyodide/v0.16.1/full/pyodide.js");

const src = `
from imjoy import api
api.init()
`;

const startupScript = `
import js
import micropip
import sys
import traceback

def setup_imjoy(_):
    try:
        # map imjoy_rpc to imjoy
        import imjoy_rpc
        sys.modules["imjoy"] = imjoy_rpc
        js.__resolve(_)
    except Exception as e:
        js.__reject(traceback.format_exc())

micropip.install(["imjoy-rpc>=0.2.69"]).then(setup_imjoy).catch(js.__reject)
`;

function installPackage() {
  return new Promise((resolve, reject) => {
    self.__resolve = resolve;
    self.__reject = reject;
    self.pyodide.runPython(startupScript);
  });
}

languagePluginLoader.then(() => {
  self.pyodide.loadPackage(["micropip"]).then(async () => {
    await installPackage();
    self.pyodide.runPython(src);
  });
});
