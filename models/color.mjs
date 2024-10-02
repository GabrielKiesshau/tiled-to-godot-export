/**
 * Represents a Color.
 * @class Color
 */
export class Color {
  /**
   * @param {Object} [props]
   * @param {number} [props.r]
   * @param {number} [props.g]
   * @param {number} [props.b]
   * @param {number} [props.a]
   */
  constructor(r = 0.0, g = 0.0, b = 0.0, a = 0.0) {
    /** @type {number} */
    this.r = r;
    /** @type {number} */
    this.g = g;
    /** @type {number} */
    this.b = b;
    /** @type {number} */
    this.a = a;
  }

  /**
   * 
   * @param {Color} other - 
   * @returns {bool} - 
   */
  equals(other) {
    return other instanceof Color && this.r === other.r && this.g === other.g && this.b === other.b && this.a === other.a;
  }

  toString() {
    return `Color(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
  }
}