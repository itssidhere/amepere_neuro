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

FixedSizeQueue.prototype.push = function (value0, value1, value2) {
    if (this.queue.length === this.size || this.queue.length > this.size) {
        this.queue.shift();
        this.queue.shift();
        this.queue.shift();
    }

    this.queue.push(value0);
    this.queue.push(value1);
    this.queue.push(value2);
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

