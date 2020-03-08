const path = require('path');
// const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin')
const {InjectManifest} = require('workbox-webpack-plugin');
const CnameWebpackPlugin = require('cname-webpack-plugin')
const CreateFileWebpack = require('create-file-webpack')
const package_json = require('./package.json')

const version_file = {
  // path to folder in which the file will be created
  path: path.join(__dirname, "dist"),
  // file name
  fileName: 'version.json',
  // content of the file
  content: `{"name": "${package_json.name}", "version": "${package_json.version}", "description": "${package_json.description}"}`
};

const nojekyll_file = {
    // path to folder in which the file will be created
    path: path.join(__dirname, "dist"),
    // file name
    fileName: '.nojekyll',
    // content of the file
    content: ""
};


module.exports = (env, argv) => {
    const options = {
        entry: path.resolve(__dirname, 'src', 'index.js'),
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: argv.filename || 'imjoy-core.js',
            library: 'imjoyCore',
            libraryTarget: argv.libraryTarget ? argv.libraryTarget : 'umd'
        },
        resolve: {
            extensions: ['.js']
        },
        module: {
            rules: [
            ]
        },
        plugins: [
            new CreateFileWebpack(version_file),
            new CreateFileWebpack(nojekyll_file),
            new CnameWebpackPlugin({
                domain: 'core.imjoy.io',
            }),
            new CopyWebpackPlugin([ {
                    from: path.join(__dirname, "src/plugin-service-worker.js"),
                    to: path.join(__dirname, "dist/plugin-service-worker.js"),
                    toType: "file"
                },
                {
                    from: path.join(__dirname, "src/jailed"),
                    to: path.join(__dirname, "dist/static/jailed"),
                    toType: "dir"
                },{
                        from: path.join(__dirname, "src/joy.css"),
                        to: path.join(__dirname, "dist/joy.css"),
                        toType: "file"
                }
            ]),
            
        ]
    }
    if(argv.mode === 'production'){
        options.plugins.push(
            new InjectManifest({
                swDest: 'plugin-service-worker.js',
                swSrc: 'src/plugin-service-worker.js'
            })
        )
    }
    return options
};


