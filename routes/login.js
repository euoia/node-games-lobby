// AJAX login request.
exports.doLogin = function(req, res){
	console.log(req.body);
	console.log(req.body.username);
	if (req.body.username === 'james' || req.body.username === 'bob') {
		req.session.username = req.body.username;
		res.send({result: 'ok'});
	} else {
		res.send({result: 'fail', message: 'Invalid username.'});
	}
};
