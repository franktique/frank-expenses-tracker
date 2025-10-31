import { TIPO_GASTO_VALUES, TIPO_GASTO_LABELS, CreateCategorySchema, UpdateCategorySchema } from "@/types/funds";

describe("Tipo Gasto Types and Validation", () => {
  describe("TIPO_GASTO_VALUES", () => {
    it("should have correct constant values", () => {
      expect(TIPO_GASTO_VALUES.FIJO).toBe("F");
      expect(TIPO_GASTO_VALUES.VARIABLE).toBe("V");
      expect(TIPO_GASTO_VALUES.SEMI_FIJO).toBe("SF");
      expect(TIPO_GASTO_VALUES.EVENTUAL).toBe("E");
    });

    it("should have exactly 4 expense type values", () => {
      const values = Object.values(TIPO_GASTO_VALUES);
      expect(values).toHaveLength(4);
      expect(values).toContain("F");
      expect(values).toContain("V");
      expect(values).toContain("SF");
      expect(values).toContain("E");
    });
  });

  describe("TIPO_GASTO_LABELS", () => {
    it("should have correct labels for each type", () => {
      expect(TIPO_GASTO_LABELS.F).toBe("Fijo");
      expect(TIPO_GASTO_LABELS.V).toBe("Variable");
      expect(TIPO_GASTO_LABELS.SF).toBe("Semi Fijo");
    });

    it("should have labels for all expense types", () => {
      Object.values(TIPO_GASTO_VALUES).forEach((tipo) => {
        expect(TIPO_GASTO_LABELS[tipo as keyof typeof TIPO_GASTO_LABELS]).toBeDefined();
      });
    });
  });

  describe("CreateCategorySchema validation", () => {
    it("should accept valid tipo_gasto values", () => {
      const validData = {
        name: "Test Category",
        tipo_gasto: "F",
      };
      const result = CreateCategorySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept tipo_gasto as V (Variable)", () => {
      const validData = {
        name: "Test Category",
        tipo_gasto: "V",
      };
      const result = CreateCategorySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept tipo_gasto as SF (Semi Fijo)", () => {
      const validData = {
        name: "Test Category",
        tipo_gasto: "SF",
      };
      const result = CreateCategorySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept tipo_gasto as E (Eventual)", () => {
      const validData = {
        name: "Test Category",
        tipo_gasto: "E",
      };
      const result = CreateCategorySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should allow missing tipo_gasto (optional)", () => {
      const validData = {
        name: "Test Category",
      };
      const result = CreateCategorySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject invalid tipo_gasto values", () => {
      const invalidData = {
        name: "Test Category",
        tipo_gasto: "X",
      };
      const result = CreateCategorySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject null as tipo_gasto when explicitly set", () => {
      const invalidData = {
        name: "Test Category",
        tipo_gasto: null,
      };
      const result = CreateCategorySchema.safeParse(invalidData);
      // Null should be rejected since we specify enum values
      expect(result.success).toBe(false);
    });
  });

  describe("UpdateCategorySchema validation", () => {
    it("should accept valid tipo_gasto in updates", () => {
      const validData = {
        tipo_gasto: "V",
      };
      const result = UpdateCategorySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should allow partial updates with tipo_gasto", () => {
      const validData = {
        name: "Updated Name",
        tipo_gasto: "SF",
      };
      const result = UpdateCategorySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should allow updates with only tipo_gasto", () => {
      const validData = {
        tipo_gasto: "F",
      };
      const result = UpdateCategorySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should allow empty updates for tipo_gasto", () => {
      const validData = {};
      const result = UpdateCategorySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject invalid tipo_gasto in updates", () => {
      const invalidData = {
        tipo_gasto: "INVALID",
      };
      const result = UpdateCategorySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("Integration scenarios", () => {
    it("should validate a complete category creation with all fields", () => {
      const completeData = {
        name: "Utilities",
        fund_ids: ["fund-123"],
        tipo_gasto: "F",
      };
      const result = CreateCategorySchema.safeParse(completeData);
      expect(result.success).toBe(true);
    });

    it("should validate mixed updates with type and funds", () => {
      const mixedUpdate = {
        name: "Updated Utilities",
        fund_ids: ["fund-456"],
        tipo_gasto: "SF",
      };
      const result = UpdateCategorySchema.safeParse(mixedUpdate);
      expect(result.success).toBe(true);
    });

    it("should handle all four expense types in different requests", () => {
      const tipos: Array<"F" | "V" | "SF" | "E"> = ["F", "V", "SF", "E"];

      tipos.forEach((tipo) => {
        const data = {
          name: `Category for ${tipo}`,
          tipo_gasto: tipo,
        };
        const result = CreateCategorySchema.safeParse(data);
        expect(result.success).toBe(true);
        expect(result.data?.tipo_gasto).toBe(tipo);
      });
    });
  });
});
