import { db } from '../src/db';
import { users, servers, channels, categories, roles, members, messages, invites } from '../src/db/schema';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

const SALT_ROUNDS = 12;

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // Create test users
    console.log('Creating users...');
    const hashedPassword = await bcrypt.hash('password123', SALT_ROUNDS);
    
    const testUsers = await db.insert(users).values([
      {
        username: 'testuser1',
        displayName: 'Test User One',
        email: 'test1@example.com',
        passwordHash: hashedPassword,
        status: 'online',
        customStatus: 'Testing the app',
      },
      {
        username: 'testuser2', 
        displayName: 'Test User Two',
        email: 'test2@example.com',
        passwordHash: hashedPassword,
        status: 'idle',
        customStatus: 'Away from keyboard',
      },
      {
        username: 'testuser3',
        displayName: 'Test User Three', 
        email: 'test3@example.com',
        passwordHash: hashedPassword,
        status: 'dnd',
        customStatus: 'Do not disturb',
      },
    ]).returning();

    const [user1, user2, user3] = testUsers;

    // Create test server
    console.log('Creating server...');
    const [testServer] = await db.insert(servers).values([
      {
        name: 'Test Gaming Server',
        description: 'A server for testing BTOW features',
        ownerId: user1.id,
      },
    ]).returning();

    const server = testServer;

    // Create categories
    console.log('Creating categories...');
    const [generalCategory, gamingCategory, voiceCategory] = await db.insert(categories).values([
      {
        serverId: server.id,
        name: 'General',
        position: 0,
      },
      {
        serverId: server.id,
        name: 'Gaming',
        position: 1,
      },
      {
        serverId: server.id,
        name: 'Voice',
        position: 2,
      },
    ]).returning();

    // Create default role
    console.log('Creating roles...');
    const [defaultRole] = await db.insert(roles).values([
      {
        serverId: server.id,
        name: '@everyone',
        color: '#5865F2',
        permissions: 68719476735, // All permissions for default role in test server
        position: 0,
        isDefault: true,
      },
    ]).returning();

    // Create admin role
    const [adminRole] = await db.insert(roles).values([
      {
        serverId: server.id,
        name: 'Admin',
        color: '#FF0000',
        permissions: 2147483647, // All permissions
        position: 10,
        isDefault: false,
      },
    ]).returning();

    // Add members to server
    console.log('Adding members to server...');
    await db.insert(members).values([
      {
        userId: user1.id,
        serverId: server.id,
        nickname: 'Server Owner',
        roles: [adminRole.id],
      },
      {
        userId: user2.id,
        serverId: server.id,
        roles: [defaultRole.id],
      },
      {
        userId: user3.id,
        serverId: server.id,
        roles: [defaultRole.id],
      },
    ]);

    // Create channels
    console.log('Creating channels...');
    const [welcomeChannel] = await db.insert(channels).values([
      {
        serverId: server.id,
        name: 'welcome',
        type: 'text',
        topic: 'Welcome to the server!',
        categoryId: generalCategory.id,
        position: 0,
      },
      {
        serverId: server.id,
        name: 'general',
        type: 'text',
        topic: 'General discussion',
        categoryId: generalCategory.id,
        position: 1,
      },
      {
        serverId: server.id,
        name: 'gaming-chat',
        type: 'text',
        topic: 'Talk about games here',
        categoryId: gamingCategory.id,
        position: 2,
      },
      {
        serverId: server.id,
        name: 'screenshots',
        type: 'text',
        topic: 'Share your gaming screenshots',
        categoryId: gamingCategory.id,
        position: 3,
      },
      {
        serverId: server.id,
        name: 'General Voice',
        type: 'voice',
        topic: 'General voice chat',
        categoryId: voiceCategory.id,
        position: 4,
      },
      {
        serverId: server.id,
        name: 'Gaming Voice',
        type: 'voice',
        topic: 'Voice chat for gaming',
        categoryId: voiceCategory.id,
        position: 5,
      },
    ]).returning();

    // Create welcome messages
    console.log('Creating messages...');
    await db.insert(messages).values([
      {
        channelId: welcomeChannel.id,
        authorId: user1.id,
        content: 'Welcome to the BTOW test server! This is a message to test the chat functionality.',
        attachments: [],
        embeds: [],
      },
      {
        channelId: welcomeChannel.id,
        authorId: user2.id,
        content: 'Thanks for setting this up! Looking forward to testing everything.',
        attachments: [],
        embeds: [],
      },
      {
        channelId: welcomeChannel.id,
        authorId: user1.id,
        content: 'Feel free to explore the channels and test different features. You can:\n- Send messages with markdown support\n- Add reactions\n- Reply to messages\n- Edit and delete your messages\n- Use voice channels when implemented',
        attachments: [],
        embeds: [],
      },
      {
        channelId: welcomeChannel.id,
        authorId: user3.id,
        content: 'This looks great! How do voice channels work?',
        attachments: [],
        embeds: [],
      },
    ]);

    // Create test invite
    console.log('Creating invites...');
    await db.insert(invites).values([
      {
        code: nanoid(8).toUpperCase(),
        serverId: server.id,
        creatorId: user1.id,
        maxUses: 10,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
    ]);

    console.log('✅ Database seed completed successfully!');
    console.log('📧 Test users created:');
    console.log('   - test1@example.com (password: password123)');
    console.log('   - test2@example.com (password: password123)');
    console.log('   - test3@example.com (password: password123)');
    console.log('🖥️  Test server: "Test Gaming Server" created with default channels');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed().catch(console.error);