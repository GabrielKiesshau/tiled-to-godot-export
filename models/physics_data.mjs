import { Polygon } from './polygon.mjs';
import { Vector2 } from './vector2.mjs';

export class PhysicsData {
  constructor({
    linearVelocity = new Vector2({ x: 0, y: 0 }),
    angularVelocity = 0.0,
    polygonList = [],
    id = 0,
  } = {}) {
    this.linearVelocity = linearVelocity;
    this.angularVelocity = angularVelocity;
    /** @type {Polygon[]} */
    this.polygonList = polygonList;
    this.id = id;
  }
}
