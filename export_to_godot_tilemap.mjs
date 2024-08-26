import { resolvePath, getUID, getFileName, getResPath, convertNodeToString, splitCommaSeparatedString, getTilesetColumns, getAreaCenter, getRotation, validateNumber, validateBool, validateVector2, roundToDecimals } from './utils.mjs';
import { Area2D } from './models/area_2d.mjs';
import { CircleShape2D } from './models/circle_shape_2d.mjs';
import { CollisionPolygon2D } from './models/collision_polygon_2d.mjs';
import { CollisionShape2D } from './models/collision_shape_2d.mjs';
import { ExternalResource } from './models/external_resource.mjs';
import { ExternalResourceType } from './enums/external_resource_type.mjs';
import { MapObjectShape } from './enums/map_object_shape.mjs';
import { Node as GDNode } from './models/node.mjs';
import { Node2D } from './models/node_2d.mjs';
import { PolygonBuildMode } from './enums/polygon_build_mode.mjs';
import { Scene } from './models/scene.mjs';
import { Sprite2D } from './models/sprite_2d.mjs';
import { RectangleShape2D } from './models/rectangle_shape_2d.mjs';
import { TileMapLayer } from './models/tile_map_layer.mjs';
import { Vector2 } from './models/vector2.mjs';

// /**
//   * @class LayerData
//   * @property {string} name
//   * @property {Tileset} tileset
//   * @property {number?} tilesetID
//   * @property {number} tilesetColumns
//   * @property {Layer} layer
//   * @property {boolean} isEmpty
//   * @property {string} packedByteArrayString
//   * @property {string} parent
//   */
// class LayerData { }

/**
 * @class GodotTilemapExporter
 * @property {TileMap} map - 
 * @property {string} fileName 
 * @property {Vector2} scale - The scale of the node in 2D space.
 * @property {number} skew - The skew of the node.
 */
class GodotTilemapExporter {
  /**
   * Constructs a new instance of the tilemap exporter
   * @param {TileMap} map the tilemap to export
   * @param {string} fileName path of the file the tilemap should be exported to
   */
  constructor(map, fileName) {
    this.map = map;
    this.fileName = fileName;
    this.externalResourceID = 0;

    const name = this.map.property("godot:name") || getFileName(this.fileName);
    const rootNode = new GDNode({
      name,
    });

    this.scene = new Scene({
      rootNode,
    });

    /**
     * Tiled doesn't have tileset ID so we create a map
     * Tileset name to generated tilesetId.
     */
    this.tilesetIndexMap = new Map();

    /**
     * Godot TileMapLayer has only one Tileset.
     * Each layer is Tilemap and is mapped to a single Tileset.
     * !!! Important !!
     * Do not add tiles from different tilesets in single layer.
     */
    this.layersToTilesetIndex = new Map();
  };

  write() {
    this.determineTilesets();
    this.determineNodes();
    this.saveToFile();

    tiled.log(`Map exported successfully to ${this.fileName}`);
  }

  /**
   * Generate a string with all tilesets in the map.
   * Godot supports several image textures per tileset but Tiled Editor doesn't.
   * Tiled editor supports only one tile sprite image per tileset.
   */
  determineTilesets() {
    for (const tileset of this.map.tilesets) {
      this.tilesetIndexMap.set(tileset.name, this.externalResourceID);
      
      // let tilesetPath = getResPath(tileset.property("godot:projectRoot"), tileset.property("godot:relativePath"), tileset.asset.fileName.replace('.tsx', '.tres'));
      const tilesetPath = tileset.property("godot:resPath");

      const externalResource = this.registerExternalResource(ExternalResourceType.TileSet, tilesetPath);

      if (externalResource == null) {
        continue;
      }

      this.scene.externalResourceList.push(externalResource);
    }
  }

  /**
   * Creates the Tilemap nodes. One Tilemap per one layer from Tiled.
   */
  determineNodes() {
    const isIsometric = this.map.orientation === TileMap.Isometric;
    const mode = isIsometric ? 1 : undefined;
    
    for (const layer of this.map.layers) {
      this.handleLayer(layer, mode, this.scene.rootNode);
    }
  }

