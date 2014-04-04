// Each throw is a turn.
// When a gorilla is hit, it's a new round.
// When a player has enough wins, that's the end of the match.
//
// TODO: Handle disconnect in case server crashes.
function Gorillas(options) {
  // Size of a grid square in pixels.
  this.gravity = 40;
  this.gridSize = 10;
  this.borderSize = 2;

  this.mapWidth = options.mapWidth;
  this.mapHeight = options.mapHeight;

  // Optional event listener.
  // Should implement .on and .emit methods.
  this.listener = null;
  if (options.listener !== undefined) {
    this.listener = options.listener;
  }

  // The time allowed for move. Will be sent in the matchStarted response.
  this.turnTime = null;

  // 2-array of positions for player 0 and player 1 gorillas respectively.
  this.gorillaPositions = [];

  // Object storing the position of the banana.
  this.bananaPosition = {};

  // Store the buildings so we can place the gorillas more intelligently.
  // Array of objects like:
  // {'xpos': buildingXPosition, 'width': buildingWidth, 'height': buildingHeight}
  this.buildings = [];

  // Which player has the first turn this round?
  // 0 => Player 0, 1 => Player 1.
  this.startingPlayer = 0;

  // How many turns have passed?
  this.turnNumber = null;

  // Store the number of wins for each player.
  this.wins = [0, 0];
  this.maxRounds = 5; // TODO: Move this to the server.

  // Added for network play.
  // Which player am I? 0 or 1.
  this.myPlayer = null;
  this.usernames = [];

  // TODO: Dynamically add the canvas element.
  this.screen = document.getElementById(options.screen);
  this.screen.style.width = this.toPixels(this.mapWidth) + 'px';
  this.screen.style.height = this.toPixels(this.mapHeight) + 'px';

  // The background layer, gorillas and buildings.
  this.canvas = document.getElementById("c");
  this.canvas.style.position = 'absolute';
  this.canvas.setAttribute('width', this.toPixels(this.mapWidth) + 'px');
  this.canvas.setAttribute('height', this.toPixels(this.mapHeight) + 'px');
  this.context = this.canvas.getContext('2d');

  // The Banana overlay layer.
  this.banana = document.getElementById("banana");
  this.banana.style.position = 'absolute';
  this.banana.setAttribute('width', this.toPixels(this.mapWidth) + 'px');
  this.banana.setAttribute('height', this.toPixels(this.mapHeight) + 'px');
  this.bananaContext = this.banana.getContext('2d');

  // The UI overlay layer.
  this.ui = document.getElementById("ui");
  this.ui.style.position = 'absolute';
  this.ui.setAttribute('width', this.toPixels(this.mapWidth) + 'px');
  this.ui.setAttribute('height', this.toPixels(this.mapHeight) + 'px');
  this.uiContext = this.ui.getContext('2d');

  // Use an image loader.
  var imageLoader = new ImageLoader();

  // The gorilla.
  this.gorillaImg = imageLoader.load('/img/games/gorillas/gorilla.png');

  // The bananas.
  this.numBananaImgs = 4;
  this.bananaImgs = [];
  for (var i=0; i < this.numBananaImgs; i += 1) {
    this.bananaImgs[i] = imageLoader.load('/img/games/gorillas/banana-' + String(i) + '.png');
  }

  // The explosion.
  this.explosionImg = imageLoader.load('/img/games/gorillas/explosion.png');

  // The sun.
  this.sunImg = imageLoader.load('/img/games/gorillas/sun.png');

  // Mouse listeners need to be saved somewhere so we can remove them.
  this.mouseDownListener = null;
  this.mouseMoveListener = null;
  this.mouseUpListener = null;

  // The setInterval reference for the turn clock.
  this.turnClockInterval = null;

  // The URL to return to after the game ends.
  // This ought to be sent by the server in the matchStarted event.
  this.returnURL = null;

  this.initScreen();

  imageLoader.done(function () {
    this.emit('ready');

    console.log("Waiting to receive matchStarted from server");
    this.listener.on('matchStarted', this.matchStarted.bind(this));
  }.bind(this));
}

Gorillas.prototype.initScreen = function() {
  this.context.fillStyle = 'blue';
  this.context.fillRect(0, 0, this.toPixels(this.mapWidth), this.toPixels(this.mapHeight));
};

Gorillas.prototype.placeBuildings = function() {
  var building, buildingIdx;

  for (buildingIdx in this.buildings) {
    building = this.buildings[buildingIdx];
    this.placeBuilding(building.x, building.width, building.height);
  }
};

