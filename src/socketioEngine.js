import io from "socket.io-client";
import { MessageEmitter } from "./utils.js";

class SocketIOConnection extends MessageEmitter {
  constructor(socket, channel) {
    super();
    this._event_handlers = {};
    this._once_handlers = {};
    this._disconnected = false;
    this.channel = channel;
    this._socket = socket;
    this._socket.on(channel, data => {
      if (data.type === "log" || data.type === "info") {
        console.log(data.message);
      } else if (data.type === "error") {
        console.error(data.message);
      } else {
        if (data.peer_id) {
          this._peer_id = data.peer_id;
        }
        this._fire(data.type, data);
      }
    });
  }
  connect() {}
  disconnect() {}
  emit(data) {
    data.peer_id = this._peer_id;
    this._socket.emit(this.channel, data);
  }
}

export function makeSocketIOEngine(pm, config) {
  let socket;
  return {
    type: "engine",
    pluginType: "socketio",
    icon: "*",
    name: config.name,
    url: config.url,
    config: config,
    connect() {
      const url = config.url.replace("//localhost", "//127.0.0.1");
      // TODO: share the socketio client between many connections
      socket = io(url, { forceNew: true });
      socket.on("connect", () => {
        socket.emit("list_plugins", {}, plugins => {
          for (let p of plugins) {
            socket.emit("connect_plugin", { id: p.id }, cfg => {
              if (cfg && cfg.channel) {
                const connection = new SocketIOConnection(socket, cfg.channel);
                connection.connect();
                pm.connectPlugin(connection);
              } else {
                console.error("Failed to assign plugin channel: " + cfg.error);
              }
            });
          }
        });
        this._disconnected = false;
      });
      return true;
    },
    disconnect() {
      this._disconnected = true;
      if (socket) {
        socket.close();
        socket = null;
      }
    },
    async startPlugin(config) {
      return new Promise((resolve, reject) => {
        socket.emit("start_plugin", config, cfg => {
          if (cfg && cfg.channel) {
            const connection = new SocketIOConnection(socket, cfg.channel);
            connection.connect();
            pm.connectPlugin(connection)
              .then(p => {
                resolve(p.api);
              })
              .catch(reject);
          } else {
            console.error("Failed to start plugin: " + cfg.error);
            reject(cfg && cfg.error);
          }
        });
      });
    },
    heartbeat: () => {
      return socket && socket.connected;
    },
  };
}
