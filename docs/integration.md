
# Integration with ImJoy-Core

You can load the ImJoy core into your website or web application, such that you can call another ImJoy plugins.

Or, you can inject the ImJoy runtime into your web application, such that it can be loaded as an ImJoy window plugin.

### Load ImJoy Core to your website or web application

#### Option 1: Load the ImJoy Core into your HTML file
```js
<script src="https://lib.imjoy.io/imjoy-loader.js"></script>

<script>
loadImJoyCore().then((imjoyCore)=>{
    const imjoy = new imjoyCore.ImJoy({
        imjoy_api: {},
        //imjoy config
    })
    imjoy.start({workspace: 'default'}).then(()=>{
        alert('ImJoy Core started successfully!')
    })
})
</script>
```
A full example html file can be found [here](/src/core-example.html).

Note: To improve reproducibility in production, you should specify the `version` for the core by calling for example `loadImJoyCore({version: "0.13.16"})`.

#### Option 2: Use the npm module

You can install `imjoy-core` via npm: 
```bash
npm install imjoy-core
```

To load and start the ImJoy core in your application:

```js
import * as imjoyCore from 'imjoy-core'

const imjoy = new imjoyCore.ImJoy({
    imjoy_api: {},
    //imjoy config
});

imjoy.start({workspace: 'default'}).then(async ()=>{
    console.log('ImJoy started');
})

```

### Display window plugins

To support the display of window plugins, you will need to listen to the `add_window` event and then create div with a generated window id, for example:
```
imjoy.event_bus.on("add_window", w => {
      const container = document.createElement('div');
      container.id = w.window_id; // <--- this is important
      container.style.backgroundColor = '#ececec';
      container.style.height = "100%";
      container.style.width = "100%";
      // Here we simply add to the body
      // but in reality, you can embed it into your UI
      document.body.appendChild(container)
})
```
Now, if you call `imjoy.api.createWindow` (or within another plugin call `api.createWindow`), ImJoy will first emit `add_window` event, and then it will try to render an iframe under the container defined by `id=w.window_id`.


### Use your web application inside ImJoy

If you want to support loading your web app as an ImJoy `window` plugin, and that will allow users use your web app from within ImJoy and being able to make a workflow out of it. For example, if you have a web app for visualizing data which made to be used as a standalone app, it is easy make it work as an ImJoy window plugin. 

You can easily support by loading the ImJoy Remote Procedure Call(RPC) runtime, which will load and give you an `api` object from the ImJoy core. Later on you can use the `api` functions to register your own api functions (e.g. a `imshow` function for a image viewer app).

#### Option 1: Load the ImJoy RPC library in your HTML file
```js
<script src="https://lib.imjoy.io/imjoy-loader.js"></script>

<script>
loadImJoyRPC().then(async (imjoyRPC)=>{
    const api = await imjoyRPC.setupRPC({name: 'My Awesome App'});
    function setup(){
        api.alert('ImJoy RPC initialized.')
    }
    // define your api which can be called by other plugins in ImJoy
    function my_api_func(){

    }
    // Importantly, you need to call `api.export(...)` in order to expose the api for your web application
    api.export({'setup': setup, 'my_api_func': my_api_func});
})
</script>
```
Note: To improve reproducibility in production, you should specify the `api_version` (or pin to a specific `version`) by calling for example `loadImJoyRPC({api_version: "0.2.3"})`.

Alternatively, you can load the imjoy-rpc library via cdn `https://cdn.jsdelivr.net/npm/imjoy-rpc@latest/dist/imjoy-rpc.min.js` (or replace `@latest` to a version number). Using the the imjoy-loader will be more flexible since it only load when you call the load function.

A full example html file can be found [here](/src/rpc-example.html).
#### Option 2: Import the ImJoy RPC library from the npm module

Install the `imjoy-rpc` library via npm:

```bash
npm install imjoy-rpc
```

Then you can load the ImJoy RPC runtime and setup the RPC, an `api` object can then be used to interact with the ImJoy core.

```js
import { imjoyRPC } from 'imjoy-rpc';

imjoyRPC.setupRPC({name: 'My Awesome App'}).then((api)=>{
 // call api.export to expose your plugin api
})
```

Note: This will only work if your app is started from within ImJoy as a window plugin (iframe). 

You can then serve your web application on any hosting service, e.g. on Github pages. Assuming the url is `https://my-awesome-app.com/` (add query string if necessary).

In any other ImJoy plugin, you can then use your web app by:
```js

// as a new window
const win = await api.createWindow({
    type: 'My Awesome App',
    src: 'https://my-awesome-app.com/',
    data: { }
})

// or, as a dialog
const win = await api.showDialog({
    type: 'My Awesome App',
    src: 'https://my-awesome-app.com/',
    data: { }
})

// further interaction can be performed via `win` object
```

### Connecting to imjoy engine server
 **This is an experimental feature**

Similarly to the standard ImJoy RPC library, If you want to connect to a remote imjoy engine server with ImJoy RPC , you can call `loadImJoyRPCSocketIO()` from the imjoy loader:
```js
<script src="https://lib.imjoy.io/imjoy-loader.js"></script>

<script>
loadImJoyRPCSocketIO().then(async (imjoyRPCSocketIO)=>{
    const api = await imjoyRPCSocketIO.connectToServer({
        name: 'My Awesome App',
        workspace: "my-shared-workspace",
        server_url: "https://api.imjoy.io",
        token: "1sf3s32..."
    });

    function setup(){
        api.alert('ImJoy RPC initialized.')
    }
    // define your api which can be called by other plugins in ImJoy
    function my_api_func(){

    }
    // Importantly, you need to call `api.export(...)` in order to expose the api for your web application
    api.export({'setup': setup, 'my_api_func': my_api_func});
})
</script>
```

