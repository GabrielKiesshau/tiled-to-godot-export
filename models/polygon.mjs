import { Vector2 } from './vector2.mjs';

/**
* Represents a polygon.
* @class Polygon
*/
export class Polygon {
  /**
   * @param {Object} [props]
   * @param {Vector2[]} [props.pointList]
   */
  constructor({
    pointList = [],
  } = {}) {
    /** @type {Vector2[]} */
    this.pointList = pointList;
  }

  getPointList() {
    return this.pointList.join(', ');
  }
}
