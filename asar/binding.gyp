{
  'targets': [{
    'target_name': 'asar',
    'sources': [ 'src/asar.cc' ],
    'dependencies': [
        "<!(node -p \"require('node-addon-api').targets\"):node_addon_api_except",
    ],  
  }],
}