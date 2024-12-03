import { Route, Switch } from 'wouter';
import { Layout } from './components/Layout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PredictionsPage } from './pages/PredictionsPage';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        <Switch>
          <Route path="/" component={() => <div>Home Page</div>} />
          <Route path="/predictions" component={PredictionsPage} />
          <Route path="/leaderboard" component={() => <div>Leaderboard Page</div>} />
          <Route path="/stats" component={() => <div>Statistics Page</div>} />
          <Route path="/login" component={() => <div>Login Page</div>} />
        </Switch>
      </Layout>
    </QueryClientProvider>
  );
} 