require('dotenv').config();
const mongoose = require('mongoose');

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const result = await mongoose.connection.db.collection('events').updateMany(
      { $or: [{ department: { $exists: false } }, { department: null }, { department: '' }] },
      { $set: { department: 'Computer Science' } }
    );
    console.log('Migration updated events:', result.modifiedCount);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
