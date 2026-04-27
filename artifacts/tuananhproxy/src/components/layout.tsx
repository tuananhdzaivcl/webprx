import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { Menu, Search, Home, Package, Wallet, ShoppingCart, User, LogOut, Link as LinkIcon, Shield } from "lucide-react";
import { formatVND } from "@/lib/format";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: me } = useGetMe({ query: { retry: false } });
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        window.location.href = "/dang-nhap";
      }
    });
  };

  const isCustomerPage = !location.startsWith("/admin") && !location.startsWith("/dang-nhap") && !location.startsWith("/dang-ky");

  if (!isCustomerPage) {
    return <>{children}</>;
  }

  const navItems = [
    { href: "/", icon: Home, label: "TRANG CHỦ" },
    { href: "/san-pham", icon: Package, label: "SẢN PHẨM" },
    { href: "/nap-tien", icon: Wallet, label: "NẠP TIỀN" },
    { href: "/don-hang", icon: ShoppingCart, label: "ĐƠN HÀNG" },
    { href: "/thong-tin", icon: User, label: "THÔNG TIN" },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-50 pb-20 md:pb-0">
      {/* Top Bar */}
      <div className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-1 flex justify-between items-center text-[10px] text-white font-medium tracking-wider">
        <div className="flex gap-4">
          <span>Vietnamese</span>
        </div>
        <div>VND</div>
      </div>

      {/* Header Card */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
              <SheetHeader className="p-6 text-left border-b bg-gradient-to-r from-blue-600 to-cyan-500 text-white">
                <SheetTitle className="text-white font-black text-2xl tracking-tighter">TUANANHPROXY</SheetTitle>
                <p className="text-blue-100 text-xs uppercase tracking-widest font-semibold">Dịch Vụ Proxy Free Fire VN</p>
                {me && (
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <div className="text-sm font-medium">{me.username}</div>
                    <div className="text-lg font-bold text-yellow-300">{formatVND(me.balance)}</div>
                  </div>
                )}
              </SheetHeader>
              
              <div className="flex-1 overflow-y-auto py-4">
                <div className="px-3 space-y-1">
                  {navItems.map((item) => {
                    const isActive = location === item.href;
                    return (
                      <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    );
                  })}
                  
                  {me && (
                    <>
                      <div className="my-4 border-t border-slate-100 mx-3"></div>
                      <Link href="/tiep-thi" className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                        <LinkIcon className="h-5 w-5" />
                        TIẾP THỊ LIÊN KẾT
                      </Link>
                      
                      {me.isAdmin && (
                        <Link href="/admin" className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-purple-600 hover:bg-purple-50 transition-colors">
                          <Shield className="h-5 w-5" />
                          QUẢN TRỊ VIÊN
                        </Link>
                      )}
                      
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left">
                        <LogOut className="h-5 w-5" />
                        ĐĂNG XUẤT
                      </button>
                    </>
                  )}

                  {!me && (
                    <div className="mt-4 px-3">
                      <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                        <Link href="/dang-nhap">ĐĂNG NHẬP</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex gap-1">
            {navItems.map((item) => (
              <Button key={item.href} variant={location === item.href ? "secondary" : "ghost"} asChild className="font-semibold text-xs tracking-wider">
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </div>

          <Link href="/" className="flex flex-col items-center justify-center -space-y-1">
            <span className="text-2xl md:text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600">TUANANHPROXY</span>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest hidden md:block">Dịch Vụ Proxy Free Fire VN</span>
          </Link>

          <Button variant="ghost" size="icon" className="text-slate-500 hover:text-blue-600">
            <Search className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto md:p-6">
        {children}
      </main>

      {/* Bottom Nav (Mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-between px-2 pb-safe z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
              <item.icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className={`text-[9px] font-bold tracking-wide ${isActive ? 'opacity-100' : 'opacity-70'}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Floating Zalo Button */}
      <a 
        href="https://zalo.me/0339651811" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-24 md:bottom-8 right-4 bg-white rounded-full shadow-lg p-1.5 pr-4 flex items-center gap-3 border border-slate-100 hover:shadow-xl transition-shadow z-50 group"
      >
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden group-hover:scale-105 transition-transform">
          Zalo
        </div>
        <span className="text-sm font-bold text-slate-700">Chat hỗ trợ</span>
      </a>
    </div>
  );
}
