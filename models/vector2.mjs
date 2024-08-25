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
}
