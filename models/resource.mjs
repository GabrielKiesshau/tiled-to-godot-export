import { checkDefault, getUID, resolvePath, stringifyKeyValue } from '../utils.mjs';
import { GDObject } from './gd_object.mjs';

/**
 * Represents a resource.
 * @class Resource
 */
export class Resource extends GDObject {
  /**
   * @param {Object} [props]
   * @param {string} [props.name]
   * @param {string} [props.path]
   */
  constructor({
    name = "",
    path = "",
  } = {}) {
    super();
    /** @type {string} */
    this.name = name;
    /** @type {string} */
    this.path = path;

    super.type = "Resource";
  }

  getProperties() {
    var properties = {};

    properties.resource_name = checkDefault(`"${this.name}"`, `""`);

    return properties;
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

    return `[ext_resource type="${this.type}"${uidProperty} path="res://${this.path}" id="${this.id}"]`;
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
  
    return `${subResourceString}`;
  }

  getAbsolutePath() {
    // Ensure filePath is properly handled, removing leading slashes:
    const sanitizedFilePath = this.path.replace(/^\/+/, '');
    return resolvePath(sanitizedFilePath);
  }
}
