const dns = require('dns');
const mongoose = require('mongoose');

// Atlas SRV lookups can fail against some ISP/OS resolvers even though the
// record itself is fine. Point Node's resolver at a public DNS server first.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not set. Add it to server/.env');
  }

  mongoose.set('strictQuery', true);

  const conn = await mongoose.connect(uri);
  console.log(`MongoDB Atlas connected: ${conn.connection.host}`);
  return conn;
};

module.exports = connectDB;
