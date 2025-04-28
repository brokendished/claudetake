// libs/saveMessage.js
import { collection, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { db } from './firebaseClient';

/**
 * Save a message to Firestore with improved error handling and batch support
 * @param {Object} options Message data and options
 * @param {string} options.quoteId The ID of the quote document
 * @param {string} options.role The message role ('user' or 'assistant')
 * @param {string} options.content The message content
 * @param {string} [options.context=''] Optional context information
 * @param {string} [options.responseTo=''] Optional reference to what message this responds to
 * @param {string} [options.image=''] Optional image URL
 * @param {boolean} [options.batch=false] Whether to use batch processing
 * @param {Object} [options.existingBatch=null] An existing batch to add to
 * @param {string} [options.consumerId=null] The ID of the consumer
 * @param {string} [options.contractorId=null] The ID of the contractor
 * @returns {Promise<Object|null>} The added document reference or null on error
 */
export async function saveMessage({ 
  quoteId, 
  role, 
  content, 
  context = '', 
  responseTo = '', 
  image = '',
  batch = false,
  existingBatch = null,
  consumerId = null, // Add consumerId
  contractorId = null // Add contractorId
}) {
  if (!quoteId) {
    console.error('Cannot save message: No quote ID provided');
    return null;
  }
  
  if (!role || !content) {
    console.error('Cannot save message: Missing role or content');
    return null;
  }
  
  try {
    const messageData = {
      role,
      content,
      context,
      responseTo,
      timestamp: serverTimestamp(),
      consumerId, // Include consumerId
      contractorId // Include contractorId
    };
    
    // Add image if provided
    if (image) {
      messageData.image = image;
    }
    
    // Determine whether to use batch processing
    if (batch) {
      const messageBatch = existingBatch || writeBatch(db);
      const messagesRef = collection(db, 'quotes', quoteId, 'messages');
      const newMessageRef = doc(messagesRef);
      
      messageBatch.set(newMessageRef, messageData);
      
      // Only commit if this is a standalone batch (not part of a larger transaction)
      if (!existingBatch) {
        await messageBatch.commit();
      }
      
      return { id: newMessageRef.id, ...messageData };
    } else {
      // Standard individual document creation
      const messagesRef = collection(db, 'quotes', quoteId, 'messages');
      const docRef = await addDoc(messagesRef, messageData);
      return { id: docRef.id, ...messageData };
    }
  } catch (err) {
    console.error('Error saving message to Firestore:', err);
    
    // Check for specific Firebase errors
    if (err.code === 'permission-denied') {
      console.error('Permission denied to save message. Check security rules.');
    } else if (err.code === 'unavailable') {
      console.error('Firestore service is temporarily unavailable. Try again later.');
    }
    
    return null;
  }
}

/**
 * Save multiple messages at once using batch processing
 * @param {string} quoteId The ID of the quote document
 * @param {Array} messages Array of message objects with role and content
 * @returns {Promise<boolean>} Success status
 */
export async function saveMessageBatch(quoteId, messages) {
  if (!quoteId || !Array.isArray(messages) || messages.length === 0) {
    console.error('Cannot save batch: Invalid parameters');
    return false;
  }
  
  try {
    const batch = writeBatch(db);
    
    for (const message of messages) {
      // Skip invalid messages
      if (!message.role || !message.content) continue;
      
      await saveMessage({
        quoteId,
        ...message,
        batch: true,
        existingBatch: batch
      });
    }
    
    await batch.commit();
    return true;
  } catch (err) {
    console.error('Error saving message batch:', err);
    return false;
  }
}
