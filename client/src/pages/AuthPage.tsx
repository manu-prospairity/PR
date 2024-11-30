import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUser } from "../hooks/use-user";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const { login, register } = useUser();
  const { toast } = useToast();

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
    isLogin: boolean
  ) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    try {
      if (isLogin) {
        await login({ username, password });
      } else {
        await register({ username, password });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to Stock Prediction Game</CardTitle>
          <CardDescription>
            Login or create an account to start making predictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form
                onSubmit={(e) => handleSubmit(e, true)}
                className="space-y-4"
              >
                <Input name="username" placeholder="Username" required />
                <Input
                  name="password"
                  type="password"
                  placeholder="Password"
                  required
                />
                <Button type="submit" className="w-full">
                  Login
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="register">
              <form
                onSubmit={(e) => handleSubmit(e, false)}
                className="space-y-4"
              >
                <Input name="username" placeholder="Username" required />
                <Input
                  name="password"
                  type="password"
                  placeholder="Password"
                  required
                />
                <Button type="submit" className="w-full">
                  Register
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
