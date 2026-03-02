'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, LayoutDashboard, Library, History, ClipboardList, Users, Menu, MessageSquare } from 'lucide-react';
import { LexoraLogo } from '@/components/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '@/features/auth';
import { cn } from '@/lib/utils';

interface NavLink {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Show for admin + librarian */
  adminOnly?: boolean;
  /** Show for admin only (not librarian) */
  adminExclusive?: boolean;
}

const NAV_LINKS: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="mr-1.5 h-4 w-4" /> },
  { href: '/dashboard/history', label: 'History', icon: <History className="mr-1.5 h-4 w-4" /> },
  { href: '/chat', label: 'AI Chat', icon: <MessageSquare className="mr-1.5 h-4 w-4" /> },
  { href: '/admin/books', label: 'Manage Books', icon: <Library className="mr-1.5 h-4 w-4" />, adminOnly: true },
  { href: '/admin/borrows', label: 'All Borrows', icon: <ClipboardList className="mr-1.5 h-4 w-4" />, adminOnly: true },
  { href: '/admin/users', label: 'Users', icon: <Users className="mr-1.5 h-4 w-4" />, adminExclusive: true },
];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Navbar() {
  const { authUser, role, logOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isAdmin = role === 'admin' || role === 'librarian';

  const handleLogOut = async () => {
    await logOut();
    router.push('/login');
  };

  const visibleLinks = NAV_LINKS.filter((link) => {
    if (link.adminExclusive) return role === 'admin';
    if (link.adminOnly) return isAdmin;
    return true;
  });

  /**
   * Determine whether a nav link is "active".
   *
   * Exact match covers standalone pages (/dashboard, /dashboard/history, /chat).
   * Prefix match is only applied to /admin/* sub-trees where routes can have
   * dynamic segments (e.g. /admin/books/new). Using startsWith for /dashboard
   * would incorrectly mark the "Dashboard" link active on /dashboard/history.
   */
  const isLinkActive = (href: string) =>
    pathname === href ||
    (href.startsWith('/admin') && pathname.startsWith(href + '/'));

  return (
    <header className={cn('sticky top-0 z-40 border-b bg-background/80 backdrop-blur transition-shadow', scrolled && 'shadow-sm')}>
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Brand */}
        <Link href="/dashboard" className="transition-opacity hover:opacity-80">
          <LexoraLogo size={24} textSize="text-base" />
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-1 md:flex">
          {visibleLinks.map((link) => {
            const isActive = isLinkActive(link.href);
            return (
              <Button
                key={link.href}
                variant={isActive ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(isActive && 'text-primary font-medium')}
                asChild
              >
                <Link href={link.href}>
                  {link.icon}
                  {link.label}
                </Link>
              </Button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <ThemeToggle />

          {/* Role badge (desktop) */}
          {role && (
            <Badge variant="outline" className="hidden text-xs capitalize md:inline-flex">
              {role}
            </Badge>
          )}

          {/* User dropdown (desktop) */}
          {authUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden h-8 w-8 items-center justify-center rounded-full bg-primary/10 p-0 text-xs font-bold text-primary hover:bg-primary/20 md:inline-flex"
                >
                  {getInitials(authUser.profile.name || authUser.profile.email)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  {authUser.profile.email}
                </DropdownMenuItem>
                {role && (
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground capitalize">
                    Role: {role}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </div>
      </div>

      {/* Mobile navigation sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72">
          <SheetHeader>
            <SheetTitle asChild>
              <div><LexoraLogo size={22} textSize="text-base" /></div>
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 px-4">
          {visibleLinks.map((link) => {
              const isActiveMobile = isLinkActive(link.href);
              return (
                <Button
                  key={link.href}
                  variant={isActiveMobile ? 'secondary' : 'ghost'}
                  className={cn('justify-start', isActiveMobile && 'text-primary font-medium')}
                  asChild
                  onClick={() => setMobileOpen(false)}
                >
                  <Link href={link.href}>
                    {link.icon}
                    {link.label}
                  </Link>
                </Button>
              );
            })}
          </nav>
          {authUser && (
            <div className="mt-auto border-t px-4 pt-4">
              <p className="text-sm font-medium">{authUser.profile.name || authUser.firebaseUser.email}</p>
              <p className="text-xs text-muted-foreground">{authUser.profile.email}</p>
              {role && (
                <Badge variant="outline" className="mt-1 text-xs capitalize">
                  {role}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 w-full justify-start text-destructive hover:text-destructive"
                onClick={handleLogOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </header>
  );
}
