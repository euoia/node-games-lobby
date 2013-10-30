Ideas
----
* The "chat" module has an "addListener" function for handling of input. It's
  more of a command-center or something than specifically chat.
  RENAME IT!

Coding conventions
----
* This: http://nodeguide.com/style.html Any consistent deviations let me know! Key points:
   * Variables and properties should use lower camel case capitalization.

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