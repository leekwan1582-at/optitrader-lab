import mongoose, { Model, Schema } from 'mongoose';
import type { UserPublic } from '../types/domain.js';

export interface UserData {
  name: string;
  email: string;
  passwordHash: string;
  workspaceName: string;
}

export interface UserMethods {
  toPublic(): UserPublic;
}

export type UserDocument = mongoose.HydratedDocument<UserData, UserMethods>;
type UserModel = Model<UserData, Record<string, never>, UserMethods>;

const userSchema = new Schema<UserData, UserModel, UserMethods>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    workspaceName: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

userSchema.methods.toPublic = function toPublic(): UserPublic {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    workspaceName: this.workspaceName,
  };
};

export default mongoose.model<UserData, UserModel>('User', userSchema);
