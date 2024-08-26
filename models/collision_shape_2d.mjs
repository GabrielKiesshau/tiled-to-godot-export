import { Node2D } from './node_2d.mjs';

/**
 * Represents a CollisionShape2D.
 * @class CollisionShape2D
 * @extends Node2D
 */
export class CollisionShape2D extends Node2D {
  /**
   * @param {Object} [props]
   * @param {Node2D} [props.node2D]
   */
  constructor({
    node2D = {
      canvasItem: {
        node: {
          name: "CollisionShape2D",
        },
      },
    },
  } = {}) {
    super(node2D);
    this.type = "CollisionShape2D";
  }
}
