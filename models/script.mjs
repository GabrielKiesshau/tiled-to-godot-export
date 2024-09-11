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
    resource = {
      name: "Script",
      path: "",
    },
  } = {}) {
    super(resource);
    /** @type {Map<string, any>} */
    this.properties = properties;
    /** @type {string} */
    this.type = "Script";
  }

  getProperties() {
    return this.properties;
  }
}
