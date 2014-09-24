//  Created:            Wed 30 Oct 2013 06:08:06 PM GMT
//  Last Modified:      Wed 24 Sep 2014 02:20:04 AM UTC
//  Author:             James Pickard <james.pickard@gmail.com>
// --------------------------------------------------
// Summary
// ----
// Integration tests for logging in, command center, playing games.
// --------------------------------------------------
// TODOs
// ----
// TODO: I found it hard to find tutorials or guides for how to use superagent
//       session cookies with socket.io. This is required because session data is
//       retrieved even on socket.io requests (due to session.socket.io). If I get
//       this working, I ought to write it up publicly.
// TODO: Run the createMatch and joinMatch tests for every game.
// --------------------------------------------------

// Start the server on a test port.
var serverPort = 4000;
process.env.PORT = serverPort;

require('../../app/server.js');

var assert = require('assert'),
  superagent = require('superagent'),
  io = require('socket.io-client'),
  util = require('util'),
  redis = require('redis');

var redisClient = redis.createClient();

// Make sure the usernames are available.
describe('node-games-lobby:', function() {

  describe('Login:', function() {
    before(function(done) {
      redisClient.del('user:bob', function(err) {
        if (err) {
          throw err;
        }

        redisClient.del('user:james', function(err) {
          if (err) {
            throw err;
          }

          done();
        });
      });
    });

    var goodAccount1 = {
      username: 'bob'
    };

    // We need 2 players for a match.
    var goodAccount2 = {
      username: 'james'
    };

    var goodAgent1 = superagent.agent();
    it('Login', function(done) {
      goodAgent1.post(util.format('http://localhost:%s/session/login', serverPort)).send({
        username: goodAccount1.username
      }).end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.status, 200, 'expecting status 200');
        assert.ok(res.body.result, 'response does not have a result');
        assert.equal(res.body.result, 'ok', 'response result not right');
        done();
      });
    });

    // Save the session cookie for later.
    var goodAgent1SessionCookie;
    it('Has valid cookies', function(done) {
      goodAgent1SessionCookie = goodAgent1.jar.getCookie('connect.sid', {
        'domain': util.format('%s:%s', 'localhost', '4000'),
        'path': '/session/login',
        'script': false,
        'secure': false
      });

      assert.ok(goodAgent1SessionCookie.name);
      assert.ok(goodAgent1SessionCookie.value);
      done();
    });

    var goodAgent2 = superagent.agent();
    it('Player 2 login', function(done) {
      goodAgent2.post(util.format('http://localhost:%s/session/login', serverPort)).send({
        username: goodAccount2.username
      }).end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.status, 200, 'expecting status 200');
        assert.ok(res.body.result, 'response does not have a result');
        assert.equal(res.body.result, 'ok', 'response result not right');
        done();
      });
    });

    // Save the session cookie for later.
    var goodAgent2SessionCookie;
    it('Player 2 has valid cookies', function(done) {
      goodAgent2SessionCookie = goodAgent2.jar.getCookie('connect.sid', {
        'domain': util.format('%s:%s', 'localhost', '4000'),
        'path': '/session/login',
        'script': false,
        'secure': false
      });

      assert.ok(goodAgent2SessionCookie.name);
      assert.ok(goodAgent2SessionCookie.value);
      done();
    });

    // Socket IO requests.
    describe('Start game:', function() {
      var socket1, socket2;

      before(function(done) {
        // Setup sockets.
        function setupSocket(cookie, id) {
          var socket = io.connect(
            util.format('http://localhost:%s', serverPort),
            {
              'reconnection delay': 0,
              'reopen delay': 0,
              'force new connection': true,
              'headers': {
                'Cookie': cookie
              }
            }
          );

          socket.once('connect', function() {
            console.log('Socket[%d] connected', id);
          });

          socket.once('disconnect', function() {
            console.log('Socket[%d] disconnected', id);
          });

          return socket;
        }

        socket1 = setupSocket(goodAgent1SessionCookie.toString(), '1');
        socket2 = setupSocket(goodAgent2SessionCookie.toString(), '2');
        done();
      });

      after(function(done) {
        socket1.disconnect();
        socket2.disconnect();
        done();
      });

      describe ('2 Players play game:', function() {
        var roomName = 'default';

        it('Emit subscribe gets notification event', function(done) {
          socket1.once('notification', function notificationReceived(eventData) {
            assert(eventData.message, 'eventData must have message');
            done();
          });

          socket1.emit('subscribe', {roomName: roomName});
        });

        // TODO: The client ought to be able to get the raw match data from the server.
        it('Emit listMatches gets notification event', function(done) {
          socket1.once('notification', function notificationReceived(eventData) {
            assert(eventData.message, 'eventData must have message');
            done();
          });

          socket1.emit('listMatches', {roomName: roomName});
        });

        it('Emit createMatch gets notification event', function(done) {
          socket1.once('notification', function notificationReceived(eventData) {
            assert(eventData.message, 'eventData must have message');
            done();
          });

          socket1.emit('createMatch', {gameID: 'tictactoe', roomName: roomName});
        });

        it('Emit joinGame, get notification event then launchMatch event', function(done) {

          socket2.once('notification', function notificationReceived(eventData) {
            assert(eventData.message, 'eventData must have message');

            socket2.once('launchMatch', function notificationReceived(eventData) {
              assert(eventData.url, 'launchMatch event must have url');
              done();
            });
          });


          console.log('Joining game - waiting 5 seconds for countdown.');
          // launchMatch comes 5 seconds after game start.
          // TODO: This should be configurable.
          this.timeout(6000);
          socket2.emit('joinGame', {gameID: 'tictactoe'});
        });
      });
    });
  });
});
