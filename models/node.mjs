import { stringifyKeyValue } from '../utils.mjs';

/**
 * Represents a generic node in a scene graph.
 * @class Node
 * @property {string} name - The name of the node.
 * @property {Node} owner - The owner of this node.
 * @property {string} type - The owner of this node.
 * @property {string[]} groups - The owner of this node.
 */
export class Node {
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
    this.name = name;
    this.owner = owner;
    this.groups = groups;
    this.type = "Node";
  }

  getProperties() {
    return { };
  }

  formatStringList(strings) {
    return `[${strings.map(str => `"${str}"`).join(', ')}]`;
  }

  /**
   * Serializes the object to fit Godot structure.
   *
   * @returns {string} - Serialized subresource in Godot string format.
   */
  serializeToGodot() {
    const parent = this.getOwnershipChain();
    const groups = this.formatStringList(this.groups);

    const groupsProperty = this.groups.length > 0 ? ` groups=${groups}` : '';

    let nodeString = `[node name="${this.name}" type="${this.type}" parent="${parent}"${groupsProperty}]`;

    for (let [key, value] of Object.entries(this.getProperties())) {
      if (value === undefined || value === null) continue;

      const keyValue = stringifyKeyValue(key, value, false, false, true);
      nodeString += `\n${keyValue}`;
    }
  
    return `${nodeString}\n`;
  }

  /**
   * Determines the ownership chain of the node and returns a string.
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
}
