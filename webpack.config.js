const path = require('path')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')

const PATHS = {
    src: path.resolve(__dirname, 'public/src'),
    dist: path.resolve(__dirname, 'public/dist')
}

module.exports = {
    mode: 'production',
    externals: {
        paths: PATHS.src
    },
    entry: {
        automated: path.resolve(PATHS.src, 'automated.ts'),
        recaptcha: path.resolve(PATHS.src, 'recaptcha.ts')
    },
    output: {
        path: PATHS.dist,
        filename: '[name].js',
        publicPath: '/'
    },
    module: {
        rules: [
            {
                test: /\.ts?$/,
                loader: 'ts-loader',
                include: path.resolve(__dirname, 'public/src'),
                exclude: ['/node_modules/', '/src/', '/dist/']
            },
            {
                test: /\.m?js$/,
                loader: 'babel-loader',
                exclude: /(node_modules|src|dist)/
            },
            {
                test: /\.scss$/,
                use: [
                    'style-loader',
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            sourceMap: true
                        }
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            sourceMap: false,
                            config: {
                                path: `./postcss.config.js`
                            }
                        }
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            sourceMap: true
                        }
                    }
                ]
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            sourceMap: true
                        }
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            sourceMap: false,
                            config: {
                                path: `./postcss.config.js`
                            }
                        }
                    }
                ]
            }
        ]
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: '[name].css'
        }),
        new CleanWebpackPlugin()
    ],
    resolve: {
        extensions: ['.ts', '.js']
    },
    stats: {
        entrypoints: false,
        children: false
    }
}
