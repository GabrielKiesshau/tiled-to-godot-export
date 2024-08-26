/**
 * Represents a 2D vector.
 * @typedef {Object} Vector2
 * @property {number} x - The X-coordinate of the vector.
 * @property {number} y - The Y-coordinate of the vector.
 */
export class Vector2 {
  constructor({
    x = 0,
    y = 0,
  } = {}) {
    this.x = x;
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
 * @typedef {Object} Vector2i
 * @property {number} x - The X-coordinate of the vector.
 * @property {number} y - The Y-coordinate of the vector.
 */
export class Vector2i {
  constructor({
    x = 0,
    y = 0,
  } = {}) {
    this.x = x;
    this.y = y;
  }

  equals(other) {
    return other instanceof Vector2i && this.x === other.x && this.y === other.y;
  }

  toString() {
    return `Vector2i(${this.x}, ${this.y})`;
  }
}
