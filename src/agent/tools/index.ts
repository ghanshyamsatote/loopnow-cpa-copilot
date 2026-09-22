import { createGetCurrentReceiptTool } from "./get-current-receipt";
import { createValidateGstNumberTool } from "./validate-gst-number";
import { createValidateDocumentationTool } from "./validate-documentation";
import { createCalculateItcTool } from "./calculate-itc";
import { createClassifyExpenseTool } from "./classify-expense";
import { createAssignGifiCodeTool } from "./assign-gifi-code";
import { createUpdateExpenseClassificationTool } from "./update-expense-classification";
import { createRequestHumanReviewTool } from "./request-human-review";
import { createGetProcessingStatusTool } from "./get-processing-status";

/**
 * Builds the full tool set for one chat request, closing over the
 * `selectedReceiptId` that the frontend sent alongside the user's message.
 *
 * This is the concrete mechanism behind "app-awareness" (spec §10): the model
 * is never asked to supply a receipt ID — every tool already knows which
 * receipt is selected because the server injected it here, before the model
 * saw anything. The model can only read/act on the one receipt the user
 * actually has open.
 */
export function createAgentTools(selectedReceiptId: string | null) {
    return {
        get_current_receipt: createGetCurrentReceiptTool(selectedReceiptId),
        validate_gst_hst_number_format: createValidateGstNumberTool(selectedReceiptId),
        validate_cra_documentation: createValidateDocumentationTool(selectedReceiptId),
        calculate_eligible_itc: createCalculateItcTool(selectedReceiptId),
        classify_expense: createClassifyExpenseTool(selectedReceiptId),
        assign_gifi_code: createAssignGifiCodeTool(selectedReceiptId),
        update_expense_classification: createUpdateExpenseClassificationTool(selectedReceiptId),
        request_human_review: createRequestHumanReviewTool(selectedReceiptId),
        get_processing_status: createGetProcessingStatusTool(selectedReceiptId),
    };
}
