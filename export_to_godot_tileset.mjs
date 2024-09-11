import { getResPath, isTileUnused } from './utils.mjs';
import { prefix, physicsLayerTypeName, customDataLayerTypeName } from './constants.mjs';
import { Texture2D } from './models/texture_2d.mjs';
import { TileData } from './models/tile_data.mjs';
import { TileLayout } from './enums/tile_layout.mjs';
import { GDTileset } from './models/tileset.mjs';
import { TileSetAtlasSource } from './models/tileset_atlas_source.mjs';
import { TileShape } from './enums/tile_shape.mjs';
import { Vector2, Vector2i } from './models/vector2.mjs';
import { PhysicsData } from './models/physics_data.mjs';
import { PhysicsLayer } from './models/physics_layer.mjs';
import { CustomDataLayer } from './models/custom_data_layer.mjs';
import { PhysicsData } from './models/physics_data.mjs';
import { Polygon } from './models/polygon.mjs';

/**
 * @class GodotTilesetExporter
 */
class GodotTilesetExporter {
  /**
   * Constructs a new instance of the tileset exporter
   * @param {Tileset} [tileset] - The tileset to export.
   * @param {string} [fileName] - Path of the file the tileset should be exported to.
   */
  constructor(tileset, fileName) {
    /** @type {Tileset} - The tileset to export. */
    this.tileset = tileset;
    /** @type {string} - Path of the file the tileset should be exported to. */
    this.fileName = fileName;
  };

  write() {
    this.prepareTileset();
    this.saveToFile();

    tiled.log(`Tileset exported successfully to ${this.fileName}`);
  }

  prepareTileset() {
    const tileset = this.tileset;
    const texture = new Texture2D();
    const textureResourcePath = getResPath(tileset.property(`${prefix}project_root`), tileset.property(`${prefix}relative_path`), tileset.imageFileName);
    texture.path = textureResourcePath;

    const tilesetSource = new TileSetAtlasSource({
      margins: new Vector2i({ x: tileset.margin, y: tileset.margin }),
      separation: new Vector2i({
        x: tileset.tileSpacing,
        y: tileset.tileSpacing,
      }),
      texture,
      textureRegionSize: new Vector2i({
        x: tileset.tileWidth,
        y: tileset.tileHeight,
      }),
      useTexturePadding: tileset.property(`${prefix}use_texture_padding`),
    });

    const resolvedProperties = Object.entries(tileset.resolvedProperties());
    const physicsLayerList = resolvedProperties
      .filter(([_, { typeName, value }]) => typeName == physicsLayerTypeName && value)
      .map(([_, { value }]) => new PhysicsLayer({
        collisionLayer: value.collision_layer,
        collisionMask: value.collision_mask,
        id: value.id,
      }));
    const customDataLayerList = resolvedProperties
      .filter(([_, { typeName, value }]) => typeName == customDataLayerTypeName && value)
      .map(([_, { value }]) => new CustomDataLayer({
        name: value.name,
        type: value.type,
      }));

    for (const tile of this.tileset.tiles) {
      if (isTileUnused(tile)) continue;

      //TODO Ignore animated tiles frames that are not the first frame

      const physicsDataList = this.setupTilePhysicsDataList(tile, physicsLayerList);
      const customDataList = this.setupTileCustomDataList(tile, customDataLayerList);

      const gdTile = new TileData({
        position: new Vector2i({
          x: tile.id % this.tileset.columnCount,
          y: Math.floor(tile.id / this.tileset.columnCount),
        }),
        physicsDataList,
        customDataList,
      });

      tilesetSource.addTile(gdTile);
    }

    const tileLayout = tileset.orientation === Tileset.Isometric ? TileLayout.DiamondDown : TileLayout.Stacked;
    const tileShape = tileset.orientation === Tileset.Isometric ? TileShape.Isometric : TileShape.Square;

    this.gdTileset = new GDTileset({
      tileLayout,
      tileOffsetAxis: tileset.property(`${prefix}tile_offset_axis`),
      tileShape,
      tileSize: new Vector2i({
        x: tileset.tileSize.width,
        y: tileset.tileSize.height,
      }),
      tilesetSource,
      physicsLayerList,
      customDataLayerList,
    });
  }

