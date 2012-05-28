
var express = require('./')
  , app = express();

var user = { name: 'Tobi' };

app.param('user_id', function(req, res, next, id){
  console.log(id);
});

app.get('/:user_id/post/:post_id', function(req, res){
  res.send(req.params.user);
});

app.get('*', function(req, res, next){
  console.log('GET one');
  next();
});

app.use(function(req, res, next){
  console.log('use');
  next();
});

app.get('*', one, two, function(req, res, next){
  console.log('GET two');
  res.send('hey\n');
});

function one(req, res, next) {
  console.log('middleware one');
  next();
}

function two(req, res, next) {
  console.log('middleware two');
  next();
}


app.listen(4000);
