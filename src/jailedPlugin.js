/**
 * @fileoverview Jailed - safe yet flexible sandbox
 *
 * @license MIT, see http://github.com/imjoy-team/imjoy-core
 * Copyright (c) 2020 ImJoy Team <imjoy.team@gmail.com>
 *
 * @license MIT, see http://github.com/asvd/jailed
 * Copyright (c) 2014 asvd <heliosframework@gmail.com>
 */

import { randId } from "./utils.js";
import { getBackendByType, CONFIG_SCHEMA } from "./api.js";
import { BasicConnection } from "./connection.js";
import { Whenable } from "./utils.js";

import DOMPurify from "dompurify";
import { loadImJoyRPC } from "./imjoyLoader.js";

const JailedConfig = {};
if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  JailedConfig.asset_url = "/";
} else {
  JailedConfig.asset_url = "https://lib.imjoy.io/";
}
/**
 * Initializes the library site for web environment
 */
let _initialized = false;
const initializeJailed = config => {
  if (config) {
    for (let k in config) {
      JailedConfig[k] = config[k];
    }
  }
  // normalize asset_url
  if (!JailedConfig.asset_url.endsWith("/")) {
    JailedConfig.asset_url = JailedConfig.asset_url + "/";
  }
  _initialized = true;
};

function createIframe(id, type, config) {
  var sample = document.createElement("iframe");

  sample.src = config.base_frame;
  sample.sandbox = "";
  sample.frameBorder = "0";
  sample.style.width = "100%";
  sample.style.height = "100%";
  sample.style.margin = "0";
  sample.style.padding = "0";
  sample.style.display = "none";

  const frame = sample.cloneNode(false);
  var perm = [
    "allow-scripts",
    "allow-forms",
    "allow-modals",
    "allow-popups",
    "allow-same-origin",
  ];
  var allows = "";
  if (config.permissions) {
    if (config.permissions.includes("midi") && !allows.includes("midi *;")) {
      allows += "midi *;";
    }
    if (
      config.permissions.includes("geolocation") &&
      !allows.includes("geolocation *;")
    ) {
      allows += "geolocation *;";
    }
    if (
      config.permissions.includes("microphone") &&
      !allows.includes("microphone *;")
    ) {
      allows += "microphone *;";
    }
    if (
      config.permissions.includes("camera") &&
      !allows.includes("camera *;")
    ) {
      allows += "camera *;";
    }
    if (
      config.permissions.includes("encrypted-media") &&
      !allows.includes("encrypted-media *;")
    ) {
      allows += "encrypted-media *;";
    }
    if (config.permissions.includes("full-screen")) {
      frame.allowfullscreen = "";
    }
    if (config.permissions.includes("payment-request")) {
      frame.allowpaymentrequest = "";
    }
  }
  frame.sandbox = perm.join(" ");
  frame.allow = allows;

  if (type !== "window") {
    frame.src =
      frame.src +
      (frame.src.includes("?") ? "&" : "?") +
      "_plugin_type=" +
      type;
  }

  frame.id = "iframe_" + id;
  return frame;
}

/**
 * DynamicPlugin constructor, represents a plugin initialized by a
 * string containing the code to be executed
 *
 * @param {String} code of the plugin
 * @param {Object} _interface to provide to the plugin
 */
