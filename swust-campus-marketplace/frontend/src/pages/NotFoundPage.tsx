import { useNavigate } from "react-router-dom";

import { Button, EmptyState } from "../components";

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <EmptyState
      title="Page not found"
      description="That route does not exist in the campus marketplace."
      action={<Button onClick={() => navigate("/")}>Back home</Button>}
    />
  );
}
