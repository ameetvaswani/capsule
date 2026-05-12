import { Redirect } from "expo-router";
import { useAuth } from "../lib/auth-context";

export default function Index() {
  const { user } = useAuth();

  if (user) {
    return <Redirect href="/(tabs)/today" />;
  }

  return <Redirect href="/login" />;
}
