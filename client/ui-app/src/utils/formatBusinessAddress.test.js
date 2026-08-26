// Cases are taken from real massClick_dev records so the rules are pinned to
// the data they exist for, not to invented examples.
import {
  formatBusinessAddress,
  formatFullBusinessAddress,
  formatStreetDetail,
  formatExperience,
  getLocalityLabel,
  getAddressWarnings,
} from "./formatBusinessAddress";

const hexahub = {
  businessName: "hexahub homestay and hospitality services",
  plotNumber: "42",
  street: "42, Mullai Nagar, Thendral Nagar",
  pincode: "620007",
  location: "Trichy",
  masterLocation: {
    district: "Tiruchirappalli",
    zone: "K. Abishekapuram",
    ward: "K.K. Nagar",
    locality: "K.K. Nagar",
    resolvedLevel: "locality",
  },
};

describe("formatStreetDetail", () => {
  it("drops a plot number the street already repeats", () => {
    expect(formatStreetDetail(hexahub)).toBe("42, Mullai Nagar, Thendral Nagar");
  });

  it("keeps a plot number the street does not carry", () => {
    expect(
      formatStreetDetail({ plotNumber: "5686", street: "2nd St, Santhanathapuram, Pudukkottai" }),
    ).toBe("5686, 2nd St, Santhanathapuram, Pudukkottai");
  });

  it("treats placeholder plot numbers as empty", () => {
    expect(formatStreetDetail({ plotNumber: "-", street: "75/2, Thuraiyur Rd, Natarajapuram" })).toBe(
      "75/2, Thuraiyur Rd, Natarajapuram",
    );
  });

  it("strips the pasted Google state/pincode tail", () => {
    expect(
      formatStreetDetail({
        street: "Morais City New Street, Ponmalai Patti, Trichy-620007, Tamil Nadu",
        pincode: "620007",
      }),
    ).toBe("Morais City New Street, Ponmalai Patti, Trichy");
  });

  it("removes trailing commas and stray whitespace", () => {
    expect(formatStreetDetail({ street: "Naadi Muthu Nagar,Near Gandhi garden, " })).toBe(
      "Naadi Muthu Nagar, Near Gandhi garden",
    );
  });

  it("collapses empty comma segments", () => {
    expect(formatStreetDetail({ street: "Chennai Bypass Road Ariyamangalam Area,, Old Palpannai" })).toBe(
      "Chennai Bypass Road Ariyamangalam Area, Old Palpannai",
    );
  });

  it("de-duplicates a street that repeats itself", () => {
    expect(
      formatStreetDetail({
        street:
          "Vayalur Rd, Srinivase Nagar North, p.o, Puthur, Srinivasa Nagar, Vayalur Rd, Srinivase Nagar North, p.o, Puthur, Srinivasa Nagar",
      }),
    ).toBe("Vayalur Rd, Srinivase Nagar North, p.o, Puthur, Srinivasa Nagar");
  });

  it("returns empty when nothing usable is stored", () => {
    expect(formatStreetDetail({ plotNumber: "-", street: "" })).toBe("");
  });
});

