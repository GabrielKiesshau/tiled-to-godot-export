/**
* Represents an Array of bytes.
* @class PackedByteArray
*/
export class PackedByteArray {
  /**
   * @param {Object} [props]
   * @param {int[]} [props.array]
   */
  constructor({
    array = [],
  } = {}) {
    this.array = array;
  }

  equals(other) {
    if (this.array.length !== other.length) return false;

    for (let i = 0; i < this.array.length; i++) {
      if (this.array[i] != other[i]) return false;
    }

    return other instanceof PackedByteArray && this.array === other.array;
  }

  toString() {
    const stringifiedArray = this.array
      .map(byte => byte)
      .join(', ');

    return `PackedByteArray(${stringifiedArray})`;
  }
}
