import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/common/Layout";
import MetaTags from "@/components/common/MetaTags";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, 
  Link as LinkIcon, 
  FileText, 
  Sparkles, 
  AlertCircle,
  Loader2,
  File,
  FileImage,
  FileType,
  Youtube,
  Globe
} from "lucide-react";

const AutoCreateQuiz: React.FC = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Check if user has entered their name
  const [userName, setUserName] = useState("");
  
  // Form state
  const [formData, setFormData] = useState({
    files: [] as File[],
    topicPrompt: "",
    linkUrl: "",
    numberOfQuestions: 5,
    difficulty: "Medium",
    language: "English"
  });
  
  // File upload state
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileUploadProgress, setFileUploadProgress] = useState<{[key: string]: number}>({});
  const [filePreviews, setFilePreviews] = useState<{[key: string]: string}>({});
  
  // Processing state
  const [currentStep, setCurrentStep] = useState<'input' | 'processing' | 'generation' | 'review' | 'publish'>('input');
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Mock usage limit state
  const [dailyUsageCount, setDailyUsageCount] = useState(0);
  const [canUseFeature, setCanUseFeature] = useState(true);
  
  useEffect(() => {
    // Check if user has entered their name
    const username = sessionStorage.getItem("username") || sessionStorage.getItem("userName") || "";
    if (!username) {
      toast({
        title: "Name Required",
        description: "Please return to the home page and enter your name first",
        variant: "destructive",
      });
      navigate("/");
      return;
    }
    setUserName(username);
    
    // Check daily usage from backend API
    const checkUsageStatus = async () => {
      try {
        const response = await fetch('/api/auto-create/usage-status');
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setDailyUsageCount(result.data.currentUsage);
            setCanUseFeature(result.data.canUseFeature);
          } else {
            // Fallback to localStorage if API fails
            const today = new Date().toDateString();
            const usageKey = `auto_create_usage_${today}`;
            const todayUsage = parseInt(localStorage.getItem(usageKey) || "0");
            setDailyUsageCount(todayUsage);
            setCanUseFeature(todayUsage < 3);
          }
        } else {
          // Fallback to localStorage if API fails
          const today = new Date().toDateString();
          const usageKey = `auto_create_usage_${today}`;
          const todayUsage = parseInt(localStorage.getItem(usageKey) || "0");
          setDailyUsageCount(todayUsage);
          setCanUseFeature(todayUsage < 3);
        }
      } catch (error) {
        console.warn('Failed to check usage status from API, using localStorage fallback');
        // Fallback to localStorage if API fails
        const today = new Date().toDateString();
        const usageKey = `auto_create_usage_${today}`;
        const todayUsage = parseInt(localStorage.getItem(usageKey) || "0");
        setDailyUsageCount(todayUsage);
        setCanUseFeature(todayUsage < 3);
      }
    };
    
    checkUsageStatus();
  }, [navigate, toast]);
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    processFiles(files);
  };
  
  const processFiles = async (files: File[]) => {
    // Validate file types
    const validTypes = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png'];
    const validFiles = files.filter(file => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      return validTypes.includes(extension);
    });
    
    if (validFiles.length !== files.length) {
      toast({
        title: "Invalid Files",
        description: "Some files were skipped. Only PDF, DOC, DOCX, TXT, JPG, and PNG files are supported.",
        variant: "destructive",
      });
    }
    
    // Check file sizes (max 10MB per file)
    const oversizedFiles = validFiles.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: "Files Too Large",
        description: `${oversizedFiles.length} file(s) exceed the 10MB limit and were skipped.`,
        variant: "destructive",
      });
    }
    
    const acceptedFiles = validFiles.filter(file => file.size <= 10 * 1024 * 1024);
    
    // Simulate upload progress and generate previews
    for (const file of acceptedFiles) {
      const fileId = `${file.name}-${file.lastModified}`;
      
      // Simulate upload progress
      setFileUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
      
      // Generate preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreviews(prev => ({ ...prev, [fileId]: e.target?.result as string }));
        };
        reader.readAsDataURL(file);
      }
      
      // Simulate progress
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise(resolve => setTimeout(resolve, 50));
        setFileUploadProgress(prev => ({ ...prev, [fileId]: progress }));
      }
      
      // Remove progress indicator after completion
      setTimeout(() => {
        setFileUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
      }, 1000);
    }
    
    setFormData(prev => ({ ...prev, files: [...prev.files, ...acceptedFiles] }));
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };
  
  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };
  
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <File className="h-4 w-4 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'txt':
        return <FileType className="h-4 w-4 text-gray-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <FileImage className="h-4 w-4 text-green-500" />;
      default:
        return <File className="h-4 w-4 text-gray-500" />;
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canUseFeature) {
      toast({
        title: "Daily Limit Reached",
        description: "You've reached your free Auto Create Quiz limit for today. Please come back tomorrow.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate at least one content source
    const hasContent = formData.files.length > 0 || formData.topicPrompt.trim() || formData.linkUrl.trim();
    if (!hasContent) {
      toast({
        title: "Content Required",
        description: "Please provide at least one content source: upload a document, describe a topic, or paste a link",
        variant: "destructive",
      });
      return;
    }
    
    // Start real processing
    setIsProcessing(true);
    setCurrentStep('processing');
    setProgressPercentage(10);
    
    try {
      // Prepare form data for API
      const apiFormData = new FormData();
      
      // Add files
      formData.files.forEach(file => {
        apiFormData.append('files', file);
      });
      
      // Add other data
      if (formData.topicPrompt.trim()) {
        apiFormData.append('topicPrompt', formData.topicPrompt.trim());
      }
      if (formData.linkUrl.trim()) {
        apiFormData.append('linkUrl', formData.linkUrl.trim());
      }
      apiFormData.append('numberOfQuestions', formData.numberOfQuestions.toString());
      apiFormData.append('difficulty', formData.difficulty);
      apiFormData.append('language', formData.language);
      
      // Update progress
      setProgressPercentage(20);
      toast({
        title: "Processing",
        description: "Sending content to server for processing...",
      });
      
      // Call the comprehensive API endpoint
      const response = await fetch('/api/auto-create/process-content', {
        method: 'POST',
        body: apiFormData
      });
      
      setProgressPercentage(50);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process content');
      }
      
      const result = await response.json();
      
      setProgressPercentage(80);
      setCurrentStep('generation');
      
      if (!result.success) {
        throw new Error(result.message || 'Content processing failed');
      }
      
      // Update progress
      setProgressPercentage(90);
      setCurrentStep('review');
      
      toast({
        title: "Processing",
        description: "Preparing questions for review...",
      });
      
      // Store generated questions in session storage for the quiz editor
      console.log('🔍 Raw API response:', result);
      console.log('🔍 Questions from API:', result.data.questions);
      
      const generatedQuestions = result.data.questions.map((q: any, index: number) => {
        // Convert letter-based correct answer to actual answer text
        let correctAnswerText = '';
        if (q.correctAnswer && ['A', 'B', 'C', 'D'].includes(q.correctAnswer) && q.options) {
          const answerIndex = q.correctAnswer.charCodeAt(0) - 'A'.charCodeAt(0);
          if (answerIndex >= 0 && answerIndex < q.options.length) {
            correctAnswerText = q.options[answerIndex];
          }
        }
        
        // Fallback to first option if conversion fails
        if (!correctAnswerText && q.options && q.options.length > 0) {
          correctAnswerText = q.options[0];
        }
        
        return {
          id: Date.now() + index, // Add unique ID
          text: q.question,
          type: 'multiple-choice',
          options: q.options,
          correctAnswers: [correctAnswerText],
          order: index + 1,
          hint: null,
          imageUrl: null
        };
      });
      
      console.log('🔍 Formatted questions for quiz editor:', generatedQuestions);
      
      sessionStorage.setItem('generatedQuestions', JSON.stringify(generatedQuestions));
      sessionStorage.setItem('generationMetadata', JSON.stringify({
        originalContent: formData.topicPrompt || 'Auto-generated from uploaded content',
        sourceType: result.data.metadata.contentType || 'mixed',
        aiModel: result.data.metadata.aiModel,
        generationSettings: {
          difficulty: formData.difficulty,
          language: formData.language,
          numberOfQuestions: formData.numberOfQuestions
        },
        sourceInfo: {
          type: result.data.metadata.contentType || 'mixed',
          filename: result.data.metadata.filename,
          fileType: result.data.metadata.fileType,
          url: result.data.metadata.url,
          title: result.data.metadata.title
        },
        suggestedTitle: result.data.metadata.suggestedTitle || `Quiz: ${formData.topicPrompt || 'Generated Questions'}`,
        suggestedDescription: result.data.metadata.suggestedDescription || `A ${formData.difficulty} difficulty quiz with ${formData.numberOfQuestions} questions in ${formData.language}.`,
        creatorName: formData.creatorName || ''
      }));
      
      // Mark that this quiz requires sequential review
      sessionStorage.setItem('requiresReview', 'true');
      sessionStorage.setItem('autoCreateMode', 'true');
      
      console.log('✅ Questions stored in sessionStorage');
      console.log('🔍 SessionStorage check:', sessionStorage.getItem('generatedQuestions'));
      
      setProgressPercentage(100);
      
      // Update usage count (this is also done on backend, but update UI)
      const today = new Date().toDateString();
      const usageKey = `auto_create_usage_${today}`;
      const newUsage = dailyUsageCount + 1;
      localStorage.setItem(usageKey, newUsage.toString());
      setDailyUsageCount(newUsage);
      setCanUseFeature(newUsage < 3);
      
      toast({
        title: "Success!",
        description: `Generated ${result.data.questions.length} questions successfully! Redirecting to review...`,
      });
      
      // Navigate to create page with auto-review mode
      setTimeout(() => {
        navigate("/create");
      }, 1500);
      
    } catch (error) {
      console.error('Auto-create processing error:', error);
      
      setIsProcessing(false);
      setCurrentStep('input');
      setProgressPercentage(0);
      
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const supportedLanguages = [
    'English', 'Spanish', 'French', 'German', 'Italian', 
    'Portuguese', 'Dutch', 'Russian', 'Chinese (Simplified)', 
    'Japanese', 'Korean', 'Arabic', 'Hindi'
  ];
  
  const getStepName = (step: string) => {
    const stepNames = {
      'input': 'Content Input',
      'processing': 'Processing',
      'generation': 'AI Generation',
      'review': 'Review',
      'publish': 'Publish'
    };
    return stepNames[step as keyof typeof stepNames] || step;
  };

  return (
    <Layout>
      <MetaTags 
        title="Auto Create Quiz | QzonMe - AI-Powered Quiz Generator" 
        description="Generate quiz questions automatically from documents, images, web links, or YouTube videos using AI. Create engaging quizzes in minutes with our smart quiz builder!"
        type="website"
      />
      
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Auto Create Quiz</h1>
        <p className="text-lg text-muted-foreground mb-4">
          Let AI generate quiz questions from your content! Upload documents, paste links, or describe a topic - 
          we'll create engaging multiple-choice questions for you to review and customize.
        </p>
        
        {/* Usage Limit Display */}
        <Alert className={canUseFeature ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {canUseFeature ? (
              <>Daily usage: {dailyUsageCount}/3 - You have {3 - dailyUsageCount} auto-creates remaining today</>
            ) : (
              <>You've reached your free Auto Create Quiz limit for today. Please come back tomorrow.</>
            )}
          </AlertDescription>
        </Alert>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Quiz Questions
          </CardTitle>
          <CardDescription>
            Provide content from any source below. You don't need to fill all fields - just provide at least one content source.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload Section */}
            <div className="space-y-2">
              <Label htmlFor="file-upload" className="text-base font-medium">
                Upload Documents or Images (Optional)
              </Label>
              <p className="text-sm text-muted-foreground">
                Supports PDF, DOC, DOCX, TXT, JPG, PNG files
              </p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-primary hover:underline">Click to upload</span> or drag and drop files here
                </label>
              </div>
              
              {/* Display uploaded files */}
              {formData.files.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Uploaded files:</p>
                  {formData.files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.name)}
                        <div>
                          <span className="text-sm font-medium">{file.name}</span>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Topic/Prompt Section */}
            <div className="space-y-2">
              <Label htmlFor="topic-prompt" className="text-base font-medium">
                Topic or Prompt (Optional)
              </Label>
              <p className="text-sm text-muted-foreground">
                Just enter a topic name (like "World War 2") or describe what you want questions about
              </p>
              <Textarea
                id="topic-prompt"
                placeholder="e.g., 'World War 2', 'JavaScript programming', 'Photosynthesis', or 'Create a quiz about space exploration'"
                value={formData.topicPrompt}
                onChange={(e) => setFormData(prev => ({ ...prev, topicPrompt: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Link Section */}
            <div className="space-y-2">
              <Label htmlFor="link-url" className="text-base font-medium">
                Web Link or YouTube Video (Optional)
              </Label>
              <p className="text-sm text-muted-foreground">
                Paste a blog post, article, or YouTube video URL
              </p>
              <div className="flex gap-2">
                {formData.linkUrl.includes('youtube.com') || formData.linkUrl.includes('youtu.be') ? (
                  <Youtube className="h-5 w-5 mt-2 text-red-500" />
                ) : formData.linkUrl.trim() ? (
                  <Globe className="h-5 w-5 mt-2 text-blue-500" />
                ) : (
                  <LinkIcon className="h-5 w-5 mt-2 text-muted-foreground" />
                )}
                <Input
                  id="link-url"
                  type="url"
                  placeholder="https://example.com/article or https://youtube.com/watch?v=..."
                  value={formData.linkUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, linkUrl: e.target.value }))}
                />
              </div>
              {formData.linkUrl.includes('youtube.com') || formData.linkUrl.includes('youtu.be') ? (
                <p className="text-xs text-blue-600 flex items-center gap-1">
                  <Youtube className="h-3 w-3" />
                  YouTube video detected - we'll extract the transcript
                </p>
              ) : formData.linkUrl.trim() && (formData.linkUrl.startsWith('http://') || formData.linkUrl.startsWith('https://')) ? (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  Web page detected - we'll extract the content
                </p>
              ) : null}
            </div>

            {/* Quiz Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="num-questions" className="text-base font-medium">
                  Number of Questions *
                </Label>
                <Input
                  id="num-questions"
                  type="number"
                  min="5"
                  max="50"
                  value={formData.numberOfQuestions}
                  onChange={(e) => setFormData(prev => ({ ...prev, numberOfQuestions: parseInt(e.target.value) || 5 }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">Difficulty</Label>
                <Select value={formData.difficulty} onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">Language</Label>
                <Select value={formData.language} onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedLanguages.map((lang) => (
                      <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-4">
              <Button
                type="submit"
                className="btn-primary px-8 py-3"
                disabled={isProcessing || !canUseFeature}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {getStepName(currentStep)}...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Quiz Questions
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">📄 Content Sources</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Upload PDFs, Word docs, or text files</li>
                <li>• Upload images (we'll extract text using OCR)</li>
                <li>• Paste links to blog posts or articles</li>
                <li>• Share YouTube video URLs (we'll use transcripts)</li>
                <li>• Simply describe your topic in text</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">🤖 AI Generation</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• AI analyzes your content automatically</li>
                <li>• Generates multiple-choice questions</li>
                <li>• Matches your selected difficulty level</li>
                <li>• Creates questions in your chosen language</li>
                <li>• You can edit and customize everything after</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default AutoCreateQuiz;