import { Node2D } from './node_2d.mjs';

/**
 * Represents a CollisionPolygon2D.
 * @class CollisionPolygon2D
 * @extends Node2D
 */
export class CollisionPolygon2D extends Node2D {
  /**
   * @param {Object} [props]
   * @param {Node2D} [props.node2D]
   */
  constructor({
    node2D = {
      canvasItem: {
        node: {
          name: "CollisionPolygon2D",
        },
      },
    },
  } = {}) {
    super(node2D);
    this.type = "CollisionPolygon2D";
  }
}
