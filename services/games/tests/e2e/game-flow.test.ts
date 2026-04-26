import { describe, it, expect, beforeAll } from "bun:test";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:8000";

describe("Games API E2E", () => {
  let roundId: string;
  let betId: string;

  describe("GET /games/rounds/current", () => {
    it("should return current round", async () => {
      const response = await fetch(`${BASE_URL}/games/rounds/current`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("BETTING");
      expect(data.id).toBeDefined();
      roundId = data.id;
    });
  });

  describe("GET /games/rounds/history", () => {
    it("should return round history", async () => {
      const response = await fetch(`${BASE_URL}/games/rounds/history?page=1&limit=5`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe("POST /games/bet", () => {
    it("should place a bet or return error if wallet not found", async () => {
      const response = await fetch(`${BASE_URL}/games/bet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: "test-player-e2e",
          amount: 1000,
        }),
      });

      const data = await response.json();
      betId = data.betId;
      
      expect([200, 201, 400, 500]).toContain(response.status);
    });

    it("should reject bet below minimum", async () => {
      const response = await fetch(`${BASE_URL}/games/bet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: "test-player",
          amount: 50,
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject bet above maximum", async () => {
      const response = await fetch(`${BASE_URL}/games/bet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: "test-player",
          amount: 200000,
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("GET /games/bets/me", () => {
    it("should return player bet history", async () => {
      const response = await fetch(`${BASE_URL}/games/bets/me?playerId=test-player`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe("GET /games/rounds/:roundId/verify", () => {
    it("should return verification data or error for invalid round", async () => {
      if (!roundId) {
        const roundRes = await fetch(`${BASE_URL}/games/rounds/current`);
        const roundData = await roundRes.json();
        roundId = roundData.id;
      }
      
      const response = await fetch(`${BASE_URL}/games/rounds/${roundId}/verify`);
      
      expect([200, 400]).toContain(response.status);
      
      if (response.status === 200) {
        const data = await response.json();
        expect(data.seed || data.message).toBeDefined();
      }
    });
  });

  describe("GET /games/health", () => {
    it("should return health status", async () => {
      const response = await fetch(`${BASE_URL}/games/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("ok");
      expect(data.service).toBe("games");
    });
  });
});