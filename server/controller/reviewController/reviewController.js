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
      reviewData: req.body
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ message: err.message });
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

    res.status(200).json(reviews);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const addReplyAction = async (req, res) => {
  try {
    const reply = await addReplyHelper({
      reviewId: req.params.reviewId,
      userId: req.body.userId,
      userName: req.body.userName,
      role: req.body.role || "OWNER",
      message: req.body.message
    });

    res.status(200).json({ success: true, data: reply });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const markHelpfulAction = async (req, res) => {
  try {
    const { userId } = req.body;

    const review = await markHelpfulHelper({
      reviewId: req.params.reviewId,
      userId
    });

    res.send({ success: true, review });
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
};


export const reportReviewAction = async (req, res) => {
  try {
    await reportReviewHelper({ reviewId: req.params.reviewId });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
