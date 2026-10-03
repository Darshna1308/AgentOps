const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const User = require("./user");

dotenv.config();

const resetAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const username = "admin";
    const password = "AgentOps@2026";

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const existingUser = await User.findOne({
      username
    });

    if (existingUser) {
      existingUser.password = hashedPassword;

      await existingUser.save();

      console.log(
        "Admin password reset successfully."
      );
    } else {
      await User.create({
        username,
        password: hashedPassword
      });

      console.log(
        "Admin user created successfully."
      );
    }

    console.log("Username:", username);
    console.log("Password:", password);

    await mongoose.disconnect();

    process.exit(0);
  } catch (error) {
    console.error(
      "Failed to reset admin:",
      error.message
    );

    process.exit(1);
  }
};

resetAdmin();