  /**
   * Handle exporting a single layer.
   * @param {Layer} layer - The target layer.
   * @param {number} mode - The layer mode.
   * @param {GDNode} owner - The owner node.
   */
  handleLayer(layer, mode, owner) {
    const groups = splitCommaSeparatedString(layer.property("godot:groups"));

    if (layer.isTileLayer) {
      this.handleTileLayer(layer, mode, groups, owner);
      return;
    }
    if (layer.isObjectLayer) {
      this.handleObjectGroup(layer, groups, owner);
      return;
    }
    if (layer.isGroupLayer) {
      this.handleGroupLayer(layer, mode, groups, owner);
    }
  }

  /**
   * Handle exporting a tile layer.
   * @param {TileLayer} tileLayer - The target layer.
   * @param {string[]} groups - The groups this layer is part of.
   * @param {GDNode} owner - The owner node.
   */
  handleTileLayer(tileLayer, groups, owner) {
    const layerDataList = this.getLayerDataList(tileLayer);

    for (const layerData of layerDataList) {
      if (layerData.isEmpty) continue;

      this.mapLayerToTileset(layerData);

      //! const tilemapLayerNode = this.getTileMapLayerTemplate(layerData, tileLayer, parentLayerPath, groups);
      //! this.scene.nodeListString.push(tilemapLayerNode);

      const node = new GDNode({
        name: tileLayer.name,
        owner,
        groups,
      });
      this.scene.nodeList.push(node);
    }
  }

  /**
   * Handle exporting an object group.
   * @param {ObjectGroup} objectGroup - The target layer.
   * @param {string[]} groups - The groups this layer is part of.
   * @param {GDNode} owner - The owner node.
   */
  handleObjectGroup(objectGroup, groups, owner) {
    const node = new GDNode({
      name: objectGroup.name,
      owner,
      groups,
    });
    this.scene.nodeList.push(node);

    for (const mapObject of objectGroup.objects) {
      const mapObjectGroups = splitCommaSeparatedString(mapObject.property("godot:groups"));
      
      if (mapObject.tile) {
        this.generateTileNode(mapObject, mapObjectGroups, node);
        continue;
      }

      this.generateNode(mapObject, mapObjectGroups, node);
    }
  }

  /**
   * Handle exporting a group layer.
   * @param {GroupLayer} groupLayer - The target layer.
   * @param {string[]} groups - The groups this layer is part of.
   * @param {GDNode} owner - The owner node.
   */
  handleGroupLayer(groupLayer, mode, groups, owner) {
    const node = new GDNode({
      name: groupLayer.name,
      owner,
      groups,
    });
    this.scene.nodeList.push(node);

    for (const layer of groupLayer.layers) {
      this.handleLayer(layer, mode, node);
    }
  }

  /**
   * Generates a Tile node.
   * @param {MapObject} mapObject - An object that can be part of an ObjectGroup.
   * @param {GDNode} owner - The owner node.
   */
  generateTileNode(mapObject, groups, owner) {
    const tilesetsIndexKey = `${mapObject.tile.tileset.name}_Image`;
    let textureResourceID = 0;

    if (!this.tilesetIndexMap.get(tilesetsIndexKey)) {
      textureResourceID = this.externalResourceID;
      this.tilesetIndexMap.set(tilesetsIndexKey, this.externalResourceID);

      const tilesetPath = getResPath(
        this.map.property("godot:projectRoot"),
        this.map.property("godot:relativePath"),
        mapObject.tile.tileset.imageFileName,
      );

      const externalResource = this.registerExternalResource(ExternalResourceType.Texture, tilesetPath);

      if (externalResource == null) {
        return;
      }

      this.scene.externalResourceList.push(externalResource);
    } else {
      textureResourceID = this.tilesetIndexMap.get(tilesetsIndexKey);
    }

    const tileOffset = this.getTileOffset(mapObject.tile.tileset, mapObject.tile.id);

    // Converts Tiled pivot (top left corner) to Godot pivot (center);
    const mapObjectPosition = new Vector2({
      x: mapObject.x + (mapObject.tile.width / 2),
      y: mapObject.y - (mapObject.tile.height / 2),
    });

    const node = new Sprite2D({
      texture: `ExtResource("${textureResourceID}")`,
      region_enabled: true,
      region_rect: `Rect2(${tileOffset.x}, ${tileOffset.y}, ${mapObject.tile.width}, ${mapObject.tile.height})`,
      collisionObject2D: {
        node2D: {
          position: mapObjectPosition,
          canvasItem: {
            node: {
              name: mapObject.name,
              owner,
              groups,
            },
          },
        },
      },
    });
    this.scene.nodeList.push(node);
  }

