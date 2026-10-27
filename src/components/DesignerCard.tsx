import { useNavigate } from "react-router-dom";
import { User, FileImage, Clock, CheckCircle, AlertCircle, Star, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Evaluation {
  rating: number | null;
  status: string | null;
  notes: string | null;
  updated_at: string;
}

interface DesignerCardProps {
  designer: {
    user_id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    design_count: number;
    pending_count: number;
    reviewed_count: number;
    latest_design_date: string | null;
    evaluation?: Evaluation | null;
  };
}

const statusColors: Record<string, string> = {
  pending: "text-yellow-400 bg-yellow-400/10",
  shortlisted: "text-accent bg-accent/10",
  contacted: "text-primary bg-primary/10",
  rejected: "text-orange-400 bg-orange-400/10",
};

export const DesignerCard = ({ designer }: DesignerCardProps) => {
  const navigate = useNavigate();
  const eval_ = designer.evaluation;

  const reviewStatus = designer.pending_count > 0 ? "pending" : designer.reviewed_count > 0 ? "reviewed" : "no_designs";

  const reviewStatusConfig = {
    pending: { label: "Pending Review", icon: Clock, className: "text-yellow-400 bg-yellow-400/10" },
    reviewed: { label: "Reviewed", icon: CheckCircle, className: "text-accent bg-accent/10" },
    no_designs: { label: "No Submissions", icon: AlertCircle, className: "text-muted-foreground bg-muted/50" },
  };

  const { label, icon: StatusIcon, className } = reviewStatusConfig[reviewStatus];

  return (
    <div className="glass rounded-xl p-6 flex flex-col gap-4 hover:bg-secondary/30 transition-colors">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
          {designer.avatar_url ? (
            <img
              src={designer.avatar_url}
              alt={designer.full_name || "Designer"}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <User className="w-5 h-5 text-primary-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-foreground truncate">
            {designer.full_name || "Unnamed Designer"}
          </h3>
          <p className="text-sm text-muted-foreground">UI/UX Designer</p>
        </div>

        {/* Rating stars */}
        {eval_?.rating && (
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((v) => (
              <Star
                key={v}
                className={`w-3.5 h-3.5 ${
                  v <= (eval_?.rating || 0)
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Submission status */}
      <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full w-fit ${className}`}>
        <StatusIcon className="w-3.5 h-3.5" />
        {label}
      </div>

      {/* Evaluation status badge */}
      {eval_ && eval_.status && eval_.status !== "pending" && (
        <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full w-fit ${statusColors[eval_.status] || "text-muted-foreground bg-muted/50"}`}>
          {eval_.status === "shortlisted" && <CheckCircle className="w-3.5 h-3.5" />}
          {eval_.status === "contacted" && <MessageSquare className="w-3.5 h-3.5" />}
          {eval_.status === "rejected" && <AlertCircle className="w-3.5 h-3.5" />}
          {eval_.status.charAt(0).toUpperCase() + eval_.status.slice(1)}
        </div>
      )}

      {/* Recruiter notes preview */}
      {eval_?.notes && (
        <div className="bg-secondary/50 rounded-lg p-3 border border-border">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <MessageSquare className="w-3 h-3" />
            Your Notes
          </div>
          <p className="text-sm text-foreground/80 line-clamp-2">{eval_.notes}</p>
        </div>
      )}

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <FileImage className="w-4 h-4" />
          <span>{designer.design_count} design{designer.design_count !== 1 ? "s" : ""}</span>
        </div>
        {designer.latest_design_date && (
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{new Date(designer.latest_design_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      <Button
        variant="hero"
        size="sm"
        className="w-full gap-2 mt-auto"
        onClick={() => navigate(`/designer/${designer.user_id}`)}
        disabled={reviewStatus === "no_designs"}
      >
        {eval_ ? "Edit Evaluation" : "Review Design"}
      </Button>
    </div>
  );
};
