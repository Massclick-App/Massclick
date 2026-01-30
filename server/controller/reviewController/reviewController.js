import {
  addReviewHelper,
  getReviewsHelper,
  addReplyHelper,
  markHelpfulHelper,
  reportReviewHelper
} from "../../helper/reviewHelper/reviewHelper.js";


export const addReviewAction = async (req, res) => {
  try {
    const result = await addReviewHelper({
      businessId: req.params.businessId,
      user: req.authUser,
      reviewData: req.body,
    });
console.log("user", req.authUser);

    res.send({ success: true, data: result });
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
};


export const getReviewsAction = async (req, res) => {
  try {
    const reviews = await getReviewsHelper({
      businessId: req.params.businessId,
      sortBy: req.query.sort,
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 10),
    });
    ;

    res.send(reviews);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
};


export const addReplyAction = async (req, res) => {
  try {
    const reply = await addReplyHelper({
      businessId: req.params.businessId,
      reviewId: req.params.reviewId,
      user: req.authUser,
      message: req.body.message,
    });

    res.send({ success: true, data: reply });
  } catch (err) {
    res.status(403).send({ message: err.message });
  }
};


export const markHelpfulAction = async (req, res) => {
  try {
    const review = await markHelpfulHelper({
      businessId: req.params.businessId,
      reviewId: req.params.reviewId,
      userId: req.authUser.userId
    });

    res.send({
      success: true,
      review
    });
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
};


export const reportReviewAction = async (req, res) => {
  try {
    await reportReviewHelper(req.params);
    res.send({ success: true });
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
};
