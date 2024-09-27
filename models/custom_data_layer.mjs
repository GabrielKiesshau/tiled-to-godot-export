/**
* Represents a custom data layer.
* @class CustomDataLayer
*/
export class CustomDataLayer {
  /**
   * @param {Object} [props]
   * @param {string} [props.name]
   * @param {number} [props.type]
   */
  constructor({
    name = "Custom Data Layer",
    type = 0,
  } = {}) {
    /** @type {string} */
    this.name = name;
    /** @type {number} */
    this.type = type;
  }
}
