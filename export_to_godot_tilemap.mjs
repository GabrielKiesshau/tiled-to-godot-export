import { getFileName, getResPath, splitCommaSeparatedString, getTilesetColumns, getAreaCenter, getRotation, roundToDecimals } from './utils.mjs';
import { prefix } from './constants.mjs';
import { Area2D } from './models/area_2d.mjs';
import { CircleShape2D } from './models/circle_shape_2d.mjs';
import { CollisionPolygon2D } from './models/collision_polygon_2d.mjs';
import { CollisionShape2D } from './models/collision_shape_2d.mjs';
import { Resource } from './models/resource.mjs';
import { MapObjectShape } from './enums/map_object_shape.mjs';
import { Node as GDNode } from './models/node.mjs';
import { Node2D } from './models/node_2d.mjs';
import { PackedByteArray } from './models/packed_byte_array.mjs';
import { PackedVector2Array } from './models/packed_vector2_array.mjs';
import { PolygonBuildMode } from './enums/polygon_build_mode.mjs';
import { PackedScene } from './models/scene.mjs';
import { Script } from './models/script.mjs';
import { Sprite2D } from './models/sprite_2d.mjs';
import { RectangleShape2D } from './models/rectangle_shape_2d.mjs';
import { TileMapLayer } from './models/tile_map_layer.mjs';
import { GDTileset } from './models/tileset.mjs';
import { Vector2 } from './models/vector2.mjs';

/**
 * @class GodotTilemapExporter
 * @property {TileMap} map - The tilemap to export.
 * @property {string} fileName - Path of the file the tilemap should be exported to.
 */
class GodotTilemapExporter {
  /**
   * Constructs a new instance of the tilemap exporter.
   * @param {TileMap} [map] - The tilemap to export.
   * @param {string} [fileName] - Path of the file the tilemap should be exported to.
   */
  constructor(map, fileName) {
    this.map = map;
    this.fileName = fileName;

    const name = this.map.property(`${prefix}name`) || getFileName(this.fileName);
    const rootNode = new GDNode({
      name,
    });

    this.scene = new PackedScene({
      rootNode,
    });
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
    for (const tileset of this.map.usedTilesets()) {
      //! let path = getResPath(tileset.property(`${prefix}project_root`), tileset.property(`${prefix}relative_path`), tileset.asset.fileName.replace('.tsx', '.tres'));
      const path = tileset.property(`${prefix}res_path`);

      for (const resource of this.scene.externalResourceList) {
        if (resource.path == path) return;
      }

      const tilesetResource = new GDTileset({
        resource: {
          name: tileset.name,
          path,
        },
      });

      this.scene.addExternalResource(tilesetResource);
    }
  }

  /**
   * Creates the Tilemap nodes. One Tilemap per one layer from Tiled.
   */
  determineNodes() {
    for (const layer of this.map.layers) {
      this.handleLayer(layer, null);
    }
  }

  /**
   * Handle exporting a single layer.
   * @param {Layer} layer - The target layer.
   * @param {GDNode} owner - The owner node.
   */
  handleLayer(layer, owner) {
    const groups = splitCommaSeparatedString(layer.property(`${prefix}groups`));

    if (layer.isTileLayer) {
      this.handleTileLayer(layer, groups, owner);
      return;
    }
    if (layer.isObjectLayer) {
      this.handleObjectGroup(layer, groups, owner);
      return;
    }
    if (layer.isGroupLayer) {
      this.handleGroupLayer(layer, groups, owner);
    }
  }

