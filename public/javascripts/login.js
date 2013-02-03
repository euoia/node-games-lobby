// Tightly coupled to the HTML.
// Requires chat.js.

// Options:
//   usernameInput
//   loginForm
//   logout
function Login(options) {
	var $this = this;

	this.chat = null;

	_.extend(this, options);

	$(this.usernameInput).focus();

	$(this.loginForm).submit(function() {
		$this.doLogin();
		return false;
	});

	$(this.logout).click(function() {
		$this.doLogout();

		return false;
	});

	// See if the user already has a session.
	$.post("/login/checkSession", {}, function(data) {
		if (data.result === 'ok') {
			$this.loginSuccess(data.username);
		}
	});
}

Login.prototype.loginFailure = function(message) {
	$('#enterUsernameErrorBox').html(
		"<span class='text-error'>" + message + "</span>");

	return false;
};


Login.prototype.loginSuccess = function(username, roomName) {
	var $this = this;

	if (roomName === undefined) {
		roomName = 'default';
	}

	if (this.chat === null) {
		// Chat may not be null if we have already logged in.
		this.chat = new Chat({
			username: username,
			roomName: roomName,
			userListDiv: '#left-sidebar',
			messagesUl: '#chat-room .chat-box ul',
			messageScroll: '#content-body',
			messageEntryForm: '#message-entry-form',
			messageEntry: '#message-entry',
			commands: {
				'logout': this.logoutCmd.bind(this)
			}
		});
	}

	this.chat.connect(roomName);

	$('.login').hide();
	$('.chatting').show();
	$('.user-input').focus();
};

Login.prototype.doLogin = function() {
	var username = $('#usernameInput').val(),
		roomName = $('#roomName').val(),
		$this = this;

	console.log('doLogin');
	console.log(this);

	$.post(
		"/login/doLogin", {
		username: username
	},

	function(data) {
		if (data.result !== 'ok') {
			return $this.loginFailure(data.message);
		}

		$this.loginSuccess(username, [roomName]);
	});
};

Login.prototype.logoutSuccess = function(username, rooms) {
	$('.login').show();
	$('.chatting').hide();
	this.chat.destroy();
};

Login.prototype.doLogout = function() {
	var $this = this;

	$.post(
		"/login/doLogout", {},

	function(data) {
		// Assume success. Can't handle failure anyway.
		$this.logoutSuccess();
		$($this.usernameInput).focus();
	});
};

Login.prototype.logoutCmd = function() {
	this.doLogout();
};
