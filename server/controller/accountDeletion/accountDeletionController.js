import User from "../../model/msg91Model/usersModels.js";
import {
  createAccountDeletionRequest,
  markDeletionNotificationSent,
} from "../../helper/accountDeletion/accountDeletionHelper.js";
import { sendAccountDeletionRequestEmail } from "../../helper/email/accountDeletionEmail.js";
import { logAuthAuditEvent } from "../../auth/authAuditStore.js";

const serializeRequest = (request) => ({
  requestId: String(request._id),
  status: request.status,
  requestedAt: request.requestedAt,
  expectedCompletionAt: request.expectedCompletionAt,
});

export const requestAccountDeletion = async (req, res) => {
  try {
    const user = await User.findById(req.authActor.subjectId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Massclick account not found.",
      });
    }

    const result = await createAccountDeletionRequest({
      user,
      source: req.body?.source === "in_app" ? "in_app" : "web_external",
    });

    if (result.created) {
      void sendAccountDeletionRequestEmail({
        request: result.request,
        user,
      })
        .then(() => markDeletionNotificationSent(result.request._id))
        .catch((error) => {
          console.error(
            "Account deletion notification email failed:",
            error.message
          );
        });
    }

    logAuthAuditEvent({
      eventType: result.created
        ? "account_deletion_requested"
        : "account_deletion_request_repeated",
      actor: req.authActor,
      source: "account-deletion",
      req,
      statusCode: result.created ? 201 : 200,
      message: result.created
        ? "Customer requested account deletion"
        : "Customer viewed an active account deletion request",
    });

    return res.status(result.created ? 201 : 200).json({
      success: true,
      message: result.created
        ? "Your account deletion request has been received."
        : "An account deletion request is already being processed.",
      ...serializeRequest(result.request),
    });
  } catch (error) {
    console.error("requestAccountDeletion Error:", error);
    return res.status(500).json({
      success: false,
      message: "We could not submit your deletion request. Please try again.",
    });
  }
};
