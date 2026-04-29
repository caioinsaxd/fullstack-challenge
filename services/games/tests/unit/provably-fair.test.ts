import { describe, it, expect, beforeEach } from "bun:test";
import { ProvablyFairService } from "../../src/domain/services/provably-fair.service";

const MIN_BET_AMOUNT = 100;
const MAX_BET_AMOUNT = 100000;

function validateBetAmount(amount: number): boolean {
  return amount >= MIN_BET_AMOUNT && amount <= MAX_BET_AMOUNT;
}

describe("Provably Fair Service", () => {
  let service: ProvablyFairService;

  beforeEach(() => {
    service = new ProvablyFairService();
  });

  describe("generateSeed", () => {
    it("should generate a 64-character hex string", () => {
      const seed = service.generateSeed();
      expect(seed.length).toBe(64);
      expect(seed).toMatch(/^[a-f0-9]+$/);
    });

    it("should generate unique seeds", () => {
      const seed1 = service.generateSeed();
      const seed2 = service.generateSeed();
      expect(seed1).not.toBe(seed2);
    });
  });

  describe("generateHash", () => {
    it("should generate a 64-character SHA256 hash", () => {
      const hash = service.generateHash("test-seed");
      expect(hash.length).toBe(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it("should generate deterministic hash for same input", () => {
      const hash1 = service.generateHash("test-seed");
      const hash2 = service.generateHash("test-seed");
      expect(hash1).toBe(hash2);
    });
  });

  describe("calculateCrashPoint", () => {
    it("should return crash point between 1.00 and 10000", () => {
      const hash = "a".repeat(64);
      const crashPoint = service.calculateCrashPoint(hash);
      expect(crashPoint).toBeGreaterThanOrEqual(1);
      expect(crashPoint).toBeLessThanOrEqual(10000);
    });

    it("should return crash point as valid number", () => {
      const hash = "a".repeat(64);
      const crashPoint = service.calculateCrashPoint(hash);
      expect(typeof crashPoint).toBe("number");
    });
  });

  describe("generate round", () => {
    it("should generate valid round data", () => {
      const result = service.generate("test-round-id");

      expect(result.seed).toBeDefined();
      expect(result.hash).toBeDefined();
      expect(result.crashPoint).toBeDefined();
      expect(result.seed.length).toBe(64);
      expect(result.hash.length).toBe(64);
    });

    it("should include roundId in hash generation", () => {
      const result = service.generate("round-1");
      const verification = service.verify(result.seed, "round-1");

      expect(verification.crashPoint).toBe(result.crashPoint);
    });
  });

  describe("verify", () => {
    it("should return verification data with house edge", () => {
      const result = service.generate("round-1");
      const verification = service.verify(result.seed, "round-1");

      expect(verification.seed).toBe(result.seed);
      expect(verification.hash).toBeDefined();
      expect(verification.crashPoint).toBe(result.crashPoint);
      expect(verification.houseEdge).toBe(3);
    });
  });

  describe("verifyCrashPoint", () => {
    it("should return true for correct crash point", () => {
      const result = service.generate("round-1");
      const isValid = service.verifyCrashPoint(result.seed, "round-1", result.crashPoint);

      expect(isValid).toBe(true);
    });

    it("should return false for incorrect crash point", () => {
      const result = service.generate("round-1");
      const isValid = service.verifyCrashPoint(result.seed, "round-1", "1.00");

      expect(isValid).toBe(false);
    });
  });
});

describe("Bet Validation", () => {
  describe("validateBetAmount", () => {
    it("should accept minimum bet amount (100 cents = 1.00)", () => {
      expect(validateBetAmount(100)).toBe(true);
    });

    it("should accept maximum bet amount (100000 cents = 1000.00)", () => {
      expect(validateBetAmount(100000)).toBe(true);
    });

    it("should accept amounts between min and max", () => {
      expect(validateBetAmount(5000)).toBe(true);
      expect(validateBetAmount(50000)).toBe(true);
    });

    it("should reject amount below minimum", () => {
      expect(validateBetAmount(99)).toBe(false);
      expect(validateBetAmount(0)).toBe(false);
      expect(validateBetAmount(-100)).toBe(false);
    });

    it("should reject amount above maximum", () => {
      expect(validateBetAmount(100001)).toBe(false);
      expect(validateBetAmount(200000)).toBe(false);
    });
  });
});