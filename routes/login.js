// AJAX login request.
exports.doLogin = function(req, res){
	if (req.body.username === 'james' || req.body.username === 'bob') {
		req.session.username = req.body.username;
		res.send({result: 'ok'});
	} else {
		res.send({result: 'fail', message: 'Invalid username.'});
	}
};

exports.checkSession = function(req, res) {
	if (req.session.username !== undefined) {
		res.send({result: 'ok'});
	} else {
		res.send({result: 'fail'});
	}
};
