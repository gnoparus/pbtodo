const PocketBase = require('pocketbase/cjs');

async function debugCollections() {
  const pb = new PocketBase('http://127.0.0.1:8090');

  try {
    // Try to authenticate as admin (default admin account might exist)
    try {
      await pb.admins.authWithPassword('admin@example.com', 'admin123');
      console.log('Logged in as admin');
    } catch (adminError) {
      console.log('Admin login failed:', adminError.message);

      // Try to create a test user first
      try {
        const testUser = await pb.collection('users').create({
          email: 'debug@test.com',
          password: 'test123456',
          passwordConfirm: 'test123456',
          name: 'Debug User'
        });
        console.log('Created test user:', testUser.id);

        // Login as test user
        await pb.collection('users').authWithPassword('debug@test.com', 'test123456');
        console.log('Logged in as test user');
      } catch (userError) {
        console.log('Test user creation failed:', userError.message);
        return;
      }
    }

    // List all collections
    try {
      const collections = await pb.collections.getFullList();
      console.log('\nAvailable collections:');
      collections.forEach(col => {
        console.log(`- ${col.name} (${col.id})`);
        console.log(`  Type: ${col.type}`);
        console.log(`  Schema: ${JSON.stringify(col.schema, null, 2)}`);
        console.log(`  Rules:`, {
          list: col.listRule,
          view: col.viewRule,
          create: col.createRule,
          update: col.updateRule,
          delete: col.deleteRule
        });
        console.log('');
      });
    } catch (collectionsError) {
      console.log('Failed to list collections:', collectionsError.message);
    }

    // Try to access todos collection specifically
    try {
      console.log('Trying to access todos collection...');
      const todos = await pb.collection('todos').getFullList();
      console.log(`Todos found: ${todos.length}`);
    } catch (todosError) {
      console.log('Failed to access todos:', todosError.message);
      console.log('Status:', todosError.status);
      console.log('Data:', todosError.data);
    }

  } catch (error) {
    console.error('Debug script failed:', error);
  }
}

debugCollections();
