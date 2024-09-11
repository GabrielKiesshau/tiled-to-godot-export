import { Node2D } from './node_2d.mjs';

/**
 * Represents a Sprite2D.
 * @class Sprite2D
 * @extends Node2D
 */
export class Sprite2D extends Node2D {
  constructor() {
    super();

    super.name = "Node2D";
    super.type = "Sprite2D";
    super.zIndex = 0;
  }
}
