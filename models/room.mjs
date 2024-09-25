import { checkDefault } from '../utils.mjs';
import { Area2D } from './area_2d.mjs';
import { Node2D } from './node_2d.mjs';
import { Resource } from './resource.mjs';
import { Vector2 } from './vector2.mjs';

/**
 * Represents a Room.
 * @class Room
 * @extends Node2D
 */
export class Room extends Area2D {
  /**
   * @param {Object} [props]
   * @param {Resource} [props.data]
   * @param {Vector2} [props.spawnPosition]
   */
  constructor({
    data = null,
    spawnPosition = new Vector2({ x: 0, y: 0 }),
  } = {}) {
    super();

    /** @type {Resource} */
    this.data = data;
    /** @type {Vector2} */
    this.spawnPosition = spawnPosition;

    this.setName("Room");
    this.setZIndex(0);
    this.setOwner(0);
  }

  getProperties() {
    var properties = super.getProperties();

    properties.data = `ExtResource("${this.data.id}")`;
    properties.spawn_position = checkDefault(this.spawnPosition, new Vector2({ x: 0, y: 0 }));

    return properties;
  }
}