class DynamicPlugin {
  constructor(config, _interface, engine, is_proxy, allow_evil) {
    if (!_initialized)
      throw "Please call `initializeJailed()` before using Jailed.";
    this.config = config;
    this.id = config.id || randId();
    this._id = config._id;
    this.name = config.name;
    this.type = config.type;
    this.tag = config.tag;
    this.tags = config.tags;
    this.type = config.type || "web-worker";
    this.initializing = false;
    this.running = false;
    this._log_history = [];
    this._callbacks = config._callbacks || {};
    this._is_proxy = is_proxy;
    this.backend = getBackendByType(this.type);
    this.engine = engine;
    this.allow_evil = allow_evil;

    this._updateUI =
      (_interface && _interface.utils && _interface.utils.$forceUpdate) ||
      function() {};
    if (is_proxy) {
      this._disconnected = false;
    } else {
      this._disconnected = true;
      this._bindInterface(_interface);

      // use the plugin event functions if it doesn't exist (window plugins has their own event functions)
      if (!this._initialInterface.on) this._initialInterface.on = this.on;
      if (!this._initialInterface.off) this._initialInterface.off = this.off;
      if (!this._initialInterface.emit) this._initialInterface.emit = this.emit;

      this._connect();
    }
    this._updateUI();
  }
  /**
   * Bind the first argument of all the interface functions to this plugin
   */
  _bindInterface(_interface) {
    _interface = _interface || {};
    this._initialInterface = { __as_interface__: true };
    // bind this plugin to api functions
    for (var k in _interface) {
      if (Object.prototype.hasOwnProperty.call(_interface, k)) {
        if (typeof _interface[k] === "function") {
          this._initialInterface[k] = _interface[k].bind(null, this);
        } else if (typeof _interface[k] === "object") {
          var utils = {};
          for (var u in _interface[k]) {
            if (Object.prototype.hasOwnProperty.call(_interface[k], u)) {
              if (typeof _interface[k][u] === "function") {
                utils[u] = _interface[k][u].bind(null, this);
              }
            }
          }
          this._initialInterface[k] = utils;
        } else {
          this._initialInterface[k] = _interface[k];
        }
      }
    }
  }
  _setupViaEngine() {
    if (
      this.engine &&
      this.engine._is_evil &&
      this.allow_evil !== "eval is evil"
    ) {
      this._fail.emit("Evil engine is not allowed.");
      this._connection = null;
      this.error("Evil engine is not allowed.");
      this._set_disconnected();
      return;
    }
    if (!this.engine || !this.engine.connected) {
      this._fail.emit("Please connect to the Plugin Engine 🚀.");
      this._connection = null;
      this.error("Please connect to the Plugin Engine 🚀.");
      this._set_disconnected();
      return;
    }
    this.initializing = true;
    this._updateUI();
    const me = this;
    const engine_utils = {
      __as_interface__: true,
      __id__: this.config.id + "_utils",
      terminatePlugin() {
        me.terminate();
      },
      setPluginStatus(status) {
        if (!me._disconnected) {
          me.running = status.running;
          me._updateUI();
        }
      },
    };
    this.engine
      .startPlugin(this.config, this._initialInterface, engine_utils)
      .then(remote => {
        // check if the plugin is terminated during startup
        if (!this.engine) {
          console.warn(
            "Plugin " + this.id + " is ready, but it was termianted."
          );
          if (this.engine && this.engine.killPlugin)
            this.engine.killPlugin({
              id: this.config.id,
              name: this.config.name,
            });
          return;
        }
        this.api = remote;
        this.api.__as_interface__ = true;
        this.api.__id__ = this.id;
        this._disconnected = false;
        this.initializing = false;
        this._updateUI();
        this._connected.emit();
        this.engine.registerPlugin(this);
      })
      .catch(e => {
        this.error(e);
        this._set_disconnected();
      });
  }
  _setupViaIframe() {
    if (!getBackendByType(this.type)) {
      throw `Unsupported backend type (${this.type})`;
    }
    if (!this.config.base_frame) {
      this.config.base_frame = JailedConfig.asset_url + "base_frame.html";
    }
    const _frame = createIframe(this.id, this.type, this.config);
    if (
      this.type === "iframe" ||
      this.type === "window" ||
      this.type === "web-python-window"
    ) {
      let iframe_container = this.config.iframe_container;
      if (typeof iframe_container === "string") {
        iframe_container = document.getElementById(iframe_container);
      }
      if (iframe_container) {
        _frame.style.display = "block";
        iframe_container.appendChild(_frame);
        this.iframe_container = iframe_container;
      } else {
        document.body.appendChild(_frame);
        this.iframe_container = null;
      }
    } else {
      document.body.appendChild(_frame);
    }
    this._connection = new BasicConnection(_frame);
    this.initializing = true;
    this._updateUI();
    this._connection.onInit(async pluginConfig => {
      try {
        pluginConfig = pluginConfig || {};
        if (!CONFIG_SCHEMA(pluginConfig)) {
          const error = CONFIG_SCHEMA.errors;
          console.error(
            "Invalid config: " + pluginConfig.name || "unkown",
            error
          );
          throw error;
        }
        const imjoyRPC = await loadImJoyRPC({
          api_version: pluginConfig.api_version,
        });
        this._rpc = new imjoyRPC.RPC(this._connection);
        this._registerSiteEvents(this._rpc);
        this._rpc.setInterface(this._initialInterface);
        await this._rpc.sendInterface();
        await this._executePlugin();
        this.api = await this._requestRemote();
        this.api.__as_interface__ = true;
        this.api.__id__ = this.id;
        this._disconnected = false;
        this.initializing = false;
        this._updateUI();
        this._connected.emit();
      } catch (e) {
        this._fail.emit(e);
      }
    });
    this._connection.onFailed(e => {
      this._fail.emit(e);
    });

    this._connection.onDisconnect(details => {
      if (details) {
        if (details.success) {
          this.log(details.message);
        } else {
          this.error(details.message);
        }
      }
      this._set_disconnected();
    });
  }
  /**
   * Creates the connection to the plugin site
   */
  _connect() {
    this.api = null;

    this._connected = new Whenable(true);
    this._fail = new Whenable(true);
    this._disconnect = new Whenable(true);

    // binded failure callback
    this._fCb = error => {
      this._fail.emit(error);
      this.disconnect();
      this.initializing = false;
      if (error) this.error(error.toString());
      if (this.config.type === "window" && this.config.iframe_container) {
        const container = document.getElementById(this.config.iframe_container);
        container.innerHTML = `<h5>Oops! failed to load the window.</h5><code>Details: ${DOMPurify.sanitize(
          String(error)
        )}</code>`;
      }
      this._updateUI();
    };

    if (!this.backend) {
      this._setupViaEngine();
    } else {
      this._setupViaIframe();
    }
  }

