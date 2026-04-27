import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useLogin, useGetMe } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";

const loginSchema = z.object({
  username: z.string().min(1, "Vui lòng nhập tên đăng nhập"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const login = useLogin();
  const { data: me } = useGetMe({ query: { retry: false } });

  if (me) {
    setLocation("/");
    return null;
  }

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    login.mutate({ data: values }, {
      onSuccess: () => {
        window.location.href = "/";
      },
      onError: (error: any) => {
        toast({ variant: "destructive", title: "Đăng nhập thất bại", description: error.error || "Sai tên đăng nhập hoặc mật khẩu." });
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-cyan-500/20 z-0"></div>
      
      <Card className="w-full max-w-md relative z-10 shadow-xl border-blue-100">
        <CardHeader className="text-center space-y-2 pb-6 border-b border-slate-100">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center mb-2 shadow-md transform rotate-3">
            <span className="text-white font-black text-xl -rotate-3">TA</span>
          </div>
          <CardTitle className="text-2xl font-black tracking-tight text-slate-800">ĐĂNG NHẬP</CardTitle>
          <CardDescription className="text-slate-500">Chào mừng trở lại với TUANANHPROXY</CardDescription>
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
              <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-md mt-6" disabled={login.isPending}>
                {login.isPending ? "ĐANG ĐĂNG NHẬP..." : "ĐĂNG NHẬP"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-slate-100 pt-6">
          <p className="text-sm text-slate-600">
            Chưa có tài khoản? <Link href="/dang-ky" className="font-bold text-blue-600 hover:text-blue-700 underline underline-offset-4">Đăng ký ngay</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
