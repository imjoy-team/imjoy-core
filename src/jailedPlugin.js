/**
 * @fileoverview Jailed - safe yet flexible sandbox
 *
 * @license MIT, see http://github.com/imjoy-team/imjoy-core
 * Copyright (c) 2020 asvd <imjoy.team@gmail.com>
 *
 * @license MIT, see http://github.com/asvd/jailed
 * Copyright (c) 2014 asvd <heliosframework@gmail.com>
 */

import { randId } from "./utils.js";
import { getBackendByType } from "./api.js";
import { RPC, Connection, Whenable } from "imjoy-rpc";

import DOMPurify from "dompurify";

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
const initializeJailed = function(config) {
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

/**
 * DynamicPlugin constructor, represents a plugin initialized by a
 * string containing the code to be executed
 *
 * @param {String} code of the plugin
 * @param {Object} _interface to provide to the plugin
 */
var DynamicPlugin = function(config, _interface, engine, is_proxy, allow_evil) {
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
};
/**
 * Bind the first argument of all the interface functions to this plugin
 */
DynamicPlugin.prototype._bindInterface = function(_interface) {
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
};
/**
 * Creates the connection to the plugin site
 */
DynamicPlugin.prototype._connect = function() {
  this.remote = null;
  this.api = null;

  this._connected = new Whenable();
  this._fail = new Whenable();
  this._disconnect = new Whenable();

  var me = this;

  // binded failure callback
  this._fCb = function(error) {
    me._fail.emit(error);
    me.disconnect();
    me.initializing = false;
    if (error) me.error(error.toString());
    if (me.config.type === "window" && me.config.iframe_container) {
      const container = document.getElementById(me.config.iframe_container);
      container.innerHTML = `<h5>Oops! failed to load the window.</h5><code>Details: ${DOMPurify.sanitize(
        String(error)
      )}</code>`;
    }
    me._updateUI();
  };

  if (!me.backend) {
    if (me.engine && me.engine._is_evil && me.allow_evil !== "eval is evil") {
      me._fail.emit("Evil engine is not allowed.");
      me._connection = null;
      me.error("Evil engine is not allowed.");
      me._set_disconnected();
      return;
    }
    if (!me.engine || !me.engine.connected) {
      me._fail.emit("Please connect to the Plugin Engine 🚀.");
      me._connection = null;
      me.error("Please connect to the Plugin Engine 🚀.");
      me._set_disconnected();
      return;
    }
    me.initializing = true;
    me._updateUI();
    const engine_utils = {
      __as_interface__: true,
      __id__: me.config.id + "_utils",
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
    me.engine
      .startPlugin(me.config, me._initialInterface, engine_utils)
      .then(remote => {
        // check if the plugin is terminated during startup
        if (!me.engine) {
          console.warn("Plugin " + me.id + " is ready, but it was termianted.");
          if (me.engine && me.engine.killPlugin)
            me.engine.killPlugin({ id: me.config.id, name: me.config.name });
          return;
        }
        me.remote = remote;
        me.api = me.remote;
        me.api.__as_interface__ = true;
        me.api.__id__ = me.id;
        me._disconnected = false;
        me.initializing = false;
        me._updateUI();
        me._connected.emit();
        me.engine.registerPlugin(me);
      })
      .catch(e => {
        me.error(e);
        me._set_disconnected();
      });
  } else {
    if (!getBackendByType(me.type)) {
      throw `Unsupported backend type (${me.type})`;
    }
    if (!me.config.base_frame) {
      me.config.base_frame = JailedConfig.asset_url + "base_frame.html";
    }
    me._connection = new Connection(me.id, me.type, me.config);
    me.initializing = true;
    me._updateUI();
    me._connection.whenInit(function() {
      me._init();
    });
    me._connection.whenFailed(function(e) {
      me._fail.emit(e);
    });

    me._connection.onDisconnect(function(details) {
      if (details) {
        if (details.success) {
          me.log(details.message);
        } else {
          me.error(details.message);
        }
      }
      me._set_disconnected();
      // me.terminate()
      if (me.config.type === "window" && me.config.iframe_container) {
        const container = document.getElementById(me.config.iframe_container);
        container.parentNode.removeChild(container);
      }
    });
  }
};

DynamicPlugin.prototype.registerSiteEvents = function(_site) {
  var me = this;
  _site.onDisconnect(function(details) {
    me._disconnect.emit();
    if (details) {
      if (details.success) {
        me.log(details.message);
      } else {
        me.error(details.message);
      }
    }
    me._set_disconnected();
  });

  _site.onRemoteReady(function() {
    if (me.running) {
      me.running = false;
      me._updateUI();
    }
  });

  _site.onRemoteBusy(function() {
    if (!me._disconnected && !me.running) {
      me.running = true;
      me._updateUI();
    }
  });
};

/**
 * Creates the Site object for the plugin
 */
DynamicPlugin.prototype._init = function() {
  this._site = new RPC(this._connection);

  this.registerSiteEvents(this._site);

  this.getRemoteCallStack = this._site.getRemoteCallStack;
  this._sendInterface();
};

/**
 * Sends to the remote site a signature of the interface provided
 * upon the Plugin creation
 */
DynamicPlugin.prototype._sendInterface = function() {
  var me = this;
  this._site.onInterfaceSetAsRemote(function() {
    if (me._disconnected) {
      me._loadPlugin();
    }
  });

  this._site.setInterface(this._initialInterface);
};

/**
 * Loads the plugin body (executes the code in case of the
 * DynamicPlugin)
 */
DynamicPlugin.prototype._loadPlugin = async function() {
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
      this.config.type === "iframe" ||
      this.config.type === "window" ||
      this.config.type === "web-python-window"
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

    this._requestRemote();
  } catch (e) {
    this._fCb(
      ("Error in loading plugin: " + e && e.toString()) ||
        "Error in loading plugin"
    );
  }
};

/**
 * Requests the remote interface from the plugin (which was
 * probably set by the plugin during its initialization), emits
 * the connect event when done, then the plugin is fully usable
 * (meaning both the plugin and the application can use the
 * interfaces provided to each other)
 */
DynamicPlugin.prototype._requestRemote = function() {
  var me = this;
  this._site.onRemoteUpdate(function() {
    me.remote = me._site.getRemote();
    me.api = me.remote;
    me.api.__as_interface__ = true;
    me.api.__id__ = me.id;
    me._disconnected = false;
    me.initializing = false;
    me._updateUI();
    me._connected.emit();
  });

  this._site.requestRemote();
};

/**
 * @returns {Boolean} true if a plugin runs on a dedicated thread
 * (subprocess in Node.js or a subworker in browser) and therefore
 * will not hang up on the infinite loop in the untrusted code
 */
DynamicPlugin.prototype.hasDedicatedThread = function() {
  return this._connection.hasDedicatedThread();
};

/**
 * Disconnects the plugin immideately
 */
DynamicPlugin.prototype.disconnect = function() {
  if (this._connection) this._connection.disconnect();
  this._disconnect.emit();
};

/**
 * Saves the provided function as a handler for the connection
 * failure Whenable event
 *
 * @param {Function} handler to be issued upon disconnect
 */
DynamicPlugin.prototype.whenFailed = function(handler) {
  this._fail.whenEmitted(handler);
};

/**
 * Saves the provided function as a handler for the connection
 * success Whenable event
 *
 * @param {Function} handler to be issued upon connection
 */
DynamicPlugin.prototype.whenConnected = function(handler) {
  this._connected.whenEmitted(handler);
};

/**
 * Saves the provided function as a handler for the connection
 * failure Whenable event
 *
 * @param {Function} handler to be issued upon connection failure
 */
DynamicPlugin.prototype.whenDisconnected = function(handler) {
  this._disconnect.whenEmitted(handler);
};

DynamicPlugin.prototype._set_disconnected = function() {
  this._disconnected = true;
  this.running = false;
  this.initializing = false;
  this.terminating = false;
  this.engine = null;
  this._updateUI();
};

DynamicPlugin.prototype.terminate = async function(force) {
  if (this._disconnected) {
    this._set_disconnected();
    return;
  }
  const disconnectAll = () => {
    if (this.engine && this.engine.killPlugin)
      this.engine.killPlugin({ id: this.config.id, name: this.config.name });
    this._set_disconnected();
    if (this._site) {
      this._site.disconnect();
      this._site = null;
    }
    if (this._connection) {
      this._connection.disconnect();
      this._connection = null;
    }
  };
  //prevent call loop
  if (this.terminating) {
    return;
  } else {
    this.terminating = true;
    setTimeout(() => {
      console.warn(
        `Plugin termination takes more than 5s, force quiting ${this.id}!`
      );
      if (this.terminating) disconnectAll();
    }, 5000);
  }
  try {
    await this.emit("close");
  } catch (e) {
    console.error(e);
  }
  if (force) {
    disconnectAll();
  }
  try {
    if (this.api && this.api.exit && typeof this.api.exit == "function") {
      await this.api.exit();
    }
  } catch (e) {
    console.error("error occured when terminating the plugin", e);
  } finally {
    disconnectAll();
  }
};

DynamicPlugin.prototype.on = function(name, handler, fire_if_emitted) {
  this._callbacks = this._callbacks || {};

  if (this._callbacks[name]) {
    this._callbacks[name].push(handler);
  } else {
    this._callbacks[name] = [handler];
  }
  if (fire_if_emitted && this._callbacks[name].emitted) {
    handler(this._callbacks[name].emitted_data);
  }
};
DynamicPlugin.prototype.off = function(name, handler) {
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
};
DynamicPlugin.prototype.emit = function(name, data) {
  return new Promise(async (resolve, reject) => {
    // eslint-disable-line no-async-promise-executor
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
};

DynamicPlugin.prototype.log = function(msg) {
  if (typeof msg === "object") {
    this._log_history.push(msg);
    console.log(`Plugin ${this.id}:`, msg);
  } else {
    const args = Array.prototype.slice.call(arguments).join(" ");
    this._log_history._info = args.slice(0, 100);
    this._log_history.push({ type: "info", value: args });
    console.log(`Plugin ${this.id}: ${args}`);
  }
};

DynamicPlugin.prototype.error = function() {
  const args = Array.prototype.slice.call(arguments).join(" ");
  this._log_history._error = args.slice(0, 100);
  this._log_history.push({ type: "error", value: args });
  console.error(`Error in Plugin ${this.id}: ${args}`);
};

DynamicPlugin.prototype.progress = function(p) {
  if (p < 1) this._progress = p * 100;
  else this._progress = p;
};

export { initializeJailed, DynamicPlugin };
