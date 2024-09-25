/**
 * @typedef {import('./resource.mjs').Resource} Resource
 * @typedef {import('./script.mjs').Script} Script
 */

/**
 * Represents a Godot Object.
 * @class GDObject
 */
export class GDObject {
  /**
   * @param {Script} [script]
   */
  constructor({
    script = null,
  } = { }) {
    /** @type {number} */
    this.id = 0;
    /** @type {string} - The node type */
    this.type = "Object";
    /** @type {Script} */
    this.script = script;
    /** @type {Resource[]} */
    this.externalResourceList = [];
    /** @type {Resource[]} */
    this.subResourceList = [];
    /** @type {number} */
    this.currentExternalResourceID = 0;
    /** @type {number} */
    this.currentSubResourceID = 0;
  }

  /**
   * Sets the type of this node.
   * 
   * @param {string} type - The new type to set.
   * @returns {GDObject} - The object, updated.
   */
  setType(type) {
    this.type = type;
    return this;
  }

  /**
   * Hides the type property of this node.
   * @returns {GDObject} - The object, updated.
   */
  hideType() {
    this.type = null;
    return this;
  }

  /**
   * Sets the script of this object.
   * 
   * @param {Script} script - The new script to set.
   * @returns {GDObject} - The object, updated.
   */
  setScript(script) {
    this.script = script;
    return this;
  }

  /**
   * Adds an external resource to this object.
   * @param {Resource} resource - The resource to be added as an external resource to this object.
   */
  addExternalResource(resource) {
    resource.id = this.currentExternalResourceID;
    tiled.log(`Adding external resource: "${resource.name}", Type: ${resource.type}, ID: ${resource.id}`);
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
    tiled.log(`Adding subresource: "${resource.name}", Type: ${resource.type}, ID: ${resource.id}`);
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

    externalResourceListString += this.externalResourceList.map(resource => resource.serializeAsExternalResource()).join('\n');

    return externalResourceListString + '\n';
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

    return subResourceListString + '\n';
  }

  getProperties() {
    return { };
  }
}
