import { ProtectedRoute } from './components/ProtectedRoute';
import CommandCenter from './components/CommandCenter';

export default function Home() {
  return (
    <ProtectedRoute>
      <CommandCenter />
    </ProtectedRoute>
  );
}