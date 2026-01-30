import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getBusinessReviews,

} from "../../../redux/actions/reviewAction";
import ReviewCard from "./reviewCard";

export default function ReviewList({ businessId }) {
  const dispatch = useDispatch();
  const { reviews, loading, hasMore } = useSelector(state => state.reviews);
  const { businessDetails } = useSelector(
    state => state.businessListReducer
  );

  
  useEffect(() => {
    dispatch(getBusinessReviews(businessId));
  }, [businessId]);

  return (
    <>
      {reviews.map(review => (
        <ReviewCard
          key={review._id}
          review={review}
          businessId={businessId}
          business={businessDetails}
        />))}

      {hasMore && (
        <button onClick={() => dispatch(getBusinessReviews(businessId, "latest", 2))}>
          Load More
        </button>
      )}
    </>
  );
}

