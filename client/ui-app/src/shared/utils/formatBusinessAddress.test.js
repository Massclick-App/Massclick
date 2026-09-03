// Cases are taken from real massClick_dev records so the rules are pinned to
// the data they exist for, not to invented examples.
import {
  formatBusinessAddress,
  formatFullBusinessAddress,
  formatStreetDetail,
  formatExperience,
  getLocalityLabel,
  getAddressWarnings,
  stripLeadingPlotFromStreet,
} from "shared/utils/formatBusinessAddress.js";

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

  it("removes the state left behind once the pincode is stripped", () => {
    // "Tamil Nadu 620007" arrives as a single segment and only looks like the
    // state after its digits are removed.
    expect(
      formatStreetDetail({
        street: "42, Mullai Nagar, Thendral Nagar, Tiruchirappalli, Tamil Nadu 620007",
        pincode: "620007",
      }),
    ).toBe("42, Mullai Nagar, Thendral Nagar, Tiruchirappalli");
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
  it("shows the area and district, not the doorstep", () => {
    expect(formatBusinessAddress(hexahub)).toBe("K.K. Nagar, Tiruchirappalli");
  });

  it("never prints a door, plot, floor or plus-code number", () => {
    expect(formatBusinessAddress({
      plotNumber: "No 343",
      street: "1st Floor, Near Bus Stand",
      masterLocation: { district: "Tiruchirappalli", locality: "Manapparai" },
    })).toBe("Manapparai, Tiruchirappalli");

    expect(formatBusinessAddress({
      plotNumber: "9X6M+C48",
      street: "Mendonsa Colony",
      masterLocation: { district: "Dindigul" },
    })).toBe("Mendonsa Colony, Dindigul");
  });

  it("shows at most two parts", () => {
    const result = formatBusinessAddress({
      plotNumber: "12",
      street: "Cheran Street, Wireless Rd, Thendral Nagar",
      masterLocation: { district: "Tiruchirappalli", locality: "K.K. Nagar" },
    });
    expect(result.split(", ")).toHaveLength(2);
    expect(result).toBe("K.K. Nagar, Tiruchirappalli");
  });

  it("stays within the character budget", () => {
    expect(formatBusinessAddress(hexahub).length).toBeLessThanOrEqual(60);
  });

  it("falls back to street detail when only the district is resolved", () => {
    expect(
      formatBusinessAddress({
        plotNumber: "No 21/1",
        street: "Opposite to SBI Bank",
        masterLocation: { district: "Tiruchirappalli" },
      }),
    ).toBe("Opposite to SBI Bank, Tiruchirappalli");
  });

  it("omits a searched location outside the business hierarchy", () => {
    expect(formatBusinessAddress(hexahub, { searchedLocation: "palpannai junction" })).toBe(
      "K.K. Nagar, Tiruchirappalli",
    );
  });

  it("does not repeat a searched location that is already the locality", () => {
    expect(formatBusinessAddress(hexahub, { searchedLocation: "KK Nagar" })).toBe(
      "K.K. Nagar, Tiruchirappalli",
    );
  });

  it("keeps the two broadest parts when a searched location is inserted", () => {
    const business = {
      plotNumber: "12",
      street: "Mullai Nagar",
      masterLocation: {
        district: "Tiruchirappalli",
        ward: "K.K. Nagar",
        locality: "Thendral Nagar",
      },
    };
    expect(formatBusinessAddress(business, { searchedLocation: "K.K. Nagar" })).toBe(
      "K.K. Nagar, Tiruchirappalli",
    );
  });

  it("does not print the district twice when it resolved only that far", () => {
    expect(
      formatBusinessAddress({
        street: "Asha Towers",
        masterLocation: { district: "Tiruchirappalli", resolvedLevel: "district" },
      }),
    ).toBe("Asha Towers, Tiruchirappalli");
  });

  it("falls back to the tail alone when no street is stored", () => {
    expect(
      formatBusinessAddress({ street: "", masterLocation: { district: "Salem", locality: "Hasthampatti" } }),
    ).toBe("Hasthampatti, Salem");
  });

  it("returns empty rather than a placeholder when nothing is known", () => {
    expect(formatBusinessAddress({ street: "-", plotNumber: "-", masterLocation: null })).toBe("");
  });

  it("prefers real street detail over the free-text location field", () => {
    expect(formatBusinessAddress({ street: "Main Rd", location: "Trichy", masterLocation: null })).toBe(
      "Main Rd",
    );
  });

  it("falls back to the legacy location only when nothing else survives", () => {
    // Door number filtered away, no street, no resolved hierarchy — without
    // this the card would show no location at all.
    expect(
      formatBusinessAddress({ plotNumber: "918", street: "", location: "Devakottai", masterLocation: null }),
    ).toBe("Devakottai");
  });

  it("keeps a locality whose real name contains a number", () => {
    // "Thillai Nagar 5th Cross" is the locality's actual name, not a door
    // number: the digit filter applies to street detail only.
    expect(
      formatBusinessAddress({
        street: "5th Cross Rd E, near SRINIVAS HOSPITAL",
        masterLocation: { district: "Tiruchirappalli", locality: "Thillai Nagar 5th Cross" },
      }),
    ).toBe("Thillai Nagar 5th Cross, Tiruchirappalli");
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
  const messagesFor = (business, field) =>
    getAddressWarnings(business)
      .filter((w) => w.field === field)
      .map((w) => w.message);

  const linked = { locationId: "abc", district: "Tiruchirappalli", locality: "K.K. Nagar" };

  it("flags a missing verified location, the thing the card depends on", () => {
    expect(messagesFor({ street: "Mullai Nagar", pincode: "620007" }, "masterLocation")).toEqual([
      expect.stringContaining("No verified location linked"),
    ]);
    expect(messagesFor({ street: "Mullai Nagar", pincode: "620007", masterLocation: linked }, "masterLocation")).toEqual([]);
  });

  it("flags a street that repeats the plot number", () => {
    expect(messagesFor(hexahub, "street")).toEqual(
      expect.arrayContaining([expect.stringContaining("repeats the plot number")]),
    );
  });

  it("flags pasted state, country and pincode text", () => {
    const messages = messagesFor(
      { street: "Morais City New Street, Trichy-620007, Tamil Nadu", pincode: "620007", masterLocation: linked },
      "street",
    );
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringContaining("state and country"),
        expect.stringContaining("Remove the pincode"),
      ]),
    );
  });

  it("flags a district repeated in the street", () => {
    expect(
      messagesFor({ street: "2nd Cross, Anna Nagar, Tiruchirappalli", pincode: "620018", masterLocation: linked }, "street"),
    ).toEqual(expect.arrayContaining([expect.stringContaining("Tiruchirappalli")]));
  });

  it("flags a full address pasted into the plot number field", () => {
    expect(
      messagesFor({ plotNumber: "12, Mullai Nagar, Thendral Nagar", street: "X", pincode: "620007", masterLocation: linked }, "plotNumber"),
    ).toEqual([expect.stringContaining("full address")]);
  });

  it("requires a six-digit pincode", () => {
    expect(messagesFor({ street: "X", masterLocation: linked }, "pincode")).toEqual([
      expect.stringContaining("required"),
    ]);
    expect(messagesFor({ street: "X", pincode: "62000", masterLocation: linked }, "pincode")).toEqual([
      expect.stringContaining("exactly 6 digits"),
    ]);
  });

  it("flags non-numeric experience while it is being typed", () => {
    expect(messagesFor({ street: "X", pincode: "620007", experience: "++", masterLocation: linked }, "experience")).toEqual([
      expect.stringContaining("number of years"),
    ]);
    expect(messagesFor({ street: "X", pincode: "620007", experience: "12", masterLocation: linked }, "experience")).toEqual([]);
  });

  it("stays completely quiet on a clean record", () => {
    expect(
      getAddressWarnings({
        plotNumber: "12",
        street: "Mullai Nagar",
        pincode: "620007",
        experience: "12",
        masterLocation: linked,
      }),
    ).toEqual([]);
  });

  it("returns a level with every message so the form can style it", () => {
    for (const warning of getAddressWarnings({})) {
      expect(["error", "warn", "info"]).toContain(warning.level);
      expect(typeof warning.field).toBe("string");
    }
  });
});

