import { describe, expect, it } from "vitest";
import { portfolio } from "@/test/fixtures";
import { THEME_IDS, buildCatalog, shelfSlots } from "./catalog";

const labels = {
  themes: {
    research: { title: "Research", subtitle: "Papers" },
    experience: { title: "Experience", subtitle: "Roles" },
    skills: { title: "Skills", subtitle: "Tools" },
    contact: { title: "Contact", subtitle: "Write to me" },
  },
  kinds: { personal: "Personal", academic: "Academic", research: "Research", professional: "Professional" },
};

const base = portfolio();
const catalog = buildCatalog(base, "en", labels);

describe("buildCatalog", () => {
  it("presses one record per project, then one per theme", () => {
    expect(catalog.map((r) => r.id)).toEqual(["engine", "notes", ...THEME_IDS]);
    expect(catalog.map((r) => r.kind)).toEqual(["project", "project", "theme", "theme", "theme", "theme"]);
  });

  it("numbers the catalogue in order", () => {
    expect(catalog.map((r) => r.catalog)).toEqual(["ES-001", "ES-002", "ES-003", "ES-004", "ES-005", "ES-006"]);
  });

  it("uses a project's highlights as its track list and links to its page", () => {
    const engine = catalog.find((r) => r.id === "engine")!;
    expect(engine.title).toBe("Analytical engine");
    expect(engine.subtitle).toBe("Research");
    expect(engine.tracks).toEqual([{ title: "First algorithm" }]);
    expect(engine.href).toBe("/en/projects/engine");
  });

  it("lists roles, newest first, on the experience record", () => {
    const experience = catalog.find((r) => r.id === "experience")!;
    expect(experience.tracks).toEqual([{ title: "Collaborator · Babbage & Co" }]);
  });

  it("keeps the phone number off the contact record", () => {
    const contact = catalog.find((r) => r.id === "contact")!;
    expect(contact.tracks.map((t) => t.title)).toEqual(["ada@example.com"]);
  });

  it("uses the shorter part of a long title for the cover", () => {
    const longTitle = portfolio({
      projects: [{ ...base.projects[0], title: { pt: "DLG / lab: vazamento", en: "DLG / lab: leakage" } }],
    });
    expect(buildCatalog(longTitle, "en", labels)[0].title).toBe("DLG / lab");
  });
});

describe("shelfSlots", () => {
  it("is centred and leaves a gap between projects and themes", () => {
    const slots = shelfSlots(catalog, 0.1, 0.5);
    expect(slots[0] + slots[slots.length - 1]).toBeCloseTo(0);
    expect(slots[1] - slots[0]).toBeCloseTo(0.1);
    expect(slots[2] - slots[1]).toBeCloseTo(0.6);
  });
});
