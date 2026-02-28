'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Search, Shield, ShieldCheck, UserCog, UserX, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AppLayout } from '@/components/layout';
import {
  PageHeader,
  ErrorMessage,
  EmptyState,
  TableSkeleton,
  PaginationControls,
  ConfirmDialog,
} from '@/components/shared';
import { useAdminUsers, useUpdateUserRole, useToggleUserActive } from '@/features/admin';
import { useAuth } from '@/features/auth';
import { useDebounce } from '@/hooks/useDebounce';
import type { User, UserRole } from '@/types';

const ROLE_FILTERS: { label: string; value: UserRole | undefined }[] = [
  { label: 'All Roles', value: undefined },
  { label: 'Admin', value: 'admin' },
  { label: 'Librarian', value: 'librarian' },
  { label: 'Member', value: 'member' },
];

const roleVariant: Record<UserRole, 'default' | 'secondary' | 'destructive'> = {
  admin: 'destructive',
  librarian: 'default',
  member: 'secondary',
};

const roleIcon: Record<UserRole, React.ReactNode> = {
  admin: <Shield className="mr-1 h-3 w-3" />,
  librarian: <ShieldCheck className="mr-1 h-3 w-3" />,
  member: null,
};

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | undefined>(undefined);
  const [toggleTarget, setToggleTarget] = useState<User | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  // ── Role guard (admin only) ──────────────────────────────────────────────
  const { authUser, role, loading: authLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (authLoading) return;
    if (!authUser) router.replace('/login');
    else if (role !== 'admin') router.replace('/dashboard');
  }, [authUser, role, authLoading, router]);

  const { data, isLoading, isError } = useAdminUsers({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    role: roleFilter,
  });

  const updateRole = useUpdateUserRole();
  const toggleActive = useToggleUserActive();

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await updateRole.mutateAsync({ id: userId, role: newRole });
      toast.success(`Role updated to ${newRole}.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update role.';
      toast.error(message);
    }
  };

  const handleToggleConfirm = async () => {
    if (!toggleTarget) return;
    try {
      const newActive = !toggleTarget.isActive;
      await toggleActive.mutateAsync({ id: toggleTarget._id, isActive: newActive });
      toast.success(`User ${newActive ? 'activated' : 'deactivated'}.`);
      setToggleTarget(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update status.';
      toast.error(message);
    }
  };

  const isSelf = (user: User) => authUser?.profile._id === user._id;

  return (
    <AppLayout>
      <PageHeader
        title="Manage Users"
        description="View, assign roles, and manage user accounts."
      />

      {/* Search + Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {ROLE_FILTERS.map((f) => (
            <Button
              key={f.label}
              variant={roleFilter === f.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setRoleFilter(f.value); setPage(1); }}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={toggleTarget !== null}
        onOpenChange={(open) => { if (!open) setToggleTarget(null); }}
        title={toggleTarget?.isActive ? 'Deactivate User' : 'Activate User'}
        description={
          toggleTarget?.isActive
            ? `Deactivate "${toggleTarget?.name}"? They will no longer be able to log in or borrow books.`
            : `Reactivate "${toggleTarget?.name}"? They will regain access to the system.`
        }
        confirmLabel={toggleTarget?.isActive ? 'Deactivate' : 'Activate'}
        variant={toggleTarget?.isActive ? 'destructive' : 'default'}
        loading={toggleActive.isPending}
        onConfirm={handleToggleConfirm}
      />

      {isLoading && <TableSkeleton rows={8} columns={6} />}

      {isError && <ErrorMessage message="Failed to load users." />}

      {data && data.items.length === 0 && (
        <EmptyState
          title={debouncedSearch ? 'No matching users' : 'No users yet'}
          description={debouncedSearch ? 'Try a different search.' : 'Users will appear once they sign up.'}
        />
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((user) => (
                  <TableRow key={user._id} className={!user.isActive ? 'opacity-60' : undefined}>
                    <TableCell className="font-medium">
                      {user.name}
                      {isSelf(user) && (
                        <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{user.email}</TableCell>
                    <TableCell>
                      {/* Role dropdown — disabled for self */}
                      {isSelf(user) ? (
                        <Badge variant={roleVariant[user.role]}>
                          {roleIcon[user.role]}
                          {user.role}
                        </Badge>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="xs" className="gap-1">
                              <Badge variant={roleVariant[user.role]} className="cursor-pointer">
                                {roleIcon[user.role]}
                                {user.role}
                              </Badge>
                              <UserCog className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {(['admin', 'librarian', 'member'] as UserRole[]).map((r) => (
                              <DropdownMenuItem
                                key={r}
                                disabled={r === user.role || updateRole.isPending}
                                onClick={() => handleRoleChange(user._id, r)}
                                className="capitalize"
                              >
                                {roleIcon[r]}
                                {r}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? 'default' : 'destructive'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(user.createdAt), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      {!isSelf(user) && (
                        <Button
                          size="sm"
                          variant={user.isActive ? 'outline' : 'default'}
                          onClick={() => setToggleTarget(user)}
                          disabled={toggleActive.isPending}
                        >
                          {user.isActive ? (
                            <>
                              <UserX className="mr-1 h-3 w-3" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="mr-1 h-3 w-3" />
                              Activate
                            </>
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <PaginationControls
            pagination={data.pagination}
            onPageChange={setPage}
            noun="user"
          />
        </>
      )}
    </AppLayout>
  );
}
