import { Link } from "react-router-dom";
import { Button } from "@/components/core/button";

const WaitlistPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <h1 className="text-3xl font-bold mb-4">Join the Waitlist!</h1>
      <p className="mb-6 text-muted-foreground max-w-md">
        We're not quite ready for new sign-ups yet, but leave your details below
        (or connect your preferred service) to be notified when we launch!
      </p>
      {/* Add your waitlist form/integration here */}
      <div className="mb-8 p-8 border rounded-lg bg-card w-full max-w-sm">
        <p className="text-lg">[Waitlist Form Placeholder]</p>
        {/* Example: Mailchimp embed, Tally form, etc. */}
      </div>
      <Button asChild variant="outline">
        <Link to="/login">Back to Login</Link>
      </Button>
    </div>
  );
};

export default WaitlistPage; 