export class CustomDataLayer {
  constructor({
    name = "Custom Data Layer",
    type = 0,
  } = {}) {
    /** @type {string} */
    this.name = name;
    /** @type {string} */
    this.type = type;
  }
}
