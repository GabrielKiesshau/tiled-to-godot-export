import { ExternalResourceType } from '../enums/external_resource_type.mjs';

/**
 * Represents an external resource in a scene.
 * @class ExternalResource
 * @property {ExternalResourceType} type - 
 * @property {string} path - 
 * @property {number} id - 
 * @property {string} uid - 
 */
export class ExternalResource {
  constructor({
    type = ExternalResourceType.Resource,
    path = "",
    id = 0,
    uid = "",
  } = {}) {
    this.type = type;
    this.path = path;
    this.id = id;
    this.uid = uid;
  }

  /**
   * Serializes the object to fit Godot structure.
   *
   * @returns {string} - Serialized external resource in Godot string format.
   */
  serializeToGodot() {
    const uid = this.uid ? `uid="${this.uid}" ` : "";

    return `[ext_resource type="${this.type}" ${uid}path="res://${this.path}" id="${this.id}"]\n`;
  }
}
