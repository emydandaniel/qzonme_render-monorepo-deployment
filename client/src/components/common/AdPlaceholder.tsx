import React, { useEffect, useRef } from "react";

// Add type definition for global adsbygoogle
declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

interface AdPlaceholderProps {
  refreshKey?: number;  // Optional key to force refresh when changed
}

const AdPlaceholder: React.FC<AdPlaceholderProps> = ({ refreshKey }) => {
  const adContainerRef = useRef<HTMLDivElement>(null);
  
  // This effect will run whenever refreshKey changes
  useEffect(() => {
    // Only attempt refresh if container exists and refreshKey changes
    if (adContainerRef.current) {
      try {
        // Clear the current ad container to force refresh
        const container = adContainerRef.current;
        const currentHtml = container.innerHTML;
        
        // A simple approach: temporarily clear and restore to trigger ad refresh
        // This helps simulate a page reload for ad networks
        container.innerHTML = '';
        
        // Small timeout to ensure the DOM updates
        setTimeout(() => {
          container.innerHTML = currentHtml;
          
          // If using Google AdSense, you would uncomment this:
          // if (window.adsbygoogle) {
          //   (window.adsbygoogle = window.adsbygoogle || []).push({});
          // }
          
          console.log("Ad refreshed with key:", refreshKey);
        }, 50);
      } catch (e) {
        console.error("Error refreshing ad:", e);
      }
    }
  }, [refreshKey]);

  return (
    <div 
      ref={adContainerRef}
      className="mt-6 p-4 bg-gray-100 rounded-lg text-center text-sm text-gray-500"
      key={`ad-container-${refreshKey || 'default'}`}
    >
      {/* This div serves as the actual ad container */}
      <div id={`ad-slot-${refreshKey || 'default'}`}>
        {/* When implementing actual ad code, you would replace this content */}
        {/* For Google AdSense example: */}
        {/* <ins class="adsbygoogle"
             style="display:block"
             data-ad-client="ca-pub-XXXXXXX"
             data-ad-slot="XXXXXXX"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins> */}
        <div className="h-16 flex items-center justify-center">
          <span>Advertisement {refreshKey ? `(Refreshed: ${refreshKey})` : ''}</span>
        </div>
      </div>
    </div>
  );
};

export default AdPlaceholder;
