import { db } from '../db';
import { messages } from '../db/schema';
import { encryptMessage, isLikelyPlaintext } from '../utils/encryption';
import { sql } from 'drizzle-orm';

const BATCH_SIZE = 1000;

/**
 * Migrates unencrypted messages to encrypted format
 * @param dryRun - If true, only reports what would be encrypted without making changes
 */
async function migrateEncryption(dryRun: boolean = false): Promise<number> {
  const mode = dryRun ? 'DRY RUN' : 'LIVE';
  console.log(`Starting message encryption migration (${mode})...`);
  console.log('');
  
  // First, count total unencrypted messages
  console.log('Scanning for plaintext messages...');
  const allMessages = await db
    .select({ id: messages.id, content: messages.content })
    .from(messages);
  
  const unencryptedMessages = allMessages.filter((msg) => isLikelyPlaintext(msg.content));
  const totalToEncrypt = unencryptedMessages.length;
  
  if (totalToEncrypt === 0) {
    console.log('No plaintext messages found. All messages are already encrypted!');
    return 0;
  }
  
  console.log(`Found ${totalToEncrypt} messages to encrypt`);
  console.log('');
  
  if (dryRun) {
    console.log('[DRY RUN] Would encrypt the following message IDs (first 10):');
    unencryptedMessages.slice(0, 10).forEach((msg) => {
      console.log(`  - ${msg.id}: "${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}"`);
    });
    if (totalToEncrypt > 10) {
      console.log(`  ... and ${totalToEncrypt - 10} more`);
    }
    console.log('');
    console.log(`[DRY RUN] Migration complete! Would encrypt ${totalToEncrypt} messages`);
    return totalToEncrypt;
  }
  
  // Process in batches
  let encrypted = 0;
  const batches = [];
  
  for (let i = 0; i < unencryptedMessages.length; i += BATCH_SIZE) {
    batches.push(unencryptedMessages.slice(i, i + BATCH_SIZE));
  }
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    
    // Encrypt each message in the batch
    for (const msg of batch) {
      try {
        const encryptedContent = encryptMessage(msg.content);
        
        await db
          .update(messages)
          .set({ content: encryptedContent })
          .where(sql`${messages.id} = ${msg.id}`);
        
        encrypted++;
      } catch (error) {
        console.error(`Failed to encrypt message ${msg.id}:`, error);
      }
    }
    
    // Progress feedback
    const progress = Math.min((batchIndex + 1) * BATCH_SIZE, totalToEncrypt);
    console.log(`Encrypted ${progress}/${totalToEncrypt} messages...`);
  }
  
  console.log('');
  console.log(`Migration complete! Encrypted ${encrypted} messages`);
  
  return encrypted;
}

// Run the migration
const isDryRun = process.argv.includes('--dry-run');

migrateEncryption(isDryRun)
  .then(() => {
    console.log('');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
