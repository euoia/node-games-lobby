// Tightly coupled to the HTML.
// Required chat.js.

function Login() {
};

Login.prototype.loginFailure = function () {
		$('#enterUsernameErrorBox').html(
			"<span class='text-error'>" + data.message + "</span>");

		return false;
};


Login.prototype.loginSuccess = function () {
	var username = $('#usernameInput').val(),
		roomName = $('#roomName').val();

	chat = new Chat({
		username:          username,
		roomName:          roomName,
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

Login.doLogin = function () {
	$.post(
		"/login/doLogin",
		{ username: username },
		function(data) {
			if (data.result !== 'ok') {
				return loginFailure();
			}

			loginSuccess();
		}
	);

	return false;
};
