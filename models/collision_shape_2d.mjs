import { Node2D } from './node_2d.mjs';
import { Shape2D } from './shape_2d.mjs';

/**
 * Represents a CollisionShape2D.
 * @class CollisionShape2D
 * @extends Node2D
 */
export class CollisionShape2D extends Node2D {
  /**
   * @param {Object} [props]
   * @param {Shape2D} [props.shape]
   * @param {Node2D} [props.node2D]
   */
  constructor({
    shape = null,
    node2D = {
      canvasItem: {
        node: {
          name: "CollisionShape2D",
        },
      },
    },
  } = {}) {
    super(node2D);
    this.shape = shape;
    this.type = "CollisionShape2D";
  }

  getProperties() {
    return {
      shape: `SubResource("${this.shape.id}")`,
    };
  }
}
