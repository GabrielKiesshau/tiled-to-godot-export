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
   * @param {Node2D} [props.node2D]
   */
  constructor({
    buildMode = PolygonBuildMode.Polygon,
    polygon = "",
    node2D = {
      canvasItem: {
        zIndex: 0,
        node: {
          name: "CollisionPolygon2D",
        },
      },
    },
  } = {}) {
    super(node2D);
    this.buildMode = buildMode;
    this.polygon = polygon;
    this.type = "CollisionPolygon2D";
  }

  getProperties() {
    var parentProperties = super.getProperties();

    parentProperties.build_mode = checkDefault(this.buildMode, PolygonBuildMode.Polygon);
    parentProperties.polygon = checkDefault(this.polygon, new PackedVector2Array());

    return parentProperties;
  }
}
