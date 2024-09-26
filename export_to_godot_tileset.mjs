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
      margins: new Vector2i(tileset.margin, tileset.margin),
      separation: new Vector2i(
        tileset.tileSpacing,
        tileset.tileSpacing,
      ),
      texture,
      textureRegionSize: new Vector2i(
        tileset.tileWidth,
        tileset.tileHeight,
      ),
      useTexturePadding: tileset.property(`${prefix}use_texture_padding`),
    });

    const tilesetProperties = Object.entries(tileset.resolvedProperties());
    const physicsLayerList = tilesetProperties
      .filter(([_, { typeName, value }]) => typeName == physicsLayerTypeName && value)
      .map(([_, { value }]) => new PhysicsLayer({
        collisionLayer: value.collision_layer,
        collisionMask: value.collision_mask,
        id: value.id,
      }));
    const customDataLayerList = tilesetProperties
      .filter(([_, { typeName, value }]) => typeName == customDataLayerTypeName && value)
      .map(([_, { value }]) => new CustomDataLayer({
        name: value.name,
        type: value.type,
      }));

    /** @type {number[]} - The list of tile IDs that are animated. */
    const animated_tile_id_list = [];

    for (const tile of this.tileset.tiles) {
      if (isTileUnused(tile)) continue;

      //* Implementing animation
      if (animated_tile_id_list.find((tile_id) => tile_id == tile.id)) {
        continue;
      }

      const is_tile_animated = tile.animated;

      if (is_tile_animated) {
        const tile_frames = tile.frames;

        const first_frame_tile_id = tile_frames[0].tileId;

        if (first_frame_tile_id != tile.id) {
          tiled.log(`Tile ${tile.id} has an animation, but the tile must be the first frame. Skipping.`);
          continue;
        }

        let is_valid = true;
        const frame_count = tile_frames.length;

        if (frame_count > 1) {
          const expected_difference = tile_frames[1].tileId - tile_frames[0].tileId;
          
          for (let i = 1; i < frame_count - 1; i++) {
            const current_difference = tile_frames[i + 1].tileId - tile_frames[i].tileId;
        
            if (current_difference !== expected_difference) {
              is_valid = false;
              tiled.log(`Invalid animation sequence: inconsistent frame at tile ${tile_frames[i + 1].tileId}`);
              break;
            }
          }
        }

        if (!is_valid) {
          continue;
        }

        tiled.log(`Tile ${tile.id} has an animation, adding frames:`);
        for (const frame of tile_frames) {
          tiled.log(`${frame.tileId}`);
          animated_tile_id_list.push(frame.tileId);
        }
        
        const frame = JSON.stringify(tile_frames[0]);
      }

      const physicsDataList = this.setupTilePhysicsDataList(tile, physicsLayerList);
      const customDataList = this.setupTileCustomDataList(tile, customDataLayerList);

      const gdTile = new TileData({
        position: new Vector2i(
          tile.id % this.tileset.columnCount,
          Math.floor(tile.id / this.tileset.columnCount),
        ),
        physicsDataList,
        customDataList,
      });

      tilesetSource.addTile(gdTile);
    }
    //* Ending implementing animation

    const tileLayout = tileset.orientation === Tileset.Isometric ? TileLayout.DiamondDown : TileLayout.Stacked;
    const tileShape = tileset.orientation === Tileset.Isometric ? TileShape.Isometric : TileShape.Square;

    this.gdTileset = new GDTileset({
      tileLayout,
      tileOffsetAxis: tileset.property(`${prefix}tile_offset_axis`),
      tileShape,
      tileSize: new Vector2i(
        tileset.tileSize.width,
        tileset.tileSize.height,
      ),
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
    const tileProperties = Object.entries(tile.resolvedProperties());

    if (tileProperties.length === 0) {
      return [];
    }

    const physicsDataList = tileProperties
      .filter(([_, { typeName, value: physicsData }]) => {
        const isPhysicsData = typeName === "PhysicsData";

        if (!isPhysicsData) {
          return false;
        }

        if (!physicsData) {
          return false;
        }

        const isPhysicsIDRegistered = physicsLayerList.some(
          (layer) => {
            return layer.id === physicsData.id;
          }
        );

        if (!isPhysicsIDRegistered) {
          tiled.log(`Tile ${tile.id} has a layer with ID ${physicsData.id}. Add a collision layer with this ID in order to export it.`);
        }

        return isPhysicsIDRegistered;
      })
      .map(([_, { value: physicsData }]) => this.createPhysicsDataForTile(tile, physicsData, physicsLayerList));

    return physicsDataList;
  }

  /**
   * 
   * @param {Tile} tile - 
   * @param {PhysicsData} physicsData - 
   * @param {PhysicsLayer[]} physicsLayerList - 
   */
  createPhysicsDataForTile(tile, physicsData = {}, physicsLayerList) {
    const objectGroup = tile.objectGroup;
    /** @type {Polygon[]} */
    let polygonList = [];
    /** @type {number} */
    const layerID = physicsData.id?.value || 0;

    if (objectGroup) {
      const center = new Vector2(
        tile.width / 2,
        tile.height / 2,
      );

      for (const tiledObject of objectGroup.objects) {
        const shape = tiledObject.shape;

        if (shape != MapObject.Rectangle && shape != MapObject.Polygon) {
          tiled.warn("Godot exporter only supports collisions that are rectangles or polygons.");
          continue;
        }

        /** @type {number} */
        const polygonLayerID = tiledObject.resolvedProperty("physics_layer_id")?.value || 0;

        if (polygonLayerID != layerID) continue;

        /** @type {number[]} */
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

        /** @type {bool} */
        const oneWay = tiledObject.resolvedProperty("one_way");

        const polygon = new Polygon({
          pointList,
          oneWay,
        });
        polygonList.push(polygon);
      }
    }

    const angularVelocity = physicsData.angular_velocity || 0;

    const linearVelocity = new Vector2(
      physicsData.linear_velocity?.value?.x || 0,
      physicsData.linear_velocity?.value?.y || 0,
    );


    const id = physicsLayerList.findIndex((physicsLayer) => {
      return physicsLayer.id.value == layerID;
    }) || 0;

    return new PhysicsData({
      angularVelocity,
      linearVelocity,
      polygonList,
      id,
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
