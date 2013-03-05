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

define([
		'jquery',
		'login'
	], function($, Login) {

		var login;

		$(document).ready(function() {
			login = new Login({
				usernameInput: '#usernameInput',
				loginForm: '#login',
				logout: '#logout'
			});
		});

		return login;
});
