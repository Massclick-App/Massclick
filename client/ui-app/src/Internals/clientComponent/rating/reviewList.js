import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getBusinessReviews,

} from "../../../redux/actions/reviewAction";
import ReviewCard from "./reviewCard";
import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import styles from "./reviewReplayBox.module.css";
const cx = createScopedClassNames(styles);

export default function ReviewList({ businessId }) {
  const dispatch = useDispatch();
  const { reviews,hasMore } = useSelector(state => state.reviews);
  const { businessDetails } = useSelector(
    state => state.businessListReducer
  );

  
  useEffect(() => {
    dispatch(getBusinessReviews(businessId));
  }, [dispatch, businessId]);

  const reviewItems = Array.isArray(reviews) ? reviews : [];

  return (
    <div className={cx("review-list")}>
      {reviewItems.length === 0 && (
        <div className={cx("review-empty")}>
          <strong>No reviews yet</strong>
          <span>Be the first customer to share an experience with this business.</span>
        </div>
      )}

      {reviewItems.map(review => (
        <ReviewCard
          key={review._id}
          review={review}
          businessId={businessId}
          business={businessDetails}
        />))}

      {hasMore && (
        <button className={cx("review-load-more")} onClick={() => dispatch(getBusinessReviews(businessId, "latest", 2))}>
          Load More
        </button>
      )}
    </div>
  );
}
