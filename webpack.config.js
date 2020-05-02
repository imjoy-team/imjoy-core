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

const index_file = {
    // path to folder in which the file will be created
    path: path.join(__dirname, "dist"),
    // file name
    fileName: 'index.js',
    // content of the file
    content: "module.exports = require('./imjoy-core.module.js');"
};

const readme_file = {
    // path to folder in which the file will be created
    path: path.join(__dirname, "dist"),
    // file name
    fileName: 'README.md',
    // content of the file
    content: "# Core Library for [ImJoy](https://imjoy.io)\n\nFiles in this repo are automatically generated from the [`ImJoy-Core` repo](https://github.com/imjoy-team/ImJoy-core) and served in `https://lib.imjoy.io`.\n"
};

const isDevServer = process.env.WEBPACK_DEV_SERVER;
module.exports = {
    entry: {
        'imjoyCore': path.resolve(__dirname, 'src', 'imjoyCore.js'),
        'imjoyLoader': path.resolve(__dirname, 'src', 'imjoyLoader.js'),
    },
    resolve: {
        extensions: ['.js']
    },
    devtool: 'source-map',
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
        new CreateFileWebpack(index_file),
        new CreateFileWebpack(readme_file),
        new CnameWebpackPlugin({
            domain: 'lib.imjoy.io',
        }),
        new CopyWebpackPlugin([
            {
                from: path.join(__dirname, "node_modules/imjoy-rpc/dist/"),
                to: path.join(__dirname, "dist"),
            },{
                from: path.join(__dirname, "src/base_frame.html"),
                to: path.join(__dirname, "dist/base_frame.html"),
                toType: "file",
                transform(content) {
                    if(isDevServer){
                        return content
                        .toString().replace(/src="(.*?)"/, 'src="/imjoy-rpc.js"')
                    }
                    else{
                        return content.toString()
                    }
                },
            },{
                from: path.join(__dirname, "src/joy.css"),
                to: path.join(__dirname, "dist/static/joy.css"),
                toType: "file"
            },{
                from: path.join(__dirname, "src/core-example.html"),
                to: path.join(__dirname, "dist/core-example.html"),
                toType: "file"
            },{
                from: path.join(__dirname, "src/plugin-example.html"),
                to: path.join(__dirname, "dist/plugin-example.html"),
                toType: "file"
            },{
                from: path.join(__dirname, "package.json"),
                to: path.join(__dirname, "dist/package.json"),
                toType: "file"
            },{
                from: path.join(__dirname, "package-lock.json"),
                to: path.join(__dirname, "dist/package-lock.json"),
                toType: "file"
            },
        ]),
        
    ]
}