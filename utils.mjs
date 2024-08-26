import { Vector2 } from './models/vector2.mjs';

/**
 * Returns a full res path to a file.
 * 
 * If relativePath is defined, uses relativePath to determine the res path.
 * If relativePath is undefined, uses projectRoot to determine the res path.
 * If relativePath is undefined and projectRoot is undefined, automatically determines the res path.
 * 
 * Information on file paths in Godot: https://docs.godotengine.org/en/stable/tutorials/io/data_paths.html
 *
 * @param {string} projectRoot desired project root path, which can be an absolute or relative path to the outputPath. Ex: 'C:/project' or './../..'
 * @param {string} relativePath relative path to file. Ex: '/maps/level1'
 * @param {string} outputPath full path and name of destination file. Ex: 'C:/project/maps/level1/tileset.tres'
 * @returns {string} full relative path to file to be included in a 'res://' path. Ex: 'maps/level1/tileset.tres'
 */
export function getResPath(projectRoot, relativePath, outputPath) {
  let fullResPath = ''
  if (relativePath) {
    // Replace all backslashes with forward slashes
    relativePath = relativePath.replace(/\\/g, '/');

    fullResPath = FileInfo.joinPaths(relativePath, FileInfo.fileName(outputPath));
  } else {
    const p = outputPath.split('/').slice(0, -1)

    // If projectRoot is not set, attempt to automatically determine projectRoot by searching for godot project file
    if (!projectRoot) {
      const out = p
      outputPath.split('/').every(_ => {
        let godotProjectFile = FileInfo.joinPaths(out.join('/'), 'project.godot');
        if (!File.exists(godotProjectFile)) {
          out.pop()
          return true;
        }
        return false;
      })
      projectRoot = out.join('/')
    }

    // Replace all backslashes with forward slashes
    projectRoot = projectRoot.replace(/\\/g, '/');
  
    // Use projectRoot as absolute if it doesn't start with ".", relative if it does
    if (projectRoot[0] === '.') {
      const out = p
      projectRoot.split('/').forEach((segment) => {
        if (segment === '..') {
          out.pop()
        }
      })
      projectRoot = out.join('/')
    }
  
    fullResPath = outputPath.replace(projectRoot, "");
  }

  // Strip leading slashes to prevent invalid triple slashes in Godot res:// path
  fullResPath = fullResPath.replace(/^\/+/, '');

  return fullResPath
}

/**
 * Tileset should expose columns ... but didn't at the moment so we
 * calculate them base on the image width and tileWidth.
 * Takes into account margin (extra space around the image edges) and
 * tile spacing (padding between individual tiles).
 * @returns {number}
 */
export function getTilesetColumns(tileset) {
  // noinspection JSUnresolvedVariable
  const imageWidth = tileset.imageWidth + tileset.tileSpacing - tileset.margin
  const tileWidth = tileset.tileWidth + tileset.tileSpacing
  const calculatedColumnCount = imageWidth / tileWidth
  
  // Tiled ignores "partial" tiles (extra unaccounted for pixels in the image),
  // so we need to return as Math.floor to avoid throwing off the tile indices.
  return Math.floor(calculatedColumnCount);
}

/**
 * @param {string} str comma separated items
 */
export function splitCommaSeparatedString(str) {
  if (!str) {
    return undefined;
  }
  
  return str.split(',').map(s => s.trim());
}

/**
 * Translates key values defining a Godot scene node to the expected TSCN format output.
 * Passed keys must be strings. Values can be arrays (e.g. for groups)
 *
 * @param {object} nodeProperties pair key/values for the "node" properties
 * @param {object} contentProperties pair key/values for the content properties
 * @param {object} metaProperties pair key/values for the meta properties
 * @returns {string} TSCN scene node like so :
 *         ```
 *          [node key="value"]
 *          content_key = AnyValue
            __meta__ = {
            "content_key" : AnyValue
            }
 *         ```
 */
