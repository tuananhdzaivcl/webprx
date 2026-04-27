import { useGetMe, useGetAccountSummary, useListTransactions, useLogout } from "@workspace/api-client-react";
import { formatVND, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, TrendingUp, ShoppingBag, LogOut, ArrowUpRight, ArrowDownRight, UserCircle } from "lucide-react";

export default function Account() {
  const { data: me } = useGetMe({ query: { retry: false } });
  const { data: summary, isLoading: loadingSummary } = useGetAccountSummary();
  const { data: transactions, isLoading: loadingTx } = useListTransactions();
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        window.location.href = "/dang-nhap";
      }
    });
  };

  if (!me) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center text-white shadow-md">
            <UserCircle className="h-10 w-10" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800">{me.username}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold">ID: {me.id}</Badge>
              {me.isAdmin && <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-none uppercase text-[10px] font-bold">Admin</Badge>}
            </div>
          </div>
        </div>
        <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hidden md:flex" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" /> Đăng xuất
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-blue-500/50 p-2 rounded-lg"><Wallet className="w-6 h-6 text-white" /></div>
            </div>
            <p className="text-blue-100 text-sm font-medium uppercase tracking-wider mb-1">Số dư hiện tại</p>
            {loadingSummary ? <Skeleton className="h-8 w-32 bg-blue-500/50" /> : <h3 className="text-3xl font-black text-yellow-300">{formatVND(me.balance)}</h3>}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-emerald-100 p-2 rounded-lg"><TrendingUp className="w-6 h-6 text-emerald-600" /></div>
            </div>
            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Tổng nạp</p>
            {loadingSummary ? <Skeleton className="h-8 w-32" /> : <h3 className="text-2xl font-bold text-slate-800">{formatVND(summary?.totalDeposited || 0)}</h3>}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-rose-100 p-2 rounded-lg"><ShoppingBag className="w-6 h-6 text-rose-600" /></div>
            </div>
            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Tổng chi tiêu</p>
            {loadingSummary ? <Skeleton className="h-8 w-32" /> : <h3 className="text-2xl font-bold text-slate-800">{formatVND(summary?.totalSpent || 0)}</h3>}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
          <CardTitle className="uppercase tracking-wider text-slate-800">Biến Động Số Dư</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingTx ? (
            <div className="p-6 space-y-4">
              {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Chưa có giao dịch nào.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {transactions.map((tx) => {
                const isPositive = tx.type === 'deposit' || tx.type === 'referral_commission' || tx.type === 'admin_add';
                return (
                  <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {isPositive ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{tx.description}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatDate(tx.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? '+' : '-'}{formatVND(tx.amount)}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">SD: {formatVND(tx.balanceAfter)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Button variant="outline" className="w-full text-red-600 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-700 md:hidden h-12 font-bold" onClick={handleLogout}>
        ĐĂNG XUẤT
      </Button>
    </div>
  );
}