  _registerSiteEvents(_rpc) {
    _rpc.onDisconnect(details => {
      this._disconnect.emit();
      if (details) {
        if (details.success) {
          this.log(details.message);
        } else {
          this.error(details.message);
        }
      }
      this._set_disconnected();
    });

    _rpc.onRemoteReady(() => {
      if (this.running) {
        this.running = false;
        this._updateUI();
      }
    });

    _rpc.onRemoteBusy(() => {
      if (!this._disconnected && !this.running) {
        this.running = true;
        this._updateUI();
      }
    });
  }

  /**
   * Loads the plugin body (executes the code in case of the
   * DynamicPlugin)
   */
  async _executePlugin() {
    try {
      if (this.config.requirements) {
        await this._connection.execute({
          type: "requirements",
          lang: this.config.lang,
          requirements: this.config.requirements,
          env: this.config.env,
        });
      }
      if (
        ["iframe", "window", "web-python-window"].includes(this.config.type)
      ) {
        if (this.config.styles) {
          for (let i = 0; i < this.config.styles.length; i++) {
            await this._connection.execute({
              type: "style",
              content: this.config.styles[i].content,
              attrs: this.config.styles[i].attrs,
              src: this.config.styles[i].attrs.src,
            });
          }
        }
        if (this.config.links) {
          for (let i = 0; i < this.config.links.length; i++) {
            await this._connection.execute({
              type: "link",
              rel: this.config.links[i].attrs.rel,
              type_: this.config.links[i].attrs.type,
              attrs: this.config.links[i].attrs,
              href: this.config.links[i].attrs.href,
            });
          }
        }
        if (this.config.windows) {
          for (let i = 0; i < this.config.windows.length; i++) {
            await this._connection.execute({
              type: "html",
              content: this.config.windows[i].content,
              attrs: this.config.windows[i].attrs,
            });
          }
        }
      }
      if (this.config.scripts) {
        for (let i = 0; i < this.config.scripts.length; i++) {
          await this._connection.execute({
            type: "script",
            content: this.config.scripts[i].content,
            lang: this.config.scripts[i].attrs.lang,
            attrs: this.config.scripts[i].attrs,
            src: this.config.scripts[i].attrs.src,
          });
        }
      }
    } catch (e) {
      this._fCb(
        ("Error in loading plugin: " + e && e.toString()) ||
          "Error in loading plugin"
      );
    }
  }

  /**
   * Requests the remote interface from the plugin (which was
   * probably set by the plugin during its initialization), emits
   * the connect event when done, then the plugin is fully usable
   * (meaning both the plugin and the application can use the
   * interfaces provided to each other)
   */
  _requestRemote() {
    return new Promise(resolve => {
      this._rpc.onRemoteUpdate(() => {
        resolve(this._rpc.getRemote());
      });
      this._rpc.requestRemote();
    });
  }