  /**
   * 
   * @param {Tile} tile - 
   * @param {PhysicsLayer[]} physicsLayerList - 
   */
  setupTilePhysicsDataList(tile, physicsLayerList) {
    const resolvedProperties = Object.entries(tile.resolvedProperties());

    if (resolvedProperties.length === 0) {
      const physicsData = this.createPhysicsDataForTile(tile, physicsLayerList);
      return [physicsData];
    }

    const physicsDataList = resolvedProperties
      .filter(([_, { typeName, value: physicsData }]) => {
        const hasPhysicsData = typeName === "PhysicsData";

        if (!hasPhysicsData) {
          return true;
        }

        const hasMatchingId = physicsData && physicsLayerList.some(
          (layer) => layer.id === physicsData.id
        );

        return hasPhysicsData && hasMatchingId;
      })
      .map(([_, { value: physicsData }]) => this.createPhysicsDataForTile(tile, physicsData));
    
    return physicsDataList;
  }

  /**
   * 
   * @param {Tile} tile - 
   * @param {PhysicsLayer[]} physicsData - 
   */
  createPhysicsDataForTile(tile, physicsData = {}) {
    const objectGroup = tile.objectGroup;
    let polygonList = [];
    const layerID = physicsData.id?.value || 0;

    if (objectGroup) {
      const center = new Vector2({
        x: tile.width / 2,
        y: tile.height / 2,
      });

      for (const tiledObject of objectGroup.objects) {
        const shape = tiledObject.shape;

        if (shape != MapObject.Rectangle && shape != MapObject.Polygon) {
          tiled.warn("Godot exporter only supports collisions that are rectangles or polygons.");
          continue;
        }

        const polygonLayerID = tiledObject.resolvedProperty("physics_layer_id")?.value || 0;

        if (polygonLayerID != layerID) continue;

        let pointList = [];

        switch (shape) {
          case MapObject.Rectangle:
            const rect = {
              topLeft: {
                x: tiledObject.x - center.x,
                y: tiledObject.y - center.y,
              },
              botomRight: {
                x: tiledObject.x + tiledObject.width - center.x,
                y: tiledObject.y + tiledObject.height - center.y,
              },
            };

            pointList.push(rect.topLeft.x, rect.topLeft.y, rect.botomRight.x, rect.topLeft.y, rect.botomRight.x, rect.botomRight.y, rect.topLeft.x, rect.botomRight.y);
            break;
          case MapObject.Polygon:
            for (const polygonPoint of tiledObject.polygon) {
              const point = {
                x: tiledObject.x + polygonPoint.x - center.x,
                y: tiledObject.y + polygonPoint.y - center.y,
              }

              pointList.push(point.x, point.y);
            }
            break;
          default:
            break;
        }

        const polygon = new Polygon({ pointList });
        polygonList.push(polygon);
      }
    }

    const angularVelocity = physicsData.angular_velocity || 0;

    const linearVelocity = new Vector2({
      x: physicsData.linear_velocity?.value?.x || 0,
      y: physicsData.linear_velocity?.value?.y || 0,
    });

    return new PhysicsData({
      angularVelocity,
      linearVelocity,
      polygonList,
      id: layerID,
    });
  }

  /**
   * 
   * @param {Tile} tile - 
   * @param {CustomDataLayer[]} customDataLayerList - 
   */
  setupTileCustomDataList(tile, customDataLayerList) {
    //! const propertyMap = propertiesToMap(properties);
    //! if (propertyMap.size != 0) {
    //!   for (const [key, value] of propertyMap) {
    //!     if (!customDataLayerList.has(key)) {
    //!       customDataLayerList.set(key, {})
    //!     }
    //!     tilesetString += `${tileName}/custom_data_${key} = ${value}\n`;
    //!   }
    //! }
    return [];
  }

  saveToFile() {
    const file = new TextFile(this.fileName, TextFile.WriteOnly);

    const serializedTileSet = this.gdTileset.serializeToGodot();

    file.write(serializedTileSet);
    file.commit();
  }
}

const customTilesetFormat = {
  name: "Godot Tileset format",
  extension: "tres",

  /**
   * Tileset exporter function
   * @param {Tileset} tileset the tileset to export
   * @param {string} fileName path of the file where to export the tileset
   * @returns {undefined}
   */
  write: function (tileset, fileName) {
    const exporter = new GodotTilesetExporter(tileset, fileName);
    exporter.write();

    return undefined;
  }
};

tiled.registerTilesetFormat("Godot", customTilesetFormat);
