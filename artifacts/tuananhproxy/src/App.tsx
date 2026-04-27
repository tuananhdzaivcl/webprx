import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { AuthGuard, AdminGuard } from "@/components/guards";

import Home from "@/pages/home";
import Products from "@/pages/products";
import Deposit from "@/pages/deposit";
import Orders from "@/pages/orders";
import Account from "@/pages/account";
import Referral from "@/pages/referral";
import Login from "@/pages/login";
import Register from "@/pages/register";

import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminDeposits from "@/pages/admin/deposits";
import AdminProducts from "@/pages/admin/products";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        {/* Public routes */}
        <Route path="/" component={Home} />
        <Route path="/san-pham" component={Products} />
        <Route path="/dang-nhap" component={Login} />
        <Route path="/dang-ky" component={Register} />
        
        {/* Customer Protected routes */}
        <Route path="/nap-tien"><AuthGuard><Deposit /></AuthGuard></Route>
        <Route path="/don-hang"><AuthGuard><Orders /></AuthGuard></Route>
        <Route path="/thong-tin"><AuthGuard><Account /></AuthGuard></Route>
        <Route path="/tiep-thi"><AuthGuard><Referral /></AuthGuard></Route>
        
        {/* Admin routes */}
        <Route path="/admin"><AdminGuard><AdminDashboard /></AdminGuard></Route>
        <Route path="/admin/users"><AdminGuard><AdminUsers /></AdminGuard></Route>
        <Route path="/admin/deposits"><AdminGuard><AdminDeposits /></AdminGuard></Route>
        <Route path="/admin/products"><AdminGuard><AdminProducts /></AdminGuard></Route>

        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
