import { PhysicsData } from './physics_data.mjs';
import { Vector2i } from './vector2.mjs';

/**
 * Represents a Tile
 * @class TileData
 */
export class TileData {
  /**
   * @param {Object} [props]
   * @param {Vector2i} [props.position]
   * @param {PhysicsData[]} [props.physicsDataList]
   * @param {CustomData[]} [props.customDataList]
   */
  constructor({
    position = new Vector2i(0, 0),
    physicsDataList = [],
    customDataList = [],
  } = {}) {
    /** @type {Vector2i} */
    this.position = position;
    /** @type {PhysicsData[]} */
    this.physicsDataList = physicsDataList;
    /** @type {CustomData[]} */
    this.customDataList = customDataList;
  }

  getKey() {
    return `${this.position.x}:${this.position.y}/0`;
  }
}
