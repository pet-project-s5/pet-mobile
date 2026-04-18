import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "changeme";
const EXPIRES_IN = "7d";

export interface JwtPayload {
  id: number;
  email: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (
    typeof decoded === "object" &&
    decoded !== null &&
    "id" in decoded &&
    "email" in decoded
  ) {
    return decoded as JwtPayload;
  }
  throw new Error("Invalid token payload");
}
