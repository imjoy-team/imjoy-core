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
 * [ImJoy-Lite](https://github.com/imjoy-team/ImJoy/blob/master/web/public/lite.html)
 * [BioImage Model Zoo](https://github.com/bioimage-io/bioimage.io)


A more complete example is the [ImJoy](https://github.com/imjoy-team/ImJoy) App.
 
## License

[MIT License](https://github.com/imjoy-team/imjoy-core/blob/master/LICENSE)
