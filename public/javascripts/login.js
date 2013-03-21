// Tightly coupled to the HTML.
// Requires chat.js.
// TODO: Rename this module to session.

// Options:
//   usernameInput
//   loginForm
//   logout

define (['jquery', 'underscore', 'chat'], function($, _, Chat) {
	function Login(chat, options) {
		var $this = this;
		this.chat = chat;

		// Add all options to this object.
		// Perhaps it would be better to do this explicitly?
		_.extend(this, options);

		$(this.usernameInput).focus();

		$(this.loginForm).submit(function() {
			$this.doLogin();
			return false;
		});

		$(this.logout).click(function() {
			$this.logoutCmd();
			return false;
		});

		// See if the user already has a session.
		$.post("/session/check", {}, function(data) {
			if (data.result === 'ok') {
				console.log('already had a session');
				console.log(data);
				// The server supports multiple rooms but the client only supports a single room.
				// TODO: Make this more general, instead of simply joining the first room.
				$this.loginSuccess(data.username, data.rooms[0]);
			} else {
				console.log('no session - showing login');
				$('.login').show();
				$($this.usernameInput).focus();
			}
		});

		this.chat.addCommand('logout', this.logoutCmd.bind(this));
		this.chat.addCommand('userList', this.refreshUserListCmd.bind(this));
	}

	Login.prototype.addError = function(message) {
		$('#enterUsernameErrorBox').html(
			"<span class='text-error'>" + message + "</span>");
	};

	Login.prototype.loginFailure = function(message) {
		this.addError(message);
		return false;
	};


	Login.prototype.loginSuccess = function(username, roomName) {
		var $this = this;

		if (roomName === undefined) {
			$('.login').show();
			this.addError('Cannot join a room without specifying a name.');
			// TODO: Fix the server so that it returns the room name when rejoining.
			return false;
		}

		this.chat.connect(username, roomName);

		// TODO: Move these out of here into the app callback.
		$('.login').hide();
		$('.chatting').show();
		$('.user-input').focus();
	};

	Login.prototype.doLogin = function() {
		var username = $('#usernameInput').val(),
			roomName = $('#roomName').val(),
			$this = this;

		$.post(
			"/session/login", {
			username: username
		},

		function(data) {
			if (data.result !== 'ok') {
				return $this.loginFailure(data.message);
			}

			$this.loginSuccess(username, roomName);
		});
	};

	Login.prototype.logoutSuccess = function(username, rooms) {
		// This is probably the most secure way to ensure that nothing is left in
		// the browser memory.
		location.reload();
	};

	Login.prototype.doLogout = function() {
		console.log('Login logout');
		var $this = this;

		$.post(
			"/session/logout", {},

		function(data) {
			// Assume success. Can't handle failure anyway.
			$this.logoutSuccess();
			$($this.usernameInput).focus();
		});
	};

	Login.prototype.logoutCmd = function() {
		this.chat.logout();
		this.doLogout();
	};

	Login.prototype.refreshUserListCmd = function() {
		this.chat.refreshUserList();
	};

	return Login;

});
