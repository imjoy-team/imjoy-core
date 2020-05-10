import { EventManager } from "./utils.js";

export class BasicConnection extends EventManager {
  constructor(sourceIframe) {
    super();
    this._event_handlers = {};
    this._disconnected = false;
    this.pluginConfig = {};
    this._frame = sourceIframe;
    this.on("initialized", data => {
      this.pluginConfig = data.config;
      if (this.pluginConfig.origin) {
        console.warn(
          `RPC connect to ${this.pluginConfig.name} will limited to origin: ${
            this.pluginConfig.origin
          }`
        );
      }
    });
  }
  init(){
    
  }
  connect() {
    // TODO: remove listener when disconnected
    window.addEventListener("message", e => {
      if (this._frame.contentWindow && e.source === this._frame.contentWindow) {
        this._fire(e.data.type, e.data);
      }
    });
    this._fire("connected");
  }

  execute(code) {
    return new Promise((resolve, reject) => {
      this.once("executed", result => {
        if (result.success) {
          resolve();
        } else {
          reject(result.error);
        }
      });
      if (this.pluginConfig.allow_execution) {
        this.emit({ type: "execute", code: code });
      } else {
        reject("Connection does not allow execution");
      }
    });
  }

  /**
   * Sends a message to the plugin site
   *
   * @param {Object} data to send
   */
  emit(data) {
    let transferables = undefined;
    if (data.__transferables__) {
      transferables = data.__transferables__;
      delete data.__transferables__;
    }
    this._frame.contentWindow &&
      this._frame.contentWindow.postMessage(
        data,
        this.pluginConfig.origin || "*",
        transferables
      );
  }

  /**
   * Disconnects the plugin (= kills the frame)
   */
  disconnect(details) {
    if (!this._disconnected) {
      this._disconnected = true;
      if (typeof this._frame !== "undefined") {
        this._frame.parentNode.removeChild(this._frame);
      } // otherwise farme is not yet created
      this._fire("disconnected", details);
    }
  }
}
