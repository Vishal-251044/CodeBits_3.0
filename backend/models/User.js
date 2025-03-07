import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, unique: true },
  password: { type: String },
  googleId: { type: String }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
