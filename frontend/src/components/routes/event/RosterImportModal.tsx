import React, {useState, useEffect, useMemo} from 'react';
import {
    Modal,
    Button,
    Group,
    Select,
    SegmentedControl,
    Text,
    Stack,
    Paper,
    Table,
    Badge,
    Alert,
    Box,
    SimpleGrid,
    ThemeIcon,
    Divider,
} from '@mantine/core';
import {
    IconFileUpload,
    IconTable,
    IconAlertCircle,
    IconInfoCircle,
    IconArrowRight,
} from '@tabler/icons-react';
import {t} from '@lingui/macro';
import {showError, showSuccess} from '../../../utilites/notifications';
import {useImportEventEnrollments} from '../../../mutations/useImportEventEnrollments';
import {IdParam} from '../../../types';

interface RosterImportModalProps {
    opened: boolean;
    onClose: () => void;
    eventId: IdParam;
    initialFile: File | null;
}

// Simple robust CSV line splitter that respects quoted values
const parseCsvLine = (line: string, delimiter: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
            if (inQuotes && line[i + 1] === char) {
                current += char;
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === delimiter && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
};

const detectDelimiter = (firstLine: string): string => {
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;

    if (tabCount > commaCount && tabCount > semiCount) return '\t';
    if (semiCount > commaCount) return ';';
    return ',';
};

export const RosterImportModal: React.FC<RosterImportModalProps> = ({
    opened,
    onClose,
    eventId,
    initialFile,
}) => {
    const importMutation = useImportEventEnrollments();
    const [headers, setHeaders] = useState<string[]>([]);
    const [rawRows, setRawRows] = useState<string[][]>([]);
    const [totalEstimatedRows, setTotalEstimatedRows] = useState<number>(0);
    const [parsingError, setParsingError] = useState<string | null>(null);

    // Mapping states
    const [nameMode, setNameMode] = useState<'full_name' | 'split'>('full_name');
    const [enrollmentCol, setEnrollmentCol] = useState<string | null>(null);
    const [fullNameCol, setFullNameCol] = useState<string | null>(null);
    const [firstNameCol, setFirstNameCol] = useState<string | null>(null);
    const [lastNameCol, setLastNameCol] = useState<string | null>(null);
    const [emailCol, setEmailCol] = useState<string | null>(null);
    const [classCol, setClassCol] = useState<string | null>(null);
    const [departmentCol, setDepartmentCol] = useState<string | null>(null);

    // Parse file when initialFile changes
    useEffect(() => {
        if (!initialFile) {
            setHeaders([]);
            setRawRows([]);
            setParsingError(null);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                let content = (e.target?.result as string) || '';
                if (content.charCodeAt(0) === 0xFEFF) {
                    content = content.slice(1);
                }

                const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
                if (lines.length === 0) {
                    setParsingError(t`The uploaded file is empty.`);
                    return;
                }

                const delimiter = detectDelimiter(lines[0]);
                const parsedHeaders = parseCsvLine(lines[0], delimiter);
                setHeaders(parsedHeaders);
                setTotalEstimatedRows(lines.length - 1);

                const sampleRows: string[][] = [];
                for (let i = 1; i < Math.min(lines.length, 6); i++) {
                    sampleRows.push(parseCsvLine(lines[i], delimiter));
                }
                setRawRows(sampleRows);
                setParsingError(null);

                // Smart auto-detection of column mapping
                let autoEnrollment: string | null = null;
                let autoFullName: string | null = null;
                let autoFirstName: string | null = null;
                let autoLastName: string | null = null;
                let autoEmail: string | null = null;
                let autoClass: string | null = null;
                let autoDepartment: string | null = null;

                parsedHeaders.forEach((h) => {
                    const clean = h.toLowerCase().replace(/[\s_\-\.]/g, '');
                    if (!autoEnrollment && ['enrollmentno', 'enrollmentnumber', 'enrollment', 'rollno', 'rollnumber', 'roll', 'regno', 'registrationno', 'id', 'studentid', 'idno', 'admno'].includes(clean)) {
                        autoEnrollment = h;
                    } else if (!autoFullName && ['fullname', 'name', 'studentname', 'attendee', 'attendeename', 'candidate', 'candidatename'].includes(clean)) {
                        autoFullName = h;
                    } else if (!autoFirstName && ['firstname', 'fname', 'first'].includes(clean)) {
                        autoFirstName = h;
                    } else if (!autoLastName && ['lastname', 'lname', 'last', 'surname'].includes(clean)) {
                        autoLastName = h;
                    } else if (!autoEmail && ['email', 'emailaddress', 'mail'].includes(clean)) {
                        autoEmail = h;
                    } else if (!autoClass && ['class', 'year', 'grade', 'standard', 'sem', 'semester', 'batch', 'division', 'sec'].includes(clean)) {
                        autoClass = h;
                    } else if (!autoDepartment && ['dept', 'department', 'branch', 'stream', 'course', 'major', 'program'].includes(clean)) {
                        autoDepartment = h;
                    }
                });

                // If not found by exact clean matches, try partial contains
                if (!autoEnrollment) {
                    autoEnrollment = parsedHeaders.find((h) => /roll|enroll|reg|id/i.test(h)) || parsedHeaders[0] || null;
                }
                if (!autoFullName && !autoFirstName) {
                    autoFullName = parsedHeaders.find((h) => /name/i.test(h)) || null;
                }
                if (!autoEmail) {
                    autoEmail = parsedHeaders.find((h) => /mail/i.test(h)) || null;
                }
                if (!autoClass) {
                    autoClass = parsedHeaders.find((h) => /class|year|grade|batch/i.test(h)) || null;
                }
                if (!autoDepartment) {
                    autoDepartment = parsedHeaders.find((h) => /dept|branch|stream|course/i.test(h)) || null;
                }

                setEnrollmentCol(autoEnrollment);
                if (autoFirstName && autoLastName) {
                    setNameMode('split');
                    setFirstNameCol(autoFirstName);
                    setLastNameCol(autoLastName);
                } else {
                    setNameMode('full_name');
                    setFullNameCol(autoFullName || (autoFirstName || autoLastName || null));
                }
                setEmailCol(autoEmail);
                setClassCol(autoClass);
                setDepartmentCol(autoDepartment);
            } catch (err: any) {
                setParsingError(t`Could not parse the CSV file: ` + (err.message || ''));
            }
        };
        reader.readAsText(initialFile);
    }, [initialFile]);

    const columnOptions = useMemo(() => {
        return [
            {value: '', label: t`-- None / Not in file --`},
            ...headers.map((h) => ({value: h, label: h})),
        ];
    }, [headers]);

    const requiredColumnOptions = useMemo(() => {
        return headers.map((h) => ({value: h, label: h}));
    }, [headers]);

    // Generate preview data based on selected mappings
    const previewData = useMemo(() => {
        if (!headers.length || !rawRows.length) return [];

        const getVal = (row: string[], colName: string | null): string => {
            if (!colName) return '';
            const idx = headers.indexOf(colName);
            return idx >= 0 && row[idx] ? row[idx] : '';
        };

        return rawRows.map((row) => {
            let firstName = '';
            let lastName = '';

            if (nameMode === 'full_name') {
                const full = getVal(row, fullNameCol);
                const parts = full.split(/\s+/);
                firstName = parts[0] || '';
                lastName = parts.slice(1).join(' ') || '';
            } else {
                firstName = getVal(row, firstNameCol);
                lastName = getVal(row, lastNameCol);
            }

            return {
                enrollment_no: getVal(row, enrollmentCol) || t`[Empty]`,
                first_name: firstName || t`[Empty]`,
                last_name: lastName || '-',
                email: getVal(row, emailCol) || '-',
                class: getVal(row, classCol) || '-',
                department: getVal(row, departmentCol) || '-',
            };
        });
    }, [headers, rawRows, nameMode, enrollmentCol, fullNameCol, firstNameCol, lastNameCol, emailCol, classCol, departmentCol]);

    const handleImportSubmit = async () => {
        if (!initialFile || !enrollmentCol) {
            showError(t`Please select which column contains the Enrollment / ID Number.`);
            return;
        }

        const mapping: Record<string, string> = {
            enrollment_no: enrollmentCol,
        };

        if (nameMode === 'full_name') {
            if (fullNameCol) mapping.full_name = fullNameCol;
        } else {
            if (firstNameCol) mapping.first_name = firstNameCol;
            if (lastNameCol) mapping.last_name = lastNameCol;
        }

        if (emailCol) mapping.email = emailCol;
        if (classCol) mapping.class = classCol;
        if (departmentCol) mapping.department = departmentCol;

        try {
            const result = await importMutation.mutateAsync({
                eventId,
                file: initialFile,
                mapping,
            });
            showSuccess(t`Successfully imported ${result.imported} enrollments (${result.skipped} skipped).`);
            onClose();
        } catch (e: any) {
            showError(e?.response?.data?.message || t`Failed to import enrollments.`);
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group gap="xs">
                    <ThemeIcon size="md" radius="md" color="indigo" variant="light">
                        <IconFileUpload size={18} />
                    </ThemeIcon>
                    <Text fw={600} size="lg">
                        {t`Map Roster Columns`}
                    </Text>
                </Group>
            }
            size="xl"
            radius="md"
        >
            <Stack gap="md">
                {parsingError ? (
                    <Alert color="red" icon={<IconAlertCircle size={16} />} title={t`File Error`}>
                        {parsingError}
                    </Alert>
                ) : (
                    <>
                        <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-gray-0)">
                            <Group justify="space-between">
                                <div>
                                    <Text size="sm" fw={600}>
                                        {initialFile?.name}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                        {totalEstimatedRows} {t`records detected`} · {headers.length} {t`columns`}
                                    </Text>
                                </div>
                                <Badge color="indigo" variant="light">
                                    {t`CSV Roster`}
                                </Badge>
                            </Group>
                        </Paper>

                        <div>
                            <Text size="sm" fw={600} mb="xs">
                                {t`Select which column in your file matches each detail:`}
                            </Text>

                            <SimpleGrid cols={{base: 1, sm: 2}} spacing="sm">
                                <Select
                                    label={t`Enrollment / Roll No. (Required)`}
                                    description={t`Unique ID for each attendee/student`}
                                    data={requiredColumnOptions}
                                    value={enrollmentCol}
                                    onChange={setEnrollmentCol}
                                    required
                                    placeholder={t`Select column...`}
                                />

                                <Box>
                                    <Group justify="space-between" mb={4}>
                                        <Text size="sm" fw={500}>
                                            {t`Name Format`}
                                        </Text>
                                    </Group>
                                    <SegmentedControl
                                        fullWidth
                                        size="xs"
                                        value={nameMode}
                                        onChange={(val) => setNameMode(val as 'full_name' | 'split')}
                                        data={[
                                            {label: t`Single Full Name Column`, value: 'full_name'},
                                            {label: t`First & Last Name Columns`, value: 'split'},
                                        ]}
                                        mb="xs"
                                    />
                                    {nameMode === 'full_name' ? (
                                        <Select
                                            data={columnOptions}
                                            value={fullNameCol || ''}
                                            onChange={(val) => setFullNameCol(val || null)}
                                            placeholder={t`Select Full Name column...`}
                                        />
                                    ) : (
                                        <Group grow gap="xs">
                                            <Select
                                                data={columnOptions}
                                                value={firstNameCol || ''}
                                                onChange={(val) => setFirstNameCol(val || null)}
                                                placeholder={t`First Name`}
                                            />
                                            <Select
                                                data={columnOptions}
                                                value={lastNameCol || ''}
                                                onChange={(val) => setLastNameCol(val || null)}
                                                placeholder={t`Last Name`}
                                            />
                                        </Group>
                                    )}
                                </Box>

                                <Select
                                    label={t`Email Address (Optional)`}
                                    description={t`Attendee contact email`}
                                    data={columnOptions}
                                    value={emailCol || ''}
                                    onChange={(val) => setEmailCol(val || null)}
                                    placeholder={t`-- None / Not in file --`}
                                />

                                <Select
                                    label={t`Class / Grade / Year (Optional)`}
                                    description={t`E.g. Class 10, Batch 2026, Year 3`}
                                    data={columnOptions}
                                    value={classCol || ''}
                                    onChange={(val) => setClassCol(val || null)}
                                    placeholder={t`-- None / Not in file --`}
                                />

                                <Select
                                    label={t`Department / Branch / Stream (Optional)`}
                                    description={t`E.g. Computer Science, Commerce, Science`}
                                    data={columnOptions}
                                    value={departmentCol || ''}
                                    onChange={(val) => setDepartmentCol(val || null)}
                                    placeholder={t`-- None / Not in file --`}
                                />
                            </SimpleGrid>
                        </div>

                        {previewData.some(row => /e\+\d+/i.test(row.enrollment_no)) && (
                            <Alert color="orange" icon={<IconAlertCircle size={16} />} title={t`Scientific Notation Detected in Enrollment Numbers`} variant="light">
                                <Text size="xs">
                                    {t`Your spreadsheet formatted long ID/Roll numbers as scientific notation (e.g. 2.30349E+11). To keep the original digits before importing, open the file in Excel, select the Roll No column -> Format Cells -> Number (with 0 decimals) or Text, and save again.`}
                                </Text>
                            </Alert>
                        )}

                        <Divider label={<Group gap={4}><IconTable size={14} /><Text size="xs" fw={600}>{t`Live Sample Preview (First 5 Rows)`}</Text></Group>} labelPosition="left" />

                        <Paper withBorder radius="md" style={{overflowX: 'auto'}}>
                            <Table striped highlightOnHover withTableBorder={false} fz="xs">
                                <Table.Thead bg="var(--mantine-color-gray-1)">
                                    <Table.Tr>
                                        <Table.Th>{t`Enrollment No.`}</Table.Th>
                                        <Table.Th>{t`First Name`}</Table.Th>
                                        <Table.Th>{t`Last Name`}</Table.Th>
                                        <Table.Th>{t`Email`}</Table.Th>
                                        <Table.Th>{t`Class`}</Table.Th>
                                        <Table.Th>{t`Department`}</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {previewData.length > 0 ? (
                                        previewData.map((row, idx) => (
                                            <Table.Tr key={idx}>
                                                <Table.Td>
                                                    <Badge variant="outline" size="sm" color={/e\+\d+/i.test(row.enrollment_no) ? "orange" : "indigo"}>
                                                        {row.enrollment_no}
                                                    </Badge>
                                                </Table.Td>
                                                <Table.Td>{row.first_name}</Table.Td>
                                                <Table.Td>{row.last_name}</Table.Td>
                                                <Table.Td>{row.email}</Table.Td>
                                                <Table.Td>{row.class}</Table.Td>
                                                <Table.Td>{row.department}</Table.Td>
                                            </Table.Tr>
                                        ))
                                    ) : (
                                        <Table.Tr>
                                            <Table.Td colSpan={6} style={{textAlign: 'center'}} c="dimmed">
                                                {t`No preview rows available`}
                                            </Table.Td>
                                        </Table.Tr>
                                    )}
                                </Table.Tbody>
                            </Table>
                        </Paper>

                        <Alert color="blue" icon={<IconInfoCircle size={16} />} variant="light">
                            <Text size="xs">
                                {t`Any additional unmapped columns in your file will automatically be saved as custom extra data.`}
                            </Text>
                        </Alert>
                    </>
                )}

                <Group justify="flex-end" mt="sm">
                    <Button variant="default" onClick={onClose}>
                        {t`Cancel`}
                    </Button>
                    <Button
                        color="green"
                        onClick={handleImportSubmit}
                        loading={importMutation.isPending}
                        disabled={!enrollmentCol || !!parsingError}
                        rightSection={<IconArrowRight size={16} />}
                    >
                        {t`Import Roster (${totalEstimatedRows} Records)`}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
};
