import { useGetReferralSummary } from "@workspace/api-client-react";
import { formatVND, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Copy, Users, Gift, TrendingUp, Share2 } from "lucide-react";

export default function Referral() {
  const { data: summary, isLoading } = useGetReferralSummary();
  const { toast } = useToast();

  const copyLink = () => {
    if (summary) {
      navigator.clipboard.writeText(summary.referralLink);
      toast({ title: "Đã copy", description: "Link giới thiệu đã được copy vào khay nhớ tạm." });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6">
      <Card className="border-purple-200 bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Share2 className="w-32 h-32" />
        </div>
        <CardHeader className="relative z-10 pb-2">
          <CardTitle className="text-2xl font-black">Chương Trình Tiếp Thị</CardTitle>
          <CardDescription className="text-purple-100 text-base">Nhận 20% hoa hồng vĩnh viễn</CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          <p className="mb-6 text-purple-50">Mời bạn bè đăng ký bằng link của bạn. Khi họ nạp tiền, bạn nhận 20% hoa hồng tự động cộng vào số dư, có thể dùng để mua tool.</p>
          
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-purple-200">Link giới thiệu của bạn</label>
            <div className="flex gap-2">
              <Input value={summary.referralLink} readOnly className="bg-white/20 border-white/30 text-white font-mono h-12" />
              <Button onClick={copyLink} className="h-12 px-6 bg-white text-purple-700 hover:bg-purple-50 font-bold shadow-md">
                <Copy className="w-4 h-4 mr-2" /> COPY
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 text-center space-y-2">
            <div className="bg-blue-100 w-12 h-12 mx-auto rounded-full flex items-center justify-center text-blue-600 mb-4">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Đã Giới Thiệu</p>
            <h3 className="text-3xl font-black text-slate-800">{summary.referredCount} <span className="text-lg font-bold text-slate-400">người</span></h3>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 text-center space-y-2">
            <div className="bg-emerald-100 w-12 h-12 mx-auto rounded-full flex items-center justify-center text-emerald-600 mb-4">
              <Gift className="w-6 h-6" />
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tổng Hoa Hồng</p>
            <h3 className="text-2xl font-black text-emerald-600">{formatVND(summary.totalCommission)}</h3>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2 text-slate-800 uppercase tracking-wider text-lg">
            <TrendingUp className="w-5 h-5 text-blue-500" /> Người Đã Mời
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {summary.recentReferrals.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Chưa có ai đăng ký qua link của bạn.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {summary.recentReferrals.map((ref, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <p className="font-bold text-slate-800">{ref.username}</p>
                    <p className="text-xs text-slate-500 mt-1">Tham gia: {formatDate(ref.joinedAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Hoa hồng nhận được</p>
                    <p className="font-bold text-emerald-600">{formatVND(ref.commissionEarned)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
