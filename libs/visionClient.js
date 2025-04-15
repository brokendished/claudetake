// libs/visionClient.js

/**
 * Analyze an image using Google Vision API via the backend
 * @param {string} dataURL - Base64 encoded image data URL
 * @param {Object} options - Optional configuration
 * @param {number} options.timeout - Request timeout in milliseconds
 * @param {boolean} options.retryOnFail - Whether to retry on failure
 * @param {number} options.maxRetries - Maximum number of retries
 * @returns {Promise<string>} - Image analysis summary
 */
export default async function analyzeImage(dataURL, options = {}) {
  const {
    timeout = 10000,  // 10 second timeout default
    retryOnFail = true,
    maxRetries = 2
  } = options;

  // Validate input
  if (!dataURL || typeof dataURL !== 'string') {
    throw new Error('Invalid image data: Image data must be a non-empty string');
  }

  if (!dataURL.startsWith('data:image')) {
    throw new Error('Invalid image format: Data URL must start with "data:image"');
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  // Function to perform the API call
  const performRequest = async (retryCount = 0) => {
    try {
      const res = await fetch('/api/analyze-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataURL }),
        signal: controller.signal
      });

      // Clear timeout on successful response
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`API error (${res.status}): ${errorData.error || 'Unknown error'}`);
      }

      const data = await res.json();
      return data.summary || 'No insight found.';
    } catch (error) {
      // Handle request timeout
      if (error.name === 'AbortError') {
        throw new Error('Image analysis timed out');
      }
      
      // Retry logic
      if (retryOnFail && retryCount < maxRetries) {
        console.warn(`Vision API request failed, retrying (${retryCount + 1}/${maxRetries})...`);
        return performRequest(retryCount + 1);
      }
      
      // Rethrow if out of retries
      throw error;
    }
  };

  try {
    return await performRequest();
  } catch (error) {
    console.error('Image analysis failed:', error);
    // Return graceful fallback message
    return 'Unable to analyze image at this time.';
  } finally {
    // Ensure timeout is cleared
    clearTimeout(timeoutId);
  }
}
