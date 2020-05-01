import { compareVersions } from "./utils.js";

import Ajv from "ajv";
export const ajv = new Ajv();

ajv.addKeyword("file", {
  compile: function(config) {
    if (config && !config.mime && !config.ext && !(typeof config === "string"))
      throw new Error("Invalid config for keyword: file");
    if (config && config.maxSize) {
      if (typeof config.maxSize !== "number")
        throw new Error("maxSize must be a number");
    }
    if (config && config.minSize) {
      if (typeof config.minSize !== "number")
        throw new Error("minSize must be a number");
    }
    if (config && config.size) {
      if (typeof config.size !== "number" && !Array.isArray(config.size))
        throw new Error("size must be a number");
    }
    return function(data) {
      if (!(data instanceof File)) return false;
      if (!config) return true;
      for (let k in config) {
        if (k === "mime") {
          const mime = config[k];
          let _ok = false;
          if (typeof mime === "string") {
            _ok = data.type.match(mime);
          } else if (Array.isArray(mime)) {
            for (let m of mime) {
              if (data.type.match(m)) {
                _ok = true;
              }
            }
          }
          if (!_ok) return false;
        }
        if (k === "ext") {
          const ext = config[k];
          let _ok = false;
          if (typeof ext === "string") {
            _ok = data.name.endsWith(ext);
          } else if (Array.isArray(ext)) {
            for (let e of ext) {
              if (data.name.endsWith(e)) {
                _ok = true;
              }
            }
          }
          if (!_ok) return false;
        }
        if (k === "maxSize") {
          if (data.size > config[k]) return false;
        }
        if (k === "minSize") {
          if (data.size < config[k]) return false;
        }
        if (k === "size") {
          if (Array.isArray(config[k]) && !config[k].includes(data.size))
            return false;
          if (data.size !== config[k]) return false;
        }
      }
      return true;
    };
  },
});

const ArrayBufferView = Object.getPrototypeOf(
  Object.getPrototypeOf(new Uint8Array())
).constructor;

const _typedarray2dtype = {
  Int8Array: "int8",
  Int16Array: "int16",
  Int32Array: "int32",
  Uint8Array: "uint8",
  Uint16Array: "uint16",
  Uint32Array: "uint32",
  Float32Array: "float32",
  Float64Array: "float64",
  Array: "array",
};

const _dtypes = Object.values(_typedarray2dtype);

ajv.addKeyword("ndarray", {
  compile: function(config) {
    if (config && config.ndim) {
      if (typeof config.ndim !== "number" && !Array.isArray(config.ndim)) {
        throw new Error("ndim must be a number");
      }
    }
    if (config && config.shape) {
      if (!Array.isArray(config.shape)) {
        throw new Error("shape must be an array");
      }
      if (config.ndim) {
        if (
          typeof config.ndim !== "number" ||
          config.shape.length !== config.ndim
        )
          throw new Error("mismatch between shape and ndim");
      }
    }

    if (config && config.dtype) {
      if (typeof config.dtype !== "string" && !Array.isArray(config.dtype))
        throw new Error("Invalid dtype format");
      let dtypes;
      if (typeof config.dtype === "string") dtypes = [config.dtype];
      else dtypes = config.dtype;
      for (let dt of dtypes) {
        if (typeof dt !== "string" || !_dtypes.includes(dt)) {
          throw new Error(
            "Invalid dtype: " + dt + ", valid types: " + _dtypes.join(",")
          );
        }
      }
    }
    return function(data) {
      const isndarray =
        data.__jailed_type__ === "ndarray" &&
        data.__value__ &&
        data.__value__ instanceof ArrayBufferView &&
        data.__shape__ &&
        Array.isArray(data.__shape__) &&
        data.__dtype__ &&
        _dtypes.includes(data.__dtype__);
      if (!isndarray) return false;
      if (!config) return true;
      for (let k in config) {
        if (k === "shape") {
          const shape = config[k];
          if (data.__shape__.length !== shape.length) return false;
          for (let i = 0; i < data.__shape__.length; i++) {
            if (
              typeof shape[i] === "number" &&
              data.__shape__[i] !== shape[i]
            ) {
              return false;
            }
          }
        }

        if (k === "dtype") {
          const dtype = config[k];
          let _ok = false;
          if (typeof dtype === "string") {
            _ok = data.__dtype__ === config[k];
          } else if (Array.isArray(dtype)) {
            _ok = dtype.includes(data.__dtype__);
          }
          if (!_ok) return false;
        }

        if (k === "ndim") {
          const ndim = config[k];
          let _ok = false;
          if (typeof ndim === "number") {
            _ok = data.__shape__.length === ndim;
          } else if (Array.isArray(ndim)) {
            _ok = ndim.includes(data.__shape__.length);
          }
          if (!_ok) return false;
        }
      }
      return true;
    };
  },
});

