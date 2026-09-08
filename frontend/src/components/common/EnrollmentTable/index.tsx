import {t} from "@lingui/macro";
import {Event} from "../../../types";
import {EventEnrollment} from "../../../api/enrollment.client";
import {Badge, Button, Menu, Table as MantineTable} from "@mantine/core";
import {Table, TableHead} from "../Table";
import {IconDotsVertical, IconTrash} from "@tabler/icons-react";
import {NoResultsSplash} from "../NoResultsSplash";
import {confirmationDialog} from "../../../utilites/confirmationDialog";
import {useDeleteEventEnrollment} from "../../../mutations/useDeleteEventEnrollment";
import {prettyDate} from "../../../utilites/dates";

interface EnrollmentTableProps {
    event: Event;
    enrollments: EventEnrollment[];
}

export const EnrollmentTable = ({event, enrollments}: EnrollmentTableProps) => {
    const deleteMutation = useDeleteEventEnrollment();

    const handleDelete = (enrollmentId: number) => {
        confirmationDialog(
            t`Are you sure you want to delete this enrollment record?`,
            () => {
                deleteMutation.mutate({eventId: event.id, enrollmentId});
            }, {confirm: t`Delete`, cancel: t`Cancel`}
        );
    };

    if (enrollments.length === 0) {
        return <NoResultsSplash
            heading={t`No Enrollments to show`}
            imageHref={'/blank-slate/promo-codes.svg'} // Reusing promo-codes SVG or similar
            subHeading={(
                <>
                    <p>{t`Import a CSV file to add pre-registered attendees.`}</p>
                    <p>{t`The CSV must have an 'enrollment_no' column.`}</p>
                </>
            )}
        />
    }

    return (
        <Table>
            <TableHead>
                <MantineTable.Tr>
                    <MantineTable.Th>{t`Enrollment No`}</MantineTable.Th>
                    <MantineTable.Th>{t`Name`}</MantineTable.Th>
                    <MantineTable.Th>{t`Class / Dept`}</MantineTable.Th>
                    <MantineTable.Th>{t`Status`}</MantineTable.Th>
                    <MantineTable.Th>{t`Added`}</MantineTable.Th>
                    <MantineTable.Th/>
                </MantineTable.Tr>
            </TableHead>
            <MantineTable.Tbody>
                {enrollments.map((enrollment) => (
                    <MantineTable.Tr key={enrollment.id}>
                        <MantineTable.Td fw={500}>{enrollment.enrollment_no}</MantineTable.Td>
                        <MantineTable.Td>
                            <div className="font-medium">{enrollment.first_name} {enrollment.last_name}</div>
                            {enrollment.email && <div className="text-sm text-gray-500">{enrollment.email}</div>}
                            {enrollment.extra_data?.["Father's Name"] && (
                                <div className="text-xs text-gray-400">{t`Father:`} {enrollment.extra_data["Father's Name"]}</div>
                            )}
                        </MantineTable.Td>
                        <MantineTable.Td>
                            {enrollment.class && <div>{t`Class: `} {enrollment.class}</div>}
                            {enrollment.department && <div>{t`Dept: `} {enrollment.department}</div>}
                            {!enrollment.class && !enrollment.department && '-'}
                        </MantineTable.Td>
                        <MantineTable.Td>
                            {enrollment.is_used ? (
                                <Badge color="red" variant="light">{t`Used`}</Badge>
                            ) : (
                                <Badge color="green" variant="light">{t`Available`}</Badge>
                            )}
                        </MantineTable.Td>
                        <MantineTable.Td>{prettyDate(enrollment.created_at, event.timezone)}</MantineTable.Td>
                        <MantineTable.Td>
                            <Menu shadow="md" width={200} position="bottom-end">
                                <Menu.Target>
                                    <Button variant="subtle" color="gray" size="sm" px="xs">
                                        <IconDotsVertical size={16}/>
                                    </Button>
                                </Menu.Target>

                                <Menu.Dropdown>
                                    <Menu.Item
                                        color="red"
                                        leftSection={<IconTrash size={14}/>}
                                        onClick={() => handleDelete(enrollment.id)}
                                    >
                                        {t`Delete`}
                                    </Menu.Item>
                                </Menu.Dropdown>
                            </Menu>
                        </MantineTable.Td>
                    </MantineTable.Tr>
                ))}
            </MantineTable.Tbody>
        </Table>
    );
};
