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

See [integration with ImJoy-Core](https://github.com/imjoy-team/imjoy-core/blob/master/docs/integration.md) for more details.

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
