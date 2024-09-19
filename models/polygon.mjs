import { Vector2 } from './vector2.mjs';

/**
* Represents a polygon.
* @class Polygon
*/
export class Polygon {
  /**
   * @param {Object} [props]
   * @param {Vector2[]} [props.pointList]
   * @param {bool} [props.oneWay]
   */
  constructor({
    pointList = [],
    oneWay = false,
  } = {}) {
    /** @type {Vector2[]} */
    this.pointList = pointList;
    /** @type {bool} */
    this.oneWay = oneWay;
  }

  getPointList() {
    return this.pointList.join(', ');
  }
}
