import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Parses the wrangler.jsonc file and returns the configuration object
 * @returns {object} The parsed wrangler configuration
 * @throws {Error} If the file cannot be read or parsed
 */
export function parseWranglerConfig() {
  const wranglerPath = path.join(__dirname, '..', '..', 'wrangler.jsonc');
  const wranglerContent = fs.readFileSync(wranglerPath, 'utf8');

  // Remove comments from the JSONC content
  // Replace block comments with space
  let jsonContent = wranglerContent.replace(/\/\*[\s\S]*?\*\//g, ' ');
  // Remove single-line comments (// ...) but not URLs (https://)
  // Match // only when it's at the start of a line (after whitespace) or after whitespace
  jsonContent = jsonContent.split('\n').map(line => {
    // Find // that's not part of a URL (not preceded by :)
    const match = line.match(/^([^:]*?)(\s*\/\/)(.*)$/);
    if (match && !match[1].includes('"')) {
      // If there's no opening quote before //, it's a comment
      return match[1];
    }
    // Check if // is after a closing quote (actual comment)
    const commentMatch = line.match(/^(.*?"[^"]*")\s*\/\/.*$/);
    if (commentMatch) {
      return commentMatch[1];
    }
    return line;
  }).join('\n');

  // Fix trailing commas in objects and arrays (which are valid in JSONC but not in JSON)
  const fixedJsonContent = jsonContent
    .replace(/,\s*([}\]])/g, '$1'); // Replace trailing commas before closing brackets

  try {
    return JSON.parse(fixedJsonContent);
  } catch (error) {
    throw new Error(`Failed to parse wrangler.jsonc: ${error.message}`);
  }
}

/**
 * Gets the D1 database configuration from wrangler.jsonc
 * @returns {{ name: string, id: string } | null} The database configuration or null if not found
 */
export function getD1Database() {
  const config = parseWranglerConfig();
  const d1Config = config.d1_databases?.[0];

  if (!d1Config) {
    return null;
  }

  return {
    name: d1Config.database_name,
    id: d1Config.database_id
  };
}