  /**
   * Handle exporting a tile layer.
   * @param {TileLayer} tileLayer - The target layer.
   * @param {string[]} groups - The groups this layer is part of.
   * @param {GDNode} owner - The owner node.
   */
  handleTileLayer(tileLayer, groups, owner) {
    // const isIsometric = this.map.orientation === TileMap.Isometric;
    // const mode = isIsometric ? 1 : undefined;

    const layerBounds = tileLayer.region().boundingRect;
    const tilemapDataMap = new Map();

    //* Iterate over each cell in the layer's bounding rectangle
    for (let y = layerBounds.top; y <= layerBounds.bottom; ++y) {
      for (let x = layerBounds.left; x <= layerBounds.right; ++x) {
        const cell = tileLayer.cellAt(x, y);
        if (cell.empty) continue;

        const tile = tileLayer.tileAt(x, y);
        const tilesetName = tile.tileset.name;

        //* Initialize tilemapData if not already done
        let tilemapData = tilemapDataMap.get(tilesetName) || [0, 0];
        tilemapDataMap.set(tilesetName, tilemapData);

        //* Push tile data to the tilemapData array
        this.addTileData(tilemapData, tile, x, y);
      }
    }

    //* Create TileMapLayer nodes for each tileset and add them to the scene
    for (const [tilesetName, tilemapData] of tilemapDataMap) {
      this.createTileMapLayerNode(tileLayer, tilesetName, tilemapData, groups, owner);
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
      const mapObjectGroups = splitCommaSeparatedString(mapObject.property(`${prefix}groups`));
      
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
  handleGroupLayer(groupLayer, groups, owner) {
    const node = new GDNode({
      name: groupLayer.name,
      owner,
      groups,
    });
    this.scene.nodeList.push(node);

    for (const layer of groupLayer.layers) {
      this.handleLayer(layer, node);
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

    //TODO
    // if (!this.tilesetIndexMap.get(tilesetsIndexKey)) {
    //   textureResourceID = this.externalResourceID;
    //   this.tilesetIndexMap.set(tilesetsIndexKey, this.externalResourceID);

    //   const tilesetPath = getResPath(
    //     this.map.property(`${prefix}project_root`),
    //     this.map.property(`${prefix}relative_path`),
    //     mapObject.tile.tileset.imageFileName,
    //   );

    //   const texture = new Texture({
    //     path: tilesetPath,
    //   });

    //   if (texture == null) {
    //     return;
    //   }

    //   this.scene.addExternalResource(texture);
    // } else {
    //   textureResourceID = this.tilesetIndexMap.get(tilesetsIndexKey);
    // }

    const tileOffset = this.getTileOffset(mapObject.tile.tileset, mapObject.tile.id);

    //* Converts Tiled pivot (top left corner) to Godot pivot (center);
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

    const scriptPath = mapObject.property(`${prefix}script`);
    let script = null;

    if (scriptPath) {
      const scriptPropertyMap = this.resolveScriptProperties(mapObject);
      script = this.registerScript(scriptPath, scriptPropertyMap);
    }

    const area2DNode = new Area2D({
      collisionObject2D: {
        collisionLayer: mapObject.property(`${prefix}collision_layer`),
        collisionMask: mapObject.property(`${prefix}collision_mask`),
        node2D: {
          position: center,
          rotation: getRotation(mapObject.rotation),
          canvasItem: {
            node: {
              name: mapObject.name,
              owner,
              groups,
              script,
            },
          },
        },
      },
    });
    this.scene.nodeList.push(area2DNode);

    const rectangleShape = new RectangleShape2D({
      size: size,
    });

    this.scene.addSubResource(rectangleShape);

    const shapeGroupList = splitCommaSeparatedString(mapObject.property(`${prefix}shape_groups`));

    const collisionShape2DNode = new CollisionShape2D({
      shape: rectangleShape,
      node2D: {
        canvasItem: {
          node: {
            owner: area2DNode,
            groups: shapeGroupList,
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

    const scriptPath = mapObject.property(`${prefix}script`);
    let script = null;

    if (scriptPath) {
      const scriptPropertyMap = this.resolveScriptProperties(mapObject);
      script = this.registerScript(scriptPath, scriptPropertyMap);
    }

    const area2DNode = new Area2D({
      collisionObject2D: {
        collisionLayer: mapObject.property(`${prefix}collision_layer`),
        collisionMask: mapObject.property(`${prefix}collision_mask`),
        node2D: {
          position: center,
          rotation: getRotation(mapObject.rotation),
          canvasItem: {
            node: {
              name: mapObject.name,
              owner,
              groups,
              script,
            },
          },
        },
      },
    });
    this.scene.nodeList.push(area2DNode);

    const polygonPointsArray = mapObject.polygon.map(point => new Vector2({ x: point.x, y: point.y }));

    const polygon = new PackedVector2Array({
      array: polygonPointsArray,
    });

    const shapeGroupList = splitCommaSeparatedString(mapObject.property(`${prefix}shape_groups`));

    const collisionPolygon2DNode = new CollisionPolygon2D({
      buildMode: buildMode,
      polygon: polygon,
      node2D: {
        canvasItem: {
          node: {
            owner: area2DNode,
            groups: shapeGroupList,
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

    const scriptPath = mapObject.property(`${prefix}script`);
    let script = null;

    if (scriptPath) {
      const scriptPropertyMap = this.resolveScriptProperties(mapObject);
      script = this.registerScript(scriptPath, scriptPropertyMap);
    }

    const area2DNode = new Area2D({
      collisionObject2D: {
        collisionLayer: mapObject.property(`${prefix}collision_layer`),
        collisionMask: mapObject.property(`${prefix}collision_mask`),
        node2D: {
          position: center,
          rotation: getRotation(mapObject.rotation),
          canvasItem: {
            node: {
              name: mapObject.name,
              owner,
              groups,
              script,
            },
          },
        },
      },
    });
    this.scene.nodeList.push(area2DNode);

    const circleShape = new CircleShape2D({
      radius: radius.toFixed(2).replace(/\.?0+$/, ""),
    });

    this.scene.addSubResource(circleShape);

    const shapeGroupList = splitCommaSeparatedString(mapObject.property(`${prefix}shape_groups`));

    const collisionShape2DNode = new CollisionShape2D({
      shape: circleShape,
      node2D: {
        canvasItem: {
          node: {
            owner: area2DNode,
            groups: shapeGroupList,
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

    const scriptPath = mapObject.property(`${prefix}script`);
    let script = null;

    if (scriptPath) {
      const scriptPropertyMap = this.resolveScriptProperties(mapObject);
      script = this.registerScript(scriptPath, scriptPropertyMap);
    }

    const node = new Node2D({
      position: position,
      rotation: getRotation(mapObject.rotation),
      canvasItem: {
        node: {
          name,
          owner,
          groups,
          script,
        },
      },
    });
    this.scene.nodeList.push(node);
  }

  /**
   * Add tile data to the tilemapData array.
   * @param {Array<number>} tilemapData - The array to add data to.
   * @param {Tile} tile - The tile to extract data from.
   * @param {number} x - The x-coordinate of the tile.
   * @param {number} y - The y-coordinate of the tile.
   */
  addTileData(tilemapData, tile, x, y) {
    const sourceID = 0; //TODO add support for extra tilesets using a TileAtlasSource
    const tileAtlasX = tile.imageRect.x / tile.tileset.tileWidth;
    const tileAtlasY = tile.imageRect.y / tile.tileset.tileHeight;
    const alternativeTileID = 0; //TODO add support for alternative tiles
    const tileFlipFlag = 0; //TODO add support for tile flipping flags

    tilemapData.push(
      x, 0, y, 0, sourceID, 0, 
      tileAtlasX, 0, tileAtlasY, 0, 
      alternativeTileID, tileFlipFlag
    );
  }

  /**
   * Create a TileMapLayer node and add it to the scene.
   * @param {TileLayer} tileLayer - The tile layer.
   * @param {string} tilesetName - The name of the tileset.
   * @param {Array<number>} tilemapData - The tilemap data.
   * @param {string[]} groups - The groups this layer is part of.
   * @param {GDNode} owner - The owner node.
   */
  createTileMapLayerNode(tileLayer, tilesetName, tilemapData, groups, owner) {
    const scriptPath = tileLayer.property(`${prefix}script`);
    let script = null;

    if (scriptPath) {
      const scriptPropertyMap = this.resolveScriptProperties(mapObject);
      script = this.registerScript(scriptPath, scriptPropertyMap);
    }

    const node = new TileMapLayer({
      tileset: this.getTilesetByName(tilesetName),
      tileMapData: new PackedByteArray({
        array: tilemapData,
      }),
      node2D: {
        canvasItem: {
          node: {
            name: tileLayer.name,
            owner,
            groups,
            script,
          },
        },
      },
    });
    this.scene.nodeList.push(node);
  }

  /**
   * Resolve script properties and map them into a usable format.
   * 
   * @param {TiledObject} tiledObject - The object to extract the properties from.
   * @returns {Map} - A map with each property and its values.
   */
  resolveScriptProperties(tiledObject) {
    const objectProperties = tiledObject.resolvedProperties();

    // Filter and map properties that start with "💠" into a usable format
    const properties = Object.entries(objectProperties)
      .filter(([key]) => key.startsWith('💠'))
      .reduce((map, [key, value]) => {
        const cleanKey = key.slice(1); // Remove "💠" prefix
        let formattedValue;

        switch(value.typeName) {
          case 'Vector2':
            formattedValue = `Vector2(${value.value.x}, ${value.value.y})`;
            break;
          case 'Vector2i':
            formattedValue = `Vector2i(${value.value.x}, ${value.value.y})`;
            break;
          case 'Resource':
            const resource = this.registerResource(value.value.path);
            formattedValue = `ExtResource("${resource.id}")`;
            break;
          case 'Direction':
            formattedValue = value.value;
            break;
          default:
            formattedValue = value;
        }

        map.set(cleanKey, formattedValue);
        return map;
      }, new Map());

    return properties;
  }

  /**
   * Register a script in the external resource list and returns it.
   * If the script is already registered, returns it instead.
   * 
   * @param {string} path - The filepath of the script.
   * @param {Map} properties - The properties of the script.
   * @returns {Script} - The registered script.
   */
  registerScript(path, properties) {
    for (const resource of this.scene.externalResourceList) {
      if (resource instanceof Script && resource.path == path) {
        return resource;
      }
    }

    const scriptResource = new Script({
      properties,
      resource: {
        path,
      },
    });

    this.scene.addExternalResource(scriptResource);

    return scriptResource;
  }

  /**
   * Register a resource in the external resource list and returns it.
   * If the resource is already registered, returns it instead.
   * 
   * @param {string} path - The filepath of the script.
   * @returns {Resource} - The registered resource.
   */
  registerResource(path) {
    for (const resource of this.scene.externalResourceList) {
      if (resource instanceof Resource && resource.path == path) {
        return resource;
      }
    }

    const resource = new Resource({
      path,
    });

    this.scene.addExternalResource(resource);

    return resource;
  }

  /**
   * Find a tileset by its name.
   * @param {string} tilesetName - The name of the tileset to find the id of.
   * @returns {GDTileset|undefined} - The tileset if found, undefined otherwise.
   */
  getTilesetByName(tilesetName) {
    for (const resource of this.scene.externalResourceList) {
      if (resource instanceof GDTileset && resource.name === tilesetName) {
        return resource;
      }
    }

    return undefined;
  }

  /**
   * Calculate the X and Y offset (in pixels) for the specified tile
   * ID within the specified tileset image.
   *
   * @param {Tileset} tileset - The full Tileset object.
   * @param {int} tileId - Id for the tile to extract offset for.
   * @returns {object} - An object with pixel offset in the format {x: int, y: int}.
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
}

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

tiled.registerMapFormat("Godot", customTileMapFormat);
