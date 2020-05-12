import { EventManager } from "./utils.js";

export class BasicConnection extends EventManager {
  constructor(sourceIframe) {
    super();
    this._event_handlers = {};
    this._disconnected = false;
    this.pluginConfig = {};
    this._frame = sourceIframe;
    this._access_token = null;
    this._refresh_token = null;
    this.on("initialized", data => {
      this.pluginConfig = data.config;
      if (this.pluginConfig.auth) {
        if (!this.pluginConfig.origin || this.pluginConfig.origin === "*") {
          console.error(
            "Refuse to transmit the token without an explicit origin, there is a security risk that you may leak the credential to website from other origin. Please specify the `origin` explicitly."
          );
          this._access_token = null;
          this._refresh_token = null;
        }
        if (this.pluginConfig.auth.type !== "jwt") {
          console.error(
            "Unsupported authentication type: " + this.pluginConfig.auth.type
          );
        } else {
          this._expires_in = this.pluginConfig.auth.expires_in;
          this._access_token = this.pluginConfig.auth.access_token;
          this._refresh_token = this.pluginConfig.auth.refresh_token;
        }
      }
      if (this.pluginConfig.origin) {
        console.warn(
          `RPC connect to ${this.pluginConfig.name} will limited to origin: ${
            this.pluginConfig.origin
          }`
        );
      }
    });
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
        if (result.error) {
          reject(result.error);
        } else {
          resolve();
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
    if (this._access_token) {
      if (Date.now() >= this._expires_in * 1000) {
        //TODO: refresh access token
        throw new Error("Refresh token is not implemented.");
      }
      data.access_token = this._access_token;
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
