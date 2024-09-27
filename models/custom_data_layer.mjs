/**
* Represents a custom data layer.
* @class PhysicsLayer
*/
export class CustomDataLayer {
  /**
   * @param {Object} [props]
   * @param {string} [props.name]
   * @param {string} [props.type]
   * @param {number} [props.id]
   */
  constructor({
    name = "Custom Data Layer",
    type = 0,
    id = 0,
  } = {}) {
    /** @type {string} */
    this.name = name;
    /** @type {string} */
    this.type = type;
    /** @type {number} */
    this.id = id;
  }
}
