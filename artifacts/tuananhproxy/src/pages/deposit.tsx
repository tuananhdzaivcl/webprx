import { useCreateDeposit, useListDeposits, useGetMe, getListDepositsQueryKey } from "@workspace/api-client-react";
import { formatVND, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Copy, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const depositSchema = z.object({
  amount: z.coerce.number().min(10000, "Số tiền nạp tối thiểu là 10.000đ"),
  note: z.string().min(1, "Vui lòng nhập nội dung chuyển khoản"),
});

export default function Deposit() {
  const { data: me } = useGetMe({ query: { retry: false } });
  const { data: deposits, isLoading } = useListDeposits();
  const createDeposit = useCreateDeposit();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof depositSchema>>({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      amount: 10000,
      note: me ? `NAP ${me.username}` : "",
    },
  });

  const onSubmit = (values: z.infer<typeof depositSchema>) => {
    createDeposit.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Đã gửi yêu cầu", description: "Yêu cầu nạp tiền đã được gửi. Vui lòng chờ admin duyệt." });
        queryClient.invalidateQueries({ queryKey: getListDepositsQueryKey() });
        form.reset();
      },
      onError: (error: any) => {
        toast({ variant: "destructive", title: "Lỗi", description: error.error || "Không thể gửi yêu cầu." });
      }
    });
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Đã copy", description: `Đã copy ${type} vào khay nhớ tạm.` });
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-blue-200 shadow-sm">
          <CardHeader className="bg-blue-50 border-b border-blue-100 rounded-t-lg pb-4">
            <CardTitle className="text-blue-800 uppercase tracking-wide">Thông Tin Chuyển Khoản</CardTitle>
            <CardDescription className="text-blue-600">Quét mã QR hoặc chuyển khoản thủ công</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex justify-center bg-white p-4 rounded-xl border-2 border-dashed border-blue-200">
              <img src={`${import.meta.env.BASE_URL}qr-payment.jpeg`} alt="QR Code" className="max-w-[200px] w-full rounded-lg shadow-sm" />
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-sm text-slate-500">Ngân hàng</span>
                <span className="font-bold">MB BANK</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-sm text-slate-500">Chủ tài khoản</span>
                <span className="font-bold">LUONG TUAN ANH</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Số tài khoản</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-600 text-lg">0339651811</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => copyToClipboard("0339651811", "số tài khoản")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 flex gap-3 text-amber-800 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <p>Chuyển khoản xong, vui lòng tạo lệnh nạp ở form bên cạnh. Admin sẽ duyệt cộng tiền vào tài khoản của bạn (5-10 phút).</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-200 shadow-sm">
          <CardHeader className="bg-cyan-50 border-b border-cyan-100 rounded-t-lg pb-4">
            <CardTitle className="text-cyan-800 uppercase tracking-wide">Tạo Lệnh Nạp</CardTitle>
            <CardDescription className="text-cyan-600">Điền thông tin sau khi đã chuyển khoản</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Số tiền đã chuyển (VND)</FormLabel>
                      <FormControl>
                        <Input type="number" className="h-12 text-lg font-bold text-blue-600" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold flex items-center justify-between">
                        <span>Nội dung chuyển khoản</span>
                        <Button type="button" variant="ghost" size="sm" className="h-6 text-xs text-blue-600 px-2" onClick={() => copyToClipboard(field.value, "nội dung")}>
                          <Copy className="h-3 w-3 mr-1" /> Copy
                        </Button>
                      </FormLabel>
                      <FormControl>
                        <Input className="h-12 uppercase font-bold bg-slate-50" {...field} readOnly />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold text-lg shadow-md" disabled={createDeposit.isPending}>
                  {createDeposit.isPending ? "ĐANG XỬ LÝ..." : "XÁC NHẬN ĐÃ CHUYỂN"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider pl-2 border-l-4 border-blue-500">Lịch Sử Nạp Tiền</h3>
        
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-lg" />)}
          </div>
        ) : !deposits || deposits.length === 0 ? (
          <div className="py-8 text-center text-slate-500 bg-white rounded-lg border border-dashed border-slate-200">
            Chưa có lịch sử nạp tiền.
          </div>
        ) : (
          <div className="space-y-3">
            {deposits.map((deposit) => (
              <Card key={deposit.id} className="overflow-hidden border border-slate-200">
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-lg text-blue-600">{formatVND(deposit.amount)}</div>
                    <div className="text-xs text-slate-500 font-mono mt-1">{deposit.note}</div>
                    <div className="text-xs text-slate-400 mt-1">{formatDate(deposit.createdAt)}</div>
                  </div>
                  <div>
                    {deposit.status === 'pending' && <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 uppercase font-bold text-[10px]">Đang chờ duyệt</Badge>}
                    {deposit.status === 'approved' && <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 uppercase font-bold text-[10px]">Thành công</Badge>}
                    {deposit.status === 'rejected' && <Badge variant="destructive" className="uppercase font-bold text-[10px]">Từ chối</Badge>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
