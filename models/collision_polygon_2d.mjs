import { checkDefault } from '../utils.mjs';
import { PackedVector2Array } from './packed_vector2_array.mjs';
import { PolygonBuildMode } from '../enums/polygon_build_mode.mjs';
import { Node2D } from './node_2d.mjs';

/**
 * Represents a CollisionPolygon2D.
 * @class CollisionPolygon2D
 * @extends Node2D
 */
export class CollisionPolygon2D extends Node2D {
  /**
   * @param {Object} [props]
   * @param {PolygonBuildMode} [props.buildMode]
   * @param {PackedVector2Array} [props.polygon]
   */
  constructor({
    buildMode = PolygonBuildMode.Polygon,
    polygon = "",
  } = {}) {
    super();
    /** @type {PolygonBuildMode} */
    this.buildMode = buildMode;
    /** @type {PackedVector2Array} */
    this.polygon = polygon;

    this.setName("CollisionPolygon2D");
    this.setType("CollisionPolygon2D");
    this.setZIndex(0);
  }

  getProperties() {
    var parentProperties = super.getProperties();

    parentProperties.build_mode = checkDefault(this.buildMode, PolygonBuildMode.Polygon);
    parentProperties.polygon = checkDefault(this.polygon, new PackedVector2Array());

    return parentProperties;
  }
}