Gorillas.prototype.placeGorillas = function(gorillaBuildings) {
  this.placeGorilla(this.gorillaPositions[0]);
  this.placeGorilla(this.gorillaPositions[1]);
};

// Given a building index for each gorilla, return the map position for each
// gorilla.
Gorillas.prototype.findGorillaPositions = function(gorillaBuildings) {
  var gorillaPositions = [];
  gorillaPositions[0] = this.findGorillaPosition(gorillaBuildings[0]);
  gorillaPositions[1] = this.findGorillaPosition(gorillaBuildings[1]);

  return gorillaPositions;
};

// Given a building index, find where to place the gorilla on the map.
Gorillas.prototype.findGorillaPosition = function(buildingIdx) {
  var xpos = this.getBuildingMidpoint(buildingIdx) - (this.gorillaImg.width / 2);
  var ypos = (
    this.toPixels(this.mapHeight) -
    this.toPixels(this.buildings[buildingIdx].height) -
    this.gorillaImg.height);

  return {'x': xpos, 'y': ypos};
};

Gorillas.prototype.getBuildingMidpoint = function(buildingIdx) {
  return this.toPixels(this.buildings[buildingIdx].x + this.buildings[buildingIdx].width / 2);
};

Gorillas.prototype.placeGorilla = function(point) {
  //console.log("Placing gorilla at x=%d y=%d", point.x, point.y);
  this.context.drawImage(this.gorillaImg, point.x, point.y);
};

// Converts a size in grid positions to pixels
Gorillas.prototype.toPixels = function(gridRef) {
  return gridRef * this.gridSize;
};

Gorillas.prototype.placeBuilding = function(
  xpos,
  width,
  height
) {
  var colour = this.randomBuildingColour();
  this.context.fillStyle = colour;
  this.context.fillRect(this.toPixels(xpos),
                        this.toPixels(this.mapHeight - height),
                        this.toPixels(width) - this.borderSize,
                        this.toPixels(this.mapHeight));

  this.drawWindows(this.toPixels(xpos),
                   this.toPixels(this.mapHeight - height),
                   this.toPixels(xpos + width) - this.borderSize,
                   this.toPixels(this.mapHeight));

  //console.log("Placing building colour=%s xpos=%d width=%d height=%d", colour, xpos, width, height);
};

Gorillas.prototype.drawWindows = function(xpos, ypos, xlim, ylim) {
  var x = xpos + 8,
    y = ypos + 8;

  //console.log("drawWindows xpos=%d ypos=%d xlim=%d ylim=%d", xpos, ypos, xlim, ylim);

  while (x < xlim) {
    y = ypos + 8;
    while (y < ylim) {
      if (x + 7 < xlim - 2 &&
          y + 12 < ylim - 2
      ) {
        this.drawWindow(x, y);
      }

      y += 28;
    }

    x += 18;
  }
};

Gorillas.prototype.drawWindow = function(xpos, ypos) {
  var colour = this.randomWindowColour();
  this.context.fillStyle = colour;
  this.context.fillRect(xpos,
                        ypos,
                        7,
                        12);

  //console.log("Drawing window at colour=%s xpos=%d ypos=%d", colour, xpos, ypos);
};

