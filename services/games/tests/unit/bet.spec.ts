import { describe, it, expect, beforeEach } from "bun:test";
import {
  Bet,
  BetStatus,
  calculatePayout,
  calculateProfit,
  validateBetAmount,
} from "../../src/domain/entities/types";

describe("Bet Entity", () => {
  let bet: Bet;

  beforeEach(() => {
    bet = {
      id: "bet-1",
      roundId: "round-1",
      playerId: "player-1",
      amount: 1000,
      status: "PENDING" as BetStatus,
      cashoutMultiplier: null,
      cashoutedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  describe("Bet Status Transitions", () => {
    it("should start in PENDING status", () => {
      expect(bet.status).toBe("PENDING");
    });

    it("should transition from PENDING to CASHED_OUT", () => {
      bet.status = "CASHED_OUT" as BetStatus;
      bet.cashoutMultiplier = 2.5;
      bet.cashoutedAt = new Date();
      expect(bet.status).toBe("CASHED_OUT");
      expect(bet.cashoutMultiplier).toBe(2.5);
      expect(bet.cashoutedAt).not.toBeNull();
    });

    it("should transition from PENDING to LOST", () => {
      bet.status = "LOST" as BetStatus;
      expect(bet.status).toBe("LOST");
    });

    it("should not allow transition from CASHED_OUT to LOST", () => {
      bet.status = "CASHED_OUT" as BetStatus;
      bet.cashoutMultiplier = 2.0;
      expect(bet.status).not.toBe("LOST");
    });
  });

  describe("Bet Amount Validation", () => {
    it("should accept minimum bet amount (100 cents = 1.00)", () => {
      expect(validateBetAmount(100)).toBe(true);
    });

    it("should accept maximum bet amount (100000 cents = 1000.00)", () => {
      expect(validateBetAmount(100000)).toBe(true);
    });

    it("should accept amounts between min and max", () => {
      expect(validateBetAmount(5000)).toBe(true);
      expect(validateBetAmount(50000)).toBe(true);
      expect(validateBetAmount(100)).toBe(true);
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

  describe("Payout Calculation", () => {
    it("should calculate payout for cashed out bet", () => {
      bet.status = "CASHED_OUT" as BetStatus;
      bet.amount = 1000;
      bet.cashoutMultiplier = 2.5;
      const payout = calculatePayout(bet);
      expect(payout).toBe(2500);
    });

    it("should calculate payout with zero multiplier", () => {
      bet.status = "CASHED_OUT" as BetStatus;
      bet.amount = 1000;
      bet.cashoutMultiplier = 1.0;
      const payout = calculatePayout(bet);
      expect(payout).toBe(1000);
    });

    it("should return 0 for pending bet", () => {
      bet.status = "PENDING" as BetStatus;
      bet.amount = 1000;
      const payout = calculatePayout(bet);
      expect(payout).toBe(0);
    });

    it("should return 0 for lost bet", () => {
      bet.status = "LOST" as BetStatus;
      bet.amount = 1000;
      const payout = calculatePayout(bet);
      expect(payout).toBe(0);
    });

    it("should return 0 when cashoutMultiplier is null", () => {
      bet.status = "CASHED_OUT" as BetStatus;
      bet.amount = 1000;
      bet.cashoutMultiplier = null;
      const payout = calculatePayout(bet);
      expect(payout).toBe(0);
    });
  });

  describe("Profit Calculation", () => {
    it("should calculate positive profit for winning bet", () => {
      bet.status = "CASHED_OUT" as BetStatus;
      bet.amount = 1000;
      bet.cashoutMultiplier = 2.0;
      const profit = calculateProfit(bet);
      expect(profit).toBe(1000);
    });

    it("should calculate zero profit for break-even bet", () => {
      bet.status = "CASHED_OUT" as BetStatus;
      bet.amount = 1000;
      bet.cashoutMultiplier = 1.0;
      const profit = calculateProfit(bet);
      expect(profit).toBe(0);
    });

    it("should calculate negative profit (loss) for lost bet", () => {
      bet.status = "LOST" as BetStatus;
      bet.amount = 1000;
      const profit = calculateProfit(bet);
      expect(profit).toBe(-1000);
    });

    it("should return negative bet amount for pending bet", () => {
      bet.status = "PENDING" as BetStatus;
      bet.amount = 1000;
      const profit = calculateProfit(bet);
      expect(profit).toBe(-1000);
    });
  });

  describe("Cashout Multiplier", () => {
    it("should store cashout multiplier when cashed out", () => {
      bet.status = "CASHED_OUT" as BetStatus;
      bet.cashoutMultiplier = 3.75;
      expect(bet.cashoutMultiplier).toBeCloseTo(3.75);
    });

    it("should be null before cashout", () => {
      expect(bet.cashoutMultiplier).toBeNull();
    });

    it("should record cashout timestamp", () => {
      bet.status = "CASHED_OUT" as BetStatus;
      const cashoutTime = new Date();
      bet.cashoutedAt = cashoutTime;
      expect(bet.cashoutedAt).toEqual(cashoutTime);
    });
  });

  describe("Player and Round Association", () => {
    it("should have playerId", () => {
      expect(bet.playerId).toBeDefined();
      expect(typeof bet.playerId).toBe("string");
    });

    it("should have roundId", () => {
      expect(bet.roundId).toBeDefined();
      expect(typeof bet.roundId).toBe("string");
    });

    it("should have unique id", () => {
      expect(bet.id).toBeDefined();
      expect(bet.id).toBe("bet-1");
    });
  });

  describe("Timestamps", () => {
    it("should have createdAt timestamp", () => {
      expect(bet.createdAt).toBeInstanceOf(Date);
    });

    it("should have updatedAt timestamp", () => {
      expect(bet.updatedAt).toBeInstanceOf(Date);
    });
  });
});

describe("BetStatus Constants", () => {
  it("should have PENDING status", () => {
    expect(BetStatus.PENDING).toBe("PENDING");
  });

  it("should have CASHED_OUT status", () => {
    expect(BetStatus.CASHED_OUT).toBe("CASHED_OUT");
  });

  it("should have LOST status", () => {
    expect(BetStatus.LOST).toBe("LOST");
  });
});
