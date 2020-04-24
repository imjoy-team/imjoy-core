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

export { version } from "../package.json";

export class ImJoy {
  constructor({
    imjoy_api = null,
    event_bus = null,
    client_id = null,
    config_db = null,
    show_message_callback = null,
    update_ui_callback = null,
    add_window_callback = null,
    jailed_asset_url = null,
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
    this.update_ui_callback = update_ui_callback || function() {};
    this.show_message_callback =
      show_message_callback ||
      async function(msg) {
        console.log("show message: ", msg);
      };
    this.add_window_callback =
      add_window_callback ||
      async function(w) {
        console.log("add window: ", w);
      };

    this.em = new EngineManager({
      event_bus: this.event_bus,
      config_db: this.config_db,
      show_message_callback: this.show_message_callback,
      client_id: this.client_id,
    });

    this.wm = new WindowManager({
      event_bus: this.event_bus,
      show_message_callback: this.show_message_callback,
      add_window_callback: this.add_window_callback,
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
      show_message_callback: this.show_message_callback,
      update_ui_callback: this.update_ui_callback,
      jailed_asset_url: jailed_asset_url,
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
      this.show_message_callback(
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

export async function loadImJoyPluginAPI(config) {
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
}
