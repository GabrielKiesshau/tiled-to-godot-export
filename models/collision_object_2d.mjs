import { Node2D } from './node_2d.mjs';

/**
 * Represents a CollisionObject2D.
 * @class CollisionObject2D
 * @extends Node2D
 */
export class CollisionObject2D extends Node2D {
  /**
   * @param {Object} [props]
   * @param {Node2D} [props.node2D]
   */
  constructor({
    node2D = {
      canvasItem: {
        node: {
          name: "Node2D",
        },
      },
    },
  } = {}) {
    super(node2D);
    this.type = "CollisionObject2D";
  }
}
