import CSS_STYLE from "./imjoyBasicApp.template.css";
import APP_TEMPLATE from "./imjoyBasicApp.template.html";
import MENU_TEMPLATE from "./imjoyBasicAppMenu.template.html";
import WINDOWS_TEMPLATE from "./imjoyBasicAppWindows.template.html";

export function injectScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.addEventListener("load", resolve);
    script.addEventListener("error", () => {
      document.head.removeChild(script);
      reject("Error loading script: " + src);
    });
    script.addEventListener("abort", () => reject("Script loading aborted."));
    document.head.appendChild(script);
  });
}

function getUrlParameter(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
  var results = regex.exec(location.search);
  return results === null
    ? ""
    : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function loadCss(url) {
  const fileref = document.createElement("link");
  fileref.setAttribute("rel", "stylesheet");
  fileref.setAttribute("type", "text/css");
  fileref.setAttribute("href", url);
  document.getElementsByTagName("head")[0].appendChild(fileref);
}

export async function loadImJoyBasicApp(config) {
  await injectScript("https://cdn.jsdelivr.net/npm/vue@2.6.10/dist/vue.min.js");
  await injectScript("https://imjoy-team.github.io/vue-js-modal/index.js");
  loadCss("https://imjoy-team.github.io/vue-js-modal/styles.css");
  const VueWindow = await import('@hscmap/vue-window');
  config = config || {};
  let app;
  const imjoy_api = {
    showDialog(plugin, cfg, extra_cfg) {
      extra_cfg = extra_cfg || {};
      extra_cfg.dialog = true;
      return imjoy.pm.createWindow(plugin, cfg, extra_cfg);
    },
    createWindow(plugin, cfg, extra_cfg) {
      extra_cfg = extra_cfg || {};
      if (!config.window_manager_container) extra_cfg.dialog = true;
      return imjoy.pm.createWindow(plugin, cfg, extra_cfg);
    },
    showSnackbar(plugin, msg, duration) {
      app.showSnackbar(msg, duration);
    },
    showMessage(plugin, msg) {
      app.showSnackbar(msg, 5);
    },
    showStatus(plugin, msg) {
      app.showSnackbar(msg, 5);
    },
    showProgress(plugin, progress) {
      progress = progress || 0;
      if (progress < 1) progress = progress * 100;
      app.progress = progress;
      app.$forceUpdate();
    },
  };
  if (config.imjoy_api) {
    for (let k of Object.keys(config.imjoy_api)) {
      imjoy_api[k] = config.imjoy_api[k];
    }
  }
  const imjoyCore = await loadImJoyCore(config);
  const imjoy = new imjoyCore.ImJoy({
    imjoy_api,
  });
  await imjoy.start(config);
  console.log("ImJoy Core started successfully!");
  Vue.use(window["vue-js-modal"].default);
  Vue.use(VueWindow);
  let elem;
  if (config.main_container) {
    if (typeof config.main_container === "string")
      elem = document.getElementById(config.main_container);
    else elem = config.main_container;
  } else {
    elem = document.createElement("div");
    document.body.appendChild(elem);
  }
  elem.style.visibility = "hidden";
  elem.innerHTML = APP_TEMPLATE;
  document.head.insertAdjacentHTML("beforeend", `<style>${CSS_STYLE}</style>`);

  let windowManager;
  if (config.window_manager_container) {
    let windowsElem;
    if (typeof config.window_manager_container === "string")
      windowsElem = document.getElementById(config.window_manager_container);
    else windowsElem = config.window_manager_container;
    windowsElem.innerHTML = WINDOWS_TEMPLATE;
    windowManager = new Vue({
      el: windowsElem,
      data: {
        type: config.window_manager_type || 'standard',
        blockPointerEvents: false,
        windowStyle: config.window_style || {},
        showEmpty: config.show_empty_window || false,
        showWindowTitle: config.show_window_title || false,
        windows: [],
        activeWindow: null
      },
      methods: {
        closeWindow(w){
          w.hidden = true;
          this.$forceUpdate();
          w.close();
        }
      }
    });
  }

  let menuManager;
  if (config.menu_container) {
    let menuElem;
    if (typeof config.menu_container === "string")
      menuElem = document.getElementById(config.menu_container);
    else menuElem = config.menu_container;
    menuElem.innerHTML = MENU_TEMPLATE;
    menuElem.style.minHeight = "30px";
    menuManager = new Vue({
      el: menuElem,
      data: {
        menuPos: config.menu_pos || "right",
        menuStyle: config.menu_style || {},
        activeWindow: null,
        closeWindow: null,
        showAboutImJoy: null,
        extraMenuItems: [],
        loadedPlugins: [],
        allWindows: [],
      },
      mounted() {
        this.menuStyle = this.menuStyle || {};
        this.menuStyle.float = this.menuPos === "left" ? "left" : "right";
      },
    });
  }

  app = new Vue({
    el: elem,
    data: {
      dialogWindows: [],
      selectedDialogWindow: null,
      selectedWindowsStack: [],
      selectedRegularWindow: null,
      fullscreen: false,
      loading: false,
      snackBarContent: false,
      progress: 0,
      loadedPlugins: [],
      allWindows: [],
      extraMenuItems: [],
      showProgressBar: config.show_progress_bar,
      showLoader: config.show_loader,
      showWindows: config.show_windows,
    },
    mounted() {
      this.$el.style.visibility = "visible";
      imjoy.event_bus.on("close_window", w => {
        this.closeWindow(w);
        this.$forceUpdate();
      });
      imjoy.event_bus.on("add_window", w => {
        this.allWindows.push(w);
        this.addWindow(w);
      });
      this.imjoy = imjoy;
      if (config.process_url_query) {
        this.processURLQuery();
      }
      if (menuManager) {
        menuManager.closeWindow = w => {
          this.closeWindow(w);
        };
        if (!config.hide_about_imjoy) {
          menuManager.showAboutImJoy = () => {
            imjoy.api.showDialog({
              src: "https://imjoy.io/docs/",
              passive: true,
            });
          };
        }
      }
    },
    computed: {
      regularWindows: function() {
        return this.allWindows.filter(
          w => !this.dialogWindows.includes(w) && !w.inline
        );
      },
    },
    watch: {
      regularWindows: function(newVal) {
        if (windowManager) {
          windowManager.windows = newVal;
          windowManager.$forceUpdate();
        }
      },
      selectedRegularWindow: function(newVal) {
        if (windowManager) {
          windowManager.activeWindow = newVal;
          windowManager.$forceUpdate();
        }
        if (menuManager && config.window_manager_type === 'simple') {
          menuManager.activeWindow = newVal;
          menuManager.$forceUpdate();
        }
      },
      extraMenuItems: function(newVal) {
        if (menuManager) {
          menuManager.extraMenuItems = newVal;
          menuManager.$forceUpdate();
        }
      },
      allWindows: function(newVal) {
        if (menuManager) {
          menuManager.allWindows = newVal;
          menuManager.$forceUpdate();
        }
      },
      loadedPlugins: function(newVal) {
        if (menuManager) {
          menuManager.loadedPlugins = newVal;
          menuManager.$forceUpdate();
        }
      },
    },
    methods: {
      processURLQuery() {
        const token = getUrlParameter("token") || getUrlParameter("t");
        const engine = getUrlParameter("engine") || getUrlParameter("e");
        const p = getUrlParameter("plugin") || getUrlParameter("p");
        if (engine) {
          this.setupPluginEngine(engine, token);
        }
        if (p) {
          this.loadPlugin(p).then(plugin => {
            let config = {},
              data = {},
              tmp;
            tmp = getUrlParameter("data");
            if (tmp) data = JSON.parse(tmp);
            tmp = getUrlParameter("config");
            if (tmp) config = JSON.parse(tmp);
            this.runPlugin(plugin, config, data);
          });
        }
      },
      async runPlugin(plugin, config, data) {
        if (!config && plugin.config.ui && plugin.config.ui.indexOf("{") > -1) {
          config = await imjoy.pm.imjoy_api.showDialog(plugin, plugin.config);
        }
        data = data || {};
        return await plugin.api.run({
          config: config,
          data: data,
        });
      },
      async setupPluginEngine(engine, token) {
        try {
          console.log("Loading Jupyter-Engine-Manager from Gist...");
          await imjoy.pm.reloadPluginRecursively({
            uri:
              "https://imjoy-team.github.io/jupyter-engine-manager/Jupyter-Engine-Manager.imjoy.html",
          });
          console.log("Jupyter-Engine-Manager loaded.");
          const factory = imjoy.em.getFactory("Jupyter-Engine");
          await factory.addEngine({
            url: engine,
            token: token,
          });
          console.log("plugin engine added:", engine);
        } catch (e) {
          console.error(e);
          alert(`Failed to connect to the engine: ${e}`);
        }
      },
      async loadPlugin(uri) {
        try {
          this.loading = true;
          const p = await imjoy.pm.reloadPluginRecursively({
            uri,
          });
          this.loadedPlugins.push(p);
          this.showSnackbar(`Plugin ${p.name} successfully loaded.`);
          return p;
        } finally {
          this.loading = false;
        }
      },
      addMenuItem(config) {
        this.extraMenuItems.push(config);
        this.$forceUpdate();
      },
      removeMenuItem(label) {
        const item = this.extraMenuItems.filter(it => it.label === label)[0];
        const idx = this.extraMenuItems.indexOf(item);
        if (idx >= 0) this.extraMenuItems.splice(idx, 1);
      },
      showSnackbar(msg, duration) {
        duration = duration || 3;
        this.snackBarContent = msg;
        this.$forceUpdate();
        setTimeout(() => {
          this.snackBarContent = null;
          this.$forceUpdate();
        }, duration * 1000);
      },
      addWindow(w) {
        w.api = w.api || {}
        const windowElm = document.getElementById(w.window_id);
        if (windowElm) {
          if (w.window_style) Object.assign(windowElm.style, w.window_style);
          w.inline = true;
          w.api.show = w.show = () => {
            windowElm.scrollIntoView();
          };
          return;
        }
        if (!w.dialog) {
          this.selectedRegularWindow = w;
          setTimeout(()=>{
            if(w.fullscreen||w.standalone){
              w.sizeState = 'maximized'
            }
            else{
              w.sizeState = 'normal'
            }
            this.$forceUpdate()
          }, 0)
          const self = this;
          w.api.show = w.show = () => {
            w.sizeState = 'restore'
            self.selectedRegularWindow = w;
            self.$forceUpdate();
            imjoy.wm.selectWindow(w);
            w.api.emit("show");
          };
        }
        else{
          this.dialogWindows.push(w);
          if (this.selectedDialogWindow) {
            this.selectedWindowsStack.push(this.selectedDialogWindow);
          }
          this.selectedDialogWindow = w;
          if (w.fullscreen || w.standalone) this.fullscreen = true;
          else this.fullscreen = false;
          this.$modal.show("window-modal-dialog");
          this.$forceUpdate();
          w.api.show = w.show = () => {
            this.selectedDialogWindow = w;
            this.$modal.show("window-modal-dialog");
            imjoy.wm.selectWindow(w);
            w.api.emit("show");
          };

          w.api.hide = w.hide = () => {
            if (this.selectedDialogWindow === w) {
              this.$modal.hide("window-modal-dialog");
            }
            w.api.emit("hide");
          };

          setTimeout(() => {
            try {
              w.show();
            } catch (e) {
              console.error(e);
            }
          }, 500);
        }   
      },
      showWindow(w) {
        if (w.fullscreen || w.standalone) this.fullscreen = true;
        else this.fullscreen = false;
        if (w) this.selectedDialogWindow = w;
        this.$modal.show("window-modal-dialog");
      },
      closeWindow(w) {
        let idx = this.dialogWindows.indexOf(w);
        if (idx >= 0) this.dialogWindows.splice(idx, 1);
        idx = this.allWindows.indexOf(w);
        if (idx >= 0) this.allWindows.splice(idx, 1);
        if (w === this.selectedDialogWindow) {
          this.selectedDialogWindow = this.selectedWindowsStack.pop();
        }
        if (!this.selectedDialogWindow) this.$modal.hide("window-modal-dialog");
        if (w === this.selectedRegularWindow) {
          if (this.regularWindows.length > 0)
            this.selectedRegularWindow =
              this.regularWindows[this.regularWindows.length - 1] || null;
          else this.selectedRegularWindow = null;
        }
        this.$forceUpdate();
      },
      minimizeWindow() {
        this.$modal.hide("window-modal-dialog");
      },
      maximizeWindow() {
        this.fullscreen = !this.fullscreen;
      },
    },
  });
  return app;
}
