import {useState} from "react";
import {t} from "@lingui/macro";
import {questionClient} from "../api/question.client";
import {showError, showSuccess} from "../utilites/notifications.tsx";
import {IdParam} from "../types.ts";

export const useExportAnswers = (eventId: IdParam) => {
    const [isExporting, setIsExporting] = useState(false);

    const startExport = async () => {
        try {
            setIsExporting(true);
            const blob = await questionClient.exportAnswers(eventId);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `event-${eventId}-question-answers.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
            showSuccess(t`Answers exported successfully`);
        } catch (error) {
            showError(t`Failed to export question answers`);
        } finally {
            setIsExporting(false);
        }
    };

    return {
        startExport,
        isExporting,
    };
};
