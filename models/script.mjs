import { ExternalResource } from './external_resource.mjs';

/**
 * Represents a Script.
 * @class Script
 * @extends Resource
 */
export class Script extends ExternalResource {
  constructor({
    externalResource = {
      name: "Script",
      path: "",
    },
  } = {}) {
    super(externalResource);
    this.type = "Script";
  }
}
