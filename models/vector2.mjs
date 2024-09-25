/**
 * Represents a 2D vector.
 * @class Vector2
 */
export class Vector2 {
  /**
   * @param {Object} [props]
   * @param {number} [props.x]
   * @param {number} [props.y]
   */
  constructor(x = 0.0, y = 0.0) {
    /** @type {number} */
    this.x = x;
    /** @type {number} */
    this.y = y;
  }

  /**
   * 
   * @param {Vector2} other - 
   * @returns {bool} - 
   */
  equals(other) {
    return other instanceof Vector2 && this.x === other.x && this.y === other.y;
  }

  toString() {
    return `Vector2(${this.x}, ${this.y})`;
  }
}

/**
 * Represents a 2D vector.
 * @class Vector2i
 */
export class Vector2i {
  /**
   * @param {Object} [props]
   * @param {number} [props.x]
   * @param {number} [props.y]
   */
  constructor(x = 0, y = 0) {
    /** @type {number} */
    this.x = x;
    /** @type {number} */
    this.y = y;
  }

  equals(other) {
    return other instanceof Vector2i && this.x === other.x && this.y === other.y;
  }

  toString() {
    return `Vector2i(${this.x}, ${this.y})`;
  }
}
