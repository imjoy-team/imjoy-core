// webworker for running imjoy plugin with pyodide
importScripts("https://cdn.jsdelivr.net/pyodide/v0.17.0/full/pyodide.js");

const src = `
from imjoy import api
api.init()
`;

const startupScript = `
import js
import micropip
import sys
import traceback
import asyncio

async def run():
    try:
        await micropip.install(["werkzeug", "imjoy-rpc"])
        # map imjoy_rpc to imjoy
        import imjoy_rpc
        sys.modules["imjoy"] = imjoy_rpc
        js.__resolve()
    except Exception as e:
        js.__reject(traceback.format_exc())
  
loop = asyncio.get_event_loop()
asyncio.create_task(run())
loop.run_forever()
`;

function installPackage() {
  return new Promise((resolve, reject) => {
    self.__resolve = resolve;
    self.__reject = reject;
    self.pyodide.runPython(startupScript);
  });
}

loadPyodide({
  indexURL: "https://cdn.jsdelivr.net/pyodide/v0.17.0/full/",
}).then(() => {
  self.pyodide.loadPackage(["micropip"]).then(async () => {
    await installPackage();
    self.pyodide.runPython(src);
  });
});
