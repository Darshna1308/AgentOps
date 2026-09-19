const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const connectDB = async () => {
  try {

    const mongoURI =
      process.env.MONGODB_URI;

    if (!mongoURI) {

      throw new Error(
        "MONGODB_URI is not configured"
      );

    }

    await mongoose.connect(
      mongoURI
    );

    console.log(
      "MongoDB connected successfully"
    );

  } catch (error) {

    console.error(
      "MongoDB connection failed:",
      error.message
    );

  }
};

module.exports = connectDB;