Gorillas.prototype.randomIntBetween = function(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

Gorillas.prototype.randomBuildingColour = function() {
  switch (this.randomIntBetween(0, 2)) {
    case 0:
      // Red.
      return '#a10500';
    case 1:
      // Teal.
      return '#14a0a3';
    case 2:
      // Grey.
      return '#a2a0a2';
  }
};

Gorillas.prototype.randomWindowColour = function() {
  switch (this.randomIntBetween(0, 1)) {
    case 0:
      // Yellow.
      return '#f8f503';
    case 1:
      // Grey.
      return '#3d403d';
  }
};

// Check if an imgData array (as returned by getImageData().data) is the
// background colour.
Gorillas.prototype.isBackgroundColour = function(imgData) {
  if (imgData[0] === 0 && imgData[1] === 0 && imgData[2] == 255) {
    return true;
  }

  return false;
};

Gorillas.prototype.canvasClicked = function(e) {
  this.bananaContext.fillStyle = 'pink';

  var startPoint = {'x': e.layerX, 'y': e.layerY};

  // Check if the current player's gorilla was clicked.
  var pointIsInsideBox = this.pointIsInsideBox(
    startPoint,
    this.gorillaPositions[this.currentPlayer()].x,
    this.gorillaPositions[this.currentPlayer()].y,
    this.gorillaImg.width,
    this.gorillaImg.height
  );

  if (pointIsInsideBox === true) {
    this.clearListeners();

    // Moving the mouse draws a target line.
    this.mouseMoveListener = this.mouseMoved.bind(this, startPoint);
    this.banana.addEventListener('mousemove', this.mouseMoveListener);

    // Releasing the mouse throws the banana.
    this.mouseUpListener = this.mouseUp.bind(this, startPoint);
    this.banana.addEventListener('mouseup', this.mouseUpListener);
  }
};

// Shows where the banana will be thrown.
Gorillas.prototype.mouseMoved = function(startPoint, e) {
  this.clearBananaLayer();

  this.bananaContext.beginPath();
  this.bananaContext.moveTo(startPoint.x, startPoint.y);
  this.bananaContext.lineTo(e.layerX, e.layerY);
  this.bananaContext.stroke();
};

Gorillas.prototype.clearListeners = function() {
  if (this.mouseDownListener !== null) {
    this.banana.removeEventListener('mousedown', this.mouseDownListener);
    this.mouseDownListener = null;
  }

  if (this.mouseMoveListener !== null) {
    this.banana.removeEventListener('mousemove', this.mouseMoveListener);
    this.mouseMoveListener = null;
  }

  if (this.mouseUpListener !== null) {
    this.banana.removeEventListener('mouseup', this.mouseUpListener);
    this.mouseUpListener = null;
  }
};

// Throws the banana.
Gorillas.prototype.mouseUp = function(startPoint, e) {
  this.clearListeners();
  this.clearBananaLayer();

  // Calculate the velocity from the mouse distance moved.
  var xVel = (e.layerX - startPoint.x) * 1.5;
  var yVel = (e.layerY - startPoint.y) * 1.5;

  // But launch the banana from same same point relative to the gorilla each time.
  var launchPoint = {
    x: this.gorillaPositions[this.currentPlayer()].x,
    y: this.gorillaPositions[this.currentPlayer()].y - 50
  };

  this.throwBanana(launchPoint, xVel, yVel);

  this.listener.emit('throwBanana', {
    launchPoint: launchPoint,
    xVel: xVel,
    yVel: yVel
  });
};

Gorillas.prototype.throwBanana = function(launchPoint, xVel, yVel) {
  this.animating = $.Deferred();

  var currTime = window.performance.now();

  window.requestAnimationFrame(
    this.animateBanana.bind(this, currTime, launchPoint, xVel, yVel));
};

Gorillas.prototype.animateBanana = function(startTime, startPoint, xVel, yVel, time) {

  var deltaTime = (time - startTime) / 300;

  var xpos = startPoint.x + (xVel * deltaTime);
  var ypos = startPoint.y + (yVel * deltaTime) + (this.gravity * deltaTime * deltaTime);

  // Clear the previous banana.
  if (this.bananaPosition.x !== undefined) {
    this.bananaContext.clearRect(
      this.bananaPosition.x,
      this.bananaPosition.y,
      this.bananaImgs[0].width,
      this.bananaImgs[0].height);
  }

  // Out of bounds to the left or right.
  if (xpos > this.toPixels(this.mapWidth) || xpos < 0) {
    console.log("out of bounds");
    this.nextTurn();
    this.animating.resolve();
    return;
  }

  this.bananaPosition = {'x': xpos, 'y': ypos};

  // Check for bounds collision.
  var hasEdgeCollision = false;

  // Only check if the banana isn't outside the top of the map.
  if (ypos > 0) {
    hasEdgeCollision = this.hasEdgeCollision(
      xpos + 5,
      ypos + 5,
      this.bananaImgs[0].width - 5,
      this.bananaImgs[0].height - 5);
  }

  if (hasEdgeCollision) {
      console.log("collision!");

    // TODO: Check both gorillas.
    var hasGorillaCollision = this.hasGorillaCollision(
      xpos - 2,
      ypos - 2,
      this.bananaImgs[0].width + 2,
      this.bananaImgs[0].height + 2,
      this.gorillaPositions[this.otherPlayer()]);

    // Only one of the players should sent the endRound event.
    if (hasGorillaCollision &&
        this.currentPlayer() === this.myPlayer
    ) {
      console.log("Gorilla collision!");
      this.listener.emit('endRound');
      this.animating.resolve();
      return;
    }

    this.nextTurn();
    this.context.drawImage(this.explosionImg, xpos, ypos);
    this.animating.resolve();
    return;
  }

  // Draw the rotated banana.
  var bananaSeq = parseInt(deltaTime, 10) % this.numBananaImgs;
  var bananaImg = this.bananaImgs[bananaSeq];
  this.bananaContext.drawImage(bananaImg, xpos, ypos);

  // Timeout after 5 seconds.
  if (time - startTime < 5000) {
    window.requestAnimationFrame(this.animateBanana.bind(this, startTime, startPoint, xVel, yVel));
  } else {
    console.log("timeout");
    this.nextTurn();
    this.animating.resolve();
  }
};

// Returns true if the point (with properties x and y) is inside the box.
Gorillas.prototype.pointIsInsideBox = function(point, boxX, boxY, boxWidth, boxHeight) {
  if (point.x >= boxX &&
      point.x <= boxX + boxWidth &&
      point.y >= boxY &&
      point.y <= boxY + boxHeight
  ) {
    return true;
  }

  return false;
};

// Just check the corners.
Gorillas.prototype.hasEdgeCollision = function(x, y, width, height) {
    var collision = (
      this.isBackgroundColour(this.context.getImageData(x,y,1,1).data) === false ||
      this.isBackgroundColour(this.context.getImageData(x+width,y,1,1).data) === false ||
      this.isBackgroundColour(this.context.getImageData(x,y+height,1,1).data) === false ||
      this.isBackgroundColour(this.context.getImageData(x+width,y+height,1,1).data) === false
    );

    return collision;
};

Gorillas.prototype.hasGorillaCollision = function(x, y, width, height, gorillaPosition) {
    var checkPoint = function (pointX, pointY) {
      return this.pointIsInsideBox (
        {'x': pointX, 'y': pointY},
        gorillaPosition.x,
        gorillaPosition.y,
        this.gorillaImg.width,
        this.gorillaImg.height);
    }.bind(this);

    var collision = (
      checkPoint(x, y) ||
      checkPoint(x + width, y) ||
      checkPoint(x, y + height) ||
      checkPoint(x + width, y + height)
    );

    return collision;
};

Gorillas.prototype.nextTurn = function() {
  if (this.turnNumber === null) {
    this.turnNumber = 1;
  }

  this.turnNumber += 1;
  this.redrawUILayer();

  if (this.currentPlayer() === this.myPlayer) {
    this.mouseDownListener = this.canvasClicked.bind(this);
    this.banana.addEventListener('mousedown', this.mouseDownListener);
  }

  this.startTurnClock();
};

Gorillas.prototype.currentPlayer = function() {
  return (this.turnNumber + this.startingPlayer) % 2;
};

Gorillas.prototype.otherPlayer = function() {
  return (this.turnNumber + this.startingPlayer + 1) % 2;
};

Gorillas.prototype.nextRound = function() {
  this.clearListeners();
  this.clearUILayer();

  this.turnNumber = null;

  this.initScreen();
  this.placeBuildings();
  this.placeGorillas();
  this.nextTurn();

  console.log("It is player %d's turn", this.currentPlayer());
};

Gorillas.prototype.clearBananaLayer = function() {
  this.bananaContext.clearRect(
    0,
    0,
    this.toPixels(this.mapWidth),
    this.toPixels(this.mapHeight));
};

Gorillas.prototype.clearUILayer = function() {
  this.uiContext.clearRect(
    0,
    0,
    this.toPixels(this.mapWidth),
    this.toPixels(this.mapHeight));
};

Gorillas.prototype.redrawUILayer = function() {
  this.clearUILayer();

  // Draw the sun.
  this.uiContext.drawImage(this.sunImg, this.toPixels(this.mapWidth) / 2 - (this.sunImg.width / 2), 10);

  // Draw the text.
  this.uiContext.fillStyle = "white";
  this.uiContext.font = "16px monospace";

  this.uiContext.textAlign = "left";
  this.uiContext.fillText(this.usernames[0], 10, 20);

  this.uiContext.textAlign = "right";
  this.uiContext.fillText(this.usernames[1], this.toPixels(this.mapWidth) - 10, 20);

  var turnText;
  if (this.currentPlayer() === this.myPlayer) {
    turnText = "Your turn";
  } else {
    turnText = "Other player's turn";
  }

  if (this.myPlayer === 0) {
    this.uiContext.textAlign = "left";
    this.uiContext.fillText(turnText, 10, 40);
  } else {
    this.uiContext.textAlign = "right";
    this.uiContext.fillText(turnText, this.toPixels(this.mapWidth) - 10, 40);
  }
};

Gorillas.prototype.enoughWins = function(playerIdx) {
  if (this.wins[playerIdx] > this.maxRounds / 2) {
    return true;
  }

  return false;
};

Gorillas.prototype.endOfGame = function(winningPlayerIdx) {
  this.initScreen();

  var winningText = this.usernames[winningPlayerIdx] + " wins!";

  // Draw the text.
  this.uiContext.fillStyle = "white";
  this.uiContext.font = "16px monospace";

  this.uiContext.textAlign = "center";
  this.uiContext.fillText(winningText,
  this.toPixels(this.mapWidth / 2),
  this.toPixels(this.mapHeight / 2));

  // Click the canvas to go back.
  this.banana.className = this.banana.className + "hoverHand";
  this.banana.addEventListener('mousedown', function() {
    location.href = this.returnURL;
  }.bind(this));
};

Gorillas.prototype.emit = function(eventName, eventData) {
  if (this.listener === null) {
    return;
  }

  if (eventData === undefined) {
    eventData = {};
  }

  console.log("Emitting %s", eventName);
  this.listener.emit(eventName, eventData);
};

Gorillas.prototype.bananaThrown = function(eventData) {
  this.throwBanana(
      eventData.launchPoint,
      eventData.xVel,
      eventData.yVel);
};

Gorillas.prototype.matchStarted = function(eventData) {
  this.usernames = eventData.usernames;
  this.myPlayer = eventData.playerIdx;
  this.returnURL = eventData.returnURL;
  this.turnTime = eventData.turnTime;

  console.log("Waiting to receive roundStarted from server");
  this.listener.on('roundStarted', this.roundStarted.bind(this));
  this.listener.on('bananaThrown', this.bananaThrown.bind(this));
  this.listener.on('roundEnded', this.roundEnded.bind(this));
  this.listener.on('matchEnded', this.matchEnded.bind(this));
  this.listener.on('turnTimeout', this.turnTimeout.bind(this));
};

Gorillas.prototype.roundStarted = function(eventData) {
  console.log("Received roundStarted event", eventData);

  $.when(this.animating).then(function() {
    this.buildings = eventData.buildings;
    this.startingPlayer = eventData.startingPlayer;
    this.gorillaPositions = this.findGorillaPositions(eventData.gorillaBuildings);

    this.nextRound();

    console.log("Waiting to receive an event from server");
  }.bind(this));
};

Gorillas.prototype.roundEnded = function(eventData) {
  console.log("Received roundEnded event", eventData);

  // Need to defer this until after animations have finished.
  $.when(this.animating).then( function() {
    this.wins[this.currentPlayer()] += 1;
  }.bind(this));
};

Gorillas.prototype.matchEnded = function(eventData) {
  console.log("Received matchEnded event", eventData);
  $.when(this.animating).then( function() {
    this.endOfGame(eventData.winner);
  }.bind(this));
};

// The current player took too long to play their move.
Gorillas.prototype.turnTimeout = function() {
  // TODO: Flash message.
  console.log('<= turnTimeout');
  this.clearListeners();
  this.clearBananaLayer();
  this.nextTurn();
};

Gorillas.prototype.drawTurnClock = function(timeRemainingInSeconds) {
  // Draw the text.
  this.uiContext.fillStyle = "white";
  this.uiContext.font = "16px monospace";

  this.uiContext.textAlign = "center";
  this.uiContext.fillText(timeRemainingInSeconds,
    this.toPixels(this.mapWidth / 2),
    this.toPixels(this.mapHeight / 8));
};

Gorillas.prototype.startTurnClock = function() {
  this.stopTurnClock();

  var startTime = Date.now();
  var endTime = new Date(startTime + this.turnTime);

  this.turnClockInterval = window.setInterval(function () {
    var timeRemainingInSeconds = Math.floor((endTime - Date.now()) / 1000);

    this.redrawUILayer();
    this.drawTurnClock(timeRemainingInSeconds);
  }.bind(this), 1000);
};

Gorillas.prototype.stopTurnClock = function() {
  if (this.turnClockInterval !== null) {
    window.clearInterval(this.turnClockInterval);
  }
};