export function convertNodeToString(nodeProperties, contentProperties = {}, metaProperties = {}) {
  let str = '\n[node';

  // Convert node heading properties to string
  str += Object.entries(nodeProperties)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ` ${stringifyKeyValue(key, value, false, true, false)}`)
    .join('');
  
  str += ']\n';

  // Convert node properties to string
  str += Object.entries(contentProperties)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${stringifyKeyValue(key, value, false, false, true)}\n`)
    .join('');

  // Convert node meta properties to string if any
  const metaEntries = Object.entries(metaProperties);
  if (metaEntries.length > 0) {
    str += '__meta__ = {\n';

    str += metaEntries
      .map(([key, value], index) => {
        const quoteValue = typeof value !== 'number' && typeof value !== 'boolean';
        const prefix = index > 0 ? ',\n' : '';
        return `${prefix}${stringifyKeyValue(key, value, true, quoteValue, true, ":")}`;
      })
      .join('');

    str += '\n}\n';
  }

  return str;
}

/**
 * Processes a key/value pair for a TSCN node
 *
 * @param {string} key
 * @param {string|array} value
 * @param {boolean} quoteKey
 * @param {boolean} quoteValue
 * @param {boolean} spaces
 * @param {string} separator
 */
export function stringifyKeyValue(key, value, quoteKey, quoteValue, spaces, separator = "=") {
  // Flatten arrays and quote values if needed
  if (Array.isArray(value)) {
    value = `[\n"${value.join('","')}",\n]`;
  } else if (quoteValue) {
    value = `"${value}"`;
  }

  // Quote key if needed
  if (quoteKey) {
    key = `"${key}"`;
  }

  // Handle spacing around the separator
  const space = spaces ? ' ' : '';

  return `${key}${space}${separator}${space}${value}`;
}

export function getFileName(path) {
  // Extract the part after the last '/'
  let fileNameWithExtension = path.split('/').pop();
  
  // Remove the extension
  let fileName = fileNameWithExtension.split('.').slice(0, -1).join('.');
  
  return fileName;
}

/**
 * Calculates the center coordinate of a rectangle after rotation.
 * @param {Vector2} position - The coordinate of the top-left corner of the rectangle.
 * @param {object} size - The size of the rectangle.
 * @param {number} rotationDegrees - The rotation of the rectangle in degrees.
 * @returns {Vector2} - An object containing the x and y coordinates of the center.
 */
export function getAreaCenter(position, size, rotationDegrees) {
  // Calculate the original center of the rectangle
  const center = new Vector2({
    x: position.x + size.width / 2,
    y: position.y + size.height / 2,
  });

  // Rotation in radians
  const rotationRadians = rotationDegrees * (Math.PI / 180);

  // Adjust the position of the center based on the rotation around the top-left corner
  const rotatedCenterX = position.x + (center.x - position.x) * Math.cos(rotationRadians) - (center.y - position.y) * Math.sin(rotationRadians);
  const rotatedCenterY = position.y + (center.x - position.x) * Math.sin(rotationRadians) + (center.y - position.y) * Math.cos(rotationRadians);

  const areaCenter = new Vector2({
    x: roundToDecimals(rotatedCenterX),
    y: roundToDecimals(rotatedCenterY),
  });

  return areaCenter;
}

/**
 * Converts degrees to radians.
 * @param {number} degrees - The angle in degrees.
 * @returns {number} - The angle in radians.
 */
export function degreesToRadians(degrees) {
  if (degrees == undefined) {
    return undefined;
  }
  
  return degrees * (Math.PI / 180);
}

/**
 * Rounds a number to a specified number of decimal places.
 * The rounding is based on the digit following the specified decimal places.
 *
 * @param {number} num - The number to be rounded.
 * @param {number} [decimalPlaces=3] - The number of decimal places to round to (default is 3).
 * @returns {number} The rounded number with the specified number of decimal places.
 *
 * @example
 * roundToDecimals(3.141592, 3); // returns 3.142
 * roundToDecimals(2.71828, 2);  // returns 2.72
 * roundToDecimals(1.234567, 4); // returns 1.2346
 * roundToDecimals(4.55554, 1);  // returns 4.6
 * roundToDecimals(4.55544);     // returns 4.555 (default is 3 decimal places)
 */
export function roundToDecimals(num, decimalPlaces = 3) {
  const factor = Math.pow(10, decimalPlaces);
  return Math.round(num * factor) / factor;
}

/**
 * Validates, converts a rotation from degrees to radians, and rounds the result to a specified number of decimal places.
 * Returns `undefined` if the input `rotationDegrees` is `undefined`.
 *
 * @param {number|undefined} rotationDegrees - The rotation value in degrees to be validated and converted.
 * @returns {number|undefined} The rotation in radians, rounded to the specified number of decimal places, or `undefined` if input is `undefined`.
 */
export function getRotation(rotationDegrees) {
  const validatedRotation = validateNumber(rotationDegrees);

  if (validatedRotation === undefined) {
    return undefined;
  }

  const rotationInRadians = degreesToRadians(validatedRotation);
  const roundedRotation = roundToDecimals(rotationInRadians, 6);

  return roundedRotation;
}

export function validateString(value, defaultValue = "")
{
  if (typeof value === 'string' && value !== defaultValue) {
    return value;
  }
  return undefined;
}

export function validateBool(value, defaultValue = false)
{
  if (typeof value === 'boolean' && value !== defaultValue) {
    return value;
  }
  return undefined;
}

export function validateNumber(value, defaultValue = 0)
{
  const parsedValue = parseInt(value, 10);

  if (typeof value === 'number' && value !== defaultValue && !isNaN(parsedValue)) {
    return value;
  }

  return undefined;
}

export function validateVector2(value, defaultValue = { x: 0, y: 0 })
{
  if (typeof value === 'object' && value.x != defaultValue.x & value.y != defaultValue.y) {
    return `Vector2(${value.x}, ${value.y})`;
  }
  return undefined;
}

export function hasColor(argb) {
  // Ensure the input is in the correct format
  if (!/^#[0-9A-Fa-f]{6,8}$/.test(argb)) {
    throw new Error('Invalid format. Please use a string like "#00000000" or "#000000".');
  }

  // Handle the case where the input is in ARGB format
  if (argb.length === 9) {
    const alpha = argb.slice(1, 3).toUpperCase();

    if (alpha === '00') {
      return false;
    }

    // If alpha is non-zero, the color is not fully transparent, return true
    return parseInt(alpha, 16) !== 0;
  }

  // If the input is in RGB format, just return true
  return true;
}

export function propertiesToMap(properties) {
  const map = new Map();
  const entries = Object.entries(properties);

  for (const [key, value] of entries) {
    map.set(key, value);
  }

  return map;
}

export function getUID(path) {
  const file = new TextFile(path, TextFile.ReadOnly);
  const firstLine = file.readLine();
  file.close();

  const uidMatch = firstLine.match(/uid="([^"]+)"/);
  const uid = uidMatch ? uidMatch[1] : null;

  return uid;
}

export function resolvePath(path) {
  const projectRoot = tiled.project.property("godot:projectRoot");
  const tiledProjectFile = tiled.projectFilePath;
  
  // Get the directory of the tiled project file
  const projectDirectory = tiledProjectFile.substring(0, tiledProjectFile.lastIndexOf("/"));

  // Resolve projectRoot relative to the project directory
  const fullProjectRoot = projectDirectory + "/" + projectRoot;
  const resolvedProjectRoot = fullProjectRoot.split('/').reduce(
    (acc, part) => {
      if (part === '..') {
        acc.pop(); // Go up one directory level
      } else if (part !== '.' && part !== '') {
        acc.push(part); // Add the current part to the path
      }
      return acc;
    },
    [],
  ).join('/');

  // Combine the resolved project root with the asset path
  const fullPath = resolvedProjectRoot + "/" + path;

  // Convert to Windows-style path
  const windowsFullPath = fullPath.replace(/\//g, '\\');

  return windowsFullPath;
}
