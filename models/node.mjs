import { prefix } from '../constants.mjs';
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

  getProperties() {
    return {
      script: this.script ? `ExtResource("${this.script.id}")` : null,
    };
  }

  /**
   * Determines the ownership chain of the node and returns a string.
   * 
   * @returns {string}
   */
  getOwnershipChain() {
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
   * Ensures the node name is unique by appending a number if necessary.
   * @param {Node} node - The node to be registered
   */
  registerNode(node) {
    // Check if a node with the same name already exists in the nodeList
    let existingNodes = this.nodeList.filter(n => n.name.startsWith(node.name));

    // If there are any nodes with the same base name
    if (existingNodes.length > 0) {
        // Extract existing numbers from nodes with the same name pattern
        const nameRegex = new RegExp(`^${node.name}(\\d*)$`);
        const highestNumber = existingNodes
            .map(n => {
                const match = n.name.match(nameRegex);
                return match && match[1] ? parseInt(match[1]) : 0;
            })
            .reduce((max, curr) => Math.max(max, curr), 0);

        // Set the new name by appending a number higher than any existing sibling with the same name
        node.name = `${node.name}_${highestNumber + 1}`;
    }

    this.nodeList.push(node);
  }

  /**
   * Serializes the object to fit Godot structure as a node.
   *
   * @returns {string} - Serialized subresource in Godot string format.
   */
  serializeAsNode() {
    const parent = this.getOwnershipChain();

    let groupsProperty = "";
    if (this.groups?.length) {
      const formattedGroups  = this.formatStringList(this.groups);
      groupsProperty = ` groups=${formattedGroups}`;
    }

    let nodeString = `[node name="${this.name}" type="${this.type}" parent="${parent}"${groupsProperty}]`;

    for (let [key, value] of Object.entries(this.getProperties())) {
      if (value === undefined || value === null) continue;

      const keyValue = stringifyKeyValue(key, value, false, false, true);
      nodeString += `\n${keyValue}`;
    }

    if (this.script) {
      nodeString += `\nscript = ExtResource("${this.script.id}")`;

      this.script.getProperties().forEach((value, key) => {
        if (value === undefined || value === null) return;
        
        key = key.substring(1);
        const keyValue = stringifyKeyValue(key, value, false, false, true);
        nodeString += `\n${keyValue}`;
      });
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
  serializeToGodot(map) {
    const loadSteps = 1 + this.externalResourceList.length + this.subResourceList.length;
    const type = map.property(`${prefix}type`) || "Node2D";

    const externalResourceListString = this.serializeExternalResourceList();
    const subResourceListString = this.serializeSubResourceList();
    const nodeListString = this.serializeNodeList();

    let sceneString = `[gd_scene load_steps=${loadSteps} format=3]\n`
    sceneString += `${externalResourceListString}`;
    sceneString += `${subResourceListString}`;
    sceneString += `\n`;
    sceneString += `[node name="${this.name}" type="${type}"]\n`;
    sceneString += `${nodeListString}`;

    return sceneString;
  }

  /**
   * Sets the name of this node only if the name isn't empty, null or undefined.
   * 
   * @param {string} name - The new name to set.
   */
  setName(name) {
    if (name && name.trim()) {
      this.name = name;
    }
  }
}
