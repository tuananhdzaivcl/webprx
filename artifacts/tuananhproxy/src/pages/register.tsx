import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useRegister, useGetMe } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useEffect } from "react";

const registerSchema = z.object({
  username: z.string().min(3, "Tên đăng nhập phải có ít nhất 3 ký tự").regex(/^[a-zA-Z0-9_]+$/, "Chỉ chứa chữ cái, số và dấu gạch dưới"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  confirmPassword: z.string(),
  referralCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"],
});

export default function Register() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const register = useRegister();
  const { data: me } = useGetMe({ query: { retry: false } });

  useEffect(() => {
    if (me) {
      setLocation("/");
    }
  }, [me, setLocation]);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", password: "", confirmPassword: "", referralCode: "" },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      form.setValue("referralCode", ref);
    }
  }, [form]);

  const onSubmit = (values: z.infer<typeof registerSchema>) => {
    const { confirmPassword, ...data } = values;
    register.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Đăng ký thành công", description: "Chào mừng bạn đến với TUANANHPROXY." });
        window.location.href = "/";
      },
      onError: (error: any) => {
        toast({ variant: "destructive", title: "Đăng ký thất bại", description: error.error || "Có lỗi xảy ra." });
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-cyan-500/20 z-0"></div>
      
      <Card className="w-full max-w-md relative z-10 shadow-xl border-blue-100">
        <CardHeader className="text-center space-y-2 pb-6 border-b border-slate-100">
          <CardTitle className="text-2xl font-black tracking-tight text-slate-800">TẠO TÀI KHOẢN</CardTitle>
          <CardDescription className="text-slate-500">Tham gia TUANANHPROXY ngay hôm nay</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Tên đăng nhập</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập tên đăng nhập..." className="h-12 bg-slate-50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Mật khẩu</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" className="h-12 bg-slate-50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Xác nhận mật khẩu</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" className="h-12 bg-slate-50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="referralCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700 flex justify-between">
                      <span>Mã giới thiệu (Nếu có)</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Mã người giới thiệu..." className="h-12 bg-slate-50" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-md mt-6" disabled={register.isPending}>
                {register.isPending ? "ĐANG ĐĂNG KÝ..." : "ĐĂNG KÝ"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-slate-100 pt-6">
          <p className="text-sm text-slate-600">
            Đã có tài khoản? <Link href="/dang-nhap" className="font-bold text-blue-600 hover:text-blue-700 underline underline-offset-4">Đăng nhập</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
