import { useAdminListDeposits, useAdminApproveDeposit, useAdminRejectDeposit, getAdminListDepositsQueryKey, getAdminStatsQueryKey } from "@workspace/api-client-react";
import { formatVND, formatDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminLayout } from "./dashboard";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";

export default function AdminDeposits() {
  const { data: deposits, isLoading } = useAdminListDeposits();
  const approveDeposit = useAdminApproveDeposit();
  const rejectDeposit = useAdminRejectDeposit();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleAction = (id: number, action: 'approve' | 'reject') => {
    const mutation = action === 'approve' ? approveDeposit : rejectDeposit;
    mutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Thành công", description: `Đã ${action === 'approve' ? 'duyệt' : 'từ chối'} yêu cầu nạp tiền.` });
          queryClient.invalidateQueries({ queryKey: getAdminListDepositsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getAdminStatsQueryKey() });
        },
        onError: (error: any) => {
          toast({ variant: "destructive", title: "Lỗi", description: error.error || "Không thể thực hiện thao tác." });
        }
      }
    );
  };

  // Sort: pending first
  const sortedDeposits = deposits ? [...deposits].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }) : [];

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Nạp Tiền</h1>
        <p className="text-slate-500">Duyệt các yêu cầu nạp tiền chuyển khoản thủ công.</p>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-xs border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Username</th>
                <th className="px-6 py-4">Số Tiền</th>
                <th className="px-6 py-4">Nội Dung CK</th>
                <th className="px-6 py-4">Trạng Thái</th>
                <th className="px-6 py-4">Thời Gian</th>
                <th className="px-6 py-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">Đang tải...</td></tr>
              ) : sortedDeposits?.map((deposit) => (
                <tr key={deposit.id} className={`hover:bg-slate-50 ${deposit.status === 'pending' ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-6 py-4 font-mono text-slate-500">#{deposit.id}</td>
                  <td className="px-6 py-4 font-bold text-slate-800">{deposit.username}</td>
                  <td className="px-6 py-4 font-black text-blue-600">{formatVND(deposit.amount)}</td>
                  <td className="px-6 py-4 font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded px-2 m-2 inline-block break-all max-w-[200px]">{deposit.note}</td>
                  <td className="px-6 py-4">
                    {deposit.status === 'pending' && <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 uppercase font-bold text-[10px]">Chờ duyệt</Badge>}
                    {deposit.status === 'approved' && <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none uppercase font-bold text-[10px]">Thành công</Badge>}
                    {deposit.status === 'rejected' && <Badge variant="destructive" className="uppercase font-bold text-[10px]">Từ chối</Badge>}
                  </td>
                  <td className="px-6 py-4 text-slate-500">{formatDate(deposit.createdAt)}</td>
                  <td className="px-6 py-4 text-right">
                    {deposit.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white font-bold" onClick={() => handleAction(deposit.id, 'approve')} disabled={approveDeposit.isPending || rejectDeposit.isPending}>
                          <Check className="w-4 h-4 mr-1" /> Duyệt
                        </Button>
                        <Button size="sm" variant="destructive" className="font-bold" onClick={() => handleAction(deposit.id, 'reject')} disabled={approveDeposit.isPending || rejectDeposit.isPending}>
                          <X className="w-4 h-4 mr-1" /> Từ chối
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {sortedDeposits?.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">Không có yêu cầu nạp tiền nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminLayout>
  );
}
