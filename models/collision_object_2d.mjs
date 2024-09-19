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

    this.setName("CollisionObject2D");
    this.setType("CollisionObject2D");
    this.setZIndex(0);
  }

  /**
   * Sets the collision layer of this collision object 2D.
   * 
   * @param {number} collisionLayer - The new collision layer to set.
   * @returns {CollisionObject2D} - The collision object 2D, updated.
   */
  setCollisionLayer(collisionLayer) {
    this.collisionLayer = collisionLayer;
    return this;
  }

  /**
   * Sets the collision mask of this collision object 2D.
   * 
   * @param {number} collisionMask - The new collision mask to set.
   * @returns {CollisionObject2D} - The collision object 2D, updated.
   */
  setCollisionMask(collisionMask) {
    this.collisionMask = collisionMask;
    return this;
  }

  getProperties() {
    var parentProperties = super.getProperties();

    parentProperties.collision_layer = checkDefault(this.collisionLayer, 1);
    parentProperties.collision_mask = checkDefault(this.collisionMask, 1);

    return parentProperties;
  }
}
