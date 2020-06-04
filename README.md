![License](https://img.shields.io/github/license/imjoy-team/imjoy-core.svg)
[![Build ImJoy Core](https://github.com/imjoy-team/imjoy-core/workflows/Build%20ImJoy%20Core/badge.svg)](https://github.com/imjoy-team/imjoy-core/actions)
[![Join the chat at https://gitter.im/imjoy-dev/community](https://badges.gitter.im/imjoy-dev/community.svg)](https://gitter.im/imjoy-dev/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![image.sc forum](https://img.shields.io/badge/dynamic/json.svg?label=forum&url=https%3A%2F%2Fforum.image.sc%2Ftags%2Fimjoy.json&query=%24.topic_list.tags.0.topic_count&colorB=brightgreen&suffix=%20topics&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAABPklEQVR42m3SyyqFURTA8Y2BER0TDyExZ+aSPIKUlPIITFzKeQWXwhBlQrmFgUzMMFLKZeguBu5y+//17dP3nc5vuPdee6299gohUYYaDGOyyACq4JmQVoFujOMR77hNfOAGM+hBOQqB9TjHD36xhAa04RCuuXeKOvwHVWIKL9jCK2bRiV284QgL8MwEjAneeo9VNOEaBhzALGtoRy02cIcWhE34jj5YxgW+E5Z4iTPkMYpPLCNY3hdOYEfNbKYdmNngZ1jyEzw7h7AIb3fRTQ95OAZ6yQpGYHMMtOTgouktYwxuXsHgWLLl+4x++Kx1FJrjLTagA77bTPvYgw1rRqY56e+w7GNYsqX6JfPwi7aR+Y5SA+BXtKIRfkfJAYgj14tpOF6+I46c4/cAM3UhM3JxyKsxiOIhH0IO6SH/A1Kb1WBeUjbkAAAAAElFTkSuQmCC)](https://forum.image.sc/tags/imjoy)


# ImJoy Core

The [ImJoy](https://imjoy.io) core library -- a sandboxed plugin framework for building computational web applications.

<a href="https://imjoy.io" target="_blank" ><img src="https://raw.githubusercontent.com/imjoy-team/ImJoy/master/web/public/static/img/imjoy-logo-black.svg?sanitize=true" width="380"></img>
</a>

## Usage

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
import * as imjoyRPC from 'imjoy-rpc';

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

### API options
For the loader functions (`loadImJoyRPC`, `loadImJoyCore`), you can optinally pass a `config` object contains the following options:
 * `version`: specify the `imjoy-core` or `imjoy-rpc` library version
 * `api_version`: for `imjoy-rpc` only, to contrain the api version of the RPC
 * `debug`: load the full `imjoy-core` version instead of a minified version, useful for debugging
 * `base_url`: a custom url for loading the libraries

## Examples for using the ImJoy Core

To get started, please take a look at:
 * [ImJoy-Lite](https://github.com/imjoy-team/ImJoy/blob/master/web/public/lite.html) ([live demo](https://imjoy.io/lite))
 * [BioImage Model Zoo](https://github.com/bioimage-io/bioimage.io) ([live demo](https://bioimage.io))


A more complete example is the [ImJoy Application](https://github.com/imjoy-team/ImJoy) ([live demo](https://imjoy.io)).


## Development

```
git clone https://github.com/imjoy-team/imjoy-core.git
cd imjoy-core
npm run install

# test
npm run test

# build
npm run build
```

For project maintainers, the publish is automatic with the current github actions setup. Here are the steps:
 * Bump the version in package.json, say `0.20.0`
 * Commit the changes with commit message `Release 0.20.0`

## Issues

This repo only accept PR, please post issue to the ImJoy repo: https://github.com/imjoy-team/ImJoy/issues.

## Citation

Please cite our paper on Nature Methods ([https://www.nature.com/articles/s41592-019-0627-0](https://www.nature.com/articles/s41592-019-0627-0), free access: https://rdcu.be/bYbGO ):

`Ouyang, W., Mueller, F., Hjelmare, M. et al. ImJoy: an open-source computational platform for the deep learning era. Nat Methods (2019) doi:10.1038/s41592-019-0627-0`

## Code of Conduct

Help us keep the ImJoy community open and inclusive. Please read and follow our [Code of Conduct](https://github.com/imjoy-team/ImJoy/blob/master/docs/CODE_OF_CONDUCT.md).


## License

[MIT License](https://github.com/imjoy-team/imjoy-core/blob/master/LICENSE)