describe("stripLeadingPlotFromStreet", () => {
  it("removes a plot number repeated at the head of the street", () => {
    expect(stripLeadingPlotFromStreet("42", "42, Mullai Nagar, Thendral Nagar")).toBe(
      "Mullai Nagar, Thendral Nagar",
    );
  });

  it("matches across punctuation and spacing differences", () => {
    expect(stripLeadingPlotFromStreet("No.D-41", "No.D-41,7th Cross West")).toBe("7th Cross West");
    expect(stripLeadingPlotFromStreet("No 34B", "No 34B,Ramakrishna Nagar, Karumandapam")).toBe(
      "Ramakrishna Nagar, Karumandapam",
    );
  });

  it("leaves a plot number that appears mid-street alone", () => {
    expect(stripLeadingPlotFromStreet("63", "Muthaiya mahal, 63, Wireless Rd, opp")).toBeNull();
  });

  it("leaves the record alone when stripping would empty the street", () => {
    const whole = "Vayalur Rd, Srinivase Nagar North, p.o, Puthur, Srinivasa Nagar";
    expect(stripLeadingPlotFromStreet(whole, whole)).toBeNull();
  });

  it("leaves the space-separated form alone", () => {
    // Deliberate: "9/21 MANICKKAPURAM" cannot be told apart from a street name
    // that legitimately starts with a number, and stripping it mangled real
    // records ("1st Floor, Phase 1" -> "Floor, Phase 1"). See stripPlotPrefix.
    expect(stripLeadingPlotFromStreet("9/21", "9/21 MANICKKAPURAM, STREET")).toBeNull();
    expect(stripLeadingPlotFromStreet("1st", "1st Floor, Phase 1, Dwaraka Nagar")).toBeNull();
    expect(stripLeadingPlotFromStreet("1", "1st St, Charles Nagar, Palace Nagar")).toBeNull();
    expect(stripLeadingPlotFromStreet("No 103", "No 103 C, Tamil Sangam Rd")).toBeNull();
  });

  it("leaves a near-miss plot number alone", () => {
    // "NO: 42" against "NO: 42-A" is a different door, not a duplicate.
    expect(stripLeadingPlotFromStreet("NO: 42", "NO: 42-A, Singarathope Street")).toBeNull();
  });

  it("does nothing without a usable plot number", () => {
    expect(stripLeadingPlotFromStreet("", "Mullai Nagar")).toBeNull();
    expect(stripLeadingPlotFromStreet("-", "Mullai Nagar")).toBeNull();
  });

  it("does not change what the card renders", () => {
    const before = { plotNumber: "42", street: "42, Mullai Nagar, Thendral Nagar" };
    const after = { plotNumber: "42", street: stripLeadingPlotFromStreet("42", before.street) };
    expect(formatStreetDetail(after)).toBe(formatStreetDetail(before));
  });
});
