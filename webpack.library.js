const path = require('path');
const { InjectManifest } = require('workbox-webpack-plugin');
const renameOutputPlugin = require('rename-output-webpack-plugin');

module.exports = (env, argv) => {
    const options = require('./webpack.config.js');
    options.output = {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        library: '[name]',
        libraryTarget: argv.libraryTarget ? argv.libraryTarget : 'umd',
        umdNamedDefine: true
    }
    if (argv.generate_service_worker) {
        options.plugins.push(
            new InjectManifest({
                swDest: 'plugin-service-worker.js',
                swSrc: path.join(__dirname, 'src/plugin-service-worker.js'),
                exclude: [new RegExp('^[.].*'), new RegExp('.*[.]map$')]
            })
        )
    }
    options.plugins.push(
        new renameOutputPlugin({
            'imjoyCore': argv.fileid ? 'imjoy-core.' + argv.fileid + '.js' : 'imjoy-core.js',
            'imjoyLoader': argv.fileid ? 'imjoy-loader.' + argv.fileid + '.js' : 'imjoy-loader.js',
        })
    )

    return options
};