module.exports = {
  presets: [['module:metro-react-native-babel-preset', {
       unstable_disableES6Transforms: true
   }]],
  plugins: [
    ['@babel/plugin-transform-private-methods', {loose: true}]
  ]
};