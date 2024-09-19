import { CollisionObject2D } from './collision_object_2d.mjs';

/**
 * Represents an Area2D.
 * @class Area2D
 * @extends CollisionObject2D
 */
export class Area2D extends CollisionObject2D {
  constructor() {
    super();

    this.setName("Area2D");
    this.setType("Area2D");
    this.setZIndex(0);
  }
}
