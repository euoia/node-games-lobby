requirejs.config({
	shim: {
		'jquery': {
			exports: '$'
		},
		'underscore': {
			exports: '_'
		}
	}
});

require([
		'jquery',
		'login'
	], function($, Login) {
		var login = null;

		$(document).ready(function() {
			login = new Login({
				usernameInput: '#usernameInput',
				loginForm: '#login',
				logout: '#logout'
			});
		});
});
