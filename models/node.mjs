import { stringifyKeyValue } from '../utils.mjs';
import { GDObject } from './gd_object.mjs';

/**
 * Represents a generic node in a scene graph.
 * @class Node
 */
export class Node extends GDObject {
  /**
   * @param {Object} [props]
   * @param {string} [props.name]
   * @param {Node} [props.owner]
   * @param {string[]} [props.groups]
   */
  constructor({
    name = "Node",
    owner = null,
    groups = [],
  } = {}) {
    super();

    /** @type {string} - The name of the node. */
    this.name = name || "Node";
    /** @type {Node} - The owner of this node. */
    this.owner = owner;
    /** @type {string[]} */
    this.groups = groups;
    /** @type {Node[]} */
    this.nodeList = [];
    /** @type {string} */
    this.instanceID = "";

    this.setType("Node");
  }

  /**
   * Sets the name of this node only if the name isn't empty, null or undefined.
   * 
   * @param {string} name - The new name to set.
   * @returns {Node} - The node, updated.
   */
  setName(name) {
    if (name && name.trim()) {
      this.name = name;
    }

    return this;
  }

  /**
   * Sets the owner of this node.
   * 
   * @param {Node} owner - The new owner to set.
   * @returns {Node} - The node, updated.
   */
  setOwner(owner) {
    this.owner = owner;
    return this;
  }

  /**
   * Sets the groups of this node.
   * 
   * @param {string[]} groups - The new groups to set.
   * @returns {Node} - The node, updated.
   */
  setGroups(groups) {
    this.groups = groups;
    return this;
  }

  /**
   * Sets the instance ID of this node.
   * 
   * @param {string} instanceID - The new instance ID to set.
   * @returns {Node} - The node, updated.
   */
  setInstance(instanceID) {
    this.instanceID = instanceID;
    return this;
  }

  /**
   * Formats a list of string into a string with its values separated by commas.
   *
   * @returns {stringList} - List of strings to format.
   */
  formatStringList(stringList) {
    return `[${stringList.map(str => `"${str}"`).join(', ')}]`;
  }

  /**
   * Determines the ownership chain of the node and returns a string.
   * 
   * @returns {string}
   */
  getOwnershipChain() {
    if (this.owner === 0) {
      return null;
    }

    if (this.owner === null) {
      return ".";
    }

    const chain = [];
    let currentNode = this.owner;

    while (currentNode !== null) {
      chain.unshift(currentNode.name);
      currentNode = currentNode.owner;
    }

    return chain.join("/");
  }

  /**
   * Registers a node in the node list of this node.
   * 
   * @param {Node} node - The node to be registered
   */
  registerNode(node) {
    let baseName = node.name;

    const baseNameMatch = baseName.match(/^(.*?)(?:_\d+)?$/);
    if (baseNameMatch && baseNameMatch[1]) {
        baseName = baseNameMatch[1];
    }

    let proposedName = baseName;
    let counter = 0;

    // Loop to find a unique name
    // We check against the *existing* nodeList
    while (this.nodeList.some(existingNode => existingNode.name === proposedName)) {
      counter++;
      proposedName = `${baseName}_${counter}`;
    }

    node.setName(proposedName);

    this.nodeList.push(node);
  }

  /**
   * Serializes the object to fit Godot structure as a node.
   *
   * @returns {string} - Serialized subresource in Godot string format.
   */
  serializeAsNode() {
    let typeProperty = this.type ? ` type="${this.type}"` : "";
    const parent = this.getOwnershipChain();
    const parentProperty = parent ? ` parent="${parent}"` : "";

    let nodePathsProperty = "";

    if (this.nodePathPropertyMap.size > 0) {
      const keys = Array.from(this.nodePathPropertyMap.keys());
      const packedStringArray = keys.map(key => `"${key}"`).join(', ');
      nodePathsProperty = ` node_paths=PackedStringArray(${packedStringArray})`;
    }

    let groupsProperty = "";
    if (this.groups?.length) {
      const formattedGroups  = this.formatStringList(this.groups);
      groupsProperty = ` groups=${formattedGroups}`;
    }

    let instanceProperty = "";
    if (this.instanceID.length != 0) {
      typeProperty = "";
      instanceProperty = ` instance=ExtResource("${this.instanceID}")`;
    }

    let nodeString = `[node name="${this.name}"${typeProperty}${parentProperty}${nodePathsProperty}${groupsProperty}${instanceProperty}]`;

    for (let [key, value] of Object.entries(this.getProperties())) {
      if (value === undefined || value === null) continue;

      const keyValue = stringifyKeyValue(key, value, false, false, true);
      nodeString += `\n${keyValue}`;
    }

    if (this.propertyMap.size > 0) {
      for (let [key, value] of this.propertyMap) {
        if (value === undefined || value === null) continue;

        const keyValue = stringifyKeyValue(key, value, false, false, true);
        nodeString += `\n${keyValue}`;
      }
    }

    return `${nodeString}\n`;
  }

  /**
   * Serializes the node list to fit Godot structure.
   *
   * @returns {string} - Serialized node list.
   */
  serializeNodeList() {
    if (this.nodeList.length == 0) {
      return "";
    }

    let nodeListString = "\n";

    nodeListString += this.nodeList.map(node => node.serializeAsNode()).join('\n');

    return nodeListString;
  }

  /**
   * Serializes the object as a Godot file.
   *
   * @param {TileMap} map - The tiled map to export.
   * @returns {string} - Serialized scene in Godot string format.
   */
  serializeToGodot() {
    const loadSteps = 1 + this.externalResourceList.length + this.subResourceList.length;

    const externalResourceListString = this.serializeExternalResourceList();
    const subResourceListString = this.serializeSubResourceList();
    const nodeListString = this.serializeNodeList();

    let sceneString = `[gd_scene load_steps=${loadSteps} format=3]\n`
    sceneString += `${externalResourceListString}`;
    sceneString += `${subResourceListString}`;
    sceneString += `${nodeListString}\n`;

    return sceneString;
  }
}
