import { useState, useEffect, FC } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '@/hooks/use-pwa-install';

interface PWAInstallBannerProps {
  className?: string;
}

export const PWAInstallBanner: FC<PWAInstallBannerProps> = ({ className = '' }) => {
  const { canInstall, installApp } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has previously dismissed the banner
    const wasDismissed = localStorage.getItem('pwa-banner-dismissed') === 'true';
    setDismissed(wasDismissed);

    // Show banner after a short delay if installable and not dismissed
    if (canInstall && !wasDismissed) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 2000); // Show after 2 seconds

      return () => clearTimeout(timer);
    }
  }, [canInstall]);

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowBanner(false);
    localStorage.setItem('pwa-banner-dismissed', 'true');
  };

  // Don't show if not installable, dismissed, or banner not ready
  if (!canInstall || dismissed || !showBanner) {
    return null;
  }

  return (
    <Card className={`border-primary bg-primary/5 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm mb-1">Install QzonMe App</h3>
              <p className="text-xs text-muted-foreground">
                Add QzonMe to your home screen for quick access to quiz creation!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={handleInstall}
              className="text-xs px-3 py-1 h-8 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Download className="h-3 w-3 mr-1" />
              Install
            </Button>
            <Button
              onClick={handleDismiss}
              className="text-xs px-2 py-1 h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PWAInstallBanner;
