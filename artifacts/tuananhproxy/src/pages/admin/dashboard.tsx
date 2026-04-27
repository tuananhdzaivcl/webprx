import { Link, useLocation } from "wouter";
import { useAdminStats, useLogout } from "@workspace/api-client-react";
import { formatVND, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CreditCard, ShoppingCart, DollarSign, LayoutDashboard, LogOut, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => { window.location.href = "/"; }
    });
  };

  const navs = [
    { href: "/admin", icon: LayoutDashboard, label: "Tổng Quan" },
    { href: "/admin/users", icon: Users, label: "Người Dùng" },
    { href: "/admin/deposits", icon: CreditCard, label: "Nạp Tiền" },
    { href: "/admin/products", icon: Package, label: "Sản Phẩm" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0">
        <div className="p-6 bg-slate-950 flex items-center justify-between md:justify-center">
          <Link href="/" className="text-white font-black text-xl tracking-tighter hover:text-blue-400 transition-colors">TA PROXY ADMIN</Link>
        </div>
        <nav className="flex-1 p-4 space-y-2 flex md:flex-col overflow-x-auto md:overflow-visible">
          {navs.map(nav => {
            const isActive = location === nav.href;
            return (
              <Link key={nav.href} href={nav.href} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors whitespace-nowrap md:whitespace-normal font-medium ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
                <nav.icon className="w-5 h-5" />
                {nav.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800 hidden md:block">
          <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-slate-800" onClick={handleLogout}>
            <LogOut className="w-5 h-5 mr-3" /> Đăng xuất
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useAdminStats();

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </AdminLayout>
    );
  }

  if (!stats) return null;

  const statCards = [
    { title: "Tổng Doanh Thu", value: formatVND(stats.totalRevenue), icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-100" },
    { title: "Đơn Nạp Chờ Duyệt", value: stats.pendingDeposits.toString(), icon: CreditCard, color: "text-amber-500", bg: "bg-amber-100" },
    { title: "Tổng Người Dùng", value: stats.totalUsers.toString(), icon: Users, color: "text-blue-500", bg: "bg-blue-100" },
    { title: "Đơn Hàng Đã Bán", value: stats.totalOrders.toString(), icon: ShoppingCart, color: "text-purple-500", bg: "bg-purple-100" },
  ];

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Tổng Quan</h1>
        <p className="text-slate-500">Thống kê chung hệ thống TUANANHPROXY.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, i) => (
          <Card key={i} className="border-slate-200 shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">{stat.title}</p>
                <h3 className="text-2xl font-black text-slate-800">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-white">
          <CardTitle className="uppercase tracking-wider text-slate-800 text-lg">Đơn Hàng Gần Đây</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-xs border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Sản Phẩm</th>
                  <th className="px-6 py-4">Giá</th>
                  <th className="px-6 py-4">Trạng Thái</th>
                  <th className="px-6 py-4">Thời Gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-slate-500">#{order.id}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{order.productName}</td>
                    <td className="px-6 py-4 font-bold text-red-600">{formatVND(order.price)}</td>
                    <td className="px-6 py-4">
                      {order.status === 'completed' && <Badge className="bg-green-100 text-green-700 border-none font-bold">Thành công</Badge>}
                      {order.status === 'failed' && <Badge variant="destructive" className="font-bold">Thất bại</Badge>}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
                {stats.recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Chưa có đơn hàng nào.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
