import {useParams} from "react-router";
import {useGetEvent} from "../../../queries/useGetEvent";
import {PageTitle} from "../../common/PageTitle";
import {PageBody} from "../../common/PageBody";
import {SearchBarWrapper} from "../../common/SearchBar";
import {Pagination} from "../../common/Pagination";
import {Button, FileButton, Group} from "@mantine/core";
import {IconDownload, IconUpload, IconTrash} from "@tabler/icons-react";
import {ToolBar} from "../../common/ToolBar";
import {useFilterQueryParamSync} from "../../../hooks/useFilterQueryParamSync";
import {QueryFilters} from "../../../types";
import {TableSkeleton} from "../../common/TableSkeleton";
import {t} from "@lingui/macro";
import {SortSelector} from "../../common/SortSelector";
import {useGetEventEnrollments} from "../../../queries/useGetEventEnrollments";
import {useDeleteAllEventEnrollments} from "../../../mutations/useDeleteAllEventEnrollments";
import {EnrollmentTable} from "../../common/EnrollmentTable";
import {enrollmentClient} from "../../../api/enrollment.client";
import {confirmationDialog} from "../../../utilites/confirmationDialog";
import {showSuccess, showError} from "../../../utilites/notifications";
import {useState} from "react";
import {RosterImportModal} from "./RosterImportModal";

export const Enrollments = () => {
    const {eventId} = useParams();
    const {data: event} = useGetEvent(eventId);
    const [searchParams, setSearchParams] = useFilterQueryParamSync();
    const enrollmentsQuery = useGetEventEnrollments(eventId, searchParams as QueryFilters);
    const enrollments = enrollmentsQuery?.data?.data;
    const pagination = enrollmentsQuery?.data?.meta;
    const deleteAllMutation = useDeleteAllEventEnrollments();
    const [isExporting, setIsExporting] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileSelected = (file: File | null) => {
        if (!file) return;
        setSelectedFile(file);
        setImportModalOpen(true);
    };

    const handleDeleteAll = () => {
        confirmationDialog(
            t`Are you sure you want to delete all enrollment records? This cannot be undone.`,
            () => {
                deleteAllMutation.mutate(eventId, {
                    onSuccess: () => showSuccess(t`All enrollments deleted successfully`)
                });
            }, {confirm: t`Delete All`, cancel: t`Cancel`}
        );
    };

    const handleExport = async () => {
        try {
            setIsExporting(true);
            const blob = await enrollmentClient.export(eventId);
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `enrollments-${eventId}.csv`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (e) {
            showError(t`Failed to export enrollments`);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <PageBody>
            <PageTitle
                subheading={t`Manage pre-registered attendees. Users can verify their enrollment number during checkout to access the event.`}
            >{t`Enrollments / Whitelist`}</PageTitle>
            <ToolBar
                searchComponent={() => (
                    <SearchBarWrapper
                        placeholder={t`Search by enrollment number or name...`}
                        setSearchParams={setSearchParams}
                        searchParams={searchParams}
                    />
                )}
                filterComponent={pagination?.allowed_sorts ? (
                    <SortSelector
                        selected={searchParams.sortBy && searchParams.sortDirection
                            ? searchParams.sortBy + ':' + searchParams.sortDirection
                            : pagination.default_sort + ':' + pagination.default_sort_direction}
                        options={pagination.allowed_sorts}
                        onSortSelect={(key, sortDirection) => {
                            setSearchParams({sortBy: key, sortDirection});
                        }}
                    />
                ) : undefined}
                resultCount={pagination?.total}
                resultLabel={t`enrollment records`}
            >
                <Group gap="sm">
                    {enrollments && enrollments.length > 0 && (
                        <Button
                            variant="default"
                            color="red"
                            onClick={handleDeleteAll}
                            leftSection={<IconTrash size={16}/>}
                        >
                            {t`Delete All`}
                        </Button>
                    )}
                    <Button
                        variant="default"
                        onClick={handleExport}
                        loading={isExporting}
                        leftSection={<IconDownload size={16}/>}
                    >
                        {t`Export`}
                    </Button>
                    <FileButton onChange={handleFileSelected} accept="text/csv,text/plain,text/tab-separated-values,.csv,.tsv,.txt">
                        {(props) => (
                            <Button {...props} color="green" leftSection={<IconUpload size={16}/>}>
                                {t`Import Roster / Whitelist`}
                            </Button>
                        )}
                    </FileButton>
                </Group>
            </ToolBar>

            <TableSkeleton isVisible={!enrollments || !event}/>

            {(enrollments && event) && (
                <EnrollmentTable
                    event={event}
                    enrollments={enrollments}
                />
            )}

            {!!enrollments?.length && (
                <Pagination
                    value={searchParams.pageNumber}
                    onChange={(value) => setSearchParams({pageNumber: value})}
                    total={Number(pagination?.last_page)}
                />
            )}

            <RosterImportModal
                opened={importModalOpen}
                onClose={() => {
                    setImportModalOpen(false);
                    setSelectedFile(null);
                }}
                eventId={eventId!}
                initialFile={selectedFile}
            />
        </PageBody>
    );
};

export default Enrollments;
