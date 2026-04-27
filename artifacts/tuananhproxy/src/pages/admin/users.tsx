import { useAdminListUsers, useAdminAdjustBalance, getAdminListUsersQueryKey, getAdminStatsQueryKey } from "@workspace/api-client-react";
import { formatVND, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AdminLayout } from "./dashboard";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Coins, Search } from "lucide-react";

const adjustBalanceSchema = z.object({
  amount: z.coerce.number().refine(val => val !== 0, "Số tiền phải khác 0"),
  reason: z.string().min(1, "Vui lòng nhập lý do"),
});

export default function AdminUsers() {
  const { data: users, isLoading } = useAdminListUsers();
  const adjustBalance = useAdminAdjustBalance();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<{id: number, username: string} | null>(null);

  const form = useForm<z.infer<typeof adjustBalanceSchema>>({
    resolver: zodResolver(adjustBalanceSchema),
    defaultValues: { amount: 0, reason: "" },
  });

  const handleOpenDialog = (user: {id: number, username: string}) => {
    setSelectedUser(user);
    form.reset({ amount: 0, reason: "Admin cộng/trừ tiền" });
  };

  const onSubmit = (values: z.infer<typeof adjustBalanceSchema>) => {
    if (!selectedUser) return;
    
    adjustBalance.mutate(
      { userId: selectedUser.id, data: values },
      {
        onSuccess: () => {
          toast({ title: "Thành công", description: `Đã cập nhật số dư cho ${selectedUser.username}.` });
          queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getAdminStatsQueryKey() });
          setSelectedUser(null);
        },
        onError: (error: any) => {
          toast({ variant: "destructive", title: "Lỗi", description: error.error || "Không thể cập nhật số dư." });
        }
      }
    );
  };

  const filteredUsers = users?.filter(u => u.username.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Người Dùng</h1>
          <p className="text-slate-500">Quản lý tài khoản và số dư thành viên.</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Tìm theo username..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-xs border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Username</th>
                <th className="px-6 py-4">Số dư</th>
                <th className="px-6 py-4">Tổng Nạp</th>
                <th className="px-6 py-4">Đơn Hàng</th>
                <th className="px-6 py-4">Ngày Tham Gia</th>
                <th className="px-6 py-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">Đang tải...</td></tr>
              ) : filteredUsers?.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-slate-500">#{user.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{user.username}</span>
                      {user.isAdmin && <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-none uppercase text-[10px] font-bold">Admin</Badge>}
                    </div>
                    {user.referredBy && <div className="text-xs text-slate-400 mt-1">Ref by: {user.referredBy}</div>}
                  </td>
                  <td className="px-6 py-4 font-black text-blue-600">{formatVND(user.balance)}</td>
                  <td className="px-6 py-4 font-bold text-slate-700">{formatVND(user.totalDeposited)}</td>
                  <td className="px-6 py-4 text-slate-600">{user.ordersCount}</td>
                  <td className="px-6 py-4 text-slate-500">{formatDate(user.createdAt)}</td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="outline" size="sm" className="font-bold border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => handleOpenDialog(user)}>
                      <Coins className="w-4 h-4 mr-2" /> +/- SỐ DƯ
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cộng/Trừ Số Dư - {selectedUser?.username}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số tiền (Dương để cộng, âm để trừ)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <p className="text-xs text-slate-500 mt-1">
                      Sẽ {form.watch("amount") >= 0 ? "cộng" : "trừ"} <span className="font-bold text-blue-600">{formatVND(Math.abs(form.watch("amount") || 0))}</span> vào tài khoản.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lý do</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSelectedUser(null)}>Hủy</Button>
                <Button type="submit" disabled={adjustBalance.isPending}>Xác nhận</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
