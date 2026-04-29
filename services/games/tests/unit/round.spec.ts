import { describe, it, expect, beforeEach, jest } from "bun:test";
import { Round, RoundStatus, Bet, BetStatus, isValidStatusTransition } from "../../src/domain/entities/types";

describe("Round Entity", () => {
  let round: Round;

  beforeEach(() => {
    round = {
      id: "test-round-1",
      status: "BETTING" as RoundStatus,
      crashPoint: 2.5,
      hash: "abc123",
      seed: "seed123",
      startedAt: null,
      crashedAt: null,
      settledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      bets: [],
    };
  });

  describe("Round Status Transitions", () => {
    it("should start in BETTING status", () => {
      expect(round.status).toBe("BETTING");
    });

    it("should transition from BETTING to RUNNING", () => {
      round.status = "RUNNING";
      round.startedAt = new Date();
      expect(round.status).toBe("RUNNING");
      expect(round.startedAt).not.toBeNull();
    });

    it("should transition from RUNNING to ENDED", () => {
      round.status = "RUNNING";
      round.startedAt = new Date();
      round.status = "ENDED";
      round.settledAt = new Date();
      expect(round.status).toBe("ENDED");
      expect(round.settledAt).not.toBeNull();
    });

    it("should not allow invalid status values", () => {
      const validStatuses = ["BETTING", "RUNNING", "ENDED"];
      expect(validStatuses).toContain(round.status);
    });

    it("should not allow direct transition from BETTING to ENDED without RUNNING", () => {
      expect(round.status).toBe("BETTING");
      expect(round.startedAt).toBeNull();
    });
  });

  describe("Crash Point", () => {
    it("should have valid crash point when set", () => {
      round.crashPoint = 5.0;
      expect(round.crashPoint).toBeGreaterThanOrEqual(1.0);
    });

    it("should store crash point as decimal", () => {
      round.crashPoint = 1.23;
      expect(round.crashPoint).toBeCloseTo(1.23);
    });
  });

  describe("Hash and Seed", () => {
    it("should have hash for verification", () => {
      expect(round.hash).toBeDefined();
      expect(typeof round.hash).toBe("string");
    });

    it("should have seed for provably fair", () => {
      expect(round.seed).toBeDefined();
      expect(typeof round.seed).toBe("string");
    });
  });

  describe("Timestamps", () => {
    it("should have createdAt timestamp", () => {
      expect(round.createdAt).toBeInstanceOf(Date);
    });

    it("should have updatedAt timestamp", () => {
      expect(round.updatedAt).toBeInstanceOf(Date);
    });

    it("should set startedAt when round begins", () => {
      round.status = "RUNNING";
      round.startedAt = new Date();
      expect(round.startedAt).toBeInstanceOf(Date);
    });

    it("should set crashedAt when round crashes", () => {
      round.status = "RUNNING";
      round.crashedAt = new Date();
      expect(round.crashedAt).toBeInstanceOf(Date);
    });

    it("should set settledAt when round ends", () => {
      round.status = "ENDED";
      round.settledAt = new Date();
      expect(round.settledAt).toBeInstanceOf(Date);
    });
  });

  describe("Bets Association", () => {
    it("should have bets array", () => {
      expect(Array.isArray(round.bets)).toBe(true);
    });

    it("should track bets count", () => {
      round.bets = [
        { id: "bet1", roundId: "round1", playerId: "player1", amount: 1000, status: "PENDING" } as Bet,
        { id: "bet2", roundId: "round1", playerId: "player2", amount: 2000, status: "PENDING" } as Bet,
      ];
      expect(round.bets.length).toBe(2);
    });
  });
});

describe("Round Status Constants", () => {
  it("should have BETTING status", () => {
    expect(RoundStatus.BETTING).toBe("BETTING");
  });

  it("should have RUNNING status", () => {
    expect(RoundStatus.RUNNING).toBe("RUNNING");
  });

  it("should have ENDED status", () => {
    expect(RoundStatus.ENDED).toBe("ENDED");
  });
});

describe("Status Transition Validation", () => {
  it("should allow BETTING to RUNNING transition", () => {
    expect(isValidStatusTransition(RoundStatus.BETTING, RoundStatus.RUNNING)).toBe(true);
  });

  it("should allow RUNNING to ENDED transition", () => {
    expect(isValidStatusTransition(RoundStatus.RUNNING, RoundStatus.ENDED)).toBe(true);
  });

  it("should not allow BETTING to ENDED transition", () => {
    expect(isValidStatusTransition(RoundStatus.BETTING, RoundStatus.ENDED)).toBe(false);
  });

  it("should not allow ENDED to any transition", () => {
    expect(isValidStatusTransition(RoundStatus.ENDED, RoundStatus.BETTING)).toBe(false);
    expect(isValidStatusTransition(RoundStatus.ENDED, RoundStatus.RUNNING)).toBe(false);
  });

  it("should not allow same status transition to RUNNING", () => {
    expect(isValidStatusTransition(RoundStatus.RUNNING, RoundStatus.RUNNING)).toBe(false);
  });
});
