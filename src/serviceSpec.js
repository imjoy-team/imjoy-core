export const serviceSpec = {
  // add your service type schema here
  // you can use json-schema and additional keywords such as `instanceof`
  operator: {
    properties: {
      name: {
        type: "string",
      },
      ui: {
        type: ["null", "string", "array", "object"],
      },
      run: {
        instanceof: Function,
      },
      inputs: {
        type: ["null", "object"],
      },
      outputs: {
        type: ["null", "object"],
      },
    },
  },
  "engine-factory": {
    properties: {
      name: {
        type: "string",
      },
      type: {
        enum: ["engine-factory"],
      },
      icon: {
        type: "string",
      },
      url: {
        type: "string",
      },
      config: {
        type: "object",
      },
      addEngine: {
        instanceof: Function,
      },
      removeEngine: {
        instanceof: Function,
      },
    },
  },
  engine: {
    properties: {
      name: {
        type: "string",
      },
      type: {
        enum: ["engine"],
      },
      pluginType: {
        type: "string",
      },
      factory: {
        type: "string",
      },
      icon: {
        type: "string",
      },
      url: {
        type: "string",
      },
      config: {
        type: "object",
      },
      enable: {
        instanceof: Function,
      },
      disable: {
        instanceof: Function,
      },
      connect: {
        instanceof: Function,
      },
      disconnect: {
        instanceof: Function,
      },
      listPlugins: {
        instanceof: Function,
      },
      startPlugin: {
        instanceof: Function,
      },
      getPlugin: {
        instanceof: Function,
      },
      getEngineStatus: {
        instanceof: Function,
      },
      getEngineConfig: {
        instanceof: [Function, null],
      },
      heartbeat: {
        instanceof: [Function, null],
      },
      killPlugin: {
        instanceof: [Function, null],
      },
      killPluginProcess: {
        instanceof: [Function, null],
      },
      restartPlugin: {
        instanceof: [Function, null],
      },
      about: {
        instanceof: [Function, null],
      },
    },
  },
  "file-manager": {
    properties: {
      name: {
        type: "string",
      },
      type: {
        enum: ["file-manager"],
      },
      url: {
        type: "string",
      },
      shwoFileDialog: {
        instanceof: Function,
      },
      listFiles: {
        instanceof: Function,
      },
      getFile: {
        instanceof: Function,
      },
      putFile: {
        instanceof: Function,
      },
      requestUploadUrl: {
        instanceof: Function,
      },
      getFileUrl: {
        instanceof: Function,
      },
      removeFile: {
        instanceof: Function,
      },
      heartbeat: {
        instanceof: [Function, null],
      },
    },
  },
  "@transformation": {
    properties: {
      name: {
        type: "string",
      },
      type: {
        enum: ["transformation"],
      },
      transform: {
        instanceof: Function,
      },
      fit: {
        instanceof: Function,
      },
      fit_transform: {
        instanceof: Function,
      },
    },
    required: ["name", "type", "transform"],
  },
  "@model": {
    properties: {
      name: {
        type: "string",
      },
      type: {
        enum: ["model"],
      },
      predict: {
        instanceof: Function,
      },
      fit: {
        instanceof: Function,
      },
    },
    required: ["name", "type", "predict"],
  },
};