  /**
   * Generates a node.
   * @param {MapObject} mapObject - An object that can be part of an ObjectGroup.
   * @param {Array<string>} groups - The groups this Node belongs to.
   * @param {GDNode} owner - The owner node.
   */
  generateNode(mapObject, groups, owner) {
    switch (mapObject.shape) {
      case MapObjectShape.Rectangle:
        this.generateRectangle(mapObject, groups, owner);
        break;
      case MapObjectShape.Polygon:
        this.generatePolygon(mapObject, groups, PolygonBuildMode.Polygon, owner);
        break;
      case MapObjectShape.Polyline:
        this.generatePolygon(mapObject, groups, PolygonBuildMode.Polyline, owner);
        break;
      case MapObjectShape.Ellipse:
        this.generateEllipse(mapObject, groups, owner);
        break;
      case MapObjectShape.Point:
        this.generatePoint(mapObject, groups, owner);
        break;
    }
  }

  /**
   * Generates a Area2D node with a rectangle shape.
   * @param {MapObject} mapObject - The object representing the Area2D.
   * @param {Array<string>} groups - The groups this Node belongs to.
   * @param {GDNode} owner - The owner node.
   */
  generateRectangle(mapObject, groups, owner) {
    const position = new Vector2({
      x: mapObject.x,
      y: mapObject.y,
    });
    const size = new Vector2({
      x: mapObject.width,
      y: mapObject.height,
    });
    
    const center = getAreaCenter(position, size, mapObject.rotation);

    const area2DNode = new Area2D({
      collision_layer: mapObject.property("godot:collision_layer"),
      collision_mask: mapObject.property("godot:collision_mask"),
      collisionObject2D: {
        node2D: {
          position: center,
          rotation: getRotation(mapObject.rotation),
          canvasItem: {
            node: {
              name: mapObject.name,
              owner,
              groups,
            },
          },
        },
      },
    });
    this.scene.nodeList.push(area2DNode);

    const rectangleShape = new RectangleShape2D({
      size: size,
    });

    this.scene.subResourceList.push(rectangleShape);

    const collisionShape2DNode = new CollisionShape2D({
      shape: rectangleShape,
      node2D: {
        canvasItem: {
          node: {
            owner: area2DNode,
            //! groups,
          },
        },
      },
    });
    this.scene.nodeList.push(collisionShape2DNode);
  }
  
  /**
   * Generates a Area2D node with a polygon shape.
   * @param {MapObject} mapObject - The object representing the Area2D.
   * @param {Array<string>} groups - The groups this Node belongs to.
   * @param {PolygonBuildMode} buildMode - Whether the mode of the polygon should be solid or just use lines for collision.
   * @param {GDNode} owner - The owner node.
   */
  generatePolygon(mapObject, groups, buildMode, owner) {
    const position = new Vector2({
      x: mapObject.x,
      y: mapObject.y,
    });
    const size = new Vector2({
      x: mapObject.width,
      y: mapObject.height,
    });

    const center = getAreaCenter(position, size, mapObject.rotation);

    const area2DNode = new Area2D({
      collision_layer: mapObject.property("godot:collision_layer"),
      collision_mask: mapObject.property("godot:collision_mask"),
      collisionObject2D: {
        node2D: {
          position: center,
          rotation: getRotation(mapObject.rotation),
          canvasItem: {
            node: {
              name: mapObject.name,
              owner,
              groups,
            },
          },
        },
      },
    });
    this.scene.nodeList.push(area2DNode);

    let polygonPoints = mapObject.polygon.map(point => `${point.x}, ${point.y}`).join(', ');

    const collisionPolygon2DNode = new CollisionPolygon2D({
      build_mode: validateNumber(buildMode),
      polygon: `PackedVector2Array(${polygonPoints})`,
      node2D: {
        canvasItem: {
          node: {
            owner: area2DNode,
            //! groups,
          },
        },
      },
    });
    this.scene.nodeList.push(collisionPolygon2DNode);
  }

