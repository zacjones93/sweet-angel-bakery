export default async function DashboardLayout({ children }: { children: React.ReactNode }) {

  return (
    <div className="container mx-auto mt-12">
      {children}
    </div>
  )
}
