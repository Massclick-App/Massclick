import { buildCategoryPath } from "./searchResultNavigation";

describe("buildCategoryPath", () => {
  it("keeps ancestor segments for nested district location category pages", () => {
    expect(
      buildCategoryPath({
        districtSlug: "trichy",
        locationPath: "golden-rock/airport-area/tvs-tolgate",
        categorySlug: "restaurants",
      }),
    ).toBe("/trichy/golden-rock/airport-area/restaurants-in-tvs-tolgate");
  });

  it("uses the district-wide category URL when no specific location is resolved", () => {
    expect(
      buildCategoryPath({
        districtSlug: "trichy",
        categorySlug: "restaurants",
        isDistrictScope: true,
      }),
    ).toBe("/trichy/restaurants");
  });
});
