import { useAdminListProducts, useAdminCreateProduct, useAdminUpdateProduct, useAdminDeleteProduct, getAdminListProductsQueryKey, getListProductsQueryKey } from "@workspace/api-client-react";
import { formatVND } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AdminLayout } from "./dashboard";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit, Trash2 } from "lucide-react";
import type { Product } from "@workspace/api-client-react";

const productSchema = z.object({
  categoryId: z.coerce.number().min(1, "Vui lòng chọn danh mục"),
  name: z.string().min(1, "Vui lòng nhập tên"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Giá phải lớn hơn hoặc bằng 0"),
  stock: z.coerce.number().min(0, "Kho phải lớn hơn hoặc bằng 0"),
  imageUrl: z.string().url("Vui lòng nhập URL hình ảnh hợp lệ").or(z.literal("")),
  active: z.boolean().default(true),
});

export default function AdminProducts() {
  const { data: categories, isLoading } = useAdminListProducts();
  const createProduct = useAdminCreateProduct();
  const updateProduct = useAdminUpdateProduct();
  const deleteProduct = useAdminDeleteProduct();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: { categoryId: 1, name: "", description: "", price: 0, stock: 0, imageUrl: "", active: true },
  });

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      form.reset({
        categoryId: product.categoryId,
        name: product.name,
        description: product.description || "",
        price: product.price,
        stock: product.stock,
        imageUrl: product.imageUrl,
        active: product.active,
      });
    } else {
      setEditingProduct(null);
      form.reset({ categoryId: 1, name: "", description: "", price: 0, stock: 0, imageUrl: `${import.meta.env.BASE_URL}sample-aim-cap-antenna.png`, active: true });
    }
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Bạn có chắc muốn xóa sản phẩm này?")) {
      deleteProduct.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Thành công", description: "Đã xóa sản phẩm." });
          queryClient.invalidateQueries({ queryKey: getAdminListProductsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        },
        onError: (error: any) => {
          toast({ variant: "destructive", title: "Lỗi", description: error.error || "Không thể xóa." });
        }
      });
    }
  };

  const onSubmit = (values: z.infer<typeof productSchema>) => {
    const mutation = editingProduct ? updateProduct : createProduct;
    const args = editingProduct ? { id: editingProduct.id, data: values } : { data: values };
    
    // @ts-ignore - TS complains about different union signatures, but it's safe at runtime
    mutation.mutate(args as any, {
      onSuccess: () => {
        toast({ title: "Thành công", description: `Đã ${editingProduct ? 'cập nhật' : 'thêm'} sản phẩm.` });
        queryClient.invalidateQueries({ queryKey: getAdminListProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setDialogOpen(false);
      },
      onError: (error: any) => {
        toast({ variant: "destructive", title: "Lỗi", description: error.error || "Có lỗi xảy ra." });
      }
    });
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Sản Phẩm</h1>
          <p className="text-slate-500">Quản lý kho công cụ cheat, aim, mod.</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold" onClick={() => handleOpenDialog()}>
          <Plus className="w-5 h-5 mr-2" /> THÊM SẢN PHẨM
        </Button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center">Đang tải...</div>
      ) : (
        <div className="space-y-8">
          {categories?.map((category) => (
            <div key={category.id}>
              <h2 className="text-xl font-bold text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b-2 border-slate-200 inline-block">{category.name}</h2>
              <Card className="border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-xs border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 w-16">Ảnh</th>
                        <th className="px-6 py-4">Tên Sản Phẩm</th>
                        <th className="px-6 py-4">Giá</th>
                        <th className="px-6 py-4">Kho</th>
                        <th className="px-6 py-4">Đã Bán</th>
                        <th className="px-6 py-4">Trạng Thái</th>
                        <th className="px-6 py-4 text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {category.products.map((product) => (
                        <tr key={product.id} className={`hover:bg-slate-50 ${!product.active ? 'opacity-50' : ''}`}>
                          <td className="px-6 py-4">
                            <img src={product.imageUrl || `${import.meta.env.BASE_URL}sample-aim-cap-antenna.png`} alt={product.name} className="w-10 h-10 object-contain rounded bg-slate-100" />
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-800">{product.name}</td>
                          <td className="px-6 py-4 font-black text-red-600">{formatVND(product.price)}</td>
                          <td className="px-6 py-4">
                            {product.stock > 0 ? <span className="font-bold text-slate-700">{product.stock}</span> : <Badge variant="destructive" className="text-[10px]">Hết hàng</Badge>}
                          </td>
                          <td className="px-6 py-4 font-bold text-teal-600">{product.sold}</td>
                          <td className="px-6 py-4">
                            {product.active ? <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">Hiển thị</Badge> : <Badge variant="secondary">Đã ẩn</Badge>}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleOpenDialog(product)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={() => handleDelete(product.id)} disabled={deleteProduct.isPending}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {category.products.length === 0 && (
                        <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">Chưa có sản phẩm.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Sửa Sản Phẩm" : "Thêm Sản Phẩm Mới"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Tên sản phẩm</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Danh mục (ID)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <p className="text-xs text-slate-500">1: Aimbot, 2: Chức năng Khác</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Giá bán (VND)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số lượng kho (Key)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>URL Hình ảnh</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Mô tả (Tùy chọn)</FormLabel>
                      <FormControl><Textarea {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 col-span-2">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Hiển thị công khai</FormLabel>
                        <p className="text-sm text-slate-500">Khách hàng có thể thấy và mua sản phẩm này</p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
                <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>Lưu Sản Phẩm</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
