import { checkDefault } from '../utils.mjs';
import { Node2D } from './node_2d.mjs';

/**
 * Represents a CollisionObject2D.
 * @class CollisionObject2D
 * @extends Node2D
 */
export class CollisionObject2D extends Node2D {
  /**
   * @param {Object} [props]
   * @param {number} [props.collisionLayer]
   * @param {number} [props.collisionMask]
   * @param {Node2D} [props.node2D]
   */
  constructor({
    collisionLayer = 1,
    collisionMask = 1,
    node2D = {
      canvasItem: {
        zIndex: 0,
        node: {
          name: "CollisionObject2D",
        },
      },
    },
  } = {}) {
    super(node2D);
    this.collisionLayer = collisionLayer;
    this.collisionMask = collisionMask;
    this.type = "CollisionObject2D";
  }

  getProperties() {
    var parentProperties = super.getProperties();

    parentProperties.collision_layer = checkDefault(this.collisionLayer, 1);
    parentProperties.collision_mask = checkDefault(this.collisionMask, 1);

    return parentProperties;
  }
}
