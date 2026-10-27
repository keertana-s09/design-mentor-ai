import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Upload, Sparkles, X, Link, ImageIcon, ExternalLink, Globe, Plus, GitBranch } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { analyzeStoredDesign } from "@/lib/functions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UploadMode = "file" | "url";

const MAX_SCREENS = 6;
const NO_PARENT = "none";

const DesignUpload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [uploadMode, setUploadMode] = useState<UploadMode>("file");
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [urlPreviewValid, setUrlPreviewValid] = useState(false);
  const [urlStatus, setUrlStatus] = useState<"idle" | "checking" | "image" | "page" | "unreachable" | "invalid">("idle");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [platform, setPlatform] = useState<string>("auto");
  const [myDesigns, setMyDesigns] = useState<{ id: string; title: string; created_at: string }[]>([]);
  const [parentDesignId, setParentDesignId] = useState<string>(NO_PARENT);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("designs")
      .select("id, title, created_at")
      .eq("designer_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setMyDesigns(data ?? []));
  }, [user]);

  const handleFilesSelect = (selected: FileList | File[]) => {
    const images = Array.from(selected).filter((f) => f.type.startsWith("image/"));
    if (images.length < selected.length) toast.error("Only image files can be added");
    const room = MAX_SCREENS - files.length;
    if (images.length > room) toast.error(`You can add up to ${MAX_SCREENS} screens per design`);
    const added = images.slice(0, Math.max(0, room));
    setFiles((prev) => [...prev, ...added]);
    setFilePreviews((prev) => [...prev, ...added.map((f) => URL.createObjectURL(f))]);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(filePreviews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) handleFilesSelect(e.dataTransfer.files);
  };

  const isPortfolioPageUrl = (url: string) => {
    return /^https?:\/\/(www\.)?(behance\.net|dribbble\.com|figma\.com|artstation\.com|pinterest\.|instagram\.com|drive\.google\.com|notion\.so)/i.test(url);
  };

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    setPreview(null);
    setUrlPreviewValid(false);

    if (!url.match(/^https?:\/\/.+/i)) {
      setUrlStatus(url ? "invalid" : "idle");
      return;
    }

    if (isPortfolioPageUrl(url)) {
      setUrlStatus("page");
      return;
    }

    setUrlStatus("checking");
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = window.setTimeout(() => {
      img.src = "";
      setUrlStatus("unreachable");
    }, 10000);

    img.onload = () => {
      window.clearTimeout(timer);
      setUrlStatus("image");
      setUrlPreviewValid(true);
      setPreview(url);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      setUrlStatus("unreachable");
    };
    img.src = url;
  };

  const isReadyToSubmit = () => {
    if (!user) return false;
    if (uploadMode === "file") return files.length > 0;
    if (uploadMode === "url") return !!imageUrl && urlStatus === "image";
    return false;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isReadyToSubmit()) return;

    setIsUploading(true);

    try {
      let finalImageUrl = "";
      let storagePaths: string[] = [];

      if (uploadMode === "file" && files.length > 0) {
        // Upload every screen, in order, into the designer's own folder
        const stamp = Date.now();
        storagePaths = await Promise.all(
          files.map(async (file, i) => {
            const fileExt = file.name.split(".").pop();
            const fileName = `${user.id}/${stamp}-${i}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from("designs").upload(fileName, file);
            if (uploadError) throw uploadError;
            return fileName;
          })
        );

        finalImageUrl = supabase.storage.from("designs").getPublicUrl(storagePaths[0]).data.publicUrl;
      } else if (uploadMode === "url") {
        finalImageUrl = imageUrl;
      }

      // Build description with portfolio URL if provided
      const fullDescription = portfolioUrl
        ? `${description}\n\nPortfolio: ${portfolioUrl}`.trim()
        : description;

      // Create design record
      const { data: design, error: designError } = await supabase
        .from("designs")
        .insert({
          designer_id: user.id,
          title: title.trim() || "Untitled design",
          description: fullDescription,
          category,
          image_url: finalImageUrl,
          source_type: uploadMode,
          source_platform: uploadMode === "url" ? platform : null,
          source_url: uploadMode === "url" ? imageUrl : null,
          storage_path: storagePaths[0] ?? null,
          storage_paths: storagePaths.length > 0 ? storagePaths : null,
          parent_design_id: parentDesignId === NO_PARENT ? null : parentDesignId,
        })
        .select()
        .single();


      if (designError) throw designError;

      // The server loads the stored files, critiques them and saves a verified result
      setIsAnalyzing(true);
      try {
        await analyzeStoredDesign(design.id);
        toast.success("Design uploaded and analyzed!");
      } catch (analysisError) {
        toast.error(analysisError instanceof Error ? analysisError.message : "Your design was saved, but we couldn't analyze it.");
      }
      navigate(`/critique/${design.id}`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload design");
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  const clearFile = () => {
    filePreviews.forEach((url) => URL.revokeObjectURL(url));
    setFiles([]);
    setFilePreviews([]);
    setPreview(null);
    setImageUrl("");
    setUrlPreviewValid(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Upload New Design
          </h1>
          <p className="text-muted-foreground mb-8">
            Share your work and get AI-powered feedback to improve your skills.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Upload Mode Toggle */}
            <div className="flex gap-2 p-1 rounded-xl bg-secondary/50 w-fit">
              <button
                type="button"
                onClick={() => { setUploadMode("file"); clearFile(); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  uploadMode === "file"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload File
              </button>
              <button
                type="button"
                onClick={() => { setUploadMode("url"); clearFile(); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  uploadMode === "url"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Link className="w-4 h-4" />
                Paste URL
              </button>
            </div>

            {/* Upload Zone */}
            {uploadMode === "file" ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`relative rounded-2xl transition-all duration-300 ${
                  isDragging ? "scale-[1.02]" : ""
                }`}
              >
                <div className={`absolute inset-0 rounded-2xl bg-gradient-primary opacity-50 ${
                  isDragging ? "opacity-100" : ""
                } transition-opacity duration-300`} />

                <div className="relative glass rounded-xl overflow-hidden">
                  {filePreviews.length > 0 ? (
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {filePreviews.map((src, i) => (
                          <div key={src} className="relative rounded-lg overflow-hidden border border-border bg-secondary aspect-[4/3]">
                            <img src={src} alt={`Screen ${i + 1}`} className="w-full h-full object-contain" />
                            <span className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded bg-background/80 text-foreground">
                              {i + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeFile(i)}
                              aria-label={`Remove screen ${i + 1}`}
                              className="absolute top-2 right-2 p-1 rounded bg-background/80 text-muted-foreground hover:text-foreground"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {files.length < MAX_SCREENS && (
                          <label className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border aspect-[4/3] cursor-pointer text-muted-foreground hover:text-primary hover:border-primary transition-colors">
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => {
                                if (e.target.files?.length) handleFilesSelect(e.target.files);
                                e.target.value = "";
                              }}
                              className="sr-only"
                            />
                            <Plus className="w-5 h-5" />
                            <span className="text-xs">Add next screen</span>
                          </label>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {files.length > 1
                          ? `${files.length} screens, reviewed in this order as one user flow.`
                          : "Got more screens? Add them in order and we'll review the whole flow, not just this one."}
                      </p>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center py-16 cursor-pointer group">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          if (e.target.files?.length) handleFilesSelect(e.target.files);
                          e.target.value = "";
                        }}
                        className="sr-only"
                      />
                      <div className={`p-6 rounded-2xl mb-6 transition-all ${
                        isDragging ? "bg-primary/20" : "bg-secondary/50 group-hover:bg-secondary"
                      }`}>
                        <Upload className={`w-10 h-10 ${
                          isDragging ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                        }`} />
                      </div>
                      <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                        {isDragging ? "Drop it here!" : "Upload your design"}
                      </h3>
                      <p className="text-muted-foreground text-center">
                        Drag and drop, or <span className="text-primary font-medium">browse</span>
                      </p>
                      <p className="text-muted-foreground/60 text-sm mt-2">
                        PNG, JPG, WebP up to 10MB · up to {MAX_SCREENS} screens for a user flow
                      </p>
                    </label>
                  )}
                </div>
              </div>
            ) : (
              <div className="glass rounded-xl p-6 space-y-4">
                {/* Platform Selector */}
                <div className="space-y-2">
                  <Label className="text-foreground">Platform</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger className="bg-secondary/50 border-border">
                      <Globe className="w-4 h-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="auto">Auto-detect</SelectItem>
                      <SelectItem value="behance">Behance</SelectItem>
                      <SelectItem value="dribbble">Dribbble</SelectItem>
                      <SelectItem value="figma">Figma</SelectItem>
                      <SelectItem value="artstation">ArtStation</SelectItem>
                      <SelectItem value="other">Other / Direct Image</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imageUrl" className="text-foreground">Direct image URL *</Label>
                  <div className="relative">
                    <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="imageUrl"
                      type="url"
                      value={imageUrl}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      placeholder="https://cdn.example.com/my-design.png"
                      className="pl-10 bg-secondary/50 border-border"
                    />
                  </div>
                  <p className="text-muted-foreground/60 text-xs">
                    The link must point straight at the picture (ending in .png, .jpg, .webp). On Behance or Dribbble, right-click the design image and choose "Copy image address".
                  </p>
                </div>

                {/* URL Preview - Image */}
                {preview && urlStatus === "image" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative rounded-xl overflow-hidden border border-border"
                  >
                    <img
                      src={preview}
                      alt="URL Preview"
                      className="w-full h-auto max-h-[400px] object-contain"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 flex items-center gap-2 text-sm text-muted-foreground">
                      <ImageIcon className="w-4 h-4 text-accent" />
                      <span>Image loaded — ready for AI feedback</span>
                    </div>
                    <div className="absolute bottom-4 right-4">
                      <Button
                        type="button"
                        variant="glass"
                        size="sm"
                        onClick={clearFile}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {(urlStatus === "page" || urlStatus === "unreachable" || urlStatus === "invalid") && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 space-y-2"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {urlStatus === "page"
                        ? "That's a project page, not the image itself"
                        : urlStatus === "invalid"
                          ? "That doesn't look like a web address"
                          : "We couldn't load a picture from that link"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {urlStatus === "page"
                        ? 'Open the project, right-click the design, choose "Copy image address", and paste that here — or switch to Upload File and add a screenshot.'
                        : urlStatus === "invalid"
                          ? "Start the link with https:// and make sure it points at an image file."
                          : "The site may be blocking downloads. Save the design as a PNG or JPG and use Upload File instead."}
                    </p>
                    <Button
                      type="button"
                      variant="glass"
                      size="sm"
                      onClick={() => { setUploadMode("file"); clearFile(); }}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload a file instead
                    </Button>
                  </motion.div>
                )}


                {imageUrl && !urlPreviewValid && (
                  <p className="text-sm text-muted-foreground">
                    Validating URL...
                  </p>
                )}
              </div>
            )}

            {/* Version history */}
            {myDesigns.length > 0 && (
              <div className="glass rounded-xl p-6 space-y-2">
                <Label className="text-foreground flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-primary" />
                  Is this a new version of an earlier design?
                </Label>
                <Select value={parentDesignId} onValueChange={setParentDesignId}>
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value={NO_PARENT}>No, it's a new design</SelectItem>
                    {myDesigns.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.title} · {new Date(d.created_at).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Link it and we'll show what you fixed since last time, and your score change over versions.
                </p>
              </div>
            )}

            {/* Form Fields */}
            <div className="glass rounded-xl p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-foreground">Design Title (optional)</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., E-commerce Dashboard"
                  className="bg-secondary/50 border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-foreground">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us about your design..."
                  rows={3}
                  className="bg-secondary/50 border-border resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-foreground">Category</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., Web App, Mobile"
                    className="bg-secondary/50 border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portfolioUrl" className="text-foreground">Portfolio URL</Label>
                  <div className="relative">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="portfolioUrl"
                      type="url"
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      placeholder="https://yourportfolio.com"
                      className="pl-9 bg-secondary/50 border-border"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              variant="hero"
              size="xl"
              className="w-full gap-2"
              disabled={!isReadyToSubmit() || isUploading || isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-5 h-5" />
                  </motion.div>
                  Analyzing with AI...
                </>
              ) : isUploading ? (
                <>
                  <Upload className="w-5 h-5" />
                  Uploading...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Upload & Get AI Feedback
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default DesignUpload;
