import { Area2D } from './area_2d.mjs';
import { Node2D } from './node_2d.mjs';
import { Resource } from './resource.mjs';

/**
 * Represents a Room.
 * @class Room
 * @extends Node2D
 */
export class Room extends Area2D {
  /**
   * @param {Object} [props]
   * @param {Resource} [props.data]
   */
  constructor({
    data = null,
  } = {}) {
    super();

    /** @type {Resource} */
    this.data = data;

    this.setName("Room");
    this.setZIndex(0);
    this.setOwner(0);
  }

  getProperties() {
    var properties = super.getProperties();

    properties.data = `ExtResource("${this.data.id}")`;

    return properties;
  }
}
