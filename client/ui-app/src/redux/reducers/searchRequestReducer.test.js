import searchRequestReducer from "./searchRequestReducer.js";
import { FETCH_SEARCH_REQUESTS_SUCCESS } from "../actions/userActionTypes.js";

describe("searchRequestReducer", () => {
  it("handles a missing list payload without throwing", () => {
    const state = searchRequestReducer(undefined, {
      type: FETCH_SEARCH_REQUESTS_SUCCESS,
      payload: undefined,
    });

    expect(state.requests).toEqual([]);
    expect(state.total).toBe(0);
    expect(state.loading).toBe(false);
  });

  it("accepts both paginated and direct-array list payloads", () => {
    const request = { _id: "request-1" };
    const paginatedState = searchRequestReducer(undefined, {
      type: FETCH_SEARCH_REQUESTS_SUCCESS,
      payload: { items: [request], total: 10, page: 2, limit: 5, pages: 2 },
    });
    const arrayState = searchRequestReducer(undefined, {
      type: FETCH_SEARCH_REQUESTS_SUCCESS,
      payload: [request],
    });

    expect(paginatedState).toMatchObject({ requests: [request], total: 10, page: 2, limit: 5, pages: 2 });
    expect(arrayState).toMatchObject({ requests: [request], total: 1 });
  });
});
