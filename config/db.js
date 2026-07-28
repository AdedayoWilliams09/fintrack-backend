// FILE: backend/config/db.js


import mongoose from 'mongoose';

/**
 *  Database Connection Function
 * 
 *  Child Explanation:
 * "This is like calling a friend (the database). If they don't answer, we wait a bit and try again. 
 * We give up after 5 tries so we don't keep calling forever."
 * 
 *  Technical Explanation:
 * "This function establishes a MongoDB connection using Mongoose with retry logic.
 * It uses exponential backoff to prevent overwhelming the database server during connection attempts."
 */

const connectDB = async (retryCount = 0) => {
  try {
    // Check if we have the database URL
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    // Connection options for performance and reliability
    const options = {
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 2,  // Minimum number of connections to keep
      socketTimeoutMS: 45000, // How long to wait for a response
      serverSelectionTimeoutMS: 5000, // How long to wait for server selection
      retryWrites: true, // Retry write operations if they fail
    };

    // Try to connect to MongoDB
    await mongoose.connect(mongoURI, options);
    
    // Log successful connection
    console.log(' MongoDB Connected Successfully');
    console.log(` Database: ${mongoose.connection.name}`);
    console.log(` Host: ${mongoose.connection.host}`);
    
    return mongoose.connection;
    
  } catch (error) {
    console.error(' MongoDB Connection Error:', error.message);
    
    // Retry logic with exponential backoff
    const maxRetries = 5;
    if (retryCount < maxRetries) {
      const waitTime = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s, 8s, 16s
      console.log(` Retrying in ${waitTime/1000} seconds... (Attempt ${retryCount + 1}/${maxRetries})`);
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return connectDB(retryCount + 1);
    } else {
      console.error(' Failed to connect to MongoDB after maximum retries');
      process.exit(1);
    }
  }
};

// Event listeners for connection monitoring
mongoose.connection.on('disconnected', () => {
  console.log(' MongoDB Disconnected - Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log(' MongoDB Reconnected Successfully');
});

mongoose.connection.on('error', (err) => {
  console.error(' MongoDB Connection Error:', err);
});

export default connectDB;