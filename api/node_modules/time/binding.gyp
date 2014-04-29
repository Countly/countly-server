{
  'targets': [
    {
      'target_name': 'time',
      'include_dirs': ["<!(node -p -e \"require('path').dirname(require.resolve('nan'))\")"],
      'sources': [ 'src/time.cc' ],
      'conditions': [
        ['OS=="mac"', {
          'defines': [
            '__DARWIN_UNIX03', # For char* timezone
            'HAVE_TM_GMTOFF'
          ]
        }],
        ['OS=="linux"', {
          'defines': [
            'HAVE_TM_GMTOFF'
          ]
        }],
        ['OS=="solaris"', {
          'defines': [
            'HAVE_ALTZONE',
            'HAVE_TIMEZONE'
          ]
        }]
      ]
    }
  ]
}
