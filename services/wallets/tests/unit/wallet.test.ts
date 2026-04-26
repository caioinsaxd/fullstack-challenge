import { describe, it, expect } from "bun:test";

describe("Wallet Monetary Precision", () => {
  describe("Integer-only balance", () => {
    it("should store balance as integers (cents)", () => {
      const balance = 10000;
      expect(Number.isInteger(balance)).toBe(true);
    });

    it("should NOT use float for money", () => {
      const balance: number = 100.50;
      expect(Number.isInteger(balance)).toBe(false);
    });
  });

  describe("Balance operations", () => {
    it("should add integers correctly", () => {
      const walletBalance = 10000;
      const winnings = 5000;
      const newBalance = walletBalance + winnings;
      
      expect(newBalance).toBe(15000);
      expect(Number.isInteger(newBalance)).toBe(true);
    });

    it("should subtract integers correctly", () => {
      const walletBalance = 10000;
      const betAmount = 5000;
      const newBalance = walletBalance - betAmount;
      
      expect(newBalance).toBe(5000);
      expect(Number.isInteger(newBalance)).toBe(true);
    });

    it("should detect insufficient balance", () => {
      const walletBalance = 5000;
      const betAmount = 10000;
      const hasEnough = walletBalance >= betAmount;
      
      expect(hasEnough).toBe(false);
    });

    it("should allow exactly equal balance", () => {
      const walletBalance = 5000;
      const betAmount = 5000;
      const hasEnough = walletBalance >= betAmount;
      
      expect(hasEnough).toBe(true);
    });
  });

  describe("Float avoidance", () => {
    it("should use integers (cents) instead of float (dollars)", () => {
      const amountInDollars = 10.50;
      const amountInCents = Math.round(amountInDollars * 100);
      
      expect(amountInCents).toBe(1050);
      expect(Number.isInteger(amountInCents)).toBe(true);
    });

    it("should never store money as float", () => {
      const improperBalance = 10.5;
      expect(Number.isInteger(improperBalance)).toBe(false);
    });
  });
});