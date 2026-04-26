import { createHmac, randomBytes } from "crypto";

const HOUSE_EDGE = 0.05;
const MIN_CRASH_POINT = 100;
const MAX_CRASH_POINT = 1000000;

export interface ProvablyFairResult {
  seed: string;
  hash: string;
  crashPoint: string;
}

export interface VerificationData {
  seed: string;
  hash: string;
  crashPoint: string;
  houseEdge: number;
}

export class ProvablyFairService {
  generateSeed(): string {
    return randomBytes(32).toString("hex");
  }

  generateHash(seed: string): string {
    return createHmac("sha256", seed).digest("hex");
  }

  calculateCrashPoint(hash: string): number {
    const hashNum = parseInt(hash.substring(0, 8), 16);
    const normalized = hashNum / 0xFFFFFFFF;
    
    const crashPoint = (1 / (1 - normalized * (1 - HOUSE_EDGE))) * 100;
    
    return Math.min(Math.max(crashPoint * 100, MIN_CRASH_POINT), MAX_CRASH_POINT) / 100;
  }

  generate(roundId: string): ProvablyFairResult {
    const seed = this.generateSeed();
    const combined = `${seed}:${roundId}`;
    const hash = this.generateHash(combined);
    const crashPoint = this.calculateCrashPoint(hash);

    return {
      seed,
      hash,
      crashPoint: crashPoint.toFixed(2),
    };
  }

  verify(seed: string, roundId: string): VerificationData {
    const combined = `${seed}:${roundId}`;
    const hash = this.generateHash(combined);
    const crashPoint = this.calculateCrashPoint(hash);

    return {
      seed,
      hash,
      crashPoint: crashPoint.toFixed(2),
      houseEdge: HOUSE_EDGE * 100,
    };
  }

  verifyCrashPoint(seed: string, roundId: string, expectedCrashPoint: string): boolean {
    const result = this.verify(seed, roundId);
    return result.crashPoint === expectedCrashPoint;
  }
}