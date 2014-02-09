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
    'command-center-client',
    'GameLobby',
    'Login',
    'ThrowBananas'
  ], function($, CommandCenter, GameLobby, Login, ThrowBananas) {

    var login;

    $(document).ready(function() {
      var commandCenter = new CommandCenter({
        roomUserListDiv: '#left-sidebar',
        messagesUl: '#chat-room .chat-box ul',
        messageScroll: '#content-body',
        messageEntryForm: '#message-entry-form',
        messageEntry: '#message-entry'
      });

      var gameLobby = new GameLobby (commandCenter, {
        roomMatchListDiv: '#right-sidebar',
        createMatchButton: '#create-match-button'
      });

      // TODO: Move all chat logic out of Login and provide callback for loginSuccess.
      login = new Login(
        commandCenter,
        {
          usernameInput: '#usernameInput',
          loginForm: '#login',
          logout: '#logout'
        }
      );
    });

    var throwBananas = new ThrowBananas('bananaCanvas');

    return login;
});