  /**
   * Generates a Area2D node with a polyline shape.
   * @param {MapObject} mapObject - The object representing the Area2D.
   * @param {Array<string>} groups - The groups this Node belongs to.
   * @param {GDNode} owner - The owner node.
   */
  generateEllipse(mapObject, groups, owner) {
    const position = new Vector2({
      x: mapObject.x,
      y: mapObject.y,
    });
    const size = new Vector2({
      x: mapObject.width,
      y: mapObject.height,
    });
    const radius = mapObject.width / 2;
    
    const center = getAreaCenter(position, size, mapObject.rotation);

    const area2DNode = new Area2D({
      collision_layer: mapObject.property("godot:collision_layer"),
      collision_mask: mapObject.property("godot:collision_mask"),
      collisionObject2D: {
        node2D: {
          position: center,
          rotation: getRotation(mapObject.rotation),
          canvasItem: {
            node: {
              name: mapObject.name,
              owner,
              groups,
            },
          },
        },
      },
    });
    this.scene.nodeList.push(area2DNode);

    const circleShape = new CircleShape2D({
      radius: radius.toFixed(2).replace(/\.?0+$/, ""),
    });

    this.scene.subResourceList.push(circleShape);

    const collisionShape2DNode = new CollisionShape2D({
      shape: circleShape,
      node2D: {
        position: center,
        canvasItem: {
          node: {
            owner: area2DNode,
            //! groups,
          },
        },
      },
    });
    this.scene.nodeList.push(collisionShape2DNode);
  }

  /**
   * Generates a Point.
   * @param {MapObject} mapObject - The object representing the Node2D.
   * @param {Array<string>} groups - The groups this Node belongs to.
   * @param {GDNode} owner - The owner node.
   */
  generatePoint(mapObject, groups, owner) {
    const name = mapObject.name || "Point";
    const position = new Vector2({
      x: roundToDecimals(mapObject.x),
      y: roundToDecimals(mapObject.y),
    });

    const node = new Node2D({
      position: position,
      rotation: getRotation(mapObject.rotation),
      canvasItem: {
        node: {
          name,
          owner,
          groups,
        },
      },
    });
    this.scene.nodeList.push(node);
  }

