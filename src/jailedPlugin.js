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
import { BasicConnection, WebWorkerConnection } from "./connection.js";
import { Whenable } from "./utils.js";
import PyodideWorker from "./pyodide.webworker.js";

import DOMPurify from "dompurify";
import { loadImJoyRPC, latest_rpc_version } from "./imjoyLoader.js";

const JailedConfig = { default_rpc_base_url: null, default_base_frame: null };

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
  if (!JailedConfig.default_base_frame)
    JailedConfig.default_base_frame =
      "https://lib.imjoy.io/default_base_frame.html";
  if (
    JailedConfig.default_rpc_base_url &&
    !JailedConfig.default_rpc_base_url.endsWith("/")
  ) {
    JailedConfig.default_rpc_base_url = JailedConfig.default_rpc_base_url + "/";
  }
  _initialized = true;
};

export function createIframe(config) {
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
    "allow-downloads",
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
  frame.id = "iframe_" + config.id;
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
  constructor(config, _interface, engine, is_proxy, allow_evil, connection) {
    if (!_initialized)
      throw "Please call `initializeJailed()` before using Jailed.";
    this.config = config;
    this.id = config.id || randId();
    this._id = config._id;
    this.name = config.name;
    this.tag = config.tag;
    this.tags = config.tags;
    this.type = config.type;
    this.initializing = false;
    this.running = false;
    this._log_history = [];
    this._callbacks = config._callbacks || {};
    this._is_proxy = is_proxy;
    this.backend = getBackendByType(this.type);
    this.engine = engine;
    this.allow_evil = allow_evil;
    this._hasVisibleWindow = ["window", "rpc-window"].includes(this.type);

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

      this.api = null;

      this._connected = new Whenable(true);
      this._fail = new Whenable(true);
      this._disconnect = new Whenable(true);

      if (connection) {
        this._setupRPC(connection, config);
        this._initialized_from_connection = true;
      } else {
        if (!this.backend) {
          this._setupViaEngine();
        } else if (
          this.type === "web-python" ||
          (this.type === "web-worker" && this.config.base_worker)
        ) {
          this._setupViaWebWorker();
        } else {
          this._setupViaIframe();
        }
      }
    }
    this._updateUI();
  }
  /**
   * Bind the first argument of all the interface functions to this plugin
   */
  _bindInterface(_interface) {
    _interface = _interface || {};
    this._initialInterface = { _rintf: true };
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
      _rintf: true,
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

    const ready = remote => {
      this.api = remote;
      this.api._rintf = true;
      this.api.config = {
        id: this.id,
        name: this.config.name,
        workspace: this.config.workspace,
        type: this.config.type,
        namespace: this.config.namespace,
        tag: this.config.tag,
      };
      if (this.window_id) {
        this.api.config.window_id = this.config.window_id;
      }
      this._disconnected = false;
      this.initializing = false;
      this._updateUI();
      this._connected.emit();
      this.engine.registerPlugin(this);
    };
    if (this.config.passive) {
      this.engine.startPlugin(
        this.config,
        this._initialInterface,
        engine_utils
      );
      ready({
        passive: true,
        _rintf: true,
        setup: async function() {},
        on: async function() {},
        off: async function() {},
        emit: async function() {},
      });
    } else {
      this.engine
        .startPlugin(this.config, this._initialInterface, engine_utils)
        .then(remote => {
          // check if the plugin is terminated during startup
          if (!this.engine) {
            console.warn(
              "Plugin " + this.id + " is ready, but it was termianted."
            );
          }
          ready(remote);
        })
        .catch(e => {
          this.error(e);
          this._set_disconnected();
        });
    }
  }

  _setupViaWebWorker() {
    if (!getBackendByType(this.type)) {
      throw `Unsupported backend type (${this.type})`;
    }
    let webworker;
    if (this.type === "web-python") {
      webworker = new PyodideWorker({ name: this.id });
    } else {
      webworker = new Worker(this.config.base_worker, { name: this.id });
    }
    const connection = new WebWorkerConnection(webworker);
    this._setupConnection(connection);
  }

  _setupViaIframe() {
    if (!getBackendByType(this.type)) {
      throw `Unsupported backend type (${this.type})`;
    }
    if (!this.config.base_frame) {
      let frame_url = JailedConfig.default_base_frame;
      if (JailedConfig.default_rpc_base_url) {
        frame_url =
          frame_url + "?base_url=" + JailedConfig.default_rpc_base_url;
        console.log(
          "imjoy-rpc library will be loaded from " +
            JailedConfig.default_rpc_base_url
        );
      } else {
        frame_url = frame_url + "?version=" + latest_rpc_version;
      }

      frame_url = frame_url + "&id=" + this.config.id;

      this.config.base_frame = frame_url;
    }
    const _frame = createIframe(this.config);
    this._frame = _frame;
    if (this._hasVisibleWindow) {
      let window_id = this.config.window_id;
      if (typeof window_id === "string") {
        window_id = document.getElementById(window_id);
      }
      if (window_id) {
        _frame.style.display = "block";
        window_id.innerHTML = "";
        window_id.appendChild(_frame);
        this.window_id = window_id;
      } else {
        throw new Error(
          `Failed to load plugin ${
            this.config.name
          }, iframe container (id=${window_id}) not found.`
        );
      }
    } else {
      document.body.appendChild(_frame);
    }

    const connection = new BasicConnection(_frame);
    this._setupConnection(connection);
  }

  async _setupRPC(connection, pluginConfig) {
    this._connection = connection;
    this.initializing = true;
    this._updateUI();
    try {
      if (!CONFIG_SCHEMA(pluginConfig)) {
        const error = CONFIG_SCHEMA.errors;
        console.error(
          "Invalid config " + pluginConfig.name || "unkown" + ": ",
          pluginConfig,
          error
        );
        throw error;
      }
      const imjoyRPC = await loadImJoyRPC({
        base_url: JailedConfig.default_rpc_base_url,
        api_version: pluginConfig.api_version,
        debug: JailedConfig.debug,
      });
      console.log(
        `loaded imjoy-rpc v${imjoyRPC.VERSION} for ${pluginConfig.name}`
      );
      if (!this._rpc) {
        this._rpc = new imjoyRPC.RPC(this._connection, {
          name: "imjoy-core",
        });
        this._registerRPCEvents(this._rpc);
        this._rpc.setInterface(this._initialInterface);
      }
      await this._sendInterface();
      if (pluginConfig.allow_execution) {
        await this._executePlugin();
      }
      this.config.passive = this.config.passive || pluginConfig.passive;
      if (this.config.passive) {
        this.api = {
          passive: true,
          _rintf: true,
          setup: async function() {},
          on: async function() {},
          off: async function() {},
          emit: async function() {},
        };
      } else {
        this.api = await this._requestRemote();
      }

      this.api.config = {
        id: this.id,
        name: this.config.name,
        workspace: this.config.workspace,
        type: this.config.type,
        namespace: this.config.namespace,
        tag: this.config.tag,
      };
      if (this.window_id) {
        this.api.config.window_id = this.config.window_id;
      }
      this._disconnected = false;
      this.initializing = false;
      this._updateUI();
      this._connected.emit();
    } catch (error) {
      this._fail.emit(error);
      this.disconnect();
      this.initializing = false;
      if (error) this.error(error.toString());
      if (this._hasVisibleWindow && this.config.window_id) {
        const container = document.getElementById(this.config.window_id);
        container.innerHTML = `<h5>Oops! failed to load the window.</h5><code>Details: ${DOMPurify.sanitize(
          String(error)
        )}</code>`;
      }
      this._updateUI();
    }
  }

  _setupConnection(connection) {
    this._connection = connection;
    this.initializing = true;
    this._updateUI();

    initializeIfNeeded(this._connection, this.config);

    this._connection.on("initialized", async data => {
      if (data.error) {
        console.error("Plugin failed to initialize", data.error);
        throw new Error(data.error);
      }
      this._setupRPC(this._connection, data.config);
    });

    // TODO: check when this will fire
    this._connection.on("failed", e => {
      this._fail.emit(e);
    });

    this._connection.on("disconnected", details => {
      if (details) {
        if (details.error) {
          this.error(details.error);
        } else if (details.info) {
          this.log(details.info);
        }
      }
      this._set_disconnected();
    });
    this._connection.connect();
  }

  _registerRPCEvents(_rpc) {
    _rpc.on("disconnected", details => {
      this._disconnect.emit();
      if (details) {
        if (details.error) {
          this.error(details.message);
        } else if (details.info) {
          this.log(details.info);
        }
      }
      this._set_disconnected();
    });

    _rpc.on("remoteIdle", () => {
      if (this.running) {
        this.running = false;
        this._updateUI();
      }
    });

    _rpc.on("remoteBusy", () => {
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
    if (this.config.requirements) {
      await this._connection.execute({
        type: "requirements",
        lang: this.config.lang,
        requirements: this.config.requirements,
        env: this.config.env,
      });
    }
    if (this._hasVisibleWindow) {
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
      this._rpc.once("remoteReady", () => {
        resolve(this._rpc.getRemote());
      });
      this._rpc.requestRemote();
    });
  }

  _sendInterface() {
    return new Promise(resolve => {
      this._rpc.once("interfaceSetAsRemote", resolve);
      this._rpc.sendInterface();
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
      setTimeout(
        (() => {
          this._forceDisconnect();
        }).bind(this),
        1000
      );
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

function initializeIfNeeded(connection, default_config) {
  connection.once("imjoyRPCReady", async data => {
    const config = data.config || {};
    let forwarding_functions = ["close", "on", "off", "emit"];
    if (["rpc-window", "window"].includes(config.type || default_config.type)) {
      forwarding_functions = forwarding_functions.concat([
        "resize",
        "show",
        "hide",
        "refresh",
      ]);
    }
    let credential;
    if (config.credential_required) {
      if (!Array.isArray(config.credential_fields)) {
        throw new Error(
          "Please specify the `config.credential_fields` as an array of object."
        );
      }
      if (default_config.credential_handler) {
        credential = await default_config.credential_handler(
          config.credential_fields
        );
      } else {
        credential = {};
        for (let k in config.credential_fields) {
          credential[k.id] = window.prompt(k.label, k.value);
        }
      }
    }
    connection.emit({
      type: "initialize",
      config: {
        name: default_config.name,
        type: default_config.type,
        allow_execution: true,
        enable_service_worker: true,
        forwarding_functions: forwarding_functions,
        expose_api_globally: true,
        credential: credential,
      },
      peer_id: data.peer_id,
    });
  });
}

function getExternalPluginConfig(src, container, show) {
  return new Promise((resolve, reject) => {
    let _connection, url, _frame;
    container = container || document.body;
    if (typeof src === "string") {
      _frame = createIframe({
        id: "external_" + randId(),
        type: "window",
        base_frame: src,
        permissions: [],
      });
      if (!show) _frame.style.display = "none";
      container.appendChild(_frame);
      _connection = new BasicConnection(_frame);
      url = src;
    } else {
      url = src.url;
      _connection = src;
    }
    const connection_timer = setTimeout(() => {
      reject("Timeout error: failed to connect to the plugin");
    }, 15000);
    initializeIfNeeded(_connection, {});
    _connection.once("initialized", async data => {
      if (_frame) container.removeChild(_frame);
      clearTimeout(connection_timer);
      const pluginConfig = data.config;
      if (data.error) {
        console.error("Plugin failed to initialize", data.error);
        throw new Error(data.error);
      }
      if (!CONFIG_SCHEMA(pluginConfig)) {
        const error = CONFIG_SCHEMA.errors;
        console.error(
          "Invalid config " + pluginConfig.name || "unkown" + ": ",
          pluginConfig,
          error
        );
        throw error;
      }
      pluginConfig.base_frame = url;
      pluginConfig.code = `<config lang="json">\n${JSON.stringify(
        pluginConfig,
        null,
        "  "
      )}\n</config>`;
      pluginConfig.uri = url;
      pluginConfig.origin = url;
      resolve(pluginConfig);
    });
    _connection.once("failed", e => {
      clearTimeout(connection_timer);
      if (_frame) container.removeChild(_frame);
      reject(e);
    });
    _connection.connect();
  });
}

export { initializeJailed, DynamicPlugin, getExternalPluginConfig };
