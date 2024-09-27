/**
* Represents custom data.
* @class CustomData
*/
export class CustomData {
  /**
   * @param {Object} [props]
   * @param {string} [props.name]
   * @param {any} [props.value]
   * @param {number} [props.id]
   */
  constructor({
    name = "Custom Data",
    value,
    id = 0,
  } = {}) {
    /** @type {string} */
    this.name = name;
    /** @type {any} */
    this.value = value;
    /** @type {number} */
    this.id = id;
  }
}
