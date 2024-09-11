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
   */
  constructor({
    collisionLayer = 1,
    collisionMask = 1,
  } = {}) {
    super();
    /** @type {number} */
    this.collisionLayer = collisionLayer;
    /** @type {number} */
    this.collisionMask = collisionMask;

    super.name = "CollisionObject2D";
    super.type = "CollisionObject2D";
    super.zIndex = 0;
  }

  getProperties() {
    var parentProperties = super.getProperties();

    parentProperties.collision_layer = checkDefault(this.collisionLayer, 1);
    parentProperties.collision_mask = checkDefault(this.collisionMask, 1);

    return parentProperties;
  }
}
