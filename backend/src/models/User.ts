import type { Document } from 'mongoose';
import { Schema, model } from 'mongoose';

export type UserRole = 'admin' | 'librarian' | 'member';

export interface IUser extends Document {
  firebaseUid: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    firebaseUid: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ['admin', 'librarian', 'member'], default: 'member' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 }); // fast deactivated-user filtering on every authenticated request

export const User = model<IUser>('User', userSchema);
