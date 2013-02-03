// TODO: This should probably be called session.

// AJAX login request.
// TODO: DB Lookup.
exports.doLogin = function(req, res) {
	if (req.body.username === 'james' || req.body.username === 'bob') {
		req.session.username = req.body.username;
		res.send({
			result: 'ok'
		});
	} else {
		res.send({
			result: 'fail',
			message: 'Invalid username.'
		});
	};
};

// AJAX login request.
exports.doLogout = function(req, res) {
	req.session.destroy();
	res.send({
		result: 'ok'
	});
};

exports.checkSession = function(req, res) {
	if (req.session.username !== undefined) {
		res.send({
			result: 'ok',
			username: req.session.username
		});
	} else {
		res.send({
			result: 'fail'
		});
	}
};
