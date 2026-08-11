const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || '';
    // Only enable TLS for Atlas SRV URIs (mongodb+srv://)
    const useTLS = uri.startsWith('mongodb+srv');

    const conn = await mongoose.connect(uri, {
      // Enable TLS only for Atlas connections (mongodb+srv://)
      ...(useTLS && { tls: true, tlsAllowInvalidCertificates: false }),
      serverSelectionTimeoutMS: 15000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
