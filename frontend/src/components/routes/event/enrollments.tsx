import {useParams} from "react-router";
import {Button, FileButton, Group, Modal, Pagination, Select, Stack, TextInput} from "@mantine/core";
import {PageBody} from "../../common/PageBody";
import {PageTitle} from "../../common/PageTitle";
import {useGetEvent} from "../../../queries/useGetEvent";
import {SearchBarWrapper} from "../../common/SearchBarWrapper";
import {IconDownload, IconPlus, IconUpload} from "@tabler/icons-react";
import {ToolBar} from "../../common/ToolBar";
import {useFilterQueryParamSync} from "../../../hooks/useFilterQueryParamSync";
import {QueryFilterOperator, QueryFilters} from "../../../types";
import {TableSkeleton} from "../../common/TableSkeleton";
import {t} from "@lingui/macro";
import {SortSelector} from "../../common/SortSelector";
import {useGetEventEnrollments} from "../../../queries/useGetEventEnrollments";
import {EnrollmentTable} from "../../common/EnrollmentTable";
import {enrollmentClient} from "../../../api/enrollment.client";
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
    const [isExporting, setIsExporting] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Add Enrollment Form State
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [enrollmentNo, setEnrollmentNo] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [studentClass, setStudentClass] = useState("");
    const [department, setDepartment] = useState("");

    const isUsedFilter = searchParams.filterFields?.is_used;
    const currentStatus = isUsedFilter
        ? (Array.isArray(isUsedFilter) ? 'ALL' : String(isUsedFilter.value) === 'true' ? 'USED' : 'AVAILABLE')
        : 'ALL';

    const handleStatusFilterChange = (value: string | null) => {
        const filterFields = {...(searchParams.filterFields || {})};
        if (value === 'USED') {
            filterFields.is_used = {operator: QueryFilterOperator.Equals, value: 'true'};
        } else if (value === 'AVAILABLE') {
            filterFields.is_used = {operator: QueryFilterOperator.Equals, value: 'false'};
        } else {
            delete filterFields.is_used;
        }

        setSearchParams({
            ...searchParams,
            filterFields,
            pageNumber: 1,
        } as QueryFilters, true);
    };

    const handleFileSelected = (file: File | null) => {
        if (!file) return;
        setSelectedFile(file);
        setImportModalOpen(true);
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

    const resetAddForm = () => {
        setEnrollmentNo("");
        setFirstName("");
        setLastName("");
        setEmail("");
        setStudentClass("");
        setDepartment("");
    };

    const handleAddEnrollment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventId) return;

        if (!enrollmentNo.trim()) {
            showError(t`Enrollment number is required`);
            return;
        }
        if (!firstName.trim()) {
            showError(t`First name is required`);
            return;
        }

        try {
            setIsSubmitting(true);
            await enrollmentClient.create(eventId, {
                enrollment_no: enrollmentNo.trim(),
                first_name: firstName.trim(),
                last_name: lastName.trim() || undefined,
                email: email.trim() || undefined,
                class: studentClass.trim() || undefined,
                department: department.trim() || undefined,
            });

            showSuccess(t`Enrollment added successfully`);
            resetAddForm();
            setAddModalOpen(false);
            enrollmentsQuery.refetch();
        } catch (err: any) {
            const message = err?.response?.data?.message || t`Failed to add enrollment`;
            showError(message);
        } finally {
            setIsSubmitting(false);
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
                filterComponent={(
                    <Group gap="sm" wrap="wrap">
                        <Select
                            size="sm"
                            placeholder={t`Filter Status`}
                            value={currentStatus}
                            onChange={handleStatusFilterChange}
                            data={[
                                {value: 'ALL', label: t`All Statuses`},
                                {value: 'AVAILABLE', label: t`Available`},
                                {value: 'USED', label: t`Used`},
                            ]}
                            style={{width: 140}}
                        />
                        {pagination?.allowed_sorts && (
                            <SortSelector
                                selected={searchParams.sortBy && searchParams.sortDirection
                                    ? searchParams.sortBy + ':' + searchParams.sortDirection
                                    : pagination.default_sort + ':' + pagination.default_sort_direction}
                                options={pagination.allowed_sorts}
                                onSortSelect={(key, sortDirection) => {
                                    setSearchParams({sortBy: key, sortDirection});
                                }}
                            />
                        )}
                    </Group>
                )}
                resultCount={pagination?.total}
                resultLabel={t`enrollment records`}
            >
                <Group gap="sm">
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
                            <Button {...props} variant="default" leftSection={<IconUpload size={16}/>}>
                                {t`Import CSV`}
                            </Button>
                        )}
                    </FileButton>
                    <Button
                        color="blue"
                        onClick={() => setAddModalOpen(true)}
                        leftSection={<IconPlus size={16}/>}
                    >
                        {t`Add Enrollment`}
                    </Button>
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

            {/* Modal for Manually Adding Individual Enrollment */}
            <Modal
                opened={addModalOpen}
                onClose={() => {
                    if (!isSubmitting) {
                        setAddModalOpen(false);
                        resetAddForm();
                    }
                }}
                title={t`Add Enrollment / Student`}
                centered
            >
                <form onSubmit={handleAddEnrollment}>
                    <Stack gap="md">
                        <TextInput
                            required
                            label={t`Enrollment / Roll Number`}
                            placeholder={t`e.g. 210120101`}
                            value={enrollmentNo}
                            onChange={(e) => setEnrollmentNo(e.currentTarget.value)}
                            data-autofocus
                        />
                        <Group grow>
                            <TextInput
                                required
                                label={t`First Name`}
                                placeholder={t`e.g. John`}
                                value={firstName}
                                onChange={(e) => setFirstName(e.currentTarget.value)}
                            />
                            <TextInput
                                label={t`Last Name`}
                                placeholder={t`e.g. Doe`}
                                value={lastName}
                                onChange={(e) => setLastName(e.currentTarget.value)}
                            />
                        </Group>
                        <TextInput
                            label={t`Email Address`}
                            placeholder={t`e.g. student@college.edu`}
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.currentTarget.value)}
                        />
                        <Group grow>
                            <TextInput
                                label={t`Class / Semester`}
                                placeholder={t`e.g. B.Tech CSE 6th Sem`}
                                value={studentClass}
                                onChange={(e) => setStudentClass(e.currentTarget.value)}
                            />
                            <TextInput
                                label={t`Department / Branch`}
                                placeholder={t`e.g. Computer Science`}
                                value={department}
                                onChange={(e) => setDepartment(e.currentTarget.value)}
                            />
                        </Group>
                        <Group justify="flex-end" mt="md">
                            <Button
                                variant="default"
                                onClick={() => {
                                    setAddModalOpen(false);
                                    resetAddForm();
                                }}
                                disabled={isSubmitting}
                            >
                                {t`Cancel`}
                            </Button>
                            <Button
                                type="submit"
                                loading={isSubmitting}
                            >
                                {t`Add Enrollment`}
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>

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
