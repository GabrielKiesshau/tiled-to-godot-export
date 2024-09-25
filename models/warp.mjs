import { checkDefault } from '../utils.mjs';
import { Direction } from '../enums/direction.mjs';
import { Area2D } from './area_2d.mjs';
import { Resource } from './resource.mjs';
import { Script } from './script.mjs';
import { Vector2 } from './vector2.mjs';

/**
 * Represents a Warp.
 * @class Warp
 * @extends Script
 */
export class Warp extends Area2D {
  /**
   * @param {Object} [props]
   * @param {Resource} [props.targetRoom]
   * @param {Direction} [props.transitionDirection]
   * @param {Vector2} [props.transitionStart]
   */
  constructor({
    targetRoom = null,
    transitionDirection = Direction.Right,
    transitionStart = new Vector2(0, 0),
  } = {}) {
    super();

    /** @type {Resource} */
    this.targetRoom = targetRoom;
    /** @type {Direction} */
    this.transitionDirection = transitionDirection;
    /** @type {Vector2} */
    this.transitionStart = transitionStart;

    this.instancePath = "assets/data/prefabs/warp.tscn";
  }

  getProperties() {
    var properties = super.getProperties();

    properties.target_room = `ExtResource("${this.targetRoom.id}")`;
    properties.transition_direction = checkDefault(this.transitionDirection, Direction.Right);
    properties.transition_start = checkDefault(this.transitionStart, new Vector2(0, 0));

    return properties;
  }
}
