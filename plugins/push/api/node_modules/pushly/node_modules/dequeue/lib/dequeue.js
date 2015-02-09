
var Dequeue = exports = module.exports = function Dequeue() {
  this.head = new Node()
  this.length = 0
}

Dequeue.prototype.push = function(d){
  var n = new Node(d)
  this.head.prepend(n)
  this.length += 1
  return this
}

Dequeue.prototype.unshift = function(d){
  var n = new Node(d)
  this.head.append(n)
  this.length += 1
  return this
}

Dequeue.prototype.pop = function(){
  if (this.head.prev === this.head) return
  var n = this.head.prev.remove()
  this.length -= 1
  return n.data
}

Dequeue.prototype.shift = function(){
  if (this.head.next === this.head) return
  var n = this.head.next.remove()
  this.length -= 1
  return n.data
}

Dequeue.prototype.last = function(){
  if (this.head.prev === this.head) return
  return this.head.prev.data
}

Dequeue.prototype.first = function(){
  if (this.head.next === this.head) return
  return this.head.next.data
}

Dequeue.prototype.empty = function(){
  if (this.length === 0 ) return

  //no node points to head; not necessary for GC, but it makes me feel better.
  this.head.next.prev = null
  this.head.prev.next = null

  //head only points to itself; as a fresh node would
  this.head.next = this.head
  this.head.prev = this.head
  
  this.length = 0

  return
}
function Node(d) {
  this.data = d
  this.next = this
  this.prev = this
}

Node.prototype.append = function(n) {
  n.next = this.next
  n.prev = this
  this.next.prev = n
  this.next = n
  return n
}

Node.prototype.prepend = function(n) {
  n.prev = this.prev
  n.next = this
  this.prev.next = n
  this.prev = n
  return n
}

Node.prototype.remove = function() {
  this.next.prev = this.prev
  this.prev.next = this.next
  return this
}