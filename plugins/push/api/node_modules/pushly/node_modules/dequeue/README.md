A Simple Double Ended Queue Datastructure
=========================================

Dequeue is implemented as a doubly linked circular list with a titular head
node. By "titular head node", I mean an empty node to designate the beginning
and end of the circularly linked list. I first saw this construction in the
linux kernel source and it seem simple and elegant. I added the `.length`
property to use it like I was using an Array.

I was using a javascript Array as a FIFO. Somewhere between 100,000 and
200,000 entries the program performance went to hell (dev host is a MBP
w/8GB RAM). 15 minutes later, I implemented a simple dequeue and my FIFO
scales up to millions of entries.

It is a drop-in replacement for javascript-arrays-as-fifo.

## Example: Dequeue as a replacement for an Array as a FIFO

    var Dequeue = require('dequeue')
    
    //var fifo = []
    var fifo = new Dequeue()
    
    fifo.length === 0 //=> true
    
    fifo.push(d1)
    fifo.length === 1 //=> true
    
    fifo.unshift(d2)
    
    fifo.pop() === d1 //=> true
    
    fifo.push(d3)
    
    fifo.shift() === d2 //=> true
    
    fifo.length === 1 //=> true; only d3 is in the dequeue
    
## API

### `deque = new Dequeue()`

### `deque.push(value)`
Push a value on the end.

### `value = deque.pop()`
Remove a value off the end.

### `deque.unshift(value)`
Push a value on the beginning.

### `value = deque.shift()`
Remove a value off the beginning.

### `value = deque.last()`
Examine the value of the end without removing it.

### `value = deque.first()`
Examine the value of the beginning without removing it.

### `deque.empty()`
Remove all entries. This is NOT a test for an empty dequeue; use `deque.length`
for that.

## Future Development
Something this simple does not really need a roadmap. However, I am thinking
of adding APIs to facilitate walking the Linked List via an iterator. It will
be simple and fully backward compatible.

## About the Code

I was convinced by [a blog posting](http://blog.izs.me/post/2353458699/an-open-letter-to-javascript-leaders-regarding) [by Issac Z. Schlueter](http://blog.izs.me/) that I don't need
semicolons. So I don't use them.
