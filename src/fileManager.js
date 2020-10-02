import { randId, assert } from "./utils.js";
import { FILE_MANAGER_SCHEMA } from "./api.js";

export class FileManager {
  constructor({ event_bus = null, client_id = null }) {
    this.event_bus = event_bus;
    assert(this.event_bus);
    this.client_id = client_id || randId();
    this.fileManagers = [];
    this.pm = null;
  }

  setPluginManager(pm) {
    this.pm = pm;
  }

  async init() {
    this.event_bus.on("register", async ({ plugin, config }) => {
      if (config.type === "file-manager") {
        try {
          assert(
            plugin.config.flags &&
              plugin.config.flags.indexOf("file-manager") >= 0,
            "Please add `file-manager` to `config.flags` before registering a file manager."
          );
          if (!FILE_MANAGER_SCHEMA(config)) {
            const error = FILE_MANAGER_SCHEMA.errors;
            console.error(
              "Error occured registering file manager",
              config,
              error
            );
            throw error;
          }
          await this.register(config);
          plugin.on("close", () => {
            this.unregister(config);
          });
        } catch (e) {
          this.pm.unregister(config);
          throw e;
        }
      }
    });

    this.event_bus.on("register", async ({ config }) => {
      if (config.type === "file-manager") {
        this.unregister(config);
      }
    });
  }

  getFileManagerByName(name) {
    for (let fm of this.fileManagers) {
      if (fm.name === name) {
        return fm;
      }
    }
    return null;
  }

  getFileManagerByUrl(url) {
    for (let fm of this.fileManagers) {
      if (fm.url === url) {
        return fm;
      }
    }
    return null;
  }

  async register(manager_) {
    const manager = Object.assign({}, manager_);
    //backup the manager api
    manager.api = manager_;
    for (let i = 0; i < this.fileManagers.length; i++) {
      if (this.fileManagers[i].name === manager.name) {
        this.fileManagers.splice(i, 1);
        break;
      }
    }
    manager.connected = false;
    const check_connectivity = async () => {
      manager.connected = await manager.heartbeat();
    };
    await check_connectivity();
    manager.heart_beat_timer = setInterval(check_connectivity, 10000);
    this.fileManagers.push(manager);
  }

  unregister(manager) {
    manager = this.getFileManagerByUrl(manager.url);
    const index = this.fileManagers.indexOf(manager);
    if (index > -1) {
      this.fileManagers.splice(index, 1);
    }
    if (manager.heart_beat_timer) {
      clearInterval(manager.heart_beat_timer);
    }
  }

  destroy() {
    for (let e of this.fileManagers) {
      e.destroy();
    }
  }
}
