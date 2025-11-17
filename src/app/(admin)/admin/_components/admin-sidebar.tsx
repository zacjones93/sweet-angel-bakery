"use client";

import { type ComponentType } from "react";
import type { Route } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Users,
  Shield,
  ShoppingBag,
  Package,
  Settings2,
  Truck,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  FolderTree,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarGroup,
} from "@/components/ui/sidebar";

export type NavItem = {
  title: string;
  url: Route;
  icon?: ComponentType;
};

export type NavMainItem = NavItem & {
  isActive?: boolean;
  items?: NavItem[];
};

const adminNavItems: NavMainItem[] = [
  {
    title: "Products",
    url: "/admin/products",
    icon: ShoppingBag,
    isActive: true,
  },
  {
    title: "Categories",
    url: "/admin/categories",
    icon: FolderTree,
    isActive: true,
  },
  {
    title: "Orders",
    url: "/admin/orders",
    icon: Package,
    isActive: true,
    items: [
      {
        title: "All Orders",
        url: "/admin/orders",
      },
      {
        title: "By Fulfillment",
        url: "/admin/orders/fulfillment",
      },
    ],
  },
  {
    title: "Delivery Settings",
    url: "/admin/delivery-settings",
    icon: Truck,
    isActive: true,
  },
  {
    title: "Site Content",
    url: "/admin/site-content",
    icon: FileText,
    isActive: true,
  },
  {
    title: "Revenue",
    url: "/admin/revenue",
    icon: DollarSign,
    isActive: true,
  },
  {
    title: "User Management",
    url: "/admin",
    icon: Users,
    isActive: true,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings2,
    items: [
      {
        title: "Profile",
        url: "/settings",
      },
      {
        title: "Security",
        url: "/settings/security",
      },
      {
        title: "Sessions",
        url: "/settings/sessions",
      },
      {
        title: "Change Password",
        url: "/forgot-password",
      },
    ],
  },
];

export function AdminSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
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
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="pointer-events-none"
                tooltip="Admin Panel"
              >
                <Shield size={24} />
                <span className="text-lg font-bold">Admin Panel</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <NavMain items={adminNavItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