  /**
   * Prepare properties for a Godot node.
   * @param {TiledObjectProperties} object_props - Properties from the layer.
   * @param {TiledObjectProperties} set_props - The base properties for the node.
   * @returns {TiledObjectProperties} - The merged property set for the node.
   */
  merge_properties(object_props, set_props) {
    // Create a map for processing properties efficiently
    const propertyMap = new Map();

    // Process each entry once
    for (const [key, value] of Object.entries(object_props)) {
      if (value === "") {
        continue;
      }

      // Determine the type of property based on the key prefix
      switch (true) {
        case key.startsWith("godot:node:"):
          propertyMap.set(key, { type: 'node', value: value });
          continue;
        case key.startsWith("godot:script"):
          propertyMap.set("godot:script", { type: 'script', value: value });
          continue;
        case key.startsWith("godot:resource:"):
          propertyMap.set(key, { type: 'resource', value: value });
          continue;
        case key.startsWith("godot:var:"):
          propertyMap.set(key, { type: 'var', value: value });
          continue;
        default:
          // Ignore unsupported or unknown keys
          break;
      }
    }

    // Handle node properties
    propertyMap.forEach((entry, key) => {
      if (entry.type === 'node') {
        set_props[key.substring("godot:node:".length)] = entry.value;
      }
    });

    // Handle tilemap properties
    if (set_props['layers'] !== undefined) {
      for (const [key, value] of Object.entries(set_props['layers'][0])) {
        set_props[`layer_0/${key}`] = value;
      }
    }

    // Handle script properties
    const scriptEntry = propertyMap.get("godot:script");
    if (scriptEntry) {
      const externalResource = this.registerExternalResource(ExternalResourceType.Script, scriptEntry.value);
      
      if (externalResource == null) {
        return;
      }

      set_props["script"] = `ExtResource("${externalResource.id}")`;

      this.scene.externalResourceList.push(externalResource);
    }

    // Handle other script variables
    propertyMap.forEach((entry, key) => {
      if (entry.type === 'var') {
        set_props[key.substring("godot:var:".length)] = entry.value;
      }
    });
    
    // Handle resource properties
    propertyMap.forEach((entry, key) => {
      if (entry.type === 'resource') {
        if (entry.value == undefined || entry.value == "") {
          tiled.log("ops");
        }
        const externalResource = this.registerExternalResource(ExternalResourceType.Resource, entry.value);
        
        if (externalResource == null) {
          return;
        }

        set_props[key.substring("godot:resource:".length)] = `ExtResource("${externalResource.id}")`;

        this.scene.externalResourceList.push(externalResource);
      }
    });

    set_props['layers'] = undefined;

    return set_props;
  }

  /**
   * Prepare the meta properties for a Godot node
   * @param {TiledObjectProperties} object_props
   * @returns {object} the meta properties
   */
  meta_properties(object_props) {
    let results = {};

    for (const [key, value] of Object.entries(object_props)) {
      if(key.startsWith("godot:meta:")) {
        results[key.substring(11)] = value;
      }
    }

    return results;
  }

  /**
   * Creates all the tiles coordinates for a layer.
   * Each element in the retuned array corresponds to the tile coordinates for each of
   * the tilesets used in the layer.
   * @param {TileLayer} layer the target layer
   * @returns {LayerData[]} the data about the tilesets used in the target layer
   */
  getLayerDataList(layer) {
    if (layer.name != "Tile Layer 9")
      return [];
    let layerBounds = layer.region().boundingRect;

    const layerDataList = [];
    
    for (let y = layerBounds.top; y <= layerBounds.bottom; ++y) {
      for (let x = layerBounds.left; x <= layerBounds.right; ++x) {
        let cell = layer.cellAt(x, y);
        
        if (cell.empty) continue;

        const tile = layer.tileAt(x, y);

        // Determine whether this tile's tileset is already registered;
        let layerData = layerDataList.find(layer => layer.tileset === tile.tileset);
        const isTilesetRegistered = layerData !== undefined;

        if (!isTilesetRegistered) {
          const var1 = 0;
          const var2 = 0;

          layerData = {
            name: layer.name || `Layer ${layer.id}`,
            tileset: tile.tileset,
            tilesetID: null,
            tilesetColumns: getTilesetColumns(tile.tileset),
            packedByteArrayString: `${var1}, ${var2}, `,
            empty: true,
            parent: layerDataList.length === 0 ? "." : layer.name,
          };

          layerDataList.push(layerData);
        }

        const sourceID = 0;
        const tileAtlasX = tile.imageRect.x / tile.tileset.tileWidth;
        const tileAtlasY = tile.imageRect.y / tile.tileset.tileHeight;
        const alternativeTileID = 0;
        const tileFlipFlag = 0;

        layerData.packedByteArrayString += `${x}, ${0}, ${y}, ${0}, ` +
                                           `${sourceID}, ${0}, ` +
                                           `${tileAtlasX}, ${0}, ${tileAtlasY}, ${0}, ` +
                                           `${alternativeTileID}, ${tileFlipFlag}, `;
      }
    }

    // Remove trailing commas and blank
    layerDataList.forEach(layerData => {
      layerData.packedByteArrayString = layerData.packedByteArrayString.replace(/,\s*$/, "");
    });
    
    for (const layerData of layerDataList) {
      if (layerData.tileset === null || layerData.packedByteArrayString === "") {
        tiled.log(`Error: The layer ${layer.name} is empty and has been skipped!`);
        continue;
      }

      layerData.tilesetID = this.getTilesetIDByTileset(layerData.tileset);
    }

    return layerDataList;
  }

