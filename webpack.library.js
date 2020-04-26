const path = require('path');
// const webpack = require('webpack');
const {InjectManifest} = require('workbox-webpack-plugin');

module.exports = (env, argv) => {
    const options = require('./webpack.config.js');
    options.output = {
        path: path.resolve(__dirname, 'dist'),
        filename: argv.filename || 'imjoy-core.js',
        library: 'imjoyCore',
        libraryTarget: argv.libraryTarget ? argv.libraryTarget : 'umd',
        umdNamedDefine: true
    }
    if(argv.generate_service_worker){
        options.plugins.push(
            new InjectManifest({
                swDest: 'plugin-service-worker.js',
                swSrc: path.join(__dirname, 'src/plugin-service-worker.js'),
                exclude: [new RegExp('^[.].*'), new RegExp('.*[.]map$')]
            })
        )
    }

    return options
};


