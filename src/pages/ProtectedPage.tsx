import { Link, useNavigate } from "react-router-dom";
import { useSession } from "../context/SessionContext";
import { Button } from "@/components/ui/button";
import supabase from "@/supabase";

const ProtectedPage = () => {
  const { session } = useSession();
  const navigate = useNavigate();
  return (
    <main className="p-4 flex max-w-3xl mx-auto flex-col gap-4 mt-10">
      <h1 className="text-3xl font-bold">This is a Protected Page</h1>
      <p>Current User : {session?.user.email || "None"}</p>
      <Button asChild>
        <Link className="home-link" to="/">
          ◄ Home
        </Link>
      </Button>
      <Button
        onClick={() => {
          supabase.auth.signOut().then(() => {
            navigate("/");
          });
        }}
      >
        Sign Out
      </Button>
    </main>
  );
};

export default ProtectedPage;
