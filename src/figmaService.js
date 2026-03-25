/**
 * Figma API Service
 */

const BASE_URL = 'https://api.figma.com/v1';

/**
 * Extracts File Key and Node ID from a Figma URL
 * @param {string} url 
 * @returns { {fileKey: string, nodeId: string} | null }
 */
export const parseFigmaUrl = (url) => {
  try {
    // Example: https://www.figma.com/file/ABCDEFG12345/Title?node-id=1%3A2
    // Or: https://www.figma.com/design/ABCDEFG12345/Title?node-id=1-2
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    let fileKey = null;
    if (pathParts.includes('file') || pathParts.includes('design')) {
      const typeIndex = pathParts.findIndex(p => p === 'file' || p === 'design');
      fileKey = pathParts[typeIndex + 1];
    }

    let nodeId = urlObj.searchParams.get('node-id');
    if (nodeId) {
      // Figma sometimes uses '-' instead of ':' in URLs for node ids
      nodeId = nodeId.replace('-', ':');
    }

    return { fileKey, nodeId };
  } catch (err) {
    console.error("Invalid Figma URL", err);
    return null;
  }
}

/**
 * Fetches the exported image URL for a specific node from Figma.
 * @param {string} token - Figma Personal Access Token
 * @param {string} fileKey - Figma File Key
 * @param {string} nodeId - Figma Node ID
 * @returns {Promise<string>} The URL of the rendered image
 */
export const fetchFigmaNodeImage = async (token, fileKey, nodeId) => {
  if (!token) throw new Error("Figma token is missing");
  if (!fileKey || !nodeId) throw new Error("Invalid Figma URL parameters");

  const endpoint = `${BASE_URL}/images/${fileKey}?ids=${nodeId}&format=png&scale=1`;
  
  try {
    const response = await fetch(endpoint, {
      headers: {
        'X-Figma-Token': token
      }
    });

    if (!response.ok) {
      if (response.status === 403) throw new Error("Invalid Figma Token");
      if (response.status === 404) throw new Error("Figma File or Node not found");
      throw new Error(`Figma API Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.err) {
      throw new Error(data.err);
    }

    // data.images is an object mapping node-ids to image URLs
    const imageUrl = data.images[nodeId];
    if (!imageUrl) {
      throw new Error("Could not render image for the specified node");
    }

    return imageUrl;
  } catch (err) {
    console.error(err);
    throw err;
  }
}
