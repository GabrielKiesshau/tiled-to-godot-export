export class PhysicsLayer {
  constructor({
    collisionLayer = 1,
    collisionMask = 1,
    id = 0,
  } = {}) {
    this.collisionLayer = this._to32Bit(collisionLayer);
    this.collisionMask = this._to32Bit(collisionMask);
    this.id = id;
  }

  // Helper method to ensure the value is a 32-bit integer
  _to32Bit(value) {
    return value >>> 0;
  }
}
