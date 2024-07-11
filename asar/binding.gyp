{
  'targets': [{
    'target_name': 'asar',
    'sources': [ 'src/asar.cc' ],
    'dependencies': [
        "<!(node -p \"require('node-addon-api').targets\"):node_addon_api_except",
    ],
    'include_dirs': [
       '/Users/jlopez/IdeaProjects/personal/asar/src',
    ],
    'libraries': [
      '-Wl,-rpath,/Users/jlopez/IdeaProjects/personal/asar/asar/lib',
      '/Users/jlopez/IdeaProjects/personal/asar/asar/lib/libasar.dylib',
    ],
  }],
}