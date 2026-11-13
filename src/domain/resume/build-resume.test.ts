import { describe, expect, it } from "vitest";
import { portfolio } from "@/test/fixtures";
import { UnknownSelectionError, buildResume } from "./build-resume";
import { defaultSelection, type ResumeSelection } from "./selection";

const base = portfolio();

function select(overrides: Partial<ResumeSelection> = {}): ResumeSelection {
  return { ...defaultSelection(base, "en"), ...overrides };
}

describe("defaultSelection", () => {
  it("starts with every skill and only the featured projects", () => {
    const selection = defaultSelection(base, "pt");
    expect(selection.skillIds).toEqual(["python", "analysis", "rust"]);
    expect(selection.projectIds).toEqual(["engine"]);
  });

  it("uses every project when none is featured", () => {
    const noFeatured = portfolio({
      projects: base.projects.map((p) => ({ ...p, featured: false })),
    });
    expect(defaultSelection(noFeatured, "pt").projectIds).toEqual(["engine", "notes"]);
  });
});

describe("buildResume", () => {
  it("localizes text and falls back to Portuguese", () => {
    const resume = buildResume(base, select({ projectIds: ["engine", "notes"] }));
    expect(resume.headline).toBe("Programmer");
    expect(resume.projects.map((p) => p.title)).toEqual(["Analytical engine", "Notas"]);
  });

  it("keeps the order chosen in the selection", () => {
    const resume = buildResume(base, select({ projectIds: ["notes", "engine"] }));
    expect(resume.projects.map((p) => p.title)).toEqual(["Notas", "Analytical engine"]);
  });

  it("groups skills by category in portfolio order and drops empty groups", () => {
    const resume = buildResume(base, select({ skillIds: ["rust", "python"] }));
    expect(resume.skillGroups).toEqual([{ category: "Languages", skills: ["Rust", "Python"] }]);
  });

  it("ignores repeated ids", () => {
    const resume = buildResume(base, select({ projectIds: ["engine", "engine"] }));
    expect(resume.projects).toHaveLength(1);
  });

  it("uses headline and summary written for the application", () => {
    const resume = buildResume(base, select({ headline: "Data Engineer", summary: ["Tailored."] }));
    expect(resume.headline).toBe("Data Engineer");
    expect(resume.summary).toEqual(["Tailored."]);
  });

  it("omits languages when not included", () => {
    expect(buildResume(base, select({ includeLanguages: false })).languages).toEqual([]);
    expect(buildResume(base, select()).languages).toEqual([{ name: "English", level: "native" }]);
  });

  it("reports every unknown id at once", () => {
    const run = () => buildResume(base, select({ skillIds: ["cobol"], projectIds: ["ghost"] }));
    expect(run).toThrow(UnknownSelectionError);
    try {
      run();
    } catch (error) {
      expect((error as UnknownSelectionError).unknown).toEqual([
        { collection: "skills", id: "cobol" },
        { collection: "projects", id: "ghost" },
      ]);
    }
  });
});
