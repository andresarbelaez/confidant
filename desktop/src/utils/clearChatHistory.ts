import { invoke } from '@tauri-apps/api/core';

/**
 * Clear chat history for a specific user
 */
export async function clearChatHistoryForUser(userId: string): Promise<void> {
  try {
    await invoke('delete_user_chat', { userId });
  } catch (err) {
    console.error(`Failed to clear chat history for user ${userId}:`, err);
    throw err;
  }
}

/**
 * Clear chat history for all users
 */
export async function clearAllChatHistory(): Promise<void> {
  try {
    const users = await invoke<Array<{ id: string; name: string }>>('get_users');
    for (const user of users) {
      try {
        await invoke('delete_user_chat', { userId: user.id });
      } catch (err) {
        console.error(`Failed to clear chat history for user ${user.id}:`, err);
      }
    }
  } catch (err) {
    console.error('Failed to clear all chat history:', err);
    throw err;
  }
}