ajv.addKeyword("instanceof", {
  compile: function(Class) {
    return function(data) {
      if (Array.isArray(Class)) {
        let match = false;
        for (let c of Class) {
          if (data instanceof c) {
            match = true;
            break;
          }
        }
        return match;
      } else {
        return data instanceof Class;
      }
    };
  },
});

export const CONFIGURABLE_FIELDS = [
  "env",
  "requirements",
  "dependencies",
  "icon",
  "ui",
  "type",
  "flags",
  "labels",
  "cover",
  "base_frame",
];

export const PLUGIN_CONFIG_FIELDS = CONFIGURABLE_FIELDS.concat([
  "name",
  "type",
  "tags",
  "version",
  "api_version",
  "defaults",
  "inputs",
  "outputs",
  "permissions",
]);

const _backends = {
  "web-worker": {
    type: "internal",
    name: "Web Worker",
    lang: "javascript",
  },
  iframe: {
    type: "internal",
    name: "IFrame",
    lang: "javascript",
  },
  window: {
    type: "internal",
    name: "Window",
    lang: "javascript",
  },
  "web-python": {
    type: "internal",
    name: "Web Python",
    lang: "web-python",
    icon: "🐍",
  },
  "web-python-window": {
    type: "internal",
    name: "Web Python (window)",
    lang: "web-python",
    icon: "🐍",
  },
  collection: {
    type: "-",
    name: "Collection",
    lang: "",
    icon: "",
  },
};

export function getBackends() {
  return _backends;
}

export function getBackendByType(type) {
  return _backends[type];
}

export function upgradePluginAPI(config) {
  if (compareVersions(config.api_version, "<=", "0.1.1")) {
    config.type = config.type || config.mode;
    delete config.mode;
    if (config.type === "pyworker") {
      config.type = "native-python";
    } else if (config.type === "webworker") {
      config.type = "web-worker";
    } else if (config.type === "webpython") {
      config.type = "web-python";
    }
  }
  return config;
}

export const PLUGIN_SCHEMA = ajv.compile({
  properties: {
    _id: { type: ["null", "string"] },
    name: { type: "string" },
    code: { type: "string" },
    lang: { type: ["null", "string"] },
    script: { type: ["null", "string"] },
  },
});

export const BACKEND_SCHEMA = ajv.compile({
  properties: {
    type: { type: "string" },
    name: { type: "string" },
    lang: { type: "string" },
    icon: { type: ["null", "string"] },
    connection: {},
  },
});

export const JOY_SCHEMA = ajv.compile({
  properties: {
    name: { type: "string" },
    type: { type: "string" },
    init: { type: ["null", "string", "array", "object"] },
  },
});

export const WINDOW_SCHEMA = ajv.compile({
  properties: {
    name: { type: "string" },
    type: { type: "string" },
    config: { type: ["null", "object"] },
    data: { type: ["null", "number", "string", "array", "object"] }, //attachments: {}
    panel: { type: ["null", "object"] },
  },
});

export const OP_SCHEMA = ajv.compile({
  properties: {
    name: { type: "string" },
    type: { type: "string" },
    ui: { type: ["null", "string", "array", "object"] },
    run: { instanceof: Function },
    inputs: { type: ["null", "object"] },
    outputs: { type: ["null", "object"] },
  },
});

export const ENGINE_FACTORY_SCHEMA = ajv.compile({
  properties: {
    name: { type: "string" },
    type: { enum: ["engine-factory"] },
    icon: { type: "string" },
    url: { type: "string" },
    config: { type: "object" },
    addEngine: { instanceof: Function },
    removeEngine: { instanceof: Function },
  },
});

export const ENGINE_SCHEMA = ajv.compile({
  properties: {
    name: { type: "string" },
    type: { enum: ["engine"] },
    pluginType: { type: "string" },
    factory: { type: "string" },
    icon: { type: "string" },
    url: { type: "string" },
    config: { type: "object" },
    connect: { instanceof: Function },
    disconnect: { instanceof: Function },
    listPlugins: { instanceof: Function },
    startPlugin: { instanceof: Function },
    getPlugin: { instanceof: Function },
    getEngineStatus: { instanceof: Function },
    getEngineConfig: { instanceof: [Function, null] },
    heartbeat: { instanceof: [Function, null] },
    killPlugin: { instanceof: [Function, null] },
    killPluginProcess: { instanceof: [Function, null] },
    restartPlugin: { instanceof: [Function, null] },
    about: { instanceof: [Function, null] },
  },
});

export const FILE_MANAGER_SCHEMA = ajv.compile({
  properties: {
    name: { type: "string" },
    type: { enum: ["file-manager"] },
    url: { type: "string" },
    shwoFileDialog: { instanceof: Function },
    listFiles: { instanceof: Function },
    getFile: { instanceof: Function },
    putFile: { instanceof: Function },
    requestUploadUrl: { instanceof: Function },
    getFileUrl: { instanceof: Function },
    removeFile: { instanceof: Function },
    heartbeat: { instanceof: [Function, null] },
  },
});
