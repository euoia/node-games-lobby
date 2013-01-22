function Chat(options) {
	$this = this;

	this.username = options.username;
	this.roomName = options.roomName;
	this.userListDiv = $(options.userListDiv);
	this.messagesUl = $(options.messagesUl);
	this.messageScroll = $(options.messageScroll);
	this.messageEntryForm = $(options.messageEntryForm);
	this.messageEntry = $(options.messageEntry);

	this.socket = io.connect('http://localhost');

	this.socket.on('connect', function() {
		$this.socket.emit('subscribe', {
			room: $this.roomName
		});
	});

	this.socket.on('message', function(data) {
		console.log('onmessage');
		$this.addMessage(data.time, data.username, data.message);
	});

	this.socket.on('userList', function(data) {
		$this.updateUserList(data.users);
	});

	this.messageEntryForm.submit(function() {
		$this.handleMessageInput.call($this);
		return false;
	});
}

Chat.prototype.updateUserList = function(users) {
	this.userListDiv.html(
		'<h3>' + this.roomName + '<h3>' +
		'<ul>');

	for (i in users) {
		this.userListDiv.append('<li>' + users[i] + '</li>');
	}

	this.userListDiv.append('</ul>');
};

Chat.prototype.sendMessage = function(message) {
	this.socket.emit('message', {
		message: message,
		room: this.roomName
	});

	// We add our message directly since the server will not echo it back to us.
	$this.addMessage(Date.now(), this.username, message);
};

Chat.prototype.addMessage = function(time, username, message) {
	this.messagesUl.append(
		"<li class='message'>" +
		"<span class='timestamp'>[" + this.formatDate(time) + "] </span>" +
		"<span class='username'>" + username + ": </span>" +
		"<span class='message'>" + message + "</span>" +
		"</li>");

	this.scrollDown();
};

// TODO: Move this into utils.
Chat.prototype.formatDate = function(dateStr) {
	var d = new Date(dateStr);

	return this.formatNumberLength(d.getHours(), 2) +
		":" + this.formatNumberLength(d.getMinutes(), 2);
};

// TODO: Move this into utils.
Chat.prototype.formatNumberLength = function(num, length) {
	var r = "" + num;
	while (r.length < length) {
		r = "0" + r;
	}

	return r;
};

Chat.prototype.scrollDown = function() {
	var $this = this;

	//used to keep the most recent messages visible
	this.messageScroll.animate({
		scrollTop: 9999
	}, 400);

	//clear the animation otherwise the user cannot scroll back up.
	setTimeout(function clearAnimate() {
		$this.messageScroll.animate({}, 1);
	});
};

Chat.prototype.handleMessageInput = function() {
	var message = this.messageEntry.val(),
		command = null;

	this.messageEntry.val('');

	if (message.charAt(0) === '/') {
		// A command!
		command = message.substr(1);
		switch (command) {
			case 'userList':
				this.socket.emit('userList', {
					room: chat.roomName
				});
				break;
			default:
				this.addMessage(Date.now(), 'admin', 'Not a valid command');
		}

	} else {
		this.sendMessage(message);
	}

	return false;
};
