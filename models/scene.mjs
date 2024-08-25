import { ExternalResource } from './external_resource.mjs';
import { Node as GDNode } from './node.mjs';
import { SubResource } from './subresource.mjs';

/**
 * Represents a Godot Scene.
 * @class Scene
 * @property {ExternalResource[]} externalResourceList - List of external resources.
 * @property {SubResource[]} subResourceList - List of subresources.
 * @property {GDNode[]} nodeList - List of nodes. 
 * @property {string[]} nodeListString - List of nodes in string form. 
 */
export class Scene {
  /**
   * @param {Object} [props]
   * @param {ExternalResource[]} [props.externalResourceList=[]]
   * @param {SubResource[]} [props.subResourceList=[]]
   * @param {GDNode[]} [props.nodeList=[]]
   * @param {string[]} [props.nodeListString=[]]
   * @param {GDNode} [props.rootNode]
   */
  constructor({
    externalResourceList = [],
    subResourceList = [],
    nodeList = [],
    nodeListString = [],
    rootNode = null,
  } = {}) {
    this.externalResourceList = externalResourceList;
    this.subResourceList = subResourceList;
    this.nodeList = nodeList;
    this.nodeListString = nodeListString;
    this.rootNode = rootNode;
  }

  /**
   * Serializes the object to fit Godot structure.
   *
   * @returns {string} - Serialized scene in Godot string format.
   */
  serializeToGodot(map) {
    const loadSteps = 1 + this.externalResourceList.length + this.subResourceList.length;
    const type = map.property("godot:type") || "Node2D";

    const externalResourceListString = this.serializeExternalResourceList();
    const subResourceListString = this.serializeSubResourceList();
    // const nodeListString = this.serializeNodeList();
    const nodeListString = this.serializeNodeListV2();

    let sceneString = `[gd_scene load_steps=${loadSteps} format=4]\n`
    sceneString += `${externalResourceListString}`;
    sceneString += `${subResourceListString}`;
    sceneString += `\n`;
    sceneString += `[node name="${this.rootNode.name}" type="${type}" parent="."]\n`;
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

    for (const subResource of this.subResourceList) {
      subResourceListString += subResource.serializeToGodot();
    }

    return subResourceListString;
  }

  /**
   * Serializes the node list to fit Godot structure.
   *
   * @returns {string} - Serialized node list.
   */
  serializeNodeList() {
    if (this.nodeListString.length == 0) {
      return "";
    }

    return this.nodeListString.join("");
  }

  /**
   * Serializes the node list to fit Godot structure.
   *
   * @returns {string} - Serialized node list.
   */
  serializeNodeListV2() {
    if (this.nodeList.length == 0) {
      return "";
    }

    let nodeListString = "\n";

    nodeListString += this.nodeList.map(node => node.serializeToGodot()).join('\n');

    return nodeListString;
  }
}
