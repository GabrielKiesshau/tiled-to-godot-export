import { stringifyKeyValue } from '../utils.mjs';

/**
 * Represents a resource.
 * @class Resource
 */
export class Resource {
  constructor({ } = {}) {
    this.id = Resource.currentID++;
    this.type = null;
  }

  /**
   * Serializes the object to fit Godot structure.
   *
   * @returns {string} - Serialized resource in Godot string format.
   */
  serializeToGodot() {
    let subResourceString = `[sub_resource type="${this.type}" id="${this.id}"]`;

    for (let [key, value] of Object.entries(this.getProperties())) {
      if (value === undefined || value === null) continue;

      const keyValue = stringifyKeyValue(key, value, false, false, true);
      subResourceString += `\n${keyValue}`;
    }
  
    return `${subResourceString}\n`;
  }

  getProperties() {
    return { };
  }
}
