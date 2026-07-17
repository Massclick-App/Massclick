const normalizeBusinessSortValue = (value = "") =>
  String(value).trim().toLowerCase();

const toBusinessSortTimestamp = (value) => {
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const sortBusinessesForDefaultSearch = (
  businesses = [],
  category = "",
  locationSlugPrefix = "",
) => {
  const normalizedCategory = normalizeBusinessSortValue(category);
  const normalizedLocationSlugPrefix =
    normalizeBusinessSortValue(locationSlugPrefix);
  const hasLocationPrefix = (business) => {
    if (!normalizedLocationSlugPrefix) return false;
    const businessSlug = normalizeBusinessSortValue(
      business?.masterLocation?.slug,
    );
    return (
      businessSlug === normalizedLocationSlugPrefix ||
      businessSlug.startsWith(`${normalizedLocationSlugPrefix}-`)
    );
  };

  return [...businesses].sort((left, right) => {
    const verifiedDifference =
      Number(Boolean(right?.verification?.isVerified)) -
      Number(Boolean(left?.verification?.isVerified));
    if (verifiedDifference !== 0) return verifiedDifference;

    const leftCategoryPriority =
      normalizeBusinessSortValue(left?.category) === normalizedCategory ? 1 : 0;
    const rightCategoryPriority =
      normalizeBusinessSortValue(right?.category) === normalizedCategory
        ? 1
        : 0;
    if (rightCategoryPriority !== leftCategoryPriority) {
      return rightCategoryPriority - leftCategoryPriority;
    }

    const locationDifference =
      Number(hasLocationPrefix(right)) - Number(hasLocationPrefix(left));
    if (locationDifference !== 0) return locationDifference;

    const paidDifference =
      Number(Boolean(right?.amountPaid)) - Number(Boolean(left?.amountPaid));
    if (paidDifference !== 0) return paidDifference;

    const paidDateDifference =
      toBusinessSortTimestamp(right?.paidDate) -
      toBusinessSortTimestamp(left?.paidDate);
    if (paidDateDifference !== 0) return paidDateDifference;

    return (
      toBusinessSortTimestamp(right?.createdAt) -
      toBusinessSortTimestamp(left?.createdAt)
    );
  });
};
