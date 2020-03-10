var ghpages = require('gh-pages');
ghpages.publish('dist', {
    branch: 'master',
    dotfiles: true,
    message: 'Manually deployed.',
    repo: 'git@github.com:imjoy-team/lib.imjoy.io.git'
  },
  function(err) {
    if(err){
      console.error(err)
    }
    else{
      console.log('deployed successfully.')
    }
});
