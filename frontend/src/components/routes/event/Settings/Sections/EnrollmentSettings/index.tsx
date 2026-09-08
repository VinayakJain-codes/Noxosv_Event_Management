import {t} from "@lingui/macro";
import {Group, Switch, Text} from "@mantine/core";
import {useParams} from "react-router";
import {useGetEventSettings} from "../../../../../../queries/useGetEventSettings";
import {useUpdateEventSettings} from "../../../../../../mutations/useUpdateEventSettings";
import {Card} from "../../../../../common/Card";
import {HeadingWithDescription} from "../../../../../common/Card/CardHeading";

export const EnrollmentSettings = () => {
    const {eventId} = useParams();
    const {data: settings} = useGetEventSettings(eventId);
    const updateSettingsMutation = useUpdateEventSettings();

    if (!settings || !eventId) {
        return null;
    }

    return (
        <Card>
            <HeadingWithDescription
                heading={t`Enrollments / Whitelist`}
                description={t`Configure enrollment number validation for event registrations.`}
            />

            <Group justify="space-between" wrap="nowrap" align={'flex-start'} mt="md">
                <div>
                    <Text size="sm" fw={500}>{t`Enable Enrollment Verification`}</Text>
                    <Text size="sm" c="dimmed">
                        {t`When enabled, users must enter a valid enrollment number during checkout to purchase a ticket.`}
                    </Text>
                </div>
                <Switch
                    size="md"
                    checked={settings.enrollment_enabled || false}
                    onChange={(e) => updateSettingsMutation.mutate({
                        eventId,
                        eventSettings: {
                            enrollment_enabled: e.currentTarget.checked
                        }
                    })}
                />
            </Group>

            <Group justify="space-between" wrap="nowrap" align={'flex-start'} mt="md">
                <div>
                    <Text size="sm" fw={500}>{t`Restrict to one ticket per enrollment`}</Text>
                    <Text size="sm" c="dimmed">
                        {t`If enabled, each enrollment number can only be used once.`}
                    </Text>
                </div>
                <Switch
                    size="md"
                    checked={settings.enrollment_restrict_to_one_ticket !== false}
                    onChange={(e) => updateSettingsMutation.mutate({
                        eventId,
                        eventSettings: {
                            enrollment_restrict_to_one_ticket: e.currentTarget.checked
                        }
                    })}
                />
            </Group>
        </Card>
    );
};
