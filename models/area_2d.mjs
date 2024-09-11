import { CollisionObject2D } from './collision_object_2d.mjs';

/**
 * Represents an Area2D.
 * @class Area2D
 * @extends CollisionObject2D
 */
export class Area2D extends CollisionObject2D {
  /**
   * @param {Object} [props]
   * @param {CollisionObject2D} [props.collisionObject2D]
   */
  constructor({
    collisionObject2D = {
      node2D: {
        canvasItem: {
          zIndex: 0,
          node: {
            name: "Area2D",
          },
        },
      },
    },
  } = {}) {
    super(collisionObject2D);
    /** @type {string} */
    this.type = "Area2D";
  }
}
