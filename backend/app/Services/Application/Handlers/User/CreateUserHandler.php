<?php

namespace HiEvents\Services\Application\Handlers\User;

use HiEvents\DomainObjects\AccountDomainObject;
use HiEvents\DomainObjects\Enums\Role;
use HiEvents\DomainObjects\Status\UserStatus;
use HiEvents\DomainObjects\UserDomainObject;
use HiEvents\Exceptions\ResourceConflictException;
use HiEvents\Exceptions\UnauthorizedException;
use HiEvents\Repository\Interfaces\AccountRepositoryInterface;
use HiEvents\Repository\Interfaces\UserRepositoryInterface;
use HiEvents\Services\Application\Handlers\User\DTO\CreateUserDTO;
use HiEvents\Services\Domain\Account\AccountUserAssociationService;
use HiEvents\Services\Domain\User\SendUserInvitationService;
use Illuminate\Database\DatabaseManager;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Throwable;

readonly class CreateUserHandler
{
    public function __construct(
        private UserRepositoryInterface $userRepository,
        private AccountRepositoryInterface $accountRepository,
        private SendUserInvitationService $sendUserInvitationService,
        private AccountUserAssociationService $accountUserAssociationService,
        private DatabaseManager $databaseManager,
    ) {}

    /**
     * @throws ResourceConflictException
     * @throws Throwable
     * @throws UnauthorizedException
     */
    public function handle(CreateUserDTO $userData): UserDomainObject
    {
        if ($userData->role === Role::SUPERADMIN) {
            throw new UnauthorizedException(
                __('SUPERADMIN users cannot be created through the application')
            );
        }

        return $this->databaseManager->transaction(function () use ($userData) {
            $existingUser = $this->getExistingUser($userData);

            $authenticatedAccount = $this->accountRepository->findById($userData->account_id);

            $generatedPassword = null;
            if ($existingUser === null) {
                $generatedPassword = Str::random(12);
                $invitedUser = $this->createUser($userData, $authenticatedAccount, $generatedPassword);
                $invitedUser->setTemporaryPassword($generatedPassword);
            } else {
                $invitedUser = $existingUser;
            }

            $invitedUser->setCurrentAccountUser($this->accountUserAssociationService->associate(
                user: $invitedUser,
                account: $authenticatedAccount,
                role: $userData->role,
                status: UserStatus::ACTIVE,
                invitedByUserId: $userData->invited_by,
            ));

            if ($userData->event_ids !== null) {
                $this->userRepository->syncAssignedEvents($invitedUser->getId(), $userData->event_ids);
                $invitedUser->setAssignedEventIds($userData->event_ids);
            }

            try {
                $this->sendUserInvitationService->sendInvitation($invitedUser, $authenticatedAccount->getId());
            } catch (Throwable) {
            }

            return $invitedUser;
        });

    }

    private function createUser(CreateUserDTO $userData, AccountDomainObject $authenticatedAccount, string $password): UserDomainObject
    {
        return $this->userRepository
            ->create([
                'first_name' => $userData->first_name,
                'last_name' => $userData->last_name,
                'email' => strtolower($userData->email),
                'password' => Hash::make($password),
                'timezone' => $authenticatedAccount->getTimezone(),
            ]);
    }

    /**
     * @throws ResourceConflictException
     */
    private function getExistingUser(CreateUserDTO $userData): ?UserDomainObject
    {
        $existingUser = $this->userRepository
            ->loadRelation(AccountDomainObject::class)
            ->findFirstWhere([
                'email' => $userData->email,
            ]);

        if ($existingUser === null) {
            return null;
        }

        if ($existingUser->accounts->some(fn ($account) => $account->getId() === $userData->account_id)) {
            throw new ResourceConflictException(
                __('The email :email already exists on this account', [
                    'email' => $userData->email,
                ])
            );
        }

        return $existingUser;
    }
}
