Ideas
----
* The "chat" module has an "addListener" function for handling of input. It's
  more of a command-center or something than specifically chat.
  RENAME IT!

Style conventions
----
* This: http://nodeguide.com/style.html Any consistent deviations let me know! Key points:
   * Variables and properties should use lower camel case capitalization.
* Additions:
   * Unless a house-style for filenames already exists, words should be
     separated with a hyphen. Examples: less-middleware, socket.io-client,
     progress-bars.less etc.
* Files should have a header like:

```
//  Created:            TIMESTAMP
//  Last Modified:      TIMESTAMP
//  Author:             James Pickard <james.pickard@gmail.com>
// --------------------------------------------------
// Summary
// ----
// The node-socket-games express application entry point.
//
// To run this:
// node app.js
```

* Header dividers:

```javascript
// --------------------------------------------------
// Summary
// ----
```

* Code section dividers.

```javascript
// --------------------------------------------------
// Emitters.

// Send the user list of a given room to the socket.
Chat.prototype.sendUserList = function(socket, roomName) {
...
}
```

Coding conventions
----
* Events are called events, not listeners. Event handlers are event handlers,
  not listeners. The event is the string, the event handler is the function.
  The arbitrary object that can be sent with an event is referred to as
  eventData.
  * The node documentation does call event handlers "listeners":
    http://nodejs.org/api/events.html.
* Variable declarations are inconsistent throughout the codebase, sometimes we have:

```
  var matchID  = req.params[0];
  var action   = req.params[1];
  var match    = this.matches[matchID];
```

And other times we have:
```
  var waitingMatches = _.where(this.matches, {'state': 'WAITING'}),
    formatStr,              // A formatter string.
    msg,                    // The message to send back to the socket.
    matchDescriptions = []; // Array of strings describing waiting matches.
```

Sometimes we have all variables declared at the start of a function (ala Crockford), othertimes we have variables declared as required.

TODO: Make this more consistent.

Little code patterns
----
Allow a route module to specify its own POST and GET routes (in order to make it obvious what is a route, and what is a helper method).

For example, routes/session.js:
```javascript
// Object mapping a path (that is, part of a URL path) to its function.
exports.postRoutes = {
'login':    login,
'logout':   logout,
'check':    check
};
```

app.js:
```javascript
// Hook up any POST routes requested by session.js - put them under /session/routeName.
for (var routePath in sessionRoutes.postRoutes) {
  if (sessionRoute.postRoutes.hasOwnProperty(routePath)) {
    app.post('/session/' + routePath, sessionRoute.postRoutes[routePath]);
  }
}
```

Things to think about
----
Is it bad to mix "singleton style" conventions (extending the Constructor) with
"class style" conventions (extending the prototype) in the same module? Is
there a good alternative?

Is it bad that command-center-client.js contains a constructor CommandCenter
and not CommandCenterClient?

Should this application use the word "server" at all? Perhaps it should
distinguish between the game lobby and the game server. Is it a game server?
Could the game server(s) be a separate application?

Given that adding request headers to the socket.io-client connect requires a
fork and may not work over every transport, perhaps it might be better to
authenticate the socket using a special "auth" message instead of relying on
cookies.

Perhaps it's possible to replace session.sockets.io with socket.io
authorization as described
[http://howtonode.org/socket-io-auth](http://howtonode.org/socket-io-auth).

Consider writing a bot that randomly does things like joining rooms, creating
matches, joining matches for load testing.

Questions
----
1. When the browser makes a socket connection, how is this associated on the
   server side with the session? This is important for writing tests.


TODO
----
* Server should always echo message back to client. Client should send
  messageID with their message, that way it can choose to whether to implement
  local echo or not.
* Certain messages between the command-center and the client should be
  privaleged. That is, the event name should be guaranteed not to collide with
  anything sent by a server-side command-center client. Perhaps reserve certain
  event names and error if a reserved name is used?
* The command-center module should really just behave as 1) server-side wrapper
  around socket.io, implementing rooms, broadcast, etc 2) client side
  javascript.
* Remove direct socket.io dependency in command-center. The consuming code
  ought to be able to pass in any object which implements the correct methods.
  Optionally, command-center can be implemented as a middleware.
* CommandCenter.addEventHandler could just be renamed to .on() since that's what it does.
* Q. How are namespaces really different from rooms? A. For one, namespaces
  have their own connect event.
* command-center-client should not be modified with match info - something
  ought to extend it.
