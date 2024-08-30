import { ExternalResource } from './external_resource.mjs';

/**
 * Represents a Script.
 * @class Script
 * @extends Resource
 */
export class Script extends ExternalResource {
  constructor({
    properties = new Map(),
    externalResource = {
      name: "Script",
      path: "",
    },
  } = {}) {
    super(externalResource);
    this.properties = properties;
    this.type = "Script";
  }

  getProperties() {
    return this.properties;
  }
}
