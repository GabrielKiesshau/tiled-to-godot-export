import { stringifyKeyValue } from '../utils.mjs';
import { Script } from './script.mjs';

/**
 * Represents a generic node in a scene graph.
 * @class Node
 */
export class Node {
  /**
   * @param {Object} [props]
   * @param {string} [props.name]
   * @param {Node} [props.owner]
   * @param {string[]} [props.groups]
   * @param {Script} [props.script]
   */
  constructor({
    name = "Node",
    owner = null,
    groups = [],
    script = null,
  } = {}) {
    /** @type {string} */
    this.name = name || "Node";
    /** @type {Node} */
    this.owner = owner;
    /** @type {string[]} */
    this.groups = groups;
    /** @type {string} */
    this.type = "Node";
    /** @type {Script} */
    this.script = script;
  }

  getProperties() {
    return {
      script: this.script ? `ExtResource("${this.script.id}")` : null,
    };
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
   * Serializes the object to fit Godot structure as a node.
   *
   * @returns {string} - Serialized subresource in Godot string format.
   */
  serializeAsNode() {
    const parent = this.getOwnershipChain();
    const groups = this.formatStringList(this.groups);

    const groupsProperty = this.groups.length > 0 ? ` groups=${groups}` : '';

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
