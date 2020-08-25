import { PluginManager } from "./pluginManager.js";
import { WindowManager } from "./windowManager.js";

import { EngineManager } from "./engineManager.js";

import { FileManager } from "./fileManager.js";

import PouchDB from "pouchdb-browser";

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
    debug = false,
  }) {
    this.config_db =
      config_db ||
      new PouchDB("imjoy_config", {
        revs_limit: 2,
        auto_compaction: true,
      });

    this.event_bus = event_bus || Minibus.create();
    this.client_id = client_id || "imjoy_web_" + randId();
    this.imjoy_api = imjoy_api || {};
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
    });
  }

  async init() {
    await this.fm.init();
    await this.pm.init();
    await this.pm.loadWorkspaceList();
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
  }

  async start(config) {
    config = config || {};
    await this.init();
    if (config.workspace) {
      await this.pm.loadWorkspace(config.workspace);
      await this.pm.reloadPlugins();
    }
  }

  async destroy() {
    this.pm.destroy();
    this.em.destroy();
  }
}
