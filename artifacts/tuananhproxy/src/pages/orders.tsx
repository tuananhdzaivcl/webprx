import { useListOrders } from "@workspace/api-client-react";
import { formatVND, formatDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Copy, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Orders() {
  const { data: orders, isLoading } = useListOrders();
  const { toast } = useToast();

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Đã copy", description: "Đã copy key vào khay nhớ tạm." });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold uppercase tracking-wider text-slate-800 pb-2 border-b-2 border-blue-500 inline-block">Đơn Hàng Của Bạn</h2>
      
      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : (!orders || orders.length === 0) ? (
        <div className="py-16 text-center bg-white rounded-xl border border-dashed border-slate-200 shadow-sm">
          <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500">
            <Key className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">Chưa có đơn hàng</h3>
          <p className="text-slate-500 text-sm">Bạn chưa mua sản phẩm nào. Hãy khám phá cửa hàng nhé!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {orders.map((order) => (
            <Card key={order.id} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium">#{order.id} • {formatDate(order.createdAt)}</span>
                {order.status === 'completed' && <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none uppercase font-bold text-[10px]">Thành công</Badge>}
                {order.status === 'failed' && <Badge variant="destructive" className="uppercase font-bold text-[10px]">Thất bại</Badge>}
              </div>
              <div className="p-4 space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <h3 className="font-bold text-slate-800 leading-tight">{order.productName}</h3>
                  <span className="font-black text-red-600 shrink-0">{formatVND(order.price)}</span>
                </div>
                
                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                  <div className="text-[10px] uppercase font-bold text-blue-600 mb-1">Mã Key / Tài khoản</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white border border-blue-200 rounded px-3 py-2 text-sm font-mono text-slate-800 break-all select-all">
                      {order.code}
                    </code>
                    <Button variant="outline" size="icon" className="shrink-0 bg-white border-blue-200 hover:bg-blue-50 hover:text-blue-600" onClick={() => copyCode(order.code)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
