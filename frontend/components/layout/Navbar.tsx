'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, LogOut, LayoutDashboard, Library, History, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/auth';

export function Navbar() {
  const { authUser, role, logOut } = useAuth();
  const router = useRouter();

  const handleLogOut = async () => {
    await logOut();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <BookOpen className="h-5 w-5" />
          <span>Mini Library</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-1 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <LayoutDashboard className="mr-1 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/history">
              <History className="mr-1 h-4 w-4" />
              History
            </Link>
          </Button>
          {(role === 'admin' || role === 'librarian') && (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/books">
                  <Library className="mr-1 h-4 w-4" />
                  Manage Books
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/borrows">
                  <ClipboardList className="mr-1 h-4 w-4" />
                  All Borrows
                </Link>
              </Button>
            </>
          )}
        </nav>

        {/* User dropdown */}
        {authUser && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {authUser.profile.name || authUser.firebaseUser.email}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                {authUser.profile.email}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
