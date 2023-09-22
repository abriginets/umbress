module.exports = {
    preset: 'ts-jest',
    rootDir: '../',
    moduleDirectories: ['node_modules', 'src'],
    globals: {
        'ts-jest': {
            isolatedModules: true
        }
    },
    collectCoverage: true
}
