const mongoose = require('mongoose');
const bcrypt = require('bcrypt');  // bcrypt library is used for password encryption

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

// Salting and hashing before save the password to mongoDB database
userSchema.pre('save', async function (next) {
  const user = this;
  if (!user.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
  next();
});

// Compare the entered password with the hashed password stored in the database.
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);