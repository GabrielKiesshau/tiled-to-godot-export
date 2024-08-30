import { prefix } from '../constants.mjs';
import { GDObject } from './gd_object.mjs';
import { Node as GDNode } from './node.mjs';

/**
 * Represents a Godot Scene.
 * @class PackedScene
 * @extends GDObject
 * @property {GDNode[]} nodeList - List of nodes.
 */
export class PackedScene extends GDObject {
  /**
   * @param {Object} [props]
   * @param {GDNode[]} [props.nodeList=[]]
   * @param {GDNode} [props.rootNode]
   */
  constructor({
    rootNode = null,
  } = {}) {
    super();
    this.rootNode = rootNode;

    this.nodeList = [];
  }

  /**
   * Serializes the object to fit Godot structure.
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
    sceneString += `[node name="${this.rootNode.name}" type="${type}"]\n`;
    sceneString += `${nodeListString}`;

    return sceneString;
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

    nodeListString += this.nodeList.map(node => node.serializeToGodot()).join('\n');

    return nodeListString;
  }
}
