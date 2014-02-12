// The map generator.
//
// All measurements are in terms of grid-squared and not pixels (except gridSize itself).
define(['ImageLoader'], function(ImageLoader) {
  function ThrowBananas(bananaCanvasID) {
    this.gravity = 40;

    this.banana = document.getElementById(bananaCanvasID);
    this.banana.style.position = 'absolute';
    this.banana.style.top = '0';
    this.banana.style.left = '0';
    this.banana.style.width = '100%';
    this.banana.style.height = '100%';
    this.bananaContext = this.banana.getContext('2d');

    // Use an image loader.
    var imageLoader = new ImageLoader();

    // Object storing the position of the banana.
    this.bananaPosition = {};

    // The bananas.
    this.numBananaImgs = 4;
    this.bananaImgs = [];
    for (var i=0; i < this.numBananaImgs; i += 1) {
      this.bananaImgs[i] = imageLoader.load('img/banana-' + String(i) + '.png');
    }

    // If we had more images I would write a proper preloader.
    // TODO: Make a preloader so that the banana is definitely loaded.
    imageLoader.done(function () {
      this.throwBananas();
    }.bind(this));
  }

  ThrowBananas.prototype.throwBananas = function() {
    this.throwBanana(
      {
        x: this.randomIntBetween(0, this.banana.width),
        y: this.randomIntBetween(0, this.banana.height)
      },
      this.randomIntBetween(15, 350),
      this.randomIntBetween(-350, 30)
    );

    setTimeout(this.throwBananas.bind(this), 6000);
  };

  ThrowBananas.prototype.throwBanana = function(launchPoint, xVel, yVel) {
    var currTime = window.performance.now();

    window.requestAnimationFrame(
      this.animateBanana.bind(this, currTime, launchPoint, xVel, yVel));
  };

  ThrowBananas.prototype.animateBanana = function(startTime, startPoint, xVel, yVel, time) {

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
    if (xpos > this.banana.width || xpos < 0) {
      return;
    }

    this.bananaPosition = {'x': xpos, 'y': ypos};

    // Draw the rotated banana.
    var bananaSeq = parseInt(deltaTime, 10) % this.numBananaImgs;
    var bananaImg = this.bananaImgs[bananaSeq];
    this.bananaContext.drawImage(bananaImg, xpos, ypos);

    // Timeout after 5 seconds.
    if (time - startTime < 5000) {
      window.requestAnimationFrame(this.animateBanana.bind(this, startTime, startPoint, xVel, yVel));
    } else {
    }
  };

  ThrowBananas.prototype.randomIntBetween = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };


  return ThrowBananas;
});
