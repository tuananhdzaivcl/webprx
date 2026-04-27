import { useListProducts, useCreateOrder, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { formatVND } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ShoppingCart, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function Products() {
  const { data: categories, isLoading } = useListProducts();
  const { data: me } = useGetMe({ query: { retry: false } });
  const createOrder = useCreateOrder();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const handleBuy = (productId: number) => {
    if (!me) {
      setLocation("/dang-nhap");
      return;
    }
    
    createOrder.mutate({ data: { productId } }, {
      onSuccess: () => {
        toast({ title: "Mua hàng thành công", description: "Đơn hàng của bạn đã được xử lý." });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setLocation("/don-hang");
      },
      onError: (error: any) => {
        toast({ variant: "destructive", title: "Lỗi", description: error.error || "Không thể mua hàng. Vui lòng thử lại." });
      }
    });
  };

  const filteredCategories = categories?.map(category => ({
    ...category,
    products: category.products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
  })).filter(category => category.products.length > 0);

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input 
          placeholder="Tìm kiếm sản phẩm..." 
          className="pl-10 h-12 text-base shadow-sm border-blue-200 focus-visible:ring-blue-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : (
        filteredCategories?.map((category) => (
          <div key={category.id} className="space-y-4">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg p-3 shadow-md border-b-4 border-blue-700">
              <h2 className="text-white font-bold uppercase tracking-wider text-lg">{category.name}</h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {category.products.map(product => (
                <Card key={product.id} className="overflow-hidden border-2 border-blue-100 flex flex-col hover:border-blue-300 transition-colors shadow-sm">
                  <div className="aspect-square bg-slate-100 p-2 relative">
                    <img 
                      src={product.imageUrl || `${import.meta.env.BASE_URL}sample-aim-cap-antenna.png`} 
                      alt={product.name} 
                      className="w-full h-full object-contain rounded-md mix-blend-multiply"
                    />
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      {product.stock > 0 ? (
                        <Badge className="bg-pink-500 hover:bg-pink-600 text-[10px] uppercase font-bold border-none">Kho hàng: {product.stock}</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px] uppercase font-bold border-none">Hết hàng</Badge>
                      )}
                    </div>
                  </div>
                  
                  <CardContent className="p-3 flex-1 flex flex-col">
                    <h3 className="font-bold text-sm md:text-base text-slate-800 leading-tight line-clamp-2 mb-2 flex-1">{product.name}</h3>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-xs text-teal-600 font-semibold bg-teal-50 px-2 py-0.5 rounded">Đã bán: {product.sold}</span>
                    </div>
                    <div className="mt-3 border-2 border-red-500 border-dashed rounded-md p-1.5 text-center bg-red-50">
                      <span className="text-red-600 font-black text-lg">{formatVND(product.price)}</span>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="p-3 pt-0">
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700 font-bold uppercase tracking-wider h-10 shadow-md shadow-blue-500/20" 
                      onClick={() => handleBuy(product.id)}
                      disabled={product.stock === 0 || createOrder.isPending}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" /> XEM NGAY
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      {!isLoading && (!filteredCategories || filteredCategories.length === 0) && (
        <div className="py-12 text-center text-slate-500 bg-white rounded-lg border border-dashed border-slate-200">
          Không tìm thấy sản phẩm nào.
        </div>
      )}
    </div>
  );
}
