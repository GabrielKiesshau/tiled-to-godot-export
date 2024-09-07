import { Resource } from './resource.mjs';

/**
 * Represents a Script.
 * @class Script
 * @extends Resource
 */
export class Script extends Resource {
  constructor({
    /** @type {Map<string, any>} */
    properties = new Map(),
    resource = {
      name: "Script",
      path: "",
    },
  } = {}) {
    super(resource);
    /** @type {Map<string, any>} */
    this.properties = properties;
    this.type = "Script";
  }

  getProperties() {
    return this.properties;
  }
}
