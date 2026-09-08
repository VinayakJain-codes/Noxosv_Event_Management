import {ActionIcon, Button, CopyButton, Group, Stack, Text, TextInput} from "@mantine/core";
import {t} from "@lingui/macro";
import {GenericModalProps, User} from "../../../types.ts";
import {Modal} from "../../common/Modal";
import {Callout} from "../../common/Callout";
import {IconCheck, IconCopy, IconEye, IconEyeOff, IconShieldLock} from "@tabler/icons-react";
import {useState} from "react";
import {showSuccess} from "../../../utilites/notifications.tsx";

interface CredentialsModalProps extends GenericModalProps {
    user: User;
}

export const CredentialsModal = ({onClose, user}: CredentialsModalProps) => {
    const [showPassword, setShowPassword] = useState(true);

    const loginUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : '';
    const formattedCredentials = [
        t`Hi.Events Login Credentials:`,
        `${t`Login URL`}: ${loginUrl}`,
        `${t`Email / Login ID`}: ${user.email}`,
        `${t`User ID`}: ${user.id}`,
        `${t`Role`}: ${user.role}`,
        user.temporary_password ? `${t`Password`}: ${user.temporary_password}` : '',
    ].filter(Boolean).join('\n');

    const handleCopyAll = (copyFn: () => void) => {
        copyFn();
        showSuccess(t`All credentials copied to clipboard!`);
    };

    return (
        <Modal opened onClose={onClose} heading={t`Team Member Added` + ' 🎉'} size="md" modalHeader="branded">
            <Stack gap="md">
                <Text size="sm" c="dimmed">
                    {t`The user has been added successfully. Below are their login credentials. Please copy and share them with the team member.`}
                </Text>

                <div>
                    <Text size="xs" fw={600} c="dimmed" mb={4}>
                        {t`User ID`}
                    </Text>
                    <TextInput
                        value={String(user.id || '')}
                        readOnly
                        rightSection={
                            <CopyButton value={String(user.id || '')}>
                                {({copied, copy}) => (
                                    <ActionIcon variant="subtle" color={copied ? 'green' : 'gray'} onClick={copy}>
                                        {copied ? <IconCheck size={16}/> : <IconCopy size={16}/>}
                                    </ActionIcon>
                                )}
                            </CopyButton>
                        }
                    />
                </div>

                <div>
                    <Text size="xs" fw={600} c="dimmed" mb={4}>
                        {t`Email / Login ID`}
                    </Text>
                    <TextInput
                        value={user.email}
                        readOnly
                        rightSection={
                            <CopyButton value={user.email}>
                                {({copied, copy}) => (
                                    <ActionIcon variant="subtle" color={copied ? 'green' : 'gray'} onClick={copy}>
                                        {copied ? <IconCheck size={16}/> : <IconCopy size={16}/>}
                                    </ActionIcon>
                                )}
                            </CopyButton>
                        }
                    />
                </div>

                {user.temporary_password && (
                    <div>
                        <Text size="xs" fw={600} c="dimmed" mb={4}>
                            {t`Generated Password`}
                        </Text>
                        <TextInput
                            type={showPassword ? 'text' : 'password'}
                            value={user.temporary_password}
                            readOnly
                            styles={{
                                input: {
                                    fontFamily: 'monospace',
                                    fontWeight: 600,
                                    letterSpacing: showPassword ? '1px' : 'normal',
                                }
                            }}
                            rightSection={
                                <Group gap={4} mr={4}>
                                    <ActionIcon
                                        variant="subtle"
                                        color="gray"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <IconEyeOff size={16}/> : <IconEye size={16}/>}
                                    </ActionIcon>
                                    <CopyButton value={user.temporary_password}>
                                        {({copied, copy}) => (
                                            <ActionIcon
                                                variant="subtle"
                                                color={copied ? 'green' : 'gray'}
                                                onClick={copy}
                                            >
                                                {copied ? <IconCheck size={16}/> : <IconCopy size={16}/>}
                                            </ActionIcon>
                                        )}
                                    </CopyButton>
                                </Group>
                            }
                        />
                    </div>
                )}

                <Callout variant="info" icon={<IconShieldLock size={18}/>}>
                    <Text size="xs">
                        {t`For security reasons, this password will not be displayed again. Please ensure you share it before closing.`}
                    </Text>
                </Callout>

                <Group justify="space-between" mt="sm">
                    <CopyButton value={formattedCredentials}>
                        {({copied, copy}) => (
                            <Button
                                variant="light"
                                color={copied ? 'green' : 'primary'}
                                leftSection={copied ? <IconCheck size={16}/> : <IconCopy size={16}/>}
                                onClick={() => handleCopyAll(copy)}
                            >
                                {copied ? t`Copied Credentials!` : t`Copy All Credentials`}
                            </Button>
                        )}
                    </CopyButton>

                    <Button onClick={onClose}>
                        {t`Done`}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
};
