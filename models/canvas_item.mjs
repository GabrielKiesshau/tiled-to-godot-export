import { Node as GDNode } from './node.mjs';

/**
 * Represents a drawable object in a 2D space.
 * @class CanvasItem
 * @extends GDNode
 */
export class CanvasItem extends GDNode {
  /**
   * @param {Object} [props]
   * @param {GDNode} [props.node]
   */
  constructor({
    node = {
      name: "CanvasItem",
    },
  } = {}) {
    super(node);
    this.type = "CanvasItem";
  }
}
