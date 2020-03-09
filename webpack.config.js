const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin')
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


module.exports = {
    entry: path.resolve(__dirname, 'src', 'imjoyCore.js'),
    resolve: {
        extensions: ['.js']
    },
    module: {
        rules: [
            {
                test: /\.imjoy.html$/i,
                use: 'raw-loader'
            }
        ]
    },
    plugins: [
        new CreateFileWebpack(version_file),
        new CreateFileWebpack(nojekyll_file),
        new CnameWebpackPlugin({
            domain: 'lib.imjoy.io',
        }),
        new CopyWebpackPlugin([ {
                from: path.join(__dirname, "src/plugin-service-worker.js"),
                to: path.join(__dirname, "dist/plugin-service-worker.js"),
                toType: "file"
            },
            {
                from: path.join(__dirname, "src/manifest.json"),
                to: path.join(__dirname, "dist/manifest.json"),
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