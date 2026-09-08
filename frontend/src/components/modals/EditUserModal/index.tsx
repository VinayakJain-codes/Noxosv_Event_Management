import {useForm} from "@mantine/form";
import {GenericModalProps, QueryFilters, User} from "../../../types.ts";
import {Modal} from "../../common/Modal";
import {Button, MultiSelect, Select, TextInput} from "@mantine/core";
import {Callout} from "../../common/Callout";
import {useFormErrorResponseHandler} from "../../../hooks/useFormErrorResponseHandler.tsx";
import {t, Trans} from "@lingui/macro";
import {CustomSelect, ItemProps} from "../../common/CustomSelect";
import {IconEye, IconUser, IconUserShield} from "@tabler/icons-react";
import {showSuccess} from "../../../utilites/notifications.tsx";
import {UpdateUserRequest} from "../../../api/user.client.ts";
import {useEditUser} from "../../../mutations/useEditUser.ts";
import {NavLink} from "react-router";
import {InputGroup} from "../../common/InputGroup";
import {useGetEvents} from "../../../queries/useGetEvents.ts";

interface EditUserModalProps extends GenericModalProps {
    user: User;
}

export const EditUserModal = ({onClose, user}: EditUserModalProps) => {
    const ediMutation = useEditUser();
    const formErrorHandler = useFormErrorResponseHandler();

    const {data: eventsData} = useGetEvents({perPage: 100} as QueryFilters);
    const eventOptions = eventsData?.data?.map((event) => ({
        value: String(event.id),
        label: event.title,
    })) || [];

    const form = useForm<UpdateUserRequest>({
        initialValues: {
            first_name: user.first_name,
            last_name: user.last_name,
            status: String(user.status),
            role: String(user.role),
            event_ids: user.assigned_event_ids || [],
        },
        validate: {
            event_ids: (value, values) => {
                if (values.role === 'VIEWER' && (!value || value.length === 0)) {
                    return t`Please select at least one assigned event for the viewer.`;
                }
                return null;
            }
        }
    });

    const handleCreate = (values: UpdateUserRequest) => {
        ediMutation.mutate({
            userId: user.id,
            userData: values,
        }, {
            onSuccess: () => {
                form.reset();
                onClose();
                showSuccess(<Trans>User updated successfully.</Trans>);
            },
            onError: (error) => formErrorHandler(form, error)
        });
    };

    const calcTypeOptions: ItemProps[] = [
        {
            icon: <IconUserShield/>,
            label: t`Admin`,
            value: 'ADMIN',
            description: t`Admin users have full access to events and account settings.`,
        },
        {
            icon: <IconUser/>,
            label: t`Organizer`,
            value: 'ORGANIZER',
            description: t`Organizers can only manage events and products. They cannot manage users, account settings or billing information.`,
        },
        {
            icon: <IconEye/>,
            label: t`Viewer`,
            value: 'VIEWER',
            description: t`Viewers can only view attendees, orders, and scan attendee QR codes for assigned events.`,
        },
    ];

    return (
        <Modal heading={t`Edit User`} onClose={onClose} opened>
            {user.status === 'INVITED' && (
                <Callout variant="info">
                    <Trans>This user is not active, as they have not accepted their invitation.</Trans>
                </Callout>
            )}
            <form onSubmit={form.onSubmit(values => handleCreate(values))}>
                <fieldset disabled={ediMutation.isPending}>
                    <InputGroup>
                        <TextInput required {...form.getInputProps('first_name')} label={t`First Name`}/>
                        <TextInput required {...form.getInputProps('last_name')} label={t`Last Name`}/>
                    </InputGroup>

                    <TextInput
                        disabled
                        readOnly
                        value={user.email}
                        type={'email'}
                        label={t`Email`}
                        description={<Trans>Users can change their email in <NavLink target={'_blank'}
                                                                                     to={'/manage/profile'}>Profile
                            Settings</NavLink></Trans>}
                    />

                    {user.is_account_owner && (
                        <Callout variant="info">
                            {t`You cannot edit the role or status of the account owner.`}
                        </Callout>
                    )}

                    <CustomSelect
                        label={t`Role`}
                        optionList={calcTypeOptions}
                        form={form}
                        name={'role'}
                        disabled={user.is_account_owner}
                    />

                    {form.values.role === 'VIEWER' && (
                        <MultiSelect
                            label={t`Assigned Events`}
                            description={t`Select the event(s) this viewer is allowed to access.`}
                            placeholder={t`Select one or more events`}
                            data={eventOptions}
                            searchable
                            clearable
                            required
                            disabled={user.is_account_owner}
                            value={form.values.event_ids?.map(String) || []}
                            onChange={(selected) => form.setFieldValue('event_ids', selected.map(Number))}
                            error={form.errors.event_ids}
                        />
                    )}

                    {user.status !== 'INVITED' && (
                        <Select
                            disabled={user.is_account_owner}
                            label={t`Status`}
                            placeholder={t`Select status`}
                            required
                            {...form.getInputProps('status')}
                            description={t`Inactive users cannot log in.`}

                            data={[
                                {value: 'ACTIVE', label: t`Active`},
                                {value: 'INACTIVE', label: t`Inactive`},
                            ]}
                        />
                    )}
                </fieldset>
                <Button
                    fullWidth
                    loading={ediMutation.isPending}
                    type={'submit'}>
                    {t`Edit User`}
                </Button>
            </form>
        </Modal>
    );
};
