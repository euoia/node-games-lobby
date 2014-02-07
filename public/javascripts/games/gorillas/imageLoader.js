function ImageLoader() {
  // Array of loaded images.
  this.images = [];
  this.numLoaded = 0;
  this.callback = null;
}

ImageLoader.prototype.load = function(imageSrc) {
  var image = new Image();
  image.src = imageSrc;

  this.images.push(image);

  var complete = function() {
    if (typeof(this.callback) === 'function') {
      this.callback();
    }
  }.bind(this);

  image.onload = function() {
    this.numLoaded += 1;
    console.log("Image %s loaded", imageSrc);
    console.log("numLoaded=%d length=%d", this.numLoaded, this.images.length);
    console.log("images ", this.images);

    if (this.numLoaded === this.images.length) {
      complete();
    }

  }.bind(this);

  return image;
};

ImageLoader.prototype.done = function(callback) {
  if (typeof(callback) !== 'function') {
    throw new Error('ImageLoader.done() takes a function, not a %s as its argument.', typeof(callback));
  }

  this.callback = callback;
};
