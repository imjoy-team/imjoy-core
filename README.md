# ImJoy

The [ImJoy](https://imjoy.io) core library -- a sandboxed plugin framework which can be used for building computational web applications.

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