  /**
   * Find the id of a tileset by its name
   * @param {Tileset} tileset The tileset to find the id of
   * @returns {string|undefined} the id of the tileset if found, undefined otherwise
   */
  getTilesetIDByTileset(tileset) {
    return this.tilesetIndexMap.get(tileset.name);
  }

  /**
   * Calculate the X and Y offset (in pixels) for the specified tile
   * ID within the specified tileset image.
   *
   * @param {Tileset} tileset - The full Tileset object
   * @param {int} tileId - Id for the tile to extract offset for
   * @returns {object} - An object with pixel offset in the format {x: int, y: int}
   */
  getTileOffset(tileset, tileId) {
    const columnCount = getTilesetColumns(tileset);
    const row = Math.floor(tileId / columnCount);
    const col = tileId % columnCount;
    const xOffset = tileset.margin + (tileset.tileSpacing * col);
    const yOffset = tileset.margin + (tileset.tileSpacing * row);

    return {
      x: (col * tileset.tileWidth) + xOffset,
      y: (row * tileset.tileHeight) + yOffset,
    };
  }

  saveToFile() {
    const file = new TextFile(this.fileName, TextFile.WriteOnly);

    const serializedScene = this.scene.serializeToGodot(this.map);

    file.write(serializedScene);
    file.commit();
  }

  /**
   * Register an external resource.
   * 
   * @param {ExternalResourceType} type - The type of subresource.
   * @param {string} filePath - Path of the external resource file relative to the project.
   * @returns {ExternalResource} - The created external resource.
   */
  registerExternalResource(type, filePath) {
    if (typeof type !== 'string') {
      throw new TypeError('type must be a string');
    }

    // Strip leading slashes to prevent invalid triple slashes in Godot res:// path:
    filePath = filePath.replace(/^\/+/, '');
    const absolutePath = resolvePath(filePath);

    if (!File.exists(absolutePath)) {
      // TODO Create function to export tileset;
      // this.createExternalResource();
      return null;
    }

    const uid = getUID(absolutePath);

    const externalResource = new ExternalResource({
      type,
      path: filePath,
      id: this.externalResourceID,
      uid,
    });

    this.externalResourceID += 1;

    return externalResource;
  }

  /**
   * Template for a TileMapLayer node
   * @param {LayerData} layerData
   * @param {Layer} layer
   * @param {string} parent
   * @param {Array<string>} groups - The groups this Node belongs to.
   * @returns {string}
   */
  getTileMapLayerTemplate(layerData, layer, parent = ".", groups) {
    return convertNodeToString(
      {
        name: layerData.name,
        type: "TileMapLayer",
        // parent: parent,
        // groups: groups,
      }, 
      this.merge_properties(
        layer.properties(),
        {
          use_parent_material: true,
          tile_map_data: `PackedByteArray(${layerData.packedByteArrayString})`,
          tile_set: `ExtResource("${layerData.tilesetID}")`,
        }
      ),
      this.meta_properties(layer.properties()),
    );
  }

  mapLayerToTileset(layerData) {
    this.layersToTilesetIndex[layerData.name] = layerData.tilesetID;
  }
}

const FlippedState = Object.freeze({
  FlippedH: 1 << 12,
  FlippedV: 2 << 13,
  Transposed: 4 << 14
});

const customTileMapFormat = {
  name: "Godot 4 Tilemap format",
  extension: "tscn",

  /**
   * Map exporter function
   * @param {TileMap} map the map to export
   * @param {string} fileName path of the file where to export the map
   * @returns {undefined}
   */
  write: function (map, fileName) {
    const exporter = new GodotTilemapExporter(map, fileName);
    exporter.write();
    return undefined;
  }
};

// noinspection JSUnresolvedFunction
tiled.registerMapFormat("Godot", customTileMapFormat);
