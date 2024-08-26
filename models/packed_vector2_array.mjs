import { Vector2 } from './vector2.mjs';

/**
* Represents an Array of Vector2.
* @class PackedVector2Array
*/
export class PackedVector2Array {
  /**
   * @param {Object} [props]
   * @param {Vector2[]} [props.array]
   */
  constructor({
    array = [],
  } = {}) {
    this.array = array;
  }

  equals(other) {
    if (this.array.length !== other.length) return false;

    for (let i = 0; i < this.array.length; i++) {
      if (!this.deepEqual(this.array[i], other[i])) return false;
    }

    return other instanceof PackedVector2Array && this.array === other.array;
  }

  toString() {
    const stringifiedArray = this.array
      .map(vector2 => `${vector2.x}, ${vector2.y}`)
      .join(', ');

    return `PackedVector2Array(${stringifiedArray})`;
  }

  deepEqual(value1, value2) {
    if (value1 === value2) return true;
    
    if (typeof value1 !== "object" || typeof value2 !== "object" || value1 === null || value2 === null) {
      return false;
    }
  
    return value1.equals(value2);
  }
}
