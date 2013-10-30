Ideas
----
* The "chat" module has an "addListener" function for handling of input. It's
  more of a command-center or something than specifically chat.
  RENAME IT!

Style conventions
----
* This: http://nodeguide.com/style.html Any consistent deviations let me know! Key points:
   * Variables and properties should use lower camel case capitalization.
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
