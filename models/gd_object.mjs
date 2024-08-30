import { Resource } from './resource.mjs';

/**
 * Represents a Godot Object.
 * @class GDObject
 * 
 * @property {number} id - 
 * @property {Resource[]} externalResourceList - List of external resources.
 * @property {Resource[]} subResourceList - List of subresources.
 * @property {number} currentExternalResourceID - ID of the current external resource.
 * @property {number} currentSubResourceID - ID of the current subresource.
 */
export class GDObject {
  /**
   * @param {Object} [props]
   * @param {number} [props.id]
   * @param {Resource[]} [props.externalResourceList]
   * @param {Resource[]} [props.subResourceList]
   * @param {number} [props.currentExternalResourceID]
   * @param {number} [props.currentSubResourceID]
   */
  constructor({ } = { }) {
    this.id = 0;
    this.type = "Object";
    this.externalResourceList = [];
    this.subResourceList = [];
    this.currentExternalResourceID = 0;
    this.currentSubResourceID = 0;
  }

  /**
   * Adds an external resource to this object.
   * @param {Resource} resource - The resource to be added as an external resource to this object.
   */
  addExternalResource(resource) {
    resource.id = this.currentExternalResourceID;
    this.externalResourceList.push(resource)
    this.currentExternalResourceID++;

    return resource;
  }

  /**
   * Adds a subresource to this object.
   * @param {Resource} resource - The resource to be added as a subresource to this object.
   */
  addSubResource(resource) {
    resource.id = this.currentSubResourceID;
    this.subResourceList.push(resource)
    this.currentSubResourceID++;
  }

  /**
   * Serializes the object as a Godot file.
   *
   * @returns {string} - Serialized subresource in Godot string format.
   */
  serializeToGodot() {}

  /**
   * Serializes this object's external resource list to fit Godot structure.
   *
   * @returns {string} - Serialized external resource list.
   */
  serializeExternalResourceList() {
    if (this.externalResourceList.length == 0) {
      return "";
    }

    let externalResourceListString = "\n";

    for (const resource of this.externalResourceList) {
      externalResourceListString += resource.serializeAsExternalResource();
    }

    return externalResourceListString;
  }
  
  /**
   * Serializes this object's subresource list to fit Godot structure.
   *
   * @returns {string} - Serialized subresource list.
   */
  serializeSubResourceList() {
    if (this.subResourceList.length == 0) {
      return "";
    }

    let subResourceListString = "\n";

    subResourceListString += this.subResourceList.map(resource => resource.serializeAsSubResource()).join('\n');

    return subResourceListString;
  }

  getProperties() {
    return { };
  }
}
