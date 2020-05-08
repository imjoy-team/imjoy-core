export class BasicConnection {
  constructor(sourceIframe) {
    this._event_handlers = {};
    this._disconnected = false;
    this.pluginConfig = {};
    this._frame = sourceIframe;
    this.on("initialized", data => {
      this.pluginConfig = data.config;
    });
  }

  connect() {
    // TODO: remove listener when disconnected
    window.addEventListener("message", e => {
      if (this._frame.contentWindow && e.source === this._frame.contentWindow) {
        this._fire(e.data.type, e.data);
      }
    });
  }

  getConfig() {
    return new Promise((resolve, reject) => {
      this.on("config", data => {
        this.pluginConfig = data.config;
        resolve(data.config);
      });
      try {
        this.emit({ type: "getConfig" });
      } catch (e) {
        reject(e);
      }
    });
  }

  execute(code) {
    return new Promise((resolve, reject) => {
      // TODO: remote the handlers if finished
      this.on("executeSuccess", resolve);
      this.on("executeFailure", reject);
      console.log("=====>config", this.pluginConfig);
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
  emit(data, transferables) {
    this._frame.contentWindow &&
      this._frame.contentWindow.postMessage(data, "*", transferables);
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

  on(event, handler) {
    if (!this._event_handlers[event]) {
      this._event_handlers[event] = [];
    }
    this._event_handlers[event].push(handler);
  }

  _fire(event, data) {
    if (this._event_handlers[event]) {
      for (let cb of this._event_handlers[event]) {
        try {
          cb(data);
        } catch (e) {
          console.error(e);
        }
      }
    } else {
      console.warn("unhandled event", event, data);
    }
  }
}
