import { PhysicsData } from './physics_data.mjs';
import { Vector2i } from './vector2.mjs';

/**
 * Represents a Tile
 * @class TileData
 */
export class TileData {
  constructor({
    position = new Vector2i({ x: 0, y: 0 }),
    physicsDataList = [],
    customDataList = [],
  } = {}) {
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
