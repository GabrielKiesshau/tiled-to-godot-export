import { Polygon } from './polygon.mjs';
import { Vector2 } from './vector2.mjs';

/**
* Represents physics data.
* @class PhysicsData
*/
export class PhysicsData {
  /**
   * @param {Object} [props]
   * @param {Vector2} [props.linearVelocity]
   * @param {number} [props.angularVelocity]
   * @param {Polygon[]} [props.polygonList]
   * @param {number} [props.id]
   */
  constructor({
    linearVelocity = new Vector2({ x: 0, y: 0 }),
    angularVelocity = 0.0,
    polygonList = [],
    id = 0,
  } = {}) {
    /** @type {Vector2} */
    this.linearVelocity = linearVelocity;
    /** @type {number} */
    this.angularVelocity = angularVelocity;
    /** @type {Polygon[]} */
    this.polygonList = polygonList;
    /** @type {number} */
    this.id = id;
  }
}
