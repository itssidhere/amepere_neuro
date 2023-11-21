export var FixedSizeQueue = function (size) {
    this.size = size;
    this.queue = [];
}

FixedSizeQueue.prototype.push = function (value) {
    if (this.queue.length === this.size) {
        this.queue.shift();
    }

    this.queue.push(value);
}

FixedSizeQueue.prototype.get = function (index) {
    return this.queue[index];
}

FixedSizeQueue.prototype.length = function () {
    return this.queue.length;
}

FixedSizeQueue.prototype.clear = function () {
    this.queue = [];
}

