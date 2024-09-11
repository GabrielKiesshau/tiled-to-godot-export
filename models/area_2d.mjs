import { CollisionObject2D } from './collision_object_2d.mjs';

/**
 * Represents an Area2D.
 * @class Area2D
 * @extends CollisionObject2D
 */
export class Area2D extends CollisionObject2D {
  constructor() {
    super();

    super.name = "Area2D";
    super.type = "Area2D";
    super.zIndex = 0;
  }
}
