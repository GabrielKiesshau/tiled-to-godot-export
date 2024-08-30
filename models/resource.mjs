import { getUID, resolvePath, stringifyKeyValue } from '../utils.mjs';
import { GDObject } from './gd_object.mjs';

/**
 * Represents a resource.
 * @class Resource
 * 
 * @property {string} name - 
 * @property {string} path - 
 */
export class Resource extends GDObject {
  constructor({
    name = "Resource",
    path = "",
  } = {}) {
    super();
    this.name = name;
    this.type = "Resource";
    this.path = path;
  }

  /**
   * Serializes this object to fit Godot structure as an external resource.
   * @returns {string} - Serialized external resource in Godot string format.
   */
  serializeAsExternalResource() {
    const absolutePath = this.getAbsolutePath();

    // Determine UID if the file exists:
    const uid = File.exists(absolutePath) ? getUID(absolutePath) : '';
    const uidProperty = uid ? ` uid="${uid}"` : '';

    return `[ext_resource type="${this.type}"${uidProperty} path="res://${this.path}" id="${this.id}"]\n`;
  }

  /**
   * Serializes this object to fit Godot structure as a subresource.
   *
   * @returns {string} - Serialized resource in Godot string format.
   */
  serializeAsSubResource() {
    let subResourceString = `[sub_resource type="${this.type}" id="${this.id}"]`;

    for (let [key, value] of Object.entries(this.getProperties())) {
      if (value === undefined || value === null) continue;

      const keyValue = stringifyKeyValue(key, value, false, false, true);
      subResourceString += `\n${keyValue}`;
    }
  
    return `${subResourceString}\n`;
  }

  getAbsolutePath() {
    // Ensure filePath is properly handled, removing leading slashes:
    const sanitizedFilePath = this.path.replace(/^\/+/, '');
    return resolvePath(sanitizedFilePath);
  }
}
