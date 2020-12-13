const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin')
const CnameWebpackPlugin = require('cname-webpack-plugin')
const CreateFileWebpack = require('create-file-webpack')
const renameOutputPlugin = require('rename-output-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer')
  .BundleAnalyzerPlugin;
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
    content: "module.exports = require('./imjoy-core.min.js');"
};

const readme_file = {
    // path to folder in which the file will be created
    path: path.join(__dirname, "dist"),
    // file name
    fileName: 'README.md',
    // content of the file
    content: "# Core Library for [ImJoy](https://imjoy.io)\n\nFiles in this repo are automatically generated from the [`ImJoy-Core` repo](https://github.com/imjoy-team/ImJoy-core) and served in `https://lib.imjoy.io`.\n"
};

module.exports = {
    entry: {
        'imjoyCore': path.resolve(__dirname, 'src', 'imjoyCore.js'),
        'imjoyLoader': path.resolve(__dirname, 'src', 'imjoyLoader.js'),
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: process.env.NODE_ENV === 'production'? '[name].min.js': '[name].js',
        library: '[name]',
        libraryTarget: 'umd',
        umdNamedDefine: true
    },
    devServer: {
        contentBase: path.join(__dirname, 'dist'),
        compress: true,
        port: 8080
    },
    resolve: {
        extensions: ['.js']
    },
    module: {
        rules: [
            {
                test: /\.imjoy.html$/i,
                use: 'raw-loader'
            },
            {
                test: /\.webworker\.js$/,
                use: [{
                  loader: 'worker-loader',
                  options: {
                    inline: true,
                    name: '[name].js',
                    fallback: false
                  }
                }, ],
              },
            {
                test: /\.js$/,
                exclude: [/node_modules/, /\.webworker\.js$/],
                use: [{
                    loader: 'babel-loader',
                    options: {
                      presets: [
                        [
                          '@babel/preset-env',
                          {
                            targets: { browsers: ['last 2 Chrome versions'] },
                            useBuiltIns: 'entry',
                            corejs: "3.0.0",
                            modules: false,
                          },
                        ],
                      ],
                      plugins: ['@babel/plugin-syntax-dynamic-import', "lodash"],
                      cacheDirectory: true,
                    },
                }
              ],},
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

        new renameOutputPlugin({
            'imjoyCore': process.env.NODE_ENV === 'production'? 'imjoy-core.min.js': 'imjoy-core.js',
            'imjoyLoader': process.env.NODE_ENV === 'production'?'imjoy-loader.min.js': 'imjoy-loader.js',
        }),
        new CopyWebpackPlugin([
            {
                from: path.join(__dirname, "node_modules/imjoy-rpc/dist/"),
                to: path.join(__dirname, "dist"),
            },{
                from: path.join(__dirname, "src/default_base_frame.html"),
                to: path.join(__dirname, "dist/default_base_frame.html"),
                toType: "file",
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
        new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: path.join(__dirname, 'report.html'),
          }),
    ]
}