  /**
   * Disconnects the plugin immideately
   */
  disconnect() {
    if (this._connection) this._connection.disconnect();
    this._disconnect.emit();
  }

  /**
   * Saves the provided function as a handler for the connection
   * failure Whenable event
   *
   * @param {Function} handler to be issued upon disconnect
   */
  onFailed(handler) {
    this._fail.whenEmitted(handler);
  }

  /**
   * Saves the provided function as a handler for the connection
   * success Whenable event
   *
   * @param {Function} handler to be issued upon connection
   */
  onConnected(handler) {
    this._connected.whenEmitted(handler);
  }

  /**
   * Saves the provided function as a handler for the connection
   * failure Whenable event
   *
   * @param {Function} handler to be issued upon connection failure
   */
  onDisconnected(handler) {
    this._disconnect.whenEmitted(handler);
  }

  _set_disconnected() {
    this._disconnected = true;
    this.running = false;
    this.initializing = false;
    this.terminating = false;
    this.engine = null;
    this._updateUI();
  }
  _forceDisconnect() {
    if (this.engine && this.engine.killPlugin)
      this.engine.killPlugin({ id: this.config.id, name: this.config.name });
    this._set_disconnected();
    if (this._rpc) {
      this._rpc.disconnect();
      this._rpc = null;
    }
    if (this._connection) {
      this._connection.disconnect();
      this._connection = null;
    }
  }
  async terminate(force) {
    if (this._disconnected) {
      this._set_disconnected();
      return;
    }
    // prevent call loop
    if (this.terminating) {
      return;
    }
    if (force) {
      this._forceDisconnect();
    }
    try {
      if (this.api && this.api.exit && typeof this.api.exit == "function") {
        this.api.exit();
      }
    } catch (e) {
      console.error("error occured when terminating the plugin", e);
    } finally {
      setTimeout(() => {
        this._forceDisconnect();
      }, 1000);
    }
  }

  on(name, handler, fire_if_emitted) {
    this._callbacks = this._callbacks || {};

    if (this._callbacks[name]) {
      this._callbacks[name].push(handler);
    } else {
      this._callbacks[name] = [handler];
    }
    if (fire_if_emitted && this._callbacks[name].emitted) {
      handler(this._callbacks[name].emitted_data);
    }
  }
  off(name, handler) {
    if (this._callbacks[name]) {
      if (handler) {
        const handlers = this._callbacks[name];
        const idx = handlers.indexOf(handler);
        if (idx >= 0) {
          handlers.splice(idx, 1);
        } else {
          console.warn(`callback ${name} does not exist.`);
        }
      } else {
        delete this._callbacks[name];
      }
    } else {
      console.warn(`callback ${name} does not exist.`);
    }
  }
  emit(name, data) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      const errors = [];
      try {
        if (this._callbacks[name]) {
          for (let cb of this._callbacks[name]) {
            try {
              await cb(data !== undefined ? data : undefined);
            } catch (e) {
              errors.push(e);
              console.error(e);
            }
          }
        } else {
          // if no handler set, store the data
          this._callbacks[name] = [];
          this._callbacks[name].emitted = true;
          this._callbacks[name].emitted_data = data;
        }
        if (errors.length <= 0) {
          resolve();
        } else {
          reject(errors);
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  log(msg) {
    if (typeof msg === "object") {
      this._log_history.push(msg);
      console.log(`Plugin ${this.id}:`, msg);
    } else {
      const args = Array.prototype.slice.call(arguments).join(" ");
      this._log_history._info = args.slice(0, 100);
      this._log_history.push({ type: "info", value: args });
      console.log(`Plugin ${this.id}: ${args}`);
    }
  }

  error() {
    const args = Array.prototype.slice.call(arguments).join(" ");
    this._log_history._error = args.slice(0, 100);
    this._log_history.push({ type: "error", value: args });
    console.error(`Error in Plugin ${this.id}: ${args}`);
  }

  progress(p) {
    if (p < 1) this._progress = p * 100;
    else this._progress = p;
  }
}

export { initializeJailed, DynamicPlugin };
