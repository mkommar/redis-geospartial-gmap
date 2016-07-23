const Webpack = require( 'webpack' ),
    path = require( 'path' ),
    autoprefixer = require( 'autoprefixer' ),
    CleanWebpackPlugin = require( 'clean-webpack-plugin' ),
    ExtractTextPlugin = require( 'extract-text-webpack-plugin' ),
    config = {
        entry: [
            path.resolve( __dirname, './client/scripts/index.js' )
        ],
        output: {
            path: path.resolve( __dirname, 'public/build' ),
            filename: 'bundle.js',
            publicPath: '/build/'
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
                    // include: path.resolve( __dirname, 'client/styles/fonts' )
                },
                {
                    test: /\.(png|jpg|gif)(\?\S*)?$/,
                    loader: 'file',
                    //include: path.resolve( __dirname, 'client/styles/images' )
                },
                {
                    test: /\.css$/,
                    loader: ExtractTextPlugin.extract( 'style', ['css', 'postcss'] )
                },
                {
                    test: /\.scss$/,
                    loader: ExtractTextPlugin.extract( 'style', ['css', 'postcss', 'sass'] )
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
        postcss: [autoprefixer],
        plugins: [
            new ExtractTextPlugin( 'bundle.css', {allChunks: true} ),
            new Webpack.optimize.OccurenceOrderPlugin(),
            new Webpack.NoErrorsPlugin(),
            new Webpack.ProvidePlugin( {
                $: "jquery",
                jQuery: "jquery"
            } ),
            new CleanWebpackPlugin( ['public/build'], {
                root: __dirname,
                verbose: true,
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