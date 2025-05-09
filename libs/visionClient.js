// libs/visionClient.js

/**
 * Analyze an image using Google Vision API via the backend
 * @param {string} dataURL - Base64 encoded image data URL
 * @param {Object} options - Optional configuration
 * @param {number} options.timeout - Request timeout in milliseconds
 * @param {boolean} options.retryOnFail - Whether to retry on failure
 * @param {number} options.maxRetries - Maximum number of retries
 * @param {number} options.retryDelay - Delay between retries in milliseconds
 * @returns {Promise<string>} - Image analysis summary
 */
export default async function analyzeImage(dataURL, options = {}) {
  const {
    timeout = 15000,  // Increased timeout to 15 seconds
    retryOnFail = true,
    maxRetries = 3,   // Increased max retries
    retryDelay = 1000 // Add delay between retries
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
        throw new Error('Request timed out - please try again');
      }
      
      // Retry logic
      if (retryOnFail && retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
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
    return 'Sorry, I was unable to analyze the image. Please try again or describe what you see.';
  } finally {
    // Ensure timeout is cleared
    clearTimeout(timeoutId);
  }
}
