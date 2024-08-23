import { stringifyKeyValue } from '../utils.mjs';
import { SubResourceType } from '../enums/subresource_type.mjs';

/**
 * Represents an external resource in a scene.
 * @class SubResource
 * @property {SubResourceType} type - 
 * @property {number} id - 
 * @property {object} properties - 
 */
export class SubResource {
  constructor({
    type = SubResourceType.RectangleShape2D,
    id = 0,
    properties = {},
  } = {}) {
    this.type = type;
    this.id = id;
    this.properties = properties;
  }

  /**
   * Serializes the object to fit Godot structure.
   *
   * @returns {string} - Serialized subresource in Godot string format.
   */
  serializeToGodot() {
    let subResourceString = `[sub_resource type="${this.type}" id="${this.id}"]\n`;
  
    for (const [key, value] of Object.entries(this.properties)) {
      if (value !== undefined) {
        const keyValue = stringifyKeyValue(key, value, false, false, true);
        subResourceString += `${keyValue}\n`;
      }
    }

    return subResourceString;
  }
}
