import { AnimatedTileFrame } from './animated_tile_frame.mjs';
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
   * @param {number} [props.animation_columns]
   * @param {Vector2i} [props.animation_separation]
   * @param {number} [props.animation_speed]
   * @param {AnimatedTileFrame[]} [props.animation_sequence]
   */
  constructor({
    position = new Vector2i(0, 0),
    physicsDataList = [],
    customDataList = [],
    is_animated = false,
    animation_columns = 1,
    animation_separation = new Vector2i(0, 0),
    animation_speed = 1.0,
    animation_sequence = 1,
  } = {}) {
    /** @type {Vector2i} */
    this.position = position;
    /** @type {PhysicsData[]} */
    this.physicsDataList = physicsDataList;
    /** @type {CustomData[]} */
    this.customDataList = customDataList;
    /** @type {boolean} */
    this.is_animated = is_animated;
    /** @type {number} */
    this.animation_columns = animation_columns;
    /** @type {Vector2i} */
    this.animation_separation = animation_separation;
    /** @type {number} */
    this.animation_speed = animation_speed;
    /** @type {AnimatedTileFrame[]} */
    this.animation_sequence = animation_sequence;
  }

  getKey() {
    return `${this.position.x}:${this.position.y}`;
  }
}
