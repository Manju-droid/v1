module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
            '@v/shared': '../shared/src',
            '@v/api-client': '../api-client/src',
          },
        },
      ],
    ],
  };
};
