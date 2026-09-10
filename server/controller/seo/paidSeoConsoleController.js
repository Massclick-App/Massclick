import {
  getPaidSeoOverview,
  getPaidSeoCategoryDetail,
  getPaidSeoGaps,
  getPaidSeoConflicts,
  upsertPaidSeoRow,
  updatePaidBusinessSeo,
  updateProtectedTerms,
  fixPaidSeoConflict,
  refreshPaidSeoCache,
} from "../../helper/seo/paidSeoConsoleHelper.js";
import { BAD_REQUEST } from "../../errorCodes.js";

const handle = (fn) => async (req, res) => {
  try {
    res.send(await fn(req));
  } catch (error) {
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const paidSeoOverviewAction = handle(() => getPaidSeoOverview());
export const paidSeoCategoryDetailAction = handle((req) => getPaidSeoCategoryDetail(req.params.slug));
export const paidSeoGapsAction = handle(async () => ({ data: await getPaidSeoGaps() }));
export const paidSeoConflictsAction = handle(async () => ({ data: await getPaidSeoConflicts() }));
export const paidSeoUpsertRowAction = handle((req) => upsertPaidSeoRow(req.body));
export const paidSeoBusinessAction = handle((req) => updatePaidBusinessSeo(req.params.id, req.body));
export const paidSeoProtectedTermsAction = handle((req) => updateProtectedTerms(req.params.slug, req.body?.terms));
export const paidSeoFixConflictAction = handle((req) => fixPaidSeoConflict(req.body));
export const paidSeoRefreshCacheAction = handle((req) => refreshPaidSeoCache(req.params.slug));
