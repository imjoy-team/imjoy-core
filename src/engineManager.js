import { randId, assert } from "./utils.js";
import { evil_engine } from "./evilEngine.js";
import { ENGINE_SCHEMA, ENGINE_FACTORY_SCHEMA } from "./api.js";

export class EngineManager {
  constructor({
    event_bus = null,
    config_db = null,
    client_id = null,
    engine_selector = null,
  }) {
    this.event_bus = event_bus;
    this.config_db = config_db;
    assert(this.event_bus);
    assert(this.config_db, "config database is not available");
    this.client_id = client_id || randId();
    this.engines = [];
    this.engine_factories = [];
    this.pm = null;
    this.engine_selector = engine_selector;
  }

  setPluginManager(pm) {
    this.pm = pm;
  }

  async init() {
    this.register(evil_engine);

    this.event_bus.on("register", async ({ plugin, config }) => {
      try {
        if (config.type === "engine-factory") {
          assert(
            plugin.config.flags &&
              plugin.config.flags.indexOf("engine-factory") >= 0,
            "Please add `engine-factory` to `config.flags` before registering an engine factory."
          );
          if (!ENGINE_FACTORY_SCHEMA(config)) {
            const error = ENGINE_FACTORY_SCHEMA.errors;
            console.error(
              "Error occured registering engine factory",
              config,
              error
            );
            throw error;
          }
          this.registerFactory(config);
          plugin.on("close", () => {
            this.unregisterFactory(config);
          });
        } else if (config.type === "engine") {
          assert(
            plugin.config.flags && plugin.config.flags.indexOf("engine") >= 0,
            "Please add `engine` to `config.flags` before registering an engine."
          );
          if (!ENGINE_SCHEMA(config)) {
            const error = ENGINE_SCHEMA.errors;
            console.error("Error occured registering engine ", config, error);
            throw error;
          }
          await this.register(config);
          plugin.on("close", () => {
            this.unregister(config);
          });
        }
      } catch (e) {
        this.pm.unregister(plugin, config);
        throw e;
      }
    });

    this.event_bus.on("unregister", async ({ config }) => {
      if (config.type === "engine") {
        this.unregister(config);
      } else if (config.type === "engine-factory") {
        this.unregisterFactory(config);
      }
    });
  }

  matchEngineByType(pluginType) {
    return this.engines.filter(engine => {
      return engine.pluginType === pluginType;
    });
  }

  async findEngine(plugin_config) {
    if (this.engine_selector)
      return await this.engine_selector(plugin_config, this.engines);
    const egs = this.engines.filter(engine => {
      return plugin_config.type && engine.pluginType === plugin_config.type;
    });

    if (!egs || egs.length <= 0) {
      return null;
    }

    if (plugin_config.engine_mode === "auto") {
      const matched = egs.filter(eg => {
        return eg.connected;
      });
      if (matched.length <= 0) {
        // let's try to connect the first one
        try {
          const engine = egs[0];
          await engine.connect();
          engine.connected = true;
          return engine;
        } catch (e) {
          console.error("Failed to connect", e);
        }
        return null;
      }
      return matched[matched.length - 1];
    }

    return egs.filter(eg => {
      return eg.name === plugin_config.engine_mode;
    })[0];
  }

  getEngineByUrl(url) {
    for (let e of this.engines) {
      if (e.url === url) {
        return e;
      }
    }
    return null;
  }

  getEngineByName(name) {
    for (let e of this.engines) {
      if (e.name === name) {
        return e;
      }
    }
    return null;
  }

  async register(engine_) {
    const engine = Object.assign({}, engine_);
    // backup the engine api
    engine.api = engine_;
    if (engine_ && engine_ === evil_engine) {
      // make an exception for localhost debugging
      if (
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname === "localhost"
      ) {
        engine._is_evil = false;
      } else {
        engine._is_evil = true;
      }
    } else {
      engine._is_evil = false;
    }
    // make sure the name is unique
    for (let i = 0; i < this.engines.length; i++) {
      if (engine.name && this.engines[i].name === engine.name) {
        try {
          this.unregister(this.engines[i]);
        } catch (e) {
          console.error(e);
        }
      }
    }
    // make sure the url is unique
    for (let i = 0; i < this.engines.length; i++) {
      if (engine.url && this.engines[i].url === engine.url) {
        try {
          this.unregister(this.engines[i]);
        } catch (e) {
          console.error(e);
        }
      }
    }
    engine.connected = false;
    engine.engine_status = engine.engine_status || {};
    if (engine.getEngineConfig) {
      Promise.resolve(engine.getEngineConfig()).then(engine_config => {
        engine.engine_config = engine_config;
      });
    }
    const update_connectivity = () => {
      if (engine.connected) {
        this.event_bus.emit("engine_connected", engine);
      } else {
        this.event_bus.emit("engine_disconnected", engine);
      }
    };

    const check_connectivity = async () => {
      const live = await engine.heartbeat();
      if (!engine.connected && live) {
        engine.connected = true;
        update_connectivity();
      } else if (engine.connected && !live) {
        engine.connected = false;
        update_connectivity();
        for (let p of engine._plugins) {
          p.terminate();
        }
        // clearInterval(timerId);
      } else {
        engine.connected = live;
      }
    };

    engine._plugins = [];
    engine.registerPlugin = p => {
      engine._plugins.push(p);
    };
    this.engines.push(engine);

    if (!engine.lazy_connection) {
      await engine.connect();
      engine.connected = true;
    }

    update_connectivity();

    if (engine.heartbeat) {
      await check_connectivity();
      engine.heartbeat_timer = setInterval(check_connectivity, 5000);
    }
  }

  async unregister(engine) {
    const url = engine.url;
    engine = this.getEngineByUrl(url);
    if (!engine) return false;
    const index = this.engines.indexOf(engine);
    for (let p of engine._plugins) {
      p.terminate();
    }
    if (index > -1) {
      this.engines.splice(index, 1);
    }
    if (engine.heartbeat_timer) clearInterval(engine.heartbeat_timer);
    await engine.disconnect();
    engine.connected = false;
    this.event_bus.emit("engine_disconnected", engine);
    return true;
  }

  registerFactory(factory_) {
    const factory = Object.assign({}, factory_);
    //backup the factory api
    factory.api = factory_;
    for (let i = 0; i < this.engine_factories.length; i++) {
      if (this.engine_factories[i].name === factory.name) {
        this.engine_factories.splice(i, 1);
        break;
      }
    }
    this.engine_factories.push(factory);
  }

  unregisterFactory(factory) {
    factory = this.getFactory(factory.name);
    if (!factory) return false;
    const index = this.engine_factories.indexOf(factory);
    if (index > -1) {
      this.engine_factories.splice(index, 1);
    }
    return true;
  }

  getFactory(name) {
    for (let e of this.engine_factories) {
      if (e.name === name) {
        return e;
      }
    }
    return null;
  }

  destroy() {
    for (let e of this.engines) {
      this.unregister(e);
    }
  }
}
