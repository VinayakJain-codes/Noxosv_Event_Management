<?php

declare(strict_types=1);

namespace HiEvents\Repository\Eloquent;

use HiEvents\DomainObjects\AccountUserDomainObject;
use HiEvents\DomainObjects\UserDomainObject;
use HiEvents\Models\AccountUser;
use HiEvents\Models\User;
use HiEvents\Repository\Interfaces\UserRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Routing\Exception\ResourceNotFoundException;

/**
 * @extends BaseRepository<UserDomainObject>
 */
class UserRepository extends BaseRepository implements UserRepositoryInterface
{
    public function getModel(): string
    {
        return User::class;
    }

    public function getDomainObject(): string
    {
        return UserDomainObject::class;
    }

    public function findByIdAndAccountId(int $userId, int $accountId): UserDomainObject
    {
        $accountUser = AccountUser::where('user_id', $userId)->where('account_id', $accountId)->first();

        if (! $accountUser) {
            throw new ResourceNotFoundException(__('User not found in this account'));
        }

        $accountUser = $this->handleSingleResult($accountUser, AccountUserDomainObject::class);

        try {
            /** @var UserDomainObject $user */
            $user = $this->handleSingleResult($this->model->findOrFail($userId));
        } catch (ModelNotFoundException) {
            throw new ResourceNotFoundException(__('User not found'));
        }

        $user->setCurrentAccountUser($accountUser);
        $user->setAssignedEventIds($this->getAssignedEventIds($userId));

        return $user;
    }

    public function findUsersByAccountId(int $accountId): ?Collection
    {
        $users = $this->model->whereHas('accounts', function ($query) use ($accountId) {
            $query->where('account_id', $accountId);
        })->get();

        $users = $this->handleResults($users);

        if ($users->isNotEmpty()) {
            $assignedEventsMap = DB::table('event_users')
                ->whereIn('user_id', $users->map(fn (UserDomainObject $u) => $u->getId()))
                ->get()
                ->groupBy('user_id')
                ->map(fn ($group) => $group->pluck('event_id')->toArray());

            $users->each(function (UserDomainObject $userDomain) use ($assignedEventsMap) {
                $userDomain->setAssignedEventIds($assignedEventsMap->get($userDomain->getId(), []));
            });
        }

        return $users->sortByDesc(fn (UserDomainObject $user) => $user->getUpdatedAt());
    }

    public function getAllUsersWithAccounts(?string $search, int $perPage): LengthAwarePaginator
    {
        $query = $this->model->query()
            ->with(['accounts' => function ($query) {
                $query->withPivot('role', 'is_account_owner', 'last_login_at', 'status');
            }]);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'ilike', "%$search%")
                    ->orWhere('last_name', 'ilike', "%$search%")
                    ->orWhere('email', 'ilike', "%$search%")
                    ->orWhereHas('accounts', function ($accountQuery) use ($search) {
                        $accountQuery->where('name', 'ilike', "%$search%");
                    });
            });
        }

        return $query->orderBy('created_at', 'desc')->paginate($perPage);
    }

    public function syncAssignedEvents(int $userId, array $eventIds): void
    {
        $this->runQuery(function () use ($userId, $eventIds) {
            /** @var User $user */
            $user = $this->model->findOrFail($userId);
            $user->assignedEvents()->sync($eventIds);
        });
    }

    public function getAssignedEventIds(int $userId): array
    {
        return $this->runQuery(function () use ($userId) {
            /** @var User $user */
            $user = $this->model->findOrFail($userId);
            return $user->assignedEvents()->pluck('events.id')->toArray();
        });
    }
}
