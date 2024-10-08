import { Resource } from './resource.mjs';

/**
 * Represents a Script.
 * @class Script
 * @extends Resource
 */
export class Script extends Resource {
  /**
   * @param {Object} [props]
   * @param {Map<string, any>} [props.properties]
   */
  constructor({
    properties = new Map(),
  } = {}) {
    super();
    /** @type {Map<string, any>} */
    this.properties = properties;

    this.setName("Script");
    this.setType("Script");
  }

  getProperties() {
    return this.properties;
  }
}
