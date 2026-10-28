import mongoose, { Schema } from 'mongoose';

export interface RefreshTokenRecord {
  _id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  replacedBy?: string | null;
  createdAt: Date;
  userAgent?: string;
  ip?: string;
}

export type RefreshTokenDocument = mongoose.HydratedDocument<RefreshTokenRecord>;

const refreshTokenSchema = new Schema<RefreshTokenRecord>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedBy: { type: String, default: null },
    createdAt: { type: Date, required: true },
    userAgent: { type: String },
    ip: { type: String },
  },
  { timestamps: false, _id: false }
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<RefreshTokenRecord>('RefreshToken', refreshTokenSchema);
