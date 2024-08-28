import { resolvePath, getUID } from '../utils.mjs';

/**
 * Represents an external resource in a scene.
 * @class ExternalResource
 * 
 * @property {number} id - 
 * @property {string} name - 
 * @property {string} type - 
 * @property {string} path - 
 */
export class ExternalResource {
  constructor({
    name = "ExternalResource",
    path = "",
  } = {}) {
    this.id = ExternalResource.currentID++;
    this.name = name;
    this.type = "";
    this.path = path;
  }

  /**
   * Serializes the object to fit Godot structure.
   * @returns {string} - Serialized external resource in Godot string format.
   */
  serializeToGodot() {
    const absolutePath = this.getAbsolutePath();

    // Determine UID if the file exists:
    const uid = File.exists(absolutePath) ? getUID(absolutePath) : '';
    const uidProperty = uid ? ` uid="${uid}"` : '';

    return `[ext_resource type="${this.type}"${uidProperty} path="res://${this.path}" id="${this.id}"]\n`;
  }

  getAbsolutePath() {
    // Ensure filePath is properly handled, removing leading slashes:
    const sanitizedFilePath = this.path.replace(/^\/+/, '');
    return resolvePath(sanitizedFilePath);
  }
}
