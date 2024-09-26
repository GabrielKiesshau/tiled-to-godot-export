/**
 * Represents a Frame of an Animated Tile
 * @class AnimatedTileFrame
 */
export class AnimatedTileFrame {
  /**
   * @param {Object} [props]
   * @param {number} [props.duration]
   */
  constructor({
    duration = 1.0,
  } = {}) {
    /** @type {number} */
    this.duration = duration;
  }
}
