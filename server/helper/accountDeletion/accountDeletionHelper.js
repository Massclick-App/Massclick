import accountDeletionRequestModel from "../../model/accountDeletion/accountDeletionRequestModel.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_STATUSES = ["pending", "processing"];

export const createAccountDeletionRequest = async ({
  user,
  source = "web_external",
}) => {
  const existingRequest = await accountDeletionRequestModel
    .findOne({
      userId: user._id,
      status: { $in: ACTIVE_STATUSES },
    })
    .sort({ requestedAt: -1 });

  if (existingRequest) {
    return { created: false, request: existingRequest };
  }

  const requestedAt = new Date();
  const request = await accountDeletionRequestModel.create({
    userId: user._id,
    mobileNumber: user.mobileNumber1,
    userName: user.userName || "",
    userEmail: user.email || "",
    source,
    requestedAt,
    expectedCompletionAt: new Date(requestedAt.getTime() + 7 * DAY_MS),
    purgeAt: new Date(requestedAt.getTime() + 90 * DAY_MS),
  });

  return { created: true, request };
};

export const markDeletionNotificationSent = async (requestId) => {
  await accountDeletionRequestModel.updateOne(
    { _id: requestId },
    {
      $set: {
        notificationSentAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );
};
