// Tightly coupled to the HTML.
// Requires chat.js.

function Login() {
};

Login.prototype.loginFailure = function () {
		$('#enterUsernameErrorBox').html(
			"<span class='text-error'>" + data.message + "</span>");

		return false;
};


Login.prototype.loginSuccess = function (username, rooms) {
	if (rooms === undefined) {
		rooms = ['default'];
	}

	chat = new Chat({
		username:          username,
		roomName:          rooms,
		userListDiv:       '#left-sidebar',
		messagesUl:        '#chat-room .chat-box ul',
		messageScroll:     '#content-body',
		messageEntryForm:  '#message-entry-form',
		messageEntry:      '#message-entry'
	});

	$('.login').hide();
	$('.chatting').show();
	$('.user-input').focus();
};

Login.prototype.doLogin = function () {
	var username = $('#usernameInput').val(),
		roomName = $('#roomName').val(),
		$this = this;

	alert('doLogin');

	$.post(
		"/login/doLogin",
		{ username: username },
		function(data) {
			if (data.result !== 'ok') {
				return $this.loginFailure();
			}

			$this.loginSuccess(username, [roomName]);
		}
	);

	return false;
};
