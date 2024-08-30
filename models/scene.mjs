import { prefix } from '../constants.mjs';
import { GDObject } from './gd_object.mjs';
import { ExternalResource } from './external_resource.mjs';
import { Node as GDNode } from './node.mjs';
import { Resource } from './resource.mjs';

/**
 * Represents a Godot Scene.
 * @class PackedScene
 * @property {ExternalResource[]} externalResourceList - List of external resources.
 * @property {Resource[]} subResourceList - List of subresources.
 * @property {GDNode[]} nodeList - List of nodes.
 */
export class PackedScene extends GDObject {
  /**
   * @param {Object} [props]
   * @param {ExternalResource[]} [props.externalResourceList=[]]
   * @param {Resource[]} [props.subResourceList=[]]
   * @param {GDNode[]} [props.nodeList=[]]
   * @param {GDNode} [props.rootNode]
   */
  constructor({
    rootNode = null,
  } = {}) {
    this.rootNode = rootNode;

    this.externalResourceList = [];
    this.subResourceList = [];
    this.nodeList = [];

    Resource.currentID = 0;
    ExternalResource.currentID = 0;
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
   * Serializes the external resource list to fit Godot structure.
   *
   * @returns {string} - Serialized external resource list.
   */
  serializeExternalResourceList() {
    if (this.externalResourceList.length == 0) {
      return "";
    }

    let externalResourceListString = "\n";

    for (const externalResource of this.externalResourceList) {
      externalResourceListString += externalResource.serializeToGodot();
    }

    return externalResourceListString;
  }
  
  /**
   * Serializes the subresource list to fit Godot structure.
   *
   * @returns {string} - Serialized subresource list.
   */
  serializeSubResourceList() {
    if (this.subResourceList.length == 0) {
      return "";
    }

    let subResourceListString = "\n";

    subResourceListString += this.subResourceList.map(subResource => subResource.serializeToGodot()).join('\n');

    return subResourceListString;
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
