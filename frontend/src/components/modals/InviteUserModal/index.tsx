import {useForm} from "@mantine/form";
import {GenericModalProps, InviteUserRequest, QueryFilters, User} from "../../../types.ts";
import {Modal} from "../../common/Modal";
import {Button, MultiSelect, SimpleGrid, TextInput} from "@mantine/core";
import {useFormErrorResponseHandler} from "../../../hooks/useFormErrorResponseHandler.tsx";
import {t} from "@lingui/macro";
import {useInviteUser} from "../../../mutations/useInviteUser.ts";
import {CustomSelect, ItemProps} from "../../common/CustomSelect";
import {IconEye, IconUser, IconUserShield} from "@tabler/icons-react";
import {useGetEvents} from "../../../queries/useGetEvents.ts";
import {useState} from "react";
import {CredentialsModal} from "../CredentialsModal";

export const InviteUserModal = ({onClose}: GenericModalProps) => {
    const createMutation = useInviteUser();
    const formErrorHandler = useFormErrorResponseHandler();
    const [createdUser, setCreatedUser] = useState<User | null>(null);

    const {data: eventsData} = useGetEvents({perPage: 100} as QueryFilters);
    const eventOptions = eventsData?.data?.map((event) => ({
        value: String(event.id),
        label: event.title,
    })) || [];

    const form = useForm<InviteUserRequest>({
        initialValues: {
            email: '',
            first_name: '',
            last_name: '',
            role: 'ADMIN',
            event_ids: [],
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

    const handleCreate = (values: InviteUserRequest) => {
        createMutation.mutate({
            inviteUserData: values,
        }, {
            onSuccess: (response: any) => {
                form.reset();
                if (response?.data) {
                    setCreatedUser(response.data);
                } else {
                    onClose();
                }
            },
            onError: (error: any) => formErrorHandler(form, error)
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

    if (createdUser) {
        return (
            <CredentialsModal
                user={createdUser}
                onClose={() => {
                    setCreatedUser(null);
                    onClose();
                }}
            />
        );
    }

    return (
        <Modal heading={t`Invite a team member`} onClose={onClose} opened modalHeader={'branded'}>
            <form onSubmit={form.onSubmit(values => handleCreate(values))}>
                <SimpleGrid cols={2}>
                    <TextInput required {...form.getInputProps('first_name')} label={t`First Name`}/>
                    <TextInput  {...form.getInputProps('last_name')} label={t`Last Name`}/>
                </SimpleGrid>

                <TextInput required type={'email'}  {...form.getInputProps('email')} label={t`Email`}/>

                <CustomSelect
                    label={t`Role`}
                    optionList={calcTypeOptions}
                    form={form}
                    name={'role'}
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
                        value={form.values.event_ids?.map(String) || []}
                        onChange={(selected) => form.setFieldValue('event_ids', selected.map(Number))}
                        error={form.errors.event_ids}
                    />
                )}

                <Button
                    fullWidth
                    loading={createMutation.isPending}
                    type={'submit'}>
                    {t`Invite Team Member`}
                </Button>
            </form>
        </Modal>
    );
};
