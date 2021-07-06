import { PluginManager } from "./pluginManager.js";
import { WindowManager } from "./windowManager.js";

import { EngineManager } from "./engineManager.js";

import { FileManager } from "./fileManager.js";
import { DynamicPlugin } from "./jailedPlugin.js";
import PouchDB from "pouchdb-browser";
import { imjoyRPC } from "imjoy-rpc";
import { randId } from "./utils.js";

import Minibus from "minibus";

export { Joy } from "./joy";
export { ajv } from "./api";

import * as _utils from "./utils.js";
export const utils = _utils;

export { version as VERSION } from "../package.json";

export class ImJoy {
  constructor({
    imjoy_api = null,
    event_bus = null,
    client_id = null,
    config_db = null,
    default_base_frame = null,
    default_rpc_base_url = null,
    expose_api = false,
    debug = false,
    flags = [],
  }) {
    this.config_db =
      config_db ||
      new PouchDB("imjoy_config", {
        revs_limit: 2,
        auto_compaction: true,
      });
    this.expose_api = expose_api;
    this.event_bus = event_bus || Minibus.create();
    this.client_id = client_id || "imjoy_web_" + randId();
    this.imjoy_api = imjoy_api || {};
    this.flags = flags;
    this.em = new EngineManager({
      event_bus: this.event_bus,
      config_db: this.config_db,
      client_id: this.client_id,
    });

    this.wm = new WindowManager({
      event_bus: this.event_bus,
    });

    this.fm = new FileManager({
      event_bus: this.event_bus,
    });

    this.pm = new PluginManager({
      event_bus: this.event_bus,
      config_db: this.config_db,
      engine_manager: this.em,
      window_manager: this.wm,
      file_manager: this.fm,
      imjoy_api: this.imjoy_api,
      default_base_frame: default_base_frame,
      default_rpc_base_url: default_rpc_base_url,
      debug: debug,
      flags: this.flags,
    });
  }

  async init() {
    await this.fm.init();
    await this.pm.init();
    this.root_plugin = this.pm.root_plugin;
    if (this.root_plugin) this.api = this.pm.root_plugin.getBoundInterface();
    try {
      await this.pm.loadWorkspaceList();
    } catch (e) {
      console.error(e);
      this.event_bus.emit(
        "show_message",
        "Failed to load the workspace list: " + e.toString()
      );
    }

    try {
      await this.em.init();
      console.log("Successfully initialized the engine manager.");
    } catch (e) {
      console.error(e);
      this.event_bus.emit(
        "show_message",
        "Failed to initialize the engine manager: " + e.toString()
      );
    }
    // inside an iframe
    if (this.expose_api && window.self !== window.top) {
      // here we don't add await so we won't stop the loading of ImJoy
      this.exportAPI()
    }
  }

  async exportAPI(){
    const api = await imjoyRPC.setupRPC({ name: "ImJoy" });
      const root_plugin_config = {
        _id: "root",
        name: "ImJoy",
        type: "window",
        ui: null,
        tag: null,
        inputs: null,
        outputs: null,
        docs: "https://imjoy.io/docs/",
        attachments: [],
      };
      const imjoy_api = this.pm.imjoy_api;
      const wrapped_api = {};
      const rootPlugin = new DynamicPlugin(
        root_plugin_config,
        imjoy_api,
        null,
        true
      );
      for (let k in imjoy_api) {
        if (typeof imjoy_api[k] === "function") {
          wrapped_api[k] = function() {
            return imjoy_api[k].apply(
              imjoy_api,
              [rootPlugin].concat(Array.prototype.slice.call(arguments))
            );
          };
        } else if (typeof imjoy_api[k] === "object") {
          wrapped_api[k] = {};
          for (let u in imjoy_api[k]) {
            wrapped_api[k][u] = function() {
              return imjoy_api[k][u].apply(
                imjoy_api,
                [rootPlugin].concat(Array.prototype.slice.call(arguments))
              );
            };
          }
        }
      }
      wrapped_api.setup = function() {
        api.log("ImJoy App loaded successfully.");
      };

      // Note: we need to overwrite this run function here, otherwise, api.run function will be called
      // we need to mask out api.run for the first run to make sure the window plugin runs
      // then we can restore the actual api.run
      let firstRun = true;
      wrapped_api.run = function() {
        if (firstRun) {
          firstRun = false;
          return;
        }
        return imjoy_api.run.apply(
          imjoy_api,
          [rootPlugin].concat(Array.prototype.slice.call(arguments))
        );
      };
      api.export(wrapped_api);
  }

  async start(config) {
    config = config || {};
    await this.init();
    if (config.workspace) {
      await this.pm.loadWorkspace(config.workspace);
      await this.pm.reloadPlugins();
    } else {
      this.pm.reloadInternalPlugins(true);
    }
  }

  async destroy() {
    this.pm.destroy();
    this.em.destroy();
  }
}