If you prefer npm, you can first install imjoy-rpc via `npm install imjoy-rpc`, then use it by importing `imjoyRPCSocketIO`:
```js
import { imjoyRPCSocketIO } from "imjoy-rpc";

const api = await imjoyRPCSocketIO.connectToServer({
    name: 'My Awesome App',
    workspace: "my-shared-workspace",
    server_url: "https://api.imjoy.io",
    token: "1sf3s32..."
});

function setup(){
    api.alert('ImJoy RPC initialized.')
}
// define your api which can be called by other plugins in ImJoy
function my_api_func(){

}
// Importantly, you need to call `api.export(...)` in order to expose the api for your web application
api.export({'setup': setup, 'my_api_func': my_api_func});
```
### Using with RequireJS (and jQuery)

You can also use the libraries with RequireJS, this is typically used with, for example jQuery.

The following example illustrate the use of imjoyLoader with RequireJS.
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.min.js"></script>
<script>
require.config({
    paths: {
        'imjoyLoader': 'https://lib.imjoy.io/imjoy-loader.js',
    }
});

require(["imjoyLoader"], function (imjoyLoder) {
    imjoyLoder.loadImJoyRPC().then(async (imjoyRPC) => {

    }
    imjoyLoder.loadImJoyCore().then(async (imjoyCore) => {
        
    }
}
</script>
```

Similarily, you can also use RequireJS to load `imjoy-rpc` and `imjoy-core`.

### Automatically switching between plugin and core mode
For web applications which support loading as a plugin and use the imjoy core,
we provide a function to enable automatic swithching between the two modes by detecting whether the current webpage is loaded inside an iframe:
```js
// check if it's inside an iframe
if(window.self !== window.top){
    loadImJoyRPC().then((imjoyRPC)=>{
        
    })
}
else {
    loadImJoyCore().then((imjoyCore)=>{

    })
}
```

### Load ImJoy basic app
If you want to setup a basic ImJoy app, you can use the `loadImJoyBasicApp` function.



For example, if you want to build a basic ImJoy app or use it within your project websie, you will need to:

1. Add the following script tag in your HTML:
```html
<script src="https://lib.imjoy.io/imjoy-loader.js"></script>
```
2. Optionally, add div tags for the displaying the ImJoy menu and windows. For example:
```html
    <div id="window-container"></div>
    <div id="menu-container"></div>
```
3. To initialize the app, add the following javascript code to a script block or your script file:
```js
loadImJoyBasicApp({
    process_url_query: true,
    show_window_title: false,
    show_progress_bar: true,
    show_empty_window: true,
    menu_style: { position: "absolute", right: 0, top: "2px" },
    window_style: {width: '100%', height: '100%'},
    main_container: null,
    menu_container: "menu-container",
    window_manager_container: "window-container",
    imjoy_api: { } // override some imjoy API functions here
}).then(async app => {
    // get the api object from the root plugin
    const api = app.imjoy.api;
    // if you want to let users to load new plugins, add a menu item
    app.addMenuItem({
        label: "➕ Load Plugin",
        callback() {
        const uri = prompt(
            `Please type a ImJoy plugin URL`,
            "https://github.com/imjoy-team/imjoy-plugins/blob/master/repository/ImageAnnotator.imjoy.html"
        );
        if (uri) app.loadPlugin(uri);
        },
    });

    // if you want a windows displayed in a draggable rezisable grid layout
    const grid = await api.createWindow({
        src: "https://grid.imjoy.io/#/app",
        name: "Grid",
    });
    // you can show windows in the grid
    const viewer = await grid.createWindow({ src: "https://kaibu.org" });

    // or display a message
    await api.showMessage("This is a message");
    // or progress
    await api.showProgress(50);
});
```


### API options
For the loader functions (`loadImJoyRPC`, `loadImJoyCore`, `loadImJoyBasicApp`), you can optinally pass a `config` object contains the following options:
 * `version`: specify the `imjoy-core` or `imjoy-rpc` library version
 * `api_version`: for `imjoy-rpc` only, to contrain the api version of the RPC
 * `debug`: load the full `imjoy-core` version instead of a minified version, useful for debugging
 * `base_url`: a custom url for loading the libraries

 For `loadImJoyBasicApp`, there are several additional options:
 * `process_url_query`: Boolean, whether the url query should be processed
 * `show_window_title`: Boolean, whether the window title should be shown
 * `show_progress_bar`: Boolean, whether the progress bar should be shown
 * `show_empty_window`: Boolean, whether the empty window should be shown
 * `hide_about_imjoy`: Boolean, whether the about ImJoy menu item should be hidden
 * `menu_style`: Object, the menu style
 * `window_style`: Object, the window style
 * `main_container`: String, the id of the main container
 * `menu_container`: String, the id of the menu container
 * `window_manager_container`: String, the id of the window container
 * `imjoy_api`: Object, override the implementation of some ImJoy API functions
## Examples for using the ImJoy Core

To get started, please take a look at:
 * [ImJoy-Lite](https://github.com/imjoy-team/ImJoy/blob/master/web/public/lite.html) ([live demo](https://imjoy.io/lite))
 * [BioImage Model Zoo](https://github.com/bioimage-io/bioimage.io) ([live demo](https://bioimage.io))


A more complete example is the [ImJoy Application](https://github.com/imjoy-team/ImJoy) ([live demo](https://imjoy.io)).
