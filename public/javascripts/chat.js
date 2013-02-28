// TODO: Not sure whether it's better to store references to the jQuery objects
// or just store the selector string.

function Chat(options) {
	$this = this;

	// TODO: Handle multiple rooms AT THE SAME TIME.
	this.username = options.username;
	this.roomName = options.roomName;
	this.userListDiv = $(options.userListDiv);
	this.messagesUl = $(options.messagesUl);
	this.messageScroll = $(options.messageScroll);
	this.messageEntryForm = $(options.messageEntryForm);
	this.messageEntry = $(options.messageEntry);
	this.socket = null;

	console.log('new chat, roomName: ' + this.roomName);

	// User commands.
	this.commands = {
		'userList': this.userListCmd
	};

	_.extend(this.commands, options.commands);
	this.commands['logout'] = this.logoutCmd.bind(this, this.commands['logout']);

	// Bind to the message entry form.
	this.messageEntryForm.submit(function() {
		$this.handleMessageInput.call($this);
		return false;
	});
}

Chat.prototype.connect = function(roomName) {
	this.roomName = roomName;
	console.log('connecting, this.roomName: ' + this.roomName);

	if (this.socket === null) {
		console.log('connecting for the first time');
		this.socket = io.connect('http://localhost');
	} else {
		console.log('reconnecting');
		this.socket.socket.connect();
	}

	this.listen();
};

Chat.prototype.disconnect = function() {
	console.log('disconnect');
	this.socket.disconnect();
	this.socket.removeAllListeners('connect');
	this.socket.removeAllListeners('message');
	this.socket.removeAllListeners('userList');
};

// Set up socket listeners.
Chat.prototype.listen = function() {
	if (this.roomName === undefined) {
		alert('Cannot listen without a room name');
	}
	var $this = this;

	console.log('roomName is ' + this.roomName);

	console.log('listening');
	this.socket.on('connect', function() {
		console.log('subscribing to ' + $this.roomName);

		$this.socket.emit('subscribe', {
			roomName: $this.roomName
		});
	});

	this.socket.on('message', function(data) {
		console.log('onmessage');
		$this.addMessage(data.time, data.username, data.message);
	});

	this.socket.on('userList', function(data) {
		$this.updateUserList(data.users);
	});
};

Chat.prototype.updateUserList = function(users) {
	var userListContent;

	$('<div class="roomName">' + this.roomName + ' users</div>')
		.appendTo(this.userListDiv);

	$('<ul id="roomUserList" />').appendTo(this.userListDiv);


	for (i in users) {
		$('<li class="username">' + users[i] + '</li>').appendTo('#roomUserList');
	}
};

Chat.prototype.sendMessage = function(message) {
	console.log('sendMessage');
	this.socket.emit('message', {
		message: message,
		roomName: this.roomName
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
		if (this.commands[command] !== undefined && typeof(this.commands[command]) === 'function') {
			this.commands[command]();
		} else {
			this.addMessage(Date.now(), 'admin', 'Not a valid command');
		}
	} else {
		this.sendMessage(message);
	}
};

Chat.prototype.userListCmd = function() {
	this.socket.emit('userList', {
		roomName: chat.roomName
	});
};

Chat.prototype.destroy = function() {
	this.userListDiv.html('');
};

Chat.prototype.logoutCmd = function(originalLogoutCmd) {
	console.log('logoutCmd');
	this.disconnect();
	originalLogoutCmd();
};
