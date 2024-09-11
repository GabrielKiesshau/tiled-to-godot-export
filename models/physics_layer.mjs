/**
* Represents a physics layer.
* @class PhysicsLayer
*/
export class PhysicsLayer {
  /**
   * @param {Object} [props]
   * @param {number} [props.collisionLayer]
   * @param {number} [props.collisionMask]
   * @param {number} [props.id]
   */
  constructor({
    collisionLayer = 1,
    collisionMask = 1,
    id = 0,
  } = {}) {
    /** @type {number} */
    this.collisionLayer = this._to32Bit(collisionLayer);
    /** @type {number} */
    this.collisionMask = this._to32Bit(collisionMask);
    /** @type {number} */
    this.id = id;
  }

  // Helper method to ensure the value is a 32-bit integer
  _to32Bit(value) {
    return value >>> 0;
  }
}
