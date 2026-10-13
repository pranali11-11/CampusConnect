require('dotenv').config();
const mongoose = require('mongoose');

const testMongoConnection = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI is missing in server/.env');
    process.exit(1);
  }

  console.log('🔍 Testing MongoDB Atlas Connection...\n');

  // Basic URI sanity checks
  if (uri.includes('<password>') || uri.includes('<db-user>') || uri.includes('<database>')) {
    console.error('⚠️  Warning: MONGO_URI contains unresolved placeholders like <password>, <db-user>, or <database>!');
  }

  // Check if database name is specified before query params
  try {
    const urlObj = new URL(uri.replace('mongodb+srv://', 'http://').replace('mongodb://', 'http://'));
    const dbName = urlObj.pathname.replace(/^\//, '');
    if (!dbName) {
      console.warn('⚠️  Notice: No database name was specified in the connection string URI.');
      console.warn('   MongoDB Atlas will default to saving data in the "test" database.');
      console.warn('   To fix: add the database name, e.g. mongodb+srv://user:pass@cluster.mongodb.net/CampusConnect?retryWrites=true\n');
    } else {
      console.log(`📁 Target Database specified: "${dbName}"`);
    }
  } catch {
    // URL parsing failed (could be due to unencoded special chars in password)
  }

  try {
    const useTLS = uri.startsWith('mongodb+srv');
    const conn = await mongoose.connect(uri, {
      ...(useTLS && { tls: true, tlsAllowInvalidCertificates: false }),
      serverSelectionTimeoutMS: 15000,
    });

    console.log(`✅ MongoDB Connected successfully!`);
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Connected Database: ${conn.connection.name}`);

    // Test write and read permissions
    console.log('\n📝 Testing Write & Read operations in MongoDB Atlas...');
    const testCollection = conn.connection.db.collection('_connection_test');
    const testDoc = { test: true, timestamp: new Date() };

    await testCollection.insertOne(testDoc);
    console.log('   ✅ Write test succeeded: Successfully inserted test document.');

    const foundDoc = await testCollection.findOne({ _id: testDoc._id });
    if (foundDoc) {
      console.log('   ✅ Read test succeeded: Successfully retrieved test document.');
    }

    await testCollection.deleteOne({ _id: testDoc._id });
    console.log('   ✅ Cleanup succeeded: Removed test document.');

    console.log('\n🎉 ALL CHECKS PASSED: Your MongoDB Atlas cluster is connected and ready to save data!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection or Write Test Failed!');
    console.error(`   Error Message: ${error.message}`);

    if (error.message.includes('bad auth') || error.message.includes('Authentication failed')) {
      console.error('\n👉 Cause: Invalid username or password.');
      console.error('   - Verify the database user credentials in MongoDB Atlas (Database Access tab).');
      console.error('   - If your password contains special characters like @, #, $, %, encode them using encodeURIComponent.');
    } else if (error.message.includes('ETIMEDOUT') || error.message.includes('Server selection timed out') || error.name === 'MongooseServerSelectionError') {
      console.error('\n👉 Cause: Network access blocked or cluster unreachable.');
      console.error('   - In MongoDB Atlas, go to "Network Access" in the sidebar.');
      console.error('   - Ensure your IP address is whitelisted, or add "0.0.0.0/0" (Allow Access from Anywhere).');
    } else if (error.message.includes('not authorized') || error.message.includes('command insert requires authentication')) {
      console.error('\n👉 Cause: Insufficient user permissions.');
      console.error('   - In Atlas -> Database Access, make sure the user has "Read and write to any database" role.');
    }

    process.exit(1);
  }
};

testMongoConnection();
