const Webpack = require( 'webpack' ),
    path = require( 'path' ),
    autoprefixer = require( 'autoprefixer' ),
    CleanWebpackPlugin = require( 'clean-webpack-plugin' ),

    appConfig = require( './config.json' ),
    config = {
        cache: true,
        devtool: 'eval',
        entry: [
            path.resolve( __dirname, './client/scripts/index.js' ),
            path.resolve( __dirname, './node_modules/webpack/hot/dev-server' )
        ],
        output: {
            path: path.resolve( __dirname, 'public/build' ),
            filename: 'bundle.js',
            publicPath: appConfig.app.baseUrl + '/build/'
        },
        module: {
            loaders: [
                {
                    test: /\.js$/,
                    exclude: /node_modules|bower_components/,
                    loader: 'babel',
                    query: {
                        plugins: ['lodash'],
                        presets: ['es2015', 'stage-0']
                    }
                },
                {
                    test: /\.vue$/,
                    exclude: /node_modules|bower_components/,
                    loader: "vue"
                },
                {
                    test: /\.(woff|woff2|ttf|eot|svg)(\?\S*)?$/,
                    loader: 'file',
                    //include: path.resolve( __dirname, 'client/styles' )
                },
                {
                    test: /\.(png|jpg|gif)(\?\S*)?$/,
                    loader: 'file',
                    //include: path.resolve( __dirname, 'client/styles/images' )
                },
                {
                    test: /\.css$/,
                    loaders: ['style', 'css', 'postcss']
                },
                {
                    test: /\.scss$/,
                    loaders: ['style', 'css', 'postcss', 'sass']
                },
                {
                    test: /\.hbs$/,
                    loader: 'handlebars',
                    query: {
                        helperDirs: [path.resolve( __dirname, 'shared', 'helpers' )],
                        rootRelative: ''
                    }
                },
                {
                    test: /\.html$/,
                    loaders: ['html']
                },
                {
                    test: /\.json/,
                    loaders: ['json']
                }
            ],
            postLoaders: [
                {test: /vue-icons/, loader: 'callback-loader'}
            ]
        },
        callbackLoader: require( 'vue-icons/icon-loader' )( require( './client/icons.json' ) ),
        // don't parse some dependencies to speed up build.
        // can probably do this non-AMD/CommonJS deps
        //noParse: [
        //    path.join( bowerRoot, '/jquery' )
        //],
        postcss: [autoprefixer],
        plugins: [
            new Webpack.optimize.OccurenceOrderPlugin(),
            new Webpack.HotModuleReplacementPlugin(),
            new Webpack.NoErrorsPlugin(),
            new Webpack.ProvidePlugin( {
                $: "jquery",
                jQuery: "jquery"
            } ),
            new CleanWebpackPlugin( ['public/build'], {
                root: __dirname,
                verbose: false,
                dry: false
            } ),
            new Webpack.ContextReplacementPlugin( /moment[\/\\]locale$/, /ru/ )
        ],
        resolve: {
            modulesDirectories: ['node_modules', 'client', 'shared/views/partials', 'shared/helpers']
        },
        babel: {
            presets: ['es2015', 'stage-0'],
            plugins: ['transform-runtime', 'lodash']
        },
        vue: {
            loaders: {
                scss: 'vue-style!css!sass'
            }
        }
    };

module.exports = config;