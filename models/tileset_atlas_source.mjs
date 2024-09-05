import { checkDefault } from '../utils.mjs';
import { Resource } from './resource.mjs';
import { TileData } from './tile_data.mjs';
import { Vector2i } from './vector2.mjs';

/**
* Represents a TileSetAtlasSource.
* @class TileSetAtlasSource
 * @property {TileLayout} margins - 
 * @property {TileOffsetAxis} separation - 
 * @property {Texture2D} texture - 
 * @property {Vector2i} textureRegionSize - 
 * @property {boolean} useTexturePadding - 
 * @property {TileData[]} tileDataList - 
*/
export class TileSetAtlasSource extends Resource {
  constructor({
    margins = new Vector2i({x: 0, y: 0}),
    separation = new Vector2i({x: 0, y: 0}),
    texture = null,
    textureRegionSize = new Vector2i({x: 16, y: 16}),
    useTexturePadding = true,
    resource = {
      type: "TileSetAtlasSource",
    },
  } = {}) {
    super(resource);
    this.margins = margins;
    this.separation = separation;
    this.texture = texture;
    this.textureRegionSize = textureRegionSize;
    this.useTexturePadding = useTexturePadding;
    /** @type {TileData[]} */
    this.tileDataList = [];
    this.type = "TileSetAtlasSource";
  }

  /**
   * @param {TileData} tileData 
   */
  addTile(tileData) {
    this.tileDataList.push(tileData);
  }

  getProperties() {
    var properties = super.getProperties();

    properties.margins = checkDefault(this.margins, new Vector2i({ x: 0, y: 0 }));
    properties.separation = checkDefault(this.separation, new Vector2i({ x: 0, y: 0 }));
    properties.texture = `ExtResource("${this.texture.id}")`;
    properties.texture_region_size = checkDefault(this.textureRegionSize, new Vector2i({ x: 16, y: 16 }));
    properties.use_texture_padding = checkDefault(this.useTexturePadding, true);

    this.tileDataList.forEach((tileData, i) => {
      const tileKey = tileData.getKey();

      properties[tileKey] = 0;

      tileData.physicsDataList.forEach((physicsData, i) => {
        const physicsDataKey = `${tileKey}/physics_layer_${physicsData.id}`;

        properties[`${physicsDataKey}/angular_velocity`] = physicsData.angularVelocity;
        properties[`${physicsDataKey}/linear_velocity`] = physicsData.linearVelocity.toString();

        physicsData.polygonList.forEach((polygon, j) => {
          const polygonKey = `${physicsDataKey}/polygon_${j}`;
          properties[`${polygonKey}/points`] = `PackedVector2Array(${polygon.getPointList()})`;
        });
      });
    });

    return properties;
  }
}
