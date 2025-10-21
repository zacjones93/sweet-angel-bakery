"use client";

import { type ComponentType, useEffect, useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import Image from "next/image";

import {
  Building2,
  Frame,
  Map,
  PieChart,
  SquareTerminal,
  Users,
  Shield,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useSessionStore } from "@/state/session";
import { ROLES_ENUM } from "@/db/schema";

export type NavItem = {
  title: string;
  url: Route;
  icon?: ComponentType;
};

export type NavMainItem = NavItem & {
  isActive?: boolean;
  items?: NavItem[];
};

type Data = {
  user: {
    name: string;
    email: string;
  };
  teams: {
    id: string;
    name: string;
    logo: ComponentType;
    role: string;
  }[];
  navMain: NavMainItem[];
  projects: NavItem[];
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { session } = useSessionStore();
  const [formattedTeams, setFormattedTeams] = useState<Data["teams"]>([]);

  // Map session teams to the format expected by TeamSwitcher
  useEffect(() => {
    if (session?.teams && session.teams.length > 0) {
      // Map teams from session to the format expected by TeamSwitcher
      const teamData = session.teams.map((team) => {
        return {
          id: team.id,
          name: team.name,
          // TODO Get the actual logo when we implement team avatars
          logo: Building2,
          role: team.role.name || "Member",
        };
      });

      setFormattedTeams(teamData);
    }
  }, [session]);

  const data: Data = {
    user: {
      name: session?.user?.firstName || "User",
      email: session?.user?.email || "user@example.com",
    },
    teams: formattedTeams,
    navMain: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: SquareTerminal,
        isActive: true,
      },
      {
        title: "Teams",
        url: "/dashboard/teams" as Route,
        icon: Users,
      },
      ...(session?.user?.role === ROLES_ENUM.ADMIN
        ? [
            {
              title: "Admin",
              url: "/admin" as Route,
              icon: Shield,
            },
          ]
        : []),
    ],
    projects: [
      {
        title: "Design Engineering",
        url: "#",
        icon: Frame,
      },
      {
        title: "Sales & Marketing",
        url: "#",
        icon: PieChart,
      },
      {
        title: "Travel",
        url: "#",
        icon: Map,
      },
    ],
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center justify-center px-4 py-4 group-data-[collapsible=icon]:px-2">
          <Link
            href="/"
            className="relative h-10 w-full group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8"
          >
            <Image
              src="/SAB-02.webp"
              alt="Sweet Angel Bakery"
              fill
              className="object-contain group-data-[collapsible=icon]:object-cover"
            />
          </Link>
        </div>
        {data?.teams?.length > 0 && <TeamSwitcher teams={data.teams} />}
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