describe("formatBusinessAddress", () => {
  it("replaces the bare district label with a real address", () => {
    expect(formatBusinessAddress(hexahub)).toBe("42, Mullai Nagar, K.K. Nagar, Tiruchirappalli");
  });

  it("stays within the character budget", () => {
    expect(formatBusinessAddress(hexahub).length).toBeLessThanOrEqual(60);
  });

  it("keeps the tail intact and trims street detail from the right", () => {
    const long = {
      plotNumber: "No.19/201",
      street:
        "V.V.V Mahal, 2nd Floor, Ponnagar Extension, Near Vvv Theatre, Trichy Dindugal Road, Ponnagar",
      masterLocation: { district: "Tiruchirappalli", locality: "Ponmalai" },
    };
    const result = formatBusinessAddress(long);
    expect(result.length).toBeLessThanOrEqual(60);
    expect(result.endsWith("Ponmalai, Tiruchirappalli")).toBe(true);
  });

  it("omits a searched location outside the business hierarchy", () => {
    expect(formatBusinessAddress(hexahub, { searchedLocation: "palpannai junction" })).toBe(
      "42, Mullai Nagar, K.K. Nagar, Tiruchirappalli",
    );
  });

  it("does not repeat a searched location that is already the locality", () => {
    expect(formatBusinessAddress(hexahub, { searchedLocation: "KK Nagar" })).toBe(
      "42, Mullai Nagar, K.K. Nagar, Tiruchirappalli",
    );
  });

  it("inserts a searched location that sits between locality and district", () => {
    const business = {
      plotNumber: "12",
      street: "Mullai Nagar",
      masterLocation: {
        district: "Tiruchirappalli",
        zone: "K. Abishekapuram",
        ward: "K.K. Nagar",
        locality: "Thendral Nagar",
      },
    };
    // Budget raised so this pins the ordering rule, not the truncation rule.
    expect(formatBusinessAddress(business, { searchedLocation: "K.K. Nagar", maxLength: 80 })).toBe(
      "12, Mullai Nagar, Thendral Nagar, K.K. Nagar, Tiruchirappalli",
    );
  });

  it("drops a street segment the tail already states", () => {
    expect(
      formatBusinessAddress({
        street: "2nd Cross, Anna Nagar, Tennur, Tiruchirappalli",
        masterLocation: { district: "Tiruchirappalli", locality: "Tennur" },
      }),
    ).toBe("2nd Cross, Anna Nagar, Tennur, Tiruchirappalli");
  });

  it("keeps the door number and drops broad area names when over budget", () => {
    expect(formatBusinessAddress(hexahub)).toMatch(/^42, /);
  });

  it("does not print the district twice when it resolved only that far", () => {
    expect(
      formatBusinessAddress({
        street: "Asha Towers, 4th Floor",
        masterLocation: { district: "Tiruchirappalli", resolvedLevel: "district" },
      }),
    ).toBe("Asha Towers, 4th Floor, Tiruchirappalli");
  });

  it("falls back to the tail alone when no street is stored", () => {
    expect(
      formatBusinessAddress({ street: "", masterLocation: { district: "Salem", locality: "Hasthampatti" } }),
    ).toBe("Hasthampatti, Salem");
  });

  it("returns empty rather than a placeholder when nothing is known", () => {
    expect(formatBusinessAddress({ street: "-", plotNumber: "-", masterLocation: null })).toBe("");
  });

  it("never uses the free-text location field", () => {
    expect(formatBusinessAddress({ street: "Main Rd", location: "Trichy", masterLocation: null })).toBe(
      "Main Rd",
    );
  });
});

describe("formatFullBusinessAddress", () => {
  it("gives the detail page everything, with the pincode", () => {
    expect(formatFullBusinessAddress(hexahub)).toBe(
      "42, Mullai Nagar, Thendral Nagar, K.K. Nagar, Tiruchirappalli - 620007",
    );
  });

  it("omits a malformed pincode", () => {
    expect(
      formatFullBusinessAddress({ street: "Main Rd", pincode: "6212116", masterLocation: { district: "Salem" } }),
    ).toBe("Main Rd, Salem");
  });
});

describe("getLocalityLabel", () => {
  it("prefers locality, then ward, then zone", () => {
    expect(getLocalityLabel({ masterLocation: { locality: "A", ward: "B", zone: "C" } })).toBe("A");
    expect(getLocalityLabel({ masterLocation: { ward: "B", zone: "C" } })).toBe("B");
    expect(getLocalityLabel({ masterLocation: { zone: "C" } })).toBe("C");
    expect(getLocalityLabel({ masterLocation: null })).toBe("");
  });
});

describe("formatExperience", () => {
  it.each([
    ["++", null],
    ["+", null],
    ["-", null],
    ["", null],
    [null, null],
    [undefined, null],
    ["7", "7"],
    ["10+", "10"],
    ["15+", "15"],
    ["0", null],
    ["2015", null],
    // Genuinely old businesses exist in the data (a post office at 150 years,
    // a Bosch store at 140); only implausible values are rejected.
    ["140+", "140"],
    ["150", "150"],
    ["9944972444", null],
  ])("maps %p to %p", (input, expected) => {
    expect(formatExperience(input)).toBe(expected);
  });
});

describe("getAddressWarnings", () => {
  it("flags a street that repeats the plot number", () => {
    expect(getAddressWarnings(hexahub)).toEqual(
      expect.arrayContaining([expect.stringContaining("plot number")]),
    );
  });

  it("flags pasted state and pincode text", () => {
    const warnings = getAddressWarnings({
      street: "Morais City New Street, Trichy-620007, Tamil Nadu",
      pincode: "620007",
    });
    expect(warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("state or country"),
        expect.stringContaining("pincode"),
      ]),
    );
  });

  it("stays quiet on a clean record", () => {
    expect(
      getAddressWarnings({
        plotNumber: "12",
        street: "Mullai Nagar",
        pincode: "620007",
        masterLocation: { district: "Tiruchirappalli" },
      }),
    ).toEqual([]);
  });
});
