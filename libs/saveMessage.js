import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseClient';

export async function saveMessage({ quoteId, role, content, context = '', responseTo = '' }) {
  if (!quoteId) return;
  try {
    await addDoc(collection(db, 'quotes', quoteId, 'messages'), {
      role,
      content,
      context,
      responseTo,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error('🔥 Error saving message:', err);
  }
}
