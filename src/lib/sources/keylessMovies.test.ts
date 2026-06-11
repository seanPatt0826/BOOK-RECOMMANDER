import { describe, it, expect } from "vitest";
import { yearFrom } from "./keylessMovies";

describe("yearFrom", () => {
  it("prefers the (YYYY film) disambiguator in the title", () => {
    expect(yearFrom("Bad Man (2025 film)", "any text 1999 here")).toBe("2025");
    expect(yearFrom("Oppenheimer (2023 film series)", "")).toBe("2023");
  });

  it("reads the release year from the canonical 'is a YYYY … film' intro", () => {
    expect(
      yearFrom(
        "Dog Man",
        "Dog Man is a 2025 American animated superhero comedy film based on " +
          "Dav Pilkey's graphic novel series, the first of which appeared in 2016.",
      ),
    ).toBe("2025");
  });

  it("ignores an earlier source-material year that appears first", () => {
    expect(
      yearFrom(
        "Some Adaptation",
        "Some Adaptation, based on the 1999 novel of the same name, is a " +
          "2024 American drama film directed by someone.",
      ),
    ).toBe("2024");
  });

  it("handles a nationality word before the year", () => {
    expect(yearFrom("Foo", "Foo is an American 2019 thriller film.")).toBe(
      "2019",
    );
  });

  it("falls back to the first year when there is no 'is a … film' phrasing", () => {
    expect(
      yearFrom(
        "Dog Star Man",
        "Dog Star Man is a series of short experimental films released in " +
          "installments between 1961 and 1964.",
      ),
    ).toBe("1961");
  });

  it("returns null when no year is present", () => {
    expect(yearFrom("Untitled", "No dates mentioned at all.")).toBeNull();
    expect(yearFrom("Untitled")).toBeNull();
  });
});
