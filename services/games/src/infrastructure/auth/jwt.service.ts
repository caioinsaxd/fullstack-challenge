import { Injectable } from "@nestjs/common";

export interface JwtPayload {
  sub: string;
  playerId?: string;
  username?: string;
  email?: string;
  roles?: string[];
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtService {
  async verify(token: string): Promise<JwtPayload> {
    try {
      const parts = token.split(".");
      
      if (parts.length !== 3) {
        console.warn("[JwtService] Invalid token - not 3 parts");
        throw new Error("Invalid token format");
      }

      const payload = this.decodePayload(parts[1]);

      if (!payload.sub && !payload.playerId) {
        console.warn("[JwtService] Token has no sub");
      }

      return payload;
    } catch (error) {
      console.error("[JwtService] Token verification failed:", error.message);
      throw error;
    }
  }

  private decodePayload(base64Url: string): JwtPayload {
    try {
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const pad = base64.length % 4;
      const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
      const json = Buffer.from(padded, "base64").toString("utf-8");
      return JSON.parse(json);
    } catch (e) {
      console.error("[JwtService] Decode error:", e.message);
      throw new Error("Invalid token payload");
    }
  }

  extractPlayerId(payload: JwtPayload): string {
    return payload.sub || payload.playerId || "";
  }

  extractUsername(payload: JwtPayload): string | undefined {
    return payload.username || payload.email;
  }

  extractRoles(payload: JwtPayload): string[] {
    return payload.roles || [];
  }
}