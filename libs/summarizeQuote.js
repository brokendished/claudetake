/**
 * Summarize the quote conversation using the OpenAI API
 * @param {Array} messages - Array of conversation messages
 * @param {Object} options - Optional configuration
 * @param {number} options.timeout - Request timeout in milliseconds
 * @param {boolean} options.retryOnFail - Whether to retry on failure
 * @param {number} options.maxRetries - Maximum number of retries
 * @returns {Promise<string>} Summary of the conversation
 */
export default async function summarizeQuote(messages, options = {}) {
  const {
    timeout = 10000, // 10 second timeout
    retryOnFail = true,
    maxRetries = 2
  } = options;

  // Input validation
  if (!Array.isArray(messages) || messages.length === 0) {
    console.error('Invalid messages array provided to summarizeQuote');
    return 'No conversation to summarize.';
  }

  // Take only the most recent messages if there are too many
  const recentMessages = messages.length > 30 
    ? messages.slice(-30)  // Take last 30 messages if there are more
    : messages;

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Function to perform the API call
  const performRequest = async (retryCount = 0) => {
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: recentMessages }),
        signal: controller.signal
      });

      // Clear timeout on successful response
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`API error (${res.status}): ${errorData.error || 'Unknown error'}`);
      }

      const data = await res.json();
      return data.summary || 'No summary available.';
    } catch (error) {
      // Handle request timeout
      if (error.name === 'AbortError') {
        throw new Error('Summary request timed out');
      }

      // Retry logic
      if (retryOnFail && retryCount < maxRetries) {
        console.warn(`Summary request failed, retrying (${retryCount + 1}/${maxRetries})...`);
        return performRequest(retryCount + 1);
      }

      // Rethrow if out of retries
      throw error;
    }
  };

  try {
    return await performRequest();
  } catch (error) {
    console.error('Error summarizing quote:', error);
    
    // Create a fallback summary
    try {
      // Extract the latest user issue as a fallback
      const userMessages = recentMessages
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content);
      
      if (userMessages.length > 0) {
        const latestMessage = userMessages[userMessages.length - 1];
        // Limit to 50 characters
        return latestMessage.length > 50 
          ? `${latestMessage.substring(0, 50)}...` 
          : latestMessage;
      }
    } catch (fallbackError) {
      console.error('Failed to create fallback summary:', fallbackError);
    }
    
    return 'Quote summary unavailable.';
  } finally {
    // Ensure timeout is cleared
    clearTimeout(timeoutId);
  }
}
