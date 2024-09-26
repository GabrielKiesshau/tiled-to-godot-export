/**
* Represents custom data.
* @class CustomData
*/
export class CustomData {
  /**
   * @param {Object} [props]
   * @param {string} [props.name]
   * @param {number} [props.type]
   */
  constructor({
    name = "Custom Data",
    type = 0,
  } = {}) {
    /** @type {string} */
    this.name = name;
    /** @type {number} */
    this.type = type;
  }
}
