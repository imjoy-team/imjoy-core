# ImJoy Core

The [ImJoy](https://imjoy.io) core library -- a sandboxed plugin framework for building computational web applications.

## Installation

```
npm install imjoy-core
```

## Usage

```js
import * as imjoyCore from 'imjoy-core'

const imjoy = new imjoyCore.ImJoy({
    imjoy_api: {},
});

imjoy.start({workspace: 'default'}).then(async ()=>{
    console.log('ImJoy started');
})

```

## Examples

To get started, please take a look at:
 * [ImJoy-Lite](https://github.com/imjoy-team/ImJoy/blob/master/web/public/lite.html) ([live demo](https://imjoy.io/lite))
 * [BioImage Model Zoo](https://github.com/bioimage-io/bioimage.io) ([live demo](https://bioimage.io))


A more complete example is the [ImJoy Application](https://github.com/imjoy-team/ImJoy) ([live demo](https://imjoy.io)).
 
## License

[MIT License](https://github.com/imjoy-team/imjoy-core/blob/master/LICENSE)
