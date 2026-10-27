import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Image, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isAnalyzing?: boolean;
}

export const UploadZone = ({ onFileSelect, isAnalyzing = false }: UploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFile = (file: File) => {
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setFileName(file.name);
      };
      reader.readAsDataURL(file);
      onFileSelect(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const clearPreview = () => {
    setPreview(null);
    setFileName("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative overflow-hidden rounded-2xl transition-all duration-300
          ${isDragging ? "scale-[1.02]" : ""}
          ${preview ? "p-0" : "p-1"}
        `}
      >
        {/* Gradient border effect */}
        <div className={`
          absolute inset-0 rounded-2xl bg-gradient-primary opacity-50
          ${isDragging ? "opacity-100" : ""}
          transition-opacity duration-300
        `} />

        <div className={`
          relative glass rounded-xl overflow-hidden
          ${preview ? "" : "p-8 md:p-12"}
        `}>
          <AnimatePresence mode="wait">
            {preview ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative"
              >
                <img
                  src={preview}
                  alt="Upload preview"
                  className="w-full h-auto max-h-[400px] object-contain rounded-xl"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/20">
                        <Image className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-sm text-foreground/80 truncate">{fileName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="glass"
                        size="sm"
                        onClick={clearPreview}
                        disabled={isAnalyzing}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="hero"
                        size="lg"
                        disabled={isAnalyzing}
                        className="gap-2"
                      >
                        {isAnalyzing ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                              <Sparkles className="w-5 h-5" />
                            </motion.div>
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            Get Feedback
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.label
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center cursor-pointer group"
              >
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="sr-only"
                />
                
                <motion.div
                  animate={isDragging ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={`
                    relative p-6 rounded-2xl mb-6 transition-all duration-300
                    ${isDragging ? "bg-primary/20" : "bg-secondary/50 group-hover:bg-secondary"}
                  `}
                >
                  <Upload className={`
                    w-10 h-10 transition-colors duration-300
                    ${isDragging ? "text-primary" : "text-muted-foreground group-hover:text-primary"}
                  `} />
                  
                  {/* Glow effect */}
                  <div className={`
                    absolute inset-0 rounded-2xl bg-primary/20 blur-xl
                    transition-opacity duration-300
                    ${isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-50"}
                  `} />
                </motion.div>

                <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                  {isDragging ? "Drop it here!" : "Upload your design"}
                </h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  Drag and drop a screenshot, or{" "}
                  <span className="text-primary font-medium">browse</span> to choose a file
                </p>
                <p className="text-muted-foreground/60 text-sm mt-3">
                  PNG, JPG, WebP up to 10MB
                </p>
              </motion.label>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
