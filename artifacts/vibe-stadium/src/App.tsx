import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { useEffect } from 'react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { useStore } from '@/store';

import { AppShell } from '@/components/AppShell';
import MapPage from '@/pages/MapPage';
import AssistantPage from '@/pages/AssistantPage';
import RewardsPage from '@/pages/RewardsPage';
import TransitPage from '@/pages/TransitPage';
import OpsPage from '@/pages/OpsPage';
import AuthPage from '@/pages/AuthPage';
import ProfilePage from '@/pages/ProfilePage';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Configure the token getter globally for custom fetch request headers
setAuthTokenGetter(() => localStorage.getItem('token'));

const queryClient = new QueryClient();

function Router() {
  const loggedInUser = useStore((state) => state.user);
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!loggedInUser && location !== '/auth') {
      setLocation('/auth');
    }
  }, [loggedInUser, location, setLocation]);

  return (
    <AppShell>
      <Switch>
        <Route path="/">
          <ErrorBoundary fallbackTitle="Interactive Map Offline">
            <MapPage />
          </ErrorBoundary>
        </Route>
        <Route path="/assistant">
          <ErrorBoundary fallbackTitle="AI Companion Chat Offline">
            <AssistantPage />
          </ErrorBoundary>
        </Route>
        <Route path="/rewards">
          <ErrorBoundary fallbackTitle="Rewards Wallet Offline">
            <RewardsPage />
          </ErrorBoundary>
        </Route>
        <Route path="/transit">
          <ErrorBoundary fallbackTitle="Transit Timelines Offline">
            <TransitPage />
          </ErrorBoundary>
        </Route>
        <Route path="/ops" component={OpsPage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/profile/:userId?" component={ProfilePage} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}